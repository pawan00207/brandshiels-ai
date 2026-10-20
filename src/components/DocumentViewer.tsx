import React from 'react';
import { Finding } from '../types/index.ts';

interface DocumentViewerProps {
  content: string;
  mediaUrl?: string;
  mediaType?: 'image/png' | 'image/jpeg' | 'text';
  findings: Finding[];
  selectedExcerpt?: string;
  onSelectExcerpt?: (excerpt: string) => void;
  title?: string;
  version?: number;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  content,
  mediaUrl,
  mediaType,
  findings,
  selectedExcerpt,
  onSelectExcerpt,
  title,
  version,
}) => {
  // Build highlighted markup
  const renderHighlightedContent = () => {
    if (!content) {
      return <p className="italic text-stone-400">No text content available.</p>;
    }

    // Identify unique excerpts with findings
    const excerpts = findings
      .map((f) => ({
        excerpt: f.affectedExcerpt,
        severity: f.severity,
        findingId: f.id,
      }))
      .filter((e) => e.excerpt && e.excerpt.length > 2);

    if (excerpts.length === 0) {
      return (
        <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-800 dark:text-stone-200">
          {content}
        </div>
      );
    }

    // Split text into tokens based on excerpts
    let renderedElements: React.ReactNode[] = [];
    let remainingText = content;
    let keyIdx = 0;

    // Simple robust tokenizer for highlighted passages
    while (remainingText.length > 0) {
      let earliestMatchIndex = -1;
      let earliestMatchExcerpt = '';
      let earliestMatchSeverity = 'Medium';

      for (const item of excerpts) {
        const idx = remainingText.toLowerCase().indexOf(item.excerpt.toLowerCase());
        if (idx !== -1 && (earliestMatchIndex === -1 || idx < earliestMatchIndex)) {
          earliestMatchIndex = idx;
          earliestMatchExcerpt = remainingText.slice(idx, idx + item.excerpt.length);
          earliestMatchSeverity = item.severity;
        }
      }

      if (earliestMatchIndex === -1) {
        renderedElements.push(
          <span key={`text-${keyIdx++}`}>{remainingText}</span>
        );
        break;
      }

      // Add text before match
      if (earliestMatchIndex > 0) {
        renderedElements.push(
          <span key={`text-${keyIdx++}`}>
            {remainingText.slice(0, earliestMatchIndex)}
          </span>
        );
      }

      // Add matched highlight
      const isSelected = selectedExcerpt === earliestMatchExcerpt;
      const highlightClasses =
        earliestMatchSeverity === 'Critical'
          ? 'bg-rose-200/70 border-b-2 border-rose-600 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200'
          : earliestMatchSeverity === 'High'
          ? 'bg-amber-200/70 border-b-2 border-amber-600 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200'
          : 'bg-[#B8975A]/25 border-b-2 border-[#B8975A] text-stone-900 dark:text-stone-100';

      renderedElements.push(
        <mark
          key={`mark-${keyIdx++}`}
          onClick={() => onSelectExcerpt?.(earliestMatchExcerpt)}
          className={`cursor-pointer rounded px-1 py-0.5 transition-all ${highlightClasses} ${
            isSelected ? 'ring-2 ring-[#B8975A] font-semibold' : 'hover:opacity-80'
          }`}
          title={`Click to inspect finding: ${earliestMatchExcerpt}`}
        >
          {earliestMatchExcerpt}
        </mark>
      );

      remainingText = remainingText.slice(earliestMatchIndex + earliestMatchExcerpt.length);
    }

    return (
      <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-800 dark:text-stone-200 selection:bg-[#B8975A]/30">
        {renderedElements}
      </div>
    );
  };

  return (
    <div className="rounded border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
      {/* Document Header */}
      <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
        <div>
          <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
            {title || 'Current Submission Draft'}
          </h3>
          <div className="mt-0.5 text-xs text-stone-400">
            <span>Version {version || 1}</span>
            <span className="mx-2">·</span>
            <span>{content ? content.split(/\s+/).length : 0} words</span>
            <span className="mx-2">·</span>
            <span>{findings.length} highlighted findings</span>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-stone-500">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#B8975A]" />
            <span>Medium / Tone</span>
          </div>
        </div>
      </div>

      {/* Uploaded Media Display if Image */}
      {mediaUrl && (
        <div className="mb-4 rounded border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/50">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Attached Visual Creative Asset
          </div>
          <img
            src={mediaUrl}
            alt="Submitted campaign creative"
            referrerPolicy="no-referrer"
            className="max-h-64 w-auto rounded object-contain border border-stone-200/60 dark:border-stone-800"
          />
        </div>
      )}

      {/* Document Body */}
      <div className="min-h-[220px] rounded bg-stone-50/50 p-4 border border-stone-100 dark:border-stone-900 dark:bg-stone-900/30">
        {renderHighlightedContent()}
      </div>
    </div>
  );
};
