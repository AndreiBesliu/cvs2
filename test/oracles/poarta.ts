/**
 * POARTA INVARIANTELOR (`PLAN.md` §4.2), cu ZERO importuri din `src/`. Rulează pe textul oricărui program generat de un
 * test. În etapa 1 intră invariantele 1, 3, 5, 6, 7 și 8; a 2-a vine în etapa 2, a 4-a în etapa 18.
 *
 * Materialul e un câmp de înălțimi pe celule (ca oracolul din s4): fiecare mișcare se eșantionează des, iar sub discul
 * sculei se citește cât material scoate (invarianta 1) sau dacă o rapidă îl atinge (invarianta 3).
 *
 * Invarianta 5 are trei părți, iar nicio declarație nu le relaxează pe primele două:
 * - Z: niciun punct sub fața de jos (plus supracursa);
 * - rapidele: niciun G0 sub fața de sus cu discul în afara foii (în afară de ridicarea pe verticală din tăietură);
 * - XY, la tăiere (decizia owner-ului din 07.10.2026): o formă poate ieși din foaie intenționat, iar freza o urmează,
 *   dar numai cu confirmarea scrisă în antet. Oriunde discul sculei (raza R) trece de o margine a foii pe partea de sub
 *   fața de sus a unei mișcări G1/G2/G3, programul trebuie să poarte, înaintea primei tăieri, exact liniile
 *     (CONFIRMAT: freza iese din foaie)
 *     (iesire mm: st 5.000 dr 0.000 jos 0.000 sus 0.000)
 *   cu cât trece discul peste fiecare latură, în document. Partea de sub fața de sus se mărginește exact
 *   (`marginiSubSuprafata`: trecerea prin z = 0 și punctele cardinale ale arcelor), nu din eșantioane.
 */
import { citeste, esantioane, marginiSubSuprafata, regulaArcGrbl, type Comentariu, type Mutare, type Punct3 } from './gcode.ts';

export type ColtOrigine = 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus';

export type ContextPoarta = {
  readonly foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number };
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
  /** Freză plată, în stadiul 1. */
  readonly diametruScula: number;
  /** Cât scoate cel mult o trecere, în mm (invarianta 1). */
  readonly pas: number;
  /** Cât are voie sub fața de jos (tăierea prin material); 0 dacă nu taie prin (invarianta 5). */
  readonly supracursa: number;
  /** Secundele de așteptare după pornirea axului, cerute de mașină (invarianta 7). */
  readonly asteptareAx: number;
  /** Invarianta 8: cutia centrului sculei pe mișcările de tăiere, în coordonatele DOCUMENTULUI, socotită pe hârtie. */
  readonly cadru?: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };
};

export type Incalcare = { readonly invarianta: 1 | 3 | 5 | 6 | 7 | 8; readonly linia: number; readonly mesaj: string };

const TOL = 1e-6;
/** Rotunjirea la 3 zecimale mută un punct cu cel mult √2/2·10⁻³ mm. */
const TOL_ROTUNJIRE = 0.002;

/** Declarația de ieșire din foaie, scrisă aici după contract, independent de aplicație. */
const DECLARATIE_A = '(CONFIRMAT: freza iese din foaie)';
const DECLARATIE_B = /^\(iesire mm: st (\d+\.\d{3}) dr (\d+\.\d{3}) jos (\d+\.\d{3}) sus (\d+\.\d{3})\)$/;
/** Un comentariu care seamănă cu o bucată de declarație, dar nu e într-o pereche bine formată: declarație incompletă. */
const SEAMANA_DECLARATIE = /freza iese din foaie|iesire mm/i;
/**
 * Cât poate diferi o latură declarată de cea măsurată. Aplicația socotește pe geometria exactă, poarta pe cotele
 * rotunjite la 3 zecimale, cu margini exacte: capătul unei drepte ±0.0005 pe axă; vârful unui arc ±0.0017 (startul
 * ±0.0005, I/J ±0.0005, raza din I/J ±0.0007); declarația însăși ±0.0005. Pe o rampă, Z rotunjit mută trecerea prin
 * fața de sus cu panta × 0.0005. Nu se strânge: arcele ajung la 0.0022, iar rampele lungi trec de 0.003.
 */
