/**
 * Hybrid Audit Orchestrator
 * Integrates Step A (Deterministic) and Step B (Gemini AI with Schema & Retrieval)
 */

import {
  BrandProfile,
  AuditReport,
  Finding,
  AuditStatus,
  ComplianceStatus,
  BrandGuideline,
  ApprovedFact,
} from '../types/index.ts';
import { runDeterministicAudit, DeterministicAuditOptions } from './deterministic-audit.ts';

export type AuditProgressStage =
  | 'Extracting'
  | 'Rule checks'
  | 'Retrieving sources'
  | 'AI analysis'
  | 'Validating'
  | 'Done';

export interface AuditExecutionOptions extends DeterministicAuditOptions {
  submissionId: string;
  versionNumber: number;
  aiChecksEnabled?: boolean;
  simulateAiFailure?: boolean;
  onProgress?: (stage: AuditProgressStage, message: string) => void;
  previousReport?: AuditReport | null;
}

/**
 * Keyword & TF-IDF style similarity retrieval for relevant guidelines & facts
 * Never dumps the full library into the AI prompt
 */
function retrieveRelevantSources(
  content: string,
  brand: BrandProfile
): {
  topGuidelines: BrandGuideline[];
  topFacts: ApprovedFact[];
} {
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const wordSet = new Set(words);

  // Score guidelines
  const scoredGuidelines = (brand.guidelines || [])
    .filter((g) => g.isActive)
    .map((g) => {
      let score = 0;
      const targetText = `${g.title} ${g.category} ${g.ruleText} ${g.rationale}`.toLowerCase();
      for (const w of wordSet) {
        if (targetText.includes(w)) score += 1;
      }
      return { guideline: g, score };
    })
    .sort((a, b) => b.score - a.score);

  // Take top 5 or at least 3
  const topGuidelines = scoredGuidelines.slice(0, 5).map((s) => s.guideline);

  // Score approved facts
  const scoredFacts = (brand.approvedFacts || [])
    .map((f) => {
      let score = 0;
      const targetText = `${f.claimText} ${f.sourceReference}`.toLowerCase();
      for (const w of wordSet) {
        if (targetText.includes(w)) score += 1;
      }
      return { fact: f, score };
    })
    .sort((a, b) => b.score - a.score);

  const topFacts = scoredFacts.slice(0, 4).map((s) => s.fact);

  return { topGuidelines, topFacts };
}

/**
 * Run full hybrid audit pipeline
 */
