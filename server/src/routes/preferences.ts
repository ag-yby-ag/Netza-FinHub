import { Router, Request, Response } from 'express';
import db from '../database/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/preferences
router.get('/', requireAuth, (req: Request, res: Response) => {
  const prefs = db.prepare('SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?').all(req.user!.id) as { pref_key: string; pref_value: string }[];
  const result: Record<string, string> = {};
  for (const p of prefs) result[p.pref_key] = p.pref_value;
  res.json({ success: true, data: result });
});

// PUT /api/preferences - batch update
router.put('/', requireAuth, (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;

  const upsert = db.prepare(`
    INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, pref_key) DO UPDATE SET pref_value = excluded.pref_value, updated_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(updates)) {
      upsert.run(req.user!.id, k, String(v));
    }
  });
  tx();

  res.json({ success: true, data: updates });
});

// PUT /api/preferences/:key - single update
router.put('/:key', requireAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    res.status(400).json({ success: false, error: 'Valor é obrigatório' });
    return;
  }

  db.prepare(`
    INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, pref_key) DO UPDATE SET pref_value = excluded.pref_value, updated_at = datetime('now')
  `).run(req.user!.id, key, String(value));

  res.json({ success: true, data: { key, value: String(value) } });
});

export default router;
