import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, SlidersHorizontal, Grid3X3, List, Star, MapPin,
  Clock, DollarSign, TrendingUp, X, ChevronDown, Filter,
  ShoppingCart, Building2, AlertTriangle, CheckCircle, Package
} from 'lucide-react'
import api from '../lib/api'
import { formatCurrency, cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'

const CATEGORIES = [
  'Todos', 'Marketing', 'Tecnologia', 'Eventos', 'Logística', 'Escritório',
  'Alimentação', 'Limpeza', 'Segurança', 'Consultoria', 'Jurídico',
  'Contabilidade', 'RH', 'Infraestrutura', 'Comunicação', 'Viagens'
]
const STATES = [
  'Todos', 'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
]
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'rating', label: 'Maior Rating' },
  { value: 'price_asc', label: 'Menor Preço' },
  { value: 'volume_desc', label: 'Maior Volume' },
  { value: 'delivery_asc', label: 'Menor Prazo' },
]
const RISK_LEVELS = ['low', 'medium', 'high']

interface Supplier {
  id: number
  name: string
  cnpj: string
  category: string
  subcategory?: string
  city: string
  state: string
  avg_price: number
  rating: number
  delivery_days: number
  payment_terms: string
  status: string
  risk_level: string
  notes?: string
  match_score?: number
  total_quotes?: number
}

interface Facets {
  categories: { name: string; count: number }[]
  states: { state: string; count: number }[]
  risk_levels: { risk_level: string; count: number }[]
}

interface Filters {
  query: string
  category: string
  state: string
  risk_level: string
  min_rating: number
  max_price: number
  max_delivery: number
}

const DEFAULT_FILTERS: Filters = {
  query: '',
  category: '',
  state: '',
  risk_level: '',
  min_rating: 0,
  max_price: 100000,
  max_delivery: 60,
}

function MatchScoreBadge({ score }: { score?: number }) {
  if (!score) return null
  const color = score >= 80 ? 'bg-brand/20 text-brand border-brand/30'
    : score >= 60 ? 'bg-info/20 text-info border-info/30'
    : 'bg-warning/20 text-warning border-warning/30'
  return (
    <span className={cn('text-xs font-mono font-bold px-2 py-0.5 rounded-full border', color)}>
      {score}% match
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={cn('w-3 h-3', i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-dark-soft')}
        />
      ))}
      <span className="text-xs text-white/50 ml-1 font-mono">{rating.toFixed(1)}</span>
    </div>
  )
}

function RiskBadge({ level }: { level: string }) {
  const cfg = {
    low: { label: 'Baixo', className: 'text-brand bg-brand/10 border-brand/20' },
    medium: { label: 'Médio', className: 'text-warning bg-warning/10 border-warning/20' },
    high: { label: 'Alto', className: 'text-error bg-error/10 border-error/20' },
  }[level] ?? { label: level, className: 'text-white/50' }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function SupplierCardGrid({ supplier, onRequest }: { supplier: Supplier; onRequest: (s: Supplier) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-white/5 rounded-card p-5 flex flex-col gap-4 hover:border-brand/30 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <MatchScoreBadge score={supplier.match_score} />
      </div>

      <div>
        <h3 className="font-display font-semibold text-white text-sm leading-tight group-hover:text-brand transition-colors">
          {supplier.name}
        </h3>
        <p className="text-xs text-white/40 font-mono mt-0.5">{supplier.cnpj}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{supplier.category}</Badge>
        <RiskBadge level={supplier.risk_level} />
      </div>

      <div className="space-y-1.5 text-xs text-white/50">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{supplier.city}, {supplier.state}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-white/70">{formatCurrency(supplier.avg_price)} / mês</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{supplier.delivery_days} dias de entrega</span>
        </div>
      </div>

      <StarRating rating={supplier.rating} />

      <button
        onClick={() => onRequest(supplier)}
        className="btn-primary w-full text-sm py-2 mt-auto"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Solicitar Orçamento
      </button>
    </motion.div>
  )
}

function SupplierRowList({ supplier, onRequest }: { supplier: Supplier; onRequest: (s: Supplier) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-dark-card border border-white/5 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-brand/30 transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
        <Building2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-white truncate group-hover:text-brand transition-colors">
            {supplier.name}
          </span>
          <MatchScoreBadge score={supplier.match_score} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
          <span className="font-mono">{supplier.cnpj}</span>
          <span>{supplier.category}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.city}/{supplier.state}</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-6 text-xs">
        <div className="text-center">
          <p className="text-white/40">Preço médio</p>
          <p className="text-white font-mono font-semibold">{formatCurrency(supplier.avg_price)}</p>
        </div>
        <div className="text-center">
          <p className="text-white/40">Entrega</p>
          <p className="text-white font-mono font-semibold">{supplier.delivery_days}d</p>
        </div>
        <div className="text-center">
          <p className="text-white/40">Rating</p>
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-warning fill-warning" />
            <span className="text-white font-mono font-semibold">{supplier.rating.toFixed(1)}</span>
          </div>
        </div>
        <RiskBadge level={supplier.risk_level} />
      </div>
      <button
        onClick={() => onRequest(supplier)}
        className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Orçamento
      </button>
    </motion.div>
  )
}

