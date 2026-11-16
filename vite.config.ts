import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Inyecta en dist/sw.js la lista de assets con hash de esta build para que el
 * service worker los precachee en la instalacion. Sin esto, la primera visita
 * online no garantiza el arranque offline.
 */
function precacheManifest(): Plugin {
  return {
    name: 'turno-noche-precache',
    apply: 'build',
    closeBundle() {
      const dist = resolve('dist');
      const files: string[] = [];
      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (statSync(full).isDirectory()) walk(full);
          else files.push('./' + relative(dist, full).replace(/\\/g, '/'));
        }
      };
      try {
        walk(join(dist, 'assets'));
        const swPath = join(dist, 'sw.js');
        const source = readFileSync(swPath, 'utf8');
        writeFileSync(swPath, source.replace('__BUILD_ASSETS__', JSON.stringify(files)));
      } catch {
        // build sin assets: el service worker se queda con el shell
      }
    },
  };
}

// Salida 100% estatica. `base: './'` permite desplegar en la raiz o en un
// subdirectorio (GitHub Pages) sin tocar codigo: todos los assets y el
// service worker se resuelven de forma relativa al documento.
export default defineConfig({
  base: './',
  plugins: [react(), precacheManifest()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('@dimforge/rapier3d')) return 'rapier';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: { port: 5180, host: true, watch: { usePolling: true, interval: 400 } },
  preview: { port: 4180, host: true },
});
