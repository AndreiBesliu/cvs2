import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { IDENTITATE, rotatie } from '../geom/matrice.ts';
// Doar tipul: piesa importului o face modulul previzualizării, adus la cerere (`ImportPregatit.piesa`, felia 2.3c-3).
import type { ImportPregatit } from '../io/piesa.ts';
import { instantaPreaDeparte, numara, operatieImplicita, PLAFON, plafonDepasit, type Document, type FormaDoc, type Ghidaj, type Instanta, type Nod, type Operatie, type Piesa, type Stoc } from '../model/document.ts';
import { is } from 'valibot';
import { operatieInMargini, SchemaDocument } from '../model/schemaDocument.ts';
import { adancimeDeschise } from '../io/adancime.ts';
import { cutieElement } from '../model/forme.ts';
import { jsonCanonic } from '../model/jsonCanonic.ts';
import { executa, type Comanda, type Degrupata, type Istoric } from '../model/jurnal.ts';
import { cuRangulPiesei } from '../model/ordine.ts';
import { operatiiPentruRol, type Rol } from '../model/rol.ts';
import { operatiiPentruRolPersonal, rolNumerotat, type RolPersonal } from '../model/rolPersonal.ts';
import { partiDegrupare } from '../model/degrupare.ts';
import { grupDin, type ParteGrupata } from '../model/grupare.ts';
import { comenziGrupuriPanouri } from '../model/grupuriPanouri.ts';
import { blocText } from '../model/blocText.ts';
import { transforma } from '../model/transformare.ts';
import { elementeFoaie, elementeInstanta } from '../model/lume.ts';
import { copiiRetea, instantaCopiei, motivRetea, type Retea } from '../model/retea.ts';
import { copiiPeCurba } from '../model/curba.ts';
import type { CheieSimpla } from '../i18n/t.ts';
import {
  alesePreaDeparte, copieArbore, cresteCopia, FOAIA, foaieCurenta, idNou, incape, inregistreazaCalcul, istoricDin, pas, scrie, sculaFoii,
  comenziStergere, type CalculDocument, type CerereText, type ContextDocument, type ConversieCalculata, type FormaNoua, type ReparatieCalculata,
  type TaiereCalculata,
} from './actiuniDocument.ts';

/**
 * Calculul acțiunilor documentului pornite doar de ferestre și de panou (`actiuniDocument.ts`, `laCerere`): importul
 * (ADR 0035 §8), operațiile din dialogul de export (ADR 0025), poziția, rotirea și foaia din panou (ADR 0038 §4). Nu stă în
 * pachetul de pornire: îl importă static ferestrele care dau aceste acțiuni (`ExportConectat`, `ImportConectat`,
 * `PanouProprietati`), iar modulul se înregistrează în registrul documentului la evaluare (starea lui globală, ca
 * dicționarele de mesaje). `activa` repetă gărzile ieftine din registru, apoi judecă; textul lor e cel de dinainte de mutare.
 */

/**
 * Comanda unui import (ADR 0035 §8): piesa și instanța ei, într-un singur pas; cu piesele aduse împreună (culorile unei
 * imagini, ADR 0221 §6), toate în același pas, fiecare la locul ei din pagină (lăsate pe planșă, centrul cutiei lor comune
 * cade în punctul lăsat). Documentul de după trebuie să treacă de plafoane și de ușa documentului întreagă: ce intră prin
 * import se și redeschide. Ținută pe (document, import): `activa` și `ruleaza` cer aceeași judecată. Piesa o face
 * constructorul adus cu importul, cu freza și grosimea foii curente (adâncimea căilor deschise, ADR 0037 §11).
 */
type ComandaImport =
  | { readonly ok: true; readonly comanda: Comanda; readonly ids: readonly string[] }
  | { readonly ok: false; readonly motiv: 'motiv.plafon' | 'motiv.import-refuzat' };
type Loc = { readonly x: number; readonly y: number } | null;
let ultimulImport: { doc: Document; pregatit: ImportPregatit; la: Loc; rez: ComandaImport } | null = null;
function comandaImport(doc: Document, pregatit: ImportPregatit, la: Loc = null): ComandaImport {
  const acelasiLoc = (a: Loc, b: Loc): boolean => (a === null || b === null ? a === b : a.x === b.x && a.y === b.y);
  if (ultimulImport && ultimulImport.doc === doc && ultimulImport.pregatit === pregatit && acelasiLoc(ultimulImport.la, la)) return ultimulImport.rez;
  const scula = sculaFoii(doc);
  const foaie = foaieCurenta(doc);
  const ocupate = new Set<string>();
  const puse = [pregatit, ...(pregatit.impreuna ?? [])].map((p) => {
    const id = idNou(doc, ocupate);
    ocupate.add(id);
    return { id, p, pus: p.piesa(id, { ...(scula ? { scula } : {}), grosime: foaie.stoc.grosime }) };
  });
  // Lăsat pe planșă: centrul cutiei desenelor în punctul lăsat; altfel, locul din pagina fișierului.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { pus } of puse) { x0 = Math.min(x0, pus.x); y0 = Math.min(y0, pus.y); x1 = Math.max(x1, pus.x + pus.latime); y1 = Math.max(y1, pus.y + pus.inaltime); }
  const dx = la ? la.x - (x0 + x1) / 2 : 0, dy = la ? la.y - (y0 + y1) / 2 : 0;
  let varfuri = 0, elemente = 0, operatii = 0;
  for (const { p, pus } of puse) { varfuri += p.cai.reduce((s, c) => s + c.varfuri.length, 0); elemente += p.cai.length; operatii += pus.piesa.operatii.length; }
  let rez: ComandaImport;
  if (!incape(doc, { noduri: elemente + puse.length, instante: puse.length, elementeLume: elemente, operatii, taieturi: elemente, varfuri, varfuriLume: varfuri })) {
    rez = { ok: false, motiv: 'motiv.plafon' };
  } else {
    const comanda = pas(puse.map(({ id, pus }, i): Comanda => ({
      tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x: pus.x + dx, y: pus.y + dy, rotire: 0 }, pozitie: foaie.instante.length + i,
      piesa: { piesa: pus.piesa, pozitie: doc.piese.length + i },
    }))) as Comanda;
    rez = pregatit.treceDeUsa(executa(istoricDin(doc), comanda).doc) ? { ok: true, comanda, ids: puse.map((q) => q.id) } : { ok: false, motiv: 'motiv.import-refuzat' };
  }
  ultimulImport = { doc, pregatit, la, rez };
  return rez;
}

/**
 * Dialogul schimbă doar valorile operațiilor existente: aceleași operații, în aceeași ordine, pe aceleași noduri. Așa
 * referințele, unicitatea și plafoanele rămân cum le-a lăsat ușa; valorile noi trebuie doar să fie în marginile schemei.
 * Felul operației e o valoare (ADR 0069 §7): un profil devine buzunar și invers, cu ce cere schema pe fiecare.
 */
function operatiiAcceptate(doc: Document, noi: ReadonlyMap<string, readonly Operatie[]>): boolean {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  for (const [id, operatii] of noi) {
    const vechi = piese.get(id)?.operatii;
    if (!vechi || vechi.length !== operatii.length) return false;
    for (const [k, o] of operatii.entries()) {
      const v = vechi[k];
      if (!v || o.id !== v.id || o.noduri.length !== v.noduri.length || o.noduri.some((n, j) => n !== v.noduri[j])) return false;
      if (!operatieInMargini(o)) return false;
    }
  }
  return true;
}

