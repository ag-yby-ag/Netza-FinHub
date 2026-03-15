import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';

export interface AnalyticsSummary {
  total_volume: number;
  savings: number;
  avg_ticket: number;
  active_suppliers: number;
  total_quotes: number;
  volume_change_pct: number;
  savings_change_pct: number;
  ticket_change_pct: number;
  suppliers_change: number;
}

export interface MonthPoint {
  period: string;
  volume: number;
  quote_count?: number;
  approved_count?: number;
  avg_ticket?: number;
}

export interface CategoryData {
  category: string;
  supplier_count: number;
  quote_count: number;
  total_spend: number;
  avg_ticket: number;
  avg_rating: number;
  spend_pct: number;
  trend: 'up' | 'down' | 'stable';
  savings: number;
}

export interface RankingItem {
  id: number;
  name: string;
  category: string;
  rating: number;
  status: string;
  quote_count: number;
  total_volume: number;
  avg_ticket: number;
  volume_pct: number;
  savings: number;
}

export interface AIInsight {
  insight: string;
  highlights: string[];
  recommendations: string[];
}

function getPeriodDates(period: string) {
  const now = new Date();
  const months = period === 'month' ? 1 : period === 'quarter' ? 3 : period === 'semester' ? 6 : 12;
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
  };
}

interface UseAnalyticsFilters {
  period: string;
  category: string;
  rankSort: 'volume' | 'rating' | 'savings';
}

export function useAnalytics(filters: UseAnalyticsFilters) {
  const { period, category, rankSort } = filters;

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthPoint[]>([]);
  const [forecast, setForecast] = useState<MonthPoint[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => getPeriodDates(period), [period]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start_date: dates.start_date,
        end_date: dates.end_date,
        ...(category ? { category } : {}),
      });

      const [sumRes, trendRes, catRes, rankRes] = await Promise.all([
        api.get(`/analytics/summary?${params}`),
        api.get(`/analytics/trends?${params}`),
        api.get(`/analytics/categories?${params}`),
        api.get(`/analytics/suppliers/ranking?${params}&sort_by=${rankSort}&limit=10`),
      ]);

      setSummary(sumRes.data.data);
      setMonthly(trendRes.data.data?.monthly ?? []);
      setForecast(trendRes.data.data?.forecast ?? []);
      setCategories(catRes.data.data ?? []);
      setRanking(rankRes.data.data ?? []);
    } catch {
      setError('Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAI = async () => {
    setAiLoading(true);
    try {
      const params = new URLSearchParams({ period, ...(category ? { category } : {}) });
      const res = await api.get(`/analytics/ai-insight?${params}`);
      setAiInsight(res.data.data);
    } catch { /* ignore */ }
    finally { setAiLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [period, category, rankSort]); // eslint-disable-line
  useEffect(() => { fetchAI(); }, [period, category]); // eslint-disable-line

  return {
    summary,
    monthly,
    forecast,
    categories,
    ranking,
    aiInsight,
    loading,
    aiLoading,
    error,
    dates,
    refetch: fetchAll,
  };
}
