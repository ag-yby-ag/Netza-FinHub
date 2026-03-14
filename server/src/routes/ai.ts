import 'dotenv/config';
import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import db from '../database/connection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL ?? 'qwen/qwen3-32b';

// ─── Real AI insight via Groq ────────────────────────────────────────────────

async function generateAIInsight(context?: string): Promise<{
  type: string;
  title: string;
  summary: string;
  details: string;
  confidence: number;
  impact_level: string;
}> {
  // Gather real data from DB
  const supplierCount = (db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as any).c;
  const quoteCount = (db.prepare('SELECT COUNT(*) as c FROM quotes').get() as any).c;
  const totalVolume = (db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM quotes WHERE status='approved'").get() as any).v;
  const avgRating = (db.prepare('SELECT ROUND(AVG(rating),1) as r FROM suppliers WHERE rating > 0').get() as any).r;
  const blockedCount = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE status='blocked'").get() as any).c;
  const highRiskCount = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE risk_level='high'").get() as any).c;
  const topCategory = (db.prepare("SELECT category, COUNT(*) as c FROM suppliers GROUP BY category ORDER BY c DESC LIMIT 1").get() as any);
  const pendingQuotes = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='pending'").get() as any).c;
  const topSuppliers = db.prepare("SELECT name, rating, category FROM suppliers WHERE status='active' ORDER BY rating DESC LIMIT 5").all() as any[];

  const contextData = `
Dados reais do Netza FinHub (plataforma B2B de procurement da NETZA&CO):
- Total de fornecedores: ${supplierCount}
- Total de cotações: ${quoteCount}
- Volume aprovado total: R$ ${Math.round(totalVolume / 1000)}K
- Rating médio: ${avgRating}/5.0
- Fornecedores bloqueados: ${blockedCount}
- Fornecedores de alto risco: ${highRiskCount}
- Categoria com mais fornecedores: ${topCategory?.category ?? 'N/A'} (${topCategory?.c ?? 0})
- Cotações pendentes: ${pendingQuotes}
- Top fornecedores: ${topSuppliers.map((s: any) => `${s.name} (${s.rating}★, ${s.category})`).join(', ')}
${context ? `Contexto adicional: ${context}` : ''}
  `.trim();

  if (!groq) {
    return generateMockInsight(context);
  }

  try {
    const prompt = `Você é um analista sênior de procurement B2B especializado em inteligência de fornecedores para empresas brasileiras.

${contextData}

Com base nestes dados reais da plataforma, gere UM insight estratégico acionável.

Responda APENAS com JSON válido neste formato exato (sem markdown, sem texto fora do JSON):
{
  "type": "cost_optimization",
  "title": "título direto em até 60 caracteres",
  "summary": "resumo executivo em 1-2 frases mencionando números reais dos dados",
  "details": "análise detalhada em 2-3 frases com recomendações práticas e impacto estimado em R$",
  "confidence": 0.87,
  "impact_level": "high"
}

Tipos válidos: cost_optimization, risk_alert, supplier_recommendation, trend_analysis, general
impact_level válidos: low, medium, high`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_completion_tokens: 2000,
      top_p: 0.95,
    });

    // Strip Qwen3 <think>...</think> reasoning blocks before parsing
    const rawFull = completion.choices[0]?.message?.content ?? '';
    const raw = rawFull.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      type: ['cost_optimization','risk_alert','supplier_recommendation','trend_analysis','general'].includes(parsed.type) ? parsed.type : 'general',
      title: String(parsed.title ?? 'Análise de fornecedores').slice(0, 120),
      summary: String(parsed.summary ?? '').slice(0, 500),
      details: String(parsed.details ?? '').slice(0, 1000),
      confidence: typeof parsed.confidence === 'number' ? Math.max(0.5, Math.min(0.99, parsed.confidence)) : 0.85,
      impact_level: ['low','medium','high'].includes(parsed.impact_level) ? parsed.impact_level : 'medium',
    };
  } catch (err) {
    console.error('[AI] Groq error, using mock:', err instanceof Error ? err.message : String(err));
    return generateMockInsight(context);
  }
}

// ─── Mock fallback ───────────────────────────────────────────────────────────

