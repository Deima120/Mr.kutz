/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        barber: {
          dark: '#0c0a09',
          charcoal: '#1c1917',
          muted: '#78716c',
        },
        gold: {
          DEFAULT: '#c9a962',
          light: '#e5d4a1',
          dark: '#9a7b3a',
          muted: 'rgba(201, 169, 98, 0.15)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'line-expand': 'lineExpand 0.8s ease-out forwards',
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        lineExpand: {
          '0%': { transform: 'scaleX(0)', opacity: '0.8' },
          '100%': { transform: 'scaleX(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backgroundImage: {
        'gradient-radial-gold': 'radial-gradient(ellipse 80% 50% at 70% 20%, rgba(201,169,98,0.12) 0%, transparent 50%)',
        'hero-pattern': 'linear-gradient(180deg, rgba(12,10,9,0.97) 0%, rgba(12,10,9,0.9) 100%)',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'card-hover': '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
        'gold-glow': '0 0 40px -8px rgba(201, 169, 98, 0.35)',
      },
    },
  },
  plugins: [],
};
