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

export interface SupplierCreate {
  name: string;
  cnpj?: string;
  category: string;
  subcategory?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  state?: string;
  avg_price?: number;
  delivery_days?: number;
  payment_terms?: string;
}

export interface SupplierUpdate extends Partial<SupplierCreate> {
  status?: Supplier['status'];
  risk_level?: Supplier['risk_level'];
}

export interface SupplierQuote {
  id: number;
  supplier_id: number;
  item_description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  valid_until: string | null;
  uploaded_from: string | null;
  created_at: string;
}

export interface Review {
  id: number;
  supplier_id: number;
  rating: number;
  quality_score: number | null;
  delivery_score: number | null;
  price_score: number | null;
  comment: string | null;
  reviewer: string | null;
  created_at: string;
}
