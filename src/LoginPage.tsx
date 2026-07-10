import type { FormEvent } from "react";
import { Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

type LoginPageProps = {
  logoSrc: string;
  loginEmail: string;
  loginPassword: string;
  loginError: string;
  isReady: boolean;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onBackToLanding: () => void;
};

export default function LoginPage({
  logoSrc,
  loginEmail,
  loginPassword,
  loginError,
  isReady,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onBackToLanding,
}: LoginPageProps) {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-zinc-950 p-5 font-sans text-white select-none sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[55%]"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 65%)",
          }}
        />
        <div className="absolute top-1/3 left-[15%] h-72 w-72 rounded-full bg-emerald-500/[0.06] blur-[100px]" />
        <div className="absolute right-[12%] bottom-1/4 h-64 w-64 rounded-full bg-emerald-400/[0.04] blur-[90px]" />
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
          className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-emerald-400"
        >
          <ArrowLeft size={13} />
          Voltar para o início
        </button>

        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-7 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl" />
              <img
                src={logoSrc}
                alt="Suiter Record"
                className="relative h-14 w-14 rounded-2xl border border-white/[0.08] object-cover"
              />
            </div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Suiter <span className="text-emerald-400">Record</span>
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              Entre com seu e-mail e senha
            </p>
          </div>

          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/15 bg-red-500/[0.07] px-3.5 py-3 text-xs leading-relaxed text-red-300"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </motion.div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-zinc-400">
                E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
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
                  className="w-full rounded-xl border border-white/[0.07] bg-zinc-950/70 py-2.5 pr-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:bg-zinc-950 focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-zinc-400">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.07] bg-zinc-950/70 py-2.5 pr-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:bg-zinc-950 focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isReady || isSubmitting}
              className="mt-2 w-full cursor-pointer rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-400 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
            >
              {!isReady
                ? "Preparando..."
                : isSubmitting
                  ? "Entrando..."
                  : "Entrar"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
