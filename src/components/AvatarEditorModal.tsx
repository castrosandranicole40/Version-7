import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, RotateCw, ZoomIn, ZoomOut, Check, Trash2, 
  Sparkles, Camera, Image as ImageIcon 
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';

interface AvatarEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  userInitials: string;
  onSaveAvatar: (newAvatarUrl: string | undefined) => void;
  onRequestDeleteConfirm: () => void;
}

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  userInitials,
  onSaveAvatar,
  onRequestDeleteConfirm,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentAvatarUrl || null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preset MinSU campus avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format&fit=crop&q=80',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result);
          setZoom(1);
          setRotation(0);
          setPan({ x: 0, y: 0 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Mouse / Touch Dragging for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate cropped circular/square canvas and save
  const handleApplyCropped = () => {
    if (!selectedImage) {
      onSaveAvatar(undefined);
      onClose();
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Clear background
        ctx.fillStyle = '#005A36';
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        // Translate to center for rotation and panning
        ctx.translate(size / 2 + pan.x * (size / 200), size / 2 + pan.y * (size / 200));
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        const imgWidth = image.width;
        const imgHeight = image.height;
        const aspect = imgWidth / imgHeight;

        let drawWidth = size;
        let drawHeight = size;
        if (aspect > 1) {
          drawWidth = size * aspect;
        } else {
          drawHeight = size / aspect;
        }

        ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        onSaveAvatar(croppedDataUrl);
        onClose();
      }
    };
    image.src = selectedImage;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />

      {/* Main Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col p-4 sm:p-6 animate-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#005A36] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Profile Picture Editor
              </h3>
              <p className="text-[11px] text-slate-500">
                Upload, crop, zoom, or select a campus avatar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Crop / Preview Box */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-[#FFC72C] shadow-lg bg-slate-900 cursor-move select-none flex items-center justify-center"
          >
            {selectedImage ? (
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                className="w-full h-full flex items-center justify-center"
              >
                <img
                  src={selectedImage}
                  alt="Avatar Preview"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-[#005A36] flex items-center justify-center text-white text-4xl font-extrabold">
                {userInitials}
              </div>
            )}

            {/* Circular Overlay Ring Guide */}
            <div className="absolute inset-0 rounded-full border-2 border-white/40 pointer-events-none" />
          </div>

          {selectedImage && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>💡 Click & drag photo to reposition</span>
            </p>
          )}

          {/* Controls: Zoom & Rotate */}
          {selectedImage && (
            <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1 text-[11px]">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                  Zoom ({Math.round(zoom * 100)}%)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1 text-[10px] font-bold cursor-pointer ml-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Rotate</span>
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#005A36] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Upload and Real-Time Camera Buttons */}
          <div className="w-full grid grid-cols-2 gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer truncate"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Device Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="py-2 px-2.5 rounded-xl bg-[#E8F5E9] hover:bg-[#d5edd7] text-[#005A36] border border-[#A5D6A7] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer truncate"
            >
              <Camera className="w-3.5 h-3.5 shrink-0 text-[#005A36]" />
              <span className="truncate">Snap Camera</span>
            </button>
          </div>

          {currentAvatarUrl && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onRequestDeleteConfirm}
                className="py-1 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Current Photo</span>
              </button>
            </div>
          )}

          {/* Quick Preset Avatars */}
          <div className="w-full space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFC72C]" />
              Or choose a MinSU campus avatar:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {presetAvatars.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedImage(url);
                    setZoom(1);
                    setRotation(0);
                    setPan({ x: 0, y: 0 });
                  }}
                  className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer hover:scale-105 ${
                    selectedImage === url ? 'border-[#005A36] ring-2 ring-emerald-300' : 'border-slate-200'
                  }`}
                >
                  <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCropped}
            className="px-4 py-2 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <Check className="w-4 h-4 text-[#FFC72C]" />
            <span>Apply Profile Picture</span>
          </button>
        </div>
      </div>

      {/* Real-Time Live Camera Capture Modal */}
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          title="Snap Profile Photo"
          onCapture={(capturedDataUrl) => {
            setSelectedImage(capturedDataUrl);
            setZoom(1);
            setRotation(0);
            setPan({ x: 0, y: 0 });
            setIsCameraOpen(false);
          }}
        />
      )}
    </div>
  );
};
