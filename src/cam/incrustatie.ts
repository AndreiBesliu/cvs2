/**
 * Incrustația în V (ADR 0170). Locașul e V-carve-ul operației, tăiat în programul foii (`job.ts`); dopul se calculează aici,
 * din aceleași contururi, la fiecare export, ca un program separat, pe semifabricatul lui: nu se desenează și nu se ține în
 * document, deci nu poate rămâne în urma desenului (perechea e declarată de câmpul `incrustatie` al operației).
 *
 * Pe hârtie (ADR 0170, „Ce am aflat”), cu t = tan(θ/2), D adâncimea locașului, g jocul pentru clei, H spațiul pentru fierăstrău
 * și S = D − g: locașul e săpat la min(D, d/t) în desen; dopul, desenul oglindit, la max(0, S − d/t) în conturul lui și la
 * min(S + H, S + d/t) în afara lui. Întors, dopul se oprește la S, cu pereții în contact pe S·t de la contur, g sub el și H între
 * plăci. Programul dopului (§3): oglinda pe X a desenului, așezată pe semifabricat (cutia desenului oglindit cu `margine` pe
 * fiecare parte, originea în colțul lui stânga-jos, Z0 pe fața lui), adică (x, y) → (x1 + m − x, y − y0 + m); fața coborâtă la
 * S + H cu freza dreaptă (fundul plat al V-carve-ului), pereții dopului cu freza V, de la adâncimea de start S. Regiunea e
 * dreptunghiul semifabricatului lărgit cu e (peretele V de pe marginea ei cade în aer, iar freza dreaptă coboară fața până
 * dincolo de marginea semifabricatului), cu desenul oglindit ca goluri (par-impar: golul unei litere devine iar regiune);
 * e = max(H·t + 1, Ø + 2w − m + 0,5), cu w = H·t + MARJA_FUND (cât stă fundul plat de fiecare perete): pe partea cea mai
 * îngustă, între dop și marginea regiunii, freza dreaptă Ø trebuie să încapă, altfel fâșia o curăță freza V cu inele dese
 * (măsurat la 12.1↑: Ø6 pe marginea de 5 mm lăsa 4,84 mm, iar creasta inelelor ajungea la 0,0505 între plăci).
 */
import { inaltimeConV, JOC_INCRUSTATIE_MINIM, type Document, type Operatie } from '../model/document.ts';
import { valoriIncrustatie } from '../model/incrustatie.ts';
import { refuzIncrustatieDreapta } from './incrustatieDreapta.ts';
import { ordineTaieturi, valoriVcarve, type Taietura } from '../model/lume.ts';
import { conturDreptunghi, type Contur } from '../geom/conturBaza.ts';
import { cutieContur } from '../geom/cutie.ts';
import { transformaContur } from '../geom/matrice.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { conturDeTaiat } from './contur.ts';
import { MARJA_FUND, traseuVcarve } from './vcarve.ts';

/** Turația, avansurile și Z-ul de siguranță (aceleași câmpuri ca regimul lucrării). */
export type RegimDop = { readonly turatie: number; readonly avans: number; readonly avansPlonjare: number; readonly zSigur: number };

/**
 * Semifabricatul unui dop: lățimea și înălțimea lui (cutia desenului + marginea pe fiecare parte) și grosimea cea mai mică;
 * `exacta`: dopul decupat (ADR 0171), a cărui placă trebuie să fie exact atât de groasă (tăietura trece prin ea, cu punți).
 */
export type SemifabricatDop = { readonly latime: number; readonly inaltime: number; readonly grosimeMinima: number; readonly exacta?: true };

export type DopCalculat = {
  /** Elementul (în lume) al primei tăieturi a regiunii: după el se recunoaște dopul. */
  readonly element: string;
  readonly program: Program;
  readonly semifabricat: SemifabricatDop;
  readonly avertismente: readonly string[];
};

/** Cât trece marginea regiunii dopului de marginea semifabricatului, peste H·t (mm): peretele ei cade în aer. */
const DINCOLO_DE_MARGINE = 1;
/** Cât e mai lată decât freza dreaptă fâșia cea mai îngustă dintre dop și marginea regiunii (mm): freza trece pe toată fața. */
const TRECERE_FUND = 0.5;

/**
 * De ce nu se poate tăia incrustația (ADR 0170 §4), sau null: doar pe un V-carve, cu o freză în V ascuțită; jocul cel puțin
 * `JOC_INCRUSTATIE_MINIM` și sub adâncime; dopul săpat (S + H) cel mult cât conul frezei; fața coborâtă (banda vine în 12.1↑c);
 * fața dopului cere freza dreaptă (varianta doar cu V vine în 12.1↑d). Locașul (adâncimea cât conul, fundul plat) îl judecă
 * V-carve-ul lui.
 */
