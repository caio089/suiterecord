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
 * Por que catch-all (`[...path].ts`) e não `index.ts` + rewrite:
 * `api/index.ts` só casa `/api` exato; um rewrite `/api/:path* -> /api` faz o
 * Express receber `req.url = "/api"`, perdendo o subpath (nenhuma rota casa e a
 * função acaba retornando erro). Com o catch-all, a Vercel roteia
 * `/api/qualquer/coisa` para cá pelo filesystem (antes dos rewrites), preservando
 * o path original em `req.url` — o roteamento interno do Express
 * (`/api/transcribe`, `/api/google/oauth/status` etc.) volta a funcionar.
 *
 * O handler é uma função explícita (não `export default app`) para evitar
 * ambiguidade de interop ESM/CJS ao a Vercel reconhecer o export como handler.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
