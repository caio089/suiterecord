import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Mic,
  Sparkles,
  Calendar,
  Shield,
  FileText,
  Mail,
  ExternalLink,
  Check,
  Building2,
  Users,
  Zap,
} from "lucide-react";

type LandingPageProps = {
  logoSrc: string;
  onEnter: () => void;
};

type IntroPhase = "brand" | "fade" | "black" | "dawn" | "done";

const BRAND_LETTERS = "Suiter Record".split("");

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "Sob consulta",
    description: "Para times enxutos que precisam de registro confiável sem complexidade.",
    icon: Zap,
    features: [
      "Gravação e upload de áudio",
      "Transcrição e ata com IA",
      "Histórico pesquisável",
      "Exportação PDF / DOCX",
      "Até 5 usuários",
    ],
    highlighted: false,
  },
  {
    id: "profissional",
    name: "Profissional",
    price: "Sob consulta",
    description: "O equilíbrio ideal entre produtividade, agenda e governança corporativa.",
    icon: Users,
    features: [
      "Tudo do Essencial",
      "Integração Google Agenda",
      "Busca inteligente em atas",
      "Controle de acesso corporativo",
      "Até 25 usuários",
      "Suporte prioritário",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Personalizado",
    description: "Para operações maiores que exigem escala, política e acompanhamento dedicado.",
    icon: Building2,
    features: [
      "Tudo do Profissional",
      "Usuários ilimitados",
      "Onboarding e treinamento",
      "SLA e suporte dedicado",
      "Integrações sob medida",
      "Governança alinhada à Triforce",
    ],
    highlighted: false,
  },
];

