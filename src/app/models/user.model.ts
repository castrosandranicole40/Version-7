/**
 * MinSU FoundIt! - User Interface & Types
 * Restricted to Mindoro State University domain accounts (@minsu.edu.ph)
 */

export type UserRole = 
  | 'student' 
  | 'faculty' 
  | 'staff' 
  | 'admin_staff' 
  | 'non_teaching' 
  | 'admin';

export type UserApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  /** Institutional email strictly restricted to @minsu.edu.ph */
  email: string;
  phone: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  avatarUrl?: string;
  createdAt: string;
  isApproved?: boolean;
  approvalStatus?: UserApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notificationPreferences?: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    notifyOnZoneMatch: boolean;
  };
}

export function getRoleDisplayName(role?: UserRole): string {
  switch (role) {
    case 'student':
      return 'Student';
    case 'faculty':
      return 'Faculty Member';
    case 'admin_staff':
    case 'staff':
      return 'Admin Staff';
    case 'non_teaching':
      return 'Non-Teaching Personnel';
    case 'admin':
      return 'System Administrator';
    default:
      return 'Campus Member';
  }
}

export const LOCAL_STORAGE_USERS_KEY = 'minsu_users_registry_v3';

export const INITIAL_REGISTERED_USERS: User[] = [
  {
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
    approvedBy: 'Mindoro State University Board',
    approvedAt: '2025-06-01',
  },
  {
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
    approvedAt: '2026-08-16',
  }
];

export function getLocalUsers(): User[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Exclude removed legacy mock accounts to ensure clean state
        const sanitized = parsed.filter(u => 
          u.id !== 'user-faculty-02' && 
          u.id !== 'user-staff-03' && 
          u.id !== 'user-pending-01' && 
          u.id !== 'user-pending-02'
        );
        if (sanitized.length > 0) return sanitized;
      }
    }
  } catch (e) {
    // fallback
  }
  return INITIAL_REGISTERED_USERS;
}

export function saveLocalUsers(users: User[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    // fallback
  }
}

/**
 * Validates whether an email belongs to the official MinSU institutional domain
 */
export function isValidMinSUEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith('@minsu.edu.ph') && normalized.length > '@minsu.edu.ph'.length;
}
