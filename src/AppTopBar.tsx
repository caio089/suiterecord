import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Sparkles,
} from "lucide-react";
import type { Meeting } from "./types";
import type { AppView } from "./AppSidebar";

const VIEW_LABELS: Record<AppView, string> = {
  history: "Reuniões",
  new_meeting: "Nova reunião",
  dashboard: "Dashboard",
  backups: "Backup de Áudios",
  admin: "Equipe",
  suiter: "Integração",
};

type AppTopBarProps = {
  sidebarCollapsed: boolean;
  activeView: AppView;
  selectedMeeting: Meeting | null;
  userName?: string;
  userRole?: string;
  showSmartSearch: boolean;
  onToggleMobileSidebar: () => void;
  onToggleSidebarCollapsed: () => void;
  onToggleSmartSearch: () => void;
  onLogout: () => void;
};

export default function AppTopBar({
  sidebarCollapsed,
  activeView,
  selectedMeeting,
  userName,
  userRole,
  showSmartSearch,
  onToggleMobileSidebar,
  onToggleSidebarCollapsed,
  onToggleSmartSearch,
  onLogout,
}: AppTopBarProps) {
  return (
    <header className="app-topbar flex h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] sm:h-16 sm:gap-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="rounded-xl p-2.5 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white md:hidden"
          title="Abrir menu"
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={onToggleSidebarCollapsed}
          className="hidden rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white md:flex"
          title={sidebarCollapsed ? "Abrir menu" : "Fechar menu (tela cheia)"}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display truncate text-sm font-semibold tracking-tight text-white sm:text-[15px]">
              {selectedMeeting ? selectedMeeting.title : VIEW_LABELS[activeView]}
            </p>
            {selectedMeeting && (
              <span className="hidden rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline">
                {selectedMeeting.date}
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-zinc-500">
            {selectedMeeting
              ? "Detalhes da reunião"
              : "Suiter Record · workspace"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSmartSearch}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all sm:px-3 ${
            showSmartSearch
              ? "bg-emerald-500 text-black shadow-[0_8px_20px_-10px_rgba(16,185,129,0.7)]"
              : "border border-white/[0.06] bg-white/[0.03] text-emerald-300 hover:bg-white/[0.06] hover:text-emerald-200"
          }`}
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline">Busca IA</span>
        </button>

        {userName && (
          <>
            <div className="hidden items-center gap-2 border-l border-white/[0.06] pl-3 sm:flex">
              <div className="hidden text-right lg:block">
                <p className="text-xs leading-none font-semibold text-white">
                  {userName}
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">{userRole}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl p-2.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
