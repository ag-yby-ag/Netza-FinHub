import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// GET /api/dashboard/kpis
router.get('/kpis', (req: AuthRequest, res: Response) => {
  const totalSuppliers = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE status='active'").get() as { c: number }).c;
  const totalSuppliersAll = (db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as { c: number }).c;
  const approved = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(total_price),0) as v FROM quotes WHERE status='approved'").get() as { c: number; v: number };
  const pending = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='pending'").get() as { c: number }).c;
  const avgRating = (db.prepare("SELECT COALESCE(AVG(rating),0) as avg FROM suppliers WHERE status='active' AND rating > 0").get() as { avg: number }).avg;
  const highRisk = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE risk_level='high'").get() as { c: number }).c;

  // Month comparison
  const lastMonthApproved = db.prepare(`
    SELECT COALESCE(SUM(total_price),0) as v FROM quotes WHERE status='approved'
    AND created_at >= date('now','-2 months') AND created_at < date('now','-1 months')
  `).get() as { v: number };
  const thisMonthApproved = db.prepare(`
    SELECT COALESCE(SUM(total_price),0) as v FROM quotes WHERE status='approved'
    AND created_at >= date('now','-1 months')
  `).get() as { v: number };

  const trend = lastMonthApproved.v > 0
    ? Math.round(((thisMonthApproved.v - lastMonthApproved.v) / lastMonthApproved.v) * 100)
    : 0;

  return res.json({
    success: true, data: {
      total_suppliers: totalSuppliers,
      total_suppliers_all: totalSuppliersAll,
      approved_volume: approved.v,
      approved_count: approved.c,
      pending_quotes: pending,
      avg_rating: Math.round(avgRating * 10) / 10,
      high_risk_count: highRisk,
      volume_trend: trend,
    }
  });
});

// GET /api/dashboard/categories
router.get('/categories', (req: AuthRequest, res: Response) => {
  const data = db.prepare(`
    SELECT s.category, COUNT(DISTINCT s.id) as supplier_count, COALESCE(SUM(q.total_price),0) as volume
    FROM suppliers s LEFT JOIN quotes q ON s.id=q.supplier_id AND q.status='approved'
    GROUP BY s.category ORDER BY volume DESC
  `).all();
  return res.json({ success: true, data });
});

// GET /api/dashboard/trends
router.get('/trends', (req: AuthRequest, res: Response) => {
  const data = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
      COUNT(*) as count, COALESCE(SUM(total_price),0) as volume
    FROM quotes WHERE status='approved' AND created_at >= date('now','-12 months')
    GROUP BY month ORDER BY month ASC
  `).all();
  return res.json({ success: true, data });
});

// GET /api/dashboard/recent
router.get('/recent', (req: AuthRequest, res: Response) => {
  const recentQuotes = db.prepare(`
    SELECT q.*, s.name as supplier_name FROM quotes q
    LEFT JOIN suppliers s ON q.supplier_id=s.id
    ORDER BY q.created_at DESC LIMIT 5
  `).all();
  const recentSuppliers = db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 5').all();
  const recentUploads = db.prepare('SELECT * FROM uploads ORDER BY created_at DESC LIMIT 3').all();

  return res.json({ success: true, data: { quotes: recentQuotes, suppliers: recentSuppliers, uploads: recentUploads } });
});

export default router;
