/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: { 50: '#fbf6e9', 100: '#f4ead0', 200: '#e9d8ad', 300: '#d9bf85', 400: '#c4a05e' },
        ink: { DEFAULT: '#2b1d10', soft: '#5a4330', faint: '#8a7259' },
        oxblood: { DEFAULT: '#7a1f1f', dark: '#5c1414', light: '#a33a2f' },
        olive: { DEFAULT: '#4f5d2f', dark: '#3a4522' },
        gilt: { DEFAULT: '#b8862b', light: '#d9ab4a' },
        walnut: { DEFAULT: '#5b3a1e', dark: '#3d2612', light: '#8a5a2e' },
      },
      fontFamily: {
        display: ['"IM Fell English SC"', 'Georgia', 'serif'],
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
        board: ['Fredoka', '"Trebuchet MS"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
