import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traseazaMediana } from '../../src/trasare/mediana.ts';
import type { OptiuniTrasare } from '../../src/trasare/trasare.ts';
import { citestePng } from './ajutor-png.ts';
import { esantioaneCai, grila } from './ajutor-trasare.ts';

/**
 * Corpusul liniei mediane (ADR 0222 §10): trăsăturile scrise de `test/oracles-py/trasare_corpus.py`, cu centrul, capetele și
 * joncțiunile știute pe hârtie (martorul scikit-image le-a găsit la fel, la scriere). Aici nucleul le trasează și trebuie să
 * dea: același număr de căi și de bucle; capetele libere (capetele căilor deschise care nu ating altă cale) la `capat` de
 * capetele hârtiei; în fiecare joncțiune, atâtea brațe câte are, iar curbele la `jonctiune` de punctul ei; linia la
 * `toleranta` de hârtie, în ambele sensuri, în afara zonelor nodurilor (cât o grosime în jurul capetelor, joncțiunilor și
 * colțurilor), iar înăuntrul lor la cel mult `zona` (o jumătate de grosime; la colțurile refăcute, 0,5 px); grosimea
 * raportată la 0,2 px.
 */

type Pt = readonly [number, number];
type Caz = {
  readonly nume: string; readonly fisier: string; readonly optiuni: OptiuniTrasare; readonly grosime: number;
  readonly linii: ReadonlyArray<{ readonly puncte: readonly Pt[]; readonly inchisa: boolean }>;
  readonly capete: readonly Pt[]; readonly jonctiuni: ReadonlyArray<{ readonly p: Pt; readonly brate: number }>; readonly colturi: readonly Pt[];
  readonly asteptat: {
    readonly cai: number; readonly inchise: number; readonly goluri: number; readonly toleranta: number; readonly capat: number;
    readonly jonctiune: number; readonly zona: number;
  };
  readonly martor: { readonly capete: number; readonly jonctiuni: number; readonly goluri: number };
};

const DIR = new URL('../fixtures/trasare/', import.meta.url);
const CORPUS = JSON.parse(readFileSync(new URL('mediana.json', DIR), 'utf8')) as { readonly cazuri: readonly Caz[] };

/** Distanța de la un punct la liniile de pe hârtie. */
function laLinii(x: number, y: number, linii: Caz['linii']): number {
  let d = Infinity;
  for (const l of linii) {
    const n = l.puncte.length;
    for (let k = 0; k < (l.inchisa ? n : n - 1); k++) {
      const [ax, ay] = l.puncte[k] ?? [0, 0], [bx, by] = l.puncte[(k + 1) % n] ?? [0, 0];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      d = Math.min(d, Math.hypot(ax + u * dx - x, ay + u * dy - y));
    }
  }
  return d;
}

test('corpusul liniei mediane: 26 de cazuri, iar martorul a găsit topologia hârtiei', () => {
  assert.equal(CORPUS.cazuri.length, 26);
  for (const c of CORPUS.cazuri) {
    assert.equal(c.martor.capete, c.capete.length, c.nume);
    assert.equal(c.martor.jonctiuni, c.jonctiuni.length, c.nume);
    assert.equal(c.martor.goluri, c.asteptat.goluri, c.nume);
  }
});

