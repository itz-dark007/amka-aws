import React, { useState } from 'react';
import { ShieldCheck, Eye, Tv, DollarSign, School } from 'lucide-react';
import { ViewMode } from '../types';
import { PricingModal } from './PricingModal';

interface RoleSelectionGatewayProps {
  onSelectRole: (mode: ViewMode) => void;
}

export const RoleSelectionGateway: React.FC<RoleSelectionGatewayProps> = ({ onSelectRole }) => {
  const [showPricingModal, setShowPricingModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors">
      {/* Background decoration subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-12"></div>
      </div>

      {/* Main Centered Gateway Card */}
      <div className="relative w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-[28px] p-8 sm:p-10 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/70 border border-slate-100 dark:border-slate-800/80 transition-all">
        {/* Title & Subtitle matching the screenshot */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Welcome to AMKA
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 font-normal">
            Please select your role to continue
          </p>
        </div>

        {/* The 3 Prominent Role Action Buttons */}
        <div className="space-y-4">
          {/* Button 1: Login as Admin (Green/Teal) */}
          <button
            id="role-btn-admin"
            type="button"
            onClick={() => onSelectRole('admin')}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#00b894] hover:bg-[#00a383] text-white font-semibold text-base sm:text-lg shadow-sm hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-3 cursor-pointer"
          >
            <ShieldCheck className="w-6 h-6 stroke-[2.2] shrink-0" />
            <span>Login as Admin</span>
          </button>

          {/* Button 2: Login as Parent (Slate Grey) */}
          <button
            id="role-btn-parent"
            type="button"
            onClick={() => onSelectRole('parent')}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#e2e8f0] hover:bg-[#cbd5e1] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-base sm:text-lg active:scale-[0.99] transition-all flex items-center justify-center space-x-3 cursor-pointer"
          >
            <Eye className="w-6 h-6 stroke-[2.2] shrink-0" />
            <span>Login as Parent</span>
          </button>

          {/* Button 3: Notice Board View (Opens Campus Display Kiosk view directly) */}
          <button
            id="role-btn-notice-board"
            type="button"
            onClick={() => onSelectRole('kiosk')}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#f8fafc] hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-base sm:text-lg active:scale-[0.99] transition-all flex items-center justify-center space-x-3 cursor-pointer"
          >
            <Tv className="w-6 h-6 stroke-[2] shrink-0" />
            <span>Notice Board View</span>
          </button>
        </div>

        {/* Footer Link matching screenshot: $ View Pricing */}
        <div className="mt-8 pt-2 flex flex-col items-center justify-center text-center">
          <button
            id="btn-view-pricing"
            type="button"
            onClick={() => setShowPricingModal(true)}
            className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>View Pricing</span>
          </button>
        </div>
      </div>

      {/* Institutional Tagline */}
      <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center space-x-2">
        <School className="w-4 h-4 text-slate-400" />
        <span>AMKA Institutional Digital Notice Board &amp; Real-Time Broadcast</span>
      </div>

      {/* Dedicated 3-Tier Modern Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
    </div>
  );
};
