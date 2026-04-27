import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dw: {
          dark: '#0C2340',
          primary: '#1565C0',
          mid: '#29B5E8',
          light: '#60D0F0',
          pale: '#F73FA4',
          pink: '#F73FA4',
          blue: '#29B5E8',
        },
      },
    },
  },
  plugins: [],
}
export default config
