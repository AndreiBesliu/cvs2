/**
 * Abaterea traseului pe căi (ADR 0034 §6 și §9: „G-code-ul citit înapoi stă la raza frezei de calea exactă, cu abaterea
 * în bugetul de la §6”), cu ZERO importuri din `src/`. Felia 2.7b, sesiune independentă, scrisă doar din ADR. Completează
 * poarta (invarianta 2 judecă o singură parte: discul nu intră în piesă) cu ambele sensuri, pe buclele programului:
 *
 * - **Buclele programului:** ca la degajări (`degajari.ts`): evenimentele fără drumurile dus-întors (`faraDrumuri`),
 *   lanțurile de sub fiecare etichetă (`lanturile`, `rampa.ts`), iar din fiecare lanț prima buclă închisă (`desparte` /
 *   `desparteCuRampa`, `intrari.ts`: fără intrare și ieșire). Doar tăieturile unei căi (`TaieturaDoc.tip === 'cale'`).
 * - **Înainte** (programul → calea): fiecare punct al buclei (eșantionat la cel mult 0,2 mm, arcele cum le execută GRBL)
 *   stă la R de cale, ±`BUGET_CALE` (pe `pe-linie`: pe cale, la cel mult `BUGET_CALE`). Distanța la cale e măsura mea
 *   (`regiune.ts`: liniile și arcele exacte, cubicele la 1e-4 mm).
 * - **Acoperirea** (calea → programul): în fiecare punct q al căii exacte (cubica în lume e cubica punctelor de control
 *   transformate; arcul, din `bulge`; eșantionate la 0,25 mm), centrul ideal al sculei c = q + R·n (n = normala spre
 *   deșeu: în afară pe `exterior`, înăuntru pe `interior`, după sensul căii) trebuie să fie la cel mult `BUGET_CALE` de
 *   buclă. Se sar punctele pe care scula nu le poate atinge, din geometria căii: la 0,01 mm de un vârf (colțurile:
 *   offsetul face acolo un arc, sau o degajare), unde c ar fi mai aproape de cale decât R − 3e-4 (un colț concav, o
 *   strâmtoare), unde calea se curbează spre deșeu cu raza sub R + 0,01 și în vârfurile cubicei (tangenta nulă). Așa se
 *   prinde o bucată de cale pe care programul o sare (o cubică lipsă, un lob tăiat drept).
 * - **De ce ajunge:** dacă biarcele B sunt la δ de cale, iar c e la R de cale doar prin q, atunci pe raza din q spre deșeu
 *   distanța la B trece prin R între R − δ și R + δ, deci offsetul lui B trece la cel mult δ de c (cu condiția că raza de
 *   curbură spre deșeu e peste R + δ: de aici pragul de 0,01).
 * - **Bugetul** (ALEGERE din textul §6): biarcele (0,99 × 0,001), „ce adaugă oricum offsetul” (ε = 0,005 al ADR 0026
 *   §6, în ambele sensuri) și rotunjirea postului (0,002), plus măsura mea (2 × 1e-4): 0,00819 mm. Maximele măsurate se
 *   raportează separat; pe linii și arce offsetul e exact, deci o abatere peste ~0,0031 ar fi de semnalat, chiar sub buget.
 */
import { citeste, type Punct3 } from './gcode.ts';
import { aplicaO, geometrieV2, type DocArboreO, type MatriceO } from './document.ts';
import { arc, arcBulge, citesteEticheta, dPunctLista, lungime, peOParte, punctLa, segment, verificaEticheta, type Primitiva, type Regiune } from './regiune.ts';
import { drumuriDusIntors, faraDrumuri } from './degajari.ts';
import { lanturile } from './rampa.ts';
import { desparte, desparteCuRampa, type Bucata } from './intrari.ts';

type P2 = { readonly x: number; readonly y: number };

