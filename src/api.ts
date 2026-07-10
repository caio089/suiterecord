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
