import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search, SlidersHorizontal, Grid3X3, List, Star, MapPin,
  Clock, DollarSign, ChevronDown, X, Package, Building2,
  ShoppingCart, ArrowUpRight, CheckCircle,
} from 'lucide-react'
import api from '../lib/api'
import { formatCurrency, cn, initials, getStatusColor, getStatusLabel, getRiskColor } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import { useDebounce } from '../hooks/useDebounce'

// ── Types ────────────────────────────────────────────────────────────────────
interface Supplier {
  id: number
  name: string
  cnpj: string
  category: string
  subcategory?: string
  city: string
  state: string
  rating: number
  avg_price: number
  delivery_days: number
  status: string
  risk_level: string
  match_score: number
  quote_count: number
  total_volume: number
  last_activity?: string
}

interface Facets {
  categories: { name: string; count: number }[]
  statuses:   { name: string; count: number }[]
  cities:     { name: string; count: number }[]
}

const SORT_OPTIONS = [
  { value: 'relevance',  label: 'Relevância' },
  { value: 'rating',     label: 'Maior Rating' },
  { value: 'price_asc',  label: 'Menor Preço' },
  { value: 'price_desc', label: 'Maior Preço' },
  { value: 'delivery',   label: 'Menor Prazo' },
  { value: 'volume',     label: 'Maior Volume' },
]

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

// ── Sub-components ───────────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  if (!score) return null
  const cls = score >= 90
    ? 'bg-brand text-dark'
    : score >= 70
    ? 'bg-warning/20 text-warning border border-warning/40'
    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
  return (
    <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded-pill', cls)}>
      {score}% match
    </span>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            'w-3 h-3',
            i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-gray-300 dark:text-white/20'
          )}
        />
      ))}
      <span className="text-[11px] text-gray-500 dark:text-white/50 ml-1 font-mono">
        {rating?.toFixed(1)}
      </span>
    </div>
  )
}

function SupplierCardGrid({
  supplier, onRequest, onView,
}: { supplier: Supplier; onRequest: (s: Supplier) => void; onView: (id: number) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-dark dark:text-white font-display font-bold text-sm flex-shrink-0">
          {initials(supplier.name)}
        </div>
        <MatchBadge score={supplier.match_score} />
      </div>

      {/* Name */}
      <div>
        <h3
          className="font-display font-bold text-sm text-dark dark:text-white leading-snug group-hover:text-brand-dark dark:group-hover:text-brand transition-colors"
          onClick={() => onView(supplier.id)}
        >
          {supplier.name}
        </h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {supplier.category}{supplier.subcategory ? ` · ${supplier.subcategory}` : ''} · {supplier.city}/{supplier.state}
        </p>
      </div>

      {/* Stars */}
      <StarRow rating={supplier.rating || 0} />

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-pill', getStatusColor(supplier.status))}>
          {getStatusLabel(supplier.status)}
        </span>
        <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-pill', getRiskColor(supplier.risk_level))}>
          {getStatusLabel(supplier.risk_level)}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-[12px] text-gray-500 dark:text-white/50">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="font-mono font-semibold text-dark dark:text-white">
            {formatCurrency(supplier.avg_price || 0)}
          </span>
          <span className="text-gray-400">/ mês</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span>{supplier.delivery_days ?? '—'} dias de entrega</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span>{supplier.quote_count || 0} orçamentos</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={() => onView(supplier.id)}
          className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Ver detalhes
        </button>
        <button
          onClick={() => onRequest(supplier)}
          className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Orçamento
        </button>
      </div>
    </motion.div>
  )
}

