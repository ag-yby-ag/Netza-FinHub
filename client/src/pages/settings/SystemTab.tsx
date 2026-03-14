import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Download, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import type { SystemSettings } from '../../types/auth';
import * as settingsService from '../../services/settings';

interface SystemTabProps {
  onSuccess?: (msg: string) => void;
}

const SystemTab: React.FC<SystemTabProps> = ({ onSuccess }) => {
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsService.getSettings()
      .then(setSettings)
      .catch(() => setError('Erro ao carregar configurações'))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key: string, value: string) => {
    setSaving(key);
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
    try {
      await settingsService.updateSetting(key, value);
    } catch {
      setError('Erro ao salvar configuração');
    } finally {
      setSaving(null);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = await settingsService.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netza-finhub-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onSuccess?.('Exportação concluída');
    } catch {
      setError('Erro ao exportar dados');
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearCache = async () => {
    setCacheLoading(true);
    try {
      await settingsService.clearCache();
      onSuccess?.('Cache de IA limpo com sucesso');
    } catch {
      setError('Erro ao limpar cache');
    } finally {
      setCacheLoading(false);
    }
  };

  const handleReset = async () => {
    if (resetInput !== 'RESETAR') return;
    setResetLoading(true);
    try {
      await settingsService.resetDatabase('RESETAR');
      setResetModal(false);
      setResetInput('');
      onSuccess?.('Banco de dados resetado com sucesso');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resetar');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">Carregando configurações...</p>;
  }

  const s = (key: string) => settings[key]?.value ?? '';

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/20">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* General settings */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Configurações gerais
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Nome da plataforma
            </label>
            <input
              value={s('app_name')}
              onChange={(e) => updateSetting('app_name', e.target.value)}
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
                Tamanho máximo de upload
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={s('max_upload_size_mb')}
                  onChange={(e) => updateSetting('max_upload_size_mb', e.target.value)}
                  min={1}
                  max={50}
                  className="flex-1 rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
                />
                <span className="font-['JetBrains_Mono'] text-xs text-[#737373]">MB</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
                Timeout de sessão
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={s('session_timeout_min')}
                  onChange={(e) => updateSetting('session_timeout_min', e.target.value)}
                  min={30}
                  className="flex-1 rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
                />
                <span className="font-['JetBrains_Mono'] text-xs text-[#737373]">min</span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Paginação padrão
            </label>
            <select
              value={s('default_pagination')}
              onChange={(e) => updateSetting('default_pagination', e.target.value)}
              className="rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            >
              {['10', '25', '50', '100'].map((v) => <option key={v} value={v}>{v} itens</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* AI settings */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <div className="mb-5 flex items-center gap-2">
          <Zap size={16} className="text-[#6DED67]" />
          <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
            Inteligência artificial
          </h3>
        </div>
        <div className="space-y-5">
          <ToggleSwitch
            checked={s('ai_enabled') !== 'false'}
            onChange={(v) => updateSetting('ai_enabled', String(v))}
            label="IA de insights ativa"
            description="Habilita o módulo de análise inteligente de fornecedores"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <ToggleSwitch
            checked={s('ai_auto_analyze') !== 'false'}
            onChange={(v) => updateSetting('ai_auto_analyze', String(v))}
            label="Análise automática em uploads"
            description="Analisar automaticamente os dados após cada importação"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
                Cache de IA
              </p>
              <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                Limpa os dados em cache das análises de IA
              </p>
            </div>
            <button
              onClick={handleClearCache}
              disabled={cacheLoading}
              className="flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50 dark:border-[#404040] dark:text-white dark:hover:bg-[#262626]"
            >
              <RefreshCw size={14} className={cacheLoading ? 'animate-spin' : ''} />
              Limpar cache
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Manutenção
        </h3>
        <div className="space-y-5">
          <ToggleSwitch
            checked={s('maintenance_mode') === 'true'}
            onChange={(v) => updateSetting('maintenance_mode', String(v))}
            label="Modo manutenção"
            description="Bloqueia acesso de usuários não-admin durante a manutenção"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <ToggleSwitch
            checked={s('backup_enabled') !== 'false'}
            onChange={(v) => updateSetting('backup_enabled', String(v))}
            label="Backup automático"
            description="Realiza backup incremental dos dados diariamente"
          />
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-[20px] border border-[rgba(255,77,77,0.2)] bg-white p-6 dark:bg-[#141414]">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <h3 className="font-['Space_Grotesk'] text-base font-bold text-red-500">
            Zona de risco
          </h3>
        </div>
        <p className="mb-5 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
          Ações irreversíveis. Prossiga com extrema cautela.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center justify-center gap-2 rounded-full border border-[rgba(255,77,77,0.3)] px-5 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-red-500 transition-colors hover:bg-[rgba(255,77,77,0.05)] disabled:opacity-50"
          >
            <Download size={14} />
            {exportLoading ? 'Exportando...' : 'Exportar todos os dados'}
          </button>
          <button
            onClick={() => setResetModal(true)}
            className="flex items-center justify-center gap-2 rounded-full border border-[rgba(255,77,77,0.3)] px-5 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-red-500 transition-colors hover:bg-[rgba(255,77,77,0.05)]"
          >
            <Trash2 size={14} />
            Resetar banco de dados
          </button>
        </div>
      </div>

      {/* Reset modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-[440px] rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" />
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-red-500">
                Resetar banco de dados
              </h3>
            </div>
            <p className="mb-4 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
              Esta ação irá remover <strong className="text-[#0D0D0D] dark:text-white">todos os fornecedores, cotações, avaliações e uploads</strong>. Esta ação é <strong>irreversível</strong>.
            </p>
            <p className="mb-2 font-['Plus_Jakarta_Sans'] text-sm text-[#737373]">
              Digite <code className="rounded bg-[#F5F5F5] px-1.5 py-0.5 font-['JetBrains_Mono'] text-xs text-red-500 dark:bg-[#262626]">RESETAR</code> para confirmar:
            </p>
            <input
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="RESETAR"
              className="mb-4 w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['JetBrains_Mono'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-red-400 dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setResetModal(false); setResetInput(''); }}
                className="rounded-full border border-[#E5E5E5] px-5 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#737373] transition-colors hover:bg-[#F2F2F2] dark:border-[#404040] dark:hover:bg-[#262626]"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetInput !== 'RESETAR' || resetLoading}
                className="rounded-full bg-red-500 px-5 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-40"
              >
                {resetLoading ? 'Resetando...' : 'Confirmar reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemTab;
