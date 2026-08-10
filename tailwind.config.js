/** @type {import('tailwindcss').Config} */
// Obsidian Ash 1 token system, per claude/r8ted-design-spec.md (sections 3-5, 7).
import plugin from 'tailwindcss/plugin'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#121414',
        surface: {
          DEFAULT: '#121414',
          dim: '#121414',
          bright: '#38393a',
          'container-lowest': '#0c0f0f',
          'container-low': '#1a1c1c',
          container: '#1e2020',
          'container-high': '#282a2b',
          'container-highest': '#333535',
          variant: '#333535',
        },
        'on-background': '#e2e2e2',
        'on-surface': '#e2e2e2',
        'on-surface-variant': '#c5c6ca',
        outline: '#8f9194',
        'outline-variant': '#44474a',
        // THE cyan: active nav, rank numerals, key stats, hover borders, chips.
        secondary: { DEFAULT: '#d3fbff', container: '#00eefc' },
        'on-secondary-container': '#00686f',
        // Dark text on solid cyan buttons.
        'primary-container': '#111417',
        tertiary: '#ffba20',
        error: '#ffb4ab',
        // Domain accents live in src/lib/taxonomy.js and are applied via
        // inline style; the 4x4 taxonomy (2026-08-10) removed the old
        // culture/lifestyle/leisure/personal token names.
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],          // page titles, section headings, entry names (locked)
        ui: ['"Space Grotesk"', 'system-ui', 'sans-serif'], // nav, browse cards, rank numerals, chrome
        body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'], // labels, scores, data
      },
      // Type scale, spec section 4. Face is applied per-element (font-display / font-body / font-mono).
      fontSize: {
        display: ['4.5rem', { lineHeight: '5rem', letterSpacing: '-0.04em', fontWeight: '700' }],
        'headline-lg': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg-mobile': ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '500' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'label-mono': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        'label-caps': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.1em', fontWeight: '600' }],
      },
    },
    // Sharp, machined radius scale (spec section 5). Nothing pill-shaped in the app today.
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      DEFAULT: '0.125rem',
      lg: '0.25rem',
      xl: '0.5rem',
      full: '0.75rem',
    },
  },
  plugins: [
    // .barcode renders the stripe field; width of the parent-clipped fill = score/10.
    // Exact mockup geometry (spec section 7): 2px bar, 6px period. Height and 0.3
    // opacity are applied where the bar is used.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.barcode': {
          backgroundImage:
            'repeating-linear-gradient(90deg, currentColor 0, currentColor 2px, transparent 2px, transparent 6px)',
        },
      })
    }),
  ],
}
