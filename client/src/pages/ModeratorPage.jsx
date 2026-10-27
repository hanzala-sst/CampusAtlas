import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  Flag,
  FileText,
  ExternalLink,
  Archive,
  CheckCircle2,
  XCircle,
  Lock,
  Clock,
  Layers
} from 'lucide-react';

export default function ModeratorPage() {
  const { user, isModerator } = useAuth();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.moderator.getQueue();
      if (data?.success) {
        setQueueData(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load moderator review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModerator) {
      fetchQueue();
    } else {
      setLoading(false);
    }
  }, [isModerator]);

  const handleVerify = async (resourceId) => {
    const note = prompt('Optional verification note / academic citation:', 'Verified for syllabus accuracy');
    if (note === null) return;

    try {
      setActionInProgress(true);
      await api.moderator.verify(resourceId, note);
      fetchQueue();
    } catch (err) {
      alert(err.message || 'Failed to verify resource');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleArchive = async (resourceId) => {
    if (!window.confirm('Are you sure you want to archive this resource and remove it from public view?')) return;
    const note = prompt('Reason for archiving:', 'Violates quality / provenance standards');
    if (note === null) return;

    try {
      setActionInProgress(true);
      await api.moderator.archive(resourceId, note);
      fetchQueue();
    } catch (err) {
      alert(err.message || 'Failed to archive resource');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResolveReport = async (reportId, status) => {
    const notes = prompt(`Resolution notes for marking report ${status}:`, `Report ${status} by moderator`);
    if (notes === null) return;

    try {
      setActionInProgress(true);
      await api.moderator.resolveReport(reportId, { status, resolutionNotes: notes });
      fetchQueue();
    } catch (err) {
      alert(err.message || `Failed to update report to ${status}`);
    } finally {
      setActionInProgress(false);
    }
  };

  if (!user || !isModerator) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Moderator Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          The Moderator Review Queue is strictly restricted to authorized institution staff and academic review board members. In accordance with CampusAtlas security standards, role assignment is server-controlled via <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800">ADMIN_EMAILS</code>.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Return to Library
          </Link>
          {!user && (
            <Link
              to="/auth"
              state={{ from: '/moderator' }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Sign In with Admin Account
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Academic Governance
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Moderator Review Queue
          </h1>
          <p className="mt-1 text-base text-slate-600">
            Audit peer-contributed materials, grant authoritative "Verified" status, and resolve community dispute reports.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingState message="Fetching active reports and review queues..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState
            title="Failed to Load Moderator Queue"
            message={error}
            onRetry={fetchQueue}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Queue Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Open Community Reports</p>
                <p className="text-2xl font-bold text-slate-900">
                  {queueData?.stats?.openReports ?? 0}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Unverified Documents</p>
                <p className="text-2xl font-bold text-slate-900">
                  {queueData?.stats?.unverifiedResources ?? 0}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Verified Resources</p>
                <p className="text-2xl font-bold text-slate-900">
                  {queueData?.stats?.verifiedResources ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Open Reports */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-600" />
                Open Community Reports ({queueData?.reports?.length || 0})
              </h3>
            </div>

            {(!queueData?.reports || queueData.reports.length === 0) ? (
              <p className="text-center py-8 text-xs text-slate-400 italic">
                No open community reports pending review. Platform integrity is clear.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {queueData.reports.map((report) => (
                  <div key={report._id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {report.reason.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          Reported by <strong className="text-slate-700">{report.reporterId?.name || 'User'}</strong> ({report.reporterId?.email})
                        </span>
                      </div>

                      <p className="text-sm font-bold text-slate-900">
                        Target Document: {report.resourceId?.title || 'Unknown Document'}
                      </p>
                      {report.details && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          Report Details: "{report.details}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {report.resourceId?._id && (
                        <Link
                          to={`/resources/${report.resourceId._id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Inspect Doc
                        </Link>
                      )}

                      <button
                        onClick={() => handleResolveReport(report._id, 'resolved')}
                        disabled={actionInProgress}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve (Upheld)
                      </button>

                      <button
                        onClick={() => handleResolveReport(report._id, 'dismissed')}
                        disabled={actionInProgress}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Unverified Resources Pending Review */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Unverified Resources Pending Verification Review ({queueData?.pendingResources?.length || 0})
              </h3>
            </div>

            {(!queueData?.pendingResources || queueData.pendingResources.length === 0) ? (
              <p className="text-center py-8 text-xs text-slate-400 italic">
                All uploaded documents have been verified or resolved.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {queueData.pendingResources.map((res) => (
                  <div key={res._id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 uppercase">
                          {res.courseCode}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {res.title}
                        </h4>
                        <span className="text-xs text-slate-400">
                          (Sem {res.semester} • {res.resourceType})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Uploaded by <strong className="text-slate-700">{res.uploadedBy?.name || 'Contributor'}</strong> on {new Date(res.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/resources/${res._id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview
                      </Link>

                      <button
                        onClick={() => handleVerify(res._id)}
                        disabled={actionInProgress}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verify
                      </button>

                      <button
                        onClick={() => handleArchive(res._id)}
                        disabled={actionInProgress}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 flex items-center gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
