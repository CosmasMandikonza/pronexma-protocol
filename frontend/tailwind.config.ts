// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },

      fontSize: {
        'body-sm': ['0.875rem', { lineHeight: '1.4' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.3' }],

        display: ['2.25rem', { lineHeight: '1.2' }],
        headline: ['1.5rem', { lineHeight: '1.3' }],
        title: ['1.25rem', { lineHeight: '1.3' }],
      },

      colors: {
        // Shell & surfaces
        base: '#050910',
        surface: '#0B1220',
        'surface-alt': '#0F172A',
        'surface-elevated': '#111827',

        // Borders
        border: '#1F2937',
        'border-light': '#374151',
        'border-focus': '#60A5FA',

        // Brand accents
        primary: '#4B7CFF',
        'primary-soft': '#1D4ED8',
        'primary-500': '#3B82F6',
        'primary-300': '#93C5FD',

        // Success / emerald variants (used as bg-emerald, hover:bg-emerald-500, text-emerald-300, etc.)
        emerald: '#34D399',
        'emerald-500': '#10B981',
        'emerald-300': '#6EE7B7',

        // Amber / warning (bg-amber, text-amber-300)
        amber: '#FBBF24',
        'amber-300': '#FCD34D',

        // Red / danger (bg-red, text-red-300, hover:bg-red-500)
        red: '#F97373',
        'red-500': '#EF4444',
        'red-300': '#FCA5A5',

        // “Semantic” aliases (can still be used)
        warning: '#FBBF24',
        danger: '#F97373',

        // Base text tokens
        text: '#E5F0FF',
        muted: '#9CA3AF',
        subtle: '#64748b',

        // Status tokens
        'status-active': '#34D399',
        'status-pending': '#FBBF24',
        'status-risk': '#F97373',
        'status-info': '#60A5FA',

        'card-border': 'rgba(148, 163, 184, 0.3)',

        // Aliases used via @apply text-text-* in globals.css
        'text-primary': '#E5F0FF',
        'text-secondary': '#9CA3AF',
        'text-muted': '#64748b',
      },

      boxShadow: {
        card: '0 18px 40px rgba(15, 23, 42, 0.45)',
        elevated: '0 24px 60px rgba(15, 23, 42, 0.6)',
        soft: '0 18px 40px rgba(15, 23, 42, 0.45)',
        subtle: '0 10px 25px rgba(15, 23, 42, 0.35)',
        inset: 'inset 0 0 0 1px rgba(148, 163, 184, 0.4)',
      },

      borderRadius: {
        card: '12px',
      },

      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 400ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;




