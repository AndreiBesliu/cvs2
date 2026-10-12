/**
 * Ușa SVG (ADR 0035): octeții unui fișier → căile închise, în mm, cu Y în sus și pagina cu colțul stânga-jos în origine,
 * plus raportul. Inertă: `DOMParser` fără context de navigare, nimic atașat, nimic încărcat, doar atribute citite;
 * matricile și unitățile le socotește ușa.
 */
import { arieCuSemn, LINIE, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import { cutieContur } from '../geom/cutie.ts';
import { inRegiune } from '../geom/distanta.ts';
import { arcEliptic, bucatiArcEliptic } from '../geom/elipsa.ts';
import { aplica, compune, determinantNormat, esteSimilitudine, type Matrice } from '../geom/matrice.ts';
import { indexCutii } from '../geom/offset.ts';
import { TOLERANTA_IMPORT } from '../geom/toleranta.ts';
import { PLAFON } from '../model/document.ts';
import { citesteDateCale, citesteLungime, citestePuncte, citesteStil, citesteTransform, type ComandaCale } from './svgDate.ts';

import { CODURI_AVERTISMENT, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz } from './svgCoduri.ts';

export {
  CODURI_AVERTISMENT, CODURI_ENTITATI, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz,
} from './svgCoduri.ts';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** O cale închisă a fișierului, în mm, pe pagină. `forma` e indexul formei SVG din care vine, în ordinea documentului. */
export type CaleSvg = { readonly varfuri: readonly Varf[]; readonly forma: number; readonly nume?: string };

export type RezultatSvg =
  | {
    readonly ok: true;
    readonly cai: readonly CaleSvg[];
    /** Mărimea paginii în mm, sau null dacă fișierul n-o declară (ADR 0035 §2). */
    readonly pagina: { readonly latime: number; readonly inaltime: number } | null;
    /** Maparea depinde de `pxPeTol` (pagina fără mărime absolută, sau fără `viewBox`). */
    readonly px: boolean;
    /** Comentariul din fișier spune că l-a scris Illustrator. */
    readonly illustrator: boolean;
    readonly avertismente: Avertismente;
  }
  | { readonly ok: false; readonly cod: CodRefuz; readonly detaliu?: string; readonly avertismente?: Avertismente };

/** Parserul XML: `DOMParser` în browser; în teste, unul injectat (`@xmldom/xmldom`). */
export type ParserXml = { parseFromString(text: string, tip: 'image/svg+xml'): Document };

/** `limba`: limba aplicației, pentru `systemLanguage` din `switch` (implicit `en`). */
export type OptiuniSvg = { readonly pxPeTol?: 96 | 72; readonly parser?: ParserXml; readonly limba?: string };

/* ── Intrarea: octeții, arhiva, entitățile ─────────────────────────────────────────────────────────────────────────── */

/**
 * Entitățile XML, judecate pe text înaintea parserului (ADR 0035 §1): nicio entitate parametru sau externă, nicio valoare
 * cu `&` sau `<`, nicio valoare implicită în `<!ATTLIST>`, iar expansiunea (aparițiile × lungimea) cel mult cât plafonul
 * de octeți. Codul motivului (fără text din fișier), sau null.
 */
export function problemaEntitati(text: string): CodEntitati | null {
  // Valorile implicite din <!ATTLIST> se pun pe fiecare element (Edge le aplică): o amplificare pe care numărătoarea
  // entităților n-o vede (recenzia 2.7c). O declarație cu o valoare literală se refuză; #IMPLIED / #REQUIRED trec.
  for (let de = text.indexOf('<!ATTLIST'); de >= 0;) {
    const sfarsit = text.indexOf('>', de);
    if (sfarsit < 0) break;
    const declaratie = text.slice(de, sfarsit);
    if (declaratie.includes('"') || declaratie.includes("'")) return 'attlist';
    de = text.indexOf('<!ATTLIST', sfarsit);
  }
  const valori = new Map<string, string>();
  let declaratii = 0;
  let de = text.indexOf('<!ENTITY');
  while (de >= 0) {
    let i = de + '<!ENTITY'.length;
    const spatiu = (): void => { while (i < text.length && /[\t\n\r ]/.test(text[i] ?? '')) i++; };
    spatiu();
    if (text[i] === '%') return 'parametru';
    const nume = /^[^\s"'>%&;]+/.exec(text.slice(i, i + 256))?.[0];
    if (!nume) return 'fara-nume';
    i += nume.length;
    spatiu();
    const ghilimea = text[i];
    if (ghilimea !== '"' && ghilimea !== "'") return 'externa';
    const sfarsit = text.indexOf(ghilimea, i + 1);
    if (sfarsit < 0) return 'neterminata';
    const valoare = text.slice(i + 1, sfarsit);
    if (/[&<]/.test(valoare)) return 'valoare';
    // XML 1.0 §4.2 (și Edge): la o declarație dublă contează prima (recenzia 2.7c: ultima ascundea o valoare uriașă).
    if (!valori.has(nume)) valori.set(nume, valoare);
    if (++declaratii > PLAFON_IMPORT.entitati) return 'numar';
    de = text.indexOf('<!ENTITY', sfarsit);
  }
  let expandat = 0;
  for (const [nume, valoare] of valori) {
    const ref = `&${nume};`;
    let aparitii = 0;
    for (let i = text.indexOf(ref); i >= 0; i = text.indexOf(ref, i + ref.length)) aparitii++;
    expandat += aparitii * valoare.length;
    if (expandat > PLAFON_IMPORT.octeti) return 'expansiune';
  }
  return null;
}

/* ── Unitățile, pagina, stilurile ──────────────────────────────────────────────────────────────────────────────────── */

const MM: Readonly<Record<string, number>> = { mm: 1, cm: 10, q: 0.25, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6 };

/** O lungime absolută în mm (`px` și fără unitate: la `pxPeTol`), sau null pentru procente, em, ex și ce nu se citește. */
function lungimeMm(text: string | null, pxPeTol: number): number | null {
  const l = citesteLungime(text);
  if (!l) return null;
  if (l.unitate === '' || l.unitate === 'px') return (l.valoare * 25.4) / pxPeTol;
  const k = MM[l.unitate];
  return k === undefined ? null : l.valoare * k;
}

/** Un atribut de lungime al unei forme, în unități utilizator (CSS: 96 px pe țol), `undefined` dacă lipsește, null dacă nu se poate citi. */
function lungimeUtilizator(el: Element, nume: string): number | null | undefined {
  const text = el.getAttribute(nume);
  if (text === null) return undefined;
  const l = citesteLungime(text);
  if (!l) return null;
  if (l.unitate === '' || l.unitate === 'px') return l.valoare;
  const k = MM[l.unitate];
  return k === undefined ? null : (l.valoare * k * 96) / 25.4;
}

type Stil = { readonly display: string | null; readonly visibility: string | null; readonly fillRule: string | null };

function stilElement(el: Element): Stil {
  const s = citesteStil(el.getAttribute('style'));
  const prop = (nume: string): string | null => (s.get(nume) ?? el.getAttribute(nume))?.trim().toLowerCase() ?? null;
  return { display: prop('display'), visibility: prop('visibility'), fillRule: prop('fill-rule') };
}

/** Maparea `viewBox` → viewport (SVG 2 §8.2), cu `preserveAspectRatio`. Viewport-ul are mărimea (w, h), în mm. */
function mapareViewBox(vb: readonly [number, number, number, number], w: number, h: number, par: string | null): Matrice {
  const [vx, vy, vw, vh] = vb;
  let sx = w / vw;
  let sy = h / vh;
  const m = /^\s*(?:defer\s+)?(none|x(Min|Mid|Max)Y(Min|Mid|Max))(?:\s+(meet|slice))?\s*$/.exec(par ?? '');
  const aliniere = m ? m[1] : 'xMidYMid';
  if (aliniere !== 'none') {
    const s = (m?.[4] ?? 'meet') === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy);
    sx = s;
    sy = s;
  }
  let tx = -vx * sx;
  let ty = -vy * sy;
  const ax = m?.[2] ?? 'Mid';
  const ay = m?.[3] ?? 'Mid';
  if (aliniere !== 'none') {
    if (ax === 'Mid') tx += (w - vw * sx) / 2;
    else if (ax === 'Max') tx += w - vw * sx;
    if (ay === 'Mid') ty += (h - vh * sy) / 2;
    else if (ay === 'Max') ty += h - vh * sy;
  }
  return { a: sx, b: 0, c: 0, d: sy, e: tx, f: ty };
}

/* ── Geometria formelor, în unitățile lor ──────────────────────────────────────────────────────────────────────────── */

/** O subcale în coordonatele formei: comenzile de la M încolo, și dacă se termină cu Z. */
type SubcaleLocala = { start: Punct; comenzi: ComandaCale[]; z: boolean };

function subcai(comenzi: readonly ComandaCale[]): SubcaleLocala[] {
  const rez: SubcaleLocala[] = [];
  let cur: SubcaleLocala | null = null;
  for (const c of comenzi) {
    if (c.tip === 'M') {
      cur = { start: c.p, comenzi: [], z: false };
      rez.push(cur);
    } else if (c.tip === 'Z') {
      if (cur) cur.z = true;
      cur = null;
    } else if (cur) {
      cur.comenzi.push(c);
    }
  }
  return rez;
}


/**
 * `rx` / `ry` ca în Edge (recenzia 2.7c): un atribut necitibil (și „auto” scris ca atribut) e 0, iar unul negativ e lipsă
 * (ia valoarea celuilalt).
 */
const raza = (v: number | null | undefined): number | undefined => (v === null ? 0 : v !== undefined && v < 0 ? undefined : v);

/** Geometria unei forme ca date de cale, sau un motiv pentru care se sare: `tacut` (SVG n-o desenează), `invalid`. */
function dateForma(el: Element, tip: string): { comenzi: ComandaCale[]; eroare: boolean } | 'tacut' | 'invalid' {
  const L = (nume: string): number | null | undefined => lungimeUtilizator(el, nume);
  if (tip === 'path') {
    const d = citesteDateCale(el.getAttribute('d') ?? '');
    return { comenzi: [...d.comenzi], eroare: d.eroare };
  }
  if (tip === 'polyline' || tip === 'polygon') {
    const { puncte, eroare } = citestePuncte(el.getAttribute('points') ?? '');
    const comenzi: ComandaCale[] = puncte.map((p, i) => ({ tip: i === 0 ? 'M' : 'L', p }) as ComandaCale);
    if (tip === 'polygon' && comenzi.length > 0) comenzi.push({ tip: 'Z' });
    return { comenzi, eroare };
  }
  if (tip === 'line') {
    const [x1, y1, x2, y2] = [L('x1'), L('y1'), L('x2'), L('y2')];
    if (x1 === null || y1 === null || x2 === null || y2 === null) return 'invalid';
    return { comenzi: [{ tip: 'M', p: { x: x1 ?? 0, y: y1 ?? 0 } }, { tip: 'L', p: { x: x2 ?? 0, y: y2 ?? 0 } }], eroare: false };
  }
  if (tip === 'rect') {
    const [x, y, w, h] = [L('x'), L('y'), L('width'), L('height')];
    if (x === null || y === null || w === null || h === null) return 'invalid';
    if ((w ?? 0) < 0 || (h ?? 0) < 0) return 'invalid';
    if (!w || !h) return 'tacut';
    const x0 = x ?? 0;
    const y0 = y ?? 0;
    let [rx, ry] = [raza(L('rx')), raza(L('ry'))];
    rx ??= ry;
    ry ??= rx;
    const rxx = Math.min(rx ?? 0, w / 2);
    const ryy = Math.min(ry ?? 0, h / 2);
    if (rxx === 0 || ryy === 0) {
      return { comenzi: [
        { tip: 'M', p: { x: x0, y: y0 } }, { tip: 'L', p: { x: x0 + w, y: y0 } }, { tip: 'L', p: { x: x0 + w, y: y0 + h } },
        { tip: 'L', p: { x: x0, y: y0 + h } }, { tip: 'Z' },
      ], eroare: false };
    }
    // Colțurile, cu centrul și unghiurile știute (sferturi în sensul unghiului crescător al spațiului SVG).
    const a = (x1: number, y1: number, cx: number, cy: number, t1: number): ComandaCale => ({
      tip: 'A', rx: rxx, ry: ryy, rotire: 0, mare: false, pozitiv: true, p: { x: x1, y: y1 },
      exact: { centru: { x: cx, y: cy }, t1, baleiaj: Math.PI / 2 },
    });
    return { comenzi: [
      { tip: 'M', p: { x: x0 + rxx, y: y0 } },
      { tip: 'L', p: { x: x0 + w - rxx, y: y0 } }, a(x0 + w, y0 + ryy, x0 + w - rxx, y0 + ryy, -Math.PI / 2),
      { tip: 'L', p: { x: x0 + w, y: y0 + h - ryy } }, a(x0 + w - rxx, y0 + h, x0 + w - rxx, y0 + h - ryy, 0),
      { tip: 'L', p: { x: x0 + rxx, y: y0 + h } }, a(x0, y0 + h - ryy, x0 + rxx, y0 + h - ryy, Math.PI / 2),
      { tip: 'L', p: { x: x0, y: y0 + ryy } }, a(x0 + rxx, y0, x0 + rxx, y0 + ryy, Math.PI),
      { tip: 'Z' },
    ], eroare: false };
  }
  if (tip === 'circle' || tip === 'ellipse') {
    const [cx, cy] = [L('cx'), L('cy')];
    if (cx === null || cy === null) return 'invalid';
    let rx: number | undefined;
    let ry: number | undefined;
    if (tip === 'circle') {
      const r = L('r');
      if (r === null || (r ?? 0) < 0) return 'invalid';
      rx = r;
      ry = r;
    } else {
      [rx, ry] = [raza(L('rx')), raza(L('ry'))];
      rx ??= ry;
      ry ??= rx;
    }
    if (!rx || !ry) return 'tacut';
    const x = cx ?? 0;
    const y = cy ?? 0;
    // Două jumătăți, cu centrul știut (nu din capete: la 180°, F.6.5 amplifică rotunjirea lui cx ± rx).
    const a = (x1: number, t1: number): ComandaCale => ({
      tip: 'A', rx, ry, rotire: 0, mare: false, pozitiv: true, p: { x: x1, y }, exact: { centru: { x, y }, t1, baleiaj: Math.PI },
    });
    return { comenzi: [{ tip: 'M', p: { x: x + rx, y } }, a(x - rx, 0), a(x + rx, Math.PI), { tip: 'Z' }], eroare: false };
  }
  return 'tacut';
}

/** Centrul arcului SVG (F.6.5, F.6.6), în coordonatele formei; null = capete egale (se omite), 'linie' = o rază 0. */
function arcCentru(p1: Punct, a: Extract<ComandaCale, { tip: 'A' }>):
  null | 'linie' | { cx: number; cy: number; rx: number; ry: number; cos: number; sin: number; t1: number; dt: number } {
  const p2 = a.p;
  if (p1.x === p2.x && p1.y === p2.y) return null;
  let rx = Math.abs(a.rx);
  let ry = Math.abs(a.ry);
  if (rx === 0 || ry === 0) return 'linie';
  if (a.exact) return { cx: a.exact.centru.x, cy: a.exact.centru.y, rx, ry, cos: 1, sin: 0, t1: a.exact.t1, dt: a.exact.baleiaj };
  const phi = ((a.rotire % 360) * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p1.x - p2.x) / 2;
  const dy = (p1.y - p2.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  // Cu razele mărite (Λ ≥ 1), arcul e exact o jumătate, iar centrul e mijlocul coardei: rădăcina e 0 exact, nu zgomotul
  // de √ε al rotunjirii (oracolul 2.7c: un semicerc împărțit în două, centre mutate cu până la 8e-6 mm).
  let co = lam >= 1 ? 0 : Math.sqrt(Math.max(0, num / den));
  if (a.mare === a.pozitiv) co = -co;
  const cxp = (co * rx * y1) / ry;
  const cyp = (-co * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (p1.x + p2.x) / 2;
  const cy = sin * cxp + cos * cyp + (p1.y + p2.y) / 2;
  const ux = (x1 - cxp) / rx;
  const uy = (y1 - cyp) / ry;
  const vx = (-x1 - cxp) / rx;
  const vy = (-y1 - cyp) / ry;
  const t1 = Math.atan2(uy, ux);
  let dt = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!a.pozitiv && dt > 0) dt -= 2 * Math.PI;
  else if (a.pozitiv && dt < 0) dt += 2 * Math.PI;
  return { cx, cy, rx, ry, cos, sin, t1, dt };
}

type Numaratoare = Record<CodAvertisment, number>;

/** Plafonul de lucru al citirii (`PLAFON_IMPORT.varfuriLucru`) a fost atins: citirea se oprește. */
class PestePlafon extends Error {}

/**
 * O subcale a formei, în mm (ADR 0035 §6, §7): vârfurile căii, 'deschisa', 'goala' (un M singur), 'degenerata' (fără arie)
 * sau 'prea-mare' (peste `PLAFON.varfuriCale`: citirea ei se oprește acolo). Liniile și cubicele trec exact prin M; arcele
 * de cerc sub o similitudine rămân arce (împărțite peste 180°), restul devin cubice sub `TOLERANTA_IMPORT`. `lucru` numără
 * vârfurile produse de toată citirea.
 */
function subcaleMm(sc: SubcaleLocala, M: Matrice, sim: boolean, semn: number, n: Numaratoare, lucru: { varfuri: number }):
  Varf[] | 'deschisa' | 'goala' | 'prea-mare' | 'degenerata' {
  const varfuri: Varf[] = [];
  let local = sc.start;
  let cur = aplica(M, sc.start);
  let desenate = 0;
  const adauga = (s: Segment, capat: Punct): void => {
    varfuri.push({ p: cur, s });
    cur = capat;
    if (++lucru.varfuri > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon();
  };
  for (const c of sc.comenzi) {
    if (varfuri.length > PLAFON.varfuriCale) return 'prea-mare';
    if (c.tip === 'M' || c.tip === 'Z') continue;
    desenate++;
    if (c.tip === 'L') {
      if (c.p.x !== local.x || c.p.y !== local.y) adauga(LINIE, aplica(M, c.p));
    } else if (c.tip === 'C') {
      const nul = [c.c1, c.c2, c.p].every((q) => q.x === local.x && q.y === local.y);
      if (!nul) adauga({ tip: 'C', c1: aplica(M, c.c1), c2: aplica(M, c.c2) }, aplica(M, c.p));
    } else {
      const k = arcCentru(local, c);
      if (k === 'linie') {
        adauga(LINIE, aplica(M, c.p));
      } else if (k) {
        const capat = aplica(M, c.p);
        let cubice = !sim || k.rx !== k.ry;
        let plat = false;
        if (!cubice) {
          // Raza în mm, din centrul F.6.5 (bine condiționat), nu din coardă și bulge: aproape de 360°, coarda e minusculă și
          // tan(Δθ/4) uriaș, iar produsul lor ieșea cu altă rază (recenzia 2.7c: 58 mm în loc de 50). Marja de 0,1 % ține
          // arcul departe de plafonul ușii documentului, care îl socotește din coardă.
          const razaMm = k.rx * Math.hypot(M.a, M.b);
          if (!(razaMm <= PLAFON.latura * 0.999)) {
            cubice = true;
            plat = true;
          } else if (Math.abs(k.dt) > Math.PI) {
            // Peste 180°: două jumătăți; mijlocul arcului din centrul lui, în coordonatele formei.
            const tm = k.t1 + k.dt / 2;
            const mij = aplica(M, {
              x: k.cx + k.rx * Math.cos(tm) * k.cos - k.ry * Math.sin(tm) * k.sin,
              y: k.cy + k.rx * Math.cos(tm) * k.sin + k.ry * Math.sin(tm) * k.cos,
            });
            const jum = Math.tan(k.dt / 8) * semn;
            adauga({ tip: 'A', bulge: jum }, mij);
            adauga({ tip: 'A', bulge: jum }, capat);
          } else if (capat.x !== cur.x || capat.y !== cur.y) {
            adauga({ tip: 'A', bulge: Math.tan(k.dt / 4) * semn }, capat);
          }
          // Altfel, capetele unui arc de cel mult o jumătate s-au contopit în mm: n-are lungime, deci se omite.
        }
        if (cubice) {
          // Harta elipsei în mm: M · (centrul, rotirea φ, razele).
          const h = compune(M, { a: k.rx * k.cos, b: k.rx * k.sin, c: -k.ry * k.sin, d: k.ry * k.cos, e: k.cx, f: k.cy });
          // Cubicele se numără înainte să se facă: un arc cât un continent ar cere milioane.
          // Un vârf rămâne pentru linia de închidere (recenzia 2.7c).
          if (!(bucatiArcEliptic(h, k.dt, TOLERANTA_IMPORT) <= PLAFON.varfuriCale - varfuri.length - 1)) return 'prea-mare';
          const lant = arcEliptic(h, k.t1, k.dt, cur, capat, TOLERANTA_IMPORT);
          n[plat ? 'arce-plate' : 'arce-eliptice']++;
          n['cubice-din-arce'] += lant.length;
          for (const q of lant) adauga({ tip: 'C', c1: q.c1, c2: q.c2 }, q.b);
        }
      }
    }
    local = c.p;
  }
  // Un M singur nu e o subcale; cu Z, e una închisă, fără niciun vârf (deci degenerată).
  if (desenate === 0) return sc.z ? 'degenerata' : 'goala';
  const start = aplica(M, sc.start);
  const gol = Math.hypot(cur.x - start.x, cur.y - start.y);
  if (gol > TOLERANTA_IMPORT) {
    if (!sc.z) return varfuri.length > PLAFON.varfuriCale ? 'prea-mare' : 'deschisa';
    varfuri.push({ p: cur, s: LINIE });
  }
  // Plafonul se judecă după linia de închidere (recenzia 2.7c: 50 001 de vârfuri treceau de ușă și opreau tot importul).
  if (varfuri.length > PLAFON.varfuriCale) return 'prea-mare';
  const unic = varfuri[0];
  if (varfuri.length === 1 && unic && unic.s.tip === 'C') return bucla(unic.p, unic.s.c1, unic.s.c2);
  if (varfuri.length < 2) return 'degenerata';
  // Doar linii, toate pe o dreaptă: conturul n-are arie (nici browserul nu-l umple), iar CAM-ul ar refuza toată piesa.
  if (varfuri.every((v) => v.s.tip === 'L') && peODreapta(varfuri)) return 'degenerata';
  return varfuri;
}

/**
 * O buclă dintr-o singură cubică (o picătură desenată dintr-un nod): două jumătăți, împărțite la t = 1/2 (de Casteljau),
 * ca o cale să aibă cel puțin două vârfuri (recenzia 2.7c: era sărită ca „degenerată”).
 */
function bucla(a: Punct, c1: Punct, c2: Punct): Varf[] {
  const mij = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const m01 = mij(a, c1);
  const m12 = mij(c1, c2);
  const m23 = mij(c2, a);
  const m012 = mij(m01, m12);
  const m123 = mij(m12, m23);
  const m = mij(m012, m123);
  return [{ p: a, s: { tip: 'C', c1: m01, c2: m012 } }, { p: m, s: { tip: 'C', c1: m123, c2: m23 } }];
}

/** Toate vârfurile pe dreapta dintre primul și cel mai depărtat de el, până la rotunjire (1e-12 din mărime). */
function peODreapta(v: readonly Varf[]): boolean {
  const a = v[0]?.p;
  if (!a) return true;
  let b = a;
  let dmax = 0;
  for (const x of v) {
    const d = Math.hypot(x.p.x - a.x, x.p.y - a.y);
    if (d > dmax) {
      dmax = d;
      b = x.p;
    }
  }
  if (dmax === 0) return true;
  const ux = (b.x - a.x) / dmax;
  const uy = (b.y - a.y) / dmax;
  return v.every((x) => Math.abs((x.p.x - a.x) * uy - (x.p.y - a.y) * ux) <= 1e-12 * Math.max(dmax, 1));
}

/** E similitudine relativ la scara ei (sub scara 1, toleranța absolută ar lua o elipsă minusculă drept cerc; recenzia 2.7c). */
function similitudine(m: Matrice): boolean {
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  return s > 0 && esteSimilitudine({ a: m.a / s, b: m.b / s, c: m.c / s, d: m.d / s, e: 0, f: 0 });
}

/** `systemLanguage` (SVG 1.1): una din limbi e limba aplicației, sau începe cu ea urmată de „-”. Fără atribut: adevărat. */
function limbaPotrivita(atribut: string | null, limba: string): boolean {
  if (atribut === null) return true;
  return atribut.split(',').map((x) => x.trim().toLowerCase()).some((x) => x !== '' && (x === limba || x.startsWith(`${limba}-`)));
}

/* ── Parcurgerea ───────────────────────────────────────────────────────────────────────────────────────────────────── */

const FORME = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const SARITE: ReadonlyMap<string, CodAvertisment> = new Map([
  ['text', 'sarit-text'], ['use', 'sarit-use'], ['image', 'sarit-image'], ['foreignObject', 'sarit-foreignObject'], ['svg', 'sarit-svg'],
]);

type Cadru = {
  readonly el: Element;
  readonly m: Matrice;
  /** `display: none` pe el sau pe un strămoș. */
  readonly ascuns: boolean;
  readonly vizibil: boolean;
  readonly umplere: string;
};

function copii(el: Element): Element[] {
  const rez: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) rez.push(n as Element);
  return rez;
}

/**
 * Citește un SVG (ADR 0035). Nu aruncă: orice eroare a fișierului e un refuz cu cod sau un avertisment numărat.
 */
export function citesteSvg(octeti: Uint8Array, optiuni: OptiuniSvg = {}): RezultatSvg {
  const pxPeTol = optiuni.pxPeTol ?? 96;
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'octeti', detaliu: String(octeti.length) };
  if (octeti[0] === 0x1f && octeti[1] === 0x8b) return { ok: false, cod: 'svgz' };
  const text = new TextDecoder('utf-8').decode(octeti);
  const entitati = problemaEntitati(text);
  if (entitati) return { ok: false, cod: 'entitati', detaliu: entitati };
  let doc: Document;
  try {
    const parser = optiuni.parser ?? new DOMParser();
    doc = parser.parseFromString(text, 'image/svg+xml');
  } catch (e) {
    return { ok: false, cod: 'parsare', detaliu: e instanceof Error ? e.message : String(e) };
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return { ok: false, cod: 'parsare' };
  const radacina = doc.documentElement;
  if (!radacina || radacina.localName !== 'svg') return { ok: false, cod: 'radacina' };
  const nsRadacina = radacina.namespaceURI;
  if (nsRadacina !== SVG_NS && nsRadacina !== null) return { ok: false, cod: 'radacina' };
  const alNostru = (el: Element): boolean => el.namespaceURI === SVG_NS || (nsRadacina === null && el.namespaceURI === null);

  const n = Object.fromEntries(CODURI_AVERTISMENT.map((c) => [c, 0])) as Numaratoare;
  const illustrator = /<!--[^]{0,2000}?Adobe Illustrator/.test(text.slice(0, 16_384));
  if (doc.getElementsByTagName('style').length > 0) n.stil = 1;
  if (radacina.getAttribute('transform') !== null) n['transformare-radacina'] = 1;

  // Pagina (ADR 0035 §2).
  const vbText = radacina.getAttribute('viewBox');
  let vb: [number, number, number, number] | null = null;
  if (vbText !== null) {
    const v = vbText.trim().split(/[\s,]+/).map(Number);
    const [vx, vy, vw, vh] = v;
    if (v.length === 4 && v.every(Number.isFinite) && vx !== undefined && vy !== undefined && vw !== undefined && vh !== undefined && vw > 0 && vh > 0) {
      vb = [vx, vy, vw, vh];
    } else {
      n['viewbox-invalid'] = 1;
    }
  }
  const pozitiva = (x: number | null): number | null => (x !== null && x > 0 ? x : null);
  const wAbs = pozitiva(lungimeMm(radacina.getAttribute('width'), pxPeTol));
  const hAbs = pozitiva(lungimeMm(radacina.getAttribute('height'), pxPeTol));
  const unitateRadacina = (nume: string): string | null => citesteLungime(radacina.getAttribute(nume))?.unitate ?? null;
  const inPx = (u: string | null): boolean => u === '' || u === 'px';
  const kPx = 25.4 / pxPeTol;
  let latime: number | null = null;
  let inaltime: number | null = null;
  let px: boolean;
  if (vb) {
    // O singură latură absolută: cealaltă din raportul viewBox-ului, ca dimensionarea intrinsecă din browser (recenzia 2.7c:
    // altfel latura lipsă venea în px și scara „meet” micșora desenul de 3,78 ori).
    latime = wAbs ?? (hAbs !== null ? (hAbs * vb[2]) / vb[3] : vb[2] * kPx);
    inaltime = hAbs ?? (wAbs !== null ? (wAbs * vb[3]) / vb[2] : vb[3] * kPx);
    const date = [wAbs !== null ? unitateRadacina('width') : null, hAbs !== null ? unitateRadacina('height') : null].filter((u) => u !== null);
    px = date.length === 0 || date.some(inPx);
  } else {
    // Fără viewBox, unitatea utilizator e 1 px.
    px = true;
    if (wAbs !== null && hAbs !== null) {
      latime = wAbs;
      inaltime = hAbs;
    } else {
      n['pagina-fara-marime'] = 1;
    }
  }
  const viewport = vb && latime !== null && inaltime !== null
    ? mapareViewBox(vb, latime, inaltime, radacina.getAttribute('preserveAspectRatio'))
    : { a: kPx, b: 0, c: 0, d: kPx, e: 0, f: 0 };
  // Y în sus: y_mm = H − y_viewport (pagina fără mărime: y_mm = −y_viewport).
  const intoarce: Matrice = { a: 1, b: 0, c: 0, d: -1, e: 0, f: inaltime ?? 0 };
  const pagina0 = compune(intoarce, viewport);

  const cai: CaleSvg[] = [];
  const limba = (optiuni.limba ?? 'en').toLowerCase();
  /** Subcăile primite ale fiecărei forme cu regula `nonzero` și cu mai multe subcăi: perechile se numără după parcurgere. */
  const deNonzero: Varf[][][] = [];
  const lucru = { varfuri: 0 };
  let primite = 0;
  let indexForma = 0;
  let departe = false;
  const stiva: Cadru[] = [];
  const stilR = stilElement(radacina);
  const radacinaAscunsa = stilR.display === 'none';
  const pune = (parinte: Cadru, el: Element): void => {
    const st = stilElement(el);
    const vizibilitate = st.visibility && st.visibility !== 'inherit' ? st.visibility : null;
    stiva.push({
      el,
      m: parinte.m,
      ascuns: parinte.ascuns || st.display === 'none',
      vizibil: vizibilitate === null ? parinte.vizibil : vizibilitate === 'visible',
      umplere: st.fillRule && st.fillRule !== 'inherit' ? st.fillRule : parinte.umplere,
    });
  };
  const radacinaCadru: Cadru = {
    el: radacina,
    m: pagina0,
    ascuns: radacinaAscunsa,
    vizibil: !(stilR.visibility === 'hidden' || stilR.visibility === 'collapse'),
    umplere: stilR.fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
  };
  for (const c of copii(radacina).reverse()) pune(radacinaCadru, c);

  try {
    while (stiva.length > 0) {
      const cadru = stiva.pop();
      if (!cadru) break;
      const { el } = cadru;
      if (!alNostru(el)) continue;
      const tip = el.localName ?? '';
      const containerSauForma = tip === 'g' || tip === 'a' || tip === 'switch' || FORME.has(tip);
      if (!containerSauForma) {
        const cod = SARITE.get(tip);
        // Doar `display: none` ascunde conținutul: sub `visibility: hidden`, un copil vizibil (un `tspan`) reapare, iar
      // conținutul elementelor sărite nu se citește (recenzia 2.7c). Raportul spune mai mult, nu mai puțin.
      if (cod && !cadru.ascuns) n[cod]++;
        continue;
      }
      // Transformarea elementului (pe un subarbore ascuns nu se mai judecă, doar se numără formele).
      let m = cadru.m;
      const tr = el.getAttribute('transform');
      if (tr !== null && !cadru.ascuns) {
        const t = citesteTransform(tr);
        if (!t) {
          n['transformare-invalida']++;
          continue;
        }
        m = compune(cadru.m, t);
      }
      const aici: Cadru = { ...cadru, m };
      if (tip === 'g' || tip === 'a') {
        for (const c of copii(el).reverse()) pune(aici, c);
        continue;
      }
      if (tip === 'switch') {
        // Primul copil SVG fără `requiredExtensions` (Illustrator pune înaintea desenului un `foreignObject` cu ea).
        const ales = copii(el).find((c) => alNostru(c) && !c.hasAttribute('requiredExtensions') && limbaPotrivita(c.getAttribute('systemLanguage'), limba));
        if (ales) pune(aici, ales);
        continue;
      }
      // O formă.
      const index = indexForma++;
      if (cadru.ascuns || !cadru.vizibil) {
        n.ascunse++;
        continue;
      }
      if (!(Math.abs(determinantNormat(m)) > 1e-12)) {
        n.singulara++;
        continue;
      }
      const date = dateForma(el, tip);
      if (date === 'tacut') continue;
      if (date === 'invalid') {
        n['atribut-invalid']++;
        continue;
      }
      if (date.eroare) n['eroare-date']++;
      // `line` e mereu deschisă (ADR 0035 §4), chiar de lungime 0.
      if (tip === 'line') {
        n.deschise++;
        continue;
      }
      const sim = similitudine(m);
      const semn = Math.sign(determinantNormat(m));
      const id = el.getAttribute('id');
      const nume = id ? id.slice(0, PLAFON.numeLungime) : undefined;
      const aleFormei: Varf[][] = [];
      for (const sc of subcai(date.comenzi)) {
        const v = subcaleMm(sc, m, sim, semn, n, lucru);
        if (v === 'goala') continue;
        if (v === 'prea-mare') {
          n['prea-mari']++;
          continue;
        }
        if (v === 'deschisa') {
          n.deschise++;
          continue;
        }
        if (v === 'degenerata') {
          n.degenerate++;
          continue;
        }
        if (!v.every((x) => inMargini(x))) departe = true;
        primite += v.length;
        aleFormei.push(v);
        cai.push({ varfuri: v, forma: index, ...(nume !== undefined ? { nume } : {}) });
      }
      if (cadru.umplere !== 'evenodd' && aleFormei.length > 1) deNonzero.push(aleFormei);
    }
  } catch (e) {
    if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: String(PLAFON_IMPORT.varfuriLucru), avertismente: n };
    throw e;
  }
  if (primite > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(primite), avertismente: n };
  // Perechile `nonzero`, după parcurgere și după plafonul vârfurilor, cu bugetul includerilor (recenzia 2.7c: 281 s).
  const buget = { ramas: PLAFON_IMPORT.includeri };
  try {
    for (const f of deNonzero) n.nonzero += perechiNonzero(f, buget);
  } catch (e) {
    if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: 'includeri', avertismente: n };
    throw e;
  }
  if (departe) return { ok: false, cod: 'departe', avertismente: n };
  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: n };
  return {
    ok: true,
    cai,
    pagina: latime !== null && inaltime !== null ? { latime, inaltime } : null,
    px,
    illustrator,
    avertismente: n,
  };
}

