import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        // ── Surfaces ──
        "bg-primary":   "#FAF7F2",
        "bg-secondary": "#F3EDE3",
        "bg-card":      "#FFFFFF",
        "bg-code":      "#F0E9DF",
        // ── Borders ──
        "border-default": "#E5DAD0",
        "border-strong":  "#D4C5B8",
        "border-subtle":  "#1A2332",
        // ── Text ──
        "text-primary":   "#1C1410",
        "text-secondary": "#6B5240",
        "text-muted":     "#A08878",
        // ── Accents ──
        "accent-pink":   "#EC4899",
        "accent-rose":   "#F472B6",
        // ── Status ──
        "status-success": "#22C55E",
        "status-warning": "#F59E0B",
        "status-error":   "#EF4444",
        // ── Legacy aliases (so existing components don't break) ──
        background:    "#FAF7F2",
        foreground:    "#1C1410",
        surface: {
          DEFAULT: "#F3EDE3",
          raised:  "#FFFFFF",
          overlay: "#1E2A3A",
        },
        border: {
          DEFAULT: "#E5DAD0",
          strong:  "#D4C5B8",
        },
        muted: {
          DEFAULT:    "#1A2332",
          foreground: "#A08878",
        },
        burn: {
          DEFAULT: "#EC4899",
          light:   "#99F6E4",
          dark:    "#2DD4BF",
          glow:    "rgba(94, 234, 212, 0.15)",
        },
        shelby: {
          DEFAULT: "#EC4899",
          dark:    "#2DD4BF",
          dim:     "#0D9488",
          glow:    "rgba(94, 234, 212, 0.15)",
        },
        success: { DEFAULT: "#22C55E" },
        amber:   { DEFAULT: "#F59E0B", light: "#FCD34D" },
      },
      borderRadius: {
        lg: "8px", md: "6px", sm: "4px", xl: "12px", "2xl": "16px",
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-lg": "0 4px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)",
        teal:    "0 0 20px rgba(94,234,212,0.2)",
        "teal-lg": "0 0 40px rgba(94,234,212,0.15)",
      },
      animation: {
        "fade-in":    "fade-in 0.3s ease-out forwards",
        "slide-up":   "slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-down": "slide-down 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "scale-in":   "scale-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
        "sidebar-in": "sidebar-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-teal": "pulse-teal 2s ease-in-out infinite",
        "burn-pulse": "burn-pulse 1.5s ease-in-out infinite",
        "count-down": "count-down 0.4s ease-out",
        shimmer:      "shimmer 1.8s linear infinite",
      },
      keyframes: {
        "fade-in":    { from:{opacity:"0"}, to:{opacity:"1"} },
        "slide-up":   { from:{opacity:"0",transform:"translateY(10px)"}, to:{opacity:"1",transform:"translateY(0)"} },
        "slide-down": { from:{opacity:"0",transform:"translateY(-8px)"}, to:{opacity:"1",transform:"translateY(0)"} },
        "scale-in":   { from:{opacity:"0",transform:"scale(0.96)"}, to:{opacity:"1",transform:"scale(1)"} },
        "sidebar-in": { from:{opacity:"0",transform:"translateX(-12px)"}, to:{opacity:"1",transform:"translateX(0)"} },
        "pulse-teal": { "0%,100%":{boxShadow:"0 0 0 0 rgba(94,234,212,0)"}, "50%":{boxShadow:"0 0 16px 3px rgba(94,234,212,0.2)"} },
        "burn-pulse": { "0%,100%":{boxShadow:"0 0 0 0 rgba(239,68,68,0)"}, "50%":{boxShadow:"0 0 20px 4px rgba(239,68,68,0.3)"} },
        "count-down": { "0%":{transform:"scale(1.2)",opacity:"0.5"}, "100%":{transform:"scale(1)",opacity:"1"} },
        shimmer: { from:{backgroundPosition:"0 0"}, to:{backgroundPosition:"-200% 0"} },
      },
    },
  },
  plugins: [animate],
} satisfies Config;
