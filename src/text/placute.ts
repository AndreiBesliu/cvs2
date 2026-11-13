/**
 * Literele plăcuțelor (ADR 0210 §4, §7; v23), partea cu font: pentru fiecare text cu câmpuri al piesei (șablonul), textul
 * blocului cu valorile plăcuței, așezat ca un text obișnuit cu același bloc (ADR 0105, 0108, 0123, 0138, 0141, 0142), literele
 * lui (`litereText`, ca piesa unui text) și ce taie fiecare operație din ele (`operatiiPlacutei`). Fontul trebuie doar aici,
 * la gest (o valoare schimbată, textul șablonului editat, importul din CSV): pânza, CAM-ul și exportul citesc literele scrise.
 *
 * Spațierile literelor alese (ADR 0138 §5) țin de caracterele șablonului: o plăcuță, cu alt text, nu le primește. Id-urile
 * literelor: `t<j>-l<k>` și `t<j>-c<n>` pentru al j-lea text al piesei, cu un sufix dacă s-ar ciocni cu un id al piesei.
 */
import { operatiiPlacutei } from '../io/placuteOperatii.ts';
import { amprentaContururi, blocText, type BlocText } from '../model/blocText.ts';
import { cuValori } from '../model/campuriText.ts';
import { noduriPiesa, type GrupNod, type Nod, type Piesa, type TextePlacuta } from '../model/document.ts';
import { textePiesei, valoriPlacutei } from '../model/placute.ts';
import { aseazaText, type ParametriText, type TextAsezat } from './asezare.ts';
import type { Font } from './font.ts';
import { aseazaPeCurba } from './peCurba.ts';
import { litereText, piesaText, type RezultatPiesaText } from './piesaText.ts';

/**
 * De ce literele unei plăcuțe nu se pot face: fontul lipsește (`font`, cu id-ul lui), o literă pe care aldinul n-a putut-o
 * îngroșa (`aldin`), textul nu încape în casetă nici la cea mai mică înălțime (`caseta`), curba blocului fără lungime
 * (`curba`), imbricarea contururilor peste plafonul ei (`includeri`).
 */
export type MotivPlacuta = 'font' | 'aldin' | 'caseta' | 'curba' | 'includeri';

export type RezultatPlacuta =
  | {
    readonly ok: true;
    /** Valorile plăcuței: cele date, cu un text gol pentru fiecare câmp fără valoare. */
    readonly campuri: Record<string, string>;
    /** Literele fiecărui text cu câmpuri al piesei; lipsă: piesa nu e un șablon (n-are niciun câmp). */
    readonly texte: Record<string, TextePlacuta> | undefined;
    /**
     * Cât s-a micșorat textul cel mai micșorat al plăcuței în caseta „Limitat de casetă” (ADR 0142, răspunsul 5): înălțimea
     * care a încăput față de cea cerută, sub 1; lipsă: niciun text micșorat.
     */
    readonly micsorat?: number;
  }
  | { readonly ok: false; readonly motiv: MotivPlacuta; readonly font?: string };

/**
 * Parametrii așezării unui bloc salvat, cu alt text. Cu o casetă, înălțimea blocului e cea în care a încăput șablonul, dar
 * așezarea nu pornește de la ea: limitat de casetă, caută de la înălțimea cerută (`caseta.ceruta`), scalat, de la cea mai
 * mare (ADR 0142, `inaltimeInCaseta`), deci plăcuța cu un text mai scurt crește la loc.
 */
function parametriBloc(bloc: BlocText, continut: string): ParametriText {
  const { amprenta: _a, spatieri: _s, curba: _c, font: _f, numeFont: _n, unitate: _u, ...rest } = bloc;
  return { ...rest, continut };
}

/** Textul `continut` așezat cu blocul `bloc` (drept sau pe curba lui), sau motivul. */
function aseazaBloc(font: Font, bloc: BlocText, continut: string): TextAsezat | MotivPlacuta {
  const drept = aseazaText(font, parametriBloc(bloc, continut));
  if (drept.raport['aldin-esuat'] > 0) return 'aldin';
  if (drept.raport['caseta-prea-mica'] > 0) return 'caseta';
  const c = bloc.curba;
  if (!c) return drept;
  const pe = aseazaPeCurba(drept, {
    contur: { inchis: c.inchis, varfuri: c.varfuri }, s: c.s, pozitie: c.pozitie, distanta: c.distanta, invers: c.invers,
    orientare: c.orientare, intinsa: c.intinsa,
  }, drept.majuscula, bloc.aliniere);
  return pe ?? 'curba';
}

/**
 * Literele plăcuței cu valorile `valori` pentru fiecare text cu câmpuri al piesei `p`; `font(id)` dă fontul citit al unui
 * bloc, sau null dacă nu e adus (refuzul `font`). Pură, determinată de piesă, valori și fonturi.
 */
