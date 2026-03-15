import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xls', '.xlsx'].includes(ext)) cb(null, true);
    else cb(new Error('Formato não suportado. Use CSV, XLS ou XLSX'));
  },
});

const FIELD_MAPPINGS: Record<string, string[]> = {
  name: ['nome', 'name', 'fornecedor', 'supplier', 'razao_social', 'empresa'],
  cnpj: ['cnpj', 'documento', 'doc'],
  category: ['categoria', 'category', 'cat', 'segmento', 'tipo'],
  contact_name: ['contato', 'contact', 'responsavel'],
  contact_email: ['email', 'e-mail', 'mail'],
  contact_phone: ['telefone', 'phone', 'tel', 'celular'],
  city: ['cidade', 'city', 'municipio'],
  state: ['estado', 'state', 'uf'],
  unit_price: ['preco', 'price', 'valor', 'valor_unitario', 'unit_price'],
  quantity: ['quantidade', 'qty', 'qtd'],
  item_description: ['item', 'descricao', 'description', 'produto'],
  delivery_days: ['prazo', 'entrega', 'delivery', 'lead_time'],
};

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const h = header.toLowerCase().replace(/[\s-]/g, '_');
    for (const [field, aliases] of Object.entries(FIELD_MAPPINGS)) {
      if (!mapping[field] && aliases.some(a => h.includes(a) || a.includes(h))) {
        mapping[field] = header;
      }
    }
  }
  return mapping;
}

function parseFileSync(filePath: string, ext: string): { headers: string[]; rows: string[][] } {
  if (ext === '.csv') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Papa = require('papaparse');
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse(content, { header: false });
    const data = result.data as string[][];
    return { headers: data[0] || [], rows: data.slice(1).filter((r: string[]) => r.some(c => c)) };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
    return { headers: data[0] || [], rows: data.slice(1).filter((r: string[]) => r.some(c => c)) };
  }
}

function processConfirm(uploadRec: Record<string, unknown>, mapping: Record<string, string>, updateDuplicates: boolean, userId: number) {
  const filePath = path.join(UPLOAD_DIR, uploadRec.filename as string);
  const { headers, rows } = parseFileSync(filePath, uploadRec.file_type as string);

  let suppliersCreated = 0, quotesCreated = 0, rowsError = 0;

  for (const row of rows) {
    const rowData: Record<string, string> = {};
    for (const [field, headerName] of Object.entries(mapping)) {
      const idx = headers.indexOf(headerName);
      if (idx >= 0) rowData[field] = String(row[idx] || '');
    }
    if (!rowData.name) { rowsError++; continue; }

    try {
      const existing = rowData.cnpj
        ? db.prepare('SELECT id FROM suppliers WHERE cnpj=?').get(rowData.cnpj) as { id: number } | undefined
        : undefined;

      if (existing && !updateDuplicates) {
        // skip
      } else if (existing && updateDuplicates) {
        db.prepare('UPDATE suppliers SET name=?,category=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .run(rowData.name, rowData.category || 'Outros', existing.id);
      } else {
        const supRes = db.prepare(`
          INSERT OR IGNORE INTO suppliers (name, cnpj, category, contact_name, contact_email, contact_phone, city, state, avg_price, delivery_days)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `).run(
          rowData.name, rowData.cnpj || null, rowData.category || 'Outros',
          rowData.contact_name || null, rowData.contact_email || null,
          rowData.contact_phone || null, rowData.city || null, rowData.state || null,
          rowData.unit_price ? parseFloat(rowData.unit_price) : null,
          rowData.delivery_days ? parseInt(rowData.delivery_days) : null
        );
        suppliersCreated += Number(supRes.changes);

        if (rowData.item_description && rowData.unit_price && supRes.lastInsertRowid) {
          const qty = parseFloat(rowData.quantity || '1');
          const up = parseFloat(rowData.unit_price);
          db.prepare(`INSERT INTO quotes (supplier_id, item_description, quantity, unit_price, total_price, uploaded_from) VALUES (?,?,?,?,?,?)`)
            .run(supRes.lastInsertRowid, rowData.item_description, qty, up, qty * up, uploadRec.original_name);
          quotesCreated++;
        }
      }
    } catch { rowsError++; }
  }

  const rowsProcessed = rows.length - rowsError;
  const status = rowsError === 0 ? 'completed' : rowsError === rows.length ? 'error' : 'partial';
  db.prepare('UPDATE uploads SET status=?, rows_processed=?, rows_error=? WHERE id=?')
    .run(status, rowsProcessed, rowsError, uploadRec.id);

  createNotification({
    userId,
    type: 'upload_completed',
    title: 'Upload concluído',
    message: `${uploadRec.original_name} processado — ${suppliersCreated} fornecedores importados`,
    link: '/upload',
  });

  return { rows_processed: rowsProcessed, rows_error: rowsError, suppliers_created: suppliersCreated, quotes_created: quotesCreated, status };
}

const router = Router();
router.use(verifyToken);

router.post('/', upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Arquivo não enviado' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const { headers, rows } = parseFileSync(req.file.path, ext);
  const result = db.prepare(`INSERT INTO uploads (filename, original_name, file_type, rows_total, status, uploaded_by) VALUES (?,?,?,?,?,?)`)
    .run(req.file.filename, req.file.originalname, ext, rows.length, 'processing', req.user!.name);
  const previewRows = rows.slice(0, 20).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || ''])));
  return res.json({ success: true, data: { upload_id: result.lastInsertRowid, headers, preview_rows: previewRows, suggested_mapping: autoDetectMapping(headers), total_rows: rows.length } });
});

router.get('/', (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  const total = (db.prepare('SELECT COUNT(*) as c FROM uploads').get() as { c: number }).c;
  const data = db.prepare('SELECT * FROM uploads ORDER BY created_at DESC LIMIT ? OFFSET ?').all(Number(limit), offset);
  return res.json({ success: true, data, meta: { page: Number(page), total, limit: Number(limit) } });
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  const rec = db.prepare('SELECT * FROM uploads WHERE id=?').get(req.params.id);
  if (!rec) return res.status(404).json({ success: false, error: 'Upload não encontrado' });
  return res.json({ success: true, data: rec });
});

router.post('/:id/confirm', (req: AuthRequest, res: Response) => {
  const { mapping, update_duplicates = false } = req.body;
  const rec = db.prepare('SELECT * FROM uploads WHERE id=?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!rec) return res.status(404).json({ success: false, error: 'Upload não encontrado' });
  const result = processConfirm(rec, mapping || {}, !!update_duplicates, req.user!.id);
  return res.json({ success: true, data: result });
});

export default router;
