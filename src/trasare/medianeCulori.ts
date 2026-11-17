/**
 * Liniile mediane pe culori (ADR 0227): după etichetele trasării pe culori (ADR 0221, fără contururi), linia mediană a
 * fiecărei culori bifate (cu culorile legate de ea) pe masca ei, decupată la cutia ei, cu nucleul liniei mediane (ADR 0222,
 * 0223). Pragul automat al părților late vine din grosimea obișnuită a desenului întreg: mediana lățimilor măsurate pe toate
 * culorile (deci ponderată cu lungimea liniilor), ca o culoare plină să iasă „lată”. „Leagă peste alte culori”: două capete
 * ale aceleiași culori, față în față, aproape, cu drumul dintre ele pe desen și peste altă culoare, se leagă.
 *
 * Rezultatul pe fiecare culoare (ADR 0228): cu `peLinii`, doar culorile alese pe linii mediane; celelalte bifate ies
 * contururi, din aceeași trecere a nucleului culorilor (reducerea, o singură dată). Pragul automat vine atunci doar din
 * culorile pe linii, iar legarea trece și peste culorile pe contururi.
 *
 * Pură, fără importuri din aplicație (regula `trasare-izolat`); coordonatele, ca la trasare (pixeli, y în jos).
 */
import { traseazaCulori, type OptiuniCulori, type PiesaCuloare, type RaportCulori } from './culori.ts';
import { liniiMediane, mediana, traseazaMediana, type Linii, type OptiuniMediana, type RaportMediana } from './mediana.ts';
import { PLAFON_TRASARE, type CaiTrasate, type ImagineRGBA } from './trasare.ts';

export type OptiuniMedianeCulori = OptiuniMediana & {
  /** „Leagă peste alte culori” (răspunsul 1a): o linie întreruptă de o culoare desenată peste ea continuă. */
  readonly leaga: boolean;
};

/** Piesa unei culori, cu grosimea obișnuită a trăsăturilor ei (px; 0 fără măsurători) și legăturile ei peste alte culori. */
export type PiesaMediana = PiesaCuloare & { readonly grosime: number; readonly legaturi: number };
/** O piesă pe culori (ADR 0228): contururile unei culori (ADR 0221), sau liniile ei mediane, cu grosimea și legăturile. */
export type PiesaRezultat = PiesaCuloare | PiesaMediana;

export type MedianeCulori = {
  /** Grosimea obișnuită a desenului întreg, în px (din ea, pragul automat al părților late). */
  readonly grosime: number;
  readonly bucle: number; readonly jonctiuni: number; readonly puncte: number; readonly legaturi: number;
  /** Părțile late, dacă s-au căutat: câte, ce parte din cerneala culorilor trasate și pragul, în px. */
  readonly parti?: RaportMediana['parti'];
};

export type RezultatCuloriMediane =
  | {
    readonly ok: true; readonly piese: readonly PiesaRezultat[]; readonly raport: RaportCulori & { readonly mediane: MedianeCulori };
    readonly etichete: Uint8Array;
    /** Contururile părților late ale tuturor culorilor, dacă s-au căutat: doar pentru semnalare. */
    readonly late?: CaiTrasate;
  }
  | { readonly ok: false; readonly cod: 'prea-multe'; readonly raport: RaportCulori };

/**
 * Legarea: capetele față în față la cel mult `unghi` grade de dreapta dintre ele, la cel mult `grosimi` grosimi ale culorii;
 * drumul, eșantionat între `de` și 1 − `de` din lungime, la fiecare `pas`.
 */
export const LEGARE = { unghi: 25, grosimi: 3, de: 0.1, pas: 0.05 } as const;

type Cale = Linii['cai'][number];

/**
 * Leagă, pe loc, capetele căilor deschise ale culorii `k` (lățimea ei obișnuită `w`), cele mai apropiate întâi, fiecare
 * capăt o dată: drumul dintre ele nu trece pe fundal (`et` < 0) și trece măcar o dată peste altă culoare (capetele stau la
 * o jumătate de grosime de capătul trăsăturii, deci drumul începe pe culoarea lor). Un lanț care se închide devine buclă.
 * Întoarce câte legături a făcut.
 */
