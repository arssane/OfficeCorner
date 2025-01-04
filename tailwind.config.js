/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        agu: ['Agu Display', 'sans-serif'], 
        lobster: ['Lobster', 'cursive'], 
      },
    },
  },
  plugins: [],
}
