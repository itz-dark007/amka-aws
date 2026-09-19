import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  GraduationCap,
  Mail,
  Phone,
  Building,
  Check,
  X,
  AlertCircle,
  UserCheck,
  Filter,
} from 'lucide-react';
import { ParentUser, ParentStatus } from '../types';
import { fetchParentsList, approveParentAccount, rejectParentAccount } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ParentApprovalsTabProps {
  onApprovalCountChange?: (count: number) => void;
}

export const ParentApprovalsTab: React.FC<ParentApprovalsTabProps> = ({
  onApprovalCountChange,
}) => {
  const { user, token } = useAuth();
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingParent, setRejectingParent] = useState<ParentUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Student Roll Number verification mismatch with registrar roster.');

  // Notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadParents = async () => {
    const activeToken = token || user?.token;
    if (!activeToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchParentsList(activeToken);
      setParents(res.parents);
      const pendingCount = res.parents.filter((p) => p.status === 'pending').length;
      if (onApprovalCountChange) {
        onApprovalCountChange(pendingCount);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load parent records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, [user, token]);

  // Handle Approve
  const handleApprove = async (parent: ParentUser) => {
    const activeToken = token || user?.token;
    if (!activeToken) return;
    setActionLoadingId(parent.id);
    try {
      const updated = await approveParentAccount(parent.id, activeToken);
      setParents((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setToastMessage(`Parent account for ${updated.name} approved successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
      const newPending = parents.filter((p) => p.id !== updated.id && p.status === 'pending').length;
      if (onApprovalCountChange) onApprovalCountChange(newPending);
    } catch (err: any) {
      setError(err.message || 'Approval action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    const activeToken = token || user?.token;
    if (!activeToken || !rejectingParent) return;
    setActionLoadingId(rejectingParent.id);
    try {
      const updated = await rejectParentAccount(
        rejectingParent.id,
        rejectionReason,
        activeToken
      );
      setParents((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setRejectingParent(null);
      setToastMessage(`Application for ${updated.name} has been rejected.`);
      setTimeout(() => setToastMessage(null), 4000);
      const newPending = parents.filter((p) => p.id !== updated.id && p.status === 'pending').length;
      if (onApprovalCountChange) onApprovalCountChange(newPending);
    } catch (err: any) {
      setError(err.message || 'Rejection action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered list
  const filteredParents = parents.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.studentRollNo.toLowerCase().includes(q) ||
        p.studentName.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingTotal = parents.filter((p) => p.status === 'pending').length;
  const approvedTotal = parents.filter((p) => p.status === 'approved').length;
  const rejectedTotal = parents.filter((p) => p.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Requests
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {parents.length}
          </p>
          <span className="text-[11px] text-slate-400">All submitted guardian records</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Verification
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {pendingTotal}
          </p>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
            Requires admin approval
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Verified &amp; Active
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {approvedTotal}
          </p>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
            Full portal access
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Declined
            </span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-2">
            {rejectedTotal}
          </p>
          <span className="text-[11px] text-slate-400">Roster verification mismatch</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-search-parents"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parent name, student name, roll number, email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(
              [
                { id: 'all', label: 'All', count: parents.length },
                { id: 'pending', label: 'Pending', count: pendingTotal },
                { id: 'approved', label: 'Approved', count: approvedTotal },
                { id: 'rejected', label: 'Rejected', count: rejectedTotal },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                id={`filter-parent-${tab.id}`}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={loadParents}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Refresh parent list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Parents Record Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Parent Details</th>
                <th className="py-3.5 px-5">Student Roster Data</th>
                <th className="py-3.5 px-5">Department</th>
                <th className="py-3.5 px-5">Submitted</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No parent registrations match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredParents.map((parent) => {
                  const isActioning = actionLoadingId === parent.id;

                  return (
                    <tr
                      key={parent.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Parent Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {parent.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {parent.name}
                            </span>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="inline-flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{parent.email}</span>
                              </span>
                              {parent.phone && (
                                <span className="inline-flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{parent.phone}</span>
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-1 px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {parent.relationship}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="py-4 px-5">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                            <span>{parent.studentName}</span>
                          </span>
                          <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                            {parent.studentRollNo}
                          </span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center space-x-1 text-slate-600 dark:text-slate-300 font-medium">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{parent.department}</span>
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4 px-5 text-slate-500 whitespace-nowrap">
                        <div>{new Date(parent.registeredAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(parent.registeredAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {parent.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {parent.status === 'approved' && (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                            {parent.approvedBy && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                By: {parent.approvedBy}
                              </p>
                            )}
                          </div>
                        )}
                        {parent.status === 'rejected' && (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                              <XCircle className="w-3 h-3" />
                              <span>Declined</span>
                            </span>
                            {parent.rejectionReason && (
                              <p className="text-[10px] text-rose-500 mt-0.5 max-w-xs truncate">
                                {parent.rejectionReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {parent.status !== 'approved' && (
                            <button
                              id={`admin-approve-parent-${parent.id}`}
                              onClick={() => handleApprove(parent)}
                              disabled={isActioning}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {parent.status !== 'rejected' && (
                            <button
                              id={`admin-reject-parent-${parent.id}`}
                              onClick={() => setRejectingParent(parent)}
                              disabled={isActioning}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center space-x-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Confirmation Modal */}
      {rejectingParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Decline Parent Registration
                </h3>
              </div>
              <button
                onClick={() => setRejectingParent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are rejecting the guardian access application for{' '}
              <strong className="text-slate-900 dark:text-white">
                {rejectingParent.name}
              </strong>{' '}
              linked to student{' '}
              <strong className="text-slate-900 dark:text-white">
                {rejectingParent.studentName} ({rejectingParent.studentRollNo})
              </strong>
              .
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Denial (shown to applicant)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingParent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                id="admin-confirm-reject-btn"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
