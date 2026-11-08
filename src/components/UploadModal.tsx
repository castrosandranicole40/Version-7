import React, { useState } from 'react';
import { 
  X, Camera, Plus, Trash2, Tag, Grid, MapPin, 
  Calendar, Phone, Gift, FileText, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { 
  Item, 
  ItemCategory, 
  CampusZone, 
  CampusLandmarkPreset, 
  ITEM_CATEGORIES, 
  MINSU_VICTORIA_ZONES, 
  MINSU_VICTORIA_CAMPUS_CENTER,
  isCoordinateWithinCampus
} from '../app/models/item.model';
import { User } from '../app/models/user.model';
import { CameraCaptureModal } from './CameraCaptureModal';
import { CampusPinPicker } from './CampusPinPicker';
import { 
  formatPhilippinePhoneInput, 
  isValidPhilippinePhone, 
  getPhilippinePhoneError 
} from '../utils/phoneValidation';
import confetti from 'canvas-confetti';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  landmarks?: CampusLandmarkPreset[];
  onItemAdded: (newItem: Item) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  landmarks,
  onItemAdded,
}) => {
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [campusZone, setCampusZone] = useState<CampusZone>('University Library');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: MINSU_VICTORIA_CAMPUS_CENTER.lat,
    lng: MINSU_VICTORIA_CAMPUS_CENTER.lng,
  });
  const [specificLocation, setSpecificLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [contact, setContact] = useState(() => 
    currentUser?.phone ? formatPhilippinePhoneInput(currentUser.phone) : '+63 9'
  );
  const [reward, setReward] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([
    '/src/assets/images/found_scientific_calculator_1794042804065.jpg'
  ]);
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCameraCapture = (capturedDataUrl: string) => {
    if (images.length < 4) {
      setImages(prev => [...prev, capturedDataUrl]);
    }
    setIsCameraCaptureOpen(false);
  };

  const sampleLibraryPhotos = [
    '/src/assets/images/found_scientific_calculator_1794042804065.jpg',
    '/src/assets/images/found_leather_wallet_1794042803655.jpg',
    '/src/assets/images/found_hydroflask_tumbler_1794042803694.jpg',
    '/src/assets/images/minsu_campus_grounds_1794042802593.jpg',
  ];

  const handleAddPhoto = () => {
    if (images.length >= 4) return;
    const nextImg = sampleLibraryPhotos[images.length % sampleLibraryPhotos.length];
    setImages([...images, nextImg]);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev.slice(0, 3), reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || (!currentUser.isApproved && currentUser.approvalStatus !== 'approved')) {
      alert('You must have an approved account first before posting lost and found reports.');
      return;
    }
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!contact.trim()) {
      newErrors.contact = 'Contact phone is required';
    } else if (!isValidPhilippinePhone(contact)) {
      newErrors.contact = 'Must follow Philippine format: +63 9XX XXX XXXX (10 digits)';
    }
    if (!description.trim()) newErrors.description = 'Please write a brief description';

    const campusCheck = isCoordinateWithinCampus(coordinates.lat, coordinates.lng, landmarks);
    if (!campusCheck.isAllowed) {
      newErrors.coordinates = `Location is outside MinSU Victoria Campus covered area (${Math.round(campusCheck.distanceToCenter)}m away). Pins must be placed within campus grounds.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const zoneDetails = MINSU_VICTORIA_ZONES.find(z => z.name === campusZone);

    const newItem: Item = {
      id: `item-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      type,
      category,
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      location: {
        lat: coordinates.lat,
        lng: coordinates.lng,
        campusZone,
        specificLocation: specificLocation.trim() || undefined,
      },
      contact: contact.trim(),
      reward: type === 'lost' && reward.trim() ? reward.trim() : undefined,
      status: 'active',
      images: images.length > 0 ? images : ['/src/assets/images/minsu_campus_grounds_1794042802593.jpg'],
      postedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      posterId: currentUser.id,
      posterEmail: currentUser.email,
      posterRole: currentUser.role,
      postedDate: new Date().toISOString().substring(0, 10),
    };

    onItemAdded(newItem);

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#005A36', '#FFC72C', '#0B7B48', '#ffffff'],
      });
    } catch {
      // fallback
    }

    onClose();
  };

  // Strictly restrict posting to approved institutional accounts
  if (!isOpen || !currentUser || (!currentUser.isApproved && currentUser.approvalStatus !== 'approved')) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-[#005A36] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FFC72C] text-[#003620] font-black flex items-center justify-center text-xs shrink-0">
              +
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">Post Campus Item Report</h2>
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

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Item Type Segment Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Report Category Type *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setType('lost')}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 border-2 transition whitespace-nowrap cursor-pointer ${
                  type === 'lost'
                    ? 'border-[#FFC72C] bg-[#FFFDF0] text-[#8D5B00] shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 ${type === 'lost' ? 'text-[#FFC72C]' : 'text-slate-400'}`} />
                <span>Lost Item</span>
              </button>

              <button
                type="button"
                onClick={() => setType('found')}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 border-2 transition whitespace-nowrap cursor-pointer ${
                  type === 'found'
                    ? 'border-[#0B7B48] bg-[#F0FDF4] text-[#005A36] shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${type === 'found' ? 'text-[#0B7B48]' : 'text-slate-400'}`} />
                <span>Found Item</span>
              </button>
            </div>
          </div>

          {/* Multi-photo Upload Slots */}
          <div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Photo Evidence ({images.length}/4 Slots)
              </label>
              <span className="text-[11px] text-slate-400">
                Helps MinSU students verify ownership
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-xs">
                  <img src={img} alt={`Slot ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {images.length < 4 && (
                <button
                  type="button"
                  onClick={() => setIsCameraCaptureOpen(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-[#005A36]/40 bg-[#F0FDF4] hover:bg-[#E8F5E9] flex flex-col items-center justify-center gap-1 p-1 text-center transition cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#005A36] text-[#FFC72C] flex items-center justify-center group-hover:scale-105 transition">
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#005A36] leading-tight">Snap Camera</span>
                </button>
              )}
            </div>

            {images.length < 4 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraCaptureOpen(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Snap Real-Time Photo</span>
                </button>

                <label className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer transition">
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold px-2 py-1 cursor-pointer"
                >
                  + Add Preset
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Item Title / Name *
            </label>
            <div className="minsu-input-wrapper">
              <div className="minsu-icon-box">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Casio Scientific Calculator FX-991EX"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
          </div>

          {/* Category & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category *
              </label>
              <div className="minsu-input-wrapper">
                <div className="minsu-icon-box">
                  <Grid className="w-4 h-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date *
              </label>
              <div className="minsu-input-wrapper">
                <div className="minsu-icon-box">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Campus Location Pinning & Landmark Presets (Leaflet Map) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#005A36]" />
                <span>Specify Exact Campus Location (Interactive Leaflet Pin) *</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {campusZone}
              </span>
            </div>

            <CampusPinPicker
              initialLat={coordinates.lat}
              initialLng={coordinates.lng}
              selectedZone={campusZone}
              type={type}
              landmarks={landmarks}
              onLocationChange={(newLat, newLng, newZone) => {
                setCoordinates({ lat: newLat, lng: newLng });
                setCampusZone(newZone);
              }}
            />
            {errors.coordinates && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.coordinates}</span>
              </p>
            )}

            {/* Room / Specific Spot Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Room, Table, or Exact Spot Details (Optional)
              </label>
              <div className="minsu-input-wrapper">
                <div className="minsu-icon-box">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor Reference Table #7, near water dispenser"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact & Optional Reward */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Contact Mobile / Phone (+63) *
                </label>
                {isValidPhilippinePhone(contact) && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    ✓ Valid PH (+63)
                  </span>
                )}
              </div>
              <div className={`minsu-input-wrapper ${errors.contact ? 'border-rose-400' : ''}`}>
                <div className="minsu-icon-box">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  placeholder="+63 9XX XXX XXXX"
                  value={contact}
                  onChange={(e) => {
                    const formatted = formatPhilippinePhoneInput(e.target.value);
                    setContact(formatted);
                    if (errors.contact) {
                      const err = getPhilippinePhoneError(formatted);
                      setErrors(prev => ({ ...prev, contact: err || '' }));
                    }
                  }}
                  required
                />
              </div>
              {errors.contact && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.contact}</p>}
            </div>

            {type === 'lost' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Reward (Pledge)
                </label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box bg-amber-50 text-amber-600">
                    <Gift className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. ₱300 or treat at Canteen"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Safe Custody Location
                </label>
                <div className="minsu-input-wrapper">
                  <div className="minsu-icon-box">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value="Kept safely by finder / security"
                    className="text-slate-500 truncate"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Detailed Description *
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length}/500 chars
              </span>
            </div>
            <div className="minsu-input-wrapper items-start p-1">
              <div className="minsu-icon-box mt-1">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={3}
                placeholder="Mention distinctive marks, color, stickers, model..."
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description}</p>}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#005A36] text-white hover:bg-[#00472a] active:scale-95 text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 text-[#FFC72C] shrink-0" />
              <span>Publish Report</span>
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Camera Capture Modal */}
      {isCameraCaptureOpen && (
        <CameraCaptureModal
          isOpen={isCameraCaptureOpen}
          onClose={() => setIsCameraCaptureOpen(false)}
          onCapture={handleCameraCapture}
          title="Capture Item Photo (Real-Time Camera)"
        />
      )}
    </div>
  );
};
