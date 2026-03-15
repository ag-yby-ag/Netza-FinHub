import bcrypt from 'bcryptjs';
import db from './database';
import { runMigrations } from './migrations';

const CATEGORIES = [
  { name: 'Marketing', icon: 'megaphone', color: '#FF6B6B' },
  { name: 'Tecnologia', icon: 'monitor', color: '#4DA6FF' },
  { name: 'Eventos', icon: 'calendar', color: '#FFB800' },
  { name: 'Logística', icon: 'truck', color: '#6DED67' },
  { name: 'Escritório', icon: 'briefcase', color: '#A855F7' },
  { name: 'Alimentação', icon: 'utensils', color: '#F97316' },
  { name: 'Limpeza', icon: 'sparkles', color: '#06B6D4' },
  { name: 'Segurança', icon: 'shield', color: '#EF4444' },
  { name: 'Consultoria', icon: 'users', color: '#8B5CF6' },
  { name: 'Jurídico', icon: 'scale', color: '#374151' },
  { name: 'Contabilidade', icon: 'calculator', color: '#059669' },
  { name: 'RH', icon: 'heart', color: '#EC4899' },
  { name: 'Infraestrutura', icon: 'building', color: '#78716C' },
  { name: 'Comunicação', icon: 'message-circle', color: '#0EA5E9' },
  { name: 'Viagens', icon: 'plane', color: '#10B981' },
];

