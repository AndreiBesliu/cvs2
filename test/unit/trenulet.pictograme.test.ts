/**
 * Pictogramele pieselor atelierului Easy 3Draw (ADR 0281, felia 3.Tp↑b): `PICTOGRAME` din `atelier.ts`, câte un desen pe
 * fiecare piesă a galeriilor (din `FAMILII`), plus `PICTOGRAMA_GENERICA`, pentru o piesă fără desen. Atelierul e un script
 * clasic al paginii: tabelele (doar date) se citesc din sursă, ca în `trenulet.familii.test.ts`, și se judecă aici:
 * - fiecare piesă din FAMILII are desenul ei, iar fiecare desen e al unei piese: o piesă nouă fără desen pică aici (altfel
 *   butonul ei ar avea, nevăzut, cubul generic), iar un desen rămas fără piesă la fel;
 * - desenele diferă între ele și de cel generic: piesele se recunosc după desen;
 * - fiecare desen e marcaj SVG simplu: doar forme (`path`, `rect`, `circle`, `ellipse`), închise cu „/>”, fără text, fără
 *   culori, stil sau transformări (linia, culoarea textului, o dă `.at-pict` din head.html), iar desenul, cu tot cu linia,
 *   stă în pătratul de 24 × 24 (arcele se urmăresc pe toată lungimea lor, nu doar la capete).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

type Familie = readonly [id: string, nume: string, piese: readonly (readonly [tip: string, nume: string])[]];
const ATELIER = readFileSync('extensii/trenulet/sursa/planificator/atelier.ts', 'utf8').replace(/\r\n/g, '\n');
/** Grosimea liniei din `.at-pict` (head.html): marginea pe care o cere un punct al desenului, ca linia să nu fie tăiată. */
const LINIA = 1.6;

/** Un literal din sursa atelierului (doar date), evaluat singur; obiectul vine din alt tărâm (vm), deci se copiază. */
function literal<T>(re: RegExp, ce: string): T {
  const m = re.exec(ATELIER);
  assert.ok(m, `${ce} în atelier.ts`);
  return JSON.parse(JSON.stringify(runInNewContext(`(${m[1]!})`))) as T;
}
const familii = (): readonly Familie[] => literal(/\n {2}const FAMILII: readonly Familie\[\] = (\[\n[\s\S]*?\n {2}\]);\n/, 'tabela FAMILII');
const pictograme = (): Readonly<Record<string, string>> =>
  literal(/\n {2}const PICTOGRAME: Readonly<Record<string, string>> = (\{\n[\s\S]*?\n {2}\});\n/, 'tabela PICTOGRAME');
