import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import devApi from './devApi.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    react({ include: /\.(jsx|mdx)$/ }),
    devApi(),
  ],
  build: {
    outDir: "dist",
  },
  server: {
    port: 4545,
    historyApiFallback: true,
  },
});
