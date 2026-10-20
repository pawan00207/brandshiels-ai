import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWordDiff, compareAuditRevisions } from './diff-helper.ts';
import type { ContentRevision, AuditReport, Finding } from '../types/index.ts';

test('computeWordDiff detects deletions and additions cleanly', () => {
  const textA = 'Our miracle anti-aging elixir cures aging.';
  const textB = 'Our restorative skincare serum supports renewal.';
  const chunks = computeWordDiff(textA, textB);

  assert.ok(chunks.length > 1);
  const hasRemoved = chunks.some((c) => c.type === 'removed');
  const hasAdded = chunks.some((c) => c.type === 'added');
  assert.equal(hasRemoved, true);
  assert.equal(hasAdded, true);
});

test('compareAuditRevisions identifies resolved findings correctly', () => {
  const revA: ContentRevision = {
    version: 1,
    content: 'Our miracle anti-aging elixir cures aging.',
    createdAt: new Date().toISOString(),
    createdBy: 'Clara',
    changeSummary: 'Initial draft',
  };

  const revB: ContentRevision = {
    version: 2,
    content: 'Our restorative skincare serum supports botanical vitality.',
    createdAt: new Date().toISOString(),
    createdBy: 'Clara',
    changeSummary: 'Fixed anti-aging claim',
  };

  const mockFinding: Finding = {
    id: 'f-1',
    auditReportId: 'rep-1',
    category: 'Terminology',
    severity: 'Critical',
    affectedExcerpt: 'anti-aging',
    plainRationale: 'Anti-aging is prohibited by Maison Aurelia guidelines.',
    evidence: {
      sourceType: 'terminology',
      ruleCode: 'RULE-TERM-01',
      hasEvidenceGap: false,
    },
    confidence: 'High',
    confidenceNote: 'Exact prohibited match',
    sourceType: 'Deterministic rule',
    suggestedCorrection: {
      originalText: 'anti-aging',
      proposedText: 'restorative skincare',
      explanation: 'Use restorative skincare instead',
    },
    disposition: {
      status: 'Accepted',
      updatedBy: 'Clara',
    },
    isAIGenerated: false,
  };

  const reportA: AuditReport = {
    id: 'rep-1',
    submissionId: 'sub-1',
    versionAudited: 1,
    createdAt: new Date().toISOString(),
    auditStatus: 'Complete',
    complianceStatus: 'Issues found',
    statusExplanation: 'Issues found',
    evidenceCoverage: 50,
    findings: [mockFinding],
    deterministicChecksRun: [],
    guidelineVersionsUsed: {},
    aiChecked: false,
  };

  const reportB: AuditReport = {
    id: 'rep-2',
    submissionId: 'sub-1',
    versionAudited: 2,
    createdAt: new Date().toISOString(),
    auditStatus: 'Complete',
    complianceStatus: 'No issues detected',
    statusExplanation: 'All clear',
    evidenceCoverage: 100,
    findings: [],
    deterministicChecksRun: [],
    guidelineVersionsUsed: {},
    aiChecked: false,
  };

  const result = compareAuditRevisions(revA, revB, reportA, reportB);

  assert.equal(result.resolvedCount, 1);
  assert.equal(result.remainingCount, 0);
  assert.equal(result.resolvedFindings[0].finding.id, 'f-1');
  assert.equal(result.evidenceCoverageA, 50);
  assert.equal(result.evidenceCoverageB, 100);
  assert.equal(result.coverageDelta, 50);
});
