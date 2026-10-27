import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while fetching data.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-xl bg-red-50/70 border border-red-200 text-center max-w-lg mx-auto ${className}`}>
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <p className="mt-1.5 text-sm text-red-700 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
