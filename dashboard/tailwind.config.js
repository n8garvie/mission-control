/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#fdfbf7',
          100: '#f8f4ed',
          200: '#f1e8d9',
          300: '#e8d9c3',
          400: '#d4bfa0',
          500: '#c0a77d',
          600: '#a88f66',
          700: '#8a7353',
          800: '#6b5840',
          900: '#4d3f2d',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
