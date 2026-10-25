/**
 * Offsetul formelor în desen (ADR 0064), partea pură: contururile paralele cu formele alese, spre exterior sau spre interior,
 * din același motor ca CAM-ul (`offsetInchis`: linii și arce exacte, colțurile exterioare rotunjite, ieșirea verificată).
 * Fiecare contur închis al selecției (în lume, cu matricea lui) se decalează separat, după interiorul lui; fiecare contur care
 * iese devine o formă nouă (o cale). Modulul se încarcă abia la deschiderea panoului: motorul nu intră în pornire.
 */
import { aplicaColturi, type Colturi } from '../geom/colturi.ts';
import { inSensTrigonometric, type Contur } from '../geom/contur.ts';
import { curataIntrare, offsetInchis, REZOLUTIE } from '../geom/offset.ts';
import type { Document, VarfDoc } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import { FOAIA, type FormaNoua } from '../ui/actiuniDocument.ts';

/** Distanța cea mai mică (rezoluția modelului) și cea mai mare a offsetului din desen, în mm. */
export const DISTANTA_MINIMA_OFFSET = REZOLUTIE;
export const DISTANTA_MAXIMA_OFFSET = 1000;

/** De ce offsetul nu se poate face: nimic ales, distanța, doar forme deschise, interiorul prea mic, motorul. */
export type MotivOffset = 'nimic' | 'distanta' | 'deschise' | 'nu-incape' | 'esuat';

/** Offsetul selecției: formele noi, contururile lor în lume (previzualizarea) și câte forme deschise s-au sărit. */
export type Offset = { readonly forme: readonly FormaNoua[]; readonly contururi: readonly Contur[]; readonly sarite: number };

/** Pură: forma nouă a unui contur în lume: o cale cu originea piesei în primul vârf (linii, arce și cubice, la fel). */
export function formaDinContur(k: Contur): FormaNoua {
  const o = k.varfuri[0]?.p ?? { x: 0, y: 0 };
  const rel = (q: { readonly x: number; readonly y: number }) => ({ x: q.x - o.x, y: q.y - o.y });
  const varfuri = k.varfuri.map((v): VarfDoc => ({
    p: rel(v.p),
    s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : v.s.tip === 'C' ? { tip: 'C', c1: rel(v.s.c1), c2: rel(v.s.c2) } : { tip: 'L' },
  }));
  return { forma: { tip: 'cale', inchis: k.inchis, varfuri }, x: o.x, y: o.y };
}

/**
 * Pură: offsetul formelor alese cu `distanta` mm (pozitivă spre exterior, negativă spre interior). Formele deschise se sar
 * (numărate); dacă nu rămâne nicio formă închisă, motivul. Un contur pe care motorul îl refuză oprește tot (nimic pe
 * jumătate): interiorul care dispare e „nu încape”, restul „a eșuat”. Colțurile (ADR 0074 §2): implicit ca la original
 * (ascuțite unde originalul e ascuțit), sau rotunjite cu raza egală cu distanța.
 */
export function offsetSelectie(doc: Document, selectie: readonly string[], distanta: number, colturi: Colturi = 'ca-originalul'): Offset | MotivOffset {
  if (selectie.length === 0) return 'nimic';
  const d = Math.abs(distanta);
  if (!Number.isFinite(distanta) || d < DISTANTA_MINIMA_OFFSET || d > DISTANTA_MAXIMA_OFFSET) return 'distanta';
  const alese = new Set(selectie);
  const forme: FormaNoua[] = [];
  const contururi: Contur[] = [];
  let sarite = 0;
  for (const e of elementeFoaie(doc, FOAIA)) {
    if (!alese.has(e.instanta)) continue;
    const c = conturElement(e);
    if (!c.inchis) {
      sarite++;
      continue;
    }
    const r = offsetInchis(c, distanta);
    if (!r.ok) return r.motiv.startsWith('scula nu încape') ? 'nu-incape' : 'esuat';
    // Același original ca în motor (curățat, trigonometric): arcele de colț ale ieșirii stau în vârfurile lui.
    const curat = curataIntrare(c);
    const iesire = curat.ok ? aplicaColturi(inSensTrigonometric(curat.contur), distanta, r.contururi, colturi) : r.contururi;
    for (const k of iesire) {
      forme.push(formaDinContur(k));
      contururi.push(k);
    }
  }
  if (forme.length === 0) return sarite > 0 ? 'deschise' : distanta < 0 ? 'nu-incape' : 'esuat';
  return { forme, contururi, sarite };
}
