import React from 'react';
import { 
  X, Home, AlertCircle, CheckCircle2, Bookmark, 
  Upload, Map, Settings, Info, LogOut, LogIn, User as UserIcon, Database, Sun, Moon,
  FileText, ShieldCheck, Bell
} from 'lucide-react';
import { User } from '../app/models/user.model';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenProfile: () => void;
  onOpenSignIn: () => void;
  onOpenFirebaseConfig: () => void;
  onSignOut: () => void;
  isFirebaseConnected?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeTab,
  onSelectTab,
  onOpenUpload,
  onOpenProfile,
  onOpenSignIn,
  onOpenFirebaseConfig,
  onSignOut,
  isFirebaseConnected,
  theme = 'light',
  onToggleTheme,
  unreadNotificationsCount = 0,
  onOpenNotifications,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Body (ion-menu) */}
      <div className="relative w-full max-w-[280px] sm:max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250">
        {/* MinSU Green Drawer Header */}
        <div className="bg-[#005A36] text-white p-4 sm:p-5 pt-5 border-b border-[#00472a] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#FFC72C] text-[#1E1E1E] font-black flex items-center justify-center text-xs">
                MF!
              </span>
              <span className="font-extrabold text-sm tracking-tight text-white">
                MinSU FoundIt!
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile Card or Guest Sign-in Card */}
          {currentUser ? (
            <div
              onClick={() => {
                onOpenProfile();
                onClose();
              }}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white/10 hover:bg-white/15 cursor-pointer transition border border-white/10 min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0B7B48] border-2 border-[#FFC72C] overflow-hidden flex items-center justify-center text-white font-bold text-sm shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUser.firstName[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white truncate">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-[#FFC72C] text-[#1E1E1E] shrink-0">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#C8E6C9] truncate mt-0.5 font-mono">
                  {currentUser.email}
                </p>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                onOpenSignIn();
                onClose();
              }}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/15 cursor-pointer transition border border-white/15 text-center flex flex-col items-center gap-1"
            >
              <div className="w-8 h-8 rounded-full bg-[#FFC72C] text-[#1E1E1E] flex items-center justify-center mb-0.5">
                <LogIn className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-white">Sign In to MinSU Account</span>
              <p className="text-[10px] text-[#C8E6C9]">Required to post lost or found items</p>
            </div>
          )}
        </div>

        {/* Navigation Links Scrollable List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Campus Navigation
          </div>

          {onOpenNotifications && (
            <button
              onClick={() => {
                onOpenNotifications();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#0B7B48] shrink-0" />
                <span className="truncate">Notifications</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              onSelectTab('home');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4 text-[#0B7B48] shrink-0" />
            <span className="truncate">Home Feed</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('found');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'found'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#0B7B48] shrink-0" />
            <span className="truncate">Found Items</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('lost');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'lost'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-[#B48400] shrink-0" />
            <span className="truncate">Lost Items</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                onOpenSignIn();
              } else {
                onSelectTab('my-items');
              }
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'my-items'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">My Reported Items</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('map');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'map'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Map className="w-4 h-4 text-[#005A36] shrink-0" />
            <span className="truncate">MinSU Campus Map</span>
          </button>

          {currentUser?.role === 'admin' && (
            <>
              <div className="pt-2.5 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#005A36] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#005A36]" />
                  <span>Admin & Governance</span>
                </div>
                <span className="text-[9px] bg-[#FFC72C] text-[#003620] px-1.5 py-0.2 rounded font-black">ADMIN</span>
              </div>

              <button
                onClick={() => {
                  onSelectTab('admin-reports');
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'admin-reports'
                    ? 'bg-[#005A36] text-[#FFC72C] font-bold shadow-xs'
                    : 'text-[#005A36] bg-emerald-50/70 hover:bg-emerald-100 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">Accomplished Logs & PDF</span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white/80 border border-emerald-200 text-[#005A36] shrink-0">
                  Reports
                </span>
              </button>
            </>
          )}

          <div className="pt-2 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Post & Account
          </div>

          {(() => {
            const isGuestOrUnapproved = !currentUser || currentUser.approvalStatus === 'pending' || currentUser.isApproved === false;
            return (
              <button
                onClick={() => {
                  onOpenUpload();
                  onClose();
                }}
                title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Post Lost / Found Item"}
                aria-disabled={isGuestOrUnapproved}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
                  isGuestOrUnapproved
                    ? 'text-slate-600 dark:text-slate-300 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 opacity-70 cursor-not-allowed'
                    : 'text-[#1E1E1E] bg-[#FFC72C] hover:bg-[#fed14c] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="truncate">Post Lost / Found Item</span>
                </div>
                {isGuestOrUnapproved && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 shrink-0">
                    Approval Req.
                  </span>
                )}
              </button>
            );
          })()}

          <button
            onClick={() => {
              if (!currentUser) {
                onOpenSignIn();
              } else {
                onOpenProfile();
              }
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">Account Settings</span>
          </button>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer hover:bg-slate-100 text-slate-700"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#FFC72C] shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span className="truncate">Theme Mode</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 capitalize">
                {theme} Mode
              </span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenFirebaseConfig();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/60 text-[#005A36]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Database className="w-4 h-4 text-[#0B7B48] shrink-0" />
              <span className="truncate font-bold">Firebase Database</span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              isFirebaseConnected 
                ? 'bg-emerald-200 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {isFirebaseConnected ? 'Live' : 'Config'}
            </span>
          </button>

          <div className="pt-2 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            University & Project
          </div>

          <button
            onClick={() => {
              onSelectTab('about');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'about'
                ? 'bg-[#E8F5E9] text-[#005A36] font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">About Us (MinSU Capstone)</span>
          </button>
        </div>

        {/* Footer: Sign In or Sign Out Button */}
        <div className="p-3 border-t border-slate-100 bg-[#F8FAF9] shrink-0">
          {currentUser ? (
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenSignIn();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-[#005A36] bg-[#E8F5E9] hover:bg-[#d8edd9] border border-[#A5D6A7] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#005A36] shrink-0" />
              <span className="truncate">Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
