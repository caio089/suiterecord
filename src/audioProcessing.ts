/** Validação e compressão de áudio no cliente (reduz peso antes de salvar). */

export const ALLOWED_AUDIO_EXTENSIONS = [
  ".webm",
  ".wav",
  ".mp3",
  ".m4a",
  ".ogg",
  ".mpeg",
  ".mp4",
  ".aac",
  ".flac",
] as const;

export const ALLOWED_AUDIO_MIME_PREFIXES = [
  "audio/",
  "video/webm", // gravações do MediaRecorder às vezes vêm como video/webm
] as const;

/** Limite do arquivo original antes da compressão */
export const MAX_ORIGINAL_BYTES = 100 * 1024 * 1024; // 100 MB
/** Alvo após compressão (aviso se passar) */
export const TARGET_COMPRESSED_BYTES = 8 * 1024 * 1024; // 8 MB
/** Duração máxima aceita */
export const MAX_DURATION_SECONDS = 3 * 60 * 60; // 3h

export type AudioValidationResult =
  | { ok: true; mimeType: string; sizeBytes: number }
  | { ok: false; error: string };

export type CompressedAudio = {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  originalBytes: number;
  compressedBytes: number;
  compressionRatio: number;
};

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function validateAudioFile(file: File): AudioValidationResult {
  if (!file) {
    return { ok: false, error: "Nenhum arquivo selecionado." };
  }

  const ext = extensionOf(file.name);
  const mime = (file.type || "").toLowerCase();
  const mimeOk =
    !mime ||
    mime.startsWith("audio/") ||
    mime === "video/webm";

  const extOk =
    !ext ||
    (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext) ||
    ext === ".mp4";

  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error: `Formato incompatível (${file.type || ext || "desconhecido"}). Use: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, error: "O arquivo de áudio está vazio." };
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    return {
      ok: false,
      error: `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Máximo: ${MAX_ORIGINAL_BYTES / (1024 * 1024)} MB.`,
    };
  }

  return {
    ok: true,
    mimeType: mime || guessMimeFromExt(ext),
    sizeBytes: file.size,
  };
}

function guessMimeFromExt(ext: string): string {
  switch (ext) {
    case ".mp3":
    case ".mpeg":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".ogg":
      return "audio/ogg";
    case ".webm":
      return "audio/webm";
    case ".aac":
      return "audio/aac";
    case ".flac":
      return "audio/flac";
    default:
      return "audio/webm";
  }
}

export async function getAudioDurationSeconds(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio();
    audio.preload = "metadata";
    const duration = await new Promise<number>((resolve, reject) => {
      let settled = false;
      const done = (v: number) => {
        if (!settled) {
          settled = true;
          resolve(v);
        }
      };
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          done(audio.duration);
          return;
        }
        // WebM/Opus gravado pelo MediaRecorder é streaming: o cabeçalho não traz
        // a duração e `audio.duration` vem Infinity/NaN. Forçar o currentTime pro
        // fim faz o navegador varrer o arquivo e calcular a duração real.
        const onTimeUpdate = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            const real = audio.duration;
            audio.currentTime = 0;
            done(real);
          }
        };
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.currentTime = 1e101;
      };
      audio.onerror = () => reject(new Error("Não foi possível ler a duração do áudio."));
      audio.src = url;
      // Rede de segurança: não travar se o navegador não emitir os eventos.
      setTimeout(() => done(0), 20000);
    });
    return Math.max(1, Math.round(duration));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Valida a duração do áudio e devolve o blob original pronto para subir.
 *
 * Versões anteriores reencodavam para mono 16 kHz/Opus reproduzindo o áudio em
 * tempo real (MediaRecorder ligado a um AudioContext "ao vivo" e aguardando o
 * evento `onended`). A versão atual lê somente metadados, evitando expandir
 * horas de áudio comprimido para PCM na memória do dispositivo.
 */
export async function compressAudioBlob(
  input: Blob,
  onProgress?: (message: string) => void
): Promise<CompressedAudio> {
  const originalBytes = input.size;
  const inputMime = input.type || "audio/webm";

  const asIs = (durationSeconds: number): CompressedAudio => ({
    blob: input,
    mimeType: inputMime,
    durationSeconds,
    originalBytes,
    compressedBytes: originalBytes,
    compressionRatio: 1,
  });

  // Não decodifica o áudio inteiro em PCM: em mobile uma reunião de horas pode
  // consumir gigabytes de RAM. A duração é lida apenas dos metadados.
  onProgress?.("Validando metadados do áudio...");
  const durationSeconds = await getAudioDurationSeconds(input).catch(() => 0);
  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error(
      `Áudio muito longo (${Math.round(durationSeconds / 60)} min). Máximo: ${MAX_DURATION_SECONDS / 3600}h.`
    );
  }

  onProgress?.("Áudio validado, preparando envio...");
  return asIs(durationSeconds || 1);
}

export async function prepareAudioForStorage(
  fileOrBlob: File | Blob,
  fileName?: string,
  onProgress?: (message: string) => void
): Promise<CompressedAudio> {
  if (fileOrBlob instanceof File) {
    const validation = validateAudioFile(fileOrBlob);
    if (validation.ok === false) {
      throw new Error(validation.error);
    }
  } else if (fileOrBlob.size > MAX_ORIGINAL_BYTES) {
    throw new Error(
      `Áudio muito grande (${(fileOrBlob.size / (1024 * 1024)).toFixed(1)} MB). Máximo: ${MAX_ORIGINAL_BYTES / (1024 * 1024)} MB.`
    );
  }

  void fileName;
  return compressAudioBlob(fileOrBlob, onProgress);
}
