/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Petrol — the one brand accent. Deliberately not red, amber or green,
        // which carry unpaid / deposit / paid meaning across the app.
        primary:           '#0B5E78',
        'primary-deep':    '#084A5F',
        'on-primary':      '#ffffff',
        // Ink and primer-grey neutrals, faintly cast toward the accent.
        ink:               '#141B1F',
        body:              '#2A3337',
        charcoal:          '#3F4A50',
        mute:              '#56626A',
        ash:               '#616D75',
        stone:             '#A9B4BA',
        'on-dark':         '#F2F5F6',
        'on-dark-mute':    'rgba(242,245,246,0.72)',
        canvas:            '#EEF1F2',
        'surface-bone':    '#E3E8EA',
        'surface-card':    '#ffffff',
        'surface-dark':    '#1A2327',
        'surface-deep':    '#11181B',
        // Opaque so opacity modifiers (border-hairline/50) lighten it as expected.
        hairline:          '#D7DEE1',
        'hairline-strong': '#141B1F',
        'divider-dark':    'rgba(242,245,246,0.14)',
        'badge-success':   '#146C45',
        warn:              '#B45309',
        ok:                '#146C45',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        full: '9999px',
      },
      fontFamily: {
        // Barlow was drawn from licence plates and road signs: headings, figures, plates.
        display: ['"Barlow Semi Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans:    ['Archivo', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
