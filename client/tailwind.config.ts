import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#6DED67',
          hover: '#5CCB56',
          dark: '#4BA846',
          light: '#A8F5A3',
          subtle: '#E8FDE7',
        },
        black: {
          primary: '#0D0D0D',
          soft: '#1A1A1A',
          card: '#141414',
        },
        success: '#6DED67',
        error: '#FF4D4D',
        warning: '#FFB800',
        info: '#4DA6FF',
        finance: {
          blue: '#4DA6FF',
          'blue-light': '#E6F1FB',
          purple: '#7C3AED',
          'purple-light': '#E9D5FF',
        },
        gray: {
          50: '#F7F7F7',
          100: '#F2F2F2',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
        card: '20px',
        pill: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        lg: '0 8px 32px rgba(0,0,0,0.12)',
        green: '0 4px 24px rgba(109,237,103,0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config;
