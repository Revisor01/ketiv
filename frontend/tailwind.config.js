/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Fraunces', 'Georgia', 'serif'],
        'body': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        royal: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a5b9fc',
          400: '#8b96f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        border: '#e5e7eb',
        accent: {
          50: '#f8faff',
          100: '#f1f5ff',
          200: '#e4ecff',
          300: '#d1ddff',
          400: '#b8c9ff',
          500: '#9ab0ff',
          600: '#7b8eff',
          700: '#6366f1',
          800: '#4f46e5',
          900: '#4338ca',
        }
      },
      backgroundImage: {
        'gradient-royal': 'linear-gradient(135deg, #6366f1 0%, #e0e9ff 100%)',
        'gradient-royal-r': 'linear-gradient(45deg, #6366f1 0%, #e0e9ff 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%)',
        'gradient-card': 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
      },
      boxShadow: {
        'royal': '0 4px 20px -2px rgba(99, 102, 241, 0.25)',
        'card': '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 8px 24px -4px rgba(99, 102, 241, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}