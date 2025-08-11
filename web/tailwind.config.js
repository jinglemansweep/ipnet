/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./assets/js/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        secondary: '#6b7280',
        accent: '#3b82f6'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}