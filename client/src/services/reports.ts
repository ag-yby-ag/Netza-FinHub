const API_BASE = '/api';
const TOKEN_KEY = 'netza-finhub-token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function req<T>(method: string, endpoint: string, body?: object): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? 'Erro na requisição');
  return json.data as T;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: string;
  fields: string;
  filters: string;
  is_active: number;
  created_at: string;
}

export interface GeneratedReport {
  id: number;
  template_id: number;
  template_name: string;
  template_icon: string;
  name: string;
  format: 'xlsx' | 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  row_count: number;
  file_size: number | null;
  filters_used: string;
  generated_by_name: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReportSchedule {
  id: number;
  template_id: number;
  template_name: string;
  template_icon: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'xlsx' | 'csv' | 'pdf';
  filters: string;
  recipients: string;
  is_active: number;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

export interface ReportFilters {
  status?: string;
  category?: string;
  risk_level?: string;
  date_from?: string;
  date_to?: string;
  min_rating?: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<ReportTemplate[]> {
  return req<ReportTemplate[]>('GET', '/reports/templates');
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function previewReport(template_id: number, filters: ReportFilters): Promise<{ row_count: number; template_name: string }> {
  return req('POST', '/reports/preview', { template_id, filters });
}

export async function generateReport(
  template_id: number,
  format: 'xlsx' | 'csv' | 'pdf',
  filters: ReportFilters,
  name?: string,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ template_id, format, filters, name }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? 'Falha ao gerar relatório');
  }

  // Download the file
  const contentDisposition = res.headers.get('Content-Disposition') ?? '';
  const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/);
  const fileName = fileNameMatch?.[1] ?? `relatorio.${format}`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(params?: { page?: number; limit?: number; format?: string; status?: string }): Promise<{ data: GeneratedReport[]; meta: { page: number; total: number; total_pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.format) qs.set('format', params.format);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString() ? `?${qs.toString()}` : '';

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/reports/history${query}`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? 'Erro');
  return { data: json.data as GeneratedReport[], meta: json.meta };
}

export async function deleteReport(id: number): Promise<void> {
  return req('DELETE', `/reports/history/${id}`);
}

export async function downloadReport(id: number): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/reports/history/${id}/download`, { method: 'POST', headers });
  if (!res.ok) throw new Error('Falha ao baixar relatório');

  const contentDisposition = res.headers.get('Content-Disposition') ?? '';
  const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/);
  const fileName = fileNameMatch?.[1] ?? 'relatorio';

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export async function getSchedules(): Promise<ReportSchedule[]> {
  return req<ReportSchedule[]>('GET', '/reports/schedules');
}

export async function createSchedule(data: {
  template_id: number; name: string; frequency: 'daily' | 'weekly' | 'monthly';
  format: 'xlsx' | 'csv' | 'pdf'; filters: ReportFilters; recipients: string[];
}): Promise<ReportSchedule> {
  return req<ReportSchedule>('POST', '/reports/schedules', data);
}

export async function updateSchedule(id: number, data: Partial<{
  name: string; is_active: boolean; frequency: string; format: string;
  filters: ReportFilters; recipients: string[];
}>): Promise<ReportSchedule> {
  return req<ReportSchedule>('PUT', `/reports/schedules/${id}`, data);
}

export async function deleteSchedule(id: number): Promise<void> {
  return req('DELETE', `/reports/schedules/${id}`);
}
