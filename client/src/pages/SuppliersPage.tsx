import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Star, Edit, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency, initials, getStatusColor, getStatusLabel, getRiskColor } from '../lib/utils';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

interface Supplier {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  status: string;
  risk_level: string;
  rating: number;
  avg_price?: number;
  delivery_days?: number;
  city?: string;
  state?: string;
  quote_count: number;
}

const CATEGORIES = ['Tecnologia', 'Marketing', 'Eventos', 'Logística', 'Escritório', 'Alimentação', 'Limpeza', 'Segurança', 'Consultoria', 'Jurídico', 'Contabilidade', 'RH', 'Infraestrutura', 'Comunicação', 'Viagens'];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort_by: 'name' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await api.get(`/suppliers?${params}`);
      setSuppliers(res.data.data);
      setTotal(res.data.meta.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Desativar "${name}"?`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      success('Fornecedor desativado');
      fetchSuppliers();
    } catch { error('Erro ao desativar fornecedor'); }
  };

  const StatusPills = ['', 'active', 'inactive', 'pending', 'blocked'].map(s => ({
    value: s, label: s === '' ? 'Todos' : getStatusLabel(s),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="label-mono mb-0.5">Gestão</div>
          <h1 className="title-display text-xl text-dark dark:text-white">Fornecedores <span className="text-gray-400 text-sm font-body font-normal">({total})</span></h1>
        </div>
        <Button variant="primary" onClick={() => navigate('/suppliers/new')}>
          <Plus size={16} /> Novo fornecedor
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nome, categoria, CNPJ..."
              className="input-base pl-9" />
          </div>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input-base w-full md:w-48">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Status pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {StatusPills.map(s => (
            <button key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-medium transition-all ${
                statusFilter === s.value
                  ? 'bg-dark dark:bg-white text-white dark:text-dark'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Ajuste os filtros ou cadastre um novo fornecedor."
            action={{ label: '+ Novo fornecedor', onClick: () => navigate('/suppliers/new') }}
            secondaryAction={{ label: 'Limpar filtros', onClick: () => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); } }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  {['Fornecedor', 'Categoria', 'Rating', 'Preço Médio', 'Entrega', 'Status', 'Risco', 'Ações'].map(col => (
                    <th key={col} className="label-mono px-5 py-3.5 text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {suppliers.map((s, idx) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-input bg-brand/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-dark text-xs font-bold">{initials(s.name)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-dark dark:text-white">{s.name}</div>
                          {s.city && <div className="text-xs text-gray-400">{s.city}, {s.state}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-dark dark:text-white">{s.category}</div>
                      {s.subcategory && <div className="text-xs text-gray-400">{s.subcategory}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-sm">
                        <Star size={13} className="text-warning fill-warning" />
                        <span className="text-dark dark:text-white font-medium">{s.rating || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-dark dark:text-white">
                      {s.avg_price ? formatCurrency(s.avg_price) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                      {s.delivery_days ? `${s.delivery_days}d` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="status" status={s.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="risk" status={s.risk_level} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/suppliers/${s.id}`)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-dark dark:hover:text-white transition-colors" title="Ver detalhe">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => navigate(`/suppliers/${s.id}/edit`)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-dark dark:hover:text-white transition-colors" title="Editar">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-error transition-colors" title="Desativar">
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

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-white/10">
            <span className="text-sm text-gray-400">{total} fornecedores</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
