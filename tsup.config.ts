import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react/jsx-runtime', /^d3-/],
})
