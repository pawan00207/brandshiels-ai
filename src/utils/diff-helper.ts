/**
 * Diff & Revision Comparison Utilities
 * Computes word-level diffs and resolves findings delta between revisions.
 */

import type { AuditReport, ContentRevision, Finding, ContentSubmission } from '../types/index.ts';

export interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/**
 * Word-level difference algorithm for editorial copy comparison
 */
export function computeWordDiff(textA: string, textB: string): DiffChunk[] {
  if (textA === textB) {
    return [{ type: 'unchanged', text: textA }];
  }

  // Tokenize preserving whitespace and punctuation
  const tokenize = (str: string) => {
    return str.match(/([^\s]+|\s+)/g) || [];
  };

  const wordsA = tokenize(textA);
  const wordsB = tokenize(textB);

  const n = wordsA.length;
  const m = wordsB.length;

  // Simple Longest Common Subsequence (LCS) matrix
  // For editorial snippets (typically < 1000 words), this is fast (<5ms)
  const maxTokens = 1200;
  if (n > maxTokens || m > maxTokens) {
    // Fast line-level fallback for huge documents
    return [
      { type: 'removed', text: textA },
      { type: 'added', text: textB },
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (wordsA[i - 1] === wordsB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const chunks: DiffChunk[] = [];
  let i = n;
  let j = m;
  const reversed: DiffChunk[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
      reversed.push({ type: 'unchanged', text: wordsA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: 'added', text: wordsB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      reversed.push({ type: 'removed', text: wordsA[i - 1] });
      i--;
    }
  }

  reversed.reverse();

  // Consolidate adjacent tokens of same type
  for (const item of reversed) {
    const last = chunks[chunks.length - 1];
    if (last && last.type === item.type) {
      last.text += item.text;
    } else {
      chunks.push({ ...item });
    }
  }

  return chunks;
}

export interface ResolvedFindingItem {
  finding: Finding;
  resolutionNote: string;
  originalExcerpt: string;
  replacementExcerpt?: string;
}

export interface RevisionComparisonResult {
  revA: ContentRevision;
  revB: ContentRevision;
  reportA: AuditReport | null;
  reportB: AuditReport | null;
  wordDiff: DiffChunk[];
  resolvedFindings: ResolvedFindingItem[];
  remainingFindings: Finding[];
  newFindings: Finding[];
  resolvedCount: number;
  remainingCount: number;
  newCount: number;
  evidenceCoverageA: number;
  evidenceCoverageB: number;
  coverageDelta: number;
  statusA: string;
  statusB: string;
}

/**
 * Compare two audit reports and their revisions, identifying resolved, remaining, and new findings
 */
export function compareAuditRevisions(
  revA: ContentRevision,
  revB: ContentRevision,
  reportA: AuditReport | null,
  reportB: AuditReport | null
): RevisionComparisonResult {
  const wordDiff = computeWordDiff(revA.content, revB.content);

  const findingsA = reportA?.findings || [];
  const findingsB = reportB?.findings || [];

  const textB = revB.content.toLowerCase();

  const resolvedFindings: ResolvedFindingItem[] = [];
  const remainingFindings: Finding[] = [];
  const newFindings: Finding[] = [];

  // Map findings in B for fast lookup
  const bExcerpts = new Set(findingsB.map((f) => f.affectedExcerpt.toLowerCase().trim()));
  const bRuleCodes = new Set(findingsB.map((f) => f.evidence.ruleCode).filter(Boolean));

  for (const fA of findingsA) {
    const excerptLower = fA.affectedExcerpt.toLowerCase().trim();
    const stillInContent = excerptLower && textB.includes(excerptLower);
    const stillInBFindings =
      bExcerpts.has(excerptLower) ||
      (fA.evidence.ruleCode && bRuleCodes.has(fA.evidence.ruleCode));

    if (!stillInContent || !stillInBFindings || fA.disposition.status === 'Accepted' || fA.disposition.status === 'Resolved') {
      // Finding was eliminated or replaced in revision B
      let resolutionNote = 'Excerpt modified or removed in target revision.';
      if (fA.suggestedCorrection?.proposedText && textB.includes(fA.suggestedCorrection.proposedText.toLowerCase())) {
        resolutionNote = `Applied approved correction: "${fA.suggestedCorrection.proposedText}"`;
      } else if (!stillInContent) {
        resolutionNote = `Problematic phrasing "${fA.affectedExcerpt}" was successfully eliminated.`;
      } else {
        resolutionNote = 'Finding disposition resolved and validated.';
      }

      resolvedFindings.push({
        finding: fA,
        resolutionNote,
        originalExcerpt: fA.affectedExcerpt,
        replacementExcerpt: fA.suggestedCorrection?.proposedText,
      });
    } else {
      // Still present in revision B
      remainingFindings.push(fA);
    }
  }

  // Check for any new findings in B that weren't in A
  const aExcerpts = new Set(findingsA.map((f) => f.affectedExcerpt.toLowerCase().trim()));
  for (const fB of findingsB) {
    const excerptLower = fB.affectedExcerpt.toLowerCase().trim();
    if (!aExcerpts.has(excerptLower)) {
      newFindings.push(fB);
    }
  }

  const evidenceCoverageA = reportA?.evidenceCoverage ?? (findingsA.length === 0 ? 100 : 60);
  const evidenceCoverageB = reportB?.evidenceCoverage ?? (findingsB.length === 0 ? 100 : Math.min(100, evidenceCoverageA + resolvedFindings.length * 15));
  const coverageDelta = evidenceCoverageB - evidenceCoverageA;

  return {
    revA,
    revB,
    reportA,
    reportB,
    wordDiff,
    resolvedFindings,
    remainingFindings,
    newFindings,
    resolvedCount: resolvedFindings.length,
    // remainingCount is simply the count of findings from A that are still present in B.
    remainingCount: remainingFindings.length,
    newCount: newFindings.length,
    evidenceCoverageA,
    evidenceCoverageB,
    coverageDelta,
    statusA: reportA?.complianceStatus || 'Issues found',
    statusB: reportB?.complianceStatus || (remainingFindings.length === 0 && newFindings.length === 0 ? 'No issues detected' : 'Issues found'),
  };
}
