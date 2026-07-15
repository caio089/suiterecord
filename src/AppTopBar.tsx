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
          className="hidden rounded-xl p-2.5 text-alfredo-muted transition-colors hover:bg-alfredo-navy/[0.05] hover:text-alfredo-navy"
          title="Expandir ou recolher menu"
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={onToggleSidebarCollapsed}
          className="hidden rounded-xl p-2 text-alfredo-muted transition-colors hover:bg-alfredo-navy/[0.05] hover:text-alfredo-navy md:flex"
          title={sidebarCollapsed ? "Abrir menu" : "Fechar menu (tela cheia)"}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight text-alfredo-navy sm:text-[15px]">
              {selectedMeeting ? selectedMeeting.title : VIEW_LABELS[activeView]}
            </p>
            {selectedMeeting && (
              <span className="hidden rounded-md border border-alfredo-border bg-alfredo-offwhite px-1.5 py-0.5 font-mono text-[10px] text-alfredo-muted sm:inline">
                {selectedMeeting.date}
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-alfredo-muted">
            {selectedMeeting
              ? "Detalhes da reunião"
              : "Alfredo · workspace"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSmartSearch}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all sm:px-3 ${
            showSmartSearch
              ? "bg-alfredo-teal text-alfredo-navy shadow-[0_8px_20px_-12px_rgba(27,166,182,0.8)]"
              : "border border-alfredo-border bg-white text-alfredo-teal-dark hover:bg-alfredo-surface-teal"
          }`}
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline">Busca IA</span>
        </button>

        {userName && (
          <>
            <div className="hidden items-center gap-2 border-l border-alfredo-border pl-3 sm:flex">
              <div className="hidden text-right lg:block">
                <p className="text-xs leading-none font-semibold text-alfredo-navy">
                  {userName}
                </p>
                <p className="mt-1 text-[10px] text-alfredo-muted">{userRole}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl p-2.5 text-alfredo-muted transition-colors hover:bg-alfredo-coral/10 hover:text-alfredo-coral"
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
