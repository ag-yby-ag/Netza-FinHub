import { Router, Request, Response } from 'express';
import db from '../database/connection';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateXLSX, generateCSV, generateHTML, countRows, ReportFilters } from '../services/reportService';

const router = Router();

// All report routes require authentication
router.use(requireAuth);

// ─── Templates ────────────────────────────────────────────────────────────────

// GET /api/reports/templates
router.get('/templates', (_req: Request, res: Response) => {
  const templates = db.prepare('SELECT * FROM report_templates WHERE is_active = 1 ORDER BY id').all();
  res.json({ success: true, data: templates });
});

// GET /api/reports/templates/:id
router.get('/templates/:id', (req: Request, res: Response) => {
  const template = db.prepare('SELECT * FROM report_templates WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!template) throw new AppError('Template não encontrado', 404);
  res.json({ success: true, data: template });
});

// ─── Generate report ──────────────────────────────────────────────────────────

// POST /api/reports/generate
router.post('/generate', async (req: Request, res: Response) => {
  const { template_id, format = 'xlsx', filters = {}, name } = req.body as {
    template_id: number;
    format: 'xlsx' | 'csv' | 'pdf';
    filters: ReportFilters;
    name?: string;
  };

  if (!template_id) throw new AppError('template_id é obrigatório', 400);
  if (!['xlsx', 'csv', 'pdf'].includes(format)) throw new AppError('Formato inválido', 400);

  const template = db.prepare('SELECT * FROM report_templates WHERE id = ? AND is_active = 1').get(template_id) as {
    id: number; name: string; category: string; description: string;
  } | undefined;
  if (!template) throw new AppError('Template não encontrado', 404);

  const reportName = name ?? `${template.name} - ${new Date().toLocaleDateString('pt-BR')}`;
  const userId = req.user?.id ?? null;
  const userName = req.user?.name ?? 'Sistema';

  // Insert pending record
  const insertResult = db.prepare(`
    INSERT INTO generated_reports (template_id, name, format, status, filters_used, generated_by, generated_by_name)
    VALUES (?, ?, ?, 'processing', ?, ?, ?)
  `).run(template_id, reportName, format, JSON.stringify(filters), userId, userName);

  const reportId = insertResult.lastInsertRowid as number;

  try {
    const rowCount = countRows(template.category, filters);
    let fileBuffer: Buffer;
    let contentType: string;
    let ext: string;

    if (format === 'xlsx') {
      fileBuffer = generateXLSX(template.category, filters, template.name);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = 'xlsx';
    } else if (format === 'csv') {
      const csvContent = generateCSV(template.category, filters);
      fileBuffer = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // BOM for Excel UTF-8
      contentType = 'text/csv; charset=utf-8';
      ext = 'csv';
    } else {
      // PDF — return HTML that browser can print/save as PDF
      const htmlContent = generateHTML(template.category, filters, template.name);
      fileBuffer = Buffer.from(htmlContent, 'utf-8');
      contentType = 'text/html; charset=utf-8';
      ext = 'html';
    }

    // Mark as completed
    db.prepare(`
      UPDATE generated_reports
      SET status = 'completed', row_count = ?, file_size = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(rowCount, fileBuffer.length, reportId);

    const fileName = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${ext}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Report-Id', String(reportId));
    res.setHeader('X-Row-Count', String(rowCount));
    res.send(fileBuffer);
  } catch (err) {
    db.prepare(`UPDATE generated_reports SET status = 'failed', error_message = ? WHERE id = ?`)
      .run(err instanceof Error ? err.message : 'Erro desconhecido', reportId);
    throw new AppError('Falha ao gerar relatório', 500);
  }
});

// POST /api/reports/preview — return row count without generating file
router.post('/preview', (req: Request, res: Response) => {
  const { template_id, filters = {} } = req.body as { template_id: number; filters: ReportFilters };
  if (!template_id) throw new AppError('template_id é obrigatório', 400);

  const template = db.prepare('SELECT * FROM report_templates WHERE id = ? AND is_active = 1').get(template_id) as {
    id: number; name: string; category: string;
  } | undefined;
  if (!template) throw new AppError('Template não encontrado', 404);

  const rowCount = countRows(template.category, filters);
  res.json({ success: true, data: { row_count: rowCount, template_name: template.name } });
});

// ─── History ──────────────────────────────────────────────────────────────────

// GET /api/reports/history
router.get('/history', (req: Request, res: Response) => {
  const { page = '1', limit = '20', format, status } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (format) { conditions.push('gr.format = ?'); params.push(format); }
  if (status) { conditions.push('gr.status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM generated_reports gr ${where}`).get(...params) as { total: number };
  const reports = db.prepare(`
    SELECT gr.*, rt.name as template_name, rt.icon as template_icon
    FROM generated_reports gr
    LEFT JOIN report_templates rt ON rt.id = gr.template_id
    ${where}
    ORDER BY gr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    success: true,
    data: reports,
    meta: { page: pageNum, limit: limitNum, total: countRow.total, total_pages: Math.ceil(countRow.total / limitNum) },
  });
});

// GET /api/reports/history/:id
router.get('/history/:id', (req: Request, res: Response) => {
  const report = db.prepare(`
    SELECT gr.*, rt.name as template_name, rt.category as template_category,
           rt.icon as template_icon, rt.filters as template_filters
    FROM generated_reports gr
    LEFT JOIN report_templates rt ON rt.id = gr.template_id
    WHERE gr.id = ?
  `).get(req.params.id) as (Record<string, unknown> & { template_category: string; filters_used: string }) | undefined;

  if (!report) throw new AppError('Relatório não encontrado', 404);
  res.json({ success: true, data: report });
});

// DELETE /api/reports/history/:id
router.delete('/history/:id', (req: Request, res: Response) => {
  const report = db.prepare('SELECT id FROM generated_reports WHERE id = ?').get(req.params.id);
  if (!report) throw new AppError('Relatório não encontrado', 404);
  db.prepare('DELETE FROM generated_reports WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: null });
});

// POST /api/reports/history/:id/download — re-generate and download
router.post('/history/:id/download', async (req: Request, res: Response) => {
  const report = db.prepare(`
    SELECT gr.*, rt.category as template_category, rt.name as template_name
    FROM generated_reports gr
    LEFT JOIN report_templates rt ON rt.id = gr.template_id
    WHERE gr.id = ?
  `).get(req.params.id) as (Record<string, unknown> & {
    format: string; template_category: string; template_name: string;
    filters_used: string; name: string;
  }) | undefined;

  if (!report) throw new AppError('Relatório não encontrado', 404);

  const filters: ReportFilters = JSON.parse(report.filters_used || '{}');
  const format = report.format as 'xlsx' | 'csv' | 'pdf';

  let fileBuffer: Buffer;
  let contentType: string;
  let ext: string;

  if (format === 'xlsx') {
    fileBuffer = generateXLSX(report.template_category, filters, report.template_name);
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    ext = 'xlsx';
  } else if (format === 'csv') {
    fileBuffer = Buffer.from('\uFEFF' + generateCSV(report.template_category, filters), 'utf-8');
    contentType = 'text/csv; charset=utf-8';
    ext = 'csv';
  } else {
    fileBuffer = Buffer.from(generateHTML(report.template_category, filters, report.template_name), 'utf-8');
    contentType = 'text/html; charset=utf-8';
    ext = 'html';
  }

  const fileName = `${report.template_name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${ext}`;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(fileBuffer);
});

// ─── Schedules ────────────────────────────────────────────────────────────────

// GET /api/reports/schedules
router.get('/schedules', (_req: Request, res: Response) => {
  const schedules = db.prepare(`
    SELECT rs.*, rt.name as template_name, rt.icon as template_icon
    FROM report_schedules rs
    LEFT JOIN report_templates rt ON rt.id = rs.template_id
    ORDER BY rs.created_at DESC
  `).all();
  res.json({ success: true, data: schedules });
});

// POST /api/reports/schedules
router.post('/schedules', (req: Request, res: Response) => {
  const { template_id, name, frequency, format, filters = {}, recipients = [] } = req.body as {
    template_id: number; name: string; frequency: 'daily' | 'weekly' | 'monthly';
    format: 'xlsx' | 'csv' | 'pdf'; filters: ReportFilters; recipients: string[];
  };

  if (!template_id || !name || !frequency || !format) {
    throw new AppError('template_id, name, frequency e format são obrigatórios', 400);
  }

  const now = new Date();
  let nextRun: string;
  if (frequency === 'daily') {
    const next = new Date(now); next.setDate(next.getDate() + 1); next.setHours(8, 0, 0, 0);
    nextRun = next.toISOString().replace('T', ' ').slice(0, 19);
  } else if (frequency === 'weekly') {
    const next = new Date(now); next.setDate(next.getDate() + (7 - next.getDay()) + 1); next.setHours(8, 0, 0, 0);
    nextRun = next.toISOString().replace('T', ' ').slice(0, 19);
  } else {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0);
    nextRun = next.toISOString().replace('T', ' ').slice(0, 19);
  }

  const result = db.prepare(`
    INSERT INTO report_schedules (template_id, name, frequency, format, filters, recipients, next_run, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(template_id, name, frequency, format, JSON.stringify(filters), JSON.stringify(recipients), nextRun, req.user?.id ?? null);

  const schedule = db.prepare(`
    SELECT rs.*, rt.name as template_name FROM report_schedules rs
    LEFT JOIN report_templates rt ON rt.id = rs.template_id
    WHERE rs.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: schedule });
});

// PUT /api/reports/schedules/:id
router.put('/schedules/:id', (req: Request, res: Response) => {
  const schedule = db.prepare('SELECT id FROM report_schedules WHERE id = ?').get(req.params.id);
  if (!schedule) throw new AppError('Agendamento não encontrado', 404);

  const { name, is_active, frequency, format, filters, recipients } = req.body;
  const updates: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (frequency !== undefined) { updates.push('frequency = ?'); params.push(frequency); }
  if (format !== undefined) { updates.push('format = ?'); params.push(format); }
  if (filters !== undefined) { updates.push('filters = ?'); params.push(JSON.stringify(filters)); }
  if (recipients !== undefined) { updates.push('recipients = ?'); params.push(JSON.stringify(recipients)); }

  if (updates.length === 0) throw new AppError('Nenhum campo para atualizar', 400);
  params.push(req.params.id);
  db.prepare(`UPDATE report_schedules SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT rs.*, rt.name as template_name FROM report_schedules rs
    LEFT JOIN report_templates rt ON rt.id = rs.template_id
    WHERE rs.id = ?
  `).get(req.params.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/reports/schedules/:id
router.delete('/schedules/:id', (req: Request, res: Response) => {
  const schedule = db.prepare('SELECT id FROM report_schedules WHERE id = ?').get(req.params.id);
  if (!schedule) throw new AppError('Agendamento não encontrado', 404);
  db.prepare('DELETE FROM report_schedules WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: null });
});

export default router;
