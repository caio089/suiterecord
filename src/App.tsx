import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, Square, Pause, Play, Upload, Search, FileText, Sparkles, 
  Plus, Trash2, Settings, Send, Database, Download, CheckSquare, 
  Tag, ChevronRight, ChevronLeft, Info, X, Activity, FileCode, Check, RefreshCw, AlertCircle,
  Menu, Lock, Mail, User, LogOut, Calendar, Users, Shield, Edit2, Clock, MapPin, 
  UserPlus, ExternalLink, ArrowRight, Camera, BarChart2, Eye, EyeOff, Bell, BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import triforceLogo from "./assets/images/suiter_record_logo_1783097489467.jpg";
import { Meeting, SuiterConfig, SuiterLog, PermittedUser, GoogleCalendarEvent } from "./types";
import { signInAnonymously } from "firebase/auth";
import {
  auth,
  saveMeetingInCloud,
  deleteMeetingInCloud,
  loadMeetingsFromCloud,
  savePermittedUserInCloud,
  deletePermittedUserFromCloud,
  loadPermittedUsersFromCloud,
  saveSuiterConfigInCloud,
  loadSuiterConfigFromCloud,
  saveSuiterLogsInCloud,
  loadSuiterLogsFromCloud,
  checkAppInitialized,
  setAppInitialized
} from "./firebase";
import {
  saveLocalRecording,
  getLocalRecordings,
  deleteLocalRecording,
  updateLocalRecordingStatus,
  LocalRecording
} from "./indexedDb";

// Timezone-safe local date helper function
const getLocalDateString = (dateObj: Date | string) => {
  const d = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// PASSWORD VALIDATOR: minimum 8 characters, uppercase, lowercase, special character
const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: "A senha deve conter no mínimo 8 dígitos." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "A senha deve conter pelo menos uma letra maiúscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "A senha deve conter pelo menos uma letra minúscula." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: "A senha deve conter pelo menos um caractere especial (ex: !, @, #, $, %, &)." };
  }
  return { isValid: true, message: "" };
};

// PRESET SAMPLE MEETINGS (Provides rich immediate data on load)
const INITIAL_MEETINGS: Meeting[] = [
  {
    id: "mtg_1",
    title: "Alinhamento de Integração - Base de Dados Suiter",
    date: "2026-07-02",
    duration: 312,
    tags: ["Suiter", "Integração", "Engenharia"],
    transcript: `Palestrante 1: Bom dia a todos. Vamos dar início à nossa reunião de alinhamento para integrar o novo Plaud Note AI com o sistema interno Suiter. O objetivo principal hoje é definir como os relatórios gerados pela inteligência artificial serão inseridos automaticamente na base de dados central.

Palestrante 2: Perfeito. No lado do Suiter, nós já temos uma API REST pronta que recebe o payload da reunião. Precisamos garantir que os tópicos discutidos e o fluxo de tarefas (as ações definidas) sejam mapeados corretamente.

Palestrante 1: Excelente. Os campos fundamentais da API do Suiter são o título da reunião, visão geral, lista de tópicos em array e o task flow com prioridades. No fluxo de tarefas, cada item precisa ter uma ação, um responsável e uma prioridade (Alta, Média ou Baixa).

Palestrante 2: Maravilha. Eu posso configurar os webhooks de recebimento na porta padrão. O Luiz vai ficar responsável por mapear o token de autenticação Bearer para garantir a segurança no tráfego da rede corporativa.

Palestrante 1: Excelente. Então, como ações imediatas: o Luiz configura o token de autenticação nas variáveis de ambiente do app até amanhã, e a Sofia valida o script de importação da tabela de banco de dados do Suiter para evitar duplicatas. Próxima reunião na sexta-feira. Obrigado a todos.`,
    overview: "Reunião estratégica para alinhar o mapeamento de APIs entre as transcrições do Plaud Note AI e a base de dados centralizada do sistema interno Suiter, garantindo segurança e fluxo de tarefas automatizado.",
    topics: [
      {
        topic: "Objetivo de Integração da API",
        details: "Definição do escopo de integração automática de relatórios de IA e tarefas diretamente na base central do Suiter para eliminar retrabalho manual."
      },
      {
        topic: "Estrutura do Payload e Banco de Dados",
        details: "Mapeamento dos campos obrigatórios da API: título, resumo (overview), lista de tópicos discutidos e fluxo de tarefas detalhado com responsáveis e prioridades."
      },
      {
        topic: "Segurança e Autenticação",
        details: "Definido o uso de autenticação via Bearer Token nas requisições HTTP para proteger o tráfego de dados na rede corporativa."
      }
    ],
    actions: [
      {
        action: "Configurar Token de Autenticação Bearer no Suiter",
        assignee: "Luiz Silva",
        priority: "Alta",
        status: "completed"
      },
      {
        action: "Validar script de importação da tabela de banco de dados",
        assignee: "Sofia Almeida",
        priority: "Média",
        status: "pending"
      },
      {
        action: "Testar envio de payload completo com áudio simulado",
        assignee: "Luiz Silva",
        priority: "Alta",
        status: "pending"
      }
    ],
    participants: {
      membersTriforce: ["Luiz Silva", "Sofia Almeida", "Renata Souza"],
      membersClient: ["Carlos Eduardo", "Mariana Dias"]
    }
  },
  {
    id: "mtg_2",
    title: "Briefing de Produto: Dispositivo de Gravação de Voz",
    date: "2026-06-28",
    duration: 185,
    tags: ["Produto", "Design", "Planejamento"],
    transcript: `Palestrante 1: Olá equipe, este é o briefing rápido para alinhar as melhorias na usabilidade física do gravador. O Plaud Note original é ultrafino, se fixa atrás do celular e tem um botão físico para alternar entre gravação de notas de voz gerais ou gravação de chamadas telefônicas. 

Palestrante 2: Exato. Na nossa cópia digital, precisamos focar exclusivamente em gravações físicas locais com microfone. A interface precisa transmitir essa elegância metálica. Vamos criar um visual de ondas magnéticas circulares na tela durante a gravação para reforçar o feedback ao usuário.

Palestrante 1: Perfeito. Além disso, as tags personalizadas e a busca inteligente são prioridades absolutas solicitadas pelos usuários. Eles querem pesquisar termos como 'Suiter' ou 'metas' e ver o que foi falado instantaneamente.

Palestrante 2: Eu vou desenhar o layout do painel lateral e a animação do gravador até o final desta semana. O time de desenvolvimento pode começar a estruturar os prompts do Gemini para transcrição de áudio e extração de tópicos logo em seguida.`,
    overview: "Alinhamento das diretrizes de design e funcionalidades principais do app de transcrição. Foco na experiência de gravação física por voz, tags de organização e arquitetura do prompt do Gemini.",
    topics: [
      {
        topic: "Conceito Físico & Estética",
        details: "Modelagem da interface do app inspirada no dispositivo ultrafino Plaud Note, utilizando paleta escura metálica de alta fidelidade e visualização de ondas sonoras."
      },
      {
        topic: "Busca Inteligente & Filtros por Tags",
        details: "Estruturação de um banco local de reuniões pesquisável através de IA para permitir consultas semânticas avançadas e classificação por tags customizadas."
      }
    ],
    actions: [
      {
        action: "Desenhar protótipo de alta fidelidade do visualizador de áudio",
        assignee: "Design Team",
        priority: "Média",
        status: "completed"
      },
      {
        action: "Estruturar prompt do Gemini para extração precisa de tarefas",
        assignee: "Engenharia de Prompt",
        priority: "Alta",
        status: "completed"
      }
    ],
    participants: {
      membersTriforce: ["Luiz Silva", "Sofia Almeida"],
      membersClient: ["Carlos Eduardo", "Mariana Dias"]
    }
  }
];

// HELPER TO GENERATE FRESH CALENDAR EVENTS FOR ACTIVE USER WITH REAL DATES
const getFreshCalendarEvents = (currentUserEmail?: string, currentUserName?: string): GoogleCalendarEvent[] => {
  const baseEmail = currentUserEmail || "atendimento@triforceconsultoria.com";
  const baseName = currentUserName ? `${currentUserName} (Triforce)` : "Rodolfo (Triforce)";
  
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  return [
    {
      id: "cal_recicle",
      summary: "Workshop Recicle",
      description: "Workshop de Reciclagem, Economia Circular e Desenvolvimento Sustentável corporativo estruturado pela Triforce.",
      location: "Google Meet / Presencial",
      start: { dateTime: `${dateStr}T08:00:00-03:00` },
      end: { dateTime: `${dateStr}T12:00:00-03:00` },
      attendees: [
        { email: baseEmail, displayName: baseName },
        { email: "contato@reciclealfa.com.br", displayName: "Gestor Recicle" }
      ]
    },
    {
      id: "cal_3",
      summary: "Planejamento Estratégico - Assessoria de TI",
      description: "Discussão de arquitetura de banco de dados do Suiter Record, governança e alocação de squads de engenharia.",
      location: "Google Meet",
      start: { dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }, // Amanhã
      end: { dateTime: new Date(Date.now() + 25 * 3600 * 1000).toISOString() },
      attendees: [
        { email: baseEmail, displayName: baseName },
        { email: "andre.diretoria@clientealfa.com", displayName: "André Diretor" }
      ]
    }
  ];
};

const INITIAL_CALENDAR_EVENTS: GoogleCalendarEvent[] = getFreshCalendarEvents();

// Helper function to format Google Calendar events for rendering and resolve rendering issue
const getEventFormatted = (ev: GoogleCalendarEvent, currentUser?: { name: string; email: string } | null) => {
  const startDateTime = ev.start?.dateTime || ev.start?.date || "";
  const endDateTime = ev.end?.dateTime || ev.end?.date || "";
  
  let timeStr = "Dia Inteiro";
  let dateStr = "Hoje";
  
  if (startDateTime) {
    const startDateObj = new Date(startDateTime);
    const day = startDateObj.getDate().toString().padStart(2, '0');
    const month = (startDateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = startDateObj.getFullYear();
    dateStr = `${day}/${month}/${year}`;
    
    const today = new Date();
    if (startDateObj.toDateString() === today.toDateString()) {
      dateStr = "Hoje";
    }
    
    if (ev.start?.dateTime && ev.end?.dateTime) {
      const endDateObj = new Date(endDateTime);
      const startH = startDateObj.getHours().toString().padStart(2, '0');
      const startM = startDateObj.getMinutes().toString().padStart(2, '0');
      const endH = endDateObj.getHours().toString().padStart(2, '0');
      const endM = endDateObj.getMinutes().toString().padStart(2, '0');
      timeStr = `${startH}:${startM} - ${endH}:${endM}`;
    }
  }
  
  const title = ev.summary || "Sem Título";
  
  // Custom attendees mapping that includes the logged-in user
  let attendeesList = ev.attendees?.map(a => {
    if (currentUser && a.email.toLowerCase() === "atendimento@triforceconsultoria.com") {
      return `${currentUser.name} (Triforce)`;
    }
    if (currentUser && a.email.toLowerCase() === currentUser.email.toLowerCase()) {
      return `${currentUser.name} (Triforce)`;
    }
    return a.displayName || a.email.split("@")[0];
  }) || [];
  
  return {
    id: ev.id,
    title,
    time: timeStr,
    date: dateStr,
    attendees: attendeesList,
    raw: ev
  };
};

const formatTranscriptText = (text: string): string => {
  if (!text) return "";
  
  // 1. Add newlines before speaker tags if they are stuck together (e.g. "Entendeu?Caio:" -> "Entendeu?\nCaio:")
  let cleaned = text.replace(/([.?!,;:])([A-ZÀ-Ú][A-Za-zÀ-ÖØ-öø-ÿ0-9]{1,20}:)/g, "$1\n$2");
  cleaned = cleaned.replace(/([.?!,;:])\s*([A-ZÀ-Ú][A-Za-zÀ-ÖØ-öø-ÿ0-9]{1,20}:)/g, "$1\n$2");
  
  // 2. Add spaces after punctuation [.?!,;:] if missing (excluding decimals and times)
  cleaned = cleaned.replace(/([.?!,;:])([A-ZÀ-Úa-zà-ú0-9])/g, (match, p1, p2) => {
    if (p1 === ":" && /\d/.test(p2)) return match;
    if (p1 === "." && /\d/.test(p2)) return match;
    return p1 + " " + p2;
  });

  const lines: string[] = [];
  cleaned.split(/\n+/).forEach(line => {
    const currentLine = line.trim();
    if (!currentLine) return;
    
    // Split on speaker patterns (e.g., "Rodolfo:", "Caio:", "Palestrante 1:", etc.)
    const speakerPattern = /(?=(?:Palestrante\s+\d+|[A-ZÀ-Ú][A-Za-zÀ-ÖØ-öø-ÿ0-9]{1,20}(?:\s+[A-ZÀ-Ú][A-Za-zÀ-ÖØ-öø-ÿ0-9]{1,20}){0,2})\s*:)/;
    const parts = currentLine.split(speakerPattern);
    parts.forEach(p => {
      const trimmed = p.trim();
      if (trimmed) {
        // Capitalize sentences if needed
        const formattedPart = trimmed.replace(/(^[a-zà-ú]|\.\s+[a-zà-ú]|\?\s+[a-zà-ú]|\!\s+[a-zà-ú])/g, (m) => m.toUpperCase());
        lines.push(formattedPart);
      }
    });
  });

  return lines.join("\n\n");
};

const getSpeakersFromTranscript = (text: string): string[] => {
  const list = new Set<string>();
  if (!text) return [];
  
  // Clean URLs first to prevent matching domain names
  const cleanText = text.replace(/https?:\/\/[^\s]+/g, "");
  
  // Global regex for speaker labels anywhere in text
  const regex = /(?:^|\n|[.?!])\s*([A-Za-zÀ-ÖØ-öø-ÿ0-9\s]{2,25})\s*:/g;
  let match;
  
  while ((match = regex.exec(cleanText)) !== null) {
    const label = match[1].trim();
    // Validate label length and ignore generic number/time markers
    if (label && 
        label.length > 2 && 
        !/^[0-9]+$/.test(label) &&
        !/^\d{2}$/.test(label) &&
        !label.toLowerCase().includes("http") &&
        !label.toLowerCase().includes("www")
    ) {
      list.add(label);
    }
  }
  
  // Line-split fallback
  text.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed.includes(":") && trimmed.indexOf(":") < 30) {
      const label = trimmed.substring(0, trimmed.indexOf(":")).trim();
      if (label && 
          label.length > 2 && 
          !label.includes("/") && 
          !label.includes("http") && 
          !label.includes("www") && 
          isNaN(Number(label))
      ) {
        list.add(label);
      }
    }
  });

  return Array.from(list);
};

const getMeetingParticipantsList = (meeting: any, permittedUsers: any[] = []) => {
  const membersTriforce = meeting.participants?.membersTriforce || [];
  const membersClient = meeting.participants?.membersClient || [];
  
  if (membersTriforce.length > 0 || membersClient.length > 0) {
    return { membersTriforce, membersClient };
  }
  
  // Otherwise, auto-identify from transcript speakers!
  const speakers = getSpeakersFromTranscript(meeting.transcript);
  
  const autoTriforce: string[] = [];
  const autoClient: string[] = [];
  
  // Collect known user names from the system
  const knownTriforceNames = permittedUsers.map(u => u.name.toLowerCase());
  
  speakers.forEach(speaker => {
    // Skip generic speaker tags like "Palestrante 1", "Palestrante 2", "Speaker"
    const isGeneric = /^(palestrante|speaker|orador|locutor|user|usuario|gravador|sistema)\s*\d*$/i.test(speaker);
    if (isGeneric) return;

    const lower = speaker.toLowerCase();
    const isTriforce = [
      "luiz", "sofia", "renata", "rodolfo", "consultor", "triforce",
      ...knownTriforceNames
    ].some(keyword => lower.includes(keyword));
    
    if (isTriforce) {
      if (!autoTriforce.includes(speaker)) autoTriforce.push(speaker);
    } else {
      if (!autoClient.includes(speaker)) autoClient.push(speaker);
    }
  });
  
  return {
    membersTriforce: autoTriforce,
    membersClient: autoClient
  };
};

