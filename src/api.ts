/**
 * Base URL da API (backend).
 * - Vercel / local monolítico: vazio → usa o mesmo origin (`/api/...`)
 * - API em domínio separado (raro): `VITE_API_URL=https://sua-api.exemplo.com`
 */
const API_URL_STORAGE_KEY = "integration_api_url";

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

/**
 * Na Vercel, front e API compartilham o mesmo domínio — `apiUrl()` usa `/api/...`
 * relativo e não precisa de `VITE_API_URL`.
 */
export function assertApiConfigured(): void {
  // no-op — mantido por compatibilidade com chamadas existentes.
}

/** Lê JSON de forma segura — nunca estoura com corpo vazio / HTML de proxy. */
export async function readApiJson<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error(
      `A API retornou resposta vazia (HTTP ${response.status}). ` +
        "Confira se o deploy na Vercel está ativo, se as variáveis de ambiente " +
        "(GROQ_API_KEY, SUPABASE_*) estão definidas e se FRONTEND_URL bate com a URL do app.",
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

/** fetch + parse JSON com erros legíveis */
export async function apiFetchJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; data: T }> {
  assertApiConfigured();
  const response = await fetch(apiUrl(path), init);
  const data = await readApiJson<T>(response);
  return { response, data };
}
