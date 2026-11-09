import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traseaza, type CaiTrasate, type OptiuniTrasare } from '../../src/trasare/trasare.ts';
import { citestePng } from './ajutor-png.ts';
import { esantioane } from './ajutor-trasare.ts';

/**
 * Corpusul independent al trasării (ADR 0220): imaginile scrise de `test/oracles-py/trasare_corpus.py`, cu acoperirea exactă
 * pe pixel, și formele lor pe hârtie. Aici, nucleul le trasează, iar curbele trebuie să stea lângă forma de pe hârtie, în
 * ambele sensuri (fiecare punct al curbelor lângă hârtie și fiecare punct al hârtiei lângă curbe), cu numărul exact de
 * exterioare și goluri și cu colțurile la cel mult 0,5 px. Lângă un colț ascuțit (sub 1,5 px), netezirea imaginii a șters ce e sub
 * un pixel, deci ținta e acolo cu 0,4 px mai largă. Pe imaginile fără hârtie (logoul owner-ului, discul cu pete),
 * martorul e scikit-image (`find_contours`, după curățarea lui): aceleași contururi, la aceeași distanță.
 */

type Forma = { readonly fel: 'cerc'; readonly cx: number; readonly cy: number; readonly r: number }
  | { readonly fel: 'inel'; readonly puncte: ReadonlyArray<readonly [number, number]> };
type Caz = {
  readonly nume: string; readonly fisier: string; readonly latime: number; readonly inaltime: number;
  readonly optiuni: OptiuniTrasare; readonly hartie: readonly Forma[] | null;
  readonly asteptat: { readonly exterioare?: number; readonly goluri?: number; readonly toleranta: number };
  readonly colturi?: ReadonlyArray<readonly [number, number]>;
  readonly martor?: { readonly contururi: ReadonlyArray<ReadonlyArray<readonly [number, number]>> };
};

const DIR = new URL('../fixtures/trasare/', import.meta.url);
const CORPUS = JSON.parse(readFileSync(new URL('asteptat.json', DIR), 'utf8')) as { readonly cazuri: readonly Caz[] };

/** Distanța de la un punct la o polilinie închisă. */
function laPolilinie(px: number, py: number, p: ReadonlyArray<readonly [number, number]>, inchisa = true): number {
  let d = Infinity;
  const n = p.length;
  for (let k = 0; k < (inchisa ? n : n - 1); k++) {
    const [ax, ay] = p[k] ?? [0, 0], [bx, by] = p[(k + 1) % n] ?? [0, 0];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    d = Math.min(d, Math.hypot(ax + u * dx - px, ay + u * dy - py));
  }
  return d;
}

/** O grilă de 2 px pentru căutarea celui mai apropiat eșantion. */
function grila(puncte: readonly number[]): (x: number, y: number) => number {
  const g = new Map<string, number[]>();
  for (let i = 0; i < puncte.length; i += 2) {
    const k = `${Math.floor((puncte[i] ?? 0) / 2)},${Math.floor((puncte[i + 1] ?? 0) / 2)}`;
    (g.get(k) ?? g.set(k, []).get(k))?.push(puncte[i] ?? 0, puncte[i + 1] ?? 0);
  }
  return (x, y) => {
    let d = Infinity;
    const gx = Math.floor(x / 2), gy = Math.floor(y / 2);
    for (let r = 0; r <= 8 && d > (r - 1) * 2; r++) {
      for (let i = gx - r; i <= gx + r; i++) for (let j = gy - r; j <= gy + r; j++) {
        if (Math.max(Math.abs(i - gx), Math.abs(j - gy)) !== r) continue;
        const l = g.get(`${i},${j}`) ?? [];
        for (let q = 0; q < l.length; q += 2) d = Math.min(d, Math.hypot((l[q] ?? 0) - x, (l[q + 1] ?? 0) - y));
      }
    }
    return d;
  };
}

