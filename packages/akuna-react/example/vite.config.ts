import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 5173 matches the allowlisted local origin/redirect URI on the test project.
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: {
      // Validate against the LOCAL build, not the published registry version.
      '@sawala/akuna-react': resolve(__dirname, '../dist/index.js'),
    },
  },
})
