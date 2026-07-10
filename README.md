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
- Site URL = URL do Static Site (Render) em produção, ou `http://localhost:3000` local
- Redirect URLs = mesma URL

Usuários já existentes foram confirmados no banco.

