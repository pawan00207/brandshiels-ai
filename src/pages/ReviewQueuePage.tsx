import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Filter,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertOctagon,
  AlertTriangle,
  Send,
  Eye,
  Lock,
  UserCheck,
  Clock,
  ShieldCheck,
  Check,
  FileText,
  Printer,
} from 'lucide-react';
import {
  ContentSubmission,
  AuditReport,
  ReviewComment,
  ApprovalCertificate,
  UserProfile,
  SubmissionStatus,
  BrandProfile,
} from '../types/index.ts';
import { storage } from '../db/storage.ts';
import { ApprovalCertificateModal } from '../components/ApprovalCertificateModal.tsx';
import { DocumentViewer } from '../components/DocumentViewer.tsx';
import { PrintableAuditReportModal } from '../components/PrintableAuditReportModal.tsx';
import { DEMO_BRAND_ID } from '../data/seed-data.ts';

interface ReviewQueuePageProps {
  currentUser: UserProfile;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ currentUser }) => {
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [selectedSub, setSelectedSub] = useState<ContentSubmission | null>(null);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Ready for Review');
  const [reviewerDecisionNote, setReviewerDecisionNote] = useState('');
  const [activeCertificate, setActiveCertificate] = useState<ApprovalCertificate | null>(null);
  const [concurrentWarning, setConcurrentWarning] = useState(false);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [showPrintableModal, setShowPrintableModal] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [currentUser]);

  const loadQueue = async () => {
    storage.getBrand(DEMO_BRAND_ID).then((b) => setBrand(b));
    const list = await storage.getSubmissions(currentUser.workspaceId);
    setSubmissions(list);
    if (list.length > 0 && !selectedSub) {
      handleSelectSubmission(list[0]);
    }
  };

  const handleSelectSubmission = async (sub: ContentSubmission) => {
    // Check concurrent edit: fetch fresh state from db
    const fresh = await storage.getSubmissionById(sub.id);
    if (fresh && fresh.currentVersion !== sub.currentVersion) {
      setConcurrentWarning(true);
    } else {
      setConcurrentWarning(false);
    }

    const currentToUse = fresh || sub;
    setSelectedSub(currentToUse);
    setReviewerDecisionNote('');

    const latestRev = currentToUse.revisions[currentToUse.revisions.length - 1];
    if (latestRev?.auditReportId) {
      const rep = await storage.getAuditReportById(latestRev.auditReportId);
      setActiveReport(rep);
    } else {
      setActiveReport(null);
    }

    const comms = await storage.getReviewComments(currentToUse.id);
    setComments(comms);
  };

  // Assign Reviewer
  const handleAssignReviewer = async (reviewerName: string) => {
    if (!selectedSub) return;
    const updated: ContentSubmission = {
      ...selectedSub,
      assignedReviewerName: reviewerName,
      updatedAt: new Date().toISOString(),
    };
    await storage.saveSubmission(updated);
    setSelectedSub(updated);
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newCommentText.trim()) return;

    const newComment: ReviewComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      submissionId: selectedSub.id,
      versionNumber: selectedSub.currentVersion,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };

    await storage.saveReviewComment(newComment);
    setComments((prev) => [...prev, newComment]);
    setNewCommentText('');

    await storage.logAuditEvent({
      workspaceId: currentUser.workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'ADD_REVIEW_COMMENT',
      entityType: 'submission',
      entityId: selectedSub.id,
      details: `Added reviewer comment on Version ${selectedSub.currentVersion}: "${newComment.text.slice(0, 60)}..."`,
    });
  };

  // Approve a Specific Version
  const handleApprove = async () => {
    if (!selectedSub) return;
    if (currentUser.role === 'creator' || currentUser.role === 'viewer') {
      alert('Permission Denied: Only Brand Reviewers or Workspace Admins can grant formal approval.');
      return;
    }

    const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const certHash = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const cert: ApprovalCertificate = {
      certificateId: certId,
      submissionId: selectedSub.id,
      submissionTitle: selectedSub.title,
      brandName: 'Maison Aurelia',
      brandId: selectedSub.brandId,
      approvedVersion: selectedSub.currentVersion,
      approvedBy: currentUser.name,
      approvedByRole: currentUser.role,
      approvedAt: new Date().toISOString(),
      decision: 'Approved',
      note: reviewerDecisionNote || 'Meets luxury governance standards.',
      activeGuidelineCount: activeReport ? Object.keys(activeReport.guidelineVersionsUsed).length : 12,
      evidenceCoverage: activeReport?.evidenceCoverage ?? 100,
      hash: certHash,
    };

    const updatedSub: ContentSubmission = {
      ...selectedSub,
      status: 'Approved',
      approvalRecord: cert,
      updatedAt: new Date().toISOString(),
    };

    await storage.saveSubmission(updatedSub);
    setSelectedSub(updatedSub);
    setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
    setActiveCertificate(cert);

    await storage.logAuditEvent({
      workspaceId: currentUser.workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'APPROVE_VERSION',
      entityType: 'approval',
      entityId: cert.certificateId,
      details: `Formally approved Version ${selectedSub.currentVersion} of "${selectedSub.title}". Certificate issued.`,
    });
  };

  // Request Changes
  const handleRequestChanges = async () => {
    if (!selectedSub) return;
    if (!reviewerDecisionNote.trim()) {
      alert('Please specify the required changes in the note before requesting revision.');
      return;
    }

    const updatedSub: ContentSubmission = {
      ...selectedSub,
      status: 'Changes Requested',
      updatedAt: new Date().toISOString(),
    };

    await storage.saveSubmission(updatedSub);
    setSelectedSub(updatedSub);
    setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));

    // Also add as review comment
    const changeComment: ReviewComment = {
      id: `comm-req-${Date.now()}`,
      submissionId: selectedSub.id,
      versionNumber: selectedSub.currentVersion,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text: `[CHANGES REQUESTED]: ${reviewerDecisionNote}`,
      createdAt: new Date().toISOString(),
    };
    await storage.saveReviewComment(changeComment);
    setComments((prev) => [...prev, changeComment]);

    await storage.logAuditEvent({
      workspaceId: currentUser.workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'REQUEST_CHANGES',
      entityType: 'submission',
      entityId: selectedSub.id,
      details: `Requested revisions on Version ${selectedSub.currentVersion}: "${reviewerDecisionNote}".`,
    });

    setReviewerDecisionNote('');
  };

  // Reject Submission — formal rejection with certificate, requires written reason
  const handleReject = async () => {
    if (!selectedSub) return;
    if (currentUser.role === 'creator' || currentUser.role === 'viewer') {
      alert('Permission Denied: Only Brand Reviewers or Workspace Admins can formally reject a submission.');
      return;
    }
    if (!reviewerDecisionNote.trim()) {
      alert('A written rejection reason is required before formally rejecting a submission.');
      return;
    }

    const certId = `CERT-REJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const certHash = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const rejectionCert: ApprovalCertificate = {
      certificateId: certId,
      submissionId: selectedSub.id,
      submissionTitle: selectedSub.title,
      brandName: 'Maison Aurelia',
      brandId: selectedSub.brandId,
      approvedVersion: selectedSub.currentVersion,
      approvedBy: currentUser.name,
      approvedByRole: currentUser.role,
      approvedAt: new Date().toISOString(),
      decision: 'Rejected',
      note: reviewerDecisionNote,
      activeGuidelineCount: activeReport ? Object.keys(activeReport.guidelineVersionsUsed).length : 12,
      evidenceCoverage: activeReport?.evidenceCoverage ?? 0,
      hash: certHash,
    };

    const updatedSub: ContentSubmission = {
      ...selectedSub,
      status: 'Rejected',
      approvalRecord: rejectionCert,
      updatedAt: new Date().toISOString(),
    };

    await storage.saveSubmission(updatedSub);
    setSelectedSub(updatedSub);
    setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
    setActiveCertificate(rejectionCert);

    // Add rejection as comment
    const rejectionComment: ReviewComment = {
      id: `comm-rej-${Date.now()}`,
      submissionId: selectedSub.id,
      versionNumber: selectedSub.currentVersion,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text: `[SUBMISSION REJECTED]: ${reviewerDecisionNote}`,
      createdAt: new Date().toISOString(),
    };
    await storage.saveReviewComment(rejectionComment);
    setComments((prev) => [...prev, rejectionComment]);

    await storage.logAuditEvent({
      workspaceId: currentUser.workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'REJECT_SUBMISSION',
      entityType: 'approval',
      entityId: certId,
      details: `Formally rejected Version ${selectedSub.currentVersion} of "${selectedSub.title}". Reason: "${reviewerDecisionNote}".`,
    });

    setReviewerDecisionNote('');
  };

  // Filter queue
  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  const latestRevision = selectedSub ? selectedSub.revisions[selectedSub.revisions.length - 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Governance</span>
            <span>/</span>
            <span className="text-[#B8975A]">Reviewer Queue & Inbox</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Campaign Review & Approval Inbox
          </h2>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-stone-200 bg-white p-1.5 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="Ready for Review">Ready for Review ({submissions.filter(s => s.status === 'Ready for Review').length})</option>
            <option value="In Audit">In Audit ({submissions.filter(s => s.status === 'In Audit').length})</option>
            <option value="Changes Requested">Changes Requested ({submissions.filter(s => s.status === 'Changes Requested').length})</option>
            <option value="Approved">Approved ({submissions.filter(s => s.status === 'Approved').length})</option>
            <option value="Rejected">Rejected ({submissions.filter(s => s.status === 'Rejected').length})</option>
            <option value="all">All Submissions ({submissions.length})</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Queue List (4 cols) & Detail View (8 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Queue Inbox */}
        <div className="space-y-3 lg:col-span-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Submissions ({filteredSubmissions.length})
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="rounded border border-stone-200 bg-white p-6 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-[#121214]">
              <Inbox className="mx-auto h-6 w-6 text-stone-400 mb-2" />
              No submissions currently match this status filter.
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const isSelected = selectedSub?.id === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubmission(sub)}
                  className={`cursor-pointer rounded border p-4 transition-all ${
                    isSelected
                      ? 'border-[#B8975A] bg-[#B8975A]/5 dark:bg-[#B8975A]/10 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-[#121214]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-stone-400 uppercase tracking-wider">
                      {sub.channel} · {sub.contentType}
                    </span>
                    <span
                      className={`font-semibold rounded px-1.5 py-0.2 text-[10px] ${
                        sub.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : sub.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : sub.status === 'Changes Requested'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  <h4 className="mt-1.5 font-serif text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">
                    {sub.title}
                  </h4>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-2 dark:border-stone-800">
                    <span>Creator: {sub.creatorName}</span>
                    <span className="font-mono">v{sub.currentVersion}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Submission Audit Detail & Action Deck */}
        <div className="space-y-6 lg:col-span-8">
          {concurrentWarning && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <strong>Concurrent Edit Warning:</strong> This draft was recently modified by another
              team member. State has been refreshed to the latest revision.
            </div>
          )}

          {selectedSub && latestRevision ? (
            <div className="space-y-6">
              {/* Submission Header Card */}
              <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 dark:border-stone-800">
                  <div>
                    <span className="font-mono text-xs uppercase text-[#B8975A]">
                      Reviewing Version {selectedSub.currentVersion} (Latest)
                    </span>
                    <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                      {selectedSub.title}
                    </h3>
                  </div>

                  {/* Actions & Reviewer Assignment */}
                  <div className="flex flex-wrap items-center gap-3">
                    {activeReport && brand && selectedSub && (
                      <button
                        onClick={() => setShowPrintableModal(true)}
                        className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                        title="Print / Save complete PDF governance report"
                      >
                        <Printer className="h-3.5 w-3.5 text-[#B8975A]" />
                        <span>Print Audit Dossier (PDF)</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-stone-400">Assigned Reviewer:</span>
                      <select
                        value={selectedSub.assignedReviewerName || 'Julian Thorne'}
                        onChange={(e) => handleAssignReviewer(e.target.value)}
                        disabled={currentUser.role === 'viewer'}
                        className="rounded border border-stone-200 bg-stone-50 p-1 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 text-xs"
                      >
                        <option value="Julian Thorne">Julian Thorne (Brand Director)</option>
                        <option value="Eleanor Vance">Eleanor Vance (VP Governance)</option>
                        <option value="Camille Laurent">Camille Laurent (Legal Counsel)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Audit Health Summary Strip */}
                {activeReport && (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs border-b border-stone-100 pb-4 dark:border-stone-800">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Compliance Status</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {activeReport.complianceStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Evidence Coverage</span>
                      <span className="font-mono font-bold text-[#B8975A]">
                        {activeReport.evidenceCoverage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Audit Rigor</span>
                      <span className="font-mono text-stone-700 dark:text-stone-300">
                        {activeReport.auditStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Open Findings</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {activeReport.findings.length} findings
                      </span>
                    </div>
                  </div>
                )}

                {/* Document Display */}
                <div className="mt-4">
                  <DocumentViewer
                    content={latestRevision.content}
                    mediaUrl={latestRevision.mediaUrl}
                    findings={activeReport ? activeReport.findings : []}
                    title={selectedSub.title}
                    version={selectedSub.currentVersion}
                  />
                </div>

                {/* Critical Finding Override Justification Display */}
                {selectedSub.criticalFindingOverrideJustification && (
                  <div className="mt-4 rounded bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    <span className="font-bold block mb-1">
                      Creator Critical Override Justification:
                    </span>
                    <p className="italic">"{selectedSub.criticalFindingOverrideJustification}"</p>
                  </div>
                )}

                {/* Approved Certificate Badge if Approved */}
                {selectedSub.status === 'Approved' && selectedSub.approvalRecord && (
                  <div className="mt-4 flex items-center justify-between rounded border border-[#B8975A]/60 bg-[#B8975A]/10 p-3 text-xs text-[#7A5E2E] dark:text-[#E2C98D]">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>
                        <strong>Approved — Not Published.</strong> Version {selectedSub.approvalRecord.approvedVersion} locked by{' '}
                        {selectedSub.approvalRecord.approvedBy}.
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveCertificate(selectedSub.approvalRecord!)}
                      className="font-semibold text-[#B8975A] hover:underline"
                    >
                      View Certificate
                    </button>
                  </div>
                )}

                {/* Rejection Badge if Rejected */}
                {selectedSub.status === 'Rejected' && selectedSub.approvalRecord && (
                  <div className="mt-4 flex items-center justify-between rounded border border-rose-400/60 bg-rose-50/60 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>
                        <strong>Rejected.</strong> Version {selectedSub.approvalRecord.approvedVersion} formally rejected by{' '}
                        {selectedSub.approvalRecord.approvedBy}.{' '}
                        <em className="text-rose-700 dark:text-rose-400">"{selectedSub.approvalRecord.note}"</em>
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveCertificate(selectedSub.approvalRecord!)}
                      className="font-semibold text-rose-700 hover:underline dark:text-rose-400"
                    >
                      View Record
                    </button>
                  </div>
                )}

                {/* Decision Deck for Reviewer — only reviewer/admin can act */}
                {selectedSub.status !== 'Approved' && selectedSub.status !== 'Rejected' && (currentUser.role === 'reviewer' || currentUser.role === 'admin') && (
                  <div className="mt-6 rounded border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-2">
                      Formal Reviewer Action
                    </span>

                    <textarea
                      value={reviewerDecisionNote}
                      onChange={(e) => setReviewerDecisionNote(e.target.value)}
                      rows={2}
                      placeholder="Enter review decision notes or specific change requirements..."
                      className="w-full rounded border border-stone-300 p-2 text-xs dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-stone-400">
                        Approval locks this version and generates an immutable certificate.
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRequestChanges}
                          className="flex items-center gap-1 rounded border border-amber-600 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                          title="Return to creator with revision request"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Request Changes
                        </button>

                        <button
                          onClick={handleReject}
                          className="flex items-center gap-1 rounded border border-rose-600 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          title="Reject this submission — requires a written reason"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject Submission
                        </button>

                        <button
                          onClick={handleApprove}
                          className="flex items-center gap-1.5 rounded bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve Version {selectedSub.currentVersion}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Creator-only read-only status note for non-approved submissions */}
                {selectedSub.status !== 'Approved' && selectedSub.status !== 'Rejected' && currentUser.role === 'creator' && (
                  <div className="mt-4 rounded border border-stone-200 bg-stone-50/60 p-3 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900/40">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Read-only view.</span>{' '}
                    Reviewer decisions (Approve / Request Changes / Reject) are available to Brand Reviewers and Admins only.
                    You may add comments below.
                  </div>
                )}
              </div>

              {/* Threaded Discussion Section */}
              <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:border-stone-800">
                  <MessageSquare className="h-4 w-4 text-[#B8975A]" />
                  <span>Review Discussion & Editorial Notes ({comments.length})</span>
                </div>

                {/* Comment List */}
                <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="py-4 text-center text-xs text-stone-400 italic">
                      No comments yet. Leave a note or mention @team members.
                    </p>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded border border-stone-100 bg-stone-50/70 p-3 text-xs dark:border-stone-800/60 dark:bg-stone-900/40"
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span className="font-semibold text-stone-700 dark:text-stone-300">
                            {c.authorName} ({c.authorRole})
                          </span>
                          <span>
                            v{c.versionNumber} · {new Date(c.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-stone-700 dark:text-stone-300">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* New Comment Input */}
                <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add reviewer feedback or mention team members..."
                    className="flex-1 rounded border border-stone-300 p-2 text-xs text-stone-900 focus:border-[#B8975A] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded bg-[#B8975A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A07F43]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Comment</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="rounded border border-stone-200 bg-white p-12 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-[#121214]">
              Select a submission from the left queue to inspect audit findings and manage approval.
            </div>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      {activeCertificate && (
        <ApprovalCertificateModal
          certificate={activeCertificate}
          onClose={() => setActiveCertificate(null)}
        />
      )}

      {/* Printable Audit Report Modal */}
      {showPrintableModal && activeReport && brand && selectedSub && (
        <PrintableAuditReportModal
          report={activeReport}
          submission={selectedSub}
          brand={brand}
          currentUser={currentUser}
          onClose={() => setShowPrintableModal(false)}
        />
      )}
    </div>
  );
};
