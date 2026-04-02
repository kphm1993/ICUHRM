import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9f8",
          100: "#d7f0ee",
          200: "#afe1dd",
          300: "#7ccac5",
          400: "#4eada9",
          500: "#338f8d",
          600: "#276f6f",
          700: "#22595a",
          800: "#204849",
          900: "#1d3d3e"
        }
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

