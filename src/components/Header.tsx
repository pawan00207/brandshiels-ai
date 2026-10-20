import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Moon,
  Sun,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  FileCheck,
  Scale,
  Sparkles,
} from 'lucide-react';
import { storage } from '../db/storage.ts';
import { UserProfile, UserRole } from '../types/index.ts';
import { DEMO_USERS } from '../data/seed-data.ts';

interface HeaderProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onUserChange }) => {
  const location = useLocation();
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem('brandshield_theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('brandshield_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('brandshield_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    storage.getAuditEvents(currentUser.workspaceId).then((events) => {
      setRecentEvents(events.slice(0, 5));
    });
  }, [currentUser, location]);

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'Audit Workbench', path: '/workbench' },
    { label: 'Review Queue', path: '/queue' },
    { label: 'Brand Knowledge', path: '/knowledge' },
    { label: 'Intelligence', path: '/intelligence' },
    { label: 'Evaluation', path: '/evaluation' },
  ];

  const roleLabels: Record<UserRole, { title: string; desc: string }> = {
    admin: { title: 'Workspace Admin', desc: 'Full authority & knowledge governance' },
    reviewer: { title: 'Brand Reviewer', desc: 'Approve, reject & comment on campaigns' },
    creator: { title: 'Content Creator', desc: 'Draft, submit & audit copy' },
    viewer: { title: 'Read-only Stakeholder', desc: 'Audited visibility without edit rights' },
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur-md transition-colors dark:border-stone-800 dark:bg-[#0E0E10]/95 no-print">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark (Single text element in luxury display serif) */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 whitespace-nowrap shrink-0 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded border border-[#B8975A]/40 bg-[#B8975A]/10 text-[#B8975A] transition-colors group-hover:border-[#B8975A]">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="font-serif tracking-wide">
            BRANDSHIELD <span className="font-sans text-xs tracking-widest text-[#B8975A]">AI</span>
          </span>
        </Link>

        {/* Zone 2: 4-5 single-line navigation links */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`whitespace-nowrap shrink-0 text-xs font-medium tracking-wide uppercase transition-colors ${
                  isActive
                    ? 'border-b-2 border-[#B8975A] pb-1 text-[#B8975A] font-semibold'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Controls (Role Picker, Notifications, Theme) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 hover:text-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
              aria-label="View activity notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" />
              {recentEvents.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-[#B8975A]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-800 dark:bg-[#141417]">
                <div className="mb-2 flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Governance Activity
                  </span>
                  <Link
                    to="/settings"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-[#B8975A] hover:underline"
                  >
                    View audit log
                  </Link>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentEvents.length === 0 ? (
                    <p className="py-4 text-center text-xs text-stone-400">No recent events</p>
                  ) : (
                    recentEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="rounded p-2 text-xs transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50"
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span className="font-medium text-stone-700 dark:text-stone-300">
                            {evt.actorName}
                          </span>
                          <span>
                            {new Date(evt.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-stone-600 dark:text-stone-300 line-clamp-2">
                          {evt.details}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 hover:text-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
            aria-label={isDark ? 'Switch to ivory light mode' : 'Switch to ink-black dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Role Picker (Demo Mode Switcher) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 rounded border border-[#B8975A]/50 bg-stone-100/70 px-3 py-1.5 text-xs font-medium text-stone-800 transition-colors hover:border-[#B8975A] dark:bg-stone-900 dark:text-stone-200"
              aria-label="Switch demo role"
              aria-expanded={showRoleMenu}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B8975A]/20 text-[10px] font-bold text-[#B8975A]">
                {currentUser.avatar || currentUser.name.slice(0, 2)}
              </span>
              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider text-[#B8975A]">
                [{currentUser.role}]
              </span>
              <span className="hidden md:inline font-medium truncate max-w-[90px]">{currentUser.name}</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-800 dark:bg-[#141417]">
                <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-stone-400">
                  Switch Role (Demo Persona)
                </div>
                <div className="space-y-1">
                  {DEMO_USERS.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    const info = roleLabels[user.role];
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          storage.setCurrentUser(user);
                          onUserChange(user);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full rounded p-2 text-left transition-colors flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-[#B8975A]/10 text-stone-900 dark:text-white'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700 text-xs font-bold text-[#B8975A]">
                          {user.avatar}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate">{user.name}</span>
                            <span className="font-mono text-[10px] uppercase text-[#B8975A]">
                              {user.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 truncate">{info.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-stone-100 pt-2 px-2 text-[11px] text-stone-400 dark:border-stone-800">
                  Brand: <span className="font-semibold text-stone-700 dark:text-stone-200">Maison Aurelia</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 lg:hidden text-stone-600 dark:border-stone-800 dark:text-stone-400"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-stone-200 bg-stone-50 px-4 py-4 dark:border-stone-800 dark:bg-[#0E0E10] lg:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-medium tracking-wide uppercase ${
                  location.pathname === link.path
                    ? 'text-[#B8975A] font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-stone-200 pt-3 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="hover:underline">
                About & Architecture
              </Link>
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="hover:underline">
                Settings
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
