import React from 'react';
import { MessageSquareText, Sparkles, BookOpen, ShieldAlert } from 'lucide-react';
import MilestoneNotice from '../components/MilestoneNotice';

export default function AskDocPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Grounded Academic RAG
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Ask the Doc
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Ask questions strictly grounded in indexed course materials. Answers cite exact document titles, page numbers, and direct excerpts.
        </p>
      </div>

      {/* Query Bar Layout Mockup (disabled) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <MessageSquareText className="w-5 h-5" />
          </div>
          <input
            type="text"
            disabled
            placeholder="Ask a question about your syllabus, lecture notes, or PYQ questions..."
            className="w-full text-sm text-slate-400 bg-transparent outline-none cursor-not-allowed"
          />
          <button
            disabled
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed shrink-0"
          >
            Ask AI
          </button>
        </div>
      </div>

      <MilestoneNotice
        featureId="F4"
        featureTitle="Grounded 'Ask the Doc' RAG Engine"
        scheduledMilestone="Milestone 4 (Grounded RAG)"
        contractRequirements={[
          'Semantic retrieval of relevant course chunks using Gemini embeddings',
          'Strict prompt constraints preventing hallucinated outside knowledge',
          'Structured provenance cards showing resource title, page number, and exact text excerpt',
          'Honest abstention: clearly states when available course material is insufficient',
          'Fallback keyword search when embedding service is temporarily unavailable'
        ]}
      />
    </div>
  );
}
