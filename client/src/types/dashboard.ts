// ─── KPIs (GET /api/dashboard/kpis) ──────────────────────────────
export interface KPIsData {
  total_suppliers: number;
  active_suppliers: number;
  blocked_suppliers: number;
  avg_rating: number;
  total_quotes_value: number;
  pending_quotes_count: number;
  avg_delivery_days: number;
}

// ─── Categories (GET /api/dashboard/categories) ──────────────────
export interface CategoryBreakdown {
  name: string;
  color: string;
  icon: string;
  supplier_count: number;
  avg_rating: number;
  total_quotes_value: number;
}

// ─── Costs (GET /api/dashboard/costs) ────────────────────────────
export interface CostEntry {
  name: string;
  quote_count: number;
  total_amount: number;
  avg_amount: number;
}

export interface CostByStatus {
  status: string;
  count: number;
  total_amount: number;
}

export interface CostsData {
  by_category: CostEntry[];
  by_status: CostByStatus[];
}

// ─── Trends (GET /api/dashboard/trends) ──────────────────────────
export interface TrendEntry {
  month: string;
  quotes_count: number;
  quotes_value: number;
  new_suppliers: number;
  active_suppliers: number;
}

// ─── Recent (GET /api/dashboard/recent) ──────────────────────────
export interface RecentQuote {
  id: number;
  supplier_name: string;
  title: string;
  amount: number;
  status: string;
  category: string;
  created_at: string;
}

export interface RecentReview {
  id: number;
  supplier_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface RecentSupplier {
  id: number;
  name: string;
  category: string;
  status: string;
  created_at: string;
}

export interface RecentData {
  recent_quotes: RecentQuote[];
  recent_reviews: RecentReview[];
  recent_suppliers: RecentSupplier[];
}

// ─── Unified activity item (built client-side) ──────────────────
export interface ActivityItem {
  id: string;
  type: 'quote' | 'review' | 'supplier';
  title: string;
  description: string;
  created_at: string;
}
