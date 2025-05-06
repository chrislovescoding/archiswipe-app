// tailwind.config.ts
import type { Config } from "tailwindcss";
import plugin from 'tailwindcss/plugin'; // Import plugin

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tilt': 'tilt 10s infinite linear',
      },
      keyframes: {
        // Ensure your pulse keyframes are what you expect for pulse-slow
        // If you're using Tailwind's default pulse, 'pulse-slow' just changes duration/timing.
        // If 'pulse-slow' implies a different visual pulse, define it here.
        // For this example, assuming it's just a slower version of Tailwind's default opacity pulse:
        pulse: { // This is the standard keyframe name Tailwind uses for its 'animate-pulse'
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        tilt: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(0.5deg)' }, // Reduced tilt for subtlety
          '75%': { transform: 'rotate(-0.5deg)' },// Reduced tilt for subtlety
        }
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.animation-delay-2000': {
          'animation-delay': '2s',
        },
        '.animation-delay-4000': {
          'animation-delay': '4s',
        },
        '.smooth-transition': { // Define smooth-transition here
          'transition-property': 'all', // Or specify properties: color, background-color, border-color, etc.
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '300ms',
        },
      })
    })
  ],
};
export default config;