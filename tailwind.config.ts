import type { Config } from "tailwindcss";

// Tokens da identidade verde da Prumo (logo oficial).
// As cores vêm de variáveis CSS em src/index.css (site sempre em fundo branco).
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
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          deep: "rgb(var(--accent-deep) / <alpha-value>)",
        },
        cream: "rgb(var(--cream) / <alpha-value>)",
        sky: "rgb(var(--sky) / <alpha-value>)",
        deep: {
          DEFAULT: "rgb(var(--deep) / <alpha-value>)",
          ink: "rgb(var(--deep-ink) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Rethink Sans", "system-ui", "sans-serif"],
        sans: ["Rethink Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "16px" },
      maxWidth: { site: "1200px" },
    },
  },
  plugins: [],
} satisfies Config;
