import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#131826",
        sakura: "#ff77a8",
        neon: "#75f3ff"
      }
    }
  },
  plugins: []
};

export default config;
