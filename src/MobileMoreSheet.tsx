import { AnimatePresence, motion } from "motion/react";
import {
  Database,
  LogOut,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import type { AppView } from "./AppSidebar";

type MobileMoreSheetProps = {
  open: boolean;
  isAdmin: boolean;
  userName: string;
  userRole: string;
  userPhotoUrl?: string;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onOpenSmartSearch: () => void;
  onLogout: () => void;
};

export default function MobileMoreSheet({
  open,
  isAdmin,
  userName,
  userRole,
  userPhotoUrl,
  onClose,
  onNavigate,
  onOpenSmartSearch,
  onLogout,
}: MobileMoreSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-alfredo-navy/45 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border border-alfredo-border border-b-0 bg-white px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgba(13,27,42,0.28)] md:hidden"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-alfredo-border" />

            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-alfredo-border bg-alfredo-offwhite p-3">
              <img
                src={
                  userPhotoUrl ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(userName)}`
                }
                alt={userName}
                className="h-11 w-11 rounded-xl border border-alfredo-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-alfredo-navy">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-alfredo-muted">{userRole}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-alfredo-muted hover:bg-alfredo-navy/5 hover:text-alfredo-navy"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onOpenSmartSearch();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-medium text-alfredo-graphite transition-colors hover:bg-alfredo-surface-teal"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-alfredo-surface-teal text-alfredo-teal-dark">
                  <Sparkles size={16} />
                </span>
                Busca inteligente
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate("suiter");
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-medium text-alfredo-graphite transition-colors hover:bg-alfredo-surface-teal"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-alfredo-offwhite text-alfredo-graphite">
                  <Database size={16} />
                </span>
                Integração Suiter
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate("admin");
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-medium text-alfredo-graphite transition-colors hover:bg-alfredo-surface-teal"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-alfredo-offwhite text-alfredo-graphite">
                    <Shield size={16} />
                  </span>
                  Equipe
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-medium text-alfredo-coral transition-colors hover:bg-alfredo-coral/10"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-alfredo-coral/10 text-alfredo-coral">
                  <LogOut size={16} />
                </span>
                Sair da conta
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
