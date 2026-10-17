/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uno: {
          red: '#EF4444',
          'red-dark': '#B91C1C',
          blue: '#2563EB',
          'blue-dark': '#1D4ED8',
          green: '#10B981',
          'green-dark': '#047857',
          yellow: '#F59E0B',
          'yellow-dark': '#B45309',
          black: '#1E293B',
          dark: '#0F172A',
          card: '#1E1B4B'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}
