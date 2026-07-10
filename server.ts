import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

// ESM path helpers (safe for both ESM and CJS)
const __filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? dirname(__filename) : "";

const app = express();
// Honor the platform-provided PORT (Fly.io, Cloud Run, etc.); fall back to 3000 locally.
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limits for large base64 audio recordings
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

/** CORS — necessário quando frontend (static) e API estão em hosts diferentes */
function getAllowedOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  const originNorm = origin ? origin.replace(/\/$/, "") : "";
  const allowAll = allowed.includes("*");
  const isAllowed =
    Boolean(originNorm) &&
    (allowAll ||
      allowed.includes(originNorm) ||
      // Fallback: mesmo projeto Render (static vs api) quando FRONTEND_URL ainda não foi setado
      (originNorm.endsWith(".onrender.com") &&
        allowed.some((a) => a.includes("onrender.com"))));

  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-User-Email",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
  } else if (origin && req.path.startsWith("/api")) {
    console.warn(
      `[CORS] Origin bloqueada: ${origin}. Permitidas: ${allowed.join(", ") || "(nenhuma)"}`,
    );
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

/** Health check para Render / load balancers */
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "suiterecord-api",
    env: process.env.NODE_ENV || "development",
  });
});

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY || process.env.QROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "A chave de API da Groq (GROQ_API_KEY ou QROQ_API_KEY) não está configurada nas variáveis de ambiente."
    );
  }
  return apiKey;
}

async function groqChatJson(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = getGroqApiKey();
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Chat API (${response.status}): ${errText.slice(0, 400)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("A Groq não retornou conteúdo válido no chat.");
  }

  try {
    return JSON.parse(content);
  } catch {
    // Tenta extrair JSON embutido em markdown
    const match = String(content).match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta da Groq não é um JSON válido.");
    return JSON.parse(match[0]);
  }
}

async function groqChatText(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGroqApiKey();
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Chat API (${response.status}): ${errText.slice(0, 400)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("A Groq não retornou resposta de texto.");
  }
  return String(content);
}

