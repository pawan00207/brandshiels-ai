import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  Code2,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 dark:border-stone-800 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#B8975A]">
          <ShieldCheck className="h-4 w-4" />
          <span>System Architecture & Governance Blueprint</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-normal text-stone-900 dark:text-stone-100">
          About BrandShield AI
        </h1>
        <p className="mt-3 text-sm text-stone-500">
          An intelligent brand-governance platform pre-auditing creative content before
          publication with evidence-grounded findings and human-controlled approval.
        </p>
      </div>

      {/* Tech Stack Matrix */}
      <div className="rounded border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
        <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#B8975A]" />
          <span>Technical Stack & Dependencies</span>
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div className="rounded bg-stone-50 p-4 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
            <span className="font-mono text-[#B8975A] font-bold block mb-1">FRONTEND & UI</span>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              React 19 + TypeScript + Tailwind CSS
            </p>
            <p className="text-stone-500 mt-1">
              Quiet luxury editorial design system with Cormorant Garamond, Plus Jakarta Sans, and
              JetBrains Mono typography.
            </p>
          </div>

          <div className="rounded bg-stone-50 p-4 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
            <span className="font-mono text-[#B8975A] font-bold block mb-1">AI MODEL INFERENCE</span>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              Google Gemini 3.8 Flash via @google/genai
            </p>
            <p className="text-stone-500 mt-1">
              Schema-constrained JSON output validated via Zod. Strict prompt-injection quarantining.
            </p>
          </div>

          <div className="rounded bg-stone-50 p-4 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
            <span className="font-mono text-[#B8975A] font-bold block mb-1">LOCAL PERSISTENCE</span>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              IndexedDB with Storage Repository
            </p>
            <p className="text-stone-500 mt-1">
              Full offline resilience: submissions, audit reports, revisions, and certificates survive
              browser refreshes.
            </p>
          </div>

          <div className="rounded bg-stone-50 p-4 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
            <span className="font-mono text-[#B8975A] font-bold block mb-1">DOCUMENT EXTRACTION</span>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              pdfjs-dist & mammoth.js
            </p>
            <p className="text-stone-500 mt-1">
              In-browser extraction of raw body text from Adobe PDF, Microsoft Word DOCX, and plain
              text files.
            </p>
          </div>

          <div className="rounded bg-stone-50 p-4 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
            <span className="font-mono text-[#B8975A] font-bold block mb-1">VISUAL & ACCESSIBILITY</span>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              HTML5 Canvas WCAG Contrast Prober
            </p>
            <p className="text-stone-500 mt-1">
              Off-screen canvas luminance delta sampling, aspect ratio check, and alt-text attribute
              enforcement.
            </p>
          </div>

          <div className="rounded bg-stone-50 p-4 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
            <span className="font-mono text-[#B8975A] font-bold block mb-1">DATA VISUALIZATION</span>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              Recharts with Data Tables
            </p>
            <p className="text-stone-500 mt-1">
              Responsive SVG bar charts and category distributions with accessible tabular data
              alternatives.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Limitations & Disclosures */}
      <div className="rounded border border-amber-300 bg-amber-50/40 p-8 dark:border-amber-900/60 dark:bg-amber-950/20">
        <h2 className="font-serif text-xl font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Honest Disclosures & Known Limitations</span>
        </h2>

        <div className="mt-4 space-y-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
          <p>
            • <strong>No Guarantee of Legal Correctness:</strong> BrandShield AI audits copy against
            the company’s internal repository of approved guidelines and facts. A clean report
            ("No issues detected") certifies adherence to recorded brand sources, but does not
            substitute for formal statutory legal review by qualified legal counsel.
          </p>
          <p>
            • <strong>Scanned PDF OCR Limitations:</strong> Client-side PDF extraction parses native
            text streams via <code className="font-mono">pdfjs-dist</code>. Flattened bitmap image PDFs
            require an external OCR engine.
          </p>
          <p>
            • <strong>Sampled Visual Contrast:</strong> Visual color contrast analysis computes
            WCAG luminance ratios across sampled pixel regions on an HTML canvas. It is intended as
            an early-warning heuristic for marketing designers rather than full vector typography
            validation.
          </p>
        </div>
      </div>

      {/* Engineering Roadmap */}
      <div className="rounded border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-[#121214]">
        <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#B8975A]" />
          <span>Product Engineering Roadmap</span>
        </h2>

        <div className="mt-6 space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <span className="font-mono font-bold text-[#B8975A] shrink-0 mt-0.5">PHASE 2</span>
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                Enterprise Relational Backend & SSO
              </span>
              <p className="text-stone-500 mt-0.5">
                FastAPI / Node microservices with PostgreSQL for multi-region team sync, SAML 2.0 /
                Okta single sign-on, and role-based access control (RBAC).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-stone-100 pt-3 dark:border-stone-800">
            <span className="font-mono font-bold text-[#B8975A] shrink-0 mt-0.5">PHASE 3</span>
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                Direct CMS & Publishing Gateways
              </span>
              <p className="text-stone-500 mt-0.5">
                Headless CMS webhooks (Contentful, Sanity, Strapi) that block publishing unless an
                approval certificate with an unexpired digital seal is attached to the draft.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-stone-100 pt-3 dark:border-stone-800">
            <span className="font-mono font-bold text-[#B8975A] shrink-0 mt-0.5">PHASE 4</span>
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                Multi-Modal Video & Audio Tone Analysis
              </span>
              <p className="text-stone-500 mt-0.5">
                Audio podcast transcription and video frame analysis using Gemini 3.8 Live and
                transcription models to enforce voice tone across broadcast ads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
