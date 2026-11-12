/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        desk: '#181512',
        desk2: '#221d18',
        paper: '#F7F3EB',
        ink: '#26221E',
        terra: '#B4532A',
        ember: '#E85D2A',
        sage: '#E8EFEA',
        sage2: '#D3E0D7',
        botanical: '#5E7F6A',
        alabaster: '#FAF8F3',
      },
      keyframes: {
        pageIn: {
          '0%': { opacity: 0, transform: 'perspective(1600px) rotateY(-7deg) translateX(14px)' },
          '100%': { opacity: 1, transform: 'perspective(1600px) rotateY(0) translateX(0)' },
        },
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'none' } },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-5px) rotate(-1deg)' },
          '40%': { transform: 'translateX(5px) rotate(1deg)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        glow: { '0%,100%': { opacity: 0.55 }, '50%': { opacity: 1 } },
        sunrise: { '0%': { opacity: 0, transform: 'scale(.6)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        pageIn: 'pageIn .7s cubic-bezier(.2,.8,.2,1) both',
        fadeUp: 'fadeUp .6s ease both',
        shake: 'shake .45s ease',
        glow: 'glow 2.4s ease-in-out infinite',
        sunrise: 'sunrise 2.6s ease-out both',
      },
    },
  },
  plugins: [],
};
