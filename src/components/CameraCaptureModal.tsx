import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, RefreshCw, Check, RotateCcw, AlertCircle, 
  FlipHorizontal, Sparkles, Upload 
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Real-Time Photo',
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);

  // Initialize Camera Stream
  useEffect(() => {
    if (!isOpen) return;
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      setIsLoadingCamera(true);
      setCameraError(null);

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
        // Check for multiple video input devices
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          if (isMounted) setHasMultipleCameras(videoInputs.length > 1);
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setCameraError('Camera permission was denied. Please allow camera access in your browser or choose a file below.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setCameraError('No camera device detected on your hardware.');
          } else {
            setCameraError('Could not access live camera. You can still upload or snap a photo using device files.');
          }
        }
      } finally {
        if (isMounted) setIsLoadingCamera(false);
      }
    }

    if (!capturedImage) {
      startCamera();
    }

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode, capturedImage]);

  // Flip Camera Front / Back
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Snap Frame from Video Stream
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // If front camera, mirror image for natural selfie feel
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);

      // Stop camera stream after snap
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    onClose();
  };

  // Fallback direct device photo input
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCapturedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={handleClose} className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs" />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 my-auto">
        {/* Header */}
        <div className="bg-[#005A36] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FFC72C] text-[#003620] flex items-center justify-center font-bold shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                {title}
              </h3>
              <p className="text-[11px] text-[#C8E6C9] truncate">
                Real-Time Camera Capture · MinSU FoundIt!
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport or Captured Preview */}
        <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center select-none">
          {capturedImage ? (
            /* Review Captured Picture */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm">
                <Check className="w-3.5 h-3.5" />
                <span>Photo Captured</span>
              </div>
            </div>
          ) : cameraError ? (
            /* Error & Fallback UI */
            <div className="p-6 text-center text-white space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-[#FFC72C] text-[#003620] font-bold text-xs hover:bg-yellow-300 transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Choose / Take Photo via Device</span>
              </button>
            </div>
          ) : (
            /* Real-Time Live Video Feed */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {isLoadingCamera && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FFC72C]" />
                  <span>Connecting to camera...</span>
                </div>
              )}

              {/* Viewfinder crosshairs */}
              <div className="absolute inset-8 border border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#FFC72C] absolute -top-1 -left-1" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#FFC72C] absolute -top-1 -right-1" />
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#FFC72C] absolute -bottom-1 -left-1" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#FFC72C] absolute -bottom-1 -right-1" />
              </div>

              {/* Flip Camera Button */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Flip camera front/back"
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md cursor-pointer transition"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Hidden File Input for Direct Device Fallback */}
          <input
            type="file"
            ref={fileFallbackRef}
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFile}
            className="hidden"
          />
        </div>

        {/* Footer Action Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {capturedImage ? (
            /* Review Actions */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="px-5 py-2.5 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-[#FFC72C]" />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : (
            /* Live Camera Shutter Actions */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload File Instead</span>
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={isLoadingCamera || Boolean(cameraError)}
                aria-label="Take Photo"
                className="w-14 h-14 rounded-full bg-[#FFC72C] hover:bg-yellow-300 active:scale-90 text-[#003620] flex items-center justify-center p-1 border-4 border-white dark:border-slate-800 shadow-lg cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed mx-auto"
              >
                <div className="w-10 h-10 rounded-full border-2 border-[#003620] flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#003620]" />
                </div>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
