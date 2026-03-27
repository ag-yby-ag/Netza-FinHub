/**
 * ══════════════════════════════════════════════════════════════════════
 * Tailwind CSS Overrides — Clube TCL SEMP 2026 · Agência YBY
 *
 * Merge este objeto no `theme.extend` do tailwind.config.js do Chatwoot.
 * Exemplo: theme: { extend: { ...require('./branding/tailwind.overrides') } }
 * ══════════════════════════════════════════════════════════════════════
 */

module.exports = {
  colors: {
    // TCL Primary
    'tcl-red': {
      DEFAULT: '#E30613',
      50:  '#FFF7F7',
      100: '#FFF0F0',
      200: '#FFD6D9',
      300: '#FF8A91',
      400: '#FF2A35',
      500: '#E30613',
      600: '#B30000',
      700: '#990000',
      800: '#800000',
      900: '#660000',
    },

    // Neutros TCL
    'tcl-ink': {
      DEFAULT: '#1A1A1A',
      50:  '#FFFFFF',
      100: '#F7F7F7',
      200: '#EBEBEB',
      300: '#6B6B6B',
      400: '#3D3D3D',
      500: '#1A1A1A',
      600: '#0A0A0A',
      700: '#050505',
      800: '#030303',
      900: '#000000',
    },

    // Segmento PRO
    'tcl-pro': {
      DEFAULT: '#1A6FA8',
      dark:   '#0D1B2A',
      light:  '#E8F4FD',
    },

    // Semânticas
    'tcl-success': {
      DEFAULT: '#2E7D32',
      bg:     '#E8F5E9',
    },
    'tcl-warning': {
      DEFAULT: '#E65100',
      bg:     '#FFF8E1',
    },
    'tcl-error': {
      DEFAULT: '#E30613',
      bg:     '#FFF0F0',
    },
    'tcl-info': {
      DEFAULT: '#1A6FA8',
      bg:     '#E8F4FD',
    },
  },

  fontFamily: {
    sans:    ['Google Sans', 'Google Sans Text', 'Product Sans', 'system-ui', 'sans-serif'],
    display: ['Google Sans Display', 'Google Sans', 'Product Sans', 'sans-serif'],
    mono:    ['Google Sans Mono', 'Roboto Mono', 'Fira Code', 'monospace'],
  },

  fontSize: {
    'd1':    ['48px', { lineHeight: '1', letterSpacing: '-1.5px', fontWeight: '700' }],
    'd2':    ['32px', { lineHeight: '1.1', letterSpacing: '-0.8px', fontWeight: '700' }],
    'h1':    ['24px', { lineHeight: '1.2', letterSpacing: '-0.4px', fontWeight: '700' }],
    'h2':    ['18px', { lineHeight: '1.3', fontWeight: '700' }],
    'h3':    ['15px', { lineHeight: '1.4', fontWeight: '500' }],
    'body':  ['14px', { lineHeight: '1.7', fontWeight: '400' }],
    'sm':    ['12px', { lineHeight: '1.5', letterSpacing: '0.2px', fontWeight: '500' }],
    'label': ['10px', { lineHeight: '1.2', letterSpacing: '2px', fontWeight: '700' }],
    'mono':  ['13px', { lineHeight: '1.5', fontWeight: '400' }],
  },

  borderRadius: {
    'tcl-sm':   '6px',
    'tcl-md':   '12px',
    'tcl-lg':   '20px',
    'tcl-xl':   '32px',
    'tcl-full': '9999px',
  },

  spacing: {
    'tcl-1':  '4px',
    'tcl-2':  '8px',
    'tcl-3':  '12px',
    'tcl-4':  '16px',
    'tcl-6':  '24px',
    'tcl-8':  '32px',
    'tcl-12': '48px',
    'tcl-16': '64px',
  },

  boxShadow: {
    'tcl-sm': '0 1px 4px rgba(0, 0, 0, 0.08)',
    'tcl-md': '0 4px 20px rgba(0, 0, 0, 0.10)',
    'tcl-lg': '0 12px 48px rgba(0, 0, 0, 0.14)',
    'tcl-red-glow': '0 6px 20px rgba(227, 6, 19, 0.35)',
  },
};
