import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../database/connection';
import { requireAuth, requireRole, logActivity } from '../middleware/auth';

const router = Router();

function isRemoteControlEnabled(): boolean {
  const setting = db.prepare(
    "SELECT setting_value FROM system_settings WHERE setting_key = 'remote_control_enabled'"
  ).get() as { setting_value: string } | undefined;
  return setting?.setting_value === 'true';
}

// GET /api/remote-control/status
router.get('/status', requireAuth, (req: Request, res: Response) => {
  const enabled = isRemoteControlEnabled();
  if (!enabled) {
    res.status(403).json({ success: false, error: 'Remote Control is not yet enabled for your account.' });
    return;
  }
  const apiKey = db.prepare(
    "SELECT api_key, created_at, last_used_at FROM remote_control_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(req.user!.id) as { api_key: string; created_at: string; last_used_at: string | null } | undefined;

  res.json({
    success: true,
    data: {
      enabled: true,
      has_api_key: !!apiKey,
      last_used_at: apiKey?.last_used_at ?? null,
    },
  });
});

// POST /api/remote-control/enable  (master only — toggles global setting)
router.post('/enable', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  db.prepare(
    "UPDATE system_settings SET setting_value = 'true', updated_by = ?, updated_at = datetime('now') WHERE setting_key = 'remote_control_enabled'"
  ).run(req.user!.id);
  logActivity(req.user!.id, 'enable_remote_control', 'remote_control');
  res.json({ success: true, data: { enabled: true } });
});

// POST /api/remote-control/disable  (master only)
router.post('/disable', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  db.prepare(
    "UPDATE system_settings SET setting_value = 'false', updated_by = ?, updated_at = datetime('now') WHERE setting_key = 'remote_control_enabled'"
  ).run(req.user!.id);
  logActivity(req.user!.id, 'disable_remote_control', 'remote_control');
  res.json({ success: true, data: { enabled: false } });
});

// POST /api/remote-control/api-key — generate or rotate API key for the caller
router.post('/api-key', requireAuth, (req: Request, res: Response) => {
  if (!isRemoteControlEnabled()) {
    res.status(403).json({ success: false, error: 'Remote Control is not yet enabled for your account.' });
    return;
  }
  const newKey = `rc_${crypto.randomBytes(32).toString('hex')}`;
  db.prepare(`
    INSERT INTO remote_control_sessions (user_id, api_key, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET api_key = excluded.api_key, created_at = excluded.created_at, last_used_at = NULL
  `).run(req.user!.id, newKey);
  logActivity(req.user!.id, 'generate_rc_api_key', 'remote_control');
  res.json({ success: true, data: { api_key: newKey } });
});

// POST /api/remote-control/command — execute a remote command via API key auth
router.post('/command', (req: Request, res: Response) => {
  if (!isRemoteControlEnabled()) {
    res.status(403).json({ success: false, error: 'Remote Control is not yet enabled for your account.' });
    return;
  }
  const apiKey = req.headers['x-rc-api-key'] as string | undefined;
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'API key required (X-RC-Api-Key header)' });
    return;
  }
  const session = db.prepare(`
    SELECT rcs.user_id, u.name, u.role
    FROM remote_control_sessions rcs
    JOIN users u ON u.id = rcs.user_id
    WHERE rcs.api_key = ? AND u.status = 'active'
  `).get(apiKey) as { user_id: number; name: string; role: string } | undefined;

  if (!session) {
    res.status(401).json({ success: false, error: 'Invalid or revoked API key' });
    return;
  }

  db.prepare(
    "UPDATE remote_control_sessions SET last_used_at = datetime('now') WHERE api_key = ?"
  ).run(apiKey);

  const { command, payload } = req.body as { command: string; payload?: unknown };
  if (!command) {
    res.status(400).json({ success: false, error: 'command is required' });
    return;
  }

  logActivity(session.user_id, `rc_command:${command}`, 'remote_control', { payload });

  // Dispatch supported commands
  switch (command) {
    case 'ping':
      res.json({ success: true, data: { pong: true, user: session.name } });
      break;

    case 'get_settings': {
      const settings = db.prepare('SELECT setting_key, setting_value, setting_type FROM system_settings').all();
      res.json({ success: true, data: settings });
      break;
    }

    case 'get_dashboard_summary': {
      const supplierCount = (db.prepare('SELECT COUNT(*) as n FROM suppliers WHERE status = ?').get('active') as { n: number }).n;
      const pendingQuotes = (db.prepare("SELECT COUNT(*) as n FROM quotes WHERE status = 'pending'").get() as { n: number }).n;
      const highRisk = (db.prepare("SELECT COUNT(*) as n FROM suppliers WHERE risk_level = 'high' AND status = 'active'").get() as { n: number }).n;
      res.json({ success: true, data: { active_suppliers: supplierCount, pending_quotes: pendingQuotes, high_risk_suppliers: highRisk } });
      break;
    }

    default:
      res.status(400).json({ success: false, error: `Unknown command: ${command}` });
  }
});

export default router;
