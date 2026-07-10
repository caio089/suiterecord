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
  Menu,
  X,
  ChevronDown,
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
    reduceMotion ? "done" : "brand",
  );
  const [showContent, setShowContent] = useState(!!reduceMotion);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

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
  const heroY = useTransform(heroProgress, [0, 1], [0, 48]);
  const heroOpacity = useTransform(heroProgress, [0, 0.85], [1, 0.2]);
  const waveScale = useTransform(heroProgress, [0, 1], [1, 1.12]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow =
      introPhase === "done" && !mobileMenuOpen ? "auto" : "hidden";
    return () => {
      document.body.style.overflow = prev || "hidden";
    };
  }, [introPhase, mobileMenuOpen]);

  useEffect(() => {
    if (reduceMotion) {
      setIntroPhase("done");
      setShowContent(true);
      return;
    }

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

  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setShowStickyCta(heroBottom < 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (ref: RefObject<HTMLElement | null>) => {
    setMobileMenuOpen(false);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onHeroMove = (e: MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const contentReady = showContent;
  const ease = [0.22, 1, 0.36, 1] as const;
  const navItems = [
    { label: "Por quê", ref: whyRef },
    { label: "Planos", ref: plansRef },
    { label: "Contato", ref: contactRef },
  ];

  return (
    <div
      ref={pageRef}
      className="landing-page relative min-h-[100svh] w-full overflow-x-hidden bg-[#070809] text-white font-sans antialiased selection:bg-emerald-500/30"
    >
      {contentReady && (
        <motion.div
          className="fixed top-0 right-0 left-0 z-[60] h-[2px] origin-left bg-emerald-400"
          style={{ scaleX: progressScale }}
        />
      )}

      <AnimatePresence>
        {introPhase !== "done" && (
          <motion.div
            key="intro"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black px-4"
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
              <div className="flex max-w-full flex-nowrap items-center justify-center gap-x-[0.06em] overflow-hidden px-3 font-display text-[clamp(1.35rem,5.8vw,4.5rem)] font-bold tracking-tight whitespace-nowrap">
                {BRAND_LETTERS.map((letter, i) => (
                  <motion.span
                    key={`${letter}-${i}`}
                    className={
                      letter === " "
                        ? "inline-block w-[0.28em] shrink-0"
                        : i > 6
                          ? "shrink-0 text-emerald-400"
                          : "shrink-0 text-white"
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

      <motion.header
        initial={false}
        animate={{
          opacity: contentReady ? 1 : 0,
          y: contentReady ? 0 : -12,
        }}
        transition={{ duration: 0.45, delay: 0.05, ease }}
        className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#070809]/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src={logoSrc}
              alt="Suiter Record"
              className="h-8 w-8 shrink-0 rounded-lg border border-white/[0.08] object-cover sm:h-9 sm:w-9 sm:rounded-xl"
            />
            <span className="font-display truncate text-sm font-semibold tracking-tight">
              Suiter <span className="text-emerald-400">Record</span>
            </span>
          </div>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollTo(item.ref)}
                className="hidden min-h-10 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-white md:inline-flex"
              >
                {item.label}
              </button>
            ))}
            <MagneticButton onClick={onEnter} variant="ghost">
              Entrar
            </MagneticButton>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white md:hidden"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </nav>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease }}
              className="overflow-hidden border-t border-white/[0.05] md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => scrollTo(item.ref)}
                    className="rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onEnter();
                  }}
                  className="mt-1 rounded-xl bg-emerald-500 px-3 py-3 text-sm font-bold text-black"
                >
                  Entrar no workspace
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <section
        ref={heroRef}
        onMouseMove={onHeroMove}
        className="relative z-10 flex min-h-[calc(100svh-3.5rem-env(safe-area-inset-top))] flex-col justify-end overflow-hidden sm:min-h-[calc(100svh-4rem)]"
      >
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] sm:h-[60%]"
          style={{
            opacity: contentReady ? 1 : 0,
            background:
              "radial-gradient(ellipse 120% 70% at 50% 100%, rgba(16,185,129,0.28) 0%, rgba(52,211,153,0.06) 42%, transparent 72%)",
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] opacity-50 sm:h-[48%]"
          style={{ scale: waveScale }}
        >
          {contentReady && <WaveformHero reduceMotion={!!reduceMotion} />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-[#070809]/60 to-transparent" />
        </motion.div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto w-full max-w-6xl px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pb-28 sm:pt-10"
        >
          <div className="max-w-3xl">
            <motion.p
              initial={false}
              animate={{
                opacity: contentReady ? 1 : 0,
                y: contentReady ? 0 : 20,
              }}
              transition={{ duration: 0.45, delay: 0.02, ease }}
              className="mb-3 font-display text-[clamp(1.85rem,7.2vw,4.5rem)] font-bold leading-[0.95] tracking-tight text-white whitespace-nowrap sm:mb-4"
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
              className="max-w-2xl text-[1.15rem] font-medium leading-snug text-zinc-200 sm:text-2xl md:text-3xl"
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
              className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:mt-4 sm:text-base"
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
              className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
            >
              <MagneticButton onClick={onEnter} variant="primary" fullWidth>
                Entrar
                <ArrowRight size={16} />
              </MagneticButton>
              <MagneticButton
                onClick={() => scrollTo(plansRef)}
                variant="secondary"
                fullWidth
              >
                Ver planos
              </MagneticButton>
            </motion.div>
          </div>

          <motion.button
            type="button"
            initial={false}
            animate={{ opacity: contentReady ? 1 : 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            onClick={() => scrollTo(whyRef)}
            className="mt-10 flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase sm:mt-14"
          >
            <span className="h-px w-6 bg-zinc-700 sm:w-8" />
            Explorar
            <ChevronDown
              size={14}
              className="animate-bounce text-emerald-400/80"
            />
          </motion.button>
        </motion.div>
      </section>

      <section
        ref={whyRef}
        id="por-que"
        className="relative z-10 border-t border-white/[0.05] py-16 sm:py-32"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-400/90 uppercase">
              Por que Suiter Record
            </p>
            <h2 className="font-display max-w-2xl text-[1.75rem] font-bold tracking-tight text-white sm:text-5xl">
              Do áudio à decisão —{" "}
              <span className="text-emerald-400">sem atrito</span>.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:mt-5 sm:text-base">
              Feito para times que vivem de reunião e precisam de registro
              confiável, busca inteligente e integração com a agenda real.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4">
            {FLOW.map((item, i) => (
              <div key={item.step}>
                <Reveal delay={i * 0.08}>
                  <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] sm:p-6">
                    <motion.span
                      className="font-display block text-4xl font-bold text-emerald-500/15 transition-colors group-hover:text-emerald-500/30 sm:text-5xl"
                      whileInView={{ x: [12, 0], opacity: [0, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      {item.step}
                    </motion.span>
                    <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-8 sm:mt-20 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-3">
            {FEATURES.map((item, i) => (
              <div key={item.title}>
                <Reveal delay={i * 0.05}>
                  <div className="border-t border-white/[0.07] pt-4 sm:pt-5">
                    <item.icon size={18} className="mb-3 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 overflow-hidden border-y border-white/[0.05] py-3.5 sm:py-4">
        <motion.div
          className="flex w-max gap-8 whitespace-nowrap font-display text-xs font-semibold tracking-tight text-zinc-600 sm:gap-10 sm:text-sm"
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
              <span
                key={`${copy}-${label}`}
                className="inline-flex items-center gap-8 sm:gap-10"
              >
                <span className="text-emerald-500/50">◆</span>
                {label}
              </span>
            )),
          )}
        </motion.div>
      </div>

      <section
        ref={plansRef}
        id="planos"
        className="relative z-10 bg-zinc-900/15 py-16 sm:py-32"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-400/90 uppercase">
              Planos
            </p>
            <h2 className="font-display text-[1.75rem] font-bold tracking-tight text-white sm:text-5xl">
              Escala com o ritmo do seu time.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:mt-4 sm:text-base">
              Valores sob consulta — montamos a proposta com a Triforce
              Consultoria.
            </p>
            <p className="mt-3 text-[11px] font-medium tracking-wide text-zinc-600 sm:hidden">
              Deslize para ver os planos →
            </p>
          </Reveal>

          <div className="mt-8 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:snap-none sm:grid-cols-1 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className="w-[min(85vw,22rem)] shrink-0 snap-center sm:w-auto sm:shrink"
              >
                <Reveal delay={i * 0.08}>
                  <motion.div
                    whileHover={reduceMotion ? undefined : { y: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={`relative flex h-full flex-col rounded-2xl border p-5 sm:p-7 ${
                      plan.highlighted
                        ? "border-emerald-500/35 bg-emerald-500/[0.06] shadow-[0_0_60px_-20px_rgba(16,185,129,0.4)]"
                        : "border-white/[0.07] bg-[#0a0c0e]/80"
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-5 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black sm:left-6">
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
                      className={`mt-8 min-h-11 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        plan.highlighted
                          ? "bg-emerald-500 text-black hover:bg-emerald-400"
                          : "border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
                      }`}
                    >
                      Falar sobre este plano
                    </button>
                  </motion.div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={contactRef}
        id="contato"
        className="relative z-10 overflow-hidden border-t border-white/[0.05] py-16 sm:py-28"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_80%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-400/90 uppercase">
              Contato
            </p>
            <h2 className="font-display max-w-xl text-[1.75rem] font-bold tracking-tight text-white sm:text-5xl">
              Pronto para levar o Record ao seu time?
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
              Acesso restrito a usuários cadastrados. Solicite liberação, planos
              ou suporte com a Triforce Consultoria.
            </p>

            <div className="mt-8 space-y-3 text-sm text-zinc-300">
              <a
                href="mailto:atendimento@triforceconsultoria.com"
                className="inline-flex min-h-11 items-center gap-2 break-all text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <Mail size={16} className="shrink-0" />
                atendimento@triforceconsultoria.com
              </a>
              <p className="text-xs text-zinc-500">
                Desenvolvido pela Triforce Consultoria · uso corporativo Suiter
              </p>
            </div>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <MagneticButton onClick={onEnter} variant="primary" fullWidth>
                Já tenho acesso — Entrar
                <ArrowRight size={16} />
              </MagneticButton>
              <a
                href="mailto:atendimento@triforceconsultoria.com?subject=Interesse%20em%20Suiter%20Record"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
              >
                Solicitar proposta
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.05] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[10px] text-zinc-600">
        © {new Date().getFullYear()} Suiter Record · Triforce Consultoria
      </footer>

      <AnimatePresence>
        {contentReady && showStickyCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.28, ease }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#070809]/92 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"
          >
            <div className="mx-auto flex max-w-lg gap-2">
              <button
                type="button"
                onClick={onEnter}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-black"
              >
                Entrar
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => scrollTo(plansRef)}
                className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200"
              >
                Planos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={
        inView || reduceMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 24 }
      }
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({
  children,
  onClick,
  variant,
  fullWidth = false,
}: {
  children: ReactNode;
  onClick: () => void;
  variant: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 18 });
  const springY = useSpring(y, { stiffness: 280, damping: 18 });
  const reduceMotion = useReducedMotion();

  const base =
    variant === "primary"
      ? "min-h-11 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black shadow-[0_10px_30px_-12px_rgba(16,185,129,0.55)] hover:bg-emerald-400"
      : variant === "secondary"
        ? "min-h-11 rounded-xl border border-zinc-700/90 bg-zinc-900/50 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:border-zinc-500 hover:bg-zinc-800/80"
        : "min-h-10 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-2 text-xs font-semibold text-white hover:border-emerald-500/40 hover:bg-zinc-800/80";

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      style={reduceMotion ? undefined : { x: springX, y: springY }}
      onMouseMove={(e) => {
        if (reduceMotion || !ref.current) return;
        if (window.matchMedia("(pointer: coarse)").matches) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.25);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.25);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 transition-colors ${base} ${
        fullWidth ? "w-full sm:w-auto" : ""
      }`}
    >
      {children}
    </motion.button>
  );
}

function WaveformHero({ reduceMotion }: { reduceMotion: boolean }) {
  const [barCount, setBarCount] = useState(48);

  useEffect(() => {
    const update = () => {
      setBarCount(window.innerWidth < 640 ? 36 : 72);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const bars = Array.from({ length: barCount }, (_, i) => {
    const t = i / barCount;
    const h =
      18 +
      Math.sin(t * Math.PI * 4) * 28 +
      Math.sin(t * Math.PI * 9) * 16 +
      (i % 5) * 3;
    return Math.max(10, Math.min(92, h));
  });

  return (
    <div className="flex h-full w-full items-end justify-center gap-[2px] px-2 sm:gap-[3px] sm:px-10">
      {bars.map((h, i) => (
        <motion.div
          key={`${barCount}-${i}`}
          className="w-[2.5px] rounded-full bg-emerald-400/60 sm:w-1"
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
