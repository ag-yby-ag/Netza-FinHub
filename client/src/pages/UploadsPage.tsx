import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

type Step = 'select' | 'preview' | 'confirm' | 'result';

interface UploadResponse {
  upload_id: number;
  headers: string[];
  preview_rows: Record<string, string>[];
  suggested_mapping: Record<string, string>;
  total_rows: number;
}

interface ConfirmResult {
  rows_processed: number;
  rows_error: number;
  suppliers_created: number;
  quotes_created: number;
  status: string;
}

export default function UploadsPage() {
  const [step, setStep] = useState<Step>('select');
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const SYSTEM_FIELDS = ['name', 'cnpj', 'category', 'contact_name', 'contact_email', 'contact_phone', 'city', 'state', 'unit_price', 'quantity', 'item_description', 'delivery_days'];
  const FIELD_LABELS: Record<string, string> = {
    name: 'Nome', cnpj: 'CNPJ', category: 'Categoria', contact_name: 'Contato', contact_email: 'E-mail',
    contact_phone: 'Telefone', city: 'Cidade', state: 'Estado', unit_price: 'Preço unit.',
    quantity: 'Quantidade', item_description: 'Item', delivery_days: 'Prazo entrega',
  };

  const fetchHistory = useCallback(() => {
    api.get('/uploads?limit=10').then(r => setHistory(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(ext || '')) {
      error('Formato não suportado. Use CSV, XLS ou XLSX'); return;
    }
    if (file.size > 10 * 1024 * 1024) { error('Arquivo muito grande. Máximo 10MB.'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadData(res.data.data);
      setMapping(res.data.data.suggested_mapping || {});
      setStep('preview');
    } catch { error('Erro ao processar arquivo'); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleConfirm = async () => {
    if (!uploadData) return;
    setConfirming(true);
    try {
      const res = await api.post(`/uploads/${uploadData.upload_id}/confirm`, { mapping });
      setResult(res.data.data);
      setStep('result');
      fetchHistory();
      success('Importação concluída!');
    } catch { error('Erro na importação'); }
    finally { setConfirming(false); }
  };

  const reset = () => { setStep('select'); setUploadData(null); setMapping({}); setResult(null); };

  return (
    <div className="space-y-6">
      <div>
        <div className="label-mono mb-0.5">Dados</div>
        <h1 className="title-display text-xl text-dark dark:text-white">Upload de dados</h1>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {[
          { id: 'select', label: 'Selecionar' },
          { id: 'preview', label: 'Mapeamento' },
          { id: 'confirm', label: 'Confirmar' },
          { id: 'result', label: 'Resultado' },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${
              step === s.id ? 'text-brand' : ['select', 'preview', 'confirm', 'result'].indexOf(step) > i ? 'text-gray-400' : 'text-gray-300 dark:text-gray-600'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s.id ? 'bg-brand text-dark' : ['select', 'preview', 'confirm', 'result'].indexOf(step) > i ? 'bg-gray-200 dark:bg-white/10 text-gray-500' : 'bg-gray-100 dark:bg-white/5 text-gray-300'
              }`}>{i + 1}</div>
              {s.label}
            </div>
            {i < 3 && <div className="w-8 h-px bg-gray-200 dark:bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step: Select */}
      {step === 'select' && (
        <Card
          className={`p-12 border-2 border-dashed transition-colors cursor-pointer ${dragOver ? 'border-brand bg-brand-subtle' : 'border-gray-300 dark:border-white/20 hover:border-brand'}`}
          onDragOver={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
        >
          <div onDrop={handleDrop} className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-brand/20' : 'bg-gray-100 dark:bg-white/5'}`}>
              <Upload size={28} className={dragOver ? 'text-brand' : 'text-gray-400'} />
            </div>
            <h3 className="title-display text-base text-dark dark:text-white mb-1">
              {uploading ? 'Processando...' : 'Arraste seu arquivo aqui'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">ou clique para selecionar</p>
            <div className="flex gap-2">
              {['CSV', 'XLS', 'XLSX'].map(f => <Badge key={f} variant="outline" className="text-gray-400">{f}</Badge>)}
            </div>
            <p className="text-xs text-gray-400 mt-2">Tamanho máximo: 10MB</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
        </Card>
      )}

      {/* Step: Preview + Mapping */}
      {step === 'preview' && uploadData && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-mono mb-0.5">Arquivo</div>
                <div className="title-display text-base text-dark dark:text-white">{uploadData.total_rows} linhas detectadas</div>
              </div>
              <Button variant="ghost" onClick={reset}><X size={16} /> Cancelar</Button>
            </div>

            <div className="label-mono mb-3">Mapeamento de colunas</div>
            <div className="space-y-2.5">
              {SYSTEM_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-3">
                  <div className="w-36 text-xs font-mono text-dark dark:text-white bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-input">
                    {FIELD_LABELS[field]}
                  </div>
                  <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                  <select
                    value={mapping[field] || ''}
                    onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    className="input-base flex-1 h-9 text-xs"
                  >
                    <option value="">— Ignorar —</option>
                    {(uploadData.headers || []).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          {/* Preview table */}
          <Card className="p-5">
            <div className="label-mono mb-3">Prévia dos dados ({(uploadData.preview_rows || []).length} primeiras linhas)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    {(uploadData.headers || []).slice(0, 6).map(h => (
                      <th key={h} className="label-mono px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(uploadData.preview_rows || []).slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-white/5">
                      {(uploadData.headers || []).slice(0, 6).map(h => (
                        <td key={h} className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono">{row[h] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={reset}>Cancelar</Button>
            <Button onClick={handleConfirm} loading={confirming}>
              Confirmar importação ({uploadData.total_rows} linhas)
            </Button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <Card className="p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${result.status === 'completed' ? 'bg-brand-subtle' : 'bg-yellow-50'}`}>
            {result.status === 'completed'
              ? <CheckCircle size={32} className="text-brand-dark" />
              : <AlertCircle size={32} className="text-warning" />}
          </div>
          <h2 className="title-display text-xl text-dark dark:text-white mb-2">
            {result.status === 'completed' ? 'Importação concluída!' : 'Importação parcial'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
            {[
              { label: 'Processadas', value: result.rows_processed, color: 'text-brand-dark' },
              { label: 'Com erro', value: result.rows_error, color: 'text-error' },
              { label: 'Fornecedores', value: result.suppliers_created, color: 'text-dark dark:text-white' },
              { label: 'Orçamentos', value: result.quotes_created, color: 'text-dark dark:text-white' },
            ].map(k => (
              <div key={k.label} className="p-4 rounded-input bg-gray-50 dark:bg-white/5">
                <div className={`title-display text-2xl ${k.color}`}>{k.value}</div>
                <div className="label-mono mt-1">{k.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={reset}>Fazer outro upload</Button>
            <Button onClick={() => window.location.href = '/suppliers'}>Ver fornecedores</Button>
          </div>
        </Card>
      )}

      {/* Upload history */}
      {step === 'select' && history.length > 0 && (
        <Card className="p-5">
          <div className="label-mono mb-3">Histórico de uploads</div>
          <div className="space-y-2">
            {history.map((u) => (
              <div key={String(u.id)} className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-dark dark:text-white truncate">{String(u.original_name)}</div>
                  <div className="text-xs text-gray-400 font-mono">{formatDate(String(u.created_at))} · {Number(u.rows_total)} linhas</div>
                </div>
                <Badge variant="status" status={String(u.status)} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
