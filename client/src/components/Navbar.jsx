import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  BookOpen, 
  Upload, 
  MessageSquareText, 
  UserCheck, 
  ShieldCheck, 
  Menu, 
  X,
  Activity,
  Layers
} from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState({ status: 'checking', text: 'Checking API' });

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const dbStatus = data?.services?.database?.status;
            if (dbStatus === 'connected') {
              setApiHealth({ status: 'online', text: 'API & DB Online' });
            } else {
              setApiHealth({ status: 'degraded', text: 'API Online (DB offline)' });
            }
          }
        } else {
          if (isMounted) setApiHealth({ status: 'offline', text: 'API Degraded' });
        }
      } catch (err) {
        if (isMounted) setApiHealth({ status: 'offline', text: 'API Disconnected' });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { to: '/', label: 'Library', icon: BookOpen },
    { to: '/upload', label: 'Upload PDF', icon: Upload },
    { to: '/ask', label: 'Ask the Doc', icon: MessageSquareText },
    { to: '/contributions', label: 'My Contributions', icon: UserCheck },
    { to: '/moderator', label: 'Moderator Review', icon: ShieldCheck },
  ];

  const getStatusBadge = () => {
    switch (apiHealth.status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {apiHealth.text}
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {apiHealth.text}
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            {apiHealth.text}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <Activity className="w-3 h-3 animate-spin" />
            Connecting...
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                CampusAtlas
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 border border-slate-200 rounded px-1.5 py-0.2">
                MERN
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header Status */}
          <div className="hidden sm:flex items-center gap-3">
            {getStatusBadge()}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {getStatusBadge()}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
