import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';

const EXPORT_DIR = path.join(__dirname, '../../data/exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const router = Router();
router.use(verifyToken);

// GET /api/reports/templates
router.get('/templates', (req: AuthRequest, res: Response) => {
  const templates = db.prepare('SELECT * FROM report_templates WHERE is_active=1').all();
  return res.json({ success: true, data: templates });
});

// GET /api/reports/stats
router.get('/stats', (req: AuthRequest, res: Response) => {
  const thisMonth = (db.prepare("SELECT COUNT(*) as c FROM generated_reports WHERE status='completed' AND created_at >= date('now','start of month')").get() as { c: number }).c;
  const activeSchedules = (db.prepare('SELECT COUNT(*) as c FROM report_schedules WHERE is_active=1').get() as { c: number }).c;
  const totalFiles = (db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(file_size),0) as size FROM generated_reports WHERE status='completed'").get() as { c: number; size: number });
  return res.json({ success: true, data: { reports_this_month: thisMonth, active_schedules: activeSchedules, total_files: totalFiles.c, total_size_mb: Math.round(totalFiles.size / 1024 / 1024 * 10) / 10 } });
});

// POST /api/reports/generate
router.post('/generate', (req: AuthRequest, res: Response) => {
  const { template_id, title, file_format = 'xlsx', filters = {}, sections = [], period_start, period_end } = req.body;

  const template = db.prepare('SELECT * FROM report_templates WHERE id=?').get(template_id) as Record<string, unknown> | undefined;
  if (!template) return res.status(404).json({ success: false, error: 'Template não encontrado' });

  const filename = `report-${Date.now()}.${file_format}`;
  const filePath = path.join(EXPORT_DIR, filename);
  const originalName = `${title || template.name}_${new Date().toISOString().split('T')[0]}.${file_format}`;

  const result = db.prepare(`
    INSERT INTO generated_reports (template_id, title, filename, original_name, file_format, file_path, filters, sections, period_start, period_end, status, generated_by, expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,'processing',?, datetime('now','+30 days'))
  `).run(template_id, title || template.name, filename, originalName, file_format, filePath, JSON.stringify(filters), JSON.stringify(sections), period_start, period_end, req.user!.id);

  const reportId = result.lastInsertRowid;

  // Async generation
  setImmediate(async () => {
    try {
      await generateReport(reportId as number, template, file_format, filters, period_start, period_end, filePath);
      const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
      db.prepare("UPDATE generated_reports SET status='completed', file_size=? WHERE id=?").run(fileSize, reportId);
    } catch (err) {
      db.prepare("UPDATE generated_reports SET status='error', error_message=? WHERE id=?").run(String(err), reportId);
    }
  });

  return res.status(202).json({ success: true, data: { report_id: reportId, status: 'processing' } });
});

async function generateReport(
  reportId: number, template: Record<string, unknown>, format: string,
  filters: Record<string, unknown>, periodStart: string, periodEnd: string, filePath: string
) {
  const queryType = template.query_type as string;

  if (format === 'pdf') {
    await generatePDF(queryType, filePath, template, periodStart, periodEnd);
  } else {
    generateXLSX(queryType, filePath, template, periodStart, periodEnd);
  }
}

function getReportData(queryType: string, periodStart?: string, periodEnd?: string) {
  const dateFilter = periodStart && periodEnd
    ? `AND created_at BETWEEN '${periodStart}' AND '${periodEnd}'`
    : '';

  switch (queryType) {
    case 'suppliers':
      return db.prepare(`SELECT id, name, cnpj, category, status, risk_level, rating, avg_price, delivery_days, city, state, created_at FROM suppliers ORDER BY name`).all();
    case 'quotes':
      return db.prepare(`SELECT q.id, q.item_description, q.quantity, q.unit, q.unit_price, q.total_price, q.status, q.valid_until, q.created_at, s.name as supplier_name, s.category FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id WHERE 1=1 ${dateFilter} ORDER BY q.created_at DESC`).all();
    case 'costs':
      return db.prepare(`SELECT s.category, COUNT(*) as orders, COALESCE(SUM(q.total_price),0) as total, AVG(q.total_price) as avg_price FROM quotes q LEFT JOIN suppliers s ON q.supplier_id=s.id WHERE q.status='approved' ${dateFilter} GROUP BY s.category ORDER BY total DESC`).all();
    case 'ranking':
      return db.prepare(`SELECT s.name, s.category, s.rating, COUNT(q.id) as orders, COALESCE(SUM(q.total_price),0) as volume FROM suppliers s LEFT JOIN quotes q ON s.id=q.supplier_id AND q.status='approved' ${dateFilter.replace('created_at', 'q.created_at')} GROUP BY s.id ORDER BY volume DESC LIMIT 20`).all();
    case 'risks':
      return db.prepare(`SELECT name, category, risk_level, status, rating, city FROM suppliers ORDER BY CASE risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, rating ASC`).all();
    case 'reviews':
      return db.prepare(`SELECT r.*, s.name as supplier_name, s.category FROM reviews r LEFT JOIN suppliers s ON r.supplier_id=s.id ORDER BY r.created_at DESC`).all();
    default:
      return [];
  }
}

function generateXLSX(queryType: string, filePath: string, template: Record<string, unknown>, periodStart?: string, periodEnd?: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');
  const data = getReportData(queryType, periodStart, periodEnd) as Record<string, unknown>[];

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['NETZA FinHub - Relatório', ''],
    ['Tipo', template.name],
    ['Gerado em', new Date().toLocaleDateString('pt-BR')],
    ['Total de registros', data.length],
    ['', ''],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  // Data sheet
  if (data.length > 0) {
    const wsData = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, wsData, 'Dados');
  }

  XLSX.writeFile(wb, filePath);
}

