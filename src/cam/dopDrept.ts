/**
 * Dopul incrustației cu pereți drepți (ADR 0171 §3), calculat din desen la fiecare export, ca la V: conturul dopului
 * (`figuraDreapta`: conturul tăiat al locașului micșorat cu c) e pus pe semifabricatul lui, iar programul îl face chiar lucrarea
 * aplicației, dintr-un document sintetic, cu frezele dopului:
 * - **ridicat:** conturul oglindit pe X, (x, y) → (x1 + m − x, y − y0 + m), ca insulă într-un buzunar al semifabricatului lărgit
 *   cu e (fața coborâtă în jur, până dincolo de margini); înălțimea h = D + H pe fund, D − g pe față;
 * - **decupat:** conturul neoglindit, (x, y) → (x − x0 + m, y − y0 + m), tăiat ca exterior prin toată placa (D + H), cu punți,
 *   cu cea mai mică freză a dopului (unghiurile lui au exact raza ei); golurile, ca interioare.
 * Semifabricatul e cutia desenului cu `margine` pe fiecare parte; XY0 în colțul lui, Z0 pe fața lui (exportul o pune).
 */
import type { Contur } from '../geom/conturBaza.ts';
import { cutieContur } from '../geom/cutie.ts';
import { IDENTITATE, transformaContur } from '../geom/matrice.ts';
import { VERSIUNE_SCHEMA, type Document, type Nod, type Operatie } from '../model/document.ts';
import { valoriIncrustatieDreapta } from '../model/incrustatie.ts';
import { ordineTaieturi, type Taietura } from '../model/lume.ts';
import { conturDeTaiat } from './contur.ts';
import { contururiRegiuni, figuraDreapta, frezeIncrustatieDreapta, refuzIncrustatieDreapta, valoriBuzunarDrept } from './incrustatieDreapta.ts';
import type { DopCalculat } from './incrustatie.ts';
import { programDinDocument, type Regim } from './job.ts';

/** Cât trece marginea regiunii dopului ridicat de marginea semifabricatului, cel puțin (mm): fața se coboară până dincolo. */
const DINCOLO_DE_MARGINE = 1;
/** Cât e mai lată decât freza cea mai lată fâșia dintre dop și marginea regiunii (mm): freza trece pe toată fața. */
const TRECERE = 0.5;
/**
 * Punțile dopului decupat: câte pe buclă, lățimea lemnului rămas și grosimea lui (de la fața de jos), mm. Pe traseul frezei,
 * palierul punții e lățimea plus diametrul frezei (ADR 0031: coloana punții e palierul minus diametrul), deci lucrarea nu le
 * refuză ca mai scurte decât freza, oricare ar fi ea.
 */
const PUNTI = { numar: 4, latime: 4, grosime: 1 } as const;

const fix = (x: number): string => String(Math.round(x * 1000) / 1000);

/** Un element de document: calea închisă a conturului, în coordonatele semifabricatului. */
const element = (id: string, c: Contur): Nod => ({
  tip: 'element', id, matrice: { ...IDENTITATE }, forma: { tip: 'cale', inchis: true, varfuri: c.varfuri.map((v) => ({ p: { ...v.p }, s: { ...v.s } })) },
});

/** Dreptunghiul închis [x0, x1] × [y0, y1], ca contur. */
const dreptunghi = (x0: number, y0: number, x1: number, y1: number): Contur => ({
  inchis: true, varfuri: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ({ p: { x: x!, y: y! }, s: { tip: 'L' as const } })),
});

/**
 * Dopurile cu pereți drepți ale foii: câte unul pe regiunea fiecărei incrustații (operațiile unei piese dintr-o instanță cu
 * aceleași valori, ca locașul), fiecare cu programul lui, pe semifabricatul lui; sau motivul primului care nu se poate tăia.
 */
