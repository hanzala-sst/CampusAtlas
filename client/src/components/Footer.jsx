import React from 'react';
import { Shield, BookOpen, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/70 backdrop-blur-sm py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span>CampusAtlas</span>
            <span className="text-slate-400 font-normal">| Peer-Powered Academic Knowledge Hub</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              Provenance & Trust: Unverified is honest default
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              Grounded AI: Official Google GenAI SDK
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
