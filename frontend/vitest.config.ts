import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    // Ab Node 25 verdeckt ein eigenes localStorage ohne Speicherdatei das von jsdom.
    execArgv: ['--no-experimental-webstorage'],
  },
});
