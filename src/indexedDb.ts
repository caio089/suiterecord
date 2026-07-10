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
}

const DB_NAME = "SuiterRecorderOfflineDB";
const STORE_NAME = "local_recordings";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Erro ao abrir IndexedDB");
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
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
