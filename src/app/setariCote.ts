/**
 * Setările cotelor (ADR 0330 §6), ale aplicației, nu ale unei cote: ținute în browser (`cncvs2.cote`, JSON cu versiune),
 * aplicate pe loc tuturor cotelor. Grupurile: cifrele și liniile (a-3), raza, diametrul și unghiul (b, cu inch în fracții),
 * comportamentul, lipirea, măsurarea (a-2, plus pânza în a-3 și foile vecine în a-4), exportul (c-1; felul cotelor în DXF și
 * al cifrelor, c-2); fereastra Setări le scrie. Orice valoare lipsă, de alt tip sau în afara marginilor ia implicitul ei, câmp
 * cu câmp: o setare stricată nu le strică pe celelalte.
 */
import { useSyncExternalStore } from 'react';
import type { FelPunct, OptiuniPuncte } from '../geom/lipirePuncte.ts';
import { FELURI_CAPAT, LINII_RAZEI, LOCURI_CIFRA, type FelCapat, type FormatCifre, type LiniaRazei, type LocCifra, type StilCota } from '../model/desenCota.ts';

export const FELURI_LIPIRE = ['varf', 'mijloc', 'centru', 'cadran', 'cutie', 'foaie', 'grila'] as const;
export type FelLipire = (typeof FELURI_LIPIRE)[number];

/** Unitățile cifrelor: `fractii` e inch în fracții (1/2 … 1/64, felia 10.4↑b). */
export const UNITATI_COTE = ['mm', 'cm', 'inch', 'fractii'] as const;
export type UnitateCote = (typeof UNITATI_COTE)[number];
/** Numitorii fracțiilor de inch: fracția cea mai mică arătată. */
export const FRACTII_COTE = [2, 4, 8, 16, 32, 64] as const;
/** Cât de lung poate fi prefixul razei sau al diametrului. */
export const PREFIX_MAXIM = 8;

