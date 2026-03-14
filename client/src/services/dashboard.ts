import { get } from './api';
import type { KPIsData, CategoryBreakdown, CostsData, TrendEntry, RecentData } from '../types/dashboard';

export function getKPIs(): Promise<KPIsData> {
  return get<KPIsData>('/dashboard/kpis');
}

export function getCategories(): Promise<CategoryBreakdown[]> {
  return get<CategoryBreakdown[]>('/dashboard/categories');
}

export function getCosts(): Promise<CostsData> {
  return get<CostsData>('/dashboard/costs');
}

export function getTrends(): Promise<TrendEntry[]> {
  return get<TrendEntry[]>('/dashboard/trends');
}

export function getRecent(limit?: number): Promise<RecentData> {
  return get<RecentData>('/dashboard/recent', limit ? { limit } : undefined);
}
