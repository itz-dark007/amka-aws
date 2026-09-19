import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  FileText,
  Pin,
  Trash2,
  Archive,
  Edit3,
  Sparkles,
  Upload,
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Building,
  Shield,
  Search,
  Eye,
  ArrowRight,
  ShieldAlert,
  Users,
  Lock,
  Database,
} from 'lucide-react';
import { Notice, Department, AuditEntry, Attachment, UrgencyLevel, NoticeStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { ParentApprovalsTab } from './ParentApprovalsTab';
import { AwsDatabaseModal } from './AwsDatabaseModal';
import {
  createNotice,
  updateNotice,
  togglePin,
  archiveNotice,
  deleteNotice,
  fetchAuditLogs,
  uploadAttachmentFile,
  summarizeWithAI,
} from '../lib/api';

interface AdminWorkspaceProps {
  notices: Notice[];
  departments: Department[];
  initialTab?: 'inventory' | 'create' | 'audit' | 'parents';
  editingNotice?: Notice | null;
  onClearEditingNotice?: () => void;
  onNoticeCreated?: (notice: Notice) => void;
  onNoticeUpdated?: (notice: Notice) => void;
  onNoticeDeleted?: (id: string) => void;
  onViewNotice?: (notice: Notice) => void;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  notices,
  departments,
  initialTab = 'inventory',
  editingNotice,
  onClearEditingNotice,
  onNoticeCreated,
  onNoticeUpdated,
  onNoticeDeleted,
  onViewNotice,
}) => {
  const { user, token, demoUsers, switchPersona, canPost, canPin, canDelete, canViewAudit } = useAuth();

  const [activeTab, setActiveTab] = useState<'inventory' | 'create' | 'audit' | 'parents'>(initialTab);
  const [pendingParentApprovals, setPendingParentApprovals] = useState(2);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isAwsModalOpen, setIsAwsModalOpen] = useState<boolean>(false);

  // Status counts for inventory tabs
  const counts = useMemo(() => {
    return {
      all: notices.length,
      published: notices.filter((n) => n.status === 'published').length,
      draft: notices.filter((n) => n.status === 'draft').length,
      archived: notices.filter((n) => n.status === 'archived').length,
    };
  }, [notices]);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('General');
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [status, setStatus] = useState<NoticeStatus>('published');
  const [isPinned, setIsPinned] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([
    'Undergraduates',
    'Postgraduates',
    'Faculty',
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Inventory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Set default department from user on login
  useEffect(() => {
    if (user && !department) {
      setDepartment(user.department || departments[0]?.name || 'Academic Affairs');
    }
  }, [user, departments, department]);

  // Load audit logs when switching to audit tab
  useEffect(() => {
    if (activeTab === 'audit' && token && canViewAudit) {
      setIsLoadingAudit(true);
      fetchAuditLogs(token)
        .then(setAuditLogs)
        .catch((err) => console.error('Failed to load audit logs:', err))
        .finally(() => setIsLoadingAudit(false));
    }
  }, [activeTab, token, canViewAudit]);

  // Reset or Populate Form
  const startCreate = () => {
    setEditingNoticeId(null);
    setTitle('');
    setContent('');
    setSummary('');
    setDepartment(user?.department || departments[0]?.name || 'Academic Affairs');
    setCategory('General');
    setUrgency('normal');
    setStatus('published');
    setIsPinned(false);
    setExpiryDate('');
    setTagsInput('');
    setAttachments([]);
    setFormError(null);
    setFormSuccess(null);
    setActiveTab('create');
  };

  const startEdit = (notice: Notice) => {
    if (notice.status === 'published') {
      alert(
        'Published notices cannot be edited once broadcast to preserve institutional audit authenticity and compliance records.\n\nIn case of an error, administrators can permanently delete the circular and issue a new one.'
      );
      return;
    }
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setSummary(notice.summary || '');
    setDepartment(notice.department);
    setCategory(notice.category);
    setUrgency(notice.urgency);
    setStatus(notice.status);
    setIsPinned(notice.isPinned);
    setExpiryDate(notice.expiryDate ? notice.expiryDate.split('T')[0] : '');
    setTagsInput(notice.tags.join(', '));
    setTargetAudience(notice.targetAudience);
    setAttachments(notice.attachments || []);
    setFormError(null);
    setFormSuccess(null);
    setActiveTab('create');
  };

  // Sync editingNotice prop if triggered externally (e.g. from modal)
  useEffect(() => {
    if (editingNotice) {
      if (editingNotice.status === 'published') {
        alert(
          'Published notices cannot be edited once broadcast to preserve institutional audit authenticity.\n\nIf the circular was issued in error, please delete it.'
        );
        onClearEditingNotice?.();
        return;
      }
      startEdit(editingNotice);
      onClearEditingNotice?.();
    }
  }, [editingNotice]);

  // AI Summarization Handler
  const handleAISummarize = async () => {
    if (!content.trim()) {
      setFormError('Please enter circular notice text before using AI summarization.');
      return;
    }
    setIsSummarizing(true);
    setFormError(null);
    try {
      const res = await summarizeWithAI(content, title);
      setSummary(res.summary);
      if (res.suggestedTags?.length && !tagsInput) {
        setTagsInput(res.suggestedTags.join(', '));
      }
      if (res.suggestedUrgency) {
        setUrgency(res.suggestedUrgency);
      }
      setFormSuccess('AI circular analysis complete: generated executive TL;DR and tags.');
    } catch (err: any) {
      setFormError('AI summarization failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSummarizing(false);
    }
  };

  // File Upload Handler (PDF circular or images)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;

    setIsUploading(true);
    setFormError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 20MB institutional limit.`);
        }
        const uploaded = await uploadAttachmentFile(file, token);
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      setFormError('File upload error: ' + (err.message || 'Failed to upload'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent, targetStatus?: NoticeStatus) => {
    e.preventDefault();
    if (!token) return;

    if (!title.trim()) {
      setFormError('Notice Title is mandatory.');
      return;
    }
    if (!content.trim()) {
      setFormError('Notice Body / Directive Content is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const finalStatus = targetStatus || status;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: Partial<Notice> = {
      title,
      content,
      summary,
      department,
      category,
      urgency,
      status: finalStatus,
      isPinned: finalStatus === 'draft' ? false : isPinned,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      tags: tags.length ? tags : ['Institutional'],
      targetAudience,
      attachments,
    };

    if (finalStatus === 'published') {
      payload.publishDate = new Date().toISOString();
    }

    try {
      if (editingNoticeId) {
        const updated = await updateNotice(editingNoticeId, payload, token);
        onNoticeUpdated?.(updated);
        setFormSuccess(
          finalStatus === 'published'
            ? 'Notice published successfully! Now visible across Campus Notice Board, TV Kiosk, and Parent Portal.'
            : 'Draft saved successfully. This circular remains hidden from public and parent displays.'
        );
      } else {
        const created = await createNotice(payload, token);
        onNoticeCreated?.(created);
        setFormSuccess(
          finalStatus === 'published'
            ? 'Notice published and broadcast across institutional network!'
            : 'Notice saved as draft. It will remain hidden until published.'
        );
      }

      setTimeout(() => {
        setActiveTab('inventory');
        if (finalStatus === 'draft') {
          setStatusFilter('draft');
        }
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Publish a Draft directly from inventory
  const handleQuickPublish = async (notice: Notice) => {
    if (!token) return;
    try {
      const updated = await updateNotice(
        notice.id,
        { status: 'published', publishDate: new Date().toISOString() },
        token
      );
      onNoticeUpdated?.(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to publish draft notice');
    }
  };

  // Actions
  const handleTogglePin = async (notice: Notice) => {
    if (!token) return;
    try {
      const updated = await togglePin(notice.id, token);
      onNoticeUpdated?.(updated);
    } catch (err: any) {
      alert(err.message || 'Pin action failed');
    }
  };

  const handleArchive = async (notice: Notice) => {
    if (!token) return;
    try {
      const updated = await archiveNotice(notice.id, token);
      onNoticeUpdated?.(updated);
    } catch (err: any) {
      alert(err.message || 'Archive action failed');
    }
  };

  const handleDelete = (notice: Notice) => {
    setNoticeToDelete(notice);
  };

  const confirmDeleteNotice = async () => {
    if (!noticeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteNotice(noticeToDelete.id, token);
      onNoticeDeleted?.(noticeToDelete.id);
      setNoticeToDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter inventory
  const filteredInventory = notices.filter((n) => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.referenceNumber.toLowerCase().includes(q) ||
        n.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Guard: If not authenticated, display login portal
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Institutional Staff Workspace
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
              This administrative workspace is reserved for authorized university officials, deans, and examination controllers to publish circulars and dispatch physical campus screen bulletins.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Select an authorized account to enter:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
              {demoUsers.map((p) => (
                <button
                  key={p.id}
                  id={`login-persona-${p.id}`}
                  onClick={() => switchPersona(p)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">{p.designation}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 capitalize">
                      {p.role.replace('_', ' ')}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Workspace Header & User Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Administrative Command Center</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            AMKA Notice Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong> ({user.designation}) • Role:{' '}
            <span className="capitalize font-semibold text-blue-600 dark:text-blue-400">
              {user.role.replace('_', ' ')}
            </span>
          </p>
        </div>

        {/* Tab Navigation & New Button */}
        <div className="flex items-center gap-2">
          <button
            id="tab-inventory-btn"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Notices ({notices.length})
          </button>

          {canPost && (
            <button
              id="tab-create-notice-btn"
              onClick={startCreate}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Draft Notice</span>
            </button>
          )}

          {canViewAudit && (
            <button
              id="tab-audit-btn"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          )}

          {/* PARENT APPROVALS TAB BUTTON */}
          <button
            id="tab-parents-btn"
            onClick={() => setActiveTab('parents')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'parents'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Parent Approvals</span>
            {pendingParentApprovals > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 ml-1">
                {pendingParentApprovals}
              </span>
            )}
          </button>

          {/* AWS DYNAMODB STATUS & SYNC BUTTON */}
          <button
            id="admin-aws-db-status-btn"
            onClick={() => setIsAwsModalOpen(true)}
            title="Inspect AWS DynamoDB connection & table sync status"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/80 dark:border-slate-700 cursor-pointer"
          >
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">AWS Database</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>
        </div>
      </div>

      {/* TAB 1: ALL NOTICES INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title, reference, or department..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-500 font-medium mr-1 hidden sm:inline">Status:</span>
              {(['all', 'published', 'draft', 'archived'] as const).map((st) => (
                <button
                  key={st}
                  id={`status-filter-${st}-btn`}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{st === 'all' ? 'All' : st === 'draft' ? 'Drafts' : st}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      statusFilter === st
                        ? 'bg-blue-700/90 text-white'
                        : st === 'draft' && counts.draft > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {counts[st]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 uppercase tracking-wider text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Circular &amp; Reference</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No notices match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((n) => (
                    <tr
                      key={n.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center space-x-2">
                          {n.isPinned && (
                            <span title="Pinned">
                              <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p
                              onClick={() => onViewNotice?.(n)}
                              className="font-bold text-slate-900 dark:text-white truncate hover:text-blue-600 cursor-pointer"
                            >
                              {n.title}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">
                              {n.referenceNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-300">
                          {n.department}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            n.urgency === 'urgent'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                              : n.urgency === 'info'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                          }`}
                        >
                          {n.urgency}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {n.status === 'published' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Published
                          </span>
                        ) : n.status === 'archived' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Archived
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Draft (Hidden)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <div>
                          {n.status === 'draft' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Unpublished Draft</span>
                          ) : (
                            <span>Pub: {new Date(n.publishDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        {n.expiryDate && (
                          <div className="text-amber-600 dark:text-amber-400">
                            Exp: {new Date(n.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          {/* Direct Edit Draft Button */}
                          {canPost && n.status === 'draft' && (
                            <button
                              id={`edit-draft-btn-${n.id}`}
                              onClick={() => startEdit(n)}
                              title="Edit this draft circular and publish"
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1 shadow-xs cursor-pointer mr-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Draft</span>
                            </button>
                          )}

                          {/* Quick Publish Draft Button */}
                          {canPost && n.status === 'draft' && (
                            <button
                              id={`quick-publish-btn-${n.id}`}
                              onClick={() => handleQuickPublish(n)}
                              title="Publish this draft notice immediately to campus"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs cursor-pointer mr-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </button>
                          )}

                          {/* View Preview */}
                          <button
                            onClick={() => onViewNotice?.(n)}
                            title={n.status === 'draft' ? "Preview Draft Notice" : "Preview Notice"}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Pin Toggle (disabled for drafts) */}
                          {canPin && (
                            <button
                              onClick={() => n.status !== 'draft' && handleTogglePin(n)}
                              disabled={n.status === 'draft'}
                              title={
                                n.status === 'draft'
                                  ? 'Draft notices cannot be pinned until published'
                                  : n.isPinned
                                  ? 'Unpin from Top'
                                  : 'Pin to Top Bulletin'
                              }
                              className={`p-1.5 rounded transition-colors ${
                                n.status === 'draft'
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : n.isPinned
                                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 cursor-pointer'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer'
                              }`}
                            >
                              <Pin className="w-4 h-4" />
                            </button>
                          )}

                          {/* Published Notice Immutability Indicator */}
                          {n.status === 'published' && (
                            <span
                              title="Published circulars cannot be modified once broadcast to preserve institutional audit and authenticity integrity. You can delete it in case of error."
                              className="p-1.5 text-slate-400 dark:text-slate-500 cursor-help inline-flex items-center"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )}

                          {/* Archive Notice */}
                          {canPost && n.status !== 'archived' && n.status !== 'draft' && (
                            <button
                              onClick={() => handleArchive(n)}
                              title="Archive Notice"
                              className="p-1.5 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Notice (Authorized creators / admins can delete in case of error) */}
                          {canDelete && (
                            <button
                              id={`delete-notice-btn-${n.id}`}
                              onClick={() => handleDelete(n)}
                              title={
                                n.status === 'published'
                                  ? 'Permanently delete published circular (In case of error or withdrawal)'
                                  : 'Permanently delete draft'
                              }
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE / EDIT NOTICE FORM */}
      {activeTab === 'create' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>
                  {editingNoticeId
                    ? status === 'draft'
                      ? 'Edit Draft Circular Notice'
                      : 'Edit Circular Notice'
                    : 'Draft New Institutional Circular'}
                </span>
                {status === 'draft' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                    Draft
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Authorized issuing authority: {user.name} ({user.department})
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Draft Notice Banner */}
          {status === 'draft' && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm block">Draft Notice — Unpublished</span>
                <p className="leading-relaxed">
                  This circular is marked as a <strong>Draft</strong> and is strictly hidden from the public Campus Notice Board, Campus TV Kiosk, and Parent Portal. You can edit all fields and choose either to <strong>Publish Notice Now</strong> when finalized, or <strong>Save Changes as Draft</strong> to keep working on it privately.
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Core Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Circular Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Schedule for Autumn 2026 End-Semester Examinations"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Issuing Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={user.role === 'staff_officer'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
              >
                <option value="Examinations">Examinations</option>
                <option value="Academics">Academics</option>
                <option value="Administration">Administration</option>
                <option value="Maintenance">Facilities &amp; Maintenance</option>
                <option value="Placements">Placements &amp; Careers</option>
                <option value="Health">Campus Health</option>
                <option value="General">General Directive</option>
              </select>
            </div>

            {/* Urgency Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Urgency Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['urgent', 'normal', 'info'] as const).map((urg) => (
                  <button
                    key={urg}
                    type="button"
                    onClick={() => setUrgency(urg)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                      urgency === urg
                        ? urg === 'urgent'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : urg === 'normal'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {urg}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Publication Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="form-status-published-btn"
                  onClick={() => setStatus('published')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    status === 'published'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish Immediately</span>
                </button>
                <button
                  type="button"
                  id="form-status-draft-btn"
                  onClick={() => setStatus('draft')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    status === 'draft'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Save as Draft (Hidden)</span>
                </button>
              </div>
              <p className="text-[11px] font-medium">
                {status === 'published' ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Notice will be broadcast live immediately upon saving.</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Draft notices remain hidden from students, parents, and kiosk displays until published.</span>
                )}
              </p>
            </div>

            {/* Expiry Date (Auto-archive) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Expiry Date (Auto-Archive)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-400">
                Notice automatically archives from public board after this date.
              </p>
            </div>

            {/* Pin to Top Bulletin */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pin Priority
              </label>
              <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1">
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pin to Top of Public Feed &amp; Campus TV Ticker</span>
                  </span>
                  <p className="text-slate-400">Guarantees top placement across all displays</p>
                </div>
              </label>
            </div>
          </div>

          {/* Directive Content (Markdown / Rich Text) with AI Assistant Header */}
          <div className="space-y-2 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Circular Directives &amp; Full Content (Markdown Supported) *
              </label>

              <button
                type="button"
                onClick={handleAISummarize}
                disabled={isSummarizing || !content.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                <span>{isSummarizing ? 'Analyzing with Gemini...' : 'Auto-Summarize & Tag (Gemini)'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide detailed instructions, rules, dates, and venue information. Use markdown (# Heading, - bullet, **bold**) as needed."
              required
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-sans text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Executive Summary (TL;DR) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Executive TL;DR Summary (Shown on Cards &amp; Kiosk Screens)</span>
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise 1-2 sentence highlight for quick student reference."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          {/* Tags & Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. Exams, Admit Cards, Schedule, Spring 2026"
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Target Audience
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['All Students', 'Undergraduates', 'Postgraduates', 'Faculty', 'Staff'].map((aud) => {
                  const checked = targetAudience.includes(aud);
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => {
                        if (checked) {
                          setTargetAudience(targetAudience.filter((a) => a !== aud));
                        } else {
                          setTargetAudience([...targetAudience, aud]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        checked
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {aud}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Attachments & PDF Upload Section */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Official Circular Enclosures (PDF Documents &amp; Visual Images)</span>
            </label>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-colors bg-slate-50/50 dark:bg-slate-950/30">
              <input
                id="circular-file-input"
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="circular-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                  <Upload className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Click to select files
                  </span>{' '}
                  or drag and drop
                </div>
                <p className="text-[11px] text-slate-400">
                  PDF documents, PNG, JPG, or SVG circulars up to 20MB
                </p>
              </label>
            </div>

            {/* List of Attached Files */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase">
                          {att.type} • {(att.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Target publication mode:{' '}
              <strong
                className={
                  status === 'published'
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-amber-600 dark:text-amber-400 font-bold'
                }
              >
                {status === 'published' ? 'Live on Campus Boards' : 'Private Draft (Hidden)'}
              </strong>
            </div>

            <div className="flex items-center space-x-3 justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              {/* Save as Draft Button */}
              <button
                id="save-as-draft-btn"
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, 'draft')}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{editingNoticeId ? 'Save Changes as Draft' : 'Save as Draft'}</span>
              </button>

              {/* Publish Notice Now Button */}
              <button
                id="publish-notice-btn"
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, 'published')}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Processing...' : 'Publish Notice Now'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: AUDIT & COMPLIANCE LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>Governance &amp; Administrative Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Immutable security log of all creation, updates, pin actions, and deletions.
              </p>
            </div>

            <button
              onClick={() => token && fetchAuditLogs(token).then(setAuditLogs)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Refresh Log
            </button>
          </div>

          <div className="overflow-x-auto p-4">
            {isLoadingAudit ? (
              <div className="text-center py-10 text-xs text-slate-400">Loading audit records...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">No audit events logged yet.</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'create'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : log.action === 'delete'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                              : log.action === 'pin'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {log.noticeTitle}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">{log.details}</p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {log.performedBy}{' '}
                        <span className="text-[10px] text-slate-400 uppercase">({log.role})</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PARENT REGISTRATIONS & APPROVALS */}
      {activeTab === 'parents' && (
        <ParentApprovalsTab onApprovalCountChange={setPendingParentApprovals} />
      )}

      {/* In-App Delete Confirmation Modal */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete {noticeToDelete.status === 'published' ? 'Published Circular' : 'Draft Notice'}?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Ref: {noticeToDelete.referenceNumber}
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                "{noticeToDelete.title}"
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {noticeToDelete.status === 'published'
                  ? 'This circular will be permanently withdrawn from the Campus Notice Board, Campus TV Kiosk, and Parent Portal.'
                  : 'This draft will be permanently deleted from repository.'}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                id="cancel-delete-modal-btn"
                onClick={() => setNoticeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-modal-btn"
                onClick={confirmDeleteNotice}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AWS DynamoDB Health & Sync Modal */}
      <AwsDatabaseModal
        isOpen={isAwsModalOpen}
        onClose={() => setIsAwsModalOpen(false)}
        token={token}
      />
    </div>
  );
};
