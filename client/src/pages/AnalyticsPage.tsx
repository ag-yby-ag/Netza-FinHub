import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, DollarSign, Percent, Users, Download,
  FileSpreadsheet, FileText, RefreshCw, ChevronDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import api from '../lib/api'
import { formatCurrency, cn } from '../lib/utils'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import AIInsightCard from '../components/ai/AIInsightCard'
import { useToast } from '../components/ui/Toast'

const BRAND_GREEN = '#6DED67'
const BRAND_COLORS = ['#6DED67', '#4DA6FF', '#FFB800', '#FF6B6B', '#A855F7', '#F97316', '#06B6D4', '#EC4899']

interface KPI {
  total_spent: number
  total_quotes: number
  approved_quotes: number
  avg_ticket: number
  active_suppliers: number
  pending_value: number
}

interface TrendPoint {
  month: string
  month_label: string
  total: number
  approved: number
  count: number
  forecast?: boolean
}

interface CategoryData {
  category: string
  total: number
  count: number
  percentage: number
}

interface SupplierRanking {
  id: number
  name: string
  total_value: number
  quote_count: number
  avg_ticket: number
  category: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl p-3 shadow-xl">
      <p className="label-mono text-white/40 text-xs mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-mono font-semibold">
            {typeof p.value === 'number' && p.value > 1000
              ? formatCurrency(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl p-3 shadow-xl">
      <p className="text-white text-sm font-semibold">{d.name}</p>
      <p className="label-mono text-brand">{formatCurrency(d.value)}</p>
      <p className="text-white/50 text-xs">{d.payload.percentage?.toFixed(1)}%</p>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon: Icon, delta, color = 'default' }: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; delta?: number; color?: 'default' | 'green' | 'blue'
}) {
  const colorMap = {
    default: 'text-white/40',
    green: 'text-brand',
    blue: 'text-info',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-white/5 rounded-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="label-mono text-white/40">{title}</p>
        <div className={cn('p-2 rounded-xl bg-white/5', colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
      {delta !== undefined && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-mono', delta >= 0 ? 'text-brand' : 'text-error')}>
          {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}% vs mês anterior
        </div>
      )}
    </motion.div>
  )
}

export function AnalyticsPage() {
  const { toast } = useToast()
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [ranking, setRanking] = useState<SupplierRanking[]>([])
  const [period, setPeriod] = useState('12')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [summaryRes, trendsRes, catRes, rankRes] = await Promise.all([
        api.get('/analytics/summary', { params: { period } }),
        api.get('/analytics/trends', { params: { period } }),
        api.get('/analytics/categories', { params: { period } }),
        api.get('/analytics/suppliers/ranking', { params: { period, limit: 10 } }),
      ])
      setKpi(summaryRes.data.data)
      setTrends(trendsRes.data.data ?? [])
      setCategories(catRes.data.data ?? [])
      setRanking(rankRes.data.data ?? [])
    } catch {
      toast('error', 'Erro ao carregar analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [period])  // eslint-disable-line

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      setExporting(format)
      const res = await api.get(`/analytics/export`, {
        params: { format, period },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${period}m.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast('success', `Exportado como ${format.toUpperCase()}!`)
    } catch {
      toast('error', 'Erro ao exportar')
    } finally {
      setExporting(null)
    }
  }

  // Build chart data with forecast (last 2 points are projected)
  const chartData = trends.map((t, i) => ({
    ...t,
    name: t.month_label ?? t.month,
    realTotal: t.forecast ? undefined : t.total,
    forecastTotal: t.forecast ? t.total : (i === trends.length - 3 ? t.total : undefined),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono text-white/40">MÓDULO</p>
          <h1 className="title-display text-2xl text-white">Analytics</h1>
          <p className="text-sm text-white/50 mt-1">Inteligência de compras e desempenho de fornecedores</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="relative">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="input-base text-sm h-9 pr-8 appearance-none cursor-pointer"
            >
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          <button onClick={fetchAll} className="btn-secondary h-9 px-3">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={!!exporting}
            className="btn-secondary h-9 px-3 gap-2 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand" />
            {exporting === 'xlsx' ? 'Exportando...' : 'XLSX'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="btn-secondary h-9 px-3 gap-2 text-sm"
          >
            <FileText className="w-4 h-4 text-error" />
            {exporting === 'pdf' ? 'Exportando...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="TOTAL GASTO"
            value={formatCurrency(kpi.total_spent)}
            subtitle={`${kpi.approved_quotes} orçamentos aprovados`}
            icon={DollarSign}
            color="green"
          />
          <KPICard
            title="TICKET MÉDIO"
            value={formatCurrency(kpi.avg_ticket)}
            subtitle="por orçamento"
            icon={TrendingUp}
          />
          <KPICard
            title="VALOR PENDENTE"
            value={formatCurrency(kpi.pending_value)}
            subtitle="aguardando aprovação"
            icon={Percent}
            color="blue"
          />
          <KPICard
            title="FORNECEDORES ATIVOS"
            value={String(kpi.active_suppliers)}
            subtitle={`de ${kpi.total_quotes} orçamentos`}
            icon={Users}
          />
        </div>
      )}

      {/* Charts row 1: Trend + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-dark-card border border-white/5 rounded-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-mono text-white/40">EVOLUÇÃO DE CUSTOS</p>
              <p className="text-white font-display font-semibold">Volume por período</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-white/50">
                <span className="w-3 h-0.5 bg-brand rounded" />
                Real
              </span>
              <span className="flex items-center gap-1.5 text-white/50">
                <span className="w-3 h-0.5 border-t border-dashed border-warning rounded" />
                Projeção
              </span>
            </div>
          </div>
          {loading ? (
            <SkeletonCard />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_GREEN} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={BRAND_GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB800" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FFB800" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="realTotal"
                  name="Gasto Real"
                  stroke={BRAND_GREEN}
                  strokeWidth={2}
                  fill="url(#greenGrad)"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecastTotal"
                  name="Projeção"
                  stroke="#FFB800"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#forecastGrad)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Donut */}
        <div className="bg-dark-card border border-white/5 rounded-card p-5">
          <p className="label-mono text-white/40 mb-1">DISTRIBUIÇÃO</p>
          <p className="text-white font-display font-semibold mb-4">Por categoria</p>
          {loading ? (
            <SkeletonCard />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="total"
                    nameKey="category"
                    paddingAngle={3}
                  >
                    {categories.map((_, i) => (
                      <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {categories.slice(0, 5).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                      <span className="text-white/60 truncate max-w-20">{c.category}</span>
                    </div>
                    <span className="text-white font-mono">{c.percentage?.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts row 2: Supplier Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking Bars */}
        <div className="bg-dark-card border border-white/5 rounded-card p-5">
          <p className="label-mono text-white/40 mb-1">RANKING</p>
          <p className="text-white font-display font-semibold mb-4">Top fornecedores por volume</p>
          {loading ? (
            <SkeletonCard />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={ranking.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_value" name="Volume Total" radius={[0, 4, 4, 0]}>
                  {ranking.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={i === 0 ? BRAND_GREEN : `rgba(109,237,103,${0.7 - i * 0.07})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Performance Table */}
        <div className="bg-dark-card border border-white/5 rounded-card p-5">
          <p className="label-mono text-white/40 mb-1">PERFORMANCE</p>
          <p className="text-white font-display font-semibold mb-4">Por categoria</p>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs label-mono text-white/30 pb-2 border-b border-white/5">
                <span>CATEGORIA</span>
                <span className="text-right">TOTAL</span>
                <span className="text-right">ORÇAMENTOS</span>
              </div>
              {categories.map((c, i) => (
                <div key={c.category} className="grid grid-cols-3 items-center text-xs py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }}
                    />
                    <span className="text-white/70 truncate">{c.category}</span>
                  </div>
                  <span className="text-right font-mono text-white">{formatCurrency(c.total)}</span>
                  <div className="text-right">
                    <span className="font-mono text-white/60">{c.count}</span>
                    <div
                      className="h-1 rounded-full mt-1 ml-auto"
                      style={{
                        width: `${c.percentage}%`,
                        background: BRAND_COLORS[i % BRAND_COLORS.length],
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <AIInsightCard type="cost_analysis" variant="green" />
    </div>
  )
}

export default AnalyticsPage
