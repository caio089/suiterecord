/**
 * Base URL da API (backend).
 * - Local monolítico: vazio → usa o mesmo origin (`/api/...`)
 * - Produção (Render Static + API): `VITE_API_URL=https://seu-api.onrender.com`
 */
const API_URL_STORAGE_KEY = "suiter_api_url";

/** Mapa conhecido Static → API (fallback se VITE_API_URL faltar no build do Render) */
const KNOWN_STATIC_TO_API: Record<string, string> = {
  "suiterecord-1.onrender.com": "https://suiterecord.onrender.com",
};

function readStoredApiUrl(): string {
  try {
    if (typeof localStorage === "undefined") return "";
    return String(localStorage.getItem(API_URL_STORAGE_KEY) || "")
      .trim()
      .replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function setStoredApiUrl(url: string): void {
  const cleaned = String(url || "")
    .trim()
    .replace(/\/$/, "");
  try {
    if (!cleaned) {
      localStorage.removeItem(API_URL_STORAGE_KEY);
      return;
    }
    localStorage.setItem(API_URL_STORAGE_KEY, cleaned);
  } catch {
    /* ignore */
  }
}

export function getApiBaseUrl(): string {
  const fromEnv = String(import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const stored = readStoredApiUrl();
  if (stored) return stored;

  if (typeof window !== "undefined") {
    const known = KNOWN_STATIC_TO_API[window.location.hostname];
    if (known) return known;
  }

  return "";
}

/** Monta URL absoluta ou relativa para rotas `/api/...` */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

/** Origin da API (para validar postMessage do OAuth) */
export function getApiOrigin(): string {
  const base = getApiBaseUrl();
  if (!base) {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  try {
    return new URL(base).origin;
  } catch {
    return base;
  }
}

function isLocalHost(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "";
}

/**
 * Em produção (Static + API separados), precisa de URL da API
 * (env de build, localStorage ou mapa conhecido).
 */
export function assertApiConfigured(): void {
  if (!getApiBaseUrl() && !isLocalHost()) {
    throw new Error(
      "URL da API não configurada.\n\n" +
        "No Render → Static Site → Environment:\n" +
        "VITE_API_URL=https://suiterecord.onrender.com\n" +
        "(sem barra no final)\n\n" +
        "Depois: Clear cache & deploy.",
    );
  }
}

/** Lê JSON de forma segura — nunca estoura com corpo vazio / HTML de proxy. */
export async function readApiJson<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error(
      `A API retornou resposta vazia (HTTP ${response.status}). ` +
        "Confira se VITE_API_URL aponta para o Web Service (não o Static), " +
        "se a API está no ar e se FRONTEND_URL/CORS_ORIGINS incluem este site.",
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(
      `A API não retornou JSON (HTTP ${response.status}): ${snippet}`,
    );
  }
}

/** fetch + validação de API + parse JSON com erros legíveis */
export async function apiFetchJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; data: T }> {
  assertApiConfigured();
  const response = await fetch(apiUrl(path), init);
  const data = await readApiJson<T>(response);
  return { response, data };
}
