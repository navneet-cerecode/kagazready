import { createRequire } from 'node:module';
import { rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

/**
 * Bundles each Lambda handler into its own directory under `dist/`.
 *
 * Why this exists instead of SAM's `BuildMethod: esbuild`: that builder looks for esbuild in the
 * function's own `node_modules/.bin`, and npm workspaces hoist esbuild to the repository root, so
 * it is never found. Its default behaviour also copies the function directory to a scratch folder
 * and runs `npm install` there, which cannot resolve `@kagazready/*` because those are workspace
 * symlinks and not published packages.
 *
 * Bundling here instead means the Lambda artefacts are built by the same command as everything
 * else, can be inspected without running SAM, and SAM only has to zip a directory.
 *
 * Everything is bundled, including the AWS SDK. The Node 22 runtime ships its own copy of SDK v3,
 * but its version drifts independently of this repository; bundling keeps what was tested and what
 * is deployed identical, for a few hundred kilobytes.
 */

const HANDLERS = ['uploads', 'analyses', 'analysis', 'health'];

await rm('dist', { recursive: true, force: true });

const results = await Promise.all(
  HANDLERS.map((name) =>
    build({
      entryPoints: [`src/handlers/${name}.ts`],
      outfile: `dist/${name}/index.js`,
      bundle: true,
      platform: 'node',
      target: 'node22',
      // CommonJS, so no .mjs handling or package.json is needed in the artefact.
      format: 'cjs',
      minify: true,
      sourcemap: true,
      // Keep the real function and file names in stack traces.
      keepNames: true,
      metafile: true,
      logLevel: 'warning',
    }),
  ),
);

/*
 * Each bundle gets its own package.json.
 *
 * `"type": "commonjs"` is the load-bearing field: this package is `"type": "module"`, which applies
 * to every .js file beneath it, so without the override Node and the Lambda runtime parse the
 * CommonJS bundle as ESM and the handler export is invisible.
 *
 * `name` and `version` are there because `sam build` runs its npm builder on any directory that has
 * a package.json, and npm refuses to pack one without them. There are no dependencies: the bundle
 * is self-contained.
 */
const bundleManifest = (name) => ({
  name: `kagazready-${name}-handler`,
  version: '0.1.0',
  private: true,
  type: 'commonjs',
  main: 'index.js',
});

await Promise.all(
  HANDLERS.map((name) =>
    writeFile(
      `dist/${name}/package.json`,
      `${JSON.stringify(bundleManifest(name), null, 2)}
`,
    ),
  ),
);

/*
 * Load every bundle and confirm it exports a handler.
 *
 * A bundle that builds but cannot be loaded — wrong module format, a bad import, a dependency that
 * did not bundle — looks identical to a good one until Lambda fails at runtime. This is the check
 * that caught the missing "type": "commonjs" marker above.
 */
const require = createRequire(import.meta.url);
for (const name of HANDLERS) {
  const bundle = require(resolve(`dist/${name}/index.js`));
  if (typeof bundle.handler !== 'function') {
    throw new Error(`dist/${name}/index.js does not export a handler function`);
  }
}

for (const [index, result] of results.entries()) {
  const outputs = Object.entries(result.metafile.outputs).find(([file]) => file.endsWith('.js'));
  const bytes = outputs?.[1].bytes ?? 0;
  process.stdout.write(`${HANDLERS[index]}: ${(bytes / 1024).toFixed(0)} kB, handler OK\n`);
}
