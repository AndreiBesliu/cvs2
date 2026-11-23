// Randarea 3D a unei piese LDraw (triunghiurile aplatizate de scripts/ldraw/plat.py) sau a unei piese a motorului, cu three.js
// din vendor, din câteva unghiuri, ca să se vadă forma întreagă (nu doar feliile). Biblioteca LDraw (adusă cu aduce.py) stă în
// LDRAW_DIR (implicit `.tmp/ldraw`, în afara repo-ului prin .gitignore). Doar local (Edge, prin Playwright).
//   node scripts/ldraw/randare.mts <ieșire-prefix> ldraw:<piesa> | motor:<json-def>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const [prefix, sursa] = process.argv.slice(2) as [string, string];
type P3 = [number, number, number];
let tri: P3[][];
if (sursa.startsWith('ldraw:')) {
  const piesa = sursa.slice(6), unelte = fileURLToPath(new URL('.', import.meta.url)), biblioteca = resolve(process.env['LDRAW_DIR'] ?? '.tmp/ldraw');
  const py = `import sys, json; sys.path.insert(0, ${JSON.stringify(unelte)}); import plat
t = plat.in_mm(plat.triunghiuri(${JSON.stringify(biblioteca)}, '${piesa}.dat'))
print(json.dumps([[list(p) for p in x] for x in t]))`;
  const fisier = join(tmpdir(), 'randare.py');
  writeFileSync(fisier, py);
  tri = JSON.parse(execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-I', '-B', '-X', 'utf8', fisier], { encoding: 'utf8', maxBuffer: 1 << 28 }));
  // LDraw: Y în jos; o răsturnăm (y → −y) ca „sus” să fie sus
  tri = tri.map((t) => t.map(([x, y, z]): P3 => [x, -y, z]).reverse());
} else {
  const cere = createRequire(import.meta.url);
  const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js');
  const { L } = motoare();
  const p = L.construieste(JSON.parse(sursa.slice(6)));
  // motorul: z în sus; pentru aceeași vedere ca LDraw (Y în sus): (x, y, z) → (x, z, −y)
  tri = (p.tri as P3[][]).map((t) => t.map(([x, y, z]): P3 => [x, z, -y]));
}
const three = readFileSync('extensii/trenulet/sursa/vendor/three.min.js', 'utf8');
const html = `<!doctype html><html><body style="margin:0;background:#fff"><script>${three}</script><script>
const T = ${JSON.stringify(tri)};
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 700); r.setClearColor(0xffffff); document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.add(new THREE.AmbientLight(0xffffff, 0.45)); const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(30, 60, 40); s.add(d);
const d2 = new THREE.DirectionalLight(0xffffff, 0.35); d2.position.set(-40, -20, -30); s.add(d2);
const g = new THREE.BufferGeometry(), pos = new Float32Array(T.length * 9); T.forEach((t, i) => t.forEach((p, j) => pos.set(p, i * 9 + j * 3)));
g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals(); g.computeBoundingBox();
const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: 0x3f7fd0, side: THREE.DoubleSide, flatShading: true })); s.add(m);
const b = g.boundingBox, c = new THREE.Vector3(); b.getCenter(c); const R = b.getSize(new THREE.Vector3()).length();
const cam = new THREE.PerspectiveCamera(32, 900 / 700, 0.1, 1000);
window.vedere = (ax, ay, az) => { cam.position.set(c.x + ax * R * 1.25, c.y + ay * R * 1.25, c.z + az * R * 1.25); cam.lookAt(c); r.render(s, cam); };
</script></body></html>`;
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
await p.setContent(html);
for (const [nume, v] of [['sus-fata', [0.6, 0.9, 0.9]], ['sus-spate', [-0.7, 0.8, -0.9]], ['lateral', [1, 0.15, 0.05]], ['jos', [0.5, -0.9, 0.7]]] as const) {
  await p.evaluate(([x, y, z]) => (window as unknown as { vedere: (a: number, b: number, c: number) => void }).vedere(x, y, z), v as unknown as P3);
  await p.screenshot({ path: `${prefix}-${nume}.png` });
}
await b.close();
console.log('scris', prefix + '-*.png', tri.length, 'triunghiuri');
