import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// GET /api/notifications/count
router.get('/count', (req: AuthRequest, res: Response) => {
  const count = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.user!.id) as { c: number }).c;
  return res.json({ success: true, data: { count } });
});

// GET /api/notifications
router.get('/', (req: AuthRequest, res: Response) => {
  const { is_read, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'user_id=?';
  const params: unknown[] = [req.user!.id];
  if (is_read !== undefined) { where += ' AND is_read=?'; params.push(is_read === 'true' ? 1 : 0); }

  const total = (db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE ${where}`).get(...params) as { c: number }).c;
  const data = db.prepare(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), offset);

  return res.json({ success: true, data, meta: { page: Number(page), total, limit: Number(limit) } });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user!.id);
  return res.json({ success: true, data: { message: 'Marcada como lida' } });
});

// PUT /api/notifications/read-all
router.put('/read-all', (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user!.id);
  return res.json({ success: true, data: { message: 'Todas marcadas como lidas' } });
});

// DELETE /api/notifications/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.id, req.user!.id);
  return res.json({ success: true, data: { message: 'Notificação removida' } });
});

export default router;
