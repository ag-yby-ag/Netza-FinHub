import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Search, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { NAV_GROUPS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS: Record<string, string> = {
  master: 'MASTER',
  admin: 'ADMIN',
  manager: 'MANAGER',
  viewer: 'VIEWER',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const { user, logout } = useAuth();

  return (
    <aside
      className={clsx(
        'relative flex h-screen shrink-0 flex-col border-r border-[#262626] bg-[#0D0D0D] transition-[width] duration-300',
        collapsed ? 'w-16' : 'w-[280px]',
      )}
    >
      {/* Radial gradient accent */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-60 w-60"
        style={{
          background: 'radial-gradient(circle at top right, rgba(109,237,103,0.08), transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className={clsx('relative z-10 flex items-center px-5 pt-6 pb-2', collapsed && 'justify-center px-2')}>
        {!collapsed ? (
          <div>
            <h1 className="font-['Space_Grotesk'] text-xl font-bold leading-none">
              <span className="text-white">NETZA</span>
              <span className="text-[#6DED67]">&amp;</span>
              <span className="text-white">CO</span>
            </h1>
            <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.15em] text-[#737373]">
              FINHUB
            </span>
          </div>
        ) : (
          <span className="font-['Space_Grotesk'] text-lg font-bold text-[#6DED67]">N</span>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="relative z-10 px-4 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#262626] bg-transparent py-2 pl-9 pr-3 font-['Plus_Jakarta_Sans'] text-xs text-white placeholder:text-[#525252] outline-none transition-colors focus:border-[#6DED67]"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <span className="mb-1.5 block px-3 font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.15em] text-[#737373]">
                {group.label}
              </span>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 transition-colors duration-150',
                        collapsed && 'justify-center px-0 border-l-0',
                        isActive
                          ? 'border-l-[#6DED67] bg-[rgba(109,237,103,0.05)] text-[#6DED67]'
                          : 'border-l-transparent text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.04)] hover:text-white',
                      )
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!collapsed && (
                      <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      {user && (
        <div className="relative z-10 border-t border-[#262626]">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 px-2 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#6DED67]/10">
                <span className="font-['Space_Grotesk'] text-xs font-bold text-[#6DED67]">
                  {getInitials(user.name)}
                </span>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-red-400"
                title="Sair"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#6DED67]/10">
                <span className="font-['Space_Grotesk'] text-xs font-bold text-[#6DED67]">
                  {getInitials(user.name)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-white">
                  {user.name}
                </p>
                <p className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-[0.08em] text-[#6DED67]">
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
              <button
                onClick={logout}
                className="shrink-0 rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-red-400"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <div className="relative z-10 border-t border-[#262626] p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[#737373] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-white',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && (
            <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium">Recolher</span>
          )}
        </button>
      </div>
    </aside>
  );
};
