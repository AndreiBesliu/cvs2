/**
 * „Pune în frezele mele” din catalog (ADR 0302 §1, felia 16.A↑h-3), fără datele catalogului: depozitul bibliotecii (comun
 * ferestrei și panoului Tăierea) îl folosește, iar catalogul însuși (`catalogFreze.ts`) rămâne doar în bucata ferestrei.
 */
import { areRaza, areUnghi, cuFreza, MARGINI_FREZA, numeLiber, type Freza, type FrezaFaraNume, type FrezaSalvata } from './freza.ts';

const egal = (a: number | undefined, b: number | undefined): boolean => (a === undefined || b === undefined ? a === b : Math.abs(a - b) < 1e-9);

/** Aceeași freză, după geometrie (felul, diametrul, unghiul, vârful, raza): numele și valorile de lucru nu contează. */
export function aceeasiGeometrie(a: FrezaFaraNume, b: FrezaFaraNume): boolean {
  return a.fel === b.fel && egal(a.diametru, b.diametru)
    && (!areUnghi(a.fel) || egal(a.unghi, b.unghi)) && (a.fel !== 'gravare' || egal(a.varf, b.varf))
    && (!areRaza(a.fel) || egal(a.raza, b.raza));
}

/**
 * „Pune în frezele mele” (ADR 0302 §1): fiecare freză aleasă din catalog intră în bibliotecă, dacă acolo nu e deja una cu
 * aceeași geometrie, cu un nume liber și cu primul T liber; câmpurile catalogului (id-ul, grupul lui) nu intră. Peste
 * plafonul bibliotecii, restul nu mai intră (`plina`).
 */
export function cuDinCatalog(
  lista: readonly FrezaSalvata[], alese: readonly Freza[], idNou: () => string, acum: number, rezervate: readonly string[] = [],
): { readonly lista: readonly FrezaSalvata[]; readonly adaugate: number; readonly existente: number; readonly plina: boolean } {
  let rez = lista;
  let existente = 0;
  let plina = false;
  for (const a of alese) {
    if (rez.some((f) => aceeasiGeometrie(f, a))) { existente++; continue; }
    if (rez.length >= MARGINI_FREZA.freze) { plina = true; continue; }
    const { id: _i, grupCatalog: _g, ...f } = a as Freza & { id?: unknown; grupCatalog?: unknown };
    void _i; void _g;
    const luate = new Set(rez.map((x) => x.numar));
    let numar = 1;
    while (luate.has(numar) && numar < MARGINI_FREZA.numar) numar++;
    const r = cuFreza(rez, null, { ...(f as Freza), numar, nume: numeLiber(a.nume, rez, rezervate) }, idNou, acum, rezervate);
    if (r.ok) rez = r.lista;
  }
  return { lista: rez, adaugate: rez.length - lista.length, existente, plina };
}
