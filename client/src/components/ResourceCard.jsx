import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  FileText, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  ShieldCheck, 
  Shield, 
  Clock, 
  ExternalLink,
  Layers
} from 'lucide-react';

export default function ResourceCard({ resource, onVoteChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [voteScore, setVoteScore] = useState(resource.voteScore || 0);
  const [userVote, setUserVote] = useState(resource.userVote || 0);
  const [voting, setVoting] = useState(false);

  const handleVote = async (value) => {
    if (!user) {
      navigate('/auth', { state: { from: window.location.pathname } });
      return;
    }

    if (voting) return;
    setVoting(true);

    // If clicking already selected vote, toggle to 0 (remove vote)
    const targetValue = userVote === value ? 0 : value;

    try {
      const data = await api.resources.vote(resource._id, targetValue);
      if (data?.success) {
        setUserVote(data.userVote);
        setVoteScore(data.voteScore);
        if (onVoteChange) onVoteChange(resource._id, data.voteScore, data.userVote);
      }
    } catch (err) {
      console.error('Failed to cast vote:', err);
    } finally {
      setVoting(false);
    }
  };

  const getVerificationBadge = () => {
    switch (resource.verificationStatus) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Shield className="w-3.5 h-3.5 text-rose-600" />
            Flagged
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Unverified
          </span>
        );
    }
  };

  const formatResourceType = (type) => {
    const map = {
      'lecture-notes': 'Lecture Notes',
      pyq: 'PYQ (Question Paper)',
      'lab-manual': 'Lab Manual',
      assignment: 'Assignment',
      reference: 'Reference Material',
    };
    return map[type] || type;
  };

  const formattedDate = new Date(resource.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/60 uppercase tracking-wide">
              {resource.courseCode}
            </span>
            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
              {formatResourceType(resource.resourceType)}
            </span>
            <span className="text-xs text-slate-500">
              Sem {resource.semester}
            </span>
          </div>
          <div>{getVerificationBadge()}</div>
        </div>

        {/* Title & Description */}
        <Link
          to={`/resources/${resource._id}`}
          className="group block"
        >
          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
            {resource.title}
          </h3>
        </Link>

        <p className="mt-1 text-xs text-slate-500 font-medium">
          {resource.courseName} • {resource.subject} ({resource.academicYear})
        </p>

        {resource.description && (
          <p className="mt-2.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}
      </div>

      {/* Footer Info & Action Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
        {/* Uploader & Date */}
        <div className="flex items-center gap-1.5 text-slate-500 truncate">
          <span>By</span>
          <span className="font-semibold text-slate-700 truncate max-w-[120px]">
            {resource.uploadedBy?.name || 'Academic Contributor'}
          </span>
          <span className="text-slate-300">•</span>
          <span>{formattedDate}</span>
        </div>

        {/* Action Controls: Voting & Details */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Comments count */}
          <Link
            to={`/resources/${resource._id}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Comments"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-medium">{resource.commentCount || 0}</span>
          </Link>

          {/* Voting Pill */}
          <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => handleVote(1)}
              disabled={voting}
              title="Helpful / Upvote"
              className={`p-1.5 rounded-lg transition-colors ${
                userVote === 1
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <span className={`px-2 text-xs font-bold ${
              voteScore > 0 ? 'text-emerald-700' : voteScore < 0 ? 'text-red-600' : 'text-slate-700'
            }`}>
              {voteScore}
            </span>

            <button
              onClick={() => handleVote(-1)}
              disabled={voting}
              title="Not Helpful / Downvote"
              className={`p-1.5 rounded-lg transition-colors ${
                userVote === -1
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-red-700 hover:bg-white'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            to={`/resources/${resource._id}`}
            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="View Details & PDF"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
