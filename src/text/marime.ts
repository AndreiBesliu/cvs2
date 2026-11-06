/**
 * Mărimea textului în unitatea omului (ADR 0138 §1). **mm și in măsoară majuscula** (regula din ADR 0105: 20 mm dau un H de
 * 20,00 mm; 1 in, un H de 25,4 mm). **pt e mărimea fontului**, ca în programele de birou și de grafică: em-ul are
 * pt · 25,4 / 72 mm, deci majuscula în pt depinde de font (vârful lui H față de em). Blocul ține majuscula în mm
 * (`inaltime`); unitatea e doar a panoului.
 *
 * Pe hârtie, cu Roboto (2048 de unități pe em, vârful lui H la 1456): 72 pt dau majuscula de 25,4 · 1456 / 2048 =
 * 18,0578125 mm.
 */
export type UnitateMarime = 'mm' | 'pt' | 'in';
export const UNITATI_MARIME: readonly UnitateMarime[] = ['mm', 'pt', 'in'];

const MM_PE_INCH = 25.4;
const MM_PE_PUNCT = MM_PE_INCH / 72;

/** Raportul majusculei față de em al unui font: vârful lui H, în unitățile lui, împărțit la unitățile pe em. */
export const raportMajuscula = (font: { readonly majuscula: number; readonly unitsPerEm: number }): number => font.majuscula / font.unitsPerEm;

/** Majuscula în mm a mărimii `valoare`, scrise în `unitate`; pentru pt, cu raportul majusculei fontului. */
export function majusculaDinMarime(valoare: number, unitate: UnitateMarime, raport: number): number {
  if (unitate === 'mm') return valoare;
  return unitate === 'in' ? valoare * MM_PE_INCH : valoare * MM_PE_PUNCT * raport;
}

/** Mărimea în `unitate` a majusculei de `mm` mm; pentru pt, cu raportul majusculei fontului. */
export function marimeDinMajuscula(mm: number, unitate: UnitateMarime, raport: number): number {
  if (unitate === 'mm') return mm;
  return unitate === 'in' ? mm / MM_PE_INCH : mm / (MM_PE_PUNCT * raport);
}

/**
 * O mărime convertită, ca număr de arătat: punctele la sutime, țolii la zecimea de miime, mm-ul la zecimea de miime (ADR
 * 0138 §1). Valoarea exactă o ține panoul lângă textul arătat, ca un „Aplică” fără nicio schimbare să n-o rotunjească.
 */
export function rotunjesteMarime(x: number, unitate: UnitateMarime): number {
  const k = unitate === 'pt' ? 100 : 10_000;
  return Math.round(x * k) / k;
}
