import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Meeting, PermittedUser, IntegrationConfig, IntegrationLog } from "./types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False quando o Static Site foi buildado sem as vars VITE_* do Supabase. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Environment do Static Site e faça redeploy (Clear build cache)."
  );
}

// createClient("", "") lança e deixa a tela preta — só instancia com credenciais válidas.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (null as unknown as SupabaseClient);

function handleDbError(error: unknown, operation: string, path: string): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase Error [${operation}] ${path}:`, message);
  throw new Error(JSON.stringify({ error: message, operation, path }));
}

// --- Mappers (DB snake_case ↔ app camelCase) ---

function meetingFromRow(row: Record<string, unknown>): Meeting {
  const audioStoragePath = row.audio_storage_path
    ? String(row.audio_storage_path)
    : "";
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    date: String(row.date ?? ""),
    duration: Number(row.duration ?? 0),
    transcript: String(row.transcript ?? ""),
    overview: String(row.overview ?? ""),
    topics: (row.topics as Meeting["topics"]) || [],
    decisions: (row.decisions as string[]) || [],
    actions: (row.actions as Meeting["actions"]) || [],
    tags: (row.tags as string[]) || [],
    participants: (row.participants as Meeting["participants"]) || undefined,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    googleCalendarEventId: row.google_calendar_event_id
      ? String(row.google_calendar_event_id)
      : undefined,
    hasAudio: Boolean(row.has_audio),
    audioRecordingId:
      audioStoragePath && !audioStoragePath.includes("/")
        ? audioStoragePath
        : undefined,
    audioStoragePath: audioStoragePath.includes("/")
      ? audioStoragePath
      : undefined,
    audioSizeBytes: row.audio_size_bytes
      ? Number(row.audio_size_bytes)
      : undefined,
  };
}

function meetingToRow(meeting: Meeting) {
  return {
    id: meeting.id,
    title: meeting.title,
    date: meeting.date,
    duration: meeting.duration,
    transcript: meeting.transcript,
    overview: meeting.overview,
    topics: meeting.topics ?? [],
    decisions: meeting.decisions ?? [],
    actions: meeting.actions ?? [],
    tags: meeting.tags ?? [],
    participants: meeting.participants ?? null,
    created_by: meeting.createdBy ?? null,
    google_calendar_event_id: meeting.googleCalendarEventId ?? null,
    has_audio: meeting.hasAudio ?? false,
    audio_storage_path:
      meeting.audioStoragePath ??
      (meeting.audioRecordingId?.includes("/") ? meeting.audioRecordingId : null),
    audio_size_bytes: meeting.audioSizeBytes ?? null,
  };
}

function userFromRow(row: Record<string, unknown>): PermittedUser {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    photo: row.photo ? String(row.photo) : undefined,
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
    role: String(row.role ?? "user"),
    // Senhas nunca vêm do banco para o client — Auth gerencia credenciais
    password: undefined,
    googleCalendarLinked: Boolean(row.google_calendar_linked),
  };
}

function userToRow(user: PermittedUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photo: user.photo ?? null,
    photo_url: user.photoUrl ?? null,
    role: user.role,
    google_calendar_linked: user.googleCalendarLinked ?? false,
  };
}

function configFromRow(row: Record<string, unknown>): IntegrationConfig {
  return {
    apiUrl: String(row.api_url ?? ""),
    token: String(row.token ?? ""),
    isMock: Boolean(row.is_mock),
    mapping: String(row.mapping ?? "standard"),
  };
}

function logFromRow(row: Record<string, unknown>): IntegrationLog {
  return {
    timestamp: String(row.timestamp ?? ""),
    meetingTitle: String(row.meeting_title ?? ""),
    status: (row.status as IntegrationLog["status"]) || "error",
    simulated: Boolean(row.simulated),
    request: (row.request as IntegrationLog["request"]) || {
      url: "",
      method: "",
      headers: {},
      body: null,
    },
    response: (row.response as IntegrationLog["response"]) || {
      status: 0,
      statusText: "",
      body: null,
    },
  };
}

// --- Meetings ---

export const saveMeetingInCloud = async (meeting: Meeting) => {
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("meetings")
    .upsert({ ...meetingToRow(meeting), owner_id: authData.user?.id }, { onConflict: "id" });
  if (error) handleDbError(error, "upsert", `meetings/${meeting.id}`);
};

export const deleteMeetingInCloud = async (meetingId: string) => {
  const { error } = await supabase.from("meetings").delete().eq("id", meetingId);
  if (error) handleDbError(error, "delete", `meetings/${meetingId}`);
};

export const loadMeetingsFromCloud = async (): Promise<Meeting[]> => {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("date", { ascending: false });
  if (error) {
    handleDbError(error, "list", "meetings");
    return [];
  }
  return (data || []).map((row) => meetingFromRow(row as Record<string, unknown>));
};

// --- Permitted users ---

export const savePermittedUserInCloud = async (user: PermittedUser) => {
  const { error } = await supabase
    .from("permitted_users")
    .upsert(userToRow(user), { onConflict: "id" });
  if (error) handleDbError(error, "upsert", `permitted_users/${user.id}`);
};

export const deletePermittedUserFromCloud = async (userId: string) => {
  const { error } = await supabase
    .from("permitted_users")
    .delete()
    .eq("id", userId);
  if (error) handleDbError(error, "delete", `permitted_users/${userId}`);
};

export const loadPermittedUsersFromCloud = async (): Promise<PermittedUser[]> => {
  // Não seleciona password — credenciais ficam só no Auth
  const { data, error } = await supabase
    .from("permitted_users")
    .select("id, name, email, photo, photo_url, role, google_calendar_linked, created_at, updated_at");
  if (error) {
    handleDbError(error, "list", "permitted_users");
    return [];
  }
  return (data || []).map((row) => userFromRow(row as Record<string, unknown>));
};

// --- destino externo config ---

export const saveIntegrationConfigInCloud = async (config: IntegrationConfig) => {
  const { error } = await supabase.from("integration_config").upsert(
    {
      id: "default",
      api_url: config.apiUrl,
      token: config.token,
      is_mock: config.isMock,
      mapping: config.mapping,
    },
    { onConflict: "id" }
  );
  if (error) handleDbError(error, "upsert", "integration_config/default");
};

export const loadIntegrationConfigFromCloud = async (): Promise<IntegrationConfig | null> => {
  const { data, error } = await supabase
    .from("integration_config")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) {
    handleDbError(error, "get", "integration_config/default");
    return null;
  }
  if (!data) return null;
  return configFromRow(data as Record<string, unknown>);
};

// --- destino externo logs ---

export const saveIntegrationLogsInCloud = async (logs: IntegrationLog[]) => {
  // Substitui o conjunto completo (mesmo comportamento do doc único no Firestore)
  const { error: deleteError } = await supabase
    .from("integration_logs")
    .delete()
    .not("id", "is", null);
  if (deleteError) handleDbError(deleteError, "delete", "integration_logs");

  if (logs.length === 0) return;

  const rows = logs.map((log) => ({
    timestamp: log.timestamp,
    meeting_title: log.meetingTitle,
    status: log.status,
    simulated: log.simulated,
    request: log.request,
    response: log.response,
  }));

  const { error } = await supabase.from("integration_logs").insert(rows);
  if (error) handleDbError(error, "insert", "integration_logs");
};

export const loadIntegrationLogsFromCloud = async (): Promise<IntegrationLog[]> => {
  const { data, error } = await supabase
    .from("integration_logs")
    .select("*")
    .order("timestamp", { ascending: false });
  if (error) {
    handleDbError(error, "list", "integration_logs");
    return [];
  }
  return (data || []).map((row) => logFromRow(row as Record<string, unknown>));
};

// --- Storage: áudio original (upload direto do cliente, fora do corpo da API) ---

const AUDIO_BUCKET = "audio-recordings";

function sanitizeStorageSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

/** Caminho por usuário — precisa bater com a policy do bucket (1º segmento = e-mail). */
export function buildAudioStoragePath(ownerEmail: string, recordingId: string, mimeType: string): string {
  const ext = (mimeType.split("/")[1] || "webm").split(";")[0];
  return `${sanitizeStorageSegment(ownerEmail)}/${sanitizeStorageSegment(recordingId)}.${ext}`;
}

/** Sobe o áudio direto pro Storage — evita mandar o binário pelo corpo da função de API. */
export const uploadAudioToStorage = async (
  storagePath: string,
  blob: Blob,
  mimeType: string,
): Promise<void> => {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — não é possível subir o áudio para a nuvem.");
  }
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(storagePath, blob, {
    contentType: mimeType.split(";")[0],
    upsert: true,
  });
  if (error) handleDbError(error, "upload", `storage/${AUDIO_BUCKET}/${storagePath}`);
};

export const deleteAudioFromStorage = async (storagePath: string): Promise<void> => {
  if (!isSupabaseConfigured || !storagePath) return;
  const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([storagePath]);
  if (error) {
    console.error(`Erro ao apagar áudio do Storage (${storagePath}):`, error.message);
  }
};

export type CloudAudio = {
  name: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: string;
  mimeType: string;
};

/**
 * Lista os áudios finais (`rec_*`) que estão no Storage do usuário. Serve para
 * recuperar gravações cujo backup LOCAL (IndexedDB) foi perdido — troca de
 * aparelho, limpeza do navegador, ou falha na transcrição sem backup local.
 * Ignora as subpastas de sessão (chunks de gravação ao vivo).
 */
export const listCloudAudioRecordings = async (
  ownerEmail: string,
): Promise<CloudAudio[]> => {
  if (!isSupabaseConfigured || !ownerEmail) return [];
  const folder = sanitizeStorageSegment(ownerEmail);
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .list(folder, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  if (error) {
    console.error("Erro ao listar áudios da nuvem:", error.message);
    return [];
  }
  return (data || [])
    // Só arquivos rec_* (têm metadata/id); pastas de sessão vêm com id nulo.
    .filter((obj) => obj.id && /^rec_/i.test(obj.name))
    .map((obj) => {
      const meta = (obj.metadata || {}) as { size?: number; mimetype?: string };
      const ext = obj.name.split(".").pop()?.toLowerCase() || "webm";
      return {
        name: obj.name,
        storagePath: `${folder}/${obj.name}`,
        sizeBytes: Number(meta.size ?? 0),
        createdAt: obj.created_at || "",
        mimeType: meta.mimetype || `audio/${ext}`,
      };
    });
};

/** Baixa um áudio do Storage como Blob (para reprocessar um áudio da nuvem). */
export const downloadAudioFromStorage = async (storagePath: string): Promise<Blob> => {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(
      `Falha ao baixar o áudio da nuvem (${storagePath}): ${error?.message || "arquivo não encontrado"}`,
    );
  }
  return data;
};

// --- Auth (Supabase Auth) ---

export type AuthProfile = {
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
};

const defaultAvatar = (seed: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;

/** Traduz erros comuns do Auth para PT-BR. */
export const mapAuthErrorMessage = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Este e-mail já possui uma conta. Faça login.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar (verifique a caixa de entrada).";
  }
  if (m.includes("password should be") || m.includes("password is known")) {
    return "Senha fraca demais. Use no mínimo 8 caracteres com maiúscula, minúscula e especial.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Muitas tentativas. Aguarde um momento e tente de novo.";
  }
  return message || "Não foi possível autenticar. Tente novamente.";
};

export const ensurePermittedUserProfile = async (input: {
  email: string;
  name: string;
  role?: string;
  photoUrl?: string;
}): Promise<AuthProfile> => {
  const email = input.email.trim().toLowerCase();
  const existing = await loadPermittedUsersFromCloud();
  const found = existing.find((u) => u.email.toLowerCase() === email);

  if (found) {
    return {
      name: found.name || input.name,
      email: found.email,
      role: found.role || "user",
      photoUrl: found.photoUrl || found.photo,
    };
  }

  const profile: PermittedUser = {
    id: email,
    name: input.name.trim() || email.split("@")[0],
    email,
    role: input.role || "user",
    photoUrl: input.photoUrl || defaultAvatar(input.name || email),
    googleCalendarLinked: false,
  };

  await savePermittedUserInCloud(profile);
  return {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    photoUrl: profile.photoUrl,
  };
};

export const signInWithEmail = async (params: {
  email: string;
  password: string;
}): Promise<AuthProfile> => {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado.");
  }

  const email = params.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: params.password,
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error.message));
  }

  const metaName =
    (data.user?.user_metadata?.name as string | undefined) ||
    (data.user?.user_metadata?.full_name as string | undefined) ||
    email.split("@")[0];

  return ensurePermittedUserProfile({
    email: data.user?.email || email,
    name: metaName,
  });
};

export const signOutAuth = async () => {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Erro ao encerrar sessão Supabase Auth:", error.message);
  }
};

export const getAuthSessionProfile = async (): Promise<AuthProfile | null> => {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;

  const user = data.session.user;
  const email = (user.email || "").toLowerCase();
  if (!email) return null;

  const metaName =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    email.split("@")[0];

  return ensurePermittedUserProfile({ email, name: metaName });
};

/** Envia e-mail de confirmação para redefinir senha (único fluxo que exige e-mail). */
export const requestPasswordReset = async (email: string): Promise<void> => {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin,
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error.message));
  }
};

/** Define nova senha após o usuário abrir o link do e-mail (PASSWORD_RECOVERY). */
export const updatePasswordAfterRecovery = async (newPassword: string): Promise<void> => {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(mapAuthErrorMessage(error.message));
  }
};

export const onAuthStateChange = (
  callback: (event: string, session: unknown) => void
) => {
  if (!isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => undefined } } };
  }
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

export const uploadAudioChunkToStorage = async (
  ownerEmail: string,
  sessionId: string,
  sequence: number,
  blob: Blob,
  mimeType: string,
): Promise<string> => {
  const path = `${sanitizeStorageSegment(ownerEmail)}/${sanitizeStorageSegment(sessionId)}/chunks/${String(sequence).padStart(6, "0")}`;
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, {
    contentType: mimeType.split(";")[0],
    upsert: true,
  });
  if (error) handleDbError(error, "upload", `storage/${AUDIO_BUCKET}/${path}`);
  return path;
};

async function requireCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) throw new Error("Sessão Supabase inválida.");
  return data.user.id;
}

export async function createRecordingSession(id: string, title: string, mimeType?: string) {
  const ownerId = await requireCurrentUserId();
  const { error } = await supabase.from("recording_sessions").upsert({
    id, owner_id: ownerId, title, mime_type: mimeType || null,
    status: "recording", last_heartbeat_at: new Date().toISOString(),
  });
  if (error) handleDbError(error, "upsert", `recording_sessions/${id}`);
}

export async function confirmRecordingChunk(input: {
  sessionId: string; sequence: number; sizeBytes: number; storagePath: string;
}) {
  const ownerId = await requireCurrentUserId();
  const id = `${input.sessionId}_${input.sequence}`;
  const { error } = await supabase.from("recording_chunks").upsert({
    id, session_id: input.sessionId, owner_id: ownerId, sequence: input.sequence,
    size_bytes: input.sizeBytes, storage_path: input.storagePath,
    upload_status: "uploaded", confirmed_at: new Date().toISOString(),
  });
  if (error) handleDbError(error, "upsert", `recording_chunks/${id}`);
  await supabase.from("recording_sessions").update({
    status: "uploading", last_heartbeat_at: new Date().toISOString(),
  }).eq("id", input.sessionId);
}

export async function finishRecordingSession(id: string, durationSeconds: number, totalChunks: number, confirmedChunks: number) {
  const { error } = await supabase.from("recording_sessions").update({
    status: confirmedChunks === totalChunks ? "uploaded" : "uploading",
    duration_seconds: durationSeconds, total_chunks: totalChunks,
    confirmed_chunks: confirmedChunks, last_heartbeat_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) handleDbError(error, "update", `recording_sessions/${id}`);
}

/** Cabeçalhos autenticados para chamadas à API do Alfredo. */
export const getApiAuthHeaders = async (): Promise<Record<string, string>> => {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sessão expirada. Entre novamente.");
  }
  return { Authorization: `Bearer ${data.session.access_token}` };
};

export const updateOwnProfileName = async (name: string): Promise<AuthProfile> => {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Informe um nome válido.");
  const { data: userData, error: userError } = await supabase.auth.updateUser({
    data: { name: cleanName, full_name: cleanName },
  });
  if (userError || !userData.user?.email) throw new Error(userError?.message || "Sessão inválida.");
  const email = userData.user.email.toLowerCase();
  const { data: row, error } = await supabase.from("permitted_users")
    .update({ name: cleanName })
    .eq("email", email)
    .select("name,email,role,photo_url")
    .single();
  if (error) handleDbError(error, "update", `permitted_users/${email}`);
  return { name: row.name, email: row.email, role: row.role, photoUrl: row.photo_url || undefined };
};
