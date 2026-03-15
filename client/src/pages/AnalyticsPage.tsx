import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Users,
  FileSpreadsheet, RefreshCw, ChevronDown, Cpu, CheckCircle,
  Minus, FileDown,
} from 'lucide-react'
import api from '../lib/api'
import { formatCurrency, cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import { useAnalytics } from '../hooks/useAnalytics'

// ── Constants ─────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6DED67', '#4DA6FF', '#FFB800', '#FF4D4D', '#A855F7', '#F97316', '#06B6D4', '#EC4899']

const MONTH_LABELS: Record<string, string> = {
  '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez',
}

function formatMonthLabel(period: string) {
  const [y, m] = period.split('-')
  return `${MONTH_LABELS[m] ?? m}/${y?.slice(2)}`
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-md">
      <p className="label-mono mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-dark dark:text-white font-mono font-bold">
            {p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({
  title, value, subtitle, icon: Icon, delta, deltaLabel, accentColor = '#6DED67',
}: {
  title: string; value: string; subtitle?: string
  icon: React.ElementType; delta?: number; deltaLabel?: string; accentColor?: string
}) {
  const up = (delta ?? 0) >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="label-mono">{title}</p>
        <div className="p-2 rounded-xl" style={{ background: `${accentColor}20` }}>
          <Icon size={16} style={{ color: accentColor }} />
        </div>
      </div>
      <p className="font-display font-bold text-2xl text-dark dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {delta !== undefined && (
        <div className={cn(
          'flex items-center gap-1 mt-3 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-pill w-fit',
          up ? 'bg-brand/10 text-brand-dark dark:text-brand' : 'bg-error/10 text-error'
        )}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {up ? '+' : ''}{delta}% {deltaLabel ?? 'vs anterior'}
        </div>
      )}
    </motion.div>
  )
}

