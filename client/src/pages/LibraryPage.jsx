import React, { useState } from 'react';
import { BookOpen, Search, Filter, Sparkles, Layers } from 'lucide-react';
import MilestoneNotice from '../components/MilestoneNotice';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero / Header Section */}
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              Academic Knowledge Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Resource Library
            </h1>
            <p className="mt-2 text-base text-slate-600 max-w-2xl">
              Course-specific lecture notes, previous-year question papers (PYQs), lab manuals, and assignments with verified academic provenance.
            </p>
          </div>
        </div>

        {/* Search & Filter Mockup Header (Interactive preview of layout) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              disabled
              placeholder="Search by course code, subject, or topic (coming in Milestone 2)..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-500 cursor-not-allowed shadow-xs"
            />
          </div>
          <div className="md:col-span-3">
            <div className="relative">
              <select
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-400 cursor-not-allowed appearance-none"
              >
                <option>All Resource Types</option>
                <option>Lecture Notes</option>
                <option>PYQ (Question Papers)</option>
                <option>Lab Manual</option>
                <option>Assignment</option>
              </select>
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="relative">
              <select
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-400 cursor-not-allowed appearance-none"
              >
                <option>All Semesters</option>
                <option>Semester 1-8</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* State Convention Inspector / Preview Tabs */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Design Conventions:
          </span>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Milestone Contract
          </button>
          <button
            onClick={() => setActiveTab('empty')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'empty'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Empty State Pattern
          </button>
          <button
            onClick={() => setActiveTab('loading')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'loading'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Loading State Pattern
          </button>
          <button
            onClick={() => setActiveTab('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'error'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Error State Pattern
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <MilestoneNotice
          featureId="F2"
          featureTitle="Academic Resource Library & Catalog"
          scheduledMilestone="Milestone 2 (Core Product)"
          contractRequirements={[
            'PDF metadata schema (title, course, subject, semester, academic year, type)',
            'Resource listing with server-side text search and category filtering',
            'Bounded BSON storage safely below 16 MiB MongoDB document limit',
            'Full PDF preview with application/pdf streaming & authenticated download',
            'Community voting, verified/unverified badges, and report actions',
            'Resource owner metadata edit and soft/hard delete permissions'
          ]}
        />
      )}

      {activeTab === 'empty' && (
        <div className="py-6">
          <EmptyState
            title="No academic resources found"
            message="No documents have been indexed yet for this semester or subject. Upload the first lecture note or syllabus to seed the repository."
            actionLabel="Contribute a Document"
            onAction={() => window.location.href = '/upload'}
          />
        </div>
      )}

      {activeTab === 'loading' && (
        <div className="py-6 bg-white rounded-2xl border border-slate-200">
          <LoadingState message="Retrieving course catalog and academic documents from database..." />
        </div>
      )}

      {activeTab === 'error' && (
        <div className="py-6">
          <ErrorState
            title="Failed to fetch library resources"
            message="Unable to communicate with the CampusAtlas API server. Please check MongoDB Atlas connection and server health."
            onRetry={() => window.location.reload()}
          />
        </div>
      )}
    </div>
  );
}
