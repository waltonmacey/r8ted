/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',        // page background
        panel: '#121212',      // card background
        edge: '#242424',       // borders and hairlines
        paper: '#f9f9f9',      // primary text
        mute: '#8a8a8a',       // secondary text
        culture: '#00f0ff',
        lifestyle: '#ffb800',
        leisure: '#d0bcff',
        personal: '#f9f9f9',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],          // page titles, section headings, entry names
        ui: ['"Space Grotesk"', 'system-ui', 'sans-serif'], // nav, browse cards, rank numerals, chrome
        body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'], // labels, scores, data
      },
      letterSpacing: {
        label: '0.14em',
      },
    },
  },
  plugins: [
    // .barcode renders the stripe field; width of the parent-clipped fill = score/10.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.barcode': {
          backgroundImage:
            'repeating-linear-gradient(90deg, currentColor 0, currentColor 2px, transparent 2px, transparent 5px)',
        },
      })
    }),
  ],
}
