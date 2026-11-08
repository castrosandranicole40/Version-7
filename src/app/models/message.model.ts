/**
 * MinSU FoundIt! - Real-Time In-App Messaging System
 * Supports targeted, real-time communication between item finders, owners, and campus security
 */

import { CampusNotification, getLocalNotifications, saveLocalNotifications } from './notification.model';
import { isFirebaseConfigured } from '../../firebase/firebaseConfig';
import { saveMessageToFirestore } from '../../firebase/firebase';

export interface InAppMessage {
  id: string;
  itemId: string;
  itemTitle: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderEmail?: string;
  recipientId: string;       // Target recipient user ID
  recipientName: string;     // Target recipient display name
  recipientRole?: string;
  text: string;
  createdAt: number;         // Millisecond timestamp
  formattedTime: string;     // e.g. "10:14 AM"
  isRead: boolean;
}

export const MESSAGES_STORAGE_KEY = 'minsu_in_app_messages_v2';
export const MESSAGE_EVENT_NAME = 'minsu_realtime_message';
const CHAT_CHANNEL_NAME = 'minsu_inapp_chat_v1';

// Seed initial historical messages for demo and testing
export const INITIAL_IN_APP_MESSAGES: InAppMessage[] = [
  {
    id: 'msg-seed-101-1',
    itemId: 'item-minsu-101',
    itemTitle: 'Casio FX-991EX ClassWiz Scientific Calculator',
    senderId: 'user-fac-01',
    senderName: 'Engr. Michael Reyes',
    senderRole: 'Faculty',
    recipientId: 'user-cmadrigal-01',
    recipientName: 'Cristina Madrigal',
    recipientRole: 'Student',
    text: 'Hello! I found this Casio FX-991EX calculator in the 2nd Floor Engineering Reference Section. If it is yours, what are the initials on the back casing sticker?',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    formattedTime: '08:30 AM',
    isRead: true,
  },
  {
    id: 'msg-seed-101-2',
    itemId: 'item-minsu-101',
    itemTitle: 'Casio FX-991EX ClassWiz Scientific Calculator',
    senderId: 'user-cmadrigal-01',
    senderName: 'Cristina Madrigal',
    senderRole: 'Student',
    recipientId: 'user-fac-01',
    recipientName: 'Engr. Michael Reyes',
    recipientRole: 'Faculty',
    text: 'Good morning Sir! Yes, the initials are "J.D." for my classmate Justin Dominguez. I can bring our student IDs to verify!',
    createdAt: Date.now() - 1000 * 60 * 45,
    formattedTime: '09:45 AM',
    isRead: true,
  },
  {
    id: 'msg-seed-101-3',
    itemId: 'item-minsu-101',
    itemTitle: 'Casio FX-991EX ClassWiz Scientific Calculator',
    senderId: 'user-fac-01',
    senderName: 'Engr. Michael Reyes',
    senderRole: 'Faculty',
    recipientId: 'user-cmadrigal-01',
    recipientName: 'Cristina Madrigal',
    recipientRole: 'Student',
    text: 'Understood, Cristina. Please meet me at the University Library front circulation desk during consultation hours (1:00 PM - 3:00 PM).',
    createdAt: Date.now() - 1000 * 60 * 20,
    formattedTime: '10:10 AM',
    isRead: false,
  },
  {
    id: 'msg-seed-102-1',
    itemId: 'item-minsu-102',
    itemTitle: 'Brown Genuine Leather Bifold Wallet with MinSU ID',
    senderId: 'user-stu-02',
    senderName: 'Mary Grace Santos',
    senderRole: 'Student',
    recipientId: 'user-admin-01',
    recipientName: 'Engr. Aris M. Calise',
    recipientRole: 'Admin',
    text: 'Good day Admin! I turned over this leather wallet to the cafeteria cashier manager for safekeeping.',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    formattedTime: 'Yesterday, 3:30 PM',
    isRead: true,
  }
];

export function getLocalMessages(): InAppMessage[] {
  try {
    const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_IN_APP_MESSAGES;
}

export function saveLocalMessages(messages: InAppMessage[]): void {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

/**
 * Sends a message in real-time, persists it locally & to Firestore,
 * and notifies the specific recipient immediately.
 */
export async function sendRealtimeMessage(
  msg: Omit<InAppMessage, 'id' | 'createdAt' | 'formattedTime' | 'isRead'>
): Promise<InAppMessage> {
  const now = Date.now();
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const newMsg: InAppMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    formattedTime,
    isRead: false,
  };

  // 1. Save to local storage
  const currentMessages = getLocalMessages();
  const updatedMessages = [...currentMessages, newMsg];
  saveLocalMessages(updatedMessages);

  // 2. Broadcast via window CustomEvent for the current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(MESSAGE_EVENT_NAME, { detail: newMsg })
    );

    // 3. Broadcast via BroadcastChannel for multi-tab synchronization
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(CHAT_CHANNEL_NAME);
        bc.postMessage(newMsg);
        bc.close();
      }
    } catch {}
  }

  // 4. Automatically generate a real-time CampusNotification specifically targeted to the recipient
  try {
    const existingNotifs = getLocalNotifications();
    const newNotif: CampusNotification = {
      id: `notif-chat-${newMsg.id}`,
      type: 'message_inquiry',
      title: `💬 New Message from ${newMsg.senderName}`,
      message: `"${newMsg.text.slice(0, 75)}${newMsg.text.length > 75 ? '...' : ''}" — Regarding "${newMsg.itemTitle}"`,
      timestamp: 'Just now',
      createdAt: now,
      isRead: false,
      targetRole: 'user',
      targetUserId: newMsg.recipientId, // ONLY the specific recipient user receives this notification!
      targetItemId: newMsg.itemId,
      actionLabel: 'Reply to Message',
      actionTab: 'home',
    };
    saveLocalNotifications([newNotif, ...existingNotifs]);

    // Dispatch notification event for live badges
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('minsu_notification_update', { detail: newNotif })
      );
    }
  } catch (err) {
    console.warn('Failed to dispatch notification for in-app message', err);
  }

  // 5. If Firebase is configured, persist to Firestore
  if (isFirebaseConfigured()) {
    try {
      await saveMessageToFirestore(newMsg);
    } catch (err) {
      console.warn('Firebase message sync failed, local sync active', err);
    }
  }

  return newMsg;
}

/**
 * Mark all messages in a conversation as read for the active user
 */
export function markConversationAsRead(itemId: string, currentUserId: string): void {
  try {
    const all = getLocalMessages();
    let hasChanges = false;
    const updated = all.map((m) => {
      if (m.itemId === itemId && m.recipientId === currentUserId && !m.isRead) {
        hasChanges = true;
        return { ...m, isRead: true };
      }
      return m;
    });
    if (hasChanges) {
      saveLocalMessages(updated);
    }
  } catch {}
}
