import React from 'react';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import type { Preferences } from '../../types/auth';

const CURRENCY_OPTIONS = [
  { label: 'Real Brasileiro (BRL)', value: 'BRL' },
  { label: 'Dólar Americano (USD)', value: 'USD' },
];

const DATE_OPTIONS = [
  { label: 'dd/MM/yyyy (ex: 14/03/2026)', value: 'dd/MM/yyyy' },
  { label: 'yyyy-MM-dd (ex: 2026-03-14)', value: 'yyyy-MM-dd' },
];

const PAGE_SIZES = ['10', '25', '50', '100'];

interface PreferencesTabProps {
  preferences: Preferences;
  onUpdate: (key: string, value: string) => void;
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({ preferences, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Aparência e idioma
        </h3>
        <div className="space-y-5">
          <ToggleSwitch
            checked={preferences.theme === 'dark'}
            onChange={(v) => onUpdate('theme', v ? 'dark' : 'light')}
            label="Tema escuro"
            description="Ativa a interface no modo escuro"
          />
          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />
          <ToggleSwitch
            checked={preferences.sidebar_compact === 'true'}
            onChange={(v) => onUpdate('sidebar_compact', String(v))}
            label="Sidebar compacta"
            description="Recolhe a barra lateral para 64px"
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Formatos e exibição
        </h3>
        <div className="space-y-4">
          {/* Currency */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
                Formatação de moeda
              </p>
              <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                Formato dos valores monetários na plataforma
              </p>
            </div>
            <select
              value={preferences.currency_format ?? 'BRL'}
              onChange={(e) => onUpdate('currency_format', e.target.value)}
              className="rounded-[10px] border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            >
              {CURRENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />

          {/* Date format */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
                Formato de data
              </p>
              <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                Como as datas são exibidas
              </p>
            </div>
            <select
              value={preferences.date_format ?? 'dd/MM/yyyy'}
              onChange={(e) => onUpdate('date_format', e.target.value)}
              className="rounded-[10px] border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            >
              {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="border-t border-[#F2F2F2] dark:border-[#262626]" />

          {/* Items per page */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
                Itens por página
              </p>
              <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
                Quantidade padrão de itens em tabelas e listas
              </p>
            </div>
            <select
              value={preferences.items_per_page ?? '25'}
              onChange={(e) => onUpdate('items_per_page', e.target.value)}
              className="rounded-[10px] border border-[#E5E5E5] bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} itens</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Inteligência artificial
        </h3>
        <div className="space-y-5">
          <ToggleSwitch
            checked={preferences.ai_auto_insights !== 'false'}
            onChange={(v) => onUpdate('ai_auto_insights', String(v))}
            label="Insights automáticos de IA"
            description="Gerar insights automaticamente ao atualizar dados"
          />
        </div>
      </div>
    </div>
  );
};

export default PreferencesTab;
