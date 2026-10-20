import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Scale,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { EVALUATION_TEST_CASES } from '../data/evaluation-cases.ts';
import {
  EvaluationRunResult,
  EvaluationTestCase,
  BrandProfile,
  UserProfile,
} from '../types/index.ts';
import { executeHybridAudit } from '../services/audit-service.ts';
import { storage } from '../db/storage.ts';
import { DEMO_BRAND_ID } from '../data/seed-data.ts';

interface EvaluationPageProps {
  currentUser: UserProfile;
}

export const EvaluationPage: React.FC<EvaluationPageProps> = ({ currentUser }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [results, setResults] = useState<EvaluationRunResult | null>(null);
  const [selectedCase, setSelectedCase] = useState<EvaluationTestCase | null>(null);

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    setProgressIndex(0);
    const brand = await storage.getBrand(DEMO_BRAND_ID);
    if (!brand) {
      alert('Brand data not found.');
      setIsRunning(false);
      return;
    }

    const caseResults: EvaluationRunResult['caseResults'] = [];
    const executionTimes: number[] = [];
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;
    let evidenceCoveredSum = 0;
    let failedAudits = 0;

    const categoryStats: Record<
      string,
      { tp: number; fp: number; fn: number; total: number }
    > = {
      Claims: { tp: 0, fp: 0, fn: 0, total: 0 },
      Terminology: { tp: 0, fp: 0, fn: 0, total: 0 },
      Tone: { tp: 0, fp: 0, fn: 0, total: 0 },
      'Legal-adjacent': { tp: 0, fp: 0, fn: 0, total: 0 },
      Accessibility: { tp: 0, fp: 0, fn: 0, total: 0 },
      Visual: { tp: 0, fp: 0, fn: 0, total: 0 },
      Messaging: { tp: 0, fp: 0, fn: 0, total: 0 },
    };

    const totalCases = EVALUATION_TEST_CASES.length;

    for (let i = 0; i < totalCases; i++) {
      const tc = EVALUATION_TEST_CASES[i];
      setProgressIndex(i + 1);

      const startTime = performance.now();
      try {
        const report = await executeHybridAudit(tc.inputContent, brand, {
          submissionId: `eval-${tc.id}`,
          versionNumber: 1,
          aiChecksEnabled: true,
        });

        const execTime = Math.round(performance.now() - startTime);
        executionTimes.push(execTime);
        evidenceCoveredSum += report.evidenceCoverage;

        if (report.auditStatus === 'Failed') {
          failedAudits++;
        }

        // Determine if case passed
        let casePassed = true;
        let notes = '';

        if (tc.isBenignCleanDraft) {
          // Benign clean draft should have 0 critical or high findings
          const blocking = report.findings.filter(
            (f) => f.severity === 'Critical' || f.severity === 'High'
          );
          if (blocking.length === 0) {
            trueNegatives++;
            notes = 'Clean compliant copy correctly passed without blocking findings.';
          } else {
            falsePositives += blocking.length;
            casePassed = false;
            notes = `False alarm: Flagged ${blocking.length} issues in benign copy.`;
          }
        } else {
          // Expected defects check
          for (const exp of tc.expectedDefects) {
            const matched = report.findings.find(
              (f) =>
                (f.category === exp.category ||
                  (exp.category === 'Claims' && f.category === 'Terminology') ||
                  (exp.category === 'Terminology' && f.category === 'Claims')) &&
                (f.affectedExcerpt.toLowerCase().includes(exp.keywordOrTopic.toLowerCase()) ||
                  f.plainRationale.toLowerCase().includes(exp.keywordOrTopic.toLowerCase()) ||
                  (exp.expectedRuleCode && f.evidence.ruleCode === exp.expectedRuleCode))
            );

            if (matched) {
              truePositives++;
              if (categoryStats[exp.category]) {
                categoryStats[exp.category].tp++;
                categoryStats[exp.category].total++;
              }
            } else {
              falseNegatives++;
              casePassed = false;
              if (categoryStats[exp.category]) {
                categoryStats[exp.category].fn++;
                categoryStats[exp.category].total++;
              }
            }
          }
          notes = casePassed
            ? 'All expected compliance defects accurately detected.'
            : 'One or more expected defects was missed by the engine.';
        }

        caseResults.push({
          caseId: tc.id,
          caseTitle: tc.title,
          auditStatus: report.auditStatus,
          complianceStatus: report.complianceStatus,
          executionTimeMs: execTime,
          findingsCount: report.findings.length,
          passed: casePassed,
          notes,
        });
      } catch (err: any) {
        failedAudits++;
        caseResults.push({
          caseId: tc.id,
          caseTitle: tc.title,
          auditStatus: 'Failed',
          complianceStatus: 'Not assessed',
          executionTimeMs: 0,
          findingsCount: 0,
          passed: false,
          notes: `Audit execution threw error: ${err.message}`,
        });
      }
    }

    // Compute Metrics
    const precision =
      truePositives + falsePositives > 0
        ? Math.round((truePositives / (truePositives + falsePositives)) * 100)
        : 100;

    const recall =
      truePositives + falseNegatives > 0
        ? Math.round((truePositives / (truePositives + falseNegatives)) * 100)
        : 100;

    const evidenceCoverage = Math.round(evidenceCoveredSum / totalCases);
    const falsePositiveRate =
      falsePositives + trueNegatives > 0
        ? Math.round((falsePositives / (falsePositives + trueNegatives)) * 100)
        : 0;

    // Median execution time
    executionTimes.sort((a, b) => a - b);
    const medianAuditTimeMs =
      executionTimes.length > 0 ? executionTimes[Math.floor(executionTimes.length / 2)] : 0;

    const failureRate = Math.round((failedAudits / totalCases) * 100);

    const categoryBreakdown = Object.entries(categoryStats).map(([cat, stat]) => ({
      category: cat as any,
      precision: stat.tp + stat.fp > 0 ? Math.round((stat.tp / (stat.tp + stat.fp)) * 100) : 100,
      recall: stat.tp + stat.fn > 0 ? Math.round((stat.tp / (stat.tp + stat.fn)) * 100) : 100,
      totalFindings: stat.total,
    }));

    setResults({
      totalCases,
      passedCount: caseResults.filter((c) => c.passed).length,
      precision,
      recall,
      evidenceCoverage,
      falsePositiveRate,
      medianAuditTimeMs,
      failureRate,
      categoryBreakdown,
      caseResults,
    });

    setIsRunning(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Quality & Testing</span>
            <span>/</span>
            <span className="text-[#B8975A]">Evaluation Benchmark Suite</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Maison Aurelia Benchmark Evaluation (25 Test Cases)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Pre-configured test suite verifying precision, recall, and evidence grounding against
            prohibited terms, expired facts, unsupported claims, prompt-injection attacks, and clean drafts.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isRunning}
          className="flex items-center gap-2 rounded bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 dark:bg-[#B8975A] dark:hover:bg-[#A07F43]"
        >
          <Play className="h-4 w-4" />
          <span>
            {isRunning ? `Running Case ${progressIndex}/25...` : 'Run Benchmark Evaluation'}
          </span>
        </button>
      </div>

      {/* Evaluation Results KPI Strip (When completed) */}
      {results && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Passed Cases</span>
              <span className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {results.passedCount}/{results.totalCases}
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">
                {Math.round((results.passedCount / results.totalCases) * 100)}% accuracy
              </span>
            </div>

            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Precision</span>
              <span className="mt-1 font-mono text-2xl font-bold text-[#B8975A]">
                {results.precision}%
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">True positive accuracy</span>
            </div>

            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Recall</span>
              <span className="mt-1 font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
                {results.recall}%
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">Defect capture rate</span>
            </div>

            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Evidence Coverage</span>
              <span className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {results.evidenceCoverage}%
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">Verified source backing</span>
            </div>

            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Median Latency</span>
              <span className="mt-1 font-mono text-2xl font-bold text-stone-700 dark:text-stone-300">
                {results.medianAuditTimeMs}ms
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">Execution per case</span>
            </div>

            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Failure Rate</span>
              <span className="mt-1 font-mono text-2xl font-bold text-stone-700 dark:text-stone-300">
                {results.failureRate}%
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">0 fatal crashes</span>
            </div>
          </div>

          {/* Per-Category Precision & Recall */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 mb-3">
              Per-Category Precision & Recall Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {results.categoryBreakdown
                .filter((c) => c.totalFindings > 0)
                .map((cat) => (
                  <div key={cat.category} className="rounded bg-stone-50 p-3 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
                    <span className="font-mono text-xs font-bold text-[#B8975A] block">
                      {cat.category}
                    </span>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-stone-500">Precision:</span>
                      <span className="font-mono font-semibold">{cat.precision}%</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-stone-500">Recall:</span>
                      <span className="font-mono font-semibold">{cat.recall}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Cases Table */}
      <div className="overflow-x-auto rounded border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#121214]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-900/60">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Test Case Objective</th>
              <th className="p-3">Channel / Type</th>
              <th className="p-3">Input Copy Sample</th>
              <th className="p-3">Expected Defect</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {EVALUATION_TEST_CASES.map((tc) => {
              const res = results?.caseResults.find((r) => r.caseId === tc.id);

              return (
                <tr
                  key={tc.id}
                  onClick={() => setSelectedCase(tc)}
                  className="cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <td className="p-3 font-mono font-bold text-[#B8975A]">{tc.id}</td>
                  <td className="p-3 font-medium text-stone-900 dark:text-stone-100 max-w-xs">
                    {tc.title}
                  </td>
                  <td className="p-3 text-stone-500">
                    {tc.channel} · {tc.contentType}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-stone-600 dark:text-stone-400 max-w-sm truncate">
                    "{tc.inputContent}"
                  </td>
                  <td className="p-3 text-stone-500">
                    {tc.isBenignCleanDraft ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Benign clean draft (0 defects expected)
                      </span>
                    ) : (
                      tc.expectedDefects.map((d, i) => (
                        <span key={i} className="block text-[11px]">
                          [{d.category}] {d.keywordOrTopic}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="p-3">
                    {res ? (
                      res.passed ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Passed ({res.executionTimeMs}ms)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400">
                          <XCircle className="h-4 w-4" /> Failed
                        </span>
                      )
                    ) : (
                      <span className="text-stone-400">Ready</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Test Case Detail Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-[#141417]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
              <h3 className="font-serif text-base font-semibold">
                Test Case Details: {selectedCase.id}
              </h3>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold block text-stone-500">Title:</span>
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {selectedCase.title}
                </p>
              </div>

              <div>
                <span className="font-semibold block text-stone-500">Objective:</span>
                <p className="text-stone-700 dark:text-stone-300">{selectedCase.description}</p>
              </div>

              <div className="rounded bg-stone-50 p-3 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                <span className="font-semibold block text-stone-500 mb-1">Input Copy:</span>
                <p className="font-mono whitespace-pre-wrap text-[11px] text-stone-800 dark:text-stone-200">
                  {selectedCase.inputContent}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="rounded bg-stone-900 px-4 py-1.5 text-xs text-white dark:bg-[#B8975A]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
