/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system InfornetTV
        bg: '#0f0f0f',
        accent: {
          DEFAULT: '#e50914',
          hover: '#f6121d',
        },
        muted: '#808080',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      transitionTimingFunction: {
        'in-out-soft': 'ease-in-out',
      },
    },
  },
  plugins: [],
};
