import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type {
  HumanWebData,
  MapInvite,
  MapMember,
  MapMemberRole,
  Person,
  Relationship,
  SharedMap,
  UserProfile,
} from '../types/graph';

// Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
  }
}

export { auth, db };

// ----------------------------------------------------
// AUTHENTICATION UTILITIES
// ----------------------------------------------------

export function mapFirebaseUser(user: User | null): UserProfile | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Friend',
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(mapFirebaseUser(user));
  });
}

export async function loginWithGoogle(): Promise<UserProfile> {
  if (!auth) throw new Error('Firebase is not configured. Please add your credentials.');
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return mapFirebaseUser(cred.user)!;
}

export async function loginAsGuest(guestName?: string): Promise<UserProfile> {
  if (!auth) throw new Error('Firebase is not configured. Please add your credentials.');
  const cred = await signInAnonymously(auth);
  if (guestName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: guestName });
  }
  return mapFirebaseUser(cred.user)!;
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  if (!auth) throw new Error('Firebase is not configured. Please add your credentials.');
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return mapFirebaseUser(cred.user)!;
}

export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<UserProfile> {
  if (!auth) throw new Error('Firebase is not configured. Please add your credentials.');
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName });
  }
  return mapFirebaseUser(cred.user)!;
}

export async function logoutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// ----------------------------------------------------
// FIRESTORE MAPS & REAL-TIME COLLABORATION
// ----------------------------------------------------

export async function createSharedMap(
  title: string,
  description: string,
  user: UserProfile,
  initialPeople: Person[] = [],
  initialRelationships: Relationship[] = []
): Promise<string> {
  if (!db) throw new Error('Firestore is not configured.');

  const mapRef = doc(collection(db, 'maps'));
  const mapId = mapRef.id;
  const now = Date.now();

  const memberInfo: MapMember = {
    uid: user.uid,
    email: user.email || 'guest@humanweb.app',
    displayName: user.displayName || 'Creator',
    photoURL: user.photoURL || undefined,
    role: 'owner',
    joinedAt: now,
  };

  const newMap: SharedMap = {
    id: mapId,
    title: title.trim() || 'Untitled Social Map',
    description: description.trim() || undefined,
    ownerId: user.uid,
    ownerName: user.displayName || user.email || 'Map Owner',
    members: {
      [user.uid]: memberInfo,
    },
    invites: {},
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(mapRef, newMap);

  // If seeded with people & relationships, batch write them in chunks of 350
  if (initialPeople.length > 0 || initialRelationships.length > 0) {
    await batchWriteGraphData(mapId, initialPeople, initialRelationships);
  }

  return mapId;
}

export async function batchWriteGraphData(
  mapId: string,
  people: Person[],
  relationships: Relationship[]
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');

  const BATCH_SIZE = 350;
  let batch = writeBatch(db);
  let opCount = 0;

  for (const person of people) {
    const personRef = doc(db, 'maps', mapId, 'people', person.id);
    batch.set(personRef, person);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  for (const rel of relationships) {
    const relRef = doc(db, 'maps', mapId, 'relationships', rel.id);
    batch.set(relRef, rel);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
}

export function subscribeToSharedMap(
  mapId: string,
  onMapUpdate: (map: SharedMap | null) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    onMapUpdate(null);
    return () => {};
  }

  const mapRef = doc(db, 'maps', mapId);
  return onSnapshot(
    mapRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onMapUpdate(snapshot.data() as SharedMap);
      } else {
        onMapUpdate(null);
      }
    },
    (err) => {
      console.error('Error subscribing to map metadata:', err);
      onError?.(err);
    }
  );
}

export function subscribeToFirestorePeople(
  mapId: string,
  onPeopleUpdate: (people: Person[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    onPeopleUpdate([]);
    return () => {};
  }

  const peopleColl = collection(db, 'maps', mapId, 'people');
  return onSnapshot(
    peopleColl,
    (snapshot) => {
      const list: Person[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Person);
      });
      onPeopleUpdate(list);
    },
    (err) => {
      console.error('Error subscribing to people subcollection:', err);
      onError?.(err);
    }
  );
}

export function subscribeToFirestoreRelationships(
  mapId: string,
  onRelationshipsUpdate: (rels: Relationship[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    onRelationshipsUpdate([]);
    return () => {};
  }

  const relsColl = collection(db, 'maps', mapId, 'relationships');
  return onSnapshot(
    relsColl,
    (snapshot) => {
      const list: Relationship[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Relationship);
      });
      onRelationshipsUpdate(list);
    },
    (err) => {
      console.error('Error subscribing to relationships subcollection:', err);
      onError?.(err);
    }
  );
}

export async function savePersonToFirestore(mapId: string, person: Person): Promise<void> {
  if (!db) return;
  const personRef = doc(db, 'maps', mapId, 'people', person.id);
  await setDoc(personRef, person);
}

