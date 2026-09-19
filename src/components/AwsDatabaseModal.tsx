import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  KeyRound,
  Shield,
  X,
  HardDrive,
} from 'lucide-react';
import { fetchAwsStatus, triggerAwsSync, AwsDatabaseStatus } from '../lib/api';

interface AwsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
}

export const AwsDatabaseModal: React.FC<AwsDatabaseModalProps> = ({
  isOpen,
  onClose,
  token,
}) => {
  const [status, setStatus] = useState<AwsDatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const data = await fetchAwsStatus();
      setStatus(data);
    } catch (err: any) {
      setSyncError(err.message || 'Failed to load database status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const res = await triggerAwsSync(token);
      setSyncMessage(res.message);
      setStatus(res.status);
    } catch (err: any) {
      setSyncError(err.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = Boolean(status?.connected);
  const isConfigured = Boolean(status?.configured);

  return (
    <div
      id="aws-db-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="aws-db-modal-content"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : isConfigured
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AWS DynamoDB Integration</span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : isConfigured
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {isConnected ? 'Active & Synced' : isConfigured ? 'Connecting' : 'Local Fallback'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Institutional persistence and cloud table synchronization
              </p>
            </div>
          </div>

          <button
            id="aws-db-modal-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Engine Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isConnected
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                : isConfigured
                ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : isConfigured ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <HardDrive className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <p className="font-semibold text-xs uppercase tracking-wider">
                Current Engine: {status?.activeEngine || 'Local File Persistence'}
              </p>
              <p className="text-xs opacity-90 leading-relaxed">
                {isConnected
                  ? `Successfully connected to AWS DynamoDB in ${status?.region}. Changes to notices, audit trails, and parent approvals are saved directly in Amazon DynamoDB.`
                  : isConfigured
                  ? `AWS credentials detected (${status?.maskedAccessKey}), but the connection or table validation reported: ${
                      status?.error || 'Pending handshake'
                    }.`
                  : 'Currently operating in Local Persistent Storage mode. All records are safely persisted in the server container storage.'}
              </p>
            </div>
          </div>

          {/* Database Specs Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">AWS Region</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {status?.region || 'us-east-1'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">DynamoDB Table</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white truncate block">
                {status?.tableName || 'amka_campus_notices'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">AWS Access Key</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">
                {status?.maskedAccessKey || 'Not configured'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">
                {isConnected ? 'DynamoDB Item Count' : 'Local Notice Cache'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {isConnected
                  ? `${status?.itemCount ?? 0} items stored`
                  : `${status?.localNoticesCount ?? 0} notices cached`}
              </span>
            </div>
          </div>

          {/* Setup Guide Box */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              <span>How to Supply Your AWS Keys Safely</span>
            </div>
            <ol className="list-decimal list-inside text-xs text-blue-900/90 dark:text-blue-200/90 space-y-1.5 leading-relaxed">
              <li>
                Open <strong>Settings &rarr; Secrets / Environment Variables</strong> in the AI Studio menu.
              </li>
              <li>
                Add <strong>AWS_ACCESS_KEY_ID</strong> and <strong>AWS_SECRET_ACCESS_KEY</strong>.
              </li>
              <li>
                (Optional) Add <strong>AWS_REGION</strong> (e.g. <code className="font-mono">us-east-1</code>) and <strong>DYNAMODB_TABLE_NAME</strong>.
              </li>
              <li>
                The server will automatically detect the credentials, create the table if needed, and sync all existing notices!
              </li>
            </ol>
          </div>

          {/* Messages */}
          {syncMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {syncError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            id="aws-db-refresh-status-btn"
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Connection</span>
          </button>

          <div className="flex items-center space-x-2">
            {isConfigured && (
              <button
                id="aws-db-sync-now-btn"
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{syncing ? 'Synchronizing...' : 'Sync to DynamoDB'}</span>
              </button>
            )}

            <button
              id="aws-db-done-btn"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