export function leagaCai(cai: Cale[], w: number, et: (x: number, y: number) => number, k: number): number {
  const deschise = cai.filter((c) => !c.inchisa && c.P.length >= 4);
  // Capetele: 2i, începutul căii i; 2i + 1, sfârșitul; direcția spre afară, din punctele de pe ultima grosime și jumătate.
  const cap: Array<{ x: number; y: number; dx: number; dy: number }> = [];
  for (const { P } of deschise) {
    const n = P.length / 2;
    for (const [i0, pas] of [[0, 1], [n - 1, -1]] as const) {
      const x = P[2 * i0] ?? 0, y = P[2 * i0 + 1] ?? 0;
      let j = i0 + pas;
      while (j + pas >= 0 && j + pas < n && Math.hypot((P[2 * (j + pas)] ?? 0) - x, (P[2 * (j + pas) + 1] ?? 0) - y) <= Math.max(2, 1.5 * w)) j += pas;
      const dx = x - (P[2 * j] ?? 0), dy = y - (P[2 * j + 1] ?? 0), l = Math.hypot(dx, dy) || 1;
      cap.push({ x, y, dx: dx / l, dy: dy / l });
    }
  }
  const cos = Math.cos((LEGARE.unghi * Math.PI) / 180), dMax = LEGARE.grosimi * w;
  const ord = cap.map((_, i) => i).sort((i, j) => (cap[i]?.x ?? 0) - (cap[j]?.x ?? 0));
  const perechi: Array<readonly [number, number, number]> = [];
  for (let ia = 0; ia < ord.length; ia++) {
    for (let ib = ia + 1; ib < ord.length; ib++) {
      const a = ord[ia] ?? 0, b = ord[ib] ?? 0, A = cap[a], B = cap[b];
      if (!A || !B) continue;
      if (B.x - A.x > dMax) break;
      const vx = B.x - A.x, vy = B.y - A.y, d = Math.hypot(vx, vy);
      if (!(d >= 1 && d <= dMax) || A.dx * vx + A.dy * vy < cos * d || -(B.dx * vx + B.dy * vy) < cos * d) continue;
      let alta = false, pe = true;
      for (let t = LEGARE.de; t <= 1 - LEGARE.de + 1e-9 && pe; t += LEGARE.pas) {
        const e = et(A.x + t * vx, A.y + t * vy);
        if (e < 0) pe = false; else if (e !== k) alta = true;
      }
      if (pe && alta) perechi.push([d, a, b]);
    }
  }
  perechi.sort((p, q) => p[0] - q[0]);
  const leg = new Int32Array(cap.length).fill(-1);
  let legaturi = 0;
  for (const [, a, b] of perechi) if (leg[a] === -1 && leg[b] === -1) { leg[a] = b; leg[b] = a; legaturi++; }
  if (legaturi === 0) return 0;
  // Lanțurile: de la un capăt liber (apoi, pe cicluri, de la oricare), fiecare cale intrată pe un capăt, ieșită pe celălalt.
  const vazut = new Uint8Array(deschise.length), noi: Cale[] = [];
  const lant = (e0: number): void => {
    const P: number[] = [];
    for (let e = e0; ;) {
      const Q = deschise[e >> 1]?.P ?? [];
      vazut[e >> 1] = 1;
      if (e % 2 === 0) for (let q = 0; q < Q.length; q += 2) P.push(Q[q] ?? 0, Q[q + 1] ?? 0);
      else for (let q = Q.length - 2; q >= 0; q -= 2) P.push(Q[q] ?? 0, Q[q + 1] ?? 0);
      const urm = leg[e ^ 1] ?? -1;
      if (urm < 0 || vazut[urm >> 1]) { noi.push({ P, inchisa: urm >= 0 }); return; }
      e = urm;
    }
  };
  for (let e = 0; e < cap.length; e++) if (!vazut[e >> 1] && leg[e] === -1) lant(e);
  for (let e = 0; e < cap.length; e += 2) if (!vazut[e >> 1]) lant(e);
  const vechi = new Set(deschise);
  let j = 0;
  for (const c of cai) if (!vechi.has(c)) cai[j++] = c;
  cai.length = j;
  for (const c of noi) cai.push(c);
  return legaturi;
}

