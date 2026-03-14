export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface SelectOption {
  label: string;
  value: string;
}