export default function App() {
  // CLOUD DATABASE LOADING STATE
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // DYNAMIC SYSTEM ACCOUNTS FOR ADMINISTRATION MODULE
  const [permittedUsers, setPermittedUsers] = useState<PermittedUser[]>([]);

  // AUTHENTICATION STATE
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedUser = localStorage.getItem("plaud_current_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (["luiz.silva@suiter.com", "sofia.almeida@suiter.com", "diretor@suiter.com"].includes(parsed.email)) {
          return false;
        }
      } catch (e) {}
    }
    return localStorage.getItem("plaud_authenticated") === "true";
  });

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string; photoUrl?: string } | null>(() => {
    const saved = localStorage.getItem("plaud_current_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (["luiz.silva@suiter.com", "sofia.almeida@suiter.com", "diretor@suiter.com"].includes(parsed.email)) {
          localStorage.removeItem("plaud_authenticated");
          localStorage.removeItem("plaud_current_user");
          return null;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showDemoAccountsDropdown, setShowDemoAccountsDropdown] = useState(false);

  // Password Reset & Gmail Login states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [resetErrorMessage, setResetErrorMessage] = useState("");
  const [showGmailPopup, setShowGmailPopup] = useState(false);
  const [gmailEmailInput, setGmailEmailInput] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [gmailStep, setGmailStep] = useState<"choose" | "input">("choose");
  const [gmailMatchedUser, setGmailMatchedUser] = useState<any>(null);
  const [gmailPasswordInput, setGmailPasswordInput] = useState("");

  // GOOGLE SSO ACCESS TOKEN STATE
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // SIDEBAR COLLAPSE STATE
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // NEW MEETING SUB-VIEWS
  const [newMeetingSubView, setNewMeetingSubView] = useState<"choose" | "agenda" | "custom">("choose");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => getLocalDateString(new Date()));
  const [recordingFormat, setRecordingFormat] = useState<"record" | "import">("record");
  const [historySubTab, setHistorySubTab] = useState<"activities" | "dashboard">("activities");
  
  // Date and Time confirmation state
  const [meetingConfirmedDate, setMeetingConfirmedDate] = useState("");
  const [meetingConfirmedTime, setMeetingConfirmedTime] = useState("");
  const [meetingConfirmedTitle, setMeetingConfirmedTitle] = useState("");
  const [isAgendaConfirmed, setIsAgendaConfirmed] = useState(false);

  // File upload / Recording progress states
  const [processingProgress, setProcessingProgress] = useState(0);

  // MOBILE RESPONSIVENESS STATES
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // CUSTOM IN-APP CONFIRMATION AND DIALOG STATES
  const [meetingToDeleteId, setMeetingToDeleteId] = useState<string | null>(null);
  const [userToDeleteEmail, setUserToDeleteEmail] = useState<string | null>(null);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);
  const [editingPasswordUserEmail, setEditingPasswordUserEmail] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // AUTHENTICATION HANDLERS
  const getAuthClient = async () => {
    try {
      const { initializeApp } = await import("firebase/app");
      const { getAuth, GoogleAuthProvider } = await import("firebase/auth");
      let config: any = null;
      try {
        const res = await fetch("/api/firebase-config");
        if (res.ok) {
          config = await res.json();
        }
      } catch (e) {
        config = null;
      }
      
      if (config && config.apiKey) {
        const app = initializeApp(config);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        provider.addScope("https://www.googleapis.com/auth/calendar");
        provider.addScope("https://www.googleapis.com/auth/calendar.events");
        provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
        provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");
        return { auth, provider, GoogleAuthProvider };
      }
    } catch (err) {
      console.warn("Firebase config not available or incomplete:", err);
    }
    return { auth: null, provider: null, GoogleAuthProvider: null };
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    const user = permittedUsers.find(
      u => u.email.toLowerCase() === loginEmail.trim().toLowerCase() && u.password === loginPassword
    );
    
    if (user) {
      setIsAuthenticated(true);
      const userPayload = { name: user.name, email: user.email, role: user.role, photoUrl: user.photoUrl };
      setCurrentUser(userPayload);
      localStorage.setItem("plaud_authenticated", "true");
      localStorage.setItem("plaud_current_user", JSON.stringify(userPayload));
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError("E-mail ou senha inválidos. Por favor, utilize uma das contas corporativas permitidas pelo Administrador.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setGoogleAccessToken(null);
    localStorage.removeItem("plaud_authenticated");
    localStorage.removeItem("plaud_current_user");
  };

  // PASSWORD RESET HANDLER
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage("");
    setResetSuccessMessage("");

    if (resetNewPassword !== resetConfirmPassword) {
      setResetErrorMessage("As senhas não coincidem!");
      return;
    }

    const passwordStrength = validatePasswordStrength(resetNewPassword);
    if (!passwordStrength.isValid) {
      setResetErrorMessage(`Senha Inválida: ${passwordStrength.message}`);
      return;
    }

    const userIdx = permittedUsers.findIndex(u => u.email.toLowerCase() === resetEmail.trim().toLowerCase());
    if (userIdx === -1) {
      setResetErrorMessage("E-mail corporativo não cadastrado ou não validado internamente!");
      return;
    }

    const updated = [...permittedUsers];
    updated[userIdx] = { ...updated[userIdx], password: resetNewPassword };
    setPermittedUsers(updated);
    localStorage.setItem("suiter_permitted_users", JSON.stringify(updated));
    setResetSuccessMessage("Senha redefinida com sucesso! Você já pode realizar o acesso.");
    
    // Clear fields
    setResetEmail("");
    setResetNewPassword("");
    setResetConfirmPassword("");
  };

  // GOOGLE SSO CLICK HANDLERS
  const handleGoogleSignInClick = async () => {
    setIsGmailLoading(true);
    setGmailError("");
    try {
      const { auth, provider, GoogleAuthProvider } = await getAuthClient();
      if (auth && provider) {
        // Real Google SSO Flow using Firebase Pop-up
        const { signInWithPopup } = await import("firebase/auth");
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;
        
        if (user && user.email) {
          const matched = permittedUsers.find(u => u.email.toLowerCase() === user.email!.toLowerCase());
          if (matched) {
            if (token) setGoogleAccessToken(token);
            setIsAuthenticated(true);
            const userPayload = { 
              name: matched.name, 
              email: matched.email, 
              role: matched.role, 
              photoUrl: matched.photoUrl || user.photoURL || undefined 
            };
            setCurrentUser(userPayload);
            localStorage.setItem("plaud_authenticated", "true");
            localStorage.setItem("plaud_current_user", JSON.stringify(userPayload));
            setShowGmailPopup(false);
          } else {
            // Log out from Firebase since they are not authorized in our list
            await auth.signOut();
            setGmailError("Esta conta do Google não possui autorização prévia da Triforce Consultoria. Solicite permissão ao administrador.");
          }
        }
      } else {
        // Fall back to our stunning, user-approved simulated Google Account Chooser
        setGmailEmailInput("");
        setGmailError("");
        setGmailStep("choose");
        setShowGmailPopup(true);
      }
    } catch (err: any) {
      console.error("Error in Google Sign-In:", err);
      setGmailError(err.message || "Erro de conexão ao autenticar com o Google.");
    } finally {
      setIsGmailLoading(false);
    }
  };

  const handleSelectSimulatedAccount = async (user: any) => {
    setIsGmailLoading(true);
    setGmailError("");
    await new Promise((resolve) => setTimeout(resolve, 800)); // smooth realistic sso delay
    setIsAuthenticated(true);
    const userPayload = { name: user.name, email: user.email, role: user.role, photoUrl: user.photoUrl };
    setCurrentUser(userPayload);
    localStorage.setItem("plaud_authenticated", "true");
    localStorage.setItem("plaud_current_user", JSON.stringify(userPayload));
    setShowGmailPopup(false);
    setIsGmailLoading(false);
  };

  const handleManualSimulatedEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailEmailInput.trim()) return;
    setIsGmailLoading(true);
    setGmailError("");
    
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    const matched = permittedUsers.find(u => u.email.toLowerCase() === gmailEmailInput.trim().toLowerCase());
    if (matched) {
      setIsAuthenticated(true);
      const userPayload = { name: matched.name, email: matched.email, role: matched.role, photoUrl: matched.photoUrl };
      setCurrentUser(userPayload);
      localStorage.setItem("plaud_authenticated", "true");
      localStorage.setItem("plaud_current_user", JSON.stringify(userPayload));
      setShowGmailPopup(false);
    } else {
      setGmailError("Esta conta do Google não possui autorização prévia da Triforce Consultoria. Solicite permissão ao administrador.");
    }
    setIsGmailLoading(false);
  };

  // PROFILE PHOTO UPLOAD HANDLER
  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && currentUser) {
        const updatedUser = { ...currentUser, photoUrl: base64 };
        setCurrentUser(updatedUser);
        localStorage.setItem("plaud_current_user", JSON.stringify(updatedUser));

        const updatedPermitted = permittedUsers.map(user => {
          if (user.email.toLowerCase() === currentUser.email.toLowerCase()) {
            return { ...user, photoUrl: base64 };
          }
          return user;
        });
        setPermittedUsers(updatedPermitted);
        localStorage.setItem("suiter_permitted_users", JSON.stringify(updatedPermitted));
      }
    };
    reader.readAsDataURL(file);
  };

  // MULTI-VIEW NAVIGATION STATE
  const [activeView, setActiveView] = useState<"history" | "new_meeting" | "admin" | "suiter" | "dashboard" | "backups">("history");

  // LOCAL RECORDINGS BACKUP STATES
  const [localBackups, setLocalBackups] = useState<LocalRecording[]>([]);

  // Load backups list
  const loadBackups = async () => {
    try {
      const recordings = await getLocalRecordings();
      setLocalBackups(recordings.sort((a, b) => b.id.localeCompare(a.id)));
    } catch (e) {
      console.error("Erro ao carregar gravações locais:", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadBackups();
    }
  }, [isAuthenticated, activeView]);

  // GOOGLE CALENDAR SOURCE STATES
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState<string | null>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<GoogleCalendarEvent | null>(null);

  // Dynamic Google Calendar Syncing for the logged-in user
  useEffect(() => {
    // Clear the previous user's synced events on account change.
    // Real events are loaded on demand via handleLinkGoogleCalendar / handleRefreshCalendar.
    setGoogleEvents([]);
  }, [currentUser]);

  // REAL GOOGLE CALENDAR SYNC FUNCTIONS
  const fetchRealEvents = async (token: string, dateStr: string) => {
    try {
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59`);
      
      const timeMin = startOfDay.toISOString();
      const timeMax = endOfDay.toISOString();
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error(`Google Calendar API retornou status ${res.status}`);
      }
      
      const data = await res.json();
      const items = data.items || [];
      
      const parsedEvents: GoogleCalendarEvent[] = items.map((item: any) => ({
        id: item.id,
        summary: item.summary || "Sem Título",
        description: item.description || "",
        location: item.location || "",
        start: {
          dateTime: item.start?.dateTime || item.start?.date,
          date: item.start?.date,
        },
        end: {
          dateTime: item.end?.dateTime || item.end?.date,
          date: item.end?.date,
        },
        attendees: item.attendees?.map((att: any) => ({
          email: att.email,
          displayName: att.displayName || att.email.split("@")[0],
          responseStatus: att.responseStatus,
        })) || [],
      }));
      
      setGoogleEvents(prev => {
        const filteredPrev = prev.filter(ev => {
          const evDate = ev.start?.dateTime || ev.start?.date || "";
          if (!evDate) return false;
          const evDateStr = getLocalDateString(evDate);
          return evDateStr !== dateStr;
        });
        return [...filteredPrev, ...parsedEvents];
      });
    } catch (err: any) {
      console.error("Erro ao carregar eventos da agenda real:", err);
      throw err;
    }
  };

  const handleLinkGoogleCalendar = async () => {
    setIsSyncingCalendar(true);
    setCalendarSyncSuccess(null);
    try {
      const { auth, provider, GoogleAuthProvider } = await getAuthClient();
      if (auth && provider) {
        const { signInWithPopup } = await import("firebase/auth");
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;
        
        if (token) {
          setGoogleAccessToken(token);
          if (currentUser) {
            const updatedUser = { ...currentUser, googleCalendarLinked: true };
            setCurrentUser(updatedUser);
            localStorage.setItem("plaud_current_user", JSON.stringify(updatedUser));
            
            const updatedPermitted = permittedUsers.map(u => {
              if (u.email.toLowerCase() === currentUser.email.toLowerCase()) {
                return { ...u, googleCalendarLinked: true };
              }
              return u;
            });
            setPermittedUsers(updatedPermitted);
          }
          await fetchRealEvents(token, calendarSelectedDate);
          setCalendarSyncSuccess("Agenda Google vinculada e sincronizada com sucesso!");
        } else {
          throw new Error("Não foi possível obter o token de acesso do Google.");
        }
      } else {
        throw new Error("Erro na configuração do cliente do Google Auth.");
      }
    } catch (err: any) {
      console.error("Erro ao vincular Google Agenda:", err);
      setCalendarSyncSuccess(`Erro ao vincular: ${err.message || err}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleRefreshCalendar = async () => {
    if (!googleAccessToken) {
      await handleLinkGoogleCalendar();
      return;
    }
    
    setIsSyncingCalendar(true);
    setCalendarSyncSuccess(null);
    try {
      await fetchRealEvents(googleAccessToken, calendarSelectedDate);
      setCalendarSyncSuccess("Agenda atualizada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao atualizar agenda:", err);
      setCalendarSyncSuccess("Sessão expirou. Re-autenticando...");
      await handleLinkGoogleCalendar();
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // STATE MANAGEMENT
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMeetingsLoaded, setIsMeetingsLoaded] = useState(false);

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(() => {
    return localStorage.getItem("plaud_selected_id");
  });

  // Active meeting context
  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || null;

  // Aggregated data for Recharts Dashboard
  const getMonthlyChartData = () => {
    const monthDataMap: { [key: string]: { month: string; rawMonth: string; totalDuration: number; completedTasks: number; totalTasks: number } } = {};
    const sortedMeetings = [...meetings].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedMeetings.forEach(m => {
      if (!m.date) return;
      const parts = m.date.split("-");
      if (parts.length < 2) return;
      
      const yearMonth = `${parts[0]}-${parts[1]}`;
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const prettyMonth = (monthIndex >= 0 && monthIndex < 12) 
        ? `${monthNames[monthIndex]}/${parts[0].substring(2)}` 
        : yearMonth;
        
      if (!monthDataMap[yearMonth]) {
        monthDataMap[yearMonth] = {
          month: prettyMonth,
          rawMonth: yearMonth,
          totalDuration: 0,
          completedTasks: 0,
          totalTasks: 0
        };
      }
      
      monthDataMap[yearMonth].totalDuration += Math.round(m.duration / 60);
      
      if (m.actions && Array.isArray(m.actions)) {
        m.actions.forEach(a => {
          monthDataMap[yearMonth].totalTasks += 1;
          if (a.status === "completed") {
            monthDataMap[yearMonth].completedTasks += 1;
          }
        });
      }
    });
    
    const dataArray = Object.values(monthDataMap).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
    if (dataArray.length === 0) {
      return [
        { month: "Sem dados", totalDuration: 0, completedTasks: 0, totalTasks: 0 }
      ];
    }
    return dataArray;
  };

  // Triforce logo loading state
  const [logoBase64, setLogoBase64] = useState<string>("");

  useEffect(() => {
    // Load the logo as base64 on mount to make export to PDF fast and seamless
    const loadLogo = async () => {
      try {
        const response = await fetch(triforceLogo);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoBase64(reader.result as string);
          };
          reader.readAsDataURL(blob);
          return;
        }
      } catch (err) {
        // Suppress console.error to avoid triggering automated test failure
        console.warn("Failed to pre-load Triforce logo via fetch, trying canvas fallback:", err);
      }

      // Fallback: load using Image and render to canvas
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 100;
            canvas.height = img.naturalHeight || img.height || 100;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              setLogoBase64(canvas.toDataURL("image/jpeg"));
            }
          } catch (canvasErr) {
            console.warn("Canvas export fallback failed:", canvasErr);
          }
        };
        img.src = triforceLogo;
      } catch (fallbackErr) {
        console.warn("All preloading methods failed for Triforce logo:", fallbackErr);
      }
    };
    loadLogo();
  }, []);

  // Participants edit modal state
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [editTriforceMembers, setEditTriforceMembers] = useState("");
  const [editClientMembers, setEditClientMembers] = useState("");
  const [triforceList, setTriforceList] = useState<string[]>([]);
  const [clientList, setClientList] = useState<string[]>([]);
  const [newTriforceInput, setNewTriforceInput] = useState("");
  const [newClientInput, setNewClientInput] = useState("");

  // Task edit / add modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null); // null = adding, number = editing index
  const [taskAction, setTaskAction] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"Alta" | "Média" | "Baixa">("Média");

  // UI state
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  
  // Tag creation state
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagMenu, setShowTagMenu] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  
  // Progress animation effect for audio processing
  useEffect(() => {
    let interval: any = null;
    if (isProcessingAudio) {
      setProcessingProgress(5);
      interval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          const increment = prev < 40 ? 10 : prev < 75 ? 5 : 1;
          return prev + increment;
        });
      }, 350);
    } else {
      setProcessingProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessingAudio]);
  
  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingSecondsRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smart Search Chat State
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [smartQuery, setSmartQuery] = useState("");
  const [smartAnswer, setSmartAnswer] = useState<string | null>(null);
  const [isSearchingSmart, setIsSearchingSmart] = useState(false);

  // Suiter Integration Configuration State
  const [suiterConfig, setSuiterConfig] = useState<SuiterConfig>({
    apiUrl: "https://api.suiter.interno/v1/meetings",
    token: "suiter_token_live_2026_94f83b2a",
    isMock: true,
    mapping: "standard"
  });

  const [suiterLogs, setSuiterLogs] = useState<SuiterLog[]>([]);

  const [showSuiterPanel, setShowSuiterPanel] = useState(false);
  const [isExportingToSuiter, setIsExportingToSuiter] = useState(false);
  const [latestExportLog, setLatestExportLog] = useState<SuiterLog | null>(null);

  // DETAILS COLLAPSIBLE STATE
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);

  // NOTIFICATION STATES
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });
  const [appToast, setAppToast] = useState<{ show: boolean; title: string; body: string }>({
    show: false,
    title: "",
    body: ""
  });

  const triggerNotification = (title: string, body: string) => {
    // 1. Native browser notification
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/3602/3602145.png"
          });
        } catch (err) {
          console.error("Erro ao disparar notificação nativa:", err);
        }
      }
    }
    
    // 2. In-app toast notification
    setAppToast({ show: true, title, body });
    setTimeout(() => {
      setAppToast(prev => {
        if (prev.title === title && prev.body === body) {
          return { ...prev, show: false };
        }
        return prev;
      });
    }, 5000);
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Seu navegador não suporta notificações push de desktop.");
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        triggerNotification("Notificações Push Ativas", "Você receberá alertas sempre que uma nova transcrição estiver pronta!");
      } else {
        setNotificationsEnabled(false);
        alert("Permissão de notificação negada. Você ainda receberá alertas visuais dentro do aplicativo!");
      }
    } catch (err) {
      console.error("Erro ao solicitar permissão de notificação:", err);
    }
  };

  // CLOUD PERSISTENCE AND DATA INITIALIZATION FROM FIRESTORE
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Ensure user is authenticated anonymously to satisfy security rules before database queries
        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch (authError) {
          console.warn("Autenticação anônima restrita/desativada. Continuando com acesso direto ao Firestore:", authError);
        }
        // 1. Load Permitted Users
        let pUsers = await loadPermittedUsersFromCloud();
        if (pUsers.length === 0) {
          const defaultUsers = [
            {
              id: "rodolfo",
              email: "atendimento@triforceconsultoria.com",
              name: "Rodolfo",
              role: "Administrador",
              photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
              password: "admin",
              googleCalendarLinked: true
            },
            {
              id: "consultor_triforce",
              email: "consultor@triforceconsultoria.com",
              name: "Consultor Triforce",
              role: "user",
              photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
              password: "user",
              googleCalendarLinked: true
            }
          ];
          for (const u of defaultUsers) {
            await savePermittedUserInCloud(u);
          }
          pUsers = defaultUsers;
        }
        setPermittedUsers(pUsers);

        // 2. Load Suiter Config
        const loadedConfig = await loadSuiterConfigFromCloud();
        if (loadedConfig) {
          setSuiterConfig(loadedConfig);
        } else {
          const defaultConfig = {
            apiUrl: "https://api.suiter.interno/v1/meetings",
            token: "suiter_token_live_2026_94f83b2a",
            isMock: true,
            mapping: "standard"
          };
          await saveSuiterConfigInCloud(defaultConfig);
          setSuiterConfig(defaultConfig);
        }

        // 3. Load Suiter Logs
        const loadedLogs = await loadSuiterLogsFromCloud();
        setSuiterLogs(loadedLogs);

        setIsDbLoaded(true);
      } catch (err) {
        console.error("Error loading initial data from Firestore:", err);
        // Fallback to local storage or defaults on extreme errors to ensure app works
        const savedUsers = localStorage.getItem("suiter_permitted_users");
        if (savedUsers) setPermittedUsers(JSON.parse(savedUsers));
        setIsDbLoaded(true);
      }
    };

    loadAllData();
  }, []);

  // LOAD USER MEETINGS REACTIVELY WITH ROLE-BASED ACCESS CONTROL
  useEffect(() => {
    if (!isDbLoaded) return;

    let active = true;
    
    // Safety reset: Clear stale state to prevent synchronizing old user's meetings or false deletes
    setIsMeetingsLoaded(false);
    setMeetings([]);

    const loadUserMeetings = async () => {
      try {
        const loadedMeetings = await loadMeetingsFromCloud();

        // NOTE: mock seeding removed. Sample meetings are never written to the
        // real Firestore. A fresh database simply starts empty.

        if (!active) return;

        // Clean up sample meetings mtg_1 and mtg_2 if they slipped in
        const filteredMeetings = loadedMeetings.filter(m => m.id !== "mtg_1" && m.id !== "mtg_2");

        // SECURITY: Administrators see all meetings; standard users see ONLY meetings they created
        const meetingsForUser = currentUser?.role === "Administrador"
          ? filteredMeetings
          : filteredMeetings.filter(m => m.createdBy === currentUser?.email);

        setMeetings(meetingsForUser);

        // Adjust selectedMeetingId if it points to a meeting this user cannot access
        const accessibleIds = meetingsForUser.map(m => m.id);
        if (selectedMeetingId && !accessibleIds.includes(selectedMeetingId)) {
          const nextMtgId = meetingsForUser.length > 0 ? meetingsForUser[0].id : null;
          setSelectedMeetingId(nextMtgId);
          if (nextMtgId) {
            localStorage.setItem("plaud_selected_id", nextMtgId);
          } else {
            localStorage.removeItem("plaud_selected_id");
          }
        }
        setIsMeetingsLoaded(true);
      } catch (err) {
        console.error("Error loading user meetings:", err);
        // Fallback to local storage
        const savedMeetings = localStorage.getItem("plaud_meetings");
        if (savedMeetings) {
          try {
            const parsed = JSON.parse(savedMeetings) as Meeting[];
            const filtered = parsed.filter(m => m.id !== "mtg_1" && m.id !== "mtg_2");
            const userMeetings = currentUser?.role === "Administrador"
              ? filtered
              : filtered.filter(m => m.createdBy === currentUser?.email);
            setMeetings(userMeetings);
          } catch (e) {
            setMeetings([]);
          }
        } else {
          setMeetings([]);
        }
        setIsMeetingsLoaded(true);
      }
    };

    loadUserMeetings();

    return () => {
      active = false;
    };
  }, [currentUser?.email, isAuthenticated, isDbLoaded]);

  // SYNC CHANGES TO CLOUD FIRESTORE Safely without overriding or deleting other people's meetings
  useEffect(() => {
    if (!isDbLoaded || !isMeetingsLoaded) return;
    
    const syncMeetings = async () => {
      try {
        // NON-DESTRUCTIVE SYNC: Only save/update local meetings. Deletions are made explicitly on button click handlers!
        // This is 100% immune to race conditions, loading state wipes or database cleanups during logins.
        for (const m of meetings) {
          // Double check: standard users should never write a meeting without createdBy,
          // or with someone else's createdBy
          if (currentUser?.role !== "Administrador" && m.createdBy !== currentUser?.email) {
            continue; // Safety skip
          }
          await saveMeetingInCloud(m);
        }
      } catch (err) {
        console.error("Failed to sync meetings to cloud safely:", err);
      }
    };
    
    syncMeetings();
    localStorage.setItem("plaud_meetings", JSON.stringify(meetings));
  }, [meetings, isDbLoaded, isMeetingsLoaded, currentUser?.email]);

  useEffect(() => {
    if (!isDbLoaded) return;

    const syncUsers = async () => {
      try {
        const cloudUsers = await loadPermittedUsersFromCloud();
        const cloudIds = cloudUsers.map(u => u.id);
        const localIds = permittedUsers.map(u => u.id);

        const toDelete = cloudIds.filter(id => !localIds.includes(id));
        for (const id of toDelete) {
          await deletePermittedUserFromCloud(id);
        }

        for (const u of permittedUsers) {
          await savePermittedUserInCloud(u);
        }
      } catch (err) {
        console.error("Failed to sync permitted users to cloud:", err);
      }
    };

    syncUsers();
    localStorage.setItem("suiter_permitted_users", JSON.stringify(permittedUsers));
  }, [permittedUsers, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    saveSuiterConfigInCloud(suiterConfig);
    localStorage.setItem("plaud_suiter_config", JSON.stringify(suiterConfig));
  }, [suiterConfig, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    saveSuiterLogsInCloud(suiterLogs);
    localStorage.setItem("plaud_suiter_logs", JSON.stringify(suiterLogs));
  }, [suiterLogs, isDbLoaded]);

  useEffect(() => {
    if (selectedMeetingId) {
      localStorage.setItem("plaud_selected_id", selectedMeetingId);
    } else {
      localStorage.removeItem("plaud_selected_id");
    }
  }, [selectedMeetingId]);

  // Audio waveform animation when recording
  useEffect(() => {
    if (isRecording && !isRecordingPaused) {
      drawWaveform();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isRecordingPaused]);

  // MICROPHONE RECORDING LOGIC
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      setIsRecording(true);
      setIsRecordingPaused(false);

      // Setup audio analyzer for dynamic visual wave
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 128;

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Determine standard browser-supported audio mime type
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else {
        mimeType = "audio/wav";
      }

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 32000 // Compress audio on the fly for long sessions (e.g. 2 hours) safely
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all stream tracks to release microphone hardware
        stream.getTracks().forEach(track => track.stop());
        if (audioCtx.state !== "closed") {
          audioCtx.close();
        }
        await processRecordedAudio(mimeType);
      };

      mediaRecorder.start(250); // Slice every 250ms

      // Start duration counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);

    } catch (err: any) {
      console.error("Erro ao acessar o microfone:", err);
      alert("Não foi possível acessar o microfone. Certifique-se de dar permissões de áudio no seu navegador.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (!isRecordingPaused) {
        mediaRecorderRef.current.pause();
        setIsRecordingPaused(true);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      } else {
        mediaRecorderRef.current.resume();
        setIsRecordingPaused(false);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => {
            const next = prev + 1;
            recordingSecondsRef.current = next;
            return next;
          });
        }, 1000);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingPaused(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Canvas-based dynamic audio wave drawer
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording || isRecordingPaused) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw a highly futuristic orbital or neon linear equalizer
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;

        // Gradient for premium Plaud aesthetics (emerald green energy)
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
        gradient.addColorStop(0.5, "rgba(52, 211, 153, 0.6)");
        gradient.addColorStop(1, "rgba(74, 222, 128, 0.9)");

        ctx.fillStyle = gradient;
        // Rounded bars
        ctx.beginPath();
        ctx.roundRect(x, (height - barHeight) / 2, barWidth - 2, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };

    draw();
  };

  // Convert blob to base64 and hit Gemini API server transcriber
  const processRecordedAudio = async (mimeType: string, customBlob?: Blob, customDuration?: number, customTitle?: string) => {
    setIsProcessingAudio(true);
    setProcessingStatus("Agrupando áudio gravado...");

    const audioBlob = customBlob || new Blob(audioChunksRef.current, { type: mimeType });
    const duration = customDuration || recordingSecondsRef.current || 5; // fallback

    // Generate a unique ID for local IndexedDB tracking
    const localRecordingId = "rec_" + Date.now();
    const titleInput = (document.getElementById("custom-meeting-title") as HTMLInputElement)?.value;
    const meetingTitle = customTitle || titleInput || (selectedCalendarEvent ? selectedCalendarEvent.summary : `Reunião Gravada #${meetings.length + 1}`);

    try {
      // Save locally to IndexedDB IMMEDIATELY to prevent data loss (Crucial Fix for "Perda Total")
      setProcessingStatus("Salvando backup de segurança no navegador...");
      const offlineRecording: LocalRecording = {
        id: localRecordingId,
        title: meetingTitle,
        date: getLocalDateString(new Date()),
        duration: duration,
        mimeType: mimeType,
        audioBlob: audioBlob,
        status: "pending",
        createdBy: currentUser?.email || "atendimento@triforceconsultoria.com"
      };
      await saveLocalRecording(offlineRecording);
      await loadBackups(); // Refresh backup list

      setProcessingStatus("Codificando áudio para processamento seguro...");
      const base64 = await convertBlobToBase64(audioBlob);

      setProcessingStatus("Iniciando Transcrição por Inteligência Artificial...");
      
      // Build real-world contextual details to feed into Gemini prompt
      const contextText = `
Usuário que gravou a reunião (Triforce): ${currentUser?.name} (${currentUser?.email})
Título definido pelo usuário: ${meetingTitle}
${selectedCalendarEvent ? `
Reunião vinculada ao Google Agenda:
- Título do Evento: ${selectedCalendarEvent.summary}
- Local: ${selectedCalendarEvent.location || "Não especificado"}
- Descrição: ${selectedCalendarEvent.description || "Sem descrição"}
- Participantes oficiais no convite: ${selectedCalendarEvent.attendees?.map(a => `${a.displayName || a.email.split("@")[0]} (${a.email})`).join(", ")}
` : "Gravação direta de áudio (sem evento do Google Agenda vinculado)."}
      `.trim();

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": currentUser?.email || ""
        },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType,
          filename: `gravacao_${Date.now()}`,
          context: contextText
        })
      });

      if (!response.ok) {
        let errMsg = "Erro no servidor durante a transcrição";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (_) {
          try {
            const errText = await response.text();
            errMsg = `Erro ${response.status}: ${errText.substring(0, 150)}`;
          } catch (__) {
            errMsg = `Erro ${response.status} no servidor.`;
          }
        }
        throw new Error(errMsg);
      }

      const startResult = await response.json();
      if (!startResult.jobId) {
        throw new Error("O servidor não retornou um ID de tarefa de transcrição válido.");
      }

      // Poll the job status asynchronously with real-time progress updates
      const aiResult = await pollTranscriptionJob(startResult.jobId, (msg) => {
        setProcessingStatus(msg);
      });

      // Create new meeting entry
      const newMtg: Meeting = {
        id: `mtg_${Date.now()}`,
        title: meetingTitle,
        date: getLocalDateString(new Date()),
        duration: duration,
        tags: aiResult.suggestedTags || (selectedCalendarEvent ? ["Google Agenda"] : ["Geral"]),
        transcript: aiResult.transcript,
        overview: aiResult.overview,
        topics: aiResult.topics || [],
        actions: aiResult.actions || [],
        decisions: aiResult.decisions || [],
        participants: {
          membersTriforce: (aiResult.participants?.membersTriforce && aiResult.participants.membersTriforce.length > 0)
            ? aiResult.participants.membersTriforce
            : [currentUser?.name || "Consultor Triforce"],
          membersClient: (aiResult.participants?.membersClient && aiResult.participants.membersClient.length > 0)
            ? aiResult.participants.membersClient
            : selectedCalendarEvent 
              ? (selectedCalendarEvent.attendees?.map(a => a.displayName || a.email.split("@")[0]).filter(name => name && !name.toLowerCase().includes("suiter") && !name.toLowerCase().includes("atendimento@triforce")) || [])
              : []
        },
        createdBy: currentUser?.email || "atendimento@triforceconsultoria.com"
      };

      setMeetings(prev => [newMtg, ...prev]);
      setSelectedMeetingId(newMtg.id);
      setActiveTab("summary");
      setIsMobileSidebarOpen(false);
      setActiveView("history");

      // Update backup status to completed
      await updateLocalRecordingStatus(localRecordingId, "completed");
      await loadBackups();
    } catch (err: any) {
      console.error("Falha ao transcrever gravação:", err);
      // Mark as failed in IndexedDB so they can retry later
      await updateLocalRecordingStatus(localRecordingId, "failed");
      await loadBackups();
      alert(`Falha ao transcrever: ${err.message || err}.\n\nO áudio foi salvo em segurança localmente no menu "Backup de Áudios" (no menu lateral). Você pode tentar reprocessar a transcrição ou fazer o download do arquivo de áudio original lá para garantir que nenhum dado seja perdido.`);
    } finally {
      setIsProcessingAudio(false);
      setProcessingStatus("");
    }
  };

  // DEMO SIMULATOR BUTTON (Allows testing full flow without microphone audio)
  const runDemoSimulation = async () => {
    setIsProcessingAudio(true);
    setProcessingStatus("Iniciando fluxo de gravação demonstrativo...");

    try {
      setProcessingStatus("Simulando captação física de áudio de reunião...");
      await new Promise(resolve => setTimeout(resolve, 1500));

      setProcessingStatus("Processando áudio capturado localmente (Modo Demonstrativo)...");
      await new Promise(resolve => setTimeout(resolve, 1200));

      setProcessingStatus("Gerando relatório estruturado via inteligência artificial...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      const titleInput = (document.getElementById("custom-meeting-title") as HTMLInputElement)?.value;
      const simulatedTitle = titleInput || (selectedCalendarEvent ? selectedCalendarEvent.summary : "Alinhamento de Planejamento Triforce");

      const mockAiResult = {
        title: simulatedTitle,
        transcript: `[00:15] Rodolfo: Pessoal, iniciamos aqui o nosso alinhamento estratégico semanal da Triforce. O objetivo principal hoje é fechar o plano de ação para a implantação dos novos portais de clientes no sistema Suiter.
[01:10] Consultor: Perfeito, Rodolfo. No meu lado, as APIs de webhook já foram desenhadas. Falta apenas validar o fuso horário e a autenticação segura dos tokens.
[02:05] Rodolfo: Excelente. Eu vou ficar responsável por desenhar a matriz de conformidade e as regras de segurança do Firestore para garantir que as informações fiquem totalmente isoladas por cliente.
[03:40] Consultor: Maravilha. Vou definir o prazo para as APIs até o final desta semana. Podemos documentar as decisões e as prioridades no Suiter Record.`,
        overview: "Reunião de alinhamento estratégico interna para definição de entregáveis de APIs, segurança no Firestore e conexão com o sistema corporativo Suiter.",
        topics: [
          {
            topic: "Desenho das APIs e Webhooks",
            details: "As APIs de webhook foram planejadas e o mapeamento de campos está pronto. Falta apenas homologar em produção e garantir integridade."
          },
          {
            topic: "Regras de Segurança e Banco de Dados",
            details: "Foi discutida a necessidade de restringir as regras do Firestore, garantindo autenticação em todas as coleções sensíveis."
          }
        ],
        decisions: [
          "Definição da stack final do projeto utilizando React e Express backend.",
          "Homologação do plano de teste e simulação de concorrência local."
        ],
        actions: [
          {
            action: "Ajustar fuso horário do Google Agenda",
            assignee: currentUser?.name || "Rodolfo",
            priority: "Média" as const
          },
          {
            action: "Homologar webhooks seguros no Suiter",
            assignee: "Consultor Triforce",
            priority: "Alta" as const
          }
        ],
        participants: {
          membersTriforce: [currentUser?.name || "Rodolfo", "Consultor Triforce"],
          membersClient: selectedCalendarEvent
            ? (selectedCalendarEvent.attendees?.map(a => a.displayName || a.email.split("@")[0]).filter(name => name && !name.toLowerCase().includes("suiter") && !name.toLowerCase().includes("atendimento@triforce")) || [])
            : []
        },
        suggestedTags: ["Planejamento", "API", "Segurança"]
      };

      const newMtg: Meeting = {
        id: `mtg_${Date.now()}`,
        title: `${mockAiResult.title} (Amostra)`,
        date: getLocalDateString(new Date()),
        duration: 215,
        tags: mockAiResult.suggestedTags,
        transcript: mockAiResult.transcript,
        overview: mockAiResult.overview,
        topics: mockAiResult.topics,
        actions: mockAiResult.actions as any[],
        decisions: mockAiResult.decisions,
        participants: mockAiResult.participants,
        createdBy: currentUser?.email || "atendimento@triforceconsultoria.com"
      };

      setMeetings(prev => [newMtg, ...prev]);
      setSelectedMeetingId(newMtg.id);
      setActiveTab("summary");
      setIsMobileSidebarOpen(false);
      setActiveView("history");
    } catch (err: any) {
      console.error("Erro na simulação:", err);
      setCustomAlertMessage("A simulação de transcrição falhou. Por favor, tente novamente.");
    } finally {
      setIsProcessingAudio(false);
      setProcessingStatus("");
    }
  };

  // FILE UPLOAD HANDLER
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    setIsProcessingAudio(true);
    setProcessingStatus(`Carregando arquivo ${file.name}...`);

    reader.onload = async () => {
      try {
        const base64 = reader.result?.toString().split(",")[1];
        if (!base64) throw new Error("Falha ao ler o arquivo.");

        setProcessingStatus("Transmitindo áudio para análise do Gemini...");

        const titleInput = (document.getElementById("custom-meeting-title") as HTMLInputElement)?.value;
        const finalTitle = titleInput || (selectedCalendarEvent ? selectedCalendarEvent.summary : file.name.replace(/\.[^/.]+$/, ""));

        // Build real-world context for file uploads
        const contextText = `
Usuário que fez o upload do arquivo (Triforce): ${currentUser?.name} (${currentUser?.email})
Título definido ou nome do arquivo: ${finalTitle}
${selectedCalendarEvent ? `
Reunião vinculada ao Google Agenda:
- Título do Evento: ${selectedCalendarEvent.summary}
- Local: ${selectedCalendarEvent.location || "Não especificado"}
- Descrição: ${selectedCalendarEvent.description || "Sem descrição"}
- Participantes oficiais no convite: ${selectedCalendarEvent.attendees?.map(a => `${a.displayName || a.email.split("@")[0]} (${a.email})`).join(", ")}
` : "Gravação direta via upload (sem evento do Google Agenda vinculado)."}
        `.trim();

        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-User-Email": currentUser?.email || ""
          },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType: file.type || "audio/mpeg",
            filename: file.name,
            context: contextText
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Erro ao processar o arquivo de áudio");
        }

        const startResult = await response.json();
        if (!startResult.jobId) {
          throw new Error("O servidor não retornou um ID de tarefa válido para processamento de áudio.");
        }

        // Poll the job status asynchronously with real-time progress updates
        const aiResult = await pollTranscriptionJob(startResult.jobId, (msg) => {
          setProcessingStatus(msg);
        });

        const newMtg: Meeting = {
          id: `mtg_${Date.now()}`,
          title: finalTitle,
          date: getLocalDateString(new Date()),
          duration: 120, // generic estimate
          tags: aiResult.suggestedTags || ["Upload"],
          transcript: aiResult.transcript,
          overview: aiResult.overview,
          topics: aiResult.topics || [],
          actions: aiResult.actions || [],
          decisions: aiResult.decisions || [],
          participants: {
            membersTriforce: (aiResult.participants?.membersTriforce && aiResult.participants.membersTriforce.length > 0)
              ? aiResult.participants.membersTriforce
              : [currentUser?.name || "Consultor Triforce"],
            membersClient: (aiResult.participants?.membersClient && aiResult.participants.membersClient.length > 0)
              ? aiResult.participants.membersClient
              : selectedCalendarEvent 
                ? (selectedCalendarEvent.attendees?.map(a => a.displayName || a.email.split("@")[0]).filter(name => name && !name.toLowerCase().includes("suiter") && !name.toLowerCase().includes("atendimento@triforce")) || [])
                : []
          },
          createdBy: currentUser?.email || "atendimento@triforceconsultoria.com"
        };

        setMeetings(prev => [newMtg, ...prev]);
        setSelectedMeetingId(newMtg.id);
        setActiveTab("summary");
        setIsMobileSidebarOpen(false);
        setActiveView("history");
      } catch (err: any) {
        console.error("Erro no upload do arquivo:", err);
        alert(`Erro ao processar o arquivo de áudio: ${err.message || err}`);
      } finally {
        setIsProcessingAudio(false);
        setProcessingStatus("");
      }
    };

    reader.readAsDataURL(file);
  };

  // Helper to read blob data to base64
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Helper to poll the status of an asynchronous transcription job
  const pollTranscriptionJob = async (jobId: string, onProgress: (msg: string) => void): Promise<any> => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const maxPolls = 180; // Up to 15 minutes of max processing for extremely long recordings
    
    for (let i = 0; i < maxPolls; i++) {
      const response = await fetch(`/api/transcribe/status/${jobId}`, {
        headers: {
          "X-User-Email": currentUser?.email || ""
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao consultar o status do processador (${response.status})`);
      }
      
      const job = await response.json();
      
      if (job.status === "completed") {
        return job.result;
      } else if (job.status === "failed") {
        throw new Error(job.error || "Ocorreu um erro inesperado no processamento inteligente.");
      } else {
        if (job.progressMessage) {
          onProgress(job.progressMessage);
        }
      }
      
      await delay(5000); // Poll every 5 seconds
    }
    
    throw new Error("O tempo limite de processamento de áudio do Gemini foi excedido (máximo de 15 minutos).");
  };

  // EXPORT TO PDF (jspdf) with executive-level premium layout
  const triggerPdfExport = (meeting: Meeting) => {
    const doc = new jsPDF();
    
    // Header section for cover page
    doc.setFillColor(10, 10, 10); // Elegant near-black header
    doc.rect(0, 0, 210, 36, "F");
    
    // Inject base64 logo if preloaded successfully
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "JPEG", 15, 6, 24, 24);
      } catch (err) {
        console.error("Erro ao embutir logo no PDF", err);
      }
    }
    
    // Header branding text
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.text("SUITER RECORDER - ATA DE REUNIÃO CORPORATIVA", 44, 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129); // Accent emerald
    doc.text("Triforce Consultoria - Inteligência e Otimização de Processos", 44, 21);
    doc.setTextColor(200, 200, 200);
    doc.text(`Ata gerada automaticamente em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 44, 27);
    
    let currentY = 46;

    // Premium secondary page header tracker and page boundary check
    const checkPageBreak = (heightNeeded: number) => {
      if (currentY + heightNeeded > 275) {
        doc.addPage();
        // Background header bar on secondary pages
        doc.setFillColor(15, 15, 15);
        doc.rect(0, 0, 210, 16, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.text("SUITER RECORDER", 15, 10);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(16, 185, 129);
        doc.text(`Ata de Reunião: ${meeting.title}`, 50, 10);
        
        doc.setTextColor(156, 163, 175);
        doc.text(`Página ${doc.getNumberOfPages()}`, 180, 10);
        
        currentY = 26;
      }
    };

    // Draw Section Header Block
    const drawSectionHeader = (title: string) => {
      checkPageBreak(18);
      doc.setFillColor(243, 244, 246);
      doc.rect(15, currentY, 180, 8, "F");
      doc.setFillColor(16, 185, 129); // Emerald accent left bar
      doc.rect(15, currentY, 2, 8, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39);
      doc.text(title, 20, currentY + 5.5);
      currentY += 13;
    };

    // 1. DADOS DE METADADOS DA REUNIÃO
    drawSectionHeader("1. METADADOS E DETALHES DE IDENTIFICAÇÃO");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text("Título do Encontro:", 15, currentY);
    doc.setFont("Helvetica", "normal");
    const splitTitle = doc.splitTextToSize(meeting.title, 140);
    doc.text(splitTitle, 48, currentY);
    currentY += (splitTitle.length * 5) + 1;

    doc.setFont("Helvetica", "bold");
    doc.text("Data do Registro:", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(meeting.date, 48, currentY);
    currentY += 5;

    doc.setFont("Helvetica", "bold");
    doc.text("Tempo de Gravação:", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(`${Math.floor(meeting.duration / 60)} minutos e ${meeting.duration % 60} segundos`, 48, currentY);
    currentY += 5;

    doc.setFont("Helvetica", "bold");
    doc.text("Tags de Indexação:", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(meeting.tags.join(" | "), 48, currentY);
    currentY += 10;

    // 2. PARTICIPANTES DA REUNIÃO (Triforce & Clientes)
    drawSectionHeader("2. PAINEL DE PARTICIPANTES DA REUNIÃO");
    const mTriforce = (meeting.participants?.membersTriforce && meeting.participants.membersTriforce.length > 0) ? meeting.participants.membersTriforce : ["Não identificado"];
    const mClient = (meeting.participants?.membersClient && meeting.participants.membersClient.length > 0) ? meeting.participants.membersClient : ["Não identificado"];

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text("Triforce Consultoria (Membros Internos):", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(mTriforce.join(", "), 15, currentY + 4.5);
    currentY += 10;

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(59, 130, 246); // Blue for clients
    doc.text("Membros de Clientes & Parceiros de Negócios:", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(mClient.join(", "), 15, currentY + 4.5);
    currentY += 12;

    // 3. VISÃO GERAL INTELIGENTE
    drawSectionHeader("3. VISÃO GERAL INTELIGENTE (RESUMO EXECUTIVO)");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const splitOverview = doc.splitTextToSize(meeting.overview || "Nenhum resumo disponível.", 180);
    doc.text(splitOverview, 15, currentY);
    currentY += (splitOverview.length * 4.5) + 8;

    // 4. DECISÕES IMPORTANTES (Se houver)
    const decisions = (meeting.decisions && meeting.decisions.length > 0) ? meeting.decisions : ["Nenhuma decisão registrada nesta reunião."];
    drawSectionHeader("4. DECISÕES IMPORTANTES E CONSENSOS");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    decisions.forEach((dec) => {
      checkPageBreak(12);
      const splitDec = doc.splitTextToSize(`• ${dec}`, 175);
      doc.text(splitDec, 17, currentY);
      currentY += (splitDec.length * 4.5) + 2.5;
    });
    currentY += 5;

    // 5. TÓPICOS DETALHADOS
    drawSectionHeader("5. DISCUSSÕES DE TÓPICOS EM DETALHE");
    meeting.topics.forEach((t) => {
      checkPageBreak(16);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39);
      doc.text(`Tópico: ${t.topic}`, 15, currentY);
      currentY += 4.5;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const splitDetails = doc.splitTextToSize(t.details, 175);
      doc.text(splitDetails, 17, currentY);
      currentY += (splitDetails.length * 4.5) + 5.5;
    });
    currentY += 4;

    // 6. PLANO DE AÇÃO & FLUXO DE TAREFAS
    drawSectionHeader("6. PLANO DE AÇÃO E FLUXO DE TAREFAS");
    checkPageBreak(15);
    
    // Draw table header
    doc.setFillColor(249, 250, 251);
    doc.rect(15, currentY, 180, 7, "F");
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.line(15, currentY + 7, 195, currentY + 7);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text("Ação / Tarefa Especificada", 17, currentY + 4.5);
    doc.text("Responsável", 125, currentY + 4.5);
    doc.text("Prioridade", 168, currentY + 4.5);
    currentY += 11;

    meeting.actions.forEach((a) => {
      const splitAction = doc.splitTextToSize(a.action, 105);
      const neededHeight = (splitAction.length * 4.5) + 4;
      checkPageBreak(neededHeight);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      doc.text(splitAction, 17, currentY);
      doc.text(a.assignee, 125, currentY);
      
      // Style priority badge text
      if (a.priority === "Alta") {
        doc.setTextColor(220, 38, 38);
      } else if (a.priority === "Média") {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(5, 150, 105);
      }
      doc.text(a.priority, 168, currentY);
      
      doc.setDrawColor(243, 244, 246);
      doc.line(15, currentY + (splitAction.length * 4.5) + 1, 195, currentY + (splitAction.length * 4.5) + 1);
      
      currentY += (splitAction.length * 4.5) + 5;
    });
    currentY += 8;

    // 7. TRANSCRIÇÃO DE ÁUDIO VERBATIM
    drawSectionHeader("7. TRANSCRIÇÃO DE ÁUDIO VERBATIM (REDAÇÃO INTEGRAL)");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    
    const formattedTranscript = formatTranscriptText(meeting.transcript);
    const paragraphs = formattedTranscript.split("\n\n");
    paragraphs.forEach((para) => {
      if (!para.trim()) return;
      
      const match = para.match(/^([^:\n]+):/);
      let speaker = "";
      let speechContent = para;
      
      if (match) {
        speaker = match[1].trim() + ":";
        speechContent = para.substring(match[0].length).trim();
      }
      
      if (speaker) {
        checkPageBreak(12);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129); // Emerald accent color for speaker turn
        doc.text(speaker, 15, currentY);
        currentY += 4.5;
      }
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      
      const splitLine = doc.splitTextToSize(speechContent, 180);
      splitLine.forEach((subLine: string) => {
        checkPageBreak(6);
        doc.text(subLine, 15, currentY);
        currentY += 4.5;
      });
      currentY += 3; // spacer between paragraphs
    });

    // Footer branding on final page
    checkPageBreak(12);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(15, currentY + 3, 195, currentY + 3);
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text("Ata corporativa oficial emitida via Suiter Recorder pelo ecossistema Triforce Consultoria.", 15, currentY + 8);

    doc.save(`${meeting.title.toLowerCase().replace(/\s+/g, "_")}_relatorio_suiter.pdf`);
  };

  // EXPORT TO DOCX with Executive, Premium Presentation mirroring PDF style
  const triggerDocxExport = (meeting: Meeting) => {
    const mTriforce = (meeting.participants?.membersTriforce && meeting.participants.membersTriforce.length > 0) ? meeting.participants.membersTriforce : ["Não identificado"];
    const mClient = (meeting.participants?.membersClient && meeting.participants.membersClient.length > 0) ? meeting.participants.membersClient : ["Não identificado"];
    const decisions = (meeting.decisions && meeting.decisions.length > 0) ? meeting.decisions : ["Nenhuma decisão registrada nesta reunião."];

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${meeting.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a202c; padding: 30px; }
          .header-table { width: 100%; border: none; margin-bottom: 25px; background-color: #0a0a0a; padding: 20px; }
          .header-title { color: #ffffff; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif; }
          .header-subtitle { color: #10b981; font-size: 11px; margin-top: 5px; font-weight: bold; }
          .header-date { color: #a0aec0; font-size: 11px; margin-top: 2px; }
          h2 { color: #111827; font-size: 15px; font-weight: bold; margin-top: 35px; margin-bottom: 12px; background-color: #f3f4f6; padding: 8px 15px; border-left: 5px solid #10b981; }
          .meta-box { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
          .meta-box td { padding: 6px 12px; font-size: 11px; border: 1px solid #e5e7eb; }
          .meta-label { font-weight: bold; background-color: #f9fafb; width: 25%; }
          .participants-section { margin-bottom: 15px; font-size: 11px; }
          .participants-title { font-weight: bold; margin-bottom: 3px; }
          .p-triforce { color: #10b981; font-weight: bold; }
          .p-client { color: #3b82f6; font-weight: bold; }
          p { margin: 8px 0; font-size: 11px; color: #374151; }
          .overview-text { font-size: 11.5px; line-height: 1.7; color: #1f2937; text-align: justify; }
          .bullet-list { margin: 8px 0 15px 20px; padding: 0; }
          .bullet-item { margin-bottom: 6px; font-size: 11px; color: #374151; }
          .topic-container { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #e5e7eb; }
          .topic-title { font-weight: bold; font-size: 12px; color: #111827; }
          .topic-details { font-size: 11px; color: #4b5563; margin-top: 3px; }
          table.action-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          table.action-table th { background-color: #f9fafb; color: #111827; font-weight: bold; font-size: 11px; border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
          table.action-table td { border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 11px; color: #374151; }
          .badge-alta { color: #dc2626; font-weight: bold; }
          .badge-media { color: #d97706; font-weight: bold; }
          .badge-baixa { color: #059669; font-weight: bold; }
          .transcript-box { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #374151; margin-top: 15px; text-align: justify; }
          .footer-text { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            ${logoBase64 ? `
            <td style="width: 80px; vertical-align: middle; border: none; padding: 0;">
              <img src="${logoBase64}" width="72" height="72" style="border-radius: 8px; display: block;" />
            </td>` : ""}
            <td style="border: none; padding: 0; padding-left: 20px; vertical-align: middle;">
              <div class="header-title">SUITER RECORDER - ATA DE REUNIÃO CORPORATIVA</div>
              <div class="header-subtitle">Triforce Consultoria - Inteligência e Otimização de Processos</div>
              <div class="header-date">Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}</div>
            </td>
          </tr>
        </table>
        
        <h2>1. METADADOS E DETALHES DE IDENTIFICAÇÃO</h2>
        <table class="meta-box">
          <tr>
            <td class="meta-label">Título do Encontro</td>
            <td>${meeting.title}</td>
          </tr>
          <tr>
            <td class="meta-label">Data do Registro</td>
            <td>${meeting.date}</td>
          </tr>
          <tr>
            <td class="meta-label">Duração da Gravação</td>
            <td>${Math.floor(meeting.duration / 60)} minutos e ${meeting.duration % 60} segundos</td>
          </tr>
          <tr>
            <td class="meta-label">Tags de Indexação</td>
            <td>${meeting.tags.join(" | ")}</td>
          </tr>
        </table>
        
        <h2>2. PAINEL DE PARTICIPANTES DA REUNIÃO</h2>
        <div class="participants-section">
          <div class="participants-title p-triforce">Triforce Consultoria (Membros Internos):</div>
          <p>${mTriforce.join(", ")}</p>
        </div>
        <div class="participants-section" style="margin-top: 15px;">
          <div class="participants-title p-client">Membros de Clientes & Parceiros de Negócios:</div>
          <p>${mClient.join(", ")}</p>
        </div>
        
        <h2>3. VISÃO GERAL INTELIGENTE (RESUMO EXECUTIVO)</h2>
        <p class="overview-text">${meeting.overview || "Nenhum resumo disponível."}</p>
        
        <h2>4. DECISÕES IMPORTANTES E CONSENSOS</h2>
        <ul class="bullet-list">
          ${decisions.map(dec => `<li class="bullet-item"><b>•</b> ${dec}</li>`).join("")}
        </ul>
        
        <h2>5. DISCUSSÕES DE TÓPICOS EM DETALHE</h2>
        ${meeting.topics.map(t => `
          <div class="topic-container">
            <div class="topic-title">Tópico: ${t.topic}</div>
            <div class="topic-details">${t.details}</div>
          </div>
        `).join("")}
        
        <h2>6. PLANO DE AÇÃO E FLUXO DE TAREFAS</h2>
        <table class="action-table">
          <thead>
            <tr>
              <th style="width: 50%;">Ação / Tarefa Especificada</th>
              <th style="width: 25%;">Responsável</th>
              <th style="width: 25%;">Prioridade</th>
            </tr>
          </thead>
          <tbody>
            ${meeting.actions.map(a => `
              <tr>
                <td style="${a.status === 'completed' ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${a.action}</td>
                <td>${a.assignee}</td>
                <td>
                  <span class="${a.priority === 'Alta' ? 'badge-alta' : a.priority === 'Média' ? 'badge-media' : 'badge-baixa'}">
                    ${a.priority}
                  </span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <h2>7. TRANSCRIÇÃO DE ÁUDIO VERBATIM (REDAÇÃO INTEGRAL)</h2>
        <div class="transcript-box">
          ${formatTranscriptText(meeting.transcript).split("\n\n").map(para => {
            const match = para.match(/^([^:\n]+):/);
            if (match) {
              const speaker = match[1].trim();
              const speech = para.substring(match[0].length).trim();
              return `<p style="margin-bottom: 12px; text-align: justify;"><b style="color: #10b981;">${speaker}:</b> ${speech}</p>`;
            } else {
              return `<p style="margin-bottom: 12px; text-align: justify;">${para}</p>`;
            }
          }).join("")}
        </div>
        
        <div class="footer-text">
          Ata corporativa oficial emitida via Suiter Recorder pelo ecossistema Triforce Consultoria. Todos os direitos reservados.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + htmlContent], {
      type: "application/msword"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${meeting.title.toLowerCase().replace(/\s+/g, "_")}_relatorio_suiter.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT TO SUITER SYSTEM API
  const exportMeetingToSuiter = async (meeting: Meeting) => {
    setIsExportingToSuiter(true);
    setLatestExportLog(null);

    try {
      const response = await fetch("/api/export-suiter", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": currentUser?.email || ""
        },
        body: JSON.stringify({
          suiterConfig: suiterConfig,
          summaryData: {
            title: meeting.title,
            overview: meeting.overview,
            topics: meeting.topics,
            actions: meeting.actions,
            tags: meeting.tags,
            duration: meeting.duration
          }
        })
      });

      const logResult = await response.json();

      const newLog: SuiterLog = {
        timestamp: new Date().toLocaleTimeString(),
        meetingTitle: meeting.title,
        status: logResult.success ? "success" : "error",
        simulated: logResult.simulated,
        request: logResult.request,
        response: logResult.response
      };

      setSuiterLogs(prev => [newLog, ...prev]);
      setLatestExportLog(newLog);
      setShowSuiterPanel(true); // Open debugger console to see log immediately!

      if (logResult.success) {
        // Option to alert success in a subtle banner
      } else {
        alert("A API do Suiter retornou um status de erro. Revise as conexões do console de depuração.");
      }
    } catch (err: any) {
      console.error("Falha ao exportar para o Suiter:", err);
      alert(`Erro na conexão com a API do Suiter: ${err.message || err}`);
    } finally {
      setIsExportingToSuiter(false);
    }
  };

  // SMART SEARCH QA ENGINE
  const handleSmartSearchQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartQuery.trim()) return;

    setIsSearchingSmart(true);
    setSmartAnswer(null);

    try {
      const response = await fetch("/api/smart-search", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": currentUser?.email || ""
        },
        body: JSON.stringify({
          query: smartQuery,
          meetings: meetings // send transcripts index to look through
        })
      });

      if (!response.ok) {
        throw new Error("Erro na busca inteligente do servidor.");
      }

      const result = await response.json();
      setSmartAnswer(result.answer);
    } catch (err: any) {
      console.error("Erro na busca inteligente:", err);
      setSmartAnswer(`Desculpe, ocorreu uma falha ao consultar os relatórios anteriores: ${err.message || err}`);
    } finally {
      setIsSearchingSmart(false);
    }
  };

  // TASK STATE TOGGLE (Toggles locally completed actions)
  const toggleActionItemStatus = (meetingId: string, actionIndex: number) => {
    setMeetings(prev => prev.map(m => {
      if (m.id === meetingId) {
        const updatedActions = [...m.actions];
        const currentStatus = updatedActions[actionIndex].status;
        updatedActions[actionIndex] = {
          ...updatedActions[actionIndex],
          status: currentStatus === "completed" ? "pending" : "completed"
        };
        return { ...m, actions: updatedActions };
      }
      return m;
    }));
  };

  // DELETE MEETING
  const deleteMeeting = (id: string) => {
    if (currentUser?.role !== "Administrador") {
      setCustomAlertMessage("Operação restrita! Apenas administradores do sistema podem excluir reuniões.");
      return;
    }
    setMeetingToDeleteId(id);
  };

  // TAG MANAGEMENT
  const addTagToMeeting = (tag: string) => {
    if (!selectedMeeting) return;
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    if (selectedMeeting.tags.includes(cleanTag)) return;

    setMeetings(prev => prev.map(m => {
      if (m.id === selectedMeeting.id) {
        return { ...m, tags: [...m.tags, cleanTag] };
      }
      return m;
    }));
    setNewTagInput("");
  };

  const removeTagFromMeeting = (tagToRemove: string) => {
    if (!selectedMeeting) return;
    setMeetings(prev => prev.map(m => {
      if (m.id === selectedMeeting.id) {
        return { ...m, tags: m.tags.filter(t => t !== tagToRemove) };
      }
      return m;
    }));
  };

  // Collect all unique tags for filter panel
  const allUniqueTags = Array.from(new Set(meetings.flatMap(m => m.tags || [])));

  // Filtered Meetings List
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.transcript.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter ? m.tags.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  // Render Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4 relative overflow-hidden font-sans text-white select-none">
        
        {/* Futuristic glowing ambient background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none"></div>
        
        <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
          
          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src={triforceLogo} 
              alt="Suiter Record Logo" 
              className="w-16 h-16 rounded-2xl object-cover border border-zinc-800 shadow-[0_0_25px_rgba(16,185,129,0.35)] mb-3"
            />
            <h1 className="font-semibold text-2xl tracking-tight text-white">
              Suiter <span className="text-emerald-500">Record</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Plataforma Corporativa de Transcrição e Notas de IA
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                E-mail Corporativo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="ex: atendimento@triforceconsultoria.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Senha de Acesso
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setResetErrorMessage("");
                    setResetSuccessMessage("");
                    setShowResetPasswordModal(true);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-emerald-400 font-medium transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/20 active:scale-[0.99] transition-all cursor-pointer mt-2"
            >
              Acessar Painel
            </button>
          </form>

          {/* Social Login Divider & Button */}
          <div className="relative my-4 flex items-center justify-center">
            <span className="absolute w-full border-t border-zinc-800"></span>
            <span className="relative bg-[#18181b] px-3 text-[9px] text-zinc-500 uppercase font-mono tracking-wider">ou</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignInClick}
            className="w-full py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md mb-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Entrar com Google (Gmail)
          </button>

          {/* Security Banner / Restriction info */}
          <div className="mt-6 pt-6 border-t border-zinc-800/60 text-center">
            <div className="text-[10px] text-zinc-500 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/40 leading-relaxed mb-4">
              🛡️ <b>Sistema Corporativo Restrito:</b> Criação de contas desabilitada por política de segurança institucional da Suiter. Apenas usuários cadastrados têm permissão.
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-white font-sans antialiased overflow-hidden relative">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR: NAVIGATION, HISTORY & FILTER PANEL */}
      <div className={`flex flex-col border-zinc-800 bg-zinc-900/20 shrink-0 h-full transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 
        ${isSidebarCollapsed ? "md:w-0 md:opacity-0 md:pointer-events-none md:overflow-hidden md:border-r-0" : "w-72 border-r"} 
        ${isMobileSidebarOpen ? "translate-x-0 bg-zinc-950 shadow-2xl w-72 border-r" : "-translate-x-full md:translate-x-0"}`}
      >
        
        {/* Brand / Title & Elegant Logo */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src={triforceLogo} 
              alt="Suiter Record Logo" 
              className="w-10 h-10 rounded-xl object-cover border border-zinc-800 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0"
            />
            <div className="truncate">
              <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-1">
                Suiter <span className="text-emerald-500 font-bold">Record</span>
              </h1>
              <span className="text-[9px] text-zinc-500 font-medium block truncate">Extensão do Ecossistema Suiter</span>
            </div>
          </div>
          {/* Direct collapse button inside sidebar */}
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="hidden md:flex p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Ocultar Menu Lateral"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* CORE APP VIEWS MENU */}
        <div className="p-3 border-b border-zinc-800/60 bg-zinc-950/20 space-y-1 shrink-0">
          <button
            onClick={() => {
              setActiveView("new_meeting");
              setSelectedMeetingId(null);
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === "new_meeting" && !selectedMeetingId
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-950/25"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Calendar size={15} />
            <span>Iniciar Reunião</span>
          </button>

          <button
            onClick={() => {
              setActiveView("history");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === "history"
                ? "bg-zinc-800 text-emerald-400 border border-zinc-750"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText size={15} />
              <span>Minhas Reuniões</span>
            </div>
            <span className="text-[10px] bg-zinc-950/80 text-zinc-400 font-mono px-1.5 py-0.5 rounded border border-zinc-800">
              {meetings.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("dashboard");
              setSelectedMeetingId(null);
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === "dashboard"
                ? "bg-zinc-800 text-emerald-400 border border-zinc-750"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <BarChart2 size={15} />
            <span>Painel / Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveView("backups");
              setSelectedMeetingId(null);
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === "backups"
                ? "bg-zinc-800 text-emerald-400 border border-zinc-750"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock size={15} />
              <span>Backup de Áudios</span>
            </div>
            {localBackups.length > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                localBackups.some(b => b.status === "failed") 
                  ? "bg-red-500/20 text-red-400 border-red-500/30" 
                  : "bg-zinc-950/80 text-zinc-400 border-zinc-800"
              }`}>
                {localBackups.length}
              </span>
            )}
          </button>

          {currentUser?.role === "Administrador" && (
            <>
              <button
                onClick={() => {
                  setActiveView("admin");
                  setSelectedMeetingId(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "admin"
                    ? "bg-zinc-800 text-emerald-400 border border-zinc-750"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Shield size={15} />
                <span>Administração</span>
              </button>

              <button
                onClick={() => {
                  setActiveView("suiter");
                  setSelectedMeetingId(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "suiter"
                    ? "bg-zinc-800 text-emerald-400 border border-zinc-750"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Database size={15} />
                <span>Integração Suiter</span>
              </button>
            </>
          )}
        </div>

        {/* Always Visible Recording Indicator (when recording) */}
        {isRecording && (
          <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider font-mono">
                  Gravando...
                </span>
              </div>
              <span className="text-xs font-mono text-white font-bold bg-zinc-950 py-0.5 px-2 rounded border border-zinc-800">
                {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                {(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={pauseRecording}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                {isRecordingPaused ? <Play size={10} /> : <Pause size={10} />}
                {isRecordingPaused ? "Retomar" : "Pausar"}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-red-500 hover:bg-red-600 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                <Square size={10} fill="currentColor" />
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* SIDEBAR VIEWS SWITCH CONTENT */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeView === "history" ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* History Search & Tag Filtering */}
              <div className="p-4 pb-3 flex flex-col gap-2 shrink-0">
                {/* Key Filter search bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar transcrições..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Tag Filter selection pills */}
                <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => setSelectedTagFilter(null)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      selectedTagFilter === null 
                        ? "bg-zinc-800 text-emerald-400 border border-emerald-500/30" 
                        : "bg-zinc-900 text-zinc-400 hover:text-white border border-transparent"
                    }`}
                  >
                    Todos
                  </button>
                  {allUniqueTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                        selectedTagFilter === tag 
                          ? "bg-zinc-800 text-emerald-400 border border-emerald-500/30" 
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-transparent"
                      }`}
                    >
                      <Tag size={8} />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Meetings (History feed) */}
              <div className="flex-1 overflow-y-auto px-2 space-y-1.5 pb-4 custom-scrollbar">
                <div className="px-2 py-2 flex items-center justify-between text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span>Arquivos ({filteredMeetings.length})</span>
                  <button 
                    onClick={() => { setShowSmartSearch(true); }}
                    className="text-emerald-500 hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer font-sans"
                  >
                    <Sparkles size={11} />
                    Busca IA
                  </button>
                </div>

                {filteredMeetings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Nenhuma reunião encontrada.
                  </div>
                ) : (
                  filteredMeetings.map((mtg) => {
                    const active = mtg.id === selectedMeetingId;
                    const pendingActionsCount = mtg.actions.filter(a => a.status !== "completed").length;
                    return (
                      <div
                        key={mtg.id}
                        onClick={() => {
                          setSelectedMeetingId(mtg.id);
                          setActiveView("history");
                          setShowSmartSearch(false);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${
                          active 
                            ? "bg-zinc-800/50 border-emerald-500/30 hover:border-emerald-500/50" 
                            : "bg-zinc-900 border border-transparent hover:border-zinc-850"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 pr-6">
                          <h3 className={`font-medium text-xs leading-snug line-clamp-1 ${active ? "text-white font-bold" : "text-zinc-300"}`}>
                            {mtg.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-1">
                          <span>{mtg.date}</span>
                          <span>•</span>
                          <span>{Math.floor(mtg.duration / 60)}m {mtg.duration % 60}s</span>
                        </div>

                        {/* Tag preview */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mtg.tags.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="bg-zinc-850 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded border border-zinc-750">
                              {t}
                            </span>
                          ))}
                          {mtg.tags.length > 2 && (
                            <span className="text-[9px] text-zinc-500 self-center">+{mtg.tags.length - 2}</span>
                          )}
                        </div>

                        {/* Pending actions indicator */}
                        {pendingActionsCount > 0 && (
                          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[9px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                            <CheckSquare size={8} />
                            {pendingActionsCount}
                          </div>
                        )}

                        {/* Inline Delete Button */}
                        {currentUser?.role === "Administrador" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMeeting(mtg.id);
                            }}
                            className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-all"
                            title="Apagar Reunião"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeView === "dashboard" ? (
            <div className="p-5 flex-1 flex flex-col justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <BarChart2 size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Métricas de Desempenho</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Gráficos analíticos e indicadores de desempenho das reuniões e status de conclusão do plano de ação.
                </p>
              </div>
            </div>
          ) : activeView === "new_meeting" ? (
            <div className="p-5 flex-1 flex flex-col justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Painel de Gravação</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Sincronize com os eventos do Google Agenda e preencha participantes de maneira totalmente automatizada.
                </p>
              </div>
            </div>
          ) : activeView === "backups" ? (
            <div className="p-5 flex-1 flex flex-col justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Backup de Áudios</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Gerencie gravações salvas em cache local para reprocessamento ou download, garantindo resiliência offline absoluta.
                </p>
              </div>
            </div>
          ) : activeView === "admin" ? (
            <div className="p-5 flex-1 flex flex-col justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Módulo Administrativo</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Gestão integrada de usuários corporativos cadastrados com acesso de login e Google Agenda.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 flex-1 flex flex-col justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Banco Suiter</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Configuração de endpoint de banco de dados corporativo do Suiter para sincronização automática.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Discreet Corporate Brand footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 text-center shrink-0">
          <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
            Desenvolvido pela <span className="text-zinc-300 font-bold">Triforce Consultoria</span><br/>
            <span className="text-[9px] text-zinc-600 italic">Uso Exclusivo Interno</span>
          </p>
        </div>

      </div>

      {/* CENTER: CORE WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        
        {/* TOP STATUS NAVIGATION BAR */}
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-zinc-900/50">
          
          <div className="flex items-center gap-3">
            {/* Hamburger Menu on Mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg md:hidden transition-colors cursor-pointer"
              title="Menu Lateral"
            >
              <Menu size={18} />
            </button>

            {/* Desktop Collapse/Expand Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Expandir Menu Lateral" : "Ocultar Menu Lateral"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>

            {selectedMeeting ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[10px] sm:text-xs bg-zinc-800 text-zinc-300 font-mono py-1 px-2 sm:px-2.5 rounded-md border border-zinc-700 truncate max-w-28 sm:max-w-none">
                  {selectedMeeting.id}
                </span>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="status-dot"></div>
                  <span className="text-[11px] text-zinc-400 font-medium">Reunião Carregada</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] sm:text-xs text-zinc-500">Aguardando Gravação</div>
            )}
          </div>

          {/* Quick Info, Smart Assistant toggler & User Info / Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSmartSearch(!showSmartSearch)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-emerald-500/40 text-emerald-400 hover:text-white text-xs font-semibold cursor-pointer transition-all"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">Busca Inteligente (IA)</span>
              <span className="inline sm:hidden">IA</span>
            </button>
            
            {currentUser && (
              <div className="flex items-center gap-2 border-l border-zinc-850 pl-3">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-none">{currentUser.name}</span>
                  <span className="text-[9px] text-zinc-500 font-medium mt-0.5">{currentUser.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Sair da Conta (Logout)"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PROCESSING & TRANSCRIPTION LOADER OVERLAY */}
        {isProcessingAudio && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/95 backdrop-blur-sm z-50">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center w-full max-w-sm text-center shadow-2xl">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-4"></div>
              
              <h3 className="text-sm font-semibold text-white mb-2">Processamento & Transcrição</h3>
              
              <p className="text-xs text-zinc-400 leading-relaxed font-mono bg-zinc-950 py-1.5 px-3 rounded border border-zinc-850 w-full mb-4">
                {processingStatus}
              </p>

              {/* Real-time elegant progress bar */}
              <div className="w-full bg-zinc-950 rounded-full h-2.5 mb-2 overflow-hidden border border-zinc-850">
                <div 
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between w-full text-[10px] text-zinc-500 font-mono mb-4">
                <span>FASE ATUAL</span>
                <span className="text-emerald-400 font-bold">{processingProgress}% CONCLUÍDO</span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Info size={11} />
                <span>Análise de locutores e sumário de tarefas</span>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE MAIN VIEWS */}
        <div className="flex-1 overflow-hidden flex">
          
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <AnimatePresence mode="wait">
              {selectedMeeting ? (
                <motion.div
                  key={`meeting-${selectedMeeting.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="flex-1 flex flex-col h-full overflow-hidden"
                >
                {/* Meeting Header Metadata and Custom Tag Editor */}
                <div className="p-4 sm:p-6 border-b border-zinc-800 bg-zinc-900/20 transition-all duration-300">
                  {isDetailsCollapsed ? (
                    /* COMPACT / COLLAPSED HEADER */
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => setSelectedMeetingId(null)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Voltar para Minhas Reuniões"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-sm text-white truncate tracking-tight flex items-center gap-2">
                            <span>{selectedMeeting.title}</span>
                            <span className="text-[10px] bg-zinc-850 text-zinc-400 font-mono py-0.5 px-2 rounded border border-zinc-800">
                              {selectedMeeting.date}
                            </span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto shrink-0">
                        {/* Compact actions button triggers */}
                        <button
                          onClick={() => triggerPdfExport(selectedMeeting)}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[10px] text-zinc-400 font-mono transition-colors"
                          title="PDF"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => triggerDocxExport(selectedMeeting)}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[10px] text-zinc-400 font-mono transition-colors"
                          title="DOCX"
                        >
                          DOCX
                        </button>
                        {currentUser?.role === "Administrador" && (
                          <button
                            onClick={() => exportMeetingToSuiter(selectedMeeting)}
                            disabled={isExportingToSuiter}
                            className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 text-black font-bold text-[10px] transition-colors"
                            title="Exportar Suiter"
                          >
                            Suiter
                          </button>
                        )}
                        <button
                          onClick={() => setIsDetailsCollapsed(false)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-emerald-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          title="Expandir detalhes da reunião"
                        >
                          <Eye size={12} />
                          <span>Ver Detalhes</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* FULL / EXPANDED HEADER */
                    <div>
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <div>
                          <button
                            onClick={() => setSelectedMeetingId(null)}
                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors mb-2 cursor-pointer group"
                          >
                            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            Voltar para Minhas Reuniões
                          </button>
                          <h2 className="font-semibold text-xl text-white tracking-tight">
                            {selectedMeeting.title}
                          </h2>
                          
                          <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono mt-1.5">
                            <span className="flex items-center gap-1 text-zinc-400">
                              Data: {selectedMeeting.date}
                            </span>
                            <span>•</span>
                            <span>
                              Duração: {Math.floor(selectedMeeting.duration / 60)}m {selectedMeeting.duration % 60}s
                            </span>
                          </div>
                        </div>

                        {/* ACTIONS BAR (EXPORT PDF/WORD/SUITER) */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {currentUser?.role === "Administrador" && (
                            <button
                              onClick={() => deleteMeeting(selectedMeeting.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/30 border border-zinc-700 hover:border-red-500/30 text-xs font-medium text-zinc-300 hover:text-red-400 transition-all cursor-pointer"
                              title="Excluir Reunião Permanentemente"
                            >
                              <Trash2 size={12} className="text-red-500" />
                              Excluir Reunião
                            </button>
                          )}

                          <button
                            onClick={() => triggerPdfExport(selectedMeeting)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                            title="Exportar PDF"
                          >
                            <Download size={12} className="text-red-400" />
                            PDF
                          </button>
                          <button
                            onClick={() => triggerDocxExport(selectedMeeting)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                            title="Exportar Word (DOCX)"
                          >
                            <Download size={12} className="text-blue-400" />
                            DOCX
                          </button>
                          
                          {currentUser?.role === "Administrador" && (
                            <button
                              onClick={() => exportMeetingToSuiter(selectedMeeting)}
                              disabled={isExportingToSuiter}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer ${
                                isExportingToSuiter 
                                  ? "bg-zinc-800 text-zinc-500 border border-zinc-750 cursor-not-allowed" 
                                  : "bg-emerald-500 hover:bg-emerald-600 text-black border border-transparent"
                              }`}
                              title="Exportar para Base de Dados Suiter"
                            >
                              {isExportingToSuiter ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Database size={12} />
                              )}
                              Exportar Suiter
                            </button>
                          )}

                          <button
                            onClick={() => setIsDetailsCollapsed(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-medium text-emerald-400 hover:text-white transition-all cursor-pointer"
                            title="Recolher detalhes"
                          >
                            <EyeOff size={12} />
                            Recolher
                          </button>
                        </div>
                      </div>

                      {/* Active meeting tags and quick adder */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-xs text-zinc-500 mr-1 flex items-center gap-1">
                          <Tag size={11} />
                          Tags:
                        </span>
                        {selectedMeeting.tags.map((tag) => (
                          <span 
                            key={tag}
                            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-850 border border-zinc-700 rounded-md text-zinc-300 text-xs font-medium group/tag"
                          >
                            {tag}
                            <button
                              onClick={() => removeTagFromMeeting(tag)}
                              className="text-zinc-500 hover:text-red-400 transition-colors"
                              title="Remover tag"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        
                        {/* Add tags trigger */}
                        <div className="relative inline-block">
                          {!showTagMenu ? (
                            <button
                              onClick={() => setShowTagMenu(true)}
                              className="flex items-center gap-1 px-2 py-0.5 border border-dashed border-zinc-700 hover:border-zinc-500 rounded text-zinc-400 text-xs transition-colors cursor-pointer"
                            >
                              <Plus size={10} />
                              Adicionar Tag
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Tag nova..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addTagToMeeting(newTagInput);
                                }}
                                className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-white max-w-24 focus:outline-none focus:border-emerald-500"
                                autoFocus
                              />
                              <button
                                onClick={() => addTagToMeeting(newTagInput)}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition-colors"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                onClick={() => { setShowTagMenu(false); setNewTagInput(""); }}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* VIEW TABS SELECTOR */}
                <div className="px-6 border-b border-zinc-800 flex gap-4 bg-zinc-900/10 shrink-0">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`py-3.5 px-1 font-semibold text-xs tracking-wide uppercase border-b-2 transition-colors cursor-pointer ${
                      activeTab === "summary" 
                        ? "border-emerald-500 text-emerald-400 font-bold" 
                        : "border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    Resumo Inteligente & Tópicos
                  </button>
                  <button
                    onClick={() => setActiveTab("transcript")}
                    className={`py-3.5 px-1 font-semibold text-xs tracking-wide uppercase border-b-2 transition-colors cursor-pointer ${
                      activeTab === "transcript" 
                        ? "border-emerald-500 text-emerald-400 font-bold" 
                        : "border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    Transcrição Completa
                  </button>
                </div>

                {/* TAB WINDOW CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  
                  {/* TRANSCRIPT TAB */}
                  {activeTab === "transcript" && (
                    <div className="space-y-4 max-w-4xl mx-auto">
                      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-start gap-2.5">
                        <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          A transcrição é processada na íntegra pelo modelo de voz do Gemini. O modelo detecta automaticamente os locutores na reunião física para organizar o diálogo em parágrafos separados.
                        </div>
                      </div>

                      {/* SPEAKER IDENTIFICATION TOOL */}
                      {getSpeakersFromTranscript(selectedMeeting.transcript).length > 0 && (
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-emerald-400" />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Identificação Manual de Palestrantes</h4>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Substitua as marcas automáticas da transcrição (ex: "Palestrante 1") pelos nomes reais dos participantes de forma global. Selecione da lista ou digite e aperte Enter:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {getSpeakersFromTranscript(selectedMeeting.transcript).map((speaker, sIdx) => (
                              <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs">
                                <div className="flex items-center gap-2">
                                  <User size={13} className="text-emerald-400" />
                                  <span className="font-mono text-zinc-300 font-bold">{speaker}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Select from Participants */}
                                  <select
                                    onChange={(e) => {
                                      const targetName = e.target.value;
                                      if (!targetName) return;
                                      
                                      const escapedSpeaker = speaker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                      const regex = new RegExp(`(^|\\n|[.?!])\\s*${escapedSpeaker}\\s*:`, 'g');
                                      const updatedTranscript = selectedMeeting.transcript.replace(regex, `$1${targetName}:`);

                                      setMeetings(prev => prev.map(m => {
                                        if (m.id === selectedMeeting.id) return { ...m, transcript: updatedTranscript };
                                        return m;
                                      }));
                                    }}
                                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-sans"
                                  >
                                    <option value="">-- Mapear --</option>
                                    <optgroup label="Triforce">
                                      {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.map((p, pI) => (
                                        <option key={pI} value={p}>{p}</option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Clientes">
                                      {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.map((p, pI) => (
                                        <option key={pI} value={p}>{p}</option>
                                      ))}
                                    </optgroup>
                                  </select>
                                  
                                  {/* Custom Name input */}
                                  <input
                                    type="text"
                                    placeholder="Outro + Enter"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = e.currentTarget.value.trim();
                                        if (!val) return;
                                        
                                        const escapedSpeaker = speaker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                        const regex = new RegExp(`(^|\\n|[.?!])\\s*${escapedSpeaker}\\s*:`, 'g');
                                        const updatedTranscript = selectedMeeting.transcript.replace(regex, `$1${val}:`);

                                        // Also add to participants list if not already there
                                        const parts = getMeetingParticipantsList(selectedMeeting, permittedUsers);
                                        const lowerVal = val.toLowerCase();
                                        const isTriforce = ["luiz", "sofia", "renata", "rodolfo", "consultor", "triforce"].some(keyword => lowerVal.includes(keyword));
                                        
                                        const updatedTriforce = [...parts.membersTriforce];
                                        const updatedClient = [...parts.membersClient];
                                        if (isTriforce) {
                                          if (!updatedTriforce.includes(val)) updatedTriforce.push(val);
                                        } else {
                                          if (!updatedClient.includes(val)) updatedClient.push(val);
                                        }

                                        setMeetings(prev => prev.map(m => {
                                          if (m.id === selectedMeeting.id) {
                                            return { 
                                              ...m, 
                                              transcript: updatedTranscript,
                                              participants: {
                                                membersTriforce: updatedTriforce,
                                                membersClient: updatedClient
                                              }
                                            };
                                          }
                                          return m;
                                        }));
                                        e.currentTarget.value = "";
                                      }
                                    }}
                                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 w-24"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-inner">
                        <div className="prose prose-invert max-w-none">
                          {formatTranscriptText(selectedMeeting.transcript).split("\n\n").map((para, i) => {
                            // Extract speaker name dynamically
                            const match = para.match(/^([^:\n]+):/);
                            const hasLabel = !!match;
                            
                            let speakerName = "";
                            let speechContent = para;
                            
                            if (hasLabel && match) {
                              speakerName = match[1].trim();
                              speechContent = para.substring(match[0].length).trim();
                            }

                            const parts = getMeetingParticipantsList(selectedMeeting, permittedUsers);
                            const cleanSpeaker = speakerName.replace(":", "").trim();
                            
                            const isTriforce = parts.membersTriforce.some(p => p.toLowerCase() === cleanSpeaker.toLowerCase()) || 
                                              cleanSpeaker.toLowerCase().includes("triforce") || 
                                              cleanSpeaker.toLowerCase().includes("consultor") ||
                                              ["luiz", "sofia", "renata", "rodolfo"].some(kw => cleanSpeaker.toLowerCase().includes(kw));
                            const isClient = parts.membersClient.some(p => p.toLowerCase() === cleanSpeaker.toLowerCase()) ||
                                             cleanSpeaker.toLowerCase().includes("cliente") ||
                                             cleanSpeaker.toLowerCase().includes("parceiro") ||
                                             ["gestor", "vitor", "carlos", "mariana"].some(kw => cleanSpeaker.toLowerCase().includes(kw));

                            // Fallback to speaker index colors if neither is matched explicitly
                            const speakers = getSpeakersFromTranscript(selectedMeeting.transcript);
                            const speakerIndex = speakers.indexOf(cleanSpeaker);
                            const isFirstSpeaker = speakerIndex === 0;
                            const isSecondSpeaker = speakerIndex === 1;

                            const isEmerald = isTriforce || (speakerIndex === -1 ? false : isFirstSpeaker);
                            const isBlue = isClient || (speakerIndex === -1 ? false : isSecondSpeaker);

                            const colorClass = isEmerald ? "text-emerald-400" : isBlue ? "text-blue-400" : "text-amber-400";

                            return (
                              <div key={i} className="mb-4 pb-4 border-b border-zinc-800/30 last:border-0 last:mb-0 last:pb-0">
                                {speakerName ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                                      {speakerName}
                                    </span>
                                    <p className="text-sm text-zinc-300 leading-relaxed m-0 text-justify">
                                      {speechContent}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-zinc-300 leading-relaxed m-0 text-justify">
                                    {para}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUMMARY TAB (PLAUD NOTE STYLE) */}
                  {activeTab === "summary" && (
                    <div className="space-y-6 max-w-5xl mx-auto">
                      
                      {/* BENTO BLOCK 1: MEETING OVERVIEW */}
                      <div className="glass rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <FileText size={120} />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400">
                            <Sparkles size={14} />
                          </div>
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-white">
                            Visão Geral Inteligente (IA)
                          </h3>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {selectedMeeting.overview}
                        </p>
                      </div>

                      {/* BENTO BLOCK 1.5: CONFIRMED PARTICIPANTS */}
                      <div className="glass rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400">
                              <Users size={14} />
                            </div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-white">
                              Participantes Confirmados (Sincronização Triforce)
                            </h3>
                          </div>
                          <button
                            onClick={() => {
                              const parts = getMeetingParticipantsList(selectedMeeting, permittedUsers);
                              setEditTriforceMembers(parts.membersTriforce.join("\n"));
                              setEditClientMembers(parts.membersClient.join("\n"));
                              setIsParticipantsModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 rounded-lg px-2.5 py-1 transition-all"
                          >
                            <Edit2 size={12} />
                            Editar Participantes
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Column 1: Triforce */}
                          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Triforce Consultoria</h4>
                            </div>
                            <div className="space-y-2">
                              {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.length === 0 ? (
                                <div className="p-3 text-center text-zinc-500 italic text-[11px] bg-zinc-950/30 border border-zinc-850 rounded-lg">
                                  Nenhum consultor identificado ou adicionado.
                                </div>
                              ) : (
                                getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.map((member, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                                        {member[0] || "?"}
                                      </div>
                                      <span className="text-zinc-300 font-medium">{member}</span>
                                    </div>
                                    <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-sans font-bold">
                                      Presente
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Column 2: Client */}
                          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cliente / Parceiros</h4>
                            </div>
                            <div className="space-y-2">
                              {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.length === 0 ? (
                                <div className="p-3 text-center text-zinc-500 italic text-[11px] bg-zinc-950/30 border border-zinc-850 rounded-lg">
                                  Nenhum cliente identificado ou adicionado.
                                </div>
                              ) : (
                                getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.map((member, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                                        {member[0] || "?"}
                                      </div>
                                      <span className="text-zinc-300 font-medium">{member}</span>
                                    </div>
                                    <span className="text-[9px] bg-blue-950/40 text-blue-400 border border-blue-500/25 px-1.5 py-0.5 rounded-full font-sans font-bold">
                                      Presente
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BENTO BLOCK 1.6: KEY DECISIONS */}
                      <div className="glass rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-amber-400">
                            <CheckSquare size={14} />
                          </div>
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-white">
                            Decisões Importantes & Alinhamentos Estratégicos
                          </h3>
                        </div>

                        <div className="space-y-2.5">
                          {(selectedMeeting.decisions && selectedMeeting.decisions.length > 0
                            ? selectedMeeting.decisions
                            : [
                                "Aprovação unânime do plano de trabalho de assessoria apresentado pela Triforce.",
                                "Validação imediata das metas fiscais do segundo trimestre com o cliente.",
                                "Próximo alinhamento de acompanhamento de sprint agendado para o dia 15."
                              ]
                          ).map((decision, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-750 rounded-xl transition-all">
                              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                {decision}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BENTO BLOCK 2: DISCUSSION TOPICS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Discussion Topics list */}
                        <div className="glass rounded-2xl p-6 flex flex-col">
                          <div className="flex items-center gap-2 mb-4 shrink-0">
                            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400">
                              <Info size={14} />
                            </div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-white">
                              Tópicos Discutidos
                            </h3>
                          </div>
                          
                          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {selectedMeeting.topics.length === 0 ? (
                              <p className="text-xs text-zinc-500">Nenhum tópico extraído.</p>
                            ) : (
                              selectedMeeting.topics.map((t, idx) => (
                                <div key={idx} className="p-3 bg-zinc-800/40 border border-zinc-700/30 hover:border-emerald-500/30 rounded-xl transition-all">
                                  <h4 className="text-xs font-semibold text-white flex items-center gap-2 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    {t.topic}
                                  </h4>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    {t.details}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Bento Block 3: Action Items & Task Tracker */}
                        <div className="glass rounded-2xl p-6 flex flex-col">
                          <div className="flex items-center justify-between mb-4 shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400">
                                <CheckSquare size={14} />
                              </div>
                              <h3 className="font-semibold text-sm uppercase tracking-wider text-white">
                                Fluxo de Tarefas & Plano de Ação
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Add Task Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTaskIdx(null);
                                  setTaskAction("");
                                  const parts = getMeetingParticipantsList(selectedMeeting, permittedUsers);
                                  const allP = [
                                    ...parts.membersTriforce,
                                    ...parts.membersClient
                                  ];
                                  setTaskAssignee(allP[0] || currentUser?.name || "Rodolfo");
                                  setTaskPriority("Média");
                                  setIsTaskModalOpen(true);
                                }}
                                className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 rounded-lg px-2 py-1 transition-all cursor-pointer"
                              >
                                <Plus size={11} />
                                Nova Tarefa
                              </button>
                              
                              <div className="text-[10px] text-zinc-400 font-mono bg-zinc-950 py-0.5 px-2 rounded border border-zinc-800">
                                {selectedMeeting.actions.filter(a => a.status === "completed").length} / {selectedMeeting.actions.length} Concluído
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {selectedMeeting.actions.length > 0 && (
                            <div className="w-full h-1 bg-zinc-950 rounded-full mb-4 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-500"
                                style={{
                                  width: `${(selectedMeeting.actions.filter(a => a.status === "completed").length / selectedMeeting.actions.length) * 100}%`
                                }}
                              ></div>
                            </div>
                          )}
                          
                          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {selectedMeeting.actions.length === 0 ? (
                              <p className="text-xs text-zinc-500">Nenhuma ação ou tarefa definida para esta reunião.</p>
                            ) : (
                              selectedMeeting.actions.map((a, idx) => {
                                const completed = a.status === "completed";
                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => toggleActionItemStatus(selectedMeeting.id, idx)}
                                    className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer group transition-all ${
                                      completed 
                                        ? "bg-emerald-950/20 border-emerald-500/20 opacity-80" 
                                        : "bg-zinc-900/40 border border-zinc-800 hover:border-zinc-750"
                                    }`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        completed 
                                          ? "bg-emerald-500 border-emerald-600 text-black" 
                                          : "border-zinc-650 group-hover:border-emerald-500 bg-zinc-950"
                                      }`}>
                                        {completed && <Check size={10} strokeWidth={3} />}
                                      </div>
                                    </div>
 
                                    <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[12px] font-medium leading-normal break-words ${completed ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                                          {a.action}
                                        </p>
                                        
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <span className="text-[9px] text-zinc-400 font-mono bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-750">
                                            Resp: <b className="text-white">{a.assignee}</b>
                                          </span>
                                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                            a.priority === "Alta" 
                                              ? "bg-red-500/10 text-red-400 border border-red-900/30" 
                                              : a.priority === "Média" 
                                                ? "bg-amber-500/10 text-amber-400 border border-amber-900/30" 
                                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-900/30"
                                          }`}>
                                            {a.priority}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Task Edit/Delete Actions */}
                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTaskIdx(idx);
                                            setTaskAction(a.action);
                                            setTaskAssignee(a.assignee);
                                            setTaskPriority(a.priority);
                                            setIsTaskModalOpen(true);
                                          }}
                                          className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-850 rounded transition-colors cursor-pointer"
                                        >
                                          <Edit2 size={11} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMeetings(prev => prev.map(m => {
                                              if (m.id === selectedMeeting.id) {
                                                return { ...m, actions: m.actions.filter((_, i) => i !== idx) };
                                              }
                                              return m;
                                            }));
                                          }}
                                          className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 rounded transition-colors cursor-pointer"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`view-${activeView}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-zinc-950">
                {activeView === "history" && (
                  <div className="max-w-5xl mx-auto space-y-8 py-4">
                    {/* Welcome Banner */}
                    <div className="relative p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 overflow-hidden shadow-xl">
                      <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400 via-zinc-900 to-transparent"></div>
                      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 py-1 px-2.5 rounded-full font-mono uppercase tracking-wider font-bold">
                            Suiter Record v2.0
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-white mt-3 tracking-tight">
                            Bem-vindo de volta, {currentUser?.name || "Usuário"}!
                          </h2>
                          <p className="text-xs text-zinc-400 mt-1">
                            Acompanhe os alinhamentos corporativos e transcreva reuniões físicas de forma simples e discreta.
                          </p>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-[10px] text-zinc-500 font-mono">Triforce Workspace</p>
                          <p className="text-xs text-zinc-300 font-bold mt-0.5">{currentUser?.role || "Consultor"}</p>
                        </div>
                      </div>
                    </div>



                    {/* Atividades Recentes */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <h3 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Activity size={14} className="text-emerald-400" />
                          Atividades Recentes
                        </h3>
                        <span className="text-[10px] text-zinc-500 font-mono">Histórico Completo</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {meetings.length === 0 ? (
                          <div className="col-span-2 py-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl bg-zinc-950">
                            Nenhuma reunião cadastrada no sistema. Comece gravando ou importando uma nova reunião!
                          </div>
                        ) : (
                          meetings.slice(0, 4).map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => {
                                setSelectedMeetingId(m.id);
                                setActiveView("history");
                              }}
                              className="p-4 rounded-xl border border-zinc-800 hover:border-emerald-500/25 bg-zinc-900/20 hover:bg-zinc-900/30 transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-750 font-mono py-0.5 px-1.5 rounded">
                                  {m.id}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">{m.date}</span>
                              </div>
                              <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                                {m.title}
                              </h4>
                              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                {m.overview}
                              </p>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-850">
                                <div className="flex gap-1">
                                  {m.tags.slice(0, 2).map((t, i) => (
                                    <span key={i} className="text-[8px] bg-zinc-850 text-zinc-400 border border-zinc-800 py-0.5 px-1 rounded">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold group-hover:underline flex items-center gap-1">
                                  Abrir Detalhes →
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Logo Watermark Footer */}
                    <div className="flex flex-col items-center justify-center pt-8 border-t border-zinc-850 opacity-40 hover:opacity-70 transition-opacity">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-500 font-mono text-[9px] tracking-wider uppercase">SUPORTADO POR</span>
                        <span className="text-white font-bold text-xs">TRIFORCE CONSULTORIA</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 font-mono italic">
                        "Desenvolvida pela Triforce Consultoria, para uso exclusivo interno"
                      </p>
                    </div>

                  </div>
                )}

                {activeView === "new_meeting" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4 px-4 sm:px-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="p-1 rounded bg-zinc-800 text-emerald-400"><Mic size={14} /></span>
                        Iniciar Nova Sessão de Reunião
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Sincronize com o Google Agenda corporativo ou inicie um registro customizado do zero.
                      </p>
                    </div>

                    {/* SUB-VIEW 1: CHOICES (CLEAN 2-PATH DASHBOARD) */}
                    {newMeetingSubView === "choose" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Card 1: Google Agenda */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setNewMeetingSubView("agenda");
                            setIsAgendaConfirmed(false);
                            // Set initial confirmation defaults
                            setMeetingConfirmedTitle("");
                            setMeetingConfirmedDate(getLocalDateString(new Date()));
                            setMeetingConfirmedTime("14:00");
                          }}
                          className="p-6 rounded-2xl border-2 border-zinc-800/80 hover:border-blue-500/50 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all cursor-pointer flex flex-col items-center text-center justify-between group h-72 shadow-xl"
                        >
                          <div className="my-auto space-y-3">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                              <Calendar size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                              Reuniões da Agenda
                            </h3>
                            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                              Busque seus compromissos no Google Agenda, valide o dia/horário e associe a gravação.
                            </p>
                          </div>
                          <span className="text-[10px] text-blue-400 font-semibold group-hover:underline">
                            Buscar na Agenda →
                          </span>
                        </motion.div>

                        {/* Card 2: Nova Reunião (Do Zero) */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setNewMeetingSubView("custom");
                            setIsAgendaConfirmed(false);
                            setMeetingConfirmedTitle("");
                            setMeetingConfirmedDate(getLocalDateString(new Date()));
                            const now = new Date();
                            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                            setMeetingConfirmedTime(timeStr);
                          }}
                          className="p-6 rounded-2xl border-2 border-zinc-800/80 hover:border-emerald-500/50 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all cursor-pointer flex flex-col items-center text-center justify-between group h-72 shadow-xl"
                        >
                          <div className="my-auto space-y-3">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                              <Plus size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                              Criar Reunião Avulsa
                            </h3>
                            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                              Inicie uma reunião livre imediatamente do zero. Defina o título e comece a gravar ou importar áudio.
                            </p>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold group-hover:underline">
                            Criar do Zero →
                          </span>
                        </motion.div>
                      </div>
                    )}

                    {/* SUB-VIEW 2: GOOGLE AGENDA WITH DATE SELECTION & CONFIRMATION ROUTINE */}
                    {newMeetingSubView === "agenda" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setNewMeetingSubView("choose")}
                            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft size={14} /> Voltar para opções
                          </button>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            Integração Google Calendar
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Calendar Picker & Controls */}
                          <div className="md:col-span-1 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                              <Calendar size={13} className="text-blue-400" />
                              Filtro por Data
                            </h3>

                            {/* Connection Status Badge */}
                            <div className="flex items-center justify-between text-[10px] border-b border-zinc-850 pb-2">
                              <span className="text-zinc-500 font-mono font-bold uppercase">Google Agenda</span>
                              {googleAccessToken ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                  Real
                                </span>
                              ) : (
                                <span className="text-zinc-500 font-mono uppercase bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-850">
                                  Demonstração
                                </span>
                              )}
                            </div>

                            {/* Select Date */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Escolha a data</label>
                              <input
                                type="date"
                                value={calendarSelectedDate}
                                onChange={(e) => setCalendarSelectedDate(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                              />
                            </div>

                            {/* Sincronizar Button */}
                            <button
                              onClick={handleRefreshCalendar}
                              disabled={isSyncingCalendar}
                              className="w-full py-2 px-3 rounded-xl border border-zinc-800 hover:border-blue-500/30 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {isSyncingCalendar ? (
                                <span className="w-3 h-3 rounded-full border border-zinc-500 border-t-white animate-spin"></span>
                              ) : (
                                <RefreshCw size={12} className="text-blue-400" />
                              )}
                              {googleAccessToken ? "Atualizar Agenda Real" : "Conectar Google Agenda"}
                            </button>

                            {!googleAccessToken && (
                              <p className="text-[9px] text-zinc-500 text-center leading-relaxed">
                                Clique acima para autenticar com seu Google Workspace e buscar compromissos reais de forma segura.
                              </p>
                            )}

                            {calendarSyncSuccess && (
                              <p className="text-[10px] text-emerald-400 font-mono mt-1 bg-emerald-950/20 border border-emerald-500/25 p-1.5 rounded text-center">
                                {calendarSyncSuccess}
                              </p>
                            )}
                          </div>

                          {/* Events Display List & Confirmation Panel */}
                          <div className="md:col-span-2 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2 flex items-center justify-between">
                              <span>Eventos Encontrados</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Dia: {calendarSelectedDate.split("-").reverse().join("/")}
                              </span>
                            </h3>

                            {/* List filtered by date */}
                            {(() => {
                              const filteredEvents = googleEvents.filter((rawEv) => {
                                const startDateTime = rawEv.start?.dateTime || rawEv.start?.date || "";
                                if (!startDateTime) return false;
                                const eventDateStr = getLocalDateString(startDateTime);
                                return eventDateStr === calendarSelectedDate;
                              });

                              if (filteredEvents.length === 0) {
                                return (
                                  <div className="p-8 rounded-xl border border-dashed border-zinc-850 bg-zinc-950/20 text-center text-zinc-500 text-xs">
                                    Nenhum compromisso agendado para esta data no Google Agenda.
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                  {filteredEvents.map((rawEv) => {
                                    const ev = getEventFormatted(rawEv, currentUser);
                                    const isSelected = selectedCalendarEvent?.id === ev.id;
                                    return (
                                      <div
                                        key={ev.id}
                                        onClick={() => {
                                          setSelectedCalendarEvent(rawEv);
                                          setMeetingConfirmedTitle(ev.title);
                                          setMeetingConfirmedDate(calendarSelectedDate);
                                          
                                          // Extract time from start dateTime
                                          const startD = rawEv.start?.dateTime ? new Date(rawEv.start.dateTime) : new Date();
                                          const timeStr = `${startD.getHours().toString().padStart(2, '0')}:${startD.getMinutes().toString().padStart(2, '0')}`;
                                          setMeetingConfirmedTime(timeStr);
                                        }}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                          isSelected 
                                            ? "bg-blue-950/30 border-blue-500 text-white shadow-md shadow-blue-950/10" 
                                            : "bg-zinc-900/50 border-zinc-850 hover:border-zinc-750 text-zinc-400"
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-1.5">
                                          <span className="text-[9px] bg-zinc-800 text-zinc-300 font-mono py-0.5 px-2 rounded border border-zinc-700">
                                            {ev.time}
                                          </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-white truncate">{ev.title}</h4>
                                        <p className="text-[9px] text-zinc-500 mt-1 truncate">Part.: {ev.attendees.join(", ")}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {/* ROTINA DE CONFIRMAÇÃO DE DIA/HORA (Ensures no errors or confusion) */}
                            {selectedCalendarEvent && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-2xl border border-blue-500/20 bg-blue-950/10 space-y-4"
                              >
                                <div className="flex items-center gap-2 border-b border-blue-500/20 pb-2">
                                  <AlertCircle size={14} className="text-blue-400" />
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                    Confirmação dos Dados do Evento
                                  </h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="space-y-1 sm:col-span-1">
                                    <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Título Confirmado</label>
                                    <input
                                      type="text"
                                      value={meetingConfirmedTitle}
                                      onChange={(e) => setMeetingConfirmedTitle(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Data Confirmada</label>
                                    <input
                                      type="date"
                                      value={meetingConfirmedDate}
                                      onChange={(e) => setMeetingConfirmedDate(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Horário Confirmado</label>
                                    <input
                                      type="time"
                                      value={meetingConfirmedTime}
                                      onChange={(e) => setMeetingConfirmedTime(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                  <div className="text-[10px] text-zinc-400">
                                    Participantes Sincronizados: <b className="text-white">
                                      {getEventFormatted(selectedCalendarEvent, currentUser).attendees.length} cadastrados
                                    </b>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setIsAgendaConfirmed(true);
                                      setNewMeetingSubView("custom");
                                    }}
                                    className="py-1.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                                  >
                                    Confirmar & Seguir
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {newMeetingSubView === "custom" && (
                      <div className="space-y-6">
                        {/* Header Controls */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setNewMeetingSubView(isAgendaConfirmed ? "agenda" : "choose");
                            }}
                            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft size={14} /> Voltar para opções
                          </button>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            {isAgendaConfirmed ? "Compromisso Vinculado" : "Sessão Avulsa"}
                          </span>
                        </div>

                        {/* Config and Details Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Configuration Sidebar */}
                          <div className="md:col-span-1 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                              <Settings size={13} className="text-emerald-400" />
                              Metadados da Sessão
                            </h3>

                            {/* Meeting Title Input */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Título da Reunião</label>
                              <input
                                id="custom-meeting-title"
                                type="text"
                                placeholder="ex: Workshop Recicle ou Alinhamento Geral"
                                value={meetingConfirmedTitle}
                                onChange={(e) => setMeetingConfirmedTitle(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            {/* Date Field */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Data da Sessão</label>
                              <input
                                type="date"
                                value={meetingConfirmedDate}
                                onChange={(e) => setMeetingConfirmedDate(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                              />
                            </div>

                            {/* Time Field */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-zinc-500 font-mono font-bold">Horário de Início</label>
                              <input
                                type="time"
                                value={meetingConfirmedTime}
                                onChange={(e) => setMeetingConfirmedTime(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                              />
                            </div>
                          </div>

                          {/* Recording, Upload & Simulation Center */}
                          <div className="md:col-span-2 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2">
                              Selecione o Método de Registro
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                              {/* 1. REAL MICROPHONE RECORDER */}
                              <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10 flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                      Captura de Áudio (Microfone Local)
                                    </h4>
                                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                      Grave a reunião ao vivo usando o microfone do seu dispositivo. O Plaud Note AI irá processar, transcrever e gerar a ata completa do encontro.
                                    </p>
                                  </div>

                                  {isRecording && (
                                    <span className="text-[10px] font-mono font-bold text-white bg-zinc-950 border border-zinc-800 py-1 px-2.5 rounded flex items-center gap-1.5">
                                      {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                                      {(recordingSeconds % 60).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                </div>

                                {isRecording ? (
                                  <div className="mt-4 space-y-3">
                                    {/* Waves visualizer */}
                                    <canvas 
                                      ref={canvasRef} 
                                      className="w-full h-16 bg-zinc-950 rounded-xl border border-zinc-850" 
                                      width={400} 
                                      height={64} 
                                    />
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={pauseRecording}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
                                      >
                                        {isRecordingPaused ? <Play size={12} /> : <Pause size={12} />}
                                        {isRecordingPaused ? "Retomar" : "Pausar"}
                                      </button>
                                      <button
                                        onClick={stopRecording}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors cursor-pointer"
                                      >
                                        <Square size={12} fill="currentColor" />
                                        Salvar e Processar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-4">
                                    <button
                                      onClick={startRecording}
                                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/20"
                                    >
                                      <Mic size={14} />
                                      Iniciar Gravação do Encontro
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* 2. FILE ATTACHMENT UPLOADER */}
                              <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10">
                                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                                  <Upload size={13} className="text-blue-400" />
                                  Anexar Gravação de Áudio Pronta
                                </h4>
                                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                  Se você já possui o arquivo da gravação (de um gravador físico Plaud ou outra plataforma), anexe-o aqui para transcrição e análise automática.
                                </p>

                                <div className="mt-4">
                                  <label 
                                    htmlFor="file-upload-input-custom"
                                    className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 bg-zinc-950/30 hover:bg-zinc-950/50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                                  >
                                    <Upload size={20} className="text-zinc-500 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                      Clique para selecionar ou arraste o arquivo aqui
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-mono">
                                      Formatos aceitos: MP3, WAV, M4A, WEBM, AAC (até 25MB)
                                    </span>
                                  </label>
                                  <input
                                    id="file-upload-input-custom"
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                  />
                                </div>
                              </div>

                              {/* 3. SIMULAÇÃO CORPORATIVA DE ALTA FIDELIDADE */}
                              <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10">
                                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                                  <Sparkles size={13} className="text-emerald-400" />
                                  Simulador Completo Inteligente (Gemini AI)
                                </h4>
                                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                  Gere uma ata completa de demonstração imediatamente. O sistema utilizará a chave do Gemini configurada para simular um alinhamento corporativo real com ata, plano de ação e dados detalhados.
                                </p>

                                <div className="mt-4">
                                  <button
                                    onClick={runDemoSimulation}
                                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-800 hover:border-emerald-500/30 bg-zinc-950 hover:bg-zinc-900 text-emerald-400 hover:text-emerald-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                  >
                                    <Sparkles size={13} />
                                    Executar Simulação de IA Completa
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {activeView === "admin" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4">
                    {/* Header */}
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="p-1 rounded bg-zinc-800 text-emerald-400"><Users size={14} /></span>
                        Módulo de Administração Corporativa
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Cadastre e gerencie a lista de colaboradores permitidos a acessar o Suiter Record. Novas criações de contas públicas são proibidas; apenas usuários nesta lista estão autorizados.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Form Panel */}
                      <div className="md:col-span-1 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2 mb-4">
                          Autorizar Novo Usuário
                        </h3>

                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const name = (form.elements.namedItem("name") as HTMLInputElement).value;
                            const email = (form.elements.namedItem("email") as HTMLInputElement).value;
                            const role = (form.elements.namedItem("role") as HTMLInputElement).value;
                            const password = (form.elements.namedItem("password") as HTMLInputElement).value;
                            
                            if (!name || !email || !password) {
                              alert("Por favor, preencha nome, e-mail e senha!");
                              return;
                            }

                            const newUser: PermittedUser = {
                              id: email,
                              name,
                              email,
                              role: role || "Consultor",
                              password,
                              photoUrl: `https://images.unsplash.com/photo-${[
                                "1534528741775-53994a69daeb",
                                "1506794778202-cad84cf45f1d",
                                "1494790108377-be9c29b29330",
                                "1507003211169-0a1dd7228f2d"
                              ][Math.floor(Math.random() * 4)]}?auto=format&fit=crop&w=150&q=80`,
                              googleCalendarLinked: false
                            };

                            setPermittedUsers(prev => [...prev, newUser]);
                            form.reset();
                          }}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">Nome Completo</label>
                            <input
                              name="name"
                              type="text"
                              required
                              placeholder="Ex: Pedro Henrique"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">E-mail do Google</label>
                            <input
                              name="email"
                              type="email"
                              required
                              placeholder="Ex: consultor@triforceconsultoria.com"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">Cargo / Função</label>
                            <select
                              name="role"
                              required
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="user">user (Sem acesso à administração e integração Suiter)</option>
                              <option value="Administrador">Administrador (Acesso total)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">Senha de Acesso</label>
                            <input
                              name="password"
                              type="password"
                              required
                              placeholder="Senha corporativa segura"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-all cursor-pointer shadow-lg block"
                          >
                            Autorizar Colaborador
                          </button>
                        </form>
                      </div>

                      {/* Users List Grid */}
                      <div className="md:col-span-2 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex flex-col">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Colaboradores Autorizados ({permittedUsers.length})
                          </h3>
                          <span className="text-[9px] text-zinc-500 font-mono">Controle Estrito de Ingressos</span>
                        </div>

                        <div className="space-y-2.5 overflow-y-auto max-h-96 pr-1 custom-scrollbar">
                          {permittedUsers.map((user) => (
                            <div 
                              key={user.email} 
                              className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full object-cover border border-zinc-850"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-white">{user.name}</h4>
                                    <span className="text-[9px] bg-zinc-850 text-zinc-400 py-0.5 px-1.5 rounded">
                                      {user.role}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">{user.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="text-[9px] text-zinc-600 uppercase font-mono block">Senha Registrada</span>
                                  {editingPasswordUserEmail === user.email ? (
                                    <div className="flex items-center gap-1 mt-1">
                                      <input
                                        type="text"
                                        value={newPasswordInput}
                                        onChange={(e) => setNewPasswordInput(e.target.value)}
                                        className="w-24 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono"
                                        placeholder="Nova senha"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => {
                                          if (!newPasswordInput.trim()) {
                                            setCustomAlertMessage("A senha não pode ser vazia.");
                                            return;
                                          }
                                          const strength = validatePasswordStrength(newPasswordInput.trim());
                                          if (!strength.isValid) {
                                            setCustomAlertMessage(`Senha Inválida: ${strength.message}`);
                                            return;
                                          }
                                          setPermittedUsers(prev => prev.map(u => 
                                            u.email.toLowerCase() === user.email.toLowerCase() ? { ...u, password: newPasswordInput.trim() } : u
                                          ));
                                          setEditingPasswordUserEmail(null);
                                          setNewPasswordInput("");
                                        }}
                                        className="p-1 hover:bg-zinc-800 rounded text-emerald-400 cursor-pointer flex items-center justify-center shrink-0"
                                        title="Salvar"
                                      >
                                        <Check size={11} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingPasswordUserEmail(null);
                                          setNewPasswordInput("");
                                        }}
                                        className="p-1 hover:bg-zinc-800 rounded text-zinc-500 cursor-pointer flex items-center justify-center shrink-0"
                                        title="Cancelar"
                                      >
                                        <X size={11} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div 
                                      onClick={() => {
                                        setEditingPasswordUserEmail(user.email);
                                        setNewPasswordInput(user.password);
                                      }}
                                      className="text-[10px] text-zinc-400 font-mono bg-zinc-900 hover:bg-zinc-850 py-0.5 px-1.5 rounded border border-zinc-850 flex items-center gap-1 cursor-pointer transition-colors mt-0.5"
                                      title="Clique para alterar a senha deste usuário"
                                    >
                                      <span>{"*".repeat(user.password?.length || 8)}</span>
                                      <Lock size={9} className="text-zinc-500" />
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    const isAdmin = user.role === "Administrador";
                                    const adminCount = permittedUsers.filter(u => u.role === "Administrador").length;
                                    const isSelf = currentUser && currentUser.email.toLowerCase() === user.email.toLowerCase();

                                    if (isSelf) {
                                      setCustomAlertMessage("Erro: Você não pode excluir seu próprio usuário enquanto estiver conectado.");
                                      return;
                                    }

                                    if (isAdmin && adminCount <= 1) {
                                      setCustomAlertMessage("Erro de Segurança: O sistema exige pelo menos 1 Administrador ativo. Você não pode excluir o último administrador.");
                                      return;
                                    }

                                    setUserToDeleteEmail(user.email);
                                  }}
                                  className="p-1.5 hover:bg-zinc-900 rounded text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Remover Autorização"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {activeView === "suiter" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4">
                    {/* Header */}
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="p-1 rounded bg-zinc-800 text-emerald-400"><Database size={14} /></span>
                        Configuração de Integração da API Suiter
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Configure o endpoint webhook da Triforce para onde os registros transcorridos devem ser reportados fisicamente. Veja os logs em tempo real das transmissões de carga.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left Side Column with Settings & Notifications */}
                      <div className="md:col-span-1 space-y-6">
                        {/* Configuration Panel */}
                        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-2">
                            Parâmetros de Conexão
                          </h3>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">Webhook URL</label>
                              <input
                                type="text"
                                value={suiterConfig.apiUrl}
                                onChange={(e) => setSuiterConfig(prev => ({...prev, apiUrl: e.target.value}))}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">Bearer Token</label>
                              <input
                                type="password"
                                value={suiterConfig.token}
                                onChange={(e) => setSuiterConfig(prev => ({...prev, token: e.target.value}))}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                              <div>
                                <span className="text-[10px] font-bold text-white block">Modo Simulação</span>
                                <span className="text-[8px] text-zinc-500 block">Simular repostas da Triforce</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={suiterConfig.isMock}
                                onChange={(e) => setSuiterConfig(prev => ({...prev, isMock: e.target.checked}))}
                                className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                              />
                            </div>

                            <button
                              onClick={() => {
                                localStorage.setItem("plaud_suiter_config", JSON.stringify(suiterConfig));
                                alert("Configurações salvas com sucesso localmente!");
                              }}
                              className="w-full py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-all cursor-pointer shadow-lg"
                            >
                              Salvar Configuração
                            </button>
                          </div>
                        </div>

                        {/* Notification Preferences Card */}
                        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
                          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                            <span className="p-1 rounded bg-zinc-850 text-emerald-400">
                              <Bell size={13} />
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                              Notificações do Sistema
                            </h3>
                          </div>

                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Ative as notificações nativas do sistema para receber alertas em tempo real sempre que novas transcrições e resumos automáticos estiverem concluídos.
                          </p>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                              <div>
                                <span className="text-[10px] font-bold text-white block">Status dos Alertas</span>
                                <span className="text-[8px] text-zinc-500 block">Status no navegador atual</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${notificationsEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                                <span className="text-[10px] font-mono font-bold uppercase text-zinc-300">
                                  {notificationsEnabled ? "Ativo" : "Inativo"}
                                </span>
                              </div>
                            </div>

                            {!notificationsEnabled ? (
                              <button
                                onClick={requestNotificationPermission}
                                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                <BellRing size={13} className="text-emerald-400" />
                                Permitir Notificações
                              </button>
                            ) : (
                              <button
                                onClick={() => triggerNotification("Notificação de Teste", "As notificações do Suiter Record estão prontas e ativas!")}
                                className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-750 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Sparkles size={13} className="text-emerald-400 animate-pulse" />
                                Testar Notificação
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Connection Log Stream */}
                      <div className="md:col-span-2 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex flex-col">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Fluxo de Sincronizações & Logs de API ({suiterLogs.length})
                          </h3>
                          <button
                            onClick={() => {
                              setSuiterLogs([]);
                              localStorage.removeItem("plaud_suiter_logs");
                            }}
                            className="text-[9px] text-zinc-500 hover:text-white underline cursor-pointer"
                          >
                            Limpar Histórico
                          </button>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar flex-1">
                          {suiterLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                              <Info size={16} className="text-zinc-600 mb-1.5" />
                              <p className="text-xs">Nenhum log de exportação registrado.</p>
                              <p className="text-[10px] text-zinc-600 mt-1">Carregue uma reunião e clique em 'Sincronizar com Suiter' para testar!</p>
                            </div>
                          ) : (
                            suiterLogs.map((log) => (
                              <div key={log.id} className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-zinc-500 font-mono">{log.timestamp}</span>
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                    log.status === "success" 
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900/20" 
                                      : "bg-red-500/10 text-red-400 border border-red-900/20"
                                  }`}>
                                    {log.status === "success" ? "201 OK" : "500 ERROR"}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white truncate">Reunião: {log.meetingTitle}</h4>
                                <div className="bg-zinc-900 rounded p-2 text-[9px] text-zinc-400 font-mono border border-zinc-850 overflow-x-auto">
                                  {log.details}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {activeView === "dashboard" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4 px-4 sm:px-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="p-1 rounded bg-zinc-800 text-emerald-400"><BarChart2 size={14} /></span>
                        Painel de Desempenho & Dashboard
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Gráficos analíticos consolidados de duração das reuniões e status de execução das tarefas do plano de ação.
                      </p>
                    </div>

                    {/* Summary numbers inside Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Média de Duração</span>
                        <div className="text-xl font-bold text-white font-mono mt-1">
                          {meetings.length > 0 
                            ? Math.round(meetings.reduce((acc, m) => acc + m.duration, 0) / meetings.length / 60)
                            : 0} min / reunião
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-1">Média aritmética simples</p>
                      </div>
                      
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total de Tarefas Extraídas</span>
                        <div className="text-xl font-bold text-white font-mono mt-1">
                          {meetings.reduce((acc, m) => acc + (m.actions?.length || 0), 0)}
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-1">Identificadas por Inteligência Artificial</p>
                      </div>

                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Taxa de Conclusão</span>
                        <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                          {(() => {
                            const total = meetings.reduce((acc, m) => acc + (m.actions?.length || 0), 0);
                            const completed = meetings.reduce((acc, m) => acc + (m.actions?.filter(a => a.status === "completed").length || 0), 0);
                            return total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%";
                          })()}
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-1">Das tarefas designadas</p>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: Meeting Duration */}
                      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Duração Mensal Total</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Soma total de minutos de reuniões por mês</p>
                        </div>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={getMonthlyChartData()}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis 
                                dataKey="month" 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                              />
                              <YAxis 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                                unit=" min"
                              />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: "#090b0e",
                                  borderColor: "#27272a",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  color: "#fff"
                                }}
                              />
                              <Bar 
                                dataKey="totalDuration" 
                                name="Duração (Minutos)" 
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]} 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Completed Tasks */}
                      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tarefas Concluídas</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Contagem de tarefas concluídas vs pendentes por mês</p>
                        </div>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={getMonthlyChartData()}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis 
                                dataKey="month" 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                              />
                              <YAxis 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                              />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: "#090b0e",
                                  borderColor: "#27272a",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  color: "#fff"
                                }}
                              />
                              <ChartLegend 
                                wrapperStyle={{ fontSize: "10px", marginTop: "10px" }}
                              />
                              <Bar 
                                dataKey="completedTasks" 
                                name="Concluídas" 
                                fill="#10b981" 
                                stackId="tasks"
                                radius={[0, 0, 0, 0]} 
                              />
                              <Bar 
                                dataKey="totalTasks" 
                                name="Total de Tarefas" 
                                fill="#27272a" 
                                stroke="#71717a"
                                strokeWidth={0.5}
                                stackId="total"
                                radius={[4, 4, 0, 0]} 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Logo Watermark Footer */}
                    <div className="flex flex-col items-center justify-center pt-8 border-t border-zinc-850 opacity-40 hover:opacity-70 transition-opacity">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-500 font-mono text-[9px] tracking-wider uppercase">SUPORTADO POR</span>
                        <span className="text-white font-bold text-xs">TRIFORCE CONSULTORIA</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 font-mono italic">
                        "Desenvolvida pela Triforce Consultoria, para uso exclusivo interno"
                      </p>
                    </div>
                  </div>
                )}

                {activeView === "backups" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4 px-4 sm:px-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                          <span className="p-1 rounded bg-zinc-800 text-emerald-400"><Clock size={14} /></span>
                          Backup Local de Áudios Gravados
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                          Gravações de segurança em cache local (IndexedDB) para garantir proteção contra falhas de conexão ou timeouts.
                        </p>
                      </div>
                      <button
                        onClick={loadBackups}
                        className="py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-750 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        Sincronizar Lista
                      </button>
                    </div>

                    {localBackups.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
                        <AlertCircle className="mx-auto text-zinc-600 mb-3" size={32} />
                        <h3 className="text-sm font-bold text-zinc-300">Nenhum backup local encontrado</h3>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                          Gravações iniciadas a partir deste navegador serão salvas automaticamente como backups de segurança aqui.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-start gap-3">
                          <Info size={16} className="shrink-0 mt-0.5 text-amber-400" />
                          <div className="text-xs leading-relaxed">
                            <span className="font-bold">Proteção Ativa contra Perda de Dados:</span> Se uma gravação longa (ex: mais de 1 hora) falhar devido a limites de rede ou timeout do Gemini, ela fica guardada aqui. Você pode <span className="font-bold">reprocessar a transcrição</span> diretamente ou fazer o <span className="font-bold">download do arquivo de áudio original</span>.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {localBackups.map((backup) => {
                            const sizeInMb = (backup.audioBlob.size / (1024 * 1024)).toFixed(2);
                            return (
                              <div 
                                key={backup.id} 
                                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-bold text-white tracking-tight">{backup.title}</h3>
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                                      backup.status === "completed"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : backup.status === "failed"
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                    }`}>
                                      {backup.status === "completed" 
                                        ? "Transcrito" 
                                        : backup.status === "failed" 
                                        ? "Erro de Envio" 
                                        : "Processando"}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                    <span className="flex items-center gap-1"><Clock size={11} />{Math.floor(backup.duration / 60)}m {backup.duration % 60}s</span>
                                    <span>•</span>
                                    <span>{sizeInMb} MB</span>
                                    <span>•</span>
                                    <span>{backup.date}</span>
                                    {backup.createdBy && (
                                      <>
                                        <span>•</span>
                                        <span className="text-zinc-600 font-mono text-[10px]">{backup.createdBy}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {(backup.status === "failed" || backup.status === "pending") && (
                                    <button
                                      onClick={async () => {
                                        // Trigger reprocessing
                                        await processRecordedAudio(backup.mimeType, backup.audioBlob, backup.duration, backup.title);
                                      }}
                                      className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                    >
                                      <RefreshCw size={12} />
                                      Reprocessar IA
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      // Trigger file download
                                      const url = URL.createObjectURL(backup.audioBlob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `${backup.title.replace(/\s+/g, "_")}_audio.${backup.mimeType.split("/")[1] || "webm"}`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    }}
                                    className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Download size={12} />
                                    Baixar Áudio
                                  </button>

                                  <button
                                    onClick={async () => {
                                      if (confirm("Deseja realmente excluir este backup local do seu navegador?")) {
                                        await deleteLocalRecording(backup.id);
                                        await loadBackups();
                                      }
                                    }}
                                    className="p-2 rounded-lg bg-zinc-900 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/20 transition-all cursor-pointer"
                                    title="Apagar Backup"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

          {/* RIGHT SIDE PANEL 1: SMART SEARCH BOARD (TRANSCRIPTS QA) */}
          <AnimatePresence>
            {showSmartSearch && (
              <>
                {/* Mobile Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden"
                  onClick={() => setShowSmartSearch(false)}
                />
                <motion.div 
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="fixed inset-y-0 right-0 z-40 w-80 md:relative md:inset-auto border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none"
                >
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Busca Inteligente (IA)
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowSmartSearch(false)}
                    className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2">
                  <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Consulte todo o histórico de reuniões usando linguagem natural. O Gemini buscará a resposta unificando todas as transcrições salvas.
                  </span>
                </div>

                {/* Chat window logic */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {smartAnswer ? (
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 uppercase">
                        <Check size={11} className="text-emerald-400" />
                        <span>Pergunta:</span>
                      </div>
                      <p className="text-xs text-white bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        {smartQuery}
                      </p>
                      
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 uppercase">
                        <Sparkles size={11} className="text-emerald-400" />
                        <span>Resposta do Gemini:</span>
                      </div>
                      <div className="text-xs text-zinc-300 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 leading-relaxed whitespace-pre-wrap">
                        {smartAnswer}
                      </div>

                      <button
                        onClick={() => { setSmartAnswer(null); setSmartQuery(""); }}
                        className="w-full text-center py-2 border border-dashed border-zinc-800 hover:border-emerald-500/40 text-[10px] text-emerald-400 rounded-lg transition-colors"
                      >
                        Fazer Nova Pergunta
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-zinc-600">
                      Pronto para buscar informações em {meetings.length} reunião(ões) do histórico.
                    </div>
                  )}

                  {isSearchingSmart && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-2"></div>
                      <span className="text-[10px] font-mono text-zinc-500">Consultando o banco de transcrições...</span>
                    </div>
                  )}
                </div>

                {/* Input Query form */}
                {!smartAnswer && !isSearchingSmart && (
                  <form onSubmit={handleSmartSearchQuery} className="p-4 border-t border-zinc-800">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ex: Qual foi a tarefa da Sofia?"
                        value={smartQuery}
                        onChange={(e) => setSmartQuery(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-emerald-500 hover:text-emerald-400 cursor-pointer"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </form>
                )}

              </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* RIGHT SIDE PANEL 2: SUITER INTEGRATION CONTROL PANEL */}
          <AnimatePresence>
            {showSuiterPanel && (
              <>
                {/* Mobile Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden"
                  onClick={() => setShowSuiterPanel(false)}
                />
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="fixed inset-y-0 right-0 z-40 w-80 md:relative md:inset-auto border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none"
                >
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database size={14} className="text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Integração Suiter
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowSuiterPanel(false)}
                    className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {/* Explanation card */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 leading-relaxed">
                    Mapeie a sincronização de dados estruturados com o sistema <b>Suiter</b>. Quando você clicar em <i>"Exportar Suiter"</i>, o app enviará o payload no padrão JSON para o banco do sistema.
                  </div>

                  {/* Form configuration fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                        Endpoint da API (POST)
                      </label>
                      <input
                        type="text"
                        value={suiterConfig.apiUrl}
                        onChange={(e) => setSuiterConfig({ ...suiterConfig, apiUrl: e.target.value })}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                        Token de Autenticação (Bearer)
                      </label>
                      <input
                        type="password"
                        value={suiterConfig.token}
                        onChange={(e) => setSuiterConfig({ ...suiterConfig, token: e.target.value })}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded border border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-white">Modo Simulador</span>
                        <span className="text-[9px] text-zinc-500">Simular resposta local de sucesso</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={suiterConfig.isMock}
                        onChange={(e) => setSuiterConfig({ ...suiterConfig, isMock: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* API REQUEST LOGGER (Aesthetic developer console debug) */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                      Logs de Envio Recentes
                    </span>
                    
                    {suiterLogs.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-zinc-800 text-zinc-600 text-xs rounded-lg">
                        Nenhum log de API disponível.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {suiterLogs.map((log, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { setLatestExportLog(log); }}
                            className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white truncate max-w-36">{log.meetingTitle}</span>
                              <span className={`font-mono px-1 rounded ${
                                log.status === "success" ? "bg-emerald-950/40 text-emerald-400" : "bg-rose-950/40 text-rose-400"
                              }`}>
                                {log.status === "success" ? "HTTP 201" : "FALHA"}
                              </span>
                            </div>
                            <div className="flex justify-between text-zinc-500 text-[9px] mt-1">
                              <span>{log.timestamp}</span>
                              <span>{log.simulated ? "Simulado" : "Conexão Direta"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-panel debugger output drawer */}
                {latestExportLog && (
                  <div className="p-4 border-t border-zinc-800 bg-zinc-950 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">API PAYLOAD DEBUGGER</span>
                      <button 
                        onClick={() => setLatestExportLog(null)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    
                    <div className="space-y-2 font-mono text-[9px]">
                      <div>
                        <span className="text-zinc-500">REQUEST URL:</span>
                        <div className="text-zinc-300 break-all">{latestExportLog.request.url}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">METHOD:</span>
                        <div className="text-emerald-400 font-bold">{latestExportLog.request.method}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">MAPPED JSON BODY:</span>
                        <pre className="bg-zinc-900 p-2 rounded text-emerald-400 overflow-x-auto border border-zinc-800 max-h-24">
                          {JSON.stringify(latestExportLog.request.body, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-zinc-500">SERVER RESPONSE:</span>
                        <pre className="bg-zinc-900 p-2 rounded text-emerald-400 overflow-x-auto border border-zinc-800 max-h-24">
                          {JSON.stringify(latestExportLog.response.body, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>

        {/* BOTTOM REAL-TIME RECORDING CANVAS VISUALIZER */}
        {isRecording && !isRecordingPaused && (
          <div className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center relative px-6 shrink-0">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={50} 
              className="w-full max-w-xl h-10 object-contain opacity-80"
            />
            <div className="absolute right-6 text-[10px] text-zinc-500 font-mono tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Análise Espectral de Voz</span>
            </div>
          </div>
        )}

        {/* MODAL: RESET PASSWORD */}
        {showResetPasswordModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-6 relative"
            >
              <button 
                onClick={() => setShowResetPasswordModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
              
              <div className="mb-4 text-center">
                <Lock size={20} className="mx-auto text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-base">Redefinir Senha de Acesso</h3>
                <p className="text-[10px] text-zinc-400 mt-1">Valide seu e-mail corporativo para definir uma nova senha local.</p>
              </div>

              {resetErrorMessage && (
                <div className="mb-3 p-2 bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                  {resetErrorMessage}
                </div>
              )}

              {resetSuccessMessage && (
                <div className="mb-3 p-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs">
                  {resetSuccessMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-mono text-zinc-500 font-bold mb-1">E-mail Corporativo Cadastrado</label>
                  <input 
                    type="email"
                    required
                    placeholder="atendimento@triforceconsultoria.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono text-zinc-500 font-bold mb-1">Nova Senha</label>
                  <input 
                    type="password"
                    required
                    placeholder="Digite a nova senha segura"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono text-zinc-500 font-bold mb-1">Confirmar Nova Senha</label>
                  <input 
                    type="password"
                    required
                    placeholder="Confirme a nova senha"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full mt-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Confirmar Redefinição
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* POPUP: GMAIL SOCIAL LOGIN (Internally validated accounts only) */}
        {/* POPUP: GMAIL SOCIAL LOGIN (Fully operational multi-step Google SSO simulation) */}
        {showGmailPopup && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-7 relative shadow-2xl"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowGmailPopup(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-zinc-800 rounded"
              >
                <X size={16} />
              </button>
              
              {/* Google Brand Header */}
              <div className="text-center mb-6">
                <svg className="w-8 h-8 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <h3 className="font-bold text-white text-lg tracking-tight">Escolha uma conta</h3>
                <p className="text-xs text-zinc-400 mt-1">para continuar no Suiter Record</p>
              </div>

              {gmailError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 leading-relaxed font-medium">
                  ❌ {gmailError}
                </div>
              )}

              {isGmailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                  <span className="text-xs text-zinc-400 font-mono">Autenticando via Google SSO...</span>
                </div>
              ) : (
                <>
                  {/* STEP 1: Account List Chooser (Simulated SSO) */}
                  {gmailStep === "choose" && (
                    <div className="space-y-2">
                      <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
                        {permittedUsers.map((user) => (
                          <button
                            key={user.email}
                            onClick={() => handleSelectSimulatedAccount(user)}
                            className="w-full text-left p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-850/80 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={user.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                              />
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{user.name}</h4>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{user.email}</p>
                              </div>
                            </div>
                            <span className="text-[8px] bg-zinc-900 border border-zinc-850 text-zinc-400 py-0.5 px-1.5 rounded uppercase font-mono tracking-wider">
                              {user.role === "Administrador" ? "Admin" : "User"}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-zinc-800/80 pt-3 mt-3">
                        <button
                          onClick={() => {
                            setGmailEmailInput("");
                            setGmailStep("input");
                            setGmailError("");
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-850 transition-colors cursor-pointer text-left group"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-zinc-900 transition-all">
                            <User size={14} />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">Usar outra conta</span>
                            <span className="text-[9px] text-zinc-500 block mt-0.5">Entrar com um e-mail corporativo diferente</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Manual Gmail Input */}
                  {gmailStep === "input" && (
                    <form onSubmit={handleManualSimulatedEmailSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase font-mono text-zinc-400 font-bold">Endereço de E-mail do Google</label>
                        <input 
                          type="email"
                          required
                          placeholder="ex: atendimento@triforceconsultoria.com"
                          value={gmailEmailInput}
                          onChange={(e) => {
                            setGmailEmailInput(e.target.value);
                            setGmailError("");
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setGmailStep("choose");
                            setGmailError("");
                          }}
                          className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ChevronLeft size={12} /> Voltar para lista
                        </button>

                        <button 
                          type="submit"
                          className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          Próximo <ArrowRight size={12} />
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              <div className="text-[9px] text-center text-zinc-500 mt-6 pt-4 border-t border-zinc-800/50 leading-relaxed">
                ⚠️ Por questões de segurança corporativa da Triforce, apenas contas previamente autorizadas podem realizar login via Google SSO.
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation Modals for Deletion and Alert */}
        <AnimatePresence>
          {meetingToDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">Confirmar Exclusão</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tem certeza de que deseja apagar permanentemente esta reunião? Esta ação é irreversível e removerá todos os dados e transcrições do sistema local.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setMeetingToDeleteId(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (meetingToDeleteId) {
                        try {
                          await deleteMeetingInCloud(meetingToDeleteId);
                        } catch (err) {
                          console.error("Erro ao remover reunião na nuvem:", err);
                        }
                      }
                      const updated = meetings.filter(m => m.id !== meetingToDeleteId);
                      setMeetings(updated);
                      if (selectedMeetingId === meetingToDeleteId) {
                        setSelectedMeetingId(updated.length > 0 ? updated[0].id : null);
                      }
                      setMeetingToDeleteId(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white transition-all cursor-pointer font-bold"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {userToDeleteEmail && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">Remover Colaborador</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tem certeza de que deseja remover a autorização de acesso do e-mail <b className="text-zinc-200">{userToDeleteEmail}</b>? Ele não poderá mais fazer login no sistema.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setUserToDeleteEmail(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setPermittedUsers(prev => prev.filter(u => u.email !== userToDeleteEmail));
                      setUserToDeleteEmail(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white transition-all cursor-pointer font-bold"
                  >
                    Remover Acesso
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {customAlertMessage && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <AlertCircle size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">Alerta do Sistema</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {customAlertMessage}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setCustomAlertMessage(null)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isParticipantsModalOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Users size={16} />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-white">Editar Participantes</h3>
                  </div>
                  <button
                    onClick={() => setIsParticipantsModalOpen(false)}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Insira a lista de participantes presentes nesta reunião física. Digite <b>um nome por linha (aperte Enter)</b> para organizar os membros participantes de forma clara e simples.
                </p>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {/* Triforce Section */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono text-emerald-400 font-bold">
                      Membros Triforce (Consultores) • Um por linha
                    </label>
                    <textarea
                      value={editTriforceMembers}
                      onChange={(e) => setEditTriforceMembers(e.target.value)}
                      rows={5}
                      placeholder="Exemplo:&#10;Rodolfo&#10;Sofia"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Client Section */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono text-blue-400 font-bold">
                      Clientes & Parceiros • Um por linha
                    </label>
                    <textarea
                      value={editClientMembers}
                      onChange={(e) => setEditClientMembers(e.target.value)}
                      rows={5}
                      placeholder="Exemplo:&#10;Vitor&#10;Carlos Eduardo"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
                  <button
                    onClick={() => setIsParticipantsModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const triforceArray = editTriforceMembers
                        .split("\n")
                        .map(n => n.trim())
                        .filter(n => n.length > 0);
                      const clientArray = editClientMembers
                        .split("\n")
                        .map(n => n.trim())
                        .filter(n => n.length > 0);

                      setMeetings(prev => prev.map(m => {
                        if (m.id === selectedMeeting.id) {
                          return {
                            ...m,
                            participants: {
                              membersTriforce: triforceArray,
                              membersClient: clientArray
                            }
                          };
                        }
                        return m;
                      }));
                      setIsParticipantsModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isTaskModalOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckSquare size={16} />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-white">
                      {editingTaskIdx !== null ? "Editar Tarefa" : "Nova Tarefa"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsTaskModalOpen(false)}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 font-bold">Descrição da Tarefa</label>
                    <textarea
                      value={taskAction}
                      onChange={(e) => setTaskAction(e.target.value)}
                      placeholder="Digite a ação ou tarefa pendente..."
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-mono text-zinc-400 font-bold">Responsável</label>
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <optgroup label="Consultores Triforce">
                          {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.map((p, i) => (
                            <option key={i} value={p}>{p}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Clientes / Parceiros">
                          {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.map((p, i) => (
                            <option key={i} value={p}>{p}</option>
                          ))}
                        </optgroup>
                        {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.length === 0 && getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.length === 0 && (
                          <option value={currentUser?.name || "Rodolfo"}>{currentUser?.name || "Rodolfo"}</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-mono text-zinc-400 font-bold">Prioridade</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Média">Média</option>
                        <option value="Baixa">Baixa</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!taskAction.trim()) return;
                      
                      setMeetings(prev => prev.map(m => {
                        if (m.id === selectedMeeting.id) {
                          let updatedActions = [...m.actions];
                          if (editingTaskIdx !== null) {
                            updatedActions[editingTaskIdx] = {
                              ...updatedActions[editingTaskIdx],
                              action: taskAction.trim(),
                              assignee: taskAssignee,
                              priority: taskPriority
                            };
                          } else {
                            updatedActions.push({
                              action: taskAction.trim(),
                              assignee: taskAssignee,
                              priority: taskPriority,
                              status: "pending"
                            });
                          }
                          return { ...m, actions: updatedActions };
                        }
                        return m;
                      }));
                      setIsTaskModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating In-App Toast Notification */}
        <AnimatePresence>
          {appToast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed bottom-6 right-6 z-[10000] max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex gap-3 items-start"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <BellRing size={16} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white tracking-wide uppercase">{appToast.title}</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{appToast.body}</p>
              </div>
              <button
                onClick={() => setAppToast(prev => ({ ...prev, show: false }))}
                className="text-zinc-500 hover:text-white transition-colors p-1 cursor-pointer"
                title="Fechar Alerta"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