/** Cutia elementelor instanțelor alese, în lume (mm ai foii), sau null fără niciun element. */
function cutieAlese(doc: Document, alese: ReadonlySet<string>): Cutie | null {
  let k: Cutie | null = null;
  for (const e of elementeFoaie(doc, FOAIA)) {
    if (!alese.has(e.instanta)) continue;
    const c = cutieElement(e);
    k = k ? uneste(k, c) : c;
  }
  return k;
}

/** Sub atât (mm), o deplasare nu e o mutare: de șase ordine sub rezoluția postului, doar zgomotul aritmeticii (ADR 0038 §5). */
const PRAG_MUTARE = 1e-9;

/**
 * Deplasarea care duce colțul stânga-jos al cutiei selecției în poziția cerută (doar pe axele scrise), sau motivul.
 * Colțul e derivat din geometrie (`x + t`), deci poate ateriza la câțiva ulp de valoarea scrisă (3,577 → 3,576999999999998;
 * la o formă rotită, valoarea exactă adesea nici nu există); panoul îl arată rotunjit (`valoareDerivata`), iar o deplasare
 * sub `PRAG_MUTARE` e zero: reconfirmarea aceleiași valori nu e o comandă (recenzia 2.8e, F2).
 */
function deplasarePozitie(ctx: ContextDocument): { readonly dx: number; readonly dy: number } | 'motiv.valoare-invalida' | 'motiv.nicio-selectie' {
  const p = ctx.pozitieNoua?.() ?? {};
  if ((p.x !== undefined && !Number.isFinite(p.x)) || (p.y !== undefined && !Number.isFinite(p.y))) return 'motiv.valoare-invalida';
  const k = cutieAlese(ctx.istoric().doc, new Set(ctx.selectie()));
  if (!k) return 'motiv.nicio-selectie';
  const prag = (d: number): number => (Math.abs(d) < PRAG_MUTARE ? 0 : d);
  return { dx: prag(p.x === undefined ? 0 : p.x - k.minX), dy: prag(p.y === undefined ? 0 : p.y - k.minY) };
}

/** Unghiul în [0, 360): un unghi deja acolo rămâne exact cum e (ca la `rotatie`); 360 − ε rotunjit la 360 devine 0. */
export function rotireNormalizata(r: number): number {
  if (r >= 0 && r < 360) return r === 0 ? 0 : r;
  const n = ((r % 360) + 360) % 360;
  return n >= 360 || n === 0 ? 0 : n;
}

/**
 * Instanța rotită la `rotire`, cu centrul cutiei piesei ținut pe loc (ADR 0038 §4): cu matricea T(x, y)·R(r), centrul c
 * al piesei ajunge în R(r)·c + (x, y), deci originea nouă e (x, y) + R(r₀)·c − R(r₁)·c.
 */
function instantaRotita(doc: Document, i: Instanta, rotire: number): Instanta {
  const p = doc.piese.find((x) => x.id === i.piesa);
  let k: Cutie | null = null;
  for (const e of p ? elementeInstanta(p.radacina, i, IDENTITATE) : []) {
    const c = cutieElement(e);
    k = k ? uneste(k, c) : c;
  }
  if (!k) return { ...i, rotire };
  const cx = (k.minX + k.maxX) / 2, cy = (k.minY + k.maxY) / 2;
  const r0 = rotatie(i.rotire), r1 = rotatie(rotire);
  return {
    ...i,
    x: i.x + (r0.a * cx + r0.c * cy) - (r1.a * cx + r1.c * cy),
    y: i.y + (r0.b * cx + r0.d * cy) - (r1.b * cx + r1.d * cy),
    rotire,
  };
}

/** Materialul nou al foii, cu mărimile nescrise păstrate, sau motivul: în plafoanele schemei (ADR 0024), strict pozitive. */
function stocCerut(ctx: ContextDocument): Stoc | 'motiv.foaie-invalida' {
  const vechi = foaieCurenta(ctx.istoric().doc).stoc;
  const n = ctx.stocNou?.() ?? {};
  const bun = (x: number | undefined, max: number): boolean => x === undefined || (Number.isFinite(x) && x > 0 && x <= max);
  if (!bun(n.latime, PLAFON.latura) || !bun(n.inaltime, PLAFON.latura) || !bun(n.grosime, PLAFON.grosime)) return 'motiv.foaie-invalida';
  return { ...vechi, latime: n.latime ?? vechi.latime, inaltime: n.inaltime ?? vechi.inaltime, grosime: n.grosime ?? vechi.grosime };
}

/**
 * Copierea în rețea (ADR 0061): copiile selecției, fiecare cu piesa ei (independente, ca la Duplică), sau motivul pentru care
 * nu se poate. Verdictul e comun acțiunii și panoului din extensia barei (care îl arată sub câmpuri).
 */
function copiiPentru(doc: Document, selectie: readonly string[], r: Retea): { readonly copii: ReturnType<typeof copiiRetea>; readonly instante: Instanta[] } {
  // Pe curbă (ADR 0066): locurile vin din curbă, iar curba nu se copiază.
  if (r.fel === 'curba') {
    const c = copiiPeCurba(doc, FOAIA, selectie, r);
    return typeof c === 'string' ? { copii: [], instante: [] } : c;
  }
  const alese = new Set(selectie);
  const cutii = elementeFoaie(doc, FOAIA).filter((e) => alese.has(e.instanta)).map((e) => cutieElement(e));
  const cutie = cutii.reduce(uneste, CUTIE_GOALA);
  return { copii: cutii.length > 0 ? copiiRetea(cutie, r) : [], instante: foaieCurenta(doc).instante.filter((i) => alese.has(i.id)) };
}

export function motivCopiereRetea(doc: Document, selectie: readonly string[], r: Retea, doarCitire: boolean): CheieSimpla | null {
  if (selectie.length === 0 || !foaieCurenta(doc).instante.some((i) => selectie.includes(i.id))) return 'motiv.nicio-selectie';
  if (doarCitire) return 'motiv.doar-citire';
  if (motivRetea(r)) return 'motiv.nimic-ales';
  const { copii, instante } = copiiPentru(doc, selectie, r);
  if (copii.length === 0) return 'motiv.nicio-selectie';
  const una = cresteCopia(doc, selectie);
  const toate = Object.fromEntries(Object.entries(una).map(([k, v]) => [k, v * copii.length])) as typeof una;
  if (!incape(doc, toate)) return 'motiv.plafon';
  for (const k of copii) for (const i of instante) {
    const p = instantaCopiei(i, k);
    if (instantaPreaDeparte(p.x, p.y)) return 'motiv.prea-departe';
  }
  return null;
}

/**
 * Comanda unui text (ADR 0105 §5): o piesă nouă cu instanța ei în ancoră, sau piesa editată în locul celei vechi (același
 * id, aceeași instanță), într-un singur pas. Se editează doar un bloc de text valid (contururile neschimbate de altceva), al
 * unei piese folosite de o singură instanță. Documentul de după trece de ușa întreagă. Ținută pe (document, cerere).
 */
