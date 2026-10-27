import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {
  FileText,
  Download,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ShieldCheck,
  Shield,
  Clock,
  AlertTriangle,
  Award,
  Trash2,
  Edit,
  ArrowLeft,
  Send,
  Flag,
  CheckCircle2,
  X,
  ExternalLink,
  Loader2,
  RotateCw,
} from 'lucide-react';

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Voting state
  const [voteScore, setVoteScore] = useState(0);
  const [userVote, setUserVote] = useState(0);
  const [voting, setVoting] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('incorrect_course');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportError, setReportError] = useState(null);

  // Edit metadata modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    courseCode: '',
    courseName: '',
    subject: '',
    semester: 1,
    academicYear: '',
    resourceType: 'lecture-notes',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchResource = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.resources.get(id);
      if (data?.success && data?.resource) {
        setResource(data.resource);
        setVoteScore(data.resource.voteScore || 0);
        setUserVote(data.resource.userVote || 0);
        setEditForm({
          title: data.resource.title,
          description: data.resource.description || '',
          courseCode: data.resource.courseCode,
          courseName: data.resource.courseName,
          subject: data.resource.subject,
          semester: data.resource.semester,
          academicYear: data.resource.academicYear,
          resourceType: data.resource.resourceType,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load resource details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await api.resources.getComments(id);
      if (data?.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  useEffect(() => {
    fetchResource();
    fetchComments();
  }, [id]);

  const handleVote = async (value) => {
    if (!user) {
      navigate('/auth', { state: { from: `/resources/${id}` } });
      return;
    }

    if (voting) return;
    setVoting(true);

    const targetValue = userVote === value ? 0 : value;

    try {
      const data = await api.resources.vote(id, targetValue);
      if (data?.success) {
        setUserVote(data.userVote);
        setVoteScore(data.voteScore);
      }
    } catch (err) {
      console.error('Failed to cast vote:', err);
    } finally {
      setVoting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth', { state: { from: `/resources/${id}` } });
      return;
    }

    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);

    try {
      const data = await api.resources.addComment(id, newComment.trim());
      if (data?.success && data?.comment) {
        setComments([data.comment, ...comments]);
        setNewComment('');
        if (resource) {
          setResource({ ...resource, commentCount: (resource.commentCount || 0) + 1 });
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.resources.deleteComment(id, commentId);
      setComments(comments.filter((c) => c._id !== commentId));
      if (resource) {
        setResource({
          ...resource,
          commentCount: Math.max(0, (resource.commentCount || 1) - 1),
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to delete comment');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    setReportError(null);
    setReportSuccess(null);

    try {
      const data = await api.resources.report(id, {
        reason: reportReason,
        details: reportDetails,
      });
      if (data?.success) {
        setReportSuccess(data.message);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(null);
          setReportDetails('');
        }, 2000);
      }
    } catch (err) {
      setReportError(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);

    try {
      const data = await api.resources.update(id, editForm);
      if (data?.success && data?.resource) {
        setResource({ ...resource, ...data.resource });
        setEditModalOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to update resource metadata');
    } finally {
      setSavingEdit(false);
    }
  };

  const [retryingIngestion, setRetryingIngestion] = useState(false);

  const handleRetryIngestion = async () => {
    try {
      setRetryingIngestion(true);
      const data = await api.resources.retry(id);
      if (data?.success) {
        setResource({ ...resource, ingestionStatus: 'queued', ingestionError: null });
        setTimeout(() => fetchResource(), 2500);
      }
    } catch (err) {
      alert(err.message || 'Failed to retry ingestion');
    } finally {
      setRetryingIngestion(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this resource? This will remove all associated comments and votes.')) {
      return;
    }

    try {
      await api.resources.delete(id);
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.message || 'Failed to delete resource');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <LoadingState message="Retrieving document details and academic provenance..." />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <ErrorState
          title="Document Not Found"
          message={error || 'Unable to load the requested academic resource.'}
          onRetry={fetchResource}
        />
      </div>
    );
  }

  const isOwner = user && resource.uploadedBy?._id === user._id;
  const canManage = isOwner || isModerator;

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const previewUrl = api.resources.getPreviewUrl(id);
  const downloadUrl = api.resources.getDownloadUrl(id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/60 uppercase tracking-wide">
                {resource.courseCode}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                {resource.resourceType.replace('-', ' ')}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Semester {resource.semester} • {resource.academicYear}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {resource.title}
            </h1>

            <p className="mt-1.5 text-sm font-medium text-slate-600">
              {resource.courseName} — {resource.subject}
            </p>

            {resource.description && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {resource.description}
              </p>
            )}

            {/* Owner / Moderator Action Bar */}
            {canManage && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Management Controls
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Metadata
                  </button>
                  <button
                    onClick={handleDeleteResource}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Resource
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PDF Preview Player */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                <span className="text-sm font-bold text-slate-800 truncate max-w-sm">
                  {resource.fileName}
                </span>
                <span className="text-xs text-slate-400">
                  ({formatFileSize(resource.fileSize)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={downloadUrl}
                  download={resource.fileName}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            </div>

            {/* Embedded PDF iframe */}
            <div className="w-full bg-slate-900 min-h-[550px] relative">
              <iframe
                src={previewUrl}
                title="Document Preview"
                className="w-full h-[600px] border-0"
              />
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-600" />
              Community Discussion ({comments.length})
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="relative">
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    user
                      ? 'Share your notes, clarify a question, or point out corrections...'
                      : 'Sign in to join the academic discussion...'
                  }
                  disabled={!user || submittingComment}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!user || submittingComment || !newComment.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post Comment
                  </button>
                </div>
              </div>
            </form>

            {/* Comment List */}
            {comments.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 italic">
                No discussion yet. Be the first to comment on this course material.
              </p>
            ) : (
              <div className="space-y-3.5">
                {comments.map((comment) => {
                  const isCommentOwner = user && comment.userId?._id === user._id;
                  const canDeleteComment = isCommentOwner || isModerator;

                  return (
                    <div
                      key={comment._id}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-800">
                            {comment.userId?.name || 'Academic Contributor'}
                          </span>
                          {comment.userId?.role === 'moderator' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                              Moderator
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {comment.body}
                        </p>
                      </div>

                      {canDeleteComment && (
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Provenance & Verification Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Provenance & Verification
            </h4>

            {resource.verificationStatus === 'verified' ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Moderator Verified</span>
                </div>
                <p className="mt-1.5 text-xs text-emerald-700 leading-relaxed">
                  This document has been reviewed and verified by an authorized academic moderator for correctness and syllabus alignment.
                </p>
                {resource.verificationNote && (
                  <p className="mt-2 text-[11px] text-emerald-900 font-medium italic">
                    "{resource.verificationNote}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Shield className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>Unverified (Community Default)</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Under CampusAtlas trust principles, community popularity is not proof of correctness. This document is peer-contributed and pending authoritative review.
                </p>
              </div>
            )}

            {/* Voting Bar */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600 block mb-2">
                Helpfulness Evaluation
              </span>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(1)}
                    disabled={voting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      userVote === 1
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:text-emerald-700'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Upvote
                  </button>

                  <button
                    onClick={() => handleVote(-1)}
                    disabled={voting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      userVote === -1
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:text-red-700'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Downvote
                  </button>
                </div>

                <div className="text-right pr-2">
                  <span className={`text-base font-extrabold ${
                    voteScore > 0 ? 'text-emerald-700' : voteScore < 0 ? 'text-red-600' : 'text-slate-800'
                  }`}>
                    {voteScore > 0 ? `+${voteScore}` : voteScore}
                  </span>
                  <p className="text-[10px] text-slate-400">Community Score</p>
                </div>
              </div>
            </div>

            {/* Report Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  if (!user) {
                    navigate('/auth', { state: { from: `/resources/${id}` } });
                    return;
                  }
                  setReportModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Inaccurate / Violating Content
              </button>
            </div>
          </div>

          {/* Uploader & Contributor Reputation Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Contributor Profile
            </h4>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-xs">
                {resource.uploadedBy?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {resource.uploadedBy?.name || 'Anonymous Contributor'}
                </p>
                <span className="text-[11px] font-semibold text-slate-500 capitalize">
                  {resource.uploadedBy?.role || 'student'}
                </span>
              </div>
            </div>

            {resource.uploaderReputation && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                  <div className="flex items-center justify-center gap-1 text-purple-700 font-bold text-sm">
                    <Award className="w-4 h-4" />
                    {resource.uploaderReputation.score}
                  </div>
                  <p className="text-[10px] text-purple-900 font-medium">Reputation</p>
                </div>

                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    {resource.uploaderReputation.verifiedUploads}
                  </div>
                  <p className="text-[10px] text-emerald-900 font-medium">Verified Docs</p>
                </div>
              </div>
            )}
          </div>

          {/* Real Ingestion Pipeline Status Card */}
          <div className={`rounded-2xl p-5 border ${
            resource.ingestionStatus === 'ready'
              ? 'bg-emerald-50/70 border-emerald-200'
              : resource.ingestionStatus === 'processing'
              ? 'bg-blue-50/70 border-blue-200'
              : resource.ingestionStatus === 'failed'
              ? 'bg-red-50/70 border-red-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {resource.ingestionStatus === 'ready' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : resource.ingestionStatus === 'processing' ? (
                <Loader2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              ) : resource.ingestionStatus === 'failed' ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    resource.ingestionStatus === 'ready'
                      ? 'text-emerald-900'
                      : resource.ingestionStatus === 'processing'
                      ? 'text-blue-900'
                      : resource.ingestionStatus === 'failed'
                      ? 'text-red-900'
                      : 'text-amber-900'
                  }`}>
                    Ingestion: {resource.ingestionStatus}
                  </span>

                  {resource.pageCount > 0 && (
                    <span className="text-[11px] font-semibold text-slate-600">
                      {resource.pageCount} {resource.pageCount === 1 ? 'page' : 'pages'}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {resource.ingestionStatus === 'ready' ? (
                    <>
                      Document text extracted across {resource.pageCount || 1} pages and indexed into {resource.chunkCount || 'all'} semantic chunks using 768-dimensional Gemini embeddings.
                    </>
                  ) : resource.ingestionStatus === 'processing' ? (
                    'Background worker is currently extracting text page-by-page and generating vector embeddings...'
                  ) : resource.ingestionStatus === 'failed' ? (
                    <>
                      Extraction failed: {resource.ingestionError || 'Unsupported PDF structure or missing text layer.'}
                    </>
                  ) : (
                    'Document file bytes are preserved in database storage and queued for background indexing.'
                  )}
                </p>

                {resource.ingestionStatus === 'failed' && canManage && (
                  <div className="mt-3">
                    <button
                      onClick={handleRetryIngestion}
                      disabled={retryingIngestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${retryingIngestion ? 'animate-spin' : ''}`} />
                      {retryingIngestion ? 'Retrying Ingestion...' : 'Retry Ingestion'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-600" />
                Report Academic Document
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reportSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                {reportError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {reportError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  >
                    <option value="incorrect_course">Incorrect Course / Subject Mismatch</option>
                    <option value="poor_quality">Illegible / Poor Scan Quality</option>
                    <option value="misleading_content">Misleading or Fraudulent Content</option>
                    <option value="copyright_issue">Copyright / Take-down Request</option>
                    <option value="spam_or_abuse">Spam, Promotional, or Inappropriate</option>
                    <option value="other">Other Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide specific details to assist moderator review..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs disabled:opacity-50"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Edit Resource Metadata
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Code & Name
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={editForm.courseCode}
                    onChange={(e) => setEditForm({ ...editForm, courseCode: e.target.value.toUpperCase() })}
                    placeholder="CS201"
                    className="col-span-1 p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={editForm.courseName}
                    onChange={(e) => setEditForm({ ...editForm, courseName: e.target.value })}
                    placeholder="Data Structures"
                    className="col-span-2 p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject & Academic Year
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    placeholder="Computer Science"
                    className="p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={editForm.academicYear}
                    onChange={(e) => setEditForm({ ...editForm, academicYear: e.target.value })}
                    placeholder="2024-2025"
                    className="p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester & Resource Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editForm.semester}
                    onChange={(e) => setEditForm({ ...editForm, semester: parseInt(e.target.value, 10) })}
                    className="p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editForm.resourceType}
                    onChange={(e) => setEditForm({ ...editForm, resourceType: e.target.value })}
                    className="p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  >
                    <option value="lecture-notes">Lecture Notes</option>
                    <option value="pyq">PYQ (Question Paper)</option>
                    <option value="lab-manual">Lab Manual</option>
                    <option value="assignment">Assignment</option>
                    <option value="reference">Reference Material</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
