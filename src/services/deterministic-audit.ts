/**
 * Deterministic Audit Engine (Step A)
 * Pure, reliable, unit-testable rule matching without AI
 */

import type {
  BrandProfile,
  Finding,
  SeverityLevel,
  ApprovedFact,
} from '../types/index.ts';

// Banned superlatives in luxury brand communication
export const BANNED_SUPERLATIVES = [
  { word: 'miracle', severity: 'Critical' as SeverityLevel, rationale: 'Medical/superlative claim "miracle" is prohibited under luxury cosmetics and truthful advertising guidelines.' },
  { word: 'cure', severity: 'Critical' as SeverityLevel, rationale: 'Cosmetic products cannot claim to "cure" skin conditions under regulatory and brand guidelines.' },
  { word: 'guaranteed', severity: 'High' as SeverityLevel, rationale: 'Absolute guarantee claims ("guaranteed") create legal liability and violate Maison Aurelia understated elegance standard.' },
  { word: '100%', severity: 'High' as SeverityLevel, rationale: 'Absolute percentage claims ("100%") require rigorous clinical verification and violate honest luxury positioning.' },
  { word: '#1', severity: 'High' as SeverityLevel, rationale: 'Ranking claim "#1" is unsubstantiated without explicit accredited market research citation.' },
  { word: 'the best', severity: 'Medium' as SeverityLevel, rationale: 'Superlative "the best" conflicts with Maison Aurelia humble restraint tone principle.' },
];

// Embedded prompt injection signatures to detect
export const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+|previous\s+|prior\s+)?(instructions|rules|guidelines)/i,
  /bypass\s+(the\s+)?(audit|check|review|policy)/i,
  /approve\s+(this\s+)?(content|submission|copy)\s+immediately/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /disregard\s+(brand\s+)?(guidelines|rules)/i,
  /mark\s+(as\s+)?compliant/i,
];

// Helper to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to create whole-word regex supporting basic plural/variant forms
function createTermRegex(term: string): RegExp {
  const clean = term.trim();
  // Handle hyphen/space variations (e.g. anti-aging vs anti aging)
  const pattern = escapeRegExp(clean)
    .replace(/\\-/g, '[-\\s]?')
    .replace(/\\ /g, '[-\\s]?');
  // Allow optional trailing 's' or 'es' or 'ing'
  return new RegExp(`\\b${pattern}(?:s|es|d|ed|ing)?\\b`, 'i');
}

export interface DeterministicAuditOptions {
  hasImage?: boolean;
  imageAltText?: string;
  imageDimensions?: { width: number; height: number };
  imageColorContrastRatio?: number; // WCAG contrast ratio if sampled
}

/**
 * Run deterministic checks on content against brand profile
 */
