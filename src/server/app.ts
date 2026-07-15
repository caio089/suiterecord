import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

/**
 * App Express puro (sem app.listen, sem middleware do Vite, sem static-serving).
 * Reaproveitado por:
 * - server.ts (raiz) — dev local, Docker monolítico e Fly.io — adiciona Vite/static/listen por cima.
 * - api/index.ts — função serverless da Vercel, exporta este app diretamente.
 *
 * IMPORTANTE (Vercel): o corpo de uma Function tem limite de 4.5 MB. Por isso o
 * áudio nunca trafega pelo corpo de uma rota daqui — o cliente sobe direto pro
 * Supabase Storage (ver src/supabase.ts `uploadAudioToStorage`) e só manda o
 * `storagePath` (texto) para /api/transcribe.
 */
export const app = express();

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "8mb", extended: true }));

/** CORS — necessário quando frontend e API estão em hosts diferentes (ou em dev). */
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
  const listed = Boolean(originNorm) && allowed.includes(originNorm);
  // Front e API no mesmo domínio (Vercel single-project, ou monolito) não precisam de CORS,
  // mas plataformas com preview URLs variáveis (Vercel *.vercel.app) se beneficiam disso:
  const knownPreviewHost =
    process.env.NODE_ENV === "production" &&
    Boolean(originNorm) &&
    originNorm.startsWith("https://") &&
    (originNorm.endsWith(".vercel.app") || originNorm.endsWith(".vercel.dev"));

  if (origin && (allowAll || listed || knownPreviewHost)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Alfredo-API-Key",
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

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
const AUDIO_BUCKET = "audio-recordings";
/** Saída generosa o bastante pra transcrição+ata de uma reunião de 3h sem truncar o JSON. */
const GROQ_CHAT_MAX_TOKENS = 8000;

/** Health check para load balancers / plataformas de deploy. */
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "alfredo-api",
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

let supabaseAdminClient: SupabaseClient | null = null;
/** Client server-side com a service role — bypassa RLS. Nunca expor essa chave ao cliente. */
function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase não configurado no servidor. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da API.",
    );
  }
  supabaseAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdminClient;
}

/**
 * Roda `fn` sem bloquear a resposta HTTP. Fora da Vercel (Fly/Docker/local), o
 * processo Node continua vivo normalmente após o `res.json()`, então basta não
 * dar `await`. Na Vercel, a função pode ser congelada logo após a resposta —
 * `waitUntil` do runtime é o jeito suportado de manter o trabalho rodando até
 * `maxDuration` (ver vercel.json).
 */
function runInBackground(fn: () => Promise<void>): void {
  const promise = fn().catch((err) => {
    console.error("Erro não capturado em tarefa de background:", err);
  });
  if (process.env.VERCEL) {
    import("@vercel/functions")
      .then(({ waitUntil }) => waitUntil(promise))
      .catch((err) => {
        console.error(
          "Não foi possível registrar waitUntil (@vercel/functions ausente) — o job pode ser interrompido antes de terminar:",
          err,
        );
      });
  }
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
      max_tokens: GROQ_CHAT_MAX_TOKENS,
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
  const finishReason = data?.choices?.[0]?.finish_reason;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("A Groq não retornou conteúdo válido no chat.");
  }

  try {
    return JSON.parse(content);
  } catch {
    // Tenta extrair JSON embutido em markdown
    const match = String(content).match(/\{[\s\S]*\}/);
    if (!match) {
      const truncatedHint = finishReason === "length" ? " (resposta truncada por max_tokens)" : "";
      throw new Error(`Resposta da Groq não é um JSON válido${truncatedHint}.`);
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      const truncatedHint = finishReason === "length" ? " — resposta truncada por max_tokens" : "";
      throw new Error(`Resposta da Groq veio com JSON incompleto${truncatedHint}.`);
    }
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
      max_tokens: GROQ_CHAT_MAX_TOKENS,
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

async function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authorization = String(req.headers.authorization || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return res.status(401).json({ error: "Sessão Supabase ausente." });
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user?.id || !data.user.email) {
      return res.status(401).json({ error: "Sessão Supabase inválida ou expirada." });
    }
    res.locals.authUser = {
      id: data.user.id,
      email: data.user.email.toLowerCase(),
    };
    next();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Falha ao validar sessão." });
  }
}

