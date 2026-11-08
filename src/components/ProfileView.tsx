import React, { useState } from 'react';
import { 
  User as UserIcon, Mail, Phone, Building, ShieldCheck, 
  Key, Eye, EyeOff, AlertTriangle, Save, CheckCircle2, Trash2, 
  Check, AlertCircle, Edit3, X, Camera, Sparkles, School, Calendar, Lock
} from 'lucide-react';
import { User, UserRole, isValidMinSUEmail, getRoleDisplayName } from '../app/models/user.model';
import { validatePassword } from '../utils/passwordValidation';
import { saveUserToFirestore } from '../firebase/firebase';
import { ConfirmationModal, ConfirmationType } from './ConfirmationModal';
import { AvatarEditorModal } from './AvatarEditorModal';
import { MINSU_COLLEGES_AND_PROGRAMS } from '../data/minsuColleges';
import { 
  formatPhilippinePhoneInput, 
  isValidPhilippinePhone, 
  getPhilippinePhoneError 
} from '../utils/phoneValidation';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onClose?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  onClose,
}) => {
  // Mode: View Profile (read-only default) vs Edit Profile
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>(() => ({
    ...user,
    phone: user.phone ? formatPhilippinePhoneInput(user.phone) : '+63 9',
  }));
  const [isEmailValid, setIsEmailValid] = useState(isValidMinSUEmail(user.email));
  const [phoneError, setPhoneError] = useState<string | null>(() => 
    user.phone ? getPhilippinePhoneError(user.phone) : null
  );

  // Password change state
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Modals state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Generic Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmationType;
    action?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const passwordCriteria = validatePassword(passwordNew);
  const passwordsMatch = passwordNew.length > 0 && passwordNew === passwordConfirm;
  const showMatchNotice = passwordConfirm.length > 0;

  // Check if user strictly modified any profile form field
  const hasProfileChanges = () => {
    const origPhoneFormatted = user.phone ? formatPhilippinePhoneInput(user.phone) : '';
    const currentPhoneFormatted = formData.phone ? formData.phone.trim() : '';

    return (
      formData.firstName.trim() !== user.firstName.trim() ||
      formData.lastName.trim() !== user.lastName.trim() ||
      formData.email.trim() !== user.email.trim() ||
      currentPhoneFormatted !== origPhoneFormatted ||
      formData.role !== user.role ||
      (formData.department || '').trim() !== (user.department || '').trim() ||
      (formData.studentId || '').trim() !== (user.studentId || '').trim()
    );
  };

  const isPhoneValid = isValidPhilippinePhone(formData.phone);
  const isProfileChanged = hasProfileChanges();
  const canSaveProfile = isProfileChanged && isEmailValid && isPhoneValid;

  const handleEmailChange = (val: string) => {
    setFormData({ ...formData, email: val });
    setIsEmailValid(isValidMinSUEmail(val));
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhilippinePhoneInput(val);
    setFormData({ ...formData, phone: formatted });
    setPhoneError(getPhilippinePhoneError(formatted));
  };

  // 1. Request Save Profile Confirmation
  const handleRequestSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveProfile) return;

    setConfirmModal({
      isOpen: true,
      title: 'Save Profile Changes?',
      message: 'Are you sure you want to update your MinSU institutional profile details with these changes?',
      confirmText: 'Save Changes',
      type: 'primary',
      action: async () => {
        onUpdateUser(formData);
        await saveUserToFirestore(formData);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      },
    });
  };

  // 2. Request Cancel Profile Edit Confirmation
  const handleRequestCancelEdit = () => {
    if (hasProfileChanges()) {
      setConfirmModal({
        isOpen: true,
        title: 'Discard Changes?',
        message: 'You have unsaved changes to your profile. Are you sure you want to discard them?',
        confirmText: 'Discard Changes',
        type: 'warning',
        action: () => {
          setFormData({ ...user });
          setIsEditing(false);
        },
      });
    } else {
      setIsEditing(false);
    }
  };

  // 3. Request Password Update Confirmation
  const handleRequestUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordCurrent.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!passwordCriteria.isValid) {
      setPasswordError('New password must have at least 10 characters, letters, numbers, and a special character.');
      return;
    }

    if (passwordNew !== passwordConfirm) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Update Account Password?',
      message: 'Are you sure you want to change your MinSU account password? You will need your new password for future sign-ins.',
      confirmText: 'Update Password',
      type: 'primary',
      action: () => {
        setPasswordSuccess(true);
        setPasswordCurrent('');
        setPasswordNew('');
        setPasswordConfirm('');
        setIsChangingPassword(false);
        setTimeout(() => setPasswordSuccess(false), 3500);
      },
    });
  };

  const handleCancelPasswordChange = () => {
    setPasswordCurrent('');
    setPasswordNew('');
    setPasswordConfirm('');
    setPasswordError('');
    setIsChangingPassword(false);
  };

  // 4. Request Avatar Removal Confirmation
  const handleRequestDeleteAvatar = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Profile Picture?',
      message: 'Are you sure you want to remove your profile picture? Your profile will revert to displaying your institutional initials.',
      confirmText: 'Remove Picture',
      type: 'danger',
      action: async () => {
        const updated = { ...user, avatarUrl: undefined };
        setFormData(updated);
        onUpdateUser(updated);
        await saveUserToFirestore(updated);
        setIsAvatarEditorOpen(false);
      },
    });
  };

  // 5. Apply new avatar picture
  const handleSaveAvatar = async (newAvatarUrl: string | undefined) => {
    const updated = { ...user, avatarUrl: newAvatarUrl };
    setFormData(updated);
    onUpdateUser(updated);
    await saveUserToFirestore(updated);
  };

  // 6. Request Delete Account Confirmation
  const handleRequestDeleteAccount = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete MinSU Account?',
      message: 'This will permanently erase your MinSU FoundIt! account and your posted campus reports. This action cannot be reversed.',
      confirmText: 'Permanently Delete',
      type: 'danger',
      action: () => {
        alert('Account deactivated. Demo session reset.');
        if (onClose) onClose();
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner with Profile Picture & Edit Picture Button */}
      <div className="bg-gradient-to-r from-[#005A36] to-[#0B7B48] rounded-2xl p-4 sm:p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-center sm:text-left">
          {/* Avatar Ring with Camera Trigger */}
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 border-2 border-[#FFC72C] p-1 overflow-hidden shadow-sm mx-auto flex items-center justify-center">
              {formData.avatarUrl ? (
                <img 
                  src={formData.avatarUrl} 
                  alt="Avatar" 
                  className="w-full h-full object-cover rounded-xl" 
                />
              ) : (
                <div className="w-full h-full bg-[#00472a] rounded-xl flex items-center justify-center text-2xl font-bold">
                  {formData.firstName[0]}
                </div>
              )}
            </div>

            {/* Change / Edit Profile Picture Button */}
            <button
              type="button"
              onClick={() => setIsAvatarEditorOpen(true)}
              title="Edit Profile Picture (Upload, Crop, Delete)"
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#FFC72C] text-[#003620] hover:bg-yellow-300 shadow-md flex items-center justify-center cursor-pointer transition active:scale-95 border-2 border-[#005A36]"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-white truncate max-w-full">
                {formData.firstName} {formData.lastName}
              </h1>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-[#FFC72C] text-[#003620] shrink-0">
                {getRoleDisplayName(formData.role)}
              </span>
            </div>
            <p className="text-xs text-[#C8E6C9] mt-1 font-mono truncate">
              {formData.email}
            </p>
            <p className="text-xs text-white/80 mt-0.5">
              Mindoro State University · Victoria Campus
            </p>
          </div>

          <div className="flex items-center gap-2 self-center sm:self-start">
            <button
              type="button"
              onClick={() => setIsAvatarEditorOpen(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Edit Photo</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
              >
                Back to Feed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Institutional Details Section: View Mode vs Edit Mode */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Institutional Profile Information
              </h2>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Changes Saved!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Student & personnel records for Mindoro State University Victoria Campus
            </p>
          </div>

          {/* Edit Profile Button (Shown only for approved accounts) */}
          {(!user.isApproved && user.approvalStatus !== 'approved') ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold self-start sm:self-auto shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Editing Locked (Pending Admin Approval)</span>
            </div>
          ) : !isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Edit Account Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleRequestCancelEdit}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleRequestSaveProfile}
                disabled={!isEmailValid}
                className="px-4 py-1.5 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50 active:scale-95"
              >
                <Save className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>

        {/* Warning banner if account is pending admin approval */}
        {(!user.isApproved && user.approvalStatus !== 'approved') && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-xs font-bold">Account Verification Pending</strong>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                Your account is currently waiting for authorization from the System Administrator. In accordance with university protocol, unregistered and unapproved accounts cannot publish lost/found items or modify institutional details.
              </p>
            </div>
          </div>
        )}

        {/* 1. VIEW MODE: Clean summary cards (no direct input fields) */}
        {!isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Full Name
              </span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {formData.firstName} {formData.lastName}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Institutional Email
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">
                  {formData.email}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                  Verified
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Campus Role
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#005A36] mt-0.5 capitalize block">
                {formData.role} · Victoria Campus
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Contact Phone
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5 block">
                {formData.phone || 'Not provided'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Department / College
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
                {formData.department || 'College of Information Technology'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Student / Employee ID
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5 block">
                {formData.studentId || '2023-VIC-04192'}
              </span>
            </div>
          </div>
        ) : (
          /* 2. EDIT MODE: Interactive Form Inputs (activated after clicking the button) */
          <form onSubmit={handleRequestSaveProfile} className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You are editing your institutional account profile. Click "Save Changes" when finished.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Institutional Email with Domain Enforcement */}
            <div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Institutional MinSU Email *
                </label>
                <span className={`text-[11px] font-semibold truncate ${isEmailValid ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isEmailValid ? '✓ Valid @minsu.edu.ph domain' : '✗ Must end with @minsu.edu.ph'}
                </span>
              </div>
              <div className={`minsu-input-wrapper ${!isEmailValid ? 'border-rose-400' : ''}`}>
                <div className="minsu-icon-box">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="yourname@minsu.edu.ph"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Contact Phone (+63) *</label>
                  {isPhoneValid && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      ✓ Valid PH (+63)
                    </span>
                  )}
                </div>
                <div className={`minsu-input-wrapper ${phoneError && formData.phone ? 'border-rose-400' : ''}`}>
                  <div className="minsu-icon-box">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                  />
                </div>
                {phoneError && formData.phone && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{phoneError}</p>
                )}
              </div>

              {/* Campus Role - Strictly Locked for Registered Users */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Campus Role</label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-600" /> Locked (Registered)
                  </span>
                </div>
                <div className="minsu-input-wrapper bg-slate-100 dark:bg-slate-800/80 opacity-90 cursor-not-allowed">
                  <div className="minsu-icon-box">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  </div>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={`${getRoleDisplayName(formData.role)} · Victoria Campus`}
                    className="cursor-not-allowed font-bold text-slate-700 dark:text-slate-200 select-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Institutional campus role cannot be modified once registered. Contact System Administrator for role reassignments.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Department / College - Strictly Locked for Registered Users */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Department / College
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-600" /> Locked (Registered)
                  </span>
                </div>
                <div className="minsu-input-wrapper bg-slate-100 dark:bg-slate-800/80 opacity-90 cursor-not-allowed">
                  <div className="minsu-icon-box">
                    <Building className="w-4 h-4 text-emerald-700" />
                  </div>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formData.department || 'Administrative / Non-Teaching Unit'}
                    className="cursor-not-allowed font-medium text-slate-700 dark:text-slate-200 select-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  College / Department is permanently locked to protect integrity and ownership across lost & found records.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student / Employee ID</label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 2023-VIC-04192"
                    value={formData.studentId || ''}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2.5">
              {!isProfileChanged ? (
                <span className="text-[11px] text-slate-400 font-medium italic">
                  No changes made to profile fields
                </span>
              ) : !isPhoneValid ? (
                <span className="text-[11px] text-rose-500 font-medium">
                  Enter valid Philippine phone number (+63 9XX XXX XXXX)
                </span>
              ) : (
                <span className="text-[11px] text-emerald-600 font-bold">
                  ✓ Unsaved edits ready to apply
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestCancelEdit}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSaveProfile}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 whitespace-nowrap ${
                    canSaveProfile
                      ? 'bg-[#005A36] text-white hover:bg-[#00472a] cursor-pointer active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                  title={!isProfileChanged ? "No modifications made yet" : "Save Profile Changes"}
                >
                  <Save className="w-4 h-4 text-[#FFC72C]" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Change Password Card with Confirmation Pop-up */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#005A36]" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Security & Password</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MinSU password policy: 10+ characters, letters, numbers, and special characters
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {passwordSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Password Updated!
              </span>
            )}

            {!isChangingPassword && (
              <button
                type="button"
                onClick={() => {
                  setPasswordError('');
                  setIsChangingPassword(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005A36] border border-emerald-200/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Key className="w-3.5 h-3.5 text-[#005A36]" />
                <span>Change Password</span>
              </button>
            )}
          </div>
        </div>

        {!isChangingPassword ? (
          <div className="py-2 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Account password is protected with multi-character institutional criteria.
            </span>
            <button
              type="button"
              onClick={() => {
                setPasswordError('');
                setIsChangingPassword(true);
              }}
              className="text-[#005A36] hover:underline font-bold text-xs cursor-pointer"
            >
              Update credentials →
            </button>
          </div>
        ) : (
          <>
            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleRequestUpdatePassword} className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passwordCurrent}
                    onChange={(e) => setPasswordCurrent(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    className="px-3 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                  <div className="minsu-input-wrapper">
                    <div className="minsu-icon-box">
                      <Key className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min 10 characters"
                      value={passwordNew}
                      onChange={(e) => setPasswordNew(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      className="px-3 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Confirm New Password *</label>
                    {showMatchNotice && (
                      <span className={`text-[10px] font-bold ${passwordsMatch ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {passwordsMatch ? '✓ Matches' : '✗ Does not match'}
                      </span>
                    )}
                  </div>
                  <div className={`minsu-input-wrapper ${showMatchNotice && !passwordsMatch ? 'border-rose-400' : ''}`}>
                    <div className="minsu-icon-box">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
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
              </div>

              {/* Password Criteria Checklist */}
              {passwordNew.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Security Policy:</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>At least 10 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLetter ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.hasLetter ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Contains letters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.hasNumber ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Contains numbers</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Special character (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelPasswordChange}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!passwordCriteria.isValid || !passwordsMatch}
                  className="px-5 py-2.5 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] text-xs font-bold transition disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  Update Password
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold">Danger Zone</h2>
        </div>

        <p className="text-xs text-rose-900 leading-relaxed">
          Permanently delete your MinSU FoundIt! account. All your posted lost & found reports and campus records will be erased.
        </p>

        <button
          type="button"
          onClick={handleRequestDeleteAccount}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Profile Picture Upload & Crop Editor Modal */}
      {isAvatarEditorOpen && (
        <AvatarEditorModal
          isOpen={isAvatarEditorOpen}
          onClose={() => setIsAvatarEditorOpen(false)}
          currentAvatarUrl={formData.avatarUrl}
          userInitials={formData.firstName[0]}
          onSaveAvatar={handleSaveAvatar}
          onRequestDeleteConfirm={handleRequestDeleteAvatar}
        />
      )}

      {/* Critical Actions Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />
    </div>
  );
};
