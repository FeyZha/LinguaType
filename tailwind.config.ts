import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--lt-serif-font)"],
        serif: ["var(--lt-serif-font)"],
      },
      colors: {
        ink: "#1f2933",
        paper: "#fbfaf7",
        moss: "#47624f",
        coral: "#c96f53",
        skysoft: "#d9e8ef",
      },
    },
  },
  plugins: [],
};

export default config;
