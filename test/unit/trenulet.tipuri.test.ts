/**
 * Sursele planificatorului Trenuleț sunt TypeScript (ADR 0162): scripturi clasice, ca în pagină, cu proiectul lor de tipuri
 * (`extensii/trenulet/sursa/tsconfig.json`), verificat cu aceleași reguli stricte ca aplicația. Proba rulează compilatorul pe
 * proiect, după ce se uită că toate sursele sunt în el (un fișier lăsat afară n-ar fi verificat de nimeni). Numele globale
 * ale paginii (`TrenCNC`, `Lego`, `$`…) stau doar acolo: în proiectul aplicației ar trece drept ale ei, fără import.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const PROIECT = 'extensii/trenulet/sursa/tsconfig.json';
const tsc = (...a: string[]): { readonly cod: number | null; readonly text: string } => {
  const r = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', ...a], { encoding: 'utf8', timeout: 120_000 });
  return { cod: r.status, text: `${r.stdout}${r.stderr}` };
};
const fisiereProiect = (p: string): string[] => {
  const r = tsc('--listFilesOnly', '-p', p);
  assert.equal(r.cod, 0, r.text);
  return r.text.split(/\r?\n/).filter(Boolean).map((f) => f.replace(/\\/g, '/'));
};

test('motoarele planificatorului sunt TypeScript; pagina (atelierul și planul) încă JavaScript', () => {
  const js = ['planificator', 'lego'].flatMap((d) => readdirSync(`extensii/trenulet/sursa/${d}`).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`));
  assert.deepEqual(js.sort(), ['planificator/app.js', 'planificator/atelier.js']);
});

test('proiectul planificatorului le are pe toate și n-are nicio eroare de tipuri', () => {
  const lista = fisiereProiect(PROIECT);
  const surse = ['planificator', 'lego'].flatMap((d) => readdirSync(`extensii/trenulet/sursa/${d}`).filter((f) => f.endsWith('.ts')).map((f) => `${d}/${f}`));
  assert.deepEqual(surse.sort(), ['lego/lego.ts', 'planificator/cnc.ts', 'planificator/gcode.ts', 'planificator/profiluri.ts']);
  for (const s of surse) assert.ok(lista.some((f) => f.endsWith(`/extensii/trenulet/sursa/${s}`)), s);
  const r = tsc('--noEmit', '-p', PROIECT);
  assert.equal(r.cod, 0, r.text.slice(0, 4000));
  assert.equal(r.text.trim(), '');
});

test('proiectul aplicației nu vede sursele planificatorului', () => {
  const lista = fisiereProiect('tsconfig.json');
  assert.ok(lista.some((f) => f.endsWith('/extensii/trenulet/intrare.ts')), 'intrarea extensiei e a aplicației');
  assert.deepEqual(lista.filter((f) => f.includes('/extensii/trenulet/sursa/')), []);
});
