import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Download, Clock, Calendar, Plus, Trash2,
  RefreshCw, Filter, ChevronDown, CheckCircle2, AlertCircle,
  Users, ShieldAlert, BarChart3, DollarSign, Upload as UploadIcon,
  ToggleLeft, ToggleRight, X,
} from 'lucide-react';
import clsx from 'clsx';
import {
  getTemplates, generateReport, getHistory, deleteReport, downloadReport,
  getSchedules, createSchedule, updateSchedule, deleteSchedule,
  type ReportTemplate, type GeneratedReport, type ReportSchedule, type ReportFilters,
} from '../services/reports';
import { CATEGORIES } from '../utils/constants';

/* ── Icon map ───────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users size={20} />,
  FileText: <FileText size={20} />,
  ShieldAlert: <ShieldAlert size={20} />,
  BarChart3: <BarChart3 size={20} />,
  DollarSign: <DollarSign size={20} />,
  Upload: <UploadIcon size={20} />,
};

const FORMAT_LABELS: Record<string, string> = { xlsx: 'Excel', csv: 'CSV', pdf: 'PDF / HTML' };
const FREQ_LABELS: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── Tabs ───────────────────────────────────────────────────── */

type Tab = 'templates' | 'generate' | 'history' | 'schedules';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <FileText size={15} /> },
  { id: 'generate', label: 'Gerar Relatório', icon: <Download size={15} /> },
  { id: 'history', label: 'Histórico', icon: <Clock size={15} /> },
  { id: 'schedules', label: 'Agendamentos', icon: <Calendar size={15} /> },
];

/* ── Filters panel ──────────────────────────────────────────── */

