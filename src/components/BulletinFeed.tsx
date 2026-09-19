import React, { useState, useMemo } from 'react';
import {
  Search,
  Pin,
  AlertTriangle,
  FileText,
  Calendar,
  Building,
  Filter,
  Eye,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Radio,
  BookOpen,
  GraduationCap,
  Users,
  Briefcase,
  Wrench,
  HeartPulse,
} from 'lucide-react';
import { Notice, Department } from '../types';

interface BulletinFeedProps {
  notices: Notice[];
  departments: Department[];
  onSelectNotice: (notice: Notice) => void;
  latestLiveEvent: { type: string; title?: string; time: string } | null;
}

export const BulletinFeed: React.FC<BulletinFeedProps> = ({
  notices,
  departments,
  onSelectNotice,
  latestLiveEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [onlyPinned, setOnlyPinned] = useState<boolean>(false);

  // Filter notices (ignoring drafts; showing published)
  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      // Must be published in public view
      if (notice.status !== 'published') return false;

      if (onlyPinned && !notice.isPinned) return false;

      if (selectedDept !== 'all' && notice.department !== selectedDept) return false;

      if (selectedUrgency !== 'all' && notice.urgency !== selectedUrgency) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = notice.title.toLowerCase().includes(query);
        const matchesContent = notice.content.toLowerCase().includes(query);
        const matchesSummary = notice.summary?.toLowerCase().includes(query) || false;
        const matchesRef = notice.referenceNumber.toLowerCase().includes(query);
        const matchesDept = notice.department.toLowerCase().includes(query);
        const matchesTag = notice.tags.some((t) => t.toLowerCase().includes(query));
        return matchesTitle || matchesContent || matchesSummary || matchesRef || matchesDept || matchesTag;
      }

      return true;
    });
  }, [notices, selectedDept, selectedUrgency, onlyPinned, searchQuery]);

  // Separate pinned from non-pinned for featured display
  const pinnedNotices = useMemo(() => {
    return filteredNotices.filter((n) => n.isPinned);
  }, [filteredNotices]);

  const regularNotices = useMemo(() => {
    return filteredNotices.filter((n) => !n.isPinned);
  }, [filteredNotices]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notices.forEach((n) => {
      if (n.status === 'published') {
        counts[n.department] = (counts[n.department] || 0) + 1;
      }
    });
    return counts;
  }, [notices]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Live Push Notification Banner */}
      {latestLiveEvent && (
        <div className="p-3.5 rounded-xl bg-blue-900/40 border border-blue-500/40 text-blue-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              {latestLiveEvent.type}
            </span>
            <span className="text-xs text-slate-300 font-medium truncate max-w-md hidden sm:inline">
              "{latestLiveEvent.title}"
            </span>
          </div>
          <span className="text-[11px] text-blue-400 font-mono">{latestLiveEvent.time}</span>
        </div>
      )}

      {/* Main Search & Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:max-w-xl">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="public-feed-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars, exam schedules, circular ID (e.g. AMKA/EXAM), or tags..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Urgency & Pin Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              id="filter-urgency-all"
              onClick={() => setSelectedUrgency('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedUrgency === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Priorities
            </button>

            <button
              id="filter-urgency-urgent"
              onClick={() => setSelectedUrgency(selectedUrgency === 'urgent' ? 'all' : 'urgent')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedUrgency === 'urgent'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Urgent Only</span>
            </button>

            <button
              id="filter-pinned-toggle"
              onClick={() => setOnlyPinned(!onlyPinned)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                onlyPinned
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Pinned ({notices.filter((n) => n.isPinned && n.status === 'published').length})</span>
            </button>
          </div>
        </div>

        {/* Department Tab Chips */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            id="dept-tab-all"
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedDept === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Departments ({notices.filter((n) => n.status === 'published').length})
          </button>

          {departments.map((dept) => {
            const count = departmentCounts[dept.name] || 0;
            const isSelected = selectedDept === dept.name;
            return (
              <button
                key={dept.id}
                id={`dept-tab-${dept.id}`}
                onClick={() => setSelectedDept(dept.name)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{dept.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Filter Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{filteredNotices.length}</strong> active institutional notice(s)
          {selectedDept !== 'all' && ` in ${selectedDept}`}
        </span>
        {(selectedDept !== 'all' || selectedUrgency !== 'all' || onlyPinned || searchQuery) && (
          <button
            onClick={() => {
              setSelectedDept('all');
              setSelectedUrgency('all');
              setOnlyPinned(false);
              setSearchQuery('');
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Pinned / Priority Section */}
      {pinnedNotices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <Pin className="w-4 h-4" />
            <span>Priority Pinned Circulars ({pinnedNotices.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedNotices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} onSelect={onSelectNotice} isPinnedCard />
            ))}
          </div>
        </section>
      )}

      {/* Standard Active Notices Section */}
      <section className="space-y-3">
        {pinnedNotices.length > 0 && regularNotices.length > 0 && (
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-4">
            <BookOpen className="w-4 h-4" />
            <span>General Institutional Circulars ({regularNotices.length})</span>
          </div>
        )}

        {filteredNotices.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No matching announcements found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try refining your search terms or resetting the department and urgency filters above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularNotices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} onSelect={onSelectNotice} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// Reusable Notice Card
interface NoticeCardProps {
  notice: Notice;
  onSelect: (notice: Notice) => void;
  isPinnedCard?: boolean;
}

const NoticeCard: React.FC<NoticeCardProps> = ({ notice, onSelect, isPinnedCard }) => {
  const urgencyStyles = {
    urgent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    normal: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  };

  const hasAttachments = notice.attachments && notice.attachments.length > 0;
  const pdfCount = notice.attachments?.filter((a) => a.type === 'pdf').length || 0;
  const imgCount = notice.attachments?.filter((a) => a.type === 'image').length || 0;

  return (
    <div
      id={`notice-card-${notice.id}`}
      onClick={() => onSelect(notice)}
      className={`group relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-lg ${
        isPinnedCard
          ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-300/80 dark:border-amber-800/80 hover:border-amber-400'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
      }`}
    >
      <div>
        {/* Card Header: Dept, Urgency, Pin */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide truncate max-w-[180px]">
            {notice.department}
          </span>

          <div className="flex items-center space-x-1.5 shrink-0">
            {notice.isPinned && (
              <span className="p-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" title="Pinned Announcement">
                <Pin className="w-3 h-3" />
              </span>
            )}

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                urgencyStyles[notice.urgency]
              } ${notice.urgency === 'urgent' ? 'animate-pulse' : ''}`}
            >
              {notice.urgency}
            </span>
          </div>
        </div>

        {/* Ref Number & Date */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mb-2">
          <span>{notice.referenceNumber}</span>
          <span>•</span>
          <span>
            {new Date(notice.publishDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {notice.title}
        </h3>

        {/* Summary Snippet */}
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
          {notice.summary || notice.content.replace(/[#*`_]/g, '')}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70 space-y-3">
        {/* Attachment chips */}
        {hasAttachments && (
          <div className="flex items-center space-x-2 text-xs">
            {pdfCount > 0 && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[11px] font-medium border border-rose-200/50">
                <FileText className="w-3 h-3" />
                <span>{pdfCount} PDF Circular</span>
              </span>
            )}
            {imgCount > 0 && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 text-[11px] font-medium border border-sky-200/50">
                <Sparkles className="w-3 h-3" />
                <span>{imgCount} Graphic</span>
              </span>
            )}
          </div>
        )}

        {/* Card Footer: View count, acknowledgements, and arrow */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1" title="Views">
              <Eye className="w-3.5 h-3.5" />
              <span>{notice.viewsCount || 0}</span>
            </span>

            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400" title="Read Acknowledgements">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{notice.acknowledgementsCount || 0}</span>
            </span>
          </div>

          <span className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Read Notice</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
