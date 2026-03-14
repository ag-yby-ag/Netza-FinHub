import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, Clock, FileSpreadsheet } from 'lucide-react';
import { FileUploadZone } from '../components/ui/FileUploadZone';
import * as uploadService from '../services/uploads';
import type { Upload, UploadPreview } from '../types/upload';
import { formatDate } from '../utils/formatters';

type FlowStep = 'idle' | 'uploading' | 'mapping' | 'confirming' | 'done';

interface ColumnMapping {
  source: string;
  target: string;
}

const TARGET_COLUMNS = [
  { label: 'Selecionar...', value: '' },
  { label: 'Nome do fornecedor', value: 'supplier_name' },
  { label: 'CNPJ', value: 'cnpj' },
  { label: 'Categoria', value: 'category' },
  { label: 'E-mail', value: 'email' },
  { label: 'Telefone', value: 'phone' },
  { label: 'Endereço', value: 'address' },
  { label: 'Cidade', value: 'city' },
  { label: 'Estado', value: 'state' },
  { label: 'Valor', value: 'amount' },
  { label: 'Data', value: 'date' },
  { label: 'Descrição', value: 'description' },
  { label: 'Quantidade', value: 'quantity' },
  { label: 'Unidade', value: 'unit' },
  { label: 'Ignorar', value: '_ignore' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  completed: {
    icon: <CheckCircle2 size={16} />,
    color: 'text-[#4BA846]',
    label: 'Concluído',
  },
  failed: {
    icon: <XCircle size={16} />,
    color: 'text-[#DC2626]',
    label: 'Erro',
  },
  processing: {
    icon: <Clock size={16} />,
    color: 'text-[#A16207]',
    label: 'Processando',
  },
  pending: {
    icon: <Clock size={16} />,
    color: 'text-[#A16207]',
    label: 'Pendente',
  },
  cancelled: {
    icon: <XCircle size={16} />,
    color: 'text-[#737373]',
    label: 'Cancelado',
  },
};

const UploadPage: React.FC = () => {
  const [step, setStep] = useState<FlowStep>('idle');
  const [currentUpload, setCurrentUpload] = useState<Upload | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [history, setHistory] = useState<Upload[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch upload history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await uploadService.getUploads({ limit: 20 });
      setHistory(res);
    } catch {
      // silent fail for history
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setStep('uploading');
    setError(null);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const upload = await uploadService.uploadFile(file);
      clearInterval(interval);
      setUploadProgress(100);
      setCurrentUpload(upload);

      // Fetch preview for column mapping
      const previewData = await uploadService.getUploadPreview(upload.id);
      setPreview(previewData);

      // Auto-generate mappings from headers
      const autoMappings: ColumnMapping[] = previewData.headers.map((header) => ({
        source: header,
        target: guessTarget(header),
      }));
      setMappings(autoMappings);

      setStep('mapping');
    } catch (err) {
      clearInterval(interval);
      setUploadProgress(0);
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload do arquivo');
      setStep('idle');
    }
  };

  // Guess target column based on source header
  function guessTarget(header: string): string {
    const h = header.toLowerCase().trim();
    if (h.includes('nome') || h.includes('fornecedor') || h.includes('razao') || h.includes('razão')) return 'supplier_name';
    if (h.includes('cnpj')) return 'cnpj';
    if (h.includes('categ')) return 'category';
    if (h.includes('email') || h.includes('e-mail')) return 'email';
    if (h.includes('telefone') || h.includes('fone') || h.includes('phone')) return 'phone';
    if (h.includes('endereco') || h.includes('endereço') || h.includes('rua')) return 'address';
    if (h.includes('cidade') || h.includes('city')) return 'city';
    if (h.includes('estado') || h.includes('uf') || h.includes('state')) return 'state';
    if (h.includes('valor') || h.includes('preco') || h.includes('preço') || h.includes('amount')) return 'amount';
    if (h.includes('data') || h.includes('date')) return 'date';
    if (h.includes('descri')) return 'description';
    if (h.includes('qtd') || h.includes('quantidade') || h.includes('qty')) return 'quantity';
    if (h.includes('unid') || h.includes('unit')) return 'unit';
    return '';
  }

  const handleMappingChange = (index: number, target: string) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, target } : m)));
  };

  const handleConfirm = async () => {
    if (!currentUpload) return;
    setStep('confirming');
    try {
      await uploadService.confirmUpload(currentUpload.id);
      setStep('done');
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar importação');
      setStep('mapping');
    }
  };

  const handleCancel = async () => {
    if (currentUpload) {
      try {
        await uploadService.cancelUpload(currentUpload.id);
      } catch {
        // silent
      }
    }
    resetFlow();
  };

  const resetFlow = () => {
    setStep('idle');
    setCurrentUpload(null);
    setPreview(null);
    setMappings([]);
    setUploadProgress(0);
    setError(null);
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
          Upload de dados
        </h1>
        <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
          Importe planilhas de compras e fornecedores
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
        >
          <AlertTriangle size={18} className="shrink-0 text-red-500" />
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Upload zone (idle or uploading) */}
      <AnimatePresence mode="wait">
        {(step === 'idle' || step === 'uploading') && (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <FileUploadZone
              onFileSelect={handleFileSelect}
              progress={step === 'uploading' ? uploadProgress : undefined}
              fileName={step === 'uploading' ? 'Enviando arquivo...' : undefined}
              isUploading={step === 'uploading'}
              onCancel={step === 'uploading' ? handleCancel : undefined}
            />
          </motion.div>
        )}

        {/* Column mapping */}
        {(step === 'mapping' || step === 'confirming') && preview && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Mapping card */}
            <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
                  Mapeamento de colunas
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#E8FDE7] px-3 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#4BA846] dark:bg-[rgba(109,237,103,0.08)] dark:text-[#6DED67]">
                  {preview.headers.length} detectadas
                </span>
              </div>

              <div className="space-y-3">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="inline-flex min-w-[140px] items-center rounded-lg bg-[#F5F5F5] px-3 py-2 font-['JetBrains_Mono'] text-[12px] text-[#737373] dark:bg-[#262626] dark:text-[#A3A3A3]">
                      {mapping.source}
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-[#A3A3A3]" />
                    <select
                      value={mapping.target}
                      onChange={(e) => handleMappingChange(index, e.target.value)}
                      className="flex-1 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#141414] dark:text-white dark:focus:border-[#6DED67]"
                    >
                      {TARGET_COLUMNS.map((col) => (
                        <option key={col.value} value={col.value}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Data preview */}
            <div className="overflow-hidden rounded-[20px] border border-[#E5E5E5] bg-white dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
              <div className="px-6 py-4 border-b border-[#F2F2F2] dark:border-[#262626]">
                <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
                  Pré-visualização
                </h3>
                <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                  Mostrando {Math.min(preview.rows.length, 20)} de {preview.totalRows} linhas
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F2F2F2] dark:border-[#262626]">
                      <th className="px-4 py-2.5 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#A3A3A3]">
                        #
                      </th>
                      {preview.headers.map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2.5 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#A3A3A3]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 20).map((row, rowIdx) => {
                      const hasError = false;
                      return (
                        <tr
                          key={rowIdx}
                          className={`border-b border-[#F2F2F2] last:border-b-0 dark:border-[#262626] ${
                            hasError ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="px-4 py-2 font-['JetBrains_Mono'] text-[11px] text-[#A3A3A3]">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="max-w-[200px] truncate px-4 py-2 font-['Plus_Jakarta_Sans'] text-[12px] text-[#737373] dark:text-[#A3A3A3]"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={step === 'confirming'}
                className="rounded-full border border-[#E5E5E5] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50 dark:border-[#404040] dark:text-white dark:hover:bg-[#262626]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={step === 'confirming'}
                className="rounded-full bg-[#6DED67] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#4BA846] disabled:opacity-50"
              >
                {step === 'confirming' ? 'Importando...' : 'Confirmar importação'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Done */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center rounded-[20px] border border-[#E5E5E5] bg-white py-12 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]"
          >
            <CheckCircle2 size={48} className="mb-4 text-[#4BA846]" />
            <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#0D0D0D] dark:text-white">
              Importação concluída
            </h3>
            <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
              {currentUpload?.processed_rows ?? 0} linhas processadas com sucesso.
            </p>
            <button
              onClick={resetFlow}
              className="mt-6 rounded-full bg-[#6DED67] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#4BA846]"
            >
              Novo upload
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]"
      >
        <h3 className="mb-4 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Histórico de uploads
        </h3>

        {historyLoading ? (
          <p className="py-8 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
            Carregando histórico...
          </p>
        ) : history.length === 0 ? (
          <p className="py-8 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">
            Nenhum upload realizado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((upload, index) => {
              const cfg = statusConfig[upload.status] ?? statusConfig.pending;
              return (
                <motion.div
                  key={upload.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="flex items-center gap-4 rounded-xl border border-[#F2F2F2] p-3 transition-colors hover:bg-[#FAFAFA] dark:border-[#262626] dark:hover:bg-[#1A1A1A]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] dark:bg-[#262626]">
                    <FileSpreadsheet size={18} className="text-[#737373] dark:text-[#A3A3A3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-[#0D0D0D] dark:text-white">
                      {upload.original_name}
                    </p>
                    <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                      {upload.total_rows !== undefined && `${upload.processed_rows ?? 0}/${upload.total_rows} linhas`}
                      {upload.error_rows !== undefined && upload.error_rows > 0 && (
                        <span className="text-red-500"> \u00B7 {upload.error_rows} erros</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-[#A3A3A3]">
                      {formatDate(upload.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default UploadPage;