const TOL_DECLARATIE = 0.005;

const LATURI = ['st', 'dr', 'jos', 'sus'] as const;
type Laturi = { readonly [l in (typeof LATURI)[number]]: number };

/** Cât trece discul sculei peste fiecare latură a foii, cu centrul în cutia dată (un punct: cutia lui). */
function depasire(c: { minX: number; maxX: number; minY: number; maxY: number }, R: number, W: number, H: number): Laturi {
  return { st: Math.max(0, R - c.minX), dr: Math.max(0, c.maxX + R - W), jos: Math.max(0, R - c.minY), sus: Math.max(0, c.maxY + R - H) };
}

type Cutie = { minX: number; maxX: number; minY: number; maxY: number };

function cutiaPunctelor(puncte: readonly Punct3[]): Cutie {
  const xs = puncte.map((p) => p[0]), ys = puncte.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

const uneste = (a: Cutie, b: Cutie): Cutie =>
  ({ minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY) });

/** Laturile pe care discul iese, cu cât: „st 2.000 mm, sus 1.000 mm”. */
const descrie = (d: Laturi, iese: readonly (typeof LATURI)[number][]): string => iese.map((l) => `${l} ${d[l].toFixed(3)} mm`).join(', ');

/** Ridicarea pe verticală (X și Y neschimbate, Z crește): scula trece doar prin locul pe care îl ocupa deja. */
const ridicareVerticala = (m: Mutare): boolean => m.startCunoscut && m.a[0] === m.b[0] && m.a[1] === m.b[1] && m.b[2] > m.a[2];

type PerecheDeclarata = { readonly linia: number; readonly laturi: Laturi };

/**
 * Perechile bine formate (A singură pe linie, B singură pe linia imediat următoare) și comentariile care seamănă cu o
 * declarație fără să fie într-o astfel de pereche.
 */
function citesteDeclaratia(comentarii: readonly Comentariu[]): { perechi: PerecheDeclarata[]; razlete: Comentariu[] } {
  const singure = new Map<number, string>();
  for (const c of comentarii) if (c.singur) singure.set(c.linia, c.text);
  const perechi: PerecheDeclarata[] = [];
  const folosite = new Set<number>();
  for (const [linia, text] of singure) {
    if (text !== DECLARATIE_A) continue;
    const b = DECLARATIE_B.exec(singure.get(linia + 1) ?? '');
    if (!b) continue;
    perechi.push({ linia, laturi: { st: Number(b[1]), dr: Number(b[2]), jos: Number(b[3]), sus: Number(b[4]) } });
    folosite.add(linia).add(linia + 1);
  }
  const razlete = comentarii.filter((c) => SEAMANA_DECLARATIE.test(c.text) && !folosite.has(c.linia));
  return { perechi, razlete };
}

/** Mașină → document, pe hârtie: colțul de origine e o translație, Z0 jos ridică totul cu grosimea. */
function laDocument(p: Punct3, ctx: ContextPoarta): Punct3 {
  const ox = ctx.origine === 'dreapta-jos' || ctx.origine === 'dreapta-sus' ? ctx.foaie.latime : 0;
  const oy = ctx.origine === 'dreapta-sus' || ctx.origine === 'stanga-sus' ? ctx.foaie.inaltime : 0;
  return [p[0] + ox, p[1] + oy, p[2] - (ctx.z0 === 'jos' ? ctx.foaie.grosime : 0)];
}

