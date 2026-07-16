export interface LocalRecording {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  mimeType: string;
  audioBlob: Blob;
  status: "pending" | "completed" | "failed";
  createdBy: string;
  /** Reunião associada após a transcrição */
  meetingId?: string;
  overview?: string;
  originalBytes?: number;
  compressedBytes?: number;
  /** ID do job de transcrição no servidor (transcription_jobs no Supabase) — permite retomar após reload. */
  jobId?: string;
  /** Caminho do áudio no Supabase Storage (bucket audio-recordings). */
  storagePath?: string;
}

export interface LocalRecordingChunk {
  id: string;
  sessionId: string;
  sequence: number;
  blob: Blob;
  mimeType: string;
  uploaded: boolean;
  storagePath?: string;
  createdAt: number;
}

const DB_NAME = "AlfredoOfflineDB";
const STORE_NAME = "local_recordings";
const CHUNK_STORE_NAME = "recording_chunks";
const DB_VERSION = 2;
const LEGACY_DB_NAME = atob("U3VpdGVyUmVjb3JkZXJPZmZsaW5lREI=");
let legacyMigrationAttempted = false;

async function migrateLegacyRecordings(target: IDBDatabase): Promise<void> {
  if (legacyMigrationAttempted || LEGACY_DB_NAME === DB_NAME) return;
  legacyMigrationAttempted = true;
  const known = typeof indexedDB.databases === "function" ? await indexedDB.databases() : [];
  if (known.length && !known.some((entry) => entry.name === LEGACY_DB_NAME)) return;
  await new Promise<void>((resolve) => {
    const legacyRequest = indexedDB.open(LEGACY_DB_NAME);
    legacyRequest.onerror = () => resolve();
    legacyRequest.onsuccess = () => {
      const legacy = legacyRequest.result;
      if (!legacy.objectStoreNames.contains(STORE_NAME)) { legacy.close(); resolve(); return; }
      const getAll = legacy.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      getAll.onerror = () => { legacy.close(); resolve(); };
      getAll.onsuccess = () => {
        const tx = target.transaction(STORE_NAME, "readwrite");
        getAll.result.forEach((recording) => tx.objectStore(STORE_NAME).put(recording));
        tx.oncomplete = () => { legacy.close(); resolve(); };
        tx.onerror = () => { legacy.close(); resolve(); };
      };
    };
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Erro ao abrir IndexedDB");
      reject(request.error);
    };

    request.onsuccess = async () => {
      await migrateLegacyRecordings(request.result);
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE_NAME)) {
        const chunks = db.createObjectStore(CHUNK_STORE_NAME, { keyPath: "id" });
        chunks.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
  });
}

export async function saveRecordingChunk(chunk: LocalRecordingChunk): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(CHUNK_STORE_NAME, "readwrite").objectStore(CHUNK_STORE_NAME).put(chunk);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordingChunks(sessionId: string): Promise<LocalRecordingChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(CHUNK_STORE_NAME, "readonly").objectStore(CHUNK_STORE_NAME)
      .index("sessionId").getAll(sessionId);
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => a.sequence - b.sequence));
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingRecordingChunks(): Promise<LocalRecordingChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(CHUNK_STORE_NAME, "readonly").objectStore(CHUNK_STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []).filter((chunk) => !chunk.uploaded));
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecordingChunks(sessionId: string): Promise<void> {
  const chunks = await getRecordingChunks(sessionId);
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CHUNK_STORE_NAME, "readwrite");
    const store = tx.objectStore(CHUNK_STORE_NAME);
    chunks.forEach((chunk) => store.delete(chunk.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveLocalRecording(recording: LocalRecording): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(recording);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error("Erro ao salvar gravação local no IndexedDB:", request.error);
      reject(request.error);
    };
  });
}

export async function getLocalRecordings(): Promise<LocalRecording[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Erro ao carregar gravações locais do IndexedDB:", error);
    return [];
  }
}

export async function getLocalRecording(id: string): Promise<LocalRecording | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Erro ao buscar gravação local ${id} do IndexedDB:`, error);
    return null;
  }
}

export async function deleteLocalRecording(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Erro ao excluir gravação local ${id} do IndexedDB:`, error);
  }
}

export async function updateLocalRecordingStatus(
  id: string,
  status: "pending" | "completed" | "failed",
  extras?: Partial<Pick<LocalRecording, "meetingId" | "overview" | "title">>
): Promise<void> {
  try {
    const recording = await getLocalRecording(id);
    if (recording) {
      recording.status = status;
      if (extras?.meetingId) recording.meetingId = extras.meetingId;
      if (extras?.overview) recording.overview = extras.overview;
      if (extras?.title) recording.title = extras.title;
      await saveLocalRecording(recording);
    }
  } catch (error) {
    console.error(`Erro ao atualizar status da gravação local ${id}:`, error);
  }
}
