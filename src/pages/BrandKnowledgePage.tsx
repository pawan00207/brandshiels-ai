import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Upload,
  FileSpreadsheet,
  AlertOctagon,
  Lock,
  Layers,
  Save,
  X,
  FileText,
  Clock,
  Eye,
} from 'lucide-react';
import {
  BrandProfile,
  BrandGuideline,
  TerminologyRule,
  ApprovedFact,
  BrandAsset,
  GuidelineCategory,
  SeverityLevel,
  FactStatus,
  UserProfile,
} from '../types/index.ts';
import { storage } from '../db/storage.ts';
import { DEMO_BRAND_ID } from '../data/seed-data.ts';

interface BrandKnowledgePageProps {
  currentUser: UserProfile;
}

export const BrandKnowledgePage: React.FC<BrandKnowledgePageProps> = ({ currentUser }) => {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'guidelines' | 'terminology' | 'facts' | 'assets' | 'import' | 'conflicts'>('guidelines');

  // Guideline Editor Modal State
  const [editingGuideline, setEditingGuideline] = useState<BrandGuideline | null>(null);
  const [isCreatingGuideline, setIsCreatingGuideline] = useState(false);
  const [historyViewingGuideline, setHistoryViewingGuideline] = useState<BrandGuideline | null>(null);

  // Terminology Modal State
  const [editingTerm, setEditingTerm] = useState<TerminologyRule | null>(null);
  const [isCreatingTerm, setIsCreatingTerm] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Approved Fact Modal State
  const [editingFact, setEditingFact] = useState<ApprovedFact | null>(null);
  const [isCreatingFact, setIsCreatingFact] = useState(false);

  // AI Guidelines Import State
  const [importDocText, setImportDocText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [candidateRules, setCandidateRules] = useState<any[]>([]);

  // Conflict Detection State
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState<any[]>([]);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadBrand();
  }, [currentUser]);

  const loadBrand = async () => {
    const b = await storage.getBrand(DEMO_BRAND_ID);
    setBrand(b);
  };

  const handleResetDemoData = async () => {
    if (window.confirm('Reset Maison Aurelia brand knowledge base and demo records to initial sample data?')) {
      await storage.resetDemoData();
      await loadBrand();
      alert('Maison Aurelia sample data has been reset.');
    }
  };

  // --- Guideline Versioned Save ---
  const handleSaveGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !editingGuideline) return;

    let updatedList = [...brand.guidelines];

    if (isCreatingGuideline) {
      const newRule: BrandGuideline = {
        ...editingGuideline,
        id: `g-${Date.now()}`,
        brandId: brand.id,
        version: 1,
        history: [
          {
            version: 1,
            ruleText: editingGuideline.ruleText,
            rationale: editingGuideline.rationale,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            changeSummary: 'Initial rule creation.',
          },
        ],
      };
      updatedList.push(newRule);
    } else {
      // Editing an existing guideline: creates a NEW VERSION and archives old one
      const existing = brand.guidelines.find((g) => g.id === editingGuideline.id);
      const nextVer = existing ? existing.version + 1 : 1;

      const newHistoryItem = {
        version: nextVer,
        ruleText: editingGuideline.ruleText,
        rationale: editingGuideline.rationale,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
        changeSummary: `Updated rule text to v${nextVer}.`,
      };

      updatedList = updatedList.map((g) => {
        if (g.id === editingGuideline.id) {
          return {
            ...editingGuideline,
            version: nextVer,
            history: [...(g.history || []), newHistoryItem],
          };
        }
        return g;
      });
    }

    const updatedBrand = { ...brand, guidelines: updatedList };
    await storage.saveBrand(updatedBrand);
    setBrand(updatedBrand);
    setEditingGuideline(null);
    setIsCreatingGuideline(false);

    await storage.logAuditEvent({
      workspaceId: currentUser.workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: isCreatingGuideline ? 'CREATE_GUIDELINE' : 'UPDATE_GUIDELINE_NEW_VERSION',
      entityType: 'guideline',
      entityId: editingGuideline.ruleCode,
      details: isCreatingGuideline
        ? `Created guideline ${editingGuideline.ruleCode} (${editingGuideline.title}).`
        : `Updated ${editingGuideline.ruleCode} to new Version ${editingGuideline.version + 1}. Previous versions archived.`,
    });
  };

  // --- Terminology Save & CSV Import ---
  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !editingTerm) return;

    let updatedList = [...brand.terminology];
    if (isCreatingTerm) {
      const newTerm: TerminologyRule = {
        ...editingTerm,
        id: `term-${Date.now()}`,
        brandId: brand.id,
      };
      updatedList.push(newTerm);
    } else {
      updatedList = updatedList.map((t) => (t.id === editingTerm.id ? editingTerm : t));
    }

    const updatedBrand = { ...brand, terminology: updatedList };
    await storage.saveBrand(updatedBrand);
    setBrand(updatedBrand);
    setEditingTerm(null);
    setIsCreatingTerm(false);
  };

  const handleCsvImport = async () => {
    if (!brand || !csvImportText.trim()) return;
    const lines = csvImportText.trim().split('\n');
    const imported: TerminologyRule[] = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 3) {
        imported.push({
          id: `term-csv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          brandId: brand.id,
          preferredTerm: parts[0],
          prohibitedTerms: parts[1].split(';').map((s) => s.trim()),
          replacement: parts[2],
          context: parts[3] || 'Imported via CSV batch',
          severity: (parts[4] as SeverityLevel) || 'High',
          isActive: true,
        });
      }
    }

    const updatedBrand = { ...brand, terminology: [...brand.terminology, ...imported] };
    await storage.saveBrand(updatedBrand);
    setBrand(updatedBrand);
    setShowCsvModal(false);
    setCsvImportText('');
    alert(`Successfully imported ${imported.length} terminology rules.`);
  };

  // --- Fact Save ---
  const handleSaveFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !editingFact) return;

    let updatedList = [...brand.approvedFacts];
    if (isCreatingFact) {
      const newFact: ApprovedFact = {
        ...editingFact,
        id: `fact-${Date.now()}`,
        brandId: brand.id,
      };
      updatedList.push(newFact);
    } else {
      updatedList = updatedList.map((f) => (f.id === editingFact.id ? editingFact : f));
    }

    const updatedBrand = { ...brand, approvedFacts: updatedList };
    await storage.saveBrand(updatedBrand);
    setBrand(updatedBrand);
    setEditingFact(null);
    setIsCreatingFact(false);
  };

  // --- AI Guidelines Extraction ---
  const handleRunAiExtraction = async () => {
    if (!importDocText.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-guidelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: importDocText }),
      });
      const data = await res.json();
      if (data.candidateRules) {
        setCandidateRules(data.candidateRules);
      }
    } catch (err: any) {
      alert(`AI extraction failed: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmCandidateRule = async (rule: any) => {
    if (!brand) return;
    const newGuideline: BrandGuideline = {
      id: `g-ai-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      brandId: brand.id,
      ruleCode: rule.suggestedRuleCode || `RULE-${brand.guidelines.length + 1}`,
      title: rule.title,
      category: rule.category || 'Tone',
      ruleText: rule.ruleText,
      rationale: rule.rationale,
      owner: currentUser.name,
      version: 1,
      effectiveDate: new Date().toISOString().split('T')[0],
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      history: [],
    };

    const updatedBrand = { ...brand, guidelines: [...brand.guidelines, newGuideline] };
    await storage.saveBrand(updatedBrand);
    setBrand(updatedBrand);
    setCandidateRules((prev) => prev.filter((r) => r !== rule));
  };

  // --- AI Conflict Detection ---
  const handleDetectConflicts = async () => {
    if (!brand) return;
    setIsCheckingConflicts(true);
    try {
      const res = await fetch('/api/detect-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidelines: brand.guidelines }),
      });
      const data = await res.json();
      setDetectedConflicts(data.conflicts || []);
    } catch (err: any) {
      alert(`Conflict detection failed: ${err.message}`);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  if (!brand) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Governance</span>
            <span>/</span>
            <span className="text-[#B8975A]">Approved Brand Knowledge</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Brand Governance Knowledge Base
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
            <span>Brand: <strong>{brand.name}</strong></span>
            <span>·</span>
            <span className="rounded bg-[#B8975A]/15 px-2 py-0.5 text-[11px] font-medium text-[#B8975A]">
              Sample Data (Fictional)
            </span>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={handleResetDemoData}
              className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#B8975A]" />
              <span>Reset Demo Data</span>
            </button>
          )}
          {!isAdmin && (
            <span className="rounded bg-stone-100 px-3 py-1.5 text-xs text-stone-500 dark:bg-stone-800 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Read-Only Access
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-stone-200 text-xs font-medium dark:border-stone-800">
        <button
          onClick={() => setActiveTab('guidelines')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'guidelines'
              ? 'border-[#B8975A] text-[#B8975A] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Guidelines ({brand.guidelines.length})
        </button>

        <button
          onClick={() => setActiveTab('terminology')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'terminology'
              ? 'border-[#B8975A] text-[#B8975A] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Terminology Rules ({brand.terminology.length})
        </button>

        <button
          onClick={() => setActiveTab('facts')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'facts'
              ? 'border-[#B8975A] text-[#B8975A] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Approved Facts & Claims ({brand.approvedFacts.length})
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'conflicts'
              ? 'border-[#B8975A] text-[#B8975A] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Conflict Detector
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-[#B8975A] text-[#B8975A] font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Import Guidelines (AI)
          </button>
        )}
      </div>

      {/* Tab 1: Guidelines CRUD with Version History */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Active guidelines are enforced during content pre-audit. Editing a guideline
              automatically creates a new version while preserving historical records for past
              audits.
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  setIsCreatingGuideline(true);
                  setEditingGuideline({
                    id: '',
                    brandId: brand.id,
                    ruleCode: `TONE-${brand.guidelines.length + 1}`,
                    title: '',
                    category: 'Tone',
                    ruleText: '',
                    rationale: '',
                    owner: currentUser.name,
                    version: 1,
                    effectiveDate: new Date().toISOString().split('T')[0],
                    reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    isActive: true,
                    history: [],
                  });
                }}
                className="flex items-center gap-1 rounded bg-[#B8975A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A07F43]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Guideline
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brand.guidelines.map((g) => (
              <div
                key={g.id}
                className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[#B8975A]">{g.ruleCode}</span>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      v{g.version}
                    </span>
                  </div>

                  <h4 className="mt-2 font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
                    {g.title}
                  </h4>
                  <div className="mt-0.5 font-mono text-[10px] uppercase text-stone-400">
                    Category: {g.category}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                    "{g.ruleText}"
                  </p>

                  <div className="mt-3 rounded bg-stone-50 p-2.5 text-[11px] text-stone-500 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
                    <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">
                      Rationale:
                    </span>
                    {g.rationale}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-400 dark:border-stone-800">
                  <span>Owner: {g.owner}</span>
                  <div className="flex items-center gap-2">
                    {g.history && g.history.length > 0 && (
                      <button
                        onClick={() => setHistoryViewingGuideline(g)}
                        className="text-[#B8975A] hover:underline flex items-center gap-1"
                        title="View guideline version history"
                      >
                        <History className="h-3 w-3" /> History
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsCreatingGuideline(false);
                          setEditingGuideline(g);
                        }}
                        className="text-stone-600 hover:text-[#B8975A] dark:text-stone-300"
                        title="Edit rule (creates new version)"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Terminology CRUD */}
      {activeTab === 'terminology' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Prohibited terms are matched whole-word with plural and variant coverage during Step A
              deterministic audit.
            </p>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="flex items-center gap-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Import CSV
                </button>
                <button
                  onClick={() => {
                    setIsCreatingTerm(true);
                    setEditingTerm({
                      id: '',
                      brandId: brand.id,
                      preferredTerm: '',
                      prohibitedTerms: [],
                      replacement: '',
                      severity: 'High',
                      isActive: true,
                    });
                  }}
                  className="flex items-center gap-1 rounded bg-[#B8975A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A07F43]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Term Rule
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-900/60">
                <tr>
                  <th className="p-3">Preferred Brand Term</th>
                  <th className="p-3">Prohibited Term(s)</th>
                  <th className="p-3">Surgical Replacement</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Context / Brand Rationale</th>
                  {isAdmin && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {brand.terminology.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                    <td className="p-3 font-semibold text-emerald-800 dark:text-emerald-400">
                      {t.preferredTerm}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 font-mono text-[11px] text-rose-700 dark:text-rose-400">
                        {t.prohibitedTerms.map((pt, i) => (
                          <span key={i} className="line-through bg-rose-50 px-1 py-0.5 rounded dark:bg-rose-950/40">
                            {pt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-stone-800 dark:text-stone-200">
                      {t.replacement}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {t.severity}
                      </span>
                    </td>
                    <td className="p-3 text-stone-500 max-w-xs">{t.context || '—'}</td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setIsCreatingTerm(false);
                            setEditingTerm(t);
                          }}
                          className="text-stone-500 hover:text-[#B8975A]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Approved Facts & Claims CRUD */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Only 'Current' facts can be legally cited in campaign copy. Expired or superseded facts
              are flagged as Critical violations during audit.
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  setIsCreatingFact(true);
                  setEditingFact({
                    id: '',
                    brandId: brand.id,
                    factCode: `FACT-0${brand.approvedFacts.length + 1}`,
                    claimText: '',
                    sourceReference: '',
                    effectiveDate: new Date().toISOString().split('T')[0],
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'Current',
                  });
                }}
                className="flex items-center gap-1 rounded bg-[#B8975A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A07F43]"
              >
                <Plus className="h-3.5 w-3.5" /> Register Approved Fact
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brand.approvedFacts.map((f) => {
              const statusColor =
                f.status === 'Current'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : f.status === 'Expiring soon'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

              return (
                <div
                  key={f.id}
                  className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#B8975A]">
                        {f.factCode}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                        {f.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-medium text-stone-900 dark:text-stone-100 leading-relaxed">
                      "{f.claimText}"
                    </p>

                    <div className="mt-3 rounded bg-stone-50 p-2.5 text-[11px] text-stone-500 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
                      <span className="font-semibold block mb-0.5">Study Citation:</span>
                      {f.sourceReference}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-400 dark:border-stone-800">
                    <span>Expires: {f.expiryDate}</span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsCreatingFact(false);
                          setEditingFact(f);
                        }}
                        className="text-stone-500 hover:text-[#B8975A]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Conflict Detector */}
      {activeTab === 'conflicts' && (
        <div className="rounded border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#121214] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                Active Guideline Contradiction Detector
              </h3>
              <p className="text-xs text-stone-500">
                Scans all active guidelines for semantic conflicts or opposing instructions.
                BrandShield flags contradictions for human review — it never silently picks a winner.
              </p>
            </div>
            <button
              onClick={handleDetectConflicts}
              disabled={isCheckingConflicts}
              className="flex items-center gap-1.5 rounded bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-[#B8975A] dark:hover:bg-[#A07F43]"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isCheckingConflicts ? 'Analyzing Library...' : 'Run Conflict Audit'}</span>
            </button>
          </div>

          {detectedConflicts.length > 0 ? (
            <div className="space-y-3 mt-4">
              {detectedConflicts.map((c, i) => (
                <div
                  key={i}
                  className="rounded border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Conflict Detected Between {c.ruleCodeA} and {c.ruleCodeB}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">
                    {c.conflictExplanation}
                  </p>
                  {c.recommendation && (
                    <div className="mt-2 text-[11px] text-stone-500">
                      Recommendation: {c.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded bg-stone-50 p-8 text-center text-xs text-stone-500 dark:bg-stone-900/40">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <p className="font-semibold text-stone-800 dark:text-stone-200">
                Zero Contradictions Detected in Active Library
              </p>
              <p className="mt-1">
                All {brand.guidelines.length} guidelines maintain consistent tone, terminology, and
                regulatory bounds.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Import Guidelines (AI Extraction with Human Review) */}
      {activeTab === 'import' && isAdmin && (
        <div className="rounded border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#121214] space-y-6">
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
              Import Guidelines from Document or Manual
            </h3>
            <p className="text-xs text-stone-500">
              Paste raw brand manual text. Gemini 3.8 Flash extracts candidate rules into a
              reviewable draft queue. You must confirm each rule before it is added to the active
              library.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              value={importDocText}
              onChange={(e) => setImportDocText(e.target.value)}
              rows={6}
              placeholder="Paste raw guidelines excerpt, brand values chapter, or press standard..."
              className="w-full rounded border border-stone-300 p-3 text-xs dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
            <div className="flex justify-end">
              <button
                onClick={handleRunAiExtraction}
                disabled={isExtracting || !importDocText.trim()}
                className="flex items-center gap-1.5 rounded bg-[#B8975A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A07F43] disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isExtracting ? 'Extracting Candidate Rules...' : 'Extract Rules with AI'}</span>
              </button>
            </div>
          </div>

          {candidateRules.length > 0 && (
            <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Candidate Rules for Human Confirmation ({candidateRules.length})
              </h4>

              {candidateRules.map((cr, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded border border-stone-200 p-4 text-xs dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#B8975A] font-bold">
                      {cr.suggestedRuleCode || 'NEW-01'} · {cr.category}
                    </span>
                    <h5 className="font-semibold text-stone-900 dark:text-stone-100">{cr.title}</h5>
                    <p className="text-stone-700 dark:text-stone-300">"{cr.ruleText}"</p>
                    <p className="text-[11px] text-stone-500">Rationale: {cr.rationale}</p>
                  </div>
                  <button
                    onClick={() => handleConfirmCandidateRule(cr)}
                    className="ml-4 shrink-0 rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    Confirm & Save Rule
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guideline Version History Modal */}
      {historyViewingGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-[#141417]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
              <h3 className="font-serif text-base font-semibold">
                Version History: {historyViewingGuideline.ruleCode}
              </h3>
              <button
                onClick={() => setHistoryViewingGuideline(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto text-xs">
              {(historyViewingGuideline.history || []).map((h) => (
                <div
                  key={h.version}
                  className="rounded border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/60"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[#B8975A]">Version {h.version}</span>
                    <span className="text-stone-400">
                      {new Date(h.updatedAt).toLocaleDateString()} by {h.updatedBy}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-700 dark:text-stone-300">"{h.ruleText}"</p>
                  <p className="mt-1 text-[11px] italic text-stone-500">{h.changeSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guideline Edit / Create Modal */}
      {editingGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-[#141417]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
              <h3 className="font-serif text-base font-semibold">
                {isCreatingGuideline ? 'New Brand Guideline' : `Edit ${editingGuideline.ruleCode} (Creates New Version)`}
              </h3>
              <button
                onClick={() => setEditingGuideline(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGuideline} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">Rule Code</label>
                  <input
                    type="text"
                    value={editingGuideline.ruleCode}
                    onChange={(e) =>
                      setEditingGuideline({ ...editingGuideline, ruleCode: e.target.value })
                    }
                    required
                    className="w-full rounded border border-stone-300 p-2 dark:border-stone-700 dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">Category</label>
                  <select
                    value={editingGuideline.category}
                    onChange={(e) =>
                      setEditingGuideline({
                        ...editingGuideline,
                        category: e.target.value as GuidelineCategory,
                      })
                    }
                    className="w-full rounded border border-stone-300 p-2 dark:border-stone-700 dark:bg-stone-900"
                  >
                    <option value="Tone">Tone</option>
                    <option value="Terminology">Terminology</option>
                    <option value="Messaging">Messaging</option>
                    <option value="Visual">Visual</option>
                    <option value="Accessibility">Accessibility</option>
                    <option value="Claims">Claims</option>
                    <option value="Legal-adjacent">Legal-adjacent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editingGuideline.title}
                  onChange={(e) =>
                    setEditingGuideline({ ...editingGuideline, title: e.target.value })
                  }
                  required
                  className="w-full rounded border border-stone-300 p-2 dark:border-stone-700 dark:bg-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Rule Text</label>
                <textarea
                  value={editingGuideline.ruleText}
                  onChange={(e) =>
                    setEditingGuideline({ ...editingGuideline, ruleText: e.target.value })
                  }
                  required
                  rows={3}
                  className="w-full rounded border border-stone-300 p-2 dark:border-stone-700 dark:bg-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Rationale</label>
                <textarea
                  value={editingGuideline.rationale}
                  onChange={(e) =>
                    setEditingGuideline({ ...editingGuideline, rationale: e.target.value })
                  }
                  required
                  rows={2}
                  className="w-full rounded border border-stone-300 p-2 dark:border-stone-700 dark:bg-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingGuideline(null)}
                  className="px-3 py-1.5 text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[#B8975A] px-4 py-1.5 font-semibold text-white hover:bg-[#A07F43]"
                >
                  Save Guideline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Terminology Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-[#141417]">
            <h3 className="font-serif text-base font-semibold">Paste CSV Terminology Rules</h3>
            <p className="text-xs text-stone-500 mt-1">
              Format: preferredTerm, prohibitedTerm1;prohibitedTerm2, replacement, context, severity
            </p>
            <textarea
              value={csvImportText}
              onChange={(e) => setCsvImportText(e.target.value)}
              rows={5}
              placeholder={`age-embracing rituals, anti-aging;wrinkle-free, age-embracing rituals, celebrate natural maturity, High`}
              className="mt-3 w-full rounded border border-stone-300 p-2 text-xs font-mono dark:border-stone-700 dark:bg-stone-900"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCsvImport}
                className="rounded bg-[#B8975A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A07F43]"
              >
                Import Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
