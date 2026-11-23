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
import { offsetFigura } from '../geom/offset.ts';
import { VERSIUNE_SCHEMA, type Document, type IncrustatieDreapta, type Nod, type Operatie } from '../model/document.ts';
import { esteGaura, PUNTI_DOP_DREPT, valoriIncrustatieDreapta } from '../model/incrustatie.ts';
import { ordineTaieturi, type Taietura } from '../model/lume.ts';
import { conturDeTaiat } from './contur.ts';
import { contururiRegiuni, figuraDreapta, frezeIncrustatieDreapta, refuzIncrustatieDreapta, valoriBuzunarDrept, type NivelDreapta } from './incrustatieDreapta.ts';
import { puntiPeBucle, type DopCalculat } from './incrustatie.ts';
import { programDinDocument, type Regim } from './job.ts';
import { poligon } from './partiUrechi.ts';
import { lungimeBucla } from './parcurgere.ts';

/** Cât trece marginea regiunii dopului ridicat de marginea semifabricatului, cel puțin (mm): fața se coboară până dincolo. */
const DINCOLO_DE_MARGINE = 1;
/** Cât e mai lată decât freza cea mai lată fâșia dintre dop și marginea regiunii (mm): freza trece pe toată fața. */
const TRECERE = 0.5;

const fix = (x: number): string => String(Math.round(x * 1000) / 1000);

/** Săgeata cea mai mare a unei coarde la aplatizarea desenului dopului, pentru potrivirea simulată (mm; grila ei are 0,1 mm). */
const SAGEATA_DESEN = 0.002;

/** Desenul dopului pe foaie, pentru potrivirea simulată (ADR 0179): exterioarele și golurile regiunilor, ca poligoane. */
const desenDop = (regiuni: readonly { readonly exterior: Contur; readonly gauri: readonly Contur[] }[]): number[][] =>
  regiuni.flatMap((r) => [r.exterior, ...r.gauri]).map((c) => Array.from(poligon(c, SAGEATA_DESEN)));

/** Un element de document: calea închisă a conturului, în coordonatele semifabricatului (și pentru dopul în V, `dopV.ts`). */
export const element = (id: string, c: Contur): Nod => ({
  tip: 'element', id, matrice: { ...IDENTITATE }, forma: { tip: 'cale', inchis: true, varfuri: c.varfuri.map((v) => ({ p: { ...v.p }, s: { ...v.s } })) },
});

/** Dreptunghiul închis [x0, x1] × [y0, y1], ca contur. */
const dreptunghi = (x0: number, y0: number, x1: number, y1: number): Contur => ({
  inchis: true, varfuri: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ({ p: { x: x!, y: y! }, s: { tip: 'L' as const } })),
});

/**
 * Decuparea dopului prin placa lui (ADR 0171 §3, ADR 0174), prin toată placa, plus supracursa (`adancime`, ADR 0176): exterioarele
 * ca profile exterioare, cu punți, golurile ca interioare, cu cea mai mică freză a dopului (unghiurile lui au exact raza ei);
 * marginea cel puțin cât ea (altfel șanțul iese din placă). Punțile se măsoară de la fața de jos a plăcii (ADR 0028 §2), deci
 * supracursa nu le subțiază. Folosită de dopul decupat simplu și de flanșa celui în trepte.
 */
