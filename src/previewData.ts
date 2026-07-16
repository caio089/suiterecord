import type { Meeting } from "./types";

/**
 * Modo de conferência de UI (design review) — ativado com VITE_PREVIEW=true.
 *
 *   VITE_PREVIEW=true npm run dev
 *
 * Quando ligado: dispensa a checagem de Supabase, entra autenticado com um
 * usuário fictício e popula uma reunião de amostra, para navegar por todas as
 * telas sem backend. Como a flag é lida de import.meta.env em build, sem
 * VITE_PREVIEW o valor é `false` e todo este caminho é eliminado do bundle de
 * produção (dead-code elimination). NÃO usar em produção.
 */
export const PREVIEW_MODE: boolean =
  import.meta.env.VITE_PREVIEW === "true" ||
  import.meta.env.VITE_PREVIEW === "1";

export const PREVIEW_USER = {
  name: "Ana Martins",
  email: "ana@triforceconsultoria.com",
  role: "Administrador",
} as const;

export const PREVIEW_MEETINGS: Meeting[] = [
  {
    id: "mtg_preview",
    title: "Reunião de Produto — Roadmap Q3",
    date: "2026-07-14",
    duration: 2730,
    transcript:
      "Palestrante 1: Precisamos priorizar as integrações no Q3.\nPalestrante 2: Concordo, e o Modo Foco deve ser adiado para o Q4.\nPalestrante 1: Fechado. A equipe de Design valida os mockups até sexta.",
    overview:
      "Discussão sobre o roadmap do Q3, definição de prioridades de funcionalidades e alinhamento de responsabilidades entre as equipes de Produto, Design e Engenharia.",
    topics: [
      { topic: "Roadmap Q3", details: "Priorização de entregas do trimestre." },
      { topic: "Modo Foco", details: "Adiado para o Q4 por dependências." },
      { topic: "Integrações", details: "API do destino externo como prioridade." },
    ],
    decisions: [
      "Priorizar Modo Foco e Integrações no Q3",
      "Abrir notificações avançadas para o Q4",
      "Manter arquitetura atual da API",
    ],
    actions: [
      { action: "Validar mockups com usuário", assignee: "Design", priority: "Média", status: "pending" },
      { action: "Estimativa de API de integração", assignee: "Engenharia", priority: "Alta", status: "pending" },
      { action: "Enviar comunicação do roadmap", assignee: "Produto", priority: "Média", status: "completed" },
    ],
    tags: ["Produto", "Roadmap", "Q3"],
    participants: {
      membersTriforce: ["Ana Martins", "Carlos Nunes"],
      membersClient: ["Mariana Dias"],
    },
    createdBy: "ana@triforceconsultoria.com",
    hasAudio: true,
    audioSizeBytes: 4_200_000,
  },
];
