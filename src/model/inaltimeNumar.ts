/**
 * Înălțimea cifrelor numărului gravat pe panou (ADR 0181, felia 10.3↑n), partea ușoară: opțiunile tăierii și blocul panourilor
 * o citesc la deschiderea panoului. Locul cifrelor (`numarPanou.ts`) vine la cerere, doar cu numerele: importat de aici, ar intra
 * în bucata panoului Taie (+0,6 kB, măsurat), deși numerele sunt oprite implicit.
 */

/** Înălțimea cifrelor, în mm: implicită, cea mai mică și cea mai mare primite. */
export const INALTIME_NUMAR = { implicita: 10, minima: 3, maxima: 100 } as const;

/** O înălțime a cifrelor bună: un număr între cea mai mică și cea mai mare. */
export const inaltimeNumarBuna = (h: number): boolean => Number.isFinite(h) && h >= INALTIME_NUMAR.minima && h <= INALTIME_NUMAR.maxima;
