import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Star, Eye, Pencil, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useSuppliers } from '../hooks/useSuppliers';
import { formatCurrency, formatCNPJ } from '../utils/formatters';

const STATUS_TABS = [
  { label: 'Todos', value: '' },
  { label: 'Ativos', value: 'active' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Bloqueados', value: 'blocked' },
] as const;

const CATEGORIES = [
  { label: 'Todas categorias', value: '' },
  { label: 'Matéria-prima', value: 'materia-prima' },
  { label: 'Embalagem', value: 'embalagem' },
  { label: 'Logística', value: 'logistica' },
  { label: 'Serviços', value: 'servicos' },
  { label: 'Tecnologia', value: 'tecnologia' },
  { label: 'Equipamentos', value: 'equipamentos' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(rating) ? 'fill-[#FFB800] text-[#FFB800]' : 'text-[#E5E5E5] dark:text-[#404040]'}
        />
      ))}
    </span>
  );
}

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const { suppliers, total, totalPages, loading, error, filters, setFilters } = useSuppliers();

  const startItem = (filters.page - 1) * filters.limit + 1;
  const endItem = Math.min(filters.page * filters.limit, total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Space_Grotesk'] text-[28px] font-bold leading-tight text-[#0D0D0D] dark:text-white">
            Fornecedores
          </h1>
          <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
            {total} fornecedores cadastrados
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[#6DED67] px-5 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#4BA846]"
        >
          <Plus size={16} />
          Novo fornecedor
        </button>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = filters.status === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilters((f) => ({ ...f, status: tab.value }))}
                className={`rounded-full px-4 py-1.5 font-['Plus_Jakarta_Sans'] text-sm font-medium transition-colors ${
                  isActive
                    ? 'border border-[#4BA846] bg-[#E8FDE7] text-[#4BA846] dark:bg-[rgba(109,237,103,0.08)] dark:border-[#6DED67] dark:text-[#6DED67]'
                    : 'border border-[#E5E5E5] bg-white text-[#737373] hover:border-[#A3A3A3] dark:border-[#404040] dark:bg-[#141414] dark:text-[#A3A3A3] dark:hover:border-[#737373]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          className="rounded-full border border-[#E5E5E5] bg-white px-4 py-1.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors hover:border-[#A3A3A3] dark:border-[#404040] dark:bg-[#141414] dark:text-white dark:hover:border-[#737373]"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <div className="relative ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            type="text"
            placeholder="Buscar fornecedor..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-64 rounded-full border border-[#E5E5E5] bg-white py-1.5 pl-9 pr-4 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none placeholder:text-[#A3A3A3] transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#141414] dark:text-white dark:placeholder:text-[#737373] dark:focus:border-[#6DED67]"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-[20px] border border-[#E5E5E5] bg-white dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F2F2F2] dark:border-[#262626]">
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#D4D4D4] accent-[#6DED67]" />
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Rating
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Preço médio
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Entrega
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Risco
                </th>
                <th className="px-4 py-3 text-right font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier, index) => (
                  <motion.tr
                    key={supplier.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    className="cursor-pointer border-b border-[#F2F2F2] transition-colors hover:bg-[#FAFAFA] dark:border-[#262626] dark:hover:bg-[#1A1A1A]"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="h-4 w-4 rounded border-[#D4D4D4] accent-[#6DED67]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#F5F5F5] dark:bg-[#262626]">
                          <span className="font-['Space_Grotesk'] text-[10px] font-bold text-[#737373] dark:text-[#A3A3A3]">
                            {getInitials(supplier.name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-[#0D0D0D] dark:text-white">
                            {supplier.name}
                          </p>
                          <p className="font-['JetBrains_Mono'] text-[10px] text-[#A3A3A3] dark:text-[#737373]">
                            {supplier.cnpj ? formatCNPJ(supplier.cnpj) : '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-['Plus_Jakarta_Sans'] text-[13px] text-[#737373] dark:text-[#A3A3A3]">
                      {supplier.category}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={supplier.rating} />
                    </td>
                    <td className="px-4 py-3 font-['Space_Grotesk'] text-[13px] font-bold text-[#0D0D0D] dark:text-white">
                      {supplier.avg_price != null ? formatCurrency(supplier.avg_price) : '—'}
                    </td>
                    <td className="px-4 py-3 font-['Plus_Jakarta_Sans'] text-[13px] text-[#737373] dark:text-[#A3A3A3]">
                      {supplier.delivery_days != null ? `${supplier.delivery_days} dias` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={supplier.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge risk={supplier.risk_level} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/suppliers/${supplier.id}`)}
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#E5E5E5] text-[#737373] transition-colors hover:bg-[#F2F2F2] hover:text-[#0D0D0D] dark:border-[#404040] dark:text-[#A3A3A3] dark:hover:bg-[#262626] dark:hover:text-white"
                          aria-label="Ver detalhes"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#E5E5E5] text-[#737373] transition-colors hover:bg-[#F2F2F2] hover:text-[#0D0D0D] dark:border-[#404040] dark:text-[#A3A3A3] dark:hover:bg-[#262626] dark:hover:text-white"
                          aria-label="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#E5E5E5] text-[#737373] transition-colors hover:bg-[#F2F2F2] hover:text-[#0D0D0D] dark:border-[#404040] dark:text-[#A3A3A3] dark:hover:bg-[#262626] dark:hover:text-white"
                          aria-label="Mais opções"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-[#F2F2F2] px-4 py-3 dark:border-[#262626]">
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
              Mostrando {startItem}-{endItem} de {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E5] text-[#737373] transition-colors hover:bg-[#F2F2F2] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#404040] dark:text-[#A3A3A3] dark:hover:bg-[#262626]"
                aria-label="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true;
                  if (p === 1 || p === totalPages) return true;
                  return Math.abs(p - filters.page) <= 1;
                })
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <span className="px-1 font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">...</span>
                      )}
                      <button
                        onClick={() => setFilters((f) => ({ ...f, page: p }))}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg font-['Plus_Jakarta_Sans'] text-sm font-medium transition-colors ${
                          p === filters.page
                            ? 'bg-[#0D0D0D] text-white dark:bg-white dark:text-[#0D0D0D]'
                            : 'border border-[#E5E5E5] text-[#737373] hover:bg-[#F2F2F2] dark:border-[#404040] dark:text-[#A3A3A3] dark:hover:bg-[#262626]'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
              <button
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E5] text-[#737373] transition-colors hover:bg-[#F2F2F2] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#404040] dark:text-[#A3A3A3] dark:hover:bg-[#262626]"
                aria-label="Próxima página"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SuppliersPage;
