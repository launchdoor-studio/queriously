import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "#0F1117",
          raised: "#1A1D27",
          overlay: "#22263A",
          border: "#2E3250",
        },
        text: {
          primary: "#E8EAF2",
          secondary: "#8B92B4",
          muted: "#4E5578",
          accent: "#F0A500",
        },
        accent: {
          primary: "#F0A500",
          secondary: "#6C7AE0",
          success: "#34D399",
          warning: "#FBBF24",
          error: "#F87171",
        },
        annotation: {
          yellow: "#FEF08A",
          green: "#BBF7D0",
          blue: "#BAE6FD",
          pink: "#FBCFE8",
          orange: "#FED7AA",
        },
        marginalia: {
          restatement: "#8B92B4",
          assumption: "#FBBF24",
          contradiction: "#F87171",
          connection: "#60A5FA",
          limitation: "#FB923C",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        base: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
