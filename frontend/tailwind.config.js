/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0d1117",
        panel: "#161b22",
        border: "#30363d",
        accent: "#4f8cff",
        accentSoft: "#1f2c47",
        text: "#e6edf3",
        muted: "#8b949e",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