async function groqTranscribeAudio(
  filePath: string,
  mimeType: string
): Promise<string> {
  const apiKey = getGroqApiKey();
  const audioBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).replace(".", "") || "webm";
  const blob = new Blob([new Uint8Array(audioBuffer)], {
    type: mimeType || "audio/webm",
  });

  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("language", "pt");
  form.append("response_format", "json");
  form.append(
    "prompt",
    "Reunião corporativa em português brasileiro. Nomes próprios e termos técnicos devem ser preservados."
  );

  const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Whisper API (${response.status}): ${errText.slice(0, 400)}`);
  }

  const data = await response.json();
  const text = data?.text;
  if (!text || !String(text).trim()) {
    throw new Error("A Groq Whisper não retornou texto de transcrição.");
  }
  return String(text).trim();
}

// Gate simples: exige e-mail do usuário logado (header). A autorização real é no client/admin.
function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userEmail = String(req.headers["x-user-email"] || "").trim();
  if (!userEmail || !userEmail.includes("@")) {
    return res.status(401).json({
      error: "Acesso não autorizado. Faça login com uma conta válida.",
    });
  }
  next();
}

// Interface and Job Queue for Asynchronous Transcription Jobs
interface TranscriptionJob {
  id: string;
  status: "pending" | "uploading" | "processing" | "transcribing" | "completed" | "failed";
  progressMessage?: string;
  result?: any;
  error?: string;
  createdAt: number;
}

const transcriptionJobs: Record<string, TranscriptionJob> = {};

// Clean up jobs older than 4 hours every 30 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const maxAge = 4 * 60 * 60 * 1000; // 4 hours
  for (const [id, job] of Object.entries(transcriptionJobs)) {
    if (now - job.createdAt > maxAge) {
      delete transcriptionJobs[id];
    }
  }
}, 30 * 60 * 1000);

const MEETING_JSON_SCHEMA_HINT = `{
  "transcript": "string — transcrição completa organizada por locutores quando possível",
  "title": "string — título profissional da reunião",
  "overview": "string — visão geral concisa",
  "topics": [{ "topic": "string", "details": "string" }],
  "decisions": ["string"],
  "actions": [{ "action": "string", "assignee": "string", "priority": "Alta|Média|Baixa" }],
  "participants": {
    "membersTriforce": ["string"],
    "membersClient": ["string"]
  },
  "suggestedTags": ["string"]
}`;

// Background Worker — Groq Whisper (STT) + Llama (estruturação)
async function runTranscriptionBackground(
  jobId: string,
  body: {
    audioBase64?: string;
    audioBuffer?: Buffer;
    mimeType?: string;
    context?: string;
  },
) {
  let tempFilePath: string | null = null;

  try {
    const { audioBase64, audioBuffer, mimeType, context } = body;

    if (!audioBuffer && !audioBase64) {
      throw new Error("Nenhum arquivo de áudio enviado ou áudio corrompido.");
    }

    const fileExtension = mimeType
      ? mimeType.split("/")[1]?.split(";")[0] || "webm"
      : "webm";
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    tempFilePath = path.join(tempDir, `audio_${jobId}.${fileExtension}`);

    transcriptionJobs[jobId].status = "uploading";
    transcriptionJobs[jobId].progressMessage =
      "Preparando áudio para a Groq Whisper (etapa 1 de 2)...";

    const buffer = audioBuffer || Buffer.from(audioBase64!, "base64");
    fs.writeFileSync(tempFilePath, buffer);

    let cleanMimeType = mimeType || "audio/webm";
    if (cleanMimeType.includes(";")) {
      cleanMimeType = cleanMimeType.split(";")[0].trim();
    }

    console.log(
      `[Job ${jobId}] Enviando áudio para Groq Whisper (${cleanMimeType}): ${tempFilePath} (${buffer.length} bytes)`,
    );

    transcriptionJobs[jobId].status = "processing";
    transcriptionJobs[jobId].progressMessage =
      "Transcrevendo áudio com Groq Whisper (etapa 1 de 2)...";

    const rawTranscript = await groqTranscribeAudio(tempFilePath, cleanMimeType);
    console.log(
      `[Job ${jobId}] Whisper OK (${rawTranscript.length} chars). Estruturando com Llama...`,
    );

    transcriptionJobs[jobId].status = "transcribing";
    transcriptionJobs[jobId].progressMessage =
      "Gerando ata estruturada com Groq Llama (etapa 2 de 2)...";

    let userPrompt = `Transcrição bruta da reunião:
"""
${rawTranscript}
"""

Com base nessa transcrição, produza a ata estruturada no JSON exigido.
1. Refine a transcrição de forma profissional, organizando em parágrafos e separando locutores (ex: 'Palestrante 1') quando possível — sem inventar falas.
2. Crie título, overview, tópicos, decisões, ações (com assignee e prioridade Alta/Média/Baixa), participantes (Triforce vs Cliente) e 3–5 tags.

INSTRUÇÃO CRÍTICA:
NÃO invente participantes fictícios. Se for monólogo/teste, liste apenas quem for identificável.
Atribua ações apenas a participantes reais.`;

    if (context) {
      userPrompt += `\n\nCONTEXTO REAL DA REUNIÃO:\n${context}\n\nUse este contexto para título, participantes e responsáveis das ações.`;
    }

    const systemPrompt = `Você é o assistente de produtividade do Suiter Record.
