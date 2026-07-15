# Alfredo

> **Escuta. Entende. Organiza.**

Assistente de reuniões da Triforce Consultoria (extensão corporativa do ecossistema Suiter): gravação, transcrição com IA (Groq), atas, decisões, ações e Google Agenda.

## Local

1. `npm install`
2. Copie `.env.example` → `.env` (deixe `VITE_API_URL` vazio)
3. `npm run dev` → http://localhost:3000

## Conferência de UI (sem backend)

Para revisar a identidade visual sem Supabase/Groq/login:

```bash
npm install
npm run dev:preview   # http://localhost:3000
```

Entra autenticado como usuário de amostra, com uma reunião fictícia, e permite
navegar por todas as telas (Dashboard, Reuniões, Resumo Executivo, Backups,
Integração, Equipe, Nova Reunião). É só apresentação — nenhuma chamada real de
API/banco é feita.

- Windows (cmd/powershell): crie um arquivo `.env.local` com `VITE_PREVIEW=true`
  e rode `npm run dev`.
- O modo é ativado apenas pela flag `VITE_PREVIEW`; builds de produção
  (`npm run build`) **não** incluem esse código (é eliminado no bundle).

## Deploy na Vercel (1 projeto — front + API)

Front (Vite) e API (Express em `api/index.ts` → `src/server/app.ts`) sobem juntos no **mesmo domínio**. Não precisa de `VITE_API_URL`.

### Passo a passo

1. Aplique as migrations no Supabase:
   ```bash
   chmod +x scripts/apply-migrations.sh
   ./scripts/apply-migrations.sh
   ```
2. Push do repo no GitHub
3. Vercel → **Add New → Project** → importe o repo (`vercel.json` já configura build e rewrites)
4. **Environment Variables** (Production e Preview):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (mesma URL), `SUPABASE_SERVICE_ROLE_KEY` (sem `VITE_`)
   - `GROQ_API_KEY`
   - `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL` → URL de produção (ex.: `https://suiterecord.vercel.app`)
5. Deploy

### Google OAuth

No Google Cloud Console → OAuth Client (Web):

- **Origens JavaScript:** `https://SEU-APP.vercel.app`
- **Redirect URIs:** `https://SEU-APP.vercel.app/api/google/oauth/callback`

### Supabase Auth

- **Site URL** = URL da Vercel
- **Redirect URLs** = mesma URL (+ `http://localhost:3000` para dev)

### Timeout da função

`vercel.json` define `maxDuration: 60` segundos. Reuniões muito longas podem precisar de plano Pro com `maxDuration` maior (até 300s).

## Segurança

- Login via **Supabase Auth** (usuários pré-definidos)
- **RLS** no Postgres
- Migrations: `./scripts/apply-migrations.sh`
