/**
 * MinSU FoundIt! - Campus Notifications & Alerts System
 */

export type NotificationType = 
  | 'user_approval_pending' 
  | 'account_approved' 
  | 'security_flag' 
  | 'item_found' 
  | 'item_claimed' 
  | 'message_inquiry';

export interface CampusNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // e.g. "Just now", "10m ago", "1h ago"
  createdAt: number; // millisecond timestamp for sorting
  isRead: boolean;
  targetRole?: 'admin' | 'all' | 'user';
  targetUserId?: string;
  targetItemId?: string;
  targetReportId?: string;
  targetUserRegistrationId?: string;
  actionLabel?: string;
  actionTab?: string;
}

export const NOTIFICATIONS_STORAGE_KEY = 'minsu_notifications_v1';

export const INITIAL_NOTIFICATIONS: CampusNotification[] = [
  {
    id: 'notif-admin-01',
    type: 'security_flag',
    title: '🛡️ Security Flag: Suspicious Post Detected',
    message: 'Cristina Madrigal reported item #item-minsu-109 as unauthorized commercial advertisement/spam.',
    timestamp: '25m ago',
    createdAt: Date.now() - 1000 * 60 * 25,
    isRead: false,
    targetRole: 'admin',
    targetReportId: 'sec-rep-101',
    actionLabel: 'Review Flagged Post',
    actionTab: 'admin-reports',
  },
  {
    id: 'notif-student-01',
    type: 'account_approved',
    title: '✅ Account Approved by Administrator',
    message: 'Welcome to MinSU FoundIt! Your institutional account credentials have been verified. You can now post lost/found reports.',
    timestamp: '2h ago',
    createdAt: Date.now() - 1000 * 60 * 120,
    isRead: false,
    targetRole: 'all',
    targetUserId: 'user-cmadrigal-01',
  },
  {
    id: 'notif-item-02',
    type: 'item_found',
    title: '📍 New Item Found at University Library',
    message: 'A Casio FX-991EX Scientific Calculator was turned over at 2nd Floor Reference Table #7.',
    timestamp: '3h ago',
    createdAt: Date.now() - 1000 * 60 * 180,
    isRead: false,
    targetRole: 'all',
    targetItemId: 'item-minsu-101',
    actionLabel: 'View Found Item',
  },
  {
    id: 'notif-claim-03',
    type: 'item_claimed',
    title: '🎉 Item Reunited & Handover Accomplished',
    message: 'MinSU RFID Student ID & PhilHealth Card Holder successfully claimed at Administration Building.',
    timestamp: '1d ago',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    isRead: true,
    targetRole: 'all',
    targetItemId: 'item-minsu-107',
    actionLabel: 'View Log',
  },
  {
    id: 'notif-msg-04',
    type: 'message_inquiry',
    title: '💬 Campus Inquiry on AquaFlask Tumbler',
    message: 'A student inquired regarding verification stickers on the lost Sage Green AquaFlask in University Gymnasium.',
    timestamp: '2d ago',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    isRead: true,
    targetRole: 'all',
    targetItemId: 'item-minsu-103',
  }
];

export function getLocalNotifications(): CampusNotification[] {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_NOTIFICATIONS;
}

export function saveLocalNotifications(notifications: CampusNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch {}
}