export function programeDopuriDrepte(doc: Document, regim: Regim): { readonly ok: true; readonly dopuri: readonly DopCalculat[] } | { readonly ok: false; readonly motiv: string } {
  const operatieDe = (t: Taietura): Operatie | undefined => doc.piese.find((p) => p.id === t.piesa)?.operatii.find((o) => o.id === t.operatie);
  const taieturi = ordineTaieturi(doc, 0).filter((t) => t.tip === 'buzunar' && operatieDe(t)?.incrustatie?.fel === 'drept');
  const cheie = (u: Taietura): string => {
    const o = operatieDe(u);
    return `${u.instanta}/${u.piesa}/${o ? valoriBuzunarDrept(o) : u.operatie}`;
  };
  const facute = new Set<string>();
  const dopuri: DopCalculat[] = [];
  for (const t of taieturi) {
    const k = cheie(t);
    if (facute.has(k)) continue;
    facute.add(k);
    const op = operatieDe(t)!;
    const inc = op.incrustatie;
    if (inc?.fel !== 'drept') continue;
    const refuz = refuzIncrustatieDreapta(op, t.idLume);
    if (refuz) return { ok: false, motiv: refuz };
    const desen: Contur[] = [];
    for (const u of taieturi.filter((x) => cheie(x) === k)) {
      const r = conturDeTaiat(u);
      if (!r.ok) return { ok: false, motiv: `${u.idLume}: ${r.motiv}` };
      desen.push(r.contur);
    }
    const f = figuraDreapta(desen, op);
    if (!f.ok) return { ok: false, motiv: `${t.idLume}, dopul: ${f.motiv}` };
    // Cutia desenului, exactă, pe foaie: semifabricatul e ea plus marginea.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of desen) {
      const b = cutieContur(c);
      x0 = Math.min(x0, b.minX); y0 = Math.min(y0, b.minY); x1 = Math.max(x1, b.maxX); y1 = Math.max(y1, b.maxY);
    }
    const m = inc.margine, latime = x1 - x0 + 2 * m, inaltime = y1 - y0 + 2 * m;
    const { dop: freze } = frezeIncrustatieDreapta(op);
    const lata = Math.max(...freze.map((x) => x.scula.diametru));
    // Înălțimea dopului și grosimea semifabricatului: din același loc ca panoul (`valoriIncrustatieDreapta`).
    const { inaltime: h, grosime } = valoriIncrustatieDreapta(op)!;
    const avertismente: string[] = [];
    let piesa: Document['piese'][number];
    if (inc.dop === 'ridicat') {
      const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };
      const contururi = contururiRegiuni(f.figura.dop).map((c) => transformaContur(c, oglinda));
      const e = Math.max(DINCOLO_DE_MARGINE, lata + TRECERE - m);
      const noduri = [element('rama', dreptunghi(-e, -e, latime + e, inaltime + e)), ...contururi.map((c, i) => element(`dop-${i + 1}`, c))];
      const [prima, ...rest] = freze;
      piesa = {
        id: 'dop', radacina: { tip: 'grup', id: 'r', matrice: { ...IDENTITATE }, copii: noduri },
        operatii: [{
          id: 'fata', tip: 'buzunar', noduri: noduri.map((n) => n.id), latura: 'interior', sens: op.sens, adancime: h, pas: op.pas,
          scula: structuredClone(prima!.scula), pasLateral: prima!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
          ...(rest.length > 0 ? { rest: structuredClone(rest) } : {}),
          ...(op.coborare ? { coborare: structuredClone(op.coborare) } : {}), ...(op.strategie ? { strategie: structuredClone(op.strategie) } : {}),
        }],
      };
      avertismente.push(`dopul ${t.idLume}: freza trece cu până la ${Math.ceil((e + lata / 2) * 10) / 10} mm dincolo de marginile semifabricatului (fața coborâtă până la margine): fixează-l fără cleme pe margini, de exemplu cu bandă dublu adezivă`);
    } else {
      // Decupat: cu cea mai mică freză a dopului, ca unghiurile lui să aibă exact raza ei; prin toată placa, cu punți.
      const mica = [...freze].sort((a, b) => a.scula.diametru - b.scula.diametru)[0]!;
      if (m < mica.scula.diametru) {
        return { ok: false, motiv: `${t.idLume}, dopul: marginea dopului decupat (${fix(m)} mm) trebuie să fie cel puțin cât freza lui (Ø${fix(mica.scula.diametru)}): altfel șanțul iese din placă` };
      }
      const muta = { a: 1, b: 0, c: 0, d: 1, e: m - x0, f: m - y0 };
      const exterioare = f.figura.dop.map((r) => transformaContur(r.exterior, muta));
      const goluri = f.figura.dop.flatMap((r) => r.gauri.map((g) => transformaContur(g, muta)));
      const noduri = [...exterioare.map((c, i) => element(`dop-${i + 1}`, c)), ...goluri.map((c, i) => element(`gol-${i + 1}`, c))];
      const baza = {
        sens: op.sens, adancime: grosime, pas: op.pas, scula: structuredClone(mica.scula), rampa: null, intrari: null, colturi: null,
      } as const;
      piesa = {
        id: 'dop', radacina: { tip: 'grup', id: 'r', matrice: { ...IDENTITATE }, copii: noduri },
        operatii: [
          { id: 'exterior', tip: 'profil', noduri: exterioare.map((_, i) => `dop-${i + 1}`), latura: 'exterior', urechi: { numar: PUNTI.numar, latime: PUNTI.latime + mica.scula.diametru, grosime: PUNTI.grosime }, ...baza },
          ...(goluri.length > 0 ? [{ id: 'goluri', tip: 'profil' as const, noduri: goluri.map((_, i) => `gol-${i + 1}`), latura: 'interior' as const, urechi: null, ...baza }] : []),
        ],
      };
      avertismente.push(`dopul ${t.idLume}: e decupat cu ${PUNTI.numar} punți pe buclă, late de ${PUNTI.latime} mm și groase de ${PUNTI.grosime} mm; taie-le și curăță-le la nivelul pereților înainte de lipire`);
    }
    const sintetic: Document = {
      schema: VERSIUNE_SCHEMA, rev: 0, piese: [piesa],
      foi: [{ id: 'semifabricat', stoc: { latime, inaltime, grosime }, instante: [{ id: 'dop', piesa: 'dop', x: 0, y: 0, rotire: 0 }] }],
    };
    const job = programDinDocument(sintetic, regim);
    if (!job.ok) return { ok: false, motiv: `${t.idLume}, dopul: ${job.motiv}` };
    dopuri.push({
      element: t.idLume, program: job.program, semifabricat: { latime, inaltime, grosimeMinima: grosime, ...(inc.dop === 'decupat' ? { exacta: true } : {}) },
      // Avertismentele figurii (colțurile, părțile unite) le spune deja lucrarea foii, la locaș.
      avertismente: [...avertismente, ...job.avertismente.map((a) => `dopul ${t.idLume}: ${a}`)],
    });
  }
  return { ok: true, dopuri };
}
