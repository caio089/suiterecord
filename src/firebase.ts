import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Meeting, PermittedUser, SuiterConfig, SuiterLog } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyCictaSkKp_xEfgCrfE6lJcWgVFtgkVKQg",
  authDomain: "gen-lang-client-0252965692.firebaseapp.com",
  projectId: "gen-lang-client-0252965692",
  storageBucket: "gen-lang-client-0252965692.firebasestorage.app",
  messagingSenderId: "934408559844",
  appId: "1:934408559844:web:cbe738adfaf202e6dc20f1"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID provided in the config
export const db = getFirestore(app, "ai-studio-suiterrecorder-f71833a6-d5ba-4c41-97db-8e6362d9541b");
export const auth = getAuth(app);

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// MEETING OPERATIONS
export const saveMeetingInCloud = async (meeting: Meeting) => {
  const path = `meetings/${meeting.id}`;
  try {
    await setDoc(doc(db, "meetings", meeting.id), meeting);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
};

export const deleteMeetingInCloud = async (meetingId: string) => {
  const path = `meetings/${meetingId}`;
  try {
    await deleteDoc(doc(db, "meetings", meetingId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
};

export const loadMeetingsFromCloud = async (): Promise<Meeting[]> => {
  const path = "meetings";
  try {
    const querySnapshot = await getDocs(collection(db, "meetings"));
    const list: Meeting[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as Meeting);
    });
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path);
    return [];
  }
};

// PERMITTED USER OPERATIONS
export const savePermittedUserInCloud = async (user: PermittedUser) => {
  const path = `permitted_users/${user.id}`;
  try {
    await setDoc(doc(db, "permitted_users", user.id), user);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
};

export const deletePermittedUserFromCloud = async (userId: string) => {
  const path = `permitted_users/${userId}`;
  try {
    await deleteDoc(doc(db, "permitted_users", userId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
};

export const loadPermittedUsersFromCloud = async (): Promise<PermittedUser[]> => {
  const path = "permitted_users";
  try {
    const querySnapshot = await getDocs(collection(db, "permitted_users"));
    const list: PermittedUser[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as PermittedUser);
    });
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path);
    return [];
  }
};

// SUITER CONFIG OPERATIONS
export const saveSuiterConfigInCloud = async (config: SuiterConfig) => {
  const path = "config/suiter_config";
  try {
    await setDoc(doc(db, "config", "suiter_config"), config);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
};

export const loadSuiterConfigFromCloud = async (): Promise<SuiterConfig | null> => {
  const path = "config/suiter_config";
  try {
    const docSnap = await getDoc(doc(db, "config", "suiter_config"));
    if (docSnap.exists()) {
      return docSnap.data() as SuiterConfig;
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return null;
  }
};

// SUITER LOG OPERATIONS
export const saveSuiterLogsInCloud = async (logs: SuiterLog[]) => {
  const path = "config/suiter_logs";
  try {
    await setDoc(doc(db, "config", "suiter_logs"), { logs });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
};

export const loadSuiterLogsFromCloud = async (): Promise<SuiterLog[]> => {
  const path = "config/suiter_logs";
  try {
    const docSnap = await getDoc(doc(db, "config", "suiter_logs"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return (data?.logs || []) as SuiterLog[];
    }
    return [];
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return [];
  }
};

// PERSISTENT APP STATE INITIALIZATION FLAGS
export const checkAppInitialized = async (): Promise<boolean> => {
  try {
    const docSnap = await getDoc(doc(db, "config", "app_state"));
    return docSnap.exists() && docSnap.data()?.initialized === true;
  } catch (e) {
    return false;
  }
};

export const setAppInitialized = async () => {
  try {
    await setDoc(doc(db, "config", "app_state"), { initialized: true });
  } catch (e) {}
};

