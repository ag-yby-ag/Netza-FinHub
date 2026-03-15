import db from '../db/database';

interface NotificationParams {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export function createNotification(params: NotificationParams): void {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    params.userId,
    params.type,
    params.title,
    params.message,
    params.link || null,
    params.metadata ? JSON.stringify(params.metadata) : null
  );
}

export function notifyAllAdmins(params: Omit<NotificationParams, 'userId'>): void {
  const admins = db.prepare("SELECT id FROM users WHERE role IN ('master','admin') AND status = 'active'").all() as Array<{ id: number }>;
  for (const admin of admins) {
    createNotification({ ...params, userId: admin.id });
  }
}