export type SetariCote = {
  readonly cifre: {
    readonly unitate: UnitateCote;
    /** 0–6, sau null: automat (2; în inch, 3). */
    readonly zecimale: number | null;
    readonly zerouri: 'taiate' | 'pastrate';
    /** Rotunjirea la un pas, în unitatea aleasă (0,001–100), sau null: la zecimale. */
    readonly pas: number | null;
    readonly separator: 'limba' | 'virgula' | 'punct';
    /** Unitatea scrisă după cifră („120 mm”). */
    readonly cuUnitate: boolean;
    /** Înălțimea cifrelor pe foaie, 1–20 mm. */
    readonly inaltime: number;
    readonly loc: LocCifra;
    /** Inch în fracții: fracția cea mai mică, 1/2 … 1/64 (numitorul). */
    readonly fractie: number;
  };
  readonly linii: {
    readonly capete: FelCapat;
    /** Mărimea capetelor, 1–10 mm. */
    readonly marime: number;
    readonly extensii: boolean;
    /** Golul liniei de extensie față de formă și depășirea liniei de cotă, 0–5 mm. */
    readonly gol: number;
    readonly depasire: number;
    /** Distanța liniei de cotă față de formă, la punere (Măsoară, „Păstrează”), 2–100 mm. */
    readonly distanta: number;
  };
  /** Raza, diametrul, unghiul (felia 10.4↑b). */
  readonly raza: {
    /** Prefixele cifrei („R”, „Ø”), cel mult `PREFIX_MAXIM` semne; goale: fără. */
    readonly prefixR: string;
    readonly prefixD: string;
    /** Unghiurile în grade zecimale, sau în grade-minute-secunde. */
    readonly unghiuri: 'zecimale' | 'gms';
    /** Zecimalele unghiului (ale secundelor, în grade-minute-secunde), 0–4. */
    readonly zecimaleUnghi: number;
    readonly linia: LiniaRazei;
  };
  readonly comportament: {
    /** Cotele noi sunt legate de forme (da) sau libere. */
    readonly legate: boolean;
    /** Unealta pornește cu Automată, sau cu ultimul fel folosit. */
    readonly pornire: 'automata' | 'ultimul';
    /** După o cotă pusă: unealta rămâne Cote, sau se întoarce la Selecție. */
    readonly dupa: 'ramane' | 'selectie';
    /** Cotele pe pânză (ca „Arată cotele”); cu unealta Cote aleasă se văd oricum. */
    readonly pePanza: boolean;
    /** Cotele foilor vecine, cu „Toate foile pe pânză”: estompate, ca foile lor, sau ascunse. */
    readonly vecine: 'estompate' | 'ascunse';
    /** Sub atâția pixeli pe ecran, cifrele se ascund (0–12; 0: niciodată). */
    readonly pragCifre: number;
    /** Culoarea pe pânză („#rrggbb”), sau null: a temei. */
    readonly culoare: string | null;
  };
  readonly lipire: {
    readonly felurile: Readonly<Record<FelLipire, boolean>>;
    /** Toleranța, în pixeli pe ecran, 4–20. */
    readonly toleranta: number;
    /** Punctul cel mai apropiat de pe contur: cu Ctrl, mereu, niciodată. */
    readonly contur: 'ctrl' | 'mereu' | 'niciodata';
  };
  readonly masurare: {
    readonly distanta: boolean;
    readonly delta: boolean;
    readonly unghi: boolean;
    /** Unde se arată: lângă cursor, în bara de jos. */
    readonly cursor: boolean;
    readonly bara: boolean;
  };
  /** Exportul vectorilor (felia 10.4↑c-1). */
  readonly export: {
    /** Implicitul bifei „Cu cotele” din „Exportă vectori”. */
    readonly cuCote: boolean;
    /** Stratul cotelor: numele (`numeStratBun`) și culoarea („#rrggbb”). */
    readonly strat: string;
    readonly culoare: string;
    /** Grosimea liniilor cotelor în PDF și SVG, 0,05–1 mm. */
    readonly grosime: number;
    /** Cotele în DXF: cote (DIMENSION, cu blocul lor) sau linii și cifre (felia 10.4↑c-2). */
    readonly dxf: 'dimension' | 'linii';
    /** Cifrele: trăsăturile fontului cu o singură linie, sau text (MTEXT, `<text>`, Helvetica), în toate formatele. */
    readonly cifre: 'trasaturi' | 'text';
  };
  /** Raportul foilor (felia 10.4↑d-3). */
  readonly raport: {
    /** Implicitul bifei „Cu cotele” din raport. */
    readonly cuCote: boolean;
  };
};

export const SETARI_IMPLICITE: SetariCote = {
  cifre: { unitate: 'mm', zecimale: null, zerouri: 'taiate', pas: null, separator: 'limba', cuUnitate: false, inaltime: 3.5, loc: 'deasupra', fractie: 16 },
  linii: { capete: 'plina', marime: 2.5, extensii: true, gol: 1, depasire: 2, distanta: 10 },
  raza: { prefixR: 'R', prefixD: 'Ø', unghiuri: 'zecimale', zecimaleUnghi: 2, linia: 'loc' },
  comportament: { legate: true, pornire: 'automata', dupa: 'ramane', pePanza: true, vecine: 'estompate', pragCifre: 6, culoare: null },
  lipire: { felurile: { varf: true, mijloc: true, centru: true, cadran: true, cutie: true, foaie: true, grila: true }, toleranta: 8, contur: 'ctrl' },
  masurare: { distanta: true, delta: true, unghi: true, cursor: true, bara: true },
  export: { cuCote: false, strat: 'COTE', culoare: '#006d8f', grosime: 0.1, dxf: 'dimension', cifre: 'trasaturi' },
  raport: { cuCote: false },
};

/**
 * Numele straturilor exportului care nu pot fi ale cotelor: rolurile formelor și conturul foii (`STRATURI` din
 * `src/io/vectori.ts`, fără COTE; o probă le ține la fel) și stratul 0 al DXF-ului. DXF-ul nu deosebește literele mari.
 */
