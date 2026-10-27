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
  ChevronRight
} from 'lucide-react';

export default function LibraryPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [semester, setSemester] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        search: activeSearch,
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
    } catch (err) {
      setError(err.message || 'Failed to retrieve academic resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [activeSearch, resourceType, semester, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchTerm);
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
                placeholder="Search by course code, title, subject, or professor..."
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
                onClick={() => {
                  setSearchTerm('');
                  setActiveSearch('');
                }}
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
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
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
          </div>
        </div>
      </div>

      {/* Main Listing Section */}
      {loading ? (
        <div className="py-12">
          <LoadingState message="Loading course documents from repository..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState
            title="Failed to Load Library"
            message={error}
            onRetry={fetchResources}
          />
        </div>
      ) : resources.length === 0 ? (
        <div className="py-8">
          <EmptyState
            icon={FileQuestion}
            title={activeSearch || resourceType || semester ? 'No matching resources' : 'No documents indexed yet'}
            message={
              activeSearch || resourceType || semester
                ? 'Try broadening your search term or clearing active filters.'
                : 'Be the first student or faculty member to contribute course material to CampusAtlas.'
            }
            actionLabel={activeSearch || resourceType || semester ? 'Clear Filters' : 'Upload First Document'}
            onAction={() => {
              if (activeSearch || resourceType || semester) {
                setSearchTerm('');
                setActiveSearch('');
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
          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
            <span>
              Showing {resources.length} of {pagination.total} documents
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((res) => (
              <ResourceCard
                key={res._id}
                resource={res}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>

          {/* Pagination Controls */}
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
      )}
    </div>
  );
}
