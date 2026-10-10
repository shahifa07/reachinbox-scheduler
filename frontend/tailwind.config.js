/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        ink: "#10161F",
        muted: "#5B6675",
        line: "#E3E7ED",
        canvas: "#F4F6F9",
        pine: { DEFAULT: "#0B6B4F", dark: "#085640", soft: "#E3F2EC" },
        amber: { soft: "#FFF1D6", ink: "#8A5A00" },
        rose: { soft: "#FDE8E8", ink: "#A12626" },
      },
    },
  },
  plugins: [],
};
