import { uneste, type Cutie } from '../geom/cutie.ts';
import { IDENTITATE, rotatie } from '../geom/matrice.ts';
// Doar tipul: piesa importului o face modulul previzualizării, adus la cerere (`ImportPregatit.piesa`, felia 2.3c-3).
import type { ImportPregatit } from '../io/piesa.ts';
import { instantaPreaDeparte, operatieImplicita, PLAFON, type Document, type FormaDoc, type Ghidaj, type Instanta, type Operatie, type Stoc } from '../model/document.ts';
import { is } from 'valibot';
import { operatieInMargini, SchemaDocument } from '../model/schemaDocument.ts';
import { adancimeDeschise } from '../io/adancime.ts';
import { cutieElement } from '../model/forme.ts';
import { jsonCanonic } from '../model/jsonCanonic.ts';
import { executa, type Comanda } from '../model/jurnal.ts';
import { transforma } from '../model/transformare.ts';
import { elementeFoaie, elementeInstanta } from '../model/lume.ts';
import {
  alesePreaDeparte, FOAIA, foaieCurenta, idNou, incape, inregistreazaCalcul, istoricDin, pas, scrie, sculaFoii,
  type CalculDocument, type ContextDocument,
} from './actiuniDocument.ts';

/**
 * Calculul acțiunilor documentului pornite doar de ferestre și de panou (`actiuniDocument.ts`, `laCerere`): importul
 * (ADR 0035 §8), operațiile din dialogul de export (ADR 0025), poziția, rotirea și foaia din panou (ADR 0038 §4). Nu stă în
 * pachetul de pornire: îl importă static ferestrele care dau aceste acțiuni (`ExportConectat`, `ImportConectat`,
 * `PanouProprietati`), iar modulul se înregistrează în registrul documentului la evaluare (starea lui globală, ca
 * dicționarele de mesaje). `activa` repetă gărzile ieftine din registru, apoi judecă; textul lor e cel de dinainte de mutare.
 */

/**
 * Comanda unui import (ADR 0035 §8): piesa și instanța ei, într-un singur pas. Documentul de după trebuie să treacă de
 * plafoane și de ușa documentului întreagă: ce intră prin import se și redeschide. Ținută pe (document, import): `activa`
 * și `ruleaza` cer aceeași judecată. Piesa o face constructorul adus cu importul, cu freza și grosimea foii curente
 * (adâncimea căilor deschise, ADR 0037 §11).
 */
type ComandaImport = { readonly ok: true; readonly comanda: Comanda; readonly id: string } | { readonly ok: false; readonly motiv: 'motiv.plafon' | 'motiv.import-refuzat' };
type Loc = { readonly x: number; readonly y: number } | null;
let ultimulImport: { doc: Document; pregatit: ImportPregatit; la: Loc; rez: ComandaImport } | null = null;
function comandaImport(doc: Document, pregatit: ImportPregatit, la: Loc = null): ComandaImport {
  const acelasiLoc = (a: Loc, b: Loc): boolean => (a === null || b === null ? a === b : a.x === b.x && a.y === b.y);
  if (ultimulImport && ultimulImport.doc === doc && ultimulImport.pregatit === pregatit && acelasiLoc(ultimulImport.la, la)) return ultimulImport.rez;
  const id = idNou(doc);
  const scula = sculaFoii(doc);
  const pus = pregatit.piesa(id, { ...(scula ? { scula } : {}), grosime: foaieCurenta(doc).stoc.grosime });
  const { piesa } = pus;
  // Lăsat pe planșă: centrul cutiei desenului în punctul lăsat; altfel, locul din pagina fișierului.
  const x = la ? la.x - pus.latime / 2 : pus.x;
  const y = la ? la.y - pus.inaltime / 2 : pus.y;
  const varfuri = pregatit.cai.reduce((s, c) => s + c.varfuri.length, 0);
  const elemente = pregatit.cai.length;
  let rez: ComandaImport;
  if (!incape(doc, { noduri: elemente + 1, instante: 1, elementeLume: elemente, operatii: piesa.operatii.length, taieturi: elemente, varfuri, varfuriLume: varfuri })) {
    rez = { ok: false, motiv: 'motiv.plafon' };
  } else {
    const foaie = foaieCurenta(doc);
    const comanda: Comanda = {
      tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x, y, rotire: 0 }, pozitie: foaie.instante.length,
      piesa: { piesa, pozitie: doc.piese.length },
    };
    rez = pregatit.treceDeUsa(executa(istoricDin(doc), comanda).doc) ? { ok: true, comanda, id } : { ok: false, motiv: 'motiv.import-refuzat' };
  }
  ultimulImport = { doc, pregatit, la, rez };
  return rez;
}

