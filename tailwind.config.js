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
          bg: 'var(--cad-bg)',
          panel: 'var(--cad-panel)',
          subpanel: 'var(--cad-subpanel)',
          header: 'var(--cad-header)',
          border: 'var(--cad-border)',
          borderLight: 'var(--cad-border-light)',
          accent: 'var(--cad-accent)',
          accentHover: 'var(--cad-accent-hover)',
          text: 'var(--cad-text)',
          textMuted: 'var(--cad-text-muted)',
          active: 'var(--cad-active)',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          grid: 'var(--cad-grid)',
          copperTop: '#e05638',
          copperBot: '#3b82f6',
          silkTop: 'var(--cad-silk-top)',
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
