/**
 * BrandShield AI — Core Domain Types
 */

export type UserRole = 'admin' | 'reviewer' | 'creator' | 'viewer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  workspaceId: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  members: WorkspaceMember[];
  currentBrandId: string;
  createdAt: string;
  settings: {
    retentionDays: number;
    aiChecksEnabled: boolean;
    simulateAiFailure: boolean;
  };
}

export type GuidelineCategory =
  | 'Tone'
  | 'Terminology'
  | 'Messaging'
  | 'Visual'
  | 'Accessibility'
  | 'Claims'
  | 'Legal-adjacent';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface GuidelineVersionRecord {
  version: number;
  ruleText: string;
  rationale: string;
  updatedAt: string;
  updatedBy: string;
  changeSummary: string;
}

export interface BrandGuideline {
  id: string;
  brandId: string;
  ruleCode: string; // e.g. TONE-01, CLAIM-03
  title: string;
  category: GuidelineCategory;
  ruleText: string;
  rationale: string;
  owner: string;
  version: number;
  effectiveDate: string;
  reviewDate: string;
  isActive: boolean;
  history: GuidelineVersionRecord[];
  disputeCount?: number;
}

export interface TerminologyRule {
  id: string;
  brandId: string;
  preferredTerm: string;
  prohibitedTerms: string[];
  replacement: string;
  context?: string;
  severity: SeverityLevel;
  isActive: boolean;
}

export type FactStatus = 'Current' | 'Expiring soon' | 'Expired' | 'Superseded';

export interface ApprovedFact {
  id: string;
  brandId: string;
  factCode: string; // e.g. FACT-01
  claimText: string;
  sourceReference: string;
  effectiveDate: string;
  expiryDate: string;
  status: FactStatus;
  metrics?: { label: string; value: string }[];
}

export interface BrandAsset {
  id: string;
  brandId: string;
  name: string;
  type: 'logo' | 'color' | 'font' | 'image';
  value: string; // hex code, data URL, font name
  usageNotes?: string;
  status: 'approved' | 'draft';
}

export interface BrandProfile {
  id: string;
  workspaceId: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  status: 'active' | 'archived';
  tone: {
    voiceSummary: string;
    preferredDescriptors: string[];
    doGuidelines: string[];
    dontGuidelines: string[];
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    headline: string;
    body: string;
  };
  guidelines: BrandGuideline[];
  terminology: TerminologyRule[];
  approvedFacts: ApprovedFact[];
  assets: BrandAsset[];
  isDemoSample?: boolean;
}

export type ContentType =
  | 'Social post'
  | 'Email'
  | 'Web page'
  | 'Press release'
  | 'Ad copy'
  | 'Document';

export type PublishingChannel =
  | 'Instagram'
  | 'LinkedIn'
  | 'Newsletter'
  | 'Website'
  | 'Press'
  | 'Paid Ad'
  | 'Internal';

export type SubmissionStatus =
  | 'Draft'
  | 'In Audit'
  | 'Ready for Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Rejected';

export interface ContentRevision {
  version: number;
  content: string;
  mediaUrl?: string; // optional uploaded image
  mediaType?: 'image/png' | 'image/jpeg' | 'text';
  createdAt: string;
  createdBy: string;
  changeSummary: string;
  auditReportId?: string;
}

export type DispositionStatus =
  | 'Pending'
  | 'Accepted'
  | 'Edit & accept'
  | 'Rejected'
  | 'Resolved'
  | 'Needs review';

export interface FindingEvidence {
  ruleCode?: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceType: 'guideline' | 'fact' | 'terminology' | 'deterministic-check' | 'none';
  version?: number;
  owner?: string;
  exactText?: string;
  hasEvidenceGap: boolean;
  gapExplanation?: string;
}

export interface Finding {
  id: string;
  auditReportId: string;
  category: GuidelineCategory;
  severity: SeverityLevel;
  affectedExcerpt: string;
  startIndex?: number;
  endIndex?: number;
  plainRationale: string;
  evidence: FindingEvidence;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceNote: string;
  sourceType: 'Deterministic rule' | 'AI-assisted';
  suggestedCorrection: {
    originalText: string;
    proposedText: string;
    explanation: string;
  };
  disposition: {
    status: DispositionStatus;
    reason?: string;
    editedCorrectionText?: string;
    updatedAt?: string;
    updatedBy?: string;
  };
  isAIGenerated: boolean;
}

export type AuditStatus = 'Complete' | 'Partial' | 'Failed';
export type ComplianceStatus = 'No issues detected' | 'Issues found' | 'Not assessed';

export interface AuditReport {
  id: string;
  submissionId: string;
  versionAudited: number;
  createdAt: string;
  auditStatus: AuditStatus;
  complianceStatus: ComplianceStatus;
  statusExplanation: string;
  evidenceCoverage: number; // 0-100%
  findings: Finding[];
  deterministicChecksRun: string[];
  guidelineVersionsUsed: { [ruleCode: string]: number };
  aiChecked: boolean;
  aiFailureReason?: string;
  comparedToPreviousReportId?: string;
  comparisonSummary?: {
    resolvedCount: number;
    newCount: number;
    remainingCount: number;
  };
}

export interface ReviewComment {
  id: string;
  submissionId: string;
  versionNumber: number;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
  findingId?: string;
  isResolved?: boolean;
}

export interface ApprovalCertificate {
  certificateId: string;
  submissionId: string;
  submissionTitle: string;
  brandName: string;
  brandId: string;
  approvedVersion: number;
  approvedBy: string;
  approvedByRole: string;
  approvedAt: string;
  decision: 'Approved' | 'Rejected';
  note: string;
  activeGuidelineCount: number;
  evidenceCoverage: number;
  hash: string;
}

export interface ContentSubmission {
  id: string;
  workspaceId: string;
  brandId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  contentType: ContentType;
  channel: PublishingChannel;
  status: SubmissionStatus;
  currentVersion: number;
  revisions: ContentRevision[];
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  criticalFindingOverrideJustification?: string;
  approvalRecord?: ApprovalCertificate;
  createdAt: string;
  updatedAt: string;
}

export interface GuidelineFeedback {
  id: string;
  ruleId: string;
  ruleCode: string;
  brandId: string;
  submittedBy: string;
  submittedAt: string;
  findingExcerpt: string;
  feedbackNote: string;
  status: 'Open' | 'Reviewed' | 'Resolved';
  resolutionNotes?: string;
}

export interface AuditEventLog {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'submission' | 'guideline' | 'terminology' | 'fact' | 'workspace' | 'approval' | 'audit' | 'brand';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface EvaluationTestCase {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  channel: PublishingChannel;
  inputContent: string;
  expectedDefects: {
    category: GuidelineCategory;
    severity: SeverityLevel;
    keywordOrTopic: string;
    shouldFlag: boolean;
    expectedRuleCode?: string;
  }[];
  isBenignCleanDraft?: boolean;
}

export interface EvaluationRunResult {
  totalCases: number;
  passedCount: number;
  precision: number; // true positives / (true positives + false positives)
  recall: number; // true positives / (true positives + false negatives)
  evidenceCoverage: number;
  falsePositiveRate: number;
  medianAuditTimeMs: number;
  failureRate: number;
  categoryBreakdown: {
    category: GuidelineCategory;
    precision: number;
    recall: number;
    totalFindings: number;
  }[];
  caseResults: {
    caseId: string;
    caseTitle: string;
    auditStatus: AuditStatus;
    complianceStatus: ComplianceStatus;
    executionTimeMs: number;
    findingsCount: number;
    passed: boolean;
    notes: string;
  }[];
}
