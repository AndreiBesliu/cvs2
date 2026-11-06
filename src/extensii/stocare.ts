/**
 * Stocarea extensiilor (ADR 0128 §B), partea pură: ce valori se primesc (JSON sau octeți), cât măsoară, ce chei, plafoanele
 * și serviciul `stocare.*` al lui `HostApi`, peste un depozit dat (IndexedDB în browser, `depozit.ts`; unul în memorie în
 * probe). Fiecare cerere trece întâi de permisiunea extensiei.
 */
export const LIMITE_STOCARE = { cheie: 200, valoare: 4 * 1024 * 1024, extensie: 16 * 1024 * 1024, chei: 1000, adancime: 64 } as const;

/** Depozitul datelor unei extensii: valorile pe chei și mărimea fiecăreia (fără să aducă valorile). */
export type DepozitDate = {
  citeste(id: string, cheie: string): Promise<unknown>;
  scrie(id: string, cheie: string, valoare: unknown, octeti: number): Promise<void>;
  sterge(id: string, cheie: string): Promise<void>;
  marimi(id: string): Promise<ReadonlyMap<string, number>>;
};
export type RaspunsServiciu = { readonly ok: true; readonly rezultat: unknown } | { readonly ok: false; readonly eroare: string };

export const cheieBuna = (c: unknown): c is string => typeof c === 'string' && c.length > 0 && c.length <= LIMITE_STOCARE.cheie;

/** O valoare JSON: `null`, booleene, numere finite, șiruri, liste și obiecte simple, cel mult `adancime` niveluri. */
function esteJson(v: unknown, nivel: number): boolean {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'object' || nivel >= LIMITE_STOCARE.adancime) return false;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) if (!(i in v) || !esteJson(v[i], nivel + 1)) return false;
    return true;
  }
  const p = Object.getPrototypeOf(v) as unknown;
  if (p !== Object.prototype && p !== null) return false;
  return Object.values(v).every((x) => esteJson(x, nivel + 1));
}

/** Mărimea unei valori primite: octeții (`byteLength`) sau octeții UTF-8 ai JSON-ului ei; null pentru o valoare refuzată. */
export function masoaraValoare(v: unknown): number | null {
  if (v instanceof ArrayBuffer) return v.byteLength;
  if (v instanceof Uint8Array) return v.byteLength;
  return esteJson(v, 0) ? new TextEncoder().encode(JSON.stringify(v)).length : null;
}

const refuz = (eroare: string): RaspunsServiciu => ({ ok: false, eroare: `stocare:${eroare}` });

/** O cerere `stocare.<metoda>` a extensiei `id`, cu permisiunile ei; răspunsul pleacă înapoi prin port. */
export async function servesteStocarea(id: string, permisiuni: readonly string[], metoda: string, argumente: readonly unknown[], d: DepozitDate): Promise<RaspunsServiciu> {
  if (!permisiuni.includes('stocare')) return refuz('permisiune');
  const [cheie, valoare] = argumente;
  switch (metoda) {
    case 'citeste': {
      if (!cheieBuna(cheie)) return refuz('cheie');
      const v = await d.citeste(id, cheie);
      return { ok: true, rezultat: v === undefined ? null : v };
    }
    case 'scrie': {
      if (!cheieBuna(cheie)) return refuz('cheie');
      const octeti = argumente.length < 2 ? null : masoaraValoare(valoare);
      if (octeti === null) return refuz('valoare');
      if (octeti > LIMITE_STOCARE.valoare) return refuz('plin');
      const marimi = await d.marimi(id);
      const veche = marimi.get(cheie);
      let total = octeti - (veche ?? 0);
      for (const m of marimi.values()) total += m;
      if (total > LIMITE_STOCARE.extensie || (veche === undefined && marimi.size >= LIMITE_STOCARE.chei)) return refuz('plin');
      await d.scrie(id, cheie, valoare, octeti);
      return { ok: true, rezultat: null };
    }
    case 'sterge': {
      if (!cheieBuna(cheie)) return refuz('cheie');
      await d.sterge(id, cheie);
      return { ok: true, rezultat: null };
    }
    case 'chei':
      return { ok: true, rezultat: [...(await d.marimi(id)).keys()].sort() };
    default:
      return refuz('necunoscut');
  }
}
