import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Clerk + React are provided by the host app (peer deps), never bundled.
  external: ['react', 'react-dom', 'react/jsx-runtime', '@clerk/clerk-react'],
  treeshake: true,
})
