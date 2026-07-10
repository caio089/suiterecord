export interface Topic {
  topic: string;
  details: string;
}

export interface ActionItem {
  action: string;
  assignee: string;
  priority: "Alta" | "Média" | "Baixa";
  status?: "pending" | "completed";
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  transcript: string;
  overview: string;
  topics: Topic[];
  decisions?: string[]; // key decisions made during the meeting
  actions: ActionItem[];
  tags: string[];
  participants?: {
    membersTriforce: string[];
    membersClient: string[];
  };
  createdBy?: string; // email of the user who recorded/uploaded the meeting
  /** ID do evento no Google Calendar (após "Inserir na Agenda") */
  googleCalendarEventId?: string;
  /** Há áudio associado (backup local / storage) */
  hasAudio?: boolean;
  /** Referência ao backup local IndexedDB */
  audioRecordingId?: string;
  /** Tamanho do áudio comprimido em bytes */
  audioSizeBytes?: number;
}

export interface PermittedUser {
  id: string;
  name: string;
  email: string;
  photo?: string;
  photoUrl?: string; // flexible compatibility for avatar image URL
  role: string;
  pass?: string;
  password?: string; // flexible compatibility for password
  googleCalendarLinked?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: string;
  }[];
}

export interface SuiterConfig {
  apiUrl: string;
  token: string;
  isMock: boolean;
  mapping: string;
}

export interface SuiterLog {
  timestamp: string;
  meetingTitle: string;
  status: "success" | "error";
  simulated: boolean;
  request: {
    url: string;
    method: string;
    headers: any;
    body: any;
  };
  response: {
    status: number;
    statusText: string;
    body: any;
  };
}
