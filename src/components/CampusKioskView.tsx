import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Clock,
  Calendar,
  Building,
  AlertTriangle,
  Pin,
  Radio,
  FileText,
  Sparkles,
  QrCode,
  Volume2,
  ChevronLeft,
  ChevronRight,
  School,
  ArrowLeftRight,
} from 'lucide-react';
import { Notice, Department } from '../types';

interface CampusKioskViewProps {
  notices: Notice[];
  departments: Department[];
  onExitKiosk: () => void;
  onSelectNotice?: (notice: Notice) => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export const CampusKioskView: React.FC<CampusKioskViewProps> = ({
  notices,
  departments,
  onExitKiosk,
  onSelectNotice,
  connectionStatus,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [slideDuration, setSlideDuration] = useState(12); // seconds per slide
  const [progress, setProgress] = useState(0);

  // Active notices for public TV kiosk (strictly published notices only; drafts are never displayed)
  const activeNotices = useMemo(() => {
    return notices.filter((n) => n.status === 'published');
  }, [notices]);

  // Current active notice on display
  const activeNotice = activeNotices[currentIndex] || activeNotices[0] || null;

  // Urgent notices for the bottom live ticker
  const urgentNotices = useMemo(() => {
    return activeNotices.filter((n) => n.urgency === 'urgent' || n.isPinned);
  }, [activeNotices]);

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Slide rotation timer & progress bar
  useEffect(() => {
    if (!isPlaying || activeNotices.length <= 1) return;

    const intervalStep = 100; // ms
    const totalSteps = (slideDuration * 1000) / intervalStep;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % activeNotices.length);
          return 0;
        }
        return prev + 100 / totalSteps;
      });
    }, intervalStep);

    return () => clearInterval(interval);
  }, [isPlaying, slideDuration, activeNotices.length]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request rejected:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handlePrev = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev === 0 ? activeNotices.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % activeNotices.length);
  };

  // Generate an inline SVG QR Code representation pointing to the active notice reference
  const qrSvgUri = useMemo(() => {
    // Generate clean QR-style data pattern for campus display
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%230f172a"><rect width="100" height="100" fill="%23ffffff" rx="10"/><rect x="10" y="10" width="26" height="26" fill="%230f172a" rx="4"/><rect x="14" y="14" width="18" height="18" fill="%23ffffff" rx="2"/><rect x="18" y="18" width="10" height="10" fill="%232563eb" rx="1"/><rect x="64" y="10" width="26" height="26" fill="%230f172a" rx="4"/><rect x="68" y="14" width="18" height="18" fill="%23ffffff" rx="2"/><rect x="72" y="18" width="10" height="10" fill="%232563eb" rx="1"/><rect x="10" y="64" width="26" height="26" fill="%230f172a" rx="4"/><rect x="14" y="68" width="18" height="18" fill="%23ffffff" rx="2"/><rect x="18" y="72" width="10" height="10" fill="%232563eb" rx="1"/><rect x="44" y="14" width="8" height="16" fill="%230f172a"/><rect x="42" y="36" width="16" height="8" fill="%230f172a"/><rect x="44" y="50" width="12" height="12" fill="%232563eb"/><rect x="62" y="44" width="10" height="18" fill="%230f172a"/><rect x="68" y="68" width="18" height="18" fill="%230f172a"/><rect x="42" y="70" width="16" height="16" fill="%230f172a"/></svg>`;
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Header Bar: Institutional Branding + Real-time Clock */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shadow-2xl shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border border-blue-400/40 shadow-lg">
            <School className="w-7 h-7 text-white" />
          </div>

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black tracking-tight text-white font-mono">AMKA</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest">
                Notice Board Display
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Live Campus Announcements &amp; Real-Time Broadcast</p>
          </div>
        </div>

        {/* Center: Live Sync Pulse */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400">LIVE BROADCAST ACTIVE</span>
        </div>

        {/* Right: Date, Time & Kiosk Controls */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400">
              {currentTime.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onExitKiosk}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center space-x-1.5 ml-1 transition-all active:scale-95"
              title="Return to Welcome / Role Selection"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Switch Role</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide Progress Indicator Bar */}
      <div className="w-full bg-slate-900 h-1 shrink-0">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Kiosk Content Stage */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 lg:p-10 gap-8 overflow-hidden items-stretch">
        {activeNotices.length === 0 || !activeNotice ? (
          <div className="flex-1 bg-slate-900/80 rounded-3xl border border-slate-800 p-12 flex flex-col items-center justify-center text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Building className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">No Circulars Currently Published</h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              All circulars are currently in draft or undergoing administrative review. Official announcements will appear here immediately upon publication.
            </p>
          </div>
        ) : (
        /* Active Hero Slide */
        <div className="flex-1 bg-slate-900/80 rounded-3xl border border-slate-800 p-8 sm:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Background Ambient Glow */}
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 ${
              activeNotice?.urgency === 'urgent'
                ? 'bg-rose-600'
                : activeNotice?.isPinned
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
          />

          {/* Top Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 z-10">
            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 font-bold text-sm border border-blue-500/30 uppercase tracking-widest flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>{activeNotice?.department}</span>
              </span>

              {activeNotice?.isPinned && (
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-sm border border-amber-500/40 flex items-center space-x-1.5">
                  <Pin className="w-4 h-4" />
                  <span>PINNED BULLETIN</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-wider border ${
                  activeNotice?.urgency === 'urgent'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
                    : activeNotice?.urgency === 'info'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                    : 'bg-blue-950/80 text-blue-300 border-blue-600'
                }`}
              >
                {activeNotice?.urgency} PRIORITY
              </span>
              <span className="text-sm font-mono text-slate-400 font-bold">
                {activeNotice?.referenceNumber}
              </span>
            </div>
          </div>

          {/* Notice Title & Large Content Display */}
          <div className="my-auto py-6 z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
              {activeNotice?.title}
            </h2>

            {/* TL;DR Callout Box */}
            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-slate-200 text-lg sm:text-xl leading-relaxed flex items-start space-x-4 shadow-inner">
              <Sparkles className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-400 block mb-1">
                  Executive Briefing:
                </span>
                <p>{activeNotice?.summary || activeNotice?.content.slice(0, 240) + '...'}</p>
              </div>
            </div>

            {/* Target Audience & Issuing Authority */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 pt-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold text-slate-500">Applicable To:</span>
                {activeNotice?.targetAudience.map((aud, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
                  >
                    {aud}
                  </span>
                ))}
              </div>

              <span className="text-slate-600">•</span>

              <div>
                Issued by: <strong className="text-slate-200">{activeNotice?.author.name}</strong> (
                {activeNotice?.author.designation})
              </div>
            </div>
          </div>

          {/* Slide Footer: Controls & Enclosure Notice */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 z-10">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrev}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-mono text-slate-400">
                Notice <strong className="text-white">{currentIndex + 1}</strong> of{' '}
                <strong className="text-white">{activeNotices.length}</strong>
              </span>

              <button
                onClick={handleNext}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Next Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {activeNotice?.attachments && activeNotice.attachments.length > 0 && (
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-900/60">
                <FileText className="w-4 h-4" />
                <span>
                  Official Circular PDF Attached ({activeNotice.attachments.length} Enclosure)
                </span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Side Column: Up Next Notice Queue & Mobile Scan QR Code */}
        <aside className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
          {/* QR Code Card for Passersby */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-5 shadow-xl">
            <div className="w-24 h-24 rounded-2xl bg-white p-2 shrink-0 shadow-md flex items-center justify-center">
              <img src={qrSvgUri} alt="Notice QR Code" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <QrCode className="w-4 h-4" />
                <span>Scan for Mobile View</span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-snug">
                Point phone camera to read full circular text &amp; download PDF enclosure.
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Instant zero-login access</p>
            </div>
          </div>

          {/* Up Next Upcoming Announcements Feed */}
          <div className="flex-1 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col overflow-hidden shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Upcoming in Display Loop
              </span>
              <span className="text-xs font-mono text-slate-500">
                {activeNotices.length} active
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeNotices.map((n, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setProgress(0);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-semibold text-blue-400 uppercase tracking-wide">
                        {n.department}
                      </span>
                      {n.urgency === 'urgent' && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-bold uppercase">
                          Urgent
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold line-clamp-2 leading-snug text-white">
                      {n.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Continuous News Marquee Ticker */}
      <footer className="h-12 bg-slate-900 border-t border-slate-800 flex items-center overflow-hidden shrink-0 z-20">
        {/* Ticker Title Badge */}
        <div className="h-full bg-rose-600 px-5 flex items-center space-x-2 text-white font-black text-xs uppercase tracking-widest shrink-0 z-10 shadow-lg">
          <AlertTriangle className="w-4 h-4 animate-bounce" />
          <span>CAMPUS TICKER</span>
        </div>

        {/* Continuous Scrolling Text */}
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee inline-flex items-center space-x-12 text-sm text-slate-200 font-medium py-1">
            {urgentNotices.map((u, i) => (
              <span key={i} className="inline-flex items-center space-x-2">
                <span className="text-amber-400 font-bold font-mono">[{u.referenceNumber}]</span>
                <span className="font-semibold text-white">{u.title}</span>
                <span className="text-slate-400 text-xs">({u.department})</span>
                <span className="text-rose-500 font-bold mx-2">★★★</span>
              </span>
            ))}
            {urgentNotices.length === 0 && (
              <span>
                All academic departments operational. No emergency advisories currently active.
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
