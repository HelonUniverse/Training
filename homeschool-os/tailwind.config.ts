import type { Config } from 'tailwindcss';

/**
 * Design tokens for Homeschool OS.
 *
 * Direction: calm, intelligent, warm, premium, trustworthy, simple.
 * Deliberately NOT: childish, corporate HR, traditional SIS, government portal.
 *
 * The palette is a warm sage-green primary on warm (not blue-grey) neutrals.
 * Green reads as growth and calm without the coldness of corporate blue; the
 * warm neutrals keep it human. One accent only - amber - reserved for things
 * that genuinely need attention, so "needs attention" always means something.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // surfaces
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',

        // text
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--ink-muted) / <alpha-value>)',
        'ink-subtle': 'rgb(var(--ink-subtle) / <alpha-value>)',
        'ink-inverse': 'rgb(var(--ink-inverse) / <alpha-value>)',

        // brand
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          soft: 'rgb(var(--primary-soft) / <alpha-value>)',
          ink: 'rgb(var(--primary-ink) / <alpha-value>)',
        },

        // semantic
        attention: {
          DEFAULT: 'rgb(var(--attention) / <alpha-value>)',
          soft: 'rgb(var(--attention-soft) / <alpha-value>)',
          ink: 'rgb(var(--attention-ink) / <alpha-value>)',
        },
        positive: {
          DEFAULT: 'rgb(var(--positive) / <alpha-value>)',
          soft: 'rgb(var(--positive-soft) / <alpha-value>)',
          ink: 'rgb(var(--positive-ink) / <alpha-value>)',
        },
        critical: {
          DEFAULT: 'rgb(var(--critical) / <alpha-value>)',
          soft: 'rgb(var(--critical-soft) / <alpha-value>)',
          ink: 'rgb(var(--critical-ink) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          soft: 'rgb(var(--info-soft) / <alpha-value>)',
          ink: 'rgb(var(--info-ink) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '1rem',
        field: '0.75rem',
        pill: '9999px',
      },
      boxShadow: {
        // Subtle depth. Never a hard drop shadow.
        card: '0 1px 2px 0 rgb(24 29 25 / 0.04), 0 1px 3px 0 rgb(24 29 25 / 0.03)',
        raised: '0 2px 4px -1px rgb(24 29 25 / 0.06), 0 6px 16px -4px rgb(24 29 25 / 0.08)',
        pop: '0 8px 24px -6px rgb(24 29 25 / 0.14), 0 2px 6px -2px rgb(24 29 25 / 0.06)',
        focus: '0 0 0 2px rgb(var(--canvas)), 0 0 0 4px rgb(var(--primary))',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Large, readable. Display sizes carry tight tracking.
        display: ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        title: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        heading: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.5rem' }],
      },
      maxWidth: {
        prose: '34rem',
        form: '30rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
