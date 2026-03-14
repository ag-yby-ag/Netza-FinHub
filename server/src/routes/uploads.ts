import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import db from '../database/connection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Configure multer storage
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Apenas arquivos CSV e XLSX são permitidos', 400) as any);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function parseFile(filePath: string, fileType: string): any[] {
  if (fileType === 'csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse(content, { header: true, skipEmptyLines: true });
    return result.data as any[];
  } else {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }
}

// POST /api/uploads - Upload file
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Nenhum arquivo enviado', 400);
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileType = ext === '.csv' ? 'csv' : 'xlsx';

  let rows: any[] = [];
  try {
    rows = parseFile(req.file.path, fileType);
  } catch (err) {
    throw new AppError('Erro ao processar o arquivo. Verifique o formato.', 400);
  }

  const previewData = JSON.stringify(rows.slice(0, 20));

  const result = db.prepare(`
    INSERT INTO uploads (filename, original_name, file_type, status, total_rows, preview_data, uploaded_by)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    req.file.filename,
    req.file.originalname,
    fileType,
    rows.length,
    previewData,
    (req.body.uploaded_by as string) || null
  );

  const uploadRecord = db.prepare('SELECT * FROM uploads WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: uploadRecord });
});

// GET /api/uploads - List uploads
router.get('/', (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = '';
  const params: any[] = [];

  if (status) {
    whereClause = 'WHERE status = ?';
    params.push(status);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM uploads ${whereClause}`
  ).get(...params) as { total: number };

  const uploads = db.prepare(
    `SELECT id, filename, original_name, file_type, status, total_rows, processed_rows, error_rows, uploaded_by, created_at, updated_at
     FROM uploads ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    success: true,
    data: uploads,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / limitNum),
    },
  });
});

// GET /api/uploads/:id - Status
router.get('/:id', (req: Request, res: Response) => {
  const uploadRecord = db.prepare(
    'SELECT id, filename, original_name, file_type, status, total_rows, processed_rows, error_rows, errors, uploaded_by, created_at, updated_at FROM uploads WHERE id = ?'
  ).get(req.params.id);

  if (!uploadRecord) {
    throw new AppError('Upload não encontrado', 404);
  }

  res.json({ success: true, data: uploadRecord });
});

// GET /api/uploads/:id/preview - First 20 rows
router.get('/:id/preview', (req: Request, res: Response) => {
  const uploadRecord = db.prepare(
    'SELECT preview_data FROM uploads WHERE id = ?'
  ).get(req.params.id) as any;

  if (!uploadRecord) {
    throw new AppError('Upload não encontrado', 404);
  }

  const previewData = uploadRecord.preview_data ? JSON.parse(uploadRecord.preview_data) : [];

  res.json({ success: true, data: previewData });
});

// POST /api/uploads/:id/confirm - Confirm import
router.post('/:id/confirm', (req: Request, res: Response) => {
  const uploadRecord = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id) as any;

  if (!uploadRecord) {
    throw new AppError('Upload não encontrado', 404);
  }

  if (uploadRecord.status !== 'pending') {
    throw new AppError(`Upload não pode ser confirmado. Status atual: ${uploadRecord.status}`, 400);
  }

  // Update status to processing
  db.prepare("UPDATE uploads SET status = 'processing', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  try {
    const filePath = path.join(uploadDir, uploadRecord.filename);
    const rows = parseFile(filePath, uploadRecord.file_type);

    let processedRows = 0;
    let errorRows = 0;
    const errors: string[] = [];

    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, cnpj, category, subcategory, contact_name, contact_email, contact_phone, city, state, avg_price, delivery_days, payment_terms, status, risk_level, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const importTx = db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name && !row.nome) {
            errors.push(`Linha ${i + 2}: Nome é obrigatório`);
            errorRows++;
            continue;
          }
          if (!row.category && !row.categoria) {
            errors.push(`Linha ${i + 2}: Categoria é obrigatória`);
            errorRows++;
            continue;
          }

          insertSupplier.run(
            row.name || row.nome,
            row.cnpj || null,
            row.category || row.categoria,
            row.subcategory || row.subcategoria || null,
            row.contact_name || row.contato_nome || null,
            row.contact_email || row.contato_email || row.email || null,
            row.contact_phone || row.contato_telefone || row.telefone || null,
            row.city || row.cidade || null,
            row.state || row.estado || null,
            row.avg_price || row.preco_medio ? parseFloat(row.avg_price || row.preco_medio) : null,
            row.delivery_days || row.prazo_entrega ? parseInt(row.delivery_days || row.prazo_entrega) : null,
            row.payment_terms || row.condicoes_pagamento || null,
            row.status || 'active',
            row.risk_level || row.nivel_risco || 'low',
            row.notes || row.observacoes || null
          );
          processedRows++;
        } catch (err: any) {
          errors.push(`Linha ${i + 2}: ${err.message}`);
          errorRows++;
        }
      }
    });

    importTx();

    // Update category counts
    db.exec(`
      UPDATE categories SET supplier_count = (
        SELECT COUNT(*) FROM suppliers WHERE suppliers.category = categories.name
      )
    `);

    db.prepare(`
      UPDATE uploads SET status = 'completed', processed_rows = ?, error_rows = ?, errors = ?, updated_at = datetime('now') WHERE id = ?
    `).run(processedRows, errorRows, errors.length > 0 ? JSON.stringify(errors) : null, req.params.id);

    const updated = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    db.prepare("UPDATE uploads SET status = 'failed', errors = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify([err.message]), req.params.id);
    throw new AppError(`Falha na importação: ${err.message}`, 500);
  }
});

// DELETE /api/uploads/:id - Cancel
router.delete('/:id', (req: Request, res: Response) => {
  const uploadRecord = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id) as any;

  if (!uploadRecord) {
    throw new AppError('Upload não encontrado', 404);
  }

  if (uploadRecord.status === 'completed') {
    throw new AppError('Não é possível cancelar um upload já concluído', 400);
  }

  db.prepare("UPDATE uploads SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  // Try to delete the file
  try {
    const filePath = path.join(uploadDir, uploadRecord.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // File deletion is not critical
  }

  res.json({ success: true, data: { message: 'Upload cancelado com sucesso' } });
});

export default router;
