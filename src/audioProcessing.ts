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
      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      audio.onerror = () => reject(new Error("Não foi possível ler a duração do áudio."));
      audio.src = url;
    });
    return Math.max(1, Math.round(duration));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pickRecorderMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "audio/webm";
}

/**
 * Reamostra para mono 16 kHz e reencode com Opus (bitrate baixo).
 * Se o browser não suportar MediaRecorder/AudioContext, devolve o blob original.
 */
export async function compressAudioBlob(
  input: Blob,
  onProgress?: (message: string) => void
): Promise<CompressedAudio> {
  const originalBytes = input.size;
  const inputMime = input.type || "audio/webm";

  if (typeof AudioContext === "undefined" && typeof webkitAudioContext === "undefined") {
    const durationSeconds = await getAudioDurationSeconds(input).catch(() => 60);
    return {
      blob: input,
      mimeType: inputMime,
      durationSeconds,
      originalBytes,
      compressedBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  onProgress?.("Validando e decodificando áudio...");
  const arrayBuffer = await input.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();

  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    await audioCtx.close().catch(() => undefined);
    const durationSeconds = await getAudioDurationSeconds(input).catch(() => 60);
    return {
      blob: input,
      mimeType: inputMime,
      durationSeconds,
      originalBytes,
      compressedBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  const durationSeconds = Math.max(1, Math.round(decoded.duration));
  if (durationSeconds > MAX_DURATION_SECONDS) {
    await audioCtx.close().catch(() => undefined);
    throw new Error(
      `Áudio muito longo (${Math.round(durationSeconds / 60)} min). Máximo: ${MAX_DURATION_SECONDS / 3600}h.`
    );
  }

  onProgress?.("Comprimindo áudio (mono 16 kHz / Opus)...");

  const targetRate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const source = offline.createBufferSource();

  // Mix para mono se necessário
  let monoBuffer = decoded;
  if (decoded.numberOfChannels > 1) {
    const mixed = audioCtx.createBuffer(1, decoded.length, decoded.sampleRate);
    const out = mixed.getChannelData(0);
    const ch0 = decoded.getChannelData(0);
    const ch1 = decoded.getChannelData(1);
    for (let i = 0; i < decoded.length; i++) {
      out[i] = (ch0[i] + ch1[i]) * 0.5;
    }
    monoBuffer = mixed;
  }

  source.buffer = monoBuffer;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  await audioCtx.close().catch(() => undefined);

  // Toca o buffer renderizado via MediaStreamDestination + MediaRecorder
  const playCtx = new AudioCtx({ sampleRate: targetRate });
  const playBuffer = playCtx.createBuffer(1, rendered.length, targetRate);
  playBuffer.copyToChannel(rendered.getChannelData(0), 0);

  const playSource = playCtx.createBufferSource();
  playSource.buffer = playBuffer;
  const dest = playCtx.createMediaStreamDestination();
  playSource.connect(dest);

  const mimeType = pickRecorderMime();
  const recorder = new MediaRecorder(dest.stream, {
    mimeType,
    audioBitsPerSecond: 24_000,
  });

  const chunks: BlobPart[] = [];
  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error("Falha ao comprimir o áudio."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
  });

  recorder.start(250);
  playSource.start(0);

  await new Promise<void>((resolve) => {
    playSource.onended = () => resolve();
  });

  // Pequeno buffer para o recorder flushar
  await new Promise((r) => setTimeout(r, 150));
  recorder.stop();
  const compressedBlob = await recorded;
  await playCtx.close().catch(() => undefined);

  // Se a compressão piorou (raro), mantém o menor
  const finalBlob =
    compressedBlob.size > 0 && compressedBlob.size < originalBytes
      ? compressedBlob
      : compressedBlob.size > 0
        ? compressedBlob
        : input;

  const compressedBytes = finalBlob.size;
  onProgress?.(
    `Áudio otimizado: ${(originalBytes / (1024 * 1024)).toFixed(2)} MB → ${(compressedBytes / (1024 * 1024)).toFixed(2)} MB`
  );

  return {
    blob: finalBlob,
    mimeType: finalBlob.type || mimeType.split(";")[0],
    durationSeconds,
    originalBytes,
    compressedBytes,
    compressionRatio:
      originalBytes > 0 ? Number((originalBytes / Math.max(1, compressedBytes)).toFixed(2)) : 1,
  };
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

// Tipagem para Safari legado
declare const webkitAudioContext: typeof AudioContext | undefined;
