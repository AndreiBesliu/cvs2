/**
 * Grupurile tăierii în panouri (ADR 0181 §7, felia 10.3↑k), pe firul principal, după degruparea calculată de worker
 * (`panouri.ts`): bucățile fiecărui panou cu mai multe devin un grup (`grupDin`) cu numele panoului, pus în locul primei (comanda
 * `regrupeaza`, cu locurile părților, ca anularea să le pună exact înapoi). V-carve-urile care s-ar amesteca (ADR 0130) lasă
 * panoul negrupat: fiecare bucată își ia numele panoului (`inlocuieste-piesa`). Pură. E aici, nu în worker, fiindcă gruparea
 * citește blocurile de text cu schemele lor (valibot): în worker, ~4,5 kB în plus; pe firul principal, gruparea e deja încărcată.
 */
import type { Document, Instanta, Piesa } from './document.ts';
import { grupDin } from './grupare.ts';
import type { Comanda, Degrupata } from './jurnal.ts';

export type PanouDeGrupat = { readonly nume: string; readonly ids: readonly string[] };

/**
 * Comenzile grupurilor, pe documentul de după degrupare (`doc`, foaia `idFoaie`), și alegerea de după: toate bucățile, în ordinea
 * panourilor (`ids`), cu grupul în locul bucăților lui. Id-urile grupurilor, nefolosite nici în `doc`, nici în documentul de
 * dinaintea tăierii (`inainte`): altfel un grup ar putea lua id-ul formei tăiate, iar după Anulează, alegerea rămasă ar arăta
 * spre ea. Null dacă o bucată lipsește (documentul nu mai e cel calculat).
 */
export function comenziGrupuriPanouri(doc: Document, idFoaie: string, grupuri: readonly PanouDeGrupat[], ids: readonly string[], inainte: Document = doc): { readonly comenzi: Comanda[]; readonly ids: string[] } | null {
  const foaie = doc.foi.find((f) => f.id === idFoaie);
  if (!foaie) return null;
  const locI = new Map(foaie.instante.map((x, k) => [x.id, k]));
  const piese = new Map(doc.piese.map((p, k) => [p.id, { p, k }]));
  const ocupate = new Set([doc, inainte].flatMap((d) => [...d.piese.map((p) => p.id), ...d.foi.flatMap((f) => f.instante.map((x) => x.id))]));
  let n = 1;
  const regrupate: Degrupata[] = [];
  const comenzi: Comanda[] = [];
  // Prima bucată a fiecărui grup → id-ul lui; celelalte → '' (pleacă din alegere).
  const inGrup = new Map<string, string>();
  for (const g of grupuri) {
    const parti: Array<{ readonly instanta: Instanta; readonly piesa: Piesa }> = [];
    const locuri = { instante: [] as number[], piese: [] as number[] };
    for (const id of g.ids) {
      const k = locI.get(id);
      const instanta = k === undefined ? undefined : foaie.instante[k];
      const x = instanta ? piese.get(instanta.piesa) : undefined;
      if (k === undefined || !instanta || !x) return null;
      parti.push({ instanta, piesa: x.p });
      locuri.instante.push(k);
      locuri.piese.push(x.k);
    }
    while (ocupate.has(`e${n}`)) n++;
    const id = `e${n++}`;
    const r = grupDin(parti, id);
    if (typeof r === 'string') {
      for (const x of parti) comenzi.push({ tip: 'inlocuieste-piesa', vechi: x.piesa, nou: { ...x.piesa, nume: g.nume } });
      continue;
    }
    regrupate.push({ instanta: r.instanta, piesa: { ...r.piesa, nume: g.nume }, parti, locuri });
    g.ids.forEach((x, i) => { inGrup.set(x, i === 0 ? id : ''); });
  }
  if (regrupate.length > 0) comenzi.push({ tip: 'regrupeaza', foaie: foaie.id, degrupate: regrupate });
  return {
    comenzi,
    ids: ids.flatMap((x) => {
      const g = inGrup.get(x);
      return g === undefined ? [x] : g === '' ? [] : [g];
    }),
  };
}
