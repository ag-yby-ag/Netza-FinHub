import * as XLSX from 'xlsx';
import db from '../database/connection';

export interface ReportFilters {
  status?: string;
  category?: string;
  risk_level?: string;
  date_from?: string;
  date_to?: string;
  min_rating?: string;
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

function fetchSuppliersData(filters: ReportFilters): Record<string, unknown>[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.category) { conditions.push('category = ?'); params.push(filters.category); }
  if (filters.risk_level) { conditions.push('risk_level = ?'); params.push(filters.risk_level); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT name, cnpj, category, city, state, status, risk_level,
           ROUND(rating, 1) as rating, contact_name, contact_email, contact_phone,
           payment_terms, delivery_days, created_at
    FROM suppliers ${where}
    ORDER BY name
  `).all(...params) as Record<string, unknown>[];
}

function fetchQuotesData(filters: ReportFilters): Record<string, unknown>[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) { conditions.push('q.status = ?'); params.push(filters.status); }
  if (filters.category) { conditions.push('q.category = ?'); params.push(filters.category); }
  if (filters.date_from) { conditions.push('q.created_at >= ?'); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push('q.created_at <= ?'); params.push(filters.date_to + ' 23:59:59'); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT q.id, s.name as supplier_name, q.title, q.description,
           q.amount, q.currency, q.status, q.category, q.requested_by,
           q.approved_by, q.valid_until, q.created_at
    FROM quotes q
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    ${where}
    ORDER BY q.created_at DESC
  `).all(...params) as Record<string, unknown>[];
}

function fetchRiskData(filters: ReportFilters): Record<string, unknown>[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.risk_level) { conditions.push('risk_level = ?'); params.push(filters.risk_level); }
  if (filters.category) { conditions.push('category = ?'); params.push(filters.category); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT name, category, risk_level, status, ROUND(rating, 1) as rating,
           city, state, payment_terms, delivery_days, notes,
           contact_name, contact_email
    FROM suppliers ${where}
    ORDER BY CASE risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, name
  `).all(...params) as Record<string, unknown>[];
}

function fetchPerformanceData(filters: ReportFilters): Record<string, unknown>[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.category) { conditions.push('s.category = ?'); params.push(filters.category); }
  if (filters.min_rating) { conditions.push('s.rating >= ?'); params.push(parseFloat(filters.min_rating)); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT s.name, s.category, ROUND(s.rating, 1) as rating, s.rating_count,
           s.avg_price, s.delivery_days, s.payment_terms, s.status,
           COUNT(q.id) as total_quotes,
           ROUND(COALESCE(SUM(CASE WHEN q.status='approved' THEN q.amount ELSE 0 END), 0), 2) as approved_volume
    FROM suppliers s
    LEFT JOIN quotes q ON q.supplier_id = s.id
    ${where}
    GROUP BY s.id
    ORDER BY s.rating DESC, approved_volume DESC
  `).all(...params) as Record<string, unknown>[];
}

