const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        // Verdana Health uses one 8px radius; legacy xl/2xl utilities follow it.
        xl: 'var(--radius-control)',
        '2xl': 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        floating: 'var(--shadow-floating)',
      },
      colors: {
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-strong': 'rgb(var(--color-primary-strong) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
        sans: 'var(--font-sans)',
      },
      minHeight: {
        control: 'var(--control-min-size)',
      },
      minWidth: {
        control: 'var(--control-min-size)',
      },
      spacing: {
        safeBottom: 'env(safe-area-inset-bottom)',
        safeTop: 'env(safe-area-inset-top)',
      },
    },
  },
}

export default config