async function requireAdmin(_req: express.Request, res: express.Response, next: express.NextFunction) {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("permitted_users").select("role")
    .eq("email", res.locals.authUser.email).maybeSingle();
  if (data?.role !== "Administrador") return res.status(403).json({ error: "Acesso restrito a administradores." });
  next();
}

async function authenticateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const raw = String(req.headers["x-alfredo-api-key"] || "");
  if (!raw.startsWith("alf_")) return res.status(401).json({ error: "Chave da API ausente." });
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("api_keys").select("id,owner_id,scopes,revoked_at")
    .eq("key_hash", hash).maybeSingle();
  if (!data || data.revoked_at) return res.status(401).json({ error: "Chave inválida ou revogada." });
  res.locals.apiKey = data;
  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  next();
}

app.get("/api/v1/meetings", authenticateApiKey, async (_req, res) => {
  if (!res.locals.apiKey.scopes.includes("meetings:read")) return res.status(403).json({ error: "Escopo insuficiente." });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("meetings")
    .select("id,title,date,duration,overview,topics,decisions,actions,tags,participants,created_at")
    .eq("owner_id", res.locals.apiKey.owner_id).order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});

async function enqueueDurableTranscription(req: express.Request, jobId: string): Promise<boolean> {
  const qstashToken = process.env.QSTASH_TOKEN || "";
  const workerSecret = process.env.TRANSCRIPTION_WORKER_SECRET || "";
  if (!qstashToken || !workerSecret) return false;
  const callback = `${resolveApiPublicUrl(req)}/api/internal/transcription-worker`;
  const response = await fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(callback)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
      "Upstash-Retries": "5",
      "Upstash-Forward-Authorization": `Bearer ${workerSecret}`,
    },
    body: JSON.stringify({ jobId }),
  });
  if (!response.ok) throw new Error(`Não foi possível enfileirar a transcrição (${response.status}).`);
  return true;
}

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

type TranscriptionJobRow = {
  id: string;
  status: "pending" | "uploading" | "processing" | "transcribing" | "completed" | "failed";
  progress_message?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  result?: any;
  error?: string | null;
  created_by: string;
};

function updateJob(
  supabaseAdmin: SupabaseClient,
  jobId: string,
  fields: Partial<Omit<TranscriptionJobRow, "id" | "created_by">>,
) {
  return supabaseAdmin.from("transcription_jobs").update(fields).eq("id", jobId);
}

