import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, Square, Pause, Play, Upload, Search, FileText, Sparkles, 
  Plus, Trash2, Settings, Send, Database, Download, CheckSquare, 
  Tag, ChevronRight, ChevronLeft, Info, X, Activity, Check, RefreshCw, AlertCircle,
  Menu, Lock, User, LogOut, Calendar, Users, Shield, Edit2, Clock,
  BarChart2, Eye, EyeOff, Bell, BellRing, HardDrive
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import triforceLogo from "./assets/brand/alfredo-symbol-white-512.png";
import { Meeting, IntegrationConfig, IntegrationLog, PermittedUser, GoogleCalendarEvent } from "./types";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import DashboardView from "./DashboardView";
import MobileBottomNav from "./MobileBottomNav";
import MobileMoreSheet from "./MobileMoreSheet";
import {
  saveMeetingInCloud,
  deleteMeetingInCloud,
  loadMeetingsFromCloud,
  savePermittedUserInCloud,
  deletePermittedUserFromCloud,
  loadPermittedUsersFromCloud,
  saveIntegrationConfigInCloud,
  loadIntegrationConfigFromCloud,
  saveIntegrationLogsInCloud,
  loadIntegrationLogsFromCloud,
  signInWithEmail,
  signOutAuth,
  getAuthSessionProfile,
  isSupabaseConfigured,
  requestPasswordReset,
  updatePasswordAfterRecovery,
  onAuthStateChange,
  uploadAudioToStorage,
  uploadAudioChunkToStorage,
  createRecordingSession,
  confirmRecordingChunk,
  finishRecordingSession,
  getApiAuthHeaders,
  updateOwnProfileName,
  buildAudioStoragePath,
  deleteAudioFromStorage,
  listCloudAudioRecordings,
  downloadAudioFromStorage,
} from "./supabase";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getStoredGoogleAccessToken,
  clearStoredGoogleAccessToken,
  storeGoogleAccessToken,
  listGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  buildEventDateTimes,
} from "./googleCalendar";
import { apiUrl, assertApiConfigured, readApiJson } from "./api";
import type { LocalRecording } from "./indexedDb";
import {
  saveLocalRecording,
  getLocalRecordings,
  deleteLocalRecording,
  updateLocalRecordingStatus,
  saveRecordingChunk,
  getPendingRecordingChunks,
  getRecordingChunks,
  deleteRecordingChunks,
} from "./indexedDb";
import { prepareAudioForStorage, validateAudioFile } from "./audioProcessing";
import { PREVIEW_MODE, PREVIEW_USER, PREVIEW_MEETINGS } from "./previewData";

// Timezone-safe local date helper function
const getLocalDateString = (dateObj: Date | string) => {
  const d = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mimeFromStoragePath = (storagePath: string): string => {
  const ext = storagePath.split("?")[0].split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "mp3":
    case "mpeg":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "webm":
    default:
      return "audio/webm";
  }
};

