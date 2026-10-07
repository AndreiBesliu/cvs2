// Sonda 2c: fișierul de proiect, dus-întors octet cu octet. Oracole: SHA-256 din node:crypto, cititorul Python
// (zipfile + hashlib) și repetarea în alt fus orar. Rulare: node p2-zip.mjs [N=5000]
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { makeDoc, addUnknownFields, canonical } from './lib/doc.mjs';
import { gen, sha } from './lib/gen-node.mjs';
import { pack, unpack } from './lib/project-file.mjs';
import * as V from './schemas/valibot.ts';
const N = Number(process.argv[2] ?? 5000);
const mode = process.argv[3] ?? 'main';
const font = readFileSync('C:/Windows/Fonts/arial.ttf'); // font real, doar citit local; nu se distribuie
const mk = () => {
  const assets = {};
  for (const [kind, name, data] of [['heightfield', 'relief.f32', gen(64 << 20, 11)], ['mesh', 'leu.stl', gen(100 << 20, 12)], ['font', 'arial.ttf', new Uint8Array(font)]]) assets[sha(data)] = { kind, name, data };
  return { doc: addUnknownFields(makeDoc(N)), assets };
};
if (mode === 'tz') { const { doc, assets } = mk(); console.log(sha(pack(doc, assets, sha)) + '|' + new Date(Date.UTC(2026, 0, 1, 12)).getHours()); process.exit(0); }
const { doc, assets } = mk();
let t = performance.now(); const b1 = pack(doc, assets, sha); const packMs = performance.now() - t;
writeFileSync('out/proba.cncvs', b1);
t = performance.now(); const u = unpack(b1, sha); const unpackMs = performance.now() - t;
// încărcare prin ușa de validare (valibot reordonează cheile), apoi salvare: trebuie să iasă aceiași octeți
const val = V.validate(u.doc);
const b2 = pack(val.value, u.assets, sha);
const py = JSON.parse(execFileSync('python', ['zip_check.py', 'out/proba.cncvs'], { encoding: 'utf8' }));
const tz = ['UTC', 'Asia/Tokyo', 'America/Los_Angeles'].map((z) => execFileSync('node', ['p2-zip.mjs', String(N), 'tz'], { encoding: 'utf8', env: { ...process.env, TZ: z } }).trim());
const r = {
  N, zipMB: +(b1.length / 1048576).toFixed(1), packMs: Math.round(packMs), unpackMs: Math.round(unpackMs),
  docJsonMB: +(canonical(doc).length / 1048576).toFixed(1),
  roundTripByteExact: Buffer.compare(Buffer.from(b1), Buffer.from(b2)) === 0, validOnLoad: val.ok,
  unknownKept: canonical(val.value) === canonical(doc),
  assetsMatch: Object.keys(assets).every((h) => sha(u.assets[h].data) === h),
  python: py, tzShas: tz.map((s) => s.split('|')[0].slice(0, 16)), tzLocalHourOfUtcNoon: tz.map((s) => s.split('|')[1]), tzIndependent: tz.every((s) => s.split('|')[0] === sha(b1)),
};
console.log(JSON.stringify(r, null, 1));
writeFileSync('out/p2-zip.json', JSON.stringify(r, null, 1));
