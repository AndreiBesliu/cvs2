/**
 * Lista albă de licențe pentru dependențele de RULARE, ca funcție pură. Scriptul `verifica-licente.ts` o aplică pe
 * arborele real; testul ei e în `test/unit/licente.test.ts`.
 */
export const PERMISE: ReadonlySet<string> = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0',
]);

/** O expresie SPDX simplă: `A OR B` trece dacă trece una, `A AND B` dacă trec toate. Parantezele se ignoră. */
export function licentaPermisa(expresie: string | undefined): boolean {
  if (typeof expresie !== 'string' || !expresie.trim()) return false;
  const curata = expresie.replace(/[()]/g, ' ').trim();
  return curata.split(/\s+OR\s+/).some((alt) => alt.split(/\s+AND\s+/).every((l) => PERMISE.has(l.trim())));
}

type CampLicenta = string | { readonly type?: string } | ReadonlyArray<string | { readonly type?: string }> | undefined;

/** Licența declarată de un `package.json`, în forma veche (`licenses: [...]`) sau nouă (`license: "..."`). */
export function licentaDin(pachet: { readonly license?: CampLicenta; readonly licenses?: CampLicenta }): string | undefined {
  const l = pachet.license ?? pachet.licenses;
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) {
    return l.map((x: string | { readonly type?: string }) => (typeof x === 'string' ? x : x.type ?? '')).join(' OR ');
  }
  if (l && typeof l === 'object' && 'type' in l) return l.type;
  return undefined;
}
