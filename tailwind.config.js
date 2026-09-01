/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
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
          textHeading: 'var(--cad-text-heading)',
          active: 'var(--cad-active)',
          danger: 'var(--cad-danger)',
          warning: 'var(--cad-warning)',
          success: 'var(--cad-success)',
          grid: 'var(--cad-grid)',
          copperTop: '#e05638',
          copperBot: '#3b82f6',
          silkTop: 'var(--cad-silk-top)',
          silkBot: '#a855f7',
          maskTop: '#15803d',
          maskBot: '#047857',
          edgeCut: '#eab308',
          surfaceHover: 'var(--cad-surface-hover)',
          surfaceActive: 'var(--cad-surface-active)',
          inputBg: 'var(--cad-input-bg)',
          inputBorder: 'var(--cad-input-border)',
          inputText: 'var(--cad-input-text)',
        }
      },
      fontFamily: {
        mono: ['Cascadia Code', 'Consolas', 'JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
        sans: ['Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'Inter', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
