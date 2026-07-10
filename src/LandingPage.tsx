import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useInView,
} from "motion/react";
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

type IntroPhase = "brand" | "fade" | "dawn" | "done";

const BRAND_LETTERS = "Suiter Record".split("");

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "Sob consulta",
    description:
      "Para times enxutos que precisam de registro confiável sem complexidade.",
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
    description:
      "O equilíbrio ideal entre produtividade, agenda e governança corporativa.",
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
    description:
      "Para operações maiores que exigem escala, política e acompanhamento dedicado.",
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

const FEATURES = [
  {
    icon: Mic,
    title: "Captura e upload",
    text: "Grave ao vivo ou anexe áudios. Validação e compressão automáticas.",
  },
  {
    icon: Sparkles,
    title: "Ata com IA",
    text: "Transcrição, overview, decisões e ações — prontos para o fluxo Suiter.",
  },
  {
    icon: Calendar,
    title: "Google Agenda",
    text: "Veja compromissos e insira a reunião na agenda do time.",
  },
  {
    icon: FileText,
    title: "Histórico pesquisável",
    text: "Encontre o que foi decidido com busca em linguagem natural.",
  },
  {
    icon: Shield,
    title: "Acesso corporativo",
    text: "Somente usuários autorizados, com isolamento por conta.",
  },
  {
    icon: ExternalLink,
    title: "Exportação",
    text: "PDF, DOCX e integração com o ecossistema Suiter.",
  },
];

const FLOW = [
  {
    step: "01",
    title: "Capture",
    text: "Grave ao vivo ou envie o áudio. Validação e compressão automáticas.",
  },
  {
    step: "02",
    title: "Processe",
    text: "A IA estrutura transcrição, overview, decisões e plano de ação.",
  },
  {
    step: "03",
    title: "Aja",
    text: "Consulte, exporte e sincronize com a Google Agenda do time.",
  },
];

