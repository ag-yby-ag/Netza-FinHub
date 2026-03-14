import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../database/connection';
import { requireAuth, logActivity } from '../middleware/auth';

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email, 'active') as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
  const ip = req.ip ?? req.socket.remoteAddress ?? null;

  db.prepare(`
    INSERT INTO auth_sessions (user_id, token, ip_address, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(user.id, token, ip, expiresAt);

  db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

  logActivity(user.id, 'login', 'auth', { email: user.email }, ip ?? undefined);

  const { password_hash, ...safeUser } = user;

  res.json({
    success: true,
    data: {
      user: safeUser,
      token,
      expires_at: expiresAt,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  const token = req.headers.authorization?.slice(7);
  if (token) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    logActivity(req.user!.id, 'logout', 'auth');
  }
  res.json({ success: true, data: null });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, name, email, phone, role, department, job_title, avatar_url, timezone, status, last_login, created_at FROM users WHERE id = ?').get(req.user!.id) as any;

  // Load permissions for role
  const permissions = db.prepare('SELECT module, can_view, can_create, can_edit, can_delete, can_export FROM role_permissions WHERE role = ?').all(user.role) as any[];

  res.json({ success: true, data: { ...user, permissions } });
});

// PUT /api/auth/me
router.put('/me', requireAuth, (req: Request, res: Response) => {
  const { name, phone, department, job_title, timezone } = req.body;

  db.prepare(`
    UPDATE users SET name = ?, phone = ?, department = ?, job_title = ?, timezone = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, phone ?? null, department ?? null, job_title ?? null, timezone ?? 'America/Sao_Paulo', req.user!.id);

  logActivity(req.user!.id, 'update_profile', 'settings');

  const user = db.prepare('SELECT id, name, email, phone, role, department, job_title, avatar_url, timezone, status FROM users WHERE id = ?').get(req.user!.id);
  res.json({ success: true, data: user });
});

// PUT /api/auth/me/password
router.put('/me/password', requireAuth, (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({ success: false, error: 'Senha atual e nova senha são obrigatórias' });
    return;
  }

  if (new_password.length < 6) {
    res.status(400).json({ success: false, error: 'A nova senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string };

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    res.status(400).json({ success: false, error: 'Senha atual incorreta' });
    return;
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, req.user!.id);

  // Invalidate all other sessions
  const currentToken = req.headers.authorization?.slice(7);
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ? AND token != ?').run(req.user!.id, currentToken ?? '');

  logActivity(req.user!.id, 'change_password', 'security');

  res.json({ success: true, data: { message: 'Senha alterada com sucesso' } });
});

export default router;
