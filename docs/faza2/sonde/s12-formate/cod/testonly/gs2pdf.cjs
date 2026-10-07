// gs2pdf.cjs - DOAR PENTRU TEST (Ghostscript e AGPL-3.0; nu se livreaza niciodata).
// Ghostscript = interpretorul PostScript real, folosit ca ARBITRU independent: EPS -> PDF necomprimat.
// node testonly/gs2pdf.cjs in.eps out.pdf            -> conversia
// node testonly/gs2pdf.cjs --systemdict out.txt      -> lista cheilor din systemdict (operatorii standard ai gs)
const fs = require('fs');
const createGs = require('@jspawn/ghostscript-wasm');
(async () => {
  const args = process.argv.slice(2);
  const bin = fs.readFileSync(require.resolve('@jspawn/ghostscript-wasm/gs.wasm'));
  const log = [];
  const gs = await createGs({ noInitialRun: true, print: (s) => log.push(s), printErr: (s) => log.push(s),
    instantiateWasm: (imports, cb) => { WebAssembly.instantiate(bin, imports).then((r) => cb(r.instance, r.module)); return {}; } });
  if (args[0] === '--systemdict') {
    // scriem numele intr-un fisier din FS-ul virtual al WASM (izolat), nu pe consola
    gs.FS.writeFile('/sd.ps', '/f (/sd.txt) (w) file def systemdict { pop f exch 200 string cvs writestring f (\\n) writestring } forall f closefile quit\n');
    gs.callMain(['-q', '-dNOSAFER', '-dNODISPLAY', '-dBATCH', '-dNOPAUSE', '/sd.ps']);
    fs.writeFileSync(args[1], gs.FS.readFile('/sd.txt'));
    return;
  }
  const [inp, outp] = args;
  gs.FS.writeFile('/in.eps', fs.readFileSync(inp));
  const t0 = Date.now();
  const rc = gs.callMain(['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', '-dCompressPages=false', '-sOutputFile=/out.pdf', '/in.eps']);
  const ms = Date.now() - t0;
  if (rc !== 0) { console.error('gs rc', rc, log.slice(-20).join('\n')); process.exit(1); }
  fs.writeFileSync(outp, gs.FS.readFile('/out.pdf'));
  console.log(JSON.stringify({ gs_ms: ms, warnings: log.length, firstLog: log.slice(0, 3) }));
})();
