/**
 * ══════════════════════════════════════════════════════════════════════
 * N8N → Chatwoot Handoff — Clube TCL SEMP 2026 · Agência YBY
 *
 * Payloads de referência para criar o fluxo de handoff no N8N.
 * O bot TICIELLE escala para agente humano via Chatwoot.
 *
 * Fluxo N8N (5 nodes):
 *   1. Webhook Trigger → recebe sinal do bot
 *   2. IF Node → segmento PRO ou SEMP? seleciona inbox_id
 *   3. POST /contacts → busca ou cria contato
 *   4. POST /conversations → cria conversa aberta
 *   5. POST /messages → envia histórico do bot como nota privada
 *
 * Variáveis de ambiente no N8N:
 *   CHATWOOT_URL       = https://bko.ybyagencia.com.br
 *   CHATWOOT_TOKEN     = <api_access_token_do_admin>
 *   ACCOUNT_ID         = 1
 *   INBOX_SEMP_ID      = <id do inbox Chat Web SEMP>
 *   INBOX_PRO_ID       = <id do inbox Chat Web PRO>
 *   TEAM_SEMP_ID       = <id do time Agentes SEMP>
 *   TEAM_PRO_ID        = <id do time Agentes PRO>
 * ══════════════════════════════════════════════════════════════════════
 */

// ── CONFIG ──────────────────────────────────────────────────────────
const CHATWOOT_URL = '{{$env.CHATWOOT_URL}}';
const CHATWOOT_TOKEN = '{{$env.CHATWOOT_TOKEN}}';
const ACCOUNT_ID = '{{$env.ACCOUNT_ID}}';

// ── HEADERS (reutilizar em todos os HTTP Request nodes) ─────────────
const headers = {
  'Content-Type': 'application/json',
  'api_access_token': CHATWOOT_TOKEN,
};

// ══════════════════════════════════════════════════════════════════════
// NODE 1: Webhook Trigger
// ══════════════════════════════════════════════════════════════════════
// Método: POST
// Path: /chatwoot-handoff
// Payload esperado do bot TICIELLE:
const webhookPayload = {
  participante: {
    nome: 'João Silva',
    email: 'joao@revenda.com.br',
    cpf: '00000000000',
    telefone: '+5511999999999',
    segmento: 'semp', // 'semp' ou 'pro'
    cargo: 'vendedor',
    revenda: 'Casas Bahia SP Centro',
  },
  conversa: {
    motivo_escalacao: 'Participante solicitou falar com humano',
    intent_detectada: 'falar_atendente',
    sentimento: 'neutro',
    historico: [
      { role: 'user', content: 'Oi, quero saber sobre meus pontos' },
      { role: 'assistant', content: 'Oi João! Seu saldo é 1.247 pontos 🌟' },
      { role: 'user', content: 'Quero falar com alguém' },
      { role: 'assistant', content: 'Claro! Vou te conectar com um atendente agora.' },
    ],
  },
  metadata: {
    canal_origem: 'web', // 'web' ou 'whatsapp'
    session_id: 'sess_abc123',
    timestamp: new Date().toISOString(),
  },
};

// ══════════════════════════════════════════════════════════════════════
// NODE 2: IF Node — Roteamento por Segmento
// ══════════════════════════════════════════════════════════════════════
// Condição: {{ $json.participante.segmento === 'pro' }}
//
// TRUE (PRO):
//   inbox_id = {{ $env.INBOX_PRO_ID }}
//   team_id  = {{ $env.TEAM_PRO_ID }}
//
// FALSE (SEMP):
//   inbox_id = {{ $env.INBOX_SEMP_ID }}
//   team_id  = {{ $env.TEAM_SEMP_ID }}

// ══════════════════════════════════════════════════════════════════════
// NODE 3: Buscar ou Criar Contato
// ══════════════════════════════════════════════════════════════════════
// Primeiro tenta buscar por email, se não existir, cria novo.

// 3a. Buscar contato existente
const searchContact = {
  method: 'GET',
  url: `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search`,
  qs: {
    q: '{{$json.participante.email}}',
    include_contacts: true,
  },
  headers,
};

// 3b. Criar contato (se não encontrado)
const createContact = {
  method: 'POST',
  url: `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`,
  headers,
  body: {
    name: '{{$json.participante.nome}}',
    email: '{{$json.participante.email}}',
    phone_number: '{{$json.participante.telefone}}',
    identifier: '{{$json.participante.cpf}}',
    custom_attributes: {
      cpf: '{{$json.participante.cpf}}',
      segmento: '{{$json.participante.segmento}}',
      cargo: '{{$json.participante.cargo}}',
      revenda: '{{$json.participante.revenda}}',
      programa: '{{$json.participante.segmento === "semp" ? "Clube TCL SEMP" : "Clube TCL PRO"}}',
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
// NODE 4: Criar Conversa
// ══════════════════════════════════════════════════════════════════════
const createConversation = {
  method: 'POST',
  url: `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`,
  headers,
  body: {
    contact_id: '{{$json.contact_id}}', // do node anterior
    inbox_id: '{{$json.inbox_id}}',     // do IF node
    status: 'open',
    team_id: '{{$json.team_id}}',       // do IF node
    additional_attributes: {
      canal_origem: '{{$json.metadata.canal_origem}}',
      motivo_escalacao: '{{$json.conversa.motivo_escalacao}}',
      intent: '{{$json.conversa.intent_detectada}}',
      sentimento: '{{$json.conversa.sentimento}}',
      session_id: '{{$json.metadata.session_id}}',
    },
    custom_attributes: {
      segmento: '{{$json.participante.segmento}}',
      revenda: '{{$json.participante.revenda}}',
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
// NODE 5: Enviar Histórico como Nota Privada
// ══════════════════════════════════════════════════════════════════════
// O histórico do bot é enviado como mensagem privada para o agente
// poder ver o contexto da conversa antes de responder.

const sendHistory = {
  method: 'POST',
  url: `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/{{$json.conversation_id}}/messages`,
  headers,
  body: {
    content: formatHistorico('{{$json.conversa.historico}}'),
    message_type: 'outgoing',
    private: true, // Nota privada — só agente vê
    content_attributes: {
      bot_handoff: true,
      canal_origem: '{{$json.metadata.canal_origem}}',
    },
  },
};

/**
 * Formata o histórico do bot para a nota privada.
 * Use esta função no Code Node do N8N antes do HTTP Request.
 */
function formatHistorico(historico) {
  if (!Array.isArray(historico) || historico.length === 0) {
    return '📋 Sem histórico de conversa com o bot.';
  }

  let texto = '🤖 **Histórico do Bot TICIELLE**\n';
  texto += '─────────────────────────\n\n';

  for (const msg of historico) {
    const emoji = msg.role === 'user' ? '👤' : '🤖';
    const nome = msg.role === 'user' ? 'Participante' : 'TICIELLE';
    texto += `${emoji} **${nome}:** ${msg.content}\n\n`;
  }

  texto += '─────────────────────────\n';
  texto += `⏰ Escalado em: ${new Date().toLocaleString('pt-BR')}\n`;
  texto += '💡 Motivo: Participante solicitou atendente humano';

  return texto;
}

// ══════════════════════════════════════════════════════════════════════
// EXPORT (para uso como Code Node no N8N)
// ══════════════════════════════════════════════════════════════════════
module.exports = {
  webhookPayload,
  searchContact,
  createContact,
  createConversation,
  sendHistory,
  formatHistorico,
  headers,
};