export async function deletePersonFromFirestore(mapId: string, personId: string): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);
  const personRef = doc(db, 'maps', mapId, 'people', personId);
  batch.delete(personRef);

  // Delete all connecting relationships
  const relsColl = collection(db, 'maps', mapId, 'relationships');
  const q1 = query(relsColl, where('source', '==', personId));
  const q2 = query(relsColl, where('target', '==', personId));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  snap1.forEach((d) => batch.delete(d.ref));
  snap2.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

export async function saveRelationshipToFirestore(mapId: string, rel: Relationship): Promise<void> {
  if (!db) return;
  const relRef = doc(db, 'maps', mapId, 'relationships', rel.id);
  await setDoc(relRef, rel);
}

export async function deleteRelationshipFromFirestore(mapId: string, relId: string): Promise<void> {
  if (!db) return;
  const relRef = doc(db, 'maps', mapId, 'relationships', relId);
  await deleteDoc(relRef);
}

export async function updateNodePositionsInFirestore(
  mapId: string,
  positions: Array<{ id: string; x?: number; y?: number; fx?: number | null; fy?: number | null }>
): Promise<void> {
  if (!db || positions.length === 0) return;
  const batch = writeBatch(db);

  for (const pos of positions) {
    const personRef = doc(db, 'maps', mapId, 'people', pos.id);
    batch.update(personRef, {
      x: pos.x,
      y: pos.y,
      fx: pos.fx,
      fy: pos.fy,
    });
  }

  await batch.commit();
}

// ----------------------------------------------------
// INVITATIONS & ACCESS CONTROL
// ----------------------------------------------------

export async function generateMapInvite(
  mapId: string,
  user: UserProfile,
  role: MapMemberRole = 'editor'
): Promise<string> {
  if (!db) throw new Error('Firestore is not configured.');

  const token = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const invite: MapInvite = {
    token,
    role,
    createdAt: Date.now(),
    createdBy: user.uid,
    useCount: 0,
  };

  const mapRef = doc(db, 'maps', mapId);
  await updateDoc(mapRef, {
    [`invites.${token}`]: invite,
  });

  return token;
}

export async function joinSharedMapWithToken(
  mapId: string,
  token: string,
  user: UserProfile
): Promise<SharedMap> {
  if (!db) throw new Error('Firestore is not configured.');

  const mapRef = doc(db, 'maps', mapId);
  const snap = await getDoc(mapRef);

  if (!snap.exists()) {
    throw new Error('Shared map does not exist.');
  }

  const mapData = snap.data() as SharedMap;
  const invite = mapData.invites?.[token];

  if (!invite) {
    throw new Error('Invalid or expired invitation link.');
  }

  const role = invite.role || 'editor';
  const newMember: MapMember = {
    uid: user.uid,
    email: user.email || 'guest@humanweb.app',
    displayName: user.displayName || 'Member',
    photoURL: user.photoURL || undefined,
    role,
    joinedAt: Date.now(),
  };

  await updateDoc(mapRef, {
    [`members.${user.uid}`]: newMember,
    [`invites.${token}.useCount`]: (invite.useCount || 0) + 1,
  });

  mapData.members[user.uid] = newMember;
  return mapData;
}

export async function getUserAccessibleMaps(user: UserProfile): Promise<SharedMap[]> {
  if (!db) return [];
  const mapsColl = collection(db, 'maps');
  const snap = await getDocs(mapsColl);
  const results: SharedMap[] = [];

  snap.forEach((d) => {
    const data = d.data() as SharedMap;
    if (data.members && data.members[user.uid]) {
      results.push(data);
    }
  });

  return results;
}

// ----------------------------------------------------
// EXPLICIT JSON MIGRATION TO CLOUD
// ----------------------------------------------------

export async function migrateJsonToSharedMap(
  title: string,
  jsonData: HumanWebData,
  user: UserProfile
): Promise<{ mapId: string; peopleCount: number; relationshipCount: number }> {
  if (!db) throw new Error('Firestore is not configured.');

  // Create new map
  const mapId = await createSharedMap(
    title,
    `Migrated on ${new Date().toLocaleDateString()}`,
    user
  );

  // Read existing IDs to safeguard against duplicates
  const peopleColl = collection(db, 'maps', mapId, 'people');
  const existingPeopleSnap = await getDocs(peopleColl);
  const existingPeopleIds = new Set<string>();
  existingPeopleSnap.forEach((d) => existingPeopleIds.add(d.id));

  const relsColl = collection(db, 'maps', mapId, 'relationships');
  const existingRelSnap = await getDocs(relsColl);
  const existingRelIds = new Set<string>();
  existingRelSnap.forEach((d) => existingRelIds.add(d.id));

  // Filter out any duplicates
  const peopleToWrite = jsonData.people.filter((p) => !existingPeopleIds.has(p.id));
  const relsToWrite = jsonData.relationships.filter((r) => !existingRelIds.has(r.id));

  await batchWriteGraphData(mapId, peopleToWrite, relsToWrite);

  return {
    mapId,
    peopleCount: peopleToWrite.length,
    relationshipCount: relsToWrite.length,
  };
}