export const STRATURI_REZERVATE = ['0', 'EXTERIOR', 'INTERIOR', 'PE_LINIE', 'PE_O_PARTE', 'BUZUNAR', 'GAURIRE', 'FARA_OPERATIE', 'FOAIE'] as const;
/** Cât de lung poate fi numele stratului cotelor. */
export const STRAT_MAXIM = 31;
/** Pură: numele e bun pentru stratul cotelor: litere ASCII, cifre, „_” și „-”, cel mult `STRAT_MAXIM`, nu al altui strat. */
export const numeStratBun = (n: string): boolean =>
  new RegExp(`^[A-Za-z0-9_-]{1,${STRAT_MAXIM}}$`).test(n) && !(STRATURI_REZERVATE as readonly string[]).includes(n.toUpperCase());

export const CHEIE_SETARI_COTE = 'cncvs2.cote';
export const TOLERANTA_MINIMA = 4;
export const TOLERANTA_MAXIMA = 20;
/** Marginile setărilor numerice: [minim, maxim]. */
export const MARGINI = {
  zecimale: [0, 6],
  pas: [0.001, 100],
  inaltime: [1, 20],
  marime: [1, 10],
  gol: [0, 5],
  depasire: [0, 5],
  distanta: [2, 100],
  zecimaleUnghi: [0, 4],
  pragCifre: [0, 12],
  toleranta: [TOLERANTA_MINIMA, TOLERANTA_MAXIMA],
  grosime: [0.05, 1],
} as const satisfies Record<string, readonly [number, number]>;

type Brut = Record<string, unknown>;
const obiect = (x: unknown): Brut => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Brut) : {});
const bif = (x: unknown, implicit: boolean): boolean => (typeof x === 'boolean' ? x : implicit);
const unul = <T extends string>(x: unknown, valori: readonly T[], implicit: T): T => ((valori as readonly unknown[]).includes(x) ? (x as T) : implicit);
const numar = (x: unknown, [min, max]: readonly [number, number], implicit: number): number =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? x : implicit;
/** Un număr în margini, sau null (null scris e o alegere, nu o greșeală); altfel implicitul. */
const numarSauNul = (x: unknown, margini: readonly [number, number], implicit: number | null): number | null =>
  x === null ? null : typeof x === 'number' ? (numar(x, margini, Number.NaN) === x ? x : implicit) : implicit;
const intreg = (x: unknown, margini: readonly [number, number], implicit: number | null): number | null =>
  x === null || (typeof x === 'number' && Number.isInteger(x)) ? numarSauNul(x, margini, implicit) : implicit;
const CULOARE = /^#[0-9a-f]{6}$/;
const prefix = (x: unknown, implicit: string): string => (typeof x === 'string' && [...x].length <= PREFIX_MAXIM ? x : implicit);

