import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'palette-bg': 'oklch(var(--palette-bg) / <alpha-value>)',
        'palette-bg-secondary': 'oklch(var(--palette-bg-secondary) / <alpha-value>)',
        'palette-accent': 'oklch(var(--palette-accent) / <alpha-value>)',
        'palette-text': 'oklch(var(--palette-text) / <alpha-value>)',
      },
      transitionDuration: {
        palette: 'var(--palette-transition-duration, 600ms)',
      },
    },
  },
  plugins: [],
};

export default config;
