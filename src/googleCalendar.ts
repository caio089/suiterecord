import { apiUrl, getApiOrigin } from "./api";
import type { GoogleCalendarEvent } from "./types";

const TOKEN_STORAGE_KEY = "suiter_google_calendar_token";
const TOKEN_EXPIRY_KEY = "suiter_google_calendar_token_expiry";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export type CalendarEventInput = {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: { email: string; displayName?: string }[];
};

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar Google Identity Services"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Falha ao carregar Google Identity Services"));
    document.head.appendChild(script);
  });
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function getStoredGoogleAccessToken(): string | null {
  const storage = safeLocalStorage();
  if (!storage) return null;
  const token = storage.getItem(TOKEN_STORAGE_KEY);
  const expiry = Number(storage.getItem(TOKEN_EXPIRY_KEY) || 0);
  if (!token || !expiry || Date.now() >= expiry) {
    clearStoredGoogleAccessToken();
    return null;
  }
  return token;
}

export function storeGoogleAccessToken(token: string, expiresInSeconds = 3600) {
  const storage = safeLocalStorage();
  if (!storage) return;
  // Renova 60s antes do vencimento real
  const expiryMs = Date.now() + Math.max(60, expiresInSeconds - 60) * 1000;
  storage.setItem(TOKEN_STORAGE_KEY, token);
  storage.setItem(TOKEN_EXPIRY_KEY, String(expiryMs));
}

export function clearStoredGoogleAccessToken() {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_STORAGE_KEY);
  storage.removeItem(TOKEN_EXPIRY_KEY);
}

