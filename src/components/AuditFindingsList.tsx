import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Cpu,
  Bookmark,
  ExternalLink,
  Flag,
  ArrowRight,
  Check,
  X,
  Edit3,
  HelpCircle,
  FileQuestion,
  Filter,
} from 'lucide-react';
import {
  Finding,
  SeverityLevel,
  GuidelineCategory,
  DispositionStatus,
  UserProfile,
} from '../types/index.ts';

interface AuditFindingsListProps {
  findings: Finding[];
  currentUser: UserProfile;
  onDispositionChange: (
    findingId: string,
    status: DispositionStatus,
    reason?: string,
    editedCorrection?: string
  ) => void;
  onJumpToExcerpt?: (excerpt: string) => void;
  onFlagGuideline?: (finding: Finding) => void;
  onRegenerateSuggestion?: (findingId: string) => void;
}

export const AuditFindingsList: React.FC<AuditFindingsListProps> = ({
  findings,
  currentUser,
  onDispositionChange,
  onJumpToExcerpt,
  onFlagGuideline,
  onRegenerateSuggestion,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyEvidenceGaps, setOnlyEvidenceGaps] = useState<boolean>(false);
  const [editingCorrectionId, setEditingCorrectionId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [rejectingFindingId, setRejectingFindingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const severityConfig: Record<
    SeverityLevel,
    { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; bgClass: string }
  > = {
    Critical: {
      label: 'Critical Violation',
      icon: AlertOctagon,
      colorClass: 'text-rose-700 dark:text-rose-400',
      bgClass: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900',
    },
    High: {
      label: 'High Severity',
      icon: AlertTriangle,
      colorClass: 'text-amber-700 dark:text-amber-400',
      bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900',
    },
    Medium: {
      label: 'Medium Severity',
      icon: AlertTriangle,
      colorClass: 'text-stone-700 dark:text-stone-300',
      bgClass: 'bg-stone-100 border-stone-200 dark:bg-stone-800/60 dark:border-stone-700',
    },
    Low: {
      label: 'Low Severity',
      icon: Info,
      colorClass: 'text-stone-600 dark:text-stone-400',
      bgClass: 'bg-stone-50 border-stone-200 dark:bg-stone-900 dark:border-stone-800',
    },
    Info: {
      label: 'Information / Guardrail',
      icon: Info,
      colorClass: 'text-sky-700 dark:text-sky-400',
      bgClass: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900',
    },
  };

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (onlyEvidenceGaps && !f.evidence.hasEvidenceGap) return false;
    return true;
  });

  // Severity counts
  const criticalCount = findings.filter((f) => f.severity === 'Critical').length;
  const highCount = findings.filter((f) => f.severity === 'High').length;
  const mediumCount = findings.filter((f) => f.severity === 'Medium').length;
  const gapCount = findings.filter((f) => f.evidence.hasEvidenceGap).length;

  return (
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3 text-xs dark:border-stone-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-stone-500 uppercase tracking-wider">
            Findings ({findings.length})
          </span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          {criticalCount > 0 && (
            <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertOctagon className="h-3.5 w-3.5" /> {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {highCount} High
            </span>
          )}
          {mediumCount > 0 && (
            <span className="text-stone-600 dark:text-stone-400">{mediumCount} Medium</span>
          )}
          {gapCount > 0 && (
            <span className="font-medium text-[#B8975A] flex items-center gap-1">
              <FileQuestion className="h-3.5 w-3.5" /> {gapCount} Evidence Gaps
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            aria-label="Filter by severity"
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
            <option value="Medium">Medium Only</option>
            <option value="Low">Low Only</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            <option value="Claims">Claims</option>
            <option value="Terminology">Terminology</option>
            <option value="Tone">Tone</option>
            <option value="Messaging">Messaging</option>
            <option value="Accessibility">Accessibility</option>
            <option value="Visual">Visual</option>
            <option value="Legal-adjacent">Legal-adjacent</option>
          </select>

          <button
            onClick={() => setOnlyEvidenceGaps(!onlyEvidenceGaps)}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              onlyEvidenceGaps
                ? 'border-[#B8975A] bg-[#B8975A]/15 text-[#B8975A] font-semibold'
                : 'border-stone-200 bg-white text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400'
            }`}
          >
            Evidence Gaps Only
          </button>
        </div>
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="rounded border border-stone-200 bg-stone-50/50 p-8 text-center dark:border-stone-800 dark:bg-stone-900/30">
          <CheckCircle2 className="mx-auto h-8 w-8 text-[#B8975A]" />
          <h4 className="mt-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
            No matching findings
          </h4>
          <p className="mt-1 text-xs text-stone-500">
            All evaluated checks for this filter passed current brand governance criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const sev = severityConfig[finding.severity] || severityConfig.Medium;
            const SevIcon = sev.icon;
            const isEditing = editingCorrectionId === finding.id;
            const isRejecting = rejectingFindingId === finding.id;
            const isReadonly = currentUser.role === 'viewer';

            return (
              <div
                key={finding.id}
                className={`rounded border p-4 transition-all ${
                  finding.disposition.status === 'Accepted'
                    ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/10'
                    : finding.disposition.status === 'Rejected'
                    ? 'border-stone-200 bg-stone-100/50 opacity-60 dark:border-stone-800 dark:bg-stone-900/40'
                    : sev.bgClass
                }`}
              >
                {/* Header row: Category, Severity, Source Badge, Jump Button */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 font-semibold text-xs ${sev.colorClass}`}>
                      <SevIcon className="h-4 w-4" />
                      {sev.label}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">·</span>
                    <span className="font-mono text-xs uppercase text-stone-500">
                      {finding.category}
                    </span>
                    {finding.isAIGenerated && (
                      <span className="flex items-center gap-1 rounded bg-[#B8975A]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#B8975A]">
                        <Sparkles className="h-3 w-3" /> AI-assisted
                      </span>
                    )}
                    {!finding.isAIGenerated && (
                      <span className="flex items-center gap-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        <Cpu className="h-3 w-3" /> Deterministic rule
                      </span>
                    )}
                  </div>

                  {/* Jump to Excerpt in Document */}
                  {onJumpToExcerpt && finding.affectedExcerpt && (
                    <button
                      onClick={() => onJumpToExcerpt(finding.affectedExcerpt)}
                      className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#B8975A] transition-colors"
                      title="Jump to highlighted location in document"
                    >
                      <span>Jump to excerpt</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Affected Excerpt */}
                <div className="mt-2.5 rounded bg-white/70 p-2.5 font-mono text-xs text-stone-800 border border-stone-200/60 dark:bg-[#121214] dark:border-stone-800 dark:text-stone-200">
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                    Affected Text Excerpt:
                  </span>
                  <span className="bg-[#B8975A]/20 px-1 py-0.5 rounded text-stone-900 dark:text-stone-100 font-semibold">
                    "{finding.affectedExcerpt}"
                  </span>
                </div>

                {/* Plain-language Rationale */}
                <p className="mt-2 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                  {finding.plainRationale}
                </p>

                {/* Evidence Block (Improvement #1) */}
                <div className="mt-3 rounded border border-stone-200/80 bg-stone-50/80 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/60">
                  {finding.evidence.hasEvidenceGap ? (
                    <div className="text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <FileQuestion className="h-4 w-4 text-[#B8975A]" />
                        <span>Evidence Gap — Unverified assertion</span>
                      </div>
                      <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-400 leading-normal">
                        {finding.evidence.gapExplanation ||
                          'No approved guideline or verified fact in the brand knowledge repository covers this claim. Treated as unverified, not false.'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                        <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                          <Bookmark className="h-3.5 w-3.5 text-[#B8975A]" />
                          {finding.evidence.sourceTitle || 'Approved Guideline'}
                          {finding.evidence.ruleCode && (
                            <span className="font-mono text-[#B8975A]">
                              [{finding.evidence.ruleCode} v{finding.evidence.version || 1}]
                            </span>
                          )}
                        </span>
                        {finding.evidence.owner && <span>Owner: {finding.evidence.owner}</span>}
                      </div>
                      {finding.evidence.exactText && (
                        <p className="mt-1.5 italic text-[11px] text-stone-600 dark:text-stone-400 border-l-2 border-[#B8975A]/40 pl-2">
                          "{finding.evidence.exactText}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Confidence rating */}
                  <div className="mt-2 flex items-center justify-between border-t border-stone-200/50 pt-2 text-[11px] text-stone-400 dark:border-stone-800">
                    <span>
                      Confidence: <strong className="text-stone-700 dark:text-stone-300">{finding.confidence}</strong> —{' '}
                      {finding.confidenceNote}
                    </span>
                    {onFlagGuideline && finding.evidence.ruleCode && (
                      <button
                        onClick={() => onFlagGuideline(finding)}
                        className="flex items-center gap-1 text-stone-500 hover:text-[#B8975A] transition-colors"
                        title="Report this guideline as ambiguous or conflicting"
                      >
                        <Flag className="h-3 w-3" /> Flag guideline
                      </button>
                    )}
                  </div>
                </div>

                {/* Suggested Correction with Inline Diff (Improvement #2) */}
                <div className="mt-3 rounded border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-[#121214]">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    <span>Proposed Surgical Correction</span>
                    {onRegenerateSuggestion && finding.isAIGenerated && (
                      <button
                        onClick={() => onRegenerateSuggestion(finding.id)}
                        className="text-[11px] text-[#B8975A] hover:underline"
                      >
                        Regenerate
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-stone-300 p-2 text-xs text-stone-900 focus:border-[#B8975A] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        placeholder="Customize surgical replacement..."
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingCorrectionId(null)}
                          className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onDispositionChange(finding.id, 'Edit & accept', undefined, editedText);
                            setEditingCorrectionId(null);
                          }}
                          className="rounded bg-[#B8975A] px-3 py-1 text-xs font-medium text-white hover:bg-[#A07F43]"
                        >
                          Save & Apply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs">
                      {/* Diff display */}
                      <div className="flex flex-col gap-1.5 font-mono">
                        <div className="text-rose-700 dark:text-rose-400 bg-rose-50/50 p-1 rounded dark:bg-rose-950/20">
                          <span className="font-bold mr-1.5">-</span>
                          <del className="no-underline">{finding.suggestedCorrection.originalText}</del>
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 p-1 rounded dark:bg-emerald-950/20">
                          <span className="font-bold mr-1.5">+</span>
                          <span>
                            {finding.disposition.editedCorrectionText ||
                              finding.suggestedCorrection.proposedText}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-stone-500">
                        {finding.suggestedCorrection.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Rejection Reason Form */}
                {isRejecting && (
                  <div className="mt-3 rounded border border-rose-200 bg-rose-50/30 p-2.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <label className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 block mb-1">
                      Reason for Rejecting Finding (Logged in Audit History):
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Authorized exception by Legal, artistic license..."
                      className="w-full rounded border border-rose-300 p-1.5 text-xs text-stone-900 dark:border-rose-800 dark:bg-stone-900 dark:text-stone-100"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setRejectingFindingId(null)}
                        className="text-xs text-stone-500 hover:text-stone-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onDispositionChange(
                            finding.id,
                            'Rejected',
                            rejectReason || 'Creator rejected finding without detailed note'
                          );
                          setRejectingFindingId(null);
                          setRejectReason('');
                        }}
                        className="rounded bg-rose-700 px-3 py-1 text-xs font-medium text-white hover:bg-rose-800"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}

                {/* Human Disposition Controls */}
                {!isReadonly && !isEditing && !isRejecting && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 pt-2.5 dark:border-stone-800">
                    <div className="text-[11px] text-stone-500">
                      Status:{' '}
                      <strong className="text-stone-800 dark:text-stone-200">
                        {finding.disposition.status}
                      </strong>
                      {finding.disposition.reason && (
                        <span className="italic ml-1">({finding.disposition.reason})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onDispositionChange(finding.id, 'Accepted')}
                        className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          finding.disposition.status === 'Accepted'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                        title="Accept proposal and create new revision"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>

                      <button
                        onClick={() => {
                          setEditingCorrectionId(finding.id);
                          setEditedText(
                            finding.disposition.editedCorrectionText ||
                              finding.suggestedCorrection.proposedText
                          );
                        }}
                        className="flex items-center gap-1 rounded bg-stone-100 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                        title="Edit suggestion before accepting"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>

                      <button
                        onClick={() => {
                          setRejectingFindingId(finding.id);
                          setRejectReason('');
                        }}
                        className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${
                          finding.disposition.status === 'Rejected'
                            ? 'bg-stone-800 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400'
                        }`}
                        title="Reject finding with written justification"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>

                      <button
                        onClick={() => onDispositionChange(finding.id, 'Needs review')}
                        className="rounded px-2 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                        title="Flag for senior reviewer discussion"
                      >
                        Needs Review
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