/** Colțurile hârtiei: vârfurile unde inelul se rotește cu cel puțin 30°. */
function colturiHartie(h: readonly Forma[]): number[] {
  const r: number[] = [];
  for (const f of h) {
    if (f.fel !== 'inel') continue;
    const n = f.puncte.length;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = f.puncte[(k + n - 1) % n] ?? [0, 0], [bx, by] = f.puncte[k] ?? [0, 0], [cx, cy] = f.puncte[(k + 1) % n] ?? [0, 0];
      const u = Math.atan2(by - ay, bx - ax), w = Math.atan2(cy - by, cx - bx);
      let d = Math.abs(w - u);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d >= Math.PI / 6) r.push(bx, by);
    }
  }
  return r;
}

/** Colțurile trasate: vârfurile dintre două linii care se rotesc cu cel puțin 30°. */
function colturiTrasate(c: CaiTrasate): number[] {
  const r: number[] = [];
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0, n = b - a;
    for (let v = a; v < b; v++) {
      const p = a + ((v - a + n - 1) % n), w = a + ((v - a + 1) % n);
      if (c.tip[p] !== 0 || c.tip[v] !== 0) continue;
      const u1 = Math.atan2((c.xy[6 * v + 1] ?? 0) - (c.xy[6 * p + 1] ?? 0), (c.xy[6 * v] ?? 0) - (c.xy[6 * p] ?? 0));
      const u2 = Math.atan2((c.xy[6 * w + 1] ?? 0) - (c.xy[6 * v + 1] ?? 0), (c.xy[6 * w] ?? 0) - (c.xy[6 * v] ?? 0));
      let d = Math.abs(u2 - u1);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d >= Math.PI / 6) r.push(c.xy[6 * v] ?? 0, c.xy[6 * v + 1] ?? 0);
    }
  }
  return r;
}

function langa(colturi: readonly number[], x: number, y: number): boolean {
  for (let i = 0; i < colturi.length; i += 2) if (Math.hypot((colturi[i] ?? 0) - x, (colturi[i + 1] ?? 0) - y) <= 1.5) return true;
  return false;
}

function laHartie(x: number, y: number, h: readonly Forma[]): number {
  return Math.min(...h.map((f) => (f.fel === 'cerc' ? Math.abs(Math.hypot(x - f.cx, y - f.cy) - f.r) : laPolilinie(x, y, f.puncte))));
}

function esantioaneHartie(h: readonly Forma[]): number[] {
  const r: number[] = [];
  for (const f of h) {
    if (f.fel === 'cerc') {
      const n = Math.ceil((2 * Math.PI * f.r) / 0.05);
      for (let i = 0; i < n; i++) r.push(f.cx + f.r * Math.cos((2 * Math.PI * i) / n), f.cy + f.r * Math.sin((2 * Math.PI * i) / n));
    } else {
      for (let k = 0; k < f.puncte.length; k++) {
        const [ax, ay] = f.puncte[k] ?? [0, 0], [bx, by] = f.puncte[(k + 1) % f.puncte.length] ?? [0, 0];
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.05));
        for (let i = 0; i < n; i++) r.push(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
      }
    }
  }
  return r;
}

