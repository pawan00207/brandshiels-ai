/**
 * Additional tests for remainingCount fix and new diff scenarios.
 * Verifies the remainingCount bug fix: it should count only findings from reportA
 * that are genuinely still present in the target revision B, not overcounted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { compareAuditRevisions } from './diff-helper.ts';
import type { ContentRevision, AuditReport, Finding } from '../types/index.ts';

function makeFinding(id: string, excerpt: string, ruleCode?: string): Finding {
  return {
    id,
    auditReportId: 'rep-test',
    category: 'Terminology',
    severity: 'High',
    affectedExcerpt: excerpt,
    plainRationale: `Finding: ${id}`,
    evidence: {
      sourceType: 'terminology',
      ruleCode,
      hasEvidenceGap: false,
    },
    confidence: 'High',
    confidenceNote: 'Test finding',
    sourceType: 'Deterministic rule',
    suggestedCorrection: {
      originalText: excerpt,
      proposedText: 'corrected text',
      explanation: 'Use approved terminology',
    },
    disposition: { status: 'Pending' },
    isAIGenerated: false,
  };
}

function makeRevision(version: number, content: string): ContentRevision {
  return {
    version,
    content,
    createdAt: new Date().toISOString(),
    createdBy: 'Tester',
    changeSummary: `Version ${version}`,
  };
}

function makeReport(id: string, subId: string, version: number, findings: Finding[]): AuditReport {
  return {
    id,
    submissionId: subId,
    versionAudited: version,
    createdAt: new Date().toISOString(),
    auditStatus: 'Complete',
    complianceStatus: findings.length === 0 ? 'No issues detected' : 'Issues found',
    statusExplanation: '',
    evidenceCoverage: 80,
    findings,
    deterministicChecksRun: [],
    guidelineVersionsUsed: {},
    aiChecked: false,
  };
}

test('remainingCount is exactly the count of findingsA still present in B content', () => {
  const findingStillThere = makeFinding('f-1', 'anti-aging', 'TERM-01');
  const findingResolved = makeFinding('f-2', 'miracle cure', 'TERM-02');

  const revA = makeRevision(1, 'Our anti-aging miracle cure elixir.');
  // In revB, "miracle cure" is removed but "anti-aging" stays
  const revB = makeRevision(2, 'Our anti-aging restorative serum.');

  const reportA = makeReport('rep-1', 'sub-1', 1, [findingStillThere, findingResolved]);
  const reportB = makeReport('rep-2', 'sub-1', 2, [findingStillThere]); // only f-1 remains

  const result = compareAuditRevisions(revA, revB, reportA, reportB);

  // f-2 ("miracle cure") was removed from content → resolved
  // f-1 ("anti-aging") still in content AND still in reportB → remaining
  assert.equal(result.resolvedCount, 1, 'Should have 1 resolved finding');
  assert.equal(result.remainingCount, 1, 'Should have exactly 1 remaining finding (not overcounted)');
  assert.equal(result.newCount, 0, 'Should have 0 new findings');
  assert.equal(result.resolvedFindings[0].finding.id, 'f-2');
  assert.equal(result.remainingFindings[0].id, 'f-1');
});

test('remainingCount is 0 when all findings from A are resolved in B', () => {
  const findingA = makeFinding('f-3', 'guaranteed results');
  const revA = makeRevision(1, 'We provide guaranteed results.');
  const revB = makeRevision(2, 'We provide evidence-backed performance.');

  const reportA = makeReport('rep-3', 'sub-2', 1, [findingA]);
  const reportB = makeReport('rep-4', 'sub-2', 2, []);

  const result = compareAuditRevisions(revA, revB, reportA, reportB);

  assert.equal(result.resolvedCount, 1);
  assert.equal(result.remainingCount, 0, 'remainingCount should be 0, not overcounted');
  assert.equal(result.newCount, 0);
});

test('newCount reflects findings introduced in B that were not in A', () => {
  const existingFinding = makeFinding('f-5', 'anti-aging');
  const newFindingInB = makeFinding('f-6', 'revolutionary breakthrough');

  const revA = makeRevision(1, 'Our anti-aging serum.');
  const revB = makeRevision(2, 'Our age-embracing revolutionary breakthrough serum.');

  const reportA = makeReport('rep-5', 'sub-3', 1, [existingFinding]);
  const reportB = makeReport('rep-6', 'sub-3', 2, [newFindingInB]); // old finding gone, new one appeared

  const result = compareAuditRevisions(revA, revB, reportA, reportB);

  assert.equal(result.resolvedCount, 1, 'anti-aging finding resolved');
  assert.equal(result.newCount, 1, 'revolutionary breakthrough is a new finding in B');
  assert.equal(result.newFindings[0].id, 'f-6');
});

test('coverageDelta is correct when evidenceCoverage improves', () => {
  const revA = makeRevision(1, 'Draft A');
  const revB = makeRevision(2, 'Draft B improved');

  const reportA = makeReport('rep-7', 'sub-4', 1, []);
  reportA.evidenceCoverage = 60;
  const reportB = makeReport('rep-8', 'sub-4', 2, []);
  reportB.evidenceCoverage = 95;

  const result = compareAuditRevisions(revA, revB, reportA, reportB);

  assert.equal(result.evidenceCoverageA, 60);
  assert.equal(result.evidenceCoverageB, 95);
  assert.equal(result.coverageDelta, 35, 'Coverage delta should be 35%');
});
