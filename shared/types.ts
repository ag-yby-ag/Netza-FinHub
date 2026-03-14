// ===== Shared TypeScript Types for Netza FinHub =====

export interface Supplier {
  id: number;
  name: string;
  cnpj: string | null;
  category: string;
  subcategory: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  state: string | null;
  avg_price: number | null;
  rating: number;
  rating_count: number;
  delivery_days: number | null;
  payment_terms: string | null;
  status: 'active' | 'inactive' | 'blocked' | 'pending';
  risk_level: 'low' | 'medium' | 'high';
  notes: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: number;
  supplier_id: number;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  valid_until: string | null;
  category: string | null;
  requested_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: number;
  filename: string;
  original_name: string;
  file_type: 'csv' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_rows: number;
  processed_rows: number;
  error_rows: number;
  errors: string | null;
  preview_data: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  supplier_id: number;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  pros: string | null;
  cons: string | null;
  would_recommend: boolean;
  created_at: string;
}

export interface AIInsight {
  id: number;
  type: 'cost_optimization' | 'risk_alert' | 'supplier_recommendation' | 'trend_analysis' | 'general';
  title: string;
  summary: string;
  details: string | null;
  context: string | null;
  confidence: number;
  impact_level: 'low' | 'medium' | 'high';
  status: 'new' | 'read' | 'dismissed' | 'actioned';
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  supplier_count: number;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface DashboardKPIs {
  total_suppliers: number;
  active_suppliers: number;
  avg_rating: number;
  total_quotes_value: number;
  pending_quotes_count: number;
  blocked_suppliers: number;
  avg_delivery_days: number;
}
