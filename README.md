# Alfredo

> **Escuta. Entende. Organiza.**

Assistente de reuniões da Triforce Consultoria (extensão do ecossistema Suiter): gravação, transcrição com IA, atas, decisões, ações e Google Agenda.

## Local (monolítico)

1. `npm install`
2. Copie `.env.example` → `.env` e preencha (deixe `VITE_API_URL` vazio)
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

Front (Vite, estático) e API (função serverless em `api/index.ts`, que reexporta o
Express de `src/server/app.ts`) sobem juntos no mesmo projeto Vercel, no mesmo
domínio — não precisa de `VITE_API_URL` nem de CORS entre serviços.

### Passo a passo

1. Aplique a migration mais recente no Supabase (cria `transcription_jobs` e o
   bucket privado `audio-recordings` usados pela transcrição em background):
   ```bash
   chmod +x scripts/apply-migrations.sh
   ./scripts/apply-migrations.sh
   ```
2. Push do repo no GitHub
3. Vercel → **Add New → Project** → importe o repo (o `vercel.json` já define
   `buildCommand`/`outputDirectory`/rewrites/`maxDuration` — não precisa configurar
   framework manualmente)
4. Em **Environment Variables**, preencha (Production e Preview):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client)
   - `SUPABASE_URL` (mesma URL), `SUPABASE_SERVICE_ROLE_KEY` (server — nunca com
     prefixo `VITE_`, senão vaza pro bundle do front)
   - `GROQ_API_KEY`
   - `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL` → sua URL de produção (ex.: `https://suiterecord.vercel.app`),
     ajuste depois do 1º deploy se o domínio final for outro
5. Deploy. `VITE_API_URL` fica vazio — o front chama `/api/...` no próprio domínio.

**Timeout da função:** `vercel.json` define `maxDuration: 60` (funciona em Hobby e
Pro sem configuração extra). O Whisper da Groq é bem mais rápido que tempo real,
então 60s cobre a maioria das reuniões: mesmo áudios de 1–2h costumam transcrever em
segundos. Se aparecerem timeouts em reuniões muito longas, suba pra Pro com Fluid
Compute e aumente `maxDuration` (até 300s) no `vercel.json`.

### Google OAuth

No Google Cloud Console → OAuth Client (Web):

- **Origens JavaScript:** `https://SEU-APP.vercel.app`
- **Redirect URIs:** `https://SEU-APP.vercel.app/api/google/oauth/callback`

## Deploy alternativo (Render / Fly.io / Docker monolítico)

`server.ts` (raiz) ainda funciona como entrypoint tradicional (Express +
`app.listen`) pra quem preferir Render (`render.yaml`), Fly.io (`fly.toml`) ou um
container Docker único — usa o mesmo app de `src/server/app.ts` por baixo. Nesses
casos `VITE_API_URL` volta a ser necessário quando front e API estão em domínios
separados (ver `.env.example`).

## Segurança (multi-tenant)

- Login obrigatório via **Supabase Auth**
- **RLS** no Postgres: cada usuário só lê/grava as próprias reuniões e o próprio perfil
- Admin (`role = Administrador`) gerencia usuários, config Suiter e logs
- Senhas **não** ficam no client nem são listadas no painel
- Confirmação por e-mail **somente** na troca de senha (“Esqueci a senha”)

### Aplicar RLS no Supabase (obrigatório)

Já aplicado no projeto **Record** (`brzefsmeghkzzwrsvrlt`) em 2026-07-10.

Para reaplicar / outro ambiente:

```bash
chmod +x scripts/apply-migrations.sh
./scripts/apply-migrations.sh
```

### Auth sem confirmação no cadastro

No painel (token da API não tem permissão de Owner para alterar Auth):

Supabase → projeto **Record** → **Authentication → Providers → Email** → desative **Confirm email**.

Mantenha o e-mail ativo para **Reset password**.

**URL Configuration:**
- Site URL = URL de produção (Vercel), ou `http://localhost:3000` local
- Redirect URLs = mesma URL

Usuários já existentes foram confirmados no banco.