export function poarta(text: string, ctx: ContextPoarta): Incalcare[] {
  const rez: Incalcare[] = [];
  const { evenimente, probleme, comentarii } = citeste(text);
  for (const p of probleme) rez.push({ invarianta: 6, linia: p.linia, mesaj: p.mesaj });

  const { latime: W, inaltime: H, grosime: T } = ctx.foaie;
  const R = ctx.diametruScula / 2;
  const celula = Math.min(0.25, ctx.diametruScula / 24);
  const nx = Math.ceil(W / celula), ny = Math.ceil(H / celula);
  const g = new Float64Array(nx * ny); // suprafața materialului, 0 = fața de sus
  const pasEsantion = celula / 4;

  /** Pentru fiecare celulă sub discul sculei centrat în (x, y): `f(indice)`. */
  const subScula = (x: number, y: number, f: (k: number) => void): void => {
    const i0 = Math.max(0, Math.floor((x - R) / celula)), i1 = Math.min(nx - 1, Math.floor((x + R) / celula));
    const j0 = Math.max(0, Math.floor((y - R) / celula)), j1 = Math.min(ny - 1, Math.floor((y + R) / celula));
    for (let j = j0; j <= j1; j++) {
      const dy = (j + 0.5) * celula - y;
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * celula - x;
        if (dx * dx + dy * dy <= R * R) f(j * nx + i);
      }
    }
  };

  let axPornit = false;
  let axGata = false;
  /** Cutia centrului sculei pe partea de sub fața de sus a mișcărilor G1/G2/G3, în document: invariantele 5 și 8. */
  let cutie: Cutie | null = null;
  /** Linia primei mișcări de tăiere: declarația de ieșire trebuie să vină înaintea ei. */
  let primaTaiere: number | null = null;
  /** Linia primei mișcări de tăiere al cărei disc trece de o margine a foii. */
  let primaIesire = 0;

  for (const e of evenimente) {
    if (e.tip === 'ax') {
      axPornit = e.pornit && e.turatie > 0;
      axGata = false;
      continue;
    }
    if (e.tip === 'pauza') {
      if (axPornit && e.secunde >= ctx.asteptareAx - TOL) axGata = true;
      continue;
    }
    const m: Mutare = e.m;
    if (m.cod === 2 || m.cod === 3) {
      const { eroare33, unghi } = regulaArcGrbl(m);
      if (eroare33) rez.push({ invarianta: 6, linia: m.linia, mesaj: 'arcul dă error:33 după rotunjire' });
      if (Math.abs(unghi) > Math.PI + 1e-6) rez.push({ invarianta: 6, linia: m.linia, mesaj: `arc de ${(Math.abs(unghi) * 180 / Math.PI).toFixed(1)}° pe un bloc (cerc fals?)` });
    }
    // Cu startul necunoscut (prima mișcare a programului), doar capătul e o poziție sigură.
    const puncte = (m.startCunoscut ? esantioane(m, pasEsantion) : [m.b]).map((p) => laDocument(p, ctx));
    const inMaterial = puncte.some((p) => p[2] < -TOL);
    if (m.cod !== 0 && inMaterial && primaTaiere === null) primaTaiere = m.linia;

    // 7: nicio tăiere cu axul oprit sau înainte de pauza de pornire.
    if (m.cod !== 0 && inMaterial && !(axPornit && axGata)) {
      rez.push({ invarianta: 7, linia: m.linia, mesaj: axPornit ? 'tăiere înaintea pauzei de pornire a axului' : 'tăiere cu axul oprit' });
    }
    // Partea de sub fața de sus, mărginită exact (trecerea prin fața de sus, punctele cardinale ale arcelor).
    const margini = marginiSubSuprafata(m, (p) => laDocument(p, ctx), TOL);
    if (margini.length) {
      const c = cutiaPunctelor(margini);
      const d = depasire(c, R, W, H);
      const iese = LATURI.filter((l) => d[l] > TOL_ROTUNJIRE);
      if (m.cod !== 0) {
        cutie = cutie ? uneste(cutie, c) : c;
        if (iese.length && primaIesire === 0) primaIesire = m.linia;
      } else if (iese.length && !ridicareVerticala(m)) {
        // 5: o rapidă sub fața de sus cu discul în afara foii intră orbește lângă foaie (prinderi); nicio declarație n-o
        // permite. Ridicarea pe verticală din tăietură e scutită: trece doar prin locul pe care scula îl ocupa deja.
        rez.push({ invarianta: 5, linia: m.linia, mesaj: `rapidă sub fața de sus în afara foii: ${descrie(d, iese)}` });
      }
    }

    let maxScos = 0;
    let atingeRapid = false;
    for (const [x, y, z] of puncte) {
      // 5, Z: nu sub fața de jos (plus supracursa permisă). Ieșirea în XY se judecă pe tot programul, după buclă.
      if (z < -(T + ctx.supracursa) - TOL) {
        rez.push({ invarianta: 5, linia: m.linia, mesaj: `Z ${z.toFixed(3)} trece sub fața de jos (grosimea ${T}, supracursa ${ctx.supracursa})` });
        break;
      }
      if (z >= -TOL) continue;
      if (m.cod === 0) {
        subScula(x, y, (k) => { if (z < (g[k] ?? 0) - TOL_ROTUNJIRE) atingeRapid = true; });
      } else {
        subScula(x, y, (k) => {
          const sus = g[k] ?? 0;
          if (sus - z > maxScos) maxScos = sus - z;
          if (z < sus) g[k] = z;
        });
      }
    }
    // 1: pasul.
    if (maxScos > ctx.pas + TOL_ROTUNJIRE) rez.push({ invarianta: 1, linia: m.linia, mesaj: `o trecere scoate ${maxScos.toFixed(3)} mm (pasul ${ctx.pas})` });
    // 3: nicio rapidă prin material.
    if (atingeRapid) rez.push({ invarianta: 3, linia: m.linia, mesaj: 'G0 prin material' });
  }

  // 5, XY: ieșirea din foaie, pe tot programul. Cel mult o încălcare, cu toate motivele ei.
  const iesire: Laturi = cutie ? depasire(cutie, R, W, H) : { st: 0, dr: 0, jos: 0, sus: 0 };
  const iese = LATURI.filter((l) => iesire[l] > TOL_ROTUNJIRE);
  const { perechi, razlete } = citesteDeclaratia(comentarii);
  const motive: string[] = [];
  let liniaMotivului = 0;
  const motiv = (linia: number, mesaj: string): void => {
    if (motive.length === 0) liniaMotivului = linia;
    motive.push(mesaj);
  };
  for (const c of razlete) motiv(c.linia, `declarație de ieșire incompletă: linia ${c.linia} „${c.text}”`);
  if (perechi.length > 1) motiv(perechi[1]?.linia ?? 0, `declarația de ieșire apare de ${perechi.length} ori`);
  for (const p of perechi) {
    // Linia B (p.linia + 1) e doar comentariu, deci nu poate fi chiar linia primei tăieri.
    if (primaTaiere !== null && p.linia + 1 > primaTaiere) motiv(p.linia, `declarația vine după prima tăiere (linia ${primaTaiere})`);
    // Aplicația declară doar când o latură trece de 0.0005 mm, deci măcar o cotă se rotunjește la ≥ 0.001.
    if (LATURI.every((l) => p.laturi[l] === 0)) motiv(p.linia, 'declarație de ieșire goală: toate laturile 0.000');
    const gresite = LATURI.filter((l) => Math.abs(p.laturi[l] - iesire[l]) > TOL_DECLARATIE);
    if (gresite.length) {
      const cat = gresite.map((l) => `${l} declarat ${p.laturi[l].toFixed(3)}, măsurat ${iesire[l].toFixed(3)}`).join(', ');
      motiv(p.linia, `declarația de ieșire nu corespunde: ${cat}`);
    }
  }
  if (perechi.length === 0 && iese.length) {
    motiv(primaIesire, `tăiere în afara foii, nedeclarată: ${descrie(iesire, iese)}`);
  }
  if (motive.length) rez.push({ invarianta: 5, linia: liniaMotivului, mesaj: motive.join('; ') });

  // 8: cadrul, pe hârtie.
  if (ctx.cadru) {
    const c = cutie;
    const ok = c !== null
      && Math.abs(c.minX - ctx.cadru.minX) <= TOL_ROTUNJIRE && Math.abs(c.maxX - ctx.cadru.maxX) <= TOL_ROTUNJIRE
      && Math.abs(c.minY - ctx.cadru.minY) <= TOL_ROTUNJIRE && Math.abs(c.maxY - ctx.cadru.maxY) <= TOL_ROTUNJIRE;
    if (!ok) {
      const gasit = c ? `${c.minX.toFixed(3)}…${c.maxX.toFixed(3)} × ${c.minY.toFixed(3)}…${c.maxY.toFixed(3)}` : 'nicio tăiere';
      rez.push({ invarianta: 8, linia: 0, mesaj: `cadrul tăieturilor în document e ${gasit}, nu cel de pe hârtie` });
    }
  }
  return rez;
}
