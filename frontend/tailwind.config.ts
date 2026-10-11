import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chrome: "var(--bg-chrome)",
        app: "var(--bg-app)",
        well: "var(--bg-well)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          raised: "var(--bg-surface-raised)",
          inset: "var(--bg-surface-inset)",
        },
        hover: "var(--bg-hover)",
        pressed: "var(--bg-pressed)",
        float: "var(--bg-float)",
        stage: "var(--bg-video-stage)",
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
        txt: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          active: "var(--accent-active)",
          subtle: "var(--accent-subtle)",
          border: "var(--accent-border)",
          fg: "var(--accent-fg)",
          text: "var(--accent-text)",
        },
        success: {
          DEFAULT: "var(--success)",
          subtle: "var(--success-subtle)",
          border: "var(--success-border)",
          text: "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          subtle: "var(--warning-subtle)",
          border: "var(--warning-border)",
          text: "var(--warning-text)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          subtle: "var(--danger-subtle)",
          border: "var(--danger-border)",
          text: "var(--danger-text)",
          fg: "var(--danger-fg)",
          hover: "var(--danger-hover)",
          active: "var(--danger-active)",
        },
        processing: {
          DEFAULT: "var(--processing)",
          subtle: "var(--processing-subtle)",
          border: "var(--processing-border)",
          text: "var(--processing-text)",
        },
      },
      borderRadius: {
        xs: "2px",
        sm: "6px",
        md: "8px",
        full: "9999px",
      },
      boxShadow: {
        float: "var(--shadow-float)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "ui-monospace", "monospace"],
      },
      transitionDuration: {
        fast: '80ms',
        base: '120ms',
        slow: '200ms',
      },
    },
  },
  plugins: [],
};
export default config;



