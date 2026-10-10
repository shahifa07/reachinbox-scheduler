/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        pixel: ['"Silkscreen"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#1A1D1F",
        muted: "#8A9199",
        line: "#EDEFEE",
        canvas: "#F3F5F4",
        field: "#F3F5F4",
        pine: { DEFAULT: "#00A63E", dark: "#008C34", soft: "#E6F4EA" },
        peach: { DEFAULT: "#FFE9D6", ink: "#C2410C" },
        rose: { soft: "#FDE8E8", ink: "#B42323" },
      },
    },
  },
  plugins: [],
};
