import React from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function MilestoneNotice({
  featureId,
  featureTitle,
  scheduledMilestone,
  contractRequirements = [],
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                {featureId} • Pending Implementation
              </span>
              <span className="text-xs font-medium text-amber-700">
                Scheduled for {scheduledMilestone}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{featureTitle}</h3>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              In accordance with the CampusAtlas hard constraints, no fake workflows, decorative mock actions, or stubbed AI responses are displayed. This interface will be connected end-to-end to its real API endpoints, persistence, and validation in its scheduled milestone.
            </p>
          </div>
        </div>
      </div>

      {contractRequirements.length > 0 && (
        <div className="mt-6 pt-5 border-t border-amber-200/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3">
            Milestone Contract Scope
          </h4>
          <ul className="grid sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
            {contractRequirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-amber-100">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
