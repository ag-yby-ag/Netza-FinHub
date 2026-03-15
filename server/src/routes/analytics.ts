import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generateInsight } from '../services/aiService';

const EXPORT_DIR = path.join(__dirname, '../../data/exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

const router = Router();
router.use(verifyToken);

// GET /api/analytics/summary
router.get('/summary', (req: AuthRequest, res: Response) => {
  const { period = '12', category } = req.query as Record<string, string>;
  const dateFilter = `date('now','-${Number(period)} months')`;
  let catFilter = '';
  const params: unknown[] = [];

  if (category) { catFilter = ' AND s.category=?'; params.push(category); }

  const current = db.prepare(`
    SELECT COUNT(*) as cnt, COALESCE(SUM(q.total_price),0) as vol, AVG(q.total_price) as avg_ticket
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved' AND q.created_at >= ${dateFilter} ${catFilter}
  `).get(...params) as { cnt: number; vol: number; avg_ticket: number };

  const pending = db.prepare(`
    SELECT COALESCE(SUM(q.total_price),0) as pv
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='pending' ${catFilter}
  `).get(...params) as { pv: number };

  const activeSuppliers = (db.prepare(`
    SELECT COUNT(DISTINCT q.supplier_id) as c FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved' AND q.created_at >= ${dateFilter} ${catFilter}
  `).get(...params) as { c: number }).c;

  const totalQuotes = (db.prepare(`
    SELECT COUNT(*) as c FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.created_at >= ${dateFilter} ${catFilter}
  `).get(...params) as { c: number }).c;

  return res.json({
    success: true, data: {
      total_spent: current.vol,
      total_quotes: totalQuotes,
      approved_quotes: current.cnt,
      avg_ticket: current.avg_ticket || 0,
      active_suppliers: activeSuppliers,
      pending_value: pending.pv,
    }
  });
});

// GET /api/analytics/trends
router.get('/trends', (req: AuthRequest, res: Response) => {
  const { period = '12', category } = req.query as Record<string, string>;
  let catFilter = '';
  const params: unknown[] = [];
  if (category) { catFilter = ' AND s.category=?'; params.push(category); }

  const rows = db.prepare(`
    SELECT strftime('%Y-%m', q.created_at) as month,
      COALESCE(SUM(q.total_price),0) as total,
      SUM(CASE WHEN q.status='approved' THEN q.total_price ELSE 0 END) as approved,
      COUNT(*) as count
    FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.created_at >= date('now','-${Number(period)} months') ${catFilter}
    GROUP BY month ORDER BY month ASC
  `).all(...params) as Array<{ month: string; total: number; approved: number; count: number }>;

  const data = rows.map(r => ({
    ...r,
    month_label: MONTH_LABELS[r.month?.split('-')[1]] ?? r.month,
  }));

  // Add 2-month forecast based on avg of last 3 real points
  if (data.length >= 2) {
    const last3 = data.slice(-3);
    const avgTotal = last3.reduce((s, p) => s + p.total, 0) / last3.length;
    const growth = last3.length >= 2
      ? (last3[last3.length - 1].total - last3[0].total) / Math.max(last3[0].total, 1) / last3.length
      : 0.05;
    const lastMonth = data[data.length - 1].month;
    const [y, m] = lastMonth.split('-').map(Number);
    for (let i = 1; i <= 2; i++) {
      const nm = m + i > 12 ? m + i - 12 : m + i;
      const ny = m + i > 12 ? y + 1 : y;
      const monthKey = String(nm).padStart(2, '0');
      data.push({
        month: `${ny}-${monthKey}`,
        month_label: MONTH_LABELS[monthKey] ?? monthKey,
        total: Math.round(avgTotal * (1 + growth * i)),
        approved: 0,
        count: 0,
        forecast: true,
      } as typeof data[0] & { forecast: boolean });
    }
  }

  return res.json({ success: true, data });
});

// GET /api/analytics/categories
router.get('/categories', (req: AuthRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT s.category, COUNT(*) as count, COALESCE(SUM(q.total_price),0) as total,
      AVG(s.rating) as avg_rating, COUNT(DISTINCT s.id) as supplier_count
    FROM quotes q JOIN suppliers s ON q.supplier_id=s.id
    WHERE q.status='approved'
    GROUP BY s.category ORDER BY total DESC
  `).all() as Array<{ category: string; count: number; total: number; avg_rating: number; supplier_count: number }>;

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const data = rows.map(r => ({
    ...r,
    percentage: grandTotal > 0 ? (r.total / grandTotal) * 100 : 0,
  }));

  return res.json({ success: true, data });
});

// GET /api/analytics/suppliers/ranking
router.get('/suppliers/ranking', (req: AuthRequest, res: Response) => {
  const { sort_by = 'volume', limit = '10' } = req.query as Record<string, string>;
  const orderBy = sort_by === 'rating' ? 'avg_rating DESC' : 'total_value DESC';

  const data = db.prepare(`
    SELECT s.id, s.name, s.category, s.rating, s.status, s.risk_level,
      COUNT(q.id) as quote_count,
      COALESCE(SUM(q.total_price),0) as total_value,
      CASE WHEN COUNT(q.id) > 0 THEN COALESCE(SUM(q.total_price),0) / COUNT(q.id) ELSE 0 END as avg_ticket,
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

// GET /api/analytics/export?format=xlsx|pdf&period=12
router.get('/export', async (req: AuthRequest, res: Response) => {
  const { format = 'xlsx', period = '12' } = req.query as Record<string, string>;

  try {
    // Fetch data
    const dateFilter = `date('now','-${Number(period)} months')`;

    const categories = db.prepare(`
      SELECT s.category, COUNT(*) as count, COALESCE(SUM(q.total_price),0) as total
      FROM quotes q JOIN suppliers s ON q.supplier_id=s.id
      WHERE q.status='approved' AND q.created_at >= ${dateFilter}
      GROUP BY s.category ORDER BY total DESC
    `).all() as Array<{ category: string; count: number; total: number }>;

    const ranking = db.prepare(`
      SELECT s.name, s.category, COUNT(q.id) as quote_count, COALESCE(SUM(q.total_price),0) as total_value
      FROM suppliers s LEFT JOIN quotes q ON s.id=q.supplier_id AND q.status='approved' AND q.created_at >= ${dateFilter}
      GROUP BY s.id ORDER BY total_value DESC LIMIT 20
    `).all() as Array<{ name: string; category: string; quote_count: number; total_value: number }>;

    if (format === 'xlsx') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();

      const catSheet = XLSX.utils.json_to_sheet(categories.map(c => ({
        Categoria: c.category,
        'Orçamentos': c.count,
        'Volume Total (R$)': c.total.toFixed(2),
      })));
      XLSX.utils.book_append_sheet(wb, catSheet, 'Categorias');

      const rankSheet = XLSX.utils.json_to_sheet(ranking.map(r => ({
        Fornecedor: r.name,
        Categoria: r.category,
        'Orçamentos': r.quote_count,
        'Volume Total (R$)': r.total_value.toFixed(2),
      })));
      XLSX.utils.book_append_sheet(wb, rankSheet, 'Ranking Fornecedores');

      const filename = `analytics-${period}m-${Date.now()}.xlsx`;
      const filePath = path.join(EXPORT_DIR, filename);
      XLSX.writeFile(wb, filePath);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const fileBuffer = fs.readFileSync(filePath);
      fs.unlinkSync(filePath);
      return res.send(fileBuffer);

    } else if (format === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Header
      doc.rect(0, 0, 595, 60).fill('#6DED67');
      doc.fillColor('#0D0D0D').font('Helvetica-Bold').fontSize(18).text('NETZA FinHub', 40, 18);
      doc.fontSize(10).text(`Analytics — Últimos ${period} meses`, 40, 40);

      doc.fillColor('#0D0D0D').moveDown(3);

      // Categories section
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0D0D0D').text('Distribuição por Categoria', 40, 80);
      doc.font('Helvetica').fontSize(10);
      let y = 100;
      doc.fillColor('#444').text('Categoria', 40, y).text('Orçamentos', 300, y).text('Volume Total', 430, y);
      y += 18;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
      y += 8;
      for (const c of categories.slice(0, 15)) {
        doc.fillColor('#222').text(c.category, 40, y).text(String(c.count), 300, y).text(`R$ ${c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 430, y);
        y += 18;
        if (y > 700) { doc.addPage(); y = 40; }
      }

      // Ranking section
      y += 20;
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0D0D0D').text('Top Fornecedores', 40, y);
      y += 20;
      doc.font('Helvetica').fontSize(10).fillColor('#444').text('Fornecedor', 40, y).text('Volume Total', 430, y);
      y += 18;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
      y += 8;
      for (const r of ranking.slice(0, 10)) {
        doc.fillColor('#222').text(r.name.slice(0, 40), 40, y).text(`R$ ${r.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 430, y);
        y += 18;
        if (y > 700) { doc.addPage(); y = 40; }
      }

      // Footer
      doc.fontSize(8).fillColor('#999').text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — NETZA FinHub`, 40, 810, { align: 'center' });

      doc.end();

      await new Promise<void>(resolve => doc.on('end', resolve));
      const pdfBuffer = Buffer.concat(chunks);
      const filename = `analytics-${period}m-${Date.now()}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }

    return res.status(400).json({ success: false, error: 'Formato inválido. Use xlsx ou pdf.' });
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao gerar exportação' });
  }
});

export default router;