type ComandaText = { readonly ok: true; readonly comanda: Comanda; readonly id: string } | { readonly ok: false; readonly motiv: CheieSimpla };
const MOTIV_TEXT = { gol: 'motiv.text-gol', includeri: 'motiv.text-includeri', plafon: 'motiv.plafon' } as const;
let ultimulText: { doc: Document; cerere: CerereText; rez: ComandaText } | null = null;
export function comandaText(doc: Document, cerere: CerereText): ComandaText {
  if (ultimulText && ultimulText.doc === doc && ultimulText.cerere === cerere) return ultimulText.rez;
  const rez = judecaTextul(doc, cerere);
  ultimulText = { doc, cerere, rez };
  return rez;
}

function judecaTextul(doc: Document, c: CerereText): ComandaText {
  const foaie = foaieCurenta(doc);
  let comanda: Comanda;
  let id: string;
  if (c.fel === 'nou') {
    if (instantaPreaDeparte(c.loc.x, c.loc.y)) return { ok: false, motiv: 'motiv.prea-departe' };
    id = idNou(doc);
    const r = c.piesa(id, sculaFoii(doc), foaie.stoc.grosime);
    if (!r.ok) return { ok: false, motiv: MOTIV_TEXT[r.motiv] };
    comanda = {
      tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x: c.loc.x, y: c.loc.y, rotire: 0 }, pozitie: foaie.instante.length,
      piesa: { piesa: r.piesa, pozitie: doc.piese.length },
    };
  } else {
    const inst = foaie.instante.find((i) => i.id === c.instanta);
    const vechi = inst ? doc.piese.find((p) => p.id === inst.piesa) : undefined;
    if (!inst || !vechi) return { ok: false, motiv: 'motiv.nimic-ales' };
    if (!blocText(vechi.radacina)) return { ok: false, motiv: 'motiv.text-vectori' };
    const folosiri = doc.foi.reduce((n, f) => n + f.instante.filter((i) => i.piesa === vechi.id).length, 0);
    if (folosiri > 1) return { ok: false, motiv: 'motiv.text-impartit' };
    const r = c.piesa(vechi, foaie.stoc.grosime);
    if (!r.ok) return { ok: false, motiv: MOTIV_TEXT[r.motiv] };
    id = inst.id;
    comanda = { tip: 'inlocuieste-piesa', vechi, nou: r.piesa };
  }
  const dupa = executa(istoricDin(doc), comanda).doc;
  return is(SchemaDocument, JSON.parse(JSON.stringify(dupa))) ? { ok: true, comanda, id } : { ok: false, motiv: 'motiv.plafon' };
}

