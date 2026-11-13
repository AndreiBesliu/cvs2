import type { Document, Foaie } from './document.ts';
import { indexFoaie, inregistreazaFoile, type Comanda } from './jurnal.ts';

/**
 * Aplicarea comenzilor foilor în jurnal (ADR 0210 §1): adaugă, șterge, mută foaia și eticheta ei. Stă aici, nu în `jurnal.ts`,
 * ca să nu intre în pachetul de pornire: vine cu comenzile (`foiComenzi.ts`), adică cu calculul acțiunilor, și se înregistrează
 * în jurnal la încărcare.
 */

/** Un loc valid într-o listă de `n` lucruri, la inserare (`n` inclus) sau la citire. */
const locBun = (k: number, n: number): boolean => Number.isInteger(k) && k >= 0 && k <= n;

/**
 * Comenzile foilor (ADR 0210 §1). Totul trebuie să fie unde spune comanda; după ele, fiecare instanță, de pe orice foaie,
 * trimite la o piesă care există, niciun id nu se repetă și documentul are cel puțin o foaie.
 */
function aplicaFoaie(doc: Document, c: Extract<Comanda, { readonly tip: 'adauga-foaie' | 'sterge-foaie' | 'muta-foaie' | 'eticheta-foaie' }>): Document {
  if (c.tip === 'muta-foaie') {
    const f = doc.foi[c.de];
    if (!f || f.id !== c.foaie) throw new Error(`muta-foaie: foaia ${c.foaie} nu stă la locul ${c.de}`);
    if (!locBun(c.la, doc.foi.length - 1)) throw new Error(`muta-foaie: locul ${c.la} e în afara listei foilor (${doc.foi.length})`);
    const foi = [...doc.foi];
    foi.splice(c.de, 1);
    foi.splice(c.la, 0, f);
    return { ...doc, foi };
  }
  if (c.tip === 'eticheta-foaie') {
    const fi = indexFoaie(doc, c.foaie);
    const foaie = doc.foi[fi];
    if (!foaie) throw new Error(`foaia ${c.foaie} nu există`);
    const are = Object.hasOwn(foaie, c.camp);
    if (are !== (c.vechi !== null) || (c.vechi !== null && !Object.is(foaie[c.camp], c.vechi.valoare))) {
      throw new Error(`eticheta-foaie: ${c.camp} foii ${c.foaie} nu e cel din comandă`);
    }
    const foi = [...doc.foi];
    if (c.nou === null) {
      const rest: Foaie = { ...foaie };
      delete rest[c.camp];
      foi[fi] = rest;
    } else {
      // Un câmp care există își păstrează locul în foaie.
      foi[fi] = { ...foaie, [c.camp]: c.nou.valoare };
    }
    return { ...doc, foi };
  }
  if (c.tip === 'adauga-foaie') {
    if (doc.foi.some((f) => f.id === c.foaie.id)) throw new Error(`foaia ${c.foaie.id} există deja`);
    if (!locBun(c.pozitie, doc.foi.length)) throw new Error(`adauga-foaie: locul ${c.pozitie} e în afara listei foilor (${doc.foi.length})`);
    const piese = [...doc.piese];
    // Locurile sunt cele din lista de după: inserate crescător, fiecare ajunge exact unde scrie.
    for (const { piesa, pozitie } of [...c.piese].sort((a, b) => a.pozitie - b.pozitie)) {
      if (piese.some((p) => p.id === piesa.id)) throw new Error(`piesa ${piesa.id} există deja`);
      if (!locBun(pozitie, piese.length)) throw new Error(`adauga-foaie: locul ${pozitie} e în afara listei pieselor (${piese.length})`);
      piese.splice(pozitie, 0, piesa);
    }
    const idPiese = new Set(piese.map((p) => p.id));
    const existente = new Set(doc.foi.flatMap((f) => f.instante.map((i) => i.id)));
    for (const i of c.foaie.instante) {
      if (existente.has(i.id)) throw new Error(`instanța ${i.id} există deja`);
      existente.add(i.id);
      if (!idPiese.has(i.piesa)) throw new Error(`instanța ${i.id} ar trimite la piesa lipsă ${i.piesa}`);
    }
    const foi = [...doc.foi];
    foi.splice(c.pozitie, 0, c.foaie);
    return { ...doc, piese, foi };
  }
  if (doc.foi[c.pozitie]?.id !== c.foaie.id) throw new Error(`sterge-foaie: foaia ${c.foaie.id} nu stă la locul ${c.pozitie}`);
  if (doc.foi.length === 1) throw new Error('sterge-foaie: documentul ar rămâne fără foi');
  const foi = doc.foi.filter((_, k) => k !== c.pozitie);
  const piese = [...doc.piese];
  for (const { piesa, pozitie } of [...c.piese].sort((a, b) => b.pozitie - a.pozitie)) {
    if (piese[pozitie]?.id !== piesa.id) throw new Error(`sterge-foaie: piesa ${piesa.id} nu stă la locul ${pozitie}`);
    piese.splice(pozitie, 1);
  }
  const ramase = new Set(piese.map((p) => p.id));
  for (const f of foi) for (const i of f.instante) if (!ramase.has(i.piesa)) throw new Error(`sterge-foaie: instanța ${i.id} ar trimite la piesa ștearsă ${i.piesa}`);
  return { ...doc, piese, foi };
}

inregistreazaFoile(aplicaFoaie);
