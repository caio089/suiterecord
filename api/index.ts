import app from "../src/server/app";

/**
 * Entrypoint da função serverless da Vercel. Todas as rotas /api/* e /health
 * (ver vercel.json) caem aqui — o próprio Express faz o roteamento interno.
 * Não chama app.listen: a Vercel invoca este handler por requisição.
 */
export default app;
