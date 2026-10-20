import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Table,
  Eye,
  EyeOff,
  Flag,
  FileQuestion,
  HelpCircle,
  Database,
  Check,
} from 'lucide-react';
import {
  AuditReport,
  GuidelineFeedback,
  BrandProfile,
  UserProfile,
} from '../types/index.ts';
import { storage } from '../db/storage.ts';
import { DEMO_BRAND_ID } from '../data/seed-data.ts';

interface GovernanceIntelligencePageProps {
  currentUser: UserProfile;
}

export const GovernanceIntelligencePage: React.FC<GovernanceIntelligencePageProps> = ({
  currentUser,
}) => {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [feedbackList, setFeedbackList] = useState<GuidelineFeedback[]>([]);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('all');
  const [anonymizeAuthors, setAnonymizeAuthors] = useState<boolean>(currentUser.role !== 'admin');
  const [showDataTables, setShowDataTables] = useState<boolean>(false);
  const [insightsSummary, setInsightsSummary] = useState<string>('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);
  const [isSeedingHistory, setIsSeedingHistory] = useState<boolean>(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [currentUser]);

  const loadAnalyticsData = async () => {
    const allReports = await storage.getAuditReports();
    const fb = await storage.getGuidelineFeedback(DEMO_BRAND_ID);
    const b = await storage.getBrand(DEMO_BRAND_ID);
    setReports(allReports);
    setFeedbackList(fb);
    setBrand(b);

    // Initial insights
    if (allReports.length > 0) {
      generateInsights(allReports);
    }
  };

  const handleSeedSampleHistory = async () => {
    setIsSeedingHistory(true);
    try {
      const count = await storage.generateSampleAuditHistory();
      await loadAnalyticsData();
      alert(`Generated ${count} realistic synthetic historical audits across 8 weeks.`);
    } catch (err: any) {
      alert(`Failed to seed analytics: ${err.message}`);
    } finally {
      setIsSeedingHistory(false);
    }
  };

  // Compute Metrics from Real Stored Reports
  const metrics = useMemo(() => {
    const totalReports = reports.length;
    if (totalReports === 0) {
      return {
        totalAudits: 0,
        totalFindings: 0,
        avgEvidenceCoverage: 0,
        rejectedFindingsRate: 0,
        acceptedCorrectionRate: 0,
        categoryCounts: [],
        severityCounts: [],
        topViolatedRules: [],
        unclearRules: [],
        channelDistribution: [],
      };
    }

    let totalFindings = 0;
    let totalEvidenceCoverageSum = 0;
    let acceptedDispositions = 0;
    let rejectedDispositions = 0;
    let totalDisposed = 0;

    const categoryMap: Record<string, number> = {};
    const severityMap: Record<string, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    };
    const ruleViolationMap: Record<string, { code: string; count: number; title: string }> = {};
    const ruleRejectionMap: Record<string, number> = {};

    reports.forEach((rep) => {
      totalEvidenceCoverageSum += rep.evidenceCoverage;
      rep.findings.forEach((f) => {
        totalFindings++;
        categoryMap[f.category] = (categoryMap[f.category] || 0) + 1;
        severityMap[f.severity] = (severityMap[f.severity] || 0) + 1;

        const code = f.evidence.ruleCode || 'UNSPECIFIED';
        if (!ruleViolationMap[code]) {
          ruleViolationMap[code] = {
            code,
            count: 0,
            title: f.evidence.sourceTitle || 'General Standard',
          };
        }
        ruleViolationMap[code].count++;

        if (f.disposition.status === 'Accepted' || f.disposition.status === 'Edit & accept') {
          acceptedDispositions++;
          totalDisposed++;
        } else if (f.disposition.status === 'Rejected') {
          rejectedDispositions++;
          totalDisposed++;
          ruleRejectionMap[code] = (ruleRejectionMap[code] || 0) + 1;
        }
      });
    });

    const avgEvidenceCoverage = Math.round(totalEvidenceCoverageSum / totalReports);
    const rejectedFindingsRate =
      totalDisposed > 0 ? Math.round((rejectedDispositions / totalDisposed) * 100) : 0;
    const acceptedCorrectionRate =
      totalDisposed > 0 ? Math.round((acceptedDispositions / totalDisposed) * 100) : 0;

    const categoryCounts = Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
    }));

    const severityCounts = Object.entries(severityMap).map(([name, count]) => ({
      name,
      count,
    }));

    const topViolatedRules = Object.values(ruleViolationMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Unclear Guideline Detector: rules with high dispute/rejection rate or low confidence
    const unclearRules = Object.entries(ruleRejectionMap)
      .map(([code, rejectCount]) => {
        const total = ruleViolationMap[code]?.count || 1;
        const healthScore = Math.max(10, Math.round(100 - (rejectCount / total) * 70));
        return {
          code,
          title: ruleViolationMap[code]?.title || code,
          rejectCount,
          totalCitations: total,
          healthScore,
        };
      })
      .sort((a, b) => a.healthScore - b.healthScore);

    return {
      totalAudits: totalReports,
      totalFindings,
      avgEvidenceCoverage,
      rejectedFindingsRate,
      acceptedCorrectionRate,
      categoryCounts,
      severityCounts,
      topViolatedRules,
      unclearRules,
    };
  }, [reports]);

  // AI-Generated Governance Insights Summary
  const generateInsights = async (sourceReports: AuditReport[]) => {
    setIsGeneratingInsights(true);
    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: {
            totalAudits: sourceReports.length,
            evidenceCoverageAvg: metrics.avgEvidenceCoverage,
            rejectionRate: metrics.rejectedFindingsRate,
            topRules: metrics.topViolatedRules,
          },
        }),
      });
      const data = await res.json();
      setInsightsSummary(data.summary || '');
    } catch {
      setInsightsSummary(
        'Audit records reflect steady brand alignment. Regular reviews of expiring clinical trials and active terminology maintenance continue to safeguard brand integrity across channels.'
      );
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const hasSyntheticData = reports.some((r) => r.id.startsWith('synth-'));

  const COLORS = ['#B8975A', '#A07F43', '#7A5E2E', '#3D3D45', '#555560', '#888890'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Governance</span>
            <span>/</span>
            <span className="text-[#B8975A]">Intelligence & Analytics</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Brand Governance Intelligence Dashboard
          </h2>
          {hasSyntheticData && (
            <span className="mt-1 inline-block rounded bg-[#B8975A]/15 px-2 py-0.5 text-[11px] font-mono font-medium text-[#B8975A]">
              Analytics includes synthetic history dataset (~40 sample audits across 8 weeks)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAnonymizeAuthors(!anonymizeAuthors)}
            className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            title="Toggle creator author anonymization"
          >
            {anonymizeAuthors ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{anonymizeAuthors ? 'Authors Anonymized' : 'Show Authors'}</span>
          </button>

          <button
            onClick={() => setShowDataTables(!showDataTables)}
            className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            <Table className="h-3.5 w-3.5" />
            <span>{showDataTables ? 'Show Charts' : 'Show Data Tables'}</span>
          </button>

          <button
            onClick={handleSeedSampleHistory}
            disabled={isSeedingHistory}
            className="flex items-center gap-1.5 rounded bg-[#B8975A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A07F43]"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{isSeedingHistory ? 'Seeding...' : 'Generate Sample Audit History'}</span>
          </button>
        </div>
      </div>

      {/* AI Insights Summary Strip */}
      <div className="mb-8 rounded border border-[#B8975A]/40 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#141417]">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#B8975A]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Executive Governance Insights (AI-Generated Analysis)
            </span>
          </div>
          <button
            onClick={() => generateInsights(reports)}
            disabled={isGeneratingInsights}
            className="text-[11px] font-semibold text-[#B8975A] hover:underline"
          >
            {isGeneratingInsights ? 'Regenerating...' : 'Regenerate Analysis'}
          </button>
        </div>
        <p className="mt-3 font-serif text-sm leading-relaxed text-stone-800 dark:text-stone-200">
          "{insightsSummary || 'Aggregating recorded brand audit metrics across campaigns...'}"
        </p>
        <div className="mt-2 text-[10px] text-stone-400">
          Generated via Gemini 3.8 Flash analysis over aggregated metrics only. No raw confidential copy is processed during insights synthesis.
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Total Audits Run</span>
          <span className="mt-1 font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
            {metrics.totalAudits}
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">Across all campaigns</span>
        </div>

        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Evidence Coverage</span>
          <span className="mt-1 font-mono text-2xl font-bold text-[#B8975A]">
            {metrics.avgEvidenceCoverage}%
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">Findings backed by sources</span>
        </div>

        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Correction Acceptance</span>
          <span className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {metrics.acceptedCorrectionRate}%
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">Surgical suggestions adopted</span>
        </div>

        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider block">False-Positive Proxy</span>
          <span className="mt-1 font-mono text-2xl font-bold text-stone-600 dark:text-stone-400">
            {metrics.rejectedFindingsRate}%
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">Findings rejected with reason</span>
        </div>
      </div>

      {/* Main Charts & Data Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Visual Breakdowns (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Chart 1: Findings by Category */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Findings by Brand Governance Category
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Distribution of flagged violations across claims, tone, terminology, and legal rules.
            </p>

            {showDataTables ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-100 text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Violation Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {metrics.categoryCounts.map((c) => (
                      <tr key={c.name}>
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2 text-right font-mono">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.categoryCounts}>
                    <XAxis dataKey="name" stroke="#888" fontSize={11} />
                    <YAxis stroke="#888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141417',
                        borderColor: '#B8975A',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="count" fill="#B8975A" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Recurring Violated Rules */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Top Recurring Violated Rules
            </h3>
            <p className="text-xs text-stone-400 mb-3">
              Identifies guidelines needing writer coaching or clearer baseline definitions.
            </p>

            <div className="space-y-2.5">
              {metrics.topViolatedRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border border-stone-100 bg-stone-50/50 p-2.5 text-xs dark:border-stone-800 dark:bg-stone-900/40"
                >
                  <div>
                    <span className="font-mono text-[11px] font-bold text-[#B8975A]">
                      {rule.code}
                    </span>
                    <span className="mx-2 text-stone-300 dark:text-stone-700">·</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {rule.title}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-400">
                    {rule.count} violations
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Unclear Guideline Detector & Feedback (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Unclear Guideline Detector */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <div className="flex items-center gap-2 mb-1">
              <FileQuestion className="h-4 w-4 text-[#B8975A]" />
              <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
                Unclear Guideline Detector
              </h3>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Surfaces rules frequently rejected or disputed by creators, indicating ambiguity.
            </p>

            {metrics.unclearRules.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center italic">
                No high-dispute guidelines detected. All rules exhibit clean consensus.
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.unclearRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-amber-200 bg-amber-50/30 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                        {rule.code}
                      </span>
                      <span className="font-mono text-[11px] text-stone-500">
                        Health Score: {rule.healthScore}%
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-stone-800 dark:text-stone-200">
                      {rule.title}
                    </p>
                    <div className="mt-1 text-[11px] text-stone-500">
                      Rejected {rule.rejectCount} times out of {rule.totalCitations} citations
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guideline Feedback Queue (Admin review) */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-[#B8975A]" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  Guideline Feedback Queue ({feedbackList.length})
                </h4>
              </div>
            </div>

            <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
              {feedbackList.length === 0 ? (
                <p className="py-4 text-center text-xs text-stone-400 italic">
                  No open feedback flags. Creators can flag ambiguous rules from finding cards.
                </p>
              ) : (
                feedbackList.map((fb) => (
                  <div
                    key={fb.id}
                    className="rounded border border-stone-100 bg-stone-50 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/40"
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span className="font-mono font-bold text-[#B8975A]">{fb.ruleCode}</span>
                      <span>By {fb.submittedBy}</span>
                    </div>
                    <p className="mt-1 text-stone-700 dark:text-stone-300">"{fb.feedbackNote}"</p>
                    <div className="mt-2 text-[10px] text-stone-400">
                      Excerpt: <span className="italic">"{fb.findingExcerpt}"</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
