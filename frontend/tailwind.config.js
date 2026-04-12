/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './pages/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:  { DEFAULT: '#f5f0e8', 2: '#ede6d6', 3: '#e4dbc8' },
        cream2: '#ede6d6',
        cream3: '#e4dbc8',
        soil:   { DEFAULT: '#2c1f0e', 2: '#3d2c14', 3: '#5a4020' },
        moss:   { DEFAULT: '#3a5c2e', 2: '#4d7a3e', 3: '#6a9e57', light: '#d4e8cc' },
        wheat:  { DEFAULT: '#c8942a', 2: '#e0a830' },
        rust:   { DEFAULT: '#8b3a1a', 2: '#b04820' },
        agro:   { white: '#fdfaf4' },
        // Flat aliases for @apply in CSS (text-text, text-text2, etc.)
        text:   '#1a1208',
        text2:  '#4a3820',
        text3:  '#8a7458',
        text4:  '#b89a72',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Epilogue', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:  '6px',
        lg2: '12px',
        xl2: '20px',
      },
      boxShadow: {
        agro:     '0 2px 12px rgba(44,31,14,.08)',
        'agro-lg':'0 8px 40px rgba(44,31,14,.14)',
        'agro-xl':'0 20px 60px rgba(44,31,14,.18)',
      },
      keyframes: {
        slideUp:     { from: { transform:'translateY(12px)',opacity:0 }, to: { transform:'translateY(0)',opacity:1 } },
        fadeIn:      { from: { opacity:0 }, to: { opacity:1 } },
        shimmer:     { '0%':{ backgroundPosition:'200% 0' }, '100%':{ backgroundPosition:'-200% 0' } },
        float:       { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-8px)' } },
        'spin-slow': { from:{ transform:'rotate(0deg)' }, to:{ transform:'rotate(360deg)' } },
      },
      animation: {
        'slide-up':  'slideUp .4s ease',
        'fade-in':   'fadeIn .15s ease',
        shimmer:     'shimmer 1.4s infinite',
        float:       'float 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};
