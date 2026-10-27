import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import ResourceCard from '../components/ResourceCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Upload, 
  Sparkles, 
  Layers, 
  ArrowUpDown,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  ExternalLink,
  Tag
} from 'lucide-react';

export default function LibraryPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [courseCodeFilter, setCourseCodeFilter] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [semester, setSemester] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  // Semantic search results state
  const [searchResults, setSearchResults] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeSearch) {
        // Execute Semantic / Keyword Search endpoint
        const data = await api.search({
          q: activeSearch,
          courseCode: courseCodeFilter,
          resourceType,
          semester,
          limit: 12,
        });

        if (data?.success) {
          setSearchResults(data.results || []);
          setSearchMeta({
            mode: data.mode,
            fallbackNotice: data.fallbackNotice,
            totalMatches: data.totalMatches,
            model: data.embeddingModel,
            dimensions: data.embeddingDimensions,
          });
        }
      } else {
        // Standard Resource Catalog listing
        setSearchResults(null);
        setSearchMeta(null);

        const params = {
          courseCode: courseCodeFilter,
          resourceType,
          semester,
          sortBy,
          page,
          limit: 9,
        };

        const data = await api.resources.list(params);
        if (data?.success) {
          setResources(data.resources || []);
          setPagination(data.pagination || { totalPages: 1, total: 0 });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve academic resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [activeSearch, courseCodeFilter, resourceType, semester, sortBy, page]);

  // Live status polling: refresh catalog list while at least one displayed resource is queued or processing
  useEffect(() => {
    const hasPendingIngestions =
      !activeSearch &&
      resources.some((r) => ['queued', 'processing'].includes(r.ingestionStatus));

    if (!hasPendingIngestions) return;

    let isMounted = true;
    let isFetching = false;

    const intervalId = setInterval(async () => {
      if (document.hidden || isFetching || !isMounted) return;

      isFetching = true;
      try {
        const params = {
          courseCode: courseCodeFilter,
          resourceType,
          semester,
          sortBy,
          page,
          limit: 9,
        };

        const data = await api.resources.list(params);
        if (isMounted && data?.success && Array.isArray(data.resources)) {
          setResources(data.resources);
          if (data.pagination) {
            setPagination(data.pagination);
          }
        }
      } catch (err) {
        console.warn('[LibraryPage] Live status polling notice:', err.message);
      } finally {
        isFetching = false;
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeSearch, courseCodeFilter, resourceType, semester, sortBy, page, resources]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchTerm.trim());
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearch('');
    setSearchResults(null);
    setSearchMeta(null);
  };

  const handleVoteChange = (resourceId, newScore, newUserVote) => {
    setResources((prev) =>
      prev.map((r) =>
        r._id === resourceId ? { ...r, voteScore: newScore, userVote: newUserVote } : r
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="border-b border-slate-200 pb-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              Academic Knowledge Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Resource Library
            </h1>
            <p className="mt-1.5 text-base text-slate-600 max-w-2xl">
              Course-specific lecture notes, previous-year question papers (PYQs), lab manuals, and assignments with verified academic provenance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Link>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-8 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by topic, syllabus concept, or keyword (e.g., Dijkstra algorithm, BST, Thermodynamics)..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
            >
              Search
            </button>
            {activeSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Clear
              </button>
            )}
          </form>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filters:
              </span>

              {/* Course Code Filter */}
              <input
                type="text"
                value={courseCodeFilter}
                onChange={(e) => {
                  setCourseCodeFilter(e.target.value.toUpperCase());
                  setPage(1);
                }}
                placeholder="Course (e.g. CS201)"
                className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-brand-500 uppercase font-mono"
              />

              {/* Resource Type */}
              <select
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-brand-500"
              >
                <option value="">All Types</option>
                <option value="lecture-notes">Lecture Notes</option>
                <option value="pyq">PYQ (Question Papers)</option>
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="reference">Reference Material</option>
              </select>

              {/* Semester */}
              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-brand-500"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown (Visible during Catalog mode) */}
            {!activeSearch && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort by:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-brand-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="top">Top Rated (Community Score)</option>
                  <option value="title">Alphabetical (Title)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-12">
          <LoadingState message={activeSearch ? 'Searching vector space using Gemini embeddings...' : 'Loading course documents from repository...'} />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState
            title="Failed to Load Library"
            message={error}
            onRetry={fetchResources}
          />
        </div>
      ) : activeSearch ? (
        /* SEMANTIC SEARCH RESULTS VIEW */
        <div className="space-y-6">
          {/* Search Mode Status Indicator */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {searchMeta?.mode === 'semantic' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Semantic Vector Search ({searchMeta.model || 'gemini-embedding-001'} • {searchMeta.dimensions || 768}-dim)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Keyword Fallback Mode
                </span>
              )}
              <span className="text-xs text-slate-500">
                Found {searchResults?.length || 0} matching document excerpts for <strong className="text-slate-800">"{activeSearch}"</strong>
              </span>
            </div>

            <button
              onClick={handleClearSearch}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
            >
              Return to All Documents
            </button>
          </div>

          {searchMeta?.fallbackNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{searchMeta.fallbackNotice}</span>
            </div>
          )}

          {(!searchResults || searchResults.length === 0) ? (
            <EmptyState
              icon={FileQuestion}
              title="No relevant excerpts found"
              message={`No indexed document text matched "${activeSearch}". Try rephrasing your search query or clear filters.`}
              actionLabel="Clear Search"
              onAction={handleClearSearch}
            />
          ) : (
            <div className="space-y-4">
              {searchResults.map((match) => (
                <div
                  key={match.chunkId}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 uppercase font-mono">
                        {match.resource?.courseCode}
                      </span>
                      <Link
                        to={`/resources/${match.resourceId}`}
                        className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors"
                      >
                        {match.resource?.title}
                      </Link>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        Page {match.pageNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {match.score < 1.0 && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                          Similarity: {(match.score * 100).toFixed(0)}%
                        </span>
                      )}
                      <Link
                        to={`/resources/${match.resourceId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Document
                      </Link>
                    </div>
                  </div>

                  {/* Excerpt box */}
                  <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 font-sans text-xs text-slate-700 leading-relaxed italic">
                    "{match.excerpt}"
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{match.resource?.courseName}</span>
                    <span>•</span>
                    <span>Semester {match.resource?.semester}</span>
                    <span>•</span>
                    <span className="capitalize">{match.resource?.resourceType?.replace('-', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD CATALOG VIEW */
        resources.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={FileQuestion}
              title={courseCodeFilter || resourceType || semester ? 'No matching resources' : 'No documents indexed yet'}
              message={
                courseCodeFilter || resourceType || semester
                  ? 'Try clearing active filters.'
                  : 'Be the first student or faculty member to contribute course material to CampusAtlas.'
              }
              actionLabel={courseCodeFilter || resourceType || semester ? 'Clear Filters' : 'Upload First Document'}
              onAction={() => {
                if (courseCodeFilter || resourceType || semester) {
                  setCourseCodeFilter('');
                  setResourceType('');
                  setSemester('');
                } else {
                  window.location.href = '/upload';
                }
              }}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>
                Showing {resources.length} of {pagination.total} documents
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.map((res) => (
                <ResourceCard
                  key={res._id}
                  resource={res}
                  onVoteChange={handleVoteChange}
                />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="text-xs font-medium text-slate-600">
                  Page {page} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
