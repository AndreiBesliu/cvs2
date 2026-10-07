import type { ComandaCale, FormaDesen } from '../canvas/protocol.ts';
import { cerculArcului, numarSegmente, segment, type Contur } from '../geom/contur.ts';
import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';

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

export function listaDesen(doc: Document): FormaDesen[] {
  return doc.elemente.map((e) => ({ id: e.id, cale: caleContur(conturElement(e)) }));
}