export const BUGET_CALE = 0.99 * 0.001 + 0.005 + 0.002 + 2e-4;
/** Pasul eșantionării buclei (înainte) și al căii (acoperirea), mm. */
export const PAS_BUCLA = 0.2;
export const PAS_CALE = 0.25;
/** Vecinătatea unui vârf al căii, sărită la acoperire (mm). */
export const LANGA_VARF = 0.01;

const dist = (p: P2, q: P2): number => Math.hypot(p.x - q.x, p.y - q.y);

/** O bucată a căii exacte, în lume. */
export type BucataCale =
  | { readonly tip: 'L'; readonly a: P2; readonly b: P2 }
  | { readonly tip: 'A'; readonly c: P2; readonly r: number; readonly u0: number; readonly du: number }
  | { readonly tip: 'C'; readonly a: P2; readonly c1: P2; readonly c2: P2; readonly b: P2 };

type Varf = { readonly p: P2; readonly s: { readonly tip: string; readonly bulge?: number; readonly c1?: P2; readonly c2?: P2 } };

/** Calea exactă a unui element, în lume (matricea lui). Arcele cer o similitudine (ușa refuză altfel). */
export function caleaInLume(forma: { readonly varfuri: readonly Varf[] }, m: MatriceO): BucataCale[] {
  const vs = forma.varfuri;
  const det = m.a * m.d - m.b * m.c;
  const rez: BucataCale[] = [];
  vs.forEach((v, k) => {
    const u = vs[(k + 1) % vs.length]!;
    const a = aplicaO(m, v.p), b = aplicaO(m, u.p);
    if (v.s.tip === 'L') { rez.push({ tip: 'L', a, b }); return; }
    if (v.s.tip === 'C') { rez.push({ tip: 'C', a, c1: aplicaO(m, v.s.c1!), c2: aplicaO(m, v.s.c2!), b }); return; }
    const local = arcBulge(v.p, u.p, v.s.bulge!);
    if (!local || local.tip !== 'arc') return;
    const c = aplicaO(m, local.c);
    rez.push({ tip: 'A', c, r: dist(a, c), u0: Math.atan2(a.y - c.y, a.x - c.x), du: local.du * Math.sign(det) });
  });
  return rez;
}

/** Punctul, derivata întâi și a doua ale bucății la parametrul t ∈ [0, 1]. */
function evalueaza(q: BucataCale, t: number): { readonly p: P2; readonly d1: P2; readonly d2: P2 } {
  if (q.tip === 'L') return { p: { x: q.a.x + (q.b.x - q.a.x) * t, y: q.a.y + (q.b.y - q.a.y) * t }, d1: { x: q.b.x - q.a.x, y: q.b.y - q.a.y }, d2: { x: 0, y: 0 } };
  if (q.tip === 'A') {
    const u = q.u0 + q.du * t;
    return {
      p: { x: q.c.x + q.r * Math.cos(u), y: q.c.y + q.r * Math.sin(u) },
      d1: { x: -q.r * q.du * Math.sin(u), y: q.r * q.du * Math.cos(u) },
      d2: { x: -q.r * q.du * q.du * Math.cos(u), y: -q.r * q.du * q.du * Math.sin(u) },
    };
  }
  const s = 1 - t;
  const P = (k0: number, k1: number, k2: number, k3: number, ax: 'x' | 'y'): number => k0 * q.a[ax] + k1 * q.c1[ax] + k2 * q.c2[ax] + k3 * q.b[ax];
  return {
    p: { x: P(s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t, 'x'), y: P(s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t, 'y') },
    d1: { x: P(-3 * s * s, 3 * s * s - 6 * s * t, 6 * s * t - 3 * t * t, 3 * t * t, 'x'), y: P(-3 * s * s, 3 * s * s - 6 * s * t, 6 * s * t - 3 * t * t, 3 * t * t, 'y') },
    d2: { x: P(6 * s, -12 * s + 6 * t, 6 * s - 12 * t, 6 * t, 'x'), y: P(6 * s, -12 * s + 6 * t, 6 * s - 12 * t, 6 * t, 'y') },
  };
}

