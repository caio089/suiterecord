import type { IncomingMessage, ServerResponse } from "http";
// IMPORTANTE: extensão .js explícita. Na Vercel esta função roda como ESM puro
// (package.json tem "type": "module") e não é bundlada, então o Node exige a
// extensão no import relativo — sem ela dá ERR_MODULE_NOT_FOUND e a função
// inteira crasha no load (FUNCTION_INVOCATION_FAILED em todo /api/*). O TS com
// moduleResolution "bundler" aceita o `.js` apontando para o arquivo `.ts`.
import app from "../src/server/app.js";

/**
 * Função serverless da Vercel — catch-all para TODAS as rotas /api/* (e /api).
 *
 * Por que catch-all (`[...path].ts`): a Vercel roteia `/api/qualquer/coisa` para
 * cá pelo filesystem. Porém a rota gerada automaticamente só casa UM segmento
 * (`/api/x` funciona, `/api/x/y/z` dava NOT_FOUND no roteador da Vercel). Por
 * isso o vercel.json também tem o rewrite explícito
 * `/api/:path* -> /api/[...path]`, que força os caminhos aninhados a chegarem
 * nesta função (padrão "splat API route" documentado pela Vercel).
 *
 * Reconstrução do path: para o catch-all `[...path]`, a Vercel expõe os
 * segmentos no query param `path` (tanto na rota de filesystem quanto via
 * rewrite). Reconstruímos `req.url` a partir dele para garantir que o Express
 * receba o caminho real (`/api/google/oauth/status`) e roteie corretamente,
 * independentemente de o pathname que a Vercel deixou em `req.url`.
 *
 * O handler é uma função explícita (não `export default app`) para evitar
 * ambiguidade de interop ESM/CJS ao a Vercel reconhecer o export como handler.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url ?? "/";
  const queryStart = rawUrl.indexOf("?");
  const search = queryStart >= 0 ? rawUrl.slice(queryStart + 1) : "";
  const params = new URLSearchParams(search);
  const segments = params.getAll("path").filter(Boolean);

  if (segments.length > 0) {
    // `path` pode vir como múltiplos valores (path=a&path=b) ou como um único
    // valor com barras (path=a/b/c); join + filtro de vazios cobre ambos.
    const pathname = `/api/${segments
      .join("/")
      .split("/")
      .filter(Boolean)
      .join("/")}`;
    params.delete("path");
    const rest = params.toString();
    req.url = rest ? `${pathname}?${rest}` : pathname;
  }

  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
