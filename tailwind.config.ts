import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F9F7',
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#EEF3EF',
        },
        border: '#D5DDD7',
        text: {
          DEFAULT: '#14201A',
          muted: '#4A5A52',
          onPrimary: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#0B6B4D',
          press: '#095640',
        },
        saving: '#0B6B4D',
        brandPrice: '#6B4A12',
        warning: {
          bg: '#FFF4D6',
          text: '#5C3D00',
        },
        danger: '#B42318',
        info: {
          bg: '#E6F0FF',
        },
      },
    },
  },
  plugins: [],
};

export default config;
