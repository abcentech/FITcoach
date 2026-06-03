/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: 'var(--slate-50)',
          100: 'var(--slate-100)',
          200: 'var(--slate-200)',
          300: 'var(--slate-300)',
          400: 'var(--slate-400)',
          500: 'var(--slate-500)',
          600: 'var(--slate-600)',
          700: 'var(--slate-700)',
          800: 'var(--slate-800)',
          900: 'var(--slate-900)',
          950: 'var(--slate-950)',
        },
        // App background canvases
        canvas: {
          light: '#F8FAFC',
          dark: '#0B0F19',
        },
        // Component wrappers & data panels
        surface: {
          light: '#FFFFFF',
          dark: '#121824',
        },
        // Brand highlight accent
        brand: {
          amber: '#F59E0B',
        },
        // Financial semantic states (WCAG AA)
        financial: {
          loss: {
            light: '#DC2626', // red-600
            dark: '#EF4444',  // red-500
          },
          win: {
            light: '#059669', // emerald-600
            dark: '#10B981',  // emerald-500
          },
        },
      }
    },
  },
  plugins: [],
};
