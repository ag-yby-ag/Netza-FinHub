import { useState, useEffect, useCallback } from 'react';
import type { KPIsData, CategoryBreakdown, CostsData, TrendEntry, RecentData } from '../types/dashboard';
import * as dashboardService from '../services/dashboard';

export interface DashboardData {
  kpis: KPIsData | null;
  categories: CategoryBreakdown[];
  costs: CostsData | null;
  trends: TrendEntry[];
  recent: RecentData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): DashboardData {
  const [kpis, setKpis] = useState<KPIsData | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [costs, setCosts] = useState<CostsData | null>(null);
  const [trends, setTrends] = useState<TrendEntry[]>([]);
  const [recent, setRecent] = useState<RecentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [kpiData, categoryData, costData, trendData, recentData] =
        await Promise.all([
          dashboardService.getKPIs(),
          dashboardService.getCategories(),
          dashboardService.getCosts(),
          dashboardService.getTrends(),
          dashboardService.getRecent(10),
        ]);

      setKpis(kpiData);
      setCategories(categoryData);
      setCosts(costData);
      setTrends(trendData);
      setRecent(recentData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { kpis, categories, costs, trends, recent, loading, error, refetch: fetchAll };
}