function QuoteRequestModal({
  supplier, open, onClose
}: { supplier: Supplier | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    item_description: '',
    quantity: 1,
    unit: 'un',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplier) return
    try {
      setLoading(true)
      await api.post('/quotes', {
        supplier_id: supplier.id,
        ...form,
      })
      toast('success', `Orçamento solicitado para ${supplier.name}`)
      onClose()
      setForm({ item_description: '', quantity: 1, unit: 'un', notes: '' })
    } catch {
      toast('error', 'Erro ao solicitar orçamento')
    } finally {
      setLoading(false)
    }
  }

  if (!supplier) return null
  return (
    <Modal open={open} onClose={onClose} title="Solicitar Orçamento" size="md">
      <div className="bg-dark-soft/50 rounded-xl p-4 mb-5 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-display font-semibold text-white text-sm">{supplier.name}</p>
            <p className="text-xs text-white/40">{supplier.category} · {supplier.city}/{supplier.state}</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-mono text-white/60 mb-1.5 block">Descrição do Item *</label>
          <textarea
            value={form.item_description}
            onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))}
            required
            rows={3}
            placeholder="Descreva o produto ou serviço desejado..."
            className="input-base w-full resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-mono text-white/60 mb-1.5 block">Quantidade *</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              required
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="label-mono text-white/60 mb-1.5 block">Unidade</label>
            <select
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="input-base w-full"
            >
              {['un', 'kg', 'L', 'm', 'm²', 'cx', 'pc', 'hr', 'mês'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label-mono text-white/60 mb-1.5 block">Observações</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Prazo desejado, condições especiais..."
            className="input-base w-full resize-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Enviando...' : 'Solicitar Orçamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function SearchPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [inputValue, setInputValue] = useState('')
  const [sort, setSort] = useState('relevance')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [facets, setFacets] = useState<Facets | null>(null)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [quoteTarget, setQuoteTarget] = useState<Supplier | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchSuppliers = useCallback(async (f: Filters, s: string, p: number) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: p, limit: 12, sort: s }
      if (f.query) params.q = f.query
      if (f.category) params.category = f.category
      if (f.state) params.state = f.state
      if (f.risk_level) params.risk_level = f.risk_level
      if (f.min_rating > 0) params.min_rating = f.min_rating
      if (f.max_price < 100000) params.max_price = f.max_price
      if (f.max_delivery < 60) params.max_delivery = f.max_delivery

      const res = await api.get('/search/suppliers', { params })
      setSuppliers(res.data.data?.suppliers ?? res.data.data ?? [])
      setTotal(res.data.meta?.total ?? res.data.data?.total ?? 0)
      if (res.data.data?.facets) setFacets(res.data.data.facets)
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchSuppliers(filters, sort, 1)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [filters, sort, fetchSuppliers])

  useEffect(() => {
    fetchSuppliers(filters, sort, page)
  }, [page])  // eslint-disable-line

  const handleInputChange = (val: string) => {
    setInputValue(val)
    setFilters(f => ({ ...f, query: val }))
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setInputValue('')
  }

  const hasActiveFilters = filters.category || filters.state || filters.risk_level
    || filters.min_rating > 0 || filters.max_price < 100000 || filters.max_delivery < 60

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="label-mono text-white/40">MÓDULO</p>
        <h1 className="title-display text-2xl text-white">Busca de Fornecedores</h1>
        <p className="text-sm text-white/50 mt-1">
          {total > 0 ? `${total} fornecedores encontrados` : 'Encontre fornecedores com match de perfil'}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          placeholder="Buscar por nome, CNPJ, categoria, cidade..."
          className="input-base w-full pl-12 pr-12 h-12 text-base"
        />
        {inputValue && (
          <button
            onClick={() => handleInputChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            'btn-secondary flex items-center gap-2 text-sm',
            showFilters && 'bg-brand/10 border-brand/30 text-brand'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-brand text-dark text-xs font-bold flex items-center justify-center">
              !
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input-base text-sm h-9 pr-8 appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-error flex items-center gap-1 hover:text-error/80 transition-colors">
            <X className="w-3 h-3" />
            Limpar filtros
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5 bg-dark-card border border-white/5 rounded-xl p-1">
          <button
            onClick={() => setView('grid')}
            className={cn('p-1.5 rounded-lg transition-colors', view === 'grid' ? 'bg-brand/20 text-brand' : 'text-white/40 hover:text-white')}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('p-1.5 rounded-lg transition-colors', view === 'list' ? 'bg-brand/20 text-brand' : 'text-white/40 hover:text-white')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-dark-card border border-white/5 rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="label-mono text-white/40 flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  FILTROS AVANÇADOS
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-error">Limpar tudo</button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Category */}
                <div>
                  <label className="label-mono text-white/40 mb-2 block">CATEGORIA</label>
                  <select
                    value={filters.category}
                    onChange={e => setFilters(f => ({ ...f, category: e.target.value === 'Todos' ? '' : e.target.value }))}
                    className="input-base w-full text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c === 'Todos' ? '' : c}>{c}</option>)}
                  </select>
                </div>
                {/* State */}
                <div>
                  <label className="label-mono text-white/40 mb-2 block">ESTADO</label>
                  <select
                    value={filters.state}
                    onChange={e => setFilters(f => ({ ...f, state: e.target.value === 'Todos' ? '' : e.target.value }))}
                    className="input-base w-full text-sm"
                  >
                    {STATES.map(s => <option key={s} value={s === 'Todos' ? '' : s}>{s}</option>)}
                  </select>
                </div>
                {/* Min Rating */}
                <div>
                  <label className="label-mono text-white/40 mb-2 block">RATING MÍNIMO</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={0} max={5} step={0.5}
                      value={filters.min_rating}
                      onChange={e => setFilters(f => ({ ...f, min_rating: Number(e.target.value) }))}
                      className="flex-1 accent-brand"
                    />
                    <span className="label-mono text-white w-6 text-right">{filters.min_rating}</span>
                  </div>
                </div>
                {/* Max Delivery */}
                <div>
                  <label className="label-mono text-white/40 mb-2 block">PRAZO MÁXIMO</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={60} step={1}
                      value={filters.max_delivery}
                      onChange={e => setFilters(f => ({ ...f, max_delivery: Number(e.target.value) }))}
                      className="flex-1 accent-brand"
                    />
                    <span className="label-mono text-white whitespace-nowrap">{filters.max_delivery}d</span>
                  </div>
                </div>
              </div>
              {/* Risk Pills */}
              <div className="mt-4">
                <label className="label-mono text-white/40 mb-2 block">NÍVEL DE RISCO</label>
                <div className="flex gap-2">
                  {['', ...RISK_LEVELS].map(r => (
                    <button
                      key={r}
                      onClick={() => setFilters(f => ({ ...f, risk_level: r }))}
                      className={cn(
                        'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all',
                        filters.risk_level === r
                          ? 'bg-brand text-dark border-brand'
                          : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'
                      )}
                    >
                      {r === '' ? 'Todos' : r === 'low' ? 'Baixo' : r === 'medium' ? 'Médio' : 'Alto'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Facets quick filters */}
      {facets?.categories && facets.categories.length > 0 && !showFilters && (
        <div className="flex gap-2 flex-wrap">
          {facets.categories.slice(0, 6).map(fc => (
            <button
              key={fc.name}
              onClick={() => setFilters(f => ({ ...f, category: f.category === fc.name ? '' : fc.name }))}
              className={cn(
                'px-3 py-1 rounded-pill text-xs font-medium border transition-all',
                filters.category === fc.name
                  ? 'bg-brand text-dark border-brand'
                  : 'bg-dark-card text-white/50 border-white/10 hover:border-white/30'
              )}
            >
              {fc.name} <span className="opacity-50">({fc.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className={view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Nenhum fornecedor encontrado"
          description={filters.query
            ? `Nenhum resultado para "${filters.query}". Tente outros termos ou remova filtros.`
            : 'Use a busca acima para encontrar fornecedores.'}
          action={hasActiveFilters ? { label: 'Limpar filtros', onClick: clearFilters } : undefined}
        />
      ) : (
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {suppliers.map(s => (
                <SupplierCardGrid key={s.id} supplier={s} onRequest={setQuoteTarget} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {suppliers.map(s => (
                <SupplierRowList key={s.id} supplier={s} onRequest={setQuoteTarget} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
          >
            Anterior
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2
              if (p < 1 || p > totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-mono transition-all',
                    p === page ? 'bg-brand text-dark font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Quote Request Modal */}
      <QuoteRequestModal
        supplier={quoteTarget}
        open={!!quoteTarget}
        onClose={() => setQuoteTarget(null)}
      />
    </div>
  )
}

export default SearchPage
