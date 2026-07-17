import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        moss: "#4f6f52",
        sage: "#dce7da",
        oat: "#f4efe6",
        tomato: "#b94b3d",
        gold: "#c28b2e"
      }
    }
  },
  plugins: []
};

export default config;
