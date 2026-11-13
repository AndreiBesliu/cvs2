/**
 * Raportul foilor și lista de tăiere (ADR 0210 §6, răspunsul 7; felia 11.6↑), pur, din document. Pe fiecare foaie: piesele
 * (câte, mărimea în axele piesei, rotirile instanțelor, valorile din CSV), operațiile și cât din foaie folosesc piesele
 * (aria cutiilor lor față de a foii). Foile identice (aceleași forme, în aceleași locuri, cu aceleași operații: o copie legată
 * a foii sau una cu piese separate, dar egale) se spun o dată, cu celelalte în `identice`. La capăt, totalurile pe piesă (pe
 * toate foile) și foile pe material (de cumpărat).
 *
 * Mărimea unei piese e cutia conturului care o decupează (profilul exterior prin toată grosimea foii); fără el, sau la
 * alegere, cutia desenului, marcată `desen`. Fereastra (`DialogRaportFoi.tsx`) și CSV-ul (`raportCsv.ts`) citesc raportul.
 */
import { CUTIE_GOALA, cutieContur, uneste, type Cutie } from '../geom/cutie.ts';
import { IDENTITATE, type Matrice } from '../geom/matrice.ts';
import { noduriPiesa, type Document, type Foaie, type FormaDoc, type Instanta, type Latura, type Operatie, type Piesa, type TipOperatie } from './document.ts';
import { materialFoaie, numeFoaie } from './foi.ts';
import { conturElement } from './forme.ts';
import { jsonCanonic } from './jsonCanonic.ts';
import { elementeInstanta, matriceInstanta, noduriInInstanta, type ElementLume } from './lume.ts';

/** Ce mărime spune raportul: a conturului tăiat (implicit) sau a desenului (ADR 0210, implicitele devenite opțiuni). */
export type MarimeRaport = 'taiata' | 'desen';

export type OperatieRaport = {
  readonly tip: TipOperatie;
  readonly latura: Latura;
  readonly scula: { readonly numar: number; readonly diametru: number; readonly unghi: number | null };
  readonly adancime: number;
  readonly treceri: number;
  readonly urechi: number;
  readonly despartire: boolean;
};

/** Un rând al foii: o piesă, cu mărimea ei (instanțele cu altă mărime au rândul lor). `nume` null: aplicația spune felul formei. */
export type RandPiesa = {
  readonly piesa: string;
  readonly nume: string | null;
  readonly forma: FormaDoc['tip'] | null;
  readonly cate: number;
  readonly latime: number;
  readonly inaltime: number;
  readonly din: MarimeRaport;
  /** Rotirile instanțelor, în [0, 360), crescător. */
  readonly rotiri: readonly number[];
  /** Valorile din CSV ale plăcuțelor (`campuri`), câte una pe instanță, în ordinea foii. */
  readonly valori: readonly string[];
};

export type FoaieRaport = {
  /** Locul foii în listă, de la 0. */
  readonly k: number;
  readonly id: string;
  readonly nume: string;
  readonly material: string | null;
  readonly latime: number;
  readonly inaltime: number;
  readonly grosime: number;
  /** Cât din foaie folosesc piesele (aria cutiilor lor), în procente. */
  readonly folosita: number;
  readonly operatii: readonly OperatieRaport[];
  readonly piese: readonly RandPiesa[];
  /** Foile identice cu ea (locul lor, de la 0), spuse aici, nu separat. */
  readonly identice: readonly number[];
};

export type TotalPiesa = Omit<RandPiesa, 'rotiri' | 'valori'> & {
  readonly materiale: readonly (string | null)[];
  /** Foile pe care stă (locul lor, de la 0). */
  readonly foi: readonly number[];
};

export type TotalMaterial = { readonly material: string | null; readonly latime: number; readonly inaltime: number; readonly grosime: number; readonly foi: number };

export type RaportFoi = { readonly foi: readonly FoaieRaport[]; readonly piese: readonly TotalPiesa[]; readonly materiale: readonly TotalMaterial[] };

const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const r2 = (x: number): number => Math.round(x * 100) / 100;
const m6 = (m: Matrice): number[] => [m.a, m.b, m.c, m.d, m.e, m.f].map(r6);

function cutie(elemente: readonly ElementLume[]): Cutie {
  return elemente.reduce((c, e) => uneste(c, cutieContur(conturElement(e))), CUTIE_GOALA);
}

/** Mărimea unei instanțe, în axele piesei: cutia conturului tăiat prin toată grosimea (profilul exterior), sau a desenului. */
function marime(p: Piesa, i: Instanta, grosime: number, fel: MarimeRaport): { readonly latime: number; readonly inaltime: number; readonly din: MarimeRaport } {
  const elemente = elementeInstanta(p.radacina, i, IDENTITATE);
  const din = (c: Cutie, d: MarimeRaport) => ({ latime: r6(Math.max(0, c.maxX - c.minX)), inaltime: r6(Math.max(0, c.maxY - c.minY)), din: d });
  if (fel === 'taiata') {
    const noduri = noduriInInstanta(p.radacina, i.texte);
    const taiate = new Set(p.operatii
      .filter((o) => o.tip === 'profil' && o.latura === 'exterior' && o.despartire !== true && o.adancime >= grosime - 1e-6)
      .flatMap((o) => noduri(o)));
    const c = cutie(elemente.filter((e) => taiate.has(e.nod)));
    if (c.maxX >= c.minX) return din(c, 'taiata');
  }
  return din(cutie(elemente), 'desen');
}

