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
import type { BlocText } from '../model/blocText.ts';
import { cuValori } from '../model/campuriText.ts';
import { noduriPiesa, type Piesa, type TextePlacuta } from '../model/document.ts';
import { textePiesei, valoriPlacutei } from '../model/placute.ts';
import { aseazaText, type ParametriText, type TextAsezat } from './asezare.ts';
import type { Font } from './font.ts';
import { aseazaPeCurba } from './peCurba.ts';
import { litereText } from './piesaText.ts';

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
  }
  | { readonly ok: false; readonly motiv: MotivPlacuta; readonly font?: string };

/** Parametrii așezării unui bloc salvat, cu alt text: limitat de casetă, se pornește de la înălțimea cerută (ADR 0142). */
function parametriBloc(bloc: BlocText, continut: string): ParametriText {
  const { amprenta: _a, spatieri: _s, curba: _c, font: _f, numeFont: _n, unitate: _u, ...rest } = bloc;
  return { ...rest, continut, inaltime: bloc.caseta?.fel === 'limita' ? bloc.caseta.ceruta : bloc.inaltime };
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
  for (const [k, t] of texte.entries()) {
    const f = font(t.bloc.font);
    if (!f) return { ok: false, motiv: 'font', font: t.bloc.font };
    // Toate câmpurile au valoare (`valoriPlacutei`), deci textul se face mereu.
    const continut = cuValori(t.bloc.continut, campuri) ?? '';
    const asezat = aseazaBloc(f, t.bloc, continut);
    if (typeof asezat === 'string') return { ok: false, motiv: asezat };
    // Prefixul textului, liber față de id-urile piesei (literele și contururile lui nu se ciocnesc între ele: `l` și `c`).
    let prefix = `t${k + 1}-`;
    const liber = (x: string): boolean => ![...alePiesei].some((id) => id.startsWith(x) && /^[lc]\d+$/.test(id.slice(x.length)));
    for (let n = 2; !liber(prefix); n++) prefix = `t${k + 1}_${n}-`;
    const litere = litereText(asezat, (j) => `${prefix}l${j}`, (j) => `${prefix}c${j}`);
    const operatii = operatiiPlacutei(p, t.grup.id, litere.grupuri);
    if (!operatii) return { ok: false, motiv: 'includeri' };
    rez[t.grup.id] = { continut, copii: litere.grupuri, operatii };
  }
  return { ok: true, campuri, texte: rez };
}
