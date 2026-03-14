import { Request, Response, NextFunction } from 'express';
import db from '../database/connection';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  job_title: string | null;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Token de autenticação necessário' });
    return;
  }

  const session = db.prepare(`
    SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.role, u.department, u.job_title, u.status
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND u.status = 'active'
  `).get(token) as (AuthUser & { user_id: number; expires_at: string }) | undefined;

  if (!session) {
    res.status(401).json({ success: false, error: 'Sessão inválida ou expirada' });
    return;
  }

  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    res.status(401).json({ success: false, error: 'Sessão expirada' });
    return;
  }

  req.user = {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    department: session.department,
    job_title: session.job_title,
    status: session.status,
  };

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Sem permissão para esta ação' });
      return;
    }
    next();
  };
}

export function logActivity(userId: number, action: string, module: string, details?: object, ipAddress?: string): void {
  try {
    db.prepare(`
      INSERT INTO activity_log (user_id, action, module, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, action, module, details ? JSON.stringify(details) : null, ipAddress ?? null);
  } catch {
    // silent fail
  }
}