function decupareCuPunti(id: string, exterioare: readonly Contur[], goluri: readonly Contur[], op: Operatie, inc: IncrustatieDreapta, m: number, adancime: number):
  { readonly ok: true; readonly noduri: readonly Nod[]; readonly operatii: readonly Operatie[]; readonly avertismente: readonly string[] } | { readonly ok: false; readonly motiv: string } {
  const { dop: freze } = frezeIncrustatieDreapta(op);
  const mica = [...freze].sort((a, b) => a.scula.diametru - b.scula.diametru)[0]!;
  if (m < mica.scula.diametru) {
    return { ok: false, motiv: `${id}, dopul: marginea dopului decupat (${fix(m)} mm) trebuie să fie cel puțin cât freza lui (Ø${fix(mica.scula.diametru)}): altfel șanțul iese din placă` };
  }
  const noduri = [...exterioare.map((c, i) => element(`dop-${i + 1}`, c)), ...goluri.map((c, i) => element(`gol-${i + 1}`, c))];
  const baza = {
    sens: op.sens, adancime, pas: op.pas, scula: structuredClone(mica.scula), rampa: null, intrari: null, colturi: null,
  } as const;
  // Punțile, pe fiecare buclă câte încap: traseul ei e conturul lărgit cu raza frezei (profilul exterior), iar o parte mică a
  // desenului (punctul unui „i”) primește mai puține, nu refuză tot exportul. Fără lungime măsurabilă, cele cerute (judecă
  // lucrarea). Punțile sunt ale incrustației (ADR 0174, alese în fereastră) sau, fără ele, cele implicite.
  const punti = inc.punti ?? PUNTI_DOP_DREPT;
  const palier = punti.latime + mica.scula.diametru;
  const lungimi = exterioare.map((c) => {
    const o = offsetFigura([c], mica.scula.diametru / 2);
    return o.ok && o.regiuni[0] ? lungimeBucla(o.regiuni[0].exterior) : Infinity;
  });
  const pePunti = puntiPeBucle(lungimi, palier, punti.numar);
  if (!pePunti.ok) return { ok: false, motiv: `${id}, dopul: ${pePunti.motiv}` };
  return {
    ok: true, noduri,
    operatii: [
      ...[...pePunti.grupe].map(([n, ii]) => ({
        id: `exterior-${n}`, tip: 'profil' as const, noduri: ii.map((i) => `dop-${i + 1}`), latura: 'exterior' as const,
        urechi: { numar: n, latime: palier, grosime: punti.grosime }, ...baza,
      })),
      ...(goluri.length > 0 ? [{ id: 'goluri', tip: 'profil' as const, noduri: goluri.map((_, i) => `gol-${i + 1}`), latura: 'interior' as const, urechi: null, ...baza }] : []),
    ],
    avertismente: [
      `dopul ${id}: e decupat cu ${punti.numar} punți pe buclă, late de ${fix(punti.latime)} mm și groase de ${fix(punti.grosime)} mm; taie-le și curăță-le la nivelul pereților înainte de lipire`,
      ...(pePunti.avertisment ? [`dopul ${id}: ${pePunti.avertisment}`] : []),
    ],
  };
}

/**
 * Semifabricatul dopului în trepte: colțul cutiei lui pe foaie (x1, y0), marginea, mărimea; frezele; înălțimea și tija; cât trece
 * decuparea de placă (supracursa, ADR 0176).
 */
type CadruTrepte = {
  readonly x1: number; readonly y0: number; readonly m: number; readonly latime: number; readonly inaltime: number;
  readonly lata: number; readonly h: number; readonly tija: number; readonly flansa: number; readonly supracursa: number;
};

type PiesaDop = Document['piese'][number];

/**
 * Dopul în trepte (ADR 0175 §3, precizarea din 17.11), pe semifabricatul lui, mereu oglindit pe X, cu tija în sus: flanșa e
 * nivelul de sus al locașului micșorat cu c, tija e deschiderea micșorată cu c. Buzunarul din jurul tijei coboară până la
 * flanșă, pe flanșa lărgită cu diametrul primei freze plus `TRECERE` (freza ajunge peste toată fața flanșei, și în colțurile
 * ei, și are loc între tijă și marginea buzunarului), cu frezele dopului; apoi:
 * - ridicat: buzunarul din jurul flanșei, până la h, pe tot semifabricatul (fața coborâtă, ca la dopul ridicat);
 * - decupat: flanșa decupată prin placa lui (h, plus supracursa), cu cea mai mică freză și cu punți, iar golurile ei ca
 *   interioare.
 */
