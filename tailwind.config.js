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
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          900: '#0c4a6e',
        },
        patient: {
          bg: '#0f172a',        // Slate 900
          card: '#1e293b',      // Slate 800
          border: '#334155',    // Slate 700
          text: '#f8fafc',      // High contrast white text
          subtext: '#cbd5e1',   // Slate 300
          accent: '#38bdf8',    // Sky 400
          highlight: '#f59e0b', // Amber 500
          success: '#10b981',   // Emerald 500
          alert: '#ef4444',     // Red 500
        }
      },
      fontFamily: {
        accessible: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '23xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '33xl': ['3rem', { lineHeight: '1' }],
        '43xl': ['4rem', { lineHeight: '1' }],
      }
    },
  },
  plugins: [],
}