/** Căile mutate cu (ox, oy), pe loc: vârfurile și, la curbe, mânerele. */
function muta(c: CaiTrasate, ox: number, oy: number): CaiTrasate {
  for (let v = 0; v < c.tip.length; v++) {
    for (let i = 0; i < (c.tip[v] ? 6 : 2); i++) c.xy[6 * v + i] = (c.xy[6 * v + i] ?? 0) + (i % 2 ? oy : ox);
  }
  return c;
}

/**
 * Linia mediană a fiecărei culori bifate (ADR 0227), cu opțiunile liniei mediane comune tuturor culorilor; cu `oc.peLinii`
 * (ADR 0228), doar a celor alese, iar celelalte bifate, contururi. `cu.culori`: nucleul culorilor (în probe, spionat).
 */
export function traseazaCuloriMediane(img: ImagineRGBA, oc: OptiuniCulori, om: OptiuniMedianeCulori,
  cu: { readonly culori?: typeof traseazaCulori } = {}): RezultatCuloriMediane {
  // Reducerea culorilor, o singură dată: cu `peLinii`, și contururile culorilor rămase pe contururi; fără, doar etichetele.
  const rc = (cu.culori ?? traseazaCulori)(img, oc.peLinii ? oc : { ...oc, doarEtichete: true });
  if (!rc.ok) return rc;
  const { latime: W, inaltime: H } = img, et = rc.etichete, paleta = rc.raport.paleta, M = 2;
  const fundal = paleta.find((c) => c.fundal)?.prima ?? -1;
  const eticheta = (x: number, y: number): number => {
    const X = Math.floor(x), Y = Math.floor(y), e = X >= 0 && Y >= 0 && X < W && Y < H ? et[Y * W + X] ?? 255 : 255;
    return e === 255 || e === fundal ? -1 : e;
  };
  // Cutia fiecărei culori bifate pe linii mediane și aria ei (pixelii).
  const cutii = paleta.flatMap((c, k) => (c.bifata && (oc.peLinii ? oc.peLinii[k] === true : true) ? [{ k, x0: W, y0: H, x1: -1, y1: -1, arie: 0 }] : []));
  const aCutiei = new Int16Array(256).fill(-1);
  for (const [i, c] of cutii.entries()) aCutiei[c.k] = i;
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p++) {
      const c = cutii[aCutiei[et[p] ?? 255] ?? -1];
      if (!c) continue;
      c.arie++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      c.y1 = y;
    }
  }
  /** Masca culorii, în cutia ei cu o margine de M px: opacă pe culoare, transparentă în rest (câmpul din alfa). */
  const masca = (c: (typeof cutii)[number]): ImagineRGBA => {
    const w = c.x1 - c.x0 + 1 + 2 * M, h = c.y1 - c.y0 + 1 + 2 * M, d = new Uint8ClampedArray(4 * w * h);
    for (let y = 0; y < h; y++) {
      const Y = y + c.y0 - M;
      if (Y < 0 || Y >= H) continue;
      for (let x = 0; x < w; x++) {
        const X = x + c.x0 - M;
        if (X >= 0 && X < W && et[Y * W + X] === c.k) d[4 * (y * w + x) + 3] = 255;
      }
    }
    return { latime: w, inaltime: h, date: d };
  };
  const ot = { sursa: 'alfa', prag: null, inverseaza: false, netezime: oc.netezime, petePx: 0, gauriPx: 0 } as const;
  // Întâi liniile tuturor culorilor: lățimile lor dau grosimea desenului întreg, deci pragul părților late.
  const linii = cutii.filter((c) => c.arie > 0).map((c) => ({ c, L: liniiMediane(masca(c), ot, om) }));
  const grosime = mediana(linii.flatMap((x) => x.L.latimi));
  const prag = om.pragLatPx ?? (grosime > 0 ? 2 * grosime : null);
  const cauta = (om.semnaleaza || om.late === 'contur') && prag !== null;
  // Piesele culorilor pe contururi întâi (cu numărătorile lor: căile, vârfurile, abaterea), apoi liniile.
  const piese: PiesaRezultat[] = [...rc.piese], late: CaiTrasate[] = [];
  let bucle = 0, jonctiuni = 0, puncte = 0, legaturi = 0, numar = 0, lata = 0, cerneala = 0;
  let nCai = rc.raport.contururi, varfuri = rc.raport.varfuri, abatere = rc.raport.abatere;
  for (const { c, L } of linii) {
    const ox = c.x0 - M, oy = c.y0 - M;
    let leg = 0;
    const r = traseazaMediana(masca(c), ot, { ...om, pragLatPx: prag }, {
      L, ...(om.leaga ? { leaga: (cai: Cale[], w: number) => { leg = w > 0 ? leagaCai(cai, w, (x, y) => eticheta(x + ox, y + oy), c.k) : 0; } } : {}),
    });
    if (!r.ok) return { ok: false, cod: 'prea-multe', raport: { ...rc.raport, contururi: nCai + r.raport.contururi, varfuri: varfuri + r.raport.varfuri } };
    bucle += r.raport.bucle; jonctiuni += r.raport.jonctiuni; puncte += r.raport.puncte; legaturi += leg;
    abatere = Math.max(abatere, r.raport.abatere);
    cerneala += c.arie;
    if (r.raport.parti) { numar += r.raport.parti.numar; lata += r.raport.parti.arie * c.arie; }
    if (r.late) late.push(muta(r.late, ox, oy));
    const n = r.cai.inceput.length - 1;
    if (n === 0) continue;
    nCai += n; varfuri += r.cai.tip.length;
    piese.push({ culoare: c.k, hex: paleta[c.k]?.hex ?? '#000000', cai: muta(r.cai, ox, oy), grosime: r.raport.grosime, legaturi: leg });
  }
  // Raportul culorilor, cu numărătorile tuturor pieselor (căile, vârfurile, abaterea curbelor); piesele, în ordinea paletei.
  const raport = { ...rc.raport, contururi: nCai, varfuri, abatere };
  piese.sort((a, b) => a.culoare - b.culoare);
  if (nCai > PLAFON_TRASARE.contururi || varfuri > PLAFON_TRASARE.varfuri) return { ok: false, cod: 'prea-multe', raport };
  const mediane: MedianeCulori = {
    grosime, bucle, jonctiuni, puncte, legaturi,
    ...(cauta && prag !== null ? { parti: { numar, arie: lata / Math.max(1, cerneala), pragPx: prag } } : {}),
  };
  return { ok: true, piese, raport: { ...raport, mediane }, etichete: et, ...(cauta ? { late: uneste(late) } : {}) };
}

/** Mai multe seturi de căi închise, într-unul. */
function uneste(lista: readonly CaiTrasate[]): CaiTrasate {
  let nc = 0, nv = 0;
  for (const c of lista) { nc += c.inceput.length - 1; nv += c.tip.length; }
  const inceput = new Uint32Array(nc + 1), tip = new Uint8Array(nv), xy = new Float64Array(6 * nv), exterior = new Uint8Array(nc);
  let k0 = 0, v0 = 0;
  for (const c of lista) {
    const n = c.inceput.length - 1;
    for (let k = 1; k <= n; k++) inceput[k0 + k] = v0 + (c.inceput[k] ?? 0);
    tip.set(c.tip, v0); xy.set(c.xy, 6 * v0); exterior.set(c.exterior, k0);
    k0 += n; v0 += c.tip.length;
  }
  return { inceput, tip, xy, exterior };
}
