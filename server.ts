import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

// Lazy Initialize Gemini Client to avoid crashing when GEMINI_API_KEY is not defined on container startup
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave de API do Gemini (GEMINI_API_KEY) não está configurada nas variáveis de ambiente.");
    }
    _ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return _ai;
}

// Authentication check middleware for API endpoints
function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userEmail = req.headers["x-user-email"] as string;
  const permittedEmails = [
    "atendimento@triforceconsultoria.com",
    "consultor@triforceconsultoria.com"
  ];
  if (!userEmail || !permittedEmails.includes(userEmail.toLowerCase())) {
    return res.status(401).json({ error: "Acesso não autorizado. Por favor, faça login com uma conta corporativa válida." });
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

// Background Worker for Gemini File upload, processing and content generation
async function runTranscriptionBackground(jobId: string, body: any) {
  let tempFilePath: string | null = null;
  let uploadResult: any = null;

  try {
    const { audioBase64, mimeType, filename, context } = body;

    if (!audioBase64) {
      throw new Error("Nenhum arquivo de áudio enviado ou áudio corrompido.");
    }

    const fileExtension = mimeType ? mimeType.split("/")[1]?.split(";")[0] || "webm" : "webm";
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    tempFilePath = path.join(tempDir, `audio_${jobId}.${fileExtension}`);
    
    // Save locally
    transcriptionJobs[jobId].status = "uploading";
    transcriptionJobs[jobId].progressMessage = "Preparando arquivo e enviando para o processamento de IA (etapa 1 de 3)...";
    
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync(tempFilePath, audioBuffer);

    const aiClient = getAI();
    
    let cleanMimeType = mimeType || "audio/webm";
    if (cleanMimeType.includes(";")) {
      cleanMimeType = cleanMimeType.split(";")[0].trim();
    }

    console.log(`[Job ${jobId}] Fazendo upload do arquivo para o Gemini (MimeType: ${cleanMimeType}): ${tempFilePath} (${audioBuffer.length} bytes)`);
    uploadResult = await aiClient.files.upload({
      file: tempFilePath,
      config: {
        mimeType: cleanMimeType,
      }
    });
    console.log(`[Job ${jobId}] Upload concluído. Nome do arquivo no Gemini: ${uploadResult.name}`);

    // Wait for processing state
    transcriptionJobs[jobId].status = "processing";
    transcriptionJobs[jobId].progressMessage = "O Gemini está analisando e indexando seu áudio (etapa 2 de 3). Isso pode levar até 2 minutos para reuniões longas...";

    let fileState = uploadResult.state;
    let attempts = 0;
    while (fileState === "PROCESSING" && attempts < 36) { // Allow up to 3 minutes of indexing
      console.log(`[Job ${jobId}] Aguardando processamento no Gemini... (Tentativa ${attempts + 1})`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const fileStatus = await aiClient.files.get({ name: uploadResult.name });
      fileState = fileStatus.state;
      attempts++;
    }

    if (fileState !== "ACTIVE") {
      throw new Error(`Falha no processamento do arquivo no Gemini. Estado: ${fileState}`);
    }

    // AI Generation
    transcriptionJobs[jobId].status = "transcribing";
    transcriptionJobs[jobId].progressMessage = "Transcrevendo conversa e gerando relatórios de forma estruturada (etapa 3 de 3)...";

    let promptText = `Você é um assistente de produtividade especializado em transcrição e resumo de reuniões, nos moldes do sistema Suiter Recorder.
Por favor, analise o áudio de reunião fornecido e faça o seguinte:
1. Transcreva a conversa verbatim de forma completa e profissional, organizando em parágrafos coerentes e separando por locutores (ex: 'Palestrante 1', 'Palestrante 2') se houver múltiplos locutores claros.
2. Crie um resumo estruturado contendo:
   - Um título adequado e profissional para a reunião.
   - Uma visão geral (overview) concisa.
   - Uma lista de tópicos discutidos detalhando os pontos chave de cada um.
   - Uma lista de decisões importantes tomadas.
   - Uma lista clara de ações a serem tomadas (ações/tarefas), quem é o responsável por cada uma (obrigatoriamente atribuído a um dos participantes presentes) e o nível de prioridade (Alta, Média, Baixa).
   - Identificação e separação dos participantes entre Membros da Triforce (ex: consultores, representantes da Triforce) e Membros do Cliente.
   - Sugestões de tags relevantes de organização.

INSTRUÇÃO CRÍTICA SOBRE PARTICIPANTES E CONTEXTO:
NÃO invente participantes fictícios ou inexistentes se eles não forem explicitamente mencionados no áudio ou se não constarem no contexto real fornecido abaixo.
Se o áudio for curto, de teste ou um monólogo de um único usuário, identifique apenas esse usuário como participante (em membros da Triforce) e deixe a lista de membros do Cliente vazia, ou liste apenas as pessoas de fato identificáveis no áudio ou descritas no contexto.
Sempre atribua as tarefas/ações de forma automatizada apenas aos participantes reais cadastrados na reunião.`;

    if (context) {
      promptText += `\n\nCONTEXTO REAL E SEGURO DA REUNIÃO ATUAL:\n${context}\n\nUse estritamente estes dados de contexto reais (como título, descrição, participantes reais extraídos do Google Agenda e usuário atual que iniciou a gravação) para guiar o preenchimento do título da reunião, a lista de participantes e os responsáveis pelas tarefas/ações correspondentes! Evite nomes fictícios a todo custo.`;
    }

    promptText += `\n\nVocê deve responder rigorosamente no formato JSON especificado.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        transcript: {
          type: Type.STRING,
          description: "Full verbatim text transcription of the meeting. Organize into logical paragraphs. Identify speakers as 'Palestrante 1', 'Palestrante 2', etc. if possible.",
        },
        title: {
          type: Type.STRING,
          description: "A professional and descriptive meeting title.",
        },
        overview: {
          type: Type.STRING,
          description: "A summary overview of the meeting's objective and core outcomes.",
        },
        topics: {
          type: Type.ARRAY,
          description: "Major topics discussed in the meeting with detailed notes.",
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING, description: "Topic title." },
              details: { type: Type.STRING, description: "Detailed description of the discussion points and decisions for this topic." },
            },
            required: ["topic", "details"],
          },
        },
        decisions: {
          type: Type.ARRAY,
          description: "Key important decisions made during the meeting.",
          items: { type: Type.STRING },
        },
        actions: {
          type: Type.ARRAY,
          description: "Action items or tasks agreed upon.",
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: "The task or action description." },
              assignee: { type: Type.STRING, description: "Name of the person assigned or 'Não atribuído' if unassigned." },
              priority: { type: Type.STRING, description: "Priority level: Alta, Média, Baixa." },
            },
            required: ["action", "assignee", "priority"],
          },
        },
        participants: {
          type: Type.OBJECT,
          description: "Identification and categorization of the participants present.",
          properties: {
            membersTriforce: {
              type: Type.ARRAY,
              description: "Array of names of participants representing Triforce (internal consulting/project team).",
              items: { type: Type.STRING },
            },
            membersClient: {
              type: Type.ARRAY,
              description: "Array of names of participants representing the client.",
              items: { type: Type.STRING },
            },
          },
          required: ["membersTriforce", "membersClient"],
        },
        suggestedTags: {
          type: Type.ARRAY,
          description: "3 to 5 single-word relevant tags for organizing this file (e.g. Vendas, Marketing, Operações).",
          items: { type: Type.STRING },
        },
      },
      required: ["transcript", "title", "overview", "topics", "decisions", "actions", "participants", "suggestedTags"],
    };

    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          fileData: {
            fileUri: uploadResult.uri,
            mimeType: uploadResult.mimeType,
          },
        },
        promptText,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("O Gemini não retornou dados de transcrição válidos.");
    }

    const result = JSON.parse(jsonText.trim());
    
    transcriptionJobs[jobId].status = "completed";
    transcriptionJobs[jobId].result = result;
    transcriptionJobs[jobId].progressMessage = "Sucesso!";
    console.log(`[Job ${jobId}] Processamento concluído com sucesso.`);
  } catch (error: any) {
    console.error(`[Job ${jobId}] Erro na transcrição background:`, error);
    transcriptionJobs[jobId].status = "failed";
    transcriptionJobs[jobId].error = error.message || String(error);
    transcriptionJobs[jobId].progressMessage = "Erro no processamento.";
  } finally {
    // Garantir limpeza total de arquivos temporários locais e na nuvem
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[Job ${jobId}] Arquivo temporário local limpo.`);
      } catch (err) {
        console.error("Erro ao apagar arquivo temporário local:", err);
      }
    }

    if (uploadResult && uploadResult.name) {
      try {
        const aiClient = getAI();
        await aiClient.files.delete({ name: uploadResult.name });
        console.log(`[Job ${jobId}] Arquivo temporário excluído do Gemini.`);
      } catch (err) {
        console.error("Erro ao apagar arquivo temporário no Gemini:", err);
      }
    }
  }
}

