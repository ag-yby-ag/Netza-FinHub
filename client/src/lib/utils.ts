import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(date: string | Date): string {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatRelativeTime(date: string | Date): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-brand-dark bg-brand-subtle',
    approved: 'text-brand-dark bg-brand-subtle',
    completed: 'text-brand-dark bg-brand-subtle',
    inactive: 'text-gray-500 bg-gray-100',
    pending: 'text-yellow-700 bg-yellow-50',
    processing: 'text-blue-700 bg-blue-50',
    rejected: 'text-red-600 bg-red-50',
    blocked: 'text-red-600 bg-red-50',
    error: 'text-red-600 bg-red-50',
    expired: 'text-gray-500 bg-gray-100',
    partial: 'text-yellow-700 bg-yellow-50',
  };
  return map[status] || 'text-gray-500 bg-gray-100';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Ativo', inactive: 'Inativo', pending: 'Pendente',
    blocked: 'Bloqueado', approved: 'Aprovado', rejected: 'Rejeitado',
    expired: 'Expirado', completed: 'Concluído', processing: 'Processando',
    error: 'Erro', partial: 'Parcial', low: 'Baixo', medium: 'Médio', high: 'Alto',
  };
  return map[status] || status;
}

export function getRiskColor(risk: string): string {
  return risk === 'high' ? 'text-red-600 bg-red-50'
    : risk === 'medium' ? 'text-yellow-700 bg-yellow-50'
    : 'text-green-700 bg-green-50';
}

export function truncate(str: string, maxLength = 40): string {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

export function initials(name: string): string {
  return name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '??';
}
