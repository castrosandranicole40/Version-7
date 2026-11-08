import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonButton, IonMenuButton, IonIcon 
} from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { 
  Item, 
  MINSU_VICTORIA_ZONES, 
  CampusZoneInfo, 
  CampusZone, 
  MINSU_CAMPUS_PRESETS, 
  MINSU_VICTORIA_CAMPUS_CENTER,
  CampusLandmarkPreset,
  calculateDistanceMeters 
} from '../../models/item.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonIcon
  ]
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  items: Item[] = [];
  filteredItems: Item[] = [];
  searchQuery: string = '';
  selectedType: 'all' | 'lost' | 'found' = 'all';
  selectedZone: string | null = null;
  campusZones: CampusZoneInfo[] = MINSU_VICTORIA_ZONES;
  campusPresets: CampusLandmarkPreset[] = MINSU_CAMPUS_PRESETS;
  selectedPresetId: string = 'all';

  // Leaflet Map & Layer Instances
  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private userMarker: L.Marker | null = null;
  private userCircle: L.Circle | null = null;

  // Geolocation & Proximity States
  userCoords: { lat: number; lng: number } | null = null;
  isLocating: boolean = false;
  isNearMeFilterActive: boolean = false;
  maxRadiusMeters: number = 300;
  geoStatusMessage: string | null = null;

  // Near My Zone grouped categories
  zoneCategories: { zone: CampusZone; items: Item[] }[] = [];

  ngOnInit() {
    this.loadCampusItems();
  }

  ngAfterViewInit() {
    // Delay slightly to ensure DOM has rendered
    setTimeout(() => {
      this.initLeafletMap();
    }, 200);
  }

  /**
   * 1. Leaflet & OpenStreetMap Setup
   * Pre-centered strictly on MinSU Main Victoria Campus coordinates (13.1553° N, 121.1867° E)
   */
  initLeafletMap() {
    if (!this.mapContainer?.nativeElement) return;

    // Destroy existing instance if any
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Default strictly to MinSU Victoria Campus Center with zoom 17
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng],
      zoom: MINSU_VICTORIA_CAMPUS_CENTER.defaultZoom,
      zoomControl: true,
      attributionControl: false,
      maxZoom: 19,
      minZoom: 14
    });

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | MinSU Victoria',
      maxZoom: 19
    }).addTo(this.map);

    // Campus boundary highlight circle
    L.circle([MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng], {
      radius: 350,
      color: '#005A36',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#005A36',
      fillOpacity: 0.05
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMapMarkers();
  }

  /**
   * 2. Render Markers: Distinguish Lost (#FFC72C) and Found (#0B7B48)
   */
  renderMapMarkers() {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();

    const visibleItems = this.filteredItems;

    visibleItems.forEach(item => {
      const isLost = item.type === 'lost';
      // Requirement 3: Lost (Gold/Yellow #FFC72C) and Found (Emerald Green #0B7B48)
      const pinBgColor = isLost ? '#FFC72C' : '#0B7B48';
      const pinTextColor = isLost ? '#003620' : '#FFFFFF';
      const pinLabel = isLost ? 'LOST' : 'FOUND';

      let distanceStr = '';
      if (this.userCoords) {
        const dist = calculateDistanceMeters(
          this.userCoords.lat,
          this.userCoords.lng,
          item.location.lat,
          item.location.lng
        );
        distanceStr = `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📍 ${dist}m away from you</div>`;
      }

      const customIconHtml = `
        <div class="leaflet-minsu-pin" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${pinBgColor};
          color: ${pinTextColor};
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          cursor: pointer;
          font-weight: 900;
          font-size: 9px;
          text-transform: uppercase;
        ">
          ${pinLabel}
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'minsu-item-pin-wrap',
        html: customIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const marker = L.marker([item.location.lat, item.location.lng], { icon: markerIcon });
      
      const popupHtml = `
        <div style="font-family: inherit; padding: 4px; max-width: 200px;">
          <strong style="display: block; font-size: 12px; color: #0f172a; line-height: 1.3;">${item.title}</strong>
          <div style="font-size: 11px; color: #005A36; font-weight: 600; margin-top: 4px;">
            ${item.location.specificLocation || item.location.campusZone}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Reported: ${item.date}</div>
          ${distanceStr}
          <div style="margin-top: 6px;">
            <a href="/item/${item.id}" style="
              display: inline-block;
              width: 100%;
              text-align: center;
              background: #005A36;
              color: white;
              padding: 4px 8px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 11px;
              font-weight: 700;
            ">View Details</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markersLayer?.addLayer(marker);
    });
  }

  /**
   * 3. Campus Building Preset Selection
   * Pans, zooms, and places the view on that landmark
   */
  onPresetSelected(landmarkId: string) {
    this.selectedPresetId = landmarkId;
    if (!this.map) return;

    if (landmarkId === 'all') {
      this.selectedZone = null;
      this.map.flyTo(
        [MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng],
        MINSU_VICTORIA_CAMPUS_CENTER.defaultZoom,
        { duration: 0.8 }
      );
      this.applyFilters();
      return;
    }

    const landmark = this.campusPresets.find(p => p.id === landmarkId);
    if (landmark) {
      this.selectedZone = landmark.zone;
      this.map.flyTo([landmark.lat, landmark.lng], 18, { duration: 1 });
      this.applyFilters();
    }
  }

  /**
   * 4. Device Geolocation (Near Me Filtering)
   */
  detectUserLocation() {
    if (!navigator.geolocation) {
      this.geoStatusMessage = 'Geolocation is not supported by your browser.';
      return;
    }

    this.isLocating = true;
    this.geoStatusMessage = null;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating = false;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.userCoords = { lat, lng };

        const distFromCampus = calculateDistanceMeters(
          lat,
          lng,
          MINSU_VICTORIA_CAMPUS_CENTER.lat,
          MINSU_VICTORIA_CAMPUS_CENTER.lng
        );

        if (!this.map) return;

        // Remove previous user pin & accuracy circle
        if (this.userMarker) this.map.removeLayer(this.userMarker);
        if (this.userCircle) this.map.removeLayer(this.userCircle);

        // Add user pulse marker
        const userHtml = `
          <div style="
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #2563eb;
            border: 3px solid white;
            box-shadow: 0 0 12px rgba(37,99,235,0.7);
          "></div>
        `;
        const userIcon = L.divIcon({
          className: 'minsu-user-dot',
          html: userHtml,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        this.userMarker = L.marker([lat, lng], { icon: userIcon })
          .bindPopup(`<strong>Your Location</strong><br>${distFromCampus < 1000 ? 'On MinSU Victoria Campus' : `${(distFromCampus/1000).toFixed(1)}km from MinSU Victoria`}`)
          .addTo(this.map);

        this.userCircle = L.circle([lat, lng], {
          radius: this.maxRadiusMeters,
          color: '#2563EB',
          weight: 1,
          fillColor: '#3B82F6',
          fillOpacity: 0.1
        }).addTo(this.map);

        if (distFromCampus < 2500) {
          this.map.flyTo([lat, lng], 17, { duration: 1 });
        } else {
          this.geoStatusMessage = `You are ${(distFromCampus/1000).toFixed(1)}km from MinSU Victoria Campus.`;
        }

        this.applyFilters();
      },
      (error) => {
        this.isLocating = false;
        this.geoStatusMessage = error.message || 'Unable to retrieve location.';
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  toggleNearMeFilter() {
    this.isNearMeFilterActive = !this.isNearMeFilterActive;
    if (this.isNearMeFilterActive && !this.userCoords) {
      this.detectUserLocation();
    } else {
      this.applyFilters();
    }
  }

  recenterCampus() {
    this.selectedPresetId = 'all';
    this.selectedZone = null;
    this.isNearMeFilterActive = false;
    if (this.map) {
      this.map.flyTo(
        [MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng],
        MINSU_VICTORIA_CAMPUS_CENTER.defaultZoom,
        { duration: 0.8 }
      );
    }
    this.applyFilters();
  }

  loadCampusItems() {
    this.items = [
      {
        id: 'item-101',
        title: 'Casio FX-991EX Scientific Calculator',
        description: 'Found left on Study Table #7 on the 2nd Floor Engineering Reference Section.',
        type: 'found',
        category: 'Electronics',
        date: 'Today, 9:30 AM',
        location: {
          lat: 13.1560,
          lng: 121.1873,
          campusZone: 'University Library',
          specificLocation: 'Library 2nd Floor · Table #7'
        },
        contact: '0917-555-8921',
        status: 'active',
        images: ['/src/assets/images/found_scientific_calculator_1794042804065.jpg'],
        postedBy: 'Engr. Michael Reyes',
        posterRole: 'Faculty',
        postedDate: '2026-11-07'
      },
      {
        id: 'item-102',
        title: 'Brown Leather Wallet with MinSU Student ID',
        description: 'Found on outdoor wooden bench facing the student quadrangle.',
        type: 'found',
        category: 'IDs & Wallets',
        date: 'Yesterday, 3:15 PM',
        location: {
          lat: 13.1556,
          lng: 121.1872,
          campusZone: 'University Canteen',
          specificLocation: 'Outdoor covered bench'
        },
        contact: '0928-441-9032',
        status: 'active',
        images: ['/src/assets/images/found_leather_wallet_1794042803655.jpg'],
        postedBy: 'Mary Grace Santos',
        posterRole: 'Student',
        postedDate: '2026-11-06'
      },
      {
        id: 'item-103',
        title: 'Sage Green AquaFlask 32oz Tumbler',
        description: 'Left behind during intramural practice on the lower bleachers.',
        type: 'lost',
        category: 'Personal Care & Tumblers',
        date: 'Nov 5, 2026',
        location: {
          lat: 13.1555,
          lng: 121.1856,
          campusZone: 'University Gymnasium',
          specificLocation: 'Gymnasium · Lower Bleachers'
        },
        contact: '0945-882-1200',
        reward: '₱300 Reward',
        status: 'active',
        images: ['/src/assets/images/found_hydroflask_tumbler_1794042803694.jpg'],
        postedBy: 'Carlos Bautista',
        posterRole: 'Student',
        postedDate: '2026-11-05'
      },
      {
        id: 'item-104',
        title: 'Motorcycle Ignition Keys with Tamaraw Ribbon',
        description: 'Found on the security post guard desk counter at the main campus entrance.',
        type: 'found',
        category: 'Keys',
        date: 'Nov 4, 2026',
        location: {
          lat: 13.1582,
          lng: 121.1868,
          campusZone: 'Main Gate & Security Post',
          specificLocation: 'Main Gate · Turnstile Guardhouse'
        },
        contact: '0919-332-1144',
        status: 'active',
        images: ['/src/assets/images/minsu_campus_grounds_1794042802593.jpg'],
        postedBy: 'Officer Danilo Ramos',
        posterRole: 'Security Staff',
        postedDate: '2026-11-04'
      }
    ];

    this.applyFilters();
    this.groupItemsByZone();
  }

  groupItemsByZone() {
    const zones: CampusZone[] = [
      'University Library',
      'Administration Building',
      'University Gymnasium',
      'OSAS (Student Affairs)',
      'Main Gate & Security Post',
      'University Canteen'
    ];

    this.zoneCategories = zones.map(z => ({
      zone: z,
      items: this.items.filter(it => it.location.campusZone === z)
    })).filter(g => g.items.length > 0);
  }

  setTypeFilter(type: 'all' | 'lost' | 'found') {
    this.selectedType = type;
    this.applyFilters();
  }

  setZoneFilter(zone: string | null) {
    this.selectedZone = zone;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredItems = this.items.filter(item => {
      const matchesSearch = !this.searchQuery || 
        item.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesType = this.selectedType === 'all' || item.type === this.selectedType;
      const matchesZone = !this.selectedZone || item.location.campusZone === this.selectedZone;

      let matchesProximity = true;
      if (this.isNearMeFilterActive && this.userCoords) {
        const dist = calculateDistanceMeters(
          this.userCoords.lat,
          this.userCoords.lng,
          item.location.lat,
          item.location.lng
        );
        matchesProximity = dist <= this.maxRadiusMeters;
      }

      return matchesSearch && matchesType && matchesZone && matchesProximity;
    });

    this.renderMapMarkers();
  }
}
