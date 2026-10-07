// Formatul fișierului de proiect (probă): zip cu manifest + document JSON canonic + resurse după SHA-256.
// Determinist: ordinea intrărilor fixă, data fixă în câmpurile LOCALE (1980-01-01 00:00, independent de fus),
// resursele binare STORE (nu se comprimă oricum), JSON-ul DEFLATE nivel 6.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { canonical } from './doc.mjs';
const FIXED = () => new Date(1980, 0, 1, 0, 0, 0); // constructor LOCAL: câmpurile DOS ies la fel în orice fus

export function pack(doc, assets, sha) {
  const docBytes = strToU8(canonical(doc));
  const list = Object.keys(assets).sort().map((h) => ({ hash: h, path: `assets/${h}`, bytes: assets[h].data.length, kind: assets[h].kind, name: assets[h].name }));
  const manifest = { format: 'cncvs2-project', container: 1, schema: doc.schema, minWriter: doc.minWriter, document: 'document.json', documentSha256: sha(docBytes), assets: list };
  const files = { 'manifest.json': [strToU8(canonical(manifest)), { level: 6, mtime: FIXED() }], 'document.json': [docBytes, { level: 6, mtime: FIXED() }] };
  for (const a of list) files[a.path] = [assets[a.hash].data, { level: 0, mtime: FIXED() }];
  return zipSync(files, { mtime: FIXED() });
}

export function unpack(bytes, sha) {
  const z = unzipSync(bytes);
  const manifest = JSON.parse(strFromU8(z['manifest.json']));
  const docBytes = z[manifest.document];
  if (sha(docBytes) !== manifest.documentSha256) throw new Error('document.json nu se potrivește cu manifestul');
  const assets = {};
  for (const a of manifest.assets) {
    const data = z[a.path];
    if (sha(data) !== a.hash) throw new Error(`resursa ${a.path} e coruptă`);
    assets[a.hash] = { kind: a.kind, name: a.name, data };
  }
  return { manifest, doc: JSON.parse(strFromU8(docBytes)), assets };
}
