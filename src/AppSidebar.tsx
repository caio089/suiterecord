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
  const go = (view: AppView) => {
    onNavigate(view);
    onCloseMobile();
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
      className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col transition-all duration-300 ease-out md:relative md:translate-x-0 ${
        collapsed
          ? "md:w-0 md:overflow-hidden md:border-0 md:opacity-0 md:pointer-events-none"
          : "w-[var(--sidebar-w)] md:w-[var(--sidebar-w)]"
      } ${
        mobileOpen
          ? "translate-x-0 shadow-[0_0_60px_-12px_rgba(0,0,0,0.8)]"
          : "-translate-x-full md:translate-x-0"
      }`}
      aria-hidden={collapsed && !mobileOpen}
    >
      {/* Brand */}
      <div
        className={`flex items-center border-b border-white/[0.06] ${
          collapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4"
        }`}
      >
        <div className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-md" />
            <img
              src={logoSrc}
              alt="Suiter Record"
              className="relative h-10 w-10 rounded-xl border border-white/[0.08] object-cover"
            />
          </div>
          {!collapsed && (
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
        {!collapsed && (
          <button
            type="button"
            onClick={onCollapse}
            className="hidden rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white md:flex"
            title="Recolher menu"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`space-y-1 border-b border-white/[0.06] ${collapsed ? "p-2" : "p-3"}`}>
        {!collapsed && (
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
            collapsed ? "justify-center px-0" : "",
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
              {!collapsed && (
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
            {!collapsed && (
              <p className="mb-2 mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                Administração
              </p>
            )}
            {collapsed && <div className="my-2 h-px bg-white/[0.06]" />}
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
                    collapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Recording strip */}
      {isRecording && (
        <div className={`border-b border-red-500/20 bg-red-500/[0.07] ${collapsed ? "p-2" : "p-3"}`}>
          {collapsed ? (
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
                    Gravando
                  </span>
                </div>
                <span className="rounded-md border border-white/[0.08] bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-white">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPauseRecording}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/[0.06] py-1.5 text-[11px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.1]"
                >
                  {isRecordingPaused ? <Play size={11} /> : <Pause size={11} />}
                  {isRecordingPaused ? "Retomar" : "Pausar"}
                </button>
                <button
                  type="button"
                  onClick={onStopRecording}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-500 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-red-400"
                >
                  <Square size={10} fill="currentColor" />
                  Salvar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Context panel */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeView === "history" && !collapsed ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="space-y-2.5 p-3 pb-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  placeholder="Buscar reuniões..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-black/30 py-2 pr-8 pl-9 text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {allUniqueTags.length > 0 && (
                <div className="custom-scrollbar flex max-h-14 flex-wrap gap-1 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => onTagFilterChange(null)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      selectedTagFilter === null
                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                        : "bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Todos
                  </button>
                  {allUniqueTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        onTagFilterChange(selectedTagFilter === tag ? null : tag)
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        selectedTagFilter === tag
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                          : "bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Tag size={8} />
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between px-0.5 pt-1">
                <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                  {filteredMeetings.length} arquivo
                  {filteredMeetings.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={onOpenSmartSearch}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  <Sparkles size={12} />
                  Busca IA
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-3">
              {filteredMeetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-10 text-center">
                  <Calendar size={18} className="mx-auto mb-2 text-zinc-600" />
                  <p className="text-xs text-zinc-500">Nenhuma reunião ainda</p>
                  <button
                    type="button"
                    onClick={() => go("new_meeting")}
                    className="mt-3 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Criar a primeira
                  </button>
                </div>
              ) : (
                filteredMeetings.map((mtg) => {
                  const active = mtg.id === selectedMeetingId;
                  const pending = mtg.actions.filter(
                    (a) => a.status !== "completed"
                  ).length;
                  return (
                    <div
                      key={mtg.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onSelectMeeting(mtg.id);
                        onCloseMobile();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          onSelectMeeting(mtg.id);
                          onCloseMobile();
                        }
                      }}
                      className={`meeting-card group relative cursor-pointer p-3 ${
                        active ? "meeting-card-active" : ""
                      }`}
                    >
                      <h3
                        className={`pr-6 text-[12.5px] leading-snug font-semibold line-clamp-2 ${
                          active ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        {mtg.title}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                        <span>{mtg.date}</span>
                        <span className="text-zinc-700">·</span>
                        <span>{formatDuration(mtg.duration)}</span>
                      </div>
                      {mtg.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {mtg.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="rounded-md border border-white/[0.05] bg-black/25 px-1.5 py-0.5 text-[9px] text-zinc-400"
                            >
                              {t}
                            </span>
                          ))}
                          {mtg.tags.length > 2 && (
                            <span className="self-center text-[9px] text-zinc-600">
                              +{mtg.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      {pending > 0 && (
                        <div className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">
                          <CheckSquare size={9} />
                          {pending}
                        </div>
                      )}
                      {isAdmin && onDeleteMeeting && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMeeting(mtg.id);
                          }}
                          className="absolute top-2 right-2 rounded-md p-1 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                          title="Apagar reunião"
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
          !collapsed && (
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

      {/* User footer */}
      <div
        className={`border-t border-white/[0.06] ${collapsed ? "p-2" : "p-3"}`}
      >
        {collapsed ? (
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