// API endpoint to start an asynchronous Transcription Job
app.post("/api/transcribe", authenticateRequest, async (req, res) => {
  try {
    const { audioBase64 } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "Nenhum arquivo de áudio enviado ou áudio corrompido." });
    }

    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    transcriptionJobs[jobId] = {
      id: jobId,
      status: "pending",
      progressMessage: "Codificando áudio enviado e agendando processamento de IA...",
      createdAt: Date.now()
    };

    // Run the long transcription in the background without awaiting it
    runTranscriptionBackground(jobId, req.body).catch(err => {
      console.error(`Erro crítico não capturado no job background ${jobId}:`, err);
    });

    // Respond immediately with the jobId so that client can start polling
    return res.json({ jobId, status: "pending" });
  } catch (error: any) {
    console.error("Erro ao iniciar job de transcrição:", error);
    return res.status(500).json({
      error: "Falha ao iniciar o processamento de áudio.",
      details: error.message || error,
    });
  }
});

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

    const promptText = `Você é o assistente inteligente de busca do Suiter Recorder AI. O usuário fez a seguinte pergunta sobre o histórico de reuniões gravadas:
"${query}"

Abaixo está o contexto de reuniões disponíveis (transcrições e metadados):
${context}

Responda à pergunta do usuário de forma amigável, clara, concisa e estruturada em português.
No início da resposta ou durante a resposta, faça referência explícita a quais reuniões forneceram essa informação (pelo título e data).
Se a informação não estiver disponível nos históricos fornecidos, explique educadamente que não encontrou menção sobre isso nas reuniões anteriores.`;

    const aiClient = getAI();
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
    });

    return res.json({ answer: response.text });
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

// API endpoint to load firebase configuration dynamically without compile-time module resolution dependencies
app.get("/api/firebase-config", (req, res) => {
  try {
    const searchPaths = [
      path.join(process.cwd(), "firebase-applet-config.json"),
      path.join(process.cwd(), "src", "firebase-applet-config.json")
    ];
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, "utf-8");
        return res.json(JSON.parse(fileContent));
      }
    }
    return res.status(404).json({ error: "Firebase applet config not found on server workspace" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to read Firebase config", details: error.message });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Suiter Recorder backend rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
