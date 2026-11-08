import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Navigation, MapPin, Locate, Crosshair, Layers, 
  ChevronRight, Compass, ShieldAlert, Sparkles, AlertCircle, CheckCircle2, RotateCcw,
  Plus, Edit2, ShieldCheck, X, Sliders, Check, ListFilter, Search, Trash2
} from 'lucide-react';
import { 
  CampusZone, 
  Item, 
  MINSU_CAMPUS_PRESETS, 
  MINSU_VICTORIA_CAMPUS_CENTER, 
  MINSU_CAMPUS_COVERAGE,
  MINSU_VICTORIA_ZONES,
  CampusLandmarkPreset,
  getCampusCoverageRadius,
  saveCampusCoverageRadius,
  calculateDistanceMeters 
} from '../app/models/item.model';
import { User } from '../app/models/user.model';
import { AdminLandmarkModal } from './AdminLandmarkModal';
import { ConfirmationModal } from './ConfirmationModal';

interface CampusMapProps {
  selectedZone: CampusZone | null;
  onSelectZone: (zone: CampusZone | null) => void;
  items: Item[];
  onSelectItem?: (item: Item) => void;
  currentUser?: User | null;
  landmarks?: CampusLandmarkPreset[];
  coverageRadius?: number;
  onSaveLandmark?: (landmark: CampusLandmarkPreset) => void;
  onDeleteLandmark?: (landmarkId: string) => void;
  onUpdateCoverageRadius?: (radius: number) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  selectedZone,
  onSelectZone,
  items,
  onSelectItem,
  currentUser,
  landmarks = MINSU_CAMPUS_PRESETS,
  coverageRadius = getCampusCoverageRadius(),
  onSaveLandmark,
  onDeleteLandmark,
  onUpdateCoverageRadius,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerRef = useRef<L.LayerGroup | null>(null);
  const coverageCircleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  // Map View Mode (Streets vs Campus Focus)
  const [activePreset, setActivePreset] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Admin Landmark Editor State (Strictly Admin-Only)
  const isAdmin = currentUser?.role === 'admin';
  const [isAdminEditorMode, setIsAdminEditorMode] = useState(false);
  const [isLandmarkModalOpen, setIsLandmarkModalOpen] = useState(false);
  const [editingLandmark, setEditingLandmark] = useState<CampusLandmarkPreset | null>(null);
  const [draftCoords, setDraftCoords] = useState<{ lat: number; lng: number }>({
    lat: MINSU_VICTORIA_CAMPUS_CENTER.lat,
    lng: MINSU_VICTORIA_CAMPUS_CENTER.lng,
  });