const SUPPLIERS_DATA = [
  // Tecnologia
  { name: 'TechSup Soluções', cnpj: '11.222.333/0001-81', category: 'Tecnologia', subcategory: 'Software', contact_name: 'Ricardo Lima', contact_email: 'ricardo@techsup.com.br', contact_phone: '(11) 98765-4321', city: 'São Paulo', state: 'SP', avg_price: 15000, rating: 4.9, delivery_days: 7, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Parceiro estratégico desde 2021.' },
  { name: 'TechPro Informática', cnpj: '22.333.444/0001-05', category: 'Tecnologia', subcategory: 'Hardware', contact_name: 'Fernanda Costa', contact_email: 'fernanda@techpro.com.br', contact_phone: '(11) 97654-3210', city: 'Campinas', state: 'SP', avg_price: 8500, rating: 4.2, delivery_days: 5, payment_terms: '30/60', status: 'active', risk_level: 'low', notes: 'Especialista em notebooks e periféricos.' },
  { name: 'DataCloud BR', cnpj: '33.444.555/0001-29', category: 'Tecnologia', subcategory: 'Cloud', contact_name: 'Bruno Alves', contact_email: 'bruno@datacloud.com.br', contact_phone: '(21) 98877-6655', city: 'Rio de Janeiro', state: 'RJ', avg_price: 25000, rating: 4.7, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Infraestrutura cloud confiável.' },
  { name: 'SoftDev Solutions', cnpj: '44.555.666/0001-53', category: 'Tecnologia', subcategory: 'Desenvolvimento', contact_name: 'Ana Rodrigues', contact_email: 'ana@softdev.com.br', contact_phone: '(11) 96543-2109', city: 'São Paulo', state: 'SP', avg_price: 35000, rating: 4.5, delivery_days: 30, payment_terms: '30/60/90', status: 'active', risk_level: 'medium', notes: 'Desenvolvimento sob medida.' },
  { name: 'CiberSec Proteção', cnpj: '55.666.777/0001-77', category: 'Tecnologia', subcategory: 'Segurança Digital', contact_name: 'Marcos Silva', contact_email: 'marcos@cibersec.com.br', contact_phone: '(11) 95432-1098', city: 'Curitiba', state: 'PR', avg_price: 18000, rating: 4.8, delivery_days: 14, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Certificados ISO 27001.' },
  { name: 'NetWork Pro', cnpj: '66.777.888/0001-91', category: 'Tecnologia', subcategory: 'Redes', contact_name: 'Paulo Mendes', contact_email: 'paulo@networkpro.com.br', contact_phone: '(31) 94321-0987', city: 'Belo Horizonte', state: 'MG', avg_price: 12000, rating: 3.9, delivery_days: 10, payment_terms: '30 dias', status: 'active', risk_level: 'medium', notes: 'Infraestrutura de redes.' },
  { name: 'PixelArts Digital', cnpj: '77.888.999/0001-15', category: 'Tecnologia', subcategory: 'Design Digital', contact_name: 'Camila Ferreira', contact_email: 'camila@pixelarts.com.br', contact_phone: '(11) 93210-9876', city: 'São Paulo', state: 'SP', avg_price: 9000, rating: 4.6, delivery_days: 21, payment_terms: '50% entrada', status: 'active', risk_level: 'low', notes: 'UX/UI e motion design.' },

  // Marketing
  { name: 'Gráfica Impressão Total', cnpj: '88.999.000/0001-39', category: 'Marketing', subcategory: 'Gráfica', contact_name: 'Roberto Santos', contact_email: 'roberto@impressaototal.com.br', contact_phone: '(11) 92109-8765', city: 'São Paulo', state: 'SP', avg_price: 5500, rating: 4.3, delivery_days: 3, payment_terms: 'À vista', status: 'active', risk_level: 'low', notes: 'Entrega expressa disponível.' },
  { name: 'Agência Criativa Plus', cnpj: '99.000.111/0001-62', category: 'Marketing', subcategory: 'Agência', contact_name: 'Juliana Melo', contact_email: 'juliana@criativaplus.com.br', contact_phone: '(11) 91098-7654', city: 'São Paulo', state: 'SP', avg_price: 28000, rating: 4.7, delivery_days: 14, payment_terms: '50/50', status: 'active', risk_level: 'low', notes: 'Agência full service.' },
  { name: 'Mídia Social BR', cnpj: '11.333.555/0001-47', category: 'Marketing', subcategory: 'Redes Sociais', contact_name: 'Lucas Oliveira', contact_email: 'lucas@midiasocialbr.com.br', contact_phone: '(21) 90987-6543', city: 'Rio de Janeiro', state: 'RJ', avg_price: 7500, rating: 4.1, delivery_days: 7, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Gestão de mídias sociais.' },
  { name: 'Video Pro Produções', cnpj: '22.444.666/0001-71', category: 'Marketing', subcategory: 'Vídeo', contact_name: 'Diego Carvalho', contact_email: 'diego@videopro.com.br', contact_phone: '(11) 89876-5432', city: 'Campinas', state: 'SP', avg_price: 15000, rating: 4.4, delivery_days: 10, payment_terms: '30/70', status: 'active', risk_level: 'medium', notes: 'Produção audiovisual completa.' },

  // Eventos
  { name: 'EventMaster Produções', cnpj: '33.555.777/0001-95', category: 'Eventos', subcategory: 'Produção', contact_name: 'Tatiane Gomes', contact_email: 'tatiane@eventmaster.com.br', contact_phone: '(11) 88765-4321', city: 'São Paulo', state: 'SP', avg_price: 45000, rating: 4.8, delivery_days: 30, payment_terms: '30/40/30', status: 'active', risk_level: 'low', notes: 'Eventos corporativos de grande porte.' },
  { name: 'Buffet Requinte', cnpj: '44.666.888/0001-19', category: 'Eventos', subcategory: 'Gastronomia', contact_name: 'Marcia Lima', contact_email: 'marcia@buffetrequinte.com.br', contact_phone: '(11) 87654-3210', city: 'São Paulo', state: 'SP', avg_price: 12000, rating: 4.6, delivery_days: 1, payment_terms: '50% entrada', status: 'active', risk_level: 'low', notes: 'Gastronomia premium para eventos.' },
  { name: 'Decoração & Arte', cnpj: '55.777.999/0001-43', category: 'Eventos', subcategory: 'Decoração', contact_name: 'Priscila Souza', contact_email: 'priscila@decoracaoarte.com.br', contact_phone: '(11) 86543-2109', city: 'Barueri', state: 'SP', avg_price: 8000, rating: 4.2, delivery_days: 1, payment_terms: '40/60', status: 'active', risk_level: 'low', notes: 'Decoração temática personalizada.' },
  { name: 'AV Tecnologia Eventos', cnpj: '66.888.000/0001-67', category: 'Eventos', subcategory: 'Audiovisual', contact_name: 'Thiago Costa', contact_email: 'thiago@avtecnologia.com.br', contact_phone: '(11) 85432-1098', city: 'Osasco', state: 'SP', avg_price: 20000, rating: 4.5, delivery_days: 1, payment_terms: '50/50', status: 'active', risk_level: 'low', notes: 'Equipamentos de última geração.' },

  // Logística
  { name: 'LogiExpress Transportes', cnpj: '77.999.111/0001-91', category: 'Logística', subcategory: 'Transporte', contact_name: 'Carlos Pereira', contact_email: 'carlos@logiexpress.com.br', contact_phone: '(11) 84321-0987', city: 'Guarulhos', state: 'SP', avg_price: 3500, rating: 4.3, delivery_days: 2, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Frota própria e rastreamento em tempo real.' },
  { name: 'ArmazémBR Logística', cnpj: '88.000.222/0001-15', category: 'Logística', subcategory: 'Armazenagem', contact_name: 'Silvia Barbosa', contact_email: 'silvia@armazembr.com.br', contact_phone: '(19) 83210-9876', city: 'Campinas', state: 'SP', avg_price: 6500, rating: 3.8, delivery_days: 3, payment_terms: 'Mensal', status: 'active', risk_level: 'medium', notes: 'Galpões climatizados.' },
  { name: 'Courier Premium', cnpj: '99.111.333/0001-39', category: 'Logística', subcategory: 'Courier', contact_name: 'Alexandre Neto', contact_email: 'alexandre@courierpremium.com.br', contact_phone: '(11) 82109-8765', city: 'São Paulo', state: 'SP', avg_price: 1800, rating: 4.7, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Entregas same day na capital.' },

  // Escritório
  { name: 'OfficePlus Suprimentos', cnpj: '11.444.777/0001-28', category: 'Escritório', subcategory: 'Material', contact_name: 'Renata Viana', contact_email: 'renata@officeplus.com.br', contact_phone: '(11) 81098-7654', city: 'São Paulo', state: 'SP', avg_price: 2500, rating: 4.0, delivery_days: 3, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Catálogo com +5000 itens.' },
  { name: 'Móveis Corporativos SA', cnpj: '22.555.888/0001-52', category: 'Escritório', subcategory: 'Mobiliário', contact_name: 'Eduardo Rocha', contact_email: 'eduardo@moveiscorp.com.br', contact_phone: '(11) 80987-6543', city: 'São Bernardo', state: 'SP', avg_price: 35000, rating: 4.5, delivery_days: 21, payment_terms: '30/60/90', status: 'active', risk_level: 'low', notes: 'Projeto e instalação inclusos.' },
  { name: 'Café & Break Premium', cnpj: '33.666.999/0001-76', category: 'Alimentação', subcategory: 'Coffee Break', contact_name: 'Patricia Alves', contact_email: 'patricia@cafebreak.com.br', contact_phone: '(11) 79876-5432', city: 'São Paulo', state: 'SP', avg_price: 1500, rating: 4.8, delivery_days: 1, payment_terms: 'À vista', status: 'active', risk_level: 'low', notes: 'Café premium e snacks orgânicos.' },

  // Limpeza / Segurança
  { name: 'LimpoMax Serviços', cnpj: '44.777.000/0001-90', category: 'Limpeza', subcategory: 'Limpeza Predial', contact_name: 'Josefa Ribeiro', contact_email: 'josefa@limpomax.com.br', contact_phone: '(11) 78765-4321', city: 'São Paulo', state: 'SP', avg_price: 8000, rating: 3.9, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Equipe treinada e produtos certificados.' },
  { name: 'SecureGuard Vigilância', cnpj: '55.888.111/0001-14', category: 'Segurança', subcategory: 'Vigilância', contact_name: 'Nelson Guimarães', contact_email: 'nelson@secureguard.com.br', contact_phone: '(11) 77654-3210', city: 'São Paulo', state: 'SP', avg_price: 12000, rating: 3.5, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'high', notes: 'Monitoramento 24h.' },
  { name: 'AlarmeNet Sistemas', cnpj: '66.999.222/0001-38', category: 'Segurança', subcategory: 'Alarmes', contact_name: 'Adriana Campos', contact_email: 'adriana@alarmenet.com.br', contact_phone: '(11) 76543-2109', city: 'Santo André', state: 'SP', avg_price: 5500, rating: 4.2, delivery_days: 5, payment_terms: '30/60', status: 'active', risk_level: 'medium', notes: 'Instalação e manutenção.' },

  // Consultoria / Jurídico / Contabilidade
  { name: 'Consul BR Estratégia', cnpj: '77.000.333/0001-62', category: 'Consultoria', subcategory: 'Estratégica', contact_name: 'Rodrigo Fonseca', contact_email: 'rodrigo@consulbr.com.br', contact_phone: '(11) 75432-1098', city: 'São Paulo', state: 'SP', avg_price: 50000, rating: 4.9, delivery_days: 30, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Consultoria de gestão e inovação.' },
  { name: 'JurisLex Advocacia', cnpj: '88.111.444/0001-86', category: 'Jurídico', subcategory: 'Trabalhista', contact_name: 'Dra. Beatriz Moura', contact_email: 'beatriz@jurislex.com.br', contact_phone: '(11) 74321-0987', city: 'São Paulo', state: 'SP', avg_price: 15000, rating: 4.7, delivery_days: 15, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Especialistas em direito trabalhista e contratos.' },
  { name: 'ContaExpert Escritório', cnpj: '99.222.555/0001-01', category: 'Contabilidade', subcategory: 'Fiscal', contact_name: 'Contador Fábio Lima', contact_email: 'fabio@contaexpert.com.br', contact_phone: '(11) 73210-9876', city: 'São Paulo', state: 'SP', avg_price: 8500, rating: 4.4, delivery_days: 15, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Especialistas em e-Social e SPED.' },

  // RH / Infraestrutura / Comunicação / Viagens
  { name: 'RH Total Treinamentos', cnpj: '11.555.999/0001-76', category: 'RH', subcategory: 'Treinamento', contact_name: 'Vanessa Torres', contact_email: 'vanessa@rhtotal.com.br', contact_phone: '(11) 72109-8765', city: 'São Paulo', state: 'SP', avg_price: 12000, rating: 4.6, delivery_days: 14, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Treinamentos presenciais e EAD.' },
  { name: 'BuildPro Infraestrutura', cnpj: '22.666.000/0001-00', category: 'Infraestrutura', subcategory: 'Civil', contact_name: 'Engenheiro Henrique', contact_email: 'henrique@buildpro.com.br', contact_phone: '(11) 71098-7654', city: 'São Paulo', state: 'SP', avg_price: 80000, rating: 4.3, delivery_days: 90, payment_terms: '20/20/20/20/20', status: 'active', risk_level: 'medium', notes: 'Obras e reformas corporativas.' },
  { name: 'MídiaHub Comunicação', cnpj: '33.777.111/0001-24', category: 'Comunicação', subcategory: 'Assessoria', contact_name: 'Andrea Monteiro', contact_email: 'andrea@midiahub.com.br', contact_phone: '(11) 70987-6543', city: 'São Paulo', state: 'SP', avg_price: 9500, rating: 4.5, delivery_days: 7, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Assessoria de imprensa e PR.' },
  { name: 'ViajaCorp Turismo', cnpj: '44.888.222/0001-48', category: 'Viagens', subcategory: 'Corporativo', contact_name: 'Stephanie Borges', contact_email: 'stephanie@viajacorp.com.br', contact_phone: '(11) 69876-5432', city: 'São Paulo', state: 'SP', avg_price: 5000, rating: 4.0, delivery_days: 3, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Viagens nacionais e internacionais.' },

  // Inativos/Pendentes/Bloqueados para variedade
  { name: 'TechOld Sistemas', cnpj: '55.999.333/0001-72', category: 'Tecnologia', subcategory: 'Legacy', contact_name: 'Claudio Vieira', contact_email: 'claudio@techold.com.br', contact_phone: '(11) 68765-4321', city: 'São Paulo', state: 'SP', avg_price: 5000, rating: 2.8, delivery_days: 30, payment_terms: '30 dias', status: 'inactive', risk_level: 'high', notes: 'Contrato encerrado em 2025.' },
  { name: 'FornecePend Soluções', cnpj: '66.000.444/0001-96', category: 'Escritório', subcategory: 'Suprimentos', contact_name: 'Maria José', contact_email: 'mj@fornecepend.com.br', contact_phone: '(11) 67654-3210', city: 'São Paulo', state: 'SP', avg_price: 3000, rating: 3.2, delivery_days: 10, payment_terms: '30 dias', status: 'pending', risk_level: 'medium', notes: 'Documentação em análise.' },
  { name: 'RiskHigh Transportes', cnpj: '77.111.555/0001-11', category: 'Logística', subcategory: 'Carga Pesada', contact_name: 'José Augusto', contact_email: 'jose@riskhigh.com.br', contact_phone: '(11) 66543-2109', city: 'Guarulhos', state: 'SP', avg_price: 8000, rating: 2.5, delivery_days: 7, payment_terms: '30 dias', status: 'blocked', risk_level: 'high', notes: 'Bloqueado por irregularidades fiscais.' },

  // Mais fornecedores para chegar em 50
  { name: 'PrintExpress Gráfica', cnpj: '88.222.666/0001-35', category: 'Marketing', subcategory: 'Impressão', contact_name: 'Sandra Lopes', contact_email: 'sandra@printexpress.com.br', contact_phone: '(11) 65432-1098', city: 'São Paulo', state: 'SP', avg_price: 4200, rating: 4.1, delivery_days: 2, payment_terms: 'À vista', status: 'active', risk_level: 'low', notes: 'Impressão digital e offset.' },
  { name: 'Flex Clean Higiene', cnpj: '99.333.777/0001-59', category: 'Limpeza', subcategory: 'Higiene', contact_name: 'Ana Clara', contact_email: 'anaclara@flexclean.com.br', contact_phone: '(11) 64321-0987', city: 'Diadema', state: 'SP', avg_price: 3500, rating: 4.3, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Produtos biodegradáveis.' },
  { name: 'TI Resolve Suporte', cnpj: '11.666.000/0001-83', category: 'Tecnologia', subcategory: 'Suporte TI', contact_name: 'Felipe Azevedo', contact_email: 'felipe@tiresove.com.br', contact_phone: '(11) 63210-9876', city: 'São Paulo', state: 'SP', avg_price: 6000, rating: 4.4, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'Help desk e suporte N1/N2/N3.' },
  { name: 'Alpha Seguros Corp', cnpj: '22.777.111/0001-07', category: 'Consultoria', subcategory: 'Seguros', contact_name: 'Daniel Teixeira', contact_email: 'daniel@alphaseguros.com.br', contact_phone: '(11) 62109-8765', city: 'São Paulo', state: 'SP', avg_price: 22000, rating: 4.6, delivery_days: 5, payment_terms: 'Anual', status: 'active', risk_level: 'low', notes: 'Seguros empresariais completos.' },
  { name: 'EduCorpo Treinamentos', cnpj: '33.888.222/0001-31', category: 'RH', subcategory: 'Educação Corporativa', contact_name: 'Monica Assis', contact_email: 'monica@educorpo.com.br', contact_phone: '(11) 61098-7654', city: 'São Paulo', state: 'SP', avg_price: 8000, rating: 4.2, delivery_days: 21, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'E-learning e presencial.' },
  { name: 'GreenOffice Sustentável', cnpj: '44.999.333/0001-55', category: 'Escritório', subcategory: 'Sustentabilidade', contact_name: 'Letícia Verde', contact_email: 'leticia@greenoffice.com.br', contact_phone: '(11) 60987-6543', city: 'São Paulo', state: 'SP', avg_price: 4500, rating: 4.7, delivery_days: 5, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Produtos eco-friendly certificados.' },
  { name: 'FastFood Corp Alimentação', cnpj: '55.000.444/0001-79', category: 'Alimentação', subcategory: 'Refeições', contact_name: 'Gustavo Prado', contact_email: 'gustavo@fastfoodcorp.com.br', contact_phone: '(11) 59876-5432', city: 'São Paulo', state: 'SP', avg_price: 25000, rating: 3.7, delivery_days: 1, payment_terms: 'Mensal', status: 'active', risk_level: 'medium', notes: 'Refeitório corporativo.' },
  { name: 'Infra Total Manutenção', cnpj: '66.111.555/0001-93', category: 'Infraestrutura', subcategory: 'Manutenção', contact_name: 'Roberto Cunha', contact_email: 'roberto@infratotal.com.br', contact_phone: '(11) 58765-4321', city: 'São Paulo', state: 'SP', avg_price: 15000, rating: 4.0, delivery_days: 7, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Manutenção predial preventiva e corretiva.' },
  { name: 'ConectaBR Telecom', cnpj: '77.222.666/0001-17', category: 'Comunicação', subcategory: 'Telecom', contact_name: 'Luciana Campos', contact_email: 'luciana@conectabr.com.br', contact_phone: '(11) 57654-3210', city: 'São Paulo', state: 'SP', avg_price: 11000, rating: 4.3, delivery_days: 30, payment_terms: 'Mensal', status: 'active', risk_level: 'low', notes: 'PABX e links dedicados.' },
  { name: 'VipTravel Executivo', cnpj: '88.333.777/0001-41', category: 'Viagens', subcategory: 'Transfer', contact_name: 'Rodrigo Dantas', contact_email: 'rodrigo@viptravel.com.br', contact_phone: '(11) 56543-2109', city: 'São Paulo', state: 'SP', avg_price: 3200, rating: 4.8, delivery_days: 1, payment_terms: '30 dias', status: 'active', risk_level: 'low', notes: 'Transfer executivo e locação de veículos.' },
];

const REVIEWS_DATA = [
  { supplier_id: 1, rating: 5, quality_score: 5, delivery_score: 5, price_score: 4, comment: 'Excelente parceiro! Sempre entregam no prazo e com qualidade.', reviewer: 'Ana C.' },
  { supplier_id: 1, rating: 5, quality_score: 5, delivery_score: 4, price_score: 5, comment: 'Equipe muito profissional, suporte rápido.', reviewer: 'Bruno M.' },
  { supplier_id: 2, rating: 4, quality_score: 4, delivery_score: 5, price_score: 3, comment: 'Boa qualidade, mas preço um pouco elevado.', reviewer: 'Carlos P.' },
  { supplier_id: 3, rating: 5, quality_score: 5, delivery_score: 5, price_score: 4, comment: 'Infraestrutura impecável, zero downtime em 12 meses.', reviewer: 'Vinicius S.' },
  { supplier_id: 4, rating: 4, quality_score: 5, delivery_score: 3, price_score: 4, comment: 'Ótimo trabalho técnico, prazo poderia ser melhor.', reviewer: 'Julia F.' },
  { supplier_id: 5, rating: 5, quality_score: 5, delivery_score: 5, price_score: 5, comment: 'Melhor fornecedor de segurança digital do mercado.', reviewer: 'Ana C.' },
  { supplier_id: 8, rating: 4, quality_score: 4, delivery_score: 5, price_score: 4, comment: 'Entrega rápida e material de boa qualidade.', reviewer: 'Renata V.' },
  { supplier_id: 9, rating: 5, quality_score: 5, delivery_score: 4, price_score: 4, comment: 'Criatividade impressionante, superam as expectativas.', reviewer: 'Diego C.' },
  { supplier_id: 12, rating: 5, quality_score: 5, delivery_score: 5, price_score: 4, comment: 'Evento impecável, decoração incrível.', reviewer: 'Tatiane G.' },
  { supplier_id: 13, rating: 5, quality_score: 5, delivery_score: 5, price_score: 5, comment: 'Buffet de altíssima qualidade.', reviewer: 'Marcia L.' },
  { supplier_id: 16, rating: 4, quality_score: 4, delivery_score: 5, price_score: 4, comment: 'Logística eficiente e rastreamento em tempo real.', reviewer: 'Carlos P.' },
  { supplier_id: 18, rating: 5, quality_score: 5, delivery_score: 5, price_score: 4, comment: 'Entrega same day perfeita para urgências.', reviewer: 'Vinicius S.' },
  { supplier_id: 25, rating: 5, quality_score: 5, delivery_score: 4, price_score: 5, comment: 'Consultoria excepcional, ROI comprovado.', reviewer: 'Ana C.' },
  { supplier_id: 26, rating: 5, quality_score: 5, delivery_score: 5, price_score: 4, comment: 'Advogados muito competentes e ágeis.', reviewer: 'Bruno M.' },
  { supplier_id: 29, rating: 4, quality_score: 4, delivery_score: 4, price_score: 4, comment: 'Treinamentos bem estruturados e didáticos.', reviewer: 'Vanessa T.' },
];

const NOTIFICATION_TYPES = [
  { type: 'quote_expiring', title: 'Orçamento vencendo', message: 'O orçamento da Gráfica Impressão Total vence em 3 dias', link: '/quotes?status=pending' },
  { type: 'upload_completed', title: 'Upload concluído', message: 'compras_q1.xlsx processado — 342 registros importados', link: '/upload' },
  { type: 'supplier_created', title: 'Novo fornecedor', message: 'LogiExpress Transportes foi cadastrado', link: '/suppliers/16' },
  { type: 'ai_insight_ready', title: 'Novo insight de IA', message: 'Análise de custos da categoria Tecnologia disponível', link: '/analytics' },
  { type: 'supplier_risk_change', title: 'Alerta de risco', message: 'SecureGuard Vigilância alterado para risco alto', link: '/suppliers/24' },
  { type: 'quote_approved', title: 'Orçamento aprovado', message: 'Orçamento de Notebooks Dell — TechSup aprovado por Ana C.', link: '/quotes?status=approved' },
  { type: 'quote_expiring', title: 'Orçamento vencendo', message: 'O orçamento da AV Tecnologia Eventos vence amanhã', link: '/quotes?status=pending' },
  { type: 'upload_completed', title: 'Upload concluído', message: 'fornecedores_2026.csv processado — 28 fornecedores importados', link: '/upload' },
  { type: 'system_alert', title: 'Limite de armazenamento', message: 'Armazenamento de exports em 80%. Considere limpar relatórios antigos.', link: '/settings' },
  { type: 'quote_rejected', title: 'Orçamento rejeitado', message: 'Proposta de RiskHigh Transportes rejeitada por Carlos P.', link: '/quotes?status=rejected' },
  { type: 'supplier_created', title: 'Novo fornecedor', message: 'VipTravel Executivo foi cadastrado na categoria Viagens', link: '/suppliers' },
  { type: 'ai_insight_ready', title: 'Análise de economia', message: 'Potencial de economia de R$ 45.000 identificado em Logística', link: '/analytics' },
  { type: 'supplier_risk_change', title: 'Risco normalizado', message: 'TechOld Sistemas reclassificado para monitoramento', link: '/suppliers' },
  { type: 'quote_approved', title: 'Orçamento aprovado', message: 'Buffet de R$ 12.000 aprovado para evento em março', link: '/quotes?status=approved' },
  { type: 'system_alert', title: 'Backup realizado', message: 'Backup automático do banco de dados concluído', link: '/settings' },
];

const REPORT_TEMPLATES = [
  { name: 'Fornecedores', slug: 'suppliers', description: 'Lista completa de fornecedores com status e avaliações', icon: 'users', color: '#4DA6FF', available_formats: '["xlsx","pdf","csv"]', default_sections: '["overview","list","ratings"]', query_type: 'suppliers' },
  { name: 'Orçamentos', slug: 'quotes', description: 'Relatório de orçamentos por período e status', icon: 'file-text', color: '#6DED67', available_formats: '["xlsx","pdf","csv"]', default_sections: '["summary","by_status","by_category"]', query_type: 'quotes' },
  { name: 'Análise de Custos', slug: 'costs', description: 'Distribuição e evolução de custos por categoria', icon: 'bar-chart-2', color: '#FFB800', available_formats: '["xlsx","pdf"]', default_sections: '["overview","by_category","monthly_trend"]', query_type: 'costs' },
  { name: 'Ranking de Fornecedores', slug: 'ranking', description: 'Top fornecedores por volume, rating e economia', icon: 'award', color: '#A855F7', available_formats: '["xlsx","pdf"]', default_sections: '["top10","by_volume","by_rating"]', query_type: 'ranking' },
  { name: 'Análise de Riscos', slug: 'risks', description: 'Mapa de riscos por fornecedor e categoria', icon: 'alert-triangle', color: '#FF4D4D', available_formats: '["xlsx","pdf"]', default_sections: '["risk_matrix","high_risk","recommendations"]', query_type: 'risks' },
  { name: 'Avaliações', slug: 'reviews', description: 'Compilado de avaliações e NPS de fornecedores', icon: 'star', color: '#F97316', available_formats: '["xlsx","pdf","csv"]', default_sections: '["summary","by_supplier","comments"]', query_type: 'reviews' },
];

export function runSeed() {
  // Check if already seeded
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) {
    console.log('⏭️  Seed already done, skipping');
    return;
  }

  console.log('🌱 Starting seed...');

  // Wrap everything in a single transaction for ~100x faster bulk inserts
  const doSeed = db.transaction(() => {

  // 1. USERS FIRST
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const viewerHash = bcrypt.hashSync('viewer123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, job_title, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);

  const users = [
    ['Vinicius Santos', 'vinicius@netzaco.com.br', passwordHash, 'master', 'Diretoria', 'CEO & Co-founder'],
    ['Ana Carvalho', 'ana@netzaco.com.br', passwordHash, 'admin', 'Procurement', 'Gerente de Compras'],
    ['Carlos Pinheiro', 'carlos@netzaco.com.br', passwordHash, 'manager', 'Operações', 'Coordenador de Operações'],
    ['Julia Ferreira', 'julia@netzaco.com.br', viewerHash, 'viewer', 'Financeiro', 'Analista Financeiro'],
  ];

  for (const u of users) {
    insertUser.run(...u);
  }
  console.log('✅ Users seeded');

  // 2. Permissions matrix
  const insertPerm = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const modules = ['dashboard', 'suppliers', 'quotes', 'uploads', 'analytics', 'reports', 'settings', 'notifications', 'search'];
  for (const mod of modules) {
    insertPerm.run('master', mod, 1, 1, 1, 1, 1);
    insertPerm.run('admin', mod, 1, 1, 1, mod === 'settings' ? 0 : 1, 1);
    insertPerm.run('manager', mod, 1, mod !== 'settings' ? 1 : 0, mod !== 'settings' ? 1 : 0, 0, 1);
    insertPerm.run('viewer', mod, 1, 0, 0, 0, mod === 'reports' ? 1 : 0);
  }
  console.log('✅ Permissions seeded');

  // 3. Categories
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, icon, color) VALUES (?, ?, ?)');
  for (const cat of CATEGORIES) {
    insertCat.run(cat.name, cat.icon, cat.color);
  }
  console.log('✅ Categories seeded');

  // 4. Suppliers
  const insertSupplier = db.prepare(`
    INSERT OR IGNORE INTO suppliers (name, cnpj, category, subcategory, contact_name, contact_email, contact_phone,
      city, state, avg_price, rating, delivery_days, payment_terms, status, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of SUPPLIERS_DATA) {
    insertSupplier.run(
      s.name, s.cnpj, s.category, s.subcategory ?? null, s.contact_name ?? null,
      s.contact_email ?? null, s.contact_phone ?? null, s.city ?? null, s.state ?? null,
      s.avg_price ?? null, s.rating ?? 0, s.delivery_days ?? null,
      s.payment_terms ?? null, s.status, s.risk_level, s.notes ?? null
    );
  }
  console.log('✅ Suppliers seeded');

  // 5. Quotes — 200 across 12 months
  const suppliers = db.prepare("SELECT id, avg_price, category FROM suppliers WHERE status != 'blocked'").all() as Array<{id: number; avg_price: number; category: string}>;
  const items: Record<string, string[]> = {
    'Tecnologia': ['Notebooks Dell', 'Licenças Microsoft 365', 'Servidores HP', 'Switches Cisco', 'Storage NetApp', 'Antivírus corporativo', 'SaaS CRM', 'ERP módulo financeiro'],
    'Marketing': ['Folder institucional', 'Banner lona 3x2m', 'Campanha digital', 'Produção de vídeo', 'Material gráfico', 'Assessoria de imprensa', 'Social media mensal'],
    'Eventos': ['Evento anual 200 pessoas', 'Coffee break mensal', 'Decoração floral', 'Audiovisual completo', 'Buffet executivo', 'Palco e iluminação'],
    'Logística': ['Frete aéreo', 'Transporte terrestre SP-RJ', 'Armazenagem mensal', 'Distribuição nacional', 'Courier executivo'],
    'Escritório': ['Papel A4 (50 resmas)', 'Cadeiras ergonômicas', 'Mesas de trabalho', 'Suprimentos gerais', 'Café e snacks mensal'],
    'Alimentação': ['Refeições mensais', 'Coffee break eventos', 'Cesta básica colaboradores', 'Frutas semanais'],
    'Limpeza': ['Serviço limpeza mensal', 'Produtos de higiene', 'Dedetização', 'Limpeza de vidros'],
    'Segurança': ['Monitoramento mensal', 'Instalação câmeras', 'Alarme sistema', 'Portaria virtual'],
    'Consultoria': ['Consultoria estratégica', 'Diagnóstico organizacional', 'Mentoria gestão', 'Plano de negócios'],
    'Jurídico': ['Assessoria contratual', 'Defesa trabalhista', 'Compliance LGPD', 'Due diligence'],
    'Contabilidade': ['BPO financeiro mensal', 'Declaração IRPJ', 'Auditoria', 'Planejamento tributário'],
    'RH': ['Treinamento liderança', 'Recrutamento especializado', 'Plataforma EAD', 'Pesquisa de clima'],
    'Infraestrutura': ['Reforma escritório', 'Instalação elétrica', 'Climatização', 'Manutenção predial'],
    'Comunicação': ['PABX virtual', 'Link dedicado 1Gbps', 'Videoconferência', 'Central atendimento'],
    'Viagens': ['Viagem executiva NY', 'Hotel São Paulo 5*', 'Transfer aeroporto', 'Passagens nacionais'],
  };

  const statuses = ['approved', 'approved', 'approved', 'pending', 'pending', 'rejected', 'expired'];
  const units = ['unid', 'kg', 'm', 'm²', 'caixa', 'pacote', 'litro', 'hora', 'mês'];
  const insertQuote = db.prepare(`
    INSERT INTO quotes (supplier_id, item_description, quantity, unit, unit_price, total_price, status, valid_until, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  for (let i = 0; i < 200; i++) {
    const sup = suppliers[Math.floor(Math.random() * suppliers.length)];
    const itemList = items[sup.category] || ['Serviço geral'];
    const item = itemList[Math.floor(Math.random() * itemList.length)];
    const qty = Math.floor(Math.random() * 50) + 1;
    const basePrice = sup.avg_price || 5000;
    const unitPrice = basePrice * (0.7 + Math.random() * 0.6);
    const totalPrice = unitPrice * qty;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    // Distribute across 12 months (newer months heavier)
    const monthsAgo = Math.floor(Math.pow(Math.random(), 1.5) * 12);
    const createdAt = new Date(now.getTime() - monthsAgo * 30 * 24 * 60 * 60 * 1000 - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const validUntil = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    insertQuote.run(
      sup.id, item, qty, units[Math.floor(Math.random() * units.length)],
      Math.round(unitPrice * 100) / 100, Math.round(totalPrice * 100) / 100,
      status, validUntil.toISOString().split('T')[0], createdAt.toISOString()
    );
  }
  console.log('✅ Quotes seeded (200)');

  // 6. Reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (supplier_id, rating, quality_score, delivery_score, price_score, comment, reviewer)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of REVIEWS_DATA) {
    insertReview.run(r.supplier_id, r.rating, r.quality_score, r.delivery_score, r.price_score, r.comment, r.reviewer);
  }
  // Update supplier ratings
  const allReviews = db.prepare('SELECT supplier_id, AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews GROUP BY supplier_id').all() as Array<{supplier_id: number; avg_rating: number; cnt: number}>;
  for (const rev of allReviews) {
    db.prepare('UPDATE suppliers SET rating = ?, rating_count = ? WHERE id = ?').run(
      Math.round(rev.avg_rating * 10) / 10, rev.cnt, rev.supplier_id
    );
  }
  console.log('✅ Reviews seeded');

  // 7. Report templates
  const insertTemplate = db.prepare(`
    INSERT OR IGNORE INTO report_templates (name, slug, description, icon, color, available_formats, default_sections, query_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of REPORT_TEMPLATES) {
    insertTemplate.run(t.name, t.slug, t.description, t.icon, t.color, t.available_formats, t.default_sections, t.query_type);
  }
  console.log('✅ Report templates seeded');

  // 8. Notifications (user_id=1 = master)
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (let i = 0; i < NOTIFICATION_TYPES.length; i++) {
    const n = NOTIFICATION_TYPES[i];
    const hoursAgo = i * 3 + Math.floor(Math.random() * 2);
    const createdAt = new Date(Date.now() - hoursAgo * 3600000).toISOString();
    insertNotif.run(1, n.type, n.title, n.message, n.link, i < 5 ? 0 : 1, createdAt);
  }
  console.log('✅ Notifications seeded');

  // 9. Default preferences
  const insertPref = db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, pref_key, pref_value) VALUES (?, ?, ?)');
  for (let uid = 1; uid <= 4; uid++) {
    insertPref.run(uid, 'theme', 'dark');
    insertPref.run(uid, 'sidebar_compact', 'false');
    insertPref.run(uid, 'currency', 'BRL');
    insertPref.run(uid, 'page_size', '20');
    insertPref.run(uid, 'onboarding_completed', 'true');
  }
  console.log('✅ Preferences seeded');

  // 10. System settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)');
  const settings = [
    ['app_name', 'Netza FinHub', 'string', 'Nome da aplicação'],
    ['app_version', '1.0.0', 'string', 'Versão atual'],
    ['max_upload_mb', '10', 'number', 'Tamanho máximo de upload em MB'],
    ['ai_enabled', 'true', 'boolean', 'Habilitar funcionalidades de IA'],
    ['ai_model', 'qwen/qwen3-32b', 'string', 'Modelo de IA padrão'],
    ['export_expiry_days', '30', 'number', 'Dias para expiração de relatórios'],
    ['default_currency', 'BRL', 'string', 'Moeda padrão'],
    ['default_timezone', 'America/Sao_Paulo', 'string', 'Fuso horário padrão'],
    ['notification_polling_interval', '30', 'number', 'Intervalo de polling em segundos'],
  ];
  for (const [k, v, t, d] of settings) {
    insertSetting.run(k, v, t, d);
  }
  console.log('✅ System settings seeded');

    console.log('🎉 Seed completed successfully!');
  }); // end transaction

  doSeed();
}

// Run when executed directly
if (require.main === module) {
  runMigrations();
  runSeed();
  process.exit(0);
}