/** Calculul celor cinci acțiuni, după id; `inregistreazaCalcul` îl leagă de registrul documentului. */
export const CALCUL_DOCUMENT: CalculDocument = {
  'document.importa': {
    activa: (ctx) => {
      if (!ctx.importNou) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaImport(ctx.istoric().doc, ctx.importNou(), ctx.locImport?.() ?? null);
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      if (!ctx.importNou) return;
      const h = ctx.istoric();
      const r = comandaImport(h.doc, ctx.importNou(), ctx.locImport?.() ?? null);
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza([...r.ids]);
    },
  },
  'document.aplica-operatii': {
    activa: (ctx) => {
      if (!ctx.operatiiNoi) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      return operatiiAcceptate(ctx.istoric().doc, ctx.operatiiNoi()) ? true : 'motiv.operatie-invalida';
    },
    ruleaza: (ctx) => {
      const noi = ctx.operatiiNoi?.();
      if (!noi || !operatiiAcceptate(ctx.istoric().doc, noi)) return;
      const h = ctx.istoric();
      const comenzi: Comanda[] = [];
      for (const vechi of h.doc.piese) {
        const operatii = noi.get(vechi.id);
        // Canonic, nu după ordinea cheilor: un document redeschis are cheile sortate (`jsonCanonic` la salvare).
        if (!operatii || jsonCanonic(operatii) === jsonCanonic(vechi.operatii)) continue;
        comenzi.push({ tip: 'inlocuieste-piesa', vechi, nou: { ...vechi, operatii: operatii.map((o) => structuredClone(o)) } });
      }
      const c = pas(comenzi);
      if (c) ctx.scrie(executa(h, c));
    },
  },
  // Panoul (ADR 0112): rolul de tăiere al pieselor alese, cu motivul unui refuz (rolul care nu se potrivește uneia dintre ele).
  'document.rol': {
    activa: (ctx) => {
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      if (!ctx.rolNou) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaRol(ctx.istoric(), ctx.selectie(), ctx.rolNou());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      if (!ctx.rolNou) return;
      const h = ctx.istoric();
      const r = comandaRol(h, ctx.selectie(), ctx.rolNou());
      if (r.ok) ctx.scrie(executa(h, r.comanda));
    },
  },
  'document.pozitioneaza': {
    activa: (ctx) => {
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      if (!ctx.pozitieNoua) return 'motiv.nicio-deplasare';
      const s = scrie(ctx);
      if (s !== true) return s;
      const d = deplasarePozitie(ctx);
      if (typeof d === 'string') return d;
      return alesePreaDeparte(ctx, d.dx, d.dy) ? 'motiv.prea-departe' : true;
    },
    ruleaza: (ctx) => {
      const d = deplasarePozitie(ctx);
      if (typeof d === 'string' || (d.dx === 0 && d.dy === 0) || alesePreaDeparte(ctx, d.dx, d.dy)) return;
      const h = ctx.istoric();
      const foaie = foaieCurenta(h.doc);
      const alese = new Set(ctx.selectie());
      const c = pas(foaie.instante
        .filter((i) => alese.has(i.id))
        .map((vechi): Comanda => ({ tip: 'inlocuieste-instanta', foaie: foaie.id, vechi, nou: { ...vechi, x: vechi.x + d.dx, y: vechi.y + d.dy } })));
      if (c) ctx.scrie(executa(h, c));
    },
  },
  'document.roteste': {
    activa: (ctx) => {
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      if (ctx.selectie().length > 1) return 'motiv.o-singura-selectie';
      if (!ctx.rotireNoua) return 'motiv.nicio-deplasare';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = ctx.rotireNoua();
      if (!Number.isFinite(r)) return 'motiv.valoare-invalida';
      const doc = ctx.istoric().doc;
      const i = foaieCurenta(doc).instante.find((x) => x.id === ctx.selectie()[0]);
      if (!i) return 'motiv.nicio-selectie';
      const nou = instantaRotita(doc, i, rotireNormalizata(r));
      return instantaPreaDeparte(nou.x, nou.y) ? 'motiv.prea-departe' : true;
    },
    ruleaza: (ctx) => {
      const r = ctx.rotireNoua?.();
      const h = ctx.istoric();
      const foaie = foaieCurenta(h.doc);
      const vechi = ctx.selectie().length === 1 ? foaie.instante.find((x) => x.id === ctx.selectie()[0]) : undefined;
      if (r === undefined || !Number.isFinite(r) || !vechi) return;
      const rotire = rotireNormalizata(r);
      if (rotire === vechi.rotire) return;
      const nou = instantaRotita(h.doc, vechi, rotire);
      if (instantaPreaDeparte(nou.x, nou.y)) return;
      ctx.scrie(executa(h, { tip: 'inlocuieste-instanta', foaie: foaie.id, vechi, nou }));
    },
  },
  'foaie.stoc': {
    activa: (ctx) => {
      if (!ctx.stocNou) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const k = stocCerut(ctx);
      return typeof k === 'string' ? k : true;
    },
    ruleaza: (ctx) => {
      const nou = stocCerut(ctx);
      const h = ctx.istoric();
      const foaie = foaieCurenta(h.doc);
      if (typeof nou === 'string' || jsonCanonic(nou) === jsonCanonic(foaie.stoc)) return;
      ctx.scrie(executa(h, { tip: 'inlocuieste-stoc', foaie: foaie.id, vechi: foaie.stoc, nou }));
    },
  },
  // Ghidajele foii (ADR 0050 §1): lista întreagă, judecată ca la ușă (plafonul, id-urile, poziția), ca proiectul să se
  // redeschidă; aceeași listă nu e o comandă.
  'foaie.ghidaje': {
    activa: (ctx) => {
      const g = ctx.ghidajeNoi?.();
      if (!g) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      return ghidajeBune(g) ? true : 'motiv.prea-departe';
    },
    ruleaza: (ctx) => {
      const nou = ctx.ghidajeNoi?.();
      const h = ctx.istoric();
      const foaie = foaieCurenta(h.doc);
      const vechi = foaie.ghidaje ?? [];
      if (!nou || !ghidajeBune(nou) || jsonCanonic(nou) === jsonCanonic(vechi)) return;
      ctx.scrie(executa(h, { tip: 'inlocuieste-ghidaje', foaie: foaie.id, vechi, nou: nou.map((g) => ({ ...g })) }));
    },
  },
  // Mânerele selecției (ADR 0052): instanțele alese rotite sau scalate (cu piesele lor), într-un singur pas; refuzul are motivul
  // lui în bara editării (dicționarul ei), aici unul singur.
  // Copierea în rețea (ADR 0061): un singur pas pentru toate copiile; alese rămân originalele și copiile.
  'document.copiaza-in-retea': {
    activa: (ctx) => {
      const r = ctx.retea?.();
      if (!r) return 'motiv.nimic-ales';
      return motivCopiereRetea(ctx.istoric().doc, ctx.selectie(), r, ctx.doarCitire?.() === true) ?? true;
    },
    ruleaza: (ctx) => {
      const r = ctx.retea?.();
      if (!r) return;
      const h = ctx.istoric();
      const { copii, instante } = copiiPentru(h.doc, ctx.selectie(), r);
      const comenzi: Comanda[] = [];
      const noi: string[] = [];
      let doc = h.doc;
      for (const k of copii) {
        for (const original of instante) {
          const piesaVeche = doc.piese.find((p) => p.id === original.piesa);
          if (!piesaVeche) continue;
          const id = idNou(doc);
          const { radacina, ...restPiesa } = piesaVeche;
          const foaie = foaieCurenta(doc);
          const c: Comanda = {
            tip: 'adauga', foaie: foaie.id,
            instanta: { ...structuredClone(original), ...instantaCopiei(original, k), id, piesa: id },
            pozitie: foaie.instante.length,
            piesa: { piesa: { ...structuredClone(restPiesa), radacina: copieArbore(radacina), id }, pozitie: doc.piese.length },
          };
          doc = executa(istoricDin(doc), c).doc;
          comenzi.push(c);
          noi.push(id);
        }
      }
      const c = pas(comenzi);
      if (!c) return;
      ctx.scrie(executa(h, c));
      ctx.selecteaza([...instante.map((i) => i.id), ...noi]);
    },
  },
  'document.transforma': {
    activa: (ctx) => {
      const t = ctx.transformare?.();
      if (!t) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      const c = comenziTransformare(ctx);
      return c === null ? 'motiv.transformare-inexacta' : true;
    },
    ruleaza: (ctx) => {
      const c = comenziTransformare(ctx);
      const p = c ? pas(c) : null;
      if (p) ctx.scrie(executa(ctx.istoric(), p));
    },
  },
  // Panoul (ADR 0053): forma singurei instanțe alese, editată după plasare. Piesa trebuie să fie doar a ei și un singur
  // element; documentul de după trece de schemele documentului (laturile, raza colțurilor, razele). Motivul refuzului e al
  // panoului (dicționarul lui e adus cu el): acțiunea vine doar de acolo, cu forma nouă.
  'document.forma': {
    activa: (ctx) => {
      if (!ctx.formaEditata) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      if (ctx.selectie().length > 1) return 'motiv.o-singura-selectie';
      return comandaForma(ctx) === null ? 'prop.forma.refuzata' : true;
    },
    ruleaza: (ctx) => {
      const c = comandaForma(ctx)?.comanda;
      if (c) ctx.scrie(executa(ctx.istoric(), c));
    },
  },
  // Textul (ADR 0105 §5): un text nou sau unul editat, într-un pas; ales rămâne textul.
  'document.text': {
    activa: (ctx) => {
      if (!ctx.textNou) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaText(ctx.istoric().doc, ctx.textNou());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      if (!ctx.textNou) return;
      const h = ctx.istoric();
      const r = comandaText(h.doc, ctx.textNou());
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza([r.id]);
    },
  },
  // Degruparea (ADR 0103): instanțele alese ale pieselor-grup devin părțile lor, într-un pas; alese rămân părțile.
  'document.degrupeaza': {
    activa: (ctx) => {
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaDegrupare(ctx.istoric().doc, ctx.selectie());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      const h = ctx.istoric();
      const r = comandaDegrupare(h.doc, ctx.selectie());
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza(r.ids);
    },
  },
  // Gruparea (ADR 0130): instanțele alese devin o piesă, cu un grup pe rădăcină, într-un pas; aleasă rămâne instanța grupului.
  'document.grupeaza': {
    activa: (ctx) => {
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaGrupare(ctx.istoric().doc, ctx.selectie());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      const h = ctx.istoric();
      const r = comandaGrupare(h.doc, ctx.selectie());
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza([r.id]);
    },
  },
  // Verificarea vectorilor (ADR 0124 §10): reparația calculată de worker pe documentul de atunci, într-un pas; alese rămân
  // instanțele care n-au fost șterse.
  'document.repara': {
    activa: (ctx) => {
      if (!ctx.reparatie) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaReparatie(ctx.istoric(), ctx.reparatie());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      if (!ctx.reparatie) return;
      const h = ctx.istoric();
      const rep = ctx.reparatie();
      const r = comandaReparatie(h, rep);
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      const sterse = new Set(rep.sterse);
      const sel = ctx.selectie();
      if (sel.some((id) => sterse.has(id))) ctx.selecteaza(sel.filter((id) => !sterse.has(id)));
    },
  },
  // Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑): calculată de worker pe documentul de atunci, într-un pas (comanda
  // degrupării); alese rămân părțile noi.
  'document.converteste': {
    activa: (ctx) => {
      if (!ctx.conversie) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaConversie(ctx.istoric(), ctx.conversie());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      if (!ctx.conversie) return;
      const h = ctx.istoric();
      const r = comandaConversie(h, ctx.conversie());
      if (r.ok) ctx.scrie(executa(h, r.comanda));
    },
  },
  'document.taie': {
    activa: (ctx) => {
      if (!ctx.taiere) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaTaiere(ctx.istoric(), ctx.taiere());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      if (!ctx.taiere) return;
      const h = ctx.istoric();
      const t = ctx.taiere();
      const r = comandaTaiere(h, t);
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza(r.ids ?? t.ids);
    },
  },
  // Uneltele de desen (ADR 0051): forma trasă, ca piesă nouă cu instanța ei, aleasă după desen.
  'document.deseneaza': {
    activa: (ctx) => {
      const f = ctx.formaNoua?.();
      if (!f) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaDesen(ctx.istoric().doc, f, ctx.sterge?.());
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      const f = ctx.formaNoua?.();
      if (!f) return;
      const h = ctx.istoric();
      const r = comandaDesen(h.doc, f, ctx.sterge?.());
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza(r.ids);
    },
  },
  // Alinierea, distribuirea și săgețile (ADR 0050 §3): fiecare instanță cu deplasarea ei, într-un singur pas de anulare.
  'document.muta-instantele': {
    activa: (ctx) => {
      const d = ctx.deplasari?.();
      if (!d) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const c = comenziDeplasare(ctx.istoric().doc, d);
      return typeof c === 'string' ? c : true;
    },
    ruleaza: (ctx) => {
      const d = ctx.deplasari?.();
      if (!d) return;
      const h = ctx.istoric();
      const c = comenziDeplasare(h.doc, d);
      if (typeof c === 'string') return;
      const p = pas(c);
      if (p) ctx.scrie(executa(h, p));
    },
  },
};

