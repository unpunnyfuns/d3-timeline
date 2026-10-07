import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'dev',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: 'dev/index.html',
        tall: 'dev/tall.html',
      },
    },
  },
})
