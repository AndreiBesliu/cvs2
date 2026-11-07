/**
 * Dopul incrustației în V (ADR 0170 §3, ADR 0172): se calculează din contururile locașului, la fiecare export, ca un program
 * separat, pe semifabricatul lui: nu se desenează și nu se ține în document, deci nu poate rămâne în urma desenului (perechea
 * e declarată de câmpul `incrustatie` al operației). Regulile și refuzurile sunt în `incrustatie.ts`.
 *
 * Pe hârtie (ADR 0170, „Ce am aflat”), cu t = tan(θ/2), D adâncimea locașului, g jocul pentru clei, H spațiul pentru fierăstrău
 * și S = D − g: locașul e săpat la min(D, d/t) în desen; dopul, desenul oglindit, la max(0, S − d/t) în conturul lui și la
 * min(S + H, S + d/t) în afara lui. Întors, dopul se oprește la S, cu pereții în contact pe S·t de la contur, g sub el și H între
 * plăci. Programul dopului (§3): oglinda pe X a desenului, așezată pe semifabricat (cutia desenului oglindit cu marginea m pe
 * fiecare parte, originea în colțul lui stânga-jos, Z0 pe fața lui), adică (x, y) → (x1 + m − x, y − y0 + m); fundul cu freza
 * dreaptă (fundul plat al V-carve-ului), pereții dopului cu freza V, de la adâncimea de start S. Lemnul din jurul dopului
 * (`jurDop`):
 * - **fața coborâtă** (ADR 0170): m e marginea incrustației; regiunea e dreptunghiul semifabricatului lărgit cu e (peretele V
 *   de pe marginea ei cade în aer, iar freza dreaptă coboară fața până dincolo de marginea semifabricatului), cu desenul
 *   oglindit ca goluri (par-impar: golul unei litere devine iar regiune); e = max(H·t + 1, Ø + 2w − m + 0,5), cu w = H·t +
 *   MARJA_FUND (cât stă fundul plat de fiecare perete): pe partea cea mai îngustă, între dop și marginea regiunii, freza
 *   dreaptă Ø trebuie să încapă, altfel fâșia o curăță freza V cu inele dese (măsurat la 12.1↑: Ø6 pe marginea de 5 mm lăsa
 *   4,84 mm, iar creasta inelelor ajungea la 0,0505 între plăci);
 * - **banda** (ADR 0172): regiunea e reuniunea exterioarelor desenului oglindit lărgite cu M (lățimea benzii, cel puțin
 *   2·H·t + Ø + 2c), cu desenul ca goluri; m = M + S·t + marginea (la fața plăcii, șanțul ajunge la M + S·t), deci marginile
 *   rămân întregi, pentru cleme. Cu decuparea, la urmă, freza decupării (raza r) merge pe linie pe reuniunea exterioarelor
 *   lărgite cu e + r (e = H·t + c), prin toată placa, cu punți pe buclele exterioare (palierul e lățimea plus freza, ca la
 *   12.1↑b), fără punți pe golurile reuniunii. Pe linie, nu pe o parte: tăietura stă la cel puțin e de orice parte a desenului,
 *   oricât de aproape ar fi literele între ele, iar piesa păstrată ajunge cel mult la e + r, deci stă pe fundul plat.
 */
import { VERSIUNE_SCHEMA, type Document, type Operatie } from '../model/document.ts';
import { valoriBanda, valoriIncrustatie } from '../model/incrustatie.ts';
import { ordineTaieturi, valoriVcarve, type Taietura } from '../model/lume.ts';
import { conturDreptunghi, type Contur } from '../geom/conturBaza.ts';
import { cutieContur } from '../geom/cutie.ts';
import { IDENTITATE, transformaContur } from '../geom/matrice.ts';
import { offsetFigura } from '../geom/offset.ts';
import { AXE_XYZ, type Miscare, type Scula } from '../ir/ir.ts';
import { conturDeTaiat } from './contur.ts';
import { element } from './dopDrept.ts';
import { refuzIncrustatie, type DopCalculat, type RegimDop, type SemifabricatDop } from './incrustatie.ts';
import { contururiRegiuni, regiuniDesen } from './incrustatieDreapta.ts';
import { programDinDocument } from './job.ts';
import { MARJA_FUND, traseuVcarve } from './vcarve.ts';

/** Cât trece marginea regiunii dopului de marginea semifabricatului, peste H·t (mm): peretele ei cade în aer. */
const DINCOLO_DE_MARGINE = 1;
/** Cât e mai lată decât freza dreaptă fâșia cea mai îngustă dintre dop și marginea regiunii (mm): freza trece pe toată fața. */
const TRECERE_FUND = 0.5;

const fix = (x: number): string => String(Math.round(x * 1000) / 1000);

const sculaIR = (s: Operatie['scula']): Scula => ({
  numar: s.numar, nume: s.nume, diametru: s.diametru,
  ...(s.forma ? { forma: { tip: 'v' as const, unghi: s.forma.unghi, ...(s.forma.varf !== undefined ? { varf: s.forma.varf } : {}) } } : {}),
});

