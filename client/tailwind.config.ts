import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6DED67',
          hover: '#5CCB56',
          dark: '#4BA846',
          light: '#A8F5A3',
          subtle: '#E8FDE7',
        },
        dark: {
          DEFAULT: '#0D0D0D',
          soft: '#1A1A1A',
          card: '#141414',
        },
        surface: '#F7F7F7',
        error: '#FF4D4D',
        warning: '#FFB800',
        info: '#4DA6FF',
      },
      borderRadius: {
        card: '20px',
        pill: '9999px',
        input: '10px',
        sm: '8px',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        green: '0 4px 24px rgba(109,237,103,0.25)',
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};

export default config;
