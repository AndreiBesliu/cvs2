/**
 * Îmbinarea setărilor din cont (ADR 0330, întrebarea 14a, felia 10.4↑g), pură: câmp cu câmp, față de ultima versiune
 * comună (baza), ca la biblioteca de freze. Ce s-a schimbat doar aici rămâne, ce s-a schimbat doar în cont vine, ce e la
 * fel în ambele e bun; un câmp schimbat altfel în ambele e o **ciocnire**: rămâne, deocamdată, ca aici, iar calea lui se
 * dă, ca omul să aleagă. Obiectele se îmbină pe câmpuri; orice altceva (și listele) e o valoare întreagă. Un câmp lipsă e
 * „nedat”. Cheile sunt date, nu proprietăți: și „__proto__” se pune ca orice câmp.
 */

export type ObiectJson = Readonly<Record<string, unknown>>;
export type Cale = readonly string[];
export type ImbinarePreferinte = { readonly rezultat: Record<string, unknown>; readonly ciocniri: readonly Cale[] };

const obiect = (x: unknown): x is ObiectJson => typeof x === 'object' && x !== null && !Array.isArray(x);
const egale = (a: unknown, b: unknown): boolean => (a === undefined || b === undefined ? a === b : JSON.stringify(a) === JSON.stringify(b));
const are = (o: ObiectJson | undefined, k: string): boolean => o !== undefined && Object.hasOwn(o, k);
const ia = (o: ObiectJson | undefined, k: string): unknown => (are(o, k) ? o![k] : undefined);

/** Pune un câmp ca dată (fără setter-ul lui `__proto__`). */
function pune(o: Record<string, unknown>, k: string, v: unknown): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}

function imbina(b: ObiectJson | undefined, a: ObiectJson, c: ObiectJson, cale: Cale, ciocniri: Cale[]): Record<string, unknown> {
  const rez: Record<string, unknown> = {};
  const chei = new Set([...Object.keys(a), ...Object.keys(c)]);
  for (const k of chei) {
    const vb = ia(b, k), va = ia(a, k), vc = ia(c, k);
    let v: unknown;
    if (obiect(va) && obiect(vc) && (vb === undefined || obiect(vb))) v = imbina(vb as ObiectJson | undefined, va, vc, [...cale, k], ciocniri);
    else if (egale(va, vb)) v = vc;
    else if (egale(vc, vb) || egale(va, vc)) v = va;
    else {
      ciocniri.push([...cale, k]);
      v = va;
    }
    if (v !== undefined) pune(rez, k, v);
  }
  return rez;
}

/** Îmbinarea câmp cu câmp a setărilor de aici cu cele din cont, față de baza comună. */
export function imbinaPreferinte(baza: ObiectJson, aici: ObiectJson, cont: ObiectJson): ImbinarePreferinte {
  const ciocniri: Cale[] = [];
  return { rezultat: imbina(baza, aici, cont, [], ciocniri), ciocniri };
}

/** „Ia-le pe cele din cont”: câmpurile de pe căile date primesc valoarea din cont (sau pleacă, dacă acolo lipsesc). */
export function cuValorileDinCont(rezultat: ObiectJson, cont: ObiectJson, cai: readonly Cale[]): Record<string, unknown> {
  const copie = (o: ObiectJson): Record<string, unknown> => {
    const r: Record<string, unknown> = {};
    for (const k of Object.keys(o)) pune(r, k, obiect(o[k]) ? copie(o[k] as ObiectJson) : o[k]);
    return r;
  };
  const rez = copie(rezultat);
  for (const cale of cai) {
    let aici: Record<string, unknown> = rez, acolo: unknown = cont;
    cale.forEach((k, i) => {
      acolo = obiect(acolo) ? ia(acolo, k) : undefined;
      if (i === cale.length - 1) {
        if (acolo === undefined) delete aici[k];
        else pune(aici, k, acolo);
        return;
      }
      if (!obiect(ia(aici, k))) pune(aici, k, {});
      aici = aici[k] as Record<string, unknown>;
    });
  }
  return rez;
}
