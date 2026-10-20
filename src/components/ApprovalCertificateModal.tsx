import React from 'react';
import { ShieldCheck, Printer, Download, X, Lock } from 'lucide-react';
import { ApprovalCertificate } from '../types/index.ts';

interface ApprovalCertificateModalProps {
  certificate: ApprovalCertificate | null;
  onClose: () => void;
}

export const ApprovalCertificateModal: React.FC<ApprovalCertificateModalProps> = ({
  certificate,
  onClose,
}) => {
  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(certificate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `BrandShield-Certificate-${certificate.certificateId}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded border border-[#B8975A] bg-[#FAF8F5] p-8 shadow-2xl dark:bg-[#0E0E10] text-stone-900 dark:text-stone-100">
        {/* Close Button (No print) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 no-print"
          aria-label="Close certificate modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Certificate Frame with Gold Hairline Border */}
        <div className="rounded border-2 border-[#B8975A]/60 p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Watermark Notice */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5 select-none">
            <span className="font-serif text-6xl font-bold tracking-widest text-[#B8975A] rotate-[-25deg]">
              APPROVED · NOT PUBLISHED
            </span>
          </div>

          {/* Insignia */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#B8975A] bg-[#B8975A]/10 text-[#B8975A]">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <div className="mt-4 font-mono text-[10px] tracking-widest uppercase text-[#B8975A]">
            Official Brand Compliance & Governance Certificate
          </div>

          <h2 className="mt-1 font-serif text-2xl font-bold tracking-wide text-stone-900 dark:text-stone-100">
            {certificate.brandName}
          </h2>

          <p className="mt-2 text-xs italic text-stone-500">
            Verification Certificate ID: <span className="font-mono">{certificate.certificateId}</span>
          </p>

          <div className="my-6 border-t border-b border-[#B8975A]/30 py-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-500">Audited Campaign Asset:</span>
              <span className="font-semibold">{certificate.submissionTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Approved Version:</span>
              <span className="font-mono font-bold text-[#B8975A]">
                Version {certificate.approvedVersion} (Locked)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Authorized Reviewer:</span>
              <span>
                {certificate.approvedBy} ({certificate.approvedByRole})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Timestamp of Approval:</span>
              <span>{new Date(certificate.approvedAt).toUTCString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Evidence Coverage Metric:</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                {certificate.evidenceCoverage}% verified against approved facts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Active Brand Guidelines Enforced:</span>
              <span className="font-mono">{certificate.activeGuidelineCount} active rules</span>
            </div>
          </div>

          {/* Review Note */}
          {certificate.note && (
            <div className="rounded bg-white/70 p-3 text-left text-xs italic text-stone-700 dark:bg-stone-900/60 dark:text-stone-300 border border-stone-200/50 dark:border-stone-800">
              <span className="font-semibold not-italic block mb-0.5 text-stone-500 text-[10px] uppercase">
                Reviewer Governance Note:
              </span>
              "{certificate.note}"
            </div>
          )}

          {/* Mandatory Disclaimers */}
          <div className="mt-4 rounded bg-[#B8975A]/10 p-3 text-xs text-[#7A5E2E] dark:text-[#E2C98D] flex items-center justify-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              HUMAN-CONTROLLED WORKFLOW: Approved — Not Published.
            </span>
          </div>
          <p className="mt-1 text-[10px] text-stone-400">
            BrandShield AI does not auto-publish. Creator or channel lead must manually release
            content to publishing endpoints.
          </p>

          {/* Cryptographic hash */}
          <div className="mt-4 border-t border-stone-200/50 pt-2 font-mono text-[9px] text-stone-400 truncate">
            DIGITAL SEAL HASH: {certificate.hash}
          </div>
        </div>

        {/* Action Buttons (No print) */}
        <div className="mt-6 flex items-center justify-end gap-3 no-print">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded bg-[#B8975A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A07F43]"
          >
            <Printer className="h-3.5 w-3.5" /> Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
};
