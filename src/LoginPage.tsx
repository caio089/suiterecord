import type { FormEvent } from "react";
import { Mail, Lock, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { AlfredoMark } from "./components/brand/AlfredoMark";

type LoginPageProps = {
  logoSrc: string;
  passwordRecoveryMode?: boolean;
  loginEmail: string;
  loginPassword: string;
  recoveryPassword?: string;
  recoveryPasswordConfirm?: string;
  loginError: string;
  loginSuccess: string;
  isReady: boolean;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRecoveryPasswordChange?: (value: string) => void;
  onRecoveryPasswordConfirmChange?: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onRecoverySubmit?: (e: FormEvent) => void;
  onForgotPassword?: () => void;
  onBackToLanding: () => void;
};

export default function LoginPage({
  logoSrc,
  passwordRecoveryMode = false,
  loginEmail,
  loginPassword,
  recoveryPassword = "",
  recoveryPasswordConfirm = "",
  loginError,
  loginSuccess,
  isReady,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onRecoveryPasswordChange,
  onRecoveryPasswordConfirmChange,
  onSubmit,
  onRecoverySubmit,
  onForgotPassword,
  onBackToLanding,
}: LoginPageProps) {
  return (
    <div className="app-shell relative flex min-h-[100svh] w-full items-start justify-center overflow-x-hidden overflow-y-auto px-4 py-8 font-sans text-alfredo-navy sm:items-center sm:p-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[55%]"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(27,166,182,0.10) 0%, transparent 65%)",
          }}
        />
        <div className="absolute top-1/3 left-[15%] h-72 w-72 rounded-full bg-alfredo-teal/[0.06] blur-[100px]" />
        <div className="absolute right-[12%] bottom-1/4 h-64 w-64 rounded-full bg-alfredo-petrol/[0.05] blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <button
          type="button"
          onClick={onBackToLanding}
          className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-medium text-alfredo-muted transition-colors hover:text-alfredo-teal-dark"
        >
          <ArrowLeft size={13} />
          Voltar para o início
        </button>

        <div className="rounded-2xl border border-alfredo-border bg-white p-7 shadow-[0_24px_80px_-28px_rgba(13,27,42,0.22)] sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-alfredo-border bg-alfredo-offwhite">
              <AlfredoMark size={38} variant="gradient" />
            </div>
            <h1 className="alfredo-wordmark text-3xl sm:text-4xl">
              Alfredo<span className="alfredo-wordmark__dot">.</span>
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-alfredo-muted">
              {passwordRecoveryMode
                ? "Defina sua nova senha"
                : "Entre com seu e-mail e senha"}
            </p>
          </div>

          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-alfredo-coral/25 bg-[#FFF0ED] px-3.5 py-3 text-xs leading-relaxed text-alfredo-coral"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-alfredo-coral" />
              <span>{loginError}</span>
            </motion.div>
          )}

          {loginSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-alfredo-teal/25 bg-alfredo-surface-teal px-3.5 py-3 text-xs leading-relaxed text-alfredo-teal-dark"
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-alfredo-teal-dark" />
              <span>{loginSuccess}</span>
            </motion.div>
          )}

          {passwordRecoveryMode ? (
            <form
              onSubmit={onRecoverySubmit}
              className="space-y-4"
              onFocusCapture={(e) => {
                const el = e.target as HTMLElement;
                if (el.tagName === "INPUT") {
                  window.setTimeout(() => {
                    el.scrollIntoView({ block: "center", behavior: "smooth" });
                  }, 280);
                }
              }}
            >
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-alfredo-graphite">
                  Nova senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-alfredo-muted">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={recoveryPassword}
                    onChange={(e) => onRecoveryPasswordChange?.(e.target.value)}
                    className="w-full rounded-xl border border-alfredo-border bg-alfredo-offwhite py-2.5 pr-3.5 pl-10 text-sm text-alfredo-navy placeholder-alfredo-muted outline-none transition-all focus:border-alfredo-teal/60 focus:bg-white focus:ring-2 focus:ring-alfredo-teal/20"
                  />
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-alfredo-muted">
                  Mín. 8 caracteres, com maiúscula, minúscula e caractere especial.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-alfredo-graphite">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-alfredo-muted">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={recoveryPasswordConfirm}
                    onChange={(e) =>
                      onRecoveryPasswordConfirmChange?.(e.target.value)
                    }
                    className="w-full rounded-xl border border-alfredo-border bg-alfredo-offwhite py-2.5 pr-3.5 pl-10 text-sm text-alfredo-navy placeholder-alfredo-muted outline-none transition-all focus:border-alfredo-teal/60 focus:bg-white focus:ring-2 focus:ring-alfredo-teal/20"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!isReady || isSubmitting}
                className="mt-2 w-full cursor-pointer rounded-xl bg-alfredo-navy py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(13,27,42,0.5)] transition-all hover:bg-alfredo-petrol active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-4"
              onFocusCapture={(e) => {
                const el = e.target as HTMLElement;
                if (el.tagName === "INPUT") {
                  window.setTimeout(() => {
                    el.scrollIntoView({ block: "center", behavior: "smooth" });
                  }, 280);
                }
              }}
            >
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-alfredo-graphite">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-alfredo-muted">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="w-full rounded-xl border border-alfredo-border bg-alfredo-offwhite py-2.5 pr-3.5 pl-10 text-sm text-alfredo-navy placeholder-alfredo-muted outline-none transition-all focus:border-alfredo-teal/60 focus:bg-white focus:ring-2 focus:ring-alfredo-teal/20"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[11px] font-medium tracking-wide text-alfredo-graphite">
                    Senha
                  </label>
                  {onForgotPassword && (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-[10px] font-medium text-alfredo-teal-dark hover:text-alfredo-teal"
                    >
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-alfredo-muted">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    className="w-full rounded-xl border border-alfredo-border bg-alfredo-offwhite py-2.5 pr-3.5 pl-10 text-sm text-alfredo-navy placeholder-alfredo-muted outline-none transition-all focus:border-alfredo-teal/60 focus:bg-white focus:ring-2 focus:ring-alfredo-teal/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!isReady || isSubmitting}
                className="mt-2 w-full cursor-pointer rounded-xl bg-alfredo-navy py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(13,27,42,0.5)] transition-all hover:bg-alfredo-petrol active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              >
                {!isReady
                  ? "Preparando..."
                  : isSubmitting
                    ? "Entrando..."
                    : "Entrar"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
