# Suiter Record

Extensão corporativa do ecossistema Suiter: gravação, transcrição com IA (Groq), atas e Google Agenda.

## Arquitetura atual (híbrida — alinhada ao plano Supabase + front CDN)

```
Browser (SPA)
   │  supabase-js + RLS
   ▼
Supabase (Auth + Postgres + RLS)
   │
   │  VITE_API_URL → API worker
   ▼
API Express (Render hoje · Fly.io opcional em gru)
   • /api/transcribe (+ jobs)
   • /api/smart-search, export, OAuth Google Agenda
   ▼
Groq (Whisper + Llama)
```

| Camada | Onde | Status |
|--------|------|--------|
| Dados + Auth + RLS | **Supabase** | ✅ já migrado (sem Firebase) |
| Frontend SPA | Render Static **ou Vercel** | ✅ Render; Vercel preparado (`vercel.json`) |
| API / transcrição longa | **Worker Express** (Render/Fly) | ✅ stateful; tabela `transcription_jobs` criada p/ próxima etapa |
| IA | Groq | ✅ |

> O documento de migração citava Firebase + Gemini + Cloud Run. **Isso já não é o estado do repo.** Auth/dados estão no Supabase; a IA é Groq.

## Local (monolítico)

1. `npm install`
2. Copie `.env.example` → `.env` (deixe `VITE_API_URL` vazio)
3. `npm run dev` → http://localhost:3000

## Deploy — opção A: Render (atual)

| Serviço | Tipo | Função |
|---------|------|--------|
| API | Web Service | Transcrição, busca IA, export, OAuth Google |
| Web | Static Site | Frontend Vite |

Static precisa de `VITE_API_URL=https://SUA-API.onrender.com` (ex.: `https://suiterecord.onrender.com`).

Google OAuth:
- Origem JS: URL do **static** (`https://suiterecord-1.onrender.com`)
- Redirect: `https://SUA-API.onrender.com/api/google/oauth/callback`

## Deploy — opção B: Vercel (front) + API worker (recomendado no médio prazo)

### 1) Frontend na Vercel

1. Importe o repo na Vercel (framework Vite; usa `vercel.json`)
2. Environment Variables (Production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_API_URL` = URL pública da API worker (Render ou Fly), **sem** barra final
3. Deploy → anote a URL (ex. `https://suiterecord.vercel.app`)

⚠️ Plano Hobby da Vercel é **não-comercial**. Uso corporativo → **Pro**.

### 2) API worker (Render ou Fly.io São Paulo)

A transcrição longa **não** cabe bem em serverless puro. Mantenha o Express:

- **Render:** `API_ONLY=true`, `FRONTEND_URL`/`CORS_ORIGINS` = URL da Vercel
- **Fly.io (gru):** `fly.toml` já aponta São Paulo; `fly launch` / `fly deploy`

Na API:
```
FRONTEND_URL=https://seu-app.vercel.app
CORS_ORIGINS=https://seu-app.vercel.app
GROQ_API_KEY=...
VITE_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
API_PUBLIC_URL=https://sua-api...
```

No Google Cloud, adicione a origem JS da Vercel e o redirect da API.

### 3) Supabase Auth URLs

Site URL + Redirect URLs = URL da Vercel (ou do static atual).

## Roadmap (próximas etapas — confirmar antes)

1. ✅ Schema + Auth + RLS no Supabase  
2. ✅ Front preparado para Vercel (`vercel.json`) + tabela `transcription_jobs`  
3. ⏳ Ligar a API aos jobs no Postgres (sair da fila só em memória)  
4. ⏳ Storage (áudio/fotos) no Supabase  
5. ⏳ (Opcional) Realtime no status do job  

## Segurança

- Login via **Supabase Auth**
- **RLS** no Postgres
- Senhas não ficam no client
- Migrations: `./scripts/apply-migrations.sh`
