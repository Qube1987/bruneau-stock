/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#29235C',
        accent: '#E72C63',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'base',
    }),
  ],
};