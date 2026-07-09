/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PROVA Enterprise brand palette
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#5B5FF6', // Primary
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Dashboard-specific tokens
        dbg:        '#F7F8FC',
        dcard:      '#FFFFFF',
        dprimary:   '#5B5FF6',
        dsecondary: '#7B61FF',
        dblue:      '#4F8CFF',
        dsuccess:   '#12B76A',
        dwarning:   '#F79009',
        ddanger:    '#F04438',
        dtextpri:   '#101828',
        dtextsec:   '#667085',
        dborder:    '#EAECF0',
      },
      borderRadius: {
        'dashboard': '20px',
        'card': '24px',
      },
      boxShadow: {
        'dashboard': '0 10px 30px rgba(0,0,0,0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 20px 40px rgba(91, 95, 246, 0.08)',
        'soft': '0 8px 16px rgba(0,0,0,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.5s ease-out',
        'slideUp': 'slideUp 0.4s ease-out',
        'rocketFly': 'rocketFly 3s ease-in-out infinite',
        'rocketFlame': 'rocketFlame 0.3s ease-in-out infinite alternate',
        'rocketBounce': 'rocketBounce 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        rocketFly: {
          '0%': { transform: 'translateX(-10px) rotate(-5deg)' },
          '50%': { transform: 'translateX(5px) rotate(5deg)' },
          '100%': { transform: 'translateX(-10px) rotate(-5deg)' },
        },
        rocketFlame: {
          '0%': { opacity: '0.6', transform: 'scaleX(0.8)' },
          '100%': { opacity: '1', transform: 'scaleX(1.2)' },
        },
        rocketBounce: {
          '0%, 100%': { transform: 'translateY(-2px)' },
          '50%': { transform: 'translateY(2px)' },
        },
      },
    },
  },
  plugins: [],
};
