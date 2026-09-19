import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Share2,
  Calendar,
  Building,
  CheckCircle2,
  FileText,
  Download,
  AlertCircle,
  Pin,
  ExternalLink,
  Sparkles,
  Eye,
  Clock,
  ShieldCheck,
  Edit3,
  Lock,
  Trash2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Notice, Attachment } from '../types';
import { acknowledgeNotice } from '../lib/api';

interface CircularModalProps {
  notice: Notice | null;
  onClose: () => void;
  onNoticeUpdated?: (updated: Notice) => void;
  onEditNotice?: (notice: Notice) => void;
  onDeleteNotice?: (notice: Notice) => void;
}

export const CircularModal: React.FC<CircularModalProps> = ({
  notice,
  onClose,
  onNoticeUpdated,
  onEditNotice,
  onDeleteNotice,
}) => {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [ackCount, setAckCount] = useState(notice?.acknowledgementsCount || 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (notice) {
      setAckCount(notice.acknowledgementsCount || 0);
      setHasAcknowledged(false);
      setConfirmDelete(false);
    }
  }, [notice?.id]);

  if (!notice) return null;

  const handleAcknowledge = async () => {
    if (hasAcknowledged) return;
    setHasAcknowledged(true);
    setAckCount((prev) => prev + 1);
    try {
      const newCount = await acknowledgeNotice(notice.id);
      if (typeof newCount === 'number') {
        setAckCount(newCount);
      }
      if (onNoticeUpdated) {
        onNoticeUpdated({ ...notice, acknowledgementsCount: newCount });
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const handleDeleteCircular = async () => {
    if (!notice || isDeleting) return;
    setIsDeleting(true);
    try {
      if (onDeleteNotice) {
        await onDeleteNotice(notice);
      }
      onClose();
    } catch (err) {
      console.error('Failed to delete circular:', err);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/#circular-${notice.referenceNumber}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urgencyStyles = {
    urgent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    normal: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Draft Notice Alert Banner */}
        {notice.status === 'draft' && (
          <div className="bg-amber-500 text-amber-950 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-600 no-print">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-950 shrink-0" />
              <div>
                <span className="font-extrabold uppercase tracking-wide text-xs">
                  DRAFT NOTICE — UNPUBLISHED
                </span>
                <p className="text-[11px] text-amber-900 font-medium">
                  This circular is hidden from the Public Bulletin, Campus TV Kiosk, and Parent Portal until published.
                </p>
              </div>
            </div>
            {onEditNotice && (
              <button
                id="edit-draft-from-modal-btn"
                onClick={() => {
                  onClose();
                  onEditNotice(notice);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit &amp; Publish Draft</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 no-print">
          <div className="flex items-center space-x-2">
            {notice.status === 'draft' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">
                Draft (Unpublished)
              </span>
            ) : (
              <>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                    urgencyStyles[notice.urgency]
                  }`}
                >
                  {notice.urgency} Priority
                </span>
                <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Immutable</span>
                </span>
              </>
            )}
            {notice.isPinned && (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                <Pin className="w-3 h-3" />
                <span>Pinned Bulletin</span>
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              Ref: {notice.referenceNumber}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Edit Draft Notice (Only permitted for drafts; published notices are locked) */}
            {onEditNotice && notice.status === 'draft' && (
              <button
                id="modal-edit-notice-btn"
                onClick={() => {
                  onClose();
                  onEditNotice(notice);
                }}
                title="Edit this draft circular"
                className="p-2 text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-100/60 dark:hover:bg-amber-950/50 rounded-lg transition-colors text-xs flex items-center space-x-1 cursor-pointer font-medium"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Draft</span>
              </button>
            )}

            {/* Delete Notice (In case of error or withdrawal) */}
            {onDeleteNotice && (
              confirmDelete ? (
                <div className="flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900 animate-in fade-in">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Delete circular?
                  </span>
                  <button
                    id="modal-confirm-delete-btn"
                    onClick={handleDeleteCircular}
                    disabled={isDeleting}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    id="modal-cancel-delete-btn"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="modal-delete-notice-btn"
                  onClick={() => setConfirmDelete(true)}
                  title={
                    notice.status === 'published'
                      ? 'Delete published circular (In case of error or withdrawal)'
                      : 'Delete draft circular'
                  }
                  className="p-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors text-xs flex items-center space-x-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )
            )}

            <button
              id="copy-circular-ref-btn"
              onClick={handleCopyLink}
              title="Copy link to circular"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center space-x-1 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              id="print-circular-btn"
              onClick={() => window.print()}
              title="Print official document"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center space-x-1 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              id="close-circular-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Institutional Circular Letterhead */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Institutional Crest & Official Banner */}
          <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
              <Building className="w-6 h-6" />
              <span className="font-mono font-bold tracking-widest text-sm uppercase">
                AMKA INSTITUTIONAL NOTICES &amp; DIRECTIVES
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              {notice.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-1.5 font-medium">
                <Building className="w-3.5 h-3.5 text-blue-500" />
                <span>{notice.department}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center space-x-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Issued: {new Date(notice.publishDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </span>
              </div>
              {notice.expiryDate && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Expires: {new Date(notice.expiryDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Executive TL;DR Box (if present) */}
          {notice.summary && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Executive TL;DR Summary
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                  {notice.summary}
                </p>
              </div>
            </div>
          )}

          {/* Target Audience & Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Target Audience:</span>
            {notice.targetAudience.map((audience, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                {audience}
              </span>
            ))}

            <div className="w-full sm:w-auto sm:ml-auto flex items-center space-x-1 mt-2 sm:mt-0">
              {notice.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Notice Rich Content Body */}
          <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base border-t border-b border-slate-100 dark:border-slate-800/80 py-6">
            <div className="markdown-body">
              <Markdown>{notice.content}</Markdown>
            </div>
          </div>

          {/* Circular Attachments Section (PDFs, Images) */}
          {notice.attachments && notice.attachments.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Official Enclosures &amp; Attachments ({notice.attachments.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notice.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                        {att.type}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {att.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(att.size / 1024).toFixed(1)} KB • {att.type.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        id={`preview-att-${att.id}`}
                        onClick={() => setSelectedAttachment(att)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={att.url}
                        download={att.name}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Download attachment"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inline Document Preview Box if user clicked Preview */}
              {selectedAttachment && (
                <div className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-slate-950 text-white">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-mono text-slate-300 font-semibold">
                        Inline Preview: {selectedAttachment.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedAttachment(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
                    >
                      Close Viewer
                    </button>
                  </div>

                  {selectedAttachment.type === 'pdf' ? (
                    <div className="w-full h-96 rounded-lg overflow-hidden border border-slate-800 bg-white">
                      <iframe
                        src={selectedAttachment.url}
                        className="w-full h-full border-0"
                        title={selectedAttachment.name}
                      />
                    </div>
                  ) : selectedAttachment.type === 'image' ? (
                    <div className="w-full max-h-96 flex items-center justify-center p-2 bg-slate-900 rounded-lg overflow-hidden">
                      <img
                        src={selectedAttachment.url}
                        alt={selectedAttachment.name}
                        className="max-h-80 max-w-full object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      <p>Document ready for download.</p>
                      <a
                        href={selectedAttachment.url}
                        download={selectedAttachment.name}
                        className="inline-flex items-center space-x-1 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {selectedAttachment.name}</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Author Credential Signature Block */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-sm">
                {notice.author.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {notice.author.name}
                </p>
                <p className="text-xs text-slate-500">
                  {notice.author.designation} • {notice.author.department}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">{notice.author.email}</p>
              </div>
            </div>

            {/* Read / Acknowledgment Button */}
            <div className="no-print">
              <button
                id="acknowledge-circular-btn"
                onClick={handleAcknowledge}
                disabled={hasAcknowledged}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                  hasAcknowledged
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {hasAcknowledged ? 'Acknowledged' : 'Mark as Read / Acknowledge'}
                </span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/20 text-[11px]">
                  {ackCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
