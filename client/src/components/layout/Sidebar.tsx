import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, Upload, Users, FileText, BarChart2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { initials, cn } from '../../lib/utils';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Search, label: 'Buscar', path: '/search' },
      { icon: Upload, label: 'Upload', path: '/upload' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { icon: Users, label: 'Fornecedores', path: '/suppliers' },
      { icon: FileText, label: 'Orçamentos', path: '/quotes' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { icon: BarChart2, label: 'Analytics', path: '/analytics' },
      { icon: FileText, label: 'Relatórios', path: '/reports' },
    ],
  },
];

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={cn(
      'flex flex-col h-full bg-dark border-r border-white/10 transition-all duration-300',
      collapsed ? 'w-[64px]' : 'w-[280px]'
    )}>
      {/* Radial gradient decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.06] pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, #6DED67, transparent 70%)' }} />

      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <span className="font-display font-black text-dark text-xs">N</span>
          </div>
          {!collapsed && (
            <div>
              <div className="font-display font-bold text-white text-base leading-none">
                NETZA<span className="text-brand">&</span>CO
              </div>
              <div className="font-mono text-[9px] uppercase text-gray-500 tracking-[0.12em] mt-0.5">FINHUB</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-5">
            {!collapsed && (
              <div className="label-mono px-6 mb-2">{group.label}</div>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn('nav-item mx-2', isActive && 'nav-item-active')
                }
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn('nav-item mx-0 mb-2', isActive && 'nav-item-active')}
        >
          <Settings size={18} />
          {!collapsed && <span>Configurações</span>}
        </NavLink>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-input bg-brand flex-shrink-0 flex items-center justify-center">
            <span className="font-display font-bold text-dark text-xs">{initials(user?.name || '')}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user?.name}</div>
              <div className="text-brand text-[10px] font-mono uppercase">{user?.role}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors p-1">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
