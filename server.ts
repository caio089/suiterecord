import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./src/server/app";

// Honor the platform-provided PORT (Fly.io, Cloud Run, etc.); fall back to 3000 locally.
const PORT = Number(process.env.PORT) || 3000;

/**
 * Entrypoint local / Docker monolítico / Fly.io — camadas de dev server (Vite) e
 * static-serving por cima do app Express compartilhado (src/server/app.ts).
 * A Vercel usa api/index.ts, que exporta o mesmo app sem essa camada (não faz
 * sentido rodar `app.listen`/Vite middleware dentro de uma função serverless).
 */
async function startServer() {
  const apiOnly = process.env.API_ONLY === "true" || process.env.API_ONLY === "1";

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!apiOnly) {
    // Modo monolítico (Docker único) — serve o frontend do dist/
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/health") {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  // API_ONLY=true → só rotas /api e /health (frontend em Static Site à parte)

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Suiter Record API em http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"}${apiOnly ? ", API_ONLY" : ""})`
    );
  });
}

startServer();
