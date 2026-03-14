import { Router, Request, Response } from 'express';
import db from '../database/connection';

const router = Router();

// GET /api/dashboard/kpis
router.get('/kpis', (_req: Request, res: Response) => {
  const totalSuppliers = (db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as any).count;
  const activeSuppliers = (db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE status = 'active'").get() as any).count;
  const blockedSuppliers = (db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE status = 'blocked'").get() as any).count;
  const avgRating = (db.prepare('SELECT ROUND(AVG(rating), 1) as avg FROM suppliers WHERE rating > 0').get() as any).avg || 0;
  const totalQuotesValue = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM quotes WHERE status = 'approved'").get() as any).total;
  const pendingQuotes = (db.prepare("SELECT COUNT(*) as count FROM quotes WHERE status = 'pending'").get() as any).count;
  const avgDeliveryDays = (db.prepare('SELECT ROUND(AVG(delivery_days), 0) as avg FROM suppliers WHERE delivery_days IS NOT NULL').get() as any).avg || 0;

  res.json({
    success: true,
    data: {
      total_suppliers: totalSuppliers,
      active_suppliers: activeSuppliers,
      blocked_suppliers: blockedSuppliers,
      avg_rating: avgRating,
      total_quotes_value: totalQuotesValue,
      pending_quotes_count: pendingQuotes,
      avg_delivery_days: avgDeliveryDays,
    },
  });
});

// GET /api/dashboard/categories
router.get('/categories', (_req: Request, res: Response) => {
  const categories = db.prepare(`
    SELECT c.name, c.color, c.icon, COUNT(s.id) as supplier_count,
           COALESCE(ROUND(AVG(s.rating), 1), 0) as avg_rating,
           COALESCE(SUM(q.total), 0) as total_quotes_value
    FROM categories c
    LEFT JOIN suppliers s ON s.category = c.name
    LEFT JOIN (
      SELECT supplier_id, SUM(amount) as total FROM quotes WHERE status = 'approved' GROUP BY supplier_id
    ) q ON q.supplier_id = s.id
    GROUP BY c.id
    ORDER BY supplier_count DESC
  `).all();

  res.json({ success: true, data: categories });
});

// GET /api/dashboard/costs
router.get('/costs', (_req: Request, res: Response) => {
  const costByCategory = db.prepare(`
    SELECT s.category as name,
           COUNT(q.id) as quote_count,
           COALESCE(SUM(q.amount), 0) as total_amount,
           COALESCE(ROUND(AVG(q.amount), 2), 0) as avg_amount
    FROM quotes q
    JOIN suppliers s ON q.supplier_id = s.id
    WHERE q.status = 'approved'
    GROUP BY s.category
    ORDER BY total_amount DESC
  `).all();

  const costByStatus = db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
    FROM quotes
    GROUP BY status
  `).all();

  res.json({
    success: true,
    data: {
      by_category: costByCategory,
      by_status: costByStatus,
    },
  });
});

// GET /api/dashboard/trends - Monthly trends (mock 12 months)
router.get('/trends', (_req: Request, res: Response) => {
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  // Generate realistic trending data
  const baseQuotes = 12;
  const baseValue = 150000;
  const baseSuppliers = 35;

  const trends = months.map((month, i) => {
    const growth = 1 + (i * 0.03) + (Math.random() * 0.1 - 0.05);
    const seasonality = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.15;
    return {
      month,
      quotes_count: Math.round(baseQuotes * growth * seasonality),
      quotes_value: Math.round(baseValue * growth * seasonality),
      new_suppliers: Math.max(0, Math.round((Math.random() * 5) - 1)),
      active_suppliers: Math.round(baseSuppliers + i * 1.2),
    };
  });

  res.json({ success: true, data: trends });
});

// GET /api/dashboard/recent - Recent activity
router.get('/recent', (_req: Request, res: Response) => {
  const recentQuotes = db.prepare(`
    SELECT q.*, s.name as supplier_name
    FROM quotes q
    JOIN suppliers s ON q.supplier_id = s.id
    ORDER BY q.created_at DESC
    LIMIT 10
  `).all();

  const recentReviews = db.prepare(`
    SELECT r.*, s.name as supplier_name
    FROM reviews r
    JOIN suppliers s ON r.supplier_id = s.id
    ORDER BY r.created_at DESC
    LIMIT 5
  `).all();

  const recentSuppliers = db.prepare(`
    SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 5
  `).all();

  res.json({
    success: true,
    data: {
      recent_quotes: recentQuotes,
      recent_reviews: recentReviews,
      recent_suppliers: recentSuppliers,
    },
  });
});

export default router;
