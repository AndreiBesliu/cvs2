/**
 * Opțiunile legării căilor (ADR 0182 §7, felia 10.3↑o), ținute în browser pentru toate proiectele, aceleași la comanda „Leagă
 * căile” și în panoul Verificare (o singură setare): lipirea (0,01 mm), golul de peste ea (cu o linie; până la N mm; doar
 * lipirea), unde se întâlnesc capetele lipite (pe capătul primei căi; la mijloc) și căile cu operații diferite (nu se leagă;
 * iau operația primei). Implicitele sunt răspunsurile owner-ului; o valoare stricată în browser lasă implicitul ei.
 */
import { useSyncExternalStore } from 'react';
import { OPTIUNI_LEGARE, pragGolBun, tolerantaLegareBuna, type OptiuniLegare } from '../model/legareOptiuni.ts';

const CHEIE = 'cncvs2.legare';

function citeste(): OptiuniLegare {
  let x: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CHEIE) ?? '{}');
    if (v && typeof v === 'object') x = v as Record<string, unknown>;
  } catch {
    // Fără stocare, sau o valoare stricată: implicitele.
  }
  const nr = (v: unknown, bun: (n: number) => boolean, implicit: number): number => (typeof v === 'number' && bun(v) ? v : implicit);
  return {
    toleranta: nr(x['toleranta'], tolerantaLegareBuna, OPTIUNI_LEGARE.toleranta),
    gol: x['gol'] === 'prag' || x['gol'] === 'lipire' ? x['gol'] : 'linie',
    pragGol: nr(x['pragGol'], pragGolBun, OPTIUNI_LEGARE.pragGol),
    capete: x['capete'] === 'mijloc' ? 'mijloc' : 'prima',
    operatii: x['operatii'] === 'prima' ? 'prima' : 'refuza',
  };
}

let acum: OptiuniLegare | null = null;
const ascultatori = new Set<() => void>();

/** Opțiunile de acum (citite din browser la prima cerere). */
export function optiuniLegare(): OptiuniLegare {
  acum ??= citeste();
  return acum;
}

/** Schimbă opțiunile date: pe loc pentru toți cei care le arată, apoi în browser. O lipire sau un prag greșit nu schimbă nimic. */
export function schimbaOptiuniLegare(o: Partial<OptiuniLegare>): void {
  if (o.toleranta !== undefined && !tolerantaLegareBuna(o.toleranta)) return;
  if (o.pragGol !== undefined && !pragGolBun(o.pragGol)) return;
  acum = { ...optiuniLegare(), ...o };
  try {
    localStorage.setItem(CHEIE, JSON.stringify(acum));
  } catch {
    // Fără stocare (fereastră privată, date blocate): alegerea ține doar cât pagina.
  }
  for (const f of ascultatori) f();
}

function asculta(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Opțiunile legării, ținute la zi în componentă (secțiunea booleanului, panoul Verificare). */
export function useOptiuniLegare(): OptiuniLegare {
  return useSyncExternalStore(asculta, optiuniLegare, optiuniLegare);
}
