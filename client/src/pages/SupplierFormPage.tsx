import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { validateCNPJFrontend } from '../lib/cnpjUtils';

const CATEGORIES = ['Tecnologia', 'Marketing', 'Eventos', 'Logística', 'Escritório', 'Alimentação', 'Limpeza', 'Segurança', 'Consultoria', 'Jurídico', 'Contabilidade', 'RH', 'Infraestrutura', 'Comunicação', 'Viagens'];
const STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

interface FormData {
  name: string; cnpj: string; category: string; subcategory: string;
  contact_name: string; contact_email: string; contact_phone: string; contact_role: string;
  city: string; state: string;
  avg_price: string; delivery_days: string; payment_terms: string;
  status: string; risk_level: string; notes: string;
}

const empty: FormData = {
  name: '', cnpj: '', category: '', subcategory: '',
  contact_name: '', contact_email: '', contact_phone: '', contact_role: '',
  city: '', state: '',
  avg_price: '', delivery_days: '', payment_terms: '30 dias',
  status: 'active', risk_level: 'low', notes: '',
};

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const isEdit = !!id;
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/suppliers/${id}`).then(res => {
        const s = res.data.data;
        setForm({
          name: s.name || '', cnpj: s.cnpj || '', category: s.category || '', subcategory: s.subcategory || '',
          contact_name: s.contact_name || '', contact_email: s.contact_email || '',
          contact_phone: s.contact_phone || '', contact_role: s.contact_role || '',
          city: s.city || '', state: s.state || '',
          avg_price: s.avg_price ? String(s.avg_price) : '', delivery_days: s.delivery_days ? String(s.delivery_days) : '',
          payment_terms: s.payment_terms || '30 dias',
          status: s.status || 'active', risk_level: s.risk_level || 'low', notes: s.notes || '',
        });
      }).catch(() => {});
    }
  }, [id, isEdit]);

  const set = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validateCNPJ = (val: string) => {
    if (!val) { setCnpjError(''); return; }
    const cleaned = val.replace(/[^\d]/g, '');
    if (cleaned.length === 14) {
      if (!validateCNPJFrontend(cleaned)) {
        setCnpjError('CNPJ inválido');
      } else {
        setCnpjError('');
      }
    }
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name || form.name.length < 3) e.name = 'Nome deve ter pelo menos 3 caracteres';
    if (!form.category) e.category = 'Categoria é obrigatória';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = 'E-mail inválido';
    setErrors(e);
    return Object.keys(e).length === 0 && !cnpjError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        avg_price: form.avg_price ? parseFloat(form.avg_price) : null,
        delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
      };
      if (isEdit) {
        await api.put(`/suppliers/${id}`, payload);
        success('Fornecedor atualizado com sucesso');
      } else {
        await api.post('/suppliers', payload);
        success('Fornecedor criado com sucesso');
      }
      navigate('/suppliers');
    } catch (err: unknown) {
      error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="label-mono mb-4 pb-2 border-b border-gray-200 dark:border-white/10">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/suppliers')} className="p-2 rounded-input hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="label-mono">Fornecedores</div>
          <h1 className="title-display text-xl text-dark dark:text-white">{isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}</h1>
        </div>
      </div>

      <Card className="p-7">
        <form onSubmit={handleSubmit}>
          <Section title="Dados básicos">
            <Input label="Nome da empresa *" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="Nome da empresa" />
            <div>
              <Input label="CNPJ" value={form.cnpj}
                onChange={e => { set('cnpj', e.target.value); validateCNPJ(e.target.value); }}
                error={cnpjError} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className="label-mono block mb-1.5">Categoria *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className={`input-base ${errors.category ? 'border-error' : ''}`}>
                <option value="">Selecione...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-error text-xs mt-0.5">{errors.category}</p>}
            </div>
            <Input label="Subcategoria" value={form.subcategory} onChange={e => set('subcategory', e.target.value)} placeholder="Ex: Software, Hardware" />
            <div>
              <label className="label-mono block mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-base">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="pending">Pendente</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
            <div>
              <label className="label-mono block mb-1.5">Nível de risco</label>
              <select value={form.risk_level} onChange={e => set('risk_level', e.target.value)} className="input-base">
                <option value="low">Baixo</option>
                <option value="medium">Médio</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </Section>

          <Section title="Contato">
            <Input label="Nome do contato" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Responsável" />
            <Input label="E-mail" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} error={errors.contact_email} placeholder="email@empresa.com.br" />
            <Input label="Telefone" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="(11) 99999-9999" />
            <Input label="Cargo" value={form.contact_role} onChange={e => set('contact_role', e.target.value)} placeholder="Ex: Diretor Comercial" />
          </Section>

          <Section title="Localização">
            <Input label="Cidade" value={form.city} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
            <div>
              <label className="label-mono block mb-1.5">Estado</label>
              <select value={form.state} onChange={e => set('state', e.target.value)} className="input-base">
                <option value="">Selecione...</option>
                {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </Section>

          <Section title="Dados financeiros">
            <Input label="Preço médio (R$)" type="number" step="0.01" value={form.avg_price} onChange={e => set('avg_price', e.target.value)} placeholder="0,00" />
            <Input label="Prazo de entrega (dias)" type="number" value={form.delivery_days} onChange={e => set('delivery_days', e.target.value)} placeholder="7" />
            <div className="md:col-span-2">
              <label className="label-mono block mb-1.5">Condições de pagamento</label>
              <select value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} className="input-base">
                <option value="À vista">À vista</option>
                <option value="30 dias">30 dias</option>
                <option value="30/60">30/60</option>
                <option value="30/60/90">30/60/90</option>
                <option value="Mensal">Mensal</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          </Section>

          <div className="mb-6">
            <div className="label-mono mb-2">Observações</div>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={4} placeholder="Notas internas sobre este fornecedor..."
              className="input-base h-auto py-2.5 resize-none" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
            {isEdit && (
              <Button variant="danger" type="button"
                onClick={async () => {
                  if (!confirm('Excluir este fornecedor?')) return;
                  await api.delete(`/suppliers/${id}`);
                  success('Fornecedor excluído');
                  navigate('/suppliers');
                }}>
                Excluir fornecedor
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="secondary" type="button" onClick={() => navigate('/suppliers')}>Cancelar</Button>
              <Button variant="primary" type="submit" loading={loading}>Salvar fornecedor</Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