/**
 * Dopurile foii: câte unul pe regiunea fiecărei incrustații (contururile V-carve ale unei piese dintr-o instanță, cu aceleași
 * valori, ca locașul), fiecare cu programul lui, pe semifabricatul lui; sau motivul primului care nu se poate tăia.
 */
export function programeDopuri(doc: Document, regim: RegimDop): { readonly ok: true; readonly dopuri: readonly DopCalculat[] } | { readonly ok: false; readonly motiv: string } {
  const operatieDe = (t: Taietura): Operatie | undefined => doc.piese.find((p) => p.id === t.piesa)?.operatii.find((o) => o.id === t.operatie);
  const taieturi = ordineTaieturi(doc, 0).filter((t) => t.tip === 'vcarve' && operatieDe(t)?.incrustatie?.fel === 'v');
  const cheie = (u: Taietura): string => {
    const o = operatieDe(u);
    return `${u.instanta}/${u.piesa}/${valoriVcarve({ ...u, fundPlat: o?.fundPlat, incrustatie: o?.incrustatie })}`;
  };
  const facute = new Set<string>();
  const dopuri: DopCalculat[] = [];
  for (const t of taieturi) {
    const k = cheie(t);
    if (facute.has(k)) continue;
    facute.add(k);
    const op = operatieDe(t)!;
    const refuz = refuzIncrustatie(op, t.idLume);
    if (refuz) return { ok: false, motiv: refuz };
    const val = valoriIncrustatie(op)!, inc = op.incrustatie!, fp = op.fundPlat!;
    // Banda (ADR 0172), sau null pe fața coborâtă: lățimea, marginea, decuparea, din același loc ca panoul.
    const banda = valoriBanda(op);
    const contururi: Contur[] = [];
    for (const u of taieturi.filter((x) => cheie(x) === k)) {
      const r = conturDeTaiat(u);
      if (!r.ok) return { ok: false, motiv: `${u.idLume}: ${r.motiv}` };
      contururi.push(r.contur);
    }
    // Cutia desenului, exactă (vârfurile și extremele arcelor), pe foaie.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of contururi) {
      const b = cutieContur(c);
      x0 = Math.min(x0, b.minX); y0 = Math.min(y0, b.minY); x1 = Math.max(x1, b.maxX); y1 = Math.max(y1, b.maxY);
    }
    const m = banda ? banda.margine : inc.margine;
    // Oglinda pe X, pe semifabricat: (x, y) → (x1 + m − x, y − y0 + m).
    const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };
    const latime = x1 - x0 + 2 * m, inaltime = y1 - y0 + 2 * m;
    const desen = contururi.map((c) => transformaContur(c, oglinda));
    // Exterioarele desenului oglindit (golurile literelor nu se lărgesc: rămân în regiune și în piesa păstrată).
    const exterioare = (): Contur[] => regiuniDesen(desen).map((r) => r.exterior);
    let regiune: Contur[];
    const avertismente: string[] = [];
    if (banda) {
      const larg = offsetFigura(exterioare(), banda.latime);
      if (!larg.ok) return { ok: false, motiv: `${t.idLume}, banda dopului (${fix(banda.latime)} mm): ${larg.motiv}` };
      regiune = [...contururiRegiuni(larg.regiuni), ...desen];
    } else {
      const w = val.H * val.t + MARJA_FUND;
      const e = Math.max(val.H * val.t + DINCOLO_DE_MARGINE, fp.scula.diametru + 2 * w - m + TRECERE_FUND);
      regiune = [conturDreptunghi(-e, -e, latime + 2 * e, inaltime + 2 * e), ...desen];
      // Cât trece freza de marginile semifabricatului, cel mult: marginea regiunii plus raza celei mai late freze.
      const dincolo = e + Math.max(op.scula.diametru, fp.scula.diametru) / 2;
      avertismente.push(`dopul ${t.idLume}: freza trece cu până la ${Math.ceil(dincolo * 10) / 10} mm dincolo de marginile semifabricatului (fața coborâtă până la margine): fixează-l fără cleme pe margini, de exemplu cu bandă dublu adezivă`);
    }
    const f = op.scula.forma!;
    const v = traseuVcarve({
      contururi: regiune, unghi: f.unghi, varf: 0, diametruScula: op.scula.diametru, adancime: val.S + val.H, adancimeStart: val.S,
      pas: op.pas, avans: regim.avans, avansPlonjare: regim.avansPlonjare, zSigur: regim.zSigur,
      fundPlat: {
        diametru: fp.scula.diametru, pasLateral: fp.pasLateral, sens: op.sens,
        ...(fp.rest ? { rest: fp.rest.map((r) => ({ diametru: r.scula.diametru, pasLateral: r.pasLateral })) } : {}),
      },
    });
    if (!v.ok) return { ok: false, motiv: `${t.idLume}, dopul: ${v.motiv}` };
    const miscari: Miscare[] = [];
    const eticheta = (text: string): void => { miscari.push({ tip: 'eticheta', text, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` }); };
    let initiala: Scula | null = null, curenta: Scula | null = null;
    const monteaza = (s: Operatie['scula']): void => {
      if (curenta === null) { curenta = initiala = sculaIR(s); return; }
      if (s.numar === curenta.numar) return;
      curenta = sculaIR(s);
      miscari.push({ tip: 'schimba-scula', scula: curenta, turatie: regim.turatie });
    };
    if (v.fund.length > 0) {
      monteaza(fp.scula);
      eticheta(`dopul ${t.idLume}: ${banda ? 'fundul benzii' : 'fața coborâtă'} la ${fix(val.S + val.H)} mm cu T${fp.scula.numar} Ø${fp.scula.diametru}`);
      for (const x of v.fund) miscari.push(x);
    }
    for (const [kr, r] of (fp.rest ?? []).entries()) {
      const mr = v.fundRest[kr] ?? [];
      if (mr.length === 0) continue;
      monteaza(r.scula);
      eticheta(`dopul ${t.idLume}: restul ${banda ? 'fundului' : 'feței'} cu T${r.scula.numar} Ø${r.scula.diametru}`);
      for (const x of mr) miscari.push(x);
    }
    monteaza(op.scula);
    eticheta(`dopul ${t.idLume}: pereții cu T${op.scula.numar}, de la ${fix(val.S)} la ${fix(val.S + val.H)} mm`);
    for (const x of v.miscari) miscari.push(x);
    let semifabricat: SemifabricatDop = { latime, inaltime, grosimeMinima: val.grosimeMinima };
    if (banda?.decupare) {
      // Decuparea, la urmă (după ea, dopul ține doar în punți): pe linie, pe exterioarele lărgite cu e + r, prin toată placa.
      const d = banda.freza, T = banda.placa, p = banda.punti;
      const linie = offsetFigura(exterioare(), banda.e + d.diametru / 2);
      if (!linie.ok) return { ok: false, motiv: `${t.idLume}, decuparea dopului: ${linie.motiv}` };
      const bucle = linie.regiuni.map((r) => r.exterior), goluri = linie.regiuni.flatMap((r) => r.gauri);
      const noduri = [...bucle.map((c, i) => element(`bucla-${i + 1}`, c)), ...goluri.map((c, i) => element(`gol-${i + 1}`, c))];
      const baza = {
        tip: 'profil', latura: 'pe-linie', sens: op.sens, adancime: T, pas: op.pas, scula: structuredClone(d), rampa: null, intrari: null, colturi: null,
      } as const;
      const sintetic: Document = {
        schema: VERSIUNE_SCHEMA, rev: 0,
        piese: [{
          id: 'dop', radacina: { tip: 'grup', id: 'r', matrice: { ...IDENTITATE }, copii: noduri },
          operatii: [
            // Palierul punții pe traseu e lățimea plus freza (ADR 0031: lemnul rămas e palierul minus freza), ca la 12.1↑b.
            { id: 'decupare', noduri: bucle.map((_, i) => `bucla-${i + 1}`), urechi: { numar: p.numar, latime: p.latime + d.diametru, grosime: p.grosime }, ...baza },
            ...(goluri.length > 0 ? [{ id: 'goluri', noduri: goluri.map((_, i) => `gol-${i + 1}`), urechi: null, ...baza }] : []),
          ],
        }],
        foi: [{ id: 'semifabricat', stoc: { latime, inaltime, grosime: T }, instante: [{ id: 'dop', piesa: 'dop', x: 0, y: 0, rotire: 0 }] }],
      };
      const job = programDinDocument(sintetic, regim);
      if (!job.ok) return { ok: false, motiv: `${t.idLume}, decuparea dopului: ${job.motiv}` };
      monteaza(d);
      eticheta(`dopul ${t.idLume}: decuparea cu T${d.numar} Ø${d.diametru}, prin placa de ${fix(T)} mm, cu ${p.numar} punți pe buclă`);
      for (const x of job.program.miscari) miscari.push(x);
      semifabricat = { latime, inaltime, grosimeMinima: T, exacta: true };
      avertismente.push(`dopul ${t.idLume}: e decupat din placa groasă de exact ${fix(T)} mm, cu ${p.numar} punți pe buclă, late de ${fix(p.latime)} mm și groase de ${fix(p.grosime)} mm; taie-le și curăță-le înainte de lipire`);
      for (const a of job.avertismente) avertismente.push(`dopul ${t.idLume}: ${a}`);
    } else if (banda) {
      avertismente.push(`dopul ${t.idLume}: banda lasă marginile întregi; decupează dopul tu, cu fierăstrăul, pe fundul benzii, la cel puțin ${fix(banda.e)} mm de desen (mai aproape ar tăia peretele dopului)`);
    }
    const scula = initiala ?? sculaIR(op.scula);
    dopuri.push({
      element: t.idLume,
      program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari },
      semifabricat,
      avertismente: [...avertismente, ...v.avertismente.map((a) => `dopul ${t.idLume}: ${a}`)],
    });
  }
  return { ok: true, dopuri };
}
