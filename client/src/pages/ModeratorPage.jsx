import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle, Flag } from 'lucide-react';
import MilestoneNotice from '../components/MilestoneNotice';

export default function ModeratorPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Academic Governance
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Moderator Review Queue
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Review community-reported documents, grant the authoritative "Verified" badge, resolve disputes, and maintain platform integrity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Reports</p>
            <p className="text-xl font-bold text-slate-900">—</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Verified Resources</p>
            <p className="text-xl font-bold text-slate-900">—</p>
          </div>
        </div>
      </div>

      <MilestoneNotice
        featureId="F5"
        featureTitle="Moderator Queue & Trust Verification"
        scheduledMilestone="Milestone 2 (Core Product)"
        contractRequirements={[
          'Server-enforced moderator authorization check (no self-selection of role)',
          'Queue of open user reports with reported reason and document link',
          'Granting "Verified" status (authoritative mark of correctness)',
          'Resolving or dismissing reports with audit history',
          'Archiving or removing fraudulent / inappropriate uploads'
        ]}
      />
    </div>
  );
}
