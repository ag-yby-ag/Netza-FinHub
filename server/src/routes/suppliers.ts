import { Router, Request, Response } from 'express';
import db from '../database/connection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/suppliers - List with filtering, sorting, pagination
router.get('/', (req: Request, res: Response) => {
  const {
    category,
    status,
    risk_level,
    rating_min,
    search,
    state,
    sort = 'name',
    order = 'asc',
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];

  if (category) {
    conditions.push('s.category = ?');
    params.push(category);
  }
  if (status) {
    conditions.push('s.status = ?');
    params.push(status);
  }
  if (risk_level) {
    conditions.push('s.risk_level = ?');
    params.push(risk_level);
  }
  if (rating_min) {
    conditions.push('s.rating >= ?');
    params.push(parseFloat(rating_min as string));
  }
  if (state) {
    conditions.push('s.state = ?');
    params.push(state);
  }
  if (search) {
    conditions.push('(s.name LIKE ? OR s.cnpj LIKE ? OR s.contact_name LIKE ? OR s.city LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort column
  const allowedSorts: Record<string, string> = {
    name: 's.name',
    rating: 's.rating',
    avg_price: 's.avg_price',
    created_at: 's.created_at',
    category: 's.category',
    status: 's.status',
    city: 's.city',
    state: 's.state',
  };
  const sortColumn = allowedSorts[sort as string] || 's.name';
  const sortOrder = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // Count total
  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM suppliers s ${whereClause}`
  ).get(...params) as { total: number };

  // Fetch data
  const suppliers = db.prepare(
    `SELECT s.* FROM suppliers s ${whereClause} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    success: true,
    data: suppliers,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / limitNum),
    },
  });
});

// GET /api/suppliers/:id - Detail
router.get('/:id', (req: Request, res: Response) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

  if (!supplier) {
    throw new AppError('Fornecedor não encontrado', 404);
  }

  res.json({ success: true, data: supplier });
});

// POST /api/suppliers - Create
router.post('/', (req: Request, res: Response) => {
  const {
    name, cnpj, category, subcategory, contact_name, contact_email, contact_phone,
    city, state, avg_price, delivery_days, payment_terms, status, risk_level, notes, logo_url,
  } = req.body;

  if (!name || !category) {
    throw new AppError('Nome e categoria são obrigatórios', 400);
  }

  const result = db.prepare(`
    INSERT INTO suppliers (name, cnpj, category, subcategory, contact_name, contact_email, contact_phone, city, state, avg_price, delivery_days, payment_terms, status, risk_level, notes, logo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, cnpj || null, category, subcategory || null,
    contact_name || null, contact_email || null, contact_phone || null,
    city || null, state || null, avg_price || null,
    delivery_days || null, payment_terms || null,
    status || 'active', risk_level || 'low',
    notes || null, logo_url || null
  );

  // Update category count
  db.prepare(
    'UPDATE categories SET supplier_count = (SELECT COUNT(*) FROM suppliers WHERE category = ?) WHERE name = ?'
  ).run(category, category);

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: supplier });
});

// PUT /api/suppliers/:id - Update
router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as any;

  if (!existing) {
    throw new AppError('Fornecedor não encontrado', 404);
  }

  const {
    name, cnpj, category, subcategory, contact_name, contact_email, contact_phone,
    city, state, avg_price, delivery_days, payment_terms, status, risk_level, notes, logo_url,
  } = req.body;

  db.prepare(`
    UPDATE suppliers SET
      name = ?, cnpj = ?, category = ?, subcategory = ?,
      contact_name = ?, contact_email = ?, contact_phone = ?,
      city = ?, state = ?, avg_price = ?,
      delivery_days = ?, payment_terms = ?,
      status = ?, risk_level = ?,
      notes = ?, logo_url = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    cnpj !== undefined ? cnpj : existing.cnpj,
    category ?? existing.category,
    subcategory !== undefined ? subcategory : existing.subcategory,
    contact_name !== undefined ? contact_name : existing.contact_name,
    contact_email !== undefined ? contact_email : existing.contact_email,
    contact_phone !== undefined ? contact_phone : existing.contact_phone,
    city !== undefined ? city : existing.city,
    state !== undefined ? state : existing.state,
    avg_price !== undefined ? avg_price : existing.avg_price,
    delivery_days !== undefined ? delivery_days : existing.delivery_days,
    payment_terms !== undefined ? payment_terms : existing.payment_terms,
    status ?? existing.status,
    risk_level ?? existing.risk_level,
    notes !== undefined ? notes : existing.notes,
    logo_url !== undefined ? logo_url : existing.logo_url,
    req.params.id
  );

  // Update category counts if category changed
  if (category && category !== existing.category) {
    db.prepare(
      'UPDATE categories SET supplier_count = (SELECT COUNT(*) FROM suppliers WHERE category = ?) WHERE name = ?'
    ).run(existing.category, existing.category);
    db.prepare(
      'UPDATE categories SET supplier_count = (SELECT COUNT(*) FROM suppliers WHERE category = ?) WHERE name = ?'
    ).run(category, category);
  }

  const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/suppliers/:id - Soft delete
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

  if (!existing) {
    throw new AppError('Fornecedor não encontrado', 404);
  }

  db.prepare(
    "UPDATE suppliers SET status = 'inactive', updated_at = datetime('now') WHERE id = ?"
  ).run(req.params.id);

  res.json({ success: true, data: { message: 'Fornecedor desativado com sucesso' } });
});

// GET /api/suppliers/:id/quotes - Supplier quotes
router.get('/:id/quotes', (req: Request, res: Response) => {
  const supplier = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(req.params.id);

  if (!supplier) {
    throw new AppError('Fornecedor não encontrado', 404);
  }

  const { status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = 'WHERE supplier_id = ?';
  const params: any[] = [req.params.id];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM quotes ${whereClause}`
  ).get(...params) as { total: number };

  const quotes = db.prepare(
    `SELECT * FROM quotes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    success: true,
    data: quotes,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / limitNum),
    },
  });
});

// POST /api/suppliers/:id/reviews - Add review
router.post('/:id/reviews', (req: Request, res: Response) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as any;

  if (!supplier) {
    throw new AppError('Fornecedor não encontrado', 404);
  }

  const { reviewer_name, rating, comment, pros, cons, would_recommend } = req.body;

  if (!reviewer_name || !rating) {
    throw new AppError('Nome do avaliador e nota são obrigatórios', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError('A nota deve estar entre 1 e 5', 400);
  }

  const result = db.prepare(`
    INSERT INTO reviews (supplier_id, reviewer_name, rating, comment, pros, cons, would_recommend)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id, reviewer_name, rating,
    comment || null, pros || null, cons || null,
    would_recommend !== undefined ? (would_recommend ? 1 : 0) : 1
  );

  // Update supplier rating
  const newRatingCount = supplier.rating_count + 1;
  const newRating = ((supplier.rating * supplier.rating_count) + rating) / newRatingCount;

  db.prepare(
    'UPDATE suppliers SET rating = ?, rating_count = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(Math.round(newRating * 10) / 10, newRatingCount, req.params.id);

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: review });
});

export default router;
