import type { ComandaCale, FormaDesen } from '../canvas/protocol.ts';
import { cerculArcului, numarSegmente, segment, type Contur } from '../geom/contur.ts';
import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';

/**
 * Documentul → lista de desen a pânzei: fiecare element, cu conturul lui exact, scris ca o cale (linii, arce cu centru și
 * rază, cubice). Legătura stă în `src/app/`, singurul loc care cunoaște și domeniul, și pânza.
 */
export function caleContur(c: Contur): ComandaCale[] {
  const start = c.varfuri[0]?.p;
  if (!start) return [];
  const cale: ComandaCale[] = [{ t: 'M', x: start.x, y: start.y }];
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L') {
      cale.push({ t: 'L', x: b.x, y: b.y });
    } else if (s.tip === 'A') {
      const { centru, raza, start: a0, baleiaj } = cerculArcului(a, b, s.bulge);
      cale.push({ t: 'A', cx: centru.x, cy: centru.y, r: raza, a0, a1: a0 + baleiaj, trigonometric: baleiaj > 0 });
    } else {
      cale.push({ t: 'C', x1: s.c1.x, y1: s.c1.y, x2: s.c2.x, y2: s.c2.y, x: b.x, y: b.y });
    }
  }
  if (c.inchis) cale.push({ t: 'Z' });
  return cale;
}

/**
 * Direcția de mers la vârful 0 (ADR 0037 §12): tangenta primului segment, ca vector unitar. Linia: coarda; arcul: tangenta
 * cercului în start, în sensul baleiajului; cubica: primul mâner diferit de start (altfel coarda). Null dacă segmentul n-are
 * lungime.
 */
export function directiaDeStart(c: Contur): { readonly ux: number; readonly uy: number } | null {
  if (numarSegmente(c) === 0) return null;
  const { a, b, s } = segment(c, 0);
  let dx = b.x - a.x, dy = b.y - a.y;
  if (s.tip === 'A') {
    const { start, baleiaj } = cerculArcului(a, b, s.bulge);
    const semn = Math.sign(baleiaj);
    dx = -Math.sin(start) * semn;
    dy = Math.cos(start) * semn;
  } else if (s.tip === 'C') {
    const q = s.c1.x !== a.x || s.c1.y !== a.y ? s.c1 : s.c2.x !== a.x || s.c2.y !== a.y ? s.c2 : b;
    dx = q.x - a.x;
    dy = q.y - a.y;
  }
  const l = Math.hypot(dx, dy);
  return l > 0 && Number.isFinite(l) ? { ux: dx / l, uy: dy / l } : null;
}

/**
 * Formele primei foi: fiecare element în lume, cu id-ul lui în lume (`<instanță>/<element>`). O cale deschisă primește
 * săgeata de sens: vârful 0 și direcția desenului acolo (ADR 0037 §12), în lume.
 */
export function listaDesen(doc: Document): FormaDesen[] {
  return elementeFoaie(doc, 0).map((e) => {
    const c = conturElement(e);
    const p = c.varfuri[0]?.p;
    const d = !c.inchis && p ? directiaDeStart(c) : null;
    return d && p ? { id: e.idLume, cale: caleContur(c), sageata: { x: p.x, y: p.y, ...d } } : { id: e.idLume, cale: caleContur(c) };
  });
}