export default function LandingPage({ logoSrc, onEnter }: LandingPageProps) {
  const whyRef = useRef<HTMLElement | null>(null);
  const plansRef = useRef<HTMLElement | null>(null);
  const contactRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [introPhase, setIntroPhase] = useState<IntroPhase>(
    reduceMotion ? "done" : "brand"
  );
  const [showContent, setShowContent] = useState(!!reduceMotion);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = introPhase === "done" ? "auto" : "hidden";
    return () => {
      document.body.style.overflow = prev || "hidden";
    };
  }, [introPhase]);

  useEffect(() => {
    if (reduceMotion) {
      setIntroPhase("done");
      setShowContent(true);
      return;
    }

    const timers: number[] = [];
    // Marca aparece → letras somem → preto → amanhecer → hero
    timers.push(window.setTimeout(() => setIntroPhase("fade"), 2200));
    timers.push(window.setTimeout(() => setIntroPhase("black"), 3400));
    timers.push(window.setTimeout(() => setIntroPhase("dawn"), 4000));
    timers.push(
      window.setTimeout(() => {
        setShowContent(true);
        setIntroPhase("done");
      }, 5600)
    );

    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  const scrollTo = (ref: RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const contentReady = showContent;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white font-sans antialiased selection:bg-emerald-500/30">
      {/* Intro overlay */}
      <AnimatePresence>
        {introPhase !== "done" && (
          <motion.div
            key="intro"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Dawn glow during dawn phase */}
            {(introPhase === "dawn" || introPhase === "black") && (
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: introPhase === "dawn" ? 1 : 0,
                }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                style={{
                  background:
                    "radial-gradient(ellipse 80% 55% at 50% 100%, rgba(16,185,129,0.28) 0%, rgba(52,211,153,0.08) 35%, transparent 70%)",
                }}
              />
            )}

            {(introPhase === "brand" || introPhase === "fade") && (
              <div className="flex flex-wrap items-center justify-center gap-x-[0.12em] px-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
                {BRAND_LETTERS.map((letter, i) => (
                  <motion.span
                    key={`${letter}-${i}`}
                    className={
                      letter === " "
                        ? "inline-block w-[0.35em]"
                        : i > 6
                          ? "text-emerald-400"
                          : "text-white"
                    }
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    animate={
                      introPhase === "fade"
                        ? {
                            opacity: 0,
                            y: -12,
                            filter: "blur(12px)",
                            scale: 0.96,
                          }
                        : {
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                            scale: 1,
                          }
                    }
                    transition={{
                      duration: introPhase === "fade" ? 0.7 : 0.55,
                      delay:
                        introPhase === "fade"
                          ? i * 0.035
                          : 0.15 + i * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {letter === " " ? "\u00A0" : letter}
                  </motion.span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient — dawn atmosphere after intro */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 h-[85%]"
          initial={false}
          animate={{
            opacity: contentReady ? 1 : 0,
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16,185,129,0.14) 0%, rgba(6,78,59,0.06) 40%, transparent 70%)",
          }}
        />
        <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* Nav */}
      <motion.header
        initial={false}
        animate={{
          opacity: contentReady ? 1 : 0,
          y: contentReady ? 0 : -16,
        }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 border-b border-white/[0.06] bg-zinc-950/50 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Suiter Record"
              className="h-9 w-9 rounded-xl border border-zinc-800/80 object-cover"
            />
            <span className="font-display text-sm font-semibold tracking-tight">
              Suiter <span className="text-emerald-400">Record</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => scrollTo(whyRef)}
              className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-white sm:inline-flex"
            >
              Por quê
            </button>
            <button
              type="button"
              onClick={() => scrollTo(plansRef)}
              className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-white sm:inline-flex"
            >
              Planos
            </button>
            <button
              type="button"
              onClick={() => scrollTo(contactRef)}
              className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-white sm:inline-flex"
            >
              Contato
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="ml-1 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:border-emerald-500/40 hover:bg-zinc-800/80"
            >
              Entrar
            </button>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col justify-center overflow-hidden">
        {/* Dawn horizon light */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
          initial={false}
          animate={{ opacity: contentReady ? 1 : 0 }}
          transition={{ duration: 2.2, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(16,185,129,0.18) 0%, rgba(52,211,153,0.05) 40%, transparent 72%)",
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] opacity-35 sm:h-[46%] sm:opacity-45">
          {contentReady && <WaveformHero />}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pb-28 sm:pt-6">
          <div className="max-w-3xl">
            <motion.p
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 28,
              }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Suiter <span className="text-emerald-400">Record</span>
            </motion.p>

            <motion.h1
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 24,
              }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl text-xl font-medium leading-snug text-zinc-200 sm:text-2xl md:text-3xl"
            >
              Grave, transcreva e transforme reuniões em atas inteligentes — em
              minutos.
            </motion.h1>

            <motion.p
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 20,
              }}
              transition={{ duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base"
            >
              A extensão corporativa do ecossistema Suiter para capturar áudio,
              gerar resumos com IA e sincronizar compromissos com a Google
              Agenda.
            </motion.p>

            <motion.div
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 16,
              }}
              transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={() => scrollTo(plansRef)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-emerald-950/30 transition-all hover:bg-emerald-400 active:scale-[0.98]"
              >
                Ver planos
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/90 bg-zinc-900/50 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:border-zinc-500 hover:bg-zinc-800/80"
              >
                Entrar
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Por que Suiter Record */}
      <section
        ref={whyRef}
        id="por-que"
        className="relative z-10 border-t border-white/[0.05] py-24 sm:py-32"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16 max-w-2xl"
          >
            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-emerald-400/90">
              Por que Suiter Record
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Do áudio à decisão — sem atrito operacional.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Feito para times que vivem de reunião e precisam de registro
              confiável, busca inteligente e integração com a rotina real da
              agenda. Você está no lugar certo para trabalhar com clareza.
            </p>
          </motion.div>

          {/* Fluxo: como acontece */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65 }}
            className="mb-20 grid gap-6 sm:grid-cols-3"
          >
            {[
              {
                step: "01",
                title: "Capture",
                text: "Grave ao vivo ou envie o áudio da reunião. Validação e compressão automáticas.",
              },
              {
                step: "02",
                title: "Processe",
                text: "A IA estrutura transcrição, overview, decisões e plano de ação em minutos.",
              },
              {
                step: "03",
                title: "Aja",
                text: "Consulte o histórico, exporte e sincronize com a Google Agenda do time.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative"
              >
                <span className="font-display text-4xl font-semibold text-emerald-500/15">
                  {item.step}
                </span>
                <h3 className="mt-2 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Mic,
                title: "Captura e upload",
                text: "Grave ao vivo ou anexe áudios prontos. Validação e compressão automática para não pesar no armazenamento.",
              },
              {
                icon: Sparkles,
                title: "Ata com IA",
                text: "Transcrição, overview, tópicos, decisões e ações priorizadas — estruturados para o fluxo Suiter.",
              },
              {
                icon: Calendar,
                title: "Google Agenda",
                text: "Conecte a conta do usuário, veja os compromissos dele e insira a reunião na agenda quando quiser.",
              },
              {
                icon: FileText,
                title: "Histórico pesquisável",
                text: "Consulte atas anteriores com linguagem natural e encontre o que foi decidido em segundos.",
              },
              {
                icon: Shield,
                title: "Acesso corporativo",
                text: "Somente usuários autorizados. Controle institucional alinhado à política da Triforce / Suiter.",
              },
              {
                icon: ExternalLink,
                title: "Exportação",
                text: "PDF, DOCX e integração com o ecossistema Suiter para seguir o processo além da reunião.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="border-t border-white/[0.06] pt-6"
              >
                <item.icon size={18} className="mb-3 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section
        ref={plansRef}
        id="planos"
        className="relative z-10 border-t border-white/[0.05] bg-zinc-900/20 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-14 max-w-2xl"
          >
            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-emerald-400/90">
              Planos
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Escala com o ritmo do seu time.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Escolha o formato que cabe na operação. Valores sob consulta —
              montamos a proposta com a Triforce Consultoria.
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 ${
                  plan.highlighted
                    ? "border-emerald-500/35 bg-emerald-500/[0.06] shadow-[0_0_60px_-20px_rgba(16,185,129,0.35)]"
                    : "border-white/[0.07] bg-zinc-950/40"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black">
                    Recomendado
                  </span>
                )}
                <plan.icon
                  size={20}
                  className={
                    plan.highlighted ? "text-emerald-400" : "text-zinc-400"
                  }
                />
                <h3 className="mt-4 font-display text-lg font-semibold text-white">
                  {plan.name}
                </h3>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-400">
                  {plan.price}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {plan.description}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-emerald-400"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => scrollTo(contactRef)}
                  className={`mt-8 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
                  }`}
                >
                  Falar sobre este plano
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section
        ref={contactRef}
        id="contato"
        className="relative z-10 border-t border-white/[0.05] py-24 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-emerald-400/90">
              Contato
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Pronto para levar o Record ao seu time?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Acesso restrito a usuários cadastrados. Solicite liberação, planos
              ou suporte diretamente com a Triforce Consultoria.
            </p>

            <div className="mt-8 space-y-3 text-sm text-zinc-300">
              <a
                href="mailto:atendimento@triforceconsultoria.com"
                className="inline-flex items-center gap-2 text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <Mail size={16} />
                atendimento@triforceconsultoria.com
              </a>
              <p className="text-xs text-zinc-500">
                Desenvolvido pela Triforce Consultoria · uso corporativo Suiter
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black transition-all hover:bg-emerald-400"
              >
                Já tenho acesso — Entrar
                <ArrowRight size={16} />
              </button>
              <a
                href="mailto:atendimento@triforceconsultoria.com?subject=Interesse%20em%20Suiter%20Record"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
              >
                Solicitar proposta
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.05] py-6 text-center text-[10px] text-zinc-600">
        © {new Date().getFullYear()} Suiter Record · Triforce Consultoria
      </footer>
    </div>
  );
}

function WaveformHero() {
  const bars = Array.from({ length: 64 }, (_, i) => {
    const t = i / 64;
    const h =
      18 +
      Math.sin(t * Math.PI * 4) * 28 +
      Math.sin(t * Math.PI * 9) * 16 +
      (i % 5) * 3;
    return Math.max(10, Math.min(92, h));
  });

  return (
    <div className="flex h-full w-full items-end justify-center gap-[3px] px-4 sm:gap-1 sm:px-10">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-emerald-400/60 sm:w-1"
          initial={{ height: "8%", opacity: 0 }}
          animate={{
            height: [`${h * 0.55}%`, `${h}%`, `${h * 0.7}%`],
            opacity: 1,
          }}
          transition={{
            height: {
              duration: 2.4 + (i % 7) * 0.12,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: (i % 12) * 0.04,
            },
            opacity: { duration: 1.2, delay: 0.3 + i * 0.01 },
          }}
          style={{
            boxShadow: "0 0 12px rgba(16,185,129,0.2)",
          }}
        />
      ))}
    </div>
  );
}
