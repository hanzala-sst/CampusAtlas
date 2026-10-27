import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Sparkles,
  BookOpen,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Search,
  Layers,
  ChevronRight,
  Filter,
  Info,
} from 'lucide-react';

export default function AskDocPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialResourceId = searchParams.get('resourceId') || '';

  // Form State
  const [question, setQuestion] = useState('');
  const [scopeMode, setScopeMode] = useState(initialResourceId ? 'resource' : 'library');
  const [selectedResourceId, setSelectedResourceId] = useState(initialResourceId);
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [resourceType, setResourceType] = useState('');

  // Resources list for dropdown
  const [availableResources, setAvailableResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Load ready resources for selector
  useEffect(() => {
    let isMounted = true;
    async function loadDocs() {
      try {
        setLoadingResources(true);
        const data = await api.resources.list({ limit: 100 });
        if (isMounted && data?.success && Array.isArray(data.resources)) {
          // Filter to ready resources only
          const readyDocs = data.resources.filter(
            (r) => r.ingestionStatus === 'ready' && r.verificationStatus !== 'archived'
          );
          setAvailableResources(readyDocs);

          if (initialResourceId && readyDocs.some((r) => r._id === initialResourceId)) {
            setSelectedResourceId(initialResourceId);
            setScopeMode('resource');
          }
        }
      } catch (err) {
        console.warn('Could not load resource options:', err.message);
      } finally {
        if (isMounted) setLoadingResources(false);
      }
    }
    loadDocs();
    return () => {
      isMounted = false;
    };
  }, [initialResourceId]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim() || question.trim().length < 2 || loading) return;

    if (!user) {
      setError('Please sign in to your CampusAtlas account to ask questions.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload = {
        question: question.trim(),
      };

      if (scopeMode === 'resource' && selectedResourceId) {
        payload.resourceId = selectedResourceId;
      } else if (scopeMode === 'course') {
        if (courseCode.trim()) payload.courseCode = courseCode.trim();
        if (semester) payload.semester = semester;
        if (resourceType) payload.resourceType = resourceType;
      }

      const res = await api.ask.query(payload);
      if (res?.success) {
        setResult(res);
      } else {
        setError(res?.error?.message || 'Failed to generate answer.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while contacting the AI service.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDocObj = availableResources.find((r) => r._id === selectedResourceId);

  // Function to highlight inline citations [S1], [S2] in the answer
  const renderFormattedAnswer = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[S\d+\])/g);
    return parts.map((part, index) => {
      if (/^\[S\d+\]$/.test(part)) {
        const sourceNum = part.slice(1, -1);
        return (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-bold bg-brand-100 text-brand-800 border border-brand-300 shadow-2xs select-none"
            title={`Source passage ${sourceNum}`}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Evidence-Grounded RAG (F4)
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Ask the Doc
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Ask questions strictly grounded in indexed course materials. Answers cite exact document titles, page numbers, and direct excerpts.
        </p>
      </div>

      {/* Unauthenticated notice */}
      {!user && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Sign in required:</span> You must be logged into CampusAtlas to query indexed course documents.
            <div className="mt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition"
              >
                Sign In to Ask
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Scope Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Search Scope
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setScopeMode('library')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              scopeMode === 'library'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Eligible Library Documents
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('resource')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              scopeMode === 'resource'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Specific Document
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('course')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              scopeMode === 'course'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Filter by Course / Semester
          </button>
        </div>

        {/* Scope Mode Details */}
        {scopeMode === 'resource' && (
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Document
            </label>
            {loadingResources ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                Loading indexed documents...
              </div>
            ) : availableResources.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">
                No indexed PDF documents found yet. Upload a document from the{' '}
                <Link to="/upload" className="text-brand-600 font-semibold underline">
                  Upload page
                </Link>
                .
              </div>
            ) : (
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="">-- Choose a document --</option>
                {availableResources.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.title} ({doc.courseCode} · {doc.pageCount || '?'} pages)
                  </option>
                ))}
              </select>
            )}
            {selectedDocObj && (
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Ready for RAG: <span className="font-semibold text-slate-700">{selectedDocObj.title}</span> ({selectedDocObj.pageCount} pages)
              </div>
            )}
          </div>
        )}

        {scopeMode === 'course' && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Course Code
              </label>
              <input
                type="text"
                placeholder="e.g. CS201"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                className="w-full text-sm rounded-xl border border-slate-300 p-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 p-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resource Type
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 p-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="">All Types</option>
                <option value="notes">Notes</option>
                <option value="pyq">Past Year Questions</option>
                <option value="syllabus">Syllabus</option>
                <option value="solution">Solutions</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-8">
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Your Question
        </label>
        <div className="relative">
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading || !user}
            maxLength={1200}
            placeholder={
              !user
                ? 'Please sign in to ask questions...'
                : scopeMode === 'resource' && selectedDocObj
                ? `Ask anything about "${selectedDocObj.title}"...`
                : 'Ask a question grounded in your course materials (e.g. "What is time complexity of quicksort?")...'
            }
            className="w-full text-sm text-slate-900 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:bg-slate-50 disabled:cursor-not-allowed resize-none"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {question.length} / 1200 characters
          </div>
          <button
            type="submit"
            disabled={loading || !user || question.trim().length < 2}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching & Reasoning...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ask AI</span>
              </>
            )}
          </button>
        </div>

        {/* Prompt suggestion chips */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick prompts:</span>
          {[
            'Explain the key concept in simple terms',
            'What are the core definitions and formulas?',
            'List the step-by-step procedure described',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={loading || !user}
              onClick={() => setQuestion(prompt)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 transition disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="mb-8 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Unable to process question</p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-brand-200 rounded-full" />
            <div className="h-4 w-48 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2.5">
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
            <div className="h-4 bg-slate-200 rounded w-4/6" />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Answer Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            {/* Metadata & Retrieval Mode Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Grounded Response
                </span>
              </div>

              {/* Honest Retrieval Mode Badge */}
              {result.retrievalMode === 'semantic' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Semantic Vector Retrieval
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Keyword Fallback Mode
                </div>
              )}
            </div>

            {/* Keyword Fallback Notification if applicable */}
            {result.retrievalMode === 'keyword_fallback' && (
              <div className="mb-4 rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Notice:</span> {result.fallbackNotice || 'This answer was synthesized using deterministic keyword matching rather than semantic embeddings.'}
                </div>
              </div>
            )}

            {/* Abstention State or Grounded Answer */}
            {result.abstained ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Evidence Insufficient to Answer
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                      {result.answer}
                    </p>
                    <div className="mt-3 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Suggestions:</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>Broaden the search scope to the entire library</li>
                        <li>Rephrase your question with different academic keywords</li>
                        <li>Upload more lecture slides or textbook excerpts covering this topic</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
                <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedAnswer(result.answer)}
                </p>
              </div>
            )}
          </div>

          {/* Source Provenance Cards */}
          {result.sources && result.sources.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Verified Document Sources ({result.sources.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.sources.map((source, index) => (
                  <div
                    key={source.sourceId || index}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-brand-200 hover:bg-white transition"
                  >
                    <div>
                      {/* Source ID & Page Number */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-brand-100 text-brand-800 border border-brand-200">
                          {source.sourceId}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            Page {source.pageNumber}
                          </span>
                          {source.courseCode && (
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md uppercase">
                              {source.courseCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Resource Title */}
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-2">
                        {source.title}
                      </h4>

                      {/* Direct Verbatim Excerpt */}
                      <blockquote className="text-xs text-slate-600 italic border-l-2 border-brand-400 pl-2.5 my-2 line-clamp-4 leading-relaxed">
                        "{source.excerpt}"
                      </blockquote>
                    </div>

                    {/* Working Link to Resource Detail / Preview */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-2xs text-slate-400">
                        {source.score ? `Similarity: ${Math.round(source.score * 100)}%` : 'Persisted Chunk'}
                      </span>
                      <Link
                        to={`/resources/${source.resourceId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
