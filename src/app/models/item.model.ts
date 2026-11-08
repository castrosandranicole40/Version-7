/**
 * MinSU FoundIt! - Item Interface & Campus Locations
 * Mindoro State University - Victoria Campus
 */

export type ItemType = 'lost' | 'found';
export type ItemStatus = 'active' | 'claimed' | 'pending';

export type ItemCategory =
  | 'IDs & Wallets'
  | 'Electronics'
  | 'Books & Notes'
  | 'Keys'
  | 'Bags & Backpacks'
  | 'Uniforms & Clothing'
  | 'Accessories & Jewelry'
  | 'Personal Care & Tumblers'
  | 'Sports Equipment'
  | 'Others';

export type CampusZone =
  | 'University Library'
  | 'Administration Building'
  | 'Admin Building'
  | 'University Gymnasium'
  | 'Gymnasium'
  | 'OSAS (Student Affairs)'
  | 'Student Center'
  | 'Student Activity Center'
  | 'Academic Classrooms'
  | 'CTE (College of Education)'
  | 'College of Agriculture'
  | 'University Canteen'
  | 'Canteen'
  | 'Main Gate & Security Post'
  | 'Main Gate'
  | 'Grandstand & Athletic Oval'
  | 'Research & Extension Complex';

export interface CampusLandmarkPreset {
  id: string;
  name: string;
  zone: CampusZone;
  lat: number;
  lng: number;
  description: string;
  isCustom?: boolean;
  createdBy?: string;
  updatedAt?: string;
}

export const LOCAL_STORAGE_LANDMARKS_KEY = 'minsu_campus_landmarks_v2';

export function getInitialCampusLandmarks(): CampusLandmarkPreset[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_LANDMARKS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return MINSU_CAMPUS_PRESETS;
}

export function saveLocalCampusLandmarks(landmarks: CampusLandmarkPreset[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_LANDMARKS_KEY, JSON.stringify(landmarks));
  } catch (e) {
    // localStorage unavailable
  }
}

export const MINSU_VICTORIA_CAMPUS_CENTER = {
  lat: 13.1553,
  lng: 121.1867,
  name: 'Mindoro State University Main Campus (Victoria)',
  defaultZoom: 17,
};

// Official MinSU Victoria Campus Geographic Coverage Configuration
export const MINSU_CAMPUS_COVERAGE = {
  center: { lat: 13.1553, lng: 121.1867 },
  defaultRadiusMeters: 550, // Default covered campus radius in meters
  minRadiusMeters: 300,
  maxRadiusMeters: 1200,
  // Approximate rectangular bounding box for Leaflet bounds restriction
  bounds: {
    southWest: { lat: 13.1490, lng: 121.1800 },
    northEast: { lat: 13.1620, lng: 121.1935 },
  },
};

export const LOCAL_STORAGE_CAMPUS_RADIUS_KEY = 'minsu_campus_coverage_radius_v2';

export function getCampusCoverageRadius(): number {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CAMPUS_RADIUS_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 250 && parsed <= 1500) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return MINSU_CAMPUS_COVERAGE.defaultRadiusMeters;
}

export function saveCampusCoverageRadius(radius: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CAMPUS_RADIUS_KEY, String(radius));
  } catch (e) {
    // localStorage unavailable
  }
}

/**
 * Validates whether a geographic coordinate falls strictly within the MinSU Victoria Campus covered area.
 * Returns boolean status, distance in meters from center, and nearest authorized landmark.
 */
export function isCoordinateWithinCampus(
  lat: number,
  lng: number,
  landmarks: CampusLandmarkPreset[] = MINSU_CAMPUS_PRESETS,
  customRadiusMeters = getCampusCoverageRadius()
): { isAllowed: boolean; distanceToCenter: number; nearestLandmark: CampusLandmarkPreset; minLandmarkDistance: number } {
  const distanceToCenter = calculateDistanceMeters(
    MINSU_CAMPUS_COVERAGE.center.lat,
    MINSU_CAMPUS_COVERAGE.center.lng,
    lat,
    lng
  );

  let nearestLandmark: CampusLandmarkPreset = landmarks[0] || MINSU_CAMPUS_PRESETS[0];
  let minLandmarkDistance = Infinity;

  landmarks.forEach((lm) => {
    const d = calculateDistanceMeters(lat, lng, lm.lat, lm.lng);
    if (d < minLandmarkDistance) {
      minLandmarkDistance = d;
      nearestLandmark = lm;
    }
  });

  // 1. Within campus coverage radius
  if (distanceToCenter <= customRadiusMeters) {
    return { isAllowed: true, distanceToCenter, nearestLandmark, minLandmarkDistance };
  }

  // 2. Or within 160 meters of any custom admin-placed landmark
  if (minLandmarkDistance <= 160) {
    return { isAllowed: true, distanceToCenter, nearestLandmark, minLandmarkDistance };
  }

  return { isAllowed: false, distanceToCenter, nearestLandmark, minLandmarkDistance };
}

