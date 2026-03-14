import db from './connection';
import { runMigrations } from './migrations';
import bcrypt from 'bcryptjs';

function seed(): void {
  console.log('Running migrations...');
  runMigrations();

  // ===== Always ensure master user exists =====
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    console.log('Creating master user...');
    const masterHash = bcrypt.hashSync('admin123', 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, role, department, job_title, timezone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('Vinícius Santos', 'vinicius@netzaco.com.br', masterHash,
      '(11) 99888-7766', 'master', 'Operações', 'Diretor de Operações', 'America/Sao_Paulo', 'active');

    const userId = result.lastInsertRowid as number;

    const insertPref = db.prepare(`INSERT OR IGNORE INTO user_preferences (user_id, pref_key, pref_value) VALUES (?, ?, ?)`);
    const prefs = [['theme','dark'],['sidebar_compact','false'],['email_notifications','true'],['ai_auto_insights','true'],['currency_format','BRL'],['date_format','dd/MM/yyyy'],['items_per_page','25'],['language','pt-BR'],['notif_upload_done','true'],['notif_quote_expiring','true'],['notif_new_supplier','true'],['notif_ai_insight','true'],['notif_risk_push','false'],['notif_daily_summary','false'],['notif_daily_time','08:00']];
    const prefTx = db.transaction(() => { for (const [k,v] of prefs) insertPref.run(userId, k, v); });
    prefTx();

    const insertPerm = db.prepare(`INSERT OR IGNORE INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const permissions = [['master','suppliers',1,1,1,1,1],['master','uploads',1,1,1,1,1],['master','reports',1,1,1,1,1],['master','settings',1,1,1,1,1],['master','users',1,1,1,1,1],['master','ai',1,1,1,1,1],['admin','suppliers',1,1,1,1,1],['admin','uploads',1,1,1,0,1],['admin','reports',1,1,0,0,1],['admin','settings',1,0,1,0,0],['admin','users',1,1,1,0,0],['admin','ai',1,1,0,0,1],['manager','suppliers',1,1,1,0,1],['manager','uploads',1,1,0,0,0],['manager','reports',1,0,0,0,1],['manager','settings',1,0,0,0,0],['manager','users',0,0,0,0,0],['manager','ai',1,1,0,0,0],['viewer','suppliers',1,0,0,0,0],['viewer','uploads',1,0,0,0,0],['viewer','reports',1,0,0,0,0],['viewer','settings',1,0,0,0,0],['viewer','users',0,0,0,0,0],['viewer','ai',1,0,0,0,0]];
    const permTx = db.transaction(() => { for (const p of permissions) insertPerm.run(...p as [string, string, number, number, number, number, number]); });
    permTx();

    const insertSetting = db.prepare(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)`);
    const settings = [['app_name','Netza FinHub','string','Nome da plataforma'],['max_upload_size_mb','10','number','Tamanho máximo de upload em MB'],['allowed_file_types','["csv","xls","xlsx"]','json','Tipos de arquivo aceitos'],['ai_enabled','true','boolean','IA de insights ativa'],['ai_auto_analyze','true','boolean','Análise automática em uploads'],['session_timeout_min','480','number','Timeout de sessão em minutos'],['maintenance_mode','false','boolean','Modo manutenção'],['default_currency','BRL','string','Moeda padrão'],['default_pagination','25','number','Itens por página padrão'],['backup_enabled','true','boolean','Backup automático ativo']];
    const settingsTx = db.transaction(() => { for (const s of settings) insertSetting.run(...s as [string, string, string, string]); });
    settingsTx();

    // Additional users
    const otherUsers = [
      ['Ana Costa', 'ana@netzaco.com.br', bcrypt.hashSync('admin123', 10), '(11) 98765-4321', 'admin', 'Marketing', 'Gerente de Marketing'],
      ['Carlos Mendes', 'carlos@netzaco.com.br', bcrypt.hashSync('admin123', 10), '(21) 97654-3210', 'manager', 'Compras', 'Analista de Compras'],
      ['Julia Ferreira', 'julia@netzaco.com.br', bcrypt.hashSync('viewer123', 10), '(31) 96543-2109', 'viewer', 'Financeiro', 'Analista Financeiro'],
    ];
    const addUserTx = db.transaction(() => {
      for (const u of otherUsers) {
        db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, phone, role, department, job_title, timezone, status) VALUES (?,?,?,?,?,?,?,'America/Sao_Paulo','active')`).run(...u as [string,string,string,string,string,string,string]);
      }
    });
    addUserTx();

    console.log('  ✓ 4 users seeded: vinicius / ana / carlos / julia');
  }

  // ===== Report Templates (always ensure they exist) =====
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM report_templates').get() as { count: number };
  if (templateCount.count === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO report_templates (name, description, category, icon, fields, filters)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const templates = [
      ['Cadastro de Fornecedores', 'Lista completa de fornecedores com dados cadastrais, status, categoria e avaliação.', 'suppliers', 'Users', JSON.stringify(['name','cnpj','category','city','state','status','risk_level','rating','contact_email','contact_phone','created_at']), JSON.stringify({status:'',category:'',risk_level:''})],
      ['Cotações por Período', 'Relatório de cotações com valores, fornecedores e status por período selecionado.', 'quotes', 'FileText', JSON.stringify(['id','supplier_name','title','amount','status','category','requested_by','valid_until','created_at']), JSON.stringify({status:'',category:'',date_from:'',date_to:''})],
      ['Análise de Riscos', 'Mapeamento de fornecedores por nível de risco com detalhes de ação recomendada.', 'risk', 'ShieldAlert', JSON.stringify(['name','category','risk_level','status','rating','city','state','notes']), JSON.stringify({risk_level:'',category:''})],
      ['Performance de Fornecedores', 'Ranking de fornecedores por avaliação, volume de cotações e histórico de entregas.', 'performance', 'BarChart3', JSON.stringify(['name','category','rating','rating_count','avg_price','delivery_days','payment_terms','status']), JSON.stringify({category:'',min_rating:''})],
      ['Volume Financeiro', 'Resumo de volume financeiro aprovado por categoria, fornecedor e período.', 'financial', 'DollarSign', JSON.stringify(['category','supplier_name','total_amount','quote_count','avg_amount','period']), JSON.stringify({date_from:'',date_to:'',category:''})],
      ['Auditoria de Uploads', 'Histórico de importações de dados com status, registros processados e erros.', 'uploads', 'Upload', JSON.stringify(['original_name','file_type','status','total_rows','processed_rows','error_rows','uploaded_by','created_at']), JSON.stringify({status:'',date_from:'',date_to:''})],
    ];
    const templateTx = db.transaction(() => {
      for (const t of templates) insertTemplate.run(...t as [string,string,string,string,string,string]);
    });
    templateTx();
    console.log('  ✓ 6 report templates seeded');
  }

  // Check if data already exists
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (count.count > 0) {
    console.log('Database already seeded. Skipping categories/suppliers/quotes.');
    return;
  }

  console.log('Seeding database...');

  // ===== Categories =====
  const insertCategory = db.prepare(
    'INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)'
  );

  const categories = [
    ['Marketing', 'Agências de marketing, publicidade e branding', 'Megaphone', '#3B82F6'],
    ['Tecnologia', 'Desenvolvimento de software, TI e infraestrutura', 'Cpu', '#8B5CF6'],
    ['Eventos', 'Organização de eventos corporativos e feiras', 'Calendar', '#EC4899'],
    ['Logística', 'Transporte, armazenagem e distribuição', 'Truck', '#F97316'],
    ['Escritório', 'Material de escritório e papelaria', 'Briefcase', '#6B7280'],
    ['Alimentação', 'Restaurantes corporativos, coffee break e catering', 'UtensilsCrossed', '#10B981'],
    ['Limpeza', 'Serviços de limpeza e higienização', 'Sparkles', '#06B6D4'],
    ['Segurança', 'Segurança patrimonial, eletrônica e do trabalho', 'Shield', '#EF4444'],
    ['Consultoria', 'Consultoria empresarial e estratégica', 'LineChart', '#F59E0B'],
    ['Jurídico', 'Assessoria jurídica e compliance', 'Scale', '#64748B'],
    ['Contabilidade', 'Serviços contábeis e fiscais', 'Calculator', '#059669'],
    ['RH/Recrutamento', 'Recrutamento, seleção e treinamento', 'Users', '#7C3AED'],
    ['Infraestrutura', 'Manutenção predial e facilities', 'Building2', '#D97706'],
    ['Comunicação', 'Assessoria de imprensa e comunicação corporativa', 'MessageSquare', '#2563EB'],
    ['Viagens', 'Agências de viagens corporativas e hospedagem', 'Plane', '#DC2626'],
  ];

  const insertCategoryTx = db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(...cat);
    }
  });
  insertCategoryTx();

  // ===== Suppliers (50) =====
  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, cnpj, category, subcategory, contact_name, contact_email, contact_phone, city, state, avg_price, rating, rating_count, delivery_days, payment_terms, status, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const suppliers = [
    // Marketing (5)
    ['Agência Impulso Digital', '12.345.678/0001-01', 'Marketing', 'Marketing Digital', 'Carla Mendes', 'carla@impulsodigital.com.br', '(11) 98765-4321', 'São Paulo', 'SP', 15000, 4.5, 23, 7, '30 dias', 'active', 'low', null],
    ['BrandUp Comunicação', '23.456.789/0001-02', 'Marketing', 'Branding', 'Roberto Alves', 'roberto@brandup.com.br', '(21) 99876-5432', 'Rio de Janeiro', 'RJ', 22000, 4.2, 15, 10, '30/60 dias', 'active', 'low', null],
    ['Criativa Propaganda', '34.567.890/0001-03', 'Marketing', 'Publicidade', 'Ana Paula Silva', 'ana@criativaprop.com.br', '(31) 97654-3210', 'Belo Horizonte', 'MG', 18500, 3.8, 8, 14, '30 dias', 'active', 'medium', null],
    ['Mídia Express Ltda', '45.678.901/0001-04', 'Marketing', 'Mídia Paga', 'Fernando Costa', 'fernando@midiaexpress.com.br', '(11) 96543-2109', 'São Paulo', 'SP', 35000, 4.7, 31, 3, '15 dias', 'active', 'low', null],
    ['Social Buzz Marketing', '56.789.012/0001-05', 'Marketing', 'Redes Sociais', 'Juliana Santos', 'juliana@socialbuzz.com.br', '(41) 95432-1098', 'Curitiba', 'PR', 8500, 3.2, 5, 5, '30 dias', 'pending', 'medium', 'Aguardando documentação'],

    // Tecnologia (5)
    ['TechNova Soluções', '67.890.123/0001-06', 'Tecnologia', 'Desenvolvimento', 'Lucas Oliveira', 'lucas@technova.com.br', '(11) 94321-0987', 'São Paulo', 'SP', 45000, 4.8, 42, 30, '30/60/90 dias', 'active', 'low', null],
    ['CloudBR Infraestrutura', '78.901.234/0001-07', 'Tecnologia', 'Cloud', 'Marcos Pereira', 'marcos@cloudbr.com.br', '(21) 93210-9876', 'Rio de Janeiro', 'RJ', 12000, 4.3, 19, 2, '30 dias', 'active', 'low', null],
    ['CyberShield Segurança Digital', '89.012.345/0001-08', 'Tecnologia', 'Segurança da Informação', 'Patricia Lima', 'patricia@cybershield.com.br', '(11) 92109-8765', 'São Paulo', 'SP', 28000, 4.6, 27, 5, '30 dias', 'active', 'low', null],
    ['DataBridge Analytics', '90.123.456/0001-09', 'Tecnologia', 'Business Intelligence', 'Ricardo Souza', 'ricardo@databridge.com.br', '(48) 91098-7654', 'Florianópolis', 'SC', 32000, 4.1, 12, 15, '30/60 dias', 'active', 'medium', null],
    ['AppMaster Dev', '01.234.567/0001-10', 'Tecnologia', 'Aplicativos Mobile', 'Gabriela Ferreira', 'gabriela@appmaster.com.br', '(51) 90987-6543', 'Porto Alegre', 'RS', 55000, 3.5, 7, 45, '30/60/90 dias', 'inactive', 'high', 'Atrasos recorrentes na entrega'],

    // Eventos (3)
    ['Eventus Produções', '11.223.344/0001-11', 'Eventos', 'Eventos Corporativos', 'Marina Rocha', 'marina@eventus.com.br', '(11) 99887-6655', 'São Paulo', 'SP', 65000, 4.9, 35, 20, '50% antecipado + 50% no evento', 'active', 'low', null],
    ['Feiras & Convenções Brasil', '22.334.455/0001-12', 'Eventos', 'Feiras', 'Eduardo Martins', 'eduardo@fcbrasil.com.br', '(21) 98776-5544', 'Rio de Janeiro', 'RJ', 120000, 4.4, 18, 30, '30/60/90 dias', 'active', 'low', null],
    ['Happy Hour Eventos', '33.445.566/0001-13', 'Eventos', 'Confraternizações', 'Camila Dias', 'camila@happyhoureventos.com.br', '(31) 97665-4433', 'Belo Horizonte', 'MG', 15000, 3.9, 11, 7, '30 dias', 'active', 'low', null],

    // Logística (4)
    ['TransLog Expressa', '44.556.677/0001-14', 'Logística', 'Transporte', 'José Carlos Neto', 'jcarlos@translog.com.br', '(11) 96554-3322', 'São Paulo', 'SP', 8500, 4.0, 28, 1, '15 dias', 'active', 'low', null],
    ['Armazém Central Ltda', '55.667.788/0001-15', 'Logística', 'Armazenagem', 'Renata Barros', 'renata@armazemcentral.com.br', '(19) 95443-2211', 'Campinas', 'SP', 22000, 3.7, 9, 3, '30 dias', 'active', 'medium', null],
    ['Entrega Rápida BR', '66.778.899/0001-16', 'Logística', 'Last Mile', 'Antonio Ferraz', 'antonio@entregarapida.com.br', '(41) 94332-1100', 'Curitiba', 'PR', 5500, 2.8, 14, 1, '15 dias', 'blocked', 'high', 'Muitas reclamações de extravio'],
    ['MoveCargo Internacional', '77.889.900/0001-17', 'Logística', 'Comércio Exterior', 'Paula Medeiros', 'paula@movecargo.com.br', '(13) 93221-0099', 'Santos', 'SP', 85000, 4.5, 22, 15, '30/60 dias', 'active', 'low', null],

    // Escritório (3)
    ['PapelTudo Suprimentos', '88.990.011/0001-18', 'Escritório', 'Papelaria', 'Marcos Vinícius', 'marcos@papeltudo.com.br', '(11) 92110-9988', 'São Paulo', 'SP', 3200, 4.1, 33, 2, '30 dias', 'active', 'low', null],
    ['Office Premium', '99.001.122/0001-19', 'Escritório', 'Móveis', 'Luciana Campos', 'luciana@officepremium.com.br', '(21) 91009-8877', 'Rio de Janeiro', 'RJ', 45000, 4.6, 16, 20, '30/60/90 dias', 'active', 'low', null],
    ['PrintMaster Impressões', '10.112.233/0001-20', 'Escritório', 'Impressão', 'Carlos Eduardo', 'carlos@printmaster.com.br', '(11) 99098-7766', 'São Paulo', 'SP', 6800, 3.4, 7, 5, '30 dias', 'active', 'medium', null],

    // Alimentação (4)
    ['Sabor Corporativo', '21.223.344/0001-21', 'Alimentação', 'Restaurante Corporativo', 'Maria Helena', 'maria@saborcorporativo.com.br', '(11) 98087-6655', 'São Paulo', 'SP', 42000, 4.3, 25, 1, '30 dias', 'active', 'low', null],
    ['Coffee Break Gourmet', '32.334.455/0001-22', 'Alimentação', 'Coffee Break', 'Daniela Reis', 'daniela@coffeebreakgourmet.com.br', '(21) 97076-5544', 'Rio de Janeiro', 'RJ', 8000, 4.7, 38, 1, '15 dias', 'active', 'low', null],
    ['Cestão Cestas Corporativas', '43.445.566/0001-23', 'Alimentação', 'Cestas Básicas', 'Roberto Nascimento', 'roberto@cestao.com.br', '(11) 96065-4433', 'Guarulhos', 'SP', 18000, 3.6, 10, 3, '30 dias', 'active', 'low', null],
    ['VendingTech Automação', '54.556.677/0001-24', 'Alimentação', 'Máquinas de Vending', 'Felipe Azevedo', 'felipe@vendingtech.com.br', '(41) 95054-3322', 'Curitiba', 'PR', 9500, 4.0, 6, 7, '30 dias', 'pending', 'low', null],

    // Limpeza (3)
    ['LimpaMax Serviços', '65.667.788/0001-25', 'Limpeza', 'Limpeza Predial', 'Sandra Oliveira', 'sandra@limpamax.com.br', '(11) 94043-2211', 'São Paulo', 'SP', 25000, 4.2, 20, 1, '30 dias', 'active', 'low', null],
    ['EcoClean Soluções Verdes', '76.778.899/0001-26', 'Limpeza', 'Produtos Ecológicos', 'André Monteiro', 'andre@ecoclean.com.br', '(48) 93032-1100', 'Florianópolis', 'SC', 12000, 4.8, 14, 5, '30 dias', 'active', 'low', null],
    ['Higieniza Brasil', '87.889.900/0001-27', 'Limpeza', 'Higienização Industrial', 'Teresa Gonçalves', 'teresa@higienizabrasil.com.br', '(31) 92021-0099', 'Belo Horizonte', 'MG', 35000, 3.3, 4, 3, '30 dias', 'inactive', 'medium', 'Contrato encerrado'],

    // Segurança (3)
    ['Forte Segurança Patrimonial', '98.990.011/0001-28', 'Segurança', 'Vigilância', 'Sérgio Ramos', 'sergio@forteseg.com.br', '(11) 91010-9988', 'São Paulo', 'SP', 55000, 4.4, 30, 2, '30 dias', 'active', 'low', null],
    ['VigiTech Eletrônica', '09.001.122/0001-29', 'Segurança', 'CFTV', 'Claudia Borges', 'claudia@vigitech.com.br', '(21) 99909-8877', 'Rio de Janeiro', 'RJ', 28000, 4.1, 17, 10, '30/60 dias', 'active', 'low', null],
    ['SafeWork Consultoria', '20.112.233/0001-30', 'Segurança', 'Segurança do Trabalho', 'Marcelo Teixeira', 'marcelo@safework.com.br', '(41) 98898-7766', 'Curitiba', 'PR', 15000, 4.5, 21, 5, '30 dias', 'active', 'low', null],

    // Consultoria (3)
    ['Stratego Consultoria', '31.223.344/0001-31', 'Consultoria', 'Estratégia', 'Isabela Cunha', 'isabela@stratego.com.br', '(11) 97887-6655', 'São Paulo', 'SP', 80000, 4.9, 40, 15, '30/60 dias', 'active', 'low', null],
    ['GestãoPro Assessoria', '42.334.455/0001-32', 'Consultoria', 'Gestão', 'Paulo Henrique', 'paulo@gestaopro.com.br', '(21) 96876-5544', 'Rio de Janeiro', 'RJ', 45000, 4.0, 11, 10, '30 dias', 'active', 'medium', null],
    ['InovaBiz Transformação Digital', '53.445.566/0001-33', 'Consultoria', 'Transformação Digital', 'Tatiana Moraes', 'tatiana@inovabiz.com.br', '(11) 95865-4433', 'São Paulo', 'SP', 95000, 4.6, 24, 20, '30/60/90 dias', 'active', 'low', null],

    // Jurídico (3)
    ['Advocacia Campos & Associados', '64.556.677/0001-34', 'Jurídico', 'Direito Empresarial', 'Dr. Henrique Campos', 'henrique@camposadvocacia.com.br', '(11) 94854-3322', 'São Paulo', 'SP', 35000, 4.7, 29, 5, '30 dias', 'active', 'low', null],
    ['Compliance Legal BR', '75.667.788/0001-35', 'Jurídico', 'Compliance', 'Dra. Beatriz Lago', 'beatriz@compliancelegal.com.br', '(21) 93843-2211', 'Rio de Janeiro', 'RJ', 25000, 4.3, 13, 7, '30 dias', 'active', 'low', null],
    ['TrabalhistaBR Assessoria', '86.778.899/0001-36', 'Jurídico', 'Direito Trabalhista', 'Dr. Renato Freitas', 'renato@trabalhistabr.com.br', '(31) 92832-1100', 'Belo Horizonte', 'MG', 20000, 3.9, 8, 10, '30 dias', 'active', 'low', null],

    // Contabilidade (2)
    ['ContaFácil Serviços Contábeis', '97.889.900/0001-37', 'Contabilidade', 'Contabilidade Geral', 'Adriana Lopes', 'adriana@contafacil.com.br', '(11) 91821-0099', 'São Paulo', 'SP', 8000, 4.4, 34, 3, '30 dias', 'active', 'low', null],
    ['FiscalPro Auditoria', '08.990.011/0001-38', 'Contabilidade', 'Auditoria', 'Gustavo Ribeiro', 'gustavo@fiscalpro.com.br', '(21) 90810-9988', 'Rio de Janeiro', 'RJ', 42000, 4.2, 16, 15, '30/60 dias', 'active', 'low', null],

    // RH/Recrutamento (3)
    ['TalentHunt Brasil', '19.001.122/0001-39', 'RH/Recrutamento', 'Recrutamento e Seleção', 'Vanessa Cardoso', 'vanessa@talenthunt.com.br', '(11) 99709-8877', 'São Paulo', 'SP', 18000, 4.5, 26, 15, '30 dias', 'active', 'low', null],
    ['CapacitaRH Treinamentos', '30.112.233/0001-40', 'RH/Recrutamento', 'Treinamento', 'Diego Amaral', 'diego@capacitarh.com.br', '(41) 98698-7766', 'Curitiba', 'PR', 25000, 4.0, 9, 10, '30 dias', 'active', 'low', null],
    ['BenefíciosFlex', '41.223.344/0001-41', 'RH/Recrutamento', 'Benefícios', 'Cristiane Duarte', 'cristiane@beneficiosflex.com.br', '(11) 97687-6655', 'São Paulo', 'SP', 5000, 4.3, 40, 2, '30 dias', 'active', 'low', null],

    // Infraestrutura (3)
    ['ManuPro Facilities', '52.334.455/0001-42', 'Infraestrutura', 'Manutenção Predial', 'Jorge Machado', 'jorge@manupro.com.br', '(11) 96676-5544', 'São Paulo', 'SP', 38000, 4.1, 18, 3, '30 dias', 'active', 'low', null],
    ['ClimaControl AR', '63.445.566/0001-43', 'Infraestrutura', 'Ar Condicionado', 'Leonardo Prado', 'leonardo@climacontrol.com.br', '(21) 95665-4433', 'Rio de Janeiro', 'RJ', 22000, 3.6, 6, 5, '30 dias', 'active', 'medium', null],
    ['EletriForce Instalações', '74.556.677/0001-44', 'Infraestrutura', 'Elétrica', 'Anderson Moura', 'anderson@eletriforce.com.br', '(31) 94654-3322', 'Belo Horizonte', 'MG', 30000, 4.4, 15, 7, '30 dias', 'active', 'low', null],

    // Comunicação (3)
    ['Assessoria Voz Ativa', '85.667.788/0001-45', 'Comunicação', 'Assessoria de Imprensa', 'Raquel Fonseca', 'raquel@vozativa.com.br', '(11) 93643-2211', 'São Paulo', 'SP', 18000, 4.6, 22, 5, '30 dias', 'active', 'low', null],
    ['Endomarketing Plus', '96.778.899/0001-46', 'Comunicação', 'Comunicação Interna', 'Thiago Braga', 'thiago@endomarketingplus.com.br', '(21) 92632-1100', 'Rio de Janeiro', 'RJ', 14000, 4.0, 10, 7, '30 dias', 'active', 'low', null],
    ['RelPub Relações Públicas', '07.889.900/0001-47', 'Comunicação', 'Relações Públicas', 'Fernanda Assis', 'fernanda@relpub.com.br', '(41) 91621-0099', 'Curitiba', 'PR', 20000, 3.8, 8, 10, '30 dias', 'pending', 'low', 'Em análise de proposta'],

    // Viagens (3)
    ['Corporate Travel Brasil', '18.990.011/0001-48', 'Viagens', 'Passagens e Hospedagem', 'Amanda Torres', 'amanda@ctbrasil.com.br', '(11) 90610-9988', 'São Paulo', 'SP', 12000, 4.5, 45, 1, '30 dias', 'active', 'low', null],
    ['Executive Transfers', '29.001.122/0001-49', 'Viagens', 'Transfers Executivos', 'Rafael Nogueira', 'rafael@executivetransfers.com.br', '(21) 99509-8877', 'Rio de Janeiro', 'RJ', 5500, 4.2, 20, 1, '15 dias', 'active', 'low', null],
    ['Global MICE Eventos & Viagens', '40.112.233/0001-50', 'Viagens', 'MICE', 'Bianca Martins', 'bianca@globalmice.com.br', '(11) 98498-7766', 'São Paulo', 'SP', 150000, 4.8, 12, 30, '30/60/90 dias', 'active', 'low', null],
  ];

  const insertSupplierTx = db.transaction(() => {
    for (const s of suppliers) {
      insertSupplier.run(...s);
    }
  });
  insertSupplierTx();

  // Update category supplier counts
  db.exec(`
    UPDATE categories SET supplier_count = (
      SELECT COUNT(*) FROM suppliers WHERE suppliers.category = categories.name
    )
  `);

  // ===== Quotes (200) =====
  const insertQuote = db.prepare(`
    INSERT INTO quotes (supplier_id, title, description, amount, currency, status, valid_until, category, requested_by, notes, created_at)
    VALUES (?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?)
  `);

  const quoteTemplates = [
    { title: 'Campanha digital Q{q}', cat: 'Marketing', minAmt: 5000, maxAmt: 50000 },
    { title: 'Gestão de redes sociais - {m}', cat: 'Marketing', minAmt: 3000, maxAmt: 15000 },
    { title: 'Desenvolvimento de sistema {t}', cat: 'Tecnologia', minAmt: 20000, maxAmt: 150000 },
    { title: 'Licenças cloud - {m}', cat: 'Tecnologia', minAmt: 5000, maxAmt: 30000 },
    { title: 'Evento corporativo {t}', cat: 'Eventos', minAmt: 30000, maxAmt: 200000 },
    { title: 'Confraternização fim de ano', cat: 'Eventos', minAmt: 10000, maxAmt: 50000 },
    { title: 'Frete mensal - {m}', cat: 'Logística', minAmt: 2000, maxAmt: 25000 },
    { title: 'Material de escritório - {m}', cat: 'Escritório', minAmt: 500, maxAmt: 8000 },
    { title: 'Refeições corporativas - {m}', cat: 'Alimentação', minAmt: 15000, maxAmt: 60000 },
    { title: 'Coffee break evento {t}', cat: 'Alimentação', minAmt: 2000, maxAmt: 12000 },
    { title: 'Serviço de limpeza mensal - {m}', cat: 'Limpeza', minAmt: 8000, maxAmt: 35000 },
    { title: 'Segurança patrimonial - {m}', cat: 'Segurança', minAmt: 20000, maxAmt: 70000 },
    { title: 'Consultoria estratégica {t}', cat: 'Consultoria', minAmt: 30000, maxAmt: 120000 },
    { title: 'Assessoria jurídica mensal - {m}', cat: 'Jurídico', minAmt: 10000, maxAmt: 40000 },
    { title: 'Contabilidade mensal - {m}', cat: 'Contabilidade', minAmt: 3000, maxAmt: 15000 },
    { title: 'Recrutamento vaga {t}', cat: 'RH/Recrutamento', minAmt: 5000, maxAmt: 25000 },
    { title: 'Manutenção predial - {m}', cat: 'Infraestrutura', minAmt: 10000, maxAmt: 50000 },
    { title: 'Assessoria de imprensa - {m}', cat: 'Comunicação', minAmt: 8000, maxAmt: 25000 },
    { title: 'Viagem corporativa {t}', cat: 'Viagens', minAmt: 3000, maxAmt: 80000 },
    { title: 'Transfer executivo - {m}', cat: 'Viagens', minAmt: 1000, maxAmt: 8000 },
  ];

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const statuses = ['pending', 'approved', 'rejected', 'expired'];
  const requesters = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Souza'];
  const types = ['ERP', 'CRM', 'Portal', 'API', 'App', 'Dashboard', 'Website'];

  function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const insertQuotesTx = db.transaction(() => {
    for (let i = 0; i < 200; i++) {
      const template = quoteTemplates[i % quoteTemplates.length];
      const supplierId = rand(1, 50);
      const month = months[rand(0, 11)];
      const quarter = rand(1, 4);
      const type = types[rand(0, types.length - 1)];
      const title = template.title.replace('{m}', month).replace('{q}', String(quarter)).replace('{t}', type);
      const amount = Math.round((Math.random() * (template.maxAmt - template.minAmt) + template.minAmt) * 100) / 100;
      const status = statuses[rand(0, 3)];
      const requester = requesters[rand(0, requesters.length - 1)];
      const monthNum = rand(1, 12).toString().padStart(2, '0');
      const day = rand(1, 28).toString().padStart(2, '0');
      const createdAt = `2025-${monthNum}-${day} ${rand(8, 18)}:${rand(0, 59).toString().padStart(2, '0')}:00`;
      const validUntil = `2025-${Math.min(parseInt(monthNum) + rand(1, 3), 12).toString().padStart(2, '0')}-${day}`;

      insertQuote.run(
        supplierId, title, `Cotação para ${template.cat.toLowerCase()}`,
        amount, status, validUntil, template.cat, requester, null, createdAt
      );
    }
  });
  insertQuotesTx();

  // ===== Reviews (30) =====
  const insertReview = db.prepare(`
    INSERT INTO reviews (supplier_id, reviewer_name, rating, comment, pros, cons, would_recommend)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const reviews = [
    [1, 'João Silva', 5, 'Excelente agência! Resultados acima do esperado na campanha digital.', 'Criatividade, pontualidade, relatórios detalhados', 'Preço um pouco acima da média', 1],
    [1, 'Maria Santos', 4, 'Bom trabalho no geral. Boa comunicação com o time.', 'Atendimento personalizado', 'Tempo de resposta poderia ser melhor', 1],
    [2, 'Carlos Oliveira', 4, 'Rebrand ficou muito bom. Identidade visual moderna e profissional.', 'Qualidade visual, pesquisa de mercado', 'Prazo estourou em 2 semanas', 1],
    [4, 'Ana Costa', 5, 'Mídia Express é sensacional! ROI de 300% na última campanha.', 'Performance, transparência, agilidade', 'Nenhum ponto negativo', 1],
    [6, 'Pedro Souza', 5, 'TechNova entregou o sistema antes do prazo. Código limpo e bem documentado.', 'Qualidade técnica, suporte pós-entrega', 'Custo elevado para pequenos projetos', 1],
    [6, 'João Silva', 5, 'Segundo projeto com eles. Mantiveram o mesmo padrão de qualidade.', 'Consistência, escalabilidade', 'Nada a reclamar', 1],
    [7, 'Maria Santos', 4, 'Migração para cloud foi tranquila. Bom suporte durante a transição.', 'Estabilidade, uptime 99.9%', 'Documentação poderia ser mais completa', 1],
    [8, 'Carlos Oliveira', 5, 'Auditoria de segurança encontrou vulnerabilidades críticas. Muito profissionais.', 'Expertise técnica, relatórios claros', 'Agenda sempre lotada', 1],
    [11, 'Ana Costa', 5, 'Evento anual da empresa ficou impecável. Todos elogiaram.', 'Organização, criatividade, fornecedores parceiros', 'Preço premium', 1],
    [11, 'Pedro Souza', 5, 'Melhor empresa de eventos que já trabalhamos.', 'Atenção aos detalhes', 'Só trabalham com eventos acima de R$ 50k', 1],
    [14, 'João Silva', 4, 'Entregas sempre no prazo. Frota nova e bem cuidada.', 'Pontualidade, tracking em tempo real', 'App de rastreamento precisa melhorar', 1],
    [16, 'Maria Santos', 2, 'Tivemos problemas sérios com extravios. Não recomendo.', 'Preço competitivo', 'Extravios frequentes, atendimento ruim', 0],
    [17, 'Carlos Oliveira', 5, 'Despacho aduaneiro sem problemas. Equipe muito experiente.', 'Conhecimento técnico, agilidade', 'Preço acima da média para pequenos volumes', 1],
    [18, 'Ana Costa', 4, 'Material sempre chega rápido e bem embalado.', 'Variedade de produtos, entrega rápida', 'Alguns itens fora de estoque às vezes', 1],
    [21, 'Pedro Souza', 4, 'Comida boa e cardápio variado. Funcionários gostam.', 'Qualidade da comida, opções vegetarianas', 'Preço subiu bastante este ano', 1],
    [22, 'João Silva', 5, 'Coffee break impecável para nosso evento de 200 pessoas.', 'Apresentação, qualidade, pontualidade', 'Mínimo de 50 pessoas', 1],
    [22, 'Maria Santos', 5, 'Sempre impecáveis. Já fizemos mais de 10 eventos com eles.', 'Consistência, flexibilidade no cardápio', 'Nenhum', 1],
    [25, 'Carlos Oliveira', 4, 'Serviço de limpeza muito bom. Equipe profissional e discreta.', 'Profissionalismo, produtos de qualidade', 'Rotatividade de funcionários', 1],
    [26, 'Ana Costa', 5, 'Adoramos os produtos ecológicos! Alinhado com nosso ESG.', 'Sustentabilidade, eficiência', 'Custo um pouco maior que produtos tradicionais', 1],
    [28, 'Pedro Souza', 4, 'Segurança patrimonial competente. Zero incidentes no último ano.', 'Treinamento, equipamentos modernos', 'Escala de plantão às vezes falha', 1],
    [31, 'João Silva', 5, 'Stratego mudou completamente nossa visão de negócio.', 'Expertise, metodologia, resultados comprovados', 'Investimento alto', 1],
    [31, 'Maria Santos', 5, 'ROI impressionante. Vale cada centavo investido.', 'Profundidade da análise', 'Agenda concorrida', 1],
    [34, 'Carlos Oliveira', 5, 'Excelente escritório de advocacia. Resolveram uma questão complexa.', 'Conhecimento, agilidade, transparência', 'Honorários poderiam ser mais claros', 1],
    [37, 'Ana Costa', 4, 'Contabilidade sempre em dia. Relatórios claros e objetivos.', 'Organização, pontualidade, suporte', 'Sistema online um pouco lento', 1],
    [39, 'Pedro Souza', 5, 'Recrutaram 3 gerentes excelentes para nós. Processo muito bem conduzido.', 'Qualidade dos candidatos, processo estruturado', 'Prazo de 30 dias para posições sênior', 1],
    [42, 'João Silva', 4, 'Manutenção predial resolvida rapidamente. Equipe técnica competente.', 'Tempo de resposta, qualidade do serviço', 'Orçamentos demoram para chegar', 1],
    [45, 'Maria Santos', 5, 'Melhor assessoria de imprensa que já contratamos. Clipping impressionante.', 'Relacionamento com mídia, proatividade', 'Exclusividade por segmento', 1],
    [48, 'Carlos Oliveira', 4, 'Viagens corporativas bem organizadas. Bons preços negociados.', 'Preços, atendimento 24h', 'App poderia ser melhor', 1],
    [48, 'Ana Costa', 5, 'Economia de 25% nas viagens corporativas após contratar.', 'Negociação, praticidade', 'Nenhum', 1],
    [50, 'Pedro Souza', 5, 'Organizaram nosso congresso internacional. Tudo perfeito.', 'Logística internacional, network de fornecedores', 'Mínimo de investimento alto', 1],
  ];

  const insertReviewsTx = db.transaction(() => {
    for (const r of reviews) {
      insertReview.run(...r);
    }
  });
  insertReviewsTx();

  // ===== AI Insights =====
  const insertInsight = db.prepare(`
    INSERT INTO ai_insights (type, title, summary, details, confidence, impact_level, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insights = [
    ['cost_optimization', 'Oportunidade de consolidação em Logística', 'Identificamos 3 fornecedores de logística com serviços sobrepostos. Consolidar para 2 fornecedores pode gerar economia de 15-20%.', 'Fornecedores TransLog Expressa e Armazém Central possuem capacidade para absorver as operações de Entrega Rápida BR, que possui rating baixo (2.8) e está bloqueado por problemas de extravio. Estimativa de economia: R$ 45.000/ano.', 0.87, 'high', 'new'],
    ['risk_alert', 'Fornecedor de Tecnologia com risco elevado', 'AppMaster Dev apresenta atrasos recorrentes e foi marcado como inativo. 3 cotações pendentes podem ser impactadas.', 'O fornecedor possui rating de 3.5 com prazo médio de 45 dias. Últimas 3 entregas ultrapassaram o prazo em mais de 30%. Recomendação: migrar projetos pendentes para TechNova ou DataBridge.', 0.92, 'high', 'new'],
    ['supplier_recommendation', 'Top fornecedores para próximo trimestre', 'Com base nas avaliações e performance, recomendamos priorizar 5 fornecedores com melhor custo-benefício por categoria.', 'Marketing: Mídia Express (4.7★), Tecnologia: TechNova (4.8★), Eventos: Eventus (4.9★), Limpeza: EcoClean (4.8★), Consultoria: Stratego (4.9★). Estes fornecedores mantêm consistência de qualidade e prazos.', 0.85, 'medium', 'new'],
    ['trend_analysis', 'Custos de Tecnologia em alta de 12%', 'Nos últimos 6 meses, cotações de tecnologia aumentaram em média 12%. Tendência deve continuar com aumento da demanda por IA.', 'Análise de 45 cotações de tecnologia mostra aumento progressivo. Sugestão: negociar contratos de longo prazo com TechNova e CloudBR para travar preços. Economia potencial: R$ 80.000/ano.', 0.78, 'medium', 'read'],
    ['cost_optimization', 'Economia em Coffee Break', 'Coffee Break Gourmet oferece desconto de 18% para contratos trimestrais. Economia estimada de R$ 12.000/ano.', 'Com base no histórico de 15 eventos nos últimos 6 meses, a contratação de pacote trimestral com Coffee Break Gourmet (rating 4.7★) reduziria o custo médio por evento de R$ 8.000 para R$ 6.560.', 0.90, 'low', 'new'],
    ['general', 'Diversificação geográfica de fornecedores', '68% dos fornecedores estão concentrados em SP e RJ. Considere diversificar para reduzir riscos logísticos.', 'Distribuição atual: SP (48%), RJ (24%), PR (12%), MG (10%), SC (4%), RS (2%). Recomendação: buscar fornecedores nas regiões Norte e Nordeste para categorias como Logística e Infraestrutura.', 0.72, 'low', 'new'],
  ];

  const insertInsightsTx = db.transaction(() => {
    for (const ins of insights) {
      insertInsight.run(...ins);
    }
  });
  insertInsightsTx();

  console.log('Seed completed successfully!');
  console.log('  - 15 categories');
  console.log('  - 50 suppliers');
  console.log('  - 200 quotes');
  console.log('  - 30 reviews');
  console.log('  - 6 AI insights');
  console.log('  - 6 report templates');
}

seed();
