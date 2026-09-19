import React, { useState } from 'react';
import {
  Building2,
  Building,
  Star,
  CheckCircle2,
  X,
  Sparkles,
  Check,
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planName: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('Free');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (plan: string) => {
    setSelectedPlan(plan);
    setSuccessToast(`Selected ${plan} plan (${billingCycle === 'annual' ? 'Billed Annually' : 'Billed Monthly'}) successfully!`);
    if (onSelectPlan) onSelectPlan(plan);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  const proPrice = billingCycle === 'annual' ? '₹399' : '₹499';
  const premiumPrice = billingCycle === 'annual' ? '₹1,199' : '₹1,499';

  return (
    <div
      id="pricing-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#050914]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl my-auto py-6 sm:py-8 px-3 sm:px-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          id="btn-close-pricing"
          type="button"
          onClick={onClose}
          className="absolute top-2 right-4 sm:top-4 sm:right-6 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-all z-20 cursor-pointer shadow-lg"
          title="Close pricing modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Subtitle / Header matching screenshot */}
        <div className="text-center mb-6 sm:mb-8 space-y-2">
          <p className="text-sm sm:text-base font-medium tracking-wide text-slate-400">
            Smart Noticeboard for Schools &amp; Colleges
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Predictable Institutional Pricing
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Choose the subscription model tailored for your campus broadcast infrastructure.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-[#091122] border border-slate-800 shadow-inner">
            <button
              id="billing-monthly-btn"
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              id="billing-annual-btn"
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-[#1cd2ad] text-[#071d18] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#071d18] text-[#1cd2ad]">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {successToast && (
          <div className="max-w-md mx-auto mb-6 p-3 bg-teal-500/20 border border-teal-500/40 rounded-2xl flex items-center justify-center space-x-2 text-teal-300 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4 text-teal-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 lg:gap-7 items-stretch">
          {/* ================= CARD 1: FREE ================= */}
          <div className="flex flex-col justify-between rounded-3xl bg-[#091122] border border-slate-800/90 p-7 sm:p-8 shadow-2xl text-white relative transition-transform hover:-translate-y-1 duration-200">
            <div>
              {/* Header Icon + Plan Name */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-500/30 text-[#1cd2ad]">
                  <Building2 className="w-7 h-7 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Free</h3>
                  <p className="text-xs text-slate-400">Starter for small academies</p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-8">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  ₹0
                </span>
                <span className="text-slate-400 text-sm font-medium ml-2">/ month</span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Unlimited admins</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>60 notices / month</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Basic notice board</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Limited storage (100 MB)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Approx. 300-400 students</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              id="plan-btn-free"
              type="button"
              onClick={() => handleSelect('Free')}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base tracking-wide transition-all shadow-md active:scale-98 cursor-pointer bg-[#1cd2ad] hover:bg-[#18bfa0] text-[#071d18]"
            >
              {selectedPlan === 'Free' ? 'Current Plan' : 'Get Started'}
            </button>
          </div>

          {/* ================= CARD 2: PRO (HIGHLIGHTED) ================= */}
          <div className="flex flex-col justify-between rounded-3xl bg-[#1cd2ad] p-7 sm:p-8 shadow-2xl text-slate-950 relative md:-translate-y-2 transition-transform hover:-translate-y-3 duration-200 ring-2 ring-[#1cd2ad]/50">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/30 text-teal-950 text-xs font-black uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Most Popular</span>
              </div>

              {/* Header Icon + Plan Name */}
              <div className="flex items-center space-x-3 mb-6">
                <Star className="w-8 h-8 text-white fill-white/20 stroke-[2.2]" />
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-white">Pro</h3>
                  <p className="text-xs text-teal-950/80 font-medium">Standard for colleges &amp; schools</p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {proPrice}
                </span>
                <span className="text-teal-950/80 text-sm font-semibold ml-2">/ month</span>
              </div>
              <p className="text-xs text-teal-950/70 mb-6 font-semibold">
                {billingCycle === 'annual' ? 'Billed annually at ₹4,788 / year' : 'Billed monthly, cancel anytime'}
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-8 text-sm font-semibold text-teal-950">
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[2.2]" />
                  <span className="text-teal-950">Unlimited admins</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[2.2]" />
                  <span className="text-teal-950">200 notices / month</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[2.2]" />
                  <span className="text-teal-950">Categorized notice board</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[2.2]" />
                  <span className="text-teal-950">Unlocked storage (5 GB)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[2.2]" />
                  <span className="text-teal-950">Priority support</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[2.2]" />
                  <span className="text-teal-950">Ad-free &amp; Parent Verification</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              id="plan-btn-pro"
              type="button"
              onClick={() => handleSelect('Pro')}
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-[#0c826a] font-extrabold text-sm sm:text-base tracking-wide shadow-xl active:scale-98 transition-all cursor-pointer"
            >
              {selectedPlan === 'Pro' ? 'Selected' : 'Choose Pro'}
            </button>
          </div>

          {/* ================= CARD 3: PREMIUM ================= */}
          <div className="flex flex-col justify-between rounded-3xl bg-[#091122] border border-slate-800/90 p-7 sm:p-8 shadow-2xl text-white relative transition-transform hover:-translate-y-1 duration-200">
            <div>
              {/* Header Icon + Plan Name */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-500/30 text-[#1cd2ad]">
                  <Building className="w-7 h-7 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Premium</h3>
                  <p className="text-xs text-slate-400">Large universities &amp; campuses</p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {premiumPrice}
                </span>
                <span className="text-slate-400 text-sm font-medium ml-2">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                {billingCycle === 'annual' ? 'Billed annually at ₹14,388 / year' : 'Billed monthly, cancel anytime'}
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-8 text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Unlimited admins</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Unlimited notices</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Customizable categories</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Unlimited storage</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Inter-app integrations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1cd2ad] shrink-0 stroke-[2]" />
                  <span>Ad-free &amp; dedicated SLA</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              id="plan-btn-premium"
              type="button"
              onClick={() => handleSelect('Premium')}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#1cd2ad] hover:bg-[#18bfa0] text-[#071d18] font-bold text-sm sm:text-base tracking-wide transition-all shadow-md active:scale-98 cursor-pointer"
            >
              {selectedPlan === 'Premium' ? 'Selected' : 'Choose Premium'}
            </button>
          </div>
        </div>

        {/* Institutional FAQ Highlights */}
        <div className="mt-10 p-6 rounded-2xl bg-[#091122]/80 border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
          <div>
            <h4 className="font-bold text-white text-sm mb-1.5">Free for Parents &amp; Students</h4>
            <p className="text-slate-400 leading-relaxed">
              Parents and students never pay to access notifications, download circulars, or confirm receipt acknowledgments.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-1.5">Unlimited Campus TV Screens</h4>
            <p className="text-slate-400 leading-relaxed">
              Every plan supports pairing unlimited physical screens running in full-screen Campus Display Kiosk mode.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-1.5">Zero Data Lock-in</h4>
            <p className="text-slate-400 leading-relaxed">
              Full export of circular logs, audit history, and uploaded PDF documents available anytime with single-click archive.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <span>All plans include real-time push synchronization and TV display kiosk mode. Cancel or upgrade anytime.</span>
        </div>
      </div>
    </div>
  );
};
