const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: { page: number; total: number; limit: number };
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      // ignore parse errors
    }
    const message =
      (errorData as { error?: string })?.error ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json: ApiResponse<T> = await response.json();
  return json.data;
}

export function get<T>(endpoint: string, params?: RequestOptions['params']): Promise<T> {
  return request<T>(endpoint, { method: 'GET', params });
}

export async function getWithMeta<T>(
  endpoint: string,
  params?: RequestOptions['params'],
): Promise<{ data: T; meta?: { page: number; total: number; limit: number; total_pages: number } }> {
  const { body: _body, params: _params, headers: customHeaders, ...rest } = { method: 'GET', params } as RequestOptions;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: customHeaders as Record<string, string>,
  });

  if (!response.ok) {
    let errorData: unknown;
    try { errorData = await response.json(); } catch { /* */ }
    const message = (errorData as { error?: string })?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  const json = await response.json();
  return { data: json.data as T, meta: json.meta };
}

export function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, { method: 'POST', body });
}

export function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, { method: 'PUT', body });
}

export function del<T = void>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

export function upload<T>(endpoint: string, formData: FormData): Promise<T> {
  return request<T>(endpoint, { method: 'POST', body: formData });
}
