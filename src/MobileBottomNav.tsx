import { motion } from "motion/react";
import {
  BarChart2,
  FileText,
  HardDrive,
  Mic,
  MoreHorizontal,
} from "lucide-react";
import type { AppView } from "./AppSidebar";

type MobileBottomNavProps = {
  activeView: AppView;
  backupsHaveFailed: boolean;
  isRecording: boolean;
  onNavigate: (view: AppView) => void;
  onOpenMore: () => void;
};

const TABS: {
  id: AppView | "more";
  label: string;
  icon: typeof BarChart2;
  center?: boolean;
}[] = [
  { id: "dashboard", label: "Home", icon: BarChart2 },
  { id: "history", label: "Atas", icon: FileText },
  { id: "new_meeting", label: "Gravar", icon: Mic, center: true },
  { id: "backups", label: "Áudios", icon: HardDrive },
  { id: "more", label: "Mais", icon: MoreHorizontal },
];

export default function MobileBottomNav({
  activeView,
  backupsHaveFailed,
  isRecording,
  onNavigate,
  onOpenMore,
}: MobileBottomNavProps) {
  return (
    <nav
      className="mobile-bottom-nav md:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between gap-1 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id !== "more" && activeView === tab.id;

          if (tab.center) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate("new_meeting")}
                className="relative -mt-5 flex flex-col items-center"
                aria-label="Nova reunião"
              >
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_12px_32px_-10px_rgba(16,185,129,0.65)] ${
                    isRecording
                      ? "bg-red-500 text-white"
                      : activeView === "new_meeting"
                        ? "bg-alfredo-teal text-black"
                        : "bg-gradient-to-br from-alfredo-teal to-alfredo-teal text-black"
                  }`}
                >
                  {isRecording ? (
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                    </span>
                  ) : (
                    <Icon size={22} strokeWidth={2.4} />
                  )}
                </motion.span>
                <span
                  className={`mt-1 text-[10px] font-semibold ${
                    activeView === "new_meeting"
                      ? "text-alfredo-teal"
                      : "text-zinc-500"
                  }`}
                >
                  {isRecording ? "Ao vivo" : tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === "more") onOpenMore();
                else onNavigate(tab.id);
              }}
              className="relative flex min-w-[3.5rem] flex-1 flex-col items-center gap-1 py-1"
            >
              <motion.span
                whileTap={{ scale: 0.9 }}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-alfredo-teal/15 text-alfredo-teal"
                    : "text-zinc-500"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {tab.id === "backups" && backupsHaveFailed && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </motion.span>
              <span
                className={`text-[10px] font-semibold tracking-tight ${
                  active ? "text-alfredo-teal" : "text-zinc-500"
                }`}
              >
                {tab.label}
              </span>
              {active && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-alfredo-teal"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