for (const caz of CORPUS.cazuri) {
  test(`corpusul trasării: ${caz.nume}`, () => {
    const img = citestePng(readFileSync(new URL(caz.fisier, DIR)));
    assert.equal(img.latime, caz.latime);
    assert.equal(img.inaltime, caz.inaltime);
    const r = traseaza(img, caz.optiuni);
    assert.ok(r.ok, `refuzat: ${JSON.stringify(r.raport)}`);
    const { puncte, varfuri } = esantioane(r.cai);
    const tol = caz.asteptat.toleranta;
    if (caz.asteptat.exterioare !== undefined) assert.equal(r.raport.exterioare, caz.asteptat.exterioare, 'exterioarele');
    if (caz.asteptat.goluri !== undefined) assert.equal(r.raport.contururi - r.raport.exterioare, caz.asteptat.goluri, 'golurile');
    const note: string[] = [`${r.raport.contururi} contururi, ${r.raport.varfuri} vârfuri, abaterea față de contur ${r.raport.abatere.toFixed(3)} px`];
    // Lângă un colț ascuțit (sub 1,5 px), netezirea a șters informația de sub un pixel: acolo ținta e cu 0,4 px mai largă.
    const tolColt = tol + 0.4;
    if (caz.hartie) {
      const colturi = colturiHartie(caz.hartie);
      const limita = (x: number, y: number): number => (langa(colturi, x, y) ? tolColt : tol);
      let dus = 0, dusColt = 0;
      for (let i = 0; i < puncte.length; i += 2) {
        const x = puncte[i] ?? 0, y = puncte[i + 1] ?? 0, d = laHartie(x, y, caz.hartie);
        if (d > limita(x, y)) assert.fail(`curbele trec la ${d.toFixed(3)} px de hârtie, în (${x.toFixed(2)}, ${y.toFixed(2)}) (ținta ${limita(x, y)})`);
        if (langa(colturi, x, y)) dusColt = Math.max(dusColt, d); else dus = Math.max(dus, d);
      }
      const cel = grila(puncte);
      const h = esantioaneHartie(caz.hartie);
      let intors = 0, intorsColt = 0;
      for (let i = 0; i < h.length; i += 2) {
        const x = h[i] ?? 0, y = h[i + 1] ?? 0, d = cel(x, y);
        if (d > limita(x, y)) assert.fail(`hârtia trece la ${d.toFixed(3)} px de curbe, în (${x.toFixed(2)}, ${y.toFixed(2)}) (ținta ${limita(x, y)})`);
        if (langa(colturi, x, y)) intorsColt = Math.max(intorsColt, d); else intors = Math.max(intors, d);
      }
      note.push(`curbe → hârtie ${dus.toFixed(3)} px (lângă colțuri ${dusColt.toFixed(3)}), hârtie → curbe ${intors.toFixed(3)} px (${intorsColt.toFixed(3)})`);
    }
    if (caz.colturi) {
      let cel = 0;
      for (const [x, y] of caz.colturi) {
        let d = Infinity;
        for (let i = 0; i < varfuri.length; i += 2) d = Math.min(d, Math.hypot((varfuri[i] ?? 0) - x, (varfuri[i + 1] ?? 0) - y));
        cel = Math.max(cel, d);
      }
      note.push(`colțurile la cel mult ${cel.toFixed(3)} px de un vârf`);
      assert.ok(cel <= 0.5, `un colț e la ${cel.toFixed(3)} px de cel mai apropiat vârf`);
    }
    if (caz.martor) {
      // Martorul e conturul brut, rotunjit la colțuri: lângă un colț strâns de trasare (sub 1,5 px), ținta e mai largă.
      assert.equal(r.raport.contururi, caz.martor.contururi.length, 'contururile, ca la scikit-image');
      const colturi = colturiTrasate(r.cai);
      const limita = (x: number, y: number): number => (langa(colturi, x, y) ? tolColt : tol);
      const cel = grila(puncte);
      let intors = 0;
      for (const c of caz.martor.contururi) {
        for (const [x, y] of c) {
          const d = cel(x, y);
          if (d > limita(x, y)) assert.fail(`martorul trece la ${d.toFixed(3)} px de curbe, în (${x.toFixed(2)}, ${y.toFixed(2)})`);
          intors = Math.max(intors, d);
        }
      }
      const m = grila(esantioaneHartie(caz.martor.contururi.map((p) => ({ fel: 'inel' as const, puncte: p }))));
      let dus = 0;
      for (let i = 0; i < puncte.length; i += 2) {
        const x = puncte[i] ?? 0, y = puncte[i + 1] ?? 0, d = m(x, y);
        if (d > limita(x, y)) assert.fail(`curbele trec la ${d.toFixed(3)} px de martor, în (${x.toFixed(2)}, ${y.toFixed(2)})`);
        dus = Math.max(dus, d);
      }
      note.push(`curbe → martor ${dus.toFixed(3)} px, martor → curbe ${intors.toFixed(3)} px`);
    }
    console.log(`  ${caz.nume}: ${note.join('; ')}`);
  });
}