/** Pură: setările din textul ținut în browser (sau null), cu implicitul fiecărui câmp lipsă ori greșit. */
export function citesteSetariCote(text: string | null): SetariCote {
  let brut: Brut = {};
  try {
    brut = obiect(text === null ? null : JSON.parse(text));
  } catch {
    // Un text stricat: implicitele.
  }
  const I = SETARI_IMPLICITE;
  const ci = obiect(brut['cifre']), li = obiect(brut['linii']), ra = obiect(brut['raza']);
  const c = obiect(brut['comportament']), l = obiect(brut['lipire']), m = obiect(brut['masurare']), f = obiect(l['felurile']);
  const ex = obiect(brut['export']), rp = obiect(brut['raport']);
  const culoare = c['culoare'];
  return {
    cifre: {
      unitate: unul(ci['unitate'], UNITATI_COTE, I.cifre.unitate),
      zecimale: intreg(ci['zecimale'], MARGINI.zecimale, I.cifre.zecimale),
      zerouri: unul(ci['zerouri'], ['taiate', 'pastrate'], I.cifre.zerouri),
      pas: numarSauNul(ci['pas'], MARGINI.pas, I.cifre.pas),
      separator: unul(ci['separator'], ['limba', 'virgula', 'punct'], I.cifre.separator),
      cuUnitate: bif(ci['cuUnitate'], I.cifre.cuUnitate),
      inaltime: numar(ci['inaltime'], MARGINI.inaltime, I.cifre.inaltime),
      loc: unul(ci['loc'], LOCURI_CIFRA, I.cifre.loc),
      fractie: (FRACTII_COTE as readonly unknown[]).includes(ci['fractie']) ? (ci['fractie'] as number) : I.cifre.fractie,
    },
    linii: {
      capete: unul(li['capete'], FELURI_CAPAT, I.linii.capete),
      marime: numar(li['marime'], MARGINI.marime, I.linii.marime),
      extensii: bif(li['extensii'], I.linii.extensii),
      gol: numar(li['gol'], MARGINI.gol, I.linii.gol),
      depasire: numar(li['depasire'], MARGINI.depasire, I.linii.depasire),
      distanta: numar(li['distanta'], MARGINI.distanta, I.linii.distanta),
    },
    raza: {
      prefixR: prefix(ra['prefixR'], I.raza.prefixR),
      prefixD: prefix(ra['prefixD'], I.raza.prefixD),
      unghiuri: unul(ra['unghiuri'], ['zecimale', 'gms'], I.raza.unghiuri),
      zecimaleUnghi: intreg(ra['zecimaleUnghi'], MARGINI.zecimaleUnghi, I.raza.zecimaleUnghi) ?? I.raza.zecimaleUnghi,
      linia: unul(ra['linia'], LINII_RAZEI, I.raza.linia),
    },
    comportament: {
      legate: bif(c['legate'], I.comportament.legate),
      pornire: unul(c['pornire'], ['automata', 'ultimul'], I.comportament.pornire),
      dupa: unul(c['dupa'], ['ramane', 'selectie'], I.comportament.dupa),
      pePanza: bif(c['pePanza'], I.comportament.pePanza),
      vecine: unul(c['vecine'], ['estompate', 'ascunse'], I.comportament.vecine),
      pragCifre: numar(c['pragCifre'], MARGINI.pragCifre, I.comportament.pragCifre),
      culoare: culoare === null || (typeof culoare === 'string' && CULOARE.test(culoare)) ? culoare : I.comportament.culoare,
    },
    lipire: {
      felurile: Object.fromEntries(FELURI_LIPIRE.map((k) => [k, bif(f[k], I.lipire.felurile[k])])) as Record<FelLipire, boolean>,
      toleranta: numar(l['toleranta'], MARGINI.toleranta, I.lipire.toleranta),
      contur: unul(l['contur'], ['ctrl', 'mereu', 'niciodata'], I.lipire.contur),
    },
    masurare: {
      distanta: bif(m['distanta'], I.masurare.distanta),
      delta: bif(m['delta'], I.masurare.delta),
      unghi: bif(m['unghi'], I.masurare.unghi),
      cursor: bif(m['cursor'], I.masurare.cursor),
      bara: bif(m['bara'], I.masurare.bara),
    },
    export: {
      cuCote: bif(ex['cuCote'], I.export.cuCote),
      strat: typeof ex['strat'] === 'string' && numeStratBun(ex['strat']) ? ex['strat'] : I.export.strat,
      culoare: typeof ex['culoare'] === 'string' && CULOARE.test(ex['culoare']) ? ex['culoare'] : I.export.culoare,
      grosime: numar(ex['grosime'], MARGINI.grosime, I.export.grosime),
      dxf: unul(ex['dxf'], ['dimension', 'linii'], I.export.dxf),
      cifre: unul(ex['cifre'], ['trasaturi', 'text'], I.export.cifre),
    },
    raport: { cuCote: bif(rp['cuCote'], I.raport.cuCote) },
  };
}

/** Pură: textul de ținut în browser (cu versiunea). */
export const textSetariCote = (s: SetariCote): string => JSON.stringify({ v: 1, ...s });

/** Pură: desenul unei cote, după setări (golul, depășirea, capetele, cifra). */
export const stilCote = (s: SetariCote): StilCota => ({
  gol: s.linii.gol,
  depasire: s.linii.depasire,
  capat: s.linii.marime,
  inaltime: s.cifre.inaltime,
  capete: s.linii.capete,
  extensii: s.linii.extensii,
  loc: s.cifre.loc,
  raza: s.raza.linia,
});

/** Zecimalele de fapt: cele alese, sau cele automate (2; în inch, 3). */
export const zecimaleCote = (s: SetariCote): number => s.cifre.zecimale ?? (s.cifre.unitate === 'inch' ? 3 : 2);