function SupplierRowList({
  supplier, onRequest, onView,
}: { supplier: Supplier; onRequest: (s: Supplier) => void; onView: (id: number) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="card-base px-5 py-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-px transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-dark dark:text-white font-display font-bold text-sm flex-shrink-0">
        {initials(supplier.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onView(supplier.id)}
            className="font-display font-bold text-sm text-dark dark:text-white group-hover:text-brand-dark dark:group-hover:text-brand transition-colors truncate"
          >
            {supplier.name}
          </button>
          <MatchBadge score={supplier.match_score} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
          <span className="font-mono">{supplier.cnpj}</span>
          <span>{supplier.category}</span>
          <span className="flex items-center gap-0.5">
            <MapPin className="w-3 h-3" />{supplier.city}/{supplier.state}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-5 text-xs">
        <div className="text-center">
          <p className="label-mono mb-0.5">Preço médio</p>
          <p className="font-mono font-bold text-dark dark:text-white text-sm">
            {formatCurrency(supplier.avg_price || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="label-mono mb-0.5">Entrega</p>
          <p className="font-mono font-bold text-dark dark:text-white text-sm">
            {supplier.delivery_days ?? '—'}d
          </p>
        </div>
        <div className="text-center">
          <p className="label-mono mb-0.5">Rating</p>
          <div className="flex items-center gap-0.5">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span className="font-mono font-bold text-dark dark:text-white text-sm">
              {(supplier.rating || 0).toFixed(1)}
            </span>
          </div>
        </div>
        <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-pill', getRiskColor(supplier.risk_level))}>
          {getStatusLabel(supplier.risk_level)}
        </span>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onView(supplier.id)}
          className="btn-secondary py-1.5 px-3 text-xs"
        >
          Ver
        </button>
        <button
          onClick={() => onRequest(supplier)}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
        >
          <ShoppingCart className="w-3 h-3" />
          Orçamento
        </button>
      </div>
    </motion.div>
  )
}

// ── Quote Modal ──────────────────────────────────────────────────────────────
function QuoteModal({
  supplier, onClose,
}: { supplier: Supplier; onClose: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    item_description: '',
    quantity: 1,
    unit: 'unid',
    desired_date: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item_description.trim()) return
    setLoading(true)
    try {
      await api.post('/search/request-quote', {
        supplier_id: supplier.id,
        ...form,
      })
      setSent(true)
      toast('success', `Orçamento solicitado para ${supplier.name}!`)
      setTimeout(onClose, 1500)
    } catch {
      toast('error', 'Erro ao solicitar orçamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-[480px] card-base shadow-xl p-6 z-10"
      >
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-brand-dark" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-dark dark:text-white">Orçamento enviado!</p>
              <p className="text-sm text-gray-500 mt-1">Você acompanha em Orçamentos</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="title-display text-base text-dark dark:text-white">Solicitar Orçamento</h2>
                <p className="text-sm text-gray-500 mt-0.5">{supplier.name}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-card border border-gray-100 dark:border-white/10 p-3 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center font-display font-bold text-xs text-dark dark:text-white flex-shrink-0">
                {initials(supplier.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-dark dark:text-white">{supplier.name}</p>
                <p className="text-xs text-gray-400">{supplier.category} · {supplier.city}/{supplier.state}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-mono mb-1.5 block">Item / Produto *</label>
                <input
                  type="text"
                  value={form.item_description}
                  onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))}
                  required
                  placeholder="Descreva o produto ou serviço..."
                  className="input-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono mb-1.5 block">Quantidade *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    required
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="label-mono mb-1.5 block">Unidade</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="input-base"
                  >
                    {['unid', 'kg', 'm', 'm²', 'caixa', 'pacote', 'litro', 'hr', 'mês'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-mono mb-1.5 block">Prazo desejado</label>
                <input
                  type="date"
                  value={form.desired_date}
                  onChange={e => setForm(f => ({ ...f, desired_date: e.target.value }))}
                  className="input-base"
                />
              </div>

              <div>
                <label className="label-mono mb-1.5 block">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Especificações, prazos, condições especiais..."
                  className="input-base h-auto py-2.5 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
                  {loading ? 'Enviando...' : 'Enviar solicitação'}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card-base p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-white/10" />
        <div className="w-16 h-5 rounded-pill bg-gray-200 dark:bg-white/10" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
      <div className="h-8 bg-gray-200 dark:bg-white/10 rounded-pill" />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function SearchPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [ratingMin, setRatingMin] = useState(0)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [deliveryMax, setDeliveryMax] = useState('')
  const [stateUf, setStateUf] = useState('')
  const [riskLevel, setRiskLevel] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const [results, setResults] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [facets, setFacets] = useState<Facets>({ categories: [], statuses: [], cities: [] })
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [quoteTarget, setQuoteTarget] = useState<Supplier | null>(null)

  const debouncedQ = useDebounce(q, 300)

  // Reset page when search/filters change
  const searchDeps = [debouncedQ, category, status, ratingMin, priceMin, priceMax, deliveryMax, stateUf, riskLevel, sortBy]

  useEffect(() => { setPage(1) }, searchDeps) // eslint-disable-line

  useEffect(() => {
    const doSearch = async () => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = { sort_by: sortBy, page, limit: 12 }
        if (debouncedQ)   params.q            = debouncedQ
        if (category)     params.category     = category
        if (status)       params.status       = status
        if (ratingMin > 0) params.rating_min  = ratingMin
        if (priceMin)     params.price_min    = priceMin
        if (priceMax)     params.price_max    = priceMax
        if (deliveryMax)  params.delivery_max = deliveryMax
        if (stateUf)      params.state        = stateUf
        if (riskLevel)    params.risk_level   = riskLevel

        const res = await api.get('/search/suppliers', { params })
        setResults(res.data.data ?? [])
        setTotal(res.data.meta?.total ?? 0)
        if (res.data.facets) setFacets(res.data.facets)
      } catch {
        setResults([])
        toast('error', 'Erro ao buscar fornecedores')
      } finally {
        setLoading(false)
      }
    }
    doSearch()
  }, [...searchDeps, page]) // eslint-disable-line

  const clearFilters = () => {
    setCategory(''); setStatus(''); setRatingMin(0)
    setPriceMin(''); setPriceMax(''); setDeliveryMax('')
    setStateUf(''); setRiskLevel('')
  }

  const hasActive = !!(category || status || ratingMin > 0 || priceMin || priceMax || deliveryMax || stateUf || riskLevel)
  const totalPages = Math.ceil(total / 12)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="label-mono">MÓDULO</p>
        <h1 className="title-display text-2xl text-dark dark:text-white mt-0.5">Buscar Fornecedores</h1>
        <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
          {total > 0 ? <><span className="text-brand-dark dark:text-brand font-bold">{total}</span> resultados encontrados</> : 'Encontre o fornecedor ideal com match de perfil'}
        </p>
      </div>

      {/* Search bar */}
      <div className="card-base p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nome, CNPJ, categoria, cidade..."
              className="input-base h-12 pl-11 pr-10 text-base"
              autoFocus
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button className="btn-primary h-12 px-6 text-sm">Buscar</button>
        </div>

        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-brand flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal size={14} />
          {showAdvanced ? 'Ocultar filtros avançados' : 'Filtros avançados'}
          <ChevronDown size={14} className={cn('transition-transform', showAdvanced && 'rotate-180')} />
          {hasActive && (
            <span className="ml-1 w-5 h-5 rounded-full bg-brand text-dark text-[10px] font-bold flex items-center justify-center">
              !
            </span>
          )}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="label-mono mb-2 block">Categoria</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="input-base">
                      <option value="">Todas</option>
                      {facets.categories.map(fc => (
                        <option key={fc.name} value={fc.name}>{fc.name} ({fc.count})</option>
                      ))}
                    </select>
                  </div>

                  {/* State */}
                  <div>
                    <label className="label-mono mb-2 block">Estado</label>
                    <select value={stateUf} onChange={e => setStateUf(e.target.value)} className="input-base">
                      <option value="">Todos</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Delivery */}
                  <div>
                    <label className="label-mono mb-2 block">Prazo máx. (dias)</label>
                    <input
                      type="number"
                      min={1}
                      value={deliveryMax}
                      onChange={e => setDeliveryMax(e.target.value)}
                      placeholder="ex: 30"
                      className="input-base"
                    />
                  </div>

                  {/* Price min */}
                  <div>
                    <label className="label-mono mb-2 block">Preço mínimo</label>
                    <input
                      type="number"
                      min={0}
                      value={priceMin}
                      onChange={e => setPriceMin(e.target.value)}
                      placeholder="R$ 0"
                      className="input-base"
                    />
                  </div>

                  {/* Price max */}
                  <div>
                    <label className="label-mono mb-2 block">Preço máximo</label>
                    <input
                      type="number"
                      min={0}
                      value={priceMax}
                      onChange={e => setPriceMax(e.target.value)}
                      placeholder="R$ sem limite"
                      className="input-base"
                    />
                  </div>

                  {/* Risk */}
                  <div>
                    <label className="label-mono mb-2 block">Risco</label>
                    <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className="input-base">
                      <option value="">Todos</option>
                      <option value="low">Baixo</option>
                      <option value="medium">Médio</option>
                      <option value="high">Alto</option>
                    </select>
                  </div>
                </div>

                {/* Rating stars */}
                <div>
                  <label className="label-mono mb-2 block">Rating mínimo</label>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        onClick={() => setRatingMin(r === ratingMin ? 0 : r)}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1.5 rounded-pill text-sm border transition-all',
                          ratingMin === r
                            ? 'bg-warning/20 border-warning text-warning font-semibold'
                            : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400'
                        )}
                      >
                        {r === 0 ? 'Todos' : (<><Star className="w-3 h-3 fill-warning text-warning" />{r}+</>)}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActive && (
                  <button onClick={clearFilters} className="text-xs text-error flex items-center gap-1 hover:opacity-80">
                    <X size={12} /> Limpar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category facet pills */}
        {!showAdvanced && facets.categories.slice(0, 5).map(fc => (
          <button
            key={fc.name}
            onClick={() => setCategory(c => c === fc.name ? '' : fc.name)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-pill border transition-all',
              category === fc.name
                ? 'bg-brand text-dark border-brand font-semibold'
                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-brand dark:hover:border-brand'
            )}
          >
            {fc.name} <span className="opacity-60">({fc.count})</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="input-base h-9 text-xs pr-8 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
            <button
              onClick={() => setView('grid')}
              className={cn('p-1.5 rounded-lg transition-colors', view === 'grid' ? 'bg-white dark:bg-white/10 shadow-sm text-dark dark:text-white' : 'text-gray-400 hover:text-gray-600')}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded-lg transition-colors', view === 'list' ? 'bg-white dark:bg-white/10 shadow-sm text-dark dark:text-white' : 'text-gray-400 hover:text-gray-600')}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className={view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <div className="card-base p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            <Building2 size={28} className="text-gray-300 dark:text-white/20" />
          </div>
          <div>
            <p className="font-display font-bold text-dark dark:text-white">Nenhum fornecedor encontrado</p>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
              {q ? `Nenhum resultado para "${q}". Tente outros termos.` : 'Use a busca para encontrar fornecedores.'}
            </p>
          </div>
          {hasActive && (
            <button onClick={clearFilters} className="btn-secondary py-2 px-5 text-sm">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {results.map(s => (
                <SupplierCardGrid
                  key={s.id}
                  supplier={s}
                  onRequest={setQuoteTarget}
                  onView={id => navigate(`/suppliers/${id}`)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {results.map(s => (
                <SupplierRowList
                  key={s.id}
                  supplier={s}
                  onRequest={setQuoteTarget}
                  onView={id => navigate(`/suppliers/${id}`)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = page <= 3 ? i + 1 : page + i - 2
              if (n < 1 || n > totalPages) return null
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'w-9 h-9 rounded-input text-sm font-mono font-semibold transition-all',
                    n === page
                      ? 'bg-brand text-dark'
                      : 'text-gray-500 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                  )}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Quote Modal */}
      <AnimatePresence>
        {quoteTarget && (
          <QuoteModal
            supplier={quoteTarget}
            onClose={() => setQuoteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchPage
