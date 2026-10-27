import React from 'react';
import { UserCheck, Award, ThumbsUp, FileText } from 'lucide-react';
import MilestoneNotice from '../components/MilestoneNotice';

export default function ContributionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
          <UserCheck className="w-3.5 h-3.5" />
          Academic Community
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          My Contributions & Reputation
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Review uploaded notes, manage your documents, track community upvotes, and monitor computed academic reputation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Uploads</p>
              <p className="text-xl font-bold text-slate-900">—</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Helpful Votes</p>
              <p className="text-xl font-bold text-slate-900">—</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Reputation Score</p>
              <p className="text-xl font-bold text-slate-900">—</p>
            </div>
          </div>
        </div>
      </div>

      <MilestoneNotice
        featureId="F1 / F5"
        featureTitle="Identity, Resource Management & Reputation"
        scheduledMilestone="Milestone 2 (Core Product)"
        contractRequirements={[
          'User registration, login, logout, and HttpOnly session validation',
          'List personal uploads with status, edit metadata, and delete options',
          'Computed reputation dynamically calculated from verified uploads & community votes',
          'Reputation rules prevent rewarding raw upload volume alone'
        ]}
      />
    </div>
  );
}