/**
 * Comanda formelor desenate (ADR 0051; mai multe deodată, ADR 0064): fiecare formă e o piesă nouă, cu operația implicită (a
 * dreptunghiului pentru formele închise, a liniilor deschise din import pentru linie: pe linie, `adancimeDeschise`, o
 * trecere), și instanța ei; mai multe intră într-un singur pas. Documentul de după trebuie să treacă de plafoane și de ușa
 * întreagă: ce se desenează se și redeschide. Ținută pe (document, forme).
 */
type ComandaDesen =
  | { readonly ok: true; readonly comanda: Comanda; readonly ids: readonly string[] }
  | { readonly ok: false; readonly motiv: 'motiv.nimic-ales' | 'motiv.plafon' | 'motiv.import-refuzat' };
let ultimulDesen: { doc: Document; f: FormaNoua | readonly FormaNoua[]; sterge: readonly string[] | undefined; rez: ComandaDesen } | null = null;
function comandaDesen(doc: Document, f: FormaNoua | readonly FormaNoua[], sterge?: readonly string[]): ComandaDesen {
  if (ultimulDesen && ultimulDesen.doc === doc && ultimulDesen.f === f && ultimulDesen.sterge === sterge) return ultimulDesen.rez;
  const forme: readonly FormaNoua[] = 'forma' in f ? [f] : f;
  const varfuriForma = (x: FormaDoc): number => (x.tip === 'cale' ? x.varfuri.length : 0);
  const varfuri = forme.reduce((n, x) => n + varfuriForma(x.forma) + (x.gauri ?? []).reduce((m, g) => m + varfuriForma(g), 0), 0);
  const elemente = forme.reduce((n, x) => n + 1 + (x.gauri?.length ?? 0), 0);
  const grupuri = forme.filter((x) => (x.gauri?.length ?? 0) > 0).length;
  const k = forme.length;
  let rez: ComandaDesen;
  if (k === 0) rez = { ok: false, motiv: 'motiv.nimic-ales' };
  else if (!incape(doc, { noduri: elemente + grupuri, instante: k, elementeLume: elemente, operatii: k + grupuri, taieturi: elemente, varfuri, varfuriLume: varfuri })) {
    rez = { ok: false, motiv: 'motiv.plafon' };
  } else {
    const scula = sculaFoii(doc);
    // Întâi ștergerile (booleanul înlocuiește formele alese), apoi formele noi, cu id-uri care nu le refolosesc pe cele șterse.
    const sterse = new Set(sterge ?? []);
    const st = comenziStergere(doc, sterse);
    const comenzi: Comanda[] = [...st.comenzi];
    const ids: string[] = [];
    let dupa = st.doc;
    const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    for (const x of forme) {
      const id = idNou(dupa, sterse);
      const foaie = foaieCurenta(dupa);
      const baza = scula ? operatieImplicita(id, x.forma, scula) : operatieImplicita(id, x.forma);
      const deschisa = x.forma.tip === 'cale' && !x.forma.inchis;
      const adancime = adancimeDeschise(foaie.stoc.grosime);
      const operatie: Operatie = deschisa ? { ...baza, latura: 'pe-linie', adancime, pas: adancime } : baza;
      // Cu găuri: un grup, ca la import (conturul `c1` tăiat pe exterior, găurile `c2`… pe interior).
      const gauri = x.gauri ?? [];
      const piesa: Piesa = gauri.length === 0
        ? { id, radacina: { tip: 'element', id, forma: x.forma, matrice: ID }, operatii: [operatie] }
        : {
          id,
          radacina: { tip: 'grup', id: 'g', matrice: ID, copii: [x.forma, ...gauri].map((forma, j) => ({ tip: 'element' as const, id: `c${j + 1}`, forma, matrice: ID })) },
          operatii: [
            { ...baza, id: 'exterior', noduri: ['c1'], latura: 'exterior' },
            { ...baza, id: 'interior', noduri: gauri.map((_, j) => `c${j + 2}`), latura: 'interior' },
          ],
        };
      const comanda: Comanda = {
        tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x: x.x, y: x.y, rotire: 0 }, pozitie: foaie.instante.length,
        piesa: { piesa, pozitie: dupa.piese.length },
      };
      dupa = executa(istoricDin(dupa), comanda).doc;
      comenzi.push(comanda);
      ids.push(id);
    }
    const comanda = pas(comenzi);
    // Schemele documentului (cu judecata de ansamblu), nu ușa întreagă: ușa ar lipi schemele de ea într-o singură bucată la
    // cerere (probele „schemele care nu vin” le cer separate), iar migrările și arcele în lume nu privesc o formă nouă.
    rez = comanda && is(SchemaDocument, JSON.parse(JSON.stringify(dupa))) ? { ok: true, comanda, ids } : { ok: false, motiv: 'motiv.import-refuzat' };
  }
  ultimulDesen = { doc, f, sterge, rez };
  return rez;
}

/**
 * Comanda degrupării (ADR 0103): pe foaia de lucru, fiecare instanță aleasă a unei piese-grup își lasă locul părților
 * (`partiDegrupare`), fiecare cu piesa ei, id-uri noi și o copie a instanței vechi (locul, rotirea, câmpurile). Instanțele
 * care n-au ce desface rămân și rămân alese. Refuzată, cu motiv: un V-carve pe contururi din părți diferite, o piesă
 * folosită și de alte instanțe, nimic de desfăcut, documentul de după peste schemele documentului (plafoanele). Ținută pe
 * (document, selecție): `activa` și `ruleaza` cer aceeași judecată.
 */
