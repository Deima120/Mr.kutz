/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#f9d7ac',
          300: '#f5ba77',
          400: '#f09340',
          500: '#ec751a',
          600: '#dd5b10',
          700: '#b74410',
          800: '#923615',
          900: '#762f14',
          950: '#401508',
        },
      },
    },
  },
  plugins: [],
};
