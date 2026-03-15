import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// GET /api/preferences
router.get('/preferences', (req: AuthRequest, res: Response) => {
  const prefs = db.prepare('SELECT pref_key, pref_value FROM user_preferences WHERE user_id=?').all(req.user!.id) as Array<{ pref_key: string; pref_value: string }>;
  const result = Object.fromEntries(prefs.map(p => [p.pref_key, p.pref_value]));
  return res.json({ success: true, data: result });
});

// PUT /api/preferences
router.put('/preferences', (req: AuthRequest, res: Response) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO user_preferences (user_id, pref_key, pref_value) VALUES (?,?,?)');
  const insertMany = db.transaction((prefs: Record<string, string>) => {
    for (const [key, value] of Object.entries(prefs)) {
      upsert.run(req.user!.id, key, String(value));
    }
  });
  insertMany(req.body);
  return res.json({ success: true, data: { message: 'Preferências salvas' } });
});

// GET /api/settings (master only)
router.get('/system', requireRole('master'), (req: AuthRequest, res: Response) => {
  const settings = db.prepare('SELECT setting_key, setting_value, setting_type, description FROM system_settings').all() as Array<{ setting_key: string; setting_value: string; setting_type: string; description: string }>;
  const result = Object.fromEntries(settings.map(s => [s.setting_key, { value: s.setting_value, type: s.setting_type, description: s.description }]));
  return res.json({ success: true, data: result });
});

// PUT /api/settings (master only)
router.put('/system', requireRole('master'), (req: AuthRequest, res: Response) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_by) VALUES (?,?,?)');
  const insertMany = db.transaction((settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value), req.user!.id);
    }
  });
  insertMany(req.body);
  return res.json({ success: true, data: { message: 'Configurações salvas' } });
});

// GET /api/settings/users (admin+)
router.get('/users', requireRole('master', 'admin'), (req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, department, job_title, status, last_login, created_at FROM users ORDER BY created_at ASC').all();
  return res.json({ success: true, data: users });
});

export default router;
