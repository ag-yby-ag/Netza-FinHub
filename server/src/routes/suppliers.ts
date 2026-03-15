import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { validateCNPJ } from '../services/cnpjValidator';
import { createNotification } from '../services/notificationService';

const router = Router();
router.use(verifyToken);

// GET /api/suppliers
router.get('/', (req: AuthRequest, res: Response) => {
  const { search, category, status, risk_level, rating_min, sort_by = 'name', page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  let where = '1=1';
  const params: unknown[] = [];

  if (search) {
    where += ' AND (s.name LIKE ? OR s.category LIKE ? OR s.cnpj LIKE ? OR s.city LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (category) { where += ' AND s.category = ?'; params.push(category); }
  if (status) { where += ' AND s.status = ?'; params.push(status); }
  if (risk_level) { where += ' AND s.risk_level = ?'; params.push(risk_level); }
  if (rating_min) { where += ' AND s.rating >= ?'; params.push(Number(rating_min)); }

  const sortMap: Record<string, string> = {
    name: 's.name ASC', rating: 's.rating DESC', price_asc: 's.avg_price ASC',
    price_desc: 's.avg_price DESC', delivery: 's.delivery_days ASC', newest: 's.created_at DESC',
  };
  const orderBy = sortMap[sort_by] || 's.name ASC';

  const total = (db.prepare(`SELECT COUNT(*) as c FROM suppliers s WHERE ${where}`).get(...params) as { c: number }).c;
  const data = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM quotes q WHERE q.supplier_id = s.id) as quote_count FROM suppliers s WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, Number(limit), offset);

  return res.json({ success: true, data, meta: { page: Number(page), total, limit: Number(limit) } });
});

// GET /api/suppliers/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!supplier) return res.status(404).json({ success: false, error: 'Fornecedor não encontrado' });

  const reviews = db.prepare('SELECT * FROM reviews WHERE supplier_id = ? ORDER BY created_at DESC').all(req.params.id);
  const quotes = db.prepare("SELECT * FROM quotes WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 10").all(req.params.id);
  const stats = db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(total_price),0) as volume, AVG(total_price) as avg_price FROM quotes WHERE supplier_id = ? AND status='approved'").get(req.params.id);

  return res.json({ success: true, data: { ...supplier, reviews, recent_quotes: quotes, stats } });
});

// POST /api/suppliers
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, cnpj, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ success: false, error: 'Nome e categoria são obrigatórios' });
  }
  if (cnpj && !validateCNPJ(cnpj)) {
    return res.status(400).json({ success: false, error: 'CNPJ inválido' });
  }

  const fields = ['name','cnpj','category','subcategory','contact_name','contact_email','contact_phone','contact_role','city','state','avg_price','delivery_days','payment_terms','status','risk_level','notes'];
  const values = fields.map(f => req.body[f] ?? null);
  const placeholders = fields.map(() => '?').join(', ');

  const result = db.prepare(`INSERT INTO suppliers (${fields.join(',')}) VALUES (${placeholders})`).run(...values);
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);

  createNotification({ userId: req.user!.id, type: 'supplier_created', title: 'Novo fornecedor', message: `${name} foi cadastrado com sucesso`, link: `/suppliers/${result.lastInsertRowid}` });

  return res.status(201).json({ success: true, data: supplier });
});

// PUT /api/suppliers/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { cnpj } = req.body;
  if (cnpj && !validateCNPJ(cnpj)) {
    return res.status(400).json({ success: false, error: 'CNPJ inválido' });
  }

  const fields = ['name','cnpj','category','subcategory','contact_name','contact_email','contact_phone','contact_role','city','state','avg_price','delivery_days','payment_terms','status','risk_level','notes'];
  const setClauses = fields.map(f => `${f}=?`).join(', ');
  const values = [...fields.map(f => req.body[f] ?? null), req.params.id];

  db.prepare(`UPDATE suppliers SET ${setClauses}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...values);
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  return res.json({ success: true, data: supplier });
});

// DELETE /api/suppliers/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare("UPDATE suppliers SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
  return res.json({ success: true, data: { message: 'Fornecedor desativado' } });
});

// GET /api/suppliers/:id/quotes
router.get('/:id/quotes', (req: AuthRequest, res: Response) => {
  const quotes = db.prepare('SELECT * FROM quotes WHERE supplier_id = ? ORDER BY created_at DESC').all(req.params.id);
  return res.json({ success: true, data: quotes });
});

// POST /api/suppliers/:id/reviews
router.post('/:id/reviews', (req: AuthRequest, res: Response) => {
  const { rating, quality_score, delivery_score, price_score, comment } = req.body;
  db.prepare('INSERT INTO reviews (supplier_id, rating, quality_score, delivery_score, price_score, comment, reviewer) VALUES (?,?,?,?,?,?,?)')
    .run(req.params.id, rating, quality_score, delivery_score, price_score, comment, req.user!.name);

  // Recalculate average rating
  const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE supplier_id=?').get(req.params.id) as { avg: number; cnt: number };
  db.prepare('UPDATE suppliers SET rating=?, rating_count=? WHERE id=?').run(Math.round(avg.avg * 10) / 10, avg.cnt, req.params.id);

  return res.status(201).json({ success: true, data: { message: 'Avaliação registrada' } });
});

export default router;
