import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { NurseStaff, DemandeConge } from '../types/nurse';
import { GuardScheduleRecord } from '../types/guardSchedule';

export interface CloudSyncStatus {
  user: User | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Register with Email and Password
 */
export async function registerWithEmail(email: string, pass: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Sign in with Google (Popup)
 */
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

/**
 * Log out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Merge & Upload existing local data to Cloud without deleting ANY prior changes
 */
export async function migrateLocalDataToCloud(
  userId: string,
  localNurses: NurseStaff[],
  localDemandes: DemandeConge[],
  localArchives: GuardScheduleRecord[]
): Promise<{ nurses: NurseStaff[]; demandes: DemandeConge[]; archives: GuardScheduleRecord[] }> {
  try {
    // 1. Fetch remote nurses
    const nursesColRef = collection(db, 'users', userId, 'nurses');
    const remoteNursesSnap = await getDocs(nursesColRef);
    const remoteNursesMap = new Map<string, NurseStaff>();
    remoteNursesSnap.forEach(d => {
      remoteNursesMap.set(d.id, d.data() as NurseStaff);
    });

    // Merge nurses: keep all local nurses and upload to cloud
    const mergedNursesMap = new Map<string, NurseStaff>(remoteNursesMap);
    for (const nurse of localNurses) {
      // Local changes take precedence if present
      mergedNursesMap.set(nurse.id, nurse);
      await setDoc(doc(db, 'users', userId, 'nurses', nurse.id), nurse, { merge: true });
    }

    // 2. Fetch remote demandes
    const demandesColRef = collection(db, 'users', userId, 'demandes');
    const remoteDemandesSnap = await getDocs(demandesColRef);
    const remoteDemandesMap = new Map<string, DemandeConge>();
    remoteDemandesSnap.forEach(d => {
      remoteDemandesMap.set(d.id, d.data() as DemandeConge);
    });

    const mergedDemandesMap = new Map<string, DemandeConge>(remoteDemandesMap);
    for (const dem of localDemandes) {
      mergedDemandesMap.set(dem.id, dem);
      await setDoc(doc(db, 'users', userId, 'demandes', dem.id), dem, { merge: true });
    }

    // 3. Fetch remote guard archives
    const archivesColRef = collection(db, 'users', userId, 'guardSchedules');
    const remoteArchivesSnap = await getDocs(archivesColRef);
    const remoteArchivesMap = new Map<string, GuardScheduleRecord>();
    remoteArchivesSnap.forEach(d => {
      remoteArchivesMap.set(d.id, d.data() as GuardScheduleRecord);
    });

    const mergedArchivesMap = new Map<string, GuardScheduleRecord>(remoteArchivesMap);
    for (const arc of localArchives) {
      mergedArchivesMap.set(arc.id, arc);
      await setDoc(doc(db, 'users', userId, 'guardSchedules', arc.id), arc, { merge: true });
    }

    return {
      nurses: Array.from(mergedNursesMap.values()),
      demandes: Array.from(mergedDemandesMap.values()),
      archives: Array.from(mergedArchivesMap.values())
    };

  } catch (err) {
    console.error('Error during cloud migration:', err);
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Save single nurse to Firestore
 */
export async function cloudSaveNurse(userId: string, nurse: NurseStaff): Promise<void> {
  const path = `users/${userId}/nurses/${nurse.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'nurses', nurse.id), nurse, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Delete nurse from Firestore
 */
export async function cloudDeleteNurse(userId: string, nurseId: string): Promise<void> {
  const path = `users/${userId}/nurses/${nurseId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'nurses', nurseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Save leave request to Firestore
 */
export async function cloudSaveDemande(userId: string, demande: DemandeConge): Promise<void> {
  const path = `users/${userId}/demandes/${demande.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'demandes', demande.id), demande, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Delete leave request from Firestore
 */
export async function cloudDeleteDemande(userId: string, demandeId: string): Promise<void> {
  const path = `users/${userId}/demandes/${demandeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'demandes', demandeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Save guard schedule record to Firestore
 */
export async function cloudSaveGuardSchedule(userId: string, record: GuardScheduleRecord): Promise<void> {
  const path = `users/${userId}/guardSchedules/${record.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'guardSchedules', record.id), record, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