Responda APENAS com um objeto JSON válido (sem markdown) neste formato:
${MEETING_JSON_SCHEMA_HINT}
Todos os campos obrigatórios devem existir. Use português brasileiro.`;

    const result = await groqChatJson(systemPrompt, userPrompt);

    // Garante transcript mesmo se o modelo omitir
    if (!result.transcript) {
      result.transcript = rawTranscript;
    }
    result.topics = Array.isArray(result.topics) ? result.topics : [];
    result.decisions = Array.isArray(result.decisions) ? result.decisions : [];
    result.actions = Array.isArray(result.actions) ? result.actions : [];
    result.suggestedTags = Array.isArray(result.suggestedTags)
      ? result.suggestedTags
      : [];
    result.participants = result.participants || {
      membersTriforce: [],
      membersClient: [],
    };

    transcriptionJobs[jobId].status = "completed";
    transcriptionJobs[jobId].result = result;
    transcriptionJobs[jobId].progressMessage = "Sucesso!";
    console.log(`[Job ${jobId}] Processamento Groq concluído com sucesso.`);
  } catch (error: any) {
    console.error(`[Job ${jobId}] Erro na transcrição background:`, error);
    transcriptionJobs[jobId].status = "failed";
    transcriptionJobs[jobId].error = error.message || String(error);
    transcriptionJobs[jobId].progressMessage = "Erro no processamento.";
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[Job ${jobId}] Arquivo temporário local limpo.`);
      } catch (err) {
        console.error("Erro ao apagar arquivo temporário local:", err);
      }
    }
  }
}

// API endpoint to start an asynchronous Transcription Job
// Aceita multipart (preferido em produção) ou JSON base64 (legado)
app.post(
  "/api/transcribe",
  authenticateRequest,
  (req, res, next) => {
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      return audioUpload.single("audio")(req, res, (err: unknown) => {
        if (err) {
          const message =
            err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
              ? "Áudio muito grande (máx. 30 MB). Grave em trechos menores."
              : err instanceof Error
                ? err.message
                : "Falha no upload do áudio.";
          return res.status(400).json({ error: message });
        }
        return next();
      });
    }
    return next();
  },
  async (req, res) => {
    try {
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      const audioBase64 = file ? undefined : req.body?.audioBase64;
      const mimeType = file
        ? file.mimetype || req.body?.mimeType
        : req.body?.mimeType;
      const context = file ? req.body?.context : req.body?.context;

      if (!file && !audioBase64) {
        return res.status(400).json({
          error: "Nenhum arquivo de áudio enviado ou áudio corrompido.",
        });
      }

      // Valida Groq cedo — evita job "fantasma" que só falha no poll
      try {
        getGroqApiKey();
      } catch (err: any) {
        return res.status(500).json({
          error: err.message || "GROQ_API_KEY não configurada na API.",
        });
      }

      const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      transcriptionJobs[jobId] = {
        id: jobId,
        status: "pending",
        progressMessage:
          "Codificando áudio enviado e agendando processamento na Groq...",
        createdAt: Date.now(),
      };

      const payload = {
        audioBuffer: file ? Buffer.from(file.buffer) : undefined,
        audioBase64: audioBase64 as string | undefined,
        mimeType: mimeType as string | undefined,
        context: context as string | undefined,
      };

      runTranscriptionBackground(jobId, payload).catch((err) => {
        console.error(
          `Erro crítico não capturado no job background ${jobId}:`,
          err,
        );
      });

      return res.json({ jobId, status: "pending" });
    } catch (error: any) {
      console.error("Erro ao iniciar job de transcrição:", error);
      return res.status(500).json({
        error: "Falha ao iniciar o processamento de áudio.",
        details: error.message || error,
      });
    }
  },
);

// API endpoint to check the status of a Transcription Job
app.get("/api/transcribe/status/:jobId", authenticateRequest, (req, res) => {
  const { jobId } = req.params;
  const job = transcriptionJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: "Job de transcrição não encontrado ou já expirou do cache do servidor." });
  }
  return res.json(job);
});

