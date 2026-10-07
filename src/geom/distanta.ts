import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from './contur.ts';

/**
 * Distanța exactă de la un punct la un contur L / A, și regula de umplere `evenodd` (T3, ADR 0003): o singură funcție
 * „punct în regiune”, folosită de clic, de ecran și, mai târziu, de sculă. Cubicele intră aici abia ca biarce (etapa 2).
 */

function distantaLaSegmentDrept(p: Punct, a: Punct, b: Punct): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Unghiul u e pe arcul care pleacă din `start` cu baleiajul cu semn `baleiaj`? */
function peArc(u: number, start: number, baleiaj: number): boolean {
  const doiPi = 2 * Math.PI;
  const rel = baleiaj >= 0 ? (((u - start) % doiPi) + doiPi) % doiPi : (((start - u) % doiPi) + doiPi) % doiPi;
  return rel <= Math.abs(baleiaj);
}

function distantaLaArc(p: Punct, a: Punct, b: Punct, bulge: number): number {
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, bulge);
  const u = Math.atan2(p.y - centru.y, p.x - centru.x);
  if (peArc(u, start, baleiaj)) return Math.abs(Math.hypot(p.x - centru.x, p.y - centru.y) - raza);
  return Math.min(Math.hypot(p.x - a.x, p.y - a.y), Math.hypot(p.x - b.x, p.y - b.y));
}

export function distantaLaContur(p: Punct, c: Contur): number {
  let d = Infinity;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'C') throw new Error('distanța la cubice vine cu biarcele (etapa 2)');
    d = Math.min(d, s.tip === 'L' ? distantaLaSegmentDrept(p, a, b) : distantaLaArc(p, a, b, s.bulge));
  }
  return d;
}

/**
 * Câte ori taie conturul o rază orizontală spre +x din p. Raza e ridicată cu un ε față de p, ca să nu treacă niciodată
 * exact printr-un vârf: o atingere în vârf ar fi numărată altfel de cele două segmente care se întâlnesc acolo.
 */
function traversari(p: Punct, c: Contur): number {
  const y = p.y + 1e-9;
  let n = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L') {
      if ((a.y > y) !== (b.y > y) && p.x < a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y)) n++;
    } else if (s.tip === 'A') {
      const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
      const h = y - centru.y;
      if (Math.abs(h) >= raza) continue;
      const w = Math.sqrt(raza * raza - h * h);
      for (const x of [centru.x - w, centru.x + w]) {
        if (x > p.x && peArc(Math.atan2(h, x - centru.x), start, baleiaj)) n++;
      }
    } else {
      throw new Error('regiunea cu cubice vine cu biarcele (etapa 2)');
    }
  }
  return n;
}

/** Regula `evenodd`, peste toate contururile regiunii: un punct e înăuntru dacă o rază îl scoate afară de un număr impar de ori. */
export function inRegiune(p: Punct, contururi: readonly Contur[]): boolean {
  let n = 0;
  for (const c of contururi) if (c.inchis) n += traversari(p, c);
  return n % 2 === 1;
}
