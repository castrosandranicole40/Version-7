import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, X, Trash2, Check, AlertCircle, RotateCcw, Crosshair
} from 'lucide-react';
import { 
  CampusLandmarkPreset, 
  CampusZone, 
  MINSU_VICTORIA_ZONES, 
  MINSU_VICTORIA_CAMPUS_CENTER,
  calculateDistanceMeters
} from '../app/models/item.model';
import { ConfirmationModal } from './ConfirmationModal';

interface AdminLandmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  landmark: CampusLandmarkPreset | null; // null if creating a new one
  initialCoords?: { lat: number; lng: number };
  onSave: (landmark: CampusLandmarkPreset) => void;
  onDelete?: (landmarkId: string) => void;
}

export const AdminLandmarkModal: React.FC<AdminLandmarkModalProps> = ({
  isOpen,
  onClose,
  landmark,
  initialCoords,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [zone, setZone] = useState<CampusZone>('University Library');
  const [lat, setLat] = useState<number>(initialCoords?.lat || MINSU_VICTORIA_CAMPUS_CENTER.lat);
  const [lng, setLng] = useState<number>(initialCoords?.lng || MINSU_VICTORIA_CAMPUS_CENTER.lng);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isEditing = Boolean(landmark);

  // Track if any modifications have been made
  const isDirty = landmark
    ? (name.trim() !== landmark.name.trim() ||
       zone !== landmark.zone ||
       Number(lat.toFixed(6)) !== Number(landmark.lat.toFixed(6)) ||
       Number(lng.toFixed(6)) !== Number(landmark.lng.toFixed(6)) ||
       description.trim() !== (landmark.description || '').trim())
    : (name.trim().length > 0 || description.trim().length > 0);

  useEffect(() => {
    if (landmark) {
      setName(landmark.name);
      setZone(landmark.zone);
      setLat(landmark.lat);
      setLng(landmark.lng);
      setDescription(landmark.description || '');
      setError(null);
    } else if (initialCoords) {
      setName('');
      setZone('University Library');
      setLat(Number(initialCoords.lat.toFixed(6)));
      setLng(Number(initialCoords.lng.toFixed(6)));
      setDescription('');
      setError(null);
    }
    setShowDeleteConfirm(false);
    setShowSaveConfirm(false);
    setShowDiscardConfirm(false);
    setIsSaving(false);
  }, [landmark, initialCoords, isOpen]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (showSaveConfirm) {
          setShowSaveConfirm(false);
        } else if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleRequestClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDeleteConfirm, showSaveConfirm, showDiscardConfirm, isDirty]);

  if (!isOpen) return null;

  const handleResetToCenter = () => {
    setLat(MINSU_VICTORIA_CAMPUS_CENTER.lat);
    setLng(MINSU_VICTORIA_CAMPUS_CENTER.lng);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a landmark or facility name.');
      return;
    }
    if (isNaN(lat) || isNaN(lng)) {
      setError('Coordinates must be valid numbers.');
      return;
    }

    const distFromCenter = calculateDistanceMeters(
      MINSU_VICTORIA_CAMPUS_CENTER.lat,
      MINSU_VICTORIA_CAMPUS_CENTER.lng,
      lat,
      lng
    );

    // Validate that landmark is within reasonable proximity of MinSU Victoria
    if (distFromCenter > 2000) {
      setError(`Coordinates are ${(distFromCenter / 1000).toFixed(1)}km away from MinSU Victoria Campus center. Pinned areas must be within or immediately adjacent to campus grounds.`);
      return;
    }

    setError(null);
    // Trigger Save/Edit confirmation dialog before committing
    setShowSaveConfirm(true);
  };

  const handleExecuteSave = () => {
    setIsSaving(true);

    const landmarkId = landmark?.id || `landmark_${Date.now()}`;
    const updatedLandmark: CampusLandmarkPreset = {
      id: landmarkId,
      name: name.trim(),
      zone,
      lat,
      lng,
      description: description.trim() || 'MinSU Main Victoria Campus facility',
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedLandmark);
    setIsSaving(false);
    setShowSaveConfirm(false);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (landmark && onDelete) {
      onDelete(landmark.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div
          onClick={handleRequestClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        />
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl z-10 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 animate-in zoom-in-95 duration-200 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#005A36] text-[#FFC72C] flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {isEditing ? 'Edit Campus Landmark & Pin' : 'Add Custom Campus Landmark'}
                </h3>
                <span className="text-[11px] text-[#005A36] dark:text-[#FFC72C] font-bold">
                  Admin Map Area & Landmark Editor
                </span>
              </div>
            </div>
            <button
              onClick={handleRequestClose}
              type="button"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition"
              title="Cancel and Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Landmark Name */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Landmark / Building Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Science Laboratory Building, University Clinic, CTE Hall"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#005A36] outline-none"
                required
              />
            </div>

            {/* Campus Zone */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Associate Campus Zone *
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as CampusZone)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#005A36] outline-none cursor-pointer"
              >
                {MINSU_VICTORIA_ZONES.map((z) => (
                  <option key={z.name} value={z.name}>
                    {z.name} ({z.shortName})
                  </option>
                ))}
              </select>
            </div>

            {/* Latitude & Longitude Coordinates */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Coordinates (°N, °E) *
                </label>
                <button
                  type="button"
                  onClick={handleResetToCenter}
                  className="text-[10px] font-bold text-[#005A36] dark:text-[#FFC72C] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reset to MinSU Main Campus Center"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Campus Center</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => {
                      setLat(parseFloat(e.target.value));
                      if (error) setError(null);
                    }}
                    placeholder="Latitude"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#005A36] outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Latitude (°N)</span>
                </div>
                <div>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => {
                      setLng(parseFloat(e.target.value));
                      if (error) setError(null);
                    }}
                    placeholder="Longitude"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#005A36] outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Longitude (°E)</span>
                </div>
              </div>
            </div>

            {/* Facility Description */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Landmark Description / Notable Rooms
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="e.g. Ground floor lobby, dean's office, audio-visual center"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#005A36] outline-none"
              />
            </div>

            {/* Action Buttons: Delete Pin, Cancel, and Confirmation Save */}
            <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              {isEditing && onDelete ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Delete this landmark pin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Pin</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditing ? 'Save Changes' : 'Add Landmark Pin'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 1. Edit / Save Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleExecuteSave}
        title={isEditing ? 'Confirm Map Landmark Edit' : 'Confirm New Map Landmark Pin'}
        message={
          isEditing
            ? `Are you sure you want to save and apply the edits to "${name}" on the MinSU Victoria Campus map?`
            : `Are you sure you want to add "${name}" as a new landmark on the MinSU Victoria Campus map?`
        }
        confirmText={isEditing ? 'Yes, Save Changes' : 'Yes, Add Landmark Pin'}
        cancelText="Keep Editing"
        type="primary"
      />

      {/* 2. Discard Edit Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard Unsaved Map Edits?"
        message={`You have unsaved changes to ${isEditing ? `"${landmark?.name}"` : 'this new landmark pin'}. Are you sure you want to discard your edits and close the map editor?`}
        confirmText="Yes, Discard Edits"
        cancelText="Continue Editing"
        type="warning"
      />

      {/* 3. Delete Landmark Pin Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Delete Landmark Pin"
        message={`Are you sure you want to permanently delete "${landmark?.name}"? This landmark pin will be removed from the MinSU Victoria Campus map and reporting selectors.`}
        confirmText="Yes, Delete Pin"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};
