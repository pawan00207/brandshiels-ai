import React, { useState } from 'react';
import { Flag, X, Check } from 'lucide-react';
import { Finding, GuidelineFeedback, UserProfile } from '../types/index.ts';
import { storage } from '../db/storage.ts';

interface GuidelineFeedbackModalProps {
  finding: Finding | null;
  currentUser: UserProfile;
  brandId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const GuidelineFeedbackModal: React.FC<GuidelineFeedbackModalProps> = ({
  finding,
  currentUser,
  brandId,
  onClose,
  onSubmitted,
}) => {
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!finding) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackNote.trim()) return;

    const feedback: GuidelineFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: finding.evidence.sourceId || finding.evidence.ruleCode || 'unknown',
      ruleCode: finding.evidence.ruleCode || 'RULE-01',
      brandId,
      submittedBy: currentUser.name,
      submittedAt: new Date().toISOString(),
      findingExcerpt: finding.affectedExcerpt,
      feedbackNote: feedbackNote.trim(),
      status: 'Open',
    };

    await storage.saveGuidelineFeedback(feedback);
    await storage.logAuditEvent({
      workspaceId: currentUser.workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'FLAG_GUIDELINE_AMBIGUITY',
      entityType: 'guideline',
      entityId: feedback.ruleCode,
      details: `User flagged rule ${feedback.ruleCode} as ambiguous or conflicting: "${feedbackNote.trim()}".`,
    });

    setSubmitted(true);
    setTimeout(() => {
      onSubmitted?.();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-[#141417]">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[#B8975A]" />
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
              Flag Guideline as Ambiguous or Conflicting
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center text-xs text-emerald-700 dark:text-emerald-400">
            <Check className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
            <p className="font-semibold">Feedback submitted to Brand Governance Queue</p>
            <p className="text-stone-500 mt-1">Admin will review and can issue an updated rule version.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div className="rounded bg-stone-50 p-3 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <span className="font-mono text-[10px] text-[#B8975A] font-bold block mb-1">
                Rule: {finding.evidence.ruleCode || 'N/A'} — {finding.evidence.sourceTitle}
              </span>
              <p className="text-stone-600 dark:text-stone-400 italic">
                "{finding.evidence.exactText || finding.plainRationale}"
              </p>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Why is this guideline ambiguous or problematic?
              </label>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                required
                rows={3}
                placeholder="e.g. This rule conflicts with our current press channel requirements; or the phrasing is too restrictive for seasonal storytelling..."
                className="w-full rounded border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#B8975A] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-[#B8975A] px-4 py-1.5 font-medium text-white hover:bg-[#A07F43]"
              >
                Submit Feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
