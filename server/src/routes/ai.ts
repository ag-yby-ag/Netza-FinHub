import { Router, Response } from 'express';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generateInsight } from '../services/aiService';

const router = Router();
router.use(verifyToken);

type AnalysisType = 'supplier_comparison' | 'cost_analysis' | 'risk_alert' | 'general_insight' | 'category_analysis';
const VALID_TYPES: AnalysisType[] = ['supplier_comparison', 'cost_analysis', 'risk_alert', 'general_insight', 'category_analysis'];

// POST /api/ai/analyze
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  const { type = 'general_insight', context_id, force_refresh = false } = req.body;
  const analysisType = VALID_TYPES.includes(type) ? type as AnalysisType : 'general_insight';
  const insight = await generateInsight(analysisType, context_id, !!force_refresh);
  return res.json({ success: true, data: insight });
});

// GET /api/ai/insights
router.get('/insights', (req: AuthRequest, res: Response) => {
  const insights = db.prepare(`
    SELECT * FROM ai_insights WHERE expires_at > datetime('now') ORDER BY created_at DESC LIMIT 10
  `).all();
  return res.json({ success: true, data: insights });
});

// GET /api/ai/insights/:id
router.get('/insights/:id', (req: AuthRequest, res: Response) => {
  const insight = db.prepare('SELECT * FROM ai_insights WHERE id=?').get(req.params.id);
  if (!insight) return res.status(404).json({ success: false, error: 'Insight não encontrado' });
  return res.json({ success: true, data: insight });
});

export default router;
