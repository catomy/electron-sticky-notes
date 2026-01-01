const esbuild = require('esbuild');
const path = require('path');

const commonConfig = {
  bundle: true,
  platform: 'node',
  external: ['electron'],
  sourcemap: true,
  format: 'cjs',
};

async function build() {
  try {
    // Build Main
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(__dirname, '../electron/main.ts')],
      outfile: path.join(__dirname, '../dist-electron/main.js'),
    });

    // Build Preload
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(__dirname, '../electron/preload.ts')],
      outfile: path.join(__dirname, '../dist-electron/preload.js'),
    });

    console.log('Electron build completed successfully.');
  } catch (error) {
    console.error('Electron build failed:', error);
    process.exit(1);
  }
}

build();
