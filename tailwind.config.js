/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#1e40af",
          700: "#1e3a8a",
          800: "#172554",
          900: "#0f172a",
          950: "#020617",
        },
        industrial: {
          orange: "#f97316",
          "orange-light": "#fdba74",
          "orange-dark": "#c2410c",
          blue: "#0f172a",
          "blue-light": "#1e293b",
          "blue-dark": "#020617",
          gray: "#334155",
          "gray-light": "#475569",
          "gray-dark": "#1e293b",
        },
      },
    },
  },
  plugins: [],
};
