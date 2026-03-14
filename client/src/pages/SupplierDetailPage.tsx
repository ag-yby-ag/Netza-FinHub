import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { getSupplier, getSupplierQuotes } from '../services/suppliers';
import { formatCurrency, formatDate, formatCNPJ, formatPhone } from '../utils/formatters';
import type { Supplier, SupplierQuote, Review } from '../types/supplier';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'fill-[#FFB800] text-[#FFB800]' : 'text-[#E5E5E5] dark:text-[#404040]'}
        />
      ))}
    </span>
  );
}

interface RatingBar {
  label: string;
  value: number;
  color: string;
}

// Rating bars are computed from review data when available

const quoteStatusMap: Record<string, { status: 'active' | 'pending' | 'inactive'; label: string }> = {
  approved: { status: 'active', label: 'Aprovado' },
  pending: { status: 'pending', label: 'Pendente' },
  rejected: { status: 'inactive', label: 'Rejeitado' },
  expired: { status: 'inactive', label: 'Expirado' },
};

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [reviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [supplierData, quotesData] = await Promise.all([
        getSupplier(id),
        getSupplierQuotes(id),
      ]);
      setSupplier(supplierData);
      setQuotes(quotesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">Carregando...</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/suppliers')}
          className="inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] hover:text-[#0D0D0D] dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error ?? 'Fornecedor não encontrado'}
        </div>
      </div>
    );
  }

  const ratingBars: RatingBar[] = [
    { label: 'Qualidade', value: 0, color: '#4BA846' },
    { label: 'Entrega', value: 0, color: '#3B82F6' },
    { label: 'Preço', value: 0, color: '#FFB800' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/suppliers')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-[#F2F2F2] hover:text-[#0D0D0D] dark:text-[#A3A3A3] dark:hover:bg-[#262626] dark:hover:text-white"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <nav className="font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
          <Link to="/suppliers" className="hover:text-[#0D0D0D] dark:hover:text-white transition-colors">
            Fornecedores
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#0D0D0D] dark:text-white font-medium">{supplier.name}</span>
        </nav>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Left: Profile card */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]"
        >
          {/* Avatar + name */}
          <div className="flex items-start gap-4">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-[#F5F5F5] dark:bg-[#262626]">
              <span className="font-['Space_Grotesk'] text-base font-bold text-[#737373] dark:text-[#A3A3A3]">
                {getInitials(supplier.name)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#0D0D0D] dark:text-white">
                {supplier.name}
              </h2>
              <p className="mt-0.5 font-['JetBrains_Mono'] text-[11px] text-[#A3A3A3] dark:text-[#737373]">
                {supplier.cnpj ? formatCNPJ(supplier.cnpj) : '—'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge status={supplier.status} />
                <Badge risk={supplier.risk_level} />
              </div>
            </div>
          </div>

          {/* Informações gerais */}
          <div className="mt-6">
            <h3 className="mb-3 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              Informações gerais
            </h3>
            <div className="space-y-3">
              <InfoRow label="Categoria" value={supplier.category} />
              {supplier.contact_name && (
                <InfoRow label="Contato" value={supplier.contact_name} />
              )}
              {supplier.contact_email && (
                <InfoRow
                  label="E-mail"
                  value={
                    <a
                      href={`mailto:${supplier.contact_email}`}
                      className="inline-flex items-center gap-1.5 text-[#3B82F6] hover:underline"
                    >
                      <Mail size={12} />
                      {supplier.contact_email}
                    </a>
                  }
                />
              )}
              {supplier.contact_phone && (
                <InfoRow
                  label="Telefone"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={12} className="text-[#A3A3A3]" />
                      {formatPhone(supplier.contact_phone)}
                    </span>
                  }
                />
              )}
              {(supplier.city || supplier.state) && (
                <InfoRow
                  label="Localização"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#A3A3A3]" />
                      {[supplier.city, supplier.state].filter(Boolean).join(', ')}
                    </span>
                  }
                />
              )}
            </div>
          </div>

          {/* Dados financeiros */}
          <div className="mt-6">
            <h3 className="mb-3 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              Dados financeiros
            </h3>
            <div className="space-y-3">
              <InfoRow label="Preço médio" value={supplier.avg_price != null ? formatCurrency(supplier.avg_price) : '—'} bold />
              <InfoRow label="Prazo entrega" value={supplier.delivery_days != null ? `${supplier.delivery_days} dias` : '—'} />
              <InfoRow label="Cond. pagamento" value={supplier.payment_terms ?? '—'} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button className="flex-1 rounded-full border border-[#E5E5E5] px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#F2F2F2] dark:border-[#404040] dark:text-white dark:hover:bg-[#262626]">
              Editar
            </button>
            <button className="flex-1 rounded-full bg-[#6DED67] px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#4BA846]">
              Solicitar orçamento
            </button>
          </div>
        </motion.div>

        {/* Right: Ratings card */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]"
        >
          {/* Big score */}
          <div className="flex items-start gap-4">
            <span className="font-['Space_Grotesk'] text-[38px] font-bold leading-none text-[#0D0D0D] dark:text-white">
              {supplier.rating.toFixed(1)}
            </span>
            <div>
              <StarRating rating={supplier.rating} size={18} />
              <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                {supplier.rating_count} avaliações
              </p>
            </div>
          </div>

          {/* Rating bars */}
          <div className="mt-6 space-y-4">
            {ratingBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#737373] dark:text-[#A3A3A3]">
                    {bar.label}
                  </span>
                  <span className="font-['Space_Grotesk'] text-[13px] font-bold text-[#0D0D0D] dark:text-white">
                    {bar.value.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-[#262626]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(bar.value / 5) * 100}%`,
                      backgroundColor: bar.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Reviews list */}
          <div className="mt-6">
            <h3 className="mb-3 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              Avaliações recentes
            </h3>
            {reviews.length === 0 ? (
              <p className="py-6 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
                Nenhuma avaliação ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-[#F2F2F2] p-3 dark:border-[#262626]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-[#0D0D0D] dark:text-white">
                        {review.reviewer ?? 'Anônimo'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                        <Calendar size={11} />
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    <StarRating rating={review.rating} size={12} />
                    <p className="mt-1.5 font-['Plus_Jakarta_Sans'] text-[13px] leading-relaxed text-[#737373] dark:text-[#A3A3A3]">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quotes table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="overflow-hidden rounded-[20px] border border-[#E5E5E5] bg-white dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]"
      >
        <div className="px-6 py-4 border-b border-[#F2F2F2] dark:border-[#262626]">
          <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
            Cotações
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F2F2F2] dark:border-[#262626]">
                <th className="px-6 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Item
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Qtd
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Unid.
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Valor unit.
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Validade
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
                    Nenhuma cotação registrada.
                  </td>
                </tr>
              ) : (
                quotes.map((quote, index) => {
                  const statusInfo = quoteStatusMap[quote.status] ?? { status: 'inactive' as const, label: quote.status };
                  return (
                    <motion.tr
                      key={quote.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="border-b border-[#F2F2F2] last:border-b-0 dark:border-[#262626]"
                    >
                      <td className="px-6 py-3 font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#0D0D0D] dark:text-white">
                        {quote.item_description}
                      </td>
                      <td className="px-4 py-3 font-['JetBrains_Mono'] text-[12px] text-[#737373] dark:text-[#A3A3A3]">
                        {quote.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-['Plus_Jakarta_Sans'] text-[13px] text-[#737373] dark:text-[#A3A3A3]">
                        {quote.unit ?? 'un'}
                      </td>
                      <td className="px-4 py-3 font-['Space_Grotesk'] text-[13px] font-bold text-[#0D0D0D] dark:text-white">
                        {quote.unit_price != null ? formatCurrency(quote.unit_price) : '—'}
                      </td>
                      <td className="px-4 py-3 font-['Space_Grotesk'] text-[13px] font-bold text-[#0D0D0D] dark:text-white">
                        {quote.total_price != null ? formatCurrency(quote.total_price) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={statusInfo.status}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 font-['Plus_Jakarta_Sans'] text-[13px] text-[#737373] dark:text-[#A3A3A3]">
                        {quote.valid_until ? formatDate(quote.valid_until) : '—'}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* Helper component for info rows */
function InfoRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-['Plus_Jakarta_Sans'] text-[13px] text-[#A3A3A3]">{label}</span>
      <span
        className={`font-['Plus_Jakarta_Sans'] text-[13px] text-[#0D0D0D] dark:text-white ${
          bold ? "font-['Space_Grotesk'] font-bold" : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default SupplierDetailPage;
