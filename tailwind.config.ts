import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        parchment: "#f7f2e8",
        moss: "#526d44",
        ember: "#c45f3b",
        steel: "#40566b"
      }
    }
  },
  plugins: []
};

export default config;
