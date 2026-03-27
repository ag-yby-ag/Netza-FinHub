// ══════════════════════════════════════════════════════════════════════
// Widget Config — Clube TCL SEMP 2026 · Agência YBY
//
// Configuração por segmento para o widget Chatwoot.
// Tokens devem ser definidos em .env.local do portal Next.js:
//   NEXT_PUBLIC_CHATWOOT_TOKEN_SEMP=<token>
//   NEXT_PUBLIC_CHATWOOT_TOKEN_PRO=<token>
//   NEXT_PUBLIC_CHATWOOT_BASE_URL=https://bko.ybyagencia.com.br
// ══════════════════════════════════════════════════════════════════════

export type Segmento = 'semp' | 'pro';

interface SegmentoConfig {
  token: string;
  color: string;
  colorHover: string;
  colorGlow: string;
  position: 'right' | 'left';
  locale: string;
  launcherTitle: string;
  teamName: string;
}

interface ChatwootConfig {
  baseUrl: string;
  semp: SegmentoConfig;
  pro: SegmentoConfig;
}

export const CHATWOOT_CONFIG: ChatwootConfig = {
  baseUrl: process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || 'https://bko.ybyagencia.com.br',

  semp: {
    token: process.env.NEXT_PUBLIC_CHATWOOT_TOKEN_SEMP || '',
    color: '#E30613',           // TCL Red
    colorHover: '#B30000',      // Red Dark
    colorGlow: 'rgba(227, 6, 19, 0.35)',
    position: 'right',
    locale: 'pt_BR',
    launcherTitle: 'Fale com a TICIELLE ⭐',
    teamName: 'Agentes SEMP',
  },

  pro: {
    token: process.env.NEXT_PUBLIC_CHATWOOT_TOKEN_PRO || '',
    color: '#1A6FA8',           // PRO Blue
    colorHover: '#0D1B2A',      // PRO Dark
    colorGlow: 'rgba(26, 111, 168, 0.35)',
    position: 'right',
    locale: 'pt_BR',
    launcherTitle: 'Fale com a TICIELLE 🔧',
    teamName: 'Agentes PRO',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Retorna config do segmento */
export function getSegmentoConfig(segmento: Segmento): SegmentoConfig {
  return CHATWOOT_CONFIG[segmento];
}

/** Valida se o token está configurado */
export function isWidgetConfigured(segmento: Segmento): boolean {
  return Boolean(CHATWOOT_CONFIG[segmento].token);
}

/** Retorna cor por segmento (para uso em outros componentes) */
export function getCorSegmento(segmento: Segmento): string {
  return CHATWOOT_CONFIG[segmento].color;
}