type ComandaDegrupare = { readonly ok: true; readonly comanda: Comanda; readonly ids: readonly string[] } | { readonly ok: false; readonly motiv: CheieSimpla };
let ultimaDegrupare: { readonly doc: Document; readonly selectie: readonly string[]; readonly rez: ComandaDegrupare } | null = null;
export function comandaDegrupare(doc: Document, selectie: readonly string[]): ComandaDegrupare {
  if (ultimaDegrupare && ultimaDegrupare.doc === doc && ultimaDegrupare.selectie === selectie) return ultimaDegrupare.rez;
  const rez = judecaDegruparea(doc, selectie);
  ultimaDegrupare = { doc, selectie, rez };
  return rez;
}

function judecaDegruparea(doc: Document, selectie: readonly string[]): ComandaDegrupare {
  const foaie = foaieCurenta(doc);
  const alese = new Set(selectie);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const folosiri = new Map<string, number>();
  // Id-urile noi ca `idNou` (`e<n>`), fără să recitească documentul la fiecare parte.
  const ocupate = new Set(piese.keys());
  for (const f of doc.foi) {
    for (const i of f.instante) {
      folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
      ocupate.add(i.id);
    }
  }
  let n = doc.piese.length + 1;
  const idLiber = (): string => {
    while (ocupate.has(`e${n}`)) n++;
    const id = `e${n}`;
    ocupate.add(id);
    return id;
  };
  const degrupate: Degrupata[] = [];
  const ids: string[] = [];
  for (const i of foaie.instante) {
    if (!alese.has(i.id)) continue;
    const p = piese.get(i.piesa);
    const parti = p ? partiDegrupare(p) : 'o-singura-forma';
    if (!p || parti === 'o-singura-forma') {
      ids.push(i.id);
      continue;
    }
    if (parti === 'vcarve') return { ok: false, motiv: 'motiv.degrupare-vcarve' };
    if ((folosiri.get(p.id) ?? 0) > 1) return { ok: false, motiv: 'motiv.degrupare-impartita' };
    const { radacina: _radacina, operatii: _operatii, ...rest } = p;
    degrupate.push({
      instanta: i,
      piesa: p,
      parti: parti.map((x) => {
        const id = idLiber();
        ids.push(id);
        return {
          instanta: { ...structuredClone(i), id, piesa: id },
          piesa: { ...structuredClone(rest), id, radacina: copieArbore(x.radacina), operatii: structuredClone([...x.operatii]) },
        };
      }),
    });
  }
  if (degrupate.length === 0) return { ok: false, motiv: 'motiv.nimic-de-degrupat' };
  const comanda: Comanda = { tip: 'degrupeaza', foaie: foaie.id, degrupate };
  const dupa = executa(istoricDin(doc), comanda).doc;
  return is(SchemaDocument, JSON.parse(JSON.stringify(dupa))) ? { ok: true, comanda, ids } : { ok: false, motiv: 'motiv.plafon' };
}

/**
 * Comanda unei reparații a verificării vectorilor (ADR 0124 §10): piesele înlocuite, apoi instanțele șterse (`comenziStergere`,
 * pe documentul de după înlocuiri), într-un singur pas. Refuzată, cu motiv: documentul nu mai e cel pe care s-a calculat
 * reparația (o schimbare între timp), nimic de schimbat, documentul de după peste plafoane sau refuzat de schemele lui.
 * Ținută pe (document, reparație): `activa` și `ruleaza` cer aceeași judecată.
 */
type ComandaReparatie = { readonly ok: true; readonly comanda: Comanda } | { readonly ok: false; readonly motiv: CheieSimpla };
let ultimaReparatie: { readonly doc: Document; readonly r: ReparatieCalculata; readonly rez: ComandaReparatie } | null = null;
export function comandaReparatie(h: Istoric, r: ReparatieCalculata): ComandaReparatie {
  if (ultimaReparatie && ultimaReparatie.doc === h.doc && ultimaReparatie.r === r) return ultimaReparatie.rez;
  const rez = judecaReparatia(h, r);
  ultimaReparatie = { doc: h.doc, r, rez };
  return rez;
}

function judecaReparatia(h: Istoric, r: ReparatieCalculata): ComandaReparatie {
  if (r.doc !== h.doc) return { ok: false, motiv: 'editare.verificare.motiv.veche' };
  const comenzi: Comanda[] = [];
  let doc = h.doc;
  for (const nou of r.piese) {
    const vechi = doc.piese.find((p) => p.id === nou.id);
    if (!vechi) return { ok: false, motiv: 'editare.verificare.motiv.veche' };
    const c: Comanda = { tip: 'inlocuieste-piesa', vechi, nou };
    doc = executa(istoricDin(doc), c).doc;
    comenzi.push(c);
  }
  comenzi.push(...comenziStergere(doc, new Set(r.sterse)).comenzi);
  const comanda = pas(comenzi);
  if (!comanda) return { ok: false, motiv: 'motiv.nimic-ales' };
  const dupa = executa(h, comanda).doc;
  if (plafonDepasit(numara(dupa))) return { ok: false, motiv: 'motiv.plafon' };
  return is(SchemaDocument, JSON.parse(JSON.stringify(dupa))) ? { ok: true, comanda } : { ok: false, motiv: 'editare.verificare.motiv.schema' };
}

/**
 * Comanda unei tăieri (ADR 0180, felia 10.3↑): instanțele tăiate, fiecare înlocuită de părțile ei (comanda `degrupeaza`, ADR
 * 0103 §5), într-un singur pas. Refuzată, cu motiv: documentul nu mai e cel pe care s-a calculat tăierea, nimic de tăiat,
 * documentul de după peste plafoane sau refuzat de schemele lui. Ținută pe (document, tăiere), ca reparația.
 */
type ComandaTaiere = { readonly ok: true; readonly comanda: Comanda; readonly ids?: readonly string[] } | { readonly ok: false; readonly motiv: CheieSimpla };
let ultimaTaiere: { readonly doc: Document; readonly t: TaiereCalculata; readonly rez: ComandaTaiere } | null = null;
export function comandaTaiere(h: Istoric, t: TaiereCalculata): ComandaTaiere {
  if (ultimaTaiere && ultimaTaiere.doc === h.doc && ultimaTaiere.t === t) return ultimaTaiere.rez;
  const rez = judecaTaierea(h, t);
  ultimaTaiere = { doc: h.doc, t, rez };
  return rez;
}

/**
 * Comanda unei conversii (ADR 0180, felia 10.3↑d): fiecare piesă schimbată pusă în locul ei (`inlocuieste-piesa`), într-un
 * singur pas. Refuzată, cu motiv: documentul nu mai e cel pe care s-a calculat, nimic de convertit, documentul de după peste
 * plafoane sau refuzat de schemele lui. Ținută pe (document, conversie).
 */
let ultimaConversie: { readonly doc: Document; readonly c: ConversieCalculata; readonly rez: ComandaTaiere } | null = null;
function comandaConversie(h: Istoric, c: ConversieCalculata): ComandaTaiere {
  if (ultimaConversie && ultimaConversie.doc === h.doc && ultimaConversie.c === c) return ultimaConversie.rez;
  const rez = judecaConversia(h, c);
  ultimaConversie = { doc: h.doc, c, rez };
  return rez;
}

