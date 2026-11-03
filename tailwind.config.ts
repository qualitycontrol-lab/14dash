import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FDFBF7",
        forest: "#2E472D",
        rust: "#D35A43",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica Neue", "sans-serif"],
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;