const generica = (): string => literal(/\n {2}const PICTOGRAMA_GENERICA = (`[^`]*`);\n/, 'PICTOGRAMA_GENERICA');

/** Formele permise, cu atributele lor (geometria), plus cele ale liniei, permise oricărei forme. */
const FORME: Readonly<Record<string, readonly string[]>> = {
  path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'], ellipse: ['cx', 'cy', 'rx', 'ry'],
};
const ALE_LINIEI = ['stroke-width', 'pathLength', 'stroke-dasharray'];
type Forma = { readonly fel: string; readonly a: Readonly<Record<string, string>> };

/** Formele unui desen: tot marcajul trebuie să fie forme închise cu „/>”, cu atribute între ghilimele (altceva pică). */
function forme(desen: string, ce: string): Forma[] {
  const out: Forma[] = [];
  const rest = desen.replace(/<([a-z]+)((?:\s+[a-zA-Z-]+="[^"<>]*")*)\s*\/>/g, (_, fel: string, atr: string) => {
    const a: Record<string, string> = {};
    for (const m of atr.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      assert.ok(!(m[1]! in a), `${ce}: atributul ${m[1]} de două ori`);
      a[m[1]!] = m[2]!;
    }
    out.push({ fel, a });
    return '';
  });
  assert.equal(rest, '', `${ce}: doar forme închise cu „/>” (a rămas „${rest.slice(0, 40)}”)`);
  assert.ok(out.length > 0, `${ce}: desenul e gol`);
  return out;
}

/** Punctele unui arc (SVG 1.1, F.6.5: de la capete la centru), pe toată lungimea lui. */
function arc(x1: number, y1: number, rx: number, ry: number, rot: number, mare: number, sens: number, x2: number, y2: number): [number, number][] {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const phi = (rot * Math.PI) / 180, c = Math.cos(phi), s = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = c * dx + s * dy, yp = -s * dx + c * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const l = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
  let k = Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp) / (rx * rx * yp * yp + ry * ry * xp * xp)));
  if (mare === sens) k = -k;
  const cxp = (k * rx * yp) / ry, cyp = (-k * ry * xp) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const unghi = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = unghi(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = unghi((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sens && dt > 0) dt -= 2 * Math.PI;
  else if (sens && dt < 0) dt += 2 * Math.PI;
  return Array.from({ length: 24 }, (_, i): [number, number] => {
    const t = t1 + (dt * (i + 1)) / 24, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    return [c * ex - s * ey + cx, s * ex + c * ey + cy];
  });
}

/** Punctele unui `d` (comenzile absolute și relative; la curbe, și punctele de control; la arce, tot arcul). */
function puncte(d: string, ce: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0, x = 0, y = 0, x0 = 0, y0 = 0, cmd = '';
  const sari = () => { while (i < d.length && /[\s,]/.test(d[i]!)) i++; };
  const numar = (): number => {
    sari();
    const m = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(d.slice(i));
    assert.ok(m, `${ce}: număr așteptat la ${i} în „${d}”`);
    i += m[0].length;
    return Number(m[0]);
  };
  const steag = (): number => { sari(); const c = d[i++]; assert.ok(c === '0' || c === '1', `${ce}: steag de arc la ${i} în „${d}”`); return Number(c); };
  for (;;) {
    sari();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i]!)) cmd = d[i++]!;
    else assert.ok(cmd && !/[zZ]/.test(cmd), `${ce}: număr fără comandă la ${i} în „${d}”`);
    const rel = cmd === cmd.toLowerCase(), X = (v: number) => (rel ? x + v : v), Y = (v: number) => (rel ? y + v : v);
    const perechi = (n: number) => { const p: [number, number][] = []; for (let k = 0; k < n; k++) p.push([X(numar()), Y(numar())]); return p; };
    switch (cmd.toUpperCase()) {
      case 'M': { [[x, y]] = perechi(1) as [[number, number]]; x0 = x; y0 = y; out.push([x, y]); cmd = rel ? 'l' : 'L'; break; }
      case 'L': case 'T': { [[x, y]] = perechi(1) as [[number, number]]; out.push([x, y]); break; }
      case 'H': x = X(numar()); out.push([x, y]); break;
      case 'V': y = Y(numar()); out.push([x, y]); break;
      case 'C': { const p = perechi(3); out.push(...p); [x, y] = p[2]!; break; }
      case 'S': case 'Q': { const p = perechi(2); out.push(...p); [x, y] = p[1]!; break; }
      case 'A': {
        const rx = numar(), ry = numar(), rot = numar(), mare = steag(), sens = steag(), nx = X(numar()), ny = Y(numar());
        out.push(...arc(x, y, rx, ry, rot, mare, sens, nx, ny));
        x = nx; y = ny;
        break;
      }
      case 'Z': x = x0; y = y0; break;
      default: assert.fail(`${ce}: comanda „${cmd}” în „${d}”`);
    }
  }
  return out;
}

/** Marginile desenului unei forme: punctele ei (cercurile și elipsele, cu raza). */
function margini(f: Forma, ce: string): [number, number][] {
  const n = (k: string) => { const v = Number(f.a[k] ?? 0); assert.ok(Number.isFinite(v), `${ce}: ${k}="${f.a[k]}"`); return v; };
  if (f.fel === 'path') return puncte(f.a['d'] ?? '', ce);
  if (f.fel === 'rect') return [[n('x'), n('y')], [n('x') + n('width'), n('y') + n('height')]];
  const rx = f.fel === 'circle' ? n('r') : n('rx'), ry = f.fel === 'circle' ? n('r') : n('ry');
  return [[n('cx') - rx, n('cy') - ry], [n('cx') + rx, n('cy') + ry]];
}

/** Judecata unui desen: formele, atributele, pătratul. */
function judeca(desen: string, ce: string): void {
  for (const f of forme(desen, ce)) {
    assert.ok(f.fel in FORME, `${ce}: forma <${f.fel}> (doar ${Object.keys(FORME).join(', ')})`);
    for (const k of Object.keys(f.a)) assert.ok(FORME[f.fel]!.includes(k) || ALE_LINIEI.includes(k), `${ce}: atributul ${k} pe <${f.fel}> (fără culori, stil, clase sau transformări)`);
    const m = Number(f.a['stroke-width'] ?? LINIA) / 2;
    for (const [px, py] of margini(f, ce)) {
      assert.ok(px >= m - 1e-6 && px <= 24 - m + 1e-6 && py >= m - 1e-6 && py <= 24 - m + 1e-6,
        `${ce}: punctul (${px.toFixed(2)}, ${py.toFixed(2)}) al lui <${f.fel}> iese din pătratul de 24 (cu linia de ${2 * m})`);
    }
  }
}

test('fiecare piesă din FAMILII are desenul ei, iar fiecare desen e al unei piese (cele 25 de azi)', () => {
  const piese = familii().flatMap(([, , p]) => p.map(([k]) => k)), desene = pictograme();
  assert.ok(piese.length >= 25, piese.join(', '));
  for (const k of piese) assert.ok(Object.hasOwn(desene, k), `piesa ${k} n-are pictogramă: pune-i desenul în PICTOGRAME (atelier.ts), lângă FAMILII`);
  for (const k of Object.keys(desene)) assert.ok(piese.includes(k), `pictograma ${k} nu e a niciunei piese din FAMILII`);
  assert.equal(Object.keys(desene).length, new Set(piese).size);
});

test('desenele diferă între ele și de cel generic: piesele se recunosc după desen', () => {
  const desene = Object.entries(pictograme()), g = generica();
  const dupa = new Map<string, string>();
  for (const [k, d] of desene) {
    assert.notEqual(d, g, `${k} are desenul generic`);
    assert.ok(!dupa.has(d), `${k} are același desen ca ${dupa.get(d)}`);
    dupa.set(d, k);
  }
});

test('fiecare desen (și cel generic) e marcaj SVG simplu: doar forme, fără culori și stil, în pătratul de 24 × 24', () => {
  for (const [k, d] of Object.entries(pictograme())) judeca(d, k);
  judeca(generica(), 'generica');
});

test('judecata însăși prinde ce trebuie: text, o formă străină, o culoare, un punct sau un arc ieșit din pătrat', () => {
  const pica = (d: string, re: RegExp) => assert.throws(() => judeca(d, 'proba'), re, d);
  pica('<rect x="2" y="2" width="20" height="20"/>Cub', /doar forme închise/);
  pica('<text x="2" y="12"/>', /forma <text>/);
  pica('<circle cx="12" cy="12" r="5" fill="red"/>', /atributul fill/);
  pica('<path d="M12 12h5" style="stroke:red"/>', /atributul style/);
  pica('<path d="M3 3H24"/>', /iese din pătrat/);
  // capetele în pătrat (la y = 20), dar arcul coboară până la y = 28; același arc, pe partea cealaltă (urcă la 12), încape
  pica('<path d="M4 20a8 8 0 0 0 16 0"/>', /iese din pătrat/);
  judeca('<path d="M4 20a8 8 0 0 1 16 0"/>', 'proba arcului care încape');
});