function judecaConversia(h: Istoric, c: ConversieCalculata): ComandaTaiere {
  if (c.doc !== h.doc) return { ok: false, motiv: 'editare.conversie.motiv.veche' };
  if (c.piese.length === 0) return { ok: false, motiv: 'motiv.nimic-ales' };
  const vechi = new Map(h.doc.piese.map((p) => [p.id, p]));
  const comenzi: Comanda[] = [];
  for (const p of c.piese) {
    const v = vechi.get(p.id);
    if (!v) return { ok: false, motiv: 'editare.conversie.motiv.veche' };
    comenzi.push({ tip: 'inlocuieste-piesa', vechi: v, nou: p });
  }
  const comanda: Comanda = comenzi.length === 1 ? (comenzi[0] as Comanda) : { tip: 'lot', comenzi };
  let dupa: Document;
  try {
    dupa = executa(h, comanda).doc;
  } catch {
    return { ok: false, motiv: 'editare.conversie.motiv.veche' };
  }
  if (plafonDepasit(numara(dupa))) return { ok: false, motiv: 'motiv.plafon' };
  return is(SchemaDocument, JSON.parse(JSON.stringify(dupa))) ? { ok: true, comanda } : { ok: false, motiv: 'editare.conversie.motiv.schema' };
}

function judecaTaierea(h: Istoric, t: TaiereCalculata): ComandaTaiere {
  if (t.doc !== h.doc) return { ok: false, motiv: 'editare.taiere.motiv.veche' };
  const sterse = t.sterse ?? [];
  const grupuri = t.grupuri ?? [];
  if (t.degrupate.length === 0 && sterse.length === 0 && grupuri.length === 0) return { ok: false, motiv: 'motiv.nimic-ales' };
  // Decuparea: întâi ștergerile (fiecare pe documentul de după cele dinainte), apoi degruparea; panourile (ADR 0181 §7), apoi
  // gruparea lor, pe documentul de după degrupare (cu alegerea de după: grupurile în locul bucăților); un singur pas de anulare.
  const comenzi: Comanda[] = [];
  try {
    if (sterse.length > 0) comenzi.push(...comenziStergere(h.doc, new Set(sterse)).comenzi);
  } catch {
    return { ok: false, motiv: 'editare.taiere.motiv.veche' };
  }
  if (t.degrupate.length > 0) comenzi.push({ tip: 'degrupeaza', foaie: foaieCurenta(h.doc).id, degrupate: t.degrupate });
  let ids: readonly string[] | undefined;
  if (grupuri.length > 0) {
    let g: ReturnType<typeof comenziGrupuriPanouri>;
    try {
      g = comenziGrupuriPanouri(comenzi.length === 0 ? h.doc : executa(h, { tip: 'lot', comenzi }).doc, foaieCurenta(h.doc).id, grupuri, t.ids, h.doc);
    } catch {
      g = null;
    }
    if (!g) return { ok: false, motiv: 'editare.taiere.motiv.veche' };
    comenzi.push(...g.comenzi);
    ids = g.ids;
  }
  const comanda: Comanda = comenzi.length === 1 ? (comenzi[0] as Comanda) : { tip: 'lot', comenzi };
  let dupa: Document;
  try {
    dupa = executa(h, comanda).doc;
  } catch {
    return { ok: false, motiv: 'editare.taiere.motiv.veche' };
  }
  if (plafonDepasit(numara(dupa))) return { ok: false, motiv: 'motiv.plafon' };
  if (!is(SchemaDocument, JSON.parse(JSON.stringify(dupa)))) return { ok: false, motiv: 'editare.taiere.motiv.schema' };
  return ids ? { ok: true, comanda, ids } : { ok: true, comanda };
}

/**
 * Comanda grupării (ADR 0130): pe foaia de lucru, instanțele alese, în ordinea foii, devin o instanță cu o piesă nouă
 * (`grupDin`), în locul primei. E comanda `regrupeaza` a degrupării, cu locurile părților în cele două liste, ca anularea
 * să le pună exact unde erau. Refuzată, cu motiv: mai puțin de două forme alese, o piesă folosită și de alte instanțe (sau
 * aleasă de două ori), V-carve-uri cu aceleași valori în părți diferite, documentul de după peste schemele documentului
 * (plafoanele, nivelurile arborelui). Ținută pe (document, selecție), ca degruparea.
 */
type ComandaGrupare = { readonly ok: true; readonly comanda: Comanda; readonly id: string } | { readonly ok: false; readonly motiv: CheieSimpla };
let ultimaGrupare: { readonly doc: Document; readonly selectie: readonly string[]; readonly rez: ComandaGrupare } | null = null;
export function comandaGrupare(doc: Document, selectie: readonly string[]): ComandaGrupare {
  if (ultimaGrupare && ultimaGrupare.doc === doc && ultimaGrupare.selectie === selectie) return ultimaGrupare.rez;
  const rez = judecaGruparea(doc, selectie);
  ultimaGrupare = { doc, selectie, rez };
  return rez;
}

function judecaGruparea(doc: Document, selectie: readonly string[]): ComandaGrupare {
  const foaie = foaieCurenta(doc);
  const alese = new Set(selectie);
  const piese = new Map(doc.piese.map((p, k) => [p.id, { p, k }]));
  const parti: ParteGrupata[] = [];
  const locuri = { instante: [] as number[], piese: [] as number[] };
  for (const [k, i] of foaie.instante.entries()) {
    const x = alese.has(i.id) ? piese.get(i.piesa) : undefined;
    if (!x) continue;
    parti.push({ instanta: i, piesa: x.p });
    locuri.instante.push(k);
    locuri.piese.push(x.k);
  }
  if (parti.length < 2) return { ok: false, motiv: 'motiv.grupare-doua' };
  const folosiri = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
  if (parti.some((x) => (folosiri.get(x.piesa.id) ?? 0) > 1)) return { ok: false, motiv: 'motiv.grupare-impartita' };
  const id = idNou(doc);
  const g = grupDin(parti, id);
  if (g === 'vcarve') return { ok: false, motiv: 'motiv.grupare-vcarve' };
  if (g === 'doua') return { ok: false, motiv: 'motiv.grupare-doua' };
  const comanda: Comanda = { tip: 'regrupeaza', foaie: foaie.id, degrupate: [{ ...g, parti, locuri }] };
  const dupa = executa(istoricDin(doc), comanda).doc;
  return is(SchemaDocument, JSON.parse(JSON.stringify(dupa))) ? { ok: true, comanda, id } : { ok: false, motiv: 'motiv.plafon' };
}

/**
 * Pură: de ce formele noi nu s-ar putea adăuga acum (același verdict ca acțiunea `document.deseneaza`: doar citire, nimic,
 * plafonul documentului, schema), sau null. Panoul offsetului (ADR 0064) îl arată înainte de Aplică; booleanul (ADR 0067),
 * cu instanțele pe care le înlocuiește.
 */
export function motivDesen(doc: Document, forme: readonly FormaNoua[], doarCitire: boolean, sterge?: readonly string[]): CheieSimpla | null {
  if (doarCitire) return 'motiv.doar-citire';
  const r = comandaDesen(doc, forme, sterge);
  return r.ok ? null : r.motiv;
}

