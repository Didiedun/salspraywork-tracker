/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:         '#bc3b25',
        'primary-deep':  '#9d2d1b',
        'on-primary':    '#ffffff',
        ink:             '#252923',
        body:            '#3a3a3a',
        charcoal:        '#535a51',
        mute:            '#626a60',
        ash:             '#737b71',
        stone:           '#adb4a9',
        'on-dark':       '#fcfcfc',
        'on-dark-mute':  'rgba(252,252,252,0.72)',
        canvas:          '#f5f6f2',
        'surface-bone':  '#eceee7',
        'surface-card':  '#ffffff',
        'surface-dark':  '#252923',
        'surface-deep':  '#202720',
        hairline:        'rgba(32,32,32,0.12)',
        'hairline-strong': '#252923',
        'divider-dark':  'rgba(255,255,255,0.2)',
        'badge-success': '#23754f',
        warn:            '#d97706',
        ok:              '#23754f',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        full: '9999px',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Inter', 'sans-serif'],
        sans:    ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
