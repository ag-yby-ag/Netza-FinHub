import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { getSuppliers, type GetSuppliersParams } from '../services/suppliers';
import type { Supplier } from '../types/supplier';

export interface SupplierFilters {
  search: string;
  category: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const DEFAULT_FILTERS: SupplierFilters = {
  search: '',
  category: '',
  status: '',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 10,
};

export interface UseSuppliersReturn {
  suppliers: Supplier[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: SupplierFilters;
  setFilters: React.Dispatch<React.SetStateAction<SupplierFilters>>;
  refetch: () => void;
}

export function useSuppliers(initialFilters?: Partial<SupplierFilters>): UseSuppliersReturn {
  const [filters, setFilters] = useState<SupplierFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 350);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: GetSuppliersParams = {
        page: filters.page,
        limit: filters.limit,
        sort: `${filters.sortBy}:${filters.sortOrder}`,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;

      const response = await getSuppliers(params);
      setSuppliers(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.total_pages);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar fornecedores';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.sortBy, filters.sortOrder, filters.category, filters.status, debouncedSearch]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setFilters((prev) => (prev.page !== 1 ? { ...prev, page: 1 } : prev));
  }, [debouncedSearch, filters.category, filters.status]);

  return {
    suppliers,
    total,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchSuppliers,
  };
}
