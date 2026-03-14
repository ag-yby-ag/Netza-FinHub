import type { AuthSession, User, ActivityLog } from '../types/auth';

const API_BASE = '/api';
const TOKEN_KEY = 'netza-finhub-token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function authRequest<T>(
  method: string,
  endpoint: string,
  body?: object,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Erro na requisição');
  }
  return json.data as T;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return authRequest<AuthSession>('POST', '/auth/login', { email, password });
}

export async function logout(): Promise<void> {
  await authRequest<null>('POST', '/auth/logout').catch(() => {});
}

export async function getMe(): Promise<User> {
  return authRequest<User>('GET', '/auth/me');
}

export async function updateProfile(data: Partial<Pick<User, 'name' | 'phone' | 'department' | 'job_title' | 'timezone'>>): Promise<User> {
  return authRequest<User>('PUT', '/auth/me', data);
}

export async function changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
  return authRequest<{ message: string }>('PUT', '/auth/me/password', { current_password, new_password });
}

export async function getActivityLog(limit = 10): Promise<ActivityLog[]> {
  return authRequest<ActivityLog[]>('GET', `/settings/activity-log?limit=${limit}`);
}
