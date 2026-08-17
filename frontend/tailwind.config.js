/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#232329',
        canvas: '#F7F6F2',
        paper: '#FEFDF9',
        lavender: {
          50: '#F4F1FF',
          100: '#E9E2FF',
          200: '#D4C5FF',
          300: '#B8A7F0',
          400: '#947CE0',
          500: '#7459C9',
          600: '#5B3FA8',
          700: '#462F82',
        },
        mint: {
          50: '#EFFCF7',
          100: '#D9F7EB',
          300: '#9BE2CB',
          500: '#42B894',
          700: '#16735A',
        },
        lime: '#C9F227',
        coral: '#FF806A',
      },
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'sans-serif'],
        display: ['Unbounded Variable', 'Unbounded', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 16px 45px rgba(35, 35, 41, 0.08)',
        lift: '0 10px 0 rgba(70, 47, 130, 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        rise: 'rise 350ms ease-out both',
      },
    },
  },
  plugins: [],
};
