import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Check,
  X,
  FileText,
  Filter,
} from 'lucide-react';
import type {
  ContentSubmission,
  AuditReport,
  Finding,
  UserProfile,
} from '../types/index.ts';
import { storage } from '../db/storage.ts';
import {
  compareAuditRevisions,
  RevisionComparisonResult,
} from '../utils/diff-helper.ts';

interface RevisionComparisonViewProps {
  submission: ContentSubmission;
  currentUser: UserProfile;
  initialVersionA?: number;
  initialVersionB?: number;
  onClose?: () => void;
  onApplyRemainingFix?: (finding: Finding) => void;
  onSwitchToVersion?: (version: number) => void;
}

export const RevisionComparisonView: React.FC<RevisionComparisonViewProps> = ({
  submission,
  currentUser,
  initialVersionA,
  initialVersionB,
  onClose,
  onApplyRemainingFix,
  onSwitchToVersion,
}) => {
  const revisions = submission.revisions;
  const defaultVersionA =
    initialVersionA ?? (revisions.length > 1 ? revisions[revisions.length - 2].version : 1);
  const defaultVersionB = initialVersionB ?? submission.currentVersion;

  const [verA, setVerA] = useState<number>(defaultVersionA);
  const [verB, setVerB] = useState<number>(defaultVersionB);
  const [reportA, setReportA] = useState<AuditReport | null>(null);
  const [reportB, setReportB] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'resolved' | 'remaining' | 'new'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'inline'>('split');

  // Load audit reports for both revisions
  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      setLoading(true);
      const revAObj = revisions.find((r) => r.version === verA);
      const revBObj = revisions.find((r) => r.version === verB);

      let repA: AuditReport | null = null;
      let repB: AuditReport | null = null;

      if (revAObj?.auditReportId) {
        repA = await storage.getAuditReportById(revAObj.auditReportId);
      }
      if (revBObj?.auditReportId) {
        repB = await storage.getAuditReportById(revBObj.auditReportId);
      }

      if (isMounted) {
        setReportA(repA);
        setReportB(repB);
        setLoading(false);
      }
    }
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [verA, verB, submission]);

  const revAObj = revisions.find((r) => r.version === verA) || revisions[0];
  const revBObj =
    revisions.find((r) => r.version === verB) || revisions[revisions.length - 1];

  if (!revAObj || !revBObj) {
    return (
      <div className="rounded border border-stone-200 bg-white p-6 text-center dark:border-stone-800 dark:bg-[#121214]">
        <p className="text-xs text-stone-500">Not enough revisions available for comparison.</p>
      </div>
    );
  }

  const comparison: RevisionComparisonResult = compareAuditRevisions(
    revAObj,
    revBObj,
    reportA,
    reportB
  );

  return (
    <div className="space-y-6">
      {/* Top Comparison Control Bar */}
      <div className="rounded-lg border border-[#B8975A]/40 bg-white p-5 shadow-xs dark:border-[#B8975A]/30 dark:bg-[#121214]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B8975A]/10 text-[#B8975A]">
              <GitCompare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Audit Revision Diff & Finding Reconciliation
              </h3>
              <p className="text-xs text-stone-500">
                Side-by-side governance comparison tracking resolved brand findings across revisions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded border border-stone-200 bg-stone-50 p-0.5 text-xs dark:border-stone-700 dark:bg-stone-800">
              <button
                onClick={() => setViewMode('split')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white shadow-xs text-stone-900 dark:bg-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                Side-by-Side Split
              </button>
              <button
                onClick={() => setViewMode('inline')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  viewMode === 'inline'
                    ? 'bg-white shadow-xs text-stone-900 dark:bg-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                Inline Word Diff
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="rounded border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
              >
                Exit Comparison
              </button>
            )}
          </div>
        </div>

        {/* Version Pickers & Delta Summary Bar */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 items-center">
          {/* Baseline Picker (vA) */}
          <div className="md:col-span-5 rounded border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Baseline (Earlier Revision)
              </span>
              <span className="font-mono text-xs text-stone-500">
                {new Date(revAObj.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={verA}
                onChange={(e) => setVerA(Number(e.target.value))}
                className="w-full rounded border border-stone-300 bg-white p-1.5 text-xs font-semibold text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                {revisions.map((r) => (
                  <option key={r.version} value={r.version}>
                    Version {r.version} — {r.changeSummary.slice(0, 45)} ({r.createdBy})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
              <span>Coverage: <strong className="font-mono text-stone-700 dark:text-stone-300">{comparison.evidenceCoverageA}%</strong></span>
              <span>Findings: <strong className="font-mono text-rose-600 dark:text-rose-400">{reportA?.findings.length ?? 'None'}</strong></span>
            </div>
          </div>

          {/* Delta Arrow */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B8975A]/20 text-[#B8975A]">
              <ArrowRight className="h-4 w-4" />
            </div>
            <span className="mt-1 font-mono text-[10px] text-stone-400">
              v{verA} → v{verB}
            </span>
          </div>

          {/* Target Picker (vB) */}
          <div className="md:col-span-5 rounded border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B8975A]">
                Target (Revised Revision) {verB === submission.currentVersion ? '(Active)' : ''}
              </span>
              <span className="font-mono text-xs text-stone-500">
                {new Date(revBObj.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={verB}
                onChange={(e) => setVerB(Number(e.target.value))}
                className="w-full rounded border border-stone-300 bg-white p-1.5 text-xs font-semibold text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                {revisions.map((r) => (
                  <option key={r.version} value={r.version}>
                    Version {r.version} — {r.changeSummary.slice(0, 45)} ({r.createdBy})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
              <span>Coverage: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{comparison.evidenceCoverageB}%</strong></span>
              <span>Findings: <strong className="font-mono text-stone-700 dark:text-stone-300">{reportB?.findings.length ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Delta Metrics KPI Pill Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-stone-100 pt-4 dark:border-stone-800">
          <div className="rounded bg-emerald-50/60 p-2.5 text-left border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Resolved Findings</span>
            </div>
            <div className="mt-1 font-serif text-xl font-bold text-emerald-900 dark:text-emerald-200">
              {comparison.resolvedCount}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
              Violations eliminated in v{verB}
            </div>
          </div>

          <div className="rounded bg-amber-50/60 p-2.5 text-left border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Remaining Findings</span>
            </div>
            <div className="mt-1 font-serif text-xl font-bold text-amber-900 dark:text-amber-200">
              {comparison.remainingCount}
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400">
              Require further editorial edits
            </div>
          </div>

          <div className="rounded bg-blue-50/60 p-2.5 text-left border border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-900/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 text-blue-600" />
              <span>New Findings</span>
            </div>
            <div className="mt-1 font-serif text-xl font-bold text-blue-900 dark:text-blue-200">
              {comparison.newCount}
            </div>
            <div className="text-[10px] text-blue-700 dark:text-blue-400">
              Introduced in target revision
            </div>
          </div>

          <div className="rounded bg-[#B8975A]/10 p-2.5 text-left border border-[#B8975A]/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8C6D32] dark:text-[#E2C98D]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#B8975A]" />
              <span>Evidence Coverage Delta</span>
            </div>
            <div className="mt-1 font-serif text-xl font-bold text-[#7A5E2E] dark:text-[#E2C98D]">
              {comparison.coverageDelta >= 0 ? `+${comparison.coverageDelta}%` : `${comparison.coverageDelta}%`}
            </div>
            <div className="text-[10px] text-[#8C6D32] dark:text-[#E2C98D]">
              From {comparison.evidenceCoverageA}% to {comparison.evidenceCoverageB}%
            </div>
          </div>
        </div>
      </div>

      {/* Content Diff Section (Split or Inline) */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-[#121214]">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Content Differences (Word-Level Audit Diff)
          </span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500"></span> Removed in v{verA}
            </span>
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Corrected / Added in v{verB}
            </span>
          </div>
        </div>

        {viewMode === 'split' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Version A Content */}
            <div className="rounded border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3 dark:border-stone-800">
                <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                  Version {verA} Text
                </span>
                <span className="text-[11px] text-stone-400 italic">
                  {revAObj.changeSummary || 'Initial version'}
                </span>
              </div>
              <div className="font-sans text-xs leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                {comparison.wordDiff.map((chunk, idx) => {
                  if (chunk.type === 'removed') {
                    return (
                      <span
                        key={idx}
                        className="bg-rose-100 text-rose-900 line-through underline decoration-rose-400 px-0.5 rounded dark:bg-rose-950/60 dark:text-rose-200"
                        title="Removed or replaced"
                      >
                        {chunk.text}
                      </span>
                    );
                  }
                  if (chunk.type === 'unchanged') {
                    return <span key={idx}>{chunk.text}</span>;
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Version B Content */}
            <div className="rounded border border-stone-200 bg-emerald-50/20 p-4 dark:border-stone-800 dark:bg-stone-900/30">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3 dark:border-stone-800">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Version {verB} Text {verB === submission.currentVersion ? '(Active)' : ''}
                </span>
                <span className="text-[11px] text-stone-400 italic">
                  {revBObj.changeSummary || 'Revised version'}
                </span>
              </div>
              <div className="font-sans text-xs leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                {comparison.wordDiff.map((chunk, idx) => {
                  if (chunk.type === 'added') {
                    return (
                      <span
                        key={idx}
                        className="bg-emerald-100 text-emerald-900 font-semibold px-0.5 rounded border-b border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200"
                        title="Added or corrected"
                      >
                        {chunk.text}
                      </span>
                    );
                  }
                  if (chunk.type === 'unchanged') {
                    return <span key={idx}>{chunk.text}</span>;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Inline Diff */
          <div className="mt-4 rounded border border-stone-200 bg-stone-50/40 p-4 font-sans text-xs leading-relaxed dark:border-stone-800 dark:bg-stone-900/30 whitespace-pre-wrap">
            {comparison.wordDiff.map((chunk, idx) => {
              if (chunk.type === 'removed') {
                return (
                  <span
                    key={idx}
                    className="bg-rose-100 text-rose-800 line-through px-0.5 mx-0.5 rounded dark:bg-rose-950/60 dark:text-rose-200"
                  >
                    {chunk.text}
                  </span>
                );
              }
              if (chunk.type === 'added') {
                return (
                  <span
                    key={idx}
                    className="bg-emerald-100 text-emerald-900 font-semibold px-0.5 mx-0.5 rounded dark:bg-emerald-950/60 dark:text-emerald-200"
                  >
                    {chunk.text}
                  </span>
                );
              }
              return <span key={idx}>{chunk.text}</span>;
            })}
          </div>
        )}
      </div>

      {/* Findings Reconciliation Section */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-[#121214]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 dark:border-stone-800">
          <div>
            <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
              Findings Reconciliation Matrix
            </h4>
            <p className="text-xs text-stone-500">
              Specific brand findings resolved, remaining, or newly introduced between revisions
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white dark:bg-[#B8975A]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              All Findings ({comparison.resolvedCount + comparison.remainingCount + comparison.newCount})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'resolved'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              <Check className="h-3 w-3" /> Resolved ({comparison.resolvedCount})
            </button>
            <button
              onClick={() => setActiveTab('remaining')}
              className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'remaining'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="h-3 w-3" /> Remaining ({comparison.remainingCount})
            </button>
            {comparison.newCount > 0 && (
              <button
                onClick={() => setActiveTab('new')}
                className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'new'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                }`}
              >
                <Info className="h-3 w-3" /> New ({comparison.newCount})
              </button>
            )}
          </div>
        </div>

        {/* List of Reconciled Findings */}
        <div className="mt-4 space-y-3">
          {/* 1. RESOLVED FINDINGS */}
          {(activeTab === 'all' || activeTab === 'resolved') && comparison.resolvedFindings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Resolved Brand Violations ({comparison.resolvedFindings.length})</span>
              </div>

              {comparison.resolvedFindings.map(({ finding, resolutionNote, originalExcerpt, replacementExcerpt }) => (
                <div
                  key={finding.id}
                  className="rounded border border-emerald-300/70 bg-emerald-50/40 p-4 transition-all dark:border-emerald-900/60 dark:bg-emerald-950/15"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        ✓ Resolved in v{verB}
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                        {finding.evidence.ruleCode || finding.id}
                      </span>
                      <span className="text-xs text-stone-500">· {finding.category}</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
                      Originally flagged as {finding.severity}
                    </span>
                  </div>

                  <div className="mt-2 text-xs">
                    <span className="text-stone-500">Original violation: </span>
                    <span className="font-mono line-through text-rose-700 dark:text-rose-400 font-semibold mr-2">
                      "{originalExcerpt}"
                    </span>
                    {replacementExcerpt && (
                      <>
                        <span className="text-stone-400">→</span>
                        <span className="ml-2 font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                          "{replacementExcerpt}"
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                    <strong className="text-stone-700 dark:text-stone-300">Resolution: </strong>
                    {resolutionNote}
                  </p>

                  <div className="mt-2 text-[11px] text-stone-500 bg-white/60 dark:bg-stone-900/60 p-2 rounded border border-stone-200/50 dark:border-stone-800">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">Grounding Evidence: </span>
                    {finding.evidence.exactText || finding.plainRationale}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. REMAINING FINDINGS */}
          {(activeTab === 'all' || activeTab === 'remaining') && comparison.remainingFindings.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Remaining Findings Requiring Remediation ({comparison.remainingFindings.length})</span>
              </div>

              {comparison.remainingFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded border border-amber-300/70 bg-amber-50/30 p-4 transition-all dark:border-amber-900/60 dark:bg-amber-950/15"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Active in v{verB}
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                        {finding.evidence.ruleCode || finding.id}
                      </span>
                      <span className="text-xs text-stone-500">· {finding.category}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400">
                      Severity: {finding.severity}
                    </span>
                  </div>

                  <div className="mt-2 text-xs">
                    <span className="text-stone-500">Problematic Excerpt: </span>
                    <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold bg-amber-100/70 dark:bg-amber-900/40 px-1 py-0.5 rounded">
                      "{finding.affectedExcerpt}"
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">
                    {finding.plainRationale}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/40 text-xs">
                    <span className="text-stone-500">
                      Suggested: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">"{finding.suggestedCorrection.proposedText}"</strong>
                    </span>

                    {onApplyRemainingFix && (
                      <button
                        onClick={() => onApplyRemainingFix(finding)}
                        className="rounded bg-[#B8975A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#A07F43]"
                      >
                        Apply Fix to Active Draft
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. NEW FINDINGS */}
          {(activeTab === 'all' || activeTab === 'new') && comparison.newFindings.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-400">
                <Info className="h-4 w-4" />
                <span>Newly Detected Findings ({comparison.newFindings.length})</span>
              </div>

              {comparison.newFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded border border-blue-300/70 bg-blue-50/30 p-4 transition-all dark:border-blue-900/60 dark:bg-blue-950/15"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      New in v{verB}
                    </span>
                    <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                      {finding.evidence.ruleCode || finding.id}
                    </span>
                    <span className="text-xs text-stone-500">· {finding.category}</span>
                  </div>
                  <p className="mt-2 text-xs text-stone-700 dark:text-stone-300">{finding.plainRationale}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state when everything is resolved */}
          {comparison.resolvedCount > 0 && comparison.remainingCount === 0 && comparison.newCount === 0 && (
            <div className="rounded border border-emerald-300 bg-emerald-50/40 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <h5 className="mt-2 font-serif text-base font-bold text-emerald-900 dark:text-emerald-200">
                Flawless Editorial Reconciliation
              </h5>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">
                All {comparison.resolvedCount} violations detected in Version {verA} have been
                fully addressed in Version {verB}. Zero unresolved findings remain.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