function dopInTrepte(id: string, sus: NivelDreapta, jos: NivelDreapta, op: Operatie, k: CadruTrepte):
  { readonly ok: true; readonly piesa: PiesaDop; readonly avertismente: readonly string[] } | { readonly ok: false; readonly motiv: string } {
  const inc = op.incrustatie;
  if (inc?.fel !== 'drept') return { ok: false, motiv: `${id}, dopul: operația n-are o incrustație cu pereți drepți` };
  const { dop: freze } = frezeIncrustatieDreapta(op);
  const [prima, ...rest] = freze;
  if (!prima) return { ok: false, motiv: `${id}, dopul: n-are freze` };
  const oglinda = { a: -1, b: 0, c: 0, d: 1, e: k.x1 + k.m, f: k.m - k.y0 };
  // Cât trece buzunarul din jurul tijei de flanșă: diametrul primei freze plus `TRECERE`. Cu raza ar ajunge peste toată fața
  // flanșei, dar canalul dintre tijă și marginea buzunarului ar avea, la un umăr îngust, doar s + R + 0,5: la Ø3 și s = 1, exact
  // cât freza, iar buzunarul nu-l mai curăța (găsit pe oracol, cazurile L și stea).
  const w = prima.scula.diametru + TRECERE;
  const peFlansa = offsetFigura(contururiRegiuni(sus.dop), w);
  if (!peFlansa.ok) return { ok: false, motiv: `${id}, dopul: fața flanșei (lărgită cu ${fix(w)} mm): ${peFlansa.motiv}` };
  const nodFata = peFlansa.regiuni.map((r, i) => element(`fata-${i + 1}`, transformaContur(r.exterior, oglinda)));
  const nodTija = contururiRegiuni(jos.dop).map((c, i) => element(`tija-${i + 1}`, transformaContur(c, oglinda)));
  const comun = { sens: op.sens, pas: op.pas, rampa: null, intrari: null, colturi: null } as const;
  const cuFrezele = {
    scula: structuredClone(prima.scula), pasLateral: prima.pasLateral, urechi: null,
    ...(rest.length > 0 ? { rest: structuredClone(rest) } : {}),
    ...(op.coborare ? { coborare: structuredClone(op.coborare) } : {}), ...(op.strategie ? { strategie: structuredClone(op.strategie) } : {}),
  } as const;
  const inJurulTijei: Operatie = {
    id: 'tija', tip: 'buzunar', noduri: [...nodFata, ...nodTija].map((n) => n.id), latura: 'interior', adancime: k.tija, ...comun, ...cuFrezele,
  };
  if (inc.dop === 'ridicat') {
    const flansa = contururiRegiuni(sus.dop).map((c, i) => element(`flansa-${i + 1}`, transformaContur(c, oglinda)));
    const e = Math.max(DINCOLO_DE_MARGINE, k.lata + TRECERE - k.m);
    const rama = element('rama', dreptunghi(-e, -e, k.latime + e, k.inaltime + e));
    return {
      ok: true,
      piesa: {
        id: 'dop', radacina: { tip: 'grup', id: 'r', matrice: { ...IDENTITATE }, copii: [rama, ...flansa, ...nodFata, ...nodTija] },
        operatii: [
          { id: 'flansa', tip: 'buzunar', noduri: ['rama', ...flansa.map((n) => n.id)], latura: 'interior', adancime: k.h, ...comun, ...cuFrezele },
          inJurulTijei,
        ],
      },
      avertismente: [
        `dopul ${id}: freza trece cu până la ${Math.ceil((e + k.lata / 2) * 10) / 10} mm dincolo de marginile semifabricatului (fața coborâtă până la margine): fixează-l fără cleme pe margini, de exemplu cu bandă dublu adezivă`,
      ],
    };
  }
  // Decupat: flanșa prin placa lui (h), cu punți (`decupareCuPunti`). Întâi marginea (buzunarul din jurul tijei trece cu w de
  // flanșă) și flanșa față de punți (ele țin flanșa, de la fața de jos a plăcii).
  if (k.m < w - 1e-9) {
    return { ok: false, motiv: `${id}, dopul: marginea dopului decupat în trepte (${fix(k.m)} mm) trebuie să fie cel puțin ${fix(w)} mm: prima lui freză (Ø${fix(prima.scula.diametru)}) ocolește tija până la ${fix(w)} mm dincolo de flanșă` };
  }
  const grosimePunti = (inc.punti ?? PUNTI_DOP_DREPT).grosime;
  if (!(k.flansa > grosimePunti)) {
    return { ok: false, motiv: `${id}, dopul: flanșa dopului decupat în trepte, groasă de ${fix(k.flansa)} mm, trebuie să fie mai groasă decât punțile (${fix(grosimePunti)} mm)` };
  }
  const exterioare = sus.dop.map((r) => transformaContur(r.exterior, oglinda));
  const goluri = sus.dop.flatMap((r) => r.gauri.map((g) => transformaContur(g, oglinda)));
  const d = decupareCuPunti(id, exterioare, goluri, op, inc, k.m, k.h + k.supracursa);
  if (!d.ok) return d;
  return {
    ok: true,
    piesa: {
      id: 'dop', radacina: { tip: 'grup', id: 'r', matrice: { ...IDENTITATE }, copii: [...d.noduri, ...nodFata, ...nodTija] },
      operatii: [inJurulTijei, ...d.operatii],
    },
    avertismente: [`dopul ${id}: e în trepte, oglindit, cu tija în sus: după decupare, întoarce-l în locaș`, ...d.avertismente],
  };
}

