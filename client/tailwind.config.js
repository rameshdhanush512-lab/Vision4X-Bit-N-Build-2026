/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // PRIVEX brand — dark navy + electric cyan
        brand: {
          50:  '#e8f9ff',
          100: '#c5f0ff',
          200: '#8de2ff',
          300: '#4dd0ff',
          400: '#00b8f5',
          500: '#0099d4',
          600: '#0077aa',
          700: '#005c87',
          800: '#003d5c',
          900: '#001f30',
        },
        surface: {
          DEFAULT: '#0d1117',
          card:    '#161b22',
          border:  '#21262d',
          muted:   '#30363d',
        },
        risk: {
          critical: '#ff4444',
          high:     '#ff8c00',
          medium:   '#ffd700',
          low:      '#44cc88',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
