// Mărimea în bundle a fiecărei biblioteci de schemă, cu schema reală a documentului (nu „hello world”).
// esbuild, minificat, ESM, browser; gzip -9 și brotli din node:zlib. Scrie și bundle-urile IIFE pentru proba CSP.
import { build } from 'esbuild';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('out/bundles', { recursive: true });
const libs = ['zod', 'valibot', 'typebox', 'arktype'];
const rows = {};
for (const n of libs) {
  const r = await build({
    stdin: { contents: `export { validate } from './schemas/${n}.ts';`, resolveDir: '.', loader: 'ts' },
    bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2022', write: false, treeShaking: true,
  });
  const code = r.outputFiles[0].contents;
  rows[n] = {
    minKB: +(code.length / 1024).toFixed(1),
    gzipKB: +(gzipSync(code, { level: 9 }).length / 1024).toFixed(1),
    brotliKB: +(brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length / 1024).toFixed(1),
    refsFunctionCtor: /Function[(]|new [A-Za-z_$]{1,3}[(]"/.test(Buffer.from(code).toString()),
  };
  // IIFE pentru pagina cu CSP strict (proba de rulare fără 'unsafe-eval')
  await build({
    stdin: { contents: `import { validate } from './schemas/${n}.ts'; import { makeDoc, addUnknownFields, faults } from './lib/doc.mjs'; globalThis.S7 = { validate, makeDoc, addUnknownFields, faults };`, resolveDir: '.', loader: 'ts' },
    bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2022', outfile: `web/b-${n}.js`,
  });
}
console.table(rows);
writeFileSync('out/bundle.json', JSON.stringify(rows, null, 1));