/** Abre OAuth Google Calendar via servidor (authorization code) — mais estável que o popup GIS. */
export async function connectGoogleCalendar(
  _forceConsent = false
): Promise<string> {
  const frontendOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const apiOrigin = getApiOrigin() || frontendOrigin;
  const oauthStart = apiUrl("/api/google/oauth/start");
  const statusUrl = apiUrl("/api/google/oauth/status");

  // Preflight: acorda a função serverless (cold start) e valida config OAuth
  try {
    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => ctrl.abort(), 45_000);
    const statusRes = await fetch(statusUrl, { signal: ctrl.signal, credentials: "omit" });
    window.clearTimeout(timeout);
    if (!statusRes.ok) {
      throw new Error(`API respondeu ${statusRes.status} em ${statusUrl}`);
    }
    const status = (await statusRes.json()) as {
      oauthConfigured?: boolean;
      hasClientId?: boolean;
      hasClientSecret?: boolean;
      redirectUri?: string;
      frontendUrl?: string;
    };
    if (!status.oauthConfigured) {
      throw new Error(
        "Google OAuth incompleto na API.\n\n" +
          `Client ID: ${status.hasClientId ? "ok" : "faltando"}\n` +
          `Client Secret: ${status.hasClientSecret ? "ok" : "faltando"}\n\n` +
          "Defina VITE_GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas Environment Variables da Vercel.",
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Google OAuth incompleto") || msg.includes("VITE_API_URL")) {
      throw err instanceof Error ? err : new Error(msg);
    }
    throw new Error(
      `Não foi possível falar com a API (${statusUrl}).\n\n` +
        `${msg}\n\n` +
        "Confira se o deploy na Vercel está ativo e se GROQ_API_KEY / variáveis Google estão definidas.",
    );
  }

  return new Promise((resolve, reject) => {
    const width = 520;
    const height = 680;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    const popup = window.open(
      oauthStart,
      "suiter_google_oauth",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no`,
    );

    if (!popup) {
      // Popup bloqueado — segue na mesma aba (não rejeita antes do redirect)
      window.location.assign(oauthStart);
      return;
    }

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };

    const finishOk = (token: string, expiresIn: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      storeGoogleAccessToken(token, expiresIn);
      resolve(token);
    };

    const finishErr = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error(
          `${message}\n\nNo Google Cloud → Credenciais → OAuth Client (Web), cadastre:\n` +
            `URI de redirecionamento: ${apiOrigin}/api/google/oauth/callback\n` +
            `Origem JavaScript: ${frontendOrigin}\n\n` +
            `Na Vercel: FRONTEND_URL=${frontendOrigin}`,
        ),
      );
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "suiter-google-oauth") return;
      // Prefer origem da API; ainda aceita o payload tipado (FRONTEND_URL / proxy)

      if (data.ok && data.accessToken) {
        finishOk(String(data.accessToken), Number(data.expiresIn || 3600));
      } else {
        finishErr(String(data.error || "Falha no OAuth Google"));
      }
    };

    window.addEventListener("message", onMessage);

    const timer = window.setInterval(() => {
      if (popup.closed && !settled) {
        finishErr("Janela de login Google foi fechada antes de concluir.");
      }
    }, 500);
  });
}

export async function disconnectGoogleCalendar(token?: string | null) {
  const accessToken = token || getStoredGoogleAccessToken();
  clearStoredGoogleAccessToken();
  if (!accessToken) return;

  try {
    await loadGisScript();
    if (window.google?.accounts?.oauth2?.revoke) {
      await new Promise<void>((resolve) => {
        window.google!.accounts.oauth2.revoke(accessToken, () => resolve());
      });
    }
  } catch {
    // Revogação best-effort
  }
}

function mapApiEvent(item: Record<string, unknown>): GoogleCalendarEvent {
  const start = (item.start || {}) as { dateTime?: string; date?: string };
  const end = (item.end || {}) as { dateTime?: string; date?: string };
  const attendees = Array.isArray(item.attendees)
    ? (item.attendees as Record<string, unknown>[]).map((att) => ({
        email: String(att.email || ""),
        displayName: att.displayName
          ? String(att.displayName)
          : String(att.email || "").split("@")[0],
        responseStatus: att.responseStatus
          ? String(att.responseStatus)
          : undefined,
      }))
    : [];

  return {
    id: String(item.id),
    summary: String(item.summary || "Sem Título"),
    description: item.description ? String(item.description) : "",
    location: item.location ? String(item.location) : "",
    start: {
      dateTime: start.dateTime,
      date: start.date,
    },
    end: {
      dateTime: end.dateTime,
      date: end.date,
    },
    attendees,
  };
}

async function calendarFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    clearStoredGoogleAccessToken();
    throw new Error("Sessão Google expirada. Conecte a agenda novamente.");
  }

  return res;
}

/** Lista eventos do calendário primary do usuário autenticado no dia informado (YYYY-MM-DD). */
export async function listGoogleCalendarEvents(
  token: string,
  dateStr: string
): Promise<GoogleCalendarEvent[]> {
  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59`);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await calendarFetch(
    token,
    `/calendars/primary/events?${params.toString()}`
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Google Calendar API retornou status ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const data = await res.json();
  return (data.items || []).map((item: Record<string, unknown>) =>
    mapApiEvent(item)
  );
}

/** Cria um evento na agenda primary da conta Google conectada. */
export async function createGoogleCalendarEvent(
  token: string,
  input: CalendarEventInput
): Promise<GoogleCalendarEvent> {
  const body = {
    summary: input.summary,
    description: input.description || "",
    location: input.location || "",
    start: { dateTime: input.startDateTime },
    end: { dateTime: input.endDateTime },
    attendees: (input.attendees || []).map((a) => ({
      email: a.email,
      displayName: a.displayName,
    })),
  };

  const res = await calendarFetch(token, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Falha ao criar evento no Google Calendar (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  return mapApiEvent((await res.json()) as Record<string, unknown>);
}

/** Atualiza um evento existente na agenda do usuário. */
export async function updateGoogleCalendarEvent(
  token: string,
  eventId: string,
  input: CalendarEventInput
): Promise<GoogleCalendarEvent> {
  const body = {
    summary: input.summary,
    description: input.description || "",
    location: input.location || "",
    start: { dateTime: input.startDateTime },
    end: { dateTime: input.endDateTime },
    attendees: (input.attendees || []).map((a) => ({
      email: a.email,
      displayName: a.displayName,
    })),
  };

  const res = await calendarFetch(
    token,
    `/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Falha ao atualizar evento no Google Calendar (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  return mapApiEvent((await res.json()) as Record<string, unknown>);
}

/** Monta início/fim RFC3339 a partir de data + hora local (duração padrão 1h). */
export function buildEventDateTimes(
  date: string,
  time: string,
  durationMinutes = 60
): { startDateTime: string; endDateTime: string } {
  const safeTime = time && time.length >= 4 ? time : "09:00";
  const start = new Date(`${date}T${safeTime}:00`);
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date();
    return {
      startDateTime: fallback.toISOString(),
      endDateTime: new Date(
        fallback.getTime() + durationMinutes * 60_000
      ).toISOString(),
    };
  }
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}
