import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Star, MapPin, Mail, Phone, DollarSign, Clock, FileText } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusLabel, initials } from '../lib/utils';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import AIInsightCard from '../components/ai/AIInsightCard';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/suppliers/${id}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!data) return <div className="p-8 text-center text-error">Fornecedor não encontrado</div>;

  const s = data as Record<string, unknown>;
  const reviews = (s.reviews as Array<Record<string, unknown>>) || [];
  const quotes = (s.recent_quotes as Array<Record<string, unknown>>) || [];
  const stats = (s.stats as Record<string, unknown>) || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/suppliers')} className="p-2 rounded-input hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="label-mono">Fornecedores</div>
          <h1 className="title-display text-xl text-dark dark:text-white">{String(s.name)}</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/suppliers/${id}/edit`)}>
          <Edit size={15} /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-card bg-brand/10 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-dark text-lg font-bold">{initials(String(s.name))}</span>
              </div>
              <div className="flex-1">
                <h2 className="title-display text-lg text-dark dark:text-white">{String(s.name)}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-gray-500">{String(s.category)}</Badge>
                  <Badge variant="status" status={String(s.status)} />
                  <Badge variant="risk" status={String(s.risk_level)} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star size={16} className="text-warning fill-warning" />
                <span className="font-display font-bold text-lg text-dark dark:text-white">{Number(s.rating).toFixed(1)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <DollarSign size={15} />, label: 'Preço médio', value: s.avg_price ? formatCurrency(Number(s.avg_price)) : '—' },
                { icon: <Clock size={15} />, label: 'Entrega', value: s.delivery_days ? `${s.delivery_days} dias` : '—' },
                { icon: <FileText size={15} />, label: 'Orçamentos', value: String(stats.total || 0) },
                { icon: <DollarSign size={15} />, label: 'Vol. total', value: formatCurrency(Number(stats.volume || 0)) },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded-input bg-gray-50 dark:bg-white/5">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">{item.icon}</div>
                  <div className="font-mono font-semibold text-sm text-dark dark:text-white">{item.value}</div>
                  <div className="label-mono text-gray-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Contact */}
          {!!(s.contact_name || s.contact_email || s.city) && (
            <Card className="p-5">
              <div className="label-mono mb-3">Contato</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!!s.contact_name && <div className="flex items-center gap-2 text-sm text-dark dark:text-white"><Star size={14} className="text-gray-400" /> {String(s.contact_name)}</div>}
                {!!s.contact_email && <div className="flex items-center gap-2 text-sm text-dark dark:text-white"><Mail size={14} className="text-gray-400" /> {String(s.contact_email)}</div>}
                {!!s.contact_phone && <div className="flex items-center gap-2 text-sm text-dark dark:text-white"><Phone size={14} className="text-gray-400" /> {String(s.contact_phone)}</div>}
                {!!s.city && <div className="flex items-center gap-2 text-sm text-dark dark:text-white"><MapPin size={14} className="text-gray-400" /> {String(s.city)}, {String(s.state)}</div>}
              </div>
            </Card>
          )}

          {/* Quotes history */}
          {quotes.length > 0 && (
            <Card className="p-5">
              <div className="label-mono mb-3">Histórico de orçamentos</div>
              <div className="space-y-2">
                {quotes.map((q, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <div className="flex-1">
                      <div className="text-sm text-dark dark:text-white">{String(q.item_description)}</div>
                      <div className="text-xs text-gray-400">{formatDate(String(q.created_at))}</div>
                    </div>
                    <span className="font-mono text-sm text-dark dark:text-white">{formatCurrency(Number(q.total_price))}</span>
                    <Badge variant="status" status={String(q.status)} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* AI Insight */}
          <AIInsightCard type="supplier_comparison" contextId={String(s.id)} variant="white" />

          {/* Reviews */}
          {reviews.length > 0 && (
            <Card className="p-5">
              <div className="label-mono mb-3">Avaliações ({reviews.length})</div>
              <div className="space-y-3">
                {reviews.slice(0, 3).map((r, i) => (
                  <div key={i} className="border-b border-gray-100 dark:border-white/5 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-dark dark:text-white">{String(r.reviewer)}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(n => <Star key={n} size={11} className={n <= Number(r.rating) ? 'text-warning fill-warning' : 'text-gray-300'} />)}
                      </div>
                    </div>
                    {!!r.comment && <p className="text-xs text-gray-400 leading-relaxed">{String(r.comment)}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
