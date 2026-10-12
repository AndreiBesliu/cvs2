/**
 * Cifrele și codurile ușii SVG (ADR 0035), fără nicio dependență: interfața le citește fără să încarce ușa, care vine la
 * cerere, la primul import.
 */
export const PLAFON_IMPORT = {
  /** Octeții fișierului: peste ei, refuzul vine înainte de citire (ADR 0035 §1). */
  octeti: 16 * 1024 * 1024,
  /** Declarațiile de entități XML (ADR 0035 §1): Illustrator are câteva; mii ar face judecata lor pătratică. */
  entitati: 100,
  /**
   * Vârfurile produse de citire, cu ale căilor sărite (ADR 0035 §7): peste ele, citirea se oprește și refuză. Un arc eliptic
   * cât un continent cere sute de cubice, iar un fișier de 16 MiB poate avea sute de mii de arce.
   */
  varfuriLucru: 1_000_000,
  /**
   * Includerile (imbricarea, perechile `nonzero`): candidații vizitați plus vârfurile căilor măsurate. Contururile suprapuse
   * fac judecata pătratică (recenzia 2.7c: 50 000 de dreptunghiuri identice, 334 s în Edge); peste plafon, importul e
   * refuzat (`plafon`, cu detaliul `includeri`).
   */
  includeri: 20_000_000,
  /**
   * Unitățile de lucru ale normalizării `nonzero` pe tot fișierul (ADR 0036 §10): un singur buget, nu unul pe formă
   * (recenzia 2.7d: 286 KiB de forme mici țineau firul principal 94 s). Peste el, formele rămase se citesc `evenodd`,
   * numărate. Cât două forme la plafonul lor (~1 s fiecare).
   */
  normalizare: 24_000_000,
} as const;

/** `neincarcat`: codul ușii nu s-a putut aduce (o publicare nouă, rețeaua); îl pune interfața, nu ușa. */
export type CodRefuz = 'octeti' | 'svgz' | 'entitati' | 'parsare' | 'radacina' | 'gol' | 'departe' | 'plafon' | 'neincarcat';

/** De ce sunt refuzate entitățile (ADR 0035 §1), ca cod: interfața îl traduce, fără text din fișier. */
export const CODURI_ENTITATI = ['parametru', 'fara-nume', 'externa', 'neterminata', 'valoare', 'numar', 'expansiune', 'attlist'] as const;
export type CodEntitati = (typeof CODURI_ENTITATI)[number];

/** Raportul (ADR 0035 §10), în ordinea în care îl arată dialogul. */
export const CODURI_AVERTISMENT = [
  'deschise', 'degenerate', 'prea-mari', 'sarit-text', 'sarit-use', 'sarit-image', 'sarit-foreignObject', 'sarit-svg',
  'ascunse', 'eroare-date', 'atribut-invalid', 'transformare-invalida', 'singulara', 'arce-eliptice', 'arce-plate',
  'cubice-din-arce', 'nonzero-normalizate', 'nonzero-refuzate', 'pagina-fara-marime', 'viewbox-invalid', 'transformare-radacina', 'stil',
] as const;
export type CodAvertisment = (typeof CODURI_AVERTISMENT)[number];
export type Avertismente = Readonly<Record<CodAvertisment, number>>;