const insightTemplates = {
  cost_optimization: [
    { title: 'Oportunidade de renegociação de contratos', summary: 'Identificamos {count} fornecedores com contratos próximos do vencimento que podem ser renegociados com desconto de até {discount}%.', impact_level: 'high' },
    { title: 'Consolidação de fornecedores em {category}', summary: 'Existem {count} fornecedores na categoria {category} com serviços sobrepostos. A consolidação pode gerar economia de R$ {savings}.', impact_level: 'medium' },
  ],
  risk_alert: [
    { title: 'Fornecedor com queda de performance', summary: 'O fornecedor {supplier} teve queda de {percent}% na avaliação. Recomendamos monitoramento imediato.', impact_level: 'high' },
    { title: 'Concentração geográfica em {state}', summary: '{percent}% dos fornecedores estão em {state}. Diversificação geográfica é recomendada.', impact_level: 'medium' },
  ],
  supplier_recommendation: [
    { title: 'Novos fornecedores para {category}', summary: 'Com base nas avaliações, recomendamos explorar novas opções em {category} para melhorar custo-benefício.', impact_level: 'low' },
  ],
  trend_analysis: [
    { title: 'Tendência de aumento em {category}', summary: 'Os custos em {category} aumentaram {percent}% nos últimos 6 meses. Projeção indica continuidade.', impact_level: 'medium' },
  ],
};

function generateMockInsight(context?: string): {
  type: string; title: string; summary: string; details: string; confidence: number; impact_level: string;
} {
  const cats = db.prepare('SELECT name FROM categories ORDER BY RANDOM() LIMIT 3').all() as any[];
  const topSups = db.prepare('SELECT name, rating, state FROM suppliers WHERE rating >= 4.0 ORDER BY RANDOM() LIMIT 3').all() as any[];
  const stateRow = db.prepare("SELECT state, COUNT(*) as count FROM suppliers WHERE state IS NOT NULL GROUP BY state ORDER BY count DESC LIMIT 1").get() as any;

  const types = Object.keys(insightTemplates) as Array<keyof typeof insightTemplates>;
  const type = types[Math.floor(Math.random() * types.length)];
  const template = insightTemplates[type][Math.floor(Math.random() * insightTemplates[type].length)];

  const category = cats[0]?.name || 'Tecnologia';
  const supplier = topSups[0]?.name || 'Fornecedor';
  const state = stateRow?.state || 'SP';
  const percent = Math.floor(Math.random() * 25) + 5;
  const discount = Math.floor(Math.random() * 15) + 5;
  const count = Math.floor(Math.random() * 5) + 2;
  const savings = (Math.floor(Math.random() * 100) + 20) * 1000;

  const title = template.title.replace('{category}', category).replace('{supplier}', supplier).replace('{state}', state);
  const summary = template.summary
    .replace('{category}', category).replace('{supplier}', supplier).replace('{state}', state)
    .replace('{percent}', String(percent)).replace('{discount}', String(discount))
    .replace('{count}', String(count)).replace('{savings}', savings.toLocaleString('pt-BR'));

  const details = `Análise baseada em ${(db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as any).c} fornecedores e ${(db.prepare('SELECT COUNT(*) as c FROM quotes').get() as any).c} cotações. Top fornecedores: ${topSups.map((s: any) => `${s.name} (${s.rating}★)`).join(', ')}. ${context ? `Contexto: ${context}` : ''}`;

  return {
    type,
    title,
    summary,
    details,
    confidence: Math.round((Math.random() * 0.3 + 0.65) * 100) / 100,
    impact_level: template.impact_level,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/ai/analyze — generate and store new insight
router.post('/analyze', async (req: Request, res: Response) => {
  const { context, type } = req.body;

  const insight = await generateAIInsight(context || type);

  const result = db.prepare(`
    INSERT INTO ai_insights (type, title, summary, details, confidence, impact_level, status)
    VALUES (?, ?, ?, ?, ?, ?, 'new')
  `).run(insight.type, insight.title, insight.summary, insight.details, insight.confidence, insight.impact_level);

  const created = db.prepare('SELECT * FROM ai_insights WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: created });
});

// GET /api/ai/insights — list insights
router.get('/insights', (req: Request, res: Response) => {
  const { type, status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM ai_insights ${whereClause}`).get(...params) as { total: number };
  const insights = db.prepare(`SELECT * FROM ai_insights ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

  res.json({
    success: true,
    data: insights,
    meta: { page: pageNum, limit: limitNum, total: countRow.total, total_pages: Math.ceil(countRow.total / limitNum) },
  });
});

// GET /api/ai/insights/:id
router.get('/insights/:id', (req: Request, res: Response) => {
  const insight = db.prepare('SELECT * FROM ai_insights WHERE id = ?').get(req.params.id);
  if (!insight) throw new AppError('Insight não encontrado', 404);
  db.prepare("UPDATE ai_insights SET status = 'read' WHERE id = ? AND status = 'new'").run(req.params.id);
  res.json({ success: true, data: insight });
});

// GET /api/ai/status — check which AI backend is active
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      provider: groq ? 'groq' : 'mock',
      model: groq ? GROQ_MODEL : 'template-based',
      enabled: !!groq,
    },
  });
});

export default router;
