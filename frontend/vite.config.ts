import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// envPrefix, weil die App ihre Konfiguration aus REACT_APP_*-Variablen liest.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: 'REACT_APP_',
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
});
