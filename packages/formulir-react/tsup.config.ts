import { defineConfig } from 'tsup'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  treeshake: true,
  // Ship styles.css alongside the bundle so consumers can
  //   `import '@sawala/formulir-react/styles.css'`.
  onSuccess: async () => {
    copyFileSync(resolve('src/styles.css'), resolve('dist/styles.css'))
  },
})
