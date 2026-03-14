import type { SystemSettings } from '../types/auth';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('netza-finhub-token');
}

async function settingsRequest<T>(method: string, endpoint: string, body?: object): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? 'Erro');
  return json.data as T;
}

export function getSettings(): Promise<SystemSettings> {
  return settingsRequest<SystemSettings>('GET', '/settings');
}

export function updateSetting(key: string, value: string): Promise<{ key: string; value: string }> {
  return settingsRequest('PUT', `/settings/${key}`, { value });
}

export function updateSettings(updates: Record<string, string>): Promise<Record<string, string>> {
  return settingsRequest('PUT', '/settings', updates);
}

export function clearCache(): Promise<{ message: string }> {
  return settingsRequest('POST', '/settings/clear-cache');
}

export function resetDatabase(confirmation: string): Promise<{ message: string }> {
  return settingsRequest('POST', '/settings/reset-db', { confirmation });
}

export function exportAll(): Promise<object> {
  return settingsRequest('POST', '/settings/export-all');
}
