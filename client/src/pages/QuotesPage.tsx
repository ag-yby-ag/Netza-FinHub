import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, X, Eye, Trash2, DollarSign, Clock, FileText, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusLabel } from '../lib/utils';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

interface Quote {
  id: number;
  item_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  status: string;
  valid_until?: string;
  created_at: string;
  supplier_name?: string;
  supplier_category?: string;
}

interface Stats {
  total: number;
  approved: number;
  approved_value: number;
  pending: number;
  expiring_soon: number;
}

const STATUS_FILTERS = ['', 'pending', 'approved', 'rejected', 'expired'];

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const { success, error } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const [qRes, sRes] = await Promise.all([
        api.get(`/quotes?${params}`),
        api.get('/quotes/stats'),
      ]);
      setQuotes(qRes.data.data);
      setTotal(qRes.data.meta.total);
      setStats(sRes.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const approve = async (id: number) => {
    try {
      await api.put(`/quotes/${id}/approve`);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'approved' } : q));
      success('Orçamento aprovado');
      fetchAll();
    } catch { error('Erro ao aprovar'); }
  };

  const reject = async (id: number) => {
    try {
      await api.put(`/quotes/${id}/reject`);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'rejected' } : q));
      setRejectId(null);
      success('Orçamento rejeitado');
      fetchAll();
    } catch { error('Erro ao rejeitar'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Remover este orçamento?')) return;
    try {
      await api.delete(`/quotes/${id}`);
      success('Orçamento removido');
      fetchAll();
    } catch { error('Erro ao remover'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="label-mono">Gestão</div>
          <h1 className="title-display text-xl text-dark dark:text-white">Orçamentos <span className="text-gray-400 text-sm font-body font-normal">({total})</span></h1>
        </div>
        <Button onClick={() => setNewModalOpen(true)}><Plus size={16} /> Novo orçamento</Button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <FileText size={18} className="text-brand" />, label: 'Total', value: stats.total, format: 'number' },
            { icon: <DollarSign size={18} className="text-brand" />, label: 'Valor aprovado', value: stats.approved_value, format: 'currency' },
            { icon: <Clock size={18} className="text-warning" />, label: 'Pendentes', value: stats.pending, format: 'number' },
            { icon: <AlertCircle size={18} className="text-error" />, label: 'Vencendo em 7d', value: stats.expiring_soon, format: 'number' },
          ].map((k, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 mb-2">{k.icon}<span className="label-mono">{k.label}</span></div>
              <div className="title-display text-xl text-dark dark:text-white">
                {k.format === 'currency' ? formatCurrency(k.value as number) : (k.value as number).toLocaleString('pt-BR')}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-pill text-xs font-medium transition-all ${
              statusFilter === s
                ? 'bg-dark dark:bg-white text-white dark:text-dark'
                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}>
            {s === '' ? 'Todos' : getStatusLabel(s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : quotes.length === 0 ? (
          <EmptyState title="Nenhum orçamento" description="Crie um novo orçamento ou importe via upload."
            action={{ label: '+ Novo orçamento', onClick: () => setNewModalOpen(true) }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  {['Data', 'Fornecedor', 'Item', 'Qtd', 'Total', 'Status', 'Válido até', 'Ações'].map(col => (
                    <th key={col} className="label-mono px-4 py-3.5 text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {quotes.map((q, idx) => (
                  <motion.tr key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 group">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-dark dark:text-white">{q.supplier_name || '—'}</div>
                      {q.supplier_category && <div className="text-xs text-gray-400">{q.supplier_category}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-dark dark:text-white max-w-[200px] truncate">{q.item_description}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{q.quantity} {q.unit}</td>
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold text-dark dark:text-white">{formatCurrency(q.total_price)}</td>
                    <td className="px-4 py-3.5"><Badge variant="status" status={q.status} /></td>
                    <td className={`px-4 py-3.5 text-xs font-mono ${
                      q.valid_until && new Date(q.valid_until) < new Date() ? 'text-error' : 'text-gray-400'
                    }`}>
                      {q.valid_until ? formatDate(q.valid_until) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {q.status === 'pending' && (
                          <>
                            <button onClick={() => approve(q.id)} title="Aprovar"
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-500/10 text-gray-400 hover:text-brand-dark transition-colors">
                              <Check size={15} />
                            </button>
                            <button onClick={() => setRejectId(q.id)} title="Rejeitar"
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-error transition-colors">
                              <X size={15} />
                            </button>
                          </>
                        )}
                        <button onClick={() => setDetailId(q.id)} title="Ver detalhe"
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-dark dark:hover:text-white transition-colors">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => remove(q.id)} title="Remover"
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-error transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-white/10">
            <span className="text-sm text-gray-400">{total} orçamentos</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </Card>

      {/* Reject confirmation modal */}
      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Rejeitar orçamento?" size="sm">
        <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setRejectId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => rejectId && reject(rejectId)}>Rejeitar</Button>
        </div>
      </Modal>

      {/* New quote modal */}
      <NewQuoteModal open={newModalOpen} onClose={() => setNewModalOpen(false)} onSuccess={() => { setNewModalOpen(false); fetchAll(); success('Orçamento criado'); }} />
    </div>
  );
}

function NewQuoteModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = useState({ supplier_id: '', item_description: '', quantity: '1', unit: 'unid', unit_price: '', valid_until: '' });
  const [loading, setLoading] = useState(false);
  const { error } = useToast();

  useEffect(() => {
    if (open) api.get('/suppliers?status=active&limit=100').then(r => setSuppliers(r.data.data)).catch(() => {});
  }, [open]);

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));
  const total = (parseFloat(form.quantity || '0') * parseFloat(form.unit_price || '0')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_description) { error('Descrição é obrigatória'); return; }
    setLoading(true);
    try {
      await api.post('/quotes', { ...form, supplier_id: Number(form.supplier_id), quantity: parseFloat(form.quantity), unit_price: parseFloat(form.unit_price), total_price: total });
      onSuccess();
    } catch { error('Erro ao criar orçamento'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo orçamento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-mono block mb-1.5">Fornecedor</label>
          <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} className="input-base">
            <option value="">Selecione um fornecedor</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label-mono block mb-1.5">Item/Descrição *</label>
            <input required value={form.item_description} onChange={e => set('item_description', e.target.value)} className="input-base" placeholder="Ex: Notebooks Dell" /></div>
          <div><label className="label-mono block mb-1.5">Quantidade</label>
            <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="input-base" /></div>
          <div><label className="label-mono block mb-1.5">Unidade</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input-base">
              {['unid', 'kg', 'm', 'm²', 'caixa', 'pacote', 'litro', 'hora', 'mês'].map(u => <option key={u}>{u}</option>)}
            </select></div>
          <div><label className="label-mono block mb-1.5">Preço unitário (R$)</label>
            <input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} className="input-base" /></div>
          <div><label className="label-mono block mb-1.5">Total</label>
            <input readOnly value={total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} className="input-base bg-gray-50 dark:bg-white/5" /></div>
          <div className="col-span-2"><label className="label-mono block mb-1.5">Válido até</label>
            <input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} className="input-base" /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Salvar orçamento</Button>
        </div>
      </form>
    </Modal>
  );
}
