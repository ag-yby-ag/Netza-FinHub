import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, DollarSign, FileText, Star, AlertTriangle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';
import { formatCurrency, formatDate, formatRelativeTime, getStatusColor, getStatusLabel } from '../lib/utils';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import AIInsightCard from '../components/ai/AIInsightCard';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';

interface KPIs {
  total_suppliers: number;
  approved_volume: number;
  approved_count: number;
  pending_quotes: number;
  avg_rating: number;
  high_risk_count: number;
  volume_trend: number;
}

const CHART_COLORS = ['#6DED67', '#4DA6FF', '#FFB800', '#FF6B6B', '#A855F7', '#F97316', '#06B6D4', '#EC4899'];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trends, setTrends] = useState<Array<{ month: string; volume: number; count: number }>>([]);
  const [categories, setCategories] = useState<Array<{ category: string; volume: number; supplier_count: number }>>([]);
  const [recent, setRecent] = useState<{ quotes: unknown[]; suppliers: unknown[] }>({ quotes: [], suppliers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/dashboard/trends'),
      api.get('/dashboard/categories'),
      api.get('/dashboard/recent'),
    ]).then(([kpisRes, trendsRes, catsRes, recentRes]) => {
      setKpis(kpisRes.data.data);
      setTrends(trendsRes.data.data);
      setCategories(catsRes.data.data.slice(0, 6));
      setRecent(recentRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const formatMonth = (m: string) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Users size={20} className="text-brand" />,
            label: 'Fornecedores Ativos',
            value: kpis?.total_suppliers || 0,
            format: 'number',
            badge: `${kpis?.high_risk_count || 0} em risco`,
            badgeColor: (kpis?.high_risk_count || 0) > 0 ? 'text-error' : 'text-brand-dark',
          },
          {
            icon: <DollarSign size={20} className="text-brand" />,
            label: 'Volume Aprovado',
            value: kpis?.approved_volume || 0,
            format: 'currency',
            trend: kpis?.volume_trend || 0,
          },
          {
            icon: <FileText size={20} className="text-brand" />,
            label: 'Orçamentos Pendentes',
            value: kpis?.pending_quotes || 0,
            format: 'number',
            badge: 'Requer atenção',
            badgeColor: (kpis?.pending_quotes || 0) > 0 ? 'text-warning' : 'text-gray-400',
          },
          {
            icon: <Star size={20} className="text-brand" />,
            label: 'Rating Médio',
            value: kpis?.avg_rating || 0,
            format: 'rating',
            badge: 'dos fornecedores',
            badgeColor: 'text-gray-400',
          },
        ].map((kpi, idx) => (
          <motion.div key={idx} variants={item}>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-input bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
                  {kpi.icon}
                </div>
                {kpi.trend !== undefined && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trend >= 0 ? 'text-brand-dark' : 'text-error'}`}>
                    {kpi.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(kpi.trend)}%
                  </div>
                )}
              </div>
              <div className="title-display text-2xl text-dark dark:text-white">
                {kpi.format === 'currency' ? formatCurrency(kpi.value as number)
                  : kpi.format === 'rating' ? `${kpi.value}★`
                  : kpi.value.toLocaleString('pt-BR')}
              </div>
              <div className="label-mono mt-1 mb-1">{kpi.label}</div>
              {kpi.badge && (
                <div className={`text-xs mt-1 ${kpi.badgeColor}`}>{kpi.badge}</div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="label-mono">Evolução de Compras</div>
                <div className="title-display text-base text-dark dark:text-white mt-0.5">Últimos 12 meses</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trends}>
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10, fill: '#A3A3A3', fontFamily: 'JetBrains Mono' }} />
                <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#A3A3A3' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={formatMonth}
                  contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#A3A3A3' }} itemStyle={{ color: '#6DED67' }} />
                <Line type="monotone" dataKey="volume" stroke="#6DED67" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Category donut */}
        <motion.div variants={item}>
          <Card className="p-5">
            <div className="label-mono mb-1">Por Categoria</div>
            <div className="title-display text-base text-dark dark:text-white mb-4">Distribuição</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={categories} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                  dataKey="volume" nameKey="category" paddingAngle={2}>
                  {categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {categories.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-gray-500 dark:text-gray-400 truncate flex-1">{c.category}</span>
                  <span className="font-mono text-dark dark:text-white font-medium">{formatCurrency(c.volume)}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Insight */}
        <motion.div variants={item}>
          <AIInsightCard type="general_insight" className="h-full" />
        </motion.div>

        {/* Recent activity */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="p-5">
            <div className="label-mono mb-1">Atividade Recente</div>
            <div className="title-display text-base text-dark dark:text-white mb-4">Últimas movimentações</div>
            <div className="space-y-2">
              {(recent.quotes as Array<Record<string, unknown>>).map((q, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    q.status === 'approved' ? 'bg-brand' : q.status === 'pending' ? 'bg-warning' : 'bg-error'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-dark dark:text-white truncate">{String(q.item_description)}</div>
                    <div className="text-xs text-gray-400">{String(q.supplier_name)} · {formatRelativeTime(String(q.created_at))}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-xs text-dark dark:text-white">{formatCurrency(Number(q.total_price))}</span>
                    <Badge variant="status" status={String(q.status)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