  // Admin Landmark List Drawer & Delete Confirm State
  const [isLandmarksListOpen, setIsLandmarksListOpen] = useState(false);
  const [landmarkSearch, setLandmarkSearch] = useState('');
  const [deletingLandmark, setDeletingLandmark] = useState<CampusLandmarkPreset | null>(null);
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  useEffect(() => {
    if (mapNotice) {
      const timer = setTimeout(() => setMapNotice(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [mapNotice]);

  // Admin Coverage Radius Customization
  const [isRadiusConfigOpen, setIsRadiusConfigOpen] = useState(false);
  const [currentRadius, setCurrentRadius] = useState<number>(coverageRadius);
  const [pendingRadiusChange, setPendingRadiusChange] = useState<number | null>(null);

  useEffect(() => {
    setCurrentRadius(coverageRadius);
  }, [coverageRadius]);

  // Device Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [maxRadiusMeters, setMaxRadiusMeters] = useState<number>(300);

  // Initialize Leaflet Map pre-centered strictly on MinSU Main Victoria Campus
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Define Leaflet max bounds to prevent panning away from Victoria campus
      const minsuBounds = L.latLngBounds(
        [MINSU_CAMPUS_COVERAGE.bounds.southWest.lat, MINSU_CAMPUS_COVERAGE.bounds.southWest.lng],
        [MINSU_CAMPUS_COVERAGE.bounds.northEast.lat, MINSU_CAMPUS_COVERAGE.bounds.northEast.lng]
      );

      const map = L.map(mapContainerRef.current, {
        center: [MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng],
        zoom: MINSU_VICTORIA_CAMPUS_CENTER.defaultZoom, // zoom 17 for high campus detail
        zoomControl: false,
        attributionControl: false,
        maxZoom: 19,
        minZoom: 15,
        maxBounds: minsuBounds,
        maxBoundsViscosity: 0.95,
      });

      // Standard OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom control on bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution on bottom left
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | MinSU Victoria')
        .addTo(map);

      // Official Boundary circle visual around Victoria campus grounds
      const coverageCircle = L.circle([MINSU_CAMPUS_COVERAGE.center.lat, MINSU_CAMPUS_COVERAGE.center.lng], {
        radius: currentRadius,
        color: '#005A36',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#005A36',
        fillOpacity: 0.05,
      }).addTo(map);
      coverageCircleRef.current = coverageCircle;

      // Create persistent LayerGroups
      const landmarksGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      landmarksLayerRef.current = landmarksGroup;
      markersLayerRef.current = markersGroup;
      mapRef.current = map;

      // Force size update when rendered and on container resize
      const t1 = setTimeout(() => map.invalidateSize(), 50);
      const t2 = setTimeout(() => map.invalidateSize(), 200);
      const t3 = setTimeout(() => map.invalidateSize(), 600);

      const onResize = () => map.invalidateSize();
      window.addEventListener('resize', onResize);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        window.removeEventListener('resize', onResize);
      };
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update boundary circle whenever currentRadius updates
  useEffect(() => {
    if (coverageCircleRef.current) {
      coverageCircleRef.current.setRadius(currentRadius);
    }
  }, [currentRadius]);

  // Map Click Handler for Admin Editor Mode (Admin clicks to drop landmark)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isAdmin || !isAdminEditorMode) return;
      // Admin clicked on map to place a new landmark
      setEditingLandmark(null);
      setDraftCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsLandmarkModalOpen(true);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isAdmin, isAdminEditorMode]);

  // Update Campus Landmark Facility Markers (Pre-defined & Custom Admin Pins)
  useEffect(() => {
    if (!mapRef.current || !landmarksLayerRef.current) return;
    landmarksLayerRef.current.clearLayers();

    if (!showLandmarks) return;

    landmarks.forEach((preset) => {
      const isSelected = selectedZone === preset.zone;
      const countInZone = items.filter(
        (it) => it.location.campusZone === preset.zone && it.status !== 'claimed'
      ).length;

      const isCustomLandmark = preset.isCustom;

      const landmarkHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
          <div class="px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-md border flex items-center gap-1 transition-transform ${
            isSelected
              ? 'bg-[#005A36] text-white border-[#FFC72C] ring-2 ring-[#FFC72C]'
              : isCustomLandmark
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-[#005A36] hover:text-white'
              : 'bg-white/95 text-slate-800 border-slate-300 hover:bg-[#005A36] hover:text-white'
          }">
            ${isCustomLandmark ? '<span class="text-[9px] text-amber-600 font-black">★</span>' : ''}
            <span>${preset.name}</span>
            ${countInZone > 0 ? `<span class="bg-[#FFC72C] text-[#003620] px-1 rounded-full text-[9px] font-black">${countInZone}</span>` : ''}
            ${isAdmin && isAdminEditorMode ? '<span class="bg-blue-600 text-white px-1 rounded text-[8px] font-mono">EDIT</span>' : ''}
          </div>
          <div class="w-3 h-3 rotate-45 -mt-1.5 ${isSelected ? 'bg-[#005A36]' : isCustomLandmark ? 'bg-amber-50' : 'bg-white'} border-r border-b border-slate-300"></div>
        </div>
      `;

      const landmarkIcon = L.divIcon({
        className: 'minsu-landmark-pin',
        html: landmarkHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([preset.lat, preset.lng], { icon: landmarkIcon });
      
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (isAdmin && isAdminEditorMode) {
          // In admin mode, clicking opens edit modal
          setEditingLandmark(preset);
          setDraftCoords({ lat: preset.lat, lng: preset.lng });
          setIsLandmarkModalOpen(true);
        } else {
          // Regular user click filters reports for this campus zone
          onSelectZone(selectedZone === preset.zone ? null : preset.zone);
          setActivePreset(preset.id);
          mapRef.current?.flyTo([preset.lat, preset.lng], 18, { duration: 0.8 });
        }
      });

      landmarksLayerRef.current?.addLayer(marker);
    });
  }, [showLandmarks, selectedZone, items, landmarks, isAdmin, isAdminEditorMode, onSelectZone]);

  // Update Lost & Found Item Markers on Map
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Filter items according to current map filter criteria
    let visibleItems = items.filter((it) => it.status !== 'claimed');

    if (filterType !== 'all') {
      visibleItems = visibleItems.filter((it) => it.type === filterType);
    }

    if (selectedZone) {
      visibleItems = visibleItems.filter((it) => it.location.campusZone === selectedZone);
    }

    if (nearMeOnly && userLocation) {
      visibleItems = visibleItems.filter((it) => {
        const dist = calculateDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          it.location.lat,
          it.location.lng
        );
        return dist <= maxRadiusMeters;
      });
    }

    visibleItems.forEach((item) => {
      const isLost = item.type === 'lost';
      const primaryColor = isLost ? '#FFC72C' : '#0B7B48';
      const textColor = isLost ? '#003620' : '#FFFFFF';
      const pulseClass = isLost ? 'marker-pulse-gold' : 'marker-pulse-green';

      let distanceLabel = '';
      if (userLocation) {
        const dist = calculateDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          item.location.lat,
          item.location.lng
        );
        distanceLabel = `<span class="text-[9px] font-mono px-1 rounded bg-slate-100 text-slate-600">${dist}m away</span>`;
      }

      const iconHtml = `
        <div class="relative flex items-center justify-center minsu-marker-pin" style="width: 36px; height: 36px;">
          <div class="absolute inset-0 rounded-full ${pulseClass}" style="background-color: ${primaryColor}; opacity: 0.35;"></div>
          
          <div class="relative w-8 h-8 rounded-full shadow-lg flex items-center justify-center border-2 border-white transition-all transform hover:scale-110" style="background-color: ${primaryColor}; color: ${textColor};">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span class="absolute -top-1 -right-1 text-[8px] font-black uppercase px-1 rounded-full text-white shadow-xs" style="background-color: ${isLost ? '#B48400' : '#005A36'};">
              ${isLost ? 'LOST' : 'FOUND'}
            </span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'minsu-item-icon',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([item.location.lat, item.location.lng], { icon: customIcon });

      // Interactive Leaflet Popup with thumbnail and action button
      const popupHtml = `
        <div class="w-64 p-3 font-sans">
          <div class="relative h-28 w-full rounded-xl overflow-hidden bg-slate-900 mb-2">
            <img src="${item.images[0]}" alt="${item.title}" class="w-full h-full object-cover" />
            <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase text-white shadow-xs" style="background-color: ${primaryColor}; color: ${textColor};">
              ${item.type.toUpperCase()}
            </span>
            <span class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
              ${item.category}
            </span>
          </div>

          <h4 class="font-bold text-xs text-slate-900 leading-snug mb-1 line-clamp-1">${item.title}</h4>
          
          <div class="flex items-center gap-1 text-[11px] text-slate-600 mb-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#005A36] shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="truncate font-medium">${item.location.specificLocation || item.location.campusZone}</span>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 mb-2">
            <span>Reported ${item.date}</span>
            ${distanceLabel}
          </div>

          <button 
            id="view-item-btn-${item.id}"
            class="w-full py-1.5 rounded-lg text-white font-bold text-xs shadow-xs transition hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer"
            style="background-color: #005A36;"
          >
            <span>View Full Details</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280, closeButton: true });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-item-btn-${item.id}`);
        if (btn && onSelectItem) {
          btn.onclick = () => {
            onSelectItem(item);
          };
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [items, filterType, selectedZone, nearMeOnly, userLocation, maxRadiusMeters, onSelectItem]);

  // Handle Preset Dropdown Selection: Pans, Zooms, and sets Zone
  const handleSelectPreset = (landmarkId: string) => {
    setActivePreset(landmarkId);
    if (!mapRef.current) return;

    if (landmarkId === 'all') {
      onSelectZone(null);
      mapRef.current.flyTo(
        [MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng],
        MINSU_VICTORIA_CAMPUS_CENTER.defaultZoom,
        { duration: 1 }
      );
      return;
    }

    const landmark = landmarks.find((p) => p.id === landmarkId);
    if (landmark) {
      onSelectZone(landmark.zone);
      mapRef.current.flyTo([landmark.lat, landmark.lng], 18, { duration: 1.2 });
    }
  };

  // Device Geolocation Handler (Near Me)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setUserLocation(coords);
        setIsLocating(false);

        const distFromCenter = calculateDistanceMeters(
          coords.lat,
          coords.lng,
          MINSU_VICTORIA_CAMPUS_CENTER.lat,
          MINSU_VICTORIA_CAMPUS_CENTER.lng
        );

        if (!mapRef.current) return;

        if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
        if (userCircleRef.current) mapRef.current.removeLayer(userCircleRef.current);

        const userHtml = `
          <div class="relative w-7 h-7 flex items-center justify-center">
            <div class="user-radar-pulse"></div>
            <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md z-10"></div>
          </div>
        `;
        const userIcon = L.divIcon({
          className: 'minsu-user-location-pin',
          html: userHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: userIcon })
          .bindPopup(`
            <div class="p-2 text-center font-sans text-xs">
              <span class="font-bold text-blue-700 block mb-0.5">Your Current Location</span>
              <span class="text-[11px] text-slate-500">${distFromCenter <= currentRadius ? 'Within MinSU Victoria Covered Campus' : `${(distFromCenter / 1000).toFixed(1)}km from MinSU Victoria`}</span>
            </div>
          `);

        const circle = L.circle([coords.lat, coords.lng], {
          radius: maxRadiusMeters,
          color: '#2563EB',
          weight: 1,
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
        });

        marker.addTo(mapRef.current);
        circle.addTo(mapRef.current);

        userMarkerRef.current = marker;
        userCircleRef.current = circle;

        if (distFromCenter < 2000) {
          mapRef.current.flyTo([coords.lat, coords.lng], 17, { duration: 1 });
        } else {
          setGeoError(`Device is ${(distFromCenter / 1000).toFixed(1)}km away from Victoria Campus.`);
        }
      },
      (error) => {
        setIsLocating(false);
        setGeoError(error.message || 'Unable to retrieve your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  // Recenter to MinSU Main Campus
  const handleResetToCampus = () => {
    setActivePreset('all');
    onSelectZone(null);
    if (mapRef.current) {
      mapRef.current.flyTo(
        [MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng],
        MINSU_VICTORIA_CAMPUS_CENTER.defaultZoom,
        { duration: 0.8 }
      );
    }
  };

  // Admin updates coverage radius
  const handleRadiusChange = (newRadius: number) => {
    setCurrentRadius(newRadius);
    saveCampusCoverageRadius(newRadius);
    if (onUpdateCoverageRadius) {
      onUpdateCoverageRadius(newRadius);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* 1. Header & Location Meta Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#005A36] text-[#FFC72C] flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Mindoro State University Campus Map
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                Victoria Main Campus
              </span>
              {isAdmin && (
                <span className="text-[9px] font-extrabold text-[#003620] bg-[#FFC72C] px-1.5 py-0.2 rounded-full uppercase">
                  Admin Authorized
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Coordinates: 13.1553° N, 121.1867° E · Covered Pinning Zone: {currentRadius}m radius
            </p>
          </div>
        </div>

        {/* 2. Controls Toolbar: Presets, Recenter, Geolocation, and Admin Editor */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Map Editor Toggle (STRICTLY Admin-Only Requirement) */}
          {isAdmin && (
            <button
              onClick={() => setIsAdminEditorMode(!isAdminEditorMode)}
              title="Toggle Admin Landmark & Map Pin Editor"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                isAdminEditorMode
                  ? 'bg-[#005A36] text-[#FFC72C] border-[#FFC72C] ring-2 ring-[#FFC72C]/40'
                  : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border-emerald-700/30 text-[#005A36] dark:text-emerald-400'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isAdminEditorMode ? 'Editor Active' : 'Admin Map Editor'}</span>
            </button>
          )}

          {/* Campus Building Preset Dropdown (For students and admins alike to browse approved buildings) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#005A36] dark:text-emerald-400 shrink-0" />
            <select
              value={activePreset}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              <option value="all">📍 Jump to Campus Landmark ({landmarks.length})...</option>
              {landmarks.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.isCustom ? '★ ' : ''}{preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recenter Campus */}
          <button
            onClick={handleResetToCampus}
            title="Recenter to MinSU Main Campus"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#005A36] dark:text-emerald-400" />
            <span className="hidden sm:inline">Center Campus</span>
          </button>

          {/* Near Me Geolocation Button */}
          <button
            onClick={handleGetLocation}
            disabled={isLocating}
            title="Locate my position on campus"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              userLocation
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
            <span>{isLocating ? 'Locating...' : userLocation ? 'Near Me Active' : 'Near Me'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast for Map Actions */}
      {mapNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFC72C]" />
            <span>{mapNotice}</span>
          </div>
          <button
            onClick={() => setMapNotice(null)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Map Editor Instructions Strip & Coverage Boundary Configurator (Only visible to Admin in Editor Mode) */}
      {isAdmin && isAdminEditorMode && (
        <div className="bg-[#005A36] text-white border-b border-[#00472a] animate-in fade-in">
          <div className="px-3.5 sm:px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC72C] animate-ping shrink-0" />
              <span className="truncate">
                <strong>Admin Map Editor Active:</strong> Click map to add a pin, or click any pin's <code className="bg-blue-600 text-white px-1 py-0.2 rounded text-[10px]">EDIT</code> badge.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Manage Pins Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setIsLandmarksListOpen(!isLandmarksListOpen)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
                  isLandmarksListOpen
                    ? 'bg-[#FFC72C] text-[#003620]'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="View & Edit List of All Campus Pins"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Manage Pins ({landmarks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRadiusConfigOpen(!isRadiusConfigOpen)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
                  isRadiusConfigOpen
                    ? 'bg-[#FFC72C] text-[#003620]'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Area ({currentRadius}m)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingLandmark(null);
                  setDraftCoords({ lat: MINSU_VICTORIA_CAMPUS_CENTER.lat, lng: MINSU_VICTORIA_CAMPUS_CENTER.lng });
                  setIsLandmarkModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FFC72C] text-[#003620] font-black text-xs flex items-center gap-1.5 hover:bg-[#fed14c] cursor-pointer shadow-xs active:scale-95"
                title="Add a new custom campus landmark pin"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAdminEditorMode(false);
                  setIsLandmarksListOpen(false);
                  setIsRadiusConfigOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white font-semibold text-xs cursor-pointer ml-1"
              >
                Exit Editor
              </button>
            </div>
          </div>

          {/* Admin Coverage Radius Selector Dropdown Bar */}
          {isRadiusConfigOpen && (
            <div className="bg-[#004227] px-4 py-2.5 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <span className="text-[#FFC72C] font-bold">Customize MinSU Coverage Radius:</span>
                <span className="text-white/80 hidden sm:inline">Only areas within this boundary can be pinned for lost & found items.</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[350, 450, 550, 650, 800, 1000].map((radius) => (
                  <button
                    key={radius}
                    onClick={() => {
                      if (radius !== currentRadius) {
                        setPendingRadiusChange(radius);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentRadius === radius
                        ? 'bg-[#FFC72C] text-[#003620] shadow-xs'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {radius}m {radius === 550 ? '(Default)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dedicated Admin Campus Pins List & Quick Editor Drawer */}
          {isLandmarksListOpen && (
            <div className="bg-[#003620] border-t border-emerald-800/80 p-3 sm:p-4 text-slate-800 animate-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4 text-[#FFC72C]" />
                  <span className="font-extrabold text-xs">
                    Campus Landmark Directory ({landmarks.length} Configured Pins)
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={landmarkSearch}
                    onChange={(e) => setLandmarkSearch(e.target.value)}
                    placeholder="Filter pins by name or zone..."
                    className="w-full pl-8 pr-3 py-1 bg-white/90 text-slate-900 rounded-lg text-xs font-medium placeholder:text-slate-500 outline-none"
                  />
                  {landmarkSearch && (
                    <button
                      onClick={() => setLandmarkSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Pins Grid with Edit & Delete Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {landmarks
                  .filter((lm) => 
                    lm.name.toLowerCase().includes(landmarkSearch.toLowerCase()) ||
                    lm.zone.toLowerCase().includes(landmarkSearch.toLowerCase())
                  )
                  .map((lm) => (
                    <div
                      key={lm.id}
                      className="bg-white rounded-xl p-2.5 border border-emerald-900/40 shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {lm.name}
                          </span>
                          {lm.isCustom && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#005A36] font-semibold block truncate">
                          {lm.zone}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono block">
                          {lm.lat.toFixed(4)}°N, {lm.lng.toFixed(4)}°E
                        </span>
                      </div>

                      {/* Action buttons: Locate, Edit, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Locate on Map Button */}
                        <button
                          type="button"
                          onClick={() => {
                            mapRef.current?.flyTo([lm.lat, lm.lng], 18, { duration: 0.8 });
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                          title="Center pin on map"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-[#005A36]" />
                        </button>

                        {/* Edit Pin Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLandmark(lm);
                            setDraftCoords({ lat: lm.lat, lng: lm.lng });
                            setIsLandmarkModalOpen(true);
                          }}
                          className="px-2 py-1.5 rounded-lg bg-[#005A36] hover:bg-[#00472a] text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Edit this pin's name, zone, or coordinates"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Pin Button */}
                        {lm.isCustom && (
                          <button
                            type="button"
                            onClick={() => setDeletingLandmark(lm)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete this custom pin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Geolocation message banner if outside or active */}
      {geoError && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200/80 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{geoError}</span>
          </div>
          <button
            onClick={() => setGeoError(null)}
            className="text-[10px] font-bold text-amber-800 dark:text-amber-300 underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Map View Filter Sub-toolbar */}
      <div className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Lost vs Found Marker Filter Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 hidden xs:inline">Filter Pins:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Reports ({items.length})
          </button>
          <button
            onClick={() => setFilterType('lost')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              filterType === 'lost'
                ? 'bg-[#FFC72C] text-[#003620] ring-1 ring-[#005A36]'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#FFC72C] shrink-0"></span>
            <span>Lost ({items.filter((i) => i.type === 'lost' && i.status !== 'claimed').length})</span>
          </button>
          <button
            onClick={() => setFilterType('found')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              filterType === 'found'
                ? 'bg-[#005A36] text-white ring-1 ring-[#0B7B48]'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#0B7B48] shrink-0"></span>
            <span>Found ({items.filter((i) => i.type === 'found' && i.status !== 'claimed').length})</span>
          </button>
        </div>

        {/* Near Me Toggle & Radius Filter (if user location detected) */}
        {userLocation && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] font-bold text-blue-800 dark:text-blue-300 cursor-pointer">
              <input
                type="checkbox"
                checked={nearMeOnly}
                onChange={(e) => setNearMeOnly(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span>Filter Near Me (&le;{maxRadiusMeters}m)</span>
            </label>
            {nearMeOnly && (
              <select
                value={maxRadiusMeters}
                onChange={(e) => setMaxRadiusMeters(Number(e.target.value))}
                className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
              >
                <option value={150}>150m radius</option>
                <option value={300}>300m radius</option>
                <option value={500}>500m radius</option>
                <option value={1000}>1km radius</option>
              </select>
            )}
          </div>
        )}

        {/* Toggle landmark names on map */}
        <button
          onClick={() => setShowLandmarks(!showLandmarks)}
          className={`text-[11px] font-bold px-2 py-0.5 rounded transition ${
            showLandmarks ? 'text-[#005A36] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {showLandmarks ? `✓ Landmarks (${landmarks.length})` : '+ Show Landmarks'}
        </button>
      </div>

      {/* 4. The Leaflet Map Canvas */}
      <div className={`relative w-full h-[360px] sm:h-[440px] md:h-[500px] bg-slate-100 dark:bg-slate-950 ${isAdminEditorMode ? 'cursor-crosshair' : ''}`}>
        <div ref={mapContainerRef} className="w-full h-full" style={{ width: '100%', height: '100%', minHeight: '360px' }} />

        {/* Floating Quick Landmark Pills on top of map */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap gap-1 max-w-[85%] pointer-events-auto">
          {landmarks.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-md transition cursor-pointer border ${
                activePreset === p.id
                  ? 'bg-[#005A36] text-white border-[#FFC72C]'
                  : 'bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-[#005A36] hover:text-white border-slate-200 dark:border-slate-700'
              }`}
            >
              {p.isCustom ? '★ ' : ''}{p.name}
            </button>
          ))}
        </div>

        {/* Campus Covered Area Indicator Top Right */}
        <div className="absolute top-2.5 right-2.5 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#005A36] dark:text-[#FFC72C] border border-slate-200 dark:border-slate-800 shadow-sm pointer-events-none flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#005A36] dark:bg-[#FFC72C]" />
          <span>Covered Area: {currentRadius}m radius</span>
        </div>
      </div>

      {/* 5. Map Legend & Quick Campus Zones Footer */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-[#8D5B00] dark:text-amber-400">
            <span className="w-3 h-3 rounded-full bg-[#FFC72C] border border-[#B48400] shrink-0" />
            <span>Lost Item Pin (#FFC72C)</span>
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[#005A36] dark:text-emerald-400">
            <span className="w-3 h-3 rounded-full bg-[#0B7B48] border border-white shrink-0" />
            <span>Found Item Pin (#0B7B48)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <span>Device GPS Pulse</span>
          </span>
          <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span>★ Admin Custom Landmark</span>
          </span>
        </div>

        <div className="text-[10px] text-slate-400 font-mono truncate">
          Mindoro State University Main Campus · Leaflet 1.9 & OpenStreetMap
        </div>
      </div>

      {/* 6. Admin Landmark Add/Edit Modal */}
      {isLandmarkModalOpen && (
        <AdminLandmarkModal
          isOpen={isLandmarkModalOpen}
          onClose={() => setIsLandmarkModalOpen(false)}
          landmark={editingLandmark}
          initialCoords={draftCoords}
          onSave={(landmark) => {
            if (onSaveLandmark) onSaveLandmark(landmark);
            setMapNotice(`Landmark "${landmark.name}" saved successfully.`);
          }}
          onDelete={(id) => {
            if (onDeleteLandmark) onDeleteLandmark(id);
            setMapNotice(`Landmark deleted.`);
          }}
        />
      )}

      {/* 7. Direct List Landmark Delete Confirmation Dialog */}
      <ConfirmationModal
        isOpen={Boolean(deletingLandmark)}
        onClose={() => setDeletingLandmark(null)}
        onConfirm={() => {
          if (deletingLandmark && onDeleteLandmark) {
            onDeleteLandmark(deletingLandmark.id);
            setMapNotice(`Landmark "${deletingLandmark.name}" deleted.`);
          }
          setDeletingLandmark(null);
        }}
        title="Confirm Delete Landmark Pin"
        message={`Are you sure you want to permanently delete "${deletingLandmark?.name}"? This pin will be removed from the MinSU Victoria Campus map.`}
        confirmText="Yes, Delete Pin"
        cancelText="Cancel"
        type="danger"
      />

      {/* 8. Coverage Radius Change Confirmation Modal */}
      <ConfirmationModal
        isOpen={pendingRadiusChange !== null}
        onClose={() => setPendingRadiusChange(null)}
        onConfirm={() => {
          if (pendingRadiusChange !== null) {
            handleRadiusChange(pendingRadiusChange);
            setMapNotice(`Campus coverage perimeter updated to ${pendingRadiusChange}m radius.`);
            setPendingRadiusChange(null);
          }
        }}
        title="Confirm Map Coverage Boundary Update"
        message={`Are you sure you want to update the MinSU Victoria Campus pinning coverage boundary to a ${pendingRadiusChange}m radius? Only campus facilities within this perimeter can be pinned for lost & found items.`}
        confirmText="Yes, Update Boundary"
        cancelText="Cancel"
        type="primary"
      />
    </div>
  );
};