export function refuzIncrustatie(op: Operatie, unde: string): string | null {
  const i = op.incrustatie;
  if (!i) return null;
  // Cu pereți drepți (ADR 0171), refuzurile ei.
  if (i.fel === 'drept') return refuzIncrustatieDreapta(op, unde);
  if (op.tip !== 'vcarve') return `${unde}: incrustația în V e a unui V-carve (pe un buzunar, alege incrustația cu pereți drepți)`;
  const f = op.scula.forma;
  if (f?.tip !== 'v') return `${unde}: incrustația cere o freză în V (T${op.scula.numar} e plată)`;
  if (f.varf !== undefined && f.varf > 0) {
    return `${unde}: freza în V cu vârf plat (T${op.scula.numar}, ${f.varf} mm) lasă fundul șanțurilor înguste mai sus, iar dopul s-ar opri pe el: alege o freză ascuțită`;
  }
  if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) {
    return `${unde}: jocul pentru clei, de ${i.joc} mm, trebuie să fie cel puțin ${JOC_INCRUSTATIE_MINIM} mm (crestele colțurilor ar ține dopul)`;
  }
  if (!(i.joc < op.adancime)) return `${unde}: jocul pentru clei, de ${i.joc} mm, trebuie să fie sub adâncimea locașului (${op.adancime} mm)`;
  const con = inaltimeConV(op.scula.diametru, f.unghi);
  const pana = op.adancime - i.joc + i.fierastrau;
  if (pana > con + 1e-9) {
    return `${unde}: dopul se sapă până la ${fix(pana)} mm (adâncimea − jocul + spațiul pentru fierăstrău), iar conul frezei în V (Ø${op.scula.diametru}, ${f.unghi}°) are ${fix(con)} mm: micșorează spațiul pentru fierăstrău sau alege o freză mai lată`;
  }
  if (i.jurDop === 'banda') return `${unde}: banda îngustă din jurul dopului vine în felia 12.1↑c; deocamdată, fața coborâtă toată`;
  if (!op.fundPlat) {
    return `${unde}: fața dopului se coboară cu freza dreaptă: alege-o în coloana Fund plat (varianta doar cu freza V vine în felia 12.1↑d)`;
  }
  return null;
}

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
    const m = inc.margine;
    // Oglinda pe X, pe semifabricat: (x, y) → (x1 + m − x, y − y0 + m).
    const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };
    const latime = x1 - x0 + 2 * m, inaltime = y1 - y0 + 2 * m;
    const w = val.H * val.t + MARJA_FUND;
    const e = Math.max(val.H * val.t + DINCOLO_DE_MARGINE, fp.scula.diametru + 2 * w - m + TRECERE_FUND);
    // Cât trece freza de marginile semifabricatului, cel mult: marginea regiunii plus raza celei mai late freze.
    const dincolo = e + Math.max(op.scula.diametru, fp.scula.diametru) / 2;
    const regiune = [conturDreptunghi(-e, -e, latime + 2 * e, inaltime + 2 * e), ...contururi.map((c) => transformaContur(c, oglinda))];
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
      eticheta(`dopul ${t.idLume}: fața coborâtă la ${fix(val.S + val.H)} mm cu T${fp.scula.numar} Ø${fp.scula.diametru}`);
      for (const x of v.fund) miscari.push(x);
    }
    for (const [kr, r] of (fp.rest ?? []).entries()) {
      const mr = v.fundRest[kr] ?? [];
      if (mr.length === 0) continue;
      monteaza(r.scula);
      eticheta(`dopul ${t.idLume}: restul feței cu T${r.scula.numar} Ø${r.scula.diametru}`);
      for (const x of mr) miscari.push(x);
    }
    monteaza(op.scula);
    eticheta(`dopul ${t.idLume}: pereții cu T${op.scula.numar}, de la ${fix(val.S)} la ${fix(val.S + val.H)} mm`);
    for (const x of v.miscari) miscari.push(x);
    const scula = initiala ?? sculaIR(op.scula);
    dopuri.push({
      element: t.idLume,
      program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari },
      semifabricat: { latime, inaltime, grosimeMinima: val.grosimeMinima },
      avertismente: [
        `dopul ${t.idLume}: freza trece cu până la ${Math.ceil(dincolo * 10) / 10} mm dincolo de marginile semifabricatului (fața coborâtă până la margine): fixează-l fără cleme pe margini, de exemplu cu bandă dublu adezivă`,
        ...v.avertismente.map((a) => `dopul ${t.idLume}: ${a}`),
      ],
    });
  }
  return { ok: true, dopuri };
}
