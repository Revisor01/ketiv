import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// envPrefix, weil die App ihre Konfiguration aus REACT_APP_*-Variablen liest.
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
