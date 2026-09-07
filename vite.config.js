import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 🔴 host:true → 0.0.0.0'a bağlanır, sandbox canlı önizleme için şart.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, port: 4173 },
})
