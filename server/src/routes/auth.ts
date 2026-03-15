import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email.toLowerCase().trim(), 'active') as Record<string, unknown> | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash as string)) {
    return res.status(401).json({ success: false, error: 'E-mail ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'netza-secret',
    { expiresIn: '24h' }
  );

  // Update last_login
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, department: user.department, job_title: user.job_title,
      },
    },
  });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, department, job_title, phone, last_login, created_at FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown> | undefined;
  if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

  const prefs = db.prepare('SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?').all(req.user!.id) as Array<{ pref_key: string; pref_value: string }>;
  const preferences = Object.fromEntries(prefs.map(p => [p.pref_key, p.pref_value]));

  return res.json({ success: true, data: { ...user, preferences } });
});

// PUT /api/auth/me
router.put('/me', verifyToken, (req: AuthRequest, res: Response) => {
  const { name, phone, department, job_title } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, department=?, job_title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name, phone, department, job_title, req.user!.id);
  return res.json({ success: true, data: { message: 'Perfil atualizado' } });
});

// PUT /api/auth/me/password
router.put('/me/password', verifyToken, (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string } | undefined;
  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hash, req.user!.id);
  return res.json({ success: true, data: { message: 'Senha alterada com sucesso' } });
});

export default router;
