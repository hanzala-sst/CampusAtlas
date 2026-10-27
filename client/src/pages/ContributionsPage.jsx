import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {
  UserCheck,
  Award,
  ThumbsUp,
  FileText,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Lock,
  PlusCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function ContributionsPage() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.users.getContributions();
      if (data?.success) {
        setContributions(data.contributions || []);
        setReputation(data.reputation || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your contributions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContributions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      await api.resources.delete(resourceId);
      setContributions(contributions.filter((c) => c._id !== resourceId));
      fetchContributions();
    } catch (err) {
      alert(err.message || 'Failed to delete resource');
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign In to View Contributions</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          Manage your uploaded academic documents, track community upvotes, and review your calculated reputation.
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            state={{ from: '/contributions' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
            <UserCheck className="w-3.5 h-3.5" />
            Academic Profile
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Contributions & Reputation
          </h1>
          <p className="mt-1 text-base text-slate-600">
            Manage your peer-contributed study materials and inspect your computed academic reputation.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Contribute New Document
        </Link>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingState message="Calculating academic reputation and loading uploads..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState
            title="Failed to Load Contributions"
            message={error}
            onRetry={fetchContributions}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Reputation Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Reputation Score</p>
                  <p className="text-2xl font-black text-slate-900">
                    {reputation?.score ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Uploads</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {reputation?.totalUploads ?? contributions.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Verified Uploads</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {reputation?.verifiedUploads ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Net Helpful Votes</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {reputation?.netVotes ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reputation Formula Explanation Banner */}
          <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              <strong className="font-semibold text-slate-800">CampusAtlas Trust Standard:</strong> Reputation is computed dynamically from persisted events (+2 per helpful vote received, +10 per moderator-verified upload, -1 per downvote, -5 per upheld infraction). Raw upload volume alone yields zero points to prevent gaming and reward genuine academic quality.
            </p>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Uploaded Course Materials ({contributions.length})
              </h3>
            </div>

            {contributions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No uploaded documents yet"
                  message="Contribute lecture notes or previous-year questions to start earning academic reputation."
                  actionLabel="Upload First PDF"
                  onAction={() => window.location.href = '/upload'}
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contributions.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 uppercase">
                          {doc.courseCode}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {doc.title}
                        </span>
                        {doc.verificationStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Unverified
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">
                        {doc.courseName} • Sem {doc.semester} • {doc.resourceType} • Uploaded on{' '}
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right pr-2">
                        <span className="text-xs font-bold text-slate-700">
                          {doc.voteScore || 0} score
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {doc.upvoteCount || 0} up / {doc.downvoteCount || 0} down
                        </p>
                      </div>

                      <Link
                        to={`/resources/${doc._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </Link>

                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete resource"
                      >
                        <Trash2 className="w-4 h-4" />
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
