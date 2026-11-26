import { felCunoscut, PUNCTE_COTA, TOLERANTA_MAXIMA } from './cote.ts';
import { PLAFON, type Document } from './document.ts';
import { inregistreazaJudecataCote } from './schemaDocument.ts';
// Dezlegarea cotelor în jurnal (ADR 0330 §3) vine odată cu judecata: orice document cu cote trece întâi pe aici.
import './jurnalCote.ts';

/**
 * Judecata cotelor foilor (ADR 0330 §2), partea ușii adusă la cerere: doar pentru un document cu cote la pornire
 * (`proiectLocal.ts`), mereu în ușa întreagă (`incarcare.ts`) și cu modulul cotelor. Se înregistrează în `schemaDocument.ts`
 * când e importată: fără ea, acolo un document cu cote nu trece. Judecă documentul BRUT (ca literele plăcuțelor): o cotă e un
 * obiect cu `id` (unic pe foaie) și `fel`; una cu un fel cunoscut are punctele felului, linia și, la cerere, textul, iar
 * fiecare ancoră e un punct finit, cu legătura ei în forma ei; toleranța, dacă e, are abaterile în margini (felia
 * 10.4↑e-1). Legătura nu trebuie să ducă la o formă existentă: o cotă dezlegată (forma ștearsă, chiar de o versiune care nu
 * știe de cote) rămâne bună. O cotă cu un fel necunoscut (a unei versiuni mai noi) se păstrează neatinsă. Câmpurile
 * necunoscute nu se judecă.
 */

type Brut = Record<string, unknown>;
const obiect = (x: unknown): x is Brut => typeof x === 'object' && x !== null && !Array.isArray(x);
const text = (x: unknown, max: number): boolean => typeof x === 'string' && x.length > 0 && x.length <= max;
const intreg = (x: unknown, de: number, la: number): boolean => typeof x === 'number' && Number.isInteger(x) && x >= de && x <= la;
const inPlafon = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= PLAFON.translatie;
const FELURI_LOC = ['varf', 'mijloc', 'centru', 'cadran', 'cutie'];

function problemaLoc(loc: unknown): string | null {
  if (!obiect(loc)) return 'loc nu e un obiect';
  const fel = loc['fel'];
  if (typeof fel !== 'string' || !FELURI_LOC.includes(fel)) return `loc.fel e unul din ${FELURI_LOC.join(', ')}`;
  if (fel === 'cutie') return intreg(loc['i'], 0, 8) ? null : 'loc.i e un întreg de la 0 la 8';
  if (!intreg(loc['k'], 0, PLAFON.noduri - 1)) return `loc.k e un întreg de la 0 la ${PLAFON.noduri - 1}`;
  if (fel === 'cadran' && !intreg(loc['q'], 0, 3)) return 'loc.q e un întreg de la 0 la 3';
  return null;
}

function problemaAncora(a: unknown): string | null {
  if (!obiect(a)) return 'nu e un obiect';
  if (!inPlafon(a['x'])) return `x nu e un număr finit în ±${PLAFON.translatie}`;
  if (!inPlafon(a['y'])) return `y nu e un număr finit în ±${PLAFON.translatie}`;
  if (!Object.hasOwn(a, 'legatura')) return null;
  const l = a['legatura'];
  if (!obiect(l)) return 'legătura nu e un obiect';
  if (!text(l['instanta'], PLAFON.idLungime)) return `legătura.instanta nu e un id de cel mult ${PLAFON.idLungime} de caractere`;
  if (!text(l['nod'], PLAFON.idLungime)) return `legătura.nod nu e un id de cel mult ${PLAFON.idLungime} de caractere`;
  if (!intreg(l['n'], 0, PLAFON.noduri)) return `legătura.n e numărul de segmente, un întreg de la 0 la ${PLAFON.noduri}`;
  const p = problemaLoc(l['loc']);
  return p ? `legătura.${p}` : null;
}

/**
 * Lungimea (felia 10.4↑e-2): capătul, dacă e legat, la mijlocul unei laturi; direcția etichetei (`linie.u`, grade, în ±360);
 * `pe`, dacă e, „contur”; ultima lungime văzută (`urma`), dacă e, un număr finit nenegativ și dacă latura e curbă.
 */
