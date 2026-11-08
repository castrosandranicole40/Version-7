import React, { useState } from 'react';
import { 
  Bell, BellRing, Check, CheckCheck, Trash2, X, 
  ShieldAlert, UserCheck, CheckCircle2, MapPin, Mail, 
  ExternalLink, Sparkles, Filter, AlertCircle 
} from 'lucide-react';
import { CampusNotification } from '../app/models/notification.model';
import { User } from '../app/models/user.model';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  notifications: CampusNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearReadNotifications: () => void;
  onSelectNotificationAction?: (notification: CampusNotification) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearReadNotifications,
  onSelectNotificationAction,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'admin'>('all');

  const isAdmin = currentUser?.role === 'admin';

  // Filter based on active role and selected filter tab
  const visibleNotifications = notifications.filter((notif) => {
    // If targeted strictly to admin and current user is not admin, hide it
    if (notif.targetRole === 'admin' && !isAdmin) return false;
    
    // If targeted strictly to a specific user and doesn't match current user, hide it
    if (notif.targetUserId && currentUser && notif.targetUserId !== currentUser.id) return false;

    if (filter === 'unread' && notif.isRead) return false;
    if (filter === 'admin' && !(notif.type === 'user_approval_pending' || notif.type === 'security_flag')) return false;

    return true;
  });

  const unreadCount = notifications.filter((n) => {
    if (n.targetRole === 'admin' && !isAdmin) return false;
    if (n.targetUserId && currentUser && n.targetUserId !== currentUser.id) return false;
    return !n.isRead;
  }).length;

  const getNotificationIcon = (type: CampusNotification['type']) => {
    switch (type) {
      case 'user_approval_pending':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'security_flag':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case 'account_approved':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'item_found':
        return (
          <div className="w-8 h-8 rounded-xl bg-green-100 text-[#005A36] dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
        );
      case 'item_claimed':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        );
      case 'message_inquiry':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[85dvh] animate-in zoom-in-95 duration-150 my-auto">
        {/* Header Banner */}
        <div className="bg-[#005A36] text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFC72C] text-[#003620] font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
              <Bell className="w-5 h-5 text-[#003620] fill-[#003620]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Campus Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-[#FFC72C] text-[#003620] text-[10px] font-black px-2 py-0.2 rounded-full shrink-0">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#C8E6C9] truncate">
                {isAdmin ? 'System Administrator Security & Governance Feed' : 'MinSU Victoria Campus Updates & Alerts'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter and Bulk Action Bar */}
        <div className="p-3 sm:px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#005A36] text-[#FFC72C] shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filter === 'unread'
                  ? 'bg-[#005A36] text-[#FFC72C] shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              )}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setFilter('admin')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  filter === 'admin'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40'
                }`}
              >
                <span>🛡️ Admin Alerts</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto text-xs">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                title="Mark all notifications as read"
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-[#005A36] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClearReadNotifications}
              title="Clear all read notifications"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Notifications List */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-2.5">
          {visibleNotifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                No notifications found
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {filter === 'unread' 
                  ? 'All clear! You have read all your campus updates and administrative notices.'
                  : 'You have no notifications right now. Activity and alerts will appear here.'}
              </p>
            </div>
          ) : (
            visibleNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`p-3 sm:p-3.5 rounded-2xl border transition text-left cursor-pointer group ${
                  !notif.isRead
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold leading-tight ${
                        !notif.isRead 
                          ? 'text-slate-900 dark:text-white font-extrabold' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {notif.timestamp}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#0B7B48] shrink-0" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Action button if present */}
                    {notif.actionLabel && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {notif.targetRole === 'admin' ? 'Administrative Action' : 'Campus Update'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notif.id);
                            if (onSelectNotificationAction) {
                              onSelectNotificationAction(notif);
                            }
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#005A36] hover:bg-[#00472a] text-[#FFC72C] text-[11px] font-extrabold flex items-center gap-1 transition shadow-2xs active:scale-95 cursor-pointer"
                        >
                          <span>{notif.actionLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Real-time MinSU Victoria Campus Dispatch</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#005A36] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
