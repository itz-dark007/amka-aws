import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  ExternalLink,
  Building,
  Pin,
  Calendar,
  LogOut,
  Send,
  User,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  ArrowRight,
  School,
  Lock,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ParentUser, Notice, Department } from '../types';
import { loginParentAccount, registerParentAccount, acknowledgeNotice } from '../lib/api';

interface ParentPortalProps {
  notices: Notice[];
  departments: Department[];
  onSelectNotice: (notice: Notice) => void;
  onSwitchRole?: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  notices,
  departments,
  onSelectNotice,
  onSwitchRole,
}) => {
  // Session state
  const [currentParent, setCurrentParent] = useState<ParentUser | null>(() => {
    const saved = localStorage.getItem('amka_parent_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStudentRoll, setLoginStudentRoll] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingNoticeInfo, setPendingNoticeInfo] = useState<{
    parent: ParentUser;
    message: string;
  } | null>(null);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regStudentRoll, setRegStudentRoll] = useState('');
  const [regStudentName, setRegStudentName] = useState('');
  const [regRelationship, setRegRelationship] = useState<'Mother' | 'Father' | 'Guardian'>('Mother');
  const [regDepartment, setRegDepartment] = useState(departments[0]?.name || 'Academic Affairs');
  const [regConsent, setRegConsent] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<{
    parent: ParentUser;
    message: string;
  } | null>(null);

  // Dashboard state for logged in parent
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'parents' | 'exams' | 'safety'>('all');
  const [acknowledgedNotices, setAcknowledgedNotices] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('amka_parent_acks');
    return stored ? JSON.parse(stored) : {};
  });

  // Save parent session
  const saveSession = (parent: ParentUser) => {
    setCurrentParent(parent);
    localStorage.setItem('amka_parent_user', JSON.stringify(parent));
  };

  // Logout
  const handleLogout = () => {
    setCurrentParent(null);
    localStorage.removeItem('amka_parent_user');
    setPendingNoticeInfo(null);
    setLoginError(null);
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError('Please enter the registered parent email address.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    setPendingNoticeInfo(null);

    try {
      const res = await loginParentAccount(loginEmail, loginStudentRoll);
      if (res.status === 'approved' && res.parent) {
        saveSession(res.parent);
      } else if (res.status === 'pending') {
        setPendingNoticeInfo({
          parent: res.parent,
          message: res.message,
        });
      } else if (res.status === 'rejected') {
        setLoginError(res.message);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regStudentRoll.trim() || !regStudentName.trim()) {
      setRegError('Please complete all required fields.');
      return;
    }
    if (!regConsent) {
      setRegError('Please accept the institutional verification consent checkbox.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const res = await registerParentAccount({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        studentRollNo: regStudentRoll.trim(),
        studentName: regStudentName.trim(),
        relationship: regRelationship,
        department: regDepartment,
      });

      setRegSuccess({
        parent: res.parent,
        message: res.message,
      });

      // Clear form
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegStudentRoll('');
      setRegStudentName('');
      setRegConsent(false);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Parent Notice Acknowledgement
  const handleAcknowledgeNotice = async (noticeId: string) => {
    const timestamp = new Date().toLocaleString();
    const next = { ...acknowledgedNotices, [noticeId]: timestamp };
    setAcknowledgedNotices(next);
    localStorage.setItem('amka_parent_acks', JSON.stringify(next));

    try {
      await acknowledgeNotice(noticeId);
    } catch {
      // Non-blocking
    }
  };

  // Filter notices relevant to parents
  const parentNotices = useMemo(() => {
    return notices.filter((n) => {
      // Must be published
      if (n.status !== 'published') return false;

      // Filter by category pill
      if (categoryFilter === 'parents') {
        const isTargeted =
          n.targetAudience.includes('Parents') ||
          n.targetAudience.includes('All Students') ||
          n.tags.some((t) => /parent|guardian|fee|meeting|convocation|academic/i.test(t));
        if (!isTargeted) return false;
      } else if (categoryFilter === 'exams') {
        const isExam =
          n.category === 'Examinations' ||
          n.tags.some((t) => /exam|grade|timetable|admit/i.test(t));
        if (!isExam) return false;
      } else if (categoryFilter === 'safety') {
        const isSafety =
          n.urgency === 'urgent' ||
          n.category === 'Health & Safety' ||
          n.tags.some((t) => /safety|emergency|health|estate|power/i.test(t));
        if (!isSafety) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.department.toLowerCase().includes(q) ||
          n.referenceNumber.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [notices, categoryFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Institutional Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
                <Users className="w-6 h-6" />
              </span>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Parent Portal</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              AMKA Official Parent Portal
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Secure institutional access for parents to view academic circulars, fee deadlines,
              examination schedules, and campus notices. All accounts undergo verification by the
              Registrar Office before activation.
            </p>
          </div>

          {/* If Logged In, show active student card & logout */}
          {currentParent ? (
            <div className="bg-slate-950/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                  {currentParent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm sm:text-base">
                      {currentParent.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-blue-300 font-medium">
                    {currentParent.relationship} of{' '}
                    <strong className="text-white">{currentParent.studentName}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Roll: {currentParent.studentRollNo} • {currentParent.department}
                  </p>
                </div>
              </div>

              <button
                id="parent-logout-btn"
                onClick={handleLogout}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Portal</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-1 shrink-0">
              <button
                id="tab-parent-login"
                onClick={() => {
                  setAuthMode('login');
                  setPendingNoticeInfo(null);
                  setLoginError(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'login'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Parent Login
              </button>
              <button
                id="tab-parent-register"
                onClick={() => {
                  setAuthMode('register');
                  setRegSuccess(null);
                  setRegError(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Parent Registration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== VIEW 1: AUTHENTICATION / REGISTRATION VIEW ==================== */}
      {!currentParent && (
        <div className="max-w-2xl mx-auto w-full">
          {/* Form (Login or Register) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            {authMode === 'login' ? (
              /* LOGIN FORM */
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <Lock className="w-4 h-4" />
                    <span>Parent Authentication</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    Sign In to AMKA Parent Portal
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your registered email and your child's student registration roll number.
                  </p>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <span className="font-bold block">Access Restricted</span>
                      <p>{loginError}</p>
                    </div>
                  </div>
                )}

                {/* PENDING APPROVAL NOTICE CARD */}
                {pendingNoticeInfo && (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                          Application Status: Pending Administrative Verification
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                          Your parent profile for student{' '}
                          <strong className="font-semibold">
                            {pendingNoticeInfo.parent.studentName}
                          </strong>{' '}
                          (Roll: {pendingNoticeInfo.parent.studentRollNo}) was successfully received
                          and is currently waiting for approval from the Academic Registrar.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Admin verification required by Registrar
                      </span>
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        Queue Position: Active Review
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Parent Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="parent-login-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. elena.rostova@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Student Roll / Registration Number (or Contact Phone)
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="parent-login-roll"
                        type="text"
                        value={loginStudentRoll}
                        onChange={(e) => setLoginStudentRoll(e.target.value)}
                        placeholder="e.g. AMKA-2024-CS-042"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Matches against the institutional registrar enrollment roll
                    </span>
                  </div>

                  <button
                    id="parent-submit-login-btn"
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loginLoading ? (
                      <span>Verifying Credentials...</span>
                    ) : (
                      <>
                        <span>Sign In to Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* REGISTRATION FORM */
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <User className="w-4 h-4" />
                    <span>Parent Account Registration</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    Apply for Parent Portal Access
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit your details along with your child's student roll number. Access is
                    granted following administrative verification by the Registrar.
                  </p>
                </div>

                {/* Error Banner */}
                {regError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <p>{regError}</p>
                  </div>
                )}

                {/* Success Banner */}
                {regSuccess && (
                  <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                          Application Submitted Successfully!
                        </h4>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                          Your parent registration for student{' '}
                          <strong>{regSuccess.parent.studentName}</strong> (Roll No:{' '}
                          <span className="font-mono font-bold">{regSuccess.parent.studentRollNo}</span>
                          ) has been assigned tracking ID{' '}
                          <span className="font-mono font-bold">{regSuccess.parent.id}</span>.
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                          Institutional administrators have been notified via live push. You can log
                          in once approved.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail(regSuccess.parent.email);
                          setLoginStudentRoll(regSuccess.parent.studentRollNo);
                          setAuthMode('login');
                          setPendingNoticeInfo({
                            parent: regSuccess.parent,
                            message: 'Application awaiting admin approval.',
                          });
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        Check Approval Status
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Parent Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="reg-parent-name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Dr. Robert Sterling"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Relationship to Student <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="reg-parent-relationship"
                        value={regRelationship}
                        onChange={(e) => setRegRelationship(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Guardian">Legal Guardian</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="reg-parent-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. r.sterling@example.org"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="reg-parent-phone"
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="e.g. +1 (555) 309-8812"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Student Academic Link Section */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center space-x-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span>Enrolled Student Verification Data</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Student Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="reg-student-name"
                          type="text"
                          required
                          value={regStudentName}
                          onChange={(e) => setRegStudentName(e.target.value)}
                          placeholder="e.g. Liam Sterling"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Student Roll / Reg ID <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="reg-student-roll"
                          type="text"
                          required
                          value={regStudentRoll}
                          onChange={(e) => setRegStudentRoll(e.target.value)}
                          placeholder="e.g. AMKA-2025-CS-204"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Academic Department
                      </label>
                      <select
                        id="reg-student-dept"
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Verification Consent Checkbox */}
                  <div className="flex items-start space-x-3 pt-2">
                    <input
                      id="reg-consent-check"
                      type="checkbox"
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <label
                      htmlFor="reg-consent-check"
                      className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer"
                    >
                      I certify that I am the legal parent or guardian of the enrolled student named
                      above. I understand that my registration request requires official approval by
                      the University Academic Registrar before portal access is granted.
                    </label>
                  </div>

                  <button
                    id="parent-submit-reg-btn"
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    {regLoading ? (
                      <span>Transmitting Application...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Registration for Admin Approval</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: APPROVED PARENT DASHBOARD ==================== */}
      {currentParent && (
        <div className="space-y-6">
          {/* Dashboard Control Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="parent-search-circulars"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices, reference codes, fees, exams..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'all', label: 'All Notices' },
                  { id: 'parents', label: 'Parent Advisories' },
                  { id: 'exams', label: 'Exams & Grades' },
                  { id: 'safety', label: 'Safety Alerts' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Student Specific Notice Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Official Circulars &amp; Directives</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {parentNotices.length} notices
                </span>
              </h2>
            </div>

            {parentNotices.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Circulars Matching Search
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your filter or search keywords.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {parentNotices.map((notice) => {
                  const isAcked = Boolean(acknowledgedNotices[notice.id]);

                  return (
                    <div
                      key={notice.id}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 flex flex-col justify-between shadow-xs transition-all hover:shadow-md ${
                        notice.urgency === 'urgent'
                          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                          : notice.isPinned
                          ? 'border-amber-200 dark:border-amber-900/40'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1">
                              <Building className="w-3 h-3" />
                              <span>{notice.department}</span>
                            </span>

                            {notice.isPinned && (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold flex items-center space-x-1">
                                <Pin className="w-3 h-3" />
                                <span>Pinned</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                notice.urgency === 'urgent'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                  : notice.urgency === 'info'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {notice.urgency}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              {notice.referenceNumber}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3
                          onClick={() => onSelectNotice(notice)}
                          className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {notice.title}
                        </h3>

                        {/* Executive Summary */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {notice.summary || notice.content.slice(0, 160) + '...'}
                        </p>

                        {/* Target Audience Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {notice.targetAudience.map((aud, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                            >
                              {aud}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer: Acknowledgement & Full Read Action */}
                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          {isAcked ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Acknowledged by Parent</span>
                            </span>
                          ) : (
                            <button
                              id={`parent-ack-btn-${notice.id}`}
                              onClick={() => handleAcknowledgeNotice(notice.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center space-x-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Acknowledge Notice</span>
                            </button>
                          )}
                        </div>

                        <button
                          id={`parent-view-notice-${notice.id}`}
                          onClick={() => onSelectNotice(notice)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all flex items-center space-x-1"
                        >
                          <span>Full Circular</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