function fetchFinancialData(filters: ReportFilters): Record<string, unknown>[] {
  const conditions: string[] = ["q.status = 'approved'"];
  const params: unknown[] = [];
  if (filters.category) { conditions.push('q.category = ?'); params.push(filters.category); }
  if (filters.date_from) { conditions.push('q.created_at >= ?'); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push('q.created_at <= ?'); params.push(filters.date_to + ' 23:59:59'); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return db.prepare(`
    SELECT q.category, s.name as supplier_name,
           COUNT(*) as quote_count,
           ROUND(SUM(q.amount), 2) as total_amount,
           ROUND(AVG(q.amount), 2) as avg_amount,
           ROUND(MIN(q.amount), 2) as min_amount,
           ROUND(MAX(q.amount), 2) as max_amount
    FROM quotes q
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    ${where}
    GROUP BY q.category, q.supplier_id
    ORDER BY total_amount DESC
  `).all(...params) as Record<string, unknown>[];
}

function fetchUploadsData(filters: ReportFilters): Record<string, unknown>[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.date_from) { conditions.push('created_at >= ?'); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push('created_at <= ?'); params.push(filters.date_to + ' 23:59:59'); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT original_name, file_type, status, total_rows, processed_rows,
           error_rows, uploaded_by, created_at, updated_at
    FROM uploads ${where}
    ORDER BY created_at DESC
  `).all(...params) as Record<string, unknown>[];
}

// ─── Column display names ─────────────────────────────────────────────────────

const COLUMN_LABELS: Record<string, string> = {
  name: 'Nome', cnpj: 'CNPJ', category: 'Categoria', city: 'Cidade', state: 'Estado',
  status: 'Status', risk_level: 'Nível de Risco', rating: 'Avaliação',
  rating_count: 'Nº Avaliações', contact_name: 'Contato', contact_email: 'E-mail',
  contact_phone: 'Telefone', payment_terms: 'Condição Pagamento',
  delivery_days: 'Prazo Entrega (dias)', created_at: 'Criado em',
  id: 'ID', supplier_name: 'Fornecedor', title: 'Título', description: 'Descrição',
  amount: 'Valor (R$)', currency: 'Moeda', requested_by: 'Solicitado por',
  approved_by: 'Aprovado por', valid_until: 'Válido até', notes: 'Observações',
  avg_price: 'Preço Médio (R$)', total_quotes: 'Total Cotações',
  approved_volume: 'Volume Aprovado (R$)', quote_count: 'Cotações',
  total_amount: 'Total (R$)', avg_amount: 'Média (R$)',
  min_amount: 'Mínimo (R$)', max_amount: 'Máximo (R$)',
  original_name: 'Arquivo', file_type: 'Tipo', total_rows: 'Total Linhas',
  processed_rows: 'Processadas', error_rows: 'Erros', uploaded_by: 'Enviado por',
  updated_at: 'Atualizado em', period: 'Período',
};

function labelRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[COLUMN_LABELS[k] ?? k] = v;
  }
  return out;
}

// ─── Fetch by template category ───────────────────────────────────────────────

function fetchData(templateCategory: string, filters: ReportFilters): Record<string, unknown>[] {
  switch (templateCategory) {
    case 'suppliers': return fetchSuppliersData(filters);
    case 'quotes': return fetchQuotesData(filters);
    case 'risk': return fetchRiskData(filters);
    case 'performance': return fetchPerformanceData(filters);
    case 'financial': return fetchFinancialData(filters);
    case 'uploads': return fetchUploadsData(filters);
    default: return fetchSuppliersData(filters);
  }
}

// ─── XLSX generation ──────────────────────────────────────────────────────────

export function generateXLSX(templateCategory: string, filters: ReportFilters, title: string): Buffer {
  const data = fetchData(templateCategory, filters);
  const labeled = data.map(labelRow);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(labeled);

  // Column widths
  const cols = labeled.length > 0
    ? Object.keys(labeled[0]).map((k) => ({ wch: Math.max(k.length, 14) }))
    : [];
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));

  // Summary sheet
  const summaryData = [
    { 'Relatório': title },
    { 'Relatório': `Total de registros: ${data.length}` },
    { 'Relatório': `Gerado em: ${new Date().toLocaleString('pt-BR')}` },
    { 'Relatório': `Filtros: ${JSON.stringify(filters)}` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ─── CSV generation ───────────────────────────────────────────────────────────

export function generateCSV(templateCategory: string, filters: ReportFilters): string {
  const data = fetchData(templateCategory, filters);
  if (data.length === 0) return '';
  const labeled = data.map(labelRow);
  const headers = Object.keys(labeled[0]);

  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = [
    headers.map(escape).join(','),
    ...labeled.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return rows.join('\n');
}

// ─── HTML/PDF generation ──────────────────────────────────────────────────────

export function generateHTML(templateCategory: string, filters: ReportFilters, title: string): string {
  const data = fetchData(templateCategory, filters);
  const labeled = data.map(labelRow);
  const headers = labeled.length > 0 ? Object.keys(labeled[0]) : [];

  const tableRows = labeled.map((row) =>
    `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #6DED67; padding-bottom: 12px; }
  .logo { font-size: 18px; font-weight: 800; }
  .logo span { color: #4CAF50; }
  .report-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #0D0D0D; color: #6DED67; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .footer { margin-top: 16px; font-size: 10px; color: #999; text-align: right; }
  @media print { body { padding: 8px; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">NETZA<span>&</span>CO <span style="color:#666;font-size:12px">FinHub</span></div>
    <div class="report-title">${title}</div>
    <div class="meta">Gerado em ${new Date().toLocaleString('pt-BR')} · ${data.length} registros</div>
  </div>
  <button class="no-print" onclick="window.print()" style="padding:6px 16px;background:#6DED67;border:none;border-radius:6px;font-weight:600;cursor:pointer">
    Imprimir / Salvar PDF
  </button>
</div>
${headers.length > 0 ? `
<table>
  <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
` : '<p style="color:#999;margin-top:20px">Nenhum dado encontrado com os filtros aplicados.</p>'}
<div class="footer">Netza FinHub · Relatório confidencial · ${new Date().toLocaleDateString('pt-BR')}</div>
</body>
</html>`;
}

// ─── Row count ────────────────────────────────────────────────────────────────

export function countRows(templateCategory: string, filters: ReportFilters): number {
  return fetchData(templateCategory, filters).length;
}
