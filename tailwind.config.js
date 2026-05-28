/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:         '#ea2804',
        'primary-deep':  '#c01f00',
        'on-primary':    '#ffffff',
        ink:             '#202020',
        body:            '#3a3a3a',
        charcoal:        '#575757',
        mute:            '#646464',
        ash:             '#8d8d8d',
        stone:           '#bbbbbb',
        'on-dark':       '#fcfcfc',
        'on-dark-mute':  'rgba(252,252,252,0.72)',
        canvas:          '#f9f7f3',
        'surface-bone':  '#f3f0e8',
        'surface-card':  '#ffffff',
        'surface-dark':  '#202020',
        'surface-deep':  '#000000',
        hairline:        'rgba(32,32,32,0.12)',
        'hairline-strong': '#202020',
        'divider-dark':  'rgba(255,255,255,0.2)',
        'badge-success': '#2b9a66',
        warn:            '#d97706',
        ok:              '#2b9a66',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        full: '9999px',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Inter', 'sans-serif'],
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
