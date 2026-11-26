/*
 * Refuzurile calculului pe înțeles (ADR 0291, felia 28.8↑j; constatarea 7 a auditului ferestrei exportului). Textele motivelor
 * sunt ale lucrării (`src/cam/`) și vorbesc cu id-urile din lume („e2/c1”) și cu numere scrise cu punct; fereastra le arată cu
 * numele elementelor, ca în listă, iar în română cu virgula. Pur: fără React, fără document.
 */

/** Un id din lume: instanța, apoi nodul (`idLume`, `src/model/lume.ts`), fiecare din `[A-Za-z0-9_-]`. */
const ID_LUME = /[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+/g;

/**
 * Motivul `motiv` al calculului, cu id-urile cunoscute (`descrieri`) înlocuite de numele elementelor și, cu `virgula`, numerele
 * scrise de lucrare cu punct („1.000”, „24.0”) cu virgulă. Numerele se schimbă înaintea numelor, ca numele să rămână cum le scrie
 * lista. `cheie`: operația primului element numit care are una (`operatii`), pentru „Du-mă la …”; altfel `null`.
 */
export function motivPeInteles(
  motiv: string, descrieri: ReadonlyMap<string, string>, operatii: ReadonlyMap<string, string>, virgula: boolean,
): { readonly text: string; readonly cheie: string | null } {
  const cuVirgula = virgula ? motiv.replace(/(\d)\.(\d)/g, '$1,$2') : motiv;
  let cheie: string | null = null;
  const text = cuVirgula.replace(ID_LUME, (id) => {
    const nume = descrieri.get(id);
    if (nume === undefined) return id;
    cheie ??= operatii.get(id) ?? null;
    return nume;
  });
  return { text, cheie };
}
