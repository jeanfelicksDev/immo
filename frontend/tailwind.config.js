/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette ImmoGest — Bleu professionnel + accents dorés
        primary: {
          50:  '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#3f51b5',
          600: '#3949ab',
          700: '#303f9f',
          800: '#283593',
          900: '#1a237e',
        },
        accent: {
          50:  '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        surface: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          800: '#424242',
          900: '#212121',
        },
        success:  '#4caf50',
        warning:  '#ff9800',
        danger:   '#f44336',
        info:     '#2196f3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card':  '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(63,81,181,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        'modal': '0 20px 60px rgba(0,0,0,0.2)',
      },
      borderRadius: {
        'xl2': '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-in-out',
        'slide-in':    'slideIn 0.3s ease-out',
        'slide-up':    'slideUp 0.25s ease-out',
        'scale-in':    'scaleIn 0.2s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                          to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(-20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' },  to: { transform: 'translateY(0)',  opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' },       to: { transform: 'scale(1)',       opacity: '1' } },
      },
    },
  },
  plugins: [],
};