/** O margine de sus a lungimii bucății (pentru numărul de eșantioane). */
function lungimeBucata(q: BucataCale): number {
  if (q.tip === 'L') return dist(q.a, q.b);
  if (q.tip === 'A') return Math.abs(q.du) * q.r;
  return dist(q.a, q.c1) + dist(q.c1, q.c2) + dist(q.c2, q.b);
}

/** Aria cu semn a căii (pozitivă = trigonometric), din eșantioane dese. */
function arieCuSemn(bucati: readonly BucataCale[]): number {
  const ps: P2[] = [];
  for (const q of bucati) {
    const n = Math.max(8, Math.ceil(lungimeBucata(q) / 0.5));
    for (let k = 0; k < n; k++) ps.push(evalueaza(q, k / n).p);
  }
  let A = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]!, r = ps[(i + 1) % ps.length]!;
    A += p.x * r.y - r.x * p.y;
  }
  return A / 2;
}

/** O bucată a buclei citite din program, ca primitivă (arcul cum îl execută GRBL: centrul din I / J, raza din start). */
export const primitivaBucla = (q: Bucata): Primitiva => (q.c !== undefined && q.r !== undefined && q.unghi !== undefined
  ? arc(q.c, q.r, Math.atan2(q.a.y - q.c.y, q.a.x - q.c.x), q.unghi)
  : segment(q.a, q.b));

export type MasuraCale = {
  readonly idLume: string;
  readonly latura: 'exterior' | 'interior' | 'pe-linie';
  /** Buclele închise măsurate (câte o trecere, de obicei) și lanțurile fără buclă închisă. */
  readonly bucle: number;
  readonly faraBucla: number;
  /** Cea mai mare abatere înainte (|d − R|, sau d pe pe-linie) și cea mai mare distanță de acoperire. */
  readonly maxInainte: number;
  readonly maxAcoperire: number;
  /** Punctele căii judecate la acoperire și cele sărite (pe toate buclele). */
  readonly acoperite: number;
  readonly sarite: number;
  readonly rele: readonly string[];
};

/**
 * Măsura pe un program: pe fiecare tăietură a unei căi (după eticheta ei), abaterea înainte și acoperirea, pe fiecare
 * buclă. `R` = raza frezei; `laDoc` = mașina → document.
 */
