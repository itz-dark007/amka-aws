import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRealtimeNotices } from './hooks/useRealtimeNotices';
import { Header } from './components/Header';
import { AdminWorkspace } from './components/AdminWorkspace';
import { CampusKioskView } from './components/CampusKioskView';
import { ParentPortal } from './components/ParentPortal';
import { RoleSelectionGateway } from './components/RoleSelectionGateway';
import { CircularModal } from './components/CircularModal';
import { ViewMode, Notice } from './types';
import { deleteNotice } from './lib/api';

function MainApp() {
  // Start with the Role Selection Gateway matching user's requested welcome card
  const [currentMode, setCurrentMode] = useState<ViewMode>('gateway');
  const [adminInitialTab, setAdminInitialTab] = useState<'inventory' | 'create' | 'audit' | 'parents'>('inventory');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const { user, token, canDelete } = useAuth();
  const { notices, departments, connectionStatus, latestLiveEvent, refreshNotices } =
    useRealtimeNotices();

  // Keyboard navigation & escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNotice) {
          setSelectedNotice(null);
        } else if (currentMode === 'kiosk') {
          setCurrentMode('gateway');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNotice, currentMode]);

  // Keep selectedNotice in sync if updated in real-time
  useEffect(() => {
    if (selectedNotice) {
      const fresh = notices.find((n) => n.id === selectedNotice.id);
      if (fresh) setSelectedNotice(fresh);
    }
  }, [notices]);

  // Delete notice from circular viewer modal (allowed for authorized roles)
  const handleDeleteNoticeFromModal = async (notice: Notice) => {
    try {
      setSelectedNotice(null);
      await deleteNotice(notice.id, token);
      refreshNotices();
    } catch (err: any) {
      console.warn('Notice deletion notice:', err?.message || err);
      refreshNotices();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. ROLE SELECTION GATEWAY: "Welcome to AMKA - Please select your role to continue" */}
      {currentMode === 'gateway' ? (
        <RoleSelectionGateway
          onSelectRole={(mode) => {
            if (mode === 'admin') setAdminInitialTab('inventory');
            setCurrentMode(mode);
          }}
        />
      ) : currentMode === 'kiosk' ? (
        /* 2. CAMPUS DISPLAY KIOSK: Dedicated physical TV screen view */
        <CampusKioskView
          notices={notices}
          departments={departments}
          onExitKiosk={() => setCurrentMode('gateway')}
          onSelectNotice={(notice) => setSelectedNotice(notice)}
          connectionStatus={connectionStatus}
        />
      ) : (
        /* 3. ACTIVE PORTAL VIEW: Header + Segregated Role View (Public / Parent / Admin) */
        <>
          {/* Focused Navigation Header without cross-role navigation tabs */}
          <Header
            currentMode={currentMode}
            onModeChange={(mode) => {
              if (mode === 'admin') setAdminInitialTab('inventory');
              setCurrentMode(mode);
            }}
            connectionStatus={connectionStatus}
          />

          {/* Dedicated View: Parent Portal vs Staff Admin Workspace */}
          <main className="flex-1">
            {currentMode === 'parent' && (
              <ParentPortal
                notices={notices}
                departments={departments}
                onSelectNotice={(notice) => setSelectedNotice(notice)}
                onSwitchRole={() => setCurrentMode('gateway')}
              />
            )}

            {currentMode === 'admin' && (
              <AdminWorkspace
                notices={notices}
                departments={departments}
                initialTab={adminInitialTab}
                editingNotice={editingNotice}
                onClearEditingNotice={() => setEditingNotice(null)}
                onNoticeCreated={() => refreshNotices()}
                onNoticeUpdated={() => refreshNotices()}
                onNoticeDeleted={() => refreshNotices()}
                onViewNotice={(notice) => setSelectedNotice(notice)}
              />
            )}
          </main>

          {/* Institutional Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 py-8 px-4 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">AMKA</span>
                <span>•</span>
                <span>Institutional Digital Notice-Board &amp; Broadcast Platform</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-400">
                <button
                  onClick={() => setCurrentMode('gateway')}
                  className="hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Change Role Gateway
                </button>
                <span>•</span>
                <span>Push Engine: SSE (Active)</span>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Circular Document & PDF Viewer Modal */}
      {selectedNotice && (
        <CircularModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
          onNoticeUpdated={(updated) => {
            setSelectedNotice(updated);
            refreshNotices();
          }}
          onEditNotice={(notice) => {
            if (notice.status === 'published') {
              alert(
                'Published notices cannot be edited once broadcast to preserve institutional audit integrity. You can delete the notice if issued in error.'
              );
              return;
            }
            setSelectedNotice(null);
            setEditingNotice(notice);
            setAdminInitialTab('create');
            setCurrentMode('admin');
          }}
          onDeleteNotice={currentMode === 'parent' ? undefined : handleDeleteNoticeFromModal}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
