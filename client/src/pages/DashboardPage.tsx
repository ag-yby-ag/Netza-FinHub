import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Sparkles,
  ArrowRight,
  Users,
  UserCheck,
  Star,
  DollarSign,
  Clock,
  FileText,
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { ActivityItem } from '../types/dashboard';

// ─── Animation variants ───────────────────────────────────────────
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ─── Chart palette ────────────────────────────────────────────────
const CHART_COLORS = ['#6DED67', '#4DA6FF', '#7C3AED', '#FFB800'];
const PIE_COLORS = ['#6DED67', '#4DA6FF', '#7C3AED', '#FFB800', '#F87171', '#38BDF8'];

// ─── Activity dot color map ──────────────────────────────────────
const activityDotColor: Record<string, string> = {
  quote: 'bg-[#6DED67]',
  supplier: 'bg-[#4DA6FF]',
  review: 'bg-[#FFB800]',
};

// ─── Custom tooltip for charts ────────────────────────────────────
const ChartTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-lg dark:border-[#333] dark:bg-[#1A1A1A]">
      <p className="mb-1 font-['Space_Grotesk'] text-xs font-semibold text-[#737373] dark:text-[#A3A3A3]">
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-['JetBrains_Mono'] text-sm text-[#0D0D0D] dark:text-white">
          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { kpis, categories, costs, trends, recent, loading, error } = useDashboard();

  const today = formatDate(new Date());

  // ── Build KPI display array from flat object ──
  const kpiCards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        id: 'total_suppliers',
        label: 'Total de Fornecedores',
        value: kpis.total_suppliers,
        formattedValue: String(kpis.total_suppliers),
      },
      {
        id: 'active_suppliers',
        label: 'Fornecedores Ativos',
        value: kpis.active_suppliers,
        formattedValue: String(kpis.active_suppliers),
      },
      {
        id: 'avg_rating',
        label: 'Avaliação Média',
        value: kpis.avg_rating,
        formattedValue: kpis.avg_rating.toFixed(1),
      },
      {
        id: 'total_quotes_value',
        label: 'Valor Total de Cotações',
        value: kpis.total_quotes_value,
        formattedValue: formatCurrency(kpis.total_quotes_value),
      },
      {
        id: 'pending_quotes_count',
        label: 'Cotações Pendentes',
        value: kpis.pending_quotes_count,
        formattedValue: String(kpis.pending_quotes_count),
      },
      {
        id: 'avg_delivery_days',
        label: 'Prazo Médio de Entrega',
        value: kpis.avg_delivery_days,
        formattedValue: `${kpis.avg_delivery_days} dias`,
      },
    ];
  }, [kpis]);

  // ── Build cost donut data from by_category ──
  const pieData = useMemo(
    () => (costs?.by_category ?? []).map((c) => ({ name: c.name, value: c.total_amount })),
    [costs],
  );

  // ── Build unified activity list ──
  const activityList = useMemo<ActivityItem[]>(() => {
    if (!recent) return [];

    const items: ActivityItem[] = [];

    (recent.recent_quotes ?? []).forEach((q) => {
      items.push({
        id: `quote-${q.id}`,
        type: 'quote',
        title: q.title,
        description: `${q.supplier_name} — ${formatCurrency(q.amount)} (${q.status})`,
        created_at: q.created_at,
      });
    });

    (recent.recent_reviews ?? []).forEach((r) => {
      items.push({
        id: `review-${r.id}`,
        type: 'review',
        title: `Avaliação de ${r.supplier_name}`,
        description: `${r.reviewer_name} — ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}${r.comment ? ` "${r.comment}"` : ''}`,
        created_at: r.created_at,
      });
    });

    (recent.recent_suppliers ?? []).forEach((s) => {
      items.push({
        id: `supplier-${s.id}`,
        type: 'supplier',
        title: `Novo fornecedor: ${s.name}`,
        description: `${s.category} — ${s.status}`,
        created_at: s.created_at,
      });
    });

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  }, [recent]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-8 p-2">
        <LoadingSkeleton variant="text" width="200px" />
        <LoadingSkeleton variant="rect" height={140} />
        <div className="grid grid-cols-3 gap-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <LoadingSkeleton variant="rect" height={300} />
          <LoadingSkeleton variant="rect" height={300} />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md text-center">
          <p className="mb-2 font-['Space_Grotesk'] text-lg font-bold text-red-600">
            Erro ao carregar dashboard
          </p>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
            {error}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUp}>
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#0D0D0D] dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
          Visão geral do sistema &middot; {today}
        </p>
      </motion.div>

      {/* ── AI Insight Card ── */}
      <motion.div variants={fadeUp}>
        <Card variant="green" className="relative overflow-hidden">
          <div className="flex items-start gap-5">
            {/* Icon area */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/10">
              <Sparkles size={24} className="text-[#0D0D0D]" />
            </div>

            <div className="flex-1 space-y-3">
              <p className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-[#0D0D0D]/70">
                Insight Inteligente
              </p>

              {/* White inner card */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#0D0D0D]">
                  Com base nos dados dos últimos 30 dias, identificamos que a categoria{' '}
                  <strong>Logística</strong> apresenta um aumento de 12% nos custos.
                  Recomendamos revisar os contratos vigentes para otimizar o orçamento.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#0D0D0D]/70 transition-colors hover:text-[#0D0D0D]">
                  Ver detalhes
                </button>
                <button className="inline-flex items-center gap-2 rounded-full bg-[#0D0D0D] px-5 py-2 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  Aplicar sugestão
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── KPI Grid ── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kpiCards.map((kpi) => (
            <KPICard
              key={kpi.id}
              value={kpi.value}
              formattedValue={kpi.formattedValue}
              label={kpi.label}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Charts section ── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Bar chart – Distribuição por Categoria */}
          <Card>
            <h2 className="mb-6 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
              Distribuição por Categoria
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categories}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E5E5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                      fill: '#737373',
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                      fill: '#737373',
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="total_quotes_value"
                    name="Valor Total"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  >
                    {categories.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Donut chart – Custos por Categoria */}
          <Card>
            <h2 className="mb-6 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
              Custos por Categoria
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`pie-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="font-['JetBrains_Mono'] text-xs text-[#737373] dark:text-[#A3A3A3]">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ── Trend area chart ── */}
      <motion.div variants={fadeUp}>
        <Card>
          <h2 className="mb-6 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
            Tendência de Gastos — 12 meses
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trends}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6DED67" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6DED67" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4DA6FF" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4DA6FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E5E5E5"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                    fill: '#737373',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                    fill: '#737373',
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="quotes_value"
                  name="Valor Cotações"
                  stroke="#6DED67"
                  strokeWidth={2.5}
                  fill="url(#gradientTotal)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#6DED67', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="quotes_count"
                  name="Qtd Cotações"
                  stroke="#4DA6FF"
                  strokeWidth={2}
                  fill="url(#gradientApproved)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="new_suppliers"
                  name="Novos Fornec."
                  stroke="#FFB800"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div variants={fadeUp}>
        <Card>
          <h2 className="mb-6 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
            Atividade Recente
          </h2>
          <ul className="divide-y divide-[#F2F2F2] dark:divide-[#262626]">
            {activityList.map((item) => {
              const dotColor = activityDotColor[item.type] ?? 'bg-[#A3A3A3]';
              const timeStr = new Date(item.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <li
                  key={item.id}
                  className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                >
                  {/* Colored dot */}
                  <span className="relative mt-1.5 flex shrink-0">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`}
                    />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#0D0D0D] dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate font-['Plus_Jakarta_Sans'] text-xs text-[#737373] dark:text-[#A3A3A3]">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-['JetBrains_Mono'] text-xs text-[#A3A3A3]">
                      {timeStr}
                    </span>
                  </div>
                </li>
              );
            })}

            {activityList.length === 0 && (
              <li className="py-8 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
                Nenhuma atividade recente.
              </li>
            )}
          </ul>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
