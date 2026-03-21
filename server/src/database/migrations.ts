import db from './connection';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      color TEXT,
      supplier_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
      city TEXT,
      state TEXT,
      avg_price REAL,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      delivery_days INTEGER,
      payment_terms TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blocked', 'pending')),
      risk_level TEXT DEFAULT 'low' CHECK(risk_level IN ('low', 'medium', 'high')),
      notes TEXT,
      logo_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'BRL',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
      valid_until TEXT,
      category TEXT,
      requested_by TEXT,
      approved_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('csv', 'xlsx')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      total_rows INTEGER DEFAULT 0,
      processed_rows INTEGER DEFAULT 0,
      error_rows INTEGER DEFAULT 0,
      errors TEXT,
      preview_data TEXT,
      uploaded_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      reviewer_name TEXT NOT NULL,
      rating REAL NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      pros TEXT,
      cons TEXT,
      would_recommend INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('cost_optimization', 'risk_alert', 'supplier_recommendation', 'trend_analysis', 'general')),
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      context TEXT,
      confidence REAL DEFAULT 0.5,
      impact_level TEXT DEFAULT 'medium' CHECK(impact_level IN ('low', 'medium', 'high')),
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'dismissed', 'actioned')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
    CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
    CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(rating);
    CREATE INDEX IF NOT EXISTS idx_suppliers_state ON suppliers(state);
    CREATE INDEX IF NOT EXISTS idx_suppliers_risk_level ON suppliers(risk_level);
    CREATE INDEX IF NOT EXISTS idx_quotes_supplier_id ON quotes(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
    CREATE INDEX IF NOT EXISTS idx_reviews_supplier_id ON reviews(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
    CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
    CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('master', 'admin', 'manager', 'viewer')),
      department TEXT,
      job_title TEXT,
      avatar_url TEXT,
      timezone TEXT DEFAULT 'America/Sao_Paulo',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- User preferences (key-value)
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, pref_key)
    );

    -- Role permissions
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      module TEXT NOT NULL,
      can_view INTEGER DEFAULT 1,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      can_export INTEGER DEFAULT 0,
      UNIQUE(role, module)
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- System settings
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT DEFAULT 'string' CHECK(setting_type IN ('string', 'boolean', 'number', 'json')),
      description TEXT,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Auth sessions (simple token-based)
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_user_prefs ON user_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token);

    -- Report templates
    CREATE TABLE IF NOT EXISTS report_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      icon TEXT DEFAULT 'FileText',
      fields TEXT NOT NULL DEFAULT '[]',
      filters TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Generated reports
    CREATE TABLE IF NOT EXISTS generated_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES report_templates(id),
      name TEXT NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('xlsx', 'csv', 'pdf')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      file_path TEXT,
      file_size INTEGER,
      row_count INTEGER DEFAULT 0,
      filters_used TEXT DEFAULT '{}',
      generated_by INTEGER REFERENCES users(id),
      generated_by_name TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- Report schedules
    CREATE TABLE IF NOT EXISTS report_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES report_templates(id),
      name TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
      format TEXT NOT NULL CHECK(format IN ('xlsx', 'csv', 'pdf')),
      filters TEXT DEFAULT '{}',
      recipients TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_gen_reports_template ON generated_reports(template_id);
    CREATE INDEX IF NOT EXISTS idx_gen_reports_status ON generated_reports(status);
    CREATE INDEX IF NOT EXISTS idx_gen_reports_created ON generated_reports(created_at);

    -- Remote control sessions
    CREATE TABLE IF NOT EXISTS remote_control_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      api_key TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_rc_sessions_api_key ON remote_control_sessions(api_key);
  `);

  console.log('Migrations completed successfully.');
}
