import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  FileText,
  Calendar,
  User,
  ExternalLink,
  Sparkles,
  Award,
} from 'lucide-react';
import type {
  AuditReport,
  ContentSubmission,
  BrandProfile,
  UserProfile,
  Finding,
} from '../types/index.ts';

interface PrintableAuditReportModalProps {
  report: AuditReport;
  submission: ContentSubmission;
  brand: BrandProfile;
  currentUser: UserProfile;
  onClose: () => void;
}

export const PrintableAuditReportModal: React.FC<PrintableAuditReportModalProps> = ({
  report,
  submission,
  brand,
  currentUser,
  onClose,
}) => {
  const [printDate] = useState(() => new Date().toUTCString());

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const exportData = {
      generator: 'BrandShield AI',
      generatedAt: new Date().toISOString(),
      requestedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      },
      brandContext: {
        id: brand.id,
        name: brand.name,
        tone: brand.tone,
        activeGuidelinesCount: brand.guidelines.filter((g) => g.isActive).length,
      },
      submission: {
        id: submission.id,
        title: submission.title,
        contentType: submission.contentType,
        channel: submission.channel,
        currentVersion: submission.currentVersion,
        creatorName: submission.creatorName,
      },
      auditReport: report,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `BrandShield-AuditReport-${submission.id}-v${report.versionAudited}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Severity metrics breakdown
  const criticalCount = report.findings.filter((f) => f.severity === 'Critical').length;
  const highCount = report.findings.filter((f) => f.severity === 'High').length;
  const mediumCount = report.findings.filter((f) => f.severity === 'Medium').length;
  const lowCount = report.findings.filter((f) => f.severity === 'Low').length;
  const infoCount = report.findings.filter((f) => f.severity === 'Info').length;

  // Category breakdown
  const categoryCounts = report.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  // Current audited revision content
  const auditedRev = submission.revisions.find((r) => r.version === report.versionAudited) ||
    submission.revisions[submission.revisions.length - 1];

  // Role permissions display banner
  const getRoleHeader = () => {
    switch (currentUser.role) {
      case 'admin':
        return {
          title: 'Executive Brand Governance Record (Unrestricted)',
          desc: 'Full administrative access: includes internal rule version history, legal disclaimers, and audit logs.',
          badgeClass: 'bg-stone-900 text-[#B8975A] border border-[#B8975A]',
        };
      case 'reviewer':
        return {
          title: 'Official Reviewer & Verification Audit Dossier',
          desc: 'Authorized brand review document with evidence grounding and formal sign-off ledger.',
          badgeClass: 'bg-[#B8975A] text-white',
        };
      case 'creator':
        return {
          title: 'Content Creator Remediation Guidance Report',
          desc: 'Author compliance document with actionable surgical corrections to meet brand guidelines.',
          badgeClass: 'bg-stone-700 text-stone-100',
        };
      case 'viewer':
      default:
        return {
          title: 'Stakeholder Read-Only Archival Report',
          desc: 'Read-only perspective. Dispositions and approval actions are restricted.',
          badgeClass: 'bg-stone-200 text-stone-700 border border-stone-300',
        };
    }
  };

  const roleMeta = getRoleHeader();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto max-h-[92vh] flex flex-col rounded-lg border border-[#B8975A]/50 bg-white shadow-2xl dark:bg-[#121214] text-stone-900 dark:text-stone-100">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#B8975A]" />
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Printable Brand Governance Report
            </h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${roleMeta.badgeClass}`}>
              Role: {currentUser.role.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              title="Download machine-readable JSON"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded bg-[#B8975A] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#A07F43] transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 print:p-0 print:space-y-6 print:overflow-visible">
          {/* Print-only Watermark notice */}
          <div className="print-only hidden text-center border-b border-stone-300 pb-2 mb-4 text-[10px] font-mono uppercase text-stone-500">
            BrandShield AI Pre-Publication Audit Dossier · Generated on {printDate} · {roleMeta.title}
          </div>

          {/* 1. BRAND CONTEXT & REPORT HEADER */}
          <div className="border-b-2 border-[#B8975A] pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#B8975A]">
                  Pre-Publication Brand Audit & Evidence Dossier
                </div>
                <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  {brand.name}
                </h1>
                <p className="mt-1 text-xs italic text-stone-500">
                  "{brand.tagline || brand.description}"
                </p>
              </div>

              <div className="text-right text-xs">
                <div className="font-mono text-stone-400">Report ID: <span className="font-semibold text-stone-700 dark:text-stone-300">{report.id}</span></div>
                <div className="font-mono text-stone-400">Audited Version: <span className="font-bold text-[#B8975A]">v{report.versionAudited}</span></div>
                <div className="text-stone-400 text-[11px] mt-0.5">Date: {new Date(report.createdAt).toUTCString()}</div>
              </div>
            </div>

            {/* Role Header Banner */}
            <div className="mt-4 rounded bg-[#B8975A]/10 p-3 text-xs border border-[#B8975A]/30">
              <span className="font-bold text-[#7A5E2E] dark:text-[#E2C98D] block">
                {roleMeta.title}
              </span>
              <span className="text-stone-600 dark:text-stone-300 text-[11px]">
                {roleMeta.desc} Prepared for <strong className="text-stone-800 dark:text-stone-200">{currentUser.name}</strong> ({currentUser.email}).
              </span>
            </div>

            {/* Campaign Metadata Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs border-t border-stone-200 pt-4 dark:border-stone-800">
              <div>
                <span className="block text-stone-400 text-[10px] uppercase">Campaign Asset</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{submission.title}</span>
              </div>
              <div>
                <span className="block text-stone-400 text-[10px] uppercase">Format & Channel</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{submission.contentType} · {submission.channel}</span>
              </div>
              <div>
                <span className="block text-stone-400 text-[10px] uppercase">Author / Creator</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{submission.creatorName}</span>
              </div>
              <div>
                <span className="block text-stone-400 text-[10px] uppercase">Governance Status</span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{submission.status}</span>
              </div>
            </div>
          </div>

          {/* 2. BRAND VOICE & TONE GUIDELINES IN EFFECT */}
          <div className="rounded border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-900/40 text-xs">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px] mb-2">
              Brand Tone & Guidelines Context in Effect
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-stone-400 uppercase block mb-1">Tone Descriptors</span>
                <div className="flex flex-wrap gap-1">
                  {brand.tone.preferredDescriptors.map((desc, i) => (
                    <span key={i} className="rounded bg-white px-1.5 py-0.5 text-[10px] border border-stone-200 dark:bg-stone-800 dark:border-stone-700">
                      {desc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-stone-400 uppercase block mb-1">Mandatory Do's</span>
                <ul className="list-disc pl-3 text-[11px] space-y-0.5 text-stone-600 dark:text-stone-300">
                  {brand.tone.doGuidelines.slice(0, 2).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-stone-400 uppercase block mb-1">Strict Prohibitions</span>
                <ul className="list-disc pl-3 text-[11px] space-y-0.5 text-stone-600 dark:text-stone-300">
                  {brand.tone.dontGuidelines.slice(0, 2).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 3. AUDIT FINDINGS SUMMARY & KPIS */}
          <div>
            <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
              Executive Audit Summary
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {/* Compliance Status */}
              <div className="rounded border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900/40">
                <span className="text-[10px] uppercase font-semibold text-stone-400">Compliance State</span>
                <div className={`mt-1 font-serif text-base font-bold ${
                  report.complianceStatus === 'No issues detected'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {report.complianceStatus}
                </div>
                <span className="text-[10px] text-stone-500">Audit Status: {report.auditStatus}</span>
              </div>

              {/* Evidence Coverage */}
              <div className="rounded border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900/40">
                <span className="text-[10px] uppercase font-semibold text-stone-400">Evidence Coverage</span>
                <div className="mt-1 font-serif text-xl font-bold text-[#B8975A]">
                  {report.evidenceCoverage}%
                </div>
                <span className="text-[10px] text-stone-500">Verified against verified claims</span>
              </div>

              {/* Total Findings */}
              <div className="rounded border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900/40">
                <span className="text-[10px] uppercase font-semibold text-stone-400">Total Findings</span>
                <div className="mt-1 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {report.findings.length}
                </div>
                <span className="text-[10px] text-stone-500">Requires creator/reviewer signoff</span>
              </div>

              {/* Severity Breakdown */}
              <div className="rounded border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900/40">
                <span className="text-[10px] uppercase font-semibold text-stone-400">Severity Distribution</span>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-rose-700 font-bold" title="Critical">{criticalCount}C</span>
                  <span>·</span>
                  <span className="text-orange-700 font-bold" title="High">{highCount}H</span>
                  <span>·</span>
                  <span className="text-amber-700 font-bold" title="Medium">{mediumCount}M</span>
                  <span>·</span>
                  <span className="text-stone-500" title="Low/Info">{lowCount + infoCount}L</span>
                </div>
                <span className="text-[10px] text-stone-500">{criticalCount > 0 ? 'Critical override required' : 'Clear of critical blocks'}</span>
              </div>
            </div>

            {/* Explanation Quote */}
            <p className="mt-3 rounded bg-stone-50 p-3 text-xs italic text-stone-700 border border-stone-200 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-300">
              "{report.statusExplanation}"
            </p>
          </div>

          {/* 4. DETAILED FINDINGS & GROUNDED EVIDENCE REFERENCES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 dark:border-stone-800">
              <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Findings & Evidence Ledger ({report.findings.length})
              </h4>
              <span className="text-[11px] font-mono text-stone-400">
                Grounded against {Object.keys(report.guidelineVersionsUsed).length} guideline versions
              </span>
            </div>

            {report.findings.length === 0 ? (
              <div className="rounded border border-emerald-300 bg-emerald-50/50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <h5 className="mt-2 font-serif text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Full Compliance Verified
                </h5>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto">
                  No terminology violations, unsupported claims, expired statistics, or tone contradictions detected.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {report.findings.map((finding, idx) => (
                  <div
                    key={finding.id}
                    className="rounded-lg border border-stone-200 bg-white p-4 text-xs shadow-xs dark:border-stone-800 dark:bg-stone-900/40 page-break-inside-avoid"
                  >
                    {/* Finding Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 dark:border-stone-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-400">#{idx + 1}</span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          finding.severity === 'Critical'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                            : finding.severity === 'High'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                        }`}>
                          {finding.severity}
                        </span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {finding.category}
                        </span>
                        <span className="font-mono text-stone-400 text-[11px]">
                          [{finding.evidence.ruleCode || finding.id}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-stone-400">Confidence: <strong>{finding.confidence}</strong></span>
                        <span className="text-stone-300">·</span>
                        <span className={`font-semibold ${
                          finding.disposition.status === 'Accepted'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : finding.disposition.status === 'Rejected'
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          Disposition: {finding.disposition.status}
                        </span>
                      </div>
                    </div>

                    {/* Excerpt and Plain-language Rationale */}
                    <div className="mt-3 space-y-1.5">
                      <div>
                        <span className="text-stone-400 text-[10px] uppercase font-semibold">Flagged Excerpt: </span>
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded">
                          "{finding.affectedExcerpt}"
                        </span>
                      </div>

                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                        <strong className="text-stone-900 dark:text-stone-100">Rationale: </strong>
                        {finding.plainRationale}
                      </p>
                    </div>

                    {/* Grounded Evidence Block */}
                    <div className="mt-3 rounded border border-[#B8975A]/30 bg-[#FAF8F5] p-3 text-[11px] dark:bg-stone-900/60 dark:border-stone-800">
                      <div className="flex items-center justify-between text-stone-500 font-semibold mb-1">
                        <span className="flex items-center gap-1 text-[#8C6D32] dark:text-[#E2C98D]">
                          <Award className="h-3.5 w-3.5" /> Cited Evidence Grounding
                        </span>
                        <span className="font-mono text-[10px]">
                          Source: {finding.evidence.sourceType.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-stone-800 dark:text-stone-200 italic">
                        "{finding.evidence.exactText || finding.plainRationale}"
                      </p>
                      {finding.evidence.sourceTitle && (
                        <div className="mt-1 font-mono text-[10px] text-stone-500">
                          Reference: {finding.evidence.sourceTitle}
                        </div>
                      )}
                    </div>

                    {/* Proposed Correction */}
                    {finding.suggestedCorrection && (
                      <div className="mt-3 rounded bg-stone-50 p-2.5 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-[11px]">
                        <span className="text-stone-400 text-[10px] uppercase font-semibold block mb-0.5">
                          Approved Surgical Replacement:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            "{finding.suggestedCorrection.proposedText}"
                          </span>
                        </div>
                        <p className="mt-0.5 text-stone-500 italic">
                          {finding.suggestedCorrection.explanation}
                        </p>
                      </div>
                    )}

                    {/* Disposition justification if rejected */}
                    {finding.disposition.reason && (
                      <div className="mt-2 rounded bg-amber-50/70 p-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                        <strong>Logged Decision Rationale: </strong> "{finding.disposition.reason}" ({finding.disposition.updatedBy})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. AUDITED CONTENT REVISION BODY */}
          <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-5 dark:border-stone-800 dark:bg-stone-900/30">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px] mb-2">
              Audited Text Content (Version {report.versionAudited})
            </h4>
            <div className="font-sans text-xs leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
              {auditedRev?.content || 'No text content in audited revision.'}
            </div>
          </div>

          {/* 6. FORMAL GOVERNANCE SIGN-OFF BLOCK & DISCLAIMER */}
          <div className="border-t-2 border-stone-200 pt-6 dark:border-stone-800 space-y-4">
            <div className="grid grid-cols-2 gap-8 text-xs pt-4">
              <div className="border-t border-stone-300 pt-2 dark:border-stone-700">
                <span className="block text-stone-400 text-[10px] uppercase">Author / Creator Verification</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{submission.creatorName}</span>
                <div className="text-[10px] text-stone-400 mt-1">Signature / Date: _______________________</div>
              </div>

              <div className="border-t border-stone-300 pt-2 dark:border-stone-700">
                <span className="block text-stone-400 text-[10px] uppercase">Authorized Reviewer / Brand Lead Sign-off</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {submission.assignedReviewerName || 'Brand Compliance Committee'}
                </span>
                <div className="text-[10px] text-stone-400 mt-1">Signature / Date: _______________________</div>
              </div>
            </div>

            {/* Non-Auto-Publish Guarantee */}
            <div className="rounded bg-[#B8975A]/10 p-3 text-xs text-[#7A5E2E] dark:text-[#E2C98D] flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-[#B8975A]" />
              <p className="text-[11px]">
                <strong>HUMAN-CONTROLLED GOVERNANCE PROTOCOL:</strong> BrandShield AI never auto-publishes or auto-approves. All recommendations are advisory; human authorization is required before release.
              </p>
            </div>

            {/* Digital Integrity Seal Hash */}
            <div className="text-center font-mono text-[9px] text-stone-400">
              AUDIT DOSSIER DIGITAL SEAL: sha256:{report.id}-{report.versionAudited}-{submission.id} · RECORD STORED IN IMMUTABLE WORKSPACE LEDGER
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
