import {
  useEffect,
  useState,
} from "react";
import {
  BarChart2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  Clock,
  Database,
  FileText,
  HardDrive,
  LogOut,
  Mic,
  Pause,
  Play,
  Search,
  Shield,
  Sparkles,
  Square,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { Meeting } from "./types";

export type AppView =
  | "history"
  | "new_meeting"
  | "admin"
  | "suiter"
  | "dashboard"
  | "backups";

type AppSidebarProps = {
  logoSrc: string;
  collapsed: boolean;
  mobileOpen: boolean;
  activeView: AppView;
  selectedMeetingId: string | null;
  isAdmin: boolean;
  userName: string;
  userRole: string;
  userPhotoUrl?: string;
  meetingsCount: number;
  backupsCount: number;
  backupsHaveFailed: boolean;
  searchQuery: string;
  selectedTagFilter: string | null;
  allUniqueTags: string[];
  filteredMeetings: Meeting[];
  isRecording: boolean;
  isRecordingPaused: boolean;
  recordingSeconds: number;
  onCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (view: AppView) => void;
  onSelectMeeting: (id: string) => void;
  onDeleteMeeting?: (id: string) => void;
  onSearchChange: (value: string) => void;
  onTagFilterChange: (tag: string | null) => void;
  onOpenSmartSearch: () => void;
  onPauseRecording: () => void;
  onStopRecording: () => void;
  onLogout: () => void;
};

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export default function AppSidebar({
  logoSrc,
  collapsed,
  mobileOpen,
  activeView,
  selectedMeetingId,
  isAdmin,
  userName,
  userRole,
  userPhotoUrl,
  meetingsCount,
  backupsCount,
  backupsHaveFailed,
  searchQuery,
  selectedTagFilter,
  allUniqueTags,
  filteredMeetings,
  isRecording,
  isRecordingPaused,
  recordingSeconds,
  onCollapse,
  onCloseMobile,
  onNavigate,
  onSelectMeeting,
  onDeleteMeeting,
  onSearchChange,
  onTagFilterChange,
  onOpenSmartSearch,
  onPauseRecording,
  onStopRecording,
  onLogout,
}: AppSidebarProps) {
  const isDesktop = useIsDesktop();
  // Dentro do layout: desktop colapsado = oculto; mobile fechado = trilho de ícones
  const hidden = isDesktop && collapsed;
  const compact = !hidden && (isDesktop ? false : !mobileOpen);
  const expanded = !hidden && !compact;

  const go = (view: AppView) => {
    onNavigate(view);
    if (!isDesktop) onCloseMobile();
  };

  const primaryNav = [
    {
      id: "dashboard" as const,
      label: "Dashboard",
      icon: BarChart2,
    },
    {
      id: "new_meeting" as const,
      label: "Nova reunião",
      icon: Mic,
      cta: true,
    },
    {
      id: "history" as const,
      label: "Reuniões",
      icon: FileText,
      badge: meetingsCount,
    },
    {
      id: "backups" as const,
      label: "Backup de Áudios",
      icon: HardDrive,
      badge: backupsCount > 0 ? backupsCount : undefined,
      badgeDanger: backupsHaveFailed,
    },
    {
      id: "suiter" as const,
      label: "Integração Suiter",
      icon: Database,
    },
  ];

  const adminNav = [
    { id: "admin" as const, label: "Equipe", icon: Shield },
  ];

  return (
    <aside
      className={`app-sidebar relative z-20 flex h-full shrink-0 flex-col overflow-hidden transition-[width,opacity] duration-300 ease-out ${
        hidden
          ? "w-0 border-0 opacity-0 pointer-events-none"
          : compact
            ? "w-[var(--sidebar-rail)]"
            : "w-[min(100%,var(--sidebar-w))] md:w-[var(--sidebar-w)]"
      }`}
      aria-hidden={hidden}
    >
      <div
        className={`flex items-center border-b border-white/[0.06] ${
          compact ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4"
        }`}
      >
        <div className={`flex min-w-0 items-center ${compact ? "justify-center" : "gap-3"}`}>
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-md" />
            <img
              src={logoSrc}
              alt="Suiter Record"
              className="relative h-10 w-10 rounded-xl border border-white/[0.08] object-cover"
            />
          </div>
          {expanded && (
            <div className="min-w-0">
              <h1 className="font-display truncate text-[15px] font-bold tracking-tight text-white">
                Suiter <span className="text-emerald-400">Record</span>
              </h1>
              <p className="truncate text-[10px] font-medium text-zinc-500">
                Workspace de reuniões
              </p>
            </div>
          )}
        </div>
        {expanded && (
          <button
            type="button"
            onClick={isDesktop ? onCollapse : onCloseMobile}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white"
            title={isDesktop ? "Recolher menu" : "Recolher para ícones"}
          >
            {isDesktop ? <ChevronLeft size={16} /> : <X size={16} />}
          </button>
        )}
      </div>

      <nav className={`space-y-1 border-b border-white/[0.06] ${compact ? "p-2" : "p-3"}`}>
        {expanded && (
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Principal
          </p>
        )}
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active =
            activeView === item.id &&
            (item.id !== "new_meeting" || !selectedMeetingId);
          const className = [
            "nav-item",
            item.cta && !active ? "nav-item-cta" : "",
            active && !item.cta ? "nav-item-active" : "",
            active && item.cta ? "nav-item-cta ring-2 ring-emerald-300/40" : "",
            compact ? "justify-center px-0" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => go(item.id)}
              className={className}
            >
              <Icon size={16} className="shrink-0" />
              {expanded && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                        item.badgeDanger
                          ? "border border-red-500/30 bg-red-500/15 text-red-300"
                          : "border border-white/[0.06] bg-black/30 text-zinc-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {isAdmin && (
          <>
            {expanded && (
              <p className="mb-2 mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                Administração
              </p>
            )}
            {compact && <div className="my-2 h-px bg-white/[0.06]" />}
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => go(item.id)}
                  className={`nav-item ${active ? "nav-item-active" : ""} ${
                    compact ? "justify-center px-0" : ""
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {expanded && <span>{item.label}</span>}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {isRecording && (
        <div className={`border-b border-red-500/20 bg-red-500/[0.07] ${compact ? "p-2" : "p-3"}`}>
          {compact ? (
            <div className="flex flex-col items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono text-[10px] font-bold text-red-300">
                {formatTimer(recordingSeconds)}
              </span>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-300">
                    {isRecordingPaused ? "Pausado" : "Gravando"}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-red-200">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPauseRecording}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900/80 py-2 text-[11px] font-semibold text-zinc-200"
                >
                  {isRecordingPaused ? <Play size={12} /> : <Pause size={12} />}
                  {isRecordingPaused ? "Retomar" : "Pausar"}
                </button>
                <button
                  type="button"
                  onClick={onStopRecording}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-[11px] font-bold text-white"
                >
                  <Square size={12} />
                  Parar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeView === "history" && expanded ? (
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={13}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-500"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar reuniões..."
                  className="w-full rounded-xl border border-white/[0.06] bg-black/30 py-2 pr-3 pl-8 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/30"
                />
              </div>
              <button
                type="button"
                onClick={onOpenSmartSearch}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                title="Busca IA"
              >
                <Sparkles size={14} />
              </button>
            </div>

            {allUniqueTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onTagFilterChange(null)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                    !selectedTagFilter
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-white/[0.03] text-zinc-500"
                  }`}
                >
                  Todas
                </button>
                {allUniqueTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      onTagFilterChange(selectedTagFilter === tag ? null : tag)
                    }
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      selectedTagFilter === tag
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/[0.03] text-zinc-500"
                    }`}
                  >
                    <Tag size={10} />
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              {filteredMeetings.length === 0 ? (
                <p className="px-2 py-6 text-center text-[11px] text-zinc-600">
                  Nenhuma reunião encontrada.
                </p>
              ) : (
                filteredMeetings.map((m) => {
                  const active = selectedMeetingId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`meeting-card group relative ${
                        active ? "meeting-card-active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectMeeting(m.id)}
                        className="w-full cursor-pointer p-3 text-left"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-xs font-semibold text-white">
                            {m.title}
                          </p>
                          {m.hasAudio && (
                            <span className="mt-0.5 shrink-0 text-emerald-400/80">
                              <Mic size={11} />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={10} />
                            {m.date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} />
                            {formatDuration(m.duration)}
                          </span>
                          {(m.actions?.length || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-400/80">
                              <CheckSquare size={10} />
                              {m.actions.length}
                            </span>
                          )}
                        </div>
                      </button>
                      {onDeleteMeeting && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMeeting(m.id);
                          }}
                          className="absolute top-2 right-2 rounded-lg p-1 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          expanded && (
            <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                {activeView === "dashboard" && <BarChart2 size={20} />}
                {activeView === "new_meeting" && <Mic size={20} />}
                {activeView === "backups" && <HardDrive size={20} />}
                {activeView === "admin" && <Shield size={20} />}
                {activeView === "suiter" && <Database size={20} />}
                {activeView === "history" && <FileText size={20} />}
              </div>
              <h3 className="font-display text-sm font-bold text-white">
                {activeView === "dashboard" && "Dashboard"}
                {activeView === "new_meeting" && "Nova reunião"}
                {activeView === "backups" && "Backup de Áudios"}
                {activeView === "admin" && "Equipe"}
                {activeView === "suiter" && "Integração Suiter"}
                {activeView === "history" && "Reuniões"}
              </h3>
              <p className="mt-1.5 max-w-[200px] text-[11px] leading-relaxed text-zinc-500">
                {activeView === "dashboard" &&
                  "Métricas e status das suas reuniões no painel principal."}
                {activeView === "new_meeting" &&
                  "Grave ou importe áudio e sincronize com a agenda."}
                {activeView === "backups" &&
                  "Áudios salvos neste dispositivo — ouça e reprocesse com IA."}
                {activeView === "admin" &&
                  "Gerencie perfis e permissões da equipe."}
                {activeView === "suiter" &&
                  "Em breve: sincronização com o ecossistema Suiter."}
                {activeView === "history" &&
                  "Recolha o menu para ver a lista de reuniões."}
              </p>
            </div>
          )
        )}
      </div>

      <div className={`border-t border-white/[0.06] ${compact ? "p-2" : "p-3"}`}>
        {compact ? (
          <button
            type="button"
            onClick={onLogout}
            title="Sair"
            className="flex w-full items-center justify-center rounded-xl p-2.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.05] bg-black/25 p-2.5">
            <img
              src={
                userPhotoUrl ||
                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(userName)}`
              }
              alt={userName}
              className="h-9 w-9 rounded-xl border border-white/[0.08] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{userName}</p>
              <p className="truncate text-[10px] text-zinc-500">{userRole}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
