import React, { useState } from 'react';
import {
  Tv,
  Radio,
  UserCheck,
  LogOut,
  ChevronDown,
  School,
  ShieldCheck,
  Eye,
  ArrowLeftRight,
} from 'lucide-react';
import { ViewMode, User } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onSearchFocus?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  connectionStatus,
}) => {
  const { user, demoUsers, switchPersona, logout } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // If in gateway or kiosk mode, standard header is not rendered
  if (currentMode === 'gateway' || currentMode === 'kiosk') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Context Portal Badge - Clicking returns to Role Selection Gateway */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onModeChange('gateway')}
            title="Return to Welcome / Role Selection"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border border-blue-400/30 group-hover:scale-105 transition-transform">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-black text-xl tracking-tight text-white font-mono">AMKA</span>
                {currentMode === 'parent' && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1 tracking-wider uppercase">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Parent Portal</span>
                  </span>
                )}
                {currentMode === 'admin' && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 tracking-wider uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Staff Workspace</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {currentMode === 'parent' && 'Official Parent & Academic Circulars'}
                {currentMode === 'admin' && 'Notice Management, Governance & Parent Approvals'}
              </p>
            </div>
          </div>

          {/* Right Header Controls: Switch Role Gateway & Role-Specific Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live SSE Pulse indicator */}
            <div
              className={`hidden md:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
              }`}
              title="Real-time push engine connected via Server-Sent Events"
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  connectionStatus === 'connected' ? 'text-emerald-400 animate-pulse' : ''
                }`}
              />
              <span>{connectionStatus === 'connected' ? 'Live Sync' : 'Connecting...'}</span>
            </div>

            {/* Staff Persona Switcher - ONLY visible in Admin Workspace */}
            {currentMode === 'admin' && (
              <div className="relative">
                {user ? (
                  <button
                    id="user-profile-menu-button"
                    onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-medium text-slate-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                      {user.name.charAt(0)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="leading-none text-xs font-semibold text-white truncate max-w-[120px]">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-emerald-400 capitalize">{user.role.replace('_', ' ')}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ) : (
                  <button
                    id="user-login-button"
                    onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium shadow transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Staff Login</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}

                {/* Persona Switcher Dropdown */}
                {showPersonaMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Staff Identity &amp; Permissions
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Switch institutional administrator profiles:
                      </p>
                    </div>

                    <div className="py-1">
                      {demoUsers.map((persona) => {
                        const isCurrent = user?.id === persona.id;
                        return (
                          <button
                            key={persona.id}
                            id={`persona-${persona.id}`}
                            onClick={() => {
                              switchPersona(persona);
                              setShowPersonaMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                              isCurrent ? 'bg-emerald-950/50 text-emerald-300' : 'text-slate-300'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-white">{persona.name}</p>
                              <p className="text-[11px] text-slate-400">{persona.designation}</p>
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                                {persona.role.replace('_', ' ')}
                              </span>
                            </div>
                            {isCurrent && <UserCheck className="w-4 h-4 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prominent Switch Role Gateway Button */}
            <button
              id="btn-switch-role-gateway"
              type="button"
              onClick={() => onModeChange('gateway')}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-xs transition-all active:scale-95"
              title="Return to Role Selection Gateway"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Switch Role</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
