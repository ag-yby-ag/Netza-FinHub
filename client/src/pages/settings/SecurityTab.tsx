import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, LogOut, Clock } from 'lucide-react';
import type { ActivityLog } from '../../types/auth';
import * as authService from '../../services/auth';
import { formatDate } from '../../utils/formatters';

function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
  if (pwd.length === 0) return { label: '', color: '', width: '0%' };
  if (pwd.length < 6) return { label: 'Muito fraca', color: 'bg-red-500', width: '20%' };
  if (pwd.length < 8) return { label: 'Fraca', color: 'bg-orange-400', width: '40%' };
  if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Média', color: 'bg-yellow-400', width: '60%' };
  if (!/[^A-Za-z0-9]/.test(pwd)) return { label: 'Boa', color: 'bg-blue-400', width: '80%' };
  return { label: 'Forte', color: 'bg-[#4BA846]', width: '100%' };
}

const SecurityTab: React.FC = () => {
  const [form, setForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    authService.getActivityLog(10).then(setLogs).catch(() => {}).finally(() => setLogsLoading(false));
  }, []);

  const strength = getPasswordStrength(form.newPwd);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPwd !== form.confirm) {
      setPwdError('As senhas não conferem');
      return;
    }
    if (form.newPwd.length < 6) {
      setPwdError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSaving(true);
    setPwdError(null);
    try {
      await authService.changePassword(form.current, form.newPwd);
      setForm({ current: '', newPwd: '', confirm: '' });
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    login: 'Acesso ao sistema',
    logout: 'Saída do sistema',
    update_profile: 'Perfil atualizado',
    change_password: 'Senha alterada',
    upload: 'Upload realizado',
    edit_supplier: 'Fornecedor editado',
    change_settings: 'Configurações alteradas',
    create_user: 'Usuário criado',
  };

  return (
    <div className="space-y-4">
      {/* Change password */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Alterar senha
        </h3>

        {pwdError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/20">
            <AlertTriangle size={16} className="shrink-0 text-red-500" />
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:text-red-400">{pwdError}</p>
          </div>
        )}
        {pwdSuccess && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800/50 dark:bg-green-900/20">
            <CheckCircle2 size={16} className="text-[#4BA846]" />
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#4BA846]">Senha alterada com sucesso!</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Senha atual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })}
                required
                className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 pr-10 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPwd}
                onChange={(e) => setForm({ ...form, newPwd: e.target.value })}
                required
                className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 pr-10 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.newPwd.length > 0 && (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-[#262626]">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                </div>
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-[#737373]">{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              className={`w-full rounded-[10px] border px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors dark:text-white dark:focus:border-[#6DED67] ${
                form.confirm && form.confirm !== form.newPwd
                  ? 'border-red-400 bg-white focus:border-red-500 dark:border-red-600 dark:bg-[#1A1A1A]'
                  : 'border-[#E5E5E5] bg-white focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A]'
              }`}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#6DED67] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#0D0D0D] transition-colors hover:bg-[#4BA846] disabled:opacity-50"
            >
              {saving ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>

      {/* Active session info */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-4 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Sessão ativa
        </h3>
        <div className="flex items-center justify-between rounded-xl border border-[#F2F2F2] p-4 dark:border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F5F5] dark:bg-[#262626]">
              <Clock size={16} className="text-[#737373]" />
            </div>
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
                Sessão atual
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                Logado em {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#E8FDE7] px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#4BA846] dark:bg-[rgba(109,237,103,0.08)] dark:text-[#6DED67]">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4BA846] dark:bg-[#6DED67]" />
            Ativa
          </span>
        </div>
        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E5E5] py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#737373] transition-colors hover:border-red-300 hover:text-red-500 dark:border-[#404040] dark:hover:border-red-700 dark:hover:text-red-400">
          <LogOut size={16} />
          Encerrar todas as sessões
        </button>
      </div>

      {/* Activity log */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-4 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Log de atividades
        </h3>
        {logsLoading ? (
          <p className="py-4 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="py-4 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#A3A3A3]">Nenhuma atividade registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F2F2F2] dark:border-[#262626]">
                  {['Data', 'Ação', 'Módulo', 'IP'].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-left font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#A3A3A3]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#F2F2F2] last:border-0 dark:border-[#262626]">
                    <td className="py-2 pr-4 font-['JetBrains_Mono'] text-[11px] text-[#737373] dark:text-[#A3A3A3] whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-2 pr-4 font-['Plus_Jakarta_Sans'] text-[12px] text-[#0D0D0D] dark:text-white">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex rounded-full bg-[#F5F5F5] px-2 py-0.5 font-['JetBrains_Mono'] text-[10px] text-[#737373] capitalize dark:bg-[#262626] dark:text-[#A3A3A3]">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-2 font-['JetBrains_Mono'] text-[11px] text-[#A3A3A3]">
                      {log.ip_address ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTab;
