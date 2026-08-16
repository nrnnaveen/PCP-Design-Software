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
        cad: {
          bg: '#14171c',
          panel: '#1a1e24',
          subpanel: '#20262e',
          header: '#111418',
          border: '#2a313c',
          borderLight: '#3a4454',
          accent: '#2563eb',
          accentHover: '#1d4ed8',
          text: '#e2e8f0',
          textMuted: '#94a3b8',
          active: '#3b82f6',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          grid: '#232934',
          copperTop: '#e05638',
          copperBot: '#3b82f6',
          silkTop: '#f1f5f9',
          silkBot: '#a855f7',
          maskTop: '#15803d',
          maskBot: '#047857',
          edgeCut: '#eab308'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
