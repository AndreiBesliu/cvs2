// Ce găsesc sursele planificatorului gata făcut în pagină, fără să fie scris de ele (ADR 0162): bibliotecile din `vendor/`
// (JavaScript, cu licențele lor), puse înaintea surselor, și ce pune gazda pe `window` (cvs2, claude.ai).
// Numele scrise de surse (`TrenCNC`, `TrenGCode`, `Lego`, `Profiluri`, `Atelier3D`, `TrenPentru3D`) nu stau aici:
// fiecare sursă e un script clasic, iar compilatorul le vede direct, cu tipurile deduse din cod.

/** Un vârf al unei polilinii Cavalier. */
interface CavalierVarf { readonly x: number; readonly y: number; readonly bulge: number }

/** O polilinie Cavalier (cavalier-contours-js 0.1.1, `vendor/cavalier.min.js`), cât folosesc sursele. */
interface CavalierPline {
  readonly vertexCount: number;
  at(i: number): CavalierVarf;
  /** Aria cu semn: pozitivă în sens trigonometric. */
  area(): number;
  extents(): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  boolean(alta: CavalierPline, op: 'or' | 'and' | 'not' | 'xor'): {
    /** De exemplu `disjoint` sau `invalidInput`. */
    readonly resultInfo: string;
    readonly posPlines: readonly { readonly pline: CavalierPline }[];
    readonly negPlines: readonly { readonly pline: CavalierPline }[];
  };
  parallelOffset(d: number): CavalierPline[];
}

/** Vârfurile unei polilinii: [x, y, bulge]. */
type CavalierVarfuri = readonly (readonly number[])[];

declare var Cavalier: {
  plineClosed(varfuri: CavalierVarfuri): CavalierPline;
  plineOpen(varfuri: CavalierVarfuri): CavalierPline;
};

/** earcut 2.2.4 (`vendor/earcut.min.js`): triunghiurile unui poligon cu găuri, ca indici ai vârfurilor. */
declare var earcut: (coordonate: readonly number[], gauri?: readonly number[] | null, dimensiuni?: number) => number[];
