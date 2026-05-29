import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl' // 1. Importa il plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl() // 2. Aggiungilo alla lista dei plugin
  ],
})
