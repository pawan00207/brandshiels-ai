import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Sparkles,
  AlertTriangle,
  Download,
  Trash2,
  Lock,
  CheckCircle2,
  Shield,
  FileText,
} from 'lucide-react';
import { Workspace, UserProfile, AuditEventLog } from '../types/index.ts';
import { storage } from '../db/storage.ts';
import { DEMO_WORKSPACE_ID } from '../data/seed-data.ts';

interface SettingsPageProps {
  currentUser: UserProfile;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(180);
  const [aiChecksEnabled, setAiChecksEnabled] = useState<boolean>(true);
  const [simulateAiFailure, setSimulateAiFailure] = useState<boolean>(false);
  const [auditEvents, setAuditEvents] = useState<AuditEventLog[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [purgedCount, setPurgedCount] = useState<number | null>(null);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    const ws = await storage.getWorkspace(DEMO_WORKSPACE_ID);
    if (ws) {
      setWorkspace(ws);
      setRetentionDays(ws.settings.retentionDays || 180);
      setAiChecksEnabled(ws.settings.aiChecksEnabled ?? true);
      setSimulateAiFailure(ws.settings.simulateAiFailure ?? false);
    }
    const events = await storage.getAuditEvents(DEMO_WORKSPACE_ID);
    setAuditEvents(events);
  };

  const handleSaveSettings = async () => {
    if (!workspace) return;
    const updated: Workspace = {
      ...workspace,
      settings: {
        retentionDays,
        aiChecksEnabled,
        simulateAiFailure,
      },
    };
    await storage.saveWorkspace(updated);
    setWorkspace(updated);
    alert('Workspace settings updated successfully.');
  };

  const handlePurge = async () => {
    if (!isAdmin) return;
    if (window.confirm(`Purge all content submissions older than ${retentionDays} days?`)) {
      const count = await storage.purgeOldSubmissions(retentionDays);
      setPurgedCount(count);
      alert(`Purge completed: ${count} expired records removed.`);
      const events = await storage.getAuditEvents(DEMO_WORKSPACE_ID);
      setAuditEvents(events);
    }
  };

  const handleExportAuditEventsCsv = () => {
    if (auditEvents.length === 0) return;
    const header = ['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Details'];
    const rows = auditEvents.map((e) => [
      e.id,
      e.timestamp,
      `"${e.actorName}"`,
      e.actorRole,
      e.action,
      `${e.entityType}:${e.entityId}`,
      `"${e.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BrandShield-Audit-Log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredEvents = auditEvents.filter((e) => {
    if (eventFilter !== 'all' && e.action !== eventFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4 dark:border-stone-800">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>Administration</span>
          <span>/</span>
          <span className="text-[#B8975A]">Settings & Governance Policies</span>
        </div>
        <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Workspace Settings & Compliance Guardrails
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Settings & AI Disclosures (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Members & Roles */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800">
              <Users className="h-4 w-4 text-[#B8975A]" />
              <span>Workspace Members & Role Permissions</span>
            </div>

            <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
              {workspace?.members.map((m) => (
                <div key={m.userId} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                      {m.name}
                    </span>
                    <span className="text-stone-400 text-[11px]">{m.email}</span>
                  </div>
                  <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[#B8975A] font-bold">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Usage & Dev Simulation Controls */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800">
              <Sparkles className="h-4 w-4 text-[#B8975A]" />
              <span>AI Engine Configuration & Resilience Dev-Tools</span>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-stone-900 dark:text-stone-100">
                    Enable Gemini 3.8 Flash Semantic Checks
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    When disabled, only Step A deterministic rule checks will execute. Results are
                    labeled "Partial — AI checks disabled".
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={aiChecksEnabled}
                  onChange={(e) => setAiChecksEnabled(e.target.checked)}
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded accent-[#B8975A]"
                />
              </div>

              <div className="border-t border-stone-100 pt-3 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-rose-700 dark:text-rose-400">
                    Simulate AI Service Failure (Dev-Testing)
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Forces an artificial timeout/error on AI endpoints to verify that audits produce
                    honest "Partial" or "Failed" statuses, never a false pass.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={simulateAiFailure}
                  onChange={(e) => setSimulateAiFailure(e.target.checked)}
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded accent-rose-700"
                />
              </div>

              {isAdmin && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    className="rounded bg-[#B8975A] px-4 py-1.5 font-semibold text-white hover:bg-[#A07F43]"
                  >
                    Save AI Settings
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Retention & Purge */}
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800">
              <Clock className="h-4 w-4 text-[#B8975A]" />
              <span>Data Retention Policy & Auto-Purge</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-stone-700 dark:text-stone-300">
                  Retain Content Submissions For (Days):
                </label>
                <input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  disabled={!isAdmin}
                  min={7}
                  max={730}
                  className="w-24 rounded border border-stone-300 p-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                />
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-[11px] text-stone-400">
                    Purge submissions older than {retentionDays} days from local storage.
                  </span>
                  <button
                    onClick={handlePurge}
                    className="flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Purge Expired Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Immutable Audit Event Log (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[#B8975A]" />
                <span>Immutable Audit Trail Log ({auditEvents.length})</span>
              </div>
              <button
                onClick={handleExportAuditEventsCsv}
                className="flex items-center gap-1 text-[11px] text-[#B8975A] hover:underline"
              >
                <Download className="h-3 w-3" /> Export CSV
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-400">Filter Action:</span>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="rounded border border-stone-200 bg-stone-50 p-1 text-xs dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="all">All Actions</option>
                <option value="RUN_AUDIT">RUN_AUDIT</option>
                <option value="APPLY_CORRECTION">APPLY_CORRECTION</option>
                <option value="APPROVE_VERSION">APPROVE_VERSION</option>
                <option value="REJECT_FINDING">REJECT_FINDING</option>
                <option value="REQUEST_CHANGES">REQUEST_CHANGES</option>
                <option value="FLAG_GUIDELINE_AMBIGUITY">FLAG_GUIDELINE_AMBIGUITY</option>
              </select>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[460px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-400">No events found.</p>
              ) : (
                filteredEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded border border-stone-100 bg-stone-50/70 p-2.5 text-xs dark:border-stone-800/60 dark:bg-stone-900/40"
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span className="font-mono text-[#B8975A] font-bold">{evt.action}</span>
                      <span>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 font-medium text-stone-700 dark:text-stone-300">
                      {evt.actorName} ({evt.actorRole})
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 line-clamp-2">{evt.details}</p>
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