const resolveMeetingStoragePath = (
  meeting?: Meeting | null,
  backup?: LocalRecording | null,
): string | undefined => {
  if (backup?.storagePath) return backup.storagePath;
  if (meeting?.audioStoragePath) return meeting.audioStoragePath;
  if (meeting?.audioRecordingId?.includes("/")) return meeting.audioRecordingId;
  if (meeting?.audioRecordingId?.startsWith("rec_") && meeting.createdBy) {
    return buildAudioStoragePath(meeting.createdBy, meeting.audioRecordingId, "audio/webm");
  }
  return undefined;
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
  const [isDbLoaded, setIsDbLoaded] = useState(PREVIEW_MODE);

  // DYNAMIC SYSTEM ACCOUNTS FOR ADMINISTRATION MODULE
  const [permittedUsers, setPermittedUsers] = useState<PermittedUser[]>([]);

  // AUTHENTICATION STATE — só sessão Auth válida (sem “login fantasma” via localStorage)
  const [isAuthenticated, setIsAuthenticated] = useState(PREVIEW_MODE);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
    photoUrl?: string;
  } | null>(PREVIEW_MODE ? { ...PREVIEW_USER } : null);

  // Login Form States
  const [authScreen, setAuthScreen] = useState<"landing" | "login">("landing");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");

  // GOOGLE CALENDAR ACCESS TOKEN
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // SIDEBAR COLLAPSE STATE
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // NEW MEETING SUB-VIEWS
  const [newMeetingSubView, setNewMeetingSubView] = useState<"choose" | "agenda" | "custom">("choose");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => getLocalDateString(new Date()));
  // Date and Time confirmation state
  const [meetingConfirmedDate, setMeetingConfirmedDate] = useState("");
  const [meetingConfirmedTime, setMeetingConfirmedTime] = useState("");
  const [meetingConfirmedTitle, setMeetingConfirmedTitle] = useState("");
  const [meetingInternalParticipants, setMeetingInternalParticipants] = useState("");
  const [meetingExternalParticipants, setMeetingExternalParticipants] = useState("");
  const [isAgendaConfirmed, setIsAgendaConfirmed] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [profileName, setProfileName] = useState("");

  // File upload / Recording progress states
  const [processingProgress, setProcessingProgress] = useState(0);

  // MOBILE RESPONSIVENESS STATES
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // CUSTOM IN-APP CONFIRMATION AND DIALOG STATES
  const [meetingToDeleteId, setMeetingToDeleteId] = useState<string | null>(null);
  const [userToDeleteEmail, setUserToDeleteEmail] = useState<string | null>(null);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);

  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  const persistAuthenticatedUser = (userPayload: {
    name: string;
    email: string;
    role: string;
    photoUrl?: string;
  }) => {
    setCurrentUser(userPayload);
    localStorage.setItem("plaud_authenticated", "true");
    localStorage.setItem("plaud_current_user", JSON.stringify(userPayload));
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setLoginSuccess("");
    setIsAuthenticated(true);
  };

  // AUTHENTICATION HANDLERS — login apenas (usuários pré-definidos)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");

    if (!isSupabaseConfigured) {
      setLoginError("Supabase Auth não está configurado neste ambiente.");
      return;
    }

    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    setIsLoginSubmitting(true);
    try {
      const profile = await signInWithEmail({ email, password });
      persistAuthenticatedUser(profile);
      setIsDbLoaded(false);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "E-mail ou senha inválidos."
      );
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoginError("");
    setLoginSuccess("");
    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setLoginError("Informe seu e-mail para receber o link de redefinição.");
      return;
    }
    setIsLoginSubmitting(true);
    try {
      await requestPasswordReset(email);
      setLoginSuccess(
        "Enviamos um e-mail para confirmar a troca de senha. Abra o link e defina a nova senha."
      );
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Não foi possível enviar o e-mail."
      );
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleRecoveryPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (recoveryPassword !== recoveryPasswordConfirm) {
      setLoginError("As senhas não coincidem.");
      return;
    }
    const strength = validatePasswordStrength(recoveryPassword);
    if (!strength.isValid) {
      setLoginError(strength.message);
      return;
    }
    setIsLoginSubmitting(true);
    try {
      await updatePasswordAfterRecovery(recoveryPassword);
      setPasswordRecoveryMode(false);
      setRecoveryPassword("");
      setRecoveryPasswordConfirm("");
      setLoginSuccess("Senha atualizada. Você já pode usar o painel.");
      const profile = await getAuthSessionProfile();
      if (profile) {
        persistAuthenticatedUser(profile);
        setIsDbLoaded(false);
      } else {
        setAuthScreen("login");
      }
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Não foi possível atualizar a senha."
      );
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOutAuth();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setGoogleAccessToken(null);
    clearStoredGoogleAccessToken();
    setAuthScreen("landing");
    setIsDbLoaded(false);
    setMeetings([]);
    setPermittedUsers([]);
    setIsMeetingsLoaded(false);
    localStorage.removeItem("plaud_authenticated");
    localStorage.removeItem("plaud_current_user");
    localStorage.removeItem("plaud_meetings");
    localStorage.removeItem("integration_permitted_users");
  };

  // MULTI-VIEW NAVIGATION STATE
  const [activeView, setActiveView] = useState<"history" | "new_meeting" | "admin" | "integrations" | "dashboard" | "backups">("dashboard");

  // LOCAL RECORDINGS BACKUP STATES
  const [localBackups, setLocalBackups] = useState<LocalRecording[]>([]);
  const [isRecoveringCloud, setIsRecoveringCloud] = useState(false);

  // Load backups list
  const loadBackups = async () => {
    try {
      const recordings = await getLocalRecordings();
      setLocalBackups(recordings.sort((a, b) => b.id.localeCompare(a.id)));
    } catch (e) {
      console.error("Erro ao carregar gravações locais:", e);
    }
  };

  /**
   * Recupera áudios que estão na nuvem (Storage) mas cujo backup LOCAL foi
   * perdido — troca de aparelho, limpeza do navegador, ou falha na transcrição.
   * Baixa cada órfão e o registra como backup local para reprocessamento.
   */
  const recoverCloudAudios = async () => {
    if (!currentUser?.email) return;
    setIsRecoveringCloud(true);
    try {
      const cloud = await listCloudAudioRecordings(currentUser.email);
      const knownPaths = new Set<string>([
        ...localBackups.map((b) => b.storagePath || "").filter(Boolean),
        ...meetings.map((m) => m.audioStoragePath || "").filter(Boolean),
      ]);
      const orphans = cloud.filter((c) => !knownPaths.has(c.storagePath));
      if (orphans.length === 0) {
        alert("Nenhum áudio novo na nuvem para recuperar — seus backups já estão em dia.");
        return;
      }
      let imported = 0;
      for (const c of orphans) {
        try {
          const blob = await downloadAudioFromStorage(c.storagePath);
          const recId = c.name.replace(/\.[^.]+$/, "");
          await saveLocalRecording({
            id: recId,
            title: `Áudio recuperado da nuvem (${(c.createdAt || "").slice(0, 10) || "sem data"})`,
            date: (c.createdAt || "").slice(0, 10) || getLocalDateString(new Date()),
            duration: 0,
            mimeType: c.mimeType,
            audioBlob: blob,
            status: "failed",
            createdBy: currentUser.email,
            storagePath: c.storagePath,
          });
          imported += 1;
        } catch (err) {
          console.error(`Falha ao recuperar áudio ${c.storagePath}:`, err);
        }
      }
      await loadBackups();
      alert(
        imported > 0
          ? `${imported} áudio(s) recuperado(s) da nuvem para "Backup de Áudios". Clique em "Reprocessar IA" para transcrever.`
          : "Não foi possível baixar os áudios da nuvem. Tente novamente em instantes.",
      );
    } catch (err: any) {
      alert(`Erro ao recuperar áudios da nuvem: ${err?.message || err}`);
    } finally {
      setIsRecoveringCloud(false);
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

  // Restaura token Google salvo (se ainda válido) ou captura retorno OAuth via redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_oauth") === "1" && params.get("access_token")) {
      const token = params.get("access_token")!;
      const expiresIn = Number(params.get("expires_in") || 3600);
      storeGoogleAccessToken(token, expiresIn);
      setGoogleAccessToken(token);
      setCalendarSyncSuccess("Agenda Google vinculada com sucesso.");
      // Limpa a URL sem recarregar
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", clean);
      return;
    }
    if (params.get("google_oauth") === "0") {
      const err = params.get("error") || "Falha no OAuth Google";
      setCalendarSyncSuccess(`Erro ao vincular: ${err}`);
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", clean);
      return;
    }

    const stored = getStoredGoogleAccessToken();
    if (stored) setGoogleAccessToken(stored);
  }, []);

  // Limpa eventos ao trocar de usuário
  useEffect(() => {
    setGoogleEvents([]);
    setSelectedCalendarEvent(null);
  }, [currentUser?.email]);

  // REAL GOOGLE CALENDAR SYNC FUNCTIONS
  const fetchRealEvents = async (token: string, dateStr: string) => {
    const parsedEvents = await listGoogleCalendarEvents(token, dateStr);
    setGoogleEvents(parsedEvents);
    return parsedEvents;
  };

  const handleLinkGoogleCalendar = async () => {
    setIsSyncingCalendar(true);
    setCalendarSyncSuccess(null);
    try {
      const token = await connectGoogleCalendar(true);
      setGoogleAccessToken(token);

      if (currentUser) {
        const updatedPermitted = permittedUsers.map((u) => {
          if (u.email.toLowerCase() === currentUser.email.toLowerCase()) {
            return { ...u, googleCalendarLinked: true };
          }
          return u;
        });
        setPermittedUsers(updatedPermitted);
      }

      await fetchRealEvents(token, calendarSelectedDate);
      setCalendarSyncSuccess("Agenda Google vinculada. Exibindo seus compromissos reais.");
    } catch (err: any) {
      console.error("Erro ao vincular Google Agenda:", err);
      const message = String(err?.message || err);
      setCalendarSyncSuccess(`Erro ao vincular: ${message}`);
      // Em produção o erro ficava só num texto discreto — alerta deixa claro o que falta
      window.alert(`Não foi possível conectar a Google Agenda.\n\n${message}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    await disconnectGoogleCalendar(googleAccessToken);
    setGoogleAccessToken(null);
    setGoogleEvents([]);
    setSelectedCalendarEvent(null);
    setCalendarSyncSuccess("Agenda Google desconectada.");
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
      setCalendarSyncSuccess("Sessão expirou. Reconectando...");
      await handleLinkGoogleCalendar();
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Recarrega eventos ao mudar a data, se já conectado
  useEffect(() => {
    if (!googleAccessToken || newMeetingSubView !== "agenda") return;
    let cancelled = false;
    (async () => {
      try {
        const events = await listGoogleCalendarEvents(googleAccessToken, calendarSelectedDate);
        if (!cancelled) setGoogleEvents(events);
      } catch (err) {
        console.warn("Falha ao recarregar agenda na troca de data:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarSelectedDate, googleAccessToken, newMeetingSubView]);

  const [isInsertingToCalendar, setIsInsertingToCalendar] = useState(false);
  const [playingBackupId, setPlayingBackupId] = useState<string | null>(null);
  const backupAudioRef = useRef<HTMLAudioElement | null>(null);

  /** Envia/atualiza o compromisso na conta Google Calendar do usuário conectado. */
  const syncMeetingToGoogleCalendar = async (opts: {
    title: string;
    date: string;
    time: string;
    description?: string;
    durationMinutes?: number;
    existingEventId?: string;
  }) => {
    let token = googleAccessToken || getStoredGoogleAccessToken();
    if (!token) {
      token = await connectGoogleCalendar(true);
      setGoogleAccessToken(token);
    }

    const { startDateTime, endDateTime } = buildEventDateTimes(
      opts.date,
      opts.time,
      opts.durationMinutes || 60
    );

    const payload = {
      summary: opts.title,
      description: opts.description || "Criado pelo Alfredo",
      startDateTime,
      endDateTime,
      attendees: currentUser?.email
        ? [{ email: currentUser.email, displayName: currentUser.name }]
        : [],
    };

    if (opts.existingEventId && !opts.existingEventId.startsWith("cal_")) {
      return updateGoogleCalendarEvent(token, opts.existingEventId, payload);
    }
    return createGoogleCalendarEvent(token, payload);
  };

  /** Ação explícita: inserir reunião finalizada na Google Agenda do usuário. */
  const handleInsertMeetingToCalendar = async (meeting: Meeting) => {
    setIsInsertingToCalendar(true);
    setCalendarSyncSuccess(null);
    try {
      const time =
        meetingConfirmedTime ||
        (selectedCalendarEvent?.start?.dateTime
          ? `${new Date(selectedCalendarEvent.start.dateTime).getHours().toString().padStart(2, "0")}:${new Date(selectedCalendarEvent.start.dateTime).getMinutes().toString().padStart(2, "0")}`
          : "09:00");

      const synced = await syncMeetingToGoogleCalendar({
        title: meeting.title,
        date: meetingConfirmedDate || meeting.date,
        time,
        description: `${meeting.overview}\n\n— Inserido pelo Alfredo`,
        durationMinutes: Math.max(30, Math.round((meeting.duration || 3600) / 60) || 60),
        existingEventId: meeting.googleCalendarEventId || selectedCalendarEvent?.id,
      });

      if (synced) {
        const updated: Meeting = {
          ...meeting,
          googleCalendarEventId: synced.id,
          tags: meeting.tags?.includes("Google Agenda")
            ? meeting.tags
            : [...(meeting.tags || []), "Google Agenda"],
        };
        setMeetings((prev) => prev.map((m) => (m.id === meeting.id ? updated : m)));
        setCalendarSyncSuccess(`Inserido na sua Google Agenda: ${synced.summary}`);
        setCustomAlertMessage(`Reunião "${meeting.title}" inserida na sua Google Agenda com sucesso.`);
      }
    } catch (err: any) {
      console.error("Falha ao inserir na agenda:", err);
      setCustomAlertMessage(`Não foi possível inserir na agenda: ${err.message || err}`);
    } finally {
      setIsInsertingToCalendar(false);
    }
  };

  // STATE MANAGEMENT
  const [meetings, setMeetings] = useState<Meeting[]>(
    PREVIEW_MODE ? PREVIEW_MEETINGS : [],
  );
  const [isMeetingsLoaded, setIsMeetingsLoaded] = useState(PREVIEW_MODE);

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(() => {
    if (PREVIEW_MODE) return null;
    return localStorage.getItem("plaud_selected_id");
  });

  // Active meeting context
  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || null;

  // Sai do modo de edição de transcrição ao trocar de reunião (evita draft preso).
  useEffect(() => {
    setIsEditingTranscript(false);
  }, [selectedMeetingId]);

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

  // Task edit / add modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null); // null = adding, number = editing index
  const [taskAction, setTaskAction] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"Alta" | "Média" | "Baixa">("Média");

  // UI state
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("summary");
  // Edição manual da transcrição completa
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  
  // Tag creation state
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagMenu, setShowTagMenu] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [localProtectedChunks, setLocalProtectedChunks] = useState(0);
  const [cloudProtectedChunks, setCloudProtectedChunks] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  
  // Zera a barra de progresso quando não há processamento em andamento. O avanço em
  // si é reportado por chamadas explícitas a setProcessingProgress ao longo do fluxo
  // (validação → upload → etapas reais do job no servidor), não por uma animação
  // artificial — uma barra que "enche sozinha" até 95% e trava lá não diz nada sobre
  // o que de fato está acontecendo, especialmente em áudios longos.
  useEffect(() => {
    if (!isProcessingAudio) {
      setProcessingProgress(0);
    }
  }, [isProcessingAudio]);

  // Avisa antes de fechar/recarregar enquanto o áudio ainda está subindo ou sendo
  // transcrito — sair da página nesse meio-tempo interrompe o acompanhamento no
  // navegador (o job em si continua no servidor, mas o usuário perde a barra de
  // progresso e precisa ir manualmente em Backup de Áudios reprocessar).
  useEffect(() => {
    if (!isProcessingAudio && !isRecording) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isProcessingAudio, isRecording]);
  
  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingSessionIdRef = useRef<string>("");
  const recordingChunkSequenceRef = useRef(0);
  const pendingChunkUploadsRef = useRef<Promise<void>[]>([]);
  const cloudProtectedChunksRef = useRef(0);

  useEffect(() => {
    if (!currentUser?.email) return;
    const retryPending = async () => {
      if (!navigator.onLine) return;
      const pending = await getPendingRecordingChunks().catch(() => []);
      for (const chunk of pending) {
        try {
          const storagePath = await uploadAudioChunkToStorage(
            currentUser.email, chunk.sessionId, chunk.sequence, chunk.blob, chunk.mimeType,
          );
          await saveRecordingChunk({ ...chunk, uploaded: true, storagePath });
        } catch {
          break;
        }
      }
    };
    void retryPending();
    window.addEventListener("online", retryPending);
    return () => window.removeEventListener("online", retryPending);
  }, [currentUser?.email]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Evita timer/stream vazando se o usuário sair da tela gravando
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);
  const recordingSecondsRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Smart Search Chat State
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [smartQuery, setSmartQuery] = useState("");
  const [smartAnswer, setSmartAnswer] = useState<string | null>(null);
  const [isSearchingSmart, setIsSearchingSmart] = useState(false);

  // destino externo Integration Configuration State
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({
    apiUrl: "",
    token: "",
    isMock: true,
    mapping: "standard"
  });

  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);

  const [showIntegrationPanel, setShowIntegrationPanel] = useState(false);
  const [isExportingIntegration, setIsExportingIntegration] = useState(false);
  const [latestIntegrationLog, setLatestIntegrationLog] = useState<IntegrationLog | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);

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

  // Auth listener: restaura sessão + modo recuperação de senha (e-mail)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const profile = await getAuthSessionProfile();
        if (cancelled || !profile) return;
        setCurrentUser(profile);
        localStorage.setItem("plaud_authenticated", "true");
        localStorage.setItem("plaud_current_user", JSON.stringify(profile));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Erro ao restaurar sessão Auth:", err);
      }
    };

    bootstrapAuth();

    const { data } = onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryMode(true);
        setAuthScreen("login");
        setLoginSuccess("Confirme a nova senha abaixo (link do e-mail validado).");
      }
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsDbLoaded(false);
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // CLOUD PERSISTENCE — só após login (RLS: cada conta vê só o seu)
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.email) return;

    let cancelled = false;

    const loadAllData = async () => {
      try {
        const pUsers = await loadPermittedUsersFromCloud();
        if (cancelled) return;
        setPermittedUsers(pUsers);

        if (currentUser.role === "Administrador") {
          const loadedConfig = await loadIntegrationConfigFromCloud();
          if (cancelled) return;
          if (loadedConfig) {
            setIntegrationConfig(loadedConfig);
          }

          const loadedLogs = await loadIntegrationLogsFromCloud();
          if (cancelled) return;
          setIntegrationLogs(loadedLogs);
        }

        setIsDbLoaded(true);
      } catch (err) {
        console.error("Error loading account data from Supabase:", err);
        if (!cancelled) setIsDbLoaded(true);
      }
    };

    loadAllData();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUser?.email, currentUser?.role]);

  // LOAD USER MEETINGS — RLS isola no banco; filtro client é defesa em profundidade
  useEffect(() => {
    if (PREVIEW_MODE) return; // modo conferência: mantém a reunião de amostra
    if (!isDbLoaded || !isAuthenticated || !currentUser?.email) return;

    let active = true;
    setIsMeetingsLoaded(false);
    setMeetings([]);

    const loadUserMeetings = async () => {
      try {
        const loadedMeetings = await loadMeetingsFromCloud();
        if (!active) return;

        const filteredMeetings = loadedMeetings.filter(
          (m) => m.id !== "mtg_1" && m.id !== "mtg_2"
        );

        const meetingsForUser =
          currentUser.role === "Administrador"
            ? filteredMeetings
            : filteredMeetings.filter(
                (m) =>
                  (m.createdBy || "").toLowerCase() ===
                  currentUser.email.toLowerCase()
              );

        setMeetings(meetingsForUser);

        const accessibleIds = meetingsForUser.map((m) => m.id);
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
        if (active) {
          setMeetings([]);
          setIsMeetingsLoaded(true);
        }
      }
    };

    loadUserMeetings();
    return () => {
      active = false;
    };
  }, [currentUser?.email, currentUser?.role, isAuthenticated, isDbLoaded]);

  // SYNC meetings — nunca grava reunião de outra conta
  useEffect(() => {
    if (!isDbLoaded || !isMeetingsLoaded || !currentUser?.email) return;

    const syncMeetings = async () => {
      try {
        for (const m of meetings) {
          const owner = (m.createdBy || "").toLowerCase();
          const me = currentUser.email.toLowerCase();
          if (currentUser.role !== "Administrador" && owner !== me) continue;
          if (!owner) continue;
          await saveMeetingInCloud({
            ...m,
            createdBy: m.createdBy || currentUser.email,
          });
        }
      } catch (err) {
        console.error("Failed to sync meetings to Supabase:", err);
      }
    };

    syncMeetings();
  }, [meetings, isDbLoaded, isMeetingsLoaded, currentUser?.email, currentUser?.role]);

  // SYNC profiles — só admin; NUNCA apaga contas automaticamente
  useEffect(() => {
    if (!isDbLoaded || currentUser?.role !== "Administrador") return;

    const syncUsers = async () => {
      try {
        for (const u of permittedUsers) {
          await savePermittedUserInCloud(u);
        }
      } catch (err) {
        console.error("Failed to sync permitted users to cloud:", err);
      }
    };

    syncUsers();
  }, [permittedUsers, isDbLoaded, currentUser?.role]);

  useEffect(() => {
    if (!isDbLoaded || currentUser?.role !== "Administrador") return;
    saveIntegrationConfigInCloud(integrationConfig).catch((err) =>
      console.error("Failed to sync integration config:", err)
    );
  }, [integrationConfig, isDbLoaded, currentUser?.role]);

  useEffect(() => {
    if (!isDbLoaded || currentUser?.role !== "Administrador") return;
    saveIntegrationLogsInCloud(integrationLogs).catch((err) =>
      console.error("Failed to sync integration logs:", err)
    );
  }, [integrationLogs, isDbLoaded, currentUser?.role]);

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
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen").catch(() => null);
      }
      audioChunksRef.current = [];
      recordingSessionIdRef.current = `session_${Date.now()}_${crypto.randomUUID()}`;
      recordingChunkSequenceRef.current = 0;
      pendingChunkUploadsRef.current = [];
      setLocalProtectedChunks(0);
      setCloudProtectedChunks(0);
      cloudProtectedChunksRef.current = 0;
      await createRecordingSession(recordingSessionIdRef.current, meetingConfirmedTitle || "Reunião em andamento");
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
        audioBitsPerSecond: 16000 // Mantém reuniões longas abaixo do limite de upload do Whisper.
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const sequence = recordingChunkSequenceRef.current++;
          const sessionId = recordingSessionIdRef.current;
          const ownerEmail = currentUser?.email || "atendimento@triforceconsultoria.com";
          const task = (async () => {
            const localChunk = {
              id: `${sessionId}_${sequence}`,
              sessionId,
              sequence,
              blob: event.data,
              mimeType,
              uploaded: false,
              createdAt: Date.now(),
            };
            await saveRecordingChunk(localChunk);
            setLocalProtectedChunks((count) => count + 1);
            try {
              const storagePath = await uploadAudioChunkToStorage(ownerEmail, sessionId, sequence, event.data, mimeType);
              await saveRecordingChunk({ ...localChunk, uploaded: true, storagePath });
              await confirmRecordingChunk({ sessionId, sequence, sizeBytes: event.data.size, storagePath });
              setCloudProtectedChunks((count) => count + 1);
              cloudProtectedChunksRef.current += 1;
            } catch (error) {
              console.warn(`Chunk ${sequence} protegido localmente; upload será retomado depois.`, error);
            }
          })();
          pendingChunkUploadsRef.current.push(task);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all stream tracks to release microphone hardware
        stream.getTracks().forEach(track => track.stop());
        if (audioCtx.state !== "closed") {
          audioCtx.close();
        }
        await wakeLockRef.current?.release?.().catch(() => undefined);
        wakeLockRef.current = null;
        await Promise.allSettled(pendingChunkUploadsRef.current);
        const chunks = await getRecordingChunks(recordingSessionIdRef.current);
        const completeBlob = new Blob(chunks.map((chunk) => chunk.blob), { type: mimeType });
        audioChunksRef.current = [];
        await finishRecordingSession(
          recordingSessionIdRef.current,
          recordingSecondsRef.current,
          recordingChunkSequenceRef.current,
          cloudProtectedChunksRef.current,
        ).catch(() => undefined);
        await processRecordedAudio(mimeType, completeBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error("Falha no MediaRecorder:", event);
        setCustomAlertMessage("A captura de áudio foi interrompida. Os fragmentos já capturados permanecem protegidos no dispositivo.");
      };
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
        };
      });

      mediaRecorder.start(10_000); // fragmentos recuperáveis de 10 segundos

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

        // Gradient for premium Alfredo (emerald green energy)
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, "rgba(27, 166, 182, 0.2)");
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

  // Processa áudio (gravação nova ou reprocessamento de backup existente)
  const processRecordedAudio = async (
    mimeType: string,
    customBlob?: Blob,
    customDuration?: number,
    customTitle?: string,
    options?: {
      existingBackupId?: string;
      existingMeetingId?: string;
      /** No reprocessamento, não recompacta nem cria outro backup */
      isReprocess?: boolean;
    },
  ) => {
    setIsProcessingAudio(true);
    setProcessingStatus(
      options?.isReprocess ? "Reprocessando áudio existente..." : "Agrupando áudio gravado...",
    );
    setProcessingProgress(5);

    const rawBlob = customBlob || new Blob(audioChunksRef.current, { type: mimeType });
    const titleInput = (document.getElementById("custom-meeting-title") as HTMLInputElement)?.value;
    const meetingTitle =
      customTitle ||
      titleInput ||
      (selectedCalendarEvent
        ? selectedCalendarEvent.summary
        : `Reunião Gravada #${meetings.length + 1}`);
    const isReprocess = Boolean(options?.isReprocess && options.existingBackupId);
    const localRecordingId = isReprocess
      ? options!.existingBackupId!
      : `rec_${Date.now()}`;

    try {
      let prepared: {
        blob: Blob;
        mimeType: string;
        durationSeconds: number;
        originalBytes: number;
        compressedBytes: number;
      };

      if (isReprocess) {
        // Reusa o blob já salvo — não gera outro arquivo nem reencode
        setProcessingStatus("Preparando reprocessamento com IA...");
        setProcessingProgress(20);
        prepared = {
          blob: rawBlob,
          mimeType,
          durationSeconds: customDuration || 5,
          originalBytes: rawBlob.size,
          compressedBytes: rawBlob.size,
        };
      } else {
        setProcessingStatus("Validando e comprimindo áudio para reduzir o peso no armazenamento...");
        setProcessingProgress(15);
        prepared = await prepareAudioForStorage(rawBlob, undefined, (msg) => {
          setProcessingStatus(msg);
        });
      }

      const duration =
        customDuration || prepared.durationSeconds || recordingSecondsRef.current || 5;

      setProcessingStatus(
        isReprocess
          ? "Atualizando backup existente..."
          : `Salvando backup otimizado (${(prepared.compressedBytes / (1024 * 1024)).toFixed(2)} MB)...`,
      );
      setProcessingProgress(25);

      const existingBackup = isReprocess
        ? localBackups.find((b) => b.id === localRecordingId)
        : undefined;

      const offlineRecording: LocalRecording = {
        id: localRecordingId,
        title: meetingTitle,
        date: existingBackup?.date || getLocalDateString(new Date()),
        duration,
        mimeType: prepared.mimeType,
        audioBlob: prepared.blob,
        status: "pending",
        createdBy:
          existingBackup?.createdBy ||
          currentUser?.email ||
          "atendimento@triforceconsultoria.com",
        originalBytes: existingBackup?.originalBytes || prepared.originalBytes,
        compressedBytes: prepared.compressedBytes,
        meetingId: existingBackup?.meetingId || options?.existingMeetingId,
        overview: existingBackup?.overview,
      };
      await saveLocalRecording(offlineRecording);
      await loadBackups();

      setProcessingStatus("Enviando áudio para a nuvem...");
      setProcessingProgress(35);

      const contextText = `
Usuário que gravou a reunião (Triforce): ${currentUser?.name} (${currentUser?.email})
Título definido pelo usuário: ${meetingTitle}
Participantes internos confirmados: ${meetingInternalParticipants || "Não informados"}
Clientes e parceiros confirmados: ${meetingExternalParticipants || "Não informados"}
${selectedCalendarEvent ? `
Reunião vinculada ao Google Agenda:
- Título do Evento: ${selectedCalendarEvent.summary}
- Local: ${selectedCalendarEvent.location || "Não especificado"}
- Descrição: ${selectedCalendarEvent.description || "Sem descrição"}
- Participantes oficiais no convite: ${selectedCalendarEvent.attendees?.map(a => `${a.displayName || a.email.split("@")[0]} (${a.email})`).join(", ")}
` : "Gravação direta de áudio (sem evento do Google Agenda vinculado)."}
      `.trim();

      const started = await startOrResumeTranscription(
        localRecordingId,
        prepared.blob,
        prepared.mimeType,
        contextText,
        existingBackup?.jobId,
      );

      let aiResult: any;
      let transcriptionStoragePath = existingBackup?.storagePath;
      if (started.status === "completed") {
        aiResult = started.result;
      } else {
        transcriptionStoragePath = started.storagePath || transcriptionStoragePath;
        await saveLocalRecording({
          ...offlineRecording,
          jobId: started.jobId,
          storagePath: transcriptionStoragePath,
        });
        setProcessingStatus("Iniciando Transcrição por Inteligência Artificial...");
        aiResult = await pollTranscriptionJob(started.jobId, (msg) => {
          setProcessingStatus(msg);
        });
      }

      const linkedMeetingId =
        options?.existingMeetingId ||
        existingBackup?.meetingId ||
        `mtg_${Date.now()}`;
      const isUpdatingMeeting = meetings.some((m) => m.id === linkedMeetingId);

      const meetingPayload: Meeting = {
        id: linkedMeetingId,
        title: meetingTitle,
        date:
          (isUpdatingMeeting
            ? meetings.find((m) => m.id === linkedMeetingId)?.date
            : undefined) ||
          meetingConfirmedDate ||
          existingBackup?.date ||
          getLocalDateString(new Date()),
        duration: duration,
        tags: aiResult.suggestedTags || (selectedCalendarEvent ? ["Google Agenda"] : ["Geral"]),
        transcript: aiResult.transcript,
        overview: aiResult.overview,
        topics: aiResult.topics || [],
        actions: aiResult.actions || [],
        decisions: aiResult.decisions || [],
        participants: {
          membersTriforce: meetingInternalParticipants.split(/[\n,;]/).map((p) => p.trim()).filter(Boolean).length
            ? meetingInternalParticipants.split(/[\n,;]/).map((p) => p.trim()).filter(Boolean)
            : (aiResult.participants?.membersTriforce && aiResult.participants.membersTriforce.length > 0)
            ? aiResult.participants.membersTriforce
            : [currentUser?.name || "Consultor Triforce"],
          membersClient: meetingExternalParticipants.split(/[\n,;]/).map((p) => p.trim()).filter(Boolean).length
            ? meetingExternalParticipants.split(/[\n,;]/).map((p) => p.trim()).filter(Boolean)
            : (aiResult.participants?.membersClient && aiResult.participants.membersClient.length > 0)
            ? aiResult.participants.membersClient
            : selectedCalendarEvent 
              ? (selectedCalendarEvent.attendees?.map(a => a.displayName || a.email.split("@")[0]).filter(name => name && !name.toLowerCase().includes("integrations") && !name.toLowerCase().includes("atendimento@triforce")) || [])
              : []
        },
        createdBy:
          existingBackup?.createdBy ||
          currentUser?.email ||
          "atendimento@triforceconsultoria.com",
        hasAudio: true,
        audioRecordingId: localRecordingId,
        audioStoragePath: transcriptionStoragePath,
        audioSizeBytes: prepared.compressedBytes,
      };

      if (isUpdatingMeeting) {
        setMeetings((prev) =>
          prev.map((m) => (m.id === linkedMeetingId ? { ...m, ...meetingPayload } : m)),
        );
      } else {
        setMeetings((prev) => [meetingPayload, ...prev]);
      }
      setSelectedMeetingId(meetingPayload.id);
      setActiveTab("summary");
      setIsMobileSidebarOpen(false);
      setActiveView("history");
      setProcessingProgress(100);

      await updateLocalRecordingStatus(localRecordingId, "completed", {
        meetingId: meetingPayload.id,
        overview: meetingPayload.overview,
        title: meetingPayload.title,
      });
      await deleteRecordingChunks(recordingSessionIdRef.current).catch(() => undefined);
      await loadBackups();
    } catch (err: any) {
      console.error("Falha ao transcrever gravação:", err);
      await updateLocalRecordingStatus(localRecordingId, "failed");
      await loadBackups();
      setActiveView("backups");
      alert(`Falha ao transcrever: ${err.message || err}.\n\nO áudio foi salvo em "Backup de Áudios" no menu lateral. Você pode ouvir e clicar em Reprocessar IA.`);
    } finally {
      setIsProcessingAudio(false);
      setProcessingStatus("");
    }
  };

  // FILE UPLOAD HANDLER — valida, comprime e processa áudio pronto
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Permite reanexar o mesmo arquivo depois
    event.target.value = "";

    const validation = validateAudioFile(file);
    if (validation.ok === false) {
      setCustomAlertMessage(validation.error);
      return;
    }

    (async () => {
      const localRecordingId = "rec_" + Date.now();
      setIsProcessingAudio(true);
      setProcessingProgress(5);
      setProcessingStatus(`Validando arquivo ${file.name}...`);

      try {
        setProcessingStatus("Comprimindo áudio para reduzir o peso no armazenamento...");
        setProcessingProgress(15);
        const prepared = await prepareAudioForStorage(file, file.name, (msg) => {
          setProcessingStatus(msg);
        });

        // O áudio não é mais reencodado no cliente (reencode em tempo real era a causa
        // do travamento em áudios longos) — o arquivo original é que vai pro Whisper, que
        // aceita até 25 MB por upload direto. Formatos já compactos (m4a/mp3/ogg/webm)
        // raramente esbarram nisso; WAV bruto de reuniões longas pode passar.
        if (prepared.compressedBytes > 24 * 1024 * 1024) {
          throw new Error(
            `Arquivo com ${(prepared.compressedBytes / (1024 * 1024)).toFixed(1)} MB — acima do limite de 25 MB da transcrição. ` +
              "Exporte em um formato compactado (MP3, M4A ou OGG) ou grave direto pelo app em vez de fazer upload de um WAV bruto."
          );
        }

        const titleInput = (document.getElementById("custom-meeting-title") as HTMLInputElement)?.value;
        const finalTitle =
          titleInput ||
          (selectedCalendarEvent ? selectedCalendarEvent.summary : file.name.replace(/\.[^/.]+$/, ""));

        setProcessingStatus(
          `Salvando backup otimizado (${(prepared.compressedBytes / (1024 * 1024)).toFixed(2)} MB, ${prepared.compressionRatio}x menor)...`
        );
        setProcessingProgress(25);
        const offlineRecording: LocalRecording = {
          id: localRecordingId,
          title: finalTitle,
          date: getLocalDateString(new Date()),
          duration: prepared.durationSeconds,
          mimeType: prepared.mimeType,
          audioBlob: prepared.blob,
          status: "pending",
          createdBy: currentUser?.email || "atendimento@triforceconsultoria.com",
          originalBytes: prepared.originalBytes,
          compressedBytes: prepared.compressedBytes,
        };
        await saveLocalRecording(offlineRecording);
        await loadBackups();

        setProcessingStatus("Transmitindo áudio comprimido para análise da IA...");
        setProcessingProgress(40);

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

        const started = await startOrResumeTranscription(localRecordingId, prepared.blob, prepared.mimeType, contextText);

        let aiResult: any;
        let transcriptionStoragePath: string | undefined;
        if (started.status === "completed") {
          aiResult = started.result;
        } else {
          transcriptionStoragePath = started.storagePath;
          await saveLocalRecording({
            ...offlineRecording,
            jobId: started.jobId,
            storagePath: transcriptionStoragePath,
          });
          aiResult = await pollTranscriptionJob(started.jobId, (msg) => {
            setProcessingStatus(msg);
          });
        }

        const newMtg: Meeting = {
          id: `mtg_${Date.now()}`,
          title: finalTitle,
          date: meetingConfirmedDate || getLocalDateString(new Date()),
          duration: prepared.durationSeconds,
          tags: aiResult.suggestedTags || ["Upload"],
          transcript: aiResult.transcript,
          overview: aiResult.overview,
          topics: aiResult.topics || [],
          actions: aiResult.actions || [],
          decisions: aiResult.decisions || [],
          participants: {
            membersTriforce:
              aiResult.participants?.membersTriforce?.length > 0
                ? aiResult.participants.membersTriforce
                : [currentUser?.name || "Consultor Triforce"],
            membersClient:
              aiResult.participants?.membersClient?.length > 0
                ? aiResult.participants.membersClient
                : selectedCalendarEvent
                  ? selectedCalendarEvent.attendees
                      ?.map((a) => a.displayName || a.email.split("@")[0])
                      .filter(
                        (name) =>
                          name &&
                          !name.toLowerCase().includes("integrations") &&
                          !name.toLowerCase().includes("atendimento@triforce")
                      ) || []
                  : [],
          },
          createdBy: currentUser?.email || "atendimento@triforceconsultoria.com",
          hasAudio: true,
          audioRecordingId: localRecordingId,
          audioStoragePath: transcriptionStoragePath,
          audioSizeBytes: prepared.compressedBytes,
        };

        setMeetings((prev) => [newMtg, ...prev]);
        setSelectedMeetingId(newMtg.id);
        setActiveTab("summary");
        setIsMobileSidebarOpen(false);
        setActiveView("history");
        setProcessingProgress(100);

        await updateLocalRecordingStatus(localRecordingId, "completed", {
          meetingId: newMtg.id,
          overview: newMtg.overview,
          title: newMtg.title,
        });
        await loadBackups();
      } catch (err: any) {
        console.error("Erro no upload do arquivo:", err);
        await updateLocalRecordingStatus(localRecordingId, "failed").catch(() => undefined);
        await loadBackups();
        setActiveView("backups");
        alert(`Erro ao processar o arquivo de áudio: ${err.message || err}\n\nO áudio ficou em Backup de Áudios para reprocessar.`);
      } finally {
        setIsProcessingAudio(false);
        setProcessingStatus("");
      }
    })();
  };

  /**
   * Sobe o áudio direto pro Supabase Storage e inicia (ou retoma) um job de
   * transcrição no servidor. Manda só um JSON pequeno pra /api/transcribe — o
   * binário nunca passa pelo corpo dessa rota (limite de 4.5 MB por requisição
   * em funções serverless da Vercel).
   *
   * Se `existingJobId` for passado (fluxo de "Reprocessar IA" sobre um backup
   * que já tinha um job em andamento), primeiro consulta o status: se já
   * terminou, reaproveita o resultado sem gastar upload/Groq de novo; se ainda
   * está rodando no servidor, retoma o polling nesse mesmo job em vez de subir
   * o áudio e começar tudo do zero — o processamento no servidor continua
   * mesmo que a aba tenha sido fechada nesse meio-tempo.
   */
  const startOrResumeTranscription = async (
    recordingId: string,
    blob: Blob,
    mimeType: string,
    contextText: string,
    existingJobId?: string,
  ): Promise<
    | { status: "completed"; result: any }
    | { status: "started" | "resumed"; jobId: string; storagePath?: string }
  > => {
    const ownerEmail = currentUser?.email || "atendimento@triforceconsultoria.com";

    if (existingJobId) {
      try {
        const statusResponse = await fetch(apiUrl(`/api/transcribe/status/${existingJobId}`), {
          headers: await getApiAuthHeaders(),
        });
        if (statusResponse.ok) {
          const job = await readApiJson<{ status?: string; result?: unknown }>(statusResponse);
          if (job.status === "completed") {
            return { status: "completed", result: job.result };
          }
          if (job.status && job.status !== "failed") {
            return { status: "resumed", jobId: existingJobId };
          }
        }
        // 404 ou status "failed" — cai no fluxo normal abaixo (novo upload + novo job)
      } catch {
        // Falha de rede ao checar o job antigo — tenta iniciar um novo em vez de travar aqui
      }
    }

    const storagePath = buildAudioStoragePath(ownerEmail, recordingId, mimeType);
    await uploadAudioToStorage(storagePath, blob, mimeType);

    const response = await fetch(apiUrl("/api/transcribe"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getApiAuthHeaders()),
      },
      body: JSON.stringify({ storagePath, mimeType, context: contextText }),
    });

    const startResult = await readApiJson<{ jobId?: string; error?: string }>(response);
    if (!response.ok) {
      throw new Error(startResult.error || `Erro ${response.status} no servidor durante a transcrição`);
    }
    if (!startResult.jobId) {
      throw new Error("O servidor não retornou um ID de tarefa de transcrição válido.");
    }
    return { status: "started", jobId: startResult.jobId, storagePath };
  };

  const startTranscriptionFromStorage = async (
    storagePath: string,
    mimeType: string,
    contextText: string,
    existingJobId?: string,
  ): Promise<
    | { status: "completed"; result: any }
    | { status: "started" | "resumed"; jobId: string; storagePath?: string }
  > => {
    if (existingJobId) {
      try {
        const statusResponse = await fetch(apiUrl(`/api/transcribe/status/${existingJobId}`), {
          headers: await getApiAuthHeaders(),
        });
        if (statusResponse.ok) {
          const job = await readApiJson<{ status?: string; result?: unknown }>(statusResponse);
          if (job.status === "completed") {
            return { status: "completed", result: job.result };
          }
          if (job.status && job.status !== "failed") {
            return { status: "resumed", jobId: existingJobId, storagePath };
          }
        }
      } catch {
        // Se o job antigo não puder ser consultado, cria um novo usando o mesmo áudio no Storage.
      }
    }

    const response = await fetch(apiUrl("/api/transcribe"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getApiAuthHeaders()),
      },
      body: JSON.stringify({ storagePath, mimeType, context: contextText }),
    });

    const startResult = await readApiJson<{ jobId?: string; error?: string }>(response);
    if (!response.ok) {
      throw new Error(startResult.error || `Erro ${response.status} no servidor durante a transcrição`);
    }
    if (!startResult.jobId) {
      throw new Error("O servidor não retornou um ID de tarefa de transcrição válido.");
    }
    return { status: "started", jobId: startResult.jobId, storagePath };
  };

  // Consulta o status de um job de transcrição até ele terminar. O estado do job
  // vive no Supabase (não em memória do servidor), então sobrevive a refresh da
  // página e a troca de instância do servidor — só a espera no cliente é reiniciada.
  const pollTranscriptionJob = async (jobId: string, onProgress: (msg: string) => void): Promise<any> => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const maxPolls = 240; // Até 20 minutos de espera no cliente
    const maxConsecutiveNetworkFailures = 6; // ~30s de tolerância a instabilidade de rede antes de desistir

    let consecutiveFailures = 0;
    for (let i = 0; i < maxPolls; i++) {
      let job: { status?: string; result?: unknown; error?: string; progressMessage?: string };
      try {
        const response = await fetch(apiUrl(`/api/transcribe/status/${jobId}`), {
          headers: await getApiAuthHeaders(),
        });
        job = await readApiJson<typeof job>(response);
        if (!response.ok) {
          throw new Error(job.error || `Erro ao consultar o status do processador (${response.status})`);
        }
        consecutiveFailures = 0;
      } catch (err: any) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= maxConsecutiveNetworkFailures) {
          throw new Error(
            `Não foi possível confirmar o status da transcrição após várias tentativas (${err.message || err}). ` +
              "O processamento pode continuar no servidor — confira em Backup de Áudios em alguns minutos.",
          );
        }
        await delay(5000);
        continue;
      }

      // Progresso real vindo do status do job — substitui a animação "presa em 95%"
      // por um valor que reflete a etapa em que o processamento de fato está.
      const stageProgress: Record<string, number> = {
        pending: 45,
        uploading: 55,
        processing: 70,
        transcribing: 88,
      };
      if (job.status && stageProgress[job.status] !== undefined) {
        setProcessingProgress(stageProgress[job.status]);
      }

      if (job.status === "completed") {
        return job.result;
      } else if (job.status === "failed") {
        throw new Error(job.error || "Ocorreu um erro inesperado no processamento inteligente.");
      } else if (job.progressMessage) {
        onProgress(job.progressMessage);
      }

      await delay(5000); // Poll every 5 seconds
    }

    throw new Error(
      "O tempo limite de acompanhamento no navegador foi excedido (20 minutos). " +
        "O processamento pode continuar no servidor — confira em Backup de Áudios em alguns minutos e clique em Reprocessar IA para retomar.",
    );
  };

  const reprocessStoredMeetingAudio = async (
    meeting: Meeting,
    storagePath: string,
    backup?: LocalRecording | null,
  ) => {
    setIsProcessingAudio(true);
    setProcessingProgress(20);
    setProcessingStatus("Reprocessando áudio salvo na nuvem...");

    try {
      const mimeType = backup?.mimeType || mimeFromStoragePath(storagePath);
      const contextText = `
Usuário que solicitou o reprocessamento: ${currentUser?.name} (${currentUser?.email})
Título atual da reunião: ${meeting.title}
Data da reunião: ${meeting.date}
Origem do áudio: Supabase Storage (${storagePath})
      `.trim();

      const started = await startTranscriptionFromStorage(
        storagePath,
        mimeType,
        contextText,
        backup?.jobId,
      );

      let aiResult: any;
      if (started.status === "completed") {
        aiResult = started.result;
      } else {
        if (backup) {
          await saveLocalRecording({
            ...backup,
            status: "pending",
            jobId: started.jobId,
            storagePath,
          });
        }
        setProcessingStatus("Iniciando transcrição do áudio salvo...");
        aiResult = await pollTranscriptionJob(started.jobId, (msg) => {
          setProcessingStatus(msg);
        });
      }

      const updatedMeeting: Meeting = {
        ...meeting,
        title: meeting.title || aiResult.title || "Reunião reprocessada",
        transcript: aiResult.transcript || meeting.transcript,
        overview: aiResult.overview || meeting.overview,
        topics: aiResult.topics || meeting.topics || [],
        decisions: aiResult.decisions || meeting.decisions || [],
        actions: aiResult.actions || meeting.actions || [],
        tags: aiResult.suggestedTags || meeting.tags || ["Geral"],
        participants: {
          membersTriforce:
            aiResult.participants?.membersTriforce?.length > 0
              ? aiResult.participants.membersTriforce
              : meeting.participants?.membersTriforce || [currentUser?.name || "Consultor Triforce"],
          membersClient:
            aiResult.participants?.membersClient?.length > 0
              ? aiResult.participants.membersClient
              : meeting.participants?.membersClient || [],
        },
        hasAudio: true,
        audioRecordingId: backup?.id || meeting.audioRecordingId,
        audioStoragePath: storagePath,
        audioSizeBytes:
          meeting.audioSizeBytes ||
          backup?.compressedBytes ||
          backup?.audioBlob?.size,
      };

      setMeetings((prev) =>
        prev.map((m) => (m.id === meeting.id ? updatedMeeting : m)),
      );
      setSelectedMeetingId(updatedMeeting.id);
      setActiveTab("summary");
      setActiveView("history");
      setProcessingProgress(100);

      if (backup) {
        await updateLocalRecordingStatus(backup.id, "completed", {
          meetingId: meeting.id,
          overview: updatedMeeting.overview,
          title: updatedMeeting.title,
        });
        await loadBackups();
      }
    } catch (err: any) {
      console.error("Falha ao reprocessar áudio salvo no Storage:", err);
      if (backup) {
        await updateLocalRecordingStatus(backup.id, "failed").catch(() => undefined);
        await loadBackups();
      }
      setActiveView("backups");
      alert(`Falha ao reprocessar áudio salvo no banco: ${err.message || err}`);
    } finally {
      setIsProcessingAudio(false);
      setProcessingStatus("");
    }
  };

  // EXPORT TO PDF (jspdf) with executive-level premium layout
  const triggerPdfExport = (meeting: Meeting) => {
    const doc = new jsPDF();
    
    // Header section for cover page
    doc.setFillColor(13, 27, 42); // Elegant near-black header
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
    doc.text("ALFREDO - ATA DE REUNIÃO CORPORATIVA", 44, 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(27, 166, 182); // Accent emerald
    doc.text("Triforce Consultoria - Inteligência e Otimização de Processos", 44, 21);
    doc.setTextColor(200, 200, 200);
    doc.text(`Ata gerada automaticamente em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 44, 27);
    
    let currentY = 46;

    // Premium secondary page header tracker and page boundary check
    const checkPageBreak = (heightNeeded: number) => {
      if (currentY + heightNeeded > 275) {
        doc.addPage();
        // Background header bar on secondary pages
        doc.setFillColor(13, 27, 42);
        doc.rect(0, 0, 210, 16, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.text("ALFREDO", 15, 10);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(27, 166, 182);
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
      doc.setFillColor(27, 166, 182); // Emerald accent left bar
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
    doc.setTextColor(27, 166, 182);
    doc.text("Triforce Consultoria (Membros Internos):", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(mTriforce.join(", "), 15, currentY + 4.5);
    currentY += 10;

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 61, 70); // Blue for clients
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
        doc.setTextColor(255, 107, 90);
      } else if (a.priority === "Média") {
        doc.setTextColor(217, 155, 43);
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
        doc.setTextColor(27, 166, 182); // Emerald accent color for speaker turn
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
    doc.text("Ata corporativa oficial emitida via Alfredo pelo ecossistema Triforce Consultoria.", 15, currentY + 8);

    doc.save(`${meeting.title.toLowerCase().replace(/\s+/g, "_")}_relatorio_integration.pdf`);
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
          .header-table { width: 100%; border: none; margin-bottom: 25px; background-color: #0D1B2A; padding: 20px; }
          .header-title { color: #ffffff; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif; }
          .header-subtitle { color: #1BA6B6; font-size: 11px; margin-top: 5px; font-weight: bold; }
          .header-date { color: #a0aec0; font-size: 11px; margin-top: 2px; }
          h2 { color: #111827; font-size: 15px; font-weight: bold; margin-top: 35px; margin-bottom: 12px; background-color: #f3f4f6; padding: 8px 15px; border-left: 5px solid #1BA6B6; }
          .meta-box { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
          .meta-box td { padding: 6px 12px; font-size: 11px; border: 1px solid #e5e7eb; }
          .meta-label { font-weight: bold; background-color: #f9fafb; width: 25%; }
          .participants-section { margin-bottom: 15px; font-size: 11px; }
          .participants-title { font-weight: bold; margin-bottom: 3px; }
          .p-triforce { color: #1BA6B6; font-weight: bold; }
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
          .badge-baixa { color: #117985; font-weight: bold; }
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
              <div class="header-title">ALFREDO - ATA DE REUNIÃO CORPORATIVA</div>
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
              return `<p style="margin-bottom: 12px; text-align: justify;"><b style="color: #1BA6B6;">${speaker}:</b> ${speech}</p>`;
            } else {
              return `<p style="margin-bottom: 12px; text-align: justify;">${para}</p>`;
            }
          }).join("")}
        </div>
        
        <div class="footer-text">
          Ata corporativa oficial emitida via Alfredo pelo ecossistema Triforce Consultoria. Todos os direitos reservados.
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
    link.download = `${meeting.title.toLowerCase().replace(/\s+/g, "_")}_relatorio_integration.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // EXPORT TO GENERIC INTEGRATION API
  const exportMeetingToIntegration = async (meeting: Meeting) => {
    setIsExportingIntegration(true);
    setLatestIntegrationLog(null);

    try {
      const response = await fetch(apiUrl("/api/export-integration"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(await getApiAuthHeaders())
        },
        body: JSON.stringify({
          integrationConfig: integrationConfig,
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

      const newLog: IntegrationLog = {
        timestamp: new Date().toLocaleTimeString(),
        meetingTitle: meeting.title,
        status: logResult.success ? "success" : "error",
        simulated: logResult.simulated,
        request: logResult.request,
        response: logResult.response
      };

      setIntegrationLogs(prev => [newLog, ...prev]);
      setLatestIntegrationLog(newLog);
      setShowIntegrationPanel(true); // Open debugger console to see log immediately!

      if (logResult.success) {
        // Option to alert success in a subtle banner
      } else {
        alert("A API do destino externo retornou um status de erro. Revise as conexões do console de depuração.");
      }
    } catch (err: any) {
      console.error("Falha ao exportar para o destino externo:", err);
      alert(`Erro na conexão com a API do destino externo: ${err.message || err}`);
    } finally {
      setIsExportingIntegration(false);
    }
  };

  // SMART SEARCH QA ENGINE
  const handleSmartSearchQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartQuery.trim()) return;

    setIsSearchingSmart(true);
    setSmartAnswer(null);

    try {
      const response = await fetch(apiUrl("/api/smart-search"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(await getApiAuthHeaders())
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
  const allUniqueTags: string[] = Array.from(
    new Set(meetings.flatMap((m) => m.tags || []))
  );

  // Filtered Meetings List
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.transcript.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter ? m.tags.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  // Render landing / login if not authenticated
  if (passwordRecoveryMode) {
    return (
      <LoginPage
        logoSrc={triforceLogo}
        passwordRecoveryMode
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        recoveryPassword={recoveryPassword}
        recoveryPasswordConfirm={recoveryPasswordConfirm}
        loginError={loginError}
        loginSuccess={loginSuccess}
        isReady={isSupabaseConfigured}
        isSubmitting={isLoginSubmitting}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onRecoveryPasswordChange={setRecoveryPassword}
        onRecoveryPasswordConfirmChange={setRecoveryPasswordConfirm}
        onSubmit={handleLogin}
        onRecoverySubmit={handleRecoveryPasswordSubmit}
        onBackToLanding={() => {
          setPasswordRecoveryMode(false);
          setAuthScreen("landing");
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (authScreen === "landing") {
      return (
        <LandingPage
          logoSrc={triforceLogo}
          onEnter={() => setAuthScreen("login")}
        />
      );
    }

    return (
      <LoginPage
        logoSrc={triforceLogo}
        passwordRecoveryMode={false}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        recoveryPassword={recoveryPassword}
        recoveryPasswordConfirm={recoveryPasswordConfirm}
        loginError={loginError}
        loginSuccess={loginSuccess}
        isReady={isSupabaseConfigured}
        isSubmitting={isLoginSubmitting}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onRecoveryPasswordChange={setRecoveryPassword}
        onRecoveryPasswordConfirmChange={setRecoveryPasswordConfirm}
        onSubmit={handleLogin}
        onRecoverySubmit={handleRecoveryPasswordSubmit}
        onForgotPassword={handleForgotPassword}
        onBackToLanding={() => {
          setLoginError("");
          setLoginSuccess("");
          setPasswordRecoveryMode(false);
          setAuthScreen("landing");
        }}
      />
    );
  }

  if (!isDbLoaded) {
    return (
      <div className="app-shell flex h-[100svh] w-screen flex-col items-center justify-center gap-3 text-sm text-alfredo-graphite">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-alfredo-teal/25 border-t-alfredo-teal" />
        <p className="font-medium tracking-tight text-alfredo-graphite">Carregando seu workspace...</p>
      </div>
    );
  }

  return (
    <div className="app-shell relative flex h-[100svh] w-screen overflow-hidden font-sans text-alfredo-navy antialiased">
      <AppSidebar
        logoSrc={triforceLogo}
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        activeView={activeView}
        selectedMeetingId={selectedMeetingId}
        isAdmin={currentUser?.role === "Administrador"}
        userName={currentUser?.name || "Usuário"}
        userRole={currentUser?.role || "user"}
        userPhotoUrl={currentUser?.photoUrl}
        meetingsCount={meetings.length}
        backupsCount={localBackups.length}
        backupsHaveFailed={localBackups.some((b) => b.status === "failed")}
        searchQuery={searchQuery}
        selectedTagFilter={selectedTagFilter}
        allUniqueTags={allUniqueTags}
        filteredMeetings={filteredMeetings}
        isRecording={isRecording}
        isRecordingPaused={isRecordingPaused}
        recordingSeconds={recordingSeconds}
        onCollapse={() => setIsSidebarCollapsed(true)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== "history") setSelectedMeetingId(null);
        }}
        onSelectMeeting={(id) => {
          setSelectedMeetingId(id);
          setActiveView("history");
          setShowSmartSearch(false);
        }}
        onDeleteMeeting={
          currentUser?.role === "Administrador" ? deleteMeeting : undefined
        }
        onSearchChange={setSearchQuery}
        onTagFilterChange={setSelectedTagFilter}
        onOpenSmartSearch={() => setShowSmartSearch(true)}
        onPauseRecording={pauseRecording}
        onStopRecording={stopRecording}
        onLogout={handleLogout}
      />

      {/* CENTER: CORE WORKSPACE */}
      <div className="app-main-mobile flex min-w-0 flex-1 flex-col bg-transparent">
        
        <AppTopBar
          sidebarCollapsed={isSidebarCollapsed}
          activeView={activeView}
          selectedMeeting={selectedMeeting}
          userName={currentUser?.name}
          userRole={currentUser?.role}
          showSmartSearch={showSmartSearch}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
          onToggleSidebarCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleSmartSearch={() => setShowSmartSearch(!showSmartSearch)}
          onOpenProfile={() => {
            setProfileName(currentUser?.name || "");
            setIsProfileSettingsOpen(true);
          }}
          onLogout={handleLogout}
        />

        {/* PROCESSING & TRANSCRIPTION LOADER OVERLAY */}
        {isProcessingAudio && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/95 backdrop-blur-sm z-50">
            <div className="p-6 rounded-2xl bg-white border border-alfredo-border flex flex-col items-center w-full max-w-sm text-center shadow-2xl">
              <div className="w-12 h-12 rounded-full border-4 border-alfredo-teal/25 border-t-alfredo-teal animate-spin mb-4"></div>
              
              <h3 className="text-sm font-semibold text-alfredo-navy mb-2">Processamento & Transcrição</h3>
              
              <p className="text-xs text-alfredo-graphite leading-relaxed font-mono bg-alfredo-offwhite py-1.5 px-3 rounded border border-alfredo-border w-full mb-4">
                {processingStatus}
              </p>

              {/* Real-time elegant progress bar */}
              <div className="w-full bg-alfredo-offwhite rounded-full h-2.5 mb-2 overflow-hidden border border-alfredo-border">
                <div 
                  className="bg-alfredo-teal h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between w-full text-[10px] text-alfredo-muted font-mono mb-4">
                <span>FASE ATUAL</span>
                <span className="text-alfredo-teal-dark font-bold">{processingProgress}% CONCLUÍDO</span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-alfredo-muted">
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
                <div className="p-4 sm:p-6 border-b border-alfredo-border bg-alfredo-offwhite transition-all duration-300">
                  {isDetailsCollapsed ? (
                    /* COMPACT / COLLAPSED HEADER */
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => setSelectedMeetingId(null)}
                          className="p-1.5 rounded-lg bg-white border border-alfredo-border text-alfredo-graphite hover:text-alfredo-navy transition-colors cursor-pointer"
                          title="Voltar para Minhas Reuniões"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-sm text-alfredo-navy truncate tracking-tight flex items-center gap-2">
                            <span>{selectedMeeting.title}</span>
                            <span className="text-[10px] bg-white text-alfredo-graphite font-mono py-0.5 px-2 rounded border border-alfredo-border">
                              {selectedMeeting.date}
                            </span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto shrink-0">
                        {/* Compact actions button triggers */}
                        <button
                          onClick={() => triggerPdfExport(selectedMeeting)}
                          className="px-2 py-1 rounded bg-white hover:bg-alfredo-offwhite border border-alfredo-border text-[10px] text-alfredo-graphite font-mono transition-colors"
                          title="PDF"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleInsertMeetingToCalendar(selectedMeeting)}
                          disabled={isInsertingToCalendar}
                          className="px-2 py-1 rounded bg-alfredo-surface-teal hover:bg-alfredo-surface-teal border border-alfredo-teal/30 text-[10px] text-alfredo-teal-dark font-mono transition-colors disabled:opacity-50"
                          title="Inserir na Google Agenda"
                        >
                          {selectedMeeting.googleCalendarEventId ? "Agenda ✓" : "Inserir Agenda"}
                        </button>
                        <button
                          onClick={() => triggerDocxExport(selectedMeeting)}
                          className="px-2 py-1 rounded bg-white hover:bg-alfredo-offwhite border border-alfredo-border text-[10px] text-alfredo-graphite font-mono transition-colors"
                          title="DOCX"
                        >
                          DOCX
                        </button>
                        {currentUser?.role === "Administrador" && (
                          <button
                            onClick={() => exportMeetingToIntegration(selectedMeeting)}
                            disabled={isExportingIntegration}
                            className="px-2 py-1 rounded bg-alfredo-teal hover:bg-alfredo-teal-dark disabled:bg-alfredo-offwhite text-alfredo-navy font-bold text-[10px] transition-colors"
                            title="Exportar"
                          >
                            destino externo
                          </button>
                        )}
                        <button
                          onClick={() => setIsDetailsCollapsed(false)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-alfredo-offwhite hover:bg-[#E7EDEF] text-alfredo-teal-dark hover:text-alfredo-navy text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
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
                            className="flex items-center gap-1.5 text-xs text-alfredo-graphite hover:text-alfredo-teal-dark transition-colors mb-2 cursor-pointer group"
                          >
                            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            Voltar para Minhas Reuniões
                          </button>
                          <h2 className="font-semibold text-xl text-alfredo-navy tracking-tight">
                            {selectedMeeting.title}
                          </h2>
                          
                          <div className="flex items-center gap-4 text-xs text-alfredo-graphite font-mono mt-1.5">
                            <span className="flex items-center gap-1 text-alfredo-graphite">
                              Data: {selectedMeeting.date}
                            </span>
                            <span>•</span>
                            <span>
                              Duração: {Math.floor(selectedMeeting.duration / 60)}m {selectedMeeting.duration % 60}s
                            </span>
                          </div>
                        </div>

                        {/* ACTIONS BAR (EXPORT PDF/WORD/INTEGRATION) */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {currentUser?.role === "Administrador" && (
                            <button
                              onClick={() => deleteMeeting(selectedMeeting.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF0ED] border border-alfredo-border hover:border-alfredo-coral/30 text-xs font-medium text-alfredo-graphite hover:text-alfredo-coral transition-all cursor-pointer"
                              title="Excluir Reunião Permanentemente"
                            >
                              <Trash2 size={12} className="text-alfredo-coral" />
                              Excluir Reunião
                            </button>
                          )}

                          <button
                            onClick={() => triggerPdfExport(selectedMeeting)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-alfredo-offwhite border border-alfredo-border text-xs font-medium text-alfredo-graphite transition-colors cursor-pointer"
                            title="Exportar PDF"
                          >
                            <Download size={12} className="text-alfredo-coral" />
                            PDF
                          </button>
                          <button
                            onClick={() => handleInsertMeetingToCalendar(selectedMeeting)}
                            disabled={isInsertingToCalendar}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-alfredo-surface-teal hover:bg-alfredo-surface-teal border border-alfredo-teal/30 text-xs font-medium text-alfredo-teal-dark transition-colors cursor-pointer disabled:opacity-50"
                            title="Inserir esta reunião na sua Google Agenda"
                          >
                            <Calendar size={12} />
                            {isInsertingToCalendar
                              ? "Inserindo..."
                              : selectedMeeting.googleCalendarEventId
                                ? "Já na Agenda"
                                : "Inserir na Agenda"}
                          </button>
                          <button
                            onClick={() => triggerDocxExport(selectedMeeting)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-alfredo-offwhite border border-alfredo-border text-xs font-medium text-alfredo-graphite transition-colors cursor-pointer"
                            title="Exportar Word (DOCX)"
                          >
                            <Download size={12} className="text-alfredo-teal-dark" />
                            DOCX
                          </button>
                          
                          {currentUser?.role === "Administrador" && (
                            <button
                              onClick={() => exportMeetingToIntegration(selectedMeeting)}
                              disabled={isExportingIntegration}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer ${
                                isExportingIntegration
                                  ? "bg-alfredo-offwhite text-alfredo-muted border border-alfredo-border cursor-not-allowed" 
                                  : "bg-alfredo-teal hover:bg-alfredo-teal-dark text-alfredo-navy border border-transparent"
                              }`}
                              title="Exportar para Base de Dados destino externo"
                            >
                              {isExportingIntegration ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Database size={12} />
                              )}
                              Exportar
                            </button>
                          )}

                          <button
                            onClick={() => setIsDetailsCollapsed(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-alfredo-offwhite hover:bg-[#E7EDEF] border border-alfredo-border text-xs font-medium text-alfredo-teal-dark hover:text-alfredo-navy transition-all cursor-pointer"
                            title="Recolher detalhes"
                          >
                            <EyeOff size={12} />
                            Recolher
                          </button>
                        </div>
                      </div>

                      {/* Active meeting tags and quick adder */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-xs text-alfredo-muted mr-1 flex items-center gap-1">
                          <Tag size={11} />
                          Tags:
                        </span>
                        {selectedMeeting.tags.map((tag) => (
                          <span 
                            key={tag}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-alfredo-border rounded-md text-alfredo-graphite text-xs font-medium group/tag"
                          >
                            {tag}
                            <button
                              onClick={() => removeTagFromMeeting(tag)}
                              className="text-alfredo-muted hover:text-alfredo-coral transition-colors"
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
                              className="flex items-center gap-1 px-2 py-0.5 border border-dashed border-alfredo-border hover:border-alfredo-border rounded text-alfredo-graphite text-xs transition-colors cursor-pointer"
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
                                className="bg-alfredo-offwhite border border-alfredo-border rounded px-1.5 py-0.5 text-xs text-alfredo-navy max-w-24 focus:outline-none focus:border-alfredo-teal/60"
                                autoFocus
                              />
                              <button
                                onClick={() => addTagToMeeting(newTagInput)}
                                className="p-1 rounded bg-alfredo-offwhite hover:bg-[#E1E8EB] text-alfredo-teal-dark transition-colors"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                onClick={() => { setShowTagMenu(false); setNewTagInput(""); }}
                                className="p-1 rounded bg-alfredo-offwhite hover:bg-[#E1E8EB] text-alfredo-muted"
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
                <div className="px-6 border-b border-alfredo-border flex gap-4 bg-alfredo-offwhite shrink-0">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`py-3.5 px-1 font-semibold text-xs tracking-wide uppercase border-b-2 transition-colors cursor-pointer ${
                      activeTab === "summary" 
                        ? "border-alfredo-teal/60 text-alfredo-teal-dark font-bold" 
                        : "border-transparent text-alfredo-graphite hover:text-alfredo-navy"
                    }`}
                  >
                    Resumo Inteligente & Tópicos
                  </button>
                  <button
                    onClick={() => setActiveTab("transcript")}
                    className={`py-3.5 px-1 font-semibold text-xs tracking-wide uppercase border-b-2 transition-colors cursor-pointer ${
                      activeTab === "transcript" 
                        ? "border-alfredo-teal/60 text-alfredo-teal-dark font-bold" 
                        : "border-transparent text-alfredo-graphite hover:text-alfredo-navy"
                    }`}
                  >
                    Transcrição Completa
                  </button>
                </div>

                {/* TAB WINDOW CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
                  
                  {/* TRANSCRIPT TAB */}
                  {activeTab === "transcript" && (
                    <div className="space-y-4 max-w-4xl mx-auto">
                      <div className="p-4 bg-alfredo-offwhite border border-alfredo-border rounded-xl text-xs text-alfredo-graphite flex items-start gap-2.5">
                        <Info size={16} className="text-alfredo-teal-dark shrink-0 mt-0.5" />
                        <div>
                          A transcrição é processada na íntegra pelo modelo de voz do Gemini. O modelo detecta automaticamente os locutores na reunião física para organizar o diálogo em parágrafos separados.
                        </div>
                      </div>

                      {/* SPEAKER IDENTIFICATION TOOL */}
                      {getSpeakersFromTranscript(selectedMeeting.transcript).length > 0 && (
                        <div className="p-4 bg-alfredo-offwhite border border-alfredo-border rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-alfredo-teal-dark" />
                            <h4 className="text-xs font-bold text-alfredo-navy uppercase tracking-wider">Identificação Manual de Palestrantes</h4>
                          </div>
                          <p className="text-[11px] text-alfredo-graphite">
                            Substitua as marcas automáticas da transcrição (ex: "Palestrante 1") pelos nomes reais dos participantes de forma global. Selecione da lista ou digite e aperte Enter:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {getSpeakersFromTranscript(selectedMeeting.transcript).map((speaker, sIdx) => (
                              <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white/85 border border-alfredo-border rounded-lg text-xs">
                                <div className="flex items-center gap-2">
                                  <User size={13} className="text-alfredo-teal-dark" />
                                  <span className="font-mono text-alfredo-graphite font-bold">{speaker}</span>
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
                                    className="bg-white border border-alfredo-border rounded px-2 py-1 text-[11px] text-alfredo-graphite focus:outline-none focus:border-alfredo-teal/60 cursor-pointer font-sans"
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
                                    className="bg-white border border-alfredo-border rounded px-2 py-1 text-[11px] text-alfredo-graphite placeholder-alfredo-muted focus:outline-none focus:border-alfredo-teal/60 w-24"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white border border-alfredo-border rounded-xl p-6 shadow-inner">
                        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-alfredo-border">
                          <h4 className="text-xs font-bold text-alfredo-navy uppercase tracking-wider">Transcrição</h4>
                          {isEditingTranscript ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setIsEditingTranscript(false)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-alfredo-border bg-white px-3 py-1.5 text-[11px] font-semibold text-alfredo-graphite transition-colors hover:text-alfredo-navy cursor-pointer"
                              >
                                <X size={13} /> Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const txt = transcriptDraft;
                                  setMeetings(prev =>
                                    prev.map(m => (m.id === selectedMeeting.id ? { ...m, transcript: txt } : m)),
                                  );
                                  setIsEditingTranscript(false);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-alfredo-teal px-3 py-1.5 text-[11px] font-bold text-alfredo-navy transition-all hover:bg-alfredo-teal active:scale-[0.98] cursor-pointer"
                              >
                                <Check size={13} /> Salvar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTranscriptDraft(selectedMeeting.transcript || "");
                                setIsEditingTranscript(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-alfredo-border bg-alfredo-offwhite px-3 py-1.5 text-[11px] font-semibold text-alfredo-graphite transition-colors hover:border-alfredo-teal/40 hover:text-alfredo-navy cursor-pointer shrink-0"
                            >
                              <Edit2 size={13} /> Editar
                            </button>
                          )}
                        </div>
                        {isEditingTranscript ? (
                          <textarea
                            value={transcriptDraft}
                            onChange={(e) => setTranscriptDraft(e.target.value)}
                            rows={22}
                            spellCheck
                            className="custom-scrollbar w-full resize-y rounded-lg border border-alfredo-border bg-alfredo-offwhite p-4 font-mono text-sm leading-relaxed text-alfredo-graphite focus:border-alfredo-teal/60 focus:outline-none"
                            placeholder="Edite o texto completo da transcrição. Use uma linha em branco para separar as falas e o formato 'Nome: fala' para manter os locutores."
                          />
                        ) : (
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

                            const colorClass = isEmerald ? "text-alfredo-teal-dark" : isBlue ? "text-alfredo-teal-dark" : "text-alfredo-warning";

                            return (
                              <div key={i} className="mb-4 pb-4 border-b border-alfredo-border last:border-0 last:mb-0 last:pb-0">
                                {speakerName ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                                      {speakerName}
                                    </span>
                                    <p className="text-sm text-alfredo-graphite leading-relaxed m-0 text-justify">
                                      {speechContent}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-alfredo-graphite leading-relaxed m-0 text-justify">
                                    {para}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        )}
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
                          <div className="p-1.5 rounded-lg bg-alfredo-offwhite border border-alfredo-border text-alfredo-teal-dark">
                            <Sparkles size={14} />
                          </div>
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-alfredo-navy">
                            Visão Geral Inteligente (IA)
                          </h3>
                        </div>
                        <p className="text-sm text-alfredo-graphite leading-relaxed">
                          {selectedMeeting.overview}
                        </p>
                      </div>

                      {/* BENTO BLOCK 1.5: CONFIRMED PARTICIPANTS */}
                      <div className="glass rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-alfredo-offwhite border border-alfredo-border text-alfredo-teal-dark">
                              <Users size={14} />
                            </div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-alfredo-navy">
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
                            className="flex items-center gap-1.5 text-[11px] font-bold text-alfredo-teal-dark hover:text-alfredo-teal-dark bg-alfredo-surface-teal hover:bg-alfredo-surface-teal border border-alfredo-teal/30 rounded-lg px-2.5 py-1 transition-all"
                          >
                            <Edit2 size={12} />
                            Editar Participantes
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Column 1: Triforce */}
                          <div className="p-4 bg-alfredo-offwhite border border-alfredo-border rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2 h-2 rounded-full bg-alfredo-teal"></span>
                              <h4 className="text-xs font-bold text-alfredo-navy uppercase tracking-wider">Triforce Consultoria</h4>
                            </div>
                            <div className="space-y-2">
                              {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.length === 0 ? (
                                <div className="p-3 text-center text-alfredo-muted italic text-[11px] bg-alfredo-offwhite border border-alfredo-border rounded-lg">
                                  Nenhum consultor identificado ou adicionado.
                                </div>
                              ) : (
                                getMeetingParticipantsList(selectedMeeting, permittedUsers).membersTriforce.map((member, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white/85 border border-alfredo-border rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-alfredo-teal/10 text-alfredo-teal-dark font-bold flex items-center justify-center text-[10px]">
                                        {member[0] || "?"}
                                      </div>
                                      <span className="text-alfredo-graphite font-medium">{member}</span>
                                    </div>
                                    <span className="text-[9px] bg-alfredo-surface-teal text-alfredo-teal-dark border border-alfredo-teal/30 px-1.5 py-0.5 rounded-full font-sans font-bold">
                                      Presente
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Column 2: Client */}
                          <div className="p-4 bg-alfredo-offwhite border border-alfredo-border rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2 h-2 rounded-full bg-alfredo-teal"></span>
                              <h4 className="text-xs font-bold text-alfredo-navy uppercase tracking-wider">Cliente / Parceiros</h4>
                            </div>
                            <div className="space-y-2">
                              {getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.length === 0 ? (
                                <div className="p-3 text-center text-alfredo-muted italic text-[11px] bg-alfredo-offwhite border border-alfredo-border rounded-lg">
                                  Nenhum cliente identificado ou adicionado.
                                </div>
                              ) : (
                                getMeetingParticipantsList(selectedMeeting, permittedUsers).membersClient.map((member, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white/85 border border-alfredo-border rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-alfredo-teal/10 text-alfredo-teal-dark font-bold flex items-center justify-center text-[10px]">
                                        {member[0] || "?"}
                                      </div>
                                      <span className="text-alfredo-graphite font-medium">{member}</span>
                                    </div>
                                    <span className="text-[9px] bg-alfredo-surface-teal text-alfredo-teal-dark border border-alfredo-teal/30 px-1.5 py-0.5 rounded-full font-sans font-bold">
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
                          <div className="p-1.5 rounded-lg bg-alfredo-offwhite border border-alfredo-border text-alfredo-warning">
                            <CheckSquare size={14} />
                          </div>
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-alfredo-navy">
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
                            <div key={idx} className="flex items-start gap-3 p-3 bg-alfredo-offwhite border border-alfredo-border hover:border-alfredo-border rounded-xl transition-all">
                              <span className="w-5 h-5 rounded-full bg-alfredo-warning/10 text-alfredo-warning flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-alfredo-graphite leading-relaxed font-sans">
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
                            <div className="p-1.5 rounded-lg bg-alfredo-offwhite border border-alfredo-border text-alfredo-teal-dark">
                              <Info size={14} />
                            </div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-alfredo-navy">
                              Tópicos Discutidos
                            </h3>
                          </div>
                          
                          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {selectedMeeting.topics.length === 0 ? (
                              <p className="text-xs text-alfredo-muted">Nenhum tópico extraído.</p>
                            ) : (
                              selectedMeeting.topics.map((t, idx) => (
                                <div key={idx} className="p-3 bg-alfredo-offwhite border border-alfredo-border hover:border-alfredo-teal/30 rounded-xl transition-all">
                                  <h4 className="text-xs font-semibold text-alfredo-navy flex items-center gap-2 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-alfredo-teal"></span>
                                    {t.topic}
                                  </h4>
                                  <p className="text-[11px] text-alfredo-graphite leading-relaxed">
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
                              <div className="p-1.5 rounded-lg bg-alfredo-offwhite border border-alfredo-border text-alfredo-teal-dark">
                                <CheckSquare size={14} />
                              </div>
                              <h3 className="font-semibold text-sm uppercase tracking-wider text-alfredo-navy">
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
                                className="flex items-center gap-1 text-[11px] font-bold text-alfredo-teal-dark hover:text-alfredo-teal-dark bg-alfredo-surface-teal hover:bg-alfredo-surface-teal border border-alfredo-teal/30 rounded-lg px-2 py-1 transition-all cursor-pointer"
                              >
                                <Plus size={11} />
                                Nova Tarefa
                              </button>
                              
                              <div className="text-[10px] text-alfredo-graphite font-mono bg-alfredo-offwhite py-0.5 px-2 rounded border border-alfredo-border">
                                {selectedMeeting.actions.filter(a => a.status === "completed").length} / {selectedMeeting.actions.length} Concluído
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {selectedMeeting.actions.length > 0 && (
                            <div className="w-full h-1 bg-alfredo-offwhite rounded-full mb-4 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-alfredo-teal to-alfredo-teal transition-all duration-500"
                                style={{
                                  width: `${(selectedMeeting.actions.filter(a => a.status === "completed").length / selectedMeeting.actions.length) * 100}%`
                                }}
                              ></div>
                            </div>
                          )}
                          
                          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {selectedMeeting.actions.length === 0 ? (
                              <p className="text-xs text-alfredo-muted">Nenhuma ação ou tarefa definida para esta reunião.</p>
                            ) : (
                              selectedMeeting.actions.map((a, idx) => {
                                const completed = a.status === "completed";
                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => toggleActionItemStatus(selectedMeeting.id, idx)}
                                    className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer group transition-all ${
                                      completed 
                                        ? "bg-alfredo-surface-teal border-alfredo-teal/25 opacity-80" 
                                        : "bg-alfredo-offwhite border border-alfredo-border hover:border-alfredo-border"
                                    }`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        completed 
                                          ? "bg-alfredo-teal border-alfredo-teal text-alfredo-navy" 
                                          : "border-alfredo-border group-hover:border-alfredo-teal/60 bg-alfredo-offwhite"
                                      }`}>
                                        {completed && <Check size={10} strokeWidth={3} />}
                                      </div>
                                    </div>
 
                                    <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[12px] font-medium leading-normal break-words ${completed ? "text-alfredo-muted line-through" : "text-alfredo-graphite"}`}>
                                          {a.action}
                                        </p>
                                        
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <span className="text-[9px] text-alfredo-graphite font-mono bg-white px-1.5 py-0.5 rounded border border-alfredo-border">
                                            Resp: <b className="text-alfredo-navy">{a.assignee}</b>
                                          </span>
                                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                            a.priority === "Alta" 
                                              ? "bg-alfredo-coral/10 text-alfredo-coral border border-alfredo-coral/30" 
                                              : a.priority === "Média" 
                                                ? "bg-alfredo-warning/10 text-alfredo-warning border border-alfredo-warning/30" 
                                                : "bg-alfredo-teal/10 text-alfredo-teal-dark border border-alfredo-teal/30"
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
                                          className="p-1 text-alfredo-graphite hover:text-alfredo-teal-dark hover:bg-white rounded transition-colors cursor-pointer"
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
                                          className="p-1 text-alfredo-graphite hover:text-alfredo-coral hover:bg-white rounded transition-colors cursor-pointer"
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
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-alfredo-offwhite sm:p-6">
                {activeView === "history" && (
                  <div className="max-w-5xl mx-auto space-y-8 py-4">
                    {/* Welcome Banner */}
                    <div className="relative p-6 rounded-2xl border border-alfredo-border bg-gradient-to-br from-white via-alfredo-offwhite to-alfredo-offwhite overflow-hidden shadow-xl">
                      <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-alfredo-teal via-alfredo-offwhite to-transparent"></div>
                      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <span className="text-[10px] bg-alfredo-teal/10 text-alfredo-teal-dark border border-alfredo-teal/30 py-1 px-2.5 rounded-full font-mono uppercase tracking-wider font-bold">
                            Alfredo v2.0
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-alfredo-navy mt-3 tracking-tight">
                            Bem-vindo de volta, {currentUser?.name || "Usuário"}!
                          </h2>
                          <p className="text-xs text-alfredo-graphite mt-1">
                            Acompanhe os alinhamentos corporativos e transcreva reuniões físicas de forma simples e discreta.
                          </p>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-[10px] text-alfredo-muted font-mono">Triforce Workspace</p>
                          <p className="text-xs text-alfredo-graphite font-bold mt-0.5">{currentUser?.role || "Consultor"}</p>
                        </div>
                      </div>
                    </div>



                    {/* Atividades Recentes */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-alfredo-border pb-2">
                        <h3 className="text-xs font-bold uppercase text-alfredo-navy tracking-wider flex items-center gap-1.5">
                          <Activity size={14} className="text-alfredo-teal-dark" />
                          Atividades Recentes
                        </h3>
                        <span className="text-[10px] text-alfredo-muted font-mono">Histórico Completo</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {meetings.length === 0 ? (
                          <div className="col-span-2 py-12 text-center text-alfredo-muted text-xs border border-dashed border-alfredo-border rounded-2xl bg-alfredo-offwhite">
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
                              className="p-4 rounded-xl border border-alfredo-border hover:border-alfredo-teal/30 bg-alfredo-offwhite hover:bg-alfredo-offwhite transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] bg-alfredo-offwhite text-alfredo-graphite border border-alfredo-border font-mono py-0.5 px-1.5 rounded">
                                  {m.id}
                                </span>
                                <span className="text-[10px] text-alfredo-muted font-mono">{m.date}</span>
                              </div>
                              <h4 className="text-xs font-bold text-alfredo-navy group-hover:text-alfredo-teal-dark transition-colors line-clamp-1">
                                {m.title}
                              </h4>
                              <p className="text-[11px] text-alfredo-graphite mt-1 line-clamp-2 leading-relaxed">
                                {m.overview}
                              </p>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-alfredo-border">
                                <div className="flex gap-1">
                                  {m.tags.slice(0, 2).map((t, i) => (
                                    <span key={i} className="text-[8px] bg-white text-alfredo-graphite border border-alfredo-border py-0.5 px-1 rounded">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-alfredo-teal-dark font-semibold group-hover:underline flex items-center gap-1">
                                  Abrir Detalhes →
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Logo Watermark Footer */}
                    <div className="flex flex-col items-center justify-center pt-8 border-t border-alfredo-border opacity-40 hover:opacity-70 transition-opacity">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-alfredo-muted font-mono text-[9px] tracking-wider uppercase">SUPORTADO POR</span>
                        <span className="text-alfredo-navy font-bold text-xs">TRIFORCE CONSULTORIA</span>
                      </div>
                      <p className="text-[9px] text-alfredo-muted font-mono italic">
                        "Desenvolvida pela Triforce Consultoria, para uso exclusivo interno"
                      </p>
                    </div>

                  </div>
                )}

                {activeView === "new_meeting" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4 px-4 sm:px-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-lg font-bold text-alfredo-navy tracking-tight flex items-center gap-2">
                        <span className="p-1 rounded bg-alfredo-offwhite text-alfredo-teal-dark"><Mic size={14} /></span>
                        Iniciar Nova Sessão de Reunião
                      </h2>
                      <p className="text-xs text-alfredo-graphite mt-1">
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
                          className="p-6 rounded-2xl border-2 border-alfredo-border hover:border-alfredo-teal/50 bg-alfredo-offwhite hover:bg-alfredo-offwhite transition-all cursor-pointer flex flex-col items-center text-center justify-between group h-72 shadow-xl"
                        >
                          <div className="my-auto space-y-3">
                            <div className="w-16 h-16 rounded-full bg-alfredo-teal/10 border border-alfredo-teal/30 text-alfredo-teal-dark flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                              <Calendar size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-alfredo-navy uppercase tracking-wider group-hover:text-alfredo-teal-dark transition-colors">
                              Reuniões da Agenda
                            </h3>
                            <p className="text-xs text-alfredo-graphite max-w-xs leading-relaxed">
                              Busque seus compromissos no Google Agenda, valide o dia/horário e associe a gravação.
                            </p>
                          </div>
                          <span className="text-[10px] text-alfredo-teal-dark font-semibold group-hover:underline">
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
                          className="p-6 rounded-2xl border-2 border-alfredo-border hover:border-alfredo-teal/50 bg-alfredo-offwhite hover:bg-alfredo-offwhite transition-all cursor-pointer flex flex-col items-center text-center justify-between group h-72 shadow-xl"
                        >
                          <div className="my-auto space-y-3">
                            <div className="w-16 h-16 rounded-full bg-alfredo-teal/10 border border-alfredo-teal/30 text-alfredo-teal-dark flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(27,166,182,0.15)]">
                              <Plus size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-alfredo-navy uppercase tracking-wider group-hover:text-alfredo-teal-dark transition-colors">
                              Criar Reunião Avulsa
                            </h3>
                            <p className="text-xs text-alfredo-graphite max-w-xs leading-relaxed">
                              Inicie uma reunião livre imediatamente do zero. Defina o título e comece a gravar ou importar áudio.
                            </p>
                          </div>
                          <span className="text-[10px] text-alfredo-teal-dark font-semibold group-hover:underline">
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
                            className="text-xs text-alfredo-graphite hover:text-alfredo-navy transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft size={14} /> Voltar para opções
                          </button>
                          <span className="text-[10px] font-mono text-alfredo-muted uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-alfredo-border">
                            Integração Google Calendar
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Calendar Picker & Controls */}
                          <div className="md:col-span-1 p-5 rounded-2xl border border-alfredo-border bg-alfredo-offwhite space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy border-b border-alfredo-border pb-2 flex items-center gap-1.5">
                              <Calendar size={13} className="text-alfredo-teal-dark" />
                              Filtro por Data
                            </h3>

                            {/* Connection Status Badge */}
                            <div className="flex items-center justify-between text-[10px] border-b border-alfredo-border pb-2">
                              <span className="text-alfredo-muted font-mono font-bold uppercase">Google Agenda</span>
                              {googleAccessToken ? (
                                <span className="text-alfredo-teal-dark font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-alfredo-teal rounded-full"></span>
                                  Real
                                </span>
                              ) : (
                                <span className="text-alfredo-muted font-mono uppercase bg-alfredo-offwhite px-1.5 py-0.5 rounded border border-alfredo-border">
                                  Demonstração
                                </span>
                              )}
                            </div>

                            {/* Select Date */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Escolha a data</label>
                              <input
                                type="date"
                                value={calendarSelectedDate}
                                onChange={(e) => setCalendarSelectedDate(e.target.value)}
                                className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 font-mono"
                              />
                            </div>

                            {googleAccessToken ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleRefreshCalendar}
                                  disabled={isSyncingCalendar}
                                  className="flex-1 py-2 px-3 rounded-xl border border-alfredo-border hover:border-alfredo-teal/30 bg-white hover:bg-alfredo-offwhite text-alfredo-graphite font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  {isSyncingCalendar ? (
                                    <span className="w-3 h-3 rounded-full border border-alfredo-border border-t-alfredo-teal animate-spin"></span>
                                  ) : (
                                    <RefreshCw size={12} className="text-alfredo-teal-dark" />
                                  )}
                                  Atualizar Agenda
                                </button>
                                <button
                                  onClick={handleDisconnectGoogleCalendar}
                                  className="px-3 py-2 rounded-xl border border-alfredo-border hover:border-alfredo-coral/40 text-alfredo-graphite hover:text-alfredo-coral text-xs cursor-pointer"
                                  title="Desconectar Google Agenda"
                                >
                                  <LogOut size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={handleLinkGoogleCalendar}
                                disabled={isSyncingCalendar}
                                className="w-full py-2 px-3 rounded-xl border border-alfredo-teal/40 hover:border-alfredo-teal/60 bg-alfredo-surface-teal hover:bg-alfredo-surface-teal text-alfredo-navy font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {isSyncingCalendar ? (
                                  <span className="w-3 h-3 rounded-full border border-alfredo-border border-t-alfredo-teal animate-spin"></span>
                                ) : (
                                  <Calendar size={12} className="text-alfredo-teal-dark" />
                                )}
                                Conectar Google Agenda
                              </button>
                            )}

                            {!googleAccessToken && (
                              <p className="text-[9px] text-alfredo-muted text-center leading-relaxed">
                                Autorize o acesso à sua conta Google para ver e criar compromissos na sua própria agenda.
                              </p>
                            )}

                            {calendarSyncSuccess && (
                              <p className="text-[10px] text-alfredo-teal-dark font-mono mt-1 bg-alfredo-surface-teal border border-alfredo-teal/30 p-1.5 rounded text-center">
                                {calendarSyncSuccess}
                              </p>
                            )}
                          </div>

                          {/* Events Display List & Confirmation Panel */}
                          <div className="md:col-span-2 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy border-b border-alfredo-border pb-2 flex items-center justify-between">
                              <span>Eventos Encontrados</span>
                              <span className="text-[10px] text-alfredo-muted font-mono">
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
                                  <div className="p-8 rounded-xl border border-dashed border-alfredo-border bg-alfredo-offwhite text-center text-alfredo-muted text-xs">
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
                                            ? "bg-alfredo-surface-teal border-alfredo-teal/60 text-alfredo-navy shadow-md shadow-none" 
                                            : "bg-alfredo-offwhite border-alfredo-border hover:border-alfredo-border text-alfredo-graphite"
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-1.5">
                                          <span className="text-[9px] bg-alfredo-offwhite text-alfredo-graphite font-mono py-0.5 px-2 rounded border border-alfredo-border">
                                            {ev.time}
                                          </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-alfredo-navy truncate">{ev.title}</h4>
                                        <p className="text-[9px] text-alfredo-muted mt-1 truncate">Part.: {ev.attendees.join(", ")}</p>
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
                                className="p-5 rounded-2xl border border-alfredo-teal/25 bg-alfredo-surface-teal space-y-4"
                              >
                                <div className="flex items-center gap-2 border-b border-alfredo-teal/25 pb-2">
                                  <AlertCircle size={14} className="text-alfredo-teal-dark" />
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy">
                                    Confirmação dos Dados do Evento
                                  </h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="space-y-1 sm:col-span-1">
                                    <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Título Confirmado</label>
                                    <input
                                      type="text"
                                      value={meetingConfirmedTitle}
                                      onChange={(e) => setMeetingConfirmedTitle(e.target.value)}
                                      className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-lg py-1.5 px-2.5 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Data Confirmada</label>
                                    <input
                                      type="date"
                                      value={meetingConfirmedDate}
                                      onChange={(e) => setMeetingConfirmedDate(e.target.value)}
                                      className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-lg py-1.5 px-2.5 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 font-mono"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Horário Confirmado</label>
                                    <input
                                      type="time"
                                      value={meetingConfirmedTime}
                                      onChange={(e) => setMeetingConfirmedTime(e.target.value)}
                                      className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-lg py-1.5 px-2.5 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                  <div className="text-[10px] text-alfredo-graphite">
                                    Participantes Sincronizados: <b className="text-alfredo-navy">
                                      {getEventFormatted(selectedCalendarEvent, currentUser).attendees.length} cadastrados
                                    </b>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setIsAgendaConfirmed(true);
                                      setNewMeetingSubView("custom");
                                    }}
                                    className="py-1.5 px-4 rounded-lg bg-alfredo-teal hover:bg-alfredo-teal text-alfredo-navy font-bold text-xs transition-all shadow-md cursor-pointer"
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
                            className="text-xs text-alfredo-graphite hover:text-alfredo-navy transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft size={14} /> Voltar para opções
                          </button>
                          <span className="text-[10px] font-mono text-alfredo-muted uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-alfredo-border">
                            {isAgendaConfirmed ? "Compromisso Vinculado" : "Sessão Avulsa"}
                          </span>
                        </div>

                        {/* Config and Details Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Configuration Sidebar */}
                          <div className="md:col-span-1 p-5 rounded-2xl border border-alfredo-border bg-alfredo-offwhite space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy border-b border-alfredo-border pb-2 flex items-center gap-1.5">
                              <Settings size={13} className="text-alfredo-teal-dark" />
                              Metadados da Sessão
                            </h3>

                            {/* Meeting Title Input */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Título da Reunião</label>
                              <input
                                id="custom-meeting-title"
                                type="text"
                                placeholder="ex: Workshop Recicle ou Alinhamento Geral"
                                value={meetingConfirmedTitle}
                                onChange={(e) => setMeetingConfirmedTitle(e.target.value)}
                                className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                              />
                            </div>

                            {/* Date Field */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Data da Sessão</label>
                              <input
                                type="date"
                                value={meetingConfirmedDate}
                                onChange={(e) => setMeetingConfirmedDate(e.target.value)}
                                className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 font-mono"
                              />
                            </div>

                            {/* Time Field */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Horário de Início</label>
                              <input
                                type="time"
                                value={meetingConfirmedTime}
                                onChange={(e) => setMeetingConfirmedTime(e.target.value)}
                                className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Participantes internos</label>
                              <textarea rows={3} value={meetingInternalParticipants} onChange={(e) => setMeetingInternalParticipants(e.target.value)} placeholder="Um nome por linha ou separados por vírgula" className="w-full resize-none bg-alfredo-offwhite border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-alfredo-muted font-mono font-bold">Clientes e parceiros</label>
                              <textarea rows={3} value={meetingExternalParticipants} onChange={(e) => setMeetingExternalParticipants(e.target.value)} placeholder="Um nome por linha ou separados por vírgula" className="w-full resize-none bg-alfredo-offwhite border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60" />
                            </div>
                          </div>

                          {/* Recording, Upload & Simulation Center */}
                          <div className="md:col-span-2 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy border-b border-alfredo-border pb-2">
                              Selecione o Método de Registro
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                              {/* 1. REAL MICROPHONE RECORDER */}
                              <div className="p-5 rounded-2xl border border-alfredo-border bg-alfredo-offwhite flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="text-xs font-bold text-alfredo-navy flex items-center gap-1.5 uppercase tracking-wider">
                                      <span className="w-2 h-2 rounded-full bg-alfredo-coral animate-pulse"></span>
                                      Captura de Áudio (Microfone Local)
                                    </h4>
                                    <p className="text-[11px] text-alfredo-graphite mt-1 leading-relaxed">
                                      Grave a reunião ao vivo usando o microfone do seu dispositivo. O Alfredo irá processar, transcrever e gerar a ata completa do encontro.
                                    </p>
                                  </div>

                                  {isRecording && (
                                    <span className="text-[10px] font-mono font-bold text-alfredo-navy bg-alfredo-offwhite border border-alfredo-border py-1 px-2.5 rounded flex items-center gap-1.5">
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
                                      className="w-full h-16 bg-alfredo-offwhite rounded-xl border border-alfredo-border" 
                                      width={400} 
                                      height={64} 
                                    />
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                      <span className="rounded-lg bg-alfredo-surface-teal px-2 py-1 text-alfredo-teal-dark">Protegidos no dispositivo: {localProtectedChunks}</span>
                                      <span className="rounded-lg bg-alfredo-surface-teal px-2 py-1 text-alfredo-teal-dark">Confirmados na nuvem: {cloudProtectedChunks}</span>
                                      {!navigator.onLine && <span className="rounded-lg bg-alfredo-coral/15 px-2 py-1">Sem internet — a gravação continua localmente</span>}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={pauseRecording}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-alfredo-offwhite hover:bg-[#E7EDEF] text-xs font-semibold text-alfredo-navy transition-colors cursor-pointer"
                                      >
                                        {isRecordingPaused ? <Play size={12} /> : <Pause size={12} />}
                                        {isRecordingPaused ? "Retomar" : "Pausar"}
                                      </button>
                                      <button
                                        onClick={stopRecording}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-alfredo-coral hover:bg-alfredo-coral text-xs font-bold text-alfredo-navy transition-colors cursor-pointer"
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
                                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-alfredo-coral to-alfredo-coral hover:from-alfredo-coral hover:to-alfredo-coral text-alfredo-navy font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-none"
                                    >
                                      <Mic size={14} />
                                      Iniciar Gravação do Encontro
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* 2. FILE ATTACHMENT UPLOADER */}
                              <div className="p-5 rounded-2xl border border-alfredo-border bg-alfredo-offwhite">
                                <h4 className="text-xs font-bold text-alfredo-navy flex items-center gap-1.5 uppercase tracking-wider">
                                  <Upload size={13} className="text-alfredo-teal-dark" />
                                  Anexar Gravação de Áudio Pronta
                                </h4>
                                <p className="text-[11px] text-alfredo-graphite mt-1 leading-relaxed">
                                  Anexe um áudio pronto (gravador, celular, etc.). O sistema valida o formato e comprime antes de salvar, para não pesar no armazenamento.
                                </p>

                                <div className="mt-4">
                                  <label 
                                    htmlFor="file-upload-input-custom"
                                    className="border-2 border-dashed border-alfredo-border hover:border-alfredo-teal/50 bg-alfredo-offwhite hover:bg-white/80 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                                  >
                                    <Upload size={20} className="text-alfredo-muted group-hover:text-alfredo-teal-dark group-hover:scale-110 transition-all" />
                                    <span className="text-xs font-semibold text-alfredo-graphite group-hover:text-alfredo-navy transition-colors">
                                      Clique para selecionar ou arraste o arquivo aqui
                                    </span>
                                    <span className="text-[9px] text-alfredo-muted font-mono">
                                      MP3, WAV, M4A, WEBM, OGG, AAC · até 100 MB (comprimido automaticamente)
                                    </span>
                                  </label>
                                  <input
                                    id="file-upload-input-custom"
                                    type="file"
                                    accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac,.mp4"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                  />
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
                      <h2 className="text-lg font-bold text-alfredo-navy tracking-tight flex items-center gap-2">
                        <span className="p-1 rounded bg-alfredo-offwhite text-alfredo-teal-dark"><Users size={14} /></span>
                        Módulo de Administração Corporativa
                      </h2>
                      <p className="text-xs text-alfredo-graphite mt-1">
                        Gerencie colaboradores e cargos. O acesso ao app é só por usuários pré-definidos; aqui você define perfil e permissões.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Form Panel */}
                      <div className="md:col-span-1 p-5 rounded-2xl border border-alfredo-border bg-alfredo-offwhite">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy border-b border-alfredo-border pb-2 mb-4">
                          Autorizar Novo Usuário
                        </h3>

                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
                            const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim().toLowerCase();
                            const role = (form.elements.namedItem("role") as HTMLInputElement).value;
                            
                            if (!name || !email) {
                              setCustomAlertMessage("Preencha nome e e-mail.");
                              return;
                            }

                            if (permittedUsers.some((u) => u.email.toLowerCase() === email)) {
                              setCustomAlertMessage("Este e-mail já está cadastrado no perfil.");
                              return;
                            }

                            const newUser: PermittedUser = {
                              id: email,
                              name,
                              email,
                              role: role || "user",
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
                            setCustomAlertMessage("Perfil autorizado. O colaborador deve criar/entrar com esse e-mail na tela de login (Auth).");
                          }}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-alfredo-muted font-bold block">Nome Completo</label>
                            <input
                              name="name"
                              type="text"
                              required
                              placeholder="Ex: Pedro Henrique"
                              className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-lg py-1.5 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-alfredo-muted font-bold block">E-mail do Google</label>
                            <input
                              name="email"
                              type="email"
                              required
                              placeholder="Ex: consultor@triforceconsultoria.com"
                              className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-lg py-1.5 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-mono text-alfredo-muted font-bold block">Cargo / Função</label>
                            <select
                              name="role"
                              required
                              className="w-full bg-alfredo-offwhite border border-alfredo-border rounded-lg py-1.5 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                            >
                              <option value="user">user (Sem acesso à administração e integrações)</option>
                              <option value="Administrador">Administrador (Acesso total)</option>
                            </select>
                          </div>

                          <p className="text-[10px] text-alfredo-muted leading-relaxed">
                            A senha fica só no Supabase Auth. O usuário cria a conta na tela de login; aqui você só define nome/cargo.
                          </p>

                          <button
                            type="submit"
                            className="w-full py-2 px-4 rounded-xl bg-alfredo-teal hover:bg-alfredo-teal-dark text-alfredo-navy font-bold text-xs transition-all cursor-pointer shadow-lg block"
                          >
                            Autorizar Colaborador
                          </button>
                        </form>
                      </div>

                      {/* Users List Grid */}
                      <div className="md:col-span-2 p-5 rounded-2xl border border-alfredo-border bg-alfredo-offwhite flex flex-col">
                        <div className="flex justify-between items-center border-b border-alfredo-border pb-2 mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy">
                            Colaboradores Autorizados ({permittedUsers.length})
                          </h3>
                          <span className="text-[9px] text-alfredo-muted font-mono">Controle Estrito de Ingressos</span>
                        </div>

                        <div className="space-y-2.5 overflow-y-auto max-h-96 pr-1 custom-scrollbar">
                          {permittedUsers.map((user) => (
                            <div 
                              key={user.email} 
                              className="p-3 bg-white/80 border border-alfredo-border rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full object-cover border border-alfredo-border"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-alfredo-navy">{user.name}</h4>
                                    <span className="text-[9px] bg-white text-alfredo-graphite py-0.5 px-1.5 rounded">
                                      {user.role}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-alfredo-muted mt-0.5">{user.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="text-[9px] text-alfredo-muted uppercase font-mono block">Senha (Auth)</span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await requestPasswordReset(user.email);
                                        setCustomAlertMessage(`E-mail de redefinição enviado para ${user.email}.`);
                                      } catch (err) {
                                        setCustomAlertMessage(
                                          err instanceof Error ? err.message : "Falha ao enviar e-mail de senha."
                                        );
                                      }
                                    }}
                                    className="text-[10px] text-alfredo-teal-dark font-mono bg-white hover:bg-white py-0.5 px-1.5 rounded border border-alfredo-border flex items-center gap-1 cursor-pointer transition-colors mt-0.5"
                                    title="Envia e-mail para o usuário confirmar e trocar a senha"
                                  >
                                    <Lock size={9} className="text-alfredo-teal-dark" />
                                    <span>Enviar link</span>
                                  </button>
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
                                  className="p-1.5 hover:bg-white rounded text-alfredo-muted hover:text-alfredo-coral transition-colors cursor-pointer"
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

                {activeView === "integrations" && (
                  <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-alfredo-teal/30 bg-alfredo-teal/10 text-alfredo-teal-dark">
                      <Database size={24} />
                    </div>
                    <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-alfredo-teal-dark/90 uppercase">
                      Integrações
                    </p>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-alfredo-navy sm:text-3xl">
                      Integrações do Alfredo
                    </h2>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-alfredo-graphite">
                      Gere uma chave para conexões externas e exporte resumos, relatórios e ações por API ou webhook.
                    </p>
                    <div className="mt-8 w-full max-w-lg rounded-xl border border-alfredo-border bg-white p-4 text-left">
                      <label className="text-[10px] font-bold uppercase text-alfredo-muted">Chave da API Alfredo</label>
                      {generatedApiKey && <code className="mt-2 block break-all rounded-lg bg-alfredo-offwhite p-2 text-[11px]">{generatedApiKey}</code>}
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(apiUrl("/api/integrations/api-keys"), {
                              method: "POST",
                              headers: { "Content-Type": "application/json", ...(await getApiAuthHeaders()) },
                              body: JSON.stringify({ name: "Conexão externa", scopes: ["meetings:read", "reports:read", "actions:read"] }),
                            });
                            const data = await readApiJson<{ apiKey?: string; error?: string }>(response);
                            if (!response.ok || !data.apiKey) throw new Error(data.error || "Falha ao gerar chave.");
                            setGeneratedApiKey(data.apiKey);
                          } catch (error: any) { setCustomAlertMessage(error.message); }
                        }}
                        className="mt-3 rounded-xl bg-alfredo-teal px-4 py-2 text-xs font-bold text-alfredo-navy"
                      >Gerar nova chave</button>
                      <p className="mt-2 text-[10px] text-alfredo-muted">Copie agora: a chave completa não será exibida novamente.</p>
                    </div>
                  </div>
                )}

                {activeView === "dashboard" && (
                  <DashboardView
                    meetings={meetings}
                    currentUserEmail={currentUser?.email || ""}
                    isAdmin={currentUser?.role === "Administrador"}
                    onStartRecording={() => {
                      setSelectedMeetingId(null);
                      setActiveView("new_meeting");
                      setNewMeetingSubView("choose");
                    }}
                  />
                )}

                {activeView === "backups" && (
                  <div className="max-w-4xl mx-auto space-y-6 py-4 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-alfredo-border pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-alfredo-navy tracking-tight flex items-center gap-2">
                          <span className="p-1 rounded bg-alfredo-offwhite text-alfredo-teal-dark"><HardDrive size={14} /></span>
                          Backup de Áudios
                        </h2>
                        <p className="text-xs text-alfredo-graphite mt-1">
                          Áudios salvos neste navegador. Ouça, baixe ou reprocesse a transcrição com IA.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={recoverCloudAudios}
                          disabled={isRecoveringCloud}
                          title="Recupera áudios que estão na nuvem mas não têm backup neste navegador (ex.: outro aparelho ou falha na transcrição)."
                          className="py-1.5 px-3 rounded-lg bg-alfredo-teal/10 hover:bg-alfredo-teal/20 text-alfredo-teal-dark text-xs font-semibold border border-alfredo-teal/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        >
                          {isRecoveringCloud ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                          {isRecoveringCloud ? "Recuperando..." : "Recuperar da nuvem"}
                        </button>
                        <button
                          onClick={loadBackups}
                          className="py-1.5 px-3 rounded-lg bg-white hover:bg-alfredo-offwhite text-alfredo-graphite hover:text-alfredo-navy text-xs font-medium border border-alfredo-border hover:border-alfredo-border transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          Atualizar
                        </button>
                      </div>
                    </div>

                    {(() => {
                      // Une reuniões do banco + backups locais em um resumo único
                      const byMeetingId = new Map<string, LocalRecording>();
                      for (const b of localBackups) {
                        if (b.meetingId) byMeetingId.set(b.meetingId, b);
                        byMeetingId.set(b.id, b);
                      }

                      const summaries = [
                        ...meetings
                          .filter((m) =>
                            m.hasAudio ||
                            m.audioRecordingId ||
                            m.audioStoragePath ||
                            byMeetingId.has(m.id) ||
                            byMeetingId.has(m.audioRecordingId || "")
                          )
                          .map((m) => {
                            const backup =
                              (m.audioRecordingId && localBackups.find((b) => b.id === m.audioRecordingId)) ||
                              localBackups.find((b) => b.meetingId === m.id);
                            const storagePath = resolveMeetingStoragePath(m, backup);
                            return {
                              key: m.id,
                              title: m.title,
                              date: m.date,
                              duration: m.duration,
                              overview: m.overview,
                              status: backup?.status || (m.hasAudio ? "completed" : "pending"),
                              sizeBytes: m.audioSizeBytes || backup?.compressedBytes || backup?.audioBlob?.size || 0,
                              backup,
                              meeting: m,
                              storagePath,
                            };
                          }),
                        ...localBackups
                          .filter((b) =>
                            !meetings.some(
                              (m) =>
                                m.id === b.meetingId ||
                                m.audioRecordingId === b.id ||
                                (b.storagePath && m.audioStoragePath === b.storagePath),
                            )
                          )
                          .map((b) => ({
                            key: b.id,
                            title: b.title,
                            date: b.date,
                            duration: b.duration,
                            overview: b.overview || "Áudio salvo localmente — aguardando ou sem ata vinculada.",
                            status: b.status,
                            sizeBytes: b.compressedBytes || b.audioBlob.size,
                            backup: b,
                            meeting: null as Meeting | null,
                            storagePath: b.storagePath,
                          })),
                      ].sort((a, b) => b.date.localeCompare(a.date) || b.key.localeCompare(a.key));

                      if (summaries.length === 0) {
                        return (
                          <div className="p-12 text-center border border-dashed border-alfredo-border rounded-2xl bg-alfredo-offwhite">
                            <HardDrive className="mx-auto text-alfredo-muted mb-3" size={32} />
                            <h3 className="text-sm font-bold text-alfredo-graphite">Nenhum backup de áudio neste navegador</h3>
                            <p className="text-xs text-alfredo-muted max-w-md mx-auto mt-1">
                              Grave ou anexe um áudio em Nova Reunião. Os arquivos ficam salvos localmente aqui para ouvir e reprocessar com IA.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveView("new_meeting");
                                setNewMeetingSubView("choose");
                              }}
                              className="mt-4 py-2 px-4 rounded-lg bg-alfredo-teal hover:bg-alfredo-teal text-alfredo-navy text-xs font-bold cursor-pointer"
                            >
                              Ir para Nova reunião
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div className="bg-alfredo-offwhite border border-alfredo-border text-alfredo-graphite p-3 rounded-xl text-xs leading-relaxed flex gap-2">
                            <Info size={14} className="shrink-0 mt-0.5 text-alfredo-teal-dark" />
                            Áudios são validados e comprimidos antes de salvar (mono 16 kHz / Opus) para não pesar no armazenamento do cliente.
                          </div>

                          {summaries.map((item) => {
                            const sizeMb = (item.sizeBytes / (1024 * 1024)).toFixed(2);
                            return (
                              <div
                                key={item.key}
                                className="p-4 rounded-xl border border-alfredo-border bg-alfredo-offwhite hover:bg-alfredo-offwhite transition-all space-y-3"
                              >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-sm font-bold text-alfredo-navy tracking-tight truncate">{item.title}</h3>
                                      <span
                                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                                          item.status === "completed"
                                            ? "bg-alfredo-teal/10 text-alfredo-teal-dark border-alfredo-teal/25"
                                            : item.status === "failed"
                                              ? "bg-alfredo-coral/10 text-alfredo-coral border-alfredo-coral/25"
                                              : "bg-alfredo-warning/10 text-alfredo-warning border-alfredo-warning/25"
                                        }`}
                                      >
                                        {item.status === "completed"
                                          ? "Transcrito"
                                          : item.status === "failed"
                                            ? "Falhou"
                                            : "Pendente"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-alfredo-graphite leading-relaxed line-clamp-2">
                                      {item.overview || "Sem resumo disponível."}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-alfredo-muted">
                                      <span className="flex items-center gap-1">
                                        <Clock size={11} />
                                        {Math.floor(item.duration / 60)}m {item.duration % 60}s
                                      </span>
                                      <span>•</span>
                                      <span>{sizeMb} MB</span>
                                      <span>•</span>
                                      <span>{item.date}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {item.meeting && (
                                      <button
                                        onClick={() => {
                                          setSelectedMeetingId(item.meeting!.id);
                                          setActiveView("history");
                                          setActiveTab("summary");
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-alfredo-offwhite hover:bg-[#E1E8EB] text-alfredo-navy text-xs font-bold border border-alfredo-border cursor-pointer"
                                      >
                                        Ver ata
                                      </button>
                                    )}

                                    {(item.backup?.audioBlob || (item.meeting && item.storagePath)) && (
                                      <button
                                        onClick={async () => {
                                          if (item.backup?.audioBlob) {
                                            await processRecordedAudio(
                                              item.backup.mimeType,
                                              item.backup.audioBlob,
                                              item.backup.duration,
                                              item.backup.title,
                                              {
                                                isReprocess: true,
                                                existingBackupId: item.backup.id,
                                                existingMeetingId:
                                                  item.backup.meetingId || item.meeting?.id,
                                              },
                                            );
                                            return;
                                          }
                                          if (item.meeting && item.storagePath) {
                                            await reprocessStoredMeetingAudio(
                                              item.meeting,
                                              item.storagePath,
                                              item.backup,
                                            );
                                          }
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-alfredo-teal hover:bg-alfredo-teal-dark text-alfredo-navy text-xs font-bold cursor-pointer flex items-center gap-1.5"
                                      >
                                        <RefreshCw size={12} />
                                        Reprocessar IA
                                      </button>
                                    )}

                                    {item.backup?.audioBlob && (
                                      <button
                                        onClick={() => {
                                          if (playingBackupId === item.backup!.id) {
                                            backupAudioRef.current?.pause();
                                            setPlayingBackupId(null);
                                            return;
                                          }
                                          if (backupAudioRef.current) {
                                            backupAudioRef.current.pause();
                                          }
                                          const url = URL.createObjectURL(item.backup!.audioBlob);
                                          const audio = new Audio(url);
                                          backupAudioRef.current = audio;
                                          setPlayingBackupId(item.backup!.id);
                                          audio.onended = () => {
                                            setPlayingBackupId(null);
                                            URL.revokeObjectURL(url);
                                          };
                                          audio.play().catch(() => setPlayingBackupId(null));
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-white hover:bg-alfredo-offwhite text-alfredo-graphite text-xs font-medium border border-alfredo-border cursor-pointer flex items-center gap-1.5"
                                      >
                                        {playingBackupId === item.backup.id ? <Pause size={12} /> : <Play size={12} />}
                                        {playingBackupId === item.backup.id ? "Pausar" : "Ouvir"}
                                      </button>
                                    )}

                                    {item.backup && (
                                      <button
                                        onClick={async () => {
                                          if (confirm("Excluir este áudio do armazenamento local?")) {
                                            if (item.backup!.storagePath) {
                                              await deleteAudioFromStorage(item.backup!.storagePath);
                                            }
                                            await deleteLocalRecording(item.backup!.id);
                                            await loadBackups();
                                          }
                                        }}
                                        className="p-2 rounded-lg bg-white hover:bg-[#FFF0ED] text-alfredo-muted hover:text-alfredo-coral border border-alfredo-border cursor-pointer"
                                        title="Apagar áudio local"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
                  className="fixed inset-0 bg-alfredo-navy/55 backdrop-blur-sm z-35 md:hidden"
                  onClick={() => setShowSmartSearch(false)}
                />
                <motion.div 
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="fixed inset-y-0 right-0 z-40 w-80 md:relative md:inset-auto border-l border-alfredo-border bg-alfredo-offwhite flex flex-col shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none"
                >
                <div className="p-4 border-b border-alfredo-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-alfredo-teal-dark" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy">
                      Busca Inteligente (IA)
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowSmartSearch(false)}
                    className="p-1 hover:bg-white rounded text-alfredo-muted hover:text-alfredo-navy cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-4 bg-alfredo-offwhite border-b border-alfredo-border text-[11px] text-alfredo-graphite leading-relaxed flex items-start gap-2">
                  <Info size={14} className="text-alfredo-teal-dark shrink-0 mt-0.5" />
                  <span>
                    Consulte todo o histórico de reuniões usando linguagem natural. O Gemini buscará a resposta unificando todas as transcrições salvas.
                  </span>
                </div>

                {/* Chat window logic */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {smartAnswer ? (
                    <div className="space-y-3">
                      <div className="text-[10px] text-alfredo-muted font-mono flex items-center gap-1 uppercase">
                        <Check size={11} className="text-alfredo-teal-dark" />
                        <span>Pergunta:</span>
                      </div>
                      <p className="text-xs text-alfredo-navy bg-white p-2.5 rounded-lg border border-alfredo-border">
                        {smartQuery}
                      </p>
                      
                      <div className="text-[10px] text-alfredo-muted font-mono flex items-center gap-1 uppercase">
                        <Sparkles size={11} className="text-alfredo-teal-dark" />
                        <span>Resposta do Gemini:</span>
                      </div>
                      <div className="text-xs text-alfredo-graphite bg-alfredo-offwhite p-3 rounded-xl border border-alfredo-border leading-relaxed whitespace-pre-wrap">
                        {smartAnswer}
                      </div>

                      <button
                        onClick={() => { setSmartAnswer(null); setSmartQuery(""); }}
                        className="w-full text-center py-2 border border-dashed border-alfredo-border hover:border-alfredo-teal/40 text-[10px] text-alfredo-teal-dark rounded-lg transition-colors"
                      >
                        Fazer Nova Pergunta
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-alfredo-muted">
                      Pronto para buscar informações em {meetings.length} reunião(ões) do histórico.
                    </div>
                  )}

                  {isSearchingSmart && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-6 h-6 border-2 border-alfredo-teal/25 border-t-alfredo-teal rounded-full animate-spin mb-2"></div>
                      <span className="text-[10px] font-mono text-alfredo-muted">Consultando o banco de transcrições...</span>
                    </div>
                  )}
                </div>

                {/* Input Query form */}
                {!smartAnswer && !isSearchingSmart && (
                  <form onSubmit={handleSmartSearchQuery} className="p-4 border-t border-alfredo-border">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ex: Qual foi a tarefa da Sofia?"
                        value={smartQuery}
                        onChange={(e) => setSmartQuery(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-alfredo-border rounded-lg text-alfredo-navy placeholder-alfredo-muted focus:outline-none focus:border-alfredo-teal/60"
                      />
                      <button
                        type="submit"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-alfredo-teal-dark hover:text-alfredo-teal-dark cursor-pointer"
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

          {/* RIGHT SIDE PANEL 2: GENERIC INTEGRATION CONTROL PANEL */}
          <AnimatePresence>
            {showIntegrationPanel && (
              <>
                {/* Mobile Backdrop */}
                <div 
                  className="fixed inset-0 bg-alfredo-navy/55 backdrop-blur-sm z-35 md:hidden"
                  onClick={() => setShowIntegrationPanel(false)}
                />
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="fixed inset-y-0 right-0 z-40 w-80 md:relative md:inset-auto border-l border-alfredo-border bg-alfredo-offwhite flex flex-col shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none"
                >
                <div className="p-4 border-b border-alfredo-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database size={14} className="text-alfredo-teal-dark" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-alfredo-navy">
                      Integrações
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowIntegrationPanel(false)}
                    className="p-1 hover:bg-white rounded text-alfredo-muted hover:text-alfredo-navy cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {/* Explanation card */}
                  <div className="p-3 bg-white border border-alfredo-border rounded-xl text-[11px] text-alfredo-graphite leading-relaxed">
                    Mapeie a sincronização de dados estruturados com o sistema <b>destino externo</b>. Quando você clicar em <i>"Exportar"</i>, o app enviará o payload no padrão JSON para o banco do sistema.
                  </div>

                  {/* Form configuration fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-alfredo-muted mb-1">
                        Endpoint da API (POST)
                      </label>
                      <input
                        type="text"
                        value={integrationConfig.apiUrl}
                        onChange={(e) => setIntegrationConfig({ ...integrationConfig, apiUrl: e.target.value })}
                        className="w-full p-2 bg-white border border-alfredo-border rounded text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-alfredo-muted mb-1">
                        Token de Autenticação (Bearer)
                      </label>
                      <input
                        type="password"
                        value={integrationConfig.token}
                        onChange={(e) => setIntegrationConfig({ ...integrationConfig, token: e.target.value })}
                        className="w-full p-2 bg-white border border-alfredo-border rounded text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded border border-alfredo-border">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-alfredo-navy">Modo Simulador</span>
                        <span className="text-[9px] text-alfredo-muted">Simular resposta local de sucesso</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={integrationConfig.isMock}
                        onChange={(e) => setIntegrationConfig({ ...integrationConfig, isMock: e.target.checked })}
                        className="w-4 h-4 rounded text-alfredo-teal-dark accent-alfredo-teal cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* API REQUEST LOGGER (Aesthetic developer console debug) */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-alfredo-muted uppercase tracking-wider block mb-2">
                      Logs de Envio Recentes
                    </span>
                    
                    {integrationLogs.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-alfredo-border text-alfredo-muted text-xs rounded-lg">
                        Nenhum log de API disponível.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {integrationLogs.map((log, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { setLatestIntegrationLog(log); }}
                            className="p-2.5 bg-white border border-alfredo-border hover:border-alfredo-border rounded-lg text-[10px] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-alfredo-navy truncate max-w-36">{log.meetingTitle}</span>
                              <span className={`font-mono px-1 rounded ${
                                log.status === "success" ? "bg-alfredo-surface-teal text-alfredo-teal-dark" : "bg-[#FFF0ED] text-alfredo-coral"
                              }`}>
                                {log.status === "success" ? "HTTP 201" : "FALHA"}
                              </span>
                            </div>
                            <div className="flex justify-between text-alfredo-muted text-[9px] mt-1">
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
                {latestIntegrationLog && (
                  <div className="p-4 border-t border-alfredo-border bg-alfredo-offwhite max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-alfredo-teal-dark font-bold">API PAYLOAD DEBUGGER</span>
                      <button 
                        onClick={() => setLatestIntegrationLog(null)}
                        className="text-alfredo-muted hover:text-alfredo-navy"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    
                    <div className="space-y-2 font-mono text-[9px]">
                      <div>
                        <span className="text-alfredo-muted">REQUEST URL:</span>
                        <div className="text-alfredo-graphite break-all">{latestIntegrationLog.request.url}</div>
                      </div>
                      <div>
                        <span className="text-alfredo-muted">METHOD:</span>
                        <div className="text-alfredo-teal-dark font-bold">{latestIntegrationLog.request.method}</div>
                      </div>
                      <div>
                        <span className="text-alfredo-muted">MAPPED JSON BODY:</span>
                        <pre className="bg-white p-2 rounded text-alfredo-teal-dark overflow-x-auto border border-alfredo-border max-h-24">
                          {JSON.stringify(latestIntegrationLog.request.body, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-alfredo-muted">SERVER RESPONSE:</span>
                        <pre className="bg-white p-2 rounded text-alfredo-teal-dark overflow-x-auto border border-alfredo-border max-h-24">
                          {JSON.stringify(latestIntegrationLog.response.body, null, 2)}
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
          <div className="h-20 bg-alfredo-offwhite border-t border-alfredo-border flex items-center justify-center relative px-6 shrink-0">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={50} 
              className="w-full max-w-xl h-10 object-contain opacity-80"
            />
            <div className="absolute right-6 text-[10px] text-alfredo-muted font-mono tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-alfredo-teal animate-ping"></span>
              <span>Análise Espectral de Voz</span>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modals for Deletion and Alert */}
        <AnimatePresence>
          {meetingToDeleteId && (
            <div className="fixed inset-0 bg-alfredo-navy/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-alfredo-offwhite border border-alfredo-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center gap-2 text-alfredo-coral">
                  <Trash2 size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-alfredo-navy">Confirmar Exclusão</h3>
                </div>
                <p className="text-xs text-alfredo-graphite leading-relaxed">
                  Tem certeza de que deseja apagar permanentemente esta reunião? Esta ação é irreversível e removerá todos os dados e transcrições do sistema local.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setMeetingToDeleteId(null)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-alfredo-border text-xs text-alfredo-graphite hover:text-alfredo-navy transition-all cursor-pointer font-medium"
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
                    className="px-3 py-1.5 rounded-lg bg-alfredo-coral hover:bg-alfredo-coral text-xs text-alfredo-navy transition-all cursor-pointer font-bold"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {userToDeleteEmail && (
            <div className="fixed inset-0 bg-alfredo-navy/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-alfredo-offwhite border border-alfredo-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center gap-2 text-alfredo-coral">
                  <Trash2 size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-alfredo-navy">Remover Colaborador</h3>
                </div>
                <p className="text-xs text-alfredo-graphite leading-relaxed">
                  Tem certeza de que deseja remover a autorização de acesso do e-mail <b className="text-alfredo-navy">{userToDeleteEmail}</b>? Ele não poderá mais fazer login no sistema.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setUserToDeleteEmail(null)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-alfredo-border text-xs text-alfredo-graphite hover:text-alfredo-navy transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setPermittedUsers(prev => prev.filter(u => u.email !== userToDeleteEmail));
                      setUserToDeleteEmail(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-alfredo-coral hover:bg-alfredo-coral text-xs text-alfredo-navy transition-all cursor-pointer font-bold"
                  >
                    Remover Acesso
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {customAlertMessage && (
            <div className="fixed inset-0 bg-alfredo-navy/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-alfredo-offwhite border border-alfredo-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center gap-2 text-alfredo-teal-dark">
                  <AlertCircle size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-alfredo-navy">Alerta do Sistema</h3>
                </div>
                <p className="text-xs text-alfredo-graphite leading-relaxed">
                  {customAlertMessage}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setCustomAlertMessage(null)}
                    className="px-4 py-1.5 rounded-lg bg-alfredo-teal text-alfredo-navy font-bold text-xs hover:bg-alfredo-teal transition-all cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isParticipantsModalOpen && (
            <div className="fixed inset-0 bg-alfredo-navy/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-alfredo-offwhite border border-alfredo-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-alfredo-teal-dark">
                    <Users size={16} />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-alfredo-navy">Editar Participantes</h3>
                  </div>
                  <button
                    onClick={() => setIsParticipantsModalOpen(false)}
                    className="text-alfredo-muted hover:text-alfredo-navy transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <p className="text-xs text-alfredo-graphite leading-relaxed">
                  Insira a lista de participantes presentes nesta reunião física. Digite <b>um nome por linha (aperte Enter)</b> para organizar os membros participantes de forma clara e simples.
                </p>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {/* Triforce Section */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono text-alfredo-teal-dark font-bold">
                      Membros Triforce (Consultores) • Um por linha
                    </label>
                    <textarea
                      value={editTriforceMembers}
                      onChange={(e) => setEditTriforceMembers(e.target.value)}
                      rows={5}
                      placeholder="Exemplo:&#10;Rodolfo&#10;Sofia"
                      className="w-full bg-white border border-alfredo-border rounded-xl py-2.5 px-3 text-xs text-alfredo-navy placeholder-alfredo-muted focus:outline-none focus:border-alfredo-teal/60 resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Client Section */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono text-alfredo-teal-dark font-bold">
                      Clientes & Parceiros • Um por linha
                    </label>
                    <textarea
                      value={editClientMembers}
                      onChange={(e) => setEditClientMembers(e.target.value)}
                      rows={5}
                      placeholder="Exemplo:&#10;Vitor&#10;Carlos Eduardo"
                      className="w-full bg-white border border-alfredo-border rounded-xl py-2.5 px-3 text-xs text-alfredo-navy placeholder-alfredo-muted focus:outline-none focus:border-alfredo-teal/60 resize-none font-sans leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-alfredo-border">
                  <button
                    onClick={() => setIsParticipantsModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-alfredo-border text-xs text-alfredo-graphite hover:text-alfredo-navy transition-all cursor-pointer font-medium"
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
                    className="px-3 py-1.5 rounded-lg bg-alfredo-teal hover:bg-alfredo-teal text-alfredo-navy font-bold text-xs transition-all cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isTaskModalOpen && (
            <div className="fixed inset-0 bg-alfredo-navy/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-alfredo-offwhite border border-alfredo-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-alfredo-teal-dark">
                    <CheckSquare size={16} />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-alfredo-navy">
                      {editingTaskIdx !== null ? "Editar Tarefa" : "Nova Tarefa"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsTaskModalOpen(false)}
                    className="text-alfredo-muted hover:text-alfredo-navy transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono text-alfredo-graphite font-bold">Descrição da Tarefa</label>
                    <textarea
                      value={taskAction}
                      onChange={(e) => setTaskAction(e.target.value)}
                      placeholder="Digite a ação ou tarefa pendente..."
                      rows={3}
                      className="w-full bg-white border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy placeholder-alfredo-muted focus:outline-none focus:border-alfredo-teal/60 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-mono text-alfredo-graphite font-bold">Responsável</label>
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="w-full bg-white border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 cursor-pointer"
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
                      <label className="block text-[10px] uppercase font-mono text-alfredo-graphite font-bold">Prioridade</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="w-full bg-white border border-alfredo-border rounded-xl py-2 px-3 text-xs text-alfredo-navy focus:outline-none focus:border-alfredo-teal/60 cursor-pointer"
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
                    className="px-3 py-1.5 rounded-lg bg-white border border-alfredo-border text-xs text-alfredo-graphite hover:text-alfredo-navy transition-all cursor-pointer font-medium"
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
                    className="px-3 py-1.5 rounded-lg bg-alfredo-teal hover:bg-alfredo-teal text-alfredo-navy font-bold text-xs transition-all cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {isProfileSettingsOpen && currentUser && (
          <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-alfredo-navy/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-alfredo-border bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-alfredo-navy">Configurações do perfil</h3>
                <button onClick={() => setIsProfileSettingsOpen(false)}><X size={16} /></button>
              </div>
              <label className="text-[10px] font-bold uppercase text-alfredo-muted">Nome de exibição</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1 w-full rounded-xl border border-alfredo-border px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  try {
                    const profile = await updateOwnProfileName(profileName);
                    setCurrentUser(profile);
                    localStorage.setItem("plaud_current_user", JSON.stringify(profile));
                    setIsProfileSettingsOpen(false);
                    triggerNotification("Perfil atualizado", "Seu nome foi salvo com sucesso.");
                  } catch (error: any) {
                    setCustomAlertMessage(error.message || "Não foi possível atualizar o perfil.");
                  }
                }}
                className="mt-4 w-full rounded-xl bg-alfredo-teal px-4 py-2 text-xs font-bold text-alfredo-navy"
              >Salvar alterações</button>
            </div>
          </div>
        )}

        {/* Floating In-App Toast Notification */}
        <AnimatePresence>
          {appToast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 z-[10000] max-w-sm w-[calc(100%-2rem)] bg-white border border-alfredo-border rounded-2xl p-4 shadow-2xl flex gap-3 items-start md:bottom-6 md:right-6 md:w-full"
            >
              <div className="p-2 rounded-xl bg-alfredo-teal/10 border border-alfredo-teal/25 text-alfredo-teal-dark shrink-0">
                <BellRing size={16} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-alfredo-navy tracking-wide uppercase">{appToast.title}</h4>
                <p className="text-xs text-alfredo-graphite mt-1 leading-relaxed">{appToast.body}</p>
              </div>
              <button
                onClick={() => setAppToast(prev => ({ ...prev, show: false }))}
                className="text-alfredo-muted hover:text-alfredo-navy transition-colors p-1 cursor-pointer"
                title="Fechar Alerta"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <MobileBottomNav
        activeView={activeView}
        backupsHaveFailed={localBackups.some((b) => b.status === "failed")}
        isRecording={isRecording}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== "history") setSelectedMeetingId(null);
          setIsMobileMoreOpen(false);
        }}
        onOpenMore={() => setIsMobileMoreOpen(true)}
      />

      <MobileMoreSheet
        open={isMobileMoreOpen}
        isAdmin={currentUser?.role === "Administrador"}
        userName={currentUser?.name || "Usuário"}
        userRole={currentUser?.role || "user"}
        userPhotoUrl={currentUser?.photoUrl}
        onClose={() => setIsMobileMoreOpen(false)}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== "history") setSelectedMeetingId(null);
        }}
        onOpenSmartSearch={() => setShowSmartSearch(true)}
        onLogout={handleLogout}
      />

    </div>
  );
}