// Background Worker — baixa do Storage, Groq Whisper (STT) + Llama (estruturação)
async function runTranscriptionBackground(
  jobId: string,
  ctx: {
    storagePath: string;
    mimeType?: string;
    context?: string;
    supabaseAdmin: SupabaseClient;
  },
) {
  const { storagePath, context, supabaseAdmin } = ctx;
  let tempFilePath: string | null = null;

  try {
    await updateJob(supabaseAdmin, jobId, {
      status: "uploading",
      progress_message: "Baixando áudio do armazenamento na nuvem...",
    });

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .download(storagePath);
    if (downloadError || !fileBlob) {
      throw new Error(
        `Falha ao baixar o áudio do Storage (${storagePath}): ${downloadError?.message || "arquivo não encontrado"}`,
      );
    }

    let cleanMimeType = ctx.mimeType || fileBlob.type || "audio/webm";
    if (cleanMimeType.includes(";")) {
      cleanMimeType = cleanMimeType.split(";")[0].trim();
    }
    const fileExtension = cleanMimeType.split("/")[1] || "webm";

    // Único diretório com permissão de escrita garantida em runtimes serverless (Vercel: só /tmp).
    tempFilePath = path.join(os.tmpdir(), `audio_${jobId}.${fileExtension}`);
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    console.log(
      `[Job ${jobId}] Áudio baixado (${cleanMimeType}): ${tempFilePath} (${buffer.length} bytes)`,
    );

    await updateJob(supabaseAdmin, jobId, {
      status: "processing",
      progress_message: "Transcrevendo áudio com Groq Whisper (etapa 1 de 2)...",
    });

    const rawTranscript = await groqTranscribeAudio(tempFilePath, cleanMimeType);
    console.log(
      `[Job ${jobId}] Whisper OK (${rawTranscript.length} chars). Estruturando com Llama...`,
    );

    await updateJob(supabaseAdmin, jobId, {
      status: "transcribing",
      progress_message: "Gerando ata estruturada com Groq Llama (etapa 2 de 2)...",
    });

    let transcriptForAnalysis = rawTranscript;
    if (rawTranscript.length > 60_000) {
      const parts = rawTranscript.match(/[\s\S]{1,45_000}/g) || [rawTranscript];
      const summaries: string[] = [];
      for (let index = 0; index < parts.length; index++) {
        await updateJob(supabaseAdmin, jobId, {
          progress_message: `Consolidando trecho ${index + 1} de ${parts.length}...`,
        });
        summaries.push(await groqChatText(
          "Resuma fielmente este trecho de reunião, preservando nomes, decisões, ações, responsáveis e fatos. Não invente dados.",
          parts[index],
        ));
      }
      transcriptForAnalysis = summaries.join("\n\n--- PRÓXIMO TRECHO ---\n\n");
    }

    let userPrompt = `Transcrição bruta da reunião:
"""
${transcriptForAnalysis}
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

    const systemPrompt = `Você é o assistente de produtividade do Alfredo.
Responda APENAS com um objeto JSON válido (sem markdown) neste formato:
${MEETING_JSON_SCHEMA_HINT}
Todos os campos obrigatórios devem existir. Use português brasileiro.`;

    const result = await groqChatJson(systemPrompt, userPrompt);

    // A ata pode usar resumos hierárquicos, mas a transcrição entregue permanece integral.
    result.transcript = rawTranscript;

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

    await updateJob(supabaseAdmin, jobId, {
      status: "completed",
      result,
      progress_message: "Sucesso!",
    });
    console.log(`[Job ${jobId}] Processamento Groq concluído com sucesso.`);
  } catch (error: any) {
    console.error(`[Job ${jobId}] Erro na transcrição background:`, error);
    try {
      await updateJob(supabaseAdmin, jobId, {
        status: "failed",
        error: error.message || String(error),
        progress_message: "Erro no processamento.",
      });
    } catch (updateErr) {
      console.error(`[Job ${jobId}] Falha ao gravar status de erro:`, updateErr);
    }
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Erro ao apagar arquivo temporário local:", err);
      }
    }
  }
}

/** Limpeza best-effort de jobs antigos — sem setInterval (não sobrevive a invocações serverless). */
function cleanupOldJobs(supabaseAdmin: SupabaseClient) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  supabaseAdmin
    .from("transcription_jobs")
    .delete()
    .lt("created_at", cutoff)
    .then(({ error }) => {
      if (error) console.error("Erro na limpeza de jobs antigos:", error.message);
    });
}

// API endpoint to start an asynchronous Transcription Job.
// Recebe só metadados (JSON pequeno) — o áudio já foi enviado direto ao
// Supabase Storage pelo cliente antes desta chamada (ver src/supabase.ts).
app.post("/api/transcribe", authenticateRequest, async (req, res) => {
  try {
    const userEmail = String(res.locals.authUser.email);
    const ownerId = String(res.locals.authUser.id);
    const { storagePath, mimeType, context } = req.body || {};

    if (!storagePath || typeof storagePath !== "string") {
      return res.status(400).json({
        error: "storagePath é obrigatório — envie o áudio ao Storage antes de chamar /api/transcribe.",
      });
    }
    const normalizedPath = storagePath.toLowerCase();
    if (!normalizedPath.startsWith(`${userEmail}/`)) {
      return res.status(403).json({ error: "O áudio informado não pertence ao usuário autenticado." });
    }

    // Valida Groq e Supabase cedo — evita job "fantasma" que só falha no poll.
    let supabaseAdmin: SupabaseClient;
    try {
      getGroqApiKey();
      supabaseAdmin = getSupabaseAdmin();
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Configuração da API incompleta." });
    }

    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const { error: insertError } = await supabaseAdmin.from("transcription_jobs").insert({
      id: jobId,
      status: "pending",
      progress_message: "Job criado, aguardando processamento...",
      storage_path: storagePath,
      mime_type: mimeType || null,
      created_by: userEmail,
      owner_id: ownerId,
    });
    if (insertError) {
      console.error("Erro ao criar job de transcrição:", insertError);
      return res.status(500).json({
        error: "Falha ao registrar o job de transcrição no banco.",
        details: insertError.message,
      });
    }

    cleanupOldJobs(supabaseAdmin);

    const queued = await enqueueDurableTranscription(req, jobId);
    if (!queued) {
      runInBackground(() =>
        runTranscriptionBackground(jobId, { storagePath, mimeType, context, supabaseAdmin }),
      );
    }

    return res.json({ jobId, status: "pending", durableQueue: queued });
  } catch (error: any) {
    console.error("Erro ao iniciar job de transcrição:", error);
    return res.status(500).json({
      error: "Falha ao iniciar o processamento de áudio.",
      details: error.message || error,
    });
  }
});

app.post("/api/internal/transcription-worker", async (req, res) => {
  const expected = process.env.TRANSCRIPTION_WORKER_SECRET || "";
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return res.status(401).json({ error: "Worker não autorizado." });
  const jobId = String(req.body?.jobId || "");
  const admin = getSupabaseAdmin();
  const { data: job, error } = await admin.from("transcription_jobs")
    .select("id,status,storage_path,mime_type")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !job) return res.status(404).json({ error: "Job não encontrado." });
  if (job.status === "completed") return res.json({ ok: true, alreadyCompleted: true });
  await runTranscriptionBackground(jobId, {
    storagePath: job.storage_path,
    mimeType: job.mime_type || undefined,
    supabaseAdmin: admin,
  });
  return res.json({ ok: true });
});

app.post("/api/integrations/api-keys", authenticateRequest, requireAdmin, async (req, res) => {
  const raw = `alf_${crypto.randomBytes(32).toString("base64url")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("api_keys").insert({
    owner_id: res.locals.authUser.id,
    name: String(req.body?.name || "Integração externa").slice(0, 80),
    key_hash: hash,
    key_prefix: raw.slice(0, 12),
    scopes: Array.isArray(req.body?.scopes) ? req.body.scopes : ["meetings:read"],
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ apiKey: raw, warning: "Esta chave será exibida apenas uma vez." });
});

// API endpoint to check the status of a Transcription Job — lê do Postgres, não de
// memória do processo, então sobrevive a refresh do cliente e a restart/nova invocação do servidor.
app.get("/api/transcribe/status/:jobId", authenticateRequest, async (req, res) => {
  const { jobId } = req.params;
    const userEmail = String(res.locals.authUser.email);

  let supabaseAdmin: SupabaseClient;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  const { data, error } = await supabaseAdmin
    .from("transcription_jobs")
    .select("status, progress_message, result, error, created_by, owner_id")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: `Erro ao consultar o job: ${error.message}` });
  }
  if (!data || data.owner_id !== res.locals.authUser.id) {
    return res.status(404).json({ error: "Job de transcrição não encontrado ou já expirou." });
  }

  return res.json({
    status: data.status,
    progressMessage: data.progress_message,
    result: data.result,
    error: data.error,
  });
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
      "Você é o assistente inteligente de busca do Alfredo. Responda em português de forma clara e objetiva.";
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

