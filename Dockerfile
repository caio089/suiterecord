# Suiter Record — container monolítico (API + static no mesmo processo).
# No Render preferimos 2 serviços (ver render.yaml). Este Dockerfile serve
# para Cloud Run / Fly / um único Web Service Docker.

FROM node:22-slim

WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_API_URL=$VITE_API_URL \
    NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build \
  && npm prune --omit=dev

EXPOSE 3000

# Monolítico: serve dist/ + API (sem API_ONLY)
CMD ["node", "dist/server.cjs"]