export async function executeHybridAudit(
  content: string,
  brand: BrandProfile,
  options: AuditExecutionOptions
): Promise<AuditReport> {
  const reportId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { onProgress } = options;

  // 1. Stage: Extracting
  onProgress?.('Extracting', 'Verifying content structure and payload integrity...');
  await new Promise((r) => setTimeout(r, 120));

  if (!content || !content.trim()) {
    return {
      id: reportId,
      submissionId: options.submissionId,
      versionAudited: options.versionNumber,
      createdAt: new Date().toISOString(),
      auditStatus: 'Failed',
      complianceStatus: 'Not assessed',
      statusExplanation:
        'Empty document content: extraction produced no readable text. Verification failed.',
      evidenceCoverage: 0,
      findings: [
        {
          id: `err-empty-${Date.now()}`,
          auditReportId: reportId,
          category: 'Legal-adjacent',
          severity: 'Critical',
          affectedExcerpt: '[Empty Content]',
          plainRationale:
            'Empty extraction: Document contains no parsable text. Brand compliance audit cannot pass an empty or corrupted document.',
          evidence: {
            sourceType: 'deterministic-check',
            hasEvidenceGap: false,
            ruleCode: 'SYS-EMPTY',
            sourceTitle: 'Document Validation Standard',
            exactText: 'Audited assets must contain valid text or visual imagery.',
          },
          confidence: 'High',
          confidenceNote: 'Zero characters extracted from input source.',
          sourceType: 'Deterministic rule',
          suggestedCorrection: {
            originalText: '',
            proposedText: '',
            explanation: 'Upload a non-empty document or paste valid copy.',
          },
          disposition: { status: 'Pending' },
          isAIGenerated: false,
        },
      ],
      deterministicChecksRun: ['empty_payload_check'],
      guidelineVersionsUsed: {},
      aiChecked: false,
    };
  }

  // Record guideline versions snapshot
  const guidelineVersionsUsed: { [ruleCode: string]: number } = {};
  (brand.guidelines || []).forEach((g) => {
    guidelineVersionsUsed[g.ruleCode] = g.version;
  });

  // 2. Stage: Deterministic Rule Checks (Step A)
  onProgress?.('Rule checks', 'Executing deterministic checks: terminology, banned claims, and syntax...');
  await new Promise((r) => setTimeout(r, 180));

  const deterministicFindings = runDeterministicAudit(content, brand, {
    hasImage: options.hasImage,
    imageAltText: options.imageAltText,
    imageDimensions: options.imageDimensions,
    imageColorContrastRatio: options.imageColorContrastRatio,
  });

  // Assign report ID
  deterministicFindings.forEach((f) => {
    f.auditReportId = reportId;
  });

  // 3. Stage: Retrieving Sources
  onProgress?.('Retrieving sources', 'Retrieving matching brand guidelines, tone rules, and clinical facts...');
  await new Promise((r) => setTimeout(r, 150));

  const { topGuidelines, topFacts } = retrieveRelevantSources(content, brand);

  // 4. Stage: AI Analysis (Step B)
  let aiFindings: Finding[] = [];
  let aiChecked = false;
  let aiFailureReason: string | undefined = undefined;
  let auditStatus: AuditStatus = 'Complete';

  const shouldRunAi = options.aiChecksEnabled !== false;

  if (shouldRunAi) {
    onProgress?.('AI analysis', 'Engaging Gemini 3.8 Flash for contextual tone, claims & nuance audit...');
    try {
      const resp = await fetch('/api/audit-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          relevantGuidelines: topGuidelines,
          relevantFacts: topFacts,
          simulateFailure: options.simulateAiFailure,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with HTTP ${resp.status}`);
      }

      const aiData = await resp.json();
      aiChecked = true;

      // Map AI findings
      if (Array.isArray(aiData.findings)) {
        for (const item of aiData.findings) {
          // Verify cited source ID / ruleCode actually exists in the brand knowledge base
          let hasGap = item.hasEvidenceGap;
          let gapExplanation = item.gapExplanation;

          if (item.ruleCode) {
            const ruleExists = brand.guidelines.some((g) => g.ruleCode === item.ruleCode);
            const factExists = brand.approvedFacts.some((f) => f.factCode === item.ruleCode);
            if (!ruleExists && !factExists) {
              hasGap = true;
              gapExplanation = `Evidence gap: Cited source rule ${item.ruleCode} not found in current approved library; treated as unverified.`;
            }
          }

          aiFindings.push({
            id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            auditReportId: reportId,
            category: item.category,
            severity: item.severity,
            affectedExcerpt: item.affectedExcerpt,
            plainRationale: item.plainRationale,
            evidence: {
              sourceType: hasGap ? 'none' : 'guideline',
              ruleCode: item.ruleCode,
              sourceTitle: item.sourceTitle || 'Brand Guideline Excerpt',
              exactText: item.exactSourceQuote,
              hasEvidenceGap: hasGap,
              gapExplanation: hasGap ? (gapExplanation || 'No approved fact or guideline explicitly validates this assertion.') : undefined,
              version: item.ruleCode ? guidelineVersionsUsed[item.ruleCode] || 1 : 1,
            },
            confidence: item.confidence || 'High',
            confidenceNote: item.confidenceNote || 'Analyzed via structured Gemini 3.8 Flash inference.',
            sourceType: 'AI-assisted',
            suggestedCorrection: {
              originalText: item.suggestedCorrection.originalText,
              proposedText: item.suggestedCorrection.proposedText,
              explanation: item.suggestedCorrection.explanation,
            },
            disposition: { status: 'Pending' },
            isAIGenerated: true,
          });
        }
      }
    } catch (err: any) {
      console.warn('AI audit step failed or timed out:', err);
      aiFailureReason = err.message || 'AI service unavailable or timed out';
      auditStatus = 'Partial';
    }
  } else {
    auditStatus = 'Partial';
    aiFailureReason = 'AI checks disabled by workspace settings (Deterministic checks only).';
  }

  // 5. Stage: Validating & Merging
  onProgress?.('Validating', 'Deduplicating findings, computing evidence coverage, and finalizing report...');
  await new Promise((r) => setTimeout(r, 120));

  // Merge findings, avoiding duplicate excerpts for identical categories
  const mergedFindings: Finding[] = [...deterministicFindings];

  for (const aif of aiFindings) {
    const isDuplicate = mergedFindings.some(
      (df) =>
        df.category === aif.category &&
        df.affectedExcerpt.toLowerCase().trim() === aif.affectedExcerpt.toLowerCase().trim()
    );
    if (!isDuplicate) {
      mergedFindings.push(aif);
    }
  }

  // Compute Evidence Coverage:
  // findings with usable evidence / findings requiring evidence
  // All claims, tone, and terminology findings require evidence.
  const findingsRequiringEvidence = mergedFindings.filter(
    (f) => f.category === 'Claims' || f.category === 'Terminology' || f.category === 'Tone' || f.category === 'Messaging'
  );
  const findingsWithUsableEvidence = findingsRequiringEvidence.filter(
    (f) => !f.evidence.hasEvidenceGap && f.evidence.sourceType !== 'none'
  );

  const evidenceCoverage =
    findingsRequiringEvidence.length === 0
      ? 100
      : Math.round((findingsWithUsableEvidence.length / findingsRequiringEvidence.length) * 100);

  // Set compliance status
  let complianceStatus: ComplianceStatus = 'Not assessed';
  let statusExplanation = '';

  if (auditStatus === 'Complete') {
    if (mergedFindings.length === 0) {
      complianceStatus = 'No issues detected';
      statusExplanation =
        'No issues detected against current approved sources. This is not a guarantee of correctness.';
    } else {
      complianceStatus = 'Issues found';
      statusExplanation = `${mergedFindings.length} findings require review before publication.`;
    }
  } else if (auditStatus === 'Partial') {
    if (mergedFindings.length > 0) {
      complianceStatus = 'Issues found';
      statusExplanation = `Partial audit (${aiFailureReason || 'AI unavailable'}). ${mergedFindings.length} deterministic findings detected.`;
    } else {
      complianceStatus = 'Not assessed';
      statusExplanation = `Partial audit (${aiFailureReason || 'AI unavailable'}). Deterministic rules passed, but semantic tone and claims were not fully assessed.`;
    }
  }

  // Comparison against previous report if available
  let comparisonSummary: AuditReport['comparisonSummary'] = undefined;
  if (options.previousReport) {
    const prevExcerpts = new Set(
      options.previousReport.findings.map((f) => f.affectedExcerpt.toLowerCase().trim())
    );
    const currentExcerpts = new Set(
      mergedFindings.map((f) => f.affectedExcerpt.toLowerCase().trim())
    );

    let resolvedCount = 0;
    for (const prev of prevExcerpts) {
      if (!currentExcerpts.has(prev)) resolvedCount++;
    }

    let newCount = 0;
    for (const curr of currentExcerpts) {
      if (!prevExcerpts.has(curr)) newCount++;
    }

    const remainingCount = mergedFindings.length;
    comparisonSummary = { resolvedCount, newCount, remainingCount };
  }

  // 6. Stage: Done
  onProgress?.('Done', 'Audit complete.');

  const report: AuditReport = {
    id: reportId,
    submissionId: options.submissionId,
    versionAudited: options.versionNumber,
    createdAt: new Date().toISOString(),
    auditStatus,
    complianceStatus,
    statusExplanation,
    evidenceCoverage,
    findings: mergedFindings,
    deterministicChecksRun: [
      'prohibited_terminology',
      'banned_superlatives',
      'numeric_facts_matching',
      'prompt_injection_quarantine',
      'sentence_cadence',
      'shouting_allcaps',
      'exclamation_frequency',
      ...(options.hasImage ? ['image_alt_text', 'image_contrast_sample'] : []),
    ],
    guidelineVersionsUsed,
    aiChecked,
    aiFailureReason,
    comparedToPreviousReportId: options.previousReport?.id,
    comparisonSummary,
  };

  return report;
}
