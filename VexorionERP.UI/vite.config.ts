import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    build: {
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/packages/ui/src/')) return 'vexorion-ui'
            if (id.includes('/VexorionERP.UI/src/i18n/locales/')) return 'app-locales'
            if (!id.includes('node_modules')) return
            if (id.includes('@mui/x-data-grid')) return 'vendor-mui-data-grid'
            if (id.includes('@mui/x-charts')) return 'vendor-mui-charts'
            if (id.includes('@mui/icons-material')) return 'vendor-mui-icons'
            if (id.includes('@mui/material') || id.includes('@mui/system')) return 'vendor-mui'
            if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
            if (id.includes('@tanstack')) return 'vendor-query'
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/yup/')) return 'vendor-forms'
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'https://localhost:7171',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
