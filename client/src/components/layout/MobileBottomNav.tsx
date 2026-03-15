import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, Upload, Users, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* More sheet overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-x-0 bottom-16 z-40 card-base rounded-b-none shadow-lg p-4 mx-2"
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Orçamentos', path: '/quotes' },
                { label: 'Relatórios', path: '/reports' },
                { label: 'Analytics', path: '/analytics' },
                { label: 'Configurações', path: '/settings' },
              ].map(item => (
                <button key={item.path}
                  onClick={() => { navigate(item.path); setMoreOpen(false); }}
                  className="py-3 px-4 rounded-input bg-gray-50 dark:bg-white/5 text-sm text-dark dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left">
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden h-16 bg-white dark:bg-dark border-t border-gray-200 dark:border-white/10 flex items-center justify-around px-2">
        <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 ${isActive ? 'text-brand' : 'text-gray-400'}`}>
          <LayoutDashboard size={22} />
          <span className="text-[10px]">Dashboard</span>
        </NavLink>

        <NavLink to="/search" className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 ${isActive ? 'text-brand' : 'text-gray-400'}`}>
          <Search size={22} />
          <span className="text-[10px]">Buscar</span>
        </NavLink>

        {/* Upload button — elevated */}
        <div className="relative -mt-5">
          <NavLink to="/upload" className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center shadow-green">
              <Upload size={22} className="text-dark" />
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">Upload</span>
          </NavLink>
        </div>

        <NavLink to="/suppliers" className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 ${isActive ? 'text-brand' : 'text-gray-400'}`}>
          <Users size={22} />
          <span className="text-[10px]">Fornecedores</span>
        </NavLink>

        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex flex-col items-center gap-1 px-3 py-1 ${moreOpen ? 'text-brand' : 'text-gray-400'}`}
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px]">Mais</span>
        </button>
      </nav>
    </>
  );
}