// ── AI Insight Card ───────────────────────────────────────────────────────────
function AICard({ insight, loading }: { insight: { insight: string; highlights: string[]; recommendations: string[] } | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-brand rounded-card p-5 animate-pulse">
        <div className="h-4 bg-dark/10 rounded w-32 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-dark/10 rounded" />
          <div className="h-3 bg-dark/10 rounded w-4/5" />
          <div className="h-3 bg-dark/10 rounded w-2/3" />
        </div>
      </div>
    )
  }
  if (!insight) return null
  return (
    <div className="bg-brand rounded-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-dark/10 flex items-center justify-center">
          <Cpu size={16} className="text-dark" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-dark/70 font-semibold">
          IA Insight
        </span>
      </div>

      <p className="text-dark/80 text-sm leading-relaxed mb-4"
        dangerouslySetInnerHTML={{
          __html: insight.insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
        }}
      />

      {insight.recommendations.length > 0 && (
        <div className="space-y-2">
          {insight.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle size={13} className="text-dark/50 mt-0.5 flex-shrink-0" />
              <span className="text-dark/70 text-xs leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [period, setPeriod] = useState('month')
  const [category, setCategory] = useState('')
  const [trendMode, setTrendMode] = useState<'monthly' | 'cumulative'>('monthly')
  const [rankSort, setRankSort] = useState<'volume' | 'rating' | 'savings'>('volume')
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)

  const {
    summary, monthly, forecast, categories, ranking,
    aiInsight, loading, aiLoading, dates, refetch,
  } = useAnalytics({ period, category, rankSort })

  // Chart data: combine monthly + forecast with bridge point
  const chartData = useMemo(() => {
    let cum = 0
    const real = monthly.map(m => {
      cum += m.volume
      return {
        name: formatMonthLabel(m.period),
        real: m.volume,
        cumReal: cum,
        forecast: undefined as number | undefined,
        cumForecast: undefined as number | undefined,
      }
    })

    let cumF = cum
    const fore = forecast.map(f => {
      cumF += f.volume
      return {
        name: formatMonthLabel(f.period),
        real: undefined as number | undefined,
        cumReal: undefined as number | undefined,
        forecast: f.volume,
        cumForecast: cumF,
      }
    })

    // Bridge: last real point also appears as first forecast point
    if (real.length > 0 && fore.length > 0) {
      const last = real[real.length - 1]
      fore[0] = { ...fore[0], real: last.real, cumReal: last.cumReal }
    }

    return [...real, ...fore]
  }, [monthly, forecast])

  const realKey = trendMode === 'monthly' ? 'real' : 'cumReal'
  const foreKey = trendMode === 'monthly' ? 'forecast' : 'cumForecast'

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setExporting(format)
    try {
      const res = await api.post('/analytics/export', {
        format,
        start_date: dates.start_date,
        end_date: dates.end_date,
        category,
      }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast('success', 'Exportado com sucesso!')
    } catch {
      toast('error', 'Erro ao exportar')
    } finally {
      setExporting(null)
    }
  }

  const PERIOD_LABELS = [
    { value: 'month', label: 'Último mês' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'semester', label: 'Semestre' },
    { value: 'year', label: '12 meses' },
  ]

  const pieData = categories.slice(0, 5).map(c => ({
    name: c.category,
    value: c.total_spend,
    pct: c.spend_pct,
  }))

  const categoryList = [...new Set(categories.map(c => c.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">MÓDULO</p>
          <h1 className="title-display text-2xl text-dark dark:text-white mt-0.5">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            Inteligência de dados · {dates.start_date} → {dates.end_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="p-2 rounded-input border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
          >
            <FileDown size={15} />
            {exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting !== null}
            className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
          >
            <FileSpreadsheet size={15} />
            {exporting === 'xlsx' ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period pills */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
          {PERIOD_LABELS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p.value
                  ? 'bg-white dark:bg-white/10 shadow-sm text-dark dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input-base h-9 text-xs pr-8 appearance-none cursor-pointer"
          >
            <option value="">Todas as categorias</option>
            {categoryList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-base p-5 space-y-4 animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-24" />
              <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="VOLUME TOTAL"
            value={formatCurrency(summary.total_volume)}
            subtitle={`${summary.total_quotes ?? 0} orçamentos`}
            icon={DollarSign}
            delta={summary.volume_change_pct}
            accentColor="#6DED67"
          />
          <KPICard
            title="ECONOMIA"
            value={formatCurrency(summary.savings)}
            subtitle="estimativa 12%"
            icon={Percent}
            delta={summary.savings_change_pct}
            accentColor="#4DA6FF"
          />
          <KPICard
            title="TICKET MÉDIO"
            value={formatCurrency(summary.avg_ticket)}
            subtitle="por orçamento"
            icon={TrendingUp}
            delta={summary.ticket_change_pct}
            accentColor="#FFB800"
          />
          <KPICard
            title="FORNECEDORES ATIVOS"
            value={String(summary.active_suppliers)}
            subtitle="no período"
            icon={Users}
            delta={summary.suppliers_change}
            deltaLabel="vs anterior"
            accentColor="#6DED67"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <div className="lg:col-span-2 card-base p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="label-mono mb-1">EVOLUÇÃO DE CUSTOS</p>
              <p className="font-display font-bold text-dark dark:text-white">Volume por período</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-white/5 rounded-lg">
              {(['monthly', 'cumulative'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTrendMode(m)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
                    trendMode === m ? 'bg-white dark:bg-white/10 shadow-sm text-dark dark:text-white' : 'text-gray-400'
                  )}
                >
                  {m === 'monthly' ? 'Mensal' : 'Acumulado'}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-brand rounded" />
                  Real
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-gray-400 rounded" />
                  Projeção
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="areaReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6DED67" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6DED67" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4D4D4" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#D4D4D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1_000_000 ? `R$${(v/1_000_000).toFixed(1)}M` : `R$${(v/1000).toFixed(0)}K`}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={realKey}
                    name="Real"
                    stroke="#6DED67"
                    strokeWidth={2.5}
                    fill="url(#areaReal)"
                    dot={false}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey={foreKey}
                    name="Projeção"
                    stroke="#A3A3A3"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#areaForecast)"
                    dot={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Category Donut */}
        <div className="card-base p-5">
          <p className="label-mono mb-1">DISTRIBUIÇÃO</p>
          <p className="font-display font-bold text-dark dark:text-white mb-4">Por categoria</p>
          {loading ? (
            <div className="h-[200px] bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
          ) : pieData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
              Sem dados no período
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      background: 'white', border: '1px solid #e5e5e5',
                      borderRadius: '12px', fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-gray-600 dark:text-white/70 truncate max-w-[110px]">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold text-dark dark:text-white">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ranking */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="label-mono mb-1">RANKING</p>
            <p className="font-display font-bold text-dark dark:text-white">Top fornecedores</p>
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-white/5 rounded-lg">
            {(['volume', 'rating', 'savings'] as const).map(s => (
              <button
                key={s}
                onClick={() => setRankSort(s)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all',
                  rankSort === s ? 'bg-white dark:bg-white/10 shadow-sm text-dark dark:text-white' : 'text-gray-400'
                )}
              >
                {s === 'volume' ? 'Volume' : s === 'rating' ? 'Rating' : 'Economia'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded-pill animate-pulse" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
        ) : (
          <div className="space-y-3">
            {ranking.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 group cursor-pointer"
                onClick={() => navigate(`/suppliers/${s.id}`)}
              >
                <span className="font-mono text-[10px] text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-28 text-xs text-dark dark:text-white truncate font-medium group-hover:text-brand-dark dark:group-hover:text-brand transition-colors">
                  {s.name}
                </div>
                <div className="flex-1 h-8 bg-gray-100 dark:bg-white/5 rounded-pill overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.volume_pct}%` }}
                    transition={{ delay: i * 0.04, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-pill flex items-center justify-end pr-3"
                    style={{ background: `rgba(109,237,103,${Math.max(0.25, 1 - i * 0.08)})` }}
                  >
                    {s.volume_pct > 30 && (
                      <span className="text-[10px] font-mono font-bold text-dark">
                        {formatCurrency(rankSort === 'savings' ? s.savings : s.total_volume)}
                      </span>
                    )}
                  </motion.div>
                </div>
                {s.volume_pct <= 30 && (
                  <span className="text-[10px] font-mono text-gray-500 w-20 flex-shrink-0">
                    {formatCurrency(rankSort === 'savings' ? s.savings : s.total_volume)}
                  </span>
                )}
                <div className="flex items-center gap-0.5 text-[11px] text-warning flex-shrink-0 w-10 justify-end">
                  ★ {Number(s.rating).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Table */}
      <div className="card-base p-5">
        <p className="label-mono mb-1">PERFORMANCE</p>
        <p className="font-display font-bold text-dark dark:text-white mb-4">Por categoria</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10">
                  {['Categoria', 'Fornecedores', 'Volume', 'Economia', 'Ticket Médio', 'Rating', 'Tendência'].map(col => (
                    <th key={col} className="label-mono pb-3 text-left first:pl-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr
                    key={c.category}
                    className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setCategory(cat => cat === c.category ? '' : c.category)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-brand" />
                        <span className="font-medium text-dark dark:text-white">{c.category}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-500">{c.supplier_count}</td>
                    <td className="py-3 pr-4 font-mono font-bold text-dark dark:text-white">
                      {formatCurrency(c.total_spend)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-brand-dark dark:text-brand font-semibold">
                        {formatCurrency(c.savings ?? 0)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-500">
                      {formatCurrency(c.avg_ticket)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-warning font-mono">★ {Number(c.avg_rating).toFixed(1)}</span>
                    </td>
                    <td className="py-3">
                      {c.trend === 'up' ? (
                        <span className="flex items-center gap-1 text-brand-dark dark:text-brand font-semibold">
                          <TrendingUp size={12} /> Alta
                        </span>
                      ) : c.trend === 'down' ? (
                        <span className="flex items-center gap-1 text-error font-semibold">
                          <TrendingDown size={12} /> Queda
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Minus size={12} /> Estável
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
            )}
          </div>
        )}
      </div>

      {/* AI Insight */}
      <AICard insight={aiInsight} loading={aiLoading} />
    </div>
  )
}

export default AnalyticsPage
