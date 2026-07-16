import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/server/app";

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