// API endpoint for sending structured data to destino externo System Database
app.post("/api/export-integration", authenticateRequest, requireAdmin, async (req, res) => {
  const { summaryData } = req.body;
  const targetUrl = String(process.env.INTEGRATION_WEBHOOK_URL || "https://example.invalid/webhook");
  const token = String(process.env.INTEGRATION_WEBHOOK_TOKEN || "");
  const isMock = process.env.INTEGRATION_WEBHOOK_ENABLED !== "true";

  // SSRF prevention: Validate export URL host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: "URL de API inválida." });
  }
  const allowedHosts = String(process.env.INTEGRATION_ALLOWED_HOSTS || "")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  const isHostAllowed = allowedHosts.some(host =>
    parsedUrl.hostname === host || parsedUrl.hostname.endsWith("." + host)
  );
  if (!isMock && (parsedUrl.protocol !== "https:" || !isHostAllowed)) {
    return res.status(400).json({ error: "Destino não autorizado. Use HTTPS e configure INTEGRATION_ALLOWED_HOSTS." });
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
      source: "Alfredo",
      file_length_sec: summaryData.duration || 0,
    },
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "None",
    "X-System-Source": "Alfredo",
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
      message: "Resumo exportado com sucesso para a base de dados do destino externo!",
      integration_id: `suit_mtg_${Math.floor(Math.random() * 900000 + 100000)}`,
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
          "x-powered-by": "destino externo API Gateway",
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
    console.error("Erro ao integrar com o destino externo:", err);
    return res.status(502).json({
      success: false,
      simulated: false,
      request: requestDetails,
      error: `Falha de conexão com a API do destino externo: ${err.message || err}`,
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
    hint: "Cadastre o redirect URI na API (ex: https://SEU-APP.vercel.app/api/google/oauth/callback).",
  });
});

