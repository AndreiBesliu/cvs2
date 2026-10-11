import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from './contur.ts';

/**
 * Distanța de la un punct la un contur și regula de umplere `evenodd` (T3, ADR 0003): o singură funcție „punct în
 * regiune”, folosită de clic, de ecran și de sculă. Liniile și arcele se măsoară exact. Cubicele (căile, ADR 0034 §5) se
 * măsoară direct, pe bucăți monotone: includerea la precizia aritmeticii, distanța pentru clic. CAM-ul nu le vede: el
 * taie conturul fără cubice (biarcele, ADR 0033).
 */

function distantaLaSegmentDrept(p: Punct, a: Punct, b: Punct): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Unghiul u e pe arcul care pleacă din `start` cu baleiajul cu semn `baleiaj`? */
export function peArc(u: number, start: number, baleiaj: number): boolean {
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

type Cubica = { readonly a: Punct; readonly c1: Punct; readonly c2: Punct; readonly b: Punct };

function peCubica(q: Cubica, t: number): Punct {
  if (t === 0) return q.a;
  if (t === 1) return q.b;
  const u = 1 - t;
  const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
  return { x: k0 * q.a.x + k1 * q.c1.x + k2 * q.c2.x + k3 * q.b.x, y: k0 * q.a.y + k1 * q.c1.y + k2 * q.c2.y + k3 * q.b.y };
}

function derivataCubicei(q: Cubica, t: number): Punct {
  const u = 1 - t;
  return {
    x: 3 * (u * u * (q.c1.x - q.a.x) + 2 * u * t * (q.c2.x - q.c1.x) + t * t * (q.b.x - q.c2.x)),
    y: 3 * (u * u * (q.c1.y - q.a.y) + 2 * u * t * (q.c2.y - q.c1.y) + t * t * (q.b.y - q.c2.y)),
  };
}

/** Valorile t din (0, 1) unde cubica își schimbă sensul pe o axă: rădăcinile derivatei ei pe axă (forma fără anulare). */
function intoarcerilePeAxa(p0: number, p1: number, p2: number, p3: number): number[] {
  const d0 = p1 - p0, d1 = p2 - p1, d2 = p3 - p2;
  const A = d0 - 2 * d1 + d2, B = 2 * (d1 - d0), C = d0;
  const scara = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
  const r: number[] = [];
  if (scara === 0) return r;
  if (Math.abs(A) > 1e-12 * scara) {
    const D = B * B - 4 * A * C;
    if (D >= 0) {
      const q = -(B + (B < 0 ? -1 : 1) * Math.sqrt(D)) / 2;
      if (q !== 0) r.push(q / A, C / q);
    }
  } else if (Math.abs(B) > 1e-12 * scara) {
    r.push(-C / B);
  }
  return r.filter((t) => t > 0 && t < 1).sort((u, v) => u - v);
}

/**
 * Distanța de la p la cubică: pe fiecare bucată monotonă pe x și pe y, 8 eșantioane, apoi Newton din fiecare minim local
 * al lor. Bucata monotonă se rotește cel mult 90°, deci minimele nu se ascund între eșantioane decât cu o eroare mult sub
 * toleranța unui clic.
 */
function distantaLaCubica(p: Punct, q: Cubica): number {
  const ts = [0, ...new Set([
    ...intoarcerilePeAxa(q.a.x, q.c1.x, q.c2.x, q.b.x), ...intoarcerilePeAxa(q.a.y, q.c1.y, q.c2.y, q.b.y),
  ])].sort((u, v) => u - v);
  ts.push(1);
  const d = (t: number): number => { const r = peCubica(q, t); return Math.hypot(r.x - p.x, r.y - p.y); };
  let min = Math.min(d(0), d(1));
  for (let k = 0; k + 1 < ts.length; k++) {
    const t0 = ts[k] as number, t1 = ts[k + 1] as number;
    const N = 8;
    const valori = Array.from({ length: N + 1 }, (_, i) => d(t0 + ((t1 - t0) * i) / N));
    for (let i = 0; i <= N; i++) {
      const v = valori[i] as number;
      if (v > (valori[i - 1] ?? Infinity) || v > (valori[i + 1] ?? Infinity)) continue;
      let t = t0 + ((t1 - t0) * i) / N;
      for (let it = 0; it < 12; it++) {
        const r = peCubica(q, t), d1 = derivataCubicei(q, t);
        const u = 1 - t;
        const d2 = {
          x: 6 * (u * (q.c2.x - 2 * q.c1.x + q.a.x) + t * (q.b.x - 2 * q.c2.x + q.c1.x)),
          y: 6 * (u * (q.c2.y - 2 * q.c1.y + q.a.y) + t * (q.b.y - 2 * q.c2.y + q.c1.y)),
        };
        const f = (r.x - p.x) * d1.x + (r.y - p.y) * d1.y;
        const fp = d1.x * d1.x + d1.y * d1.y + (r.x - p.x) * d2.x + (r.y - p.y) * d2.y;
        if (!(Math.abs(fp) > 0)) break;
        const tn = Math.max(t0, Math.min(t1, t - f / fp));
        if (Math.abs(tn - t) < 1e-15) break;
        t = tn;
      }
      min = Math.min(min, v, d(t));
    }
  }
  return min;
}

export function distantaLaContur(p: Punct, c: Contur): number {
  let d = Infinity;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    d = Math.min(d, s.tip === 'L' ? distantaLaSegmentDrept(p, a, b)
      : s.tip === 'A' ? distantaLaArc(p, a, b, s.bulge) : distantaLaCubica(p, { a, c1: s.c1, c2: s.c2, b }));
  }
  return d;
}

/**
 * Câte ori taie o cubică raza orizontală y spre +x din p. Cubica se taie la extremele lui y în bucăți monotone pe y; raza
 * trece printr-o bucată cel mult o dată, cu aceeași regulă ca la linie (capetele de o parte și de alta a lui y), iar
 * punctul traversării se găsește prin bisecție, la precizia aritmeticii.
 */
function traversariCubica(p: Punct, y: number, q: Cubica): number {
  const ts = [0, ...intoarcerilePeAxa(q.a.y, q.c1.y, q.c2.y, q.b.y), 1];
  let n = 0;
  for (let k = 0; k + 1 < ts.length; k++) {
    let t0 = ts[k] as number, t1 = ts[k + 1] as number;
    const sus0 = peCubica(q, t0).y > y;
    if (sus0 === peCubica(q, t1).y > y) continue;
    for (let it = 0; it < 64 && t1 - t0 > 0; it++) {
      const tm = (t0 + t1) / 2;
      if (tm === t0 || tm === t1) break;
      if ((peCubica(q, tm).y > y) === sus0) t0 = tm; else t1 = tm;
    }
    if (peCubica(q, (t0 + t1) / 2).x > p.x) n++;
  }
  return n;
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
      n += traversariCubica(p, y, { a, c1: s.c1, c2: s.c2, b });
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