for (const caz of CORPUS.cazuri) {
  test(`linia mediană, ${caz.nume}: căile, capetele, joncțiunile, linia și grosimea, ca pe hârtie`, () => {
    const img = citestePng(readFileSync(new URL(caz.fisier, DIR)));
    const r = traseazaMediana(img, { ...caz.optiuni, petePx: 0, gauriPx: 0 });
    assert.ok(r.ok);
    const w = caz.grosime, a = caz.asteptat;
    const cai = esantioaneCai(r.cai);
    assert.equal(cai.length, a.cai, 'căile');
    assert.equal(cai.filter((c) => !c.deschisa).length, a.inchise, 'buclele');
    assert.equal(r.raport.contururi, a.cai);
    assert.equal(r.raport.bucle, a.inchise);
    assert.equal(r.raport.jonctiuni, caz.jonctiuni.length, 'joncțiunile raportate');
    assert.equal(r.raport.puncte, 0);
    assert.ok(Math.abs(r.raport.grosime - w) <= 0.2, `grosimea ${r.raport.grosime.toFixed(3)}, pe hârtie ${w}`);
    // Capetele libere: capetele căilor deschise care nu stau lângă altă cale (o joncțiune) și nici pe celălalt capăt al căii.
    const aproape = cai.map((c) => grila(c.puncte));
    const libere: Pt[] = [];
    cai.forEach((c, k) => {
      if (!c.deschisa) return;
      const n = c.varfuri.length / 2;
      for (const i of [0, n - 1]) {
        const x = c.varfuri[2 * i] ?? 0, y = c.varfuri[2 * i + 1] ?? 0;
        const j = n - 1 - i, egal = Math.hypot((c.varfuri[2 * j] ?? 0) - x, (c.varfuri[2 * j + 1] ?? 0) - y) < 1e-6;
        if (!egal && aproape.every((d, q) => q === k || d(x, y) >= w / 2)) libere.push([x, y]);
      }
    });
    assert.equal(libere.length, caz.capete.length, 'capetele libere');
    for (const q of caz.capete) {
      const d = Math.min(...libere.map((e) => Math.hypot(e[0] - q[0], e[1] - q[1])));
      assert.ok(d <= a.capat, `capătul (${q.join(', ')}): cel mai apropiat capăt liber la ${d.toFixed(3)} px`);
    }
    // Joncțiunile: brațele (fiecare trecere a cercului de rază w, pe fiecare cale) și cât de aproape trec curbele de punct.
    for (const j of caz.jonctiuni) {
      let brate = 0, cel = Infinity;
      for (const c of cai) {
        let inauntru: boolean | null = null;
        for (let i = 0; i < c.puncte.length; i += 2) {
          const d = Math.hypot((c.puncte[i] ?? 0) - j.p[0], (c.puncte[i + 1] ?? 0) - j.p[1]);
          cel = Math.min(cel, d);
          if (inauntru !== null && (d < w) !== inauntru) brate++;
          inauntru = d < w;
        }
      }
      assert.equal(brate, j.brate, `brațele joncțiunii (${j.p.join(', ')})`);
      assert.ok(cel <= a.jonctiune, `joncțiunea (${j.p.join(', ')}): curbele trec la ${cel.toFixed(3)} px`);
    }
    // Linia, în ambele sensuri: în afara zonelor nodurilor la toleranță, înăuntru la o jumătate de grosime.
    const noduri: Pt[] = [...caz.capete, ...caz.jonctiuni.map((j) => j.p), ...caz.colturi];
    const inZona = (x: number, y: number): boolean => noduri.some((q) => Math.hypot(q[0] - x, q[1] - y) <= w);
    let afara = 0, inauntru = 0;
    for (const c of cai) {
      for (let i = 0; i < c.puncte.length; i += 2) {
        const x = c.puncte[i] ?? 0, y = c.puncte[i + 1] ?? 0, d = laLinii(x, y, caz.linii);
        if (inZona(x, y)) inauntru = Math.max(inauntru, d); else afara = Math.max(afara, d);
      }
    }
    const toate = grila(cai.flatMap((c) => c.puncte));
    let inapoi = 0;
    for (const l of caz.linii) {
      const n = l.puncte.length;
      for (let k = 0; k < (l.inchisa ? n : n - 1); k++) {
        const [ax, ay] = l.puncte[k] ?? [0, 0], [bx, by] = l.puncte[(k + 1) % n] ?? [0, 0];
        const L = Math.hypot(bx - ax, by - ay), pasi = Math.max(1, Math.ceil(L / 0.1));
        for (let i = 0; i <= pasi; i++) {
          const x = ax + ((bx - ax) * i) / pasi, y = ay + ((by - ay) * i) / pasi;
          if (!inZona(x, y)) inapoi = Math.max(inapoi, toate(x, y));
        }
      }
    }
    assert.ok(afara <= a.toleranta, `curbele → hârtia: ${afara.toFixed(3)} px`);
    assert.ok(inapoi <= a.toleranta, `hârtia → curbele: ${inapoi.toFixed(3)} px`);
    assert.ok(inauntru <= a.zona, `în zonele nodurilor: ${inauntru.toFixed(3)} px (cel mult ${a.zona})`);
  });
}