/**
 * Dialogul schimbă doar valorile operațiilor existente: aceleași operații, în aceeași ordine, pe aceleași noduri. Așa
 * referințele, unicitatea și plafoanele rămân cum le-a lăsat ușa; valorile noi trebuie doar să fie în marginile schemei.
 */
function operatiiAcceptate(doc: Document, noi: ReadonlyMap<string, readonly Operatie[]>): boolean {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  for (const [id, operatii] of noi) {
    const vechi = piese.get(id)?.operatii;
    if (!vechi || vechi.length !== operatii.length) return false;
    for (const [k, o] of operatii.entries()) {
      const v = vechi[k];
      if (!v || o.id !== v.id || o.tip !== v.tip || o.noduri.length !== v.noduri.length || o.noduri.some((n, j) => n !== v.noduri[j])) return false;
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
      ctx.selecteaza([r.id]);
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
  // Uneltele de desen (ADR 0051): forma trasă, ca piesă nouă cu instanța ei, aleasă după desen.
  'document.deseneaza': {
    activa: (ctx) => {
      const f = ctx.formaNoua?.();
      if (!f) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      const r = comandaDesen(ctx.istoric().doc, f);
      return r.ok ? true : r.motiv;
    },
    ruleaza: (ctx) => {
      const f = ctx.formaNoua?.();
      if (!f) return;
      const h = ctx.istoric();
      const r = comandaDesen(h.doc, f);
      if (!r.ok) return;
      ctx.scrie(executa(h, r.comanda));
      ctx.selecteaza([r.id]);
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
 * Comanda unei forme desenate (ADR 0051): piesa nouă, cu operația implicită (a dreptunghiului pentru formele închise, a
 * liniilor deschise din import pentru linie: pe linie, `adancimeDeschise`, o trecere), și instanța ei. Documentul de după
 * trebuie să treacă de plafoane și de ușa întreagă: ce se desenează se și redeschide. Ținută pe (document, formă).
 */
type ComandaDesen = { readonly ok: true; readonly comanda: Comanda; readonly id: string } | { readonly ok: false; readonly motiv: 'motiv.plafon' | 'motiv.import-refuzat' };
type FormaNoua = { readonly forma: FormaDoc; readonly x: number; readonly y: number };
let ultimulDesen: { doc: Document; f: FormaNoua; rez: ComandaDesen } | null = null;
function comandaDesen(doc: Document, f: FormaNoua): ComandaDesen {
  if (ultimulDesen && ultimulDesen.doc === doc && ultimulDesen.f === f) return ultimulDesen.rez;
  const id = idNou(doc);
  const scula = sculaFoii(doc);
  const foaie = foaieCurenta(doc);
  const baza = scula ? operatieImplicita(id, f.forma, scula) : operatieImplicita(id, f.forma);
  const deschisa = f.forma.tip === 'cale' && !f.forma.inchis;
  const adancime = adancimeDeschise(foaie.stoc.grosime);
  const operatie: Operatie = deschisa ? { ...baza, latura: 'pe-linie', adancime, pas: adancime } : baza;
  const varfuri = f.forma.tip === 'cale' ? f.forma.varfuri.length : 0;
  let rez: ComandaDesen;
  if (!incape(doc, { noduri: 1, instante: 1, elementeLume: 1, operatii: 1, taieturi: 1, varfuri, varfuriLume: varfuri })) {
    rez = { ok: false, motiv: 'motiv.plafon' };
  } else {
    const comanda: Comanda = {
      tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x: f.x, y: f.y, rotire: 0 }, pozitie: foaie.instante.length,
      piesa: { piesa: { id, radacina: { tip: 'element', id, forma: f.forma, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [operatie] }, pozitie: doc.piese.length },
    };
    // Schemele documentului (cu judecata de ansamblu), nu ușa întreagă: ușa ar lipi schemele de ea într-o singură bucată la
    // cerere (probele „schemele care nu vin” le cer separate), iar migrările și arcele în lume nu privesc o formă nouă.
    rez = is(SchemaDocument, JSON.parse(JSON.stringify(executa(istoricDin(doc), comanda).doc))) ? { ok: true, comanda, id } : { ok: false, motiv: 'motiv.import-refuzat' };
  }
  ultimulDesen = { doc, f, rez };
  return rez;
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
