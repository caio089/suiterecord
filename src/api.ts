/**
 * Base URL da API (backend).
 * - Local monolítico: vazio → usa o mesmo origin (`/api/...`)
 * - Produção (Render Static + API): `VITE_API_URL=https://seu-api.onrender.com`
 */
export function getApiBaseUrl(): string {
  return String(import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/$/, "");
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
 * Em produção (Static + API separados), VITE_API_URL é obrigatório.
 * Sem ele, POST /api/transcribe cai no Static Site e a resposta vem vazia → "Unexpected end of JSON input".
 */
export function assertApiConfigured(): void {
  if (!getApiBaseUrl() && !isLocalHost()) {
    throw new Error(
      "VITE_API_URL não está configurada no build do frontend.\n\n" +
        "No Render → Static Site → Environment:\n" +
        "VITE_API_URL=https://SUA-API.onrender.com\n" +
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
