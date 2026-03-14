import { get, getWithMeta, post, put, del } from './api';
import type { Supplier, SupplierCreate, SupplierUpdate, SupplierQuote, Review } from '../types/supplier';

export interface GetSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
}

export interface SuppliersResponse {
  data: Supplier[];
  meta: { page: number; total: number; limit: number; total_pages: number };
}

export async function getSuppliers(params?: GetSuppliersParams): Promise<SuppliersResponse> {
  const result = await getWithMeta<Supplier[]>('/suppliers', params as Record<string, string | number>);
  return {
    data: result.data,
    meta: result.meta ?? { page: 1, total: 0, limit: 10, total_pages: 0 },
  };
}

export function getSupplier(id: number | string): Promise<Supplier> {
  return get<Supplier>(`/suppliers/${id}`);
}

export function createSupplier(data: SupplierCreate): Promise<Supplier> {
  return post<Supplier>('/suppliers', data);
}

export function updateSupplier(id: number | string, data: SupplierUpdate): Promise<Supplier> {
  return put<Supplier>(`/suppliers/${id}`, data);
}

export function deleteSupplier(id: number | string): Promise<void> {
  return del(`/suppliers/${id}`);
}

export function getSupplierQuotes(supplierId: number | string): Promise<SupplierQuote[]> {
  return get<SupplierQuote[]>(`/suppliers/${supplierId}/quotes`);
}

export function addReview(supplierId: number | string, review: Omit<Review, 'id' | 'supplier_id' | 'created_at'>): Promise<Review> {
  return post<Review>(`/suppliers/${supplierId}/reviews`, review);
}
