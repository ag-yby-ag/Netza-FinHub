import Groq from 'groq-sdk';
import db from '../db/database';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3-32b';

interface AIInsight {
  insight: string;
  highlights: string[];
  recommendations: string[];
}

type AnalysisType = 'supplier_comparison' | 'cost_analysis' | 'risk_alert' | 'general_insight' | 'category_analysis';

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildContext(type: AnalysisType, contextId?: string): string {
  const totalSuppliers = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE status = 'active'").get() as { c: number }).c;
  const totalApproved = (db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(total_price),0) as v FROM quotes WHERE status='approved'").get() as { c: number; v: number });
  const pending = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='pending'").get() as { c: number }).c;
  const highRisk = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE risk_level='high'").get() as { c: number }).c;
  const topCategories = db.prepare(`
    SELECT category, COUNT(*) as cnt, COALESCE(SUM(total_price),0) as vol
    FROM quotes WHERE status='approved'
    GROUP BY category ORDER BY vol DESC LIMIT 5
  `).all() as Array<{ category: string; cnt: number; vol: number }>;

  const baseCtx = `
Dados do sistema Netza FinHub (em tempo real):
- Fornecedores ativos: ${totalSuppliers}
- Orçamentos aprovados: ${totalApproved.c} (total: ${formatBRL(totalApproved.v)})
- Orçamentos pendentes: ${pending}
- Fornecedores em risco alto: ${highRisk}
- Top categorias por volume: ${topCategories.map(c => `${c.category}: ${formatBRL(c.vol)}`).join(', ')}
`;

  if (type === 'supplier_comparison' && contextId) {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(Number(contextId)) as Record<string, unknown> | undefined;
    const quotes = db.prepare("SELECT COUNT(*) as cnt, AVG(total_price) as avg, SUM(total_price) as total FROM quotes WHERE supplier_id = ? AND status='approved'").get(Number(contextId)) as { cnt: number; avg: number; total: number };
    return baseCtx + `\nFornecedor específico: ${JSON.stringify(supplier)}\nOrçamentos: ${JSON.stringify(quotes)}`;
  }

  if (type === 'category_analysis' && contextId) {
    const catData = db.prepare(`
      SELECT q.*, s.name as supplier_name FROM quotes q
      JOIN suppliers s ON q.supplier_id = s.id
      WHERE s.category = ? ORDER BY q.created_at DESC LIMIT 20
    `).all(contextId) as unknown[];
    return baseCtx + `\nAnálise da categoria "${contextId}": ${JSON.stringify(catData)}`;
  }

  if (type === 'risk_alert') {
    const riskSuppliers = db.prepare("SELECT name, category, risk_level, rating FROM suppliers WHERE risk_level IN ('high','medium') ORDER BY risk_level DESC LIMIT 10").all();
    return baseCtx + `\nFornecedores com risco: ${JSON.stringify(riskSuppliers)}`;
  }

  return baseCtx;
}

function generateFallback(type: AnalysisType): AIInsight {
  const totalSuppliers = (db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE status = 'active'").get() as { c: number }).c;
  const totalApproved = (db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(total_price),0) as v FROM quotes WHERE status='approved'").get() as { c: number; v: number });
  const pending = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='pending'").get() as { c: number }).c;

  const fallbacks: Record<AnalysisType, AIInsight> = {
    general_insight: {
      insight: `Seu ecossistema de procurement conta com ${totalSuppliers} fornecedores ativos e ${totalApproved.c} orçamentos aprovados. O volume total gerenciado é de ${formatBRL(totalApproved.v)}, com ${pending} orçamentos aguardando aprovação.`,
      highlights: [`${totalSuppliers} fornecedores ativos`, `${formatBRL(totalApproved.v)} em compras aprovadas`, `${pending} pendências para resolver`],
      recommendations: ['Revise os orçamentos pendentes para não perder prazos', 'Avalie fornecedores com baixo rating', 'Diversifique categorias para reduzir dependência'],
    },
    cost_analysis: {
      insight: `Análise de custos: ${totalApproved.c} orçamentos aprovados totalizando ${formatBRL(totalApproved.v)}.`,
      highlights: [`Total aprovado: ${formatBRL(totalApproved.v)}`, `Média por orçamento: ${totalApproved.c > 0 ? formatBRL(totalApproved.v / totalApproved.c) : 'N/A'}`],
      recommendations: ['Compare preços entre fornecedores da mesma categoria', 'Negocie contratos de longo prazo para melhores condições'],
    },
    supplier_comparison: {
      insight: 'Comparativo de fornecedores baseado em histórico de orçamentos e avaliações.',
      highlights: ['Compare ratings e preços', 'Analise histórico de entregas'],
      recommendations: ['Priorize fornecedores com rating acima de 4.5', 'Considere prazo de entrega além do preço'],
    },
    risk_alert: {
      insight: 'Monitoramento de riscos ativo. Revise periodicamente os fornecedores classificados como risco alto.',
      highlights: ['Verifique documentação de fornecedores com risco alto', 'Monitore fornecedores bloqueados'],
      recommendations: ['Diversifique fornecedores críticos', 'Estabeleça planos de contingência'],
    },
    category_analysis: {
      insight: 'Análise de categoria com dados de orçamentos e fornecedores.',
      highlights: ['Identifique os fornecedores mais competitivos', 'Analise sazonalidade de demanda'],
      recommendations: ['Consolide compras na categoria para ganhar escala', 'Avalie novos fornecedores para aumentar competitividade'],
    },
  };

  return fallbacks[type];
}

export async function generateInsight(
  type: AnalysisType,
  contextId?: string,
  forceRefresh = false
): Promise<AIInsight> {
  // Check cache
  if (!forceRefresh) {
    const cached = db.prepare(`
      SELECT * FROM ai_insights
      WHERE context_type = ? AND (context_id = ? OR context_id IS NULL)
      AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).get(type, contextId || null) as { insight_text: string; highlights: string; recommendations: string } | undefined;

    if (cached) {
      return {
        insight: cached.insight_text,
        highlights: JSON.parse(cached.highlights || '[]'),
        recommendations: JSON.parse(cached.recommendations || '[]'),
      };
    }
  }

  const context = buildContext(type, contextId);
  const systemPrompt = `Você é um analista financeiro especialista em procurement B2B para empresas brasileiras.
Analise os dados fornecidos e retorne um JSON com:
{
  "insight": "Parágrafo de 2-3 frases com a análise principal em português",
  "highlights": ["3 pontos-chave mais importantes"],
  "recommendations": ["3 recomendações acionáveis"]
}
Sempre use R$ com formatação brasileira. Seja direto e objetivo. Retorne SOMENTE o JSON.`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.6,
      max_completion_tokens: 1024,
      top_p: 0.95,
    });

    const content = completion.choices[0]?.message?.content || '';
    // Extract JSON from response (handle thinking tags)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as AIInsight;

    // Cache result for 24h
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO ai_insights (context_type, context_id, insight_text, highlights, recommendations, confidence, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, contextId || null, parsed.insight, JSON.stringify(parsed.highlights), JSON.stringify(parsed.recommendations), 0.9, expiresAt);

    return parsed;
  } catch (error) {
    console.error('Groq API error, using fallback:', error);
    return generateFallback(type);
  }
}
