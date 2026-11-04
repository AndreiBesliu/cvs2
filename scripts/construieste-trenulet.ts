/**
 * Construiește Planificatorul Trenuleț din sursele lui (`extensii/trenulet/sursa/`, ADR 0129), cu regulile din `build.py`:
 * - sursele sunt TypeScript (ADR 0162): fiecare script intră fără tipuri (`stripTypeScriptTypes`, care pune spații în locul
 *   lor), ca script clasic, cu aceeași semantică globală; bibliotecile din `vendor/` rămân JavaScript;
 * - pagina de sine stătătoare (`planificator.html`, conținutul de pe claude.ai; `preview.html`, documentul întreg, copia de
 *   pe PC): catalogul intră în `app.js` serializat ca de Python (`json.dumps`, compact, fără ASCII forțat), deci și numerele
 *   (`40.0` rămâne `40.0`);
 * - pachetul extensiei (`extensii/trenulet/extensie.json`): intrarea (`extensii/trenulet/intrare.ts`, fără tipuri), stilurile
 *   din `head.html`, marcajul din `body.html` și scripturile, în ordinea paginii, ca fișiere separate, încărcate de intrare ca
 *   scripturi clasice (aceeași semantică globală ca în pagină).
 *
 *   node scripts/construieste-trenulet.ts      # .tmp/trenulet/iesire/{planificator,preview}.html și .tmp/extensii/trenulet-<v>.zip
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';
import { scrieZip } from './impacheteaza-extensie.ts';
import { createHash } from 'node:crypto';

const RAD = 'extensii/trenulet';
const SURSA = join(RAD, 'sursa');

/** `repr(float)` din Python: cel mai scurt text care se recitește; `.0` la întregi; exponent sub 1e-4 și de la 1e16. */
export function reprPython(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`număr nefinit în JSON: ${x}`);
  if (Object.is(x, -0)) return '-0.0';
  const [mant = '0', expTxt = '0'] = x.toExponential().split('e');
  const exp = Number(expTxt);
  const semn = mant.startsWith('-') ? '-' : '';
  const cifre = mant.replace('-', '').replace('.', '');
  if (exp < -4 || exp >= 16) {
    const m = cifre.length > 1 ? `${cifre[0]}.${cifre.slice(1)}` : cifre;
    return `${semn}${m}e${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
  }
  if (exp >= cifre.length - 1) return `${semn}${cifre}${'0'.repeat(exp - cifre.length + 1)}.0`;
  if (exp >= 0) return `${semn}${cifre.slice(0, exp + 1)}.${cifre.slice(exp + 1)}`;
  return `${semn}0.${'0'.repeat(-exp - 1)}${cifre}`;
}

/**
 * JSON-ul compact al lui `json.dumps(json.loads(text), separators=(',', ':'), ensure_ascii=False)`: pe tokenuri, ca numerele
 * să-și păstreze felul (cu `.`, `e` sau `E` sunt float în Python, scrise cu `repr`; restul, întregi).
 */
export function jsonCaPython(text: string): string {
  let out = '', i = 0;
  while (i < text.length) {
    const c = text[i] ?? '';
    if (/\s/.test(c)) { i++; continue; }
    if ('{}[]:,'.includes(c)) { out += c; i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += JSON.stringify(JSON.parse(text.slice(i, j + 1)) as string);
      i = j + 1;
      continue;
    }
    const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (m) {
      out += /[.eE]/.test(m[0]) ? reprPython(Number(m[0])) : BigInt(m[0]).toString();
      i += m[0].length;
      continue;
    }
    const lit = ['true', 'false', 'null'].find((l) => text.startsWith(l, i));
    if (!lit) throw new Error(`JSON neașteptat la ${i}: ${text.slice(i, i + 20)}`);
    out += lit;
    i += lit.length;
  }
  return out;
}

const citeste = (...p: string[]): string => readFileSync(join(SURSA, ...p), 'utf8');
/** O sursă TypeScript a paginii, fără tipuri: spațiile țin locul lor, deci liniile și coloanele rămân ale sursei. */
const faraTipuri = (...p: string[]): string => stripTypeScriptTypes(citeste(...p), { mode: 'strip' });

/** Scripturile, în ordinea paginii, cum le scria `build.py` (cu licențele și catalogul pus în `app.js`), fără tipuri. */
export function scripturi(): { readonly nume: string; readonly text: string }[] {
  const app = faraTipuri('planificator', 'app.ts').replace('/*CATALOG*/null', jsonCaPython(citeste('planificator', 'catalog.json')));
  const lic = '/*! cavalier-contours-js 0.1.1 (portul TypeScript al bibliotecii cavalier_contours, adus in cvs2: src/geom/cavalier).\n'
    + ' * Licenta: MIT OR Apache-2.0. Copyright (c) 2021 Jedidiah Buck McCready (cavalier_contours) si msurguy (portul JS).\n'
    + ' * Textul licentei MIT: https://opensource.org/license/mit ; Apache 2.0: https://www.apache.org/licenses/LICENSE-2.0 */\n';
  const ear = '/*! earcut 2.2.4 (Mapbox): triangularea poligoanelor cu gauri, pentru fetele pieselor cu gauri din atelierul 3D.\n'
    + ' * Licenta ISC. Copyright (c) 2016, Mapbox. Permission to use, copy, modify, and/or distribute this software for any purpose\n'
    + ' * with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all\n'
    + ' * copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE. */\n';
  const lista = [
    { nume: 'cavalier.js', text: `${lic}${citeste('vendor', 'cavalier.min.js').trim()};window.Cavalier=Cavalier;` },
    { nume: 'cnc.js', text: faraTipuri('planificator', 'cnc.ts') },
    { nume: 'gcode.js', text: faraTipuri('planificator', 'gcode.ts') },
    { nume: 'earcut.js', text: `${ear}${citeste('vendor', 'earcut.min.js').trim()}` },
    { nume: 'lego.js', text: faraTipuri('lego', 'lego.ts') },
    { nume: 'profiluri.js', text: faraTipuri('planificator', 'profiluri.ts') },
    { nume: 'atelier.js', text: faraTipuri('planificator', 'atelier.ts') },
    { nume: 'app.js', text: app },
  ];
  for (const s of lista) if (s.text.toLowerCase().includes('</script')) throw new Error(`${s.nume} are </script`);
  return lista;
}

/** Pagina de sine stătătoare, ca `build.py`: `planificator.html` (conținutul) și `preview.html` (documentul întreg). */
export function paginiPlanificator(): { readonly planificator: string; readonly preview: string } {
  const s = (t: string): string => `<script>\n${t}\n</script>\n`;
  const planificator = `${citeste('planificator', 'head.html')}\n${citeste('planificator', 'body.html')}\n${scripturi().map((x) => s(x.text)).join('')}`;
  const preview = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style></head><body>' + planificator + '</body></html>';
  return { planificator, preview };
}

/** Foaia de stil a paginii (blocul `<style>` din `head.html`), plus regulile de bază din `preview.html`. */
export function stilPlanificator(): string {
  const cap = citeste('planificator', 'head.html');
  const m = /<style>([\s\S]*?)<\/style>/.exec(cap);
  if (!m) throw new Error('head.html n-are <style>');
  return `*,*::before,*::after{box-sizing:border-box}body{margin:0}\n${m[1] ?? ''}`;
}

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const octeti = (t: string): Uint8Array => new TextEncoder().encode(t);

/** Pachetul extensiei: manifestul complet și octeții `.zip`-ului. */
export function pachetTrenulet(): { readonly manifest: Record<string, unknown>; readonly octeti: Uint8Array } {
  const sursa = JSON.parse(readFileSync(join(RAD, 'extensie.json'), 'utf8')) as Record<string, unknown>;
  const fisiere = new Map<string, Uint8Array>([
    ['index.js', octeti(stripTypeScriptTypes(readFileSync(join(RAD, 'intrare.ts'), 'utf8'), { mode: 'strip' }))],
    ['trenulet.css', octeti(stilPlanificator())],
    ['body.html', octeti(citeste('planificator', 'body.html'))],
    ...scripturi().map((x) => [`js/${x.nume}`, octeti(x.text)] as [string, Uint8Array]),
  ]);
  const manifest = { ...sursa, intrare: 'index.js', stiluri: ['trenulet.css'], fisiere: Object.fromEntries([...fisiere].map(([c, b]) => [c, sha(b)])) };
  return {
    manifest,
    octeti: scrieZip([{ nume: 'extensie.json', octeti: octeti(`${JSON.stringify(manifest, null, 2)}\n`) }, ...[...fisiere].map(([nume, b]) => ({ nume, octeti: b }))]),
  };
}

if (import.meta.main) {
  const { planificator, preview } = paginiPlanificator();
  mkdirSync('.tmp/trenulet/iesire', { recursive: true });
  writeFileSync('.tmp/trenulet/iesire/planificator.html', planificator);
  writeFileSync('.tmp/trenulet/iesire/preview.html', preview);
  console.log(`.tmp/trenulet/iesire/preview.html: sha256 ${sha(octeti(preview))}`);
  const { manifest, octeti: zip } = pachetTrenulet();
  mkdirSync('.tmp/extensii', { recursive: true });
  const cale = join('.tmp/extensii', `trenulet-${String(manifest.versiune)}.zip`);
  writeFileSync(cale, zip);
  console.log(`${cale}: ${zip.length} octeți, ${Object.keys(manifest.fisiere as object).length} fișiere`);
}
