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
  const q = req.query as Record<string, string>;

  // Accept both naming conventions from client
  const query      = q.q ?? '';
  const category   = q.category ?? '';
  const status     = q.status ?? '';
  const risk_level = q.risk_level ?? '';
  const rating_min = q.rating_min ?? q.min_rating ?? '';
  const price_min  = q.price_min ?? '';
  const price_max  = q.price_max ?? q.max_price ?? '';
  const delivery_max = q.delivery_max ?? q.max_delivery ?? '';
  const city       = q.city ?? '';
  const state      = q.state ?? '';
  const sort_by    = q.sort_by ?? q.sort ?? 'relevance';
  const page       = Number(q.page ?? '1');
  const limit      = Number(q.limit ?? '12');

  let where = '1=1';
  const params: unknown[] = [];

  if (query) {
    where += ' AND (s.name LIKE ? OR s.category LIKE ? OR s.subcategory LIKE ? OR s.city LIKE ? OR s.notes LIKE ?)';
    const like = `%${query}%`;
    params.push(like, like, like, like, like);
  }
  if (category) { where += ' AND s.category=?'; params.push(category); }
  if (status)   { where += ' AND s.status=?';   params.push(status); }
  if (risk_level) { where += ' AND s.risk_level=?'; params.push(risk_level); }
  if (rating_min) { where += ' AND s.rating>=?'; params.push(Number(rating_min)); }
  if (price_min)  { where += ' AND s.avg_price>=?'; params.push(Number(price_min)); }
  if (price_max)  { where += ' AND s.avg_price<=?'; params.push(Number(price_max)); }
  if (delivery_max) { where += ' AND s.delivery_days<=?'; params.push(Number(delivery_max)); }
  if (city)  { where += ' AND s.city LIKE ?';  params.push(`%${city}%`); }
  if (state) { where += ' AND s.state=?'; params.push(state); }

  const offset = (page - 1) * limit;
  const total = (db.prepare(`SELECT COUNT(*) as c FROM suppliers s WHERE ${where}`).get(...params) as { c: number }).c;

  const allMatches = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM quotes q WHERE q.supplier_id=s.id) as total_quotes,
      (SELECT COALESCE(SUM(total_price),0) FROM quotes q WHERE q.supplier_id=s.id AND q.status='approved') as total_volume,
      (SELECT MAX(created_at) FROM quotes q WHERE q.supplier_id=s.id) as last_activity
    FROM suppliers s WHERE ${where}
  `).all(...params) as Array<Record<string, unknown>>;

  // Calculate match scores
  const withScores = allMatches.map(s => ({
    ...s,
    match_score: calculateMatchScore(s as Parameters<typeof calculateMatchScore>[0], query),
  }));

  // Sort
  if (sort_by === 'relevance') withScores.sort((a, b) => (b.match_score as number) - (a.match_score as number));
  else if (sort_by === 'rating') withScores.sort((a, b) => (b.rating as number) - (a.rating as number));
  else if (sort_by === 'price_asc') withScores.sort((a, b) => (a.avg_price as number) - (b.avg_price as number));
  else if (sort_by === 'volume_desc') withScores.sort((a, b) => (b.total_volume as number) - (a.total_volume as number));
  else if (sort_by === 'delivery_asc') withScores.sort((a, b) => (a.delivery_days as number) - (b.delivery_days as number));

  const paginated = withScores.slice(offset, offset + limit);

  // Facets
  const allSuppliers = db.prepare(`SELECT category, risk_level, state FROM suppliers s WHERE ${where}`).all(...params) as Array<{ category: string; risk_level: string; state: string }>;
  const catMap = new Map<string, number>();
  const riskMap = new Map<string, number>();
  const stateMap = new Map<string, number>();
  for (const s of allSuppliers) {
    if (s.category) catMap.set(s.category, (catMap.get(s.category) || 0) + 1);
    if (s.risk_level) riskMap.set(s.risk_level, (riskMap.get(s.risk_level) || 0) + 1);
    if (s.state) stateMap.set(s.state, (stateMap.get(s.state) || 0) + 1);
  }

  const facets = {
    categories: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    risk_levels: Array.from(riskMap.entries()).map(([risk_level, count]) => ({ risk_level, count })),
    states: Array.from(stateMap.entries()).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count),
  };

  return res.json({
    success: true,
    data: { suppliers: paginated, facets, total },
    meta: { page, total, limit },
  });
});

export default router;
