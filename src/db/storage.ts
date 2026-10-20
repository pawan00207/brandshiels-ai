/**
 * BrandShield AI — Data Access Layer & Persistence
 * Clean repository pattern using IndexedDB with localStorage fallback.
 */

import {
  Workspace,
  BrandProfile,
  UserProfile,
  ContentSubmission,
  AuditReport,
  ReviewComment,
  GuidelineFeedback,
  AuditEventLog,
  BrandGuideline,
} from '../types/index.ts';
import {
  INITIAL_WORKSPACE,
  INITIAL_MAISON_AURELIA_BRAND,
  DEMO_USERS,
  DEMO_WORKSPACE_ID,
  DEMO_BRAND_ID,
} from '../data/seed-data.ts';

const DB_NAME = 'BrandShieldDB';
const DB_VERSION = 1;

interface DBSchema {
  workspaces: Workspace;
  brands: BrandProfile;
  submissions: ContentSubmission;
  auditReports: AuditReport;
  reviewComments: ReviewComment;
  guidelineFeedback: GuidelineFeedback;
  auditEvents: AuditEventLog;
}

// In-memory / localStorage cache for fast synchronous fallback
const LS_PREFIX = 'brandshield_';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(LS_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
}

class StorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private currentUser: UserProfile = DEMO_USERS[0]; // Default Eleanor Vance (Admin)

  constructor() {
    this.init();
  }

  private async openDB(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = req.result;
          if (!db.objectStoreNames.contains('workspaces')) {
            db.createObjectStore('workspaces', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('brands')) {
            db.createObjectStore('brands', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('submissions')) {
            db.createObjectStore('submissions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('auditReports')) {
            db.createObjectStore('auditReports', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('reviewComments')) {
            db.createObjectStore('reviewComments', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('guidelineFeedback')) {
            db.createObjectStore('guidelineFeedback', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('auditEvents')) {
            db.createObjectStore('auditEvents', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB failed to open, falling back to localStorage');
          resolve(null);
        };
      });
    }
    return this.dbPromise;
  }

  public async init(): Promise<void> {
    // Check if initial workspace exists
    const existingWs = await this.getWorkspace(DEMO_WORKSPACE_ID);
    if (!existingWs) {
      await this.saveWorkspace(INITIAL_WORKSPACE);
      await this.saveBrand(INITIAL_MAISON_AURELIA_BRAND);
      await this.logAuditEvent({
        workspaceId: DEMO_WORKSPACE_ID,
        actorId: 'system',
        actorName: 'System Bootstrap',
        actorRole: 'admin',
        action: 'BOOTSTRAP',
        entityType: 'workspace',
        entityId: DEMO_WORKSPACE_ID,
        details: 'Initial workspace and Maison Aurelia brand library provisioned.',
      });
    }

    // Set active user from stored preference or Eleanor
    const storedUser = getLocal<UserProfile | null>('current_user', null);
    if (storedUser) {
      this.currentUser = storedUser;
    }
  }

  // --- Auth & User State ---
  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile): void {
    this.currentUser = user;
    setLocal('current_user', user);
  }

  // --- Workspaces ---
  public async getWorkspace(id: string): Promise<Workspace | null> {
    const db = await this.openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction('workspaces', 'readonly');
        const req = tx.objectStore('workspaces').get(id);
        req.onsuccess = () => resolve(req.result || getLocal<Workspace | null>(`ws_${id}`, null));
        req.onerror = () => resolve(getLocal<Workspace | null>(`ws_${id}`, null));
      });
    }
    return getLocal<Workspace | null>(`ws_${id}`, null);
  }

  public async saveWorkspace(ws: Workspace): Promise<void> {
    setLocal(`ws_${ws.id}`, ws);
    const db = await this.openDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('workspaces', 'readwrite');
        tx.objectStore('workspaces').put(ws);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  // --- Brand Knowledge Base ---
  public async getBrand(id: string): Promise<BrandProfile | null> {
    const db = await this.openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction('brands', 'readonly');
        const req = tx.objectStore('brands').get(id);
        req.onsuccess = () => resolve(req.result || getLocal<BrandProfile | null>(`brand_${id}`, null));
        req.onerror = () => resolve(getLocal<BrandProfile | null>(`brand_${id}`, null));
      });
    }
    return getLocal<BrandProfile | null>(`brand_${id}`, null);
  }

  public async saveBrand(brand: BrandProfile): Promise<void> {
    setLocal(`brand_${brand.id}`, brand);
    const db = await this.openDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('brands', 'readwrite');
        tx.objectStore('brands').put(brand);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  /**
   * Reset Maison Aurelia to the pristine fictional demo state
   */
  public async resetDemoData(): Promise<void> {
    await this.saveBrand(INITIAL_MAISON_AURELIA_BRAND);
    await this.saveWorkspace(INITIAL_WORKSPACE);
    // Clear out user submissions and reports for this brand
    const subs = await this.getSubmissions(DEMO_WORKSPACE_ID);
    for (const sub of subs) {
      await this.deleteSubmission(sub.id);
    }
    await this.logAuditEvent({
      workspaceId: DEMO_WORKSPACE_ID,
      actorId: this.currentUser.id,
      actorName: this.currentUser.name,
      actorRole: this.currentUser.role,
      action: 'RESET_DEMO_DATA',
      entityType: 'brand',
      entityId: DEMO_BRAND_ID,
      details: 'Reset Maison Aurelia brand library and demo records to initial state.',
    });
  }

  // --- Submissions ---
  public async getSubmissions(workspaceId: string, brandId?: string): Promise<ContentSubmission[]> {
    const db = await this.openDB();
    let all: ContentSubmission[] = [];
    if (db) {
      all = await new Promise((resolve) => {
        const tx = db.transaction('submissions', 'readonly');
        const req = tx.objectStore('submissions').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }
    if (all.length === 0) {
      all = getLocal<ContentSubmission[]>('all_submissions', []);
    }
    return all
      .filter((s) => s.workspaceId === workspaceId && (!brandId || s.brandId === brandId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getSubmissionById(id: string): Promise<ContentSubmission | null> {
    const db = await this.openDB();
    if (db) {
      const result: ContentSubmission | null = await new Promise((resolve) => {
        const tx = db.transaction('submissions', 'readonly');
        const req = tx.objectStore('submissions').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (result) return result;
    }
    const all = getLocal<ContentSubmission[]>('all_submissions', []);
    return all.find((s) => s.id === id) || null;
  }

  public async saveSubmission(sub: ContentSubmission): Promise<void> {
    const all = getLocal<ContentSubmission[]>('all_submissions', []).filter((s) => s.id !== sub.id);
    all.push(sub);
    setLocal('all_submissions', all);

    const db = await this.openDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('submissions', 'readwrite');
        tx.objectStore('submissions').put(sub);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  public async deleteSubmission(id: string): Promise<void> {
    const all = getLocal<ContentSubmission[]>('all_submissions', []).filter((s) => s.id !== id);
    setLocal('all_submissions', all);

    const db = await this.openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction('submissions', 'readwrite');
        tx.objectStore('submissions').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  }

  // --- Audit Reports ---
  public async getAuditReports(submissionId?: string): Promise<AuditReport[]> {
    const db = await this.openDB();
    let all: AuditReport[] = [];
    if (db) {
      all = await new Promise((resolve) => {
        const tx = db.transaction('auditReports', 'readonly');
        const req = tx.objectStore('auditReports').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }
    if (all.length === 0) {
      all = getLocal<AuditReport[]>('all_audit_reports', []);
    }
    if (submissionId) {
      return all
        .filter((r) => r.submissionId === submissionId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getAuditReportById(id: string): Promise<AuditReport | null> {
    const db = await this.openDB();
    if (db) {
      const result = await new Promise<AuditReport | null>((resolve) => {
        const tx = db.transaction('auditReports', 'readonly');
        const req = tx.objectStore('auditReports').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (result) return result;
    }
    const all = getLocal<AuditReport[]>('all_audit_reports', []);
    return all.find((r) => r.id === id) || null;
  }

  public async saveAuditReport(report: AuditReport): Promise<void> {
    const all = getLocal<AuditReport[]>('all_audit_reports', []).filter((r) => r.id !== report.id);
    all.push(report);
    setLocal('all_audit_reports', all);

    const db = await this.openDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('auditReports', 'readwrite');
        tx.objectStore('auditReports').put(report);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  // --- Review Comments ---
  public async getReviewComments(submissionId: string): Promise<ReviewComment[]> {
    const db = await this.openDB();
    let all: ReviewComment[] = [];
    if (db) {
      all = await new Promise((resolve) => {
        const tx = db.transaction('reviewComments', 'readonly');
        const req = tx.objectStore('reviewComments').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }
    if (all.length === 0) {
      all = getLocal<ReviewComment[]>('all_review_comments', []);
    }
    return all
      .filter((c) => c.submissionId === submissionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public async saveReviewComment(comment: ReviewComment): Promise<void> {
    const all = getLocal<ReviewComment[]>('all_review_comments', []).filter((c) => c.id !== comment.id);
    all.push(comment);
    setLocal('all_review_comments', all);

    const db = await this.openDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('reviewComments', 'readwrite');
        tx.objectStore('reviewComments').put(comment);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  // --- Guideline Feedback ---
  public async getGuidelineFeedback(brandId: string): Promise<GuidelineFeedback[]> {
    const db = await this.openDB();
    let all: GuidelineFeedback[] = [];
    if (db) {
      all = await new Promise((resolve) => {
        const tx = db.transaction('guidelineFeedback', 'readonly');
        const req = tx.objectStore('guidelineFeedback').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }
    if (all.length === 0) {
      all = getLocal<GuidelineFeedback[]>('all_guideline_feedback', []);
    }
    return all.filter((f) => f.brandId === brandId);
  }

  public async saveGuidelineFeedback(feedback: GuidelineFeedback): Promise<void> {
    const all = getLocal<GuidelineFeedback[]>('all_guideline_feedback', []).filter((f) => f.id !== feedback.id);
    all.push(feedback);
    setLocal('all_guideline_feedback', all);

    const db = await this.openDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('guidelineFeedback', 'readwrite');
        tx.objectStore('guidelineFeedback').put(feedback);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  // --- Audit Event Logs ---
  public async getAuditEvents(workspaceId: string): Promise<AuditEventLog[]> {
    const db = await this.openDB();
    let all: AuditEventLog[] = [];
    if (db) {
      all = await new Promise((resolve) => {
        const tx = db.transaction('auditEvents', 'readonly');
        const req = tx.objectStore('auditEvents').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }
    if (all.length === 0) {
      all = getLocal<AuditEventLog[]>('all_audit_events', []);
    }
    return all
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async logAuditEvent(event: Omit<AuditEventLog, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AuditEventLog = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    const all = getLocal<AuditEventLog[]>('all_audit_events', []);
    all.unshift(fullEvent);
    setLocal('all_audit_events', all.slice(0, 1000));

    const db = await this.openDB();
    if (db) {
      const tx = db.transaction('auditEvents', 'readwrite');
      tx.objectStore('auditEvents').put(fullEvent);
    }
  }

  /**
   * Purge submissions older than retention days
   */
  public async purgeOldSubmissions(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const subs = await this.getSubmissions(DEMO_WORKSPACE_ID);
    let purgedCount = 0;
    for (const sub of subs) {
      if (sub.createdAt < cutoff) {
        await this.deleteSubmission(sub.id);
        purgedCount++;
      }
    }
    await this.logAuditEvent({
      workspaceId: DEMO_WORKSPACE_ID,
      actorId: this.currentUser.id,
      actorName: this.currentUser.name,
      actorRole: this.currentUser.role,
      action: 'DATA_RETENTION_PURGE',
      entityType: 'submission',
      entityId: 'batch',
      details: `Purged ${purgedCount} content submissions exceeding ${retentionDays}-day retention policy.`,
    });
    return purgedCount;
  }

  /**
   * Seed ~40 realistic synthetic audits across 8 weeks so analytics dashboard is rich on first run
   */
  public async generateSampleAuditHistory(): Promise<number> {
    const brand = await this.getBrand(DEMO_BRAND_ID);
    if (!brand) return 0;

    const channels = ['Instagram', 'LinkedIn', 'Newsletter', 'Website', 'Press', 'Paid Ad'] as const;
    const creators = [
      { id: 'user-sophie', name: 'Sophie Mercer' },
      { id: 'user-elena', name: 'Elena Rostova' },
      { id: 'user-marcus', name: 'Marcus Bell' },
    ];
    const categories = [
      'Tone',
      'Terminology',
      'Claims',
      'Visual',
      'Accessibility',
      'Messaging',
    ] as const;

    const now = Date.now();
    const eightWeeksMs = 56 * 24 * 60 * 60 * 1000;
    const count = 40;

    for (let i = 0; i < count; i++) {
      const randomOffsetMs = Math.floor(Math.random() * eightWeeksMs);
      const createdAt = new Date(now - randomOffsetMs).toISOString();
      const creator = creators[i % creators.length];
      const channel = channels[i % channels.length];
      const subId = `synth-sub-${i + 1}`;
      const reportId = `synth-rep-${i + 1}`;

      const numFindings = (i % 5 === 0) ? 0 : Math.floor(Math.random() * 3) + 1;
      const findings: any[] = [];

      for (let f = 0; f < numFindings; f++) {
        const cat = categories[(i + f) % categories.length];
        const sev = (f === 0 && i % 3 === 0) ? 'Critical' : (f === 0 ? 'High' : 'Medium');
        const hasGap = (i + f) % 4 === 0;

        findings.push({
          id: `synth-find-${i}-${f}`,
          auditReportId: reportId,
          category: cat,
          severity: sev,
          affectedExcerpt: cat === 'Terminology' ? 'anti-aging cream' : (cat === 'Claims' ? '92% visible lift' : 'BUY NOW before stock ends'),
          plainRationale: `Synthetic audit finding: violates ${cat} guidelines.`,
          evidence: {
            sourceType: hasGap ? 'none' : 'guideline',
            hasEvidenceGap: hasGap,
            ruleCode: hasGap ? undefined : `${cat.toUpperCase().slice(0, 4)}-01`,
            sourceTitle: hasGap ? undefined : `${cat} Standard`,
            exactText: hasGap ? undefined : 'Approved brand standard excerpt.',
            gapExplanation: hasGap ? 'No active approved fact verifies this numerical statement.' : undefined,
          },
          confidence: 'High',
          confidenceNote: 'Automated synthetic dataset verification.',
          sourceType: (i % 2 === 0) ? 'Deterministic rule' : 'AI-assisted',
          suggestedCorrection: {
            originalText: 'original draft excerpt',
            proposedText: 'refined luxury excerpt',
            explanation: 'Complies with Maison Aurelia standards.',
          },
          disposition: {
            status: (i % 3 === 0) ? 'Accepted' : (i % 7 === 0 ? 'Rejected' : 'Resolved'),
            reason: (i % 7 === 0) ? 'Editorial nuance approved by Brand Director.' : 'Applied recommendation.',
          },
          isAIGenerated: i % 2 !== 0,
        });
      }

      const report: AuditReport = {
        id: reportId,
        submissionId: subId,
        versionAudited: 1,
        createdAt,
        auditStatus: 'Complete',
        complianceStatus: numFindings === 0 ? 'No issues detected' : 'Issues found',
        statusExplanation: numFindings === 0
          ? 'No issues detected against current approved sources. This is not a guarantee of correctness.'
          : `${numFindings} findings identified across brand dimensions.`,
        evidenceCoverage: numFindings === 0 ? 100 : Math.round(((numFindings - 1) / Math.max(1, numFindings)) * 100),
        findings,
        deterministicChecksRun: ['prohibited_terms', 'superlatives', 'statistics_fact_check', 'prompt_injection'],
        guidelineVersionsUsed: { 'TONE-01': 1, 'TERM-01': 1, 'CLAIM-01': 1 },
        aiChecked: true,
      };

      const submission: ContentSubmission = {
        id: subId,
        workspaceId: DEMO_WORKSPACE_ID,
        brandId: DEMO_BRAND_ID,
        creatorId: creator.id,
        creatorName: creator.name,
        title: `Campaign Asset #${i + 1} (${channel})`,
        contentType: (i % 2 === 0 ? 'Social post' : 'Email'),
        channel,
        status: (i % 4 === 0) ? 'Approved' : (i % 6 === 0 ? 'Changes Requested' : 'Ready for Review'),
        currentVersion: 1,
        revisions: [
          {
            version: 1,
            content: `Sample campaign body copy for editorial cycle ${i + 1}.`,
            createdAt,
            createdBy: creator.name,
            changeSummary: 'Initial draft for review.',
            auditReportId: reportId,
          },
        ],
        createdAt,
        updatedAt: createdAt,
      };

      await this.saveAuditReport(report);
      await this.saveSubmission(submission);
    }

    await this.logAuditEvent({
      workspaceId: DEMO_WORKSPACE_ID,
      actorId: this.currentUser.id,
      actorName: this.currentUser.name,
      actorRole: this.currentUser.role,
      action: 'SEED_ANALYTICS_HISTORY',
      entityType: 'audit',
      entityId: 'batch',
      details: 'Generated 40 realistic synthetic historical audits across 8 weeks for governance dashboard.',
    });

    return count;
  }
}

export const storage = new StorageService();
