import { useLocation } from 'react-router-dom';
import { Sun, Moon, User, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../notifications/NotificationBell';
import GlobalSearch from '../search/GlobalSearch';
import { initials } from '../../lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/search': 'Busca Avançada',
  '/upload': 'Upload de Dados',
  '/suppliers': 'Fornecedores',
  '/quotes': 'Orçamentos',
  '/analytics': 'Analytics',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
};

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const title = PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/suppliers/') ? 'Detalhe do Fornecedor' : 'FinHub');

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 bg-surface/85 dark:bg-dark-soft/85 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
      {/* Left: breadcrumb */}
      <div>
        <div className="label-mono text-gray-400">NETZA&CO / FINHUB</div>
        <h1 className="title-display text-base text-dark dark:text-white leading-none mt-0.5">{title}</h1>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <GlobalSearch />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-input hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition-colors"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationBell />

        {/* Avatar menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 p-1.5 rounded-input hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-input bg-brand flex items-center justify-center">
              <span className="font-display font-bold text-dark text-xs">{initials(user?.name || '')}</span>
            </div>
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 top-full mt-1.5 w-52 card-base shadow-lg z-50 overflow-hidden py-1"
              >
                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                  <div className="text-sm font-medium text-dark dark:text-white">{user?.name}</div>
                  <div className="text-xs text-brand font-mono uppercase">{user?.role}</div>
                </div>
                <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2.5">
                  <Settings size={15} /> Configurações
                </button>
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5">
                  <LogOut size={15} /> Sair
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
