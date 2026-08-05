/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: In NativeWind v4, we include all paths where we write Tailwind styles
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
