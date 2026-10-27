import React from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import MilestoneNotice from '../components/MilestoneNotice';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
          <Upload className="w-3.5 h-3.5" />
          Document Ingestion
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Upload Academic Document
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Contribute course-specific materials, PYQs, lecture notes, or lab manuals. All uploads undergo page-by-page text extraction and semantic chunking.
        </p>
      </div>

      {/* Upload Dropzone Preview (clearly disabled) */}
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50/50 flex flex-col items-center text-center opacity-75">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-700">PDF Upload (8 MiB limit)</p>
        <p className="text-xs text-slate-500 mt-1">Accepts .pdf files only with valid MIME type verification</p>
        <span className="mt-4 px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 text-slate-700">
          Dropzone Inactive • Active in Milestone 2
        </span>
      </div>

      <MilestoneNotice
        featureId="F2 / F3"
        featureTitle="Document Ingestion & File Processing"
        scheduledMilestone="Milestone 2 (Upload API) & Milestone 3 (RAG Pipeline)"
        contractRequirements={[
          'MIME type and .pdf extension validation with 8 MiB max upload boundary',
          'Storage in MongoDB with fileData excluded from list queries',
          'Page-by-page text extraction retaining accurate page numbers',
          'Ingestion state machine: queued/processing -> ready -> failed with safe retry',
          'Sequential Gemini embedding batches without orphaned chunks on delete'
        ]}
      />
    </div>
  );
}