export const MINSU_CAMPUS_PRESETS: CampusLandmarkPreset[] = [
  {
    id: 'admin',
    name: 'Admin Building',
    zone: 'Administration Building',
    lat: 13.1563,
    lng: 121.1866,
    description: 'Administration offices, Registrar, Cashier, and Executive Suite',
  },
  {
    id: 'library',
    name: 'University Library',
    zone: 'University Library',
    lat: 13.1560,
    lng: 121.1873,
    description: 'Central Learning Commons, Reading Areas & Reference Sections',
  },
  {
    id: 'gym',
    name: 'Gymnasium',
    zone: 'University Gymnasium',
    lat: 13.1555,
    lng: 121.1856,
    description: 'Main Sports Arena, Bleachers, Stage & Athletic Facilities',
  },
  {
    id: 'student_center',
    name: 'Student Center',
    zone: 'Student Center',
    lat: 13.1552,
    lng: 121.1863,
    description: 'Student Activity Center, OSAS & SSC Organization Offices',
  },
  {
    id: 'classrooms',
    name: 'Academic Classrooms',
    zone: 'Academic Classrooms',
    lat: 13.1548,
    lng: 121.1862,
    description: 'College of Education (CTE), Lecture Halls & Academic Classrooms',
  },
  {
    id: 'canteen',
    name: 'Canteen',
    zone: 'University Canteen',
    lat: 13.1556,
    lng: 121.1872,
    description: 'University Food Hall, Snack Bars & Student Dining Area',
  },
  {
    id: 'main_gate',
    name: 'Main Gate',
    zone: 'Main Gate & Security Post',
    lat: 13.1582,
    lng: 121.1868,
    description: 'Campus Main Entrance along Minas Road & Security Guard Post',
  },
];

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface CampusLocation {
  lat: number;
  lng: number;
  campusZone: CampusZone;
  specificLocation?: string; // e.g. "2nd floor periodicals section, table 4"
}

export interface Item {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  category: ItemCategory;
  date: string; // ISO date string or formatted date
  location: CampusLocation;
  contact: string;
  reward?: string; // e.g. "₱500 Cash Reward" or "Gratitude / Free Coffee"
  status: ItemStatus;
  images: string[];
  postedBy: string; // user display name
  posterId?: string; // user ID
  posterEmail?: string;
  posterRole?: string;
  postedDate: string;
  claimedBy?: string;
  claimedDate?: string;
  isRemoved?: boolean;
  reportCount?: number;
  isTrash?: boolean;
  trashedAt?: string;
  isReunited?: boolean;
}

export type SecurityReportReason = 
  | 'spam'           // Spam, advertisement, commercial selling, unauthorized promotion
  | 'fake_claim'     // False claim, suspicious ownership, fake/non-existent item
  | 'inappropriate'  // Inappropriate image, offensive remarks, vulgarity, harassment
  | 'duplicate'      // Duplicate listing, repeatedly posted item
  | 'other';         // Other campus safety or policy violation

export type SecurityReportStatus = 'Pending Review' | 'Resolved' | 'Post Removed' | 'Dismissed';

export interface SecurityReport {
  id: string;
  itemId: string;
  itemTitle: string;
  itemCategory?: ItemCategory;
  itemType?: ItemType;
  itemImage?: string;
  reportedBy: string; // reporter display name
  reporterId?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  reporterRole?: string;
  reason: SecurityReportReason;
  reasonDetails?: string; // details or explanation written by user
  reportedAt: string; // formatted date & time
  timestamp: number;
  status: SecurityReportStatus;
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export const LOCAL_STORAGE_SECURITY_REPORTS_KEY = 'minsu_security_reports_v1';

export function getLocalSecurityReports(): SecurityReport[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_SECURITY_REPORTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // fallback
  }
  return [];
}

