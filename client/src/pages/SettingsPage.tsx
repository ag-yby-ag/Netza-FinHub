import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Sliders, Bell, Lock, Settings2, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import { useTheme } from '../hooks/useTheme';
import ProfileTab from './settings/ProfileTab';
import PreferencesTab from './settings/PreferencesTab';
import NotificationsTab from './settings/NotificationsTab';
import SecurityTab from './settings/SecurityTab';
import SystemTab from './settings/SystemTab';
import type { User as UserType } from '../types/auth';

type Tab = 'perfil' | 'preferencias' | 'notificacoes' | 'seguranca' | 'sistema';

const TABS: { id: Tab; label: string; icon: React.ReactNode; masterOnly?: boolean }[] = [
  { id: 'perfil', label: 'Meu Perfil', icon: <User size={16} /> },
  { id: 'preferencias', label: 'Preferências', icon: <Sliders size={16} /> },
  { id: 'notificacoes', label: 'Notificações', icon: <Bell size={16} /> },
  { id: 'seguranca', label: 'Segurança', icon: <Lock size={16} /> },
  { id: 'sistema', label: 'Sistema', icon: <Settings2 size={16} />, masterOnly: true },
];

const SettingsPage: React.FC = () => {
  const { user, refreshUser, isMaster } = useAuth();
  const { preferences, updatePreference } = usePreferences(!!user);
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync theme pref in real time
  useEffect(() => {
    if (preferences.theme === 'dark' || preferences.theme === 'light') {
      setTheme(preferences.theme);
    }
  }, [preferences.theme, setTheme]);

  const handleUserUpdate = (updated: UserType) => {
    refreshUser();
    showSuccess('Perfil salvo com sucesso');
    void updated;
  };

  const handlePrefUpdate = (key: string, value: string) => {
    updatePreference(key, value);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const visibleTabs = TABS.filter((t) => !t.masterOnly || isMaster);

  if (!user) return null;

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
          Configurações
        </h1>
        <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
          Gerencie seu perfil, preferências e configurações do sistema
        </p>
      </div>

      {/* Success toast */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800/50 dark:bg-green-900/20"
        >
          <CheckCircle2 size={18} className="shrink-0 text-[#4BA846]" />
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#4BA846]">{successMsg}</p>
        </motion.div>
      )}

      {/* Tabs nav */}
      <div className="border-b border-[#E5E5E5] dark:border-[#262626]">
        <div className="flex gap-0 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-["Plus_Jakarta_Sans"] text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-[#6DED67] text-[#0D0D0D] dark:text-white'
                  : 'border-transparent text-[#737373] hover:text-[#0D0D0D] dark:text-[#A3A3A3] dark:hover:text-white',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'perfil' && (
          <ProfileTab user={user} onUserUpdate={handleUserUpdate} />
        )}
        {activeTab === 'preferencias' && (
          <PreferencesTab preferences={preferences} onUpdate={handlePrefUpdate} />
        )}
        {activeTab === 'notificacoes' && (
          <NotificationsTab preferences={preferences} onUpdate={handlePrefUpdate} />
        )}
        {activeTab === 'seguranca' && (
          <SecurityTab />
        )}
        {activeTab === 'sistema' && isMaster && (
          <SystemTab onSuccess={showSuccess} />
        )}
      </motion.div>
    </motion.div>
  );
};

export default SettingsPage;