interface FiltersPanelProps {
  templateCategory: string;
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ templateCategory, filters, onChange }) => {
  const set = (key: keyof ReportFilters, val: string) => onChange({ ...filters, [key]: val || undefined });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {['suppliers', 'quotes', 'risk', 'performance', 'financial', 'uploads'].includes(templateCategory) && (
        <div>
          <label className="mb-1 block font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">
            Categoria
          </label>
          <select
            value={filters.category ?? ''}
            onChange={(e) => set('category', e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      {['suppliers', 'quotes', 'uploads'].includes(templateCategory) && (
        <div>
          <label className="mb-1 block font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">
            Status
          </label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => set('status', e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
          >
            <option value="">Todos os status</option>
            {templateCategory === 'suppliers' && <>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="blocked">Bloqueado</option>
              <option value="pending">Pendente</option>
            </>}
            {templateCategory === 'quotes' && <>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
              <option value="expired">Expirado</option>
            </>}
            {templateCategory === 'uploads' && <>
              <option value="completed">Concluído</option>
              <option value="failed">Falhou</option>
              <option value="processing">Processando</option>
            </>}
          </select>
        </div>
      )}
      {['risk'].includes(templateCategory) && (
        <div>
          <label className="mb-1 block font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">
            Nível de Risco
          </label>
          <select
            value={filters.risk_level ?? ''}
            onChange={(e) => set('risk_level', e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
          >
            <option value="">Todos os riscos</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
        </div>
      )}
      {['quotes', 'financial', 'uploads'].includes(templateCategory) && (<>
        <div>
          <label className="mb-1 block font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">
            Data início
          </label>
          <input
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) => set('date_from', e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">
            Data fim
          </label>
          <input
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) => set('date_to', e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
          />
        </div>
      </>)}
      {['performance'].includes(templateCategory) && (
        <div>
          <label className="mb-1 block font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">
            Avaliação mínima
          </label>
          <select
            value={filters.min_rating ?? ''}
            onChange={(e) => set('min_rating', e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
          >
            <option value="">Qualquer avaliação</option>
            <option value="4.5">4.5+ estrelas</option>
            <option value="4.0">4.0+ estrelas</option>
            <option value="3.5">3.5+ estrelas</option>
            <option value="3.0">3.0+ estrelas</option>
          </select>
        </div>
      )}
    </div>
  );
};

/* ── Schedule Modal ─────────────────────────────────────────── */

interface ScheduleModalProps {
  templates: ReportTemplate[];
  onClose: () => void;
  onCreated: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ templates, onClose, onCreated }) => {
  const [templateId, setTemplateId] = useState<number>(templates[0]?.id ?? 0);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    setLoading(true); setError('');
    try {
      await createSchedule({ template_id: templateId, name, frequency, format, filters: {}, recipients: [] });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-6 dark:border-[#262626] dark:bg-[#141414]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#0D0D0D] dark:text-white">Novo Agendamento</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#F5F5F5] dark:hover:bg-[#1F1F1F]"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#737373]">Nome do agendamento</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Relatório Semanal de Fornecedores"
              className="w-full rounded-lg border border-[#E5E5E5] bg-transparent px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none focus:border-[#6DED67] dark:border-[#333] dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#737373]">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
            >
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#737373]">Frequência</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#737373]">Formato</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF / HTML</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[#E5E5E5] px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#737373] dark:border-[#333]">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 rounded-xl bg-[#6DED67] px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#5CCB56] disabled:opacity-60"
            >
              {loading ? 'Criando...' : 'Criar Agendamento'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ── Main Page ──────────────────────────────────────────────── */

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Generate tab state
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);
  const [genError, setGenError] = useState('');
  const [rowPreview, setRowPreview] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // History state
  const [historyFilter, setHistoryFilter] = useState('');

  // Schedules state
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
      if (data.length > 0) setSelectedTemplate((prev) => prev ?? data[0]);
    } catch { /* silent */ }
    finally { setLoadingTemplates(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getHistory({ page: 1, limit: 20, format: historyFilter || undefined });
      setHistory(res.data);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [historyFilter]);

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const data = await getSchedules();
      setSchedules(data);
    } catch { /* silent */ }
    finally { setLoadingSchedules(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab, loadHistory]);
  useEffect(() => { if (activeTab === 'schedules') loadSchedules(); }, [activeTab, loadSchedules]);

  // Preview row count when template or filters change
  useEffect(() => {
    if (!selectedTemplate) return;
    setRowPreview(null);
    import('../services/reports').then(({ previewReport }) => {
      previewReport(selectedTemplate.id, filters).then((r) => setRowPreview(r.row_count)).catch(() => {});
    });
  }, [selectedTemplate, filters]);

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true); setGenError(''); setGenSuccess(false);
    try {
      await generateReport(selectedTemplate.id, format, filters);
      setGenSuccess(true);
      setTimeout(() => setGenSuccess(false), 4000);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    try { await deleteReport(id); setHistory((h) => h.filter((r) => r.id !== id)); } catch { /* silent */ }
  };

  const handleDownload = async (id: number) => {
    try { await downloadReport(id); } catch { /* silent */ }
  };

  const handleToggleSchedule = async (schedule: ReportSchedule) => {
    try {
      const updated = await updateSchedule(schedule.id, { is_active: !schedule.is_active });
      setSchedules((prev) => prev.map((s) => s.id === schedule.id ? updated : s));
    } catch { /* silent */ }
  };

  const handleDeleteSchedule = async (id: number) => {
    try { await deleteSchedule(id); setSchedules((s) => s.filter((x) => x.id !== id)); } catch { /* silent */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="font-['Space_Grotesk'] text-[28px] font-bold leading-tight text-[#0D0D0D] dark:text-white">
          Relatórios
        </h1>
        <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
          Gere, exporte e agende relatórios da sua base de fornecedores
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] dark:border-[#262626]">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-semibold transition-colors",
                activeTab === tab.id
                  ? 'border-[#6DED67] text-[#0D0D0D] dark:text-white'
                  : 'border-transparent text-[#737373] hover:text-[#0D0D0D] dark:text-[#A3A3A3] dark:hover:text-white',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ── Templates Tab ─────────────────────────── */}
        {activeTab === 'templates' && (
          <div>
            {loadingTemplates ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#F5F5F5] dark:bg-[#1A1A1A]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <motion.button
                    key={t.id}
                    whileHover={{ y: -2 }}
                    onClick={() => { setSelectedTemplate(t); setFilters({}); setActiveTab('generate'); }}
                    className="group flex flex-col gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-5 text-left transition-all hover:border-[#6DED67]/50 hover:shadow-md dark:border-[#262626] dark:bg-[#141414] dark:hover:border-[#6DED67]/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6DED67]/10 text-[#4BA846]">
                        {ICON_MAP[t.icon] ?? <FileText size={20} />}
                      </div>
                      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider text-[#737373] dark:text-[#525252]">
                        {t.category}
                      </span>
                    </div>
                    <div>
                      <p className="font-['Space_Grotesk'] text-[15px] font-bold text-[#0D0D0D] dark:text-white">{t.name}</p>
                      <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-[#737373] dark:text-[#A3A3A3] line-clamp-2">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#6DED67] opacity-0 transition-opacity group-hover:opacity-100">
                      <Download size={14} />
                      <span className="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Gerar relatório</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Generate Tab ──────────────────────────── */}
        {activeTab === 'generate' && (
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Template select */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#262626] dark:bg-[#141414]">
              <h3 className="mb-3 font-['Space_Grotesk'] text-[15px] font-bold text-[#0D0D0D] dark:text-white">Template</h3>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTemplate(t); setFilters({}); }}
                    className={clsx(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      selectedTemplate?.id === t.id
                        ? 'border-[#6DED67] bg-[#6DED67]/5 dark:bg-[#6DED67]/5'
                        : 'border-[#E5E5E5] hover:border-[#6DED67]/40 dark:border-[#333]',
                    )}
                  >
                    <div className={clsx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      selectedTemplate?.id === t.id ? 'bg-[#6DED67]/20 text-[#4BA846]' : 'bg-[#F5F5F5] text-[#737373] dark:bg-[#1F1F1F]'
                    )}>
                      {ICON_MAP[t.icon] ?? <FileText size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={clsx(
                        "font-['Plus_Jakarta_Sans'] text-sm font-semibold",
                        selectedTemplate?.id === t.id ? 'text-[#0D0D0D] dark:text-white' : 'text-[#737373] dark:text-[#A3A3A3]'
                      )}>
                        {t.name}
                      </p>
                    </div>
                    {selectedTemplate?.id === t.id && <CheckCircle2 size={16} className="shrink-0 text-[#6DED67]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#262626] dark:bg-[#141414]">
              <h3 className="mb-3 font-['Space_Grotesk'] text-[15px] font-bold text-[#0D0D0D] dark:text-white">Formato</h3>
              <div className="grid grid-cols-3 gap-2">
                {(['xlsx', 'csv', 'pdf'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={clsx(
                      "rounded-xl border py-3 text-center font-['Plus_Jakarta_Sans'] text-sm font-semibold transition-colors",
                      format === f
                        ? 'border-[#6DED67] bg-[#6DED67]/10 text-[#0D0D0D] dark:text-white'
                        : 'border-[#E5E5E5] text-[#737373] hover:border-[#6DED67]/40 dark:border-[#333]',
                    )}
                  >
                    {FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
              {format === 'pdf' && (
                <p className="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">
                  Abre uma página HTML formatada. Use Ctrl+P no navegador para salvar como PDF.
                </p>
              )}
            </div>

            {/* Filters */}
            {selectedTemplate && (
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#262626] dark:bg-[#141414]">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex w-full items-center justify-between"
                >
                  <h3 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#0D0D0D] dark:text-white">
                    Filtros
                    {Object.values(filters).filter(Boolean).length > 0 && (
                      <span className="ml-2 rounded-full bg-[#6DED67]/20 px-2 py-0.5 font-['JetBrains_Mono'] text-[10px] text-[#4BA846]">
                        {Object.values(filters).filter(Boolean).length} ativos
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-[#737373]">
                    <Filter size={14} />
                    <ChevronDown size={14} className={clsx('transition-transform', showFilters && 'rotate-180')} />
                  </div>
                </button>
                {showFilters && (
                  <div className="mt-4">
                    <FiltersPanel
                      templateCategory={selectedTemplate.category}
                      filters={filters}
                      onChange={setFilters}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Preview + Generate */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#262626] dark:bg-[#141414]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">Registros encontrados</p>
                  <p className="font-['Space_Grotesk'] text-2xl font-bold text-[#0D0D0D] dark:text-white">
                    {rowPreview === null ? (
                      <span className="inline-block h-7 w-12 animate-pulse rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A]" />
                    ) : rowPreview.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">Template</p>
                  <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">{selectedTemplate?.name ?? '—'}</p>
                </div>
              </div>

              {genSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                  <CheckCircle2 size={16} className="text-[#4BA846]" />
                  <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#4BA846]">Relatório gerado e download iniciado!</p>
                </div>
              )}
              {genError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-500">{genError}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedTemplate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6DED67] py-3 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#0D0D0D] transition-colors hover:bg-[#5CCB56] disabled:opacity-60"
              >
                {generating ? (
                  <><RefreshCw size={16} className="animate-spin" /> Gerando...</>
                ) : (
                  <><Download size={16} /> Gerar e Baixar ({FORMAT_LABELS[format]})</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── History Tab ───────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-white"
              >
                <option value="">Todos os formatos</option>
                <option value="xlsx">Excel</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
              <button
                onClick={loadHistory}
                className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] hover:bg-[#F5F5F5] dark:border-[#333] dark:hover:bg-[#1A1A1A]"
              >
                <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>

            {loadingHistory ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-[#F5F5F5] dark:bg-[#1A1A1A]" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center">
                <Clock size={40} className="mx-auto mb-3 text-[#E5E5E5] dark:text-[#333]" />
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373]">Nenhum relatório gerado ainda</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="mt-3 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#6DED67] hover:underline"
                >
                  Gerar primeiro relatório
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] dark:border-[#262626]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7] dark:border-[#262626] dark:bg-[#141414]">
                      {['Relatório', 'Formato', 'Registros', 'Tamanho', 'Gerado por', 'Data', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider text-[#737373]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA] dark:border-[#1F1F1F] dark:hover:bg-[#0F0F0F]">
                        <td className="px-4 py-3">
                          <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">{r.name}</p>
                          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">{r.template_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 font-['JetBrains_Mono'] text-[10px] uppercase text-[#737373] dark:bg-[#1F1F1F]">
                            {r.format}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-['JetBrains_Mono'] text-sm text-[#0D0D0D] dark:text-white">
                            {r.row_count?.toLocaleString('pt-BR') ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-['JetBrains_Mono'] text-xs text-[#737373]">{formatBytes(r.file_size)}</td>
                        <td className="px-4 py-3 font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">{r.generated_by_name}</td>
                        <td className="px-4 py-3 font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">{formatDate(r.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {r.status === 'completed' && (
                              <button
                                onClick={() => handleDownload(r.id)}
                                className="rounded-lg p-1.5 text-[#737373] hover:bg-[#F5F5F5] hover:text-[#6DED67] dark:hover:bg-[#1A1A1A]"
                                title="Baixar novamente"
                              >
                                <Download size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteHistory(r.id)}
                              className="rounded-lg p-1.5 text-[#737373] hover:bg-[#F5F5F5] hover:text-red-400 dark:hover:bg-[#1A1A1A]"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Schedules Tab ─────────────────────────── */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
                {schedules.length} agendamento{schedules.length !== 1 ? 's' : ''} configurado{schedules.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#6DED67] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#0D0D0D] transition-colors hover:bg-[#5CCB56]"
              >
                <Plus size={16} />
                Novo Agendamento
              </button>
            </div>

            {loadingSchedules ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-[#F5F5F5] dark:bg-[#1A1A1A]" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-16 text-center">
                <Calendar size={40} className="mx-auto mb-3 text-[#E5E5E5] dark:text-[#333]" />
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373]">Nenhum agendamento configurado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className={clsx(
                      'flex items-center gap-4 rounded-2xl border p-4 transition-colors',
                      s.is_active
                        ? 'border-[#E5E5E5] bg-white dark:border-[#262626] dark:bg-[#141414]'
                        : 'border-[#F0F0F0] bg-[#FAFAFA] opacity-60 dark:border-[#1F1F1F] dark:bg-[#0F0F0F]',
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6DED67]/10 text-[#4BA846]">
                      {ICON_MAP[s.template_icon] ?? <Calendar size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">{s.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider text-[#737373]">
                          {FREQ_LABELS[s.frequency]} · {FORMAT_LABELS[s.format]} · {s.template_name}
                        </span>
                      </div>
                      {s.next_run && (
                        <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">
                          Próxima execução: {formatDate(s.next_run)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSchedule(s)}
                        className="text-[#737373] transition-colors hover:text-[#0D0D0D] dark:hover:text-white"
                        title={s.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {s.is_active ? <ToggleRight size={24} className="text-[#6DED67]" /> : <ToggleLeft size={24} />}
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="rounded-lg p-1.5 text-[#737373] hover:bg-[#F5F5F5] hover:text-red-400 dark:hover:bg-[#1A1A1A]"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </motion.div>

      {/* Schedule modal */}
      {showScheduleModal && (
        <ScheduleModal
          templates={templates}
          onClose={() => setShowScheduleModal(false)}
          onCreated={loadSchedules}
        />
      )}
    </motion.div>
  );
};

export default ReportsPage;
