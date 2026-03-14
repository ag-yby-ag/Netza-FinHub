import React from 'react';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import type { Preferences } from '../../types/auth';

interface NotificationsTabProps {
  preferences: Preferences;
  onUpdate: (key: string, value: string) => void;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ preferences, onUpdate }) => {
  const tog = (key: string) => preferences[key] !== 'false' && preferences[key] !== undefined
    ? preferences[key] !== 'false'
    : false;

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-1 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Notificações por e-mail
        </h3>
        <p className="mb-5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
          Receba atualizações em {typeof preferences.email !== 'undefined' ? preferences.email : 'seu e-mail cadastrado'}
        </p>
        <div className="space-y-5">
          <ToggleSwitch
            checked={preferences.notif_upload_done !== 'false'}
            onChange={(v) => onUpdate('notif_upload_done', String(v))}
            label="Upload concluído"
            description="Quando uma importação de arquivo for processada"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <ToggleSwitch
            checked={preferences.notif_quote_expiring !== 'false'}
            onChange={(v) => onUpdate('notif_quote_expiring', String(v))}
            label="Orçamento vencendo"
            description="Alertas de cotações próximas do vencimento (7 dias)"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <ToggleSwitch
            checked={preferences.notif_new_supplier !== 'false'}
            onChange={(v) => onUpdate('notif_new_supplier', String(v))}
            label="Novo fornecedor cadastrado"
            description="Quando um novo fornecedor for adicionado à plataforma"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <ToggleSwitch
            checked={preferences.notif_ai_insight !== 'false'}
            onChange={(v) => onUpdate('notif_ai_insight', String(v))}
            label="Insight de IA disponível"
            description="Quando a IA gerar novas análises e recomendações"
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-1 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Alertas push
        </h3>
        <p className="mb-5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
          Notificações em tempo real no navegador
        </p>
        <div className="space-y-5">
          <ToggleSwitch
            checked={preferences.notif_risk_push === 'true'}
            onChange={(v) => onUpdate('notif_risk_push', String(v))}
            label="Alertas de risco alto"
            description="Quando um fornecedor for classificado como risco alto"
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Resumo diário
        </h3>
        <div className="space-y-5">
          <ToggleSwitch
            checked={preferences.notif_daily_summary === 'true'}
            onChange={(v) => onUpdate('notif_daily_summary', String(v))}
            label="Resumo diário por e-mail"
            description="Receba um resumo das atividades do dia"
          />
          {preferences.notif_daily_summary === 'true' && (
            <div className="flex items-center gap-3 pl-0">
              <label className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#737373]">
                Horário
              </label>
              <input
                type="time"
                value={preferences.notif_daily_time ?? '08:00'}
                onChange={(e) => onUpdate('notif_daily_time', e.target.value)}
                className="rounded-[10px] border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
