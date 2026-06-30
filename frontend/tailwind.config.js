/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper:  '#F3EFE6',
        ink:    '#26231D',
        rust: {
          DEFAULT: '#B5512E',
          soft:    '#E7D3C5',
        },
        line:  '#D9D1C0',
        leaf:  '#5B6F4F',
        muted: '#7A7363',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        mono:     ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
