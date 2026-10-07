// eps2pdf.cjs - DOAR PENTRU TEST (Ghostscript este AGPL-3.0; nu se livreaza niciodata in aplicatie).
// Converteste un EPS in PDF cu interpretorul PostScript real, ca cititor independent al EPS-ului nostru.
const fs = require('fs');
const path = require('path');
const createGs = require('@jspawn/ghostscript-wasm');
(async () => {
  const [inp, outp] = process.argv.slice(2);
  const bin = fs.readFileSync(require.resolve('@jspawn/ghostscript-wasm/gs.wasm'));
  const log = [];
  const gs = await createGs({ noInitialRun: true, print: (s) => log.push(s), printErr: (s) => log.push(s),
    instantiateWasm: (imports, cb) => { WebAssembly.instantiate(bin, imports).then((r) => cb(r.instance, r.module)); return {}; } });
  gs.FS.writeFile('/in.eps', fs.readFileSync(inp));
  const rc = gs.callMain(['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', '-dCompressPages=false', '-sOutputFile=/out.pdf', '/in.eps']);
  if (rc !== 0) { console.error(log.join('\n')); process.exit(1); }
  fs.writeFileSync(outp, gs.FS.readFile('/out.pdf'));
})();
