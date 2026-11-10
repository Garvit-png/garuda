import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Offline support: after the build, write the list of every built file into dist/sw.js
 * and version the cache by a hash of their contents. A new deploy gets a new cache name,
 * so phones never keep a stale design.
 */
function precacheManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'precache-manifest',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const assets = files.filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha256');
      for (const f of assets) hash.update(f).update(readFileSync(join(outDir, f)));
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace("['__ASSETS__']", JSON.stringify(['./', ...assets.filter((f) => f !== 'index.html'), 'index.html']));
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: './',               // works at any path, e.g. github.io/garuda/
  plugins: [precacheManifest()],
  build: { target: 'es2022' },
});