function operatieRaport(o: Operatie): OperatieRaport {
  return {
    tip: o.tip, latura: o.latura,
    scula: { numar: o.scula.numar, diametru: o.scula.diametru, unghi: o.scula.forma?.tip === 'v' ? o.scula.forma.unghi : null },
    adancime: o.adancime, treceri: o.pas > 0 ? Math.max(1, Math.ceil(o.adancime / o.pas - 1e-9)) : 1, urechi: o.urechi?.numar ?? 0,
    despartire: o.despartire === true,
  };
}

/**
 * Semnătura foii: mărimea și materialul ei, formele în lume și operațiile cu formele pe care le taie, fără id-uri și fără
 * numele frezelor (ce ajunge în comentarii): două foi cu aceeași semnătură taie la fel (ca foile identice ale exportului).
 */
function semnatura(f: Foaie, piese: ReadonlyMap<string, Piesa>): string {
  const parti: string[] = [];
  for (const i of f.instante) {
    const p = piese.get(i.piesa);
    if (!p) continue;
    const el = new Map(elementeInstanta(p.radacina, i, matriceInstanta(i)).map((e) => [e.nod, jsonCanonic([e.forma, m6(e.matrice)])]));
    for (const g of el.values()) parti.push(`e${g}`);
    const noduri = noduriInInstanta(p.radacina, i.texte);
    for (const o of p.operatii) {
      const { id: _id, noduri: _noduri, scula: { nume: _nume, ...scula }, ...rest } = o;
      parti.push(`o${jsonCanonic([rest, scula, noduri(o).flatMap((n) => el.get(n) ?? []).sort()])}`);
    }
  }
  return jsonCanonic([f.stoc, materialFoaie(f), parti.sort()]);
}

type Mutabil<T> = { -readonly [K in keyof T]: T[K] };
type Rand = Mutabil<Omit<RandPiesa, 'rotiri' | 'valori'>> & { rotiri: number[]; valori: string[]; rotiriSet: Set<number> };

/** Rândurile foii (piesa și mărimea ei) și aria cutiilor tuturor instanțelor. */
function randuri(f: Foaie, piese: ReadonlyMap<string, Piesa>, fel: MarimeRaport): { readonly randuri: Rand[]; readonly arie: number } {
  const rez = new Map<string, Rand>();
  let arie = 0;
  for (const i of f.instante) {
    const p = piese.get(i.piesa);
    if (!p) continue;
    const m = marime(p, i, f.stoc.grosime, fel);
    arie += m.latime * m.inaltime;
    const cheie = jsonCanonic([p.id, r2(m.latime), r2(m.inaltime), m.din]);
    let r = rez.get(cheie);
    if (!r) {
      const prim = noduriPiesa(p.radacina).find((x) => x.nod.tip === 'element')?.nod;
      r = { piesa: p.id, nume: p.nume?.trim() || null, forma: prim?.tip === 'element' ? prim.forma.tip : null, cate: 0, ...m, rotiri: [], valori: [], rotiriSet: new Set() };
      rez.set(cheie, r);
    }
    r.cate++;
    r.rotiriSet.add(r6(((i.rotire % 360) + 360) % 360));
    const valori = i.campuri ? Object.values(i.campuri) : [];
    if (valori.length > 0) r.valori.push(valori.join(' · '));
  }
  return { randuri: [...rez.values()].map((r) => ({ ...r, rotiri: [...r.rotiriSet].sort((a, b) => a - b) })), arie };
}

export function raportFoi(doc: Document, fel: MarimeRaport, sablonFoaie: (n: number) => string): RaportFoi {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const grupuri = new Map<string, number[]>();
  const foi: FoaieRaport[] = [];
  const totaluri = new Map<string, Mutabil<Omit<TotalPiesa, 'materiale' | 'foi'>> & { materiale: (string | null)[]; foi: number[] }>();
  const materiale = new Map<string, Mutabil<TotalMaterial>>();
  doc.foi.forEach((f, k) => {
    const material = materialFoaie(f);
    const { randuri: rs, arie } = randuri(f, piese, fel);
    for (const r of rs) {
      const cheie = jsonCanonic([r.piesa, r2(r.latime), r2(r.inaltime), r.din]);
      const { rotiri: _r, valori: _v, rotiriSet: _s, ...baza } = r;
      const t = totaluri.get(cheie) ?? { ...baza, cate: 0, materiale: [], foi: [] };
      t.cate += r.cate;
      if (!t.materiale.includes(material)) t.materiale.push(material);
      if (!t.foi.includes(k)) t.foi.push(k);
      totaluri.set(cheie, t);
    }
    const cm = jsonCanonic([material, f.stoc.latime, f.stoc.inaltime, f.stoc.grosime]);
    const m = materiale.get(cm) ?? { material, latime: f.stoc.latime, inaltime: f.stoc.inaltime, grosime: f.stoc.grosime, foi: 0 };
    m.foi++;
    materiale.set(cm, m);
    const s = semnatura(f, piese);
    const grup = grupuri.get(s);
    if (grup) {
      grup.push(k);
      return;
    }
    const identice: number[] = [];
    grupuri.set(s, identice);
    const operatii = new Map<string, OperatieRaport>();
    for (const id of new Set(f.instante.map((i) => i.piesa))) {
      for (const o of piese.get(id)?.operatii ?? []) {
        const x = operatieRaport(o);
        operatii.set(jsonCanonic(x), x);
      }
    }
    foi.push({
      k, id: f.id, nume: numeFoaie(f, k, sablonFoaie), material, latime: f.stoc.latime, inaltime: f.stoc.inaltime, grosime: f.stoc.grosime,
      folosita: r6((arie * 100) / (f.stoc.latime * f.stoc.inaltime)), operatii: [...operatii.values()],
      piese: rs.map(({ rotiriSet: _s, ...r }) => r), identice,
    });
  });
  return { foi, piese: [...totaluri.values()], materiale: [...materiale.values()] };
}
