import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

const router = Router();
router.use(verifyToken);

// GET /api/quotes/stats
router.get('/stats', (req: AuthRequest, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) as c FROM quotes').get() as { c: number }).c;
  const approved = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(total_price),0) as v FROM quotes WHERE status='approved'").get() as { c: number; v: number };
  const pending = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='pending'").get() as { c: number }).c;
  const expiring = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='pending' AND valid_until BETWEEN date('now') AND date('now','+7 days')").get() as { c: number }).c;

  return res.json({ success: true, data: { total, approved: approved.c, approved_value: approved.v, pending, expiring_soon: expiring } });
});

// GET /api/quotes
router.get('/', (req: AuthRequest, res: Response) => {
  const { supplier_id, status, category, sort_by = 'newest', page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  let where = '1=1';
  const params: unknown[] = [];

  if (supplier_id) { where += ' AND q.supplier_id=?'; params.push(Number(supplier_id)); }
  if (status) { where += ' AND q.status=?'; params.push(status); }
  if (category) { where += ' AND s.category=?'; params.push(category); }

  const orderBy = sort_by === 'value_desc' ? 'q.total_price DESC' : sort_by === 'value_asc' ? 'q.total_price ASC' : 'q.created_at DESC';

  const total = (db.prepare(`SELECT COUNT(*) as c FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id WHERE ${where}`).get(...params) as { c: number }).c;
  const data = db.prepare(`
    SELECT q.*, s.name as supplier_name, s.category as supplier_category, s.rating as supplier_rating
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return res.json({ success: true, data, meta: { page: Number(page), total, limit: Number(limit) } });
});

// GET /api/quotes/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const quote = db.prepare(`
    SELECT q.*, s.name as supplier_name, s.category as supplier_category, s.rating as supplier_rating, s.city as supplier_city
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id WHERE q.id=?
  `).get(req.params.id);
  if (!quote) return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });

  // Price history for same item
  const history = db.prepare(`
    SELECT q2.unit_price, q2.total_price, q2.created_at, s2.name as supplier_name
    FROM quotes q2 JOIN suppliers s2 ON q2.supplier_id=s2.id
    WHERE q2.item_description=? AND q2.id!=? ORDER BY q2.created_at DESC LIMIT 5
  `).all((quote as Record<string, unknown>).item_description, req.params.id);

  return res.json({ success: true, data: { ...quote as object, price_history: history } });
});

// POST /api/quotes
router.post('/', (req: AuthRequest, res: Response) => {
  const { supplier_id, item_description, quantity, unit, unit_price, total_price, currency, valid_until, notes } = req.body;
  if (!item_description) return res.status(400).json({ success: false, error: 'Descrição do item é obrigatória' });

  const result = db.prepare(`
    INSERT INTO quotes (supplier_id, item_description, quantity, unit, unit_price, total_price, currency, valid_until, notes)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(supplier_id, item_description, quantity, unit || 'unid', unit_price, total_price || (quantity * unit_price), currency || 'BRL', valid_until, notes);

  const quote = db.prepare('SELECT * FROM quotes WHERE id=?').get(result.lastInsertRowid);
  return res.status(201).json({ success: true, data: quote });
});

// PUT /api/quotes/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { supplier_id, item_description, quantity, unit, unit_price, total_price, currency, valid_until, notes } = req.body;
  db.prepare(`UPDATE quotes SET supplier_id=?,item_description=?,quantity=?,unit=?,unit_price=?,total_price=?,currency=?,valid_until=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(supplier_id, item_description, quantity, unit, unit_price, total_price, currency, valid_until, notes, req.params.id);
  return res.json({ success: true, data: db.prepare('SELECT * FROM quotes WHERE id=?').get(req.params.id) });
});

// PUT /api/quotes/:id/approve
router.put('/:id/approve', (req: AuthRequest, res: Response) => {
  db.prepare("UPDATE quotes SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
  const quote = db.prepare('SELECT *, (SELECT name FROM suppliers WHERE id=quotes.supplier_id) as supplier_name FROM quotes WHERE id=?').get(req.params.id) as Record<string, unknown>;

  createNotification({ userId: req.user!.id, type: 'quote_approved', title: 'Orçamento aprovado', message: `${quote.item_description} — ${quote.supplier_name} aprovado`, link: `/quotes/${req.params.id}` });

  return res.json({ success: true, data: quote });
});

// PUT /api/quotes/:id/reject
router.put('/:id/reject', (req: AuthRequest, res: Response) => {
  db.prepare("UPDATE quotes SET status='rejected', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
  const quote = db.prepare('SELECT * FROM quotes WHERE id=?').get(req.params.id);
  return res.json({ success: true, data: quote });
});

// DELETE /api/quotes/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM quotes WHERE id=?').run(req.params.id);
  return res.json({ success: true, data: { message: 'Orçamento removido' } });
});

export default router;
