import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // load .env files into process for the config
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_BASE || process.env.VITE_API_BASE || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy /posts and /properties to the configured backend during development
        '/posts': {
          target,
          changeOrigin: true,
          secure: true,
        },
        '/properties': {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
