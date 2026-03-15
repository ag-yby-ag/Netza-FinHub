import db from './database';

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('master','admin','manager','viewer')),
      department TEXT,
      job_title TEXT,
      avatar_url TEXT,
      timezone TEXT DEFAULT 'America/Sao_Paulo',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, pref_key)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      module TEXT NOT NULL,
      can_view BOOLEAN DEFAULT 1,
      can_create BOOLEAN DEFAULT 0,
      can_edit BOOLEAN DEFAULT 0,
      can_delete BOOLEAN DEFAULT 0,
      can_export BOOLEAN DEFAULT 0,
      UNIQUE(role, module)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      color TEXT,
      parent_id INTEGER REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cnpj TEXT UNIQUE,
      category TEXT NOT NULL,
      subcategory TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contact_role TEXT,
      city TEXT,
      state TEXT,
      avg_price REAL,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      delivery_days INTEGER,
      payment_terms TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','blocked','pending')),
      risk_level TEXT DEFAULT 'low' CHECK(risk_level IN ('low','medium','high')),
      notes TEXT,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      item_description TEXT NOT NULL,
      quantity REAL,
      unit TEXT DEFAULT 'unid',
      unit_price REAL,
      total_price REAL,
      currency TEXT DEFAULT 'BRL',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','expired')),
      valid_until DATE,
      uploaded_from TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      rows_total INTEGER DEFAULT 0,
      rows_processed INTEGER DEFAULT 0,
      rows_error INTEGER DEFAULT 0,
      status TEXT DEFAULT 'processing' CHECK(status IN ('processing','completed','error','partial')),
      error_log TEXT,
      uploaded_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      quality_score INTEGER CHECK(quality_score BETWEEN 1 AND 5),
      delivery_score INTEGER CHECK(delivery_score BETWEEN 1 AND 5),
      price_score INTEGER CHECK(price_score BETWEEN 1 AND 5),
      comment TEXT,
      reviewer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context_type TEXT NOT NULL,
      context_id TEXT,
      insight_text TEXT NOT NULL,
      highlights TEXT,
      recommendations TEXT,
      confidence REAL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN DEFAULT 0,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      available_formats TEXT NOT NULL DEFAULT '["xlsx"]',
      default_sections TEXT NOT NULL DEFAULT '[]',
      query_type TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generated_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES report_templates(id),
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_format TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      filters TEXT,
      sections TEXT,
      period_start DATE,
      period_end DATE,
      status TEXT DEFAULT 'processing' CHECK(status IN ('processing','completed','error')),
      error_message TEXT,
      generated_by INTEGER REFERENCES users(id),
      download_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES report_templates(id),
      name TEXT NOT NULL,
      file_format TEXT NOT NULL DEFAULT 'xlsx',
      filters TEXT,
      sections TEXT,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly','quarterly')),
      day_of_week INTEGER,
      day_of_month INTEGER,
      time_of_day TEXT NOT NULL DEFAULT '08:00',
      recipients TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      last_run DATETIME,
      next_run DATETIME,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT DEFAULT 'string',
      description TEXT,
      updated_by INTEGER REFERENCES users(id),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
    CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
    CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(rating DESC);
    CREATE INDEX IF NOT EXISTS idx_quotes_supplier ON quotes(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON generated_reports(status);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at DESC);
  `);

  console.log('✅ Migrations completed');
}
