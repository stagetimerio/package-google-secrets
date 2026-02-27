import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/load.ts', 'src/loader-child.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  outDir: 'dist',
})
