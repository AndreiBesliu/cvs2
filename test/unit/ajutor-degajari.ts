/**
 * Ajutoarele oracolului degajărilor (ADR 0032), comune fișierelor de teste `degajari.oracol.test.ts`,
 * `degajari.corpus.oracol.test.ts` și `degajari.octeti.oracol.test.ts` (împărțite ca să ruleze în paralel). Nu e un
 * test; doar testele din `test/unit` îl importă.
 */
import { createHash } from 'node:crypto';
import { citeste, type Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import type { DocV8O } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument, verificaEticheta } from '../oracles/regiune.ts';
import {
  analizeazaDegajarile, drumuriDusIntors, faraDrumuri, intrareaInPerete, masoaraDrumurile, restulInColt, type ColtJudecat, type JudecataFoii,
} from '../oracles/degajari.ts';
import { campul } from '../oracles/intrari-rampa.ts';
import type { CazDeg, ColtHartie } from '../oracles/degajari.cazuri.ts';
import type { Montaj } from '../oracles/regiune.cazuri.ts';
import { schemaAplicatiei } from './ajutor-lipire.ts';

export const SCHEMA = await schemaAplicatiei();
export const AVANS_PLONJARE = 300;
/** Invariantele judecate pe programele aplicației (plus viteza pe verticală, sub 10). */
export const INVARIANTE: readonly number[] = [1, 2, 3, 5, 9, 10, 11, 12, 13];
export const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
export const mesaje = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');
export const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(p.x - q.x, p.y - q.y);
export const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Contextul porții pentru un document v8 și un montaj: foaia, freza și pasul (cel mai mare) din document. */
export function ctxDoc(doc: DocV8O, m: { readonly origine: Montaj['origine']; readonly z0: Montaj['z0'] }): ContextPoarta {
  const st = doc.foi[0]!.stoc;
  const ops = doc.piese.flatMap((p) => p.operatii);
  return {
    foaie: { latime: st.latime, inaltime: st.inaltime, grosime: st.grosime }, origine: m.origine, z0: m.z0,
    diametruScula: ops[0]?.scula.diametru ?? 6, pas: Math.max(...ops.map((o) => o.pas)), supracursa: 0, asteptareAx: 3,
    regiune: regiuneDinDocument(doc), avansPlonjare: AVANS_PLONJARE,
  };
}

/** Încălcările porții din lista invariantelor judecate. */
export const judeca = (text: string, ctx: ContextPoarta, o: Parameters<typeof poarta>[2] = {}): Incalcare[] =>
  poarta(text, ctx, o).filter((i) => INVARIANTE.includes(i.invarianta));

/**
 * Geometria mișcărilor unui program (codul, capetele în mașină, I / J; fără F și fără comentarii), una pe rând; cu
 * `faraDrum`, fără mișcările drumurilor dus-întors (citite în document, cu montajul). „Nimic altceva nu se schimbă”:
 * programul cu degajări, fără drumuri, are exact geometria programului fără `colturi`.
 */
export function geometria(text: string, m?: { readonly foaie: { latime: number; inaltime: number; grosime: number }; readonly origine: Montaj['origine']; readonly z0: Montaj['z0'] }): string[] {
  const { evenimente } = citeste(text);
  const ev = m ? faraDrumuri(evenimente, drumuriDusIntors(evenimente, (q: Punct3) => laDocument(q, m))) : evenimente;
  return ev.flatMap((e) => (e.tip !== 'mutare' ? [] : [`G${e.m.cod} ${e.m.a.join(',')} > ${e.m.b.join(',')}${e.m.cod >= 2 ? ` I${e.m.i} J${e.m.j}` : ''}`]));
}

/**
 * Colțurile judecate de oracol pe un program (ca în poartă: etichetele valide, singure pe linie, ale unei tăieturi din
 * document), pe fiecare tăietură (elementul în lume) cu verdictul §5, plus drumurile citite.
 */
