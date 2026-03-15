import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { calculateMatchScore } from '../services/searchService';

const router = Router();
router.use(verifyToken);

// GET /api/search/global?q=
router.get('/global', (req: AuthRequest, res: Response) => {
  const { q = '', limit = '5' } = req.query as Record<string, string>;
  if (!q.trim()) return res.json({ success: true, data: { suppliers: [], quotes: [], uploads: [] } });

  const like = `%${q}%`;
  const lim = Number(limit);

  const suppliers = db.prepare(`
    SELECT id, name, category, rating, status FROM suppliers
    WHERE name LIKE ? OR category LIKE ? OR cnpj LIKE ? LIMIT ?
  `).all(like, like, like, lim);

  const quotes = db.prepare(`
    SELECT q.id, q.item_description, q.total_price, q.status, s.name as supplier_name
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.item_description LIKE ? OR s.name LIKE ? LIMIT ?
  `).all(like, like, lim);

  const uploads = db.prepare(`
    SELECT id, original_name, rows_total, status FROM uploads
    WHERE original_name LIKE ? LIMIT ?
  `).all(like, lim);

  return res.json({ success: true, data: { suppliers, quotes, uploads } });
});

// GET /api/search/suppliers
router.get('/suppliers', (req: AuthRequest, res: Response) => {
  const {
    q = '', category, status, risk_level,
    rating_min, price_min, price_max, delivery_max, city, state,
    sort_by = 'relevance', page = '1', limit = '20',
  } = req.query as Record<string, string>;

  let where = '1=1';
  const params: unknown[] = [];

  if (q) {
    where += ' AND (s.name LIKE ? OR s.category LIKE ? OR s.subcategory LIKE ? OR s.city LIKE ? OR s.notes LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  if (category) { where += ' AND s.category=?'; params.push(category); }
  if (status) { where += ' AND s.status=?'; params.push(status); }
  if (risk_level) { where += ' AND s.risk_level=?'; params.push(risk_level); }
  if (rating_min) { where += ' AND s.rating>=?'; params.push(Number(rating_min)); }
  if (price_min) { where += ' AND s.avg_price>=?'; params.push(Number(price_min)); }
  if (price_max) { where += ' AND s.avg_price<=?'; params.push(Number(price_max)); }
  if (delivery_max) { where += ' AND s.delivery_days<=?'; params.push(Number(delivery_max)); }
  if (city) { where += ' AND s.city LIKE ?'; params.push(`%${city}%`); }
  if (state) { where += ' AND s.state=?'; params.push(state); }

  const offset = (Number(page) - 1) * Number(limit);
  const total = (db.prepare(`SELECT COUNT(*) as c FROM suppliers s WHERE ${where}`).get(...params) as { c: number }).c;

  const allMatches = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM quotes q WHERE q.supplier_id=s.id) as quote_count,
      (SELECT COALESCE(SUM(total_price),0) FROM quotes q WHERE q.supplier_id=s.id AND q.status='approved') as total_volume,
      (SELECT MAX(created_at) FROM quotes q WHERE q.supplier_id=s.id) as last_activity
    FROM suppliers s WHERE ${where}
  `).all(...params) as Array<Record<string, unknown>>;

  // Calculate match scores
  const withScores = allMatches.map(s => ({
    ...s,
    match_score: calculateMatchScore(s as Parameters<typeof calculateMatchScore>[0], q),
  }));

  // Sort
  if (sort_by === 'relevance') withScores.sort((a, b) => (b.match_score as number) - (a.match_score as number));
  else if (sort_by === 'rating') withScores.sort((a, b) => (b.rating as number) - (a.rating as number));
  else if (sort_by === 'price_asc') withScores.sort((a, b) => (a.avg_price as number) - (b.avg_price as number));
  else if (sort_by === 'price_desc') withScores.sort((a, b) => (b.avg_price as number) - (a.avg_price as number));
  else if (sort_by === 'volume') withScores.sort((a, b) => (b.total_volume as number) - (a.total_volume as number));
  else if (sort_by === 'delivery') withScores.sort((a, b) => (a.delivery_days as number) - (b.delivery_days as number));

  const paginated = withScores.slice(offset, offset + Number(limit));

  // Facets
  const allSuppliers = db.prepare(`SELECT category, status, city FROM suppliers s WHERE ${where}`).all(...params) as Array<{ category: string; status: string; city: string }>;
  const catMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  for (const s of allSuppliers) {
    catMap.set(s.category, (catMap.get(s.category) || 0) + 1);
    statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
    if (s.city) cityMap.set(s.city, (cityMap.get(s.city) || 0) + 1);
  }

  return res.json({
    success: true,
    data: paginated,
    meta: { page: Number(page), total, limit: Number(limit) },
    facets: {
      categories: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      statuses: Array.from(statusMap.entries()).map(([name, count]) => ({ name, count })),
      cities: Array.from(cityMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    },
  });
});

export default router;
