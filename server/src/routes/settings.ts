import { Router, Request, Response } from 'express';
import db from '../database/connection';
import { requireAuth, requireRole, logActivity } from '../middleware/auth';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, requireRole('master', 'admin'), (req: Request, res: Response) => {
  const settings = db.prepare('SELECT setting_key, setting_value, setting_type, description FROM system_settings').all() as any[];
  const result: Record<string, any> = {};
  for (const s of settings) {
    result[s.setting_key] = {
      value: s.setting_value,
      type: s.setting_type,
      description: s.description,
    };
  }
  res.json({ success: true, data: result });
});

// PUT /api/settings - batch update
router.put('/', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;

  const upsert = db.prepare(`
    UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = datetime('now')
    WHERE setting_key = ?
  `);

  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(updates)) {
      upsert.run(String(v), req.user!.id, k);
    }
  });
  tx();

  logActivity(req.user!.id, 'update_settings', 'settings', { keys: Object.keys(updates) });
  res.json({ success: true, data: updates });
});

// PUT /api/settings/:key
router.put('/:key', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    res.status(400).json({ success: false, error: 'Valor é obrigatório' });
    return;
  }

  db.prepare(`
    UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = datetime('now')
    WHERE setting_key = ?
  `).run(String(value), req.user!.id, key);

  logActivity(req.user!.id, 'update_setting', 'settings', { key, value });
  res.json({ success: true, data: { key, value: String(value) } });
});

// GET /api/settings/activity-log
router.get('/activity-log', requireAuth, (req: Request, res: Response) => {
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const userId = req.query.user_id ? parseInt(req.query.user_id as string) : req.user!.id;

  // Only master/admin can see other users' logs
  const targetUserId = (req.user!.role === 'master' || req.user!.role === 'admin') ? userId : req.user!.id;

  const logs = db.prepare(`
    SELECT a.id, a.action, a.module, a.details, a.ip_address, a.created_at,
           u.name as user_name
    FROM activity_log a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(targetUserId, limit);

  res.json({ success: true, data: logs });
});

// POST /api/settings/clear-cache
router.post('/clear-cache', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  // In a real app this would clear Redis/in-memory cache
  logActivity(req.user!.id, 'clear_cache', 'settings');
  res.json({ success: true, data: { message: 'Cache limpo com sucesso' } });
});

// POST /api/settings/reset-db
router.post('/reset-db', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  const { confirmation } = req.body;
  if (confirmation !== 'RESETAR') {
    res.status(400).json({ success: false, error: 'Digite RESETAR para confirmar' });
    return;
  }

  // Delete all data except users and settings tables
  db.exec(`
    DELETE FROM activity_log;
    DELETE FROM auth_sessions WHERE user_id != ${req.user!.id};
    DELETE FROM ai_insights;
    DELETE FROM reviews;
    DELETE FROM quotes;
    DELETE FROM uploads;
    DELETE FROM suppliers;
    DELETE FROM categories;
  `);

  logActivity(req.user!.id, 'reset_database', 'settings', { confirmed: true });
  res.json({ success: true, data: { message: 'Banco de dados resetado' } });
});

// POST /api/settings/export-all
router.post('/export-all', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  const suppliers = db.prepare('SELECT * FROM suppliers').all();
  const quotes = db.prepare('SELECT * FROM quotes').all();
  const reviews = db.prepare('SELECT * FROM reviews').all();
  const categories = db.prepare('SELECT * FROM categories').all();

  logActivity(req.user!.id, 'export_data', 'settings');

  res.json({
    success: true,
    data: {
      exported_at: new Date().toISOString(),
      suppliers,
      quotes,
      reviews,
      categories,
    },
  });
});

export default router;
