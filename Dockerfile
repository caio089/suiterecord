# Suiter Record — container para Fly.io / Cloud Run / qualquer PaaS de container.
# App stateful (fila de jobs em memória + processamento longo), então roda como
# servidor persistente, não serverless.

FROM node:22-slim

WORKDIR /app

# Instala dependências primeiro (melhor cache de camadas)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o restante do código e gera o build (client Vite + server esbuild)
COPY . .
RUN npm run build

# Produção: o server serve os estáticos de dist/ e expõe as rotas /api/*
ENV NODE_ENV=production

# O PORT é injetado pela plataforma; localmente cai em 3000.
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