export default function LandingPage({ logoSrc, onEnter }: LandingPageProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const whyRef = useRef<HTMLElement | null>(null);
  const plansRef = useRef<HTMLElement | null>(null);
  const contactRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [introPhase, setIntroPhase] = useState<IntroPhase>(
    reduceMotion ? "done" : "brand"
  );
  const [showContent, setShowContent] = useState(!!reduceMotion);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const glowX = useSpring(mouseX, { stiffness: 80, damping: 22 });
  const glowY = useSpring(mouseY, { stiffness: 80, damping: 22 });
  const glowLeft = useTransform(glowX, [0, 1], ["20%", "80%"]);
  const glowTop = useTransform(glowY, [0, 1], ["10%", "55%"]);

  const { scrollYProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"],
  });
  const progressScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
  });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, 0.15]);
  const waveScale = useTransform(heroProgress, [0, 1], [1, 1.25]);

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

    // Intro rápida: marca → fade → dawn → hero (~1.9s total)
    const timers = [
      window.setTimeout(() => setIntroPhase("fade"), 900),
      window.setTimeout(() => setIntroPhase("dawn"), 1300),
      window.setTimeout(() => {
        setShowContent(true);
        setIntroPhase("done");
      }, 1900),
    ];

    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  const scrollTo = (ref: RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onHeroMove = (e: MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const contentReady = showContent;
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div
      ref={pageRef}
      className="relative min-h-screen w-full overflow-x-hidden bg-[#070809] text-white font-sans antialiased selection:bg-emerald-500/30"
    >
      {/* Scroll progress */}
      {contentReady && (
        <motion.div
          className="fixed top-0 right-0 left-0 z-[60] h-[2px] origin-left bg-emerald-400"
          style={{ scaleX: progressScale }}
        />
      )}

      {/* Intro overlay — rápido */}
      <AnimatePresence>
        {introPhase !== "done" && (
          <motion.div
            key="intro"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            {(introPhase === "dawn" || introPhase === "fade") && (
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
                initial={{ opacity: 0 }}
                animate={{ opacity: introPhase === "dawn" ? 1 : 0.15 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  background:
                    "radial-gradient(ellipse 80% 55% at 50% 100%, rgba(16,185,129,0.3) 0%, rgba(52,211,153,0.08) 35%, transparent 70%)",
                }}
              />
            )}

            {(introPhase === "brand" || introPhase === "fade") && (
              <div className="flex flex-wrap items-center justify-center gap-x-[0.1em] px-6 font-display text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                {BRAND_LETTERS.map((letter, i) => (
                  <motion.span
                    key={`${letter}-${i}`}
                    className={
                      letter === " "
                        ? "inline-block w-[0.32em]"
                        : i > 6
                          ? "text-emerald-400"
                          : "text-white"
                    }
                    initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                    animate={
                      introPhase === "fade"
                        ? {
                            opacity: 0,
                            y: -8,
                            filter: "blur(10px)",
                            scale: 0.97,
                          }
                        : {
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                            scale: 1,
                          }
                    }
                    transition={{
                      duration: introPhase === "fade" ? 0.32 : 0.35,
                      delay:
                        introPhase === "fade" ? i * 0.012 : 0.04 + i * 0.022,
                      ease,
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

      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute h-[55vmax] w-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.09] blur-[110px]"
          style={{ left: glowLeft, top: glowTop }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
          }}
        />
      </div>

      {/* Nav */}
      <motion.header
        initial={false}
        animate={{
          opacity: contentReady ? 1 : 0,
          y: contentReady ? 0 : -12,
        }}
        transition={{ duration: 0.45, delay: 0.05, ease }}
        className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#070809]/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:h-16 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Suiter Record"
              className="h-8 w-8 rounded-lg border border-white/[0.08] object-cover sm:h-9 sm:w-9 sm:rounded-xl"
            />
            <span className="font-display text-sm font-semibold tracking-tight">
              Suiter <span className="text-emerald-400">Record</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            {[
              { label: "Por quê", ref: whyRef },
              { label: "Planos", ref: plansRef },
              { label: "Contato", ref: contactRef },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollTo(item.ref)}
                className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-white sm:inline-flex"
              >
                {item.label}
              </button>
            ))}
            <MagneticButton onClick={onEnter} variant="ghost">
              Entrar
            </MagneticButton>
          </nav>
        </div>
      </motion.header>

      {/* Hero — full bleed, brand first */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMove}
        className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col justify-end overflow-hidden sm:min-h-[calc(100vh-4rem)]"
      >
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
          style={{
            opacity: contentReady ? 1 : 0,
            background:
              "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(16,185,129,0.22) 0%, rgba(52,211,153,0.05) 42%, transparent 72%)",
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] opacity-40 sm:h-[48%] sm:opacity-50"
          style={{ scale: waveScale }}
        >
          {contentReady && <WaveformHero reduceMotion={!!reduceMotion} />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-[#070809]/55 to-transparent" />
        </motion.div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pb-28"
        >
          <div className="max-w-3xl">
            <motion.p
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 20,
              }}
              transition={{ duration: 0.45, delay: 0.02, ease }}
              className="mb-4 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl"
            >
              Suiter <span className="text-emerald-400">Record</span>
            </motion.p>

            <motion.h1
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 16,
              }}
              transition={{ duration: 0.45, delay: 0.1, ease }}
              className="max-w-2xl text-lg font-medium leading-snug text-zinc-200 sm:text-2xl md:text-3xl"
            >
              Grave, transcreva e transforme reuniões em atas inteligentes — em
              minutos.
            </motion.h1>

            <motion.p
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 12,
              }}
              transition={{ duration: 0.4, delay: 0.18, ease }}
              className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base"
            >
              Extensão corporativa do ecossistema Suiter: áudio, IA e Google
              Agenda no mesmo fluxo.
            </motion.p>

            <motion.div
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 10,
              }}
              transition={{ duration: 0.4, delay: 0.26, ease }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <MagneticButton onClick={() => scrollTo(plansRef)} variant="primary">
                Ver planos
                <ArrowRight size={16} />
              </MagneticButton>
              <MagneticButton onClick={onEnter} variant="secondary">
                Entrar
              </MagneticButton>
            </motion.div>
          </div>

          <motion.div
            initial={false}
            animate={{ opacity: contentReady ? 1 : 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-14 hidden items-center gap-2 text-[10px] font-medium tracking-[0.2em] text-zinc-600 uppercase sm:flex"
          >
            <span className="h-px w-8 bg-zinc-700" />
            Role para explorar
          </motion.div>
        </motion.div>
      </section>

      {/* Por que — scroll reveal + sticky flow */}
      <section
        ref={whyRef}
        id="por-que"
        className="relative z-10 border-t border-white/[0.05] py-24 sm:py-32"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-400/90 uppercase">
              Por que Suiter Record
            </p>
            <h2 className="font-display max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Do áudio à decisão —{" "}
              <span className="text-emerald-400">sem atrito</span>.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Feito para times que vivem de reunião e precisam de registro
              confiável, busca inteligente e integração com a agenda real.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {FLOW.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.08}>
                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]">
                  <motion.span
                    className="font-display block text-5xl font-bold text-emerald-500/15 transition-colors group-hover:text-emerald-500/30"
                    whileInView={{ x: [12, 0], opacity: [0, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    {item.step}
                  </motion.span>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {item.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <div className="border-t border-white/[0.07] pt-5">
                  <item.icon size={18} className="mb-3 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {item.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee strip */}
      <div className="relative z-10 overflow-hidden border-y border-white/[0.05] py-4">
        <motion.div
          className="flex w-max gap-10 whitespace-nowrap font-display text-sm font-semibold tracking-tight text-zinc-600"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(2)].flatMap((_, copy) =>
            [
              "Gravação",
              "Transcrição IA",
              "Atas inteligentes",
              "Google Agenda",
              "Exportação",
              "Busca semântica",
              "Acesso corporativo",
              "Ecossistema Suiter",
            ].map((label) => (
              <span key={`${copy}-${label}`} className="inline-flex items-center gap-10">
                <span className="text-emerald-500/50">◆</span>
                {label}
              </span>
            ))
          )}
        </motion.div>
      </div>

      {/* Planos */}
      <section
        ref={plansRef}
        id="planos"
        className="relative z-10 bg-zinc-900/15 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-400/90 uppercase">
              Planos
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Escala com o ritmo do seu time.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Valores sob consulta — montamos a proposta com a Triforce
              Consultoria.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.08}>
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-7 ${
                    plan.highlighted
                      ? "border-emerald-500/35 bg-emerald-500/[0.06] shadow-[0_0_60px_-20px_rgba(16,185,129,0.4)]"
                      : "border-white/[0.07] bg-[#0a0c0e]/80"
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section
        ref={contactRef}
        id="contato"
        className="relative z-10 overflow-hidden border-t border-white/[0.05] py-24 sm:py-28"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_80%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-400/90 uppercase">
              Contato
            </p>
            <h2 className="font-display max-w-xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Pronto para levar o Record ao seu time?
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
              Acesso restrito a usuários cadastrados. Solicite liberação, planos
              ou suporte com a Triforce Consultoria.
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
              <MagneticButton onClick={onEnter} variant="primary">
                Já tenho acesso — Entrar
                <ArrowRight size={16} />
              </MagneticButton>
              <a
                href="mailto:atendimento@triforceconsultoria.com?subject=Interesse%20em%20Suiter%20Record"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
              >
                Solicitar proposta
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.05] py-6 text-center text-[10px] text-zinc-600">
        © {new Date().getFullYear()} Suiter Record · Triforce Consultoria
      </footer>
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      animate={
        inView || reduceMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 28 }
      }
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({
  children,
  onClick,
  variant,
}: {
  children: ReactNode;
  onClick: () => void;
  variant: "primary" | "secondary" | "ghost";
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 18 });
  const springY = useSpring(y, { stiffness: 280, damping: 18 });
  const reduceMotion = useReducedMotion();

  const base =
    variant === "primary"
      ? "rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black shadow-[0_10px_30px_-12px_rgba(16,185,129,0.55)] hover:bg-emerald-400"
      : variant === "secondary"
        ? "rounded-xl border border-zinc-700/90 bg-zinc-900/50 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:border-zinc-500 hover:bg-zinc-800/80"
        : "rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-2 text-xs font-semibold text-white hover:border-emerald-500/40 hover:bg-zinc-800/80";

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      style={reduceMotion ? undefined : { x: springX, y: springY }}
      onMouseMove={(e) => {
        if (reduceMotion || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.25);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.25);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={`inline-flex cursor-pointer items-center gap-2 transition-colors ${base}`}
    >
      {children}
    </motion.button>
  );
}

function WaveformHero({ reduceMotion }: { reduceMotion: boolean }) {
  const bars = Array.from({ length: 72 }, (_, i) => {
    const t = i / 72;
    const h =
      18 +
      Math.sin(t * Math.PI * 4) * 28 +
      Math.sin(t * Math.PI * 9) * 16 +
      (i % 5) * 3;
    return Math.max(10, Math.min(92, h));
  });

  return (
    <div className="flex h-full w-full items-end justify-center gap-[2px] px-3 sm:gap-[3px] sm:px-10">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-emerald-400/55 sm:w-1"
          initial={{ height: "8%", opacity: 0 }}
          animate={
            reduceMotion
              ? { height: `${h * 0.7}%`, opacity: 0.7 }
              : {
                  height: [`${h * 0.45}%`, `${h}%`, `${h * 0.65}%`],
                  opacity: 1,
                }
          }
          transition={{
            height: {
              duration: 1.6 + (i % 7) * 0.08,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: (i % 10) * 0.03,
            },
            opacity: { duration: 0.5, delay: i * 0.006 },
          }}
          style={{ boxShadow: "0 0 10px rgba(16,185,129,0.18)" }}
        />
      ))}
    </div>
  );
}
