/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#07080b",
          900: "#0d0f14",
          850: "#13161c",
          800: "#1a1e27",
          700: "#262b37",
          600: "#373e4f",
          500: "#4f586d",
        },
        neon: {
          mint: "#00f59b",
          mintDark: "#059669",
          amber: "#ffb703",
          coral: "#ff3366",
          cyan: "#00e5ff",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'scan': 'scan 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'ripple': 'ripple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite',
        'bar-glow': 'barGlow 1.2s ease-in-out infinite alternate',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', filter: 'drop-shadow(0 0 8px rgba(0,245,155,0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 20px rgba(0,245,155,0.8))' },
        },
        ripple: {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        barGlow: {
          '0%': { opacity: '0.6', transform: 'scaleY(0.4)' },
          '100%': { opacity: '1', transform: 'scaleY(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
