/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, MapPin, AlertCircle, CheckCircle2, 
  Bookmark, Megaphone, ChevronRight, Navigation, ArrowRight, LogIn, Database, Sparkles,
  Mail, Copy, Check, Globe, Trash2, ShieldAlert, Bell, Lock, X
} from 'lucide-react';
import { HeaderToolbar } from './components/HeaderToolbar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { ItemCard } from './components/ItemCard';
import { UploadModal } from './components/UploadModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { CampusMap } from './components/CampusMap';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AdminReportManagement } from './components/AdminReportManagement';
import { NotificationModal } from './components/NotificationModal';
import { 
  CampusNotification, 
  getLocalNotifications, 
  saveLocalNotifications 
} from './app/models/notification.model';
import { 
  Item, 
  ItemCategory, 
  CampusZone, 
  CampusLandmarkPreset,
  SecurityReport,
  SecurityReportStatus,
  ITEM_CATEGORIES, 
  MINSU_VICTORIA_ZONES,
  getInitialCampusLandmarks,
  saveLocalCampusLandmarks,
  getCampusCoverageRadius,
  saveCampusCoverageRadius,
  getLocalSecurityReports,
  saveLocalSecurityReports
} from './app/models/item.model';
import { User, getLocalUsers, saveLocalUsers } from './app/models/user.model';
import { INITIAL_MINSU_ITEMS, INITIAL_SECURITY_REPORTS } from './data/mockItems';
import { isFirebaseConfigured, firebaseConfig } from './firebase/firebaseConfig';
import { 
  saveItemToFirestore, 
  updateItemInFirestore, 
  deleteItemFromFirestore,
  fetchItemsFromFirestore, 
  subscribeToFirestoreItems,
  saveLandmarkToFirestore,
  deleteLandmarkFromFirestore,
  fetchLandmarksFromFirestore,
  subscribeToFirestoreLandmarks,
  saveSecurityReportToFirestore,
  fetchSecurityReportsFromFirestore,
  updateSecurityReportInFirestore,
  subscribeToFirestoreSecurityReports,
  saveUserToFirestore
} from './firebase/firebase';

