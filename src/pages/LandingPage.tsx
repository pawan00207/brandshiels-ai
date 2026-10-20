import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Scale,
  BrainCircuit,
  Lock,
  ArrowRight,
  Eye,
  FileText,
  BookmarkCheck,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/index.ts';
import { DEMO_USERS } from '../data/seed-data.ts';
import { storage } from '../db/storage.ts';

interface LandingPageProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ currentUser, onUserChange }) => {
  const navigate = useNavigate();

  const handleEnterAs = (role: UserRole) => {
    const targetUser = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    storage.setCurrentUser(targetUser);
    onUserChange(targetUser);
    if (role === 'creator') {
      navigate('/workbench');
    } else if (role === 'reviewer') {
      navigate('/queue');
    } else {
      navigate('/knowledge');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 transition-colors dark:bg-[#0E0E10] dark:text-stone-100">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden border-b border-stone-200/80 px-4 pt-16 pb-20 sm:px-6 lg:px-8 dark:border-stone-800">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
            {/* Left Column: Editorial Headline & Value Chain */}
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#B8975A]">
                <ShieldCheck className="h-4 w-4" />
                <span>Pre-Publication Brand Governance Platform</span>
              </div>

              <h1 className="mt-4 font-serif text-4xl font-normal tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-100 text-balance">
                Audit copy against truth, approved guidelines, and terminology.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
                BrandShield AI pre-audits marketing campaigns, press releases, and editorial copy
                before publication. Every finding is substantiated with exact guidelines or explicit
                evidence gaps. AI proposes surgical corrections — human stewards hold the final
                decision.
              </p>

              {/* Fast Demo Entrance Persona Picker */}
              <div className="mt-8 rounded border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#141417]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-3">
                  Enter Interactive Workspace as Persona:
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <button
                    onClick={() => handleEnterAs('admin')}
                    className="flex flex-col items-start rounded border border-stone-200 p-3 text-left transition-all hover:border-[#B8975A] hover:bg-[#B8975A]/5 dark:border-stone-800 dark:hover:border-[#B8975A]"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#B8975A] uppercase">
                      Admin Persona
                    </span>
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 mt-0.5">
                      Eleanor Vance
                    </span>
                    <span className="text-[11px] text-stone-500 mt-1">
                      Manage guidelines & facts
                    </span>
                  </button>

                  <button
                    onClick={() => handleEnterAs('creator')}
                    className="flex flex-col items-start rounded border border-stone-200 p-3 text-left transition-all hover:border-[#B8975A] hover:bg-[#B8975A]/5 dark:border-stone-800 dark:hover:border-[#B8975A]"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#B8975A] uppercase">
                      Creator Persona
                    </span>
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 mt-0.5">
                      Sophie Mercer
                    </span>
                    <span className="text-[11px] text-stone-500 mt-1">
                      Audit & revise copy
                    </span>
                  </button>

                  <button
                    onClick={() => handleEnterAs('reviewer')}
                    className="flex flex-col items-start rounded border border-stone-200 p-3 text-left transition-all hover:border-[#B8975A] hover:bg-[#B8975A]/5 dark:border-stone-800 dark:hover:border-[#B8975A]"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#B8975A] uppercase">
                      Reviewer Persona
                    </span>
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 mt-0.5">
                      Julian Thorne
                    </span>
                    <span className="text-[11px] text-stone-500 mt-1">
                      Review queue & approval
                    </span>
                  </button>
                </div>
              </div>

              {/* Mechanism-to-outcome chain */}
              <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-stone-200/60 pt-6 text-xs text-stone-500 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#B8975A]" />
                  <span>Dual-layer deterministic & AI engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#B8975A]" />
                  <span>No auto-publishing or silent changes</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-[#B8975A]" />
                  <span>Persistent IndexedDB storage</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Asset */}
            <div className="relative flex items-center lg:col-span-5">
              <div className="overflow-hidden rounded border border-stone-200 shadow-xl dark:border-stone-800 w-full h-full min-h-[380px] relative">
                <img
                  src="/images/hero_luxury_editorial_1792505458735.jpg"
                  alt="Maison Aurelia luxury brand governance atelier"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#B8975A]">
                    Live Brand Benchmark
                  </span>
                  <h3 className="font-serif text-xl font-medium mt-1">
                    Maison Aurelia Global Brand Office
                  </h3>
                  <p className="text-xs text-stone-300 mt-1">
                    High Botanical Science & Understated French Restraint
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 4-Step Process Section */}
      <section className="border-b border-stone-200/80 py-20 px-4 sm:px-6 lg:px-8 dark:border-stone-800 bg-white/60 dark:bg-stone-900/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#B8975A]">
              Operational Methodology
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-stone-900 dark:text-stone-100">
              How BrandShield Protects Content Integrity
            </h2>
            <p className="mt-3 text-sm text-stone-500">
              A structured four-stage pipeline ensuring every piece of published media is
              truth-grounded and compliant.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-[#141417]">
              <span className="font-mono text-2xl font-bold text-[#B8975A]">01</span>
              <h3 className="mt-3 font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                Brand Knowledge Base
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Admin codifies tone guidelines, terminology do/don’t rules, and verified clinical
                facts with explicit expiration dates.
              </p>
            </div>

            <div className="rounded border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-[#141417]">
              <span className="font-mono text-2xl font-bold text-[#B8975A]">02</span>
              <h3 className="mt-3 font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                Multi-Format Ingestion
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Creators submit copy via text paste or direct upload (PDF, DOCX, TXT, or images for
                visual contrast and alt-text audits).
              </p>
            </div>

            <div className="rounded border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-[#141417]">
              <span className="font-mono text-2xl font-bold text-[#B8975A]">03</span>
              <h3 className="mt-3 font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                Hybrid Audit Pipeline
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Step A executes deterministic checks (prohibited terms, numbers, superlatives). Step
                B engages Gemini with schema-constrained JSON for tone & claims.
              </p>
            </div>

            <div className="rounded border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-[#141417]">
              <span className="font-mono text-2xl font-bold text-[#B8975A]">04</span>
              <h3 className="mt-3 font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                Human-Controlled Approval
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Creators accept or edit suggestions to create revisions. Brand Reviewers approve a
                specific locked version with an unalterable certificate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Three Pillars Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-stone-200/80 dark:border-stone-800">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#B8975A]">
              Architectural Foundations
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-stone-900 dark:text-stone-100">
              The Three Pillars of BrandShield
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Pillar 1 */}
            <div className="rounded border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-[#141417]">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-[#B8975A]/50 bg-[#B8975A]/10 text-[#B8975A]">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
                Evidence-Grounded Auditing
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Every single finding must cite an active rule code, fact reference, and owner. If no
                approved source exists, it is explicitly flagged with an Amber Evidence Gap: treated
                as unverified, never fabricated.
              </p>
              <div className="mt-6 rounded bg-stone-50 p-3 text-[11px] font-mono text-stone-600 border border-stone-200/60 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-300">
                Evidence Coverage Metric: Usable Evidence ÷ Findings Requiring Evidence
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-[#141417]">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-[#B8975A]/50 bg-[#B8975A]/10 text-[#B8975A]">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
                Human-Controlled Governance
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                AI proposes, humans decide. Critical findings block submission unless justified in
                writing. Approved versions are locked with a digital seal watermarked "Approved — Not
                Published".
              </p>
              <div className="mt-6 rounded bg-stone-50 p-3 text-[11px] font-mono text-stone-600 border border-stone-200/60 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-300">
                Dispositions: Accept · Edit & Accept · Reject with Reason · Needs Review
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-[#141417]">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-[#B8975A]/50 bg-[#B8975A]/10 text-[#B8975A]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
                Governance Intelligence
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Real analytics computed from stored audits surface repeat-offender patterns,
                false-positive proxy rates, and an "Unclear Guideline Detector" that alerts leaders to
                frequently disputed rules.
              </p>
              <div className="mt-6 rounded bg-stone-50 p-3 text-[11px] font-mono text-stone-600 border border-stone-200/60 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-300">
                Dynamic Rule Health Scores & Feedback Queues for Continuous Improvement
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & AI Disclosure Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-stone-200/80 dark:border-stone-800 bg-[#FAF8F5] dark:bg-[#0E0E10]">
        <div className="mx-auto max-w-4xl rounded border border-[#B8975A]/40 bg-white p-8 shadow-sm dark:bg-[#141417]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#B8975A]" />
            <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
              Plain-Language Privacy & AI Disclosure
            </h3>
          </div>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
            <p>
              <strong>AI Model Architecture:</strong> Auditing is powered by Google Gemini 3.8 Flash
              through structured schema enforcement. Output is strictly constrained to typed JSON
              findings and validated with Zod schemas.
            </p>
            <p>
              <strong>Minimal Data Minimization:</strong> BrandShield never sends your full brand
              library to the AI model. Relevant rules and facts are retrieved via keyword and TF-IDF
              scoring, sending only minimal excerpts necessary to verify each document.
            </p>
            <p>
              <strong>Untrusted Content Quarantine:</strong> Submitted copy is quarantined inside
              strict XML delimiter tags (<code className="font-mono">&lt;untrusted_creator_content&gt;</code>) to protect
              against prompt-injection attacks. Embedded instructions cannot alter governance outcomes.
            </p>
            <p>
              <strong>Client-Side Persistence & Storage:</strong> All records, revisions, comments,
              and certificates reside in your browser’s IndexedDB with an abstracted data-access
              layer. No proprietary draft content is sent to third-party databases.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 text-center text-xs text-stone-500">
        <p className="font-serif text-sm text-stone-700 dark:text-stone-300">
          BrandShield AI — Intelligent Brand Governance & Editorial Pre-Audit Platform
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
          <Link to="/about" className="hover:text-[#B8975A]">
            Architecture & Roadmap
          </Link>
          <span>·</span>
          <Link to="/evaluation" className="hover:text-[#B8975A]">
            Evaluation Suite (25 Tests)
          </Link>
          <span>·</span>
          <Link to="/settings" className="hover:text-[#B8975A]">
            Settings & Purge
          </Link>
        </div>
      </footer>
    </div>
  );
};
