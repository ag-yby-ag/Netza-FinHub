import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Settings, Bell, Shield, Server, Eye, EyeOff,
  Save, AlertTriangle, Trash2, RefreshCw, Moon, Sun,
  CheckCircle, Loader2
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/ui/Toast'
import Toggle from '../components/ui/Toggle'
import { cn, initials } from '../lib/utils'

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'preferences', label: 'Preferências', icon: Settings },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'system', label: 'Sistema', icon: Server, masterOnly: true },
]

interface ProfileForm {
  name: string
  email: string
  phone: string
  job_title: string
  department: string
}

interface PasswordForm {
  current_password: string
  new_password: string
  confirm_password: string
}

interface NotifPrefs {
  email_quotes: boolean
  email_uploads: boolean
  email_reports: boolean
  email_system: boolean
  push_quotes: boolean
  push_uploads: boolean
}

interface SystemSettings {
  app_name: string
  max_upload_mb: string
  ai_enabled: string
  session_timeout: string
  maintenance_mode: string
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth() as any
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile state
  const [profile, setProfile] = useState<ProfileForm>({
    name: '', email: '', phone: '', job_title: '', department: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Password state
  const [password, setPassword] = useState<PasswordForm>({
    current_password: '', new_password: '', confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Preferences state
  const [language, setLanguage] = useState('pt-BR')

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    email_quotes: true,
    email_uploads: true,
    email_reports: false,
    email_system: true,
    push_quotes: true,
    push_uploads: false,
  })
  const [notifLoading, setNotifLoading] = useState(false)

  // System settings
  const [sysSettings, setSysSettings] = useState<SystemSettings>({
    app_name: 'NETZA FinHub',
    max_upload_mb: '10',
    ai_enabled: 'true',
    session_timeout: '24',
    maintenance_mode: 'false',
  })
  const [sysLoading, setSysLoading] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        job_title: user.job_title ?? '',
        department: user.department ?? '',
      })
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'system' && user?.role === 'master') {
      loadSystemSettings()
    }
    if (activeTab === 'preferences') {
      loadPreferences()
    }
  }, [activeTab])

  const loadPreferences = async () => {
    try {
      const res = await api.get('/settings/preferences')
      const prefs: Record<string, string> = {}
      ;(res.data.data ?? []).forEach((p: { pref_key: string; pref_value: string }) => {
        prefs[p.pref_key] = p.pref_value
      })
      if (prefs.language) setLanguage(prefs.language)
    } catch {}
  }

  const loadSystemSettings = async () => {
    try {
      const res = await api.get('/settings/system')
      const settings: Record<string, string> = {}
      ;(res.data.data ?? []).forEach((s: { setting_key: string; setting_value: string }) => {
        settings[s.setting_key] = s.setting_value
      })
      setSysSettings(prev => ({ ...prev, ...settings }))
    } catch {}
  }

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      await api.put('/auth/me', profile)
      if (refreshUser) await refreshUser()
      toast('success', 'Perfil atualizado!')
    } catch {
      toast('error', 'Erro ao salvar perfil')
    } finally {
      setProfileLoading(false)
    }
  }

  // Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.new_password !== password.confirm_password) {
      toast('error', 'As senhas não coincidem')
      return
    }
    if (password.new_password.length < 6) {
      toast('error', 'Nova senha deve ter ao menos 6 caracteres')
      return
    }
    setPasswordLoading(true)
    try {
      await api.put('/auth/me/password', {
        current_password: password.current_password,
        new_password: password.new_password,
      })
      toast('success', 'Senha alterada com sucesso!')
      setPassword({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err: any) {
      toast('error', err?.response?.data?.error ?? 'Erro ao alterar senha')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Save Preferences
  const handleSavePreferences = async () => {
    try {
      await api.put('/settings/preferences', [
        { key: 'language', value: language },
        { key: 'theme', value: theme },
      ])
      toast('success', 'Preferências salvas!')
    } catch {
      toast('error', 'Erro ao salvar preferências')
    }
  }

  // Save Notification Prefs
  const handleSaveNotifPrefs = async () => {
    setNotifLoading(true)
    try {
      const prefs = Object.entries(notifPrefs).map(([key, value]) => ({ key, value: String(value) }))
      await api.put('/settings/preferences', prefs)
      toast('success', 'Preferências de notificação salvas!')
    } catch {
      toast('error', 'Erro ao salvar')
    } finally {
      setNotifLoading(false)
    }
  }

  // Save System Settings
  const handleSaveSystem = async () => {
    setSysLoading(true)
    try {
      const settings = Object.entries(sysSettings).map(([key, value]) => ({ key, value }))
      await api.put('/settings/system', settings)
      toast('success', 'Configurações do sistema salvas!')
    } catch {
      toast('error', 'Erro ao salvar configurações')
    } finally {
      setSysLoading(false)
    }
  }

  const visibleTabs = TABS.filter(t => !t.masterOnly || user?.role === 'master')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="label-mono text-white/40">MÓDULO</p>
        <h1 className="title-display text-2xl text-white">Configurações</h1>
        <p className="text-sm text-white/50 mt-1">Gerencie perfil, preferências e configurações do sistema</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar Nav */}
        <nav className="lg:w-52 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {visibleTabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-brand/10 border border-brand/30 text-brand'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-dark-card border border-white/5 rounded-card p-6 space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xl font-display font-bold">
                        {initials(user?.name ?? 'U')}
                      </div>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-white">{user?.name}</p>
                      <p className="text-sm text-white/40">{user?.email}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 mt-1 inline-block">
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label-mono text-white/40 mb-1.5 block">NOME COMPLETO</label>
                        <input
                          value={profile.name}
                          onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                          className="input-base w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-mono text-white/40 mb-1.5 block">E-MAIL</label>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                          className="input-base w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-mono text-white/40 mb-1.5 block">TELEFONE</label>
                        <input
                          value={profile.phone}
                          onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                          className="input-base w-full"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div>
                        <label className="label-mono text-white/40 mb-1.5 block">CARGO</label>
                        <input
                          value={profile.job_title}
                          onChange={e => setProfile(p => ({ ...p, job_title: e.target.value }))}
                          className="input-base w-full"
                          placeholder="Analista de Compras"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label-mono text-white/40 mb-1.5 block">DEPARTAMENTO</label>
                        <input
                          value={profile.department}
                          onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                          className="input-base w-full"
                          placeholder="Compras e Suprimentos"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={profileLoading} className="btn-primary">
                        {profileLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar Perfil</>}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <motion.div key="preferences" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-dark-card border border-white/5 rounded-card p-6 space-y-6">
                  <div>
                    <p className="label-mono text-white/40 mb-4">APARÊNCIA</p>
                    <div className="flex items-center justify-between p-4 bg-dark-soft rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        {theme === 'dark' ? <Moon className="w-5 h-5 text-info" /> : <Sun className="w-5 h-5 text-warning" />}
                        <div>
                          <p className="text-sm font-medium text-white">
                            {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                          </p>
                          <p className="text-xs text-white/40">
                            {theme === 'dark' ? 'Interface com fundo escuro' : 'Interface com fundo claro'}
                          </p>
                        </div>
                      </div>
                      <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
                    </div>
                  </div>

                  <div>
                    <p className="label-mono text-white/40 mb-3">IDIOMA</p>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="input-base w-full sm:w-64"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={handleSavePreferences} className="btn-primary">
                      <Save className="w-4 h-4" />
                      Salvar Preferências
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-dark-card border border-white/5 rounded-card p-6 space-y-6">
                  <NotifSection
                    title="E-MAIL"
                    description="Notificações enviadas para seu e-mail"
                    items={[
                      { key: 'email_quotes', label: 'Novos orçamentos', desc: 'Quando um orçamento é criado ou atualizado' },
                      { key: 'email_uploads', label: 'Uploads processados', desc: 'Quando um arquivo é processado com sucesso' },
                      { key: 'email_reports', label: 'Relatórios prontos', desc: 'Quando um relatório gerado está disponível' },
                      { key: 'email_system', label: 'Alertas do sistema', desc: 'Avisos importantes de segurança e manutenção' },
                    ]}
                    prefs={notifPrefs}
                    setPrefs={setNotifPrefs}
                  />
                  <NotifSection
                    title="PUSH"
                    description="Notificações no navegador"
                    items={[
                      { key: 'push_quotes', label: 'Orçamentos urgentes', desc: 'Orçamentos com prazo de validade próximo' },
                      { key: 'push_uploads', label: 'Upload concluído', desc: 'Resultado do processamento de arquivos' },
                    ]}
                    prefs={notifPrefs}
                    setPrefs={setNotifPrefs}
                  />
                  <div className="flex justify-end">
                    <button onClick={handleSaveNotifPrefs} disabled={notifLoading} className="btn-primary">
                      {notifLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-dark-card border border-white/5 rounded-card p-6 space-y-6">
                  <div>
                    <p className="label-mono text-white/40 mb-1">ALTERAR SENHA</p>
                    <p className="text-xs text-white/30 mb-4">Escolha uma senha forte com ao menos 6 caracteres</p>

                    <form onSubmit={handleSavePassword} className="space-y-4">
                      {([
                        { label: 'SENHA ATUAL', key: 'current_password' as const, fieldKey: 'current' as const },
                        { label: 'NOVA SENHA', key: 'new_password' as const, fieldKey: 'new' as const },
                        { label: 'CONFIRMAR NOVA SENHA', key: 'confirm_password' as const, fieldKey: 'confirm' as const },
                      ]).map(({ label, key, fieldKey }) => (
                        <div key={key}>
                          <label className="label-mono text-white/40 mb-1.5 block">{label}</label>
                          <div className="relative">
                            <input
                              type={showPasswords[fieldKey] ? 'text' : 'password'}
                              value={password[key]}
                              onChange={e => setPassword(p => ({ ...p, [key]: e.target.value }))}
                              required
                              className="input-base w-full pr-10"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(s => ({ ...s, [fieldKey]: !s[fieldKey] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                            >
                              {showPasswords[fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Password strength */}
                      {password.new_password && (
                        <div>
                          <div className="flex gap-1 mb-1">
                            {[1,2,3,4].map(i => (
                              <div
                                key={i}
                                className={cn(
                                  'h-1 flex-1 rounded-full transition-all',
                                  password.new_password.length >= i * 3
                                    ? i <= 2 ? 'bg-error' : i === 3 ? 'bg-warning' : 'bg-brand'
                                    : 'bg-white/10'
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-white/30">
                            {password.new_password.length < 6 ? 'Fraca'
                             : password.new_password.length < 10 ? 'Moderada'
                             : 'Forte'}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button type="submit" disabled={passwordLoading} className="btn-primary">
                          {passwordLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Alterando...</> : <><Shield className="w-4 h-4" />Alterar Senha</>}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Sessions info */}
                  <div className="border-t border-white/5 pt-5">
                    <p className="label-mono text-white/40 mb-3">SESSÃO ATIVA</p>
                    <div className="p-4 bg-dark-soft rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">Sessão atual</p>
                        <p className="text-xs text-white/40">Navegador Web · Token válido por 24h</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-brand" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* System Tab — master only */}
            {activeTab === 'system' && user?.role === 'master' && (
              <motion.div key="system" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* System Settings */}
                <div className="bg-dark-card border border-white/5 rounded-card p-6 space-y-5">
                  <p className="label-mono text-white/40">CONFIGURAÇÕES DO SISTEMA</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label-mono text-white/40 mb-1.5 block">NOME DO APLICATIVO</label>
                      <input
                        value={sysSettings.app_name}
                        onChange={e => setSysSettings(s => ({ ...s, app_name: e.target.value }))}
                        className="input-base w-full"
                      />
                    </div>
                    <div>
                      <label className="label-mono text-white/40 mb-1.5 block">MÁXIMO UPLOAD (MB)</label>
                      <input
                        type="number"
                        min={1} max={100}
                        value={sysSettings.max_upload_mb}
                        onChange={e => setSysSettings(s => ({ ...s, max_upload_mb: e.target.value }))}
                        className="input-base w-full"
                      />
                    </div>
                    <div>
                      <label className="label-mono text-white/40 mb-1.5 block">TIMEOUT DE SESSÃO (h)</label>
                      <input
                        type="number" min={1} max={72}
                        value={sysSettings.session_timeout}
                        onChange={e => setSysSettings(s => ({ ...s, session_timeout: e.target.value }))}
                        className="input-base w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-soft rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm text-white font-medium">IA Habilitada</p>
                        <p className="text-xs text-white/40">Análises com Groq API</p>
                      </div>
                      <Toggle
                        checked={sysSettings.ai_enabled === 'true'}
                        onChange={v => setSysSettings(s => ({ ...s, ai_enabled: String(v) }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-soft rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm text-white font-medium">Modo Manutenção</p>
                        <p className="text-xs text-white/40">Bloqueia acesso de não-masters</p>
                      </div>
                      <Toggle
                        checked={sysSettings.maintenance_mode === 'true'}
                        onChange={v => setSysSettings(s => ({ ...s, maintenance_mode: String(v) }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleSaveSystem} disabled={sysLoading} className="btn-primary">
                      {sysLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar Sistema</>}
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-error/5 border border-error/20 rounded-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-error" />
                    <p className="label-mono text-error">ZONA DE RISCO</p>
                  </div>
                  <p className="text-sm text-white/50">
                    Ações irreversíveis. Prossiga apenas se tiver certeza absoluta.
                    Digite <span className="font-mono text-error">CONFIRMAR</span> para habilitar as ações.
                  </p>
                  <input
                    value={resetConfirm}
                    onChange={e => setResetConfirm(e.target.value)}
                    placeholder="Digite CONFIRMAR para habilitar"
                    className="input-base w-full border-error/20 focus:border-error/50"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      disabled={resetConfirm !== 'CONFIRMAR'}
                      className="btn-danger flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={async () => {
                        try {
                          await api.delete('/settings/system/cache')
                          toast('success', 'Cache limpo com sucesso')
                          setResetConfirm('')
                        } catch {
                          toast('error', 'Erro ao limpar cache')
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Limpar Cache IA
                    </button>
                    <button
                      disabled={resetConfirm !== 'CONFIRMAR'}
                      className="btn-danger flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={async () => {
                        try {
                          await api.delete('/settings/system/exports')
                          toast('success', 'Arquivos de exportação removidos')
                          setResetConfirm('')
                        } catch {
                          toast('error', 'Erro ao limpar exports')
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpar Exports
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function NotifSection({ title, description, items, prefs, setPrefs }: {
  title: string
  description: string
  items: { key: keyof NotifPrefs; label: string; desc: string }[]
  prefs: NotifPrefs
  setPrefs: React.Dispatch<React.SetStateAction<NotifPrefs>>
}) {
  return (
    <div>
      <p className="label-mono text-white/40 mb-1">{title}</p>
      <p className="text-xs text-white/30 mb-3">{description}</p>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between p-3 bg-dark-soft rounded-xl border border-white/5">
            <div>
              <p className="text-sm text-white font-medium">{item.label}</p>
              <p className="text-xs text-white/40">{item.desc}</p>
            </div>
            <Toggle
              checked={prefs[item.key]}
              onChange={v => setPrefs(p => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default SettingsPage