async function generatePDF(queryType: string, filePath: string, template: Record<string, unknown>, periodStart?: string, periodEnd?: string) {
  return new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const data = getReportData(queryType, periodStart, periodEnd) as Record<string, unknown>[];

    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header bar
    doc.rect(0, 0, doc.page.width, 8).fill('#6DED67');

    // Logo
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#0D0D0D').text('NETZA FinHub', 40, 30);
    doc.font('Helvetica').fontSize(12).fillColor('#737373').text(String(template.name), 40, 55);
    doc.fontSize(10).text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 40, 75);
    doc.moveDown(3);

    // Data table
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0D0D0D').text(`Total: ${data.length} registros`);
    doc.moveDown();

    if (data.length > 0) {
      const keys = Object.keys(data[0]).slice(0, 5);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#6DED67');
      doc.text(keys.join(' | '));
      doc.font('Helvetica').fontSize(8).fillColor('#404040');
      for (const row of data.slice(0, 30)) {
        const line = keys.map(k => String(row[k] ?? '')).join(' | ');
        doc.text(line);
      }
      if (data.length > 30) doc.text(`... e mais ${data.length - 30} registros`);
    }

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#0D0D0D');
    doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('NETZA&CO © 2026 — FinHub v1.0', 40, doc.page.height - 18);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// GET /api/reports/:id/status
router.get('/:id/status', (req: AuthRequest, res: Response) => {
  const report = db.prepare('SELECT id, status, error_message, file_size FROM generated_reports WHERE id=?').get(req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
  return res.json({ success: true, data: report });
});

// GET /api/reports/:id/download
router.get('/:id/download', (req: AuthRequest, res: Response) => {
  const report = db.prepare("SELECT * FROM generated_reports WHERE id=? AND status='completed'").get(req.params.id) as Record<string, unknown> | undefined;
  if (!report) return res.status(404).json({ success: false, error: 'Relatório não disponível' });

  db.prepare('UPDATE generated_reports SET download_count=download_count+1 WHERE id=?').run(req.params.id);
  return res.download(report.file_path as string, report.original_name as string);
});

// GET /api/reports/history
router.get('/history', (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  const total = (db.prepare("SELECT COUNT(*) as c FROM generated_reports").get() as { c: number }).c;
  const data = db.prepare(`
    SELECT gr.*, rt.name as template_name, rt.icon as template_icon, u.name as generated_by_name
    FROM generated_reports gr
    LEFT JOIN report_templates rt ON gr.template_id=rt.id
    LEFT JOIN users u ON gr.generated_by=u.id
    ORDER BY gr.created_at DESC LIMIT ? OFFSET ?
  `).all(Number(limit), offset);
  return res.json({ success: true, data, meta: { page: Number(page), total, limit: Number(limit) } });
});

// DELETE /api/reports/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const report = db.prepare('SELECT file_path FROM generated_reports WHERE id=?').get(req.params.id) as { file_path: string } | undefined;
  if (report?.file_path && fs.existsSync(report.file_path)) fs.unlinkSync(report.file_path);
  db.prepare('DELETE FROM generated_reports WHERE id=?').run(req.params.id);
  return res.json({ success: true, data: { message: 'Relatório removido' } });
});

// GET /api/reports/schedules
router.get('/schedules', (req: AuthRequest, res: Response) => {
  const data = db.prepare(`
    SELECT rs.*, rt.name as template_name FROM report_schedules rs
    LEFT JOIN report_templates rt ON rs.template_id=rt.id ORDER BY rs.created_at DESC
  `).all();
  return res.json({ success: true, data });
});

// POST /api/reports/schedules
router.post('/schedules', (req: AuthRequest, res: Response) => {
  const { template_id, name, file_format, frequency, time_of_day, recipients, day_of_week, day_of_month } = req.body;
  const result = db.prepare(`
    INSERT INTO report_schedules (template_id, name, file_format, frequency, time_of_day, recipients, day_of_week, day_of_month, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(template_id, name, file_format || 'xlsx', frequency, time_of_day || '08:00', JSON.stringify(recipients || []), day_of_week, day_of_month, req.user!.id);
  return res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
});

// PUT /api/reports/schedules/:id/toggle
router.put('/schedules/:id/toggle', (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE report_schedules SET is_active=NOT is_active WHERE id=?').run(req.params.id);
  const sched = db.prepare('SELECT is_active FROM report_schedules WHERE id=?').get(req.params.id) as { is_active: number };
  return res.json({ success: true, data: { is_active: !!sched.is_active } });
});

export default router;