/** Comenzile unei transformări (instanțele și piesele schimbate), sau null dacă ar ieși inexactă sau n-ar trece de schemă. */
function comenziTransformare(ctx: ContextDocument): Comanda[] | null {
  const t = ctx.transformare?.();
  if (!t) return null;
  const h = ctx.istoric();
  const r = transforma(h.doc, FOAIA, ctx.selectie(), t);
  if (!r.ok) return null;
  const foaie = foaieCurenta(h.doc);
  const vechi = new Map(foaie.instante.map((i) => [i.id, i]));
  const vechiPiese = new Map(h.doc.piese.map((p) => [p.id, p]));
  const comenzi: Comanda[] = [];
  for (const p of r.piese) {
    const v = vechiPiese.get(p.id);
    if (v) comenzi.push({ tip: 'inlocuieste-piesa', vechi: v, nou: p });
  }
  for (const i of r.instante) {
    const v = vechi.get(i.id);
    if (!v || instantaPreaDeparte(i.x, i.y)) return null;
    comenzi.push({ tip: 'inlocuieste-instanta', foaie: foaie.id, vechi: v, nou: i });
  }
  const p = pas(comenzi);
  if (!p) return [];
  return is(SchemaDocument, JSON.parse(JSON.stringify(executa(h, p).doc))) ? comenzi : null;
}

/**
 * Comanda formei editate din panou (ADR 0053): piesa singurei instanțe alese, cu forma nouă; `comanda: null` când forma e
 * aceeași; null când nu se poate (piesa împărțită sau cu mai multe elemente, documentul de după refuzat de schemă).
 */
function comandaForma(ctx: ContextDocument): { readonly comanda: Comanda | null } | null {
  const f = ctx.formaEditata?.();
  const h = ctx.istoric();
  const alese = ctx.selectie();
  if (!f || alese.length !== 1) return null;
  const i = foaieCurenta(h.doc).instante.find((x) => x.id === alese[0]);
  const vechi = i ? h.doc.piese.find((p) => p.id === i.piesa) : undefined;
  if (!vechi) return null;
  let folosiri = 0;
  for (const fo of h.doc.foi) for (const x of fo.instante) if (x.piesa === vechi.id) folosiri++;
  if (folosiri > 1) return null;
  // Elementul cerut (ADR 0068): rădăcina, dacă e element (fără `nodEditat` sau cu id-ul ei), altfel elementul cu id-ul dat din grup.
  const id = ctx.nodEditat?.();
  let gasit = false;
  const inlocuieste = (n: Nod): Nod => {
    if (n.tip === 'element') {
      if (id !== undefined && n.id !== id) return n;
      gasit = true;
      return { ...n, forma: f };
    }
    return id === undefined ? n : { ...n, copii: n.copii.map(inlocuieste) };
  };
  const radacina = inlocuieste(vechi.radacina);
  if (!gasit) return null;
  const nou = { ...vechi, radacina };
  if (jsonCanonic(nou) === jsonCanonic(vechi)) return { comanda: null };
  const comanda: Comanda = { tip: 'inlocuieste-piesa', vechi, nou };
  return is(SchemaDocument, JSON.parse(JSON.stringify(executa(h, comanda).doc))) ? { comanda } : null;
}

/**
 * Comanda rolului de tăiere (ADR 0112): operațiile fiecărei piese a instanțelor alese, înlocuite cu ale rolului, într-un pas;
 * o piesă care are deja exact operațiile lui nu se atinge. Un rol personalizat (ADR 0114 §4, §5) își numerotează frezele o
 * dată, față de restul proiectului, ca toate piesele să primească aceleași numere. Motivul: rolul nu se potrivește uneia
 * dintre piese, nimic de schimbat, sau documentul de după refuzat de schemă (plafoanele).
 */
function comandaRol(h: Istoric, alese: readonly string[], rol: Rol | RolPersonal): { readonly ok: true; readonly comanda: Comanda } | { readonly ok: false; readonly motiv: CheieSimpla } {
  const piese = new Map(h.doc.piese.map((p) => [p.id, p]));
  const ale = new Set(alese);
  const lista: Piesa[] = [];
  for (const i of foaieCurenta(h.doc).instante) {
    const p = ale.has(i.id) ? piese.get(i.piesa) : undefined;
    if (p && !lista.includes(p)) lista.push(p);
  }
  const personal = typeof rol === 'string' ? null : rolNumerotat(h.doc, rol, new Set(lista.map((p) => p.id)));
  const comenzi: Comanda[] = [];
  for (const vechi of lista) {
    const ale = personal ? operatiiPentruRolPersonal(vechi, personal) : operatiiPentruRol(h.doc, vechi, rol as Rol);
    if (!ale) return { ok: false, motiv: 'motiv.rol-nepotrivit' };
    // Piesa își păstrează locul în ordinea de mână (ADR 0133 §4).
    const operatii = cuRangulPiesei(vechi.operatii, ale);
    if (jsonCanonic(operatii) === jsonCanonic(vechi.operatii)) continue;
    comenzi.push({ tip: 'inlocuieste-piesa', vechi, nou: { ...vechi, operatii } });
  }
  if (lista.length === 0) return { ok: false, motiv: 'motiv.nicio-selectie' };
  const c = pas(comenzi);
  if (!c) return { ok: false, motiv: 'motiv.nimic-ales' };
  return is(SchemaDocument, JSON.parse(JSON.stringify(executa(h, c).doc))) ? { ok: true, comanda: c } : { ok: false, motiv: 'motiv.plafon' };
}

/** Ghidajele unei liste trec de ușă: cel mult plafonul, id-uri bune și unice, axa x / y, poziția finită în plafon. */
function ghidajeBune(g: readonly Ghidaj[]): boolean {
  if (g.length > PLAFON.ghidaje) return false;
  const ids = new Set<string>();
  for (const x of g) {
    if (typeof x.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(x.id) || ids.has(x.id)) return false;
    ids.add(x.id);
    if ((x.axa !== 'x' && x.axa !== 'y') || !Number.isFinite(x.poz) || Math.abs(x.poz) > PLAFON.translatie) return false;
  }
  return true;
}

/**
 * Comenzile deplasărilor: doar instanțele foii curente, fiecare o singură dată, cu deplasarea finită și locul nou în
 * plafon; altfel motivul. Deplasările nule nu sunt comenzi.
 */
function comenziDeplasare(doc: Document, d: readonly { readonly id: string; readonly dx: number; readonly dy: number }[]): Comanda[] | 'motiv.nimic-ales' | 'motiv.prea-departe' {
  const foaie = foaieCurenta(doc);
  const dupaId = new Map(foaie.instante.map((i) => [i.id, i]));
  const vazute = new Set<string>();
  const comenzi: Comanda[] = [];
  for (const { id, dx, dy } of d) {
    const vechi = dupaId.get(id);
    if (!vechi || vazute.has(id) || !Number.isFinite(dx) || !Number.isFinite(dy)) return 'motiv.nimic-ales';
    vazute.add(id);
    if (dx === 0 && dy === 0) continue;
    if (instantaPreaDeparte(vechi.x + dx, vechi.y + dy)) return 'motiv.prea-departe';
    comenzi.push({ tip: 'inlocuieste-instanta', foaie: foaie.id, vechi, nou: { ...vechi, x: vechi.x + dx, y: vechi.y + dy } });
  }
  return comenzi;
}

inregistreazaCalcul(CALCUL_DOCUMENT);
