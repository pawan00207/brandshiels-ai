import React, { useState } from 'react';
import { History, X, RotateCcw, GitCompare, ChevronRight } from 'lucide-react';
import { ContentRevision } from '../types/index.ts';

interface RevisionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: ContentRevision[];
  currentVersion: number;
  onRestoreVersion: (version: number) => void;
}

export const RevisionHistoryDrawer: React.FC<RevisionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  revisions,
  currentVersion,
  onRestoreVersion,
}) => {
  const [compareVersionA, setCompareVersionA] = useState<number>(
    revisions.length > 1 ? revisions[revisions.length - 2].version : 1
  );
  const [compareVersionB, setCompareVersionB] = useState<number>(currentVersion);
  const [showDiff, setShowDiff] = useState<boolean>(false);

  if (!isOpen) return null;

  const revA = revisions.find((r) => r.version === compareVersionA);
  const revB = revisions.find((r) => r.version === compareVersionB);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="flex h-full w-full max-w-2xl flex-col bg-stone-50 shadow-2xl dark:bg-[#141417] border-l border-stone-200 dark:border-stone-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#B8975A]" />
            <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
              Revision History & Audit Trace
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="Close revision drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Comparison Bar */}
          <div className="rounded border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Compare Revisions
              </span>
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="flex items-center gap-1 text-xs text-[#B8975A] font-semibold hover:underline"
              >
                <GitCompare className="h-3.5 w-3.5" />
                {showDiff ? 'Hide Side-by-Side Diff' : 'View Side-by-Side Diff'}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs">
              <div className="flex-1">
                <label className="block text-[11px] text-stone-400 mb-1">Baseline Revision:</label>
                <select
                  value={compareVersionA}
                  onChange={(e) => setCompareVersionA(Number(e.target.value))}
                  className="w-full rounded border border-stone-200 bg-stone-50 p-1.5 dark:border-stone-700 dark:bg-stone-800"
                >
                  {revisions.map((r) => (
                    <option key={r.version} value={r.version}>
                      v{r.version} ({new Date(r.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <ChevronRight className="h-4 w-4 text-stone-400 mt-4" />

              <div className="flex-1">
                <label className="block text-[11px] text-stone-400 mb-1">Target Revision:</label>
                <select
                  value={compareVersionB}
                  onChange={(e) => setCompareVersionB(Number(e.target.value))}
                  className="w-full rounded border border-stone-200 bg-stone-50 p-1.5 dark:border-stone-700 dark:bg-stone-800"
                >
                  {revisions.map((r) => (
                    <option key={r.version} value={r.version}>
                      v{r.version} {r.version === currentVersion ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-side diff */}
            {showDiff && revA && revB && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono border-t border-stone-200 pt-3 dark:border-stone-800">
                <div className="rounded bg-rose-50/50 p-3 border border-rose-200/50 dark:bg-rose-950/20 dark:border-rose-900/40">
                  <div className="font-semibold text-rose-800 dark:text-rose-300 mb-1">
                    v{revA.version} Text:
                  </div>
                  <p className="whitespace-pre-wrap text-stone-700 dark:text-stone-300 text-[11px]">
                    {revA.content}
                  </p>
                </div>
                <div className="rounded bg-emerald-50/50 p-3 border border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                    v{revB.version} Text:
                  </div>
                  <p className="whitespace-pre-wrap text-stone-700 dark:text-stone-300 text-[11px]">
                    {revB.content}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline of Revisions */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Revision Timeline ({revisions.length})
            </h4>

            {revisions
              .slice()
              .reverse()
              .map((rev) => {
                const isCurrent = rev.version === currentVersion;
                return (
                  <div
                    key={rev.version}
                    className={`rounded border p-4 transition-all ${
                      isCurrent
                        ? 'border-[#B8975A] bg-[#B8975A]/5 dark:bg-[#B8975A]/10'
                        : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#B8975A]">
                          Version {rev.version}
                        </span>
                        {isCurrent && (
                          <span className="rounded bg-[#B8975A] px-1.5 py-0.2 text-[10px] font-medium text-white">
                            Current Active
                          </span>
                        )}
                        <span className="text-stone-400">·</span>
                        <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                          {rev.createdBy}
                        </span>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Restore Version ${rev.version}? This creates a new revision with that content.`
                              )
                            ) {
                              onRestoreVersion(rev.version);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-[#B8975A] hover:underline"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-stone-700 dark:text-stone-300">
                      {rev.changeSummary || 'Draft modification.'}
                    </p>

                    <div className="mt-2 text-[11px] text-stone-400">
                      {new Date(rev.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