/** Pură: scrierea cifrelor, după setări; „după limbă” e virgula în română, punctul în engleză (`virgulaLimbii`). */
export const formatCote = (s: SetariCote, virgulaLimbii: boolean): FormatCifre => ({
  unitate: s.cifre.unitate,
  zecimale: zecimaleCote(s),
  zerouri: s.cifre.zerouri,
  pas: s.cifre.pas,
  virgula: s.cifre.separator === 'limba' ? virgulaLimbii : s.cifre.separator === 'virgula',
  cuUnitate: s.cifre.cuUnitate,
  fractie: s.cifre.fractie,
  prefixR: s.raza.prefixR,
  prefixD: s.raza.prefixD,
  unghi: s.raza.unghiuri,
  zecimaleUnghi: s.raza.zecimaleUnghi,
});

/** Grupurile setărilor, în ordinea ferestrei Setări › Cotele. */
export const GRUPURI_COTE = ['cifre', 'linii', 'raza', 'comportament', 'lipire', 'masurare', 'export', 'raport'] as const satisfies readonly (keyof SetariCote)[];
export type GrupCote = (typeof GRUPURI_COTE)[number];

/** Pură: setările cu un grup adus la implicit („Înapoi la implicit”), celelalte neatinse. */
export const grupImplicit = (s: SetariCote, grup: GrupCote): SetariCote => ({ ...s, [grup]: SETARI_IMPLICITE[grup] });

/** Pură: grupul are deja valorile implicite (butonul lui „Înapoi la implicit” nu mai are ce face). */
export const eImplicit = (s: SetariCote, grup: GrupCote): boolean => JSON.stringify(s[grup]) === JSON.stringify(SETARI_IMPLICITE[grup]);

/**
 * Pură: opțiunile lipirii pe puncte, din setări și din tastele ținute, sau null (lipirea oprită: butonul Lipire oprit, sau
 * pornit cu Alt ținut; Alt inversează, ca peste tot). Toleranța e în pixeli, deci în mm se împarte la scara pânzei.
 */
export function optiuniLipireCote(s: SetariCote, taste: { readonly alt: boolean; readonly ctrl: boolean }, lipire: boolean, grila: number | null, scara: number): OptiuniPuncte | null {
  if (lipire === taste.alt) return null;
  const felurile = new Set<FelPunct>(FELURI_LIPIRE.filter((k) => s.lipire.felurile[k]));
  const peContur = s.lipire.contur === 'mereu' || (s.lipire.contur === 'ctrl' && taste.ctrl);
  return { toleranta: s.lipire.toleranta / scara, felurile, grila, peContur };
}

let acum: SetariCote | null = null;
const ascultatori = new Set<() => void>();

/** Setările de acum (citite din browser la prima cerere; fără stocare, implicitele). */
export function setariCote(): SetariCote {
  if (acum) return acum;
  let text: string | null = null;
  try {
    text = localStorage.getItem(CHEIE_SETARI_COTE);
  } catch {
    // Fără stocare: implicitele.
  }
  acum = citesteSetariCote(text);
  return acum;
}

/** Schimbă setările: pe loc pentru toți cei care le arată, apoi în browser (fără stocare: cât ține pagina). */
export function schimbaSetariCote(s: SetariCote): void {
  acum = citesteSetariCote(textSetariCote(s));
  try {
    localStorage.setItem(CHEIE_SETARI_COTE, textSetariCote(acum));
  } catch {
    // Fără stocare: setarea ține doar cât pagina.
  }
  for (const f of ascultatori) f();
}

export function ascultaSetariCote(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Setările, ca stare React: o schimbare (din fereastra Setări, din altă parte a aplicației) redesenează pe loc. */
export function useSetariCote(): SetariCote {
  return useSyncExternalStore(ascultaSetariCote, setariCote, setariCote);
}

/** „Arată cotele” (`vedere.cote`, ADR 0330 §5): comută cotele pe pânză, aceeași setare ca în fereastra Setări. */
export function comutaPePanza(): void {
  const s = setariCote();
  schimbaSetariCote({ ...s, comportament: { ...s.comportament, pePanza: !s.comportament.pePanza } });
}