export function saveLocalSecurityReports(reports: SecurityReport[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SECURITY_REPORTS_KEY, JSON.stringify(reports));
  } catch (e) {
    // localStorage unavailable
  }
}

/** Pre-defined MinSU Victoria Campus Zones with coordinates and descriptions */
export interface CampusZoneInfo {
  name: CampusZone;
  shortName: string;
  lat: number;
  lng: number;
  description: string;
  iconName: string;
  svgPos: { x: number; y: number }; // Relative percentage for interactive campus SVG map
}

export const MINSU_VICTORIA_ZONES: CampusZoneInfo[] = [
  {
    name: 'University Library',
    shortName: 'Library',
    lat: 13.1560,
    lng: 121.1873,
    description: 'Central Learning Commons, e-Library & Reference Sections',
    iconName: 'BookOpen',
    svgPos: { x: 45, y: 35 },
  },
  {
    name: 'Administration Building',
    shortName: 'Admin',
    lat: 13.1563,
    lng: 121.1866,
    description: 'Presidential Offices, Registrar, Cashier & Main Lobby',
    iconName: 'Building2',
    svgPos: { x: 52, y: 22 },
  },
  {
    name: 'University Gymnasium',
    shortName: 'Gym',
    lat: 13.1555,
    lng: 121.1856,
    description: 'Main Sports Arena, Bleachers, Stage & Dressing Rooms',
    iconName: 'Trophy',
    svgPos: { x: 26, y: 48 },
  },
  {
    name: 'OSAS (Student Affairs)',
    shortName: 'OSAS',
    lat: 13.1552,
    lng: 121.1863,
    description: 'Office of Student Affairs and Services & SSC Council Room',
    iconName: 'Users',
    svgPos: { x: 56, y: 42 },
  },
  {
    name: 'Main Gate & Security Post',
    shortName: 'Main Gate',
    lat: 13.1582,
    lng: 121.1868,
    description: 'Campus Main Entrance along Minas Road & Security Guard Post',
    iconName: 'Shield',
    svgPos: { x: 78, y: 15 },
  },
  {
    name: 'CTE (College of Education)',
    shortName: 'CTE',
    lat: 13.1548,
    lng: 121.1862,
    description: 'Teacher Education Classrooms, Audio-Visual Room & Faculty',
    iconName: 'GraduationCap',
    svgPos: { x: 65, y: 58 },
  },
  {
    name: 'College of Agriculture',
    shortName: 'Agriculture',
    lat: 13.1538,
    lng: 121.1866,
    description: 'Agri-Tech Labs, Demonstration Farm & Soil Testing Center',
    iconName: 'Wheat',
    svgPos: { x: 74, y: 75 },
  },
  {
    name: 'University Canteen',
    shortName: 'Canteen',
    lat: 13.1556,
    lng: 121.1872,
    description: 'Student Food Hall, Beverage Kiosks & Outdoor Seating Patio',
    iconName: 'Coffee',
    svgPos: { x: 38, y: 52 },
  },
  {
    name: 'Student Activity Center',
    shortName: 'SAC',
    lat: 13.1544,
    lng: 121.1864,
    description: 'Club Booths, Gazebos & Student Organization Headquarters',
    iconName: 'Layers',
    svgPos: { x: 46, y: 68 },
  },
  {
    name: 'Grandstand & Athletic Oval',
    shortName: 'Oval',
    lat: 13.1542,
    lng: 121.1850,
    description: 'Running Track, Football Field & Open Bleachers',
    iconName: 'Flag',
    svgPos: { x: 22, y: 78 },
  },
  {
    name: 'Research & Extension Complex',
    shortName: 'Research',
    lat: 13.1568,
    lng: 121.1875,
    description: 'Bio-Research Laboratories, Extension Training Hall',
    iconName: 'FlaskConical',
    svgPos: { x: 86, y: 38 },
  },
];

export const ITEM_CATEGORIES: ItemCategory[] = [
  'IDs & Wallets',
  'Electronics',
  'Books & Notes',
  'Keys',
  'Bags & Backpacks',
  'Uniforms & Clothing',
  'Accessories & Jewelry',
  'Personal Care & Tumblers',
  'Sports Equipment',
  'Others',
];
