import type { Preferences } from '../types/auth';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('netza-finhub-token');
}

async function prefRequest<T>(method: string, endpoint: string, body?: object): Promise<T> {
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

export function getPreferences(): Promise<Preferences> {
  return prefRequest<Preferences>('GET', '/preferences');
}

export function updatePreference(key: string, value: string): Promise<{ key: string; value: string }> {
  return prefRequest('PUT', `/preferences/${key}`, { value });
}

export function updatePreferences(updates: Record<string, string>): Promise<Record<string, string>> {
  return prefRequest('PUT', '/preferences', updates);
}
