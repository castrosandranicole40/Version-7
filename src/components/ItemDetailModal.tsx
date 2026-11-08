import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, MapPin, Phone, MessageSquare, Flag, 
  Share2, CheckCircle2, Gift, Shield, Send, Trash2, RefreshCw, AlertTriangle,
  Clock, CheckCheck, User as UserIcon, AlertCircle
} from 'lucide-react';
import { Item, SecurityReport, SecurityReportReason } from '../app/models/item.model';
import { User } from '../app/models/user.model';
import confetti from 'canvas-confetti';
import { ConfirmationModal } from './ConfirmationModal';
import { CampusItemMiniMap } from './CampusItemMiniMap';
import { 
  InAppMessage, 
  getLocalMessages, 
  sendRealtimeMessage, 
  markConversationAsRead, 
  MESSAGE_EVENT_NAME 
} from '../app/models/message.model';

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  onMarkClaimed: (itemId: string) => void;
  currentUserId?: string;
  currentUser?: User | null;
  onReportPost?: (report: SecurityReport) => void;
  onTrashItem?: (itemId: string, toTrash: boolean) => void;
  onOpenSignIn?: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onMarkClaimed,
  currentUser,
  onReportPost,
  onTrashItem,
  onOpenSignIn,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [showGuestMessageAlert, setShowGuestMessageAlert] = useState(false);
  const [reportReason, setReportReason] = useState<SecurityReportReason>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Real-Time In-App Messaging State
  const [allMessages, setAllMessages] = useState<InAppMessage[]>(getLocalMessages);
  const [chatInput, setChatInput] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check if current logged-in user is the author of this post
  const isOwner = Boolean(
    currentUser && item && (
      currentUser.id === item.posterId ||
      (currentUser.email && item.posterEmail && currentUser.email.toLowerCase() === item.posterEmail.toLowerCase()) ||
      (item.postedBy && `${currentUser.firstName} ${currentUser.lastName}`.trim().toLowerCase() === item.postedBy.toLowerCase()) ||
      currentUser.role === 'admin'
    )
  );

  const posterId = item?.posterId || (item?.postedBy ? `user-poster-${item.postedBy.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '');
  const posterName = item?.postedBy || '';
  const posterRole = item?.posterRole || 'Reporter';

  // Real-time synchronization across window events, storage changes, and notifications
  useEffect(() => {
    const handleSync = () => {
      setAllMessages(getLocalMessages());
    };
    window.addEventListener(MESSAGE_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('minsu_notification_update', handleSync);
    return () => {
      window.removeEventListener(MESSAGE_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('minsu_notification_update', handleSync);
    };
  }, []);

  // Filter messages specifically belonging to this lost/found item
  const itemMessages = item ? allMessages.filter((m) => m.itemId === item.id) : [];

  // Determine distinct conversation partners who sent/received messages about this item
  const conversationPartners = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string }>();
    itemMessages.forEach((m) => {
      if (currentUser) {
        if (m.senderId !== currentUser.id) {
          map.set(m.senderId, { id: m.senderId, name: m.senderName, role: m.senderRole });
        }
        if (m.recipientId !== currentUser.id) {
          map.set(m.recipientId, { id: m.recipientId, name: m.recipientName, role: m.recipientRole });
        }
      }
    });
    return Array.from(map.values()).filter((p) => p.id && p.id !== currentUser?.id);
  }, [itemMessages, currentUser]);

  // Determine active conversation partner
  const activePartner = isOwner
    ? (conversationPartners.find((p) => p.id === selectedPartnerId) || conversationPartners[0] || {
        id: 'prospective-claimant',
        name: 'Inquiring MinSUan',
        role: 'Student',
      })
    : {
        id: posterId,
        name: posterName,
        role: posterRole,
      };

  // Filter messages strictly for this two-way conversation between currentUser and activePartner
  const conversationMessages = itemMessages.filter((m) => {
    if (!currentUser) return false;
    return (
      (m.senderId === currentUser.id && m.recipientId === activePartner.id) ||
      (m.senderId === activePartner.id && m.recipientId === currentUser.id)
    );
  });

  // Mark conversation as read whenever chat modal is opened or messages update
  useEffect(() => {
    if (showChatModal && currentUser && item) {
      markConversationAsRead(item.id, currentUser.id);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showChatModal, currentUser, item?.id, activePartner?.id, conversationMessages.length]);

  const handleSubmitReport = () => {
    if (!item) return;

    const newReport: SecurityReport = {
      id: `sec-rep-${Date.now()}`,
      itemId: item.id,
      itemTitle: item.title,
      itemCategory: item.category,
      itemType: item.type,
      itemImage: item.images?.[0] || '',
      reportedBy: currentUser 
        ? `${currentUser.firstName} ${currentUser.lastName}` 
        : 'Anonymous MinSUan',
      reporterId: currentUser?.id || 'anon',
      reporterEmail: currentUser?.email || 'unverified@minsu.edu.ph',
      reporterPhone: currentUser?.phone || '',
      reporterRole: currentUser?.role || 'Student',
      reason: reportReason,
      reasonDetails: reportDetails.trim() || undefined,
      reportedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      status: 'Pending Review'
    };

    if (onReportPost) {
      onReportPost(newReport);
    }
    setReportSubmitted(true);
  };

  const isLost = item?.type === 'lost';
  const isClaimed = item?.status === 'claimed';

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || !currentUser || !item || isSending) return;

    setIsSending(true);
    setChatInput('');

    const senderName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
    const recipientId = activePartner.id;
    const recipientName = activePartner.name;
    const recipientRole = activePartner.role;

    try {
      await sendRealtimeMessage({
        itemId: item.id,
        itemTitle: item.title,
        senderId: currentUser.id,
        senderName,
        senderRole: currentUser.role,
        senderEmail: currentUser.email,
        recipientId,
        recipientName,
        recipientRole,
        text: text.trim(),
      });
      // Synchronize state immediately
      setAllMessages(getLocalMessages());
    } finally {
      setIsSending(false);
    }
  };

  const handleClaimItem = () => {
    if (currentUser && (currentUser.approvalStatus === 'pending' || currentUser.isApproved === false)) {
      alert('Account Approval Required: Your account is pending verification by the System Administrator. Newly registered accounts cannot mark items as claimed or reunited until approved.');
      return;
    }
    setShowClaimConfirm(true);
  };

  const executeClaim = () => {
    setShowClaimConfirm(false);
    if (item) {
      onMarkClaimed(item.id);
    }
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#005A36', '#0B7B48', '#FFC72C', '#ffffff'],
      });
    } catch {
      // fallback
    }
  };

  const handleShare = () => {
    if (!item) return;

    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: `MinSU FoundIt! Report: ${item.title} at ${item.location.campusZone}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200 my-auto">
        {/* Header Bar */}
        <div className="bg-[#005A36] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-[#FFC72C] text-[#003620] font-black flex items-center justify-center text-xs shrink-0">
              MF!
            </span>
            <span className="text-sm font-bold text-white truncate">Item Details & Actions</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              title="Share listing"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trashed Item Status Banner */}
        {item.isTrash && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Trash2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">This post was moved to Trash and is hidden from public feed.</span>
            </div>
            {isOwner && onTrashItem && (
              <button
                type="button"
                onClick={() => {
                  onTrashItem(item.id, false);
                  onClose();
                }}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[11px] cursor-pointer shrink-0"
              >
                Restore to Feed
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Main Gallery Display */}
          <div className="relative aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden shrink-0">
            <img
              src={item.images[activeImageIdx] || item.images[0]}
              alt={item.title}
              className="w-full h-full object-cover"
            />

            {/* Badges Overlay */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
              {isClaimed ? (
                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-slate-900/80 text-white border border-white/20 backdrop-blur-md shadow-xs">
                  Claimed & Resolved
                </span>
              ) : isLost ? (
                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#FFF8E1] text-[#8D5B00] border border-[#FFE082] shadow-xs">
                  Lost Item
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#E8F5E9] text-[#005A36] border border-[#A5D6A7] shadow-xs">
                  Found Item
                </span>
              )}
            </div>

            {/* Multi-photo switcher */}
            {item.images.length > 1 && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                {item.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                      activeImageIdx === i ? 'bg-[#FFC72C] scale-125' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Reward Alert Banner if present */}
          {item.reward && !isClaimed && (
            <div className="bg-[#FFFDF0] border-2 border-[#FFC72C] rounded-xl p-3 sm:p-3.5 flex items-center gap-3 text-amber-900 shadow-xs">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#FFC72C] text-[#003620] flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8D5B00] block">
                  Reward Offered
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {item.reward}
                </p>
              </div>
            </div>
          )}

          {/* Title & Category Row */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 flex-wrap">
              <span className="font-semibold text-emerald-800">{item.category}</span>
              <span>·</span>
              <span>Reported {item.date}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              {item.title}
            </h1>
          </div>

          {/* Campus Location Card with Coordinates */}
          {/* Campus Location Card with Coordinates and Interactive Leaflet Mini-Map */}
          <div className="bg-[#F8FAF9] border border-emerald-900/10 rounded-xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E8F5E9] text-[#005A36] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#005A36] block">
                  Reported Campus Zone
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {item.location.campusZone}
                </h3>
                {item.location.specificLocation && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {item.location.specificLocation}
                  </p>
                )}
              </div>
            </div>

            {/* Embedded Interactive Leaflet Mini-Map */}
            <CampusItemMiniMap item={item} />

            <div className="pt-2 border-t border-slate-200/80 flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500 font-mono">
              <span>MinSU Victoria Campus · Alcate</span>
              <span>{item.location.lat.toFixed(4)}° N, {item.location.lng.toFixed(4)}° E</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description & Details
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200">
              {item.description}
            </p>
          </div>

          {/* Reporter Profile Lockup */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#005A36] text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                {item.postedBy[0]}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block leading-tight">Reported by</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.postedBy}</span>
                  {item.posterRole && (
                    <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                      {item.posterRole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="text-xs text-slate-600 font-mono font-semibold self-start sm:self-auto">
              {item.contact}
            </span>
          </div>

          {/* Primary Action Buttons: Always 2-column with responsive text */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
            <button
              onClick={() => setShowCallModal(true)}
              className="py-2.5 sm:py-3 px-3 rounded-xl bg-[#E8F5E9] text-[#005A36] hover:bg-[#d8edd9] border border-[#A5D6A7] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Call Contact</span>
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  setShowGuestMessageAlert(true);
                  return;
                }
                setShowChatModal(true);
              }}
              className="py-2.5 sm:py-3 px-3 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 text-[#FFC72C] shrink-0" />
              <span>In-App Message</span>
            </button>
          </div>

          {/* Mark Claimed, Move to Trash, or Report Listing */}
          <div className="pt-2 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 text-xs border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              {!isClaimed ? (
                <button
                  onClick={handleClaimItem}
                  className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mark as Claimed / Returned</span>
                </button>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Item successfully reunited
                </span>
              )}

              {/* Author Action: Move post to trash to remove from public feed */}
              {isOwner && onTrashItem && (
                <button
                  type="button"
                  onClick={() => setShowTrashConfirm(true)}
                  className={`font-bold flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg transition ${
                    item.isTrash 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                  title={item.isTrash ? "Restore this item to public feed" : "Move to Trash (remove from public feed)"}
                >
                  {item.isTrash ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Restore to Feed</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Move to Trash</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="text-slate-400 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer self-start xs:self-auto"
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span>Report to Security</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time In-App Chat Modal Overlay */}
      {showChatModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
          <div onClick={() => setShowChatModal(false)} className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col h-[560px] max-h-[92dvh] animate-in zoom-in-95 border border-slate-200">
            {/* Chat Header: Verified Sender & Recipient Identity */}
            <div className="bg-[#005A36] text-white p-3.5 sm:p-4 shrink-0 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                    Chat with {activePartner.name}
                  </h3>
                  {activePartner.role && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#FFC72C] text-[#003620] uppercase shrink-0">
                      {activePartner.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#C8E6C9] truncate">
                  <span className="truncate">Re: {item.title}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#FFC72C] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C] animate-pulse" />
                    <span>Real-Time</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 cursor-pointer text-white"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Partner Switcher (When item poster receives inquiries from multiple MinSUans) */}
            {isOwner && conversationPartners.length > 1 && (
              <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
                <span className="font-bold text-[#005A36] text-[10px] uppercase shrink-0">Inquiries:</span>
                {conversationPartners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition shrink-0 cursor-pointer ${
                      activePartner.id === partner.id
                        ? 'bg-[#005A36] text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-emerald-100 border border-slate-200'
                    }`}
                  >
                    {partner.name}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Prompt Presets */}
            <div className="p-2 bg-[#F8FAF9] border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[10px] sm:text-[11px] shrink-0">
              <button
                onClick={() => handleSendMessage(isOwner ? "Hello! Are you at campus right now?" : "Hi! I think this item belongs to me.")}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 rounded-full whitespace-nowrap font-medium cursor-pointer"
              >
                {isOwner ? '"On campus now?"' : '"This is mine!"'}
              </button>
              <button
                onClick={() => handleSendMessage("Can we meet at the University Library front desk?")}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 rounded-full whitespace-nowrap font-medium cursor-pointer"
              >
                "Meet at Library?"
              </button>
              <button
                onClick={() => handleSendMessage(isOwner ? "Please bring your MinSU Student ID to verify." : "I have proof and photos of ownership.")}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 rounded-full whitespace-nowrap font-medium cursor-pointer"
              >
                {isOwner ? '"Bring Student ID"' : '"I have proof"'}
              </button>
            </div>

            {/* Messages Feed: Shows exact text sent from verified sender to recipient */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50">
              {conversationMessages.length > 0 ? (
                conversationMessages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-extrabold text-slate-500">
                          {isMe ? 'You' : `${m.senderName} (${m.senderRole || 'MinSUan'})`}
                        </span>
                        {!isMe && (
                          <span className="text-[9px] text-emerald-800 bg-emerald-100 px-1 rounded font-semibold">
                            Sender
                          </span>
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                          isMe
                            ? 'bg-[#005A36] text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{m.formattedTime}</span>
                        {isMe && (
                          <span className="ml-1 text-[9px] font-bold text-emerald-700">
                            {m.isRead ? 'Read ✓✓' : 'Delivered ✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#005A36] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Real-Time Direct Conversation
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                    {isOwner
                      ? `No prior messages yet from ${activePartner.name}. You can send an update or verification question below.`
                      : `Send a direct, verified inquiry to ${activePartner.name}. Messages are delivered in real time with institutional sender identity.`}
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder={`Message ${activePartner.name}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                disabled={isSending}
                className="flex-1 px-3 py-2 bg-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0B7B48]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !chatInput.trim()}
                className="p-2 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] disabled:opacity-50 transition cursor-pointer shrink-0"
                title="Send real-time message"
              >
                {isSending ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                ) : (
                  <Send className="w-4 h-4 text-[#FFC72C]" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest In-App Messaging Restriction Alert Modal */}
      <ConfirmationModal
        isOpen={showGuestMessageAlert}
        onClose={() => setShowGuestMessageAlert(false)}
        onConfirm={() => {
          setShowGuestMessageAlert(false);
          if (onOpenSignIn) onOpenSignIn();
        }}
        title="Sign In Required for In-App Messaging"
        message="You must be signed in with your MinSU institutional account to send and receive real-time messages. This guarantees that messages reach the right verified recipient and maintain campus accountability."
        confirmText="Sign In / Register"
        cancelText="Cancel"
        type="primary"
      />

      {/* Simulated Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div onClick={() => setShowCallModal(false)} className="fixed inset-0 bg-slate-950/70" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-2xl z-10 animate-in zoom-in-95">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#E8F5E9] text-[#005A36] flex items-center justify-center mx-auto">
              <Phone className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Contact {item.postedBy}</h3>
              <p className="text-lg sm:text-xl font-extrabold text-[#005A36] font-mono mt-1">
                {item.contact}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Mindoro State University Victoria Campus directory listing.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={`tel:${item.contact}`}
                className="w-full py-2.5 rounded-xl bg-[#005A36] text-white font-bold text-xs flex items-center justify-center gap-2 block"
              >
                <Phone className="w-4 h-4" />
                <span>Dial Now</span>
              </a>
              <button
                onClick={() => setShowCallModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div onClick={() => setShowReportModal(false)} className="fixed inset-0 bg-slate-950/70" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 space-y-3 sm:space-y-4 shadow-2xl z-10 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Shield className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Report to MinSU System Admin & Security</h3>
                <p className="text-[11px] text-slate-500">Flag listing for review, spam cleanup, or unauthorized advertisement</p>
              </div>
            </div>

            {!reportSubmitted ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Select the reason why this item/post violates MinSU campus policies:
                </p>
                <div className="space-y-1.5 text-xs">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    reportReason === 'spam' 
                      ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="reason"
                      checked={reportReason === 'spam'}
                      onChange={() => setReportReason('spam')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">📢 Spam or Unauthorized Advertisement</span>
                      <span className="text-[11px] text-slate-500">Selling vape pods, commercial ads, money loan promos, unrelated goods</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    reportReason === 'fake_claim' 
                      ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="reason"
                      checked={reportReason === 'fake_claim'}
                      onChange={() => setReportReason('fake_claim')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">⚠️ False Claim / Suspicious Ownership</span>
                      <span className="text-[11px] text-slate-500">Fake report, fraudulent claiming attempt, non-existent campus item</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    reportReason === 'inappropriate' 
                      ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="reason"
                      checked={reportReason === 'inappropriate'}
                      onChange={() => setReportReason('inappropriate')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">🚫 Inappropriate Image or Remarks</span>
                      <span className="text-[11px] text-slate-500">Offensive photo, profane language, harassment, or cyberbullying</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    reportReason === 'duplicate' 
                      ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="reason"
                      checked={reportReason === 'duplicate'}
                      onChange={() => setReportReason('duplicate')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">📑 Duplicate or Outdated Listing</span>
                      <span className="text-[11px] text-slate-500">Item was already handed over to security or repeatedly posted</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Additional Details / Explanation (Optional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specify why this post should be removed or reviewed by admin..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      setReportDetails('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Submit Report to Admin
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Security Report Submitted!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Your report has been dispatched to the MinSU System Administrator & Campus Security queue for immediate review and action.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportSubmitted(false);
                    setReportDetails('');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#005A36] text-white text-xs font-bold cursor-pointer hover:bg-[#00472a]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Marking Item Claimed / Resolved */}
      <ConfirmationModal
        isOpen={showClaimConfirm}
        onClose={() => setShowClaimConfirm(false)}
        onConfirm={executeClaim}
        title="Mark Item as Claimed?"
        message={`Are you sure you want to mark "${item.title}" as claimed and resolved? This will indicate that the item has been verified and returned to its owner.`}
        confirmText="Confirm Claimed"
        type="success"
      />

      {/* Confirmation Modal for Moving Item to Trash / Restoring */}
      <ConfirmationModal
        isOpen={showTrashConfirm}
        onClose={() => setShowTrashConfirm(false)}
        onConfirm={() => {
          if (onTrashItem) {
            onTrashItem(item.id, !item.isTrash);
          }
          setShowTrashConfirm(false);
          onClose();
        }}
        title={item.isTrash ? "Restore Post to Feed?" : "Move Post to Trash?"}
        message={item.isTrash
          ? `Are you sure you want to restore "${item.title}"? It will become active and visible to all MinSU campus members again.`
          : `Are you sure you want to move "${item.title}" to Trash? It will be removed from the public campus feed immediately. You can review or restore it at any time under "My Items".`}
        confirmText={item.isTrash ? "Restore Post" : "Move to Trash"}
        type={item.isTrash ? "primary" : "warning"}
      />
    </div>
  );
};