export default function App() {
  // Application Data & State
  const [items, setItems] = useState<Item[]>(INITIAL_MINSU_ITEMS);
  const [landmarks, setLandmarks] = useState<CampusLandmarkPreset[]>(getInitialCampusLandmarks);
  const [securityReports, setSecurityReports] = useState<SecurityReport[]>(() => {
    const local = getLocalSecurityReports();
    return local && local.length > 0 ? local : INITIAL_SECURITY_REPORTS;
  });
  const [coverageRadius, setCoverageRadius] = useState<number>(getCampusCoverageRadius);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(isFirebaseConfigured());

  // Theme Mode (Dark Mode & Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('minsu_foundit_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('minsu_foundit_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [aboutLanguage, setAboutLanguage] = useState<'both' | 'en' | 'tl'>('both');

  // Authentication & Guest State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('minsu_foundit_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id === 'user-faculty-02' || parsed.id === 'user-staff-03' || parsed.id === 'user-pending-01' || parsed.id === 'user-pending-02') {
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Campus Notifications State (Real-time updates, security flags, approvals, messages)
  const [notifications, setNotifications] = useState<CampusNotification[]>(getLocalNotifications);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    saveLocalNotifications(notifications);
  }, [notifications]);

  // User Accounts State (Local Registry + Realtime sync)
  const [users, setUsers] = useState<User[]>(getLocalUsers);
  const [pendingApprovalAlert, setPendingApprovalAlert] = useState(false);

  // Sync real-time notifications for pending user approvals (crucial for admin)
  useEffect(() => {
    const pendingUsers = users.filter(u => u.approvalStatus === 'pending' || u.isApproved === false);
    if (pendingUsers.length > 0) {
      setNotifications(prev => {
        let updated = [...prev];
        let hasChanges = false;
        pendingUsers.forEach(pu => {
          const exists = updated.some(n => n.targetUserRegistrationId === pu.id);
          if (!exists) {
            hasChanges = true;
            updated = [
              {
                id: `notif-user-reg-${pu.id}`,
                type: 'user_approval_pending',
                title: `👤 Pending Approval: ${pu.firstName} ${pu.lastName}`,
                message: `${pu.email} registered as ${pu.role}. Review and authorize account to permit posting.`,
                timestamp: 'Pending review',
                createdAt: Date.now(),
                isRead: false,
                targetRole: 'admin',
                targetUserRegistrationId: pu.id,
                actionLabel: 'Review User',
                actionTab: 'admin-reports',
              },
              ...updated
            ];
          }
        });
        return hasChanges ? updated : prev;
      });
    }
  }, [users]);

  // Unread notifications calculation
  const unreadNotificationsCount = notifications.filter((n) => {
    if (n.targetRole === 'admin' && currentUser?.role !== 'admin') return false;
    if (n.targetUserId && currentUser && n.targetUserId !== currentUser.id) return false;
    return !n.isRead;
  }).length;

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearReadNotifications = () => {
    setNotifications(prev => prev.filter(n => !n.isRead));
  };

  const handleSelectNotificationAction = (notif: CampusNotification) => {
    if (notif.actionTab === 'admin-reports') {
      if (currentUser?.role === 'admin') {
        setActiveTab('admin-reports');
      } else {
        setAuthPromptMessage('Admin Reports tab requires System Administrator privileges.');
        setIsAuthOpen(true);
      }
    } else if (notif.targetItemId) {
      const item = items.find(it => it.id === notif.targetItemId);
      if (item) {
        setSelectedItem(item);
      }
    }
  };

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found' | 'claimed'>('all');
  const [selectedZone, setSelectedZone] = useState<CampusZone | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
  const [myItemsFilter, setMyItemsFilter] = useState<'all' | 'active' | 'claimed' | 'trash'>('all');

  // Filter items reactively
  const filteredItems = items.filter((item) => {
    // 1. My Items Tab
    if (activeTab === 'my-items') {
      if (!currentUser) return false;
      const isMyItem = item.posterId === currentUser.id || 
                       item.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase()) || 
                       (item.posterEmail && currentUser.email && item.posterEmail.toLowerCase() === currentUser.email.toLowerCase());
      if (!isMyItem) return false;

      // Sub-filters inside My Items
      if (myItemsFilter === 'active' && (item.isTrash || item.status === 'claimed')) return false;
      if (myItemsFilter === 'claimed' && (item.isTrash || item.status !== 'claimed')) return false;
      if (myItemsFilter === 'trash' && !item.isTrash) return false;
      if (myItemsFilter === 'all' && item.isTrash) return false;
    } else if (activeTab === 'admin-reports') {
      // Admin reports view handles its own archive & audit queue
    } else {
      // PUBLIC CAMPUS FEEDS (Home, Lost, Found, Map):
      // REQUIREMENT 4: "the user who posted may be able to move its post to trash, so its not showing in the feed."
      if (item.isTrash) return false;

      // REQUIREMENT 5: "once the item is reunited, we can now remove it from the public feed."
      // Reunited items (claimed) are removed from the public campus feed
      if (item.status === 'claimed' || item.isReunited) return false;

      // Public feed constraint: Hide posts removed by admin
      if (item.isRemoved) return false;

      // Drawer Tab constraints
      if (activeTab === 'found' && item.type !== 'found') return false;
      if (activeTab === 'lost' && item.type !== 'lost') return false;
    }

    // Quick Type pills
    if (typeFilter === 'lost' && item.type !== 'lost') return false;
    if (typeFilter === 'found' && item.type !== 'found') return false;
    if (typeFilter === 'claimed' && item.status !== 'claimed') return false;

    // Category filter
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

    // Campus zone filter
    if (selectedZone && item.location.campusZone !== selectedZone) return false;

    // Search keyword
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchZone = item.location.campusZone.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchZone && !matchCat) return false;
    }

    return true;
  });

  // Group items by MinSU Victoria Campus Zones for "Near My Zone"
  // Exclude trash, admin removed, and reunited items
  const nearZoneCategories: { zone: CampusZone; items: Item[] }[] = [
    'University Library',
    'University Gymnasium',
    'University Canteen',
    'Main Gate & Security Post',
    'Administration Building',
    'OSAS (Student Affairs)'
  ].map((z) => ({
    zone: z as CampusZone,
    items: items.filter((it) => it.location.campusZone === z && !it.isRemoved && !it.isTrash && it.status !== 'claimed' && !it.isReunited)
  })).filter((group) => group.items.length > 0);

  // Guest and Unapproved User Posting Status
  const isGuestOrUnapproved = !currentUser || currentUser.approvalStatus === 'pending' || currentUser.isApproved === false;
  const [showApprovalNoticeModal, setShowApprovalNoticeModal] = useState(false);
  const [alertNoticeBanner, setAlertNoticeBanner] = useState<string | null>(null);

  useEffect(() => {
    if (alertNoticeBanner) {
      const timer = setTimeout(() => setAlertNoticeBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertNoticeBanner]);

  // Require approved account before posting
  const handleOpenUpload = () => {
    if (isGuestOrUnapproved) {
      setAlertNoticeBanner(
        !currentUser
          ? "Wait for account approval to post: You must have an approved account first before reporting lost or found items."
          : "Wait for account approval to post: Your account is currently pending administrator verification."
      );
      setShowApprovalNoticeModal(true);
      return;
    }

    setIsUploadOpen(true);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('minsu_foundit_user', JSON.stringify(user));
    } catch {
      // storage unavailable
    }
    setIsAuthOpen(false);

    // If they were trying to post, seamlessly proceed to upload modal (if approved)
    if (authPromptMessage) {
      setAuthPromptMessage(undefined);
      if (user.approvalStatus === 'pending' || user.isApproved === false) {
        setShowApprovalNoticeModal(true);
      } else {
        setIsUploadOpen(true);
      }
    }
  };

  // Move post to trash handler (Author action)
  const handleTrashItem = async (itemId: string, toTrash: boolean) => {
    const trashedAt = toTrash ? new Date().toISOString() : undefined;
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, isTrash: toTrash, trashedAt } : it))
    );
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({ ...selectedItem, isTrash: toTrash, trashedAt });
    }

    if (isFirebaseConfigured()) {
      await updateItemInFirestore(itemId, {
        isTrash: toTrash,
        trashedAt: toTrash ? trashedAt : (null as any),
      });
    }
  };

  // Admin User Approvals Handlers
  const handleApproveUser = async (userId: string) => {
    const approver = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Administrator';
    const approvedAt = new Date().toISOString().substring(0, 10);

    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          isApproved: true,
          approvalStatus: 'approved' as const,
          approvedBy: approver,
          approvedAt,
          rejectionReason: undefined,
        };
      }
      return u;
    });

    setUsers(updated);
    saveLocalUsers(updated);

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = {
        ...currentUser,
        isApproved: true,
        approvalStatus: 'approved' as const,
        approvedBy: approver,
        approvedAt,
      };
      setCurrentUser(updatedCurrent);
      try {
        localStorage.setItem('minsu_foundit_user', JSON.stringify(updatedCurrent));
      } catch {}
    }

    const targetUser = updated.find((u) => u.id === userId);
    if (targetUser && isFirebaseConfigured()) {
      await saveUserToFirestore(targetUser);
    }
  };

  const handleRejectUser = async (userId: string, reason?: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          isApproved: false,
          approvalStatus: 'rejected' as const,
          rejectionReason: reason || 'Suspended by Administrator',
        };
      }
      return u;
    });

    setUsers(updated);
    saveLocalUsers(updated);

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = {
        ...currentUser,
        isApproved: false,
        approvalStatus: 'rejected' as const,
        rejectionReason: reason,
      };
      setCurrentUser(updatedCurrent);
      try {
        localStorage.setItem('minsu_foundit_user', JSON.stringify(updatedCurrent));
      } catch {}
    }

    const targetUser = updated.find((u) => u.id === userId);
    if (targetUser && isFirebaseConfigured()) {
      await saveUserToFirestore(targetUser);
    }
  };

  // Initialize & sync items & landmarks with Firebase Firestore if configured
  useEffect(() => {
    setIsFirebaseConnected(isFirebaseConfigured());

    if (isFirebaseConfigured()) {
      // 1. Fetch initial items from Firestore
      fetchItemsFromFirestore().then((remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          setItems(remoteItems);
        }
      });

      // 2. Attach realtime snapshot listener for items
      const unsubscribeItems = subscribeToFirestoreItems(
        (remoteItems) => {
          if (remoteItems && remoteItems.length > 0) {
            setItems(remoteItems);
          }
        },
        (err) => {
          console.warn('Realtime sync offline or pending database setup:', err);
        }
      );

      // 3. Fetch initial custom landmarks from Firestore
      fetchLandmarksFromFirestore().then((remoteLandmarks) => {
        if (remoteLandmarks && remoteLandmarks.length > 0) {
          setLandmarks(remoteLandmarks);
          saveLocalCampusLandmarks(remoteLandmarks);
        }
      });

      // 4. Attach realtime snapshot listener for custom landmarks
      const unsubscribeLandmarks = subscribeToFirestoreLandmarks(
        (remoteLandmarks) => {
          if (remoteLandmarks && remoteLandmarks.length > 0) {
            setLandmarks(remoteLandmarks);
            saveLocalCampusLandmarks(remoteLandmarks);
          }
        }
      );

      // 5. Fetch initial security reports from Firestore
      fetchSecurityReportsFromFirestore().then((remoteReports) => {
        if (remoteReports && remoteReports.length > 0) {
          setSecurityReports(remoteReports);
          saveLocalSecurityReports(remoteReports);
        }
      });

      // 6. Attach realtime listener for security reports
      const unsubscribeReports = subscribeToFirestoreSecurityReports(
        (remoteReports) => {
          if (remoteReports && remoteReports.length > 0) {
            setSecurityReports(remoteReports);
            saveLocalSecurityReports(remoteReports);
          }
        }
      );

      return () => {
        if (unsubscribeItems) unsubscribeItems();
        if (unsubscribeLandmarks) unsubscribeLandmarks();
        if (unsubscribeReports) unsubscribeReports();
      };
    }
  }, []);

  // Handle new Security Report submitted by user from ItemDetailModal
  const handleReportPost = async (newReport: SecurityReport) => {
    setSecurityReports((prev) => {
      const updated = [newReport, ...prev.filter((r) => r.id !== newReport.id)];
      saveLocalSecurityReports(updated);
      return updated;
    });

    if (isFirebaseConfigured()) {
      await saveSecurityReportToFirestore(newReport);
    }
  };

  // Handle Admin Security Report status update (Dismiss, Resolve, Remove Post)
  const handleUpdateSecurityReportStatus = async (
    reportId: string,
    status: SecurityReportStatus,
    adminNotes?: string
  ) => {
    const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setSecurityReports((prev) => {
      const updated = prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status,
            adminNotes,
            resolvedAt: nowStr,
            resolvedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Administrator'
          };
        }
        return r;
      });
      saveLocalSecurityReports(updated);
      return updated;
    });

    if (isFirebaseConfigured()) {
      await updateSecurityReportInFirestore(reportId, {
        status,
        adminNotes,
        resolvedAt: nowStr,
        resolvedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Administrator'
      });
    }
  };

  // Handle Admin "Remove Post / Item" action
  const handleRemoveReportedItem = async (itemId: string) => {
    // 1. Mark as removed in local items state so it disappears from public campus feed
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, isRemoved: true } : it))
    );

    // 2. Persist deletion in Firestore if configured
    if (isFirebaseConfigured()) {
      await deleteItemFromFirestore(itemId);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('minsu_foundit_user');
    } catch {
      // storage unavailable
    }
    setActiveTab('home');
    handleResetFilters();
  };

  const handleItemAdded = async (newItem: Item) => {
    // 1. Immediately update UI state
    setItems((prev) => [newItem, ...prev]);

    // 2. Persist to Firebase Firestore if configured
    if (isFirebaseConfigured()) {
      await saveItemToFirestore(newItem);
    }
  };

  const handleMarkClaimed = async (itemId: string, claimedBy?: string) => {
    const claimedDate = new Date().toISOString().substring(0, 10);
    // 1. Immediately update UI state
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: 'claimed', claimedBy: claimedBy || it.claimedBy || 'Verified Owner', claimedDate } : it))
    );
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({ ...selectedItem, status: 'claimed', claimedBy: claimedBy || selectedItem.claimedBy || 'Verified Owner', claimedDate });
    }

    // 2. Persist to Firebase Firestore if configured
    if (isFirebaseConfigured()) {
      await updateItemInFirestore(itemId, { 
        status: 'claimed',
        claimedBy: claimedBy || 'Verified Owner',
        claimedDate
      });
    }
  };

  const handleUpdateItemStatus = async (itemId: string, status: 'claimed' | 'active', claimedBy?: string) => {
    const claimedDate = status === 'claimed' ? new Date().toISOString().substring(0, 10) : undefined;
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { 
        ...it, 
        status, 
        claimedBy: status === 'claimed' ? (claimedBy || 'Verified Owner') : undefined, 
        claimedDate 
      } : it))
    );
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({ 
        ...selectedItem, 
        status, 
        claimedBy: status === 'claimed' ? (claimedBy || 'Verified Owner') : undefined, 
        claimedDate 
      });
    }

    if (isFirebaseConfigured()) {
      await updateItemInFirestore(itemId, { 
        status, 
        claimedBy: status === 'claimed' ? (claimedBy || 'Verified Owner') : (null as any), 
        claimedDate: claimedDate || (null as any) 
      });
    }
  };

  const handleLoginAsAdmin = () => {
    const adminUser: User = {
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
    };
    handleLoginSuccess(adminUser);
  };

  const handleSaveLandmark = async (landmark: CampusLandmarkPreset) => {
    setLandmarks((prev) => {
      const filtered = prev.filter((l) => l.id !== landmark.id);
      const updated = [...filtered, landmark];
      saveLocalCampusLandmarks(updated);
      return updated;
    });

    if (isFirebaseConfigured()) {
      await saveLandmarkToFirestore(landmark);
    }
  };

  const handleDeleteLandmark = async (landmarkId: string) => {
    setLandmarks((prev) => {
      const updated = prev.filter((l) => l.id !== landmarkId);
      saveLocalCampusLandmarks(updated);
      return updated;
    });

    if (isFirebaseConfigured()) {
      await deleteLandmarkFromFirestore(landmarkId);
    }
  };

  const handleUpdateCoverageRadius = (radius: number) => {
    setCoverageRadius(radius);
    saveCampusCoverageRadius(radius);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedZone(null);
    setSelectedCategory('All');
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0A1118] flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased overflow-x-hidden transition-colors duration-200">
      {/* 1. TOP TOOLBAR: MinSU Deep Green (#005A36), hamburger left, user profile / sign in right */}
      <HeaderToolbar
        onToggleMenu={() => setIsDrawerOpen(true)}
        onOpenProfile={() => {
          if (!currentUser) {
            setAuthPromptMessage('Please sign in or register to manage your MinSU account.');
            setIsAuthOpen(true);
          } else {
            setActiveTab('profile');
          }
        }}
        onOpenSignIn={() => {
          setAuthPromptMessage(undefined);
          setIsAuthOpen(true);
        }}
        onOpenFirebaseConfig={() => setIsFirebaseModalOpen(true)}
        currentUser={currentUser}
        isFirebaseConnected={isFirebaseConnected}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin-reports' && currentUser?.role !== 'admin') {
            setAuthPromptMessage('Admin Reports tab is reserved for System Administrators.');
            setIsAuthOpen(true);
            return;
          }
          setActiveTab(tab);
        }}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Side Navigation Drawer (ion-menu) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin-reports' && currentUser?.role !== 'admin') {
            setAuthPromptMessage('Admin Reports tab is reserved for System Administrators.');
            setIsAuthOpen(true);
            return;
          }
          setActiveTab(tab);
        }}
        onOpenUpload={handleOpenUpload}
        onOpenProfile={() => {
          if (!currentUser) {
            setAuthPromptMessage('Please sign in to view your MinSU account.');
            setIsAuthOpen(true);
          } else {
            setActiveTab('profile');
          }
        }}
        onOpenSignIn={() => {
          setAuthPromptMessage(undefined);
          setIsAuthOpen(true);
        }}
        onOpenFirebaseConfig={() => setIsFirebaseModalOpen(true)}
        onSignOut={handleSignOut}
        isFirebaseConnected={isFirebaseConnected}
        theme={theme}
        onToggleTheme={toggleTheme}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6">
        {activeTab === 'profile' ? (
          currentUser ? (
            /* PROFILE & PASSWORD VIEW (Password change is handled inside ProfileView) */
            <ProfileView
              user={currentUser}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                try {
                  localStorage.setItem('minsu_foundit_user', JSON.stringify(updated));
                } catch {}
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                saveLocalUsers(users.map(u => u.id === updated.id ? updated : u));
              }}
              onClose={() => setActiveTab('home')}
            />
          ) : (
            /* GUEST RESTRICTION VIEW - REQUIREMENT 3 */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-6 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                Institutional Sign In Required
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Unregistered guests cannot view or edit an account profile. Please sign in or register with your official <strong className="text-slate-900 dark:text-white">@minsu.edu.ph</strong> university credentials.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthPromptMessage('Sign in with your MinSU institutional account to view and edit your profile.');
                    setIsAuthOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-[#FFC72C] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Back to Home Feed
                </button>
              </div>
            </div>
          )
        ) : activeTab === 'about' ? (
          /* ABOUT US VIEW - OFFICIAL USER CONTENT (ENGLISH & TAGALOG) */
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#005A36] to-[#0B7B48] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-sm relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFC72C] text-[#003620] font-black flex items-center justify-center text-xl shadow-md shrink-0">
                    MF!
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white">About Us: FoundIt!</h1>
                    <p className="text-xs sm:text-sm text-[#C8E6C9] mt-0.5">
                      Mindoro State University · Victoria Campus Student Proposal Platform
                    </p>
                  </div>
                </div>

                {/* Language Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setAboutLanguage('both')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aboutLanguage === 'both'
                        ? 'bg-[#FFC72C] text-[#003620] shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setAboutLanguage('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aboutLanguage === 'en'
                        ? 'bg-[#FFC72C] text-[#003620] shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setAboutLanguage('tl')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aboutLanguage === 'tl'
                        ? 'bg-[#FFC72C] text-[#003620] shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Tagalog
                  </button>
                </div>
              </div>
            </div>

            {/* Versions Grid */}
            <div className={`grid gap-4 sm:gap-6 ${aboutLanguage === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* ENGLISH VERSION */}
              {(aboutLanguage === 'both' || aboutLanguage === 'en') && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#005A36]"></span>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                        English Version
                      </h2>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      EN
                    </span>
                  </div>

                  {/* What it is */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005A36]">
                      What it is
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      FoundIt! is a digital platform and proposed prototype application designed to serve as a solution for reporting and finding lost or found items within Mindoro State University - Victoria Campus.
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Disclaimer:</span>
                    </div>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      This application is created solely for academic purposes (Academic Project). It is not officially owned, operated, or directly connected to the official administration of Mindoro State University, but rather an independent student proposal system.
                    </p>
                  </div>

                  {/* For Contact */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      For Contact
                    </h4>
                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500 w-20">App Name:</span>
                        <span className="font-bold text-[#005A36]">FoundIt! App</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500 w-20">Gmail:</span>
                          <a 
                            href="mailto:founditapp2@gmail.com" 
                            className="font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>founditapp2@gmail.com</span>
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('founditapp2@gmail.com');
                            alert('Copied founditapp2@gmail.com to clipboard!');
                          }}
                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAGALOG VERSION */}
              {(aboutLanguage === 'both' || aboutLanguage === 'tl') && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFC72C]"></span>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                        Tagalog Version
                      </h2>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      TL
                    </span>
                  </div>

                  {/* What it is */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005A36]">
                      What it is
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      Ang FoundIt! ay isang digital na plataporma at proposed prototype application na binuo para magsilbing solusyon sa pag-uulat at paghahanap ng mga nawawala o napulot na gamit sa loob ng Mindoro State University - Victoria Campus.
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Disclaimer:</span>
                    </div>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      Ang aplikasyong ito ay ginawa para lamang sa layunin ng pag-aaral (Academic Project). Ito ay hindi opisyal na pagmamay-ari, pinatatakbo, o direktang konektado sa opisyal na administrasyon ng Mindoro State University, kundi isang independent student proposal system.
                    </p>
                  </div>

                  {/* For Contact */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      For Contact
                    </h4>
                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500 w-20">App Name:</span>
                        <span className="font-bold text-[#005A36]">FoundIt! App</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500 w-20">Gmail:</span>
                          <a 
                            href="mailto:founditapp2@gmail.com" 
                            className="font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>founditapp2@gmail.com</span>
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('founditapp2@gmail.com');
                            alert('Copied founditapp2@gmail.com to clipboard!');
                          }}
                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="px-5 py-2.5 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'found' ? (
          /* DEDICATED FOUND ITEMS TAB */
          <div className="space-y-4 sm:space-y-6">
            {/* Found Items Banner */}
            <div className="bg-gradient-to-r from-[#005A36] to-[#0B7B48] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#FFC72C]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                      Found Items on Campus
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFC72C] text-[#003620] text-xs font-black shrink-0">
                      {items.filter(it => it.type === 'found').length} Found
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#C8E6C9] mt-1">
                    Belongings picked up across MinSU Victoria Campus facilities awaiting verification by owners
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenUpload}
                aria-disabled={isGuestOrUnapproved}
                title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Report a Found Item"}
                className={`px-5 py-2.5 rounded-full font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto whitespace-nowrap ${
                  isGuestOrUnapproved
                    ? 'bg-amber-200/90 text-amber-950 opacity-75 cursor-not-allowed border border-amber-400'
                    : 'bg-[#FFC72C] hover:bg-yellow-300 text-[#003620] cursor-pointer'
                }`}
              >
                {isGuestOrUnapproved ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                <span>Report a Found Item</span>
                {isGuestOrUnapproved && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/10 text-amber-950">
                    Approval Req.
                  </span>
                )}
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="minsu-input-wrapper">
                <div className="minsu-icon-box">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search found items by title, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 ${
                    selectedCategory === 'All'
                      ? 'bg-[#005A36] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Categories
                </button>
                {ITEM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#005A36] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Found Items Cards Grid */}
            <section className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing {items.filter(it => it.type === 'found' && (selectedCategory === 'All' || it.category === selectedCategory) && (!selectedZone || it.location.campusZone === selectedZone) && (!searchQuery.trim() || it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.description.toLowerCase().includes(searchQuery.toLowerCase()))).length} found items
                </span>
                {selectedCategory !== 'All' && (
                  <button onClick={() => setSelectedCategory('All')} className="text-[#005A36] font-bold hover:underline cursor-pointer">
                    Show All
                  </button>
                )}
              </div>

              {items.filter(it => it.type === 'found' && (selectedCategory === 'All' || it.category === selectedCategory) && (!selectedZone || it.location.campusZone === selectedZone) && (!searchQuery.trim() || it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.description.toLowerCase().includes(searchQuery.toLowerCase()))).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 items-stretch">
                  {items.filter(it => it.type === 'found' && (selectedCategory === 'All' || it.category === selectedCategory) && (!selectedZone || it.location.campusZone === selectedZone) && (!searchQuery.trim() || it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.description.toLowerCase().includes(searchQuery.toLowerCase()))).map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    No found items found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No found item reports match your current filter. Try searching for something else or report an item you found.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedZone(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#005A36] text-white text-xs font-bold cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'lost' ? (
          /* DEDICATED LOST ITEMS TAB */
          <div className="space-y-4 sm:space-y-6">
            {/* Lost Items Banner */}
            <div className="bg-gradient-to-r from-[#8D5B00] via-[#A87200] to-[#005A36] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-[#FFC72C]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                      Lost Belongings
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFC72C] text-[#003620] text-xs font-black shrink-0">
                      {items.filter(it => it.type === 'lost').length} Reported Missing
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#FFE082] mt-1">
                    Belongings reported lost across MinSU classrooms, library, canteen, gym, and campus grounds
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenUpload}
                aria-disabled={isGuestOrUnapproved}
                title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Report a Lost Belonging"}
                className={`px-5 py-2.5 rounded-full font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto whitespace-nowrap ${
                  isGuestOrUnapproved
                    ? 'bg-amber-200/90 text-amber-950 opacity-75 cursor-not-allowed border border-amber-400'
                    : 'bg-[#FFC72C] hover:bg-yellow-300 text-[#003620] cursor-pointer'
                }`}
              >
                {isGuestOrUnapproved ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                <span>Report a Lost Belonging</span>
                {isGuestOrUnapproved && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/10 text-amber-950">
                    Approval Req.
                  </span>
                )}
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="minsu-input-wrapper">
                <div className="minsu-icon-box">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search lost items by keyword, item name, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 ${
                    selectedCategory === 'All'
                      ? 'bg-[#005A36] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Categories
                </button>
                {ITEM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#005A36] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lost Items Cards Grid */}
            <section className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing {items.filter(it => it.type === 'lost' && (selectedCategory === 'All' || it.category === selectedCategory) && (!selectedZone || it.location.campusZone === selectedZone) && (!searchQuery.trim() || it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.description.toLowerCase().includes(searchQuery.toLowerCase()))).length} lost reports
                </span>
                {selectedCategory !== 'All' && (
                  <button onClick={() => setSelectedCategory('All')} className="text-[#005A36] font-bold hover:underline cursor-pointer">
                    Show All
                  </button>
                )}
              </div>

              {items.filter(it => it.type === 'lost' && (selectedCategory === 'All' || it.category === selectedCategory) && (!selectedZone || it.location.campusZone === selectedZone) && (!searchQuery.trim() || it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.description.toLowerCase().includes(searchQuery.toLowerCase()))).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 items-stretch">
                  {items.filter(it => it.type === 'lost' && (selectedCategory === 'All' || it.category === selectedCategory) && (!selectedZone || it.location.campusZone === selectedZone) && (!searchQuery.trim() || it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.description.toLowerCase().includes(searchQuery.toLowerCase()))).map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    No lost belongings match your search
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Have you lost something on campus? Report it right away to alert security and fellow students.
                  </p>
                  <button
                    onClick={handleOpenUpload}
                    aria-disabled={isGuestOrUnapproved}
                    title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Post a Lost Report"}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                      isGuestOrUnapproved
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 opacity-75 cursor-not-allowed'
                        : 'bg-[#005A36] text-white hover:bg-[#00472a] cursor-pointer'
                    }`}
                  >
                    {isGuestOrUnapproved ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Post a Lost Report</span>
                    {isGuestOrUnapproved && (
                      <span className="text-[9px] font-black uppercase px-1 rounded bg-black/10">
                        Approval Req.
                      </span>
                    )}
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'my-items' ? (
          /* DEDICATED MY REPORTED ITEMS TAB WITH PLUS ICON IN BELOW MIDDLE */
          <div className="space-y-4 sm:space-y-6 pb-24 relative">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#005A36] via-[#04683F] to-[#0B7B48] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Bookmark className="w-6 h-6 text-[#FFC72C]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                      My Reported Items
                    </h1>
                    {currentUser && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FFC72C] text-[#003620] text-xs font-black shrink-0">
                        {items.filter(it => it.posterId === currentUser.id || it.posterEmail === currentUser.email || it.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase())).length} Reports
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#C8E6C9] mt-1">
                    Manage, track status, or mark your posted lost & found belongings as claimed and resolved
                  </p>
                </div>
              </div>
            </div>

            {!currentUser ? (
              /* Guest prompt card */
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#005A36] flex items-center justify-center mx-auto">
                  <LogIn className="w-7 h-7" />
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Sign in to view your reports
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please sign in with your MinSU institutional account to view and manage your reported lost or found belongings.
                </p>
                <button
                  onClick={() => {
                    setAuthPromptMessage('Sign in to view your reported items');
                    setIsAuthOpen(true);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#005A36] text-white text-xs font-bold hover:bg-[#00472a] transition cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-[#FFC72C]" />
                  <span>Sign In to MinSU Account</span>
                </button>
              </div>
            ) : (
              /* User's Reports Feed */
              <div className="space-y-4">
                {/* Status Toggle Filter */}
                <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <button
                      onClick={() => setMyItemsFilter('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        myItemsFilter === 'all'
                          ? 'bg-[#005A36] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All ({items.filter(it => it.posterId === currentUser.id || it.posterEmail === currentUser.email || it.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase())).length})
                    </button>
                    <button
                      onClick={() => setMyItemsFilter('active')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        myItemsFilter === 'active'
                          ? 'bg-[#005A36] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Active ({items.filter(it => (it.posterId === currentUser.id || it.posterEmail === currentUser.email || it.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase())) && it.status !== 'claimed').length})
                    </button>
                    <button
                      onClick={() => setMyItemsFilter('claimed')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        myItemsFilter === 'claimed'
                          ? 'bg-[#005A36] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Claimed & Resolved ({items.filter(it => (it.posterId === currentUser.id || it.posterEmail === currentUser.email || it.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase())) && it.status === 'claimed').length})
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium px-1">
                    Click any item to view or resolve
                  </span>
                </div>

                {/* List of user items */}
                {items.filter(it => (it.posterId === currentUser.id || it.posterEmail === currentUser.email || it.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase())) && (myItemsFilter === 'all' || (myItemsFilter === 'active' && it.status !== 'claimed') || (myItemsFilter === 'claimed' && it.status === 'claimed'))).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 items-stretch">
                    {items.filter(it => (it.posterId === currentUser.id || it.posterEmail === currentUser.email || it.postedBy.toLowerCase().includes(currentUser.lastName.toLowerCase())) && (myItemsFilter === 'all' || (myItemsFilter === 'active' && it.status !== 'claimed') || (myItemsFilter === 'claimed' && it.status === 'claimed'))).map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Bookmark className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      No reports found in this category
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You haven't posted any lost or found items in this status yet. Tap the button below to create your first report!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CRITICAL: Plus Icon in the Below Middle of this tab */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={handleOpenUpload}
                aria-label="Report New Item"
                aria-disabled={isGuestOrUnapproved}
                title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Report Lost / Found Item"}
                className={`px-6 py-3.5 rounded-full text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-2xl transition whitespace-nowrap group ${
                  isGuestOrUnapproved
                    ? 'bg-amber-200/90 text-amber-950 border-2 border-amber-600 opacity-75 cursor-not-allowed'
                    : 'bg-[#FFC72C] text-[#003620] hover:bg-yellow-300 active:scale-95 border-2 border-[#005A36] cursor-pointer'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#005A36] text-[#FFC72C] flex items-center justify-center group-hover:scale-110 transition">
                  {isGuestOrUnapproved ? <Lock className="w-3.5 h-3.5 text-[#FFC72C]" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                </div>
                <span>Report Lost / Found Item</span>
                {isGuestOrUnapproved && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/10 text-amber-950">
                    Approval Req.
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : activeTab === 'map' ? (
          /* DEDICATED CAMPUS MAP TAB */
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-[#005A36] to-[#0B7B48] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Navigation className="w-6 h-6 text-[#FFC72C]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                    MinSU Victoria Campus Interactive Map
                  </h1>
                  <p className="text-xs sm:text-sm text-[#C8E6C9] mt-1">
                    Tap any campus zone pin to inspect lost and found reports at that facility
                  </p>
                </div>
              </div>

              {selectedZone && (
                <button
                  onClick={() => setSelectedZone(null)}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Clear Selection ({selectedZone})
                </button>
              )}
            </div>

            <CampusMap
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
              items={items}
              onSelectItem={(item) => setSelectedItem(item)}
              currentUser={currentUser}
              landmarks={landmarks}
              coverageRadius={coverageRadius}
              onSaveLandmark={handleSaveLandmark}
              onDeleteLandmark={handleDeleteLandmark}
              onUpdateCoverageRadius={handleUpdateCoverageRadius}
            />

            {/* Items in selected zone or all items */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {selectedZone ? `Reports in ${selectedZone}` : 'All Facility Reports'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedZone ? `Showing items reported near ${selectedZone}` : 'Select a pin on the map to filter by campus facility'}
                  </p>
                </div>
                {selectedZone && (
                  <button
                    onClick={() => setSelectedZone(null)}
                    className="text-xs font-bold text-[#005A36] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                  >
                    Show All Zones
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 items-stretch">
                {(selectedZone ? items.filter(it => it.location.campusZone === selectedZone) : items).map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : activeTab === 'admin-reports' ? (
          /* SYSTEM ADMIN REPORT MANAGEMENT & PDF GENERATOR */
          <AdminReportManagement
            items={items}
            currentUser={currentUser}
            securityReports={securityReports}
            users={users}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onUpdateItemStatus={handleUpdateItemStatus}
            onUpdateSecurityReportStatus={handleUpdateSecurityReportStatus}
            onRemoveReportedItem={handleRemoveReportedItem}
            onSelectItem={(item) => setSelectedItem(item)}
            onNavigateToMap={() => setActiveTab('map')}
            onLoginAsAdmin={handleLoginAsAdmin}
          />
        ) : (
          /* HOME DASHBOARD VIEW (Default Landing Page) */
          <div className="space-y-4 sm:space-y-6">
            {/* Firebase Database Status & Quick Setup Banner */}
            <div className={`p-3 sm:p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition shadow-xs ${
              isFirebaseConnected
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/90 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isFirebaseConnected ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs">
                      {isFirebaseConnected ? 'Firebase Database Connected' : 'Firebase Ready for Database Key'}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isFirebaseConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {isFirebaseConnected ? 'Live Cloud Sync' : 'Configuration File Created'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                    {isFirebaseConnected
                      ? `Syncing active lost & found records with project "${firebaseConfig.projectId}"`
                      : 'Configuration file located at src/firebase/firebaseConfig.ts — click to connect your Firebase Console'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFirebaseModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer transition flex items-center gap-1.5 ${
                  isFirebaseConnected
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'bg-amber-800 text-white hover:bg-amber-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isFirebaseConnected ? 'Manage Database' : 'Connect Firebase'}</span>
              </button>
            </div>

            {/* 1. GREETING BANNER & CLEAN PILL-SHAPED CTA */}
            <div className="bg-gradient-to-br from-[#005A36] via-[#04683F] to-[#0B7B48] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 text-white shadow-sm flex flex-col gap-3.5 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight truncate">
                    {currentUser ? `Hello, ${currentUser.firstName}! 👋` : 'Hello, MinSUan! 👋'}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#C8E6C9] mt-1 flex items-center gap-1.5 font-medium truncate">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFC72C] shrink-0" />
                    <span className="truncate">Browsing in MinSU - Victoria Campus</span>
                  </p>
                </div>

                {/* High-visibility Pill-Shaped CTA Button: Prompts sign-in/approval notice if guest */}
                <button
                  onClick={handleOpenUpload}
                  aria-disabled={isGuestOrUnapproved}
                  title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Report Lost / Found Item"}
                  className={`w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition shrink-0 whitespace-nowrap ${
                    isGuestOrUnapproved
                      ? 'bg-amber-200/90 text-amber-950 opacity-75 cursor-not-allowed border border-amber-400'
                      : 'bg-[#FFC72C] text-[#1E1E1E] hover:bg-[#fed14c] active:scale-95 cursor-pointer shadow-emerald-950/20'
                  }`}
                >
                  {isGuestOrUnapproved ? <Lock className="w-4 h-4 text-amber-950 shrink-0" /> : <Megaphone className="w-4 h-4 text-[#1E1E1E] shrink-0" />}
                  <span>Report Lost / Found Item</span>
                  {isGuestOrUnapproved && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/10 text-amber-950">
                      Approval Req.
                    </span>
                  )}
                </button>
              </div>

              {/* Search Bar Embedded in Greeting Banner */}
              <div className="w-full max-w-2xl mt-0.5 sm:mt-1">
                <div className="minsu-input-wrapper bg-white shadow-sm border-transparent">
                  <div className="minsu-icon-box bg-[#E8F5E9] text-[#005A36] shrink-0">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search calculator, wallet, tumbler, keys, ID, bag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs sm:text-sm placeholder:text-slate-400 min-w-0"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Type Filter Bar - Responsive scrollable flex on mobile, wrap on tablet/desktop */}
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Type Filter Buttons: never overflow, shrink-0 with horizontal scroll */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    if (activeTab !== 'home') setActiveTab('home');
                  }}
                  className={`py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition text-center cursor-pointer shrink-0 whitespace-nowrap ${
                    typeFilter === 'all' && activeTab === 'home'
                      ? 'bg-[#005A36] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({items.length})
                </button>

                <button
                  onClick={() => {
                    setTypeFilter('lost');
                    setActiveTab('home');
                  }}
                  className={`py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    typeFilter === 'lost'
                      ? 'bg-[#FFC72C] text-[#1E1E1E] shadow-xs'
                      : 'bg-[#FFF8E1] text-[#8D5B00] hover:bg-[#ffefc2]'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Lost ({items.filter((i) => i.type === 'lost' && i.status !== 'claimed').length})</span>
                </button>

                <button
                  onClick={() => {
                    setTypeFilter('found');
                    setActiveTab('home');
                  }}
                  className={`py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    typeFilter === 'found'
                      ? 'bg-[#0B7B48] text-white shadow-xs'
                      : 'bg-[#E8F5E9] text-[#005A36] hover:bg-[#d8eed9]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Found ({items.filter((i) => i.type === 'found' && i.status !== 'claimed').length})</span>
                </button>

                <button
                  onClick={() => {
                    setTypeFilter('claimed');
                    setActiveTab('home');
                  }}
                  className={`py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition text-center cursor-pointer shrink-0 whitespace-nowrap ${
                    typeFilter === 'claimed'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Resolved ({items.filter((i) => i.status === 'claimed').length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('map')}
                  className="py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap bg-emerald-50 text-[#005A36] border border-emerald-200 hover:bg-emerald-100"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#005A36]" />
                  <span>Full Map View</span>
                </button>
              </div>

              {/* In-app PWA install prompt */}
              <div className="flex items-center justify-end shrink-0">
                <PWAInstallPrompt />
              </div>
            </div>

            {/* Category Filter Horizontal Scroll: Strict shrink-0 to prevent text squishing */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs scrollbar-none -mx-1 px-1">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition cursor-pointer shrink-0 ${
                  selectedCategory === 'All'
                    ? 'bg-[#005A36] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Categories
              </button>
              {ITEM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#005A36] text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 3. INTERACTIVE CAMPUS MAP WIDGET (Leaflet.js + OpenStreetMap strictly centered on MinSU Main Victoria Campus) */}
            <div className="space-y-2">
              <CampusMap
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
                items={items}
                onSelectItem={(item) => setSelectedItem(item)}
                currentUser={currentUser}
                landmarks={landmarks}
                coverageRadius={coverageRadius}
                onSaveLandmark={handleSaveLandmark}
                onDeleteLandmark={handleDeleteLandmark}
                onUpdateCoverageRadius={handleUpdateCoverageRadius}
              />

              {/* Bottom Light-Green Action Strip with Megaphone Icon */}
              <div
                onClick={handleOpenUpload}
                role="button"
                aria-disabled={isGuestOrUnapproved}
                title={isGuestOrUnapproved ? "Wait for account approval to post / You must have an approved account first before reporting" : "Help a fellow MinSUan retrieve an item"}
                className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl flex items-center justify-between border transition select-none shadow-xs ${
                  isGuestOrUnapproved
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-900 dark:text-amber-200 cursor-not-allowed opacity-80'
                    : 'bg-[#E8F5E9] hover:bg-[#daf0dc] border-emerald-800/10 text-[#005A36] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isGuestOrUnapproved ? 'bg-amber-600 text-white' : 'bg-[#005A36] text-[#FFC72C]'}`}>
                    {isGuestOrUnapproved ? <Lock className="w-3.5 h-3.5" /> : <Megaphone className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs sm:text-sm font-bold truncate">
                    Found an item on campus? Help a fellow MinSUan retrieve it
                  </span>
                </div>
                {isGuestOrUnapproved ? (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 shrink-0">
                    Approval Req.
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#0B7B48] shrink-0 ml-2" />
                )}
              </div>
            </div>

            {/* 2. RECENT CAMPUS POSTS (GRID FEED) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Recent Campus Posts
                  </h2>
                  <p className="text-xs text-slate-500">
                    Showing {filteredItems.length} reports across MinSU Victoria Campus
                  </p>
                </div>
              </div>

              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 items-stretch">
                  {filteredItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    No matching items found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No lost or found reports match your current filter. Try clearing filters or post a new report.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-[#005A36] text-white text-xs font-bold cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </section>

            {/* 4. "NEAR MY ZONE" LIST SECTION: Uniform, mathematically aligned cards */}
            <section className="space-y-3.5 pt-1">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Near My Zone
                </h2>
                <p className="text-xs text-slate-500">
                  Items categorized by MinSU Victoria facilities & college landmarks
                </p>
              </div>

              <div className="space-y-3.5">
                {nearZoneCategories.map((group) => (
                  <div key={group.zone} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-[#0B7B48] shrink-0" />
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {group.zone}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 shrink-0 ml-2">
                        {group.items.length} reported
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="min-h-[84px] sm:min-h-[88px] flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-white border border-slate-200 hover:border-[#0B7B48] transition cursor-pointer select-none"
                        >
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0 bg-slate-200"
                          />
                          <div className="flex-1 min-w-0 h-full flex flex-col justify-between py-0.5">
                            {/* Top line: Badge + Date */}
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                  item.type === 'lost'
                                    ? 'bg-[#FFC72C] text-[#1E1E1E]'
                                    : 'bg-[#0B7B48] text-white'
                                }`}
                              >
                                {item.type}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                                {item.date}
                              </span>
                            </div>

                            {/* Middle line: Item Title */}
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                              {item.title}
                            </h4>

                            {/* Bottom line: Spot Details + Reporter */}
                            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 min-w-0">
                              <span className="text-[#005A36] font-semibold truncate min-w-0">
                                {item.location.specificLocation || item.location.campusZone}
                              </span>
                              <span className="shrink-0 text-slate-400 font-medium">
                                By {item.postedBy.split(' ')[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Upload Item Form Modal */}
      {isUploadOpen && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          currentUser={currentUser}
          landmarks={landmarks}
          onItemAdded={handleItemAdded}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onMarkClaimed={handleMarkClaimed}
          currentUserId={currentUser?.id}
          currentUser={currentUser}
          onReportPost={handleReportPost}
          onTrashItem={handleTrashItem}
          onOpenSignIn={() => {
            setAuthPromptMessage('Please sign in or register with your MinSU institutional account.');
            setIsAuthOpen(true);
          }}
        />
      )}

      {/* Pop-up Notification / Alert Modal for Guest & Unapproved Users */}
      {showApprovalNoticeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={() => setShowApprovalNoticeModal(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl z-10 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 animate-in zoom-in-95 duration-200 text-center">
            {/* Header Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center mx-auto mb-4 shadow-sm border border-amber-300/60 dark:border-amber-700/60">
              <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            {/* Badge */}
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 mb-2">
              Action Restricted · Account Approval Required
            </span>

            {/* Title */}
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug mb-2">
              Wait for Account Approval to Post
            </h3>

            {/* Message Body */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {!currentUser
                ? "You must have an approved account first before reporting lost or found items on MinSU Victoria Campus. Please sign in or register using your MinSU institutional email credentials, and wait for administrator account approval."
                : `Wait for account approval to post: Your MinSU institutional account (${currentUser.email}) is currently awaiting administrator verification. You must have an approved account first before posting lost and found reports. You will receive an in-app notification once approved.`}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {!currentUser ? (
                <>
                  <button
                    onClick={() => {
                      setShowApprovalNoticeModal(false);
                      setAuthPromptMessage('Please sign in or register with your MinSU institutional account to submit reports.');
                      setIsAuthOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <LogIn className="w-4 h-4 text-[#FFC72C]" />
                    <span>Sign In / Register</span>
                  </button>
                  <button
                    onClick={() => setShowApprovalNoticeModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Browse as Guest
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowApprovalNoticeModal(false);
                      setIsNotificationsOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Bell className="w-4 h-4 text-[#FFC72C]" />
                    <span>Check Notification Status</span>
                  </button>
                  <button
                    onClick={() => setShowApprovalNoticeModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    I Understand
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Alert Notice Banner */}
      {alertNoticeBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none animate-in fade-in slide-in-from-top-3">
          <div className="bg-amber-500 text-slate-950 px-4 py-3 rounded-2xl shadow-xl border-2 border-amber-600 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 shrink-0 text-slate-950" />
              <span className="text-xs font-black leading-snug">
                {alertNoticeBanner}
              </span>
            </div>
            <button
              onClick={() => setAlertNoticeBanner(null)}
              className="text-slate-950/80 hover:text-slate-950 cursor-pointer shrink-0"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal (Sign In / Register with MinSU Credentials) */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => {
            setIsAuthOpen(false);
            setAuthPromptMessage(undefined);
          }}
          onLogin={handleLoginSuccess}
          promptMessage={authPromptMessage}
        />
      )}

      {/* Firebase Database Configuration Modal */}
      {isFirebaseModalOpen && (
        <FirebaseConfigModal
          isOpen={isFirebaseModalOpen}
          onClose={() => {
            setIsFirebaseModalOpen(false);
            setIsFirebaseConnected(isFirebaseConfigured());
          }}
        />
      )}

      {/* Real-time Campus Notifications Modal */}
      {isNotificationsOpen && (
        <NotificationModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          currentUser={currentUser}
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onClearReadNotifications={handleClearReadNotifications}
          onSelectNotificationAction={handleSelectNotificationAction}
        />
      )}
    </div>
  );
}
