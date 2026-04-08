/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        line:  '#232018',
        line2: '#302c22',
        ink:   '#ede9df',
        ink2:  '#9a9282',
        ink3:  '#5a5446',
        ink4:  '#38342a',
        paper:  '#0c0b09',
        paper2: '#111009',
        paper3: '#191712',
        paper4: '#211f18',
        lime:       '#c8f048',
        'lime-bg':  '#141c04',
        'lime-ink': '#c8f048',
        red:        '#f05040',
        'red-bg':   '#1c0908',
        'red-ink':  '#f07868',
        blue:       '#5b9cf6',
        'blue-bg':  '#06101e',
        'blue-ink': '#8dbfff',
        amber:       '#e8a040',
        'amber-bg':  '#1c1108',
        'amber-ink': '#e8b870',
        teal:       '#48c490',
        'teal-bg':  '#071910',
        'teal-ink': '#68d4a8',
      },
      fontFamily: {
        sans:  ['Instrument Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono:  ['DM Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.5)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.7)',
        'lime-glow': '0 0 0 1px rgba(200,240,72,0.25), 0 0 20px rgba(200,240,72,0.08)',
      },
      keyframes: {
        cardIn: {
          'from': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          'to':   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        overlayIn: {
          'from': { opacity: '0' },
          'to':   { opacity: '1' },
        },
        modalIn: {
          'from': { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          'to':   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.65)' },
        },
        toastUp: {
          'from': { opacity: '0', transform: 'translateY(14px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          'from': { backgroundPosition: '200% 0' },
          'to':   { backgroundPosition: '-200% 0' },
        }
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
      }
    },
  },
  plugins: [],
}
