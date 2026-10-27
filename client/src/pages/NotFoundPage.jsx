import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto mb-6">
        <span className="text-2xl font-bold">404</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The requested page or resource could not be found on CampusAtlas.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          Return to Library
        </Link>
      </div>
    </div>
  );
}
