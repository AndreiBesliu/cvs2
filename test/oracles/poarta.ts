/**
 * POARTA INVARIANTELOR (`PLAN.md` §4.2), cu ZERO importuri din `src/`. Rulează pe textul oricărui program generat de un
 * test. În etapa 1 intră invariantele 1, 3, 5, 6, 7 și 8; a 2-a vine în etapa 2, a 4-a în etapa 18.
 *
 * Materialul e un câmp de înălțimi pe celule (ca oracolul din s4): fiecare mișcare se eșantionează des, iar sub discul
 * sculei se citește cât material scoate (invarianta 1) sau dacă o rapidă îl atinge (invarianta 3).
 */
import { citeste, esantioane, regulaArcGrbl, type Mutare, type Punct3 } from './gcode.ts';

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

/** Mașină → document, pe hârtie: colțul de origine e o translație, Z0 jos ridică totul cu grosimea. */
function laDocument(p: Punct3, ctx: ContextPoarta): Punct3 {
  const ox = ctx.origine === 'dreapta-jos' || ctx.origine === 'dreapta-sus' ? ctx.foaie.latime : 0;
  const oy = ctx.origine === 'dreapta-sus' || ctx.origine === 'stanga-sus' ? ctx.foaie.inaltime : 0;
  return [p[0] + ox, p[1] + oy, p[2] - (ctx.z0 === 'jos' ? ctx.foaie.grosime : 0)];
}

export function poarta(text: string, ctx: ContextPoarta): Incalcare[] {
  const rez: Incalcare[] = [];
  const { evenimente, probleme } = citeste(text);
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
  let cutie: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

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

    // 7: nicio tăiere cu axul oprit sau înainte de pauza de pornire.
    if (m.cod !== 0 && inMaterial && !(axPornit && axGata)) {
      rez.push({ invarianta: 7, linia: m.linia, mesaj: axPornit ? 'tăiere înaintea pauzei de pornire a axului' : 'tăiere cu axul oprit' });
    }
    let maxScos = 0;
    let atingeRapid = false;
    for (const [x, y, z] of puncte) {
      // 5: limitele: nu sub fața de jos (plus supracursa permisă), nu în afara foii cât taie.
      if (z < -(T + ctx.supracursa) - TOL) {
        rez.push({ invarianta: 5, linia: m.linia, mesaj: `Z ${z.toFixed(3)} trece sub fața de jos (grosimea ${T}, supracursa ${ctx.supracursa})` });
        break;
      }
      if (z < -TOL && (x < -R - TOL_ROTUNJIRE || x > W + R + TOL_ROTUNJIRE || y < -R - TOL_ROTUNJIRE || y > H + R + TOL_ROTUNJIRE)) {
        rez.push({ invarianta: 5, linia: m.linia, mesaj: `tăiere în afara foii: (${x.toFixed(3)}, ${y.toFixed(3)})` });
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
        cutie = cutie
          ? { minX: Math.min(cutie.minX, x), maxX: Math.max(cutie.maxX, x), minY: Math.min(cutie.minY, y), maxY: Math.max(cutie.maxY, y) }
          : { minX: x, maxX: x, minY: y, maxY: y };
      }
    }
    // 1: pasul.
    if (maxScos > ctx.pas + TOL_ROTUNJIRE) rez.push({ invarianta: 1, linia: m.linia, mesaj: `o trecere scoate ${maxScos.toFixed(3)} mm (pasul ${ctx.pas})` });
    // 3: nicio rapidă prin material.
    if (atingeRapid) rez.push({ invarianta: 3, linia: m.linia, mesaj: 'G0 prin material' });
  }

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