// API endpoint for Smart Search QA on previous meetings
app.post("/api/smart-search", authenticateRequest, async (req, res) => {
  try {
    const { query, meetings } = req.body;

    if (!query || !meetings || meetings.length === 0) {
      return res.status(400).json({ error: "É necessário fornecer uma pergunta e o histórico de reuniões." });
    }

    // Format transcripts context
    const context = meetings
      .map((m: any, index: number) => {
        return `--- REUNIÃO DE HISTÓRICO #${index + 1} ---
Título: ${m.title}
Data: ${m.date}
Tags: ${(m.tags || []).join(", ")}
Transcrição: ${m.transcript}
Resumo: ${m.overview}
-------------------------------------`;
      })
      .join("\n\n");

    const systemPrompt =
      "Você é o assistente inteligente de busca do Suiter Record. Responda em português de forma clara e objetiva.";
    const userPrompt = `O usuário fez a seguinte pergunta sobre o histórico de reuniões gravadas:
"${query}"

Abaixo está o contexto de reuniões disponíveis (transcrições e metadados):
${context}

Responda à pergunta do usuário de forma amigável, clara, concisa e estruturada em português.
No início da resposta ou durante a resposta, faça referência explícita a quais reuniões forneceram essa informação (pelo título e data).
Se a informação não estiver disponível nos históricos fornecidos, explique educadamente que não encontrou menção sobre isso nas reuniões anteriores.`;

    const answer = await groqChatText(systemPrompt, userPrompt);
    return res.json({ answer });
  } catch (error: any) {
    console.error("Erro na busca inteligente:", error);
    return res.status(500).json({
      error: "Falha ao processar busca inteligente.",
      details: error.message || error,
    });
  }
});

// API endpoint for sending structured data to Suiter System Database
app.post("/api/export-suiter", authenticateRequest, async (req, res) => {
  const { suiterConfig, summaryData } = req.body;
  const targetUrl = suiterConfig?.apiUrl || "https://api.suiter.interno/v1/meetings";
  const token = suiterConfig?.token || "";
  const isMock = suiterConfig?.isMock !== false; // defaults to true if not specified, allowing a robust fallback simulator

  // SSRF prevention: Validate export URL host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: "URL de API inválida." });
  }
  const allowedHosts = [
    "api.suiter.interno",
    "suiter.interno",
    "api.suiter.com",
    "api.suiter.com.br"
  ];
  const isHostAllowed = allowedHosts.some(host => 
    parsedUrl.hostname === host || parsedUrl.hostname.endsWith("." + host)
  );
  if (!isMock && !isHostAllowed) {
    return res.status(400).json({ error: "URL de API não permitida para exportação real. Use o modo de simulação para outros destinos." });
  }

  // Format payload according to configured database mapping
  const payload = {
    meeting_title: summaryData.title,
    date_exported: new Date().toISOString(),
    overview: summaryData.overview,
    topics: summaryData.topics.map((t: any) => ({
      name: t.topic,
      details: t.details,
    })),
    task_flow: summaryData.actions.map((a: any) => ({
      title: a.action,
      assignee: a.assignee,
      priority: a.priority,
      status: "pending",
    })),
    metadata: {
      tags: summaryData.tags || [],
      source: "Suiter Recorder AI Studio",
      file_length_sec: summaryData.duration || 0,
    },
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "None",
    "X-System-Source": "Suiter-Recorder-AI-Studio",
  };

  const requestDetails = {
    url: targetUrl,
    method: "POST",
    headers,
    body: payload,
  };

  // If in mock simulator mode or if URL is the default placeholder, simulate the integration with a detailed log trace
  if (isMock || targetUrl.includes("interno") || targetUrl.includes("localhost") || !token) {
    // Delay to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const mockResponse = {
      success: true,
      message: "Resumo exportado com sucesso para a base de dados do Suiter!",
      suiter_id: `suit_mtg_${Math.floor(Math.random() * 900000 + 100000)}`,
      status: "synchronized",
      created_at: new Date().toISOString(),
    };

    return res.json({
      success: true,
      simulated: true,
      request: requestDetails,
      response: {
        status: 201,
        statusText: "Created (Simulado)",
        headers: {
          "content-type": "application/json",
          "x-powered-by": "Suiter API Gateway",
        },
        body: mockResponse,
      },
    });
  }

  // Real fetch implementation
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const fetchRes = await fetch(targetUrl, {
      method: "POST",
      headers: headers as any,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = fetchRes.headers.get("content-type") || "";
    let responseBody: any;
    if (contentType.includes("application/json")) {
      responseBody = await fetchRes.json();
    } else {
      responseBody = await fetchRes.text();
    }

    return res.json({
      success: fetchRes.ok,
      simulated: false,
      request: requestDetails,
      response: {
        status: fetchRes.status,
        statusText: fetchRes.statusText,
        headers: Object.fromEntries(fetchRes.headers.entries()),
        body: responseBody,
      },
    });
  } catch (err: any) {
    console.error("Erro ao integrar com o Suiter:", err);
    return res.status(502).json({
      success: false,
      simulated: false,
      request: requestDetails,
      error: `Falha de conexão com a API do Suiter: ${err.message || err}`,
    });
  }
});

