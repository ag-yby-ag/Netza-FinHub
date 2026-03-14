import React, { useState } from 'react';
import { CheckCircle2, Shield, Upload } from 'lucide-react';
import type { User, Permission } from '../../types/auth';
import * as authService from '../../services/auth';

const ROLE_LABELS: Record<string, string> = {
  master: 'Master Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  viewer: 'Visualizador',
};

const MODULE_LABELS: Record<string, string> = {
  suppliers: 'Fornecedores',
  uploads: 'Uploads',
  reports: 'Relatórios',
  settings: 'Configurações',
  users: 'Usuários',
  ai: 'IA',
};

const DEPARTMENTS = ['Operações', 'Marketing', 'Tecnologia', 'Financeiro', 'RH', 'Comercial'];
const TIMEZONES = [
  { label: 'Brasília (UTC-3)', value: 'America/Sao_Paulo' },
  { label: 'Manaus (UTC-4)', value: 'America/Manaus' },
  { label: 'Belém (UTC-3)', value: 'America/Belem' },
  { label: 'Fortaleza (UTC-3)', value: 'America/Fortaleza' },
  { label: 'Rio Branco (UTC-5)', value: 'America/Rio_Branco' },
];

function getPermissionLevel(perm: Permission): { label: string; color: string } {
  const { can_view, can_create, can_edit, can_delete } = perm;
  if (can_view && can_create && can_edit && can_delete) {
    return { label: 'Acesso total', color: 'text-[#4BA846]' };
  }
  if (can_view && (can_create || can_edit)) {
    return { label: 'Edição parcial', color: 'text-[#A16207]' };
  }
  if (can_view) {
    return { label: 'Apenas visualizar', color: 'text-[#737373]' };
  }
  return { label: 'Sem acesso', color: 'text-[#DC2626]' };
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

interface ProfileTabProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, onUserUpdate }) => {
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? '',
    department: user.department ?? '',
    job_title: user.job_title ?? '',
    timezone: user.timezone ?? 'America/Sao_Paulo',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await authService.updateProfile({
        name: form.name,
        phone: form.phone || undefined,
        department: form.department || undefined,
        job_title: form.job_title || undefined,
        timezone: form.timezone,
      });
      onUserUpdate(updated as User);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar + identity */}
      <div className="flex items-start gap-5 rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <div className="relative">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-[#0D0D0D] dark:bg-[#262626]">
            <span className="font-['Space_Grotesk'] text-2xl font-bold text-[#6DED67]">
              {getInitials(user.name)}
            </span>
          </div>
          <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#6DED67] transition-colors hover:bg-[#4BA846]">
            <Upload size={12} className="text-[#0D0D0D]" />
          </button>
        </div>
        <div className="flex-1">
          <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#0D0D0D] dark:text-white">
            {user.name}
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
            {user.email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#0D0D0D] px-3 py-0.5 font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#6DED67] dark:bg-[#262626]">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8FDE7] px-3 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#4BA846] dark:bg-[rgba(109,237,103,0.08)] dark:text-[#6DED67]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#4BA846] dark:bg-[#6DED67]" />
              Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
        <h3 className="mb-5 font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
          Informações pessoais
        </h3>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/20">
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Nome completo
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            />
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              E-mail
            </label>
            <input
              value={user.email}
              readOnly
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] outline-none dark:border-[#404040] dark:bg-[#262626] dark:text-[#A3A3A3]"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Telefone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            />
          </div>

          {/* Job title */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Cargo
            </label>
            <input
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              placeholder="Diretor de Operações"
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            />
          </div>

          {/* Department */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Departamento
            </label>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            >
              <option value="">Selecionar...</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373]">
              Fuso horário
            </label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
            >
              {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-sm text-[#4BA846]">
              <CheckCircle2 size={16} />
              Salvo!
            </span>
          )}
          <button
            onClick={() => setForm({ name: user.name, phone: user.phone ?? '', department: user.department ?? '', job_title: user.job_title ?? '', timezone: user.timezone })}
            className="rounded-full border border-[#E5E5E5] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#F2F2F2] dark:border-[#404040] dark:text-white dark:hover:bg-[#262626]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#6DED67] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#0D0D0D] transition-colors hover:bg-[#4BA846] disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Permissions card */}
      {user.permissions && user.permissions.length > 0 && (
        <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={16} className="text-[#6DED67]" />
            <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#0D0D0D] dark:text-white">
              Permissões
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {user.permissions.map((perm) => {
              const lvl = getPermissionLevel(perm);
              return (
                <div key={perm.module} className="rounded-xl border border-[#F2F2F2] p-3 dark:border-[#262626]">
                  <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#A3A3A3]">
                    {MODULE_LABELS[perm.module] ?? perm.module}
                  </p>
                  <p className={`mt-1 font-['Plus_Jakarta_Sans'] text-xs font-semibold ${lvl.color}`}>
                    {lvl.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
