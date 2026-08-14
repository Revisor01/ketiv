import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Die App liest ihre Konfiguration weiterhin aus REACT_APP_*-Variablen.
// envPrefix sorgt dafür, dass Vite genau diese Variablen einbindet.
export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
});
