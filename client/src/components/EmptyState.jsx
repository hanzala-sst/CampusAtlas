import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  message = 'There are no records matching your criteria yet.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-sm leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
