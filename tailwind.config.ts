import type { Config } from "tailwindcss";

// Tokens da rota visual "Prumo calmo" (briefing, seção 4).
// As cores vêm de variáveis CSS em src/index.css, com versão clara e escura.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          soft: "rgb(var(--primary-soft) / <alpha-value>)",
          ink: "rgb(var(--primary-ink) / <alpha-value>)",
        },
        accent: "rgb(var(--accent) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Rethink Sans", "system-ui", "sans-serif"],
        sans: ["Rethink Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "12px" },
      maxWidth: { site: "1200px" },
    },
  },
  plugins: [],
} satisfies Config;
