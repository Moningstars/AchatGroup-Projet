/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          50: '#f7f3ff', 100: '#efe7ff', 200: '#dfd0ff', 300: '#c8adff',
          400: '#a97cff', 500: '#8b4cf6', 600: '#7431e8', 700: '#6123c9',
          800: '#511fa4', 900: '#431d83', 950: '#2b0c5f',
        },
        slate: {
          50: '#f8f9f7', 100: '#f0f2ef', 200: '#e3e7e2', 300: '#cdd3ce',
          400: '#929b95', 500: '#68736c', 600: '#4b574f', 700: '#354139',
          800: '#202a24', 900: '#131b16', 950: '#09110d',
        },
      },
      borderRadius: {
        xl: '.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(9,17,13,.025)',
        lift: '0 10px 28px rgba(9,17,13,.08)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .28s ease-out both',
      },
    },
  },
  plugins: [],
}
