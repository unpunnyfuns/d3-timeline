import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const page = (name: string) => new URL(`dev/${name}`, import.meta.url).pathname

export default defineConfig({
  root: 'dev',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: page('index.html'),
        tall: page('tall.html'),
      },
    },
  },
})