export function masoaraCaile(text: string, doc: DocArboreO, reg: Regiune, R: number, laDoc: (p: Punct3) => Punct3): MasuraCale[] {
  const { evenimente, comentarii } = citeste(text);
  const etichete = comentarii.flatMap((c) => {
    const e = citesteEticheta(c.text);
    if (e === null) return [];
    return [{ linia: c.linia, eticheta: e !== 'stricata' && c.singur && verificaEticheta(reg, e) === null ? e : null }];
  });
  const fara = faraDrumuri(evenimente, drumuriDusIntors(evenimente, laDoc));
  const lumea = new Map(geometrieV2(doc, 0).map((e) => [e.idLume, e]));
  type Acum = { bucle: number; faraBucla: number; maxInainte: number; maxAcoperire: number; acoperite: number; sarite: number; rele: string[] };
  const pe = new Map<string, Acum & { idLume: string; latura: MasuraCale['latura'] }>();
  const geometrie = new Map<string, { bucati: BucataCale[]; semn: number; varfuri: P2[] }>();
  for (const l of lanturile(fara, etichete.map((e) => e.linia), laDoc)) {
    const e = l.eticheta >= 0 ? etichete[l.eticheta]?.eticheta ?? null : null;
    // ADR 0037 (felia 2.3c-5): o tăietură pe o parte nu e o buclă a căii; o judecă poarta (`parte.ts`).
    if (!e || peOParte(e.latura)) continue;
    const t = reg.taieturi.get(e.idLume);
    if (t?.tip !== 'cale' || !t.contur) continue;
    const latura = e.latura;
    const cheie = `${e.idLume}|${latura}`;
    let x = pe.get(cheie);
    if (!x) {
      x = { idLume: e.idLume, latura, bucle: 0, faraBucla: 0, maxInainte: 0, maxAcoperire: 0, acoperite: 0, sarite: 0, rele: [] };
      pe.set(cheie, x);
    }
    const tr = desparteCuRampa(l.pasi) ?? desparte(l.pasi);
    if (!tr.inchisa || tr.bucla.length === 0) { x.faraBucla++; continue; }
    x.bucle++;
    const bucla = tr.bucla.map(primitivaBucla);
    const contur = t.contur.primitive;
    const rau = (m: string): void => { if (x!.rele.length < 6) x!.rele.push(m); };
    // Înainte.
    for (const q of bucla) {
      const L = lungime(q);
      const n = Math.max(2, Math.ceil(L / PAS_BUCLA));
      for (let k = 0; k <= n; k++) {
        const p = punctLa(q, (L * k) / n);
        const d = dPunctLista(p, contur);
        const abatere = latura === 'pe-linie' ? d : Math.abs(d - R);
        if (abatere > x.maxInainte) x.maxInainte = abatere;
        if (abatere > BUGET_CALE) rau(`înainte: punctul (${p.x.toFixed(4)}, ${p.y.toFixed(4)}) al buclei e la ${d.toFixed(5)} mm de cale (R = ${R}; abaterea ${abatere.toFixed(5)} > ${BUGET_CALE.toFixed(5)})`);
      }
    }
    // Acoperirea.
    let g = geometrie.get(e.idLume);
    if (!g) {
      const el = lumea.get(e.idLume)!;
      const bucati = caleaInLume(el.forma as { varfuri: Varf[] }, el.matrice);
      g = { bucati, semn: Math.sign(arieCuSemn(bucati)), varfuri: bucati.map((q) => evalueaza(q, 0).p) };
      geometrie.set(e.idLume, g);
    }
    for (const q of g.bucati) {
      const n = Math.max(4, Math.ceil(lungimeBucata(q) / PAS_CALE));
      for (let k = 0; k <= n; k++) {
        const { p, d1, d2 } = evalueaza(q, k / n);
        const v = Math.hypot(d1.x, d1.y);
        if (!(v > 1e-9) || g.varfuri.some((w) => dist(w, p) < LANGA_VARF)) { x.sarite++; continue; }
        const T = { x: d1.x / v, y: d1.y / v };
        const afara = g.semn >= 0 ? { x: T.y, y: -T.x } : { x: -T.y, y: T.x };
        let c = p;
        if (latura !== 'pe-linie') {
          const nw = latura === 'exterior' ? afara : { x: -afara.x, y: -afara.y };
          // Curbura spre deșeu: centrul de curbură pe partea deșeului, cu raza sub R + 0,01.
          const kappa = (d1.x * d2.y - d1.y * d2.x) / (v * v * v);
          if (kappa !== 0) {
            const spreCentru = Math.sign(kappa) * (-T.y * nw.x + T.x * nw.y);
            if (spreCentru > 0 && 1 / Math.abs(kappa) < R + 0.01) { x.sarite++; continue; }
          }
          c = { x: p.x + R * nw.x, y: p.y + R * nw.y };
          if (dPunctLista(c, contur) < R - 3e-4) { x.sarite++; continue; }
        }
        const dl = dPunctLista(c, bucla);
        x.acoperite++;
        if (dl > x.maxAcoperire) x.maxAcoperire = dl;
        if (dl > BUGET_CALE) rau(`acoperire: punctul (${p.x.toFixed(4)}, ${p.y.toFixed(4)}) al căii; centrul ideal (${c.x.toFixed(4)}, ${c.y.toFixed(4)}) e la ${dl.toFixed(5)} mm de buclă`);
      }
    }
  }
  return [...pe.values()];
}
