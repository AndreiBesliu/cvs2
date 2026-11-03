/**
 * Descărcările extensiilor (ADR 0129 §C), partea pură: serviciul `descarcari.salveaza(nume, date)` al lui `HostApi`, cu
 * permisiunea `descarcari`. Numele se curăță (ultima parte a căii, fără caracterele oprite de sistemele de fișiere, de control
 * sau de direcție) și trebuie să aibă un tip din lista albă: date și desene, nu programe sau pagini. Datele (text, octeți sau
 * `Blob`), cel mult 64 MB, ajung la `salveaza` (în browser, o descărcare din pagina lui cvs2, `cadru.ts`).
 */
import type { RaspunsServiciu } from './stocare.ts';

export const LIMITE_DESCARCARE = { nume: 120, octeti: 64 * 1024 * 1024 } as const;
/** Tipurile de fișier pe care le poate salva o extensie. */
export const TIPURI_DESCARCARE: readonly string[] = [
  'zip', 'json', 'txt', 'csv', 'nc', 'gcode', 'ngc', 'tap', 'stl', '3mf', 'obj', 'svg', 'dxf', 'pdf', 'png', 'jpg',
];

/** Numele bun al fișierului, sau null. */
export function numeDescarcare(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const n = (x.split(/[\\/]/).pop() ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_')
    .replace(/^[\s.]+|[\s.]+$/g, '');
  if (n.length === 0 || n.length > LIMITE_DESCARCARE.nume) return null;
  const tip = /\.([a-z0-9]+)$/i.exec(n)?.[1]?.toLowerCase();
  return tip !== undefined && TIPURI_DESCARCARE.includes(tip) ? n : null;
}

/**
 * Datele primite, ca `Blob`: textul (UTF-8), octeții (`ArrayBuffer`, `Uint8Array`, copiați) sau un `Blob`; altceva, null. Le
 * citește și senderul extensiilor (`masina.incarca`, ADR 0160 §B).
 */
export function caBlob(x: unknown): Blob | null {
  if (x instanceof Blob) return x;
  if (typeof x === 'string' || x instanceof ArrayBuffer) return new Blob([x]);
  if (x instanceof Uint8Array) return new Blob([new Uint8Array(x)]);
  return null;
}

const refuz = (eroare: string): RaspunsServiciu => ({ ok: false, eroare: `descarcari:${eroare}` });

/** O cerere `descarcari.<metoda>`, cu permisiunile extensiei; la `salveaza`, răspunsul e numele cu care s-a salvat. */
export function servesteDescarcarile(permisiuni: readonly string[], metoda: string, argumente: readonly unknown[], salveaza: (nume: string, date: Blob) => void): RaspunsServiciu {
  if (!permisiuni.includes('descarcari')) return refuz('permisiune');
  if (metoda !== 'salveaza') return refuz('necunoscut');
  const nume = numeDescarcare(argumente[0]);
  if (nume === null) return refuz('nume');
  const date = caBlob(argumente[1]);
  if (date === null) return refuz('date');
  if (date.size > LIMITE_DESCARCARE.octeti) return refuz('prea-mare');
  salveaza(nume, date);
  return { ok: true, rezultat: nume };
}