// Expõe o Client ID OAuth do Google (público por design) para o frontend
app.get("/api/google-client-id", (_req, res) => {
  const clientId = (
    process.env.VITE_GOOGLE_CLIENT_ID ||
    process.env.API_GOOGLE_CALENDAR_TOKEN ||
    ""
  ).trim();
  if (!clientId) {
    return res.status(404).json({
      error: "Google Client ID não configurado (VITE_GOOGLE_CLIENT_ID / API_GOOGLE_CALENDAR_TOKEN)",
    });
  }
  return res.json({
    clientId,
    expectedOrigin: process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000",
    oauthStartUrl: "/api/google/oauth/start",
    hint: "Cadastre o redirect URI na API (ex: https://SEU-API.onrender.com/api/google/oauth/callback).",
  });
});

function resolveApiPublicUrl(req?: express.Request): string {
  const configured = (
    process.env.API_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (configured) return configured;
  if (req) {
    const proto = (req.get("x-forwarded-proto") || req.protocol || "https")
      .split(",")[0]
      .trim();
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function getGoogleOAuthConfig(req?: express.Request) {
  const clientId = (
    process.env.VITE_GOOGLE_CLIENT_ID ||
    process.env.API_GOOGLE_CALENDAR_TOKEN ||
    ""
  ).trim();
  const clientSecret = (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.SECRET_GOOGLE_CLIENT_ID ||
    ""
  ).trim();
  // Frontend (static) — destino do redirect final quando não há opener
  const frontendUrl = (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.CORS_ORIGINS?.split(",")[0] ||
    "http://localhost:3000"
  )
    .trim()
    .replace(/\/$/, "");
  // Nunca use a URL do static como redirect URI do Google
  const apiPublicUrl = resolveApiPublicUrl(req);
  const redirectUri = `${apiPublicUrl}/api/google/oauth/callback`;
  return { clientId, clientSecret, frontendUrl, apiPublicUrl, redirectUri };
}

/** State assinado (HMAC) — sobrevive a cold start / restart no Render free */
const oauthStateSecret =
  process.env.GOOGLE_OAUTH_STATE_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.SECRET_GOOGLE_CLIENT_ID ||
  "suiter-oauth-dev-secret";

function signOAuthState(): string {
  const payload = Buffer.from(
    JSON.stringify({ t: Date.now(), n: crypto.randomBytes(8).toString("hex") }),
    "utf8",
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", oauthStateSecret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyOAuthState(state: string): boolean {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return false;
  const expected = crypto.createHmac("sha256", oauthStateSecret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { t?: number };
    if (!data.t) return false;
    return Date.now() - data.t <= 15 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Diagnóstico — frontend checa se OAuth está pronto antes de abrir o popup */
app.get("/api/google/oauth/status", (req, res) => {
  const cfg = getGoogleOAuthConfig(req);
  res.json({
    ok: true,
    oauthConfigured: Boolean(cfg.clientId && cfg.clientSecret),
    hasClientId: Boolean(cfg.clientId),
    hasClientSecret: Boolean(cfg.clientSecret),
    frontendUrl: cfg.frontendUrl,
    redirectUri: cfg.redirectUri,
    apiPublicUrl: cfg.apiPublicUrl,
  });
});

/** Inicia OAuth Google Calendar (authorization code) — evita invalid_client do popup GIS */
app.get("/api/google/oauth/start", (req, res) => {
  const { clientId, clientSecret, redirectUri, frontendUrl, apiPublicUrl } =
    getGoogleOAuthConfig(req);
  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .type("html")
      .send(
        "<h1>Google OAuth não configurado</h1><p>Defina <code>VITE_GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> no Web Service da API.</p>",
      );
  }

  const state = signOAuthState();
  console.log("[oauth/start]", { redirectUri, frontendUrl, apiPublicUrl });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
      "email",
      "profile",
    ].join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  // Evita Cross-Origin-Opener-Policy quebrar window.opener no callback
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/** Callback OAuth — troca code por access_token e devolve ao frontend */
app.get("/api/google/oauth/callback", async (req, res) => {
  const { clientId, clientSecret, redirectUri, frontendUrl } = getGoogleOAuthConfig(req);
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  const oauthError = req.query.error ? String(req.query.error) : "";

  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");

  if (oauthError) {
    return res.status(400).send(renderOAuthResultPage({
      ok: false,
      error: `Google OAuth: ${oauthError}`,
      frontendUrl,
    }));
  }

  if (!code || !state || !verifyOAuthState(state)) {
    return res.status(400).send(renderOAuthResultPage({
      ok: false,
      error: "State OAuth inválido ou expirado. Tente conectar novamente.",
      frontendUrl,
    }));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData, { redirectUri });
      return res.status(400).send(renderOAuthResultPage({
        ok: false,
        error:
          tokenData.error_description ||
          tokenData.error ||
          "Falha ao trocar o código OAuth. Confira Client ID/Secret e o redirect URI no Google Cloud.",
        frontendUrl,
      }));
    }

    return res.send(renderOAuthResultPage({
      ok: true,
      accessToken: tokenData.access_token,
      expiresIn: Number(tokenData.expires_in || 3600),
      refreshToken: tokenData.refresh_token || "",
      frontendUrl,
    }));
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return res.status(500).send(renderOAuthResultPage({
      ok: false,
      error: err.message || "Erro interno no callback OAuth",
      frontendUrl,
    }));
  }
});

function renderOAuthResultPage(opts: {
  ok: boolean;
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
  error?: string;
  frontendUrl: string;
}) {
  const payload = JSON.stringify({
    type: "suiter-google-oauth",
    ok: opts.ok,
    accessToken: opts.accessToken || null,
    expiresIn: opts.expiresIn || 0,
    refreshToken: opts.refreshToken || null,
    error: opts.error || null,
  });
  const frontend = JSON.stringify(opts.frontendUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Google Agenda — Suiter Record</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#090b0e; color:#e4e4e7; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { background:#18181b; border:1px solid #27272a; border-radius:16px; padding:24px; max-width:420px; text-align:center; }
    .ok { color:#34d399; } .err { color:#f87171; }
  </style>
</head>
<body>
  <div class="card">
    <h2 class="${opts.ok ? "ok" : "err"}">${opts.ok ? "Agenda conectada" : "Falha na conexão"}</h2>
    <p>${opts.ok ? "Você já pode fechar esta janela." : (opts.error || "Erro desconhecido")}</p>
  </div>
  <script>
    (function () {
      var payload = ${payload};
      var frontend = ${frontend};
      // postMessage com '*' — FRONTEND_URL errado no Render quebrava o targetOrigin e o popup fechava sem avisar
      try {
        if (window.opener && !window.opener.closed) {
          try { window.opener.postMessage(payload, frontend); } catch (e1) {}
          try { window.opener.postMessage(payload, "*"); } catch (e2) {}
          setTimeout(function () { window.close(); }, 600);
          return;
        }
      } catch (e) {}
      if (payload.ok && payload.accessToken) {
        var url = frontend + "/?google_oauth=1&access_token=" + encodeURIComponent(payload.accessToken) + "&expires_in=" + encodeURIComponent(String(payload.expiresIn || 3600));
        window.location.replace(url);
      } else {
        var errUrl = frontend + "/?google_oauth=0&error=" + encodeURIComponent(String(payload.error || "oauth_failed"));
        window.location.replace(errUrl);
      }
    })();
  </script>
</body>
</html>`;
}

// Vite Middleware for development / API-only em produção split
async function startServer() {
  const apiOnly =
    process.env.API_ONLY === "true" ||
    process.env.API_ONLY === "1";

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
  // API_ONLY=true → só rotas /api e /health (frontend em Static Site)

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Suiter Record API em http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"}${apiOnly ? ", API_ONLY" : ""})`
    );
  });
}

startServer();
