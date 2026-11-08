/**
 * Firebase Service for MinSU FoundIt!
 * Mindoro State University Victoria Campus
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy,
  Unsubscribe,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';
import { Item, CampusLandmarkPreset, SecurityReport } from '../app/models/item.model';
import { User } from '../app/models/user.model';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const authInstance = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid || null,
      email: authInstance?.currentUser?.email || null,
      emailVerified: authInstance?.currentUser?.emailVerified || false,
      isAnonymous: authInstance?.currentUser?.isAnonymous || false,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!firebaseApp) {
    try {
      firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    } catch (err) {
      console.warn('Could not initialize Firebase App with provided credentials:', err);
      return null;
    }
  }
  return firebaseApp;
}

export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (!firestoreDb) {
    const app = getFirebaseApp();
    if (app) {
      try {
        firestoreDb = getFirestore(app);
      } catch (err) {
        console.warn('Could not get Firestore instance:', err);
        return null;
      }
    }
  }
  return firestoreDb;
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!firebaseAuth) {
    const app = getFirebaseApp();
    if (app) {
      try {
        firebaseAuth = getAuth(app);
      } catch (err) {
        console.warn('Could not get Auth instance:', err);
        return null;
      }
    }
  }
  return firebaseAuth;
}

/**
 * Validate connection to Firestore
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      message: 'Firebase configuration is using placeholders. Please paste your Firebase API key in src/firebase/firebaseConfig.ts.'
    };
  }

  const db = getFirestoreDb();
  if (!db) {
    return {
      success: false,
      message: 'Failed to initialize Firestore instance. Check your project ID and API key.'
    };
  }

  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return {
      success: true,
      message: 'Successfully connected to Firebase Firestore!'
    };
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      return {
        success: false,
        message: 'Firebase client is offline or project unreachable. Please verify your Firestore settings.'
      };
    }
    // Often permission-denied on a non-existent document still confirms project connectivity
    if (error?.code === 'permission-denied') {
      return {
        success: true,
        message: 'Firebase project reached! (Firestore rules active).'
      };
    }
    return {
      success: false,
      message: error?.message || 'Error connecting to Firestore.'
    };
  }
}

/**
 * Save an item to Firestore 'items' collection
 */
export async function saveItemToFirestore(item: Item): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `items/${item.id}`;
  try {
    await setDoc(doc(db, 'items', item.id), {
      ...item,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Update an item (e.g. mark as claimed) in Firestore
 */
export async function updateItemInFirestore(itemId: string, data: Partial<Item>): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `items/${itemId}`;
  try {
    await updateDoc(doc(db, 'items', itemId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

/**
 * Fetch all items from Firestore
 */
export async function fetchItemsFromFirestore(): Promise<Item[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const path = 'items';
  try {
    const q = query(collection(db, 'items'));
    const snapshot = await getDocs(q);
    const results: Item[] = [];
    snapshot.forEach((d) => {
      results.push(d.data() as Item);
    });
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

/**
 * Subscribe to realtime item updates from Firestore
 */
export function subscribeToFirestoreItems(
  onUpdate: (items: Item[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const path = 'items';
  try {
    const q = query(collection(db, 'items'));
    return onSnapshot(
      q,
      (snapshot) => {
        const results: Item[] = [];
        snapshot.forEach((d) => {
          results.push(d.data() as Item);
        });
        if (results.length > 0) {
          onUpdate(results);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

/**
 * Save user profile to Firestore
 */
export async function saveUserToFirestore(user: User): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), {
      ...user,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Save or update a campus landmark in Firestore
 */
export async function saveLandmarkToFirestore(landmark: CampusLandmarkPreset): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `landmarks/${landmark.id}`;
  try {
    await setDoc(doc(db, 'landmarks', landmark.id), {
      ...landmark,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a custom campus landmark in Firestore
 */
export async function deleteLandmarkFromFirestore(landmarkId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `landmarks/${landmarkId}`;
  try {
    await deleteDoc(doc(db, 'landmarks', landmarkId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Fetch all landmarks from Firestore
 */
export async function fetchLandmarksFromFirestore(): Promise<CampusLandmarkPreset[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const path = 'landmarks';
  try {
    const q = query(collection(db, 'landmarks'));
    const snapshot = await getDocs(q);
    const results: CampusLandmarkPreset[] = [];
    snapshot.forEach((d) => {
      results.push(d.data() as CampusLandmarkPreset);
    });
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

/**
 * Subscribe to realtime landmark updates from Firestore
 */
export function subscribeToFirestoreLandmarks(
  onUpdate: (landmarks: CampusLandmarkPreset[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const path = 'landmarks';
  try {
    const q = query(collection(db, 'landmarks'));
    return onSnapshot(
      q,
      (snapshot) => {
        const results: CampusLandmarkPreset[] = [];
        snapshot.forEach((d) => {
          results.push(d.data() as CampusLandmarkPreset);
        });
        if (results.length > 0) {
          onUpdate(results);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

/**
 * Delete or completely remove an item from Firestore
 */
export async function deleteItemFromFirestore(itemId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'items', itemId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Save a new user security report (flagged post, spam, ad, fake claim) to Firestore
 */
export async function saveSecurityReportToFirestore(report: SecurityReport): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `security_reports/${report.id}`;
  try {
    await setDoc(doc(db, 'security_reports', report.id), {
      ...report,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Fetch all security reports from Firestore
 */
export async function fetchSecurityReportsFromFirestore(): Promise<SecurityReport[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const path = 'security_reports';
  try {
    const q = query(collection(db, 'security_reports'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const results: SecurityReport[] = [];
    snapshot.forEach((d) => {
      results.push(d.data() as SecurityReport);
    });
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

/**
 * Update an existing security report (e.g. resolve, dismiss, remove post)
 */
export async function updateSecurityReportInFirestore(
  reportId: string, 
  updates: Partial<SecurityReport>
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `security_reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'security_reports', reportId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

/**
 * Real-time subscription to security reports
 */
export function subscribeToFirestoreSecurityReports(
  onUpdate: (reports: SecurityReport[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const path = 'security_reports';
  try {
    const q = query(collection(db, 'security_reports'), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const results: SecurityReport[] = [];
        snapshot.forEach((d) => {
          results.push(d.data() as SecurityReport);
        });
        if (results.length > 0) {
          onUpdate(results);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

/**
 * Save in-app real-time message to Firestore
 */
export async function saveMessageToFirestore(message: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  const path = `messages/${message.id}`;
  try {
    await setDoc(doc(db, 'messages', message.id), message);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}
