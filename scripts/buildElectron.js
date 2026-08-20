import esbuild from 'esbuild';
import path from 'path';

async function buildElectron() {
  // 1. Build Main Process
  await esbuild.build({
    entryPoints: [path.resolve('electron/main.ts')],
    outfile: path.resolve('dist-electron/main.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    sourcemap: false,
    minify: false,
  });

  // 2. Build Preload Script
  await esbuild.build({
    entryPoints: [path.resolve('electron/preload.ts')],
    outfile: path.resolve('dist-electron/preload.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    sourcemap: false,
    minify: false,
  });

  console.log('✓ Electron main and preload bundled successfully into dist-electron/');
}

buildElectron().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
