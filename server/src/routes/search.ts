import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// ── GET /api/search/global ──────────────────────────────────────────────────
router.get('/global', (req: AuthRequest, res: Response) => {
  const { q = '', limit = '5' } = req.query as Record<string, string>;
  if (!q || q.length < 2) {
    return res.json({ success: true, data: { suppliers: [], quotes: [], uploads: [] } });
  }

  const like = `%${q}%`;
  const lim = Number(limit);

  const suppliers = db.prepare(`
    SELECT id, name, category, rating, status, city, state
    FROM suppliers
    WHERE name LIKE ? OR cnpj LIKE ? OR category LIKE ?
    ORDER BY rating DESC LIMIT ?
  `).all(like, like, like, lim);

  const quotes = db.prepare(`
    SELECT q.id, q.item_description, q.total_price, q.status, s.name as supplier_name
    FROM quotes q JOIN suppliers s ON s.id = q.supplier_id
    WHERE q.item_description LIKE ? OR s.name LIKE ?
    ORDER BY q.created_at DESC LIMIT ?
  `).all(like, like, lim);

  const uploads = db.prepare(`
    SELECT id, original_name, rows_total, status, created_at
    FROM uploads WHERE original_name LIKE ?
    ORDER BY created_at DESC LIMIT ?
  `).all(like, lim);

  return res.json({ success: true, data: { suppliers, quotes, uploads } });
});

// ── GET /api/search/suppliers ───────────────────────────────────────────────
router.get('/suppliers', (req: AuthRequest, res: Response) => {
  const {
    q = '',
    category,
    status,
    rating_min,
    price_min,
    price_max,
    delivery_max,
    state,
    risk_level,
    sort_by = 'relevance',
    page = '1',
    limit = '12',
  } = req.query as Record<string, string>;

  const offset = (Number(page) - 1) * Number(limit);

  // Build WHERE clause (all columns use alias 's.')
  let where = 'WHERE 1=1';
  const fp: unknown[] = []; // filter params

  if (q) {
    where += ` AND (
      s.name LIKE ? OR s.category LIKE ? OR s.subcategory LIKE ?
      OR s.city LIKE ? OR s.state LIKE ? OR s.notes LIKE ? OR s.cnpj LIKE ?
    )`;
    const like = `%${q}%`;
    fp.push(like, like, like, like, like, like, like);
  }
  if (category)     { where += ' AND s.category = ?';    fp.push(category); }
  if (status)       { where += ' AND s.status = ?';      fp.push(status); }
  if (rating_min)   { where += ' AND s.rating >= ?';     fp.push(Number(rating_min)); }
  if (price_min)    { where += ' AND s.avg_price >= ?';  fp.push(Number(price_min)); }
  if (price_max)    { where += ' AND s.avg_price <= ?';  fp.push(Number(price_max)); }
  if (delivery_max) { where += ' AND s.delivery_days <= ?'; fp.push(Number(delivery_max)); }
  if (state)        { where += ' AND s.state = ?';       fp.push(state); }
  if (risk_level)   { where += ' AND s.risk_level = ?';  fp.push(risk_level); }

  // Count
  const totalRow = db.prepare(
    `SELECT COUNT(DISTINCT s.id) as total FROM suppliers s ${where}`
  ).get(...fp) as { total: number };

  // Score params (6 positional: name, category, subcategory, city, state, notes)
  const sl = q ? `%${q}%` : '%%';
  const sp = [sl, sl, sl, sl, sl, sl];

  // Order
  let orderBy = 'match_score DESC, s.rating DESC';
  if (sort_by === 'rating')     orderBy = 's.rating DESC';
  if (sort_by === 'price_asc')  orderBy = 's.avg_price ASC';
  if (sort_by === 'price_desc') orderBy = 's.avg_price DESC';
  if (sort_by === 'delivery')   orderBy = 's.delivery_days ASC';
  if (sort_by === 'volume')     orderBy = 'total_volume DESC';

  const rows = db.prepare(`
    SELECT s.*,
      COUNT(q.id) as quote_count,
      COALESCE(SUM(q.total_price), 0) as total_volume,
      MAX(q.created_at) as last_activity,
      (
        CASE WHEN s.name LIKE ? THEN 40 ELSE 0 END +
        CASE WHEN s.category LIKE ? THEN 25 ELSE 0 END +
        CASE WHEN s.subcategory LIKE ? THEN 15 ELSE 0 END +
        CASE WHEN s.city LIKE ? OR s.state LIKE ? THEN 10 ELSE 0 END +
        CASE WHEN s.notes LIKE ? THEN 5 ELSE 0 END +
        CASE WHEN s.rating >= 4.5 THEN 5 ELSE 0 END +
        CASE WHEN s.status = 'active' THEN 5 ELSE 0 END
      ) as match_score
    FROM suppliers s
    LEFT JOIN quotes q ON q.supplier_id = s.id
    ${where}
    GROUP BY s.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...sp, ...fp, Number(limit), offset) as Array<Record<string, unknown>>;

  // Facets (reuse same WHERE + fp)
  const facetCategories = db.prepare(
    `SELECT s.category as name, COUNT(*) as count FROM suppliers s ${where} GROUP BY s.category ORDER BY count DESC`
  ).all(...fp);

  const facetStatuses = db.prepare(
    `SELECT s.status as name, COUNT(*) as count FROM suppliers s ${where} GROUP BY s.status`
  ).all(...fp);

  const facetCities = db.prepare(
    `SELECT s.city || ', ' || s.state as name, COUNT(*) as count
     FROM suppliers s ${where} AND s.city IS NOT NULL AND s.state IS NOT NULL
     GROUP BY s.city, s.state ORDER BY count DESC LIMIT 10`
  ).all(...fp);

  return res.json({
    success: true,
    data: rows.map(s => ({ ...s, match_score: Math.min(Number(s.match_score) || 0, 100) })),
    meta: { page: Number(page), total: totalRow.total, limit: Number(limit) },
    facets: {
      categories: facetCategories,
      statuses:   facetStatuses,
      cities:     facetCities,
    },
  });
});

// ── POST /api/search/request-quote ─────────────────────────────────────────
router.post('/request-quote', (req: AuthRequest, res: Response) => {
  const { supplier_id, item_description, quantity, unit, desired_date } = req.body;

  if (!supplier_id || !item_description || !quantity) {
    return res.status(400).json({
      success: false,
      error: 'Fornecedor, item e quantidade são obrigatórios',
    });
  }

  const result = db.prepare(`
    INSERT INTO quotes (supplier_id, item_description, quantity, unit, status, valid_until)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(supplier_id, item_description, Number(quantity), unit || 'unid', desired_date || null);

  try {
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (?, 'info', 'Orçamento solicitado', ?, '/quotes')
    `).run(req.user?.id || 1, `Orçamento para "${item_description}" solicitado`);
  } catch { /* ignore */ }

  return res.json({ success: true, data: { id: result.lastInsertRowid } });
});

export default router;