function resolveApiPublicUrl(req?: express.Request): string {
  const configured = (
    process.env.API_PUBLIC_URL ||
    process.env.VERCEL_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }
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
  // Frontend — destino do redirect final quando não há opener
  let frontendUrl = (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.CORS_ORIGINS?.split(",")[0] ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  // Se ainda estiver localhost em produção, usa Origin da requisição (front real)
  const reqOrigin = String(req?.headers?.origin || "")
    .trim()
    .replace(/\/$/, "");
  if (
    (!frontendUrl || frontendUrl.includes("localhost")) &&
    reqOrigin.startsWith("https://")
  ) {
    frontendUrl = reqOrigin;
  }
  if (!frontendUrl) frontendUrl = "http://localhost:3000";
  // Nunca use a URL do static/front como redirect URI do Google
  const apiPublicUrl = resolveApiPublicUrl(req);
  const redirectUri = `${apiPublicUrl}/api/google/oauth/callback`;
  return { clientId, clientSecret, frontendUrl, apiPublicUrl, redirectUri };
}

/** State assinado (HMAC) — sobrevive a cold start / restart / troca de instância serverless. */
const oauthStateSecret =
  process.env.GOOGLE_OAUTH_STATE_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.SECRET_GOOGLE_CLIENT_ID || "";

function signOAuthState(): string {
  if (!oauthStateSecret) throw new Error("GOOGLE_OAUTH_STATE_SECRET não configurado.");
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
    oauthConfigured: Boolean(cfg.clientId && cfg.clientSecret && oauthStateSecret),
    hasStateSecret: Boolean(oauthStateSecret),
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
        "<h1>Google OAuth não configurado</h1><p>Defina <code>VITE_GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> nas variáveis de ambiente da API.</p>",
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
  error?: string;
  frontendUrl: string;
}) {
  const payload = JSON.stringify({
    type: "integration-google-oauth",
    ok: opts.ok,
    accessToken: opts.accessToken || null,
    expiresIn: opts.expiresIn || 0,
    error: opts.error || null,
  });
  const frontend = JSON.stringify(opts.frontendUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Google Agenda — Alfredo</title>
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
      // Entrega o token somente à origem configurada do frontend.
      try {
        if (window.opener && !window.opener.closed) {
          try { window.opener.postMessage(payload, frontend); } catch (e1) {}
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

export default app;
