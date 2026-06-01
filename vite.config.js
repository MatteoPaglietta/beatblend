import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    proxy: {
      '/api-deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-deezer/, '')
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      external: ['fs', 'react-native-fs', 'path'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/essentia.js')) {
            return 'essentia';
          }
        },
      },
    },
  },
})
