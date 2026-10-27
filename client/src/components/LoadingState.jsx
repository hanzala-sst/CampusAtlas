import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading content...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
        <Loader2 className="w-5 h-5 text-brand-600 absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600 tracking-wide">{message}</p>
    </div>
  );
}
