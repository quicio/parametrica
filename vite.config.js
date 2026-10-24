import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // p5 is lazy-loaded as its own ~1 MB chunk; this budget applies to
    // the chunks on the initial path. Keep the warning honest for those.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/p5')) return 'p5';
          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/@lezer')) return 'codemirror';
          if (id.includes('node_modules/lil-gui')) return 'lil-gui';
          if (id.includes('node_modules/d3-delaunay') || id.includes('node_modules/polygon-clipping')) return 'geometry-vendor';
          return undefined;
        },
      },
    },
  },
});
