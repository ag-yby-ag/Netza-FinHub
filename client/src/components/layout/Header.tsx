import React from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/suppliers': 'Fornecedores',
  '/upload': 'Upload',
  '/search': 'Buscar',
  '/reports': 'Relatórios',
  '/analytics': 'Análises',
  '/settings': 'Configurações',
};

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  // Build breadcrumb from path
  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumb =
    segments.length === 0
      ? 'Dashboard'
      : segments
          .map((seg, i) => {
            const path = '/' + segments.slice(0, i + 1).join('/');
            return routeLabels[path] ?? seg;
          })
          .join(' / ');

  return (
    <header
      className={clsx(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b px-8',
        'border-[#E5E5E5] bg-[rgba(247,247,247,0.85)] backdrop-blur-[12px]',
        'dark:border-[#262626] dark:bg-[rgba(13,13,13,0.85)]',
      )}
    >
      {/* Breadcrumb */}
      <span className="font-['JetBrains_Mono'] text-[13px] text-[#737373] dark:text-[#A3A3A3]">
        {breadcrumb}
      </span>

      {/* Theme toggle pill */}
      <div className="flex items-center rounded-full bg-[#E5E5E5] p-0.5 dark:bg-[#262626]">
        <button
          onClick={() => setTheme('light')}
          className={clsx(
            'flex items-center justify-center rounded-full p-1.5 transition-all duration-200',
            theme === 'light'
              ? 'bg-white text-[#0D0D0D] shadow-sm'
              : 'text-[#A3A3A3] hover:text-[#737373]',
          )}
          aria-label="Modo claro"
          aria-pressed={theme === 'light'}
        >
          <Sun size={14} />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={clsx(
            'flex items-center justify-center rounded-full p-1.5 transition-all duration-200',
            theme === 'dark'
              ? 'bg-white text-[#0D0D0D] shadow-sm dark:bg-[#404040] dark:text-white'
              : 'text-[#A3A3A3] hover:text-[#737373]',
          )}
          aria-label="Modo escuro"
          aria-pressed={theme === 'dark'}
        >
          <Moon size={14} />
        </button>
      </div>
    </header>
  );
};
