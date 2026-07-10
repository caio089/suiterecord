# Suiter Record

Extensão corporativa do ecossistema Suiter: gravação, transcrição com IA, atas e Google Agenda.

## Local (monolítico)

1. `npm install`
2. Copie `.env.example` → `.env` e preencha (deixe `VITE_API_URL` vazio)
3. `npm run dev` → http://localhost:3000

## Deploy no Render (2 serviços)

| Serviço | Tipo | Função |
|---------|------|--------|
| `suiterecord-api` | Web Service (Node) | Transcrição, busca IA, export, OAuth Google |
| `suiterecord-web` | Static Site | Frontend React |

### Passo a passo

1. Push do repo no GitHub
2. Render → **New → Blueprint** → selecione o repo (`render.yaml`)
3. **API** — preencha:
   - `GROQ_API_KEY`
   - `FRONTEND_URL` / `APP_URL` / `CORS_ORIGINS` → URL do static (pode ajustar depois do 1º deploy)
   - `VITE_GOOGLE_CLIENT_ID`, `API_GOOGLE_CALENDAR_TOKEN`, `GOOGLE_CLIENT_SECRET`
4. Anote a URL da API (`https://suiterecord-api.onrender.com`)
5. **Static** — preencha:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_API_URL` → URL da API (sem barra no final)
6. Depois do deploy do static, volte na API e confirme `FRONTEND_URL` / `CORS_ORIGINS` com a URL real do static → **Manual Deploy** na API

### Google OAuth

No Google Cloud Console → OAuth Client (Web):

- **Origens JavaScript:** `https://suiterecord-web.onrender.com`
- **Redirect URIs:** `https://suiterecord-api.onrender.com/api/google/oauth/callback`

### Observações

- Vars `VITE_*` entram no bundle no **build** do static — se mudar, redeploy do web
- Plano Free: a API pode “dormir”; o 1º request demora ~30–50s
- Não commite o `.env`
