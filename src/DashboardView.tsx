import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  Mic2,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Meeting } from "./types";

type DashboardViewProps = {
  meetings: Meeting[];
  currentUserEmail: string;
  /** Se true, pode ver visão da equipe; métricas padrão continuam pessoais. */
  isAdmin?: boolean;
};

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CHART_COLORS = {
  emerald: "#34d399",
  emeraldDark: "#059669",
  zinc: "#3f3f46",
  amber: "#fbbf24",
  rose: "#fb7185",
  sky: "#38bdf8",
  violet: "#a78bfa",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#0a0c0e",
  borderColor: "rgba(255,255,255,0.08)",
  borderRadius: "10px",
  fontSize: "11px",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.08)",
};

function formatHours(seconds: number) {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)} min`;
  return `${h.toFixed(1)} h`;
}

function parseMeetingDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function DashboardView({
  meetings,
  currentUserEmail,
  isAdmin = false,
}: DashboardViewProps) {
  const [scope, setScope] = useState<"mine" | "team">(isAdmin ? "mine" : "mine");

  const scopedMeetings = useMemo(() => {
    const email = currentUserEmail.trim().toLowerCase();
    if (!email) return [];

    // Sempre isola por dono; admin só amplia se escolher "Equipe"
    if (isAdmin && scope === "team") {
      return meetings;
    }

    return meetings.filter(
      (m) => (m.createdBy || "").trim().toLowerCase() === email
    );
  }, [meetings, currentUserEmail, isAdmin, scope]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);

    let totalDuration = 0;
    let totalActions = 0;
    let completedActions = 0;
    let pendingActions = 0;
    let decisions = 0;
    let withAudio = 0;
    let withCalendar = 0;
    let thisMonthMeetings = 0;
    let last30Meetings = 0;
    let last30Duration = 0;

    const priorityCount = { Alta: 0, Média: 0, Baixa: 0 };
    const tagMap = new Map<string, number>();
    const assigneeMap = new Map<string, { total: number; pending: number }>();
    const monthMap = new Map<
      string,
      {
        month: string;
        rawMonth: string;
        meetings: number;
        totalDuration: number;
        completedTasks: number;
        pendingTasks: number;
        totalTasks: number;
      }
    >();
    const weekdayCount = Array.from({ length: 7 }, (_, i) => ({
      day: WEEKDAYS[i],
      meetings: 0,
      minutes: 0,
    }));

    for (const m of scopedMeetings) {
      totalDuration += m.duration || 0;
      decisions += m.decisions?.length || 0;
      if (m.hasAudio || m.audioRecordingId) withAudio += 1;
      if (m.googleCalendarEventId) withCalendar += 1;

      for (const tag of m.tags || []) {
        const t = tag.trim();
        if (!t) continue;
        tagMap.set(t, (tagMap.get(t) || 0) + 1);
      }

      for (const a of m.actions || []) {
        totalActions += 1;
        if (a.status === "completed") completedActions += 1;
        else pendingActions += 1;

        if (a.priority && a.priority in priorityCount) {
          priorityCount[a.priority as keyof typeof priorityCount] += 1;
        }

        const name = (a.assignee || "Sem responsável").trim() || "Sem responsável";
        const prev = assigneeMap.get(name) || { total: 0, pending: 0 };
        prev.total += 1;
        if (a.status !== "completed") prev.pending += 1;
        assigneeMap.set(name, prev);
      }

      const d = parseMeetingDate(m.date);
      if (d) {
        const rawMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const pretty = `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        if (!monthMap.has(rawMonth)) {
          monthMap.set(rawMonth, {
            month: pretty,
            rawMonth,
            meetings: 0,
            totalDuration: 0,
            completedTasks: 0,
            pendingTasks: 0,
            totalTasks: 0,
          });
        }
        const row = monthMap.get(rawMonth)!;
        row.meetings += 1;
        row.totalDuration += Math.round((m.duration || 0) / 60);
        for (const a of m.actions || []) {
          row.totalTasks += 1;
          if (a.status === "completed") row.completedTasks += 1;
          else row.pendingTasks += 1;
        }

        weekdayCount[d.getDay()].meetings += 1;
        weekdayCount[d.getDay()].minutes += Math.round((m.duration || 0) / 60);

        if (rawMonth === thisMonthKey) thisMonthMeetings += 1;
        if (d >= last30) {
          last30Meetings += 1;
          last30Duration += m.duration || 0;
        }
      }
    }

    const monthly = Array.from(monthMap.values()).sort((a, b) =>
      a.rawMonth.localeCompare(b.rawMonth)
    );

    const topTags = Array.from(tagMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const topAssignees = Array.from(assigneeMap.entries())
      .map(([name, v]) => ({
        name: name.length > 18 ? `${name.slice(0, 16)}…` : name,
        fullName: name,
        total: v.total,
        pending: v.pending,
        done: v.total - v.pending,
      }))
      .sort((a, b) => b.pending - a.pending || b.total - a.total)
      .slice(0, 6);

    const priorityData = [
      { name: "Alta", value: priorityCount.Alta, color: CHART_COLORS.rose },
      { name: "Média", value: priorityCount.Média, color: CHART_COLORS.amber },
      { name: "Baixa", value: priorityCount.Baixa, color: CHART_COLORS.sky },
    ].filter((p) => p.value > 0);

    const statusData = [
      { name: "Concluídas", value: completedActions, color: CHART_COLORS.emerald },
      { name: "Pendentes", value: pendingActions, color: CHART_COLORS.zinc },
    ].filter((p) => p.value > 0);

    const completionRate =
      totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
    const avgDurationMin =
      scopedMeetings.length > 0
        ? Math.round(totalDuration / scopedMeetings.length / 60)
        : 0;

    const recent = [...scopedMeetings]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);

    return {
      totalMeetings: scopedMeetings.length,
      totalDuration,
      avgDurationMin,
      totalActions,
      completedActions,
      pendingActions,
      decisions,
      withAudio,
      withCalendar,
      thisMonthMeetings,
      last30Meetings,
      last30Duration,
      completionRate,
      monthly:
        monthly.length > 0
          ? monthly
          : [
              {
                month: "Sem dados",
                rawMonth: "0000-00",
                meetings: 0,
                totalDuration: 0,
                completedTasks: 0,
                pendingTasks: 0,
                totalTasks: 0,
              },
            ],
      topTags,
      topAssignees,
      priorityData,
      statusData,
      weekdayCount,
      recent,
      audioPct:
        scopedMeetings.length > 0
          ? Math.round((withAudio / scopedMeetings.length) * 100)
          : 0,
      calendarPct:
        scopedMeetings.length > 0
          ? Math.round((withCalendar / scopedMeetings.length) * 100)
          : 0,
    };
  }, [scopedMeetings]);

  const kpis = [
    {
      label: "Reuniões",
      value: String(stats.totalMeetings),
      hint: `${stats.thisMonthMeetings} neste mês`,
      icon: FileText,
    },
    {
      label: "Tempo total",
      value: formatHours(stats.totalDuration),
      hint: `${formatHours(stats.last30Duration)} nos últimos 30 dias`,
      icon: Clock,
    },
    {
      label: "Duração média",
      value: `${stats.avgDurationMin} min`,
      hint: "Por reunião",
      icon: Activity,
    },
    {
      label: "Taxa de conclusão",
      value: `${stats.completionRate}%`,
      hint: `${stats.completedActions}/${stats.totalActions} tarefas`,
      icon: Target,
      accent: true,
    },
    {
      label: "Pendências",
      value: String(stats.pendingActions),
      hint: "Ações em aberto",
      icon: ListTodo,
    },
    {
      label: "Decisões",
      value: String(stats.decisions),
      hint: "Registradas nas atas",
      icon: CheckCircle2,
    },
    {
      label: "Com áudio",
      value: `${stats.audioPct}%`,
      hint: `${stats.withAudio} reuniões`,
      icon: Mic2,
    },
    {
      label: "Na Agenda",
      value: `${stats.calendarPct}%`,
      hint: `${stats.withCalendar} sincronizadas`,
      icon: Calendar,
    },
  ];

  return (
    <div className="custom-scrollbar mx-auto h-full max-w-6xl space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400">
              <BarChart2 size={16} />
            </span>
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {scope === "team"
              ? "Visão da equipe — todas as reuniões acessíveis."
              : `Métricas da sua conta · ${currentUserEmail}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="inline-flex rounded-xl border border-white/[0.06] bg-black/30 p-1">
              <button
                type="button"
                onClick={() => setScope("mine")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  scope === "mine"
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Meus dados
              </button>
              <button
                type="button"
                onClick={() => setScope("team")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  scope === "team"
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Equipe
              </button>
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-zinc-400">
            <TrendingUp size={13} className="text-emerald-400" />
            {stats.last30Meetings} reuniões · últimos 30 dias
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                {kpi.label}
              </span>
              <kpi.icon
                size={14}
                className={kpi.accent ? "text-emerald-400" : "text-zinc-500"}
              />
            </div>
            <p
              className={`font-display text-2xl font-bold tracking-tight ${
                kpi.accent ? "text-emerald-400" : "text-white"
              }`}
            >
              {kpi.value}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Reuniões por mês"
          subtitle="Volume de atas registradas"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="meetingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="meetings"
                name="Reuniões"
                stroke={CHART_COLORS.emerald}
                fill="url(#meetingsFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Minutos por mês"
          subtitle="Soma da duração das reuniões"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} unit="m" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar
                dataKey="totalDuration"
                name="Minutos"
                fill={CHART_COLORS.emerald}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Tarefas por mês"
          subtitle="Concluídas vs pendentes"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="completedTasks"
                name="Concluídas"
                stackId="tasks"
                fill={CHART_COLORS.emerald}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="pendingTasks"
                name="Pendentes"
                stackId="tasks"
                fill={CHART_COLORS.zinc}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status das tarefas" subtitle="Distribuição atual">
          {stats.statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {stats.statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Prioridade das ações" subtitle="Alta · Média · Baixa">
          {stats.priorityData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.priorityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {stats.priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Reuniões por dia da semana"
          subtitle="Quando o time mais se reúne"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weekdayCount} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="meetings" name="Reuniões" fill={CHART_COLORS.sky} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tags + Assignees + Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Tags mais usadas" subtitle="Temas recorrentes" height="h-64">
          {stats.topTags.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.topTags}
                margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#71717a"
                  fontSize={10}
                  width={72}
                  tickLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Uso" fill={CHART_COLORS.emeraldDark} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h4 className="text-xs font-bold tracking-wider text-white uppercase">
            Responsáveis com pendências
          </h4>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Quem ainda tem ações em aberto
          </p>
          <div className="mt-4 space-y-2.5">
            {stats.topAssignees.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">
                Nenhuma tarefa atribuída ainda.
              </p>
            ) : (
              stats.topAssignees.map((person) => (
                <div
                  key={person.fullName}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200">
                      {person.fullName}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {person.done} feitas · {person.total} no total
                    </p>
                  </div>
                  <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                    {person.pending}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h4 className="text-xs font-bold tracking-wider text-white uppercase">
            Reuniões recentes
          </h4>
          <p className="mt-0.5 text-[10px] text-zinc-500">Últimas atas do workspace</p>
          <div className="mt-4 space-y-2.5">
            {stats.recent.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">
                Nenhuma reunião registrada.
              </p>
            ) : (
              stats.recent.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5"
                >
                  <p className="line-clamp-1 text-xs font-semibold text-zinc-200">
                    {m.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-zinc-500">
                    <span>{m.date || "—"}</span>
                    <span>·</span>
                    <span>{Math.round((m.duration || 0) / 60)} min</span>
                    <span>·</span>
                    <span>{m.actions?.length || 0} ações</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center border-t border-white/[0.05] pt-6 pb-2 opacity-50">
        <p className="font-mono text-[9px] tracking-wider text-zinc-500 uppercase">
          Suiter Record · Triforce Consultoria
        </p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  height = "h-64",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 ${className}`}
    >
      <div className="mb-3">
        <h4 className="text-xs font-bold tracking-wider text-white uppercase">
          {title}
        </h4>
        <p className="mt-0.5 text-[10px] text-zinc-500">{subtitle}</p>
      </div>
      <div className={`w-full ${height}`}>{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
      Sem dados suficientes ainda.
    </div>
  );
}