/**
 * Dopurile cu pereți drepți ale foii: câte unul pe regiunea fiecărei incrustații (operațiile unei piese dintr-o instanță cu
 * aceleași valori, ca locașul), fiecare cu programul lui, pe semifabricatul lui; sau motivul primului care nu se poate tăia.
 * `supracursa` (din fereastra exportului, ADR 0176): cât trece decuparea dopului decupat de placa lui; 0, exact prin ea.
 */
export function programeDopuriDrepte(doc: Document, regim: Regim, supracursa = 0): { readonly ok: true; readonly dopuri: readonly DopCalculat[] } | { readonly ok: false; readonly motiv: string } {
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
    const refuz = refuzIncrustatieDreapta(op, t.idLume, doc.foi[0]?.stoc.grosime);
    if (refuz) return { ok: false, motiv: refuz };
    const desen: Contur[] = [];
    for (const u of taieturi.filter((x) => cheie(x) === k)) {
      const r = conturDeTaiat(u);
      if (!r.ok) return { ok: false, motiv: `${u.idLume}: ${r.motiv}` };
      desen.push(r.contur);
    }
    const f = figuraDreapta(desen, op);
    if (!f.ok) return { ok: false, motiv: `${t.idLume}, dopul: ${f.motiv}` };
    // Cutia desenului, exactă, pe foaie: semifabricatul e ea plus marginea. Spre exterior (ADR 0175, precizarea din 17.11),
    // flanșa trece de desen: cutia e lărgită cu s.
    const lat = inc.treapta?.spre === 'exterior' ? inc.treapta.latime : 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of desen) {
      const b = cutieContur(c);
      x0 = Math.min(x0, b.minX - lat); y0 = Math.min(y0, b.minY - lat); x1 = Math.max(x1, b.maxX + lat); y1 = Math.max(y1, b.maxY + lat);
    }
    const m = inc.margine, latime = x1 - x0 + 2 * m, inaltime = y1 - y0 + 2 * m;
    const { dop: freze } = frezeIncrustatieDreapta(op);
    const lata = Math.max(...freze.map((x) => x.scula.diametru));
    // Înălțimea dopului și grosimea semifabricatului: din același loc ca panoul (`valoriIncrustatieDreapta`).
    // La gaură (ADR 0175), adâncimea e grosimea foii: dopul decupat e gros de T + H, cel ridicat pe față înalt de T.
    const { inaltime: h, grosime, treapta } = valoriIncrustatieDreapta(op, doc.foi[0]?.stoc.grosime)!;
    const avertismente: string[] = [];
    let piesa: Document['piese'][number];
    const jos = f.figura.jos;
    if (treapta && jos) {
      const p = dopInTrepte(t.idLume, f.figura, jos, op, { x1, y0, m, latime, inaltime, lata, h, tija: treapta.tija, flansa: treapta.flansa, supracursa });
      if (!p.ok) return p;
      piesa = p.piesa;
      avertismente.push(...p.avertismente);
    } else if (inc.dop === 'ridicat') {
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
      // Decupat: neoglindit, prin toată placa, plus supracursa (`decupareCuPunti`).
      const muta = { a: 1, b: 0, c: 0, d: 1, e: m - x0, f: m - y0 };
      const exterioare = f.figura.dop.map((r) => transformaContur(r.exterior, muta));
      const goluri = f.figura.dop.flatMap((r) => r.gauri.map((g) => transformaContur(g, muta)));
      const d = decupareCuPunti(t.idLume, exterioare, goluri, op, inc, m, grosime + supracursa);
      if (!d.ok) return d;
      piesa = { id: 'dop', radacina: { tip: 'grup', id: 'r', matrice: { ...IDENTITATE }, copii: [...d.noduri] }, operatii: [...d.operatii] };
      avertismente.push(...d.avertismente);
    }
    const sintetic: Document = {
      schema: VERSIUNE_SCHEMA, rev: 0, piese: [piesa],
      foi: [{ id: 'semifabricat', stoc: { latime, inaltime, grosime }, instante: [{ id: 'dop', piesa: 'dop', x: 0, y: 0, rotire: 0 }] }],
    };
    const job = programDinDocument(sintetic, regim, supracursa);
    if (!job.ok) return { ok: false, motiv: `${t.idLume}, dopul: ${job.motiv}` };
    dopuri.push({
      element: t.idLume, program: job.program, semifabricat: { latime, inaltime, grosimeMinima: grosime, ...(inc.dop === 'decupat' ? { exacta: true } : {}) },
      // Avertismentele figurii (colțurile, părțile unite) le spune deja lucrarea foii, la locaș.
      avertismente: [...avertismente, ...job.avertismente.map((a) => `dopul ${t.idLume}: ${a}`)],
      // Potrivirea simulată (ADR 0179): contractul de mai sus și hârtia panoului. La gaură, D e grosimea foii, iar dopul ridicat
      // pe față e înalt cât ea: sub el nu rămâne joc (g = D − h = 0). Dopul în trepte (felia 12.1↑e-4) e mereu oglindit; al celui
      // decupat, lemnul flanșei se citește deasupra punților (ele o leagă de rama plăcii).
      potrivire: treapta && jos ? {
        fel: 'trepte' as const, cutie: { x0, y0, x1, y1 }, margine: m, flansa: desenDop(f.figura.dop), tija: desenDop(jos.dop),
        hartie: {
          D: esteGaura(op) ? (doc.foi[0]?.stoc.grosime ?? op.adancime) : op.adancime, d: treapta.d, c: inc.jocLateral, tija: treapta.tija,
          h, H: inc.fierastrau, g: inc.joc, sprijin: inc.sprijin === 'fund' ? 'fund' as const : 'umar' as const,
          decupat: inc.dop === 'decupat', gaura: esteGaura(op),
        },
        taiata: inc.dop === 'decupat' ? h - (inc.punti ?? PUNTI_DOP_DREPT).grosime : Number.POSITIVE_INFINITY,
      } : {
        fel: 'drept' as const, cutie: { x0, y0, x1, y1 }, margine: m, dop: desenDop(f.figura.dop),
        hartie: {
          D: esteGaura(op) ? (doc.foi[0]?.stoc.grosime ?? op.adancime) : op.adancime, c: inc.jocLateral, h, H: inc.fierastrau,
          g: esteGaura(op) ? 0 : inc.joc,
          sprijin: inc.sprijin === 'fata' ? 'fata' as const : 'fund' as const, decupat: inc.dop === 'decupat', gaura: esteGaura(op),
        },
      },
    });
  }
  return { ok: true, dopuri };
}