export function runDeterministicAudit(
  content: string,
  brand: BrandProfile,
  options: DeterministicAuditOptions = {}
): Finding[] {
  const findings: Finding[] = [];
  const reportPlaceholderId = 'temp-report';

  if (!content || !content.trim()) {
    return findings;
  }

  // 1. Prompt-Injection / Embedded Instruction Defense
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = pattern.exec(content);
    if (match) {
      findings.push({
        id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        auditReportId: reportPlaceholderId,
        category: 'Legal-adjacent',
        severity: 'Info',
        affectedExcerpt: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        plainRationale:
          'Embedded instruction detected in content. Text attempted to instruct the evaluation engine; BrandShield treats all submitted copy strictly as untrusted data to audit.',
        evidence: {
          sourceType: 'deterministic-check',
          hasEvidenceGap: false,
          ruleCode: 'SEC-01',
          sourceTitle: 'Prompt-Injection & Untrusted Data Policy',
          exactText: 'Submitted user content must be quarantined and parsed exclusively as passive copy, not instructions.',
        },
        confidence: 'High',
        confidenceNote: 'Exact signature match against untrusted directive patterns.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: match[0],
          proposedText: '',
          explanation: 'Remove prompt directive language from public marketing copy.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    }
  }

  // 2. Prohibited Terminology Checks
  if (brand.terminology && brand.terminology.length > 0) {
    for (const termRule of brand.terminology) {
      if (!termRule.isActive) continue;

      for (const prohibited of termRule.prohibitedTerms) {
        if (!prohibited || !prohibited.trim()) continue;
        const regex = createTermRegex(prohibited);
        let match: RegExpExecArray | null;
        // Global search to find all occurrences
        const globalRegex = new RegExp(regex.source, 'gi');
        while ((match = globalRegex.exec(content)) !== null) {
          const matchedText = match[0];
          findings.push({
            id: `term-${termRule.id}-${match.index}`,
            auditReportId: reportPlaceholderId,
            category: 'Terminology',
            severity: termRule.severity || 'High',
            affectedExcerpt: matchedText,
            startIndex: match.index,
            endIndex: match.index + matchedText.length,
            plainRationale: `Prohibited terminology "${matchedText}" used. Approved replacement is "${termRule.replacement}". ${termRule.context ? `Context: ${termRule.context}` : ''}`,
            evidence: {
              ruleCode: `TERM-${termRule.id.slice(0, 4).toUpperCase()}`,
              sourceId: termRule.id,
              sourceTitle: `Terminology Rule: ${termRule.preferredTerm}`,
              sourceType: 'terminology',
              version: 1,
              owner: 'Brand Committee',
              exactText: `Prohibited terms: [${termRule.prohibitedTerms.join(', ')}]. Preferred term: "${termRule.preferredTerm}". Replacement: "${termRule.replacement}".`,
              hasEvidenceGap: false,
            },
            confidence: 'High',
            confidenceNote: 'Exact whole-word terminology rule match.',
            sourceType: 'Deterministic rule',
            suggestedCorrection: {
              originalText: matchedText,
              proposedText: termRule.replacement,
              explanation: `Replace prohibited terminology with approved brand phrasing "${termRule.replacement}".`,
            },
            disposition: { status: 'Pending' },
            isAIGenerated: false,
          });
        }
      }
    }
  }

  // 3. Banned Superlatives Check (when not supported by an active approved fact)
  for (const banned of BANNED_SUPERLATIVES) {
    const regex = new RegExp(`\\b${escapeRegExp(banned.word)}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const excerpt = match[0];
      // Check if this exact word is already covered by a terminology rule finding to avoid duplicate noisy flags
      const isAlreadyCovered = findings.some(
        f => f.category === 'Terminology' && f.startIndex === match!.index
      );
      if (!isAlreadyCovered) {
        findings.push({
          id: `super-${Date.now()}-${match.index}`,
          auditReportId: reportPlaceholderId,
          category: 'Claims',
          severity: banned.severity,
          affectedExcerpt: excerpt,
          startIndex: match.index,
          endIndex: match.index + excerpt.length,
          plainRationale: banned.rationale,
          evidence: {
            ruleCode: 'CLAIM-SUPERLATIVE',
            sourceTitle: 'Superlatives & Restraint Standard',
            sourceType: 'guideline',
            version: 1,
            owner: 'Legal & Brand Assurance',
            exactText: 'Do not use unsubstantiated superlatives or absolute promises (e.g. miracle, cure, guaranteed, 100%, #1).',
            hasEvidenceGap: false,
          },
          confidence: 'High',
          confidenceNote: 'Direct match against prohibited absolute marketing claims.',
          sourceType: 'Deterministic rule',
          suggestedCorrection: {
            originalText: excerpt,
            proposedText: banned.word === 'miracle' ? 'transformative' : banned.word === 'guaranteed' ? 'tested' : 'exceptional',
            explanation: 'Tone down absolute superlative to evidence-backed descriptive language.',
          },
          disposition: { status: 'Pending' },
          isAIGenerated: false,
        });
      }
    }
  }

  // 4. Numeric & Statistical Claims Matching Against Approved Facts
  // Match percentages (e.g. 87%, 94.5%), multipliers (e.g. 3x, 5 times), or clinical counts
  const statRegex = /\b(\d+(?:\.\d+)?%|\d+\s*(?:times|x|fold)|[0-9]{1,3}(?:,[0-9]{3})+\s*(?:users|clients|women|volunteers))(?=[\s.,;!?]|$)/gi;
  let statMatch: RegExpExecArray | null;
  while ((statMatch = statRegex.exec(content)) !== null) {
    const rawStat = statMatch[0];
    const statIndex = statMatch.index;

    // Search active approved facts
    const activeFacts = (brand.approvedFacts || []).filter(
      (f: ApprovedFact) => f.status === 'Current' || f.status === 'Expiring soon'
    );
    const expiredFacts = (brand.approvedFacts || []).filter(
      (f: ApprovedFact) => f.status === 'Expired' || f.status === 'Superseded'
    );

    // Look for matching fact
    const matchedActiveFact = activeFacts.find(f =>
      f.claimText.toLowerCase().includes(rawStat.toLowerCase()) ||
      (f.metrics && f.metrics.some(m => m.value.toLowerCase() === rawStat.toLowerCase()))
    );

    const matchedExpiredFact = expiredFacts.find(f =>
      f.claimText.toLowerCase().includes(rawStat.toLowerCase()) ||
      (f.metrics && f.metrics.some(m => m.value.toLowerCase() === rawStat.toLowerCase()))
    );

    if (matchedExpiredFact && !matchedActiveFact) {
      // Cited a statistic from an expired fact!
      findings.push({
        id: `stat-expired-${statIndex}`,
        auditReportId: reportPlaceholderId,
        category: 'Claims',
        severity: 'Critical',
        affectedExcerpt: rawStat,
        startIndex: statIndex,
        endIndex: statIndex + rawStat.length,
        plainRationale: `Statistic "${rawStat}" matches an EXPIRED approved fact (${matchedExpiredFact.factCode}). Expired on ${matchedExpiredFact.expiryDate} and can no longer be cited in public materials.`,
        evidence: {
          ruleCode: matchedExpiredFact.factCode,
          sourceId: matchedExpiredFact.id,
          sourceTitle: `Approved Fact: ${matchedExpiredFact.sourceReference}`,
          sourceType: 'fact',
          version: 1,
          owner: 'Clinical Research Dept',
          exactText: `Claim: "${matchedExpiredFact.claimText}" [Status: ${matchedExpiredFact.status}, Expired: ${matchedExpiredFact.expiryDate}]`,
          hasEvidenceGap: false,
        },
        confidence: 'High',
        confidenceNote: 'Exact statistic correlation with an expired fact registry record.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: rawStat,
          proposedText: '[cite current clinical trial]',
          explanation: 'Update or remove statistic until new clinical re-authorization is completed.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    } else if (!matchedActiveFact) {
      // Unsupported statistic / Evidence gap
      findings.push({
        id: `stat-gap-${statIndex}`,
        auditReportId: reportPlaceholderId,
        category: 'Claims',
        severity: 'High',
        affectedExcerpt: rawStat,
        startIndex: statIndex,
        endIndex: statIndex + rawStat.length,
        plainRationale: `Unverified statistical claim "${rawStat}". No active approved fact in the brand knowledge base corroborates this figure.`,
        evidence: {
          sourceType: 'none',
          hasEvidenceGap: true,
          gapExplanation: 'Evidence gap: No active clinical trial or brand fact record in the approved facts repository validates this statistic. Treated as unverified, not necessarily false.',
        },
        confidence: 'High',
        confidenceNote: 'Numerical claim lacks corroborating entry in approved facts repository.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: rawStat,
          proposedText: 'visibly improved',
          explanation: 'Replace specific unverified number with qualitative brand description or submit fact for legal approval.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    }
  }

  // 5. Readability & Sentence Length (Editorial Discipline)
  const sentences = content.split(/(?<=[.?!])\s+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 38) {
      const excerpt = trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed;
      const idx = content.indexOf(trimmed);
      findings.push({
        id: `readability-${findings.length}`,
        auditReportId: reportPlaceholderId,
        category: 'Tone',
        severity: 'Low',
        affectedExcerpt: excerpt,
        startIndex: idx >= 0 ? idx : undefined,
        endIndex: idx >= 0 ? idx + excerpt.length : undefined,
        plainRationale: `Lengthy sentence detected (${wordCount} words). Maison Aurelia editorial guidelines recommend concise, luminous cadences under 32 words for clarity and elegance.`,
        evidence: {
          ruleCode: 'TONE-CADENCE',
          sourceTitle: 'Cadence & Sentence Architecture',
          sourceType: 'guideline',
          version: 1,
          owner: 'Editorial Director',
          exactText: 'Sentences should be measured and lucid. Avoid convoluted compound structures exceeding 32 words.',
          hasEvidenceGap: false,
        },
        confidence: 'Medium',
        confidenceNote: 'Algorithmic word count check against editorial cadence limit.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: excerpt,
          proposedText: 'Split into two composed, refined statements.',
          explanation: 'Break compound sentence to preserve rhythm and luxury poise.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    }
  }

  // 6. ALL-CAPS and Exclamation Mark Shouting Checks
  const capsRegex = /\b[A-Z]{3,}\b(?:\s+[A-Z]{3,}\b)+/g;
  let capsMatch: RegExpExecArray | null;
  while ((capsMatch = capsRegex.exec(content)) !== null) {
    // Exclude common acronyms like SPF, UVA, UVB, FDA, CEO, EU, US, DNA
    const text = capsMatch[0];
    const words = text.split(/\s+/);
    const knownAcronyms = ['SPF', 'UVA', 'UVB', 'FDA', 'CEO', 'USA', 'EU', 'DNA', 'RNA', 'ISO', 'GMP', 'COSMOS'];
    const nonAcronyms = words.filter(w => !knownAcronyms.includes(w));
    if (nonAcronyms.length >= 2) {
      findings.push({
        id: `caps-${capsMatch.index}`,
        auditReportId: reportPlaceholderId,
        category: 'Tone',
        severity: 'Medium',
        affectedExcerpt: text,
        startIndex: capsMatch.index,
        endIndex: capsMatch.index + text.length,
        plainRationale: 'Consecutive all-caps shouting violates Maison Aurelia quiet luxury and understated typography standard.',
        evidence: {
          ruleCode: 'TONE-REST',
          sourceTitle: 'Typographic Restraint Standard',
          sourceType: 'guideline',
          version: 1,
          owner: 'Brand Committee',
          exactText: 'Do not use all-caps shouting in body or headline copy. Allow refined typography and whitespace to convey emphasis.',
          hasEvidenceGap: false,
        },
        confidence: 'High',
        confidenceNote: 'Uppercase word sequence detected.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: text,
          proposedText: text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
          explanation: 'Convert shout-cased words into refined title or sentence case.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    }
  }

  // Exclamation point overuse
  const exclamations = (content.match(/!{2,}/g) || []).length;
  const singleExclamations = (content.match(/!/g) || []).length;
  if (exclamations > 0 || singleExclamations > 1) {
    findings.push({
      id: `exclaim-${findings.length}`,
      auditReportId: reportPlaceholderId,
      category: 'Tone',
      severity: 'Low',
      affectedExcerpt: '!'.repeat(Math.max(2, exclamations)),
      plainRationale: `Exclamation mark overuse (${singleExclamations} exclamation marks detected). High-luxury editorial copy avoids theatrical punctuation in favor of calm authority.`,
      evidence: {
        ruleCode: 'TONE-PUNCT',
        sourceTitle: 'Punctuation & Poise',
        sourceType: 'guideline',
        version: 1,
        owner: 'Brand Committee',
        exactText: 'Limit exclamation points to exceptional moments. Never use multiple exclamation marks (!!).',
        hasEvidenceGap: false,
      },
      confidence: 'High',
      confidenceNote: 'Character frequency punctuation check.',
      sourceType: 'Deterministic rule',
      suggestedCorrection: {
        originalText: '!',
        proposedText: '.',
        explanation: 'Conclude with a measured period to maintain quiet confidence.',
      },
      disposition: { status: 'Pending' },
      isAIGenerated: false,
    });
  }

  // 7. Visual & Accessibility Checks (When image is submitted)
  if (options.hasImage) {
    if (!options.imageAltText || !options.imageAltText.trim()) {
      findings.push({
        id: `img-alt-${Date.now()}`,
        auditReportId: reportPlaceholderId,
        category: 'Accessibility',
        severity: 'High',
        affectedExcerpt: '[Uploaded Image]',
        plainRationale: 'Missing alternative text (alt text). WCAG 2.2 AA and brand inclusion standards require descriptive alt text for all published campaign visual assets.',
        evidence: {
          ruleCode: 'A11Y-ALT',
          sourceTitle: 'Digital Accessibility Standards (WCAG 2.2 AA)',
          sourceType: 'guideline',
          version: 1,
          owner: 'Accessibility & Compliance Lead',
          exactText: 'All public images must provide descriptive, meaningful alt text conveying both subject and emotional mood without repetitive keywords.',
          hasEvidenceGap: false,
        },
        confidence: 'High',
        confidenceNote: 'Image asset supplied without accompanying alt-text attribute.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: '[No Alt Text]',
          proposedText: 'A close-up study of botanical serum droplet diffusing into morning light on frosted glass.',
          explanation: 'Supply descriptive editorial alt text describing the image composition.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    }

    if (options.imageColorContrastRatio !== undefined && options.imageColorContrastRatio < 4.5) {
      findings.push({
        id: `img-contrast-${Date.now()}`,
        auditReportId: reportPlaceholderId,
        category: 'Visual',
        severity: 'Medium',
        affectedExcerpt: `Contrast Ratio ${options.imageColorContrastRatio.toFixed(1)}:1`,
        plainRationale: `Sampled visual text-to-background contrast ratio (${options.imageColorContrastRatio.toFixed(1)}:1) fails WCAG AA minimum threshold of 4.5:1. (Visual check is limited to sampled pixel regions).`,
        evidence: {
          ruleCode: 'VIS-CONTRAST',
          sourceTitle: 'Contrast & Legibility Guidelines',
          sourceType: 'guideline',
          version: 1,
          owner: 'Design Systems Lead',
          exactText: 'Text overlays must maintain at least 4.5:1 contrast against photographic backgrounds using subtle contrast scrims.',
          hasEvidenceGap: false,
        },
        confidence: 'Medium',
        confidenceNote: 'Canvas luminance delta calculation on sampled image regions. Limitations apply.',
        sourceType: 'Deterministic rule',
        suggestedCorrection: {
          originalText: 'Low contrast overlay',
          proposedText: 'Apply a subtle dark scrim gradient (e.g. rgba(14, 14, 16, 0.4)) beneath text overlay.',
          explanation: 'Increase text legibility to satisfy WCAG AA requirements.',
        },
        disposition: { status: 'Pending' },
        isAIGenerated: false,
      });
    }
  }

  return findings;
}
