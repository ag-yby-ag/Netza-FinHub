import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/connection';
import { requireAuth, requireRole, logActivity } from '../middleware/auth';

const router = Router();

// GET /api/users
router.get('/', requireAuth, requireRole('master', 'admin'), (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT id, name, email, phone, role, department, job_title, status, last_login, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json({ success: true, data: users });
});

// GET /api/users/:id
router.get('/:id', requireAuth, requireRole('master', 'admin'), (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT id, name, email, phone, role, department, job_title, status, last_login, created_at
    FROM users WHERE id = ?
  `).get(req.params.id) as any;

  if (!user) {
    res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    return;
  }

  const permissions = db.prepare('SELECT * FROM role_permissions WHERE role = ?').all(user.role);
  res.json({ success: true, data: { ...user, permissions } });
});

// POST /api/users
router.post('/', requireAuth, requireRole('master', 'admin'), (req: Request, res: Response) => {
  const { name, email, password, phone, role, department, job_title } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' });
    return;
  }

  // Only master can create master users
  if (role === 'master' && req.user!.role !== 'master') {
    res.status(403).json({ success: false, error: 'Apenas master pode criar usuários master' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ success: false, error: 'Email já cadastrado' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role, department, job_title)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, hash, phone ?? null, role ?? 'viewer', department ?? null, job_title ?? null);

  const newUser = db.prepare('SELECT id, name, email, phone, role, department, job_title, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

  logActivity(req.user!.id, 'create_user', 'users', { name, email, role });
  res.status(201).json({ success: true, data: newUser });
});

// PUT /api/users/:id
router.put('/:id', requireAuth, requireRole('master', 'admin'), (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id);
  const { name, phone, department, job_title, status } = req.body;

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    return;
  }

  db.prepare(`
    UPDATE users SET name = ?, phone = ?, department = ?, job_title = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name ?? target.name, phone ?? target.phone, department ?? target.department,
    job_title ?? target.job_title, status ?? target.status, targetId);

  logActivity(req.user!.id, 'edit_user', 'users', { target_id: targetId });
  const updated = db.prepare('SELECT id, name, email, phone, role, department, job_title, status FROM users WHERE id = ?').get(targetId);
  res.json({ success: true, data: updated });
});

// PUT /api/users/:id/role
router.put('/:id/role', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  const { role } = req.body;
  const validRoles = ['master', 'admin', 'manager', 'viewer'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ success: false, error: 'Role inválido' });
    return;
  }
  db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, req.params.id);
  logActivity(req.user!.id, 'change_role', 'users', { target_id: req.params.id, new_role: role });
  res.json({ success: true, data: { id: req.params.id, role } });
});

// DELETE /api/users/:id (soft delete — set inactive)
router.delete('/:id', requireAuth, requireRole('master'), (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.user!.id) {
    res.status(400).json({ success: false, error: 'Não é possível desativar a própria conta' });
    return;
  }
  db.prepare('UPDATE users SET status = \'inactive\', updated_at = datetime(\'now\') WHERE id = ?').run(targetId);
  logActivity(req.user!.id, 'deactivate_user', 'users', { target_id: targetId });
  res.json({ success: true, data: { id: targetId, status: 'inactive' } });
});

export default router;
