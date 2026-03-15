import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, FileSpreadsheet, Download, Clock, CheckCircle,
  XCircle, Loader2, Play, Calendar, ToggleLeft, ToggleRight,
  ChevronRight, Trash2, RefreshCw, BarChart3, Users, TrendingUp,
  ShieldAlert, Star, DollarSign, AlertCircle
} from 'lucide-react'
import api from '../lib/api'
import { formatDate, formatRelativeTime, cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import EmptyState from '../components/ui/EmptyState'

const TABS = [
  { id: 'templates', label: 'Templates' },
  { id: 'generate', label: 'Gerar Relatório' },
  { id: 'history', label: 'Histórico' },
  { id: 'schedules', label: 'Agendamentos' },
]

const FORMAT_OPTIONS = [
  { value: 'xlsx', label: 'Excel (XLSX)', icon: FileSpreadsheet, color: 'text-brand' },
  { value: 'pdf', label: 'PDF', icon: FileText, color: 'text-error' },
  { value: 'csv', label: 'CSV', icon: FileText, color: 'text-info' },
]

interface Template {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  color: string
  available_formats: string
}

interface GeneratedReport {
  id: number
  title: string
  filename: string
  file_format: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  download_count: number
  expires_at: string
  template_name?: string
}

interface Schedule {
  id: number
  template_name: string
  frequency: string
  recipients: string
  is_active: number
  next_run: string
  last_run?: string
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  suppliers: Users,
  quotes: BarChart3,
  costs: TrendingUp,
  ranking: Star,
  risks: ShieldAlert,
  reviews: Star,
}
const TEMPLATE_ICON_DEFAULT = FileText

function TemplateCard({ template, onGenerate }: { template: Template; onGenerate: (t: Template) => void }) {
  const Icon = TEMPLATE_ICONS[template.slug] ?? TEMPLATE_ICON_DEFAULT
  const formats = template.available_formats?.split(',') ?? ['xlsx']

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-white/5 rounded-card p-5 hover:border-brand/30 transition-all group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${template.color}20`, color: template.color }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-display font-semibold text-white text-sm mb-1 group-hover:text-brand transition-colors">
        {template.name}
      </h3>
      <p className="text-xs text-white/40 leading-relaxed mb-4">{template.description}</p>
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {formats.map(f => (
          <span key={f} className={cn(
            'text-xs px-2 py-0.5 rounded-full border font-mono',
            f.trim() === 'xlsx' ? 'border-brand/30 text-brand bg-brand/5'
            : f.trim() === 'pdf' ? 'border-error/30 text-error bg-error/5'
            : 'border-info/30 text-info bg-info/5'
          )}>
            {f.trim().toUpperCase()}
          </span>
        ))}
      </div>
      <button onClick={() => onGenerate(template)} className="btn-primary w-full text-sm py-2">
        <Play className="w-3.5 h-3.5" />
        Gerar Relatório
      </button>
    </motion.div>
  )
}

function ReportStatusBadge({ status }: { status: GeneratedReport['status'] }) {
  const cfg = {
    pending: { label: 'Aguardando', icon: Clock, className: 'text-warning bg-warning/10 border-warning/20' },
    processing: { label: 'Processando', icon: Loader2, className: 'text-info bg-info/10 border-info/20' },
    completed: { label: 'Concluído', icon: CheckCircle, className: 'text-brand bg-brand/10 border-brand/20' },
    failed: { label: 'Falhou', icon: XCircle, className: 'text-error bg-error/10 border-error/20' },
  }[status]
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', cfg.className)}>
      <Icon className={cn('w-3 h-3', status === 'processing' && 'animate-spin')} />
      {cfg.label}
    </span>
  )
}

function GenerateModal({
  template, open, onClose, onSuccess
}: { template: Template | null; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ format: 'xlsx', date_from: '', date_to: '' })
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!template) return
    try {
      setLoading(true)
      await api.post('/reports/generate', {
        template_id: template.id,
        format: form.format,
        filters: {
          date_from: form.date_from || undefined,
          date_to: form.date_to || undefined,
        },
      })
      toast('success', 'Relatório solicitado! Acompanhe em Histórico.')
      onClose()
      onSuccess()
    } catch {
      toast('error', 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  if (!template) return null
  const Icon = TEMPLATE_ICONS[template.slug] ?? TEMPLATE_ICON_DEFAULT
  const formats = template.available_formats?.split(',').map(f => f.trim()) ?? ['xlsx']

  return (
    <Modal open={open} onClose={onClose} title="Gerar Relatório" size="sm">
      <div className="bg-dark-soft/50 rounded-xl p-4 mb-5 border border-white/5 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${template.color}20`, color: template.color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-display font-semibold text-white text-sm">{template.name}</p>
          <p className="text-xs text-white/40">{template.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label-mono text-white/40 mb-2 block">FORMATO</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMAT_OPTIONS.filter(f => formats.includes(f.value)).map(f => {
              const FIcon = f.icon
              return (
                <button
                  key={f.value}
                  onClick={() => setForm(x => ({ ...x, format: f.value }))}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs',
                    form.format === f.value
                      ? 'bg-brand/10 border-brand/30 text-brand'
                      : 'bg-dark-soft border-white/10 text-white/50 hover:border-white/30'
                  )}
                >
                  <FIcon className={cn('w-4 h-4', form.format === f.value ? 'text-brand' : f.color)} />
                  {f.value.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-mono text-white/40 mb-1.5 block">DATA INÍCIO</label>
            <input
              type="date"
              value={form.date_from}
              onChange={e => setForm(x => ({ ...x, date_from: e.target.value }))}
              className="input-base w-full text-sm"
            />
          </div>
          <div>
            <label className="label-mono text-white/40 mb-1.5 block">DATA FIM</label>
            <input
              type="date"
              value={form.date_to}
              onChange={e => setForm(x => ({ ...x, date_to: e.target.value }))}
              className="input-base w-full text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary flex-1">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando...</> : <><Play className="w-3.5 h-3.5" />Gerar</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function ReportsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('templates')
  const [templates, setTemplates] = useState<Template[]>([])
  const [history, setHistory] = useState<GeneratedReport[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [generateTarget, setGenerateTarget] = useState<Template | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval>>()

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/reports/templates')
      setTemplates(res.data.data ?? [])
    } catch {}
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get('/reports/history')
      setHistory(res.data.data ?? [])
    } catch {}
  }

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/reports/schedules')
      setSchedules(res.data.data ?? [])
    } catch {}
  }

  useEffect(() => {
    fetchTemplates()
    fetchHistory()
    fetchSchedules()
  }, [])

  // Poll for processing reports
  useEffect(() => {
    const hasProcessing = history.some(r => r.status === 'pending' || r.status === 'processing')
    if (hasProcessing) {
      pollingRef.current = setInterval(fetchHistory, 3000)
    }
    return () => clearInterval(pollingRef.current)
  }, [history])

  const handleDownload = async (report: GeneratedReport) => {
    try {
      const res = await api.get(`/reports/${report.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = report.filename
      a.click()
      URL.revokeObjectURL(url)
      fetchHistory()
    } catch {
      toast('error', 'Erro ao baixar relatório')
    }
  }

  const handleDeleteReport = async (id: number) => {
    try {
      await api.delete(`/reports/${id}`)
      setHistory(h => h.filter(r => r.id !== id))
      toast('success', 'Relatório removido')
    } catch {
      toast('error', 'Erro ao remover relatório')
    }
  }

  const handleToggleSchedule = async (schedule: Schedule) => {
    try {
      await api.put(`/reports/schedules/${schedule.id}/toggle`)
      setSchedules(s => s.map(x => x.id === schedule.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x))
    } catch {
      toast('error', 'Erro ao atualizar agendamento')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="label-mono text-white/40">MÓDULO</p>
        <h1 className="title-display text-2xl text-white">Relatórios</h1>
        <p className="text-sm text-white/50 mt-1">Geração e agendamento de relatórios em XLSX, PDF e CSV</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-card border border-white/5 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-brand text-dark font-semibold'
                : 'text-white/50 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.length === 0
                ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                : templates.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onGenerate={t2 => { setGenerateTarget(t2); setActiveTab('generate') }}
                  />
                ))
              }
            </div>
          </motion.div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => {
                const Icon = TEMPLATE_ICONS[t.slug] ?? TEMPLATE_ICON_DEFAULT
                const isSelected = generateTarget?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setGenerateTarget(isSelected ? null : t)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-brand/10 border-brand/30'
                        : 'bg-dark-card border-white/5 hover:border-white/20'
                    )}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${t.color}20`, color: t.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-display font-semibold text-sm', isSelected ? 'text-brand' : 'text-white')}>
                        {t.name}
                      </p>
                      <p className="text-xs text-white/40 truncate">{t.description}</p>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-brand flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
            {generateTarget && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-card border border-brand/20 rounded-card p-5"
              >
                <p className="label-mono text-brand mb-4">CONFIGURAR GERAÇÃO — {generateTarget.name.toUpperCase()}</p>
                <InlineGenerateForm
                  template={generateTarget}
                  onSuccess={() => { setActiveTab('history'); fetchHistory() }}
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/50">{history.length} relatório(s) gerado(s)</p>
              <button onClick={fetchHistory} className="btn-secondary text-xs h-8 px-3">
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar
              </button>
            </div>
            {history.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8" />}
                title="Nenhum relatório gerado"
                description="Vá para a aba Templates ou Gerar Relatório para criar seu primeiro relatório."
                action={{ label: 'Gerar agora', onClick: () => setActiveTab('templates') }}
              />
            ) : (
              <div className="space-y-3">
                {history.map(report => (
                  <motion.div
                    key={report.id}
                    layout
                    className="bg-dark-card border border-white/5 rounded-xl px-5 py-4 flex items-center gap-4"
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      report.file_format === 'xlsx' ? 'bg-brand/10 text-brand'
                      : report.file_format === 'pdf' ? 'bg-error/10 text-error'
                      : 'bg-info/10 text-info'
                    )}>
                      {report.file_format === 'xlsx' ? <FileSpreadsheet className="w-4 h-4" />
                       : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-white truncate">{report.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                        <span>{formatRelativeTime(report.created_at)}</span>
                        {report.download_count > 0 && <span>{report.download_count}x baixado</span>}
                        <span className="font-mono">{report.file_format.toUpperCase()}</span>
                      </div>
                    </div>
                    <ReportStatusBadge status={report.status} />
                    <div className="flex items-center gap-2">
                      {report.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(report)}
                          className="btn-secondary h-8 px-3 text-xs gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-1.5 text-white/30 hover:text-error transition-colors rounded-lg hover:bg-error/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <motion.div key="schedules" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {schedules.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-8 h-8" />}
                title="Nenhum agendamento configurado"
                description="Agendamentos de relatórios automáticos aparecerão aqui."
              />
            ) : (
              <div className="space-y-3">
                {schedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className="bg-dark-card border border-white/5 rounded-xl px-5 py-4 flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center text-info flex-shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-white">{schedule.template_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                        <span className="capitalize">{schedule.frequency === 'weekly' ? 'Semanal' : schedule.frequency === 'monthly' ? 'Mensal' : schedule.frequency}</span>
                        {schedule.next_run && <span>Próximo: {formatDate(schedule.next_run)}</span>}
                        {schedule.recipients && (
                          <span className="truncate max-w-40">{schedule.recipients}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleSchedule(schedule)}
                      className={cn(
                        'flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border transition-all',
                        schedule.is_active
                          ? 'bg-brand/10 border-brand/20 text-brand'
                          : 'bg-dark-soft border-white/10 text-white/40'
                      )}
                    >
                      {schedule.is_active
                        ? <><ToggleRight className="w-4 h-4" />Ativo</>
                        : <><ToggleLeft className="w-4 h-4" />Inativo</>
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Modal (from Templates tab) */}
      <GenerateModal
        template={generateTarget && activeTab === 'templates' ? generateTarget : null}
        open={!!generateTarget && activeTab === 'templates'}
        onClose={() => setGenerateTarget(null)}
        onSuccess={() => { fetchHistory(); setActiveTab('history') }}
      />
    </div>
  )
}

function InlineGenerateForm({ template, onSuccess }: { template: Template; onSuccess: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ format: 'xlsx', date_from: '', date_to: '' })
  const [loading, setLoading] = useState(false)
  const formats = template.available_formats?.split(',').map(f => f.trim()) ?? ['xlsx']

  const handleGenerate = async () => {
    try {
      setLoading(true)
      await api.post('/reports/generate', {
        template_id: template.id,
        format: form.format,
        filters: {
          date_from: form.date_from || undefined,
          date_to: form.date_to || undefined,
        },
      })
      toast('success', 'Relatório em geração! Acompanhe na aba Histórico.')
      onSuccess()
    } catch {
      toast('error', 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FORMAT_OPTIONS.filter(f => formats.includes(f.value)).map(f => {
          const FIcon = f.icon
          return (
            <button
              key={f.value}
              onClick={() => setForm(x => ({ ...x, format: f.value }))}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all',
                form.format === f.value
                  ? 'bg-brand/10 border-brand/30 text-brand'
                  : 'bg-dark-soft border-white/10 text-white/50 hover:border-white/30'
              )}
            >
              <FIcon className={cn('w-4 h-4', form.format === f.value ? 'text-brand' : f.color)} />
              {f.value.toUpperCase()}
            </button>
          )
        })}
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="label-mono text-white/40 mb-1.5 block">DATA INÍCIO</label>
          <input type="date" value={form.date_from}
            onChange={e => setForm(x => ({ ...x, date_from: e.target.value }))}
            className="input-base text-sm"
          />
        </div>
        <div>
          <label className="label-mono text-white/40 mb-1.5 block">DATA FIM</label>
          <input type="date" value={form.date_to}
            onChange={e => setForm(x => ({ ...x, date_to: e.target.value }))}
            className="input-base text-sm"
          />
        </div>
        <button onClick={handleGenerate} disabled={loading} className="btn-primary h-10 px-6">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
            : <><Play className="w-4 h-4" />Gerar Relatório</>
          }
        </button>
      </div>
    </div>
  )
}

export default ReportsPage
