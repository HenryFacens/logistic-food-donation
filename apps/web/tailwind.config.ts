const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        floating: 'var(--shadow-floating)',
      },
      colors: {
        border: 'rgb(var(--color-border) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
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