const finitInMargini = (x: number): boolean => Number.isFinite(x) && Math.abs(x) <= PLAFON.translatie;
function inMargini(v: Varf): boolean {
  const pct = [v.p, ...(v.s.tip === 'C' ? [v.s.c1, v.s.c2] : [])];
  return pct.every((q) => finitInMargini(q.x) && finitInMargini(q.y)) && (v.s.tip !== 'A' || Number.isFinite(v.s.bulge));
}

/**
 * Câte subcăi ale aceleiași forme stau într-o altă subcale a ei cu același sens (ADR 0035 §10, `nonzero`). Fiecare candidat
 * vizitat costă 1 din buget, iar fiecare includere măsurată, câte vârfuri are calea; la capătul bugetului, `PestePlafon`.
 */
function perechiNonzero(cai: readonly Varf[][], buget: { ramas: number }): number {
  const contururi = cai.map((varfuri) => ({ inchis: true, varfuri }));
  const semne = contururi.map((c) => Math.sign(arieCuSemn(c)));
  // O cale cu mii de subcăi (o trasare, un text): doar perechile ale căror cutii se ating se măsoară (indexul de cutii).
  const index = indexCutii(contururi.map(cutieContur));
  let rez = 0;
  for (const [i, a] of cai.entries()) {
    const p = a[0]?.p;
    if (!p) continue;
    let gasit = false;
    // Includerea e a clicului (ADR 0034 §5), exactă pe cubice.
    index.vizita({ minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }, (j) => {
      const b = contururi[j];
      if (gasit || j === i || !b || semne[j] !== semne[i]) return;
      buget.ramas -= 1 + b.varfuri.length;
      if (buget.ramas < 0) throw new PestePlafon();
      if (inRegiune(p, [b])) gasit = true;
    });
    if (gasit) rez++;
  }
  return rez;
}
