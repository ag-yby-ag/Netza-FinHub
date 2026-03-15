interface Supplier {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  city?: string;
  state?: string;
  notes?: string;
  rating: number;
  status: string;
}

export function calculateMatchScore(supplier: Supplier, query: string): number {
  if (!query) return 100;
  let score = 0;
  const q = query.toLowerCase();

  if (supplier.name.toLowerCase().includes(q)) score += 40;
  if (supplier.category.toLowerCase().includes(q)) score += 25;
  if (supplier.subcategory?.toLowerCase().includes(q)) score += 15;
  if (supplier.city?.toLowerCase().includes(q) || supplier.state?.toLowerCase().includes(q)) score += 10;
  if (supplier.notes?.toLowerCase().includes(q)) score += 5;
  if (supplier.rating >= 4.5) score += 5;
  if (supplier.status === 'active') score += 5;

  return Math.min(score, 100);
}
