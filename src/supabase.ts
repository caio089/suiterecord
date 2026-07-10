import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Meeting, PermittedUser, SuiterConfig, SuiterLog } from "./types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env"
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);

function handleDbError(error: unknown, operation: string, path: string): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase Error [${operation}] ${path}:`, message);
  throw new Error(JSON.stringify({ error: message, operation, path }));
}

// --- Mappers (DB snake_case ↔ app camelCase) ---

function meetingFromRow(row: Record<string, unknown>): Meeting {
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
    audioRecordingId: row.audio_storage_path
      ? String(row.audio_storage_path)
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
    audio_storage_path: meeting.audioRecordingId ?? null,
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
    password: row.password ? String(row.password) : undefined,
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
    password: user.password ?? user.pass ?? null,
    google_calendar_linked: user.googleCalendarLinked ?? false,
  };
}

function configFromRow(row: Record<string, unknown>): SuiterConfig {
  return {
    apiUrl: String(row.api_url ?? ""),
    token: String(row.token ?? ""),
    isMock: Boolean(row.is_mock),
    mapping: String(row.mapping ?? "standard"),
  };
}

function logFromRow(row: Record<string, unknown>): SuiterLog {
  return {
    timestamp: String(row.timestamp ?? ""),
    meetingTitle: String(row.meeting_title ?? ""),
    status: (row.status as SuiterLog["status"]) || "error",
    simulated: Boolean(row.simulated),
    request: (row.request as SuiterLog["request"]) || {
      url: "",
      method: "",
      headers: {},
      body: null,
    },
    response: (row.response as SuiterLog["response"]) || {
      status: 0,
      statusText: "",
      body: null,
    },
  };
}

// --- Meetings ---

export const saveMeetingInCloud = async (meeting: Meeting) => {
  const { error } = await supabase
    .from("meetings")
    .upsert(meetingToRow(meeting), { onConflict: "id" });
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
  const { data, error } = await supabase.from("permitted_users").select("*");
  if (error) {
    handleDbError(error, "list", "permitted_users");
    return [];
  }
  return (data || []).map((row) => userFromRow(row as Record<string, unknown>));
};

// --- Suiter config ---

export const saveSuiterConfigInCloud = async (config: SuiterConfig) => {
  const { error } = await supabase.from("suiter_config").upsert(
    {
      id: "default",
      api_url: config.apiUrl,
      token: config.token,
      is_mock: config.isMock,
      mapping: config.mapping,
    },
    { onConflict: "id" }
  );
  if (error) handleDbError(error, "upsert", "suiter_config/default");
};

export const loadSuiterConfigFromCloud = async (): Promise<SuiterConfig | null> => {
  const { data, error } = await supabase
    .from("suiter_config")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) {
    handleDbError(error, "get", "suiter_config/default");
    return null;
  }
  if (!data) return null;
  return configFromRow(data as Record<string, unknown>);
};

// --- Suiter logs ---

export const saveSuiterLogsInCloud = async (logs: SuiterLog[]) => {
  // Substitui o conjunto completo (mesmo comportamento do doc único no Firestore)
  const { error: deleteError } = await supabase
    .from("suiter_logs")
    .delete()
    .not("id", "is", null);
  if (deleteError) handleDbError(deleteError, "delete", "suiter_logs");

  if (logs.length === 0) return;

  const rows = logs.map((log) => ({
    timestamp: log.timestamp,
    meeting_title: log.meetingTitle,
    status: log.status,
    simulated: log.simulated,
    request: log.request,
    response: log.response,
  }));

  const { error } = await supabase.from("suiter_logs").insert(rows);
  if (error) handleDbError(error, "insert", "suiter_logs");
};

export const loadSuiterLogsFromCloud = async (): Promise<SuiterLog[]> => {
  const { data, error } = await supabase
    .from("suiter_logs")
    .select("*")
    .order("timestamp", { ascending: false });
  if (error) {
    handleDbError(error, "list", "suiter_logs");
    return [];
  }
  return (data || []).map((row) => logFromRow(row as Record<string, unknown>));
};