export function colturileJudecate(text: string, ctx: ContextPoarta): { readonly pe: ReadonlyMap<string, readonly ColtJudecat[]>; readonly drumuri: number; readonly judecata: JudecataFoii } {
  const reg = ctx.regiune!;
  const { evenimente, comentarii } = citeste(text);
  const etichete = comentarii.flatMap((c) => {
    const e = citesteEticheta(c.text);
    if (e === null) return [];
    return [{ linia: c.linia, eticheta: e !== 'stricata' && c.singur && verificaEticheta(reg, e) === null ? e : null }];
  });
  const a = analizeazaDegajarile(evenimente, etichete, reg, (q) => laDocument(q, ctx), ctx.diametruScula / 2, ctx.foaie);
  const pe = new Map<string, ColtJudecat[]>();
  for (const [cheie, lista] of a.colturi) {
    const id = cheie.split('|')[0]!;
    pe.set(id, [...(pe.get(id) ?? []), ...lista]);
  }
  return { pe, drumuri: a.drumuri.length, judecata: a.judecata };
}

/** Prima diferență dintre două liste de linii (sau null). */
export function primaDiferenta(a: readonly string[], b: readonly string[]): string | null {
  for (let k = 0; k < Math.max(a.length, b.length); k++) if (a[k] !== b[k]) return `mișcarea ${k}: ${a[k] ?? '(lipsă)'} ≠ ${b[k] ?? '(lipsă)'}`;
  return null;
}

/** Documentul cu `colturi: null` pe toate operațiile (programul trebuie să fie cel de dinainte de ADR 0032). */
export function faraColturi(doc: DocV8O): DocV8O {
  const d = structuredClone(doc);
  for (const p of d.piese) for (const o of p.operatii) o.colturi = null;
  return d;
}

/** Numerele dintr-un text (cu punct zecimal). */
export const numerele = (s: string): number[] => [...s.matchAll(/-?\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));

/**
 * Avertismentele de degajare omisă care pomenesc elementul și colțul V (coordonatele lui, ±0,001, în document): ADR
 * 0032 §5 („degajarea omisă pe <idLume>, colțul (x, y)”). ALEGERE: se cere conținutul (elementul și colțul), nu
 * formularea exactă.
 */
export function avertizat(av: readonly string[] | null, idLume: string, V: { x: number; y: number }): boolean {
  return (av ?? []).some((a) => a.includes(idLume) && /degajare/i.test(a) && /omis/i.test(a)
    && numerele(a.replace(idLume, '')).some((x, k, xs) => Math.abs(x - V.x) <= 0.001 && Math.abs((xs[k + 1] ?? NaN) - V.y) <= 0.001));
}

/** Vârful 0 al buclei unei forme: startul primei mișcări în plan sub eticheta ei (fără intrări). */
function varful0(text: string, idLume: string, m: Montaj): { x: number; y: number } | null {
  const L = text.split('\n');
  let sub = false;
  for (const l of L) {
    if (l.startsWith('(')) { sub = l.startsWith(`(${idLume}:`); continue; }
    if (!sub) continue;
    const x = /^G0 X(-?\d+\.\d+) Y(-?\d+\.\d+)/.exec(l);
    if (x) { const q = laDocument([Number(x[1]), Number(x[2]), 0], m); return { x: q[0], y: q[1] }; }
  }
  return null;
}

/**
 * Hârtia pe un program al unui caz (§8): drumurile măsurate (Q, E, lungimea, Z constant, sosirea), câte pe colț,
 * nimic în afara colțurilor păstrate; pe câmpul de înălțimi și exact: colțul V tăiat la adâncime (restul ≤ 0,005 mm)
 * pe colțurile păstrate și netăiat pe cele omise, cât intră degajarea în fiecare perete, nicio mișcare peste pas (în
 * fereastra colțului, `cuCamp`). Întoarce problemele (goală = programul e cel de pe hârtie).
 */