export function textePlacutei(p: Piesa, valori: Readonly<Record<string, string>>, font: (id: string) => Font | null): RezultatPlacuta {
  const campuri = valoriPlacutei(p, valori);
  const texte = textePiesei(p);
  if (texte.length === 0) return { ok: true, campuri, texte: undefined };
  const alePiesei = new Set(noduriPiesa(p.radacina).map((x) => x.nod.id));
  const rez: Record<string, TextePlacuta> = {};
  let micsorat = 1;
  for (const [k, t] of texte.entries()) {
    const f = font(t.bloc.font);
    if (!f) return { ok: false, motiv: 'font', font: t.bloc.font };
    // Toate câmpurile au valoare (`valoriPlacutei`), deci textul se face mereu.
    const continut = cuValori(t.bloc.continut, campuri) ?? '';
    const asezat = aseazaBloc(f, t.bloc, continut);
    if (typeof asezat === 'string') return { ok: false, motiv: asezat };
    if (t.bloc.caseta?.fel === 'limita') micsorat = Math.min(micsorat, asezat.inaltime / t.bloc.caseta.ceruta);
    // Prefixul textului, liber față de id-urile piesei (literele și contururile lui nu se ciocnesc între ele: `l` și `c`).
    let prefix = `t${k + 1}-`;
    const liber = (x: string): boolean => ![...alePiesei].some((id) => id.startsWith(x) && /^[lc]\d+$/.test(id.slice(x.length)));
    for (let n = 2; !liber(prefix); n++) prefix = `t${k + 1}_${n}-`;
    const litere = litereText(asezat, (j) => `${prefix}l${j}`, (j) => `${prefix}c${j}`);
    const operatii = operatiiPlacutei(p, t.grup.id, litere.grupuri);
    if (!operatii) return { ok: false, motiv: 'includeri' };
    rez[t.grup.id] = { continut, copii: litere.grupuri, operatii };
  }
  return { ok: true, campuri, texte: rez, ...(micsorat < 1 - 1e-9 ? { micsorat } : {}) };
}

/**
 * Piesa `p` cu textul grupului `g` schimbat în `continut` (ADR 0210 §4: „Fă din textul ales câmpul”, răspunsul 4b): literele
 * noi, așezate cu blocul lui (fără spațierile literelor alese, care țin de caracterele de dinainte); cu o casetă, blocul ține
 * înălțimea care a încăput, ca în panoul textului. Un text pe rădăcină trece prin `piesaText` (ca editarea din panou: numele
 * piesei, oglindirea, operațiile mutate pe contururile de același fel); unul grupat (șablonul cu ramă) își păstrează locul în
 * arbore, cu id-uri libere față de restul piesei, iar operațiile care îi tăiau literele le taie pe cele noi de același fel.
 */
export function sablonCuContinut(
  p: Piesa, g: string, continut: string, font: Font, grosime?: number,
): RezultatPiesaText | { readonly ok: false; readonly motiv: MotivPlacuta } {
  const grup = noduriPiesa(p.radacina).find((x) => x.nod.id === g)?.nod;
  const bloc = grup ? blocText(grup) : null;
  if (!grup || grup.tip !== 'grup' || !bloc) return { ok: false, motiv: 'gol' };
  const asezat = aseazaBloc(font, bloc, continut);
  if (typeof asezat === 'string') return { ok: false, motiv: asezat };
  const { amprenta: _a, spatieri: _s, ...rest } = bloc;
  return sablonCuAsezat(p, g, asezat, { ...rest, continut, ...(bloc.caseta ? { inaltime: asezat.inaltime } : {}) }, grosime);
}

/**
 * Piesa `p` cu textul grupului `g` înlocuit de textul așezat `asezat`, cu blocul `blocNou` (fără amprentă: se calculează din
 * literele noi). Un text pe rădăcină trece prin `piesaText` (ca editarea din panou: numele piesei, oglindirea, operațiile mutate
 * pe contururile de același fel); unul grupat (șablonul cu ramă) își păstrează locul în arbore (matricea grupului), cu id-uri
 * libere față de restul piesei, iar operațiile care îi tăiau literele le taie pe cele noi de același fel. O folosesc „Fă din
 * textul ales câmpul” (`sablonCuContinut`) și unealta Text pe un șablon cu ramă (felia 11.4↑c).
 */
export function sablonCuAsezat(p: Piesa, g: string, asezat: TextAsezat, blocNou: Omit<BlocText, 'amprenta'>, grosime?: number): RezultatPiesaText {
  const grup = noduriPiesa(p.radacina).find((x) => x.nod.id === g)?.nod;
  if (!grup || grup.tip !== 'grup' || !blocText(grup)) return { ok: false, motiv: 'gol' };
  if (p.radacina.id === g) return piesaText(asezat, blocNou, p.id, undefined, p, grosime);
  // Id-urile literelor noi: libere față de restul piesei (literele vechi pleacă, deci id-urile lor se pot refolosi).
  const vechi = new Set(grup.copii.flatMap((c) => noduriPiesa(c).map((x) => x.nod.id)));
  const folosite = new Set(noduriPiesa(p.radacina).map((x) => x.nod.id).filter((id) => !vechi.has(id)));
  const liber = (id: string): string => {
    let n = id;
    for (let k = 2; folosite.has(n); k++) n = `${id}_${k}`;
    folosite.add(n);
    return n;
  };
  const litere = litereText(asezat, (k) => liber(`l${k}`), (n) => liber(`c${n}`));
  if (litere.cai.length === 0) return { ok: false, motiv: 'gol' };
  const mutate = operatiiPlacutei(p, g, litere.grupuri);
  if (!mutate) return { ok: false, motiv: 'includeri' };
  const nou: GrupNod = { ...grup, copii: litere.grupuri, text: { ...blocNou, amprenta: amprentaContururi(litere.grupuri) } };
  const inlocuieste = (n: Nod): Nod => {
    if (n.id === g) return nou;
    if (n.tip !== 'grup') return n;
    const copii = n.copii.map(inlocuieste);
    return copii.every((c, k) => c === n.copii[k]) ? n : { ...n, copii };
  };
  const operatii = p.operatii.flatMap((o) => {
    const noduri = [...o.noduri.filter((x) => !vechi.has(x)), ...(mutate[o.id] ?? [])];
    return noduri.length > 0 ? [{ ...o, noduri }] : [];
  });
  return { ok: true, piesa: { ...p, radacina: inlocuieste(p.radacina), operatii } };
}
