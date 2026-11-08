import React, { useState } from 'react';
import { 
  X, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, 
  ShieldCheck, AlertCircle, CheckCircle2, School, Sparkles, Check, Phone, Building, User as UserIcon
} from 'lucide-react';
import { User, UserRole, isValidMinSUEmail, getLocalUsers, saveLocalUsers } from '../app/models/user.model';
import { validatePassword } from '../utils/passwordValidation';
import { saveUserToFirestore } from '../firebase/firebase';
import { MINSU_COLLEGES_AND_PROGRAMS } from '../data/minsuColleges';
import { formatPhilippinePhoneInput, isValidPhilippinePhone } from '../utils/phoneValidation';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  initialMode?: 'signin' | 'register';
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  initialMode = 'signin',
  promptMessage,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  
  // Sign-in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('+63 9');
  const [role, setRole] = useState<UserRole>('student');
  const [department, setDepartment] = useState('Bachelor of Science in Information Technology (Main Campus)');
  const [studentId, setStudentId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingApprovalNoticeUser, setPendingApprovalNoticeUser] = useState<User | null>(null);

  // Preset demo accounts for quick testing
  const demoAccounts: { label: string; badge: string; isPending?: boolean; user: User }[] = [
    {
      label: 'Student (Cristina)',
      badge: 'Approved',
      user: {
        id: 'user-cmadrigal-01',
        firstName: 'Cristina',
        lastName: 'Madrigal',
        email: 'cmadrigal@minsu.edu.ph',
        phone: '+63 917 889 4421',
        role: 'student',
        department: 'Bachelor of Science in Information Technology (Main Campus)',
        studentId: '2023-VIC-04192',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        createdAt: '2026-08-15',
        isApproved: true,
        approvalStatus: 'approved',
        approvedBy: 'System Administrator',
      },
    },
    {
      label: 'System Admin',
      badge: 'Admin',
      user: {
        id: 'user-admin-01',
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@minsu.edu.ph',
        phone: '+63 999 555 8822',
        role: 'admin',
        department: 'Office of the System Administrator & Campus Security',
        studentId: 'ADMIN-MAIN-001',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        createdAt: '2025-06-01',
        isApproved: true,
        approvalStatus: 'approved',
      },
    },
  ];

  const passwordCriteria = validatePassword(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword;
  const showPasswordMatchNotice = regConfirmPassword.length > 0;

  const handleQuickLogin = (demoUser: User) => {
    onLogin(demoUser);
    triggerConfetti();
    onClose();
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide your institutional email and password.');
      return;
    }

    if (!isValidMinSUEmail(email.trim())) {
      setErrorMessage('Access restricted: Email must end with @minsu.edu.ph');
      return;
    }

    const localUsers = getLocalUsers();
    const existing = localUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    let authenticatedUser: User;
    if (existing) {
      authenticatedUser = existing;
    } else {
      authenticatedUser = {
        id: `user-${Date.now()}`,
        firstName: email.split('@')[0].split('.')[0] || 'MinSUan',
        lastName: email.split('@')[0].split('.')[1] || 'User',
        email: email.trim().toLowerCase(),
        phone: '+63 917 000 0000',
        role: 'student',
        department: 'Bachelor of Science in Information Technology (Main Campus)',
        studentId: '2026-VIC-09911',
        createdAt: new Date().toISOString().substring(0, 10),
        isApproved: false,
        approvalStatus: 'pending',
      };
      saveLocalUsers([authenticatedUser, ...localUsers]);
    }

    onLogin(authenticatedUser);
    triggerConfetti();
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstName.trim() || !lastName.trim() || !regEmail.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!isValidMinSUEmail(regEmail.trim())) {
      setErrorMessage('Access restricted: Institutional email must end with @minsu.edu.ph');
      return;
    }

    // Strict Password Policy Validation:
    // Minimum 10 characters, numbers, letters, and special characters
    if (!passwordCriteria.hasMinLength) {
      setErrorMessage('Password must be at least 10 characters long.');
      return;
    }
    if (!passwordCriteria.hasLetter) {
      setErrorMessage('Password must contain at least one letter.');
      return;
    }
    if (!passwordCriteria.hasNumber) {
      setErrorMessage('Password must contain at least one number.');
      return;
    }
    if (!passwordCriteria.hasSpecial) {
      setErrorMessage('Password must contain at least one special character (e.g. !@#$%^&*).');
      return;
    }

    // Password confirmation validation
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Password confirmation does not match the entered password.');
      return;
    }

    if (phone.trim() && phone.trim() !== '+63' && !isValidPhilippinePhone(phone)) {
      setErrorMessage('Phone number must strictly follow Philippine format: +63 9XX XXX XXXX');
      return;
    }

    const isAcademic = role === 'student' || role === 'faculty';
    const assignedDept = isAcademic ? department.trim() : 'Administrative / Non-Teaching Unit';

    // REQUIREMENT: Newly registered users MUST be approved by the admin before fully using the app
    const newUser: User = {
      id: `user-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: phone.trim() ? formatPhilippinePhoneInput(phone) : '+63 917 000 0000',
      role,
      department: assignedDept,
      studentId: studentId.trim() || undefined,
      createdAt: new Date().toISOString().substring(0, 10),
      isApproved: false,
      approvalStatus: 'pending',
    };

    // Save to Local Registry & Firebase Firestore if configured
    const currentUsers = getLocalUsers();
    const updatedUsers = [newUser, ...currentUsers.filter((u) => u.email.toLowerCase() !== newUser.email.toLowerCase())];
    saveLocalUsers(updatedUsers);

    try {
      await saveUserToFirestore(newUser);
    } catch {
      // non-blocking
    }

    // Present pending approval confirmation screen
    setPendingApprovalNoticeUser(newUser);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#005A36', '#FFC72C', '#0B7B48', '#ffffff'],
      });
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-[#005A36] text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFC72C] text-[#1E1E1E] font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
              MF!
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                {mode === 'signin' ? 'Sign In to MinSU FoundIt!' : 'Create MinSU Account'}
              </h2>
              <p className="text-[11px] text-[#C8E6C9] truncate">Mindoro State University · Victoria Campus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative notice if prompted because of posting */}
        {promptMessage && (
          <div className="bg-[#FFFDF0] border-b border-[#FFE082] px-4 py-2.5 flex items-center gap-2 text-xs text-[#8D5B00] shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FFC72C]" />
            <span className="font-semibold leading-tight">{promptMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          {/* Sign In vs Register Toggle */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg transition cursor-pointer text-center ${
                mode === 'signin'
                  ? 'bg-white text-[#005A36] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg transition cursor-pointer text-center ${
                mode === 'register'
                  ? 'bg-white text-[#005A36] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {mode === 'signin' ? (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Institutional Email (@minsu.edu.ph) *
                </label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="student.id@minsu.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="px-3 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#FFC72C]" />
                  <span>Sign In with MinSU Credentials</span>
                </button>
              </div>

              {/* Quick Demo Login Presets */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0B7B48]" />
                  <span>One-Click MinSU Demo Accounts:</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {demoAccounts.map((demo) => (
                    <button
                      key={demo.user.id}
                      type="button"
                      onClick={() => handleQuickLogin(demo.user)}
                      className="w-full p-2 rounded-xl bg-[#F8FAF9] hover:bg-[#E8F5E9] border border-slate-200 hover:border-[#0B7B48] flex items-center justify-between text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#005A36] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {demo.user.firstName[0]}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-[#005A36]">
                            {demo.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">
                            {demo.user.email}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#0B7B48] px-2 py-0.5 rounded-full bg-emerald-100 shrink-0">
                        Login
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Santos"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MinSU Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@minsu.edu.ph"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Must be a valid @minsu.edu.ph university address
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Contact Phone (+63)</label>
                    {isValidPhilippinePhone(phone) && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                        ✓ Valid PH
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(formatPhilippinePhoneInput(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campus Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const selectedRole = e.target.value as UserRole;
                      setRole(selectedRole);
                      if (selectedRole !== 'student' && selectedRole !== 'faculty') {
                        setDepartment('Administrative / Non-Teaching Unit');
                      } else {
                        if (department === 'Administrative / Non-Teaching Unit') {
                          setDepartment('Bachelor of Science in Information Technology (Main Campus)');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36] cursor-pointer font-medium"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty Member</option>
                    <option value="admin_staff">Admin Staff</option>
                    <option value="non_teaching">Non-Teaching Personnel</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Department / College {(role === 'student' || role === 'faculty') ? '*' : ''}
                  </label>
                  {role !== 'student' && role !== 'faculty' && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Disabled for Staff
                    </span>
                  )}
                </div>
                <select
                  value={role !== 'student' && role !== 'faculty' ? 'Administrative / Non-Teaching Unit' : department}
                  disabled={role !== 'student' && role !== 'faculty'}
                  onChange={(e) => setDepartment(e.target.value)}
                  required={role === 'student' || role === 'faculty'}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    role !== 'student' && role !== 'faculty'
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-80 font-medium'
                      : 'bg-[#F8FAF9] text-slate-800 border-slate-200 focus:border-[#005A36] cursor-pointer'
                  }`}
                >
                  {role !== 'student' && role !== 'faculty' ? (
                    <option value="Administrative / Non-Teaching Unit">
                      Administrative / Non-Teaching Unit (Auto-Assigned)
                    </option>
                  ) : (
                    MINSU_COLLEGES_AND_PROGRAMS.map((college) => (
                      <optgroup key={college.name} label={college.name}>
                        {college.programs.map((program) => (
                          <option key={program} value={program}>
                            {program}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>
                {role !== 'student' && role !== 'faculty' && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Institutional non-academic personnel do not require an academic program or college.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student / Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. 2024-VIC-0112"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                />
              </div>

              {/* Password Field with Hide/Eye icon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password (min 10 characters)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label={showRegPassword ? "Hide password" : "Show password"}
                    className="px-3 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Confirmation Field with Hide/Eye icon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Confirm Password *
                  </label>
                  {showPasswordMatchNotice && (
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Passwords Match
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Passwords Do Not Match
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className={`minsu-input-wrapper ${showPasswordMatchNotice && !passwordsMatch ? 'border-rose-400' : ''}`}>
                  <div className="minsu-icon-box">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="px-3 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* MinSU Password Security Checklist (10 chars, letters, numbers, special characters) */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Password Requirements:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passwordCriteria.hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>Min. 10 characters</span>
                  </div>

                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLetter ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passwordCriteria.hasLetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>Letters (a-z, A-Z)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passwordCriteria.hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>Numbers (0-9)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passwordCriteria.hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>Special character (!@#$)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!passwordCriteria.isValid || !passwordsMatch}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4 text-[#FFC72C]" />
                  <span>Create MinSU Account</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* REGISTRATION COMPLETED - PENDING ADMIN APPROVAL DIALOG */}
        {pendingApprovalNoticeUser && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col justify-between animate-in fade-in duration-200">
            <div className="space-y-4 my-auto text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
                <ShieldCheck className="w-8 h-8 text-amber-600" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-block mb-1.5">
                  Account Registered · Awaiting Approval
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Welcome, {pendingApprovalNoticeUser.firstName}!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your MinSU institutional registration has been created for <strong className="text-slate-800">{pendingApprovalNoticeUser.email}</strong>.
                </p>
              </div>

              <div className="bg-[#FFFDF0] border border-amber-200/90 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Administrative Verification Policy</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  To protect our university community against spam and fraudulent claims, newly registered accounts require verification and approval by the <strong>System Administrator</strong> before you can post or claim items.
                </p>
                <div className="pt-1.5 border-t border-amber-200/60 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span>Role: <strong>{pendingApprovalNoticeUser.role}</strong></span>
                  <span>Dept: <strong>{pendingApprovalNoticeUser.department}</strong></span>
                  <span>Status: <strong className="text-amber-700">Pending Review</strong></span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                You can browse campus reports right away. A notification will appear once approved.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const userToLog = pendingApprovalNoticeUser;
                  setPendingApprovalNoticeUser(null);
                  onLogin(userToLog);
                  triggerConfetti();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-[#FFC72C] font-extrabold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Continue to Campus Feed (Browse Mode)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