export function hartieDeg(c: CazDeg, text: string, m: Montaj, cuCamp = false): string[] {
  const rele: string[] = [];
  const laDoc = (q: Punct3): Punct3 => laDocument(q, m);
  const R = c.D / 2;
  const drumuri = masoaraDrumurile(text, laDoc);
  // Colțurile omise relativ la vârful 0 (urechile se numără de la el), în ordinea de mers a listei `colturi`.
  let pastrate: readonly ColtHartie[] = c.colturi;
  let omise: Array<{ x: number; y: number }> = [...c.omise];
  let ordine: readonly ColtHartie[] = c.colturi;
  if (c.omiseDinVarf0 || c.zuriDinVarf0) {
    const v0 = varful0(text, `${c.colturi[0]!.forma}/${c.colturi[0]!.forma}`, m);
    const k0 = v0 ? c.colturi.findIndex((x) => dist(x.Q, v0) <= 0.003) : -1;
    if (k0 < 0) return [`vârful 0 (${v0 ? `${v0.x}, ${v0.y}` : 'lipsă'}) nu e Q-ul unui colț de pe hârtie`];
    ordine = c.colturi.map((_, j) => c.colturi[(k0 + j) % c.colturi.length]!);
    const om = new Set(c.omiseDinVarf0 ?? []);
    pastrate = ordine.filter((_, j) => !om.has(j));
    omise = [...omise, ...ordine.filter((_, j) => om.has(j)).map((x) => x.V)];
  }
  for (const d of drumuri) {
    const x = pastrate.find((q) => dist(q.Q, d.Q) <= 0.003);
    if (!x) { rele.push(`drum din (${d.Q.x.toFixed(3)}, ${d.Q.y.toFixed(3)}) la liniile ${d.linii.join('–')}: nu e Q-ul unui colț păstrat`); continue; }
    if (dist(d.E, x.E) > 0.003) rele.push(`colțul (${x.V.x}, ${x.V.y}): E (${d.E.x.toFixed(3)}, ${d.E.y.toFixed(3)}), nu (${x.E.x.toFixed(4)}, ${x.E.y.toFixed(4)})`);
    const L = dist(x.Q, x.E);
    if (Math.abs(d.L - L) > 0.003) rele.push(`colțul (${x.V.x}, ${x.V.y}): drumul are ${d.L.toFixed(4)} mm, nu ${L.toFixed(4)}`);
    if (Math.abs(d.zE - d.zQ) > 1e-9 || Math.abs(d.zInapoi - d.zQ) > 1e-9) rele.push(`colțul (${x.V.x}, ${x.V.y}): drumul nu e la Z constant (${d.zQ}, ${d.zE}, ${d.zInapoi})`);
    if (dist(d.inapoi, d.Q) > 1e-9) rele.push(`colțul (${x.V.x}, ${x.V.y}): drumul nu se întoarce exact în Q`);
    if (d.sosire === null) rele.push(`colțul (${x.V.x}, ${x.V.y}): drumul de la linia ${d.linii[0]} nu urmează unei sosiri în Q`);
    // §4: cu avansul de tăiere (regimul implicit al exportului: 1000 mm/min).
    if (d.f1 !== 1000 || d.f2 !== 1000) rele.push(`colțul (${x.V.x}, ${x.V.y}): drumul are F ${d.f1} / ${d.f2}, nu 1000`);
  }
  pastrate.forEach((x, j) => {
    const ale = drumuri.filter((d) => dist(x.Q, d.Q) <= 0.003);
    if (c.zuriDinVarf0) {
      const z = ale.map((d) => d.zQ);
      const cerut = c.zuriDinVarf0[ordine.indexOf(x)] ?? [];
      if (z.length !== cerut.length || z.some((v, k) => Math.abs(v - cerut[k]!) > 0.002)) rele.push(`colțul ${j} de la vârful 0 (${x.V.x}, ${x.V.y}): drumurile la Z ${z.join(', ')}, nu ${cerut.join(', ')}`);
    } else if (ale.length !== c.sosiri) {
      rele.push(`colțul (${x.V.x}, ${x.V.y}): ${ale.length} drumuri, nu ${c.sosiri}`);
    }
    // Colțul tăiat la adâncime: până la Z-ul celui mai adânc drum al lui (precizarea din 11.10, §4: cu urechi, Z-ul
    // profilului în Q), care pe cazurile de pe hârtie e adâncimea operației; pereții: cât intră degajarea.
    const zDrum = Math.min(...ale.map((d) => d.zQ));
    if (ale.length && Math.abs(zDrum + c.adancime) > 0.002) rele.push(`colțul (${x.V.x}, ${x.V.y}): cel mai adânc drum e la Z ${zDrum}, nu la −${c.adancime}`);
    const rest = restulInColt(text, laDoc, x.V, R, ale.length ? -zDrum : c.adancime);
    if (!(rest <= 0.005)) rele.push(`colțul (${x.V.x}, ${x.V.y}): restul la −${c.adancime} e ${rest.toFixed(4)} mm (> 0,005)`);
    const raza = R * Math.SQRT2 + R + 0.5;
    const u = { x: (x.nOrizontal.x + x.nVertical.x) / Math.SQRT2, y: (x.nOrizontal.y + x.nVertical.y) / Math.SQRT2 };
    const iH = intrareaInPerete(text, laDoc, x.V, x.nOrizontal, R, raza, u), iV = intrareaInPerete(text, laDoc, x.V, x.nVertical, R, raza, u);
    if (Math.abs(iH - x.inOrizontal) > 0.003) rele.push(`colțul (${x.V.x}, ${x.V.y}): intră ${iH.toFixed(4)} mm în peretele orizontal, nu ${x.inOrizontal.toFixed(4)}`);
    if (Math.abs(iV - x.inVertical) > 0.003) rele.push(`colțul (${x.V.x}, ${x.V.y}): intră ${iV.toFixed(4)} mm în peretele vertical, nu ${x.inVertical.toFixed(4)}`);
  });
  for (const V of omise) {
    if (drumuri.some((d) => dist(d.Q, V) <= R * Math.SQRT2 + 0.01)) rele.push(`colțul omis (${V.x}, ${V.y}) are un drum`);
    const rest = restulInColt(text, laDoc, V, R, c.adancime);
    if (!(rest > 0.005)) rele.push(`colțul omis (${V.x}, ${V.y}) e tăiat (restul ${rest.toFixed(4)} mm)`);
  }
  if (c.faraDrumuri && drumuri.length) rele.push(`${drumuri.length} drumuri; hârtia cere niciunul`);
  // Golul dintre crestăturile față în față (precizarea din 11.10: D20, exact 1 mm).
  for (const [V1, V2, gol] of c.intre ?? []) {
    const e = (V: { x: number; y: number }) => drumuri.find((d) => { const x = c.colturi.find((q) => dist(q.V, V) === 0); return x !== undefined && dist(d.Q, x.Q) <= 0.003; })?.E;
    const e1 = e(V1), e2 = e(V2);
    if (!e1 || !e2) { rele.push(`perechea (${V1.x}, ${V1.y}) – (${V2.x}, ${V2.y}): lipsește un drum`); continue; }
    const g = dist(e1, e2) - 2 * R;
    if (Math.abs(g - gol) > 0.003) rele.push(`perechea (${V1.x}, ${V1.y}) – (${V2.x}, ${V2.y}): ${g.toFixed(4)} mm între crestături, nu ${gol}`);
  }
  if (cuCamp) {
    for (const x of [...pastrate, ...omise.map((V) => ({ V }))]) {
      const w = 3 * R + 1;
      const camp = campul(text, laDoc, R, { x0: x.V.x - w, y0: x.V.y - w, x1: x.V.x + w, y1: x.V.y + w, celula: 0.1 });
      for (const [linia, v] of camp.scos) if (v > c.pas + 0.002) rele.push(`lângă (${x.V.x}, ${x.V.y}): linia ${linia} scoate ${v.toFixed(3)} mm (pasul ${c.pas})`);
    }
  }
  return rele;
}
