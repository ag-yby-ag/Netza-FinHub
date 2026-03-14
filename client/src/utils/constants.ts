import {
  LayoutDashboard,
  Search,
  Upload,
  Users,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ── Navigation ─────────────────────────────────────────────── */

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Buscar', path: '/search', icon: Search },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Upload', path: '/upload', icon: Upload },
      { label: 'Fornecedores', path: '/suppliers', icon: Users },
      { label: 'Relatórios', path: '/reports', icon: FileText },
      { label: 'Análises', path: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Configurações', path: '/settings', icon: Settings },
    ],
  },
];

/* ── Categories ─────────────────────────────────────────────── */

export const CATEGORIES = [
  'Tecnologia',
  'Logística',
  'Escritório',
  'Marketing',
  'Jurídico',
  'RH',
  'Financeiro',
  'Infraestrutura',
  'Consultoria',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

/* ── Status ─────────────────────────────────────────────────── */

export const STATUS_CONFIG = {
  active: { label: 'Ativo', color: 'green' },
  pending: { label: 'Pendente', color: 'yellow' },
  blocked: { label: 'Bloqueado', color: 'red' },
  inactive: { label: 'Inativo', color: 'gray' },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

/* ── Risk levels ────────────────────────────────────────────── */

export const RISK_CONFIG = {
  low: { label: 'Baixo', color: 'green' },
  medium: { label: 'Médio', color: 'yellow' },
  high: { label: 'Alto', color: 'red' },
} as const;

export type RiskLevel = keyof typeof RISK_CONFIG;

/* ── Upload statuses ────────────────────────────────────────── */

export const UPLOAD_STATUS = {
  pending: { label: 'Pendente', color: 'yellow' },
  processing: { label: 'Processando', color: 'blue' },
  completed: { label: 'Concluído', color: 'green' },
  failed: { label: 'Falhou', color: 'red' },
  cancelled: { label: 'Cancelado', color: 'gray' },
} as const;