function problemaLungime(c: Brut, linie: Brut): string | null {
  const l = (c['puncte'] as Brut[])[0]?.['legatura'];
  if (obiect(l) && obiect(l['loc']) && l['loc']['fel'] !== 'mijloc') return 'o lungime e legată la mijlocul unei laturi (loc.fel e mijloc)';
  const u = linie['u'];
  if (typeof u !== 'number' || !Number.isFinite(u) || Math.abs(u) > 360) return 'linie.u e direcția etichetei, în grade (±360)';
  if (Object.hasOwn(c, 'pe') && c['pe'] !== 'contur') return 'pe e „contur”, sau lipsește (latura)';
  if (Object.hasOwn(c, 'urma')) {
    const m = c['urma'];
    if (!obiect(m) || !inPlafon(m['l']) || (m['l'] as number) < 0 || typeof m['curba'] !== 'boolean') {
      return `urma are l, un număr finit de la 0 la ${PLAFON.translatie}, și curba, adevărat sau fals`;
    }
  }
  return null;
}

function problemaCota(c: Brut): string | null {
  const fel = c['fel'];
  if (typeof fel !== 'string') return '`fel` lipsește sau nu e un text';
  if (!felCunoscut(fel)) return null;
  const puncte = c['puncte'];
  if (!Array.isArray(puncte)) return '`puncte` nu e o listă';
  const n = PUNCTE_COTA[fel];
  if (!n.includes(puncte.length)) return `o cotă ${fel} are ${n.join(' sau ')} puncte, nu ${puncte.length}`;
  for (const [k, a] of puncte.entries()) {
    const p = problemaAncora(a);
    if (p) return `punctul ${k}: ${p}`;
  }
  const linie = c['linie'];
  if (!obiect(linie)) return '`linie` lipsește sau nu e un obiect';
  if (!inPlafon(linie['d'])) return `linie.d nu e un număr finit în ±${PLAFON.translatie}`;
  for (const s of ['s1', 's2']) {
    if (Object.hasOwn(linie, s) && linie[s] !== 1 && linie[s] !== -1) return `linie.${s} e 1 sau −1`;
  }
  if (fel === 'lungime') {
    const p = problemaLungime(c, linie);
    if (p) return p;
  }
  if (Object.hasOwn(c, 'text') && (typeof c['text'] !== 'string' || c['text'].length > PLAFON.numeLungime)) {
    return `text nu e un text de cel mult ${PLAFON.numeLungime} de caractere`;
  }
  // Toleranța (felia 10.4↑e-1): abaterile, numere finite în ±TOLERANTA_MAXIMA, cea de sus nu sub cea de jos.
  if (Object.hasOwn(c, 'toleranta')) {
    const t = c['toleranta'];
    const abatere = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= TOLERANTA_MAXIMA;
    if (!obiect(t) || !abatere(t['sus']) || !abatere(t['jos'])) return `toleranta are sus și jos, numere finite în ±${TOLERANTA_MAXIMA}`;
    if ((t['sus'] as number) < (t['jos'] as number)) return 'toleranta.sus e sub toleranta.jos';
  }
  return null;
}

/** Problema cotelor documentului, sau null. Pe documentul brut: o listă goală sau lipsă trece fără nimic de judecat. */
export function judecaCote(d: Document): string | null {
  for (const f of d.foi) {
    if (!Object.hasOwn(f, 'cote')) continue;
    const cote: unknown = f['cote'];
    if (!Array.isArray(cote)) return `foaia ${f.id}: \`cote\` nu e o listă`;
    if (cote.length > PLAFON.cote) return `foaia ${f.id} are ${cote.length} de cote; cel mult ${PLAFON.cote} pe foaie`;
    const ids = new Set<string>();
    for (const [k, c] of cote.entries()) {
      if (!obiect(c)) return `foaia ${f.id}: cota ${k} nu e un obiect`;
      const id = c['id'];
      if (!text(id, PLAFON.idLungime)) return `foaia ${f.id}: cota ${k} n-are un id de cel mult ${PLAFON.idLungime} de caractere`;
      if (ids.has(id as string)) return `foaia ${f.id} are două cote cu id-ul ${id as string}`;
      ids.add(id as string);
      const p = problemaCota(c);
      if (p) return `foaia ${f.id}, cota ${id as string}: ${p}`;
    }
  }
  return null;
}

inregistreazaJudecataCote(judecaCote);
