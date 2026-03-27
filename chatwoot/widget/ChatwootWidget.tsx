'use client';

import { useEffect, useCallback, useRef } from 'react';
import { CHATWOOT_CONFIG, type Segmento } from './widget-config';

// ══════════════════════════════════════════════════════════════════════
// ChatwootWidget — Clube TCL SEMP 2026 · Agência YBY
//
// Componente React para embutir o widget Chatwoot no portal Next.js.
// Identifica o participante logado e roteia para o inbox correto
// (SEMP ou PRO) automaticamente.
//
// Uso:
//   import { ChatwootWidget } from '@/components/ChatwootWidget';
//   <ChatwootWidget participante={participante} />
// ══════════════════════════════════════════════════════════════════════

interface Participante {
  nome: string;
  email: string;
  cpf: string;
  segmento: Segmento;
  telefone?: string;
  cargo?: string;
  revenda?: string;
  cidade?: string;
  avatar_url?: string;
}

interface ChatwootWidgetProps {
  participante: Participante;
  /** Forçar segmento (ignora participante.segmento) */
  segmentoOverride?: Segmento;
  /** Callback quando widget estiver pronto */
  onReady?: () => void;
  /** Callback quando conversa for aberta */
  onOpen?: () => void;
  /** Callback quando conversa for fechada */
  onClose?: () => void;
}

declare global {
  interface Window {
    chatwootSettings: Record<string, unknown>;
    chatwootSDK: {
      run: (config: Record<string, unknown>) => void;
    };
    $chatwoot: {
      toggle: (state?: 'open' | 'close') => void;
      setUser: (id: string, attrs: Record<string, unknown>) => void;
      setCustomAttributes: (attrs: Record<string, unknown>) => void;
      setLabel: (label: string) => void;
      removeLabel: (label: string) => void;
      reset: () => void;
    };
    addEventListener: (event: string, handler: (e: Event) => void) => void;
  }
}

export function ChatwootWidget({
  participante,
  segmentoOverride,
  onReady,
  onOpen,
  onClose,
}: ChatwootWidgetProps) {
  const initialized = useRef(false);
  const segmento = segmentoOverride || participante.segmento;
  const config = CHATWOOT_CONFIG[segmento];

  // Identificar participante no Chatwoot
  const identificarParticipante = useCallback(() => {
    if (!window.$chatwoot) return;

    // Setar identidade do usuário
    window.$chatwoot.setUser(participante.cpf, {
      name: participante.nome,
      email: participante.email,
      phone_number: participante.telefone || '',
      avatar_url: participante.avatar_url || '',
      identifier_hash: '', // HMAC hash para segurança (gerar no backend)
    });

    // Atributos customizados para contexto do agente
    window.$chatwoot.setCustomAttributes({
      cpf: participante.cpf,
      segmento: segmento,
      cargo: participante.cargo || '',
      revenda: participante.revenda || '',
      cidade: participante.cidade || '',
      programa: segmento === 'semp' ? 'Clube TCL SEMP' : 'Clube TCL PRO',
    });

    // Labels para roteamento
    window.$chatwoot.setLabel(segmento);
    if (participante.cargo) {
      window.$chatwoot.setLabel(participante.cargo.toLowerCase());
    }
  }, [participante, segmento]);

  useEffect(() => {
    if (initialized.current) return;
    if (!config.token) {
      console.warn(`[ChatwootWidget] Token não configurado para segmento: ${segmento}`);
      return;
    }

    initialized.current = true;

    // Configurações do widget
    window.chatwootSettings = {
      hideMessageBubble: false,
      position: config.position,
      locale: config.locale,
      type: 'standard',
      darkMode: 'auto',
      launcherTitle: segmento === 'semp'
        ? 'Fale com a TICIELLE ⭐'
        : 'Fale com a TICIELLE 🔧',
    };

    // Event listeners
    window.addEventListener('chatwoot:ready', () => {
      identificarParticipante();
      onReady?.();
    });

    window.addEventListener('chatwoot:on-message', () => {
      // Analytics ou tracking
    });

    // Injetar script SDK
    const script = document.createElement('script');
    script.src = `${CHATWOOT_CONFIG.baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.chatwootSDK.run({
        websiteToken: config.token,
        baseUrl: CHATWOOT_CONFIG.baseUrl,
      });
    };
    document.head.appendChild(script);

    // Estilos customizados do widget (cores TCL)
    const style = document.createElement('style');
    style.textContent = `
      /* ── Chatwoot Widget — Clube TCL SEMP Branding ── */
      .woot-widget-bubble {
        background-color: ${config.color} !important;
      }
      .woot-widget-bubble:hover {
        background-color: ${segmento === 'semp' ? '#B30000' : '#0D1B2A'} !important;
        box-shadow: 0 6px 20px ${segmento === 'semp' ? 'rgba(227, 6, 19, 0.35)' : 'rgba(26, 111, 168, 0.35)'} !important;
      }
      .woot-widget-holder {
        border-radius: 20px !important;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.14) !important;
      }
      .woot-widget-holder iframe {
        border-radius: 20px !important;
      }
      /* Header do chat */
      .woot--header {
        background-color: ${config.color} !important;
      }
      /* Botão enviar */
      .woot--send-button {
        background-color: ${config.color} !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup
      script.remove();
      style.remove();
      if (window.$chatwoot) {
        window.$chatwoot.reset();
      }
    };
  }, [config, segmento, identificarParticipante, onReady]);

  // Re-identificar quando participante mudar
  useEffect(() => {
    if (window.$chatwoot) {
      identificarParticipante();
    }
  }, [participante, identificarParticipante]);

  // Expor métodos via ref (opcional)
  return null; // Widget é injetado via script, não renderiza JSX
}

// ── Utilitários ─────────────────────────────────────────────────────
/** Abrir o widget programaticamente */
export function abrirChat() {
  window.$chatwoot?.toggle('open');
}

/** Fechar o widget programaticamente */
export function fecharChat() {
  window.$chatwoot?.toggle('close');
}

/** Toggle do widget */
export function toggleChat() {
  window.$chatwoot?.toggle();
}
