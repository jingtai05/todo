/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FAF7F2',
          100: '#F3EEE6',
          200: '#E7DECf',
        },
        charcoal: {
          950: '#101113',
          900: '#17181B',
          800: '#1F2126',
          700: '#2A2D34',
        },
        coral: {
          600: '#F0553A',
          500: '#FF6B4A',
          400: '#FF866C',
        },
        moss: {
          600: '#1B8A6B',
          500: '#20A57F',
          400: '#2CC59A',
        },
      },
      boxShadow: {
        soft: '0 1px 0 rgba(16,17,19,0.06), 0 24px 60px rgba(16,17,19,0.10)',
        crisp:
          '0 0 0 1px rgba(16,17,19,0.08), 0 18px 50px rgba(16,17,19,0.12)',
      },
    },
  },
  plugins: [],
}

