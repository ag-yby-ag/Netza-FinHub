import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generateInsight } from '../services/aiService';

const router = Router();
router.use(verifyToken);

// GET /api/analytics/summary
router.get('/summary', (req: AuthRequest, res: Response) => {
  const { period = '12', category } = req.query as Record<string, string>;
  let dateFilter = `date('now','-${Number(period)} months')`;
  let catFilter = '';
  const params: unknown[] = [];

  if (category) { catFilter = ' AND s.category=?'; params.push(category); }

  const current = db.prepare(`
    SELECT COUNT(*) as cnt, COALESCE(SUM(q.total_price),0) as vol, AVG(q.total_price) as avg_ticket
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved' AND q.created_at >= ${dateFilter} ${catFilter}
  `).get(...params) as { cnt: number; vol: number; avg_ticket: number };

  const previous = db.prepare(`
    SELECT COUNT(*) as cnt, COALESCE(SUM(q.total_price),0) as vol
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved' AND q.created_at >= date('now','-${Number(period) * 2} months')
    AND q.created_at < ${dateFilter} ${catFilter}
  `).get(...params) as { cnt: number; vol: number };

  const activeSuppliers = (db.prepare(`SELECT COUNT(DISTINCT q.supplier_id) as c FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id WHERE q.status='approved' AND q.created_at >= ${dateFilter} ${catFilter}`).get(...params) as { c: number }).c;

  const volTrend = previous.vol > 0 ? Math.round(((current.vol - previous.vol) / previous.vol) * 100) : 0;
  const savings = current.vol * 0.12; // Estimated 12% savings

  return res.json({
    success: true, data: {
      total_volume: current.vol,
      total_orders: current.cnt,
      avg_ticket: current.avg_ticket || 0,
      active_suppliers: activeSuppliers,
      estimated_savings: savings,
      volume_trend: volTrend,
    }
  });
});

// GET /api/analytics/trends
router.get('/trends', (req: AuthRequest, res: Response) => {
  const { period = '12', category } = req.query as Record<string, string>;
  let catFilter = '';
  const params: unknown[] = [];
  if (category) { catFilter = ' AND s.category=?'; params.push(category); }

  const data = db.prepare(`
    SELECT strftime('%Y-%m', q.created_at) as month,
      COALESCE(SUM(q.total_price),0) as volume,
      COUNT(*) as count,
      AVG(q.total_price) as avg_price
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved' AND q.created_at >= date('now','-${Number(period)} months') ${catFilter}
    GROUP BY month ORDER BY month ASC
  `).all(...params);

  return res.json({ success: true, data });
});

// GET /api/analytics/categories
router.get('/categories', (req: AuthRequest, res: Response) => {
  const data = db.prepare(`
    SELECT s.category, COUNT(*) as count, COALESCE(SUM(q.total_price),0) as volume,
      AVG(s.rating) as avg_rating, COUNT(DISTINCT s.id) as supplier_count
    FROM quotes q JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved'
    GROUP BY s.category ORDER BY volume DESC
  `).all();
  return res.json({ success: true, data });
});

// GET /api/analytics/suppliers/ranking
router.get('/suppliers/ranking', (req: AuthRequest, res: Response) => {
  const { sort_by = 'volume', limit = '10' } = req.query as Record<string, string>;
  const orderBy = sort_by === 'rating' ? 'avg_rating DESC' : sort_by === 'savings' ? 'savings DESC' : 'volume DESC';

  const data = db.prepare(`
    SELECT s.id, s.name, s.category, s.rating, s.status, s.risk_level,
      COUNT(q.id) as order_count,
      COALESCE(SUM(q.total_price),0) as volume,
      COALESCE(SUM(q.total_price),0) * 0.12 as savings,
      AVG(s.rating) as avg_rating
    FROM suppliers s LEFT JOIN quotes q ON s.id=q.supplier_id AND q.status='approved'
    GROUP BY s.id ORDER BY ${orderBy} LIMIT ?
  `).all(Number(limit));

  return res.json({ success: true, data });
});

// GET /api/analytics/ai-insight
router.get('/ai-insight', async (req: AuthRequest, res: Response) => {
  const { type = 'general_insight', context_id } = req.query as Record<string, string>;

  type AnalysisType = 'supplier_comparison' | 'cost_analysis' | 'risk_alert' | 'general_insight' | 'category_analysis';
  const validTypes: AnalysisType[] = ['supplier_comparison', 'cost_analysis', 'risk_alert', 'general_insight', 'category_analysis'];
  const analysisType = validTypes.includes(type as AnalysisType) ? (type as AnalysisType) : 'general_insight';

  const insight = await generateInsight(analysisType, context_id);
  return res.json({ success: true, data: insight });
});

export default router;
