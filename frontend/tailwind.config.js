/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#081226',
          800: '#0e2140',
          700: '#1c3360',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.05), 0 8px 24px -8px rgba(16,24,40,.12)',
        glow: '0 10px 28px -8px rgba(37,99,235,.5)',
      },
    },
  },
  plugins: [],
}
