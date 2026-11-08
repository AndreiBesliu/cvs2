import { blocText } from './blocText.ts';
import { campuriDin, cuValori } from './campuriText.ts';
import { noduriPiesa, PLAFON, type Document, type Instanta, type Piesa } from './document.ts';
import { cuLitere } from './lume.ts';
import { inregistreazaJudecataTexte, matriciInMargini } from './schemaDocument.ts';

/**
 * Judecata literelor plăcuțelor (ADR 0210 §7; v23), partea ușii adusă la cerere: doar pentru un document cu plăcuțe la
 * pornire (`proiectLocal.ts`), mereu în ușa întreagă (`incarcare.ts`) și în acțiunile care fac litere. Se înregistrează în
 * `schemaDocument.ts` când e importat: fără ea, acolo un document cu plăcuțe nu trece. Pentru că nu stă în pachetul de
 * pornire, blocul șablonului se judecă întreg (schema lui și amprenta contururilor, `blocText`), cum cere ADR-ul.
 */

function problemaTexte(p: Piesa, i: Instanta): string | null {
  const texte = i.texte;
  if (!texte) return null;
  const noduri = noduriPiesa(p.radacina);
  const ids = new Set(noduri.map((x) => x.nod.id));
  const operatii = new Set(p.operatii.map((o) => o.id));
  const litere = new Set<string>();
  // Nodurile șablonului de sub fiecare grup al plăcuței: un grup al ei nu poate sta sub altul (literele lui n-ar mai fi în lume).
  const sub = new Map<string, Set<string>>();
  for (const g of Object.keys(texte)) {
    const x = noduri.find((y) => y.nod.id === g)?.nod;
    sub.set(g, new Set(x?.tip === 'grup' ? x.copii.flatMap((c) => noduriPiesa(c).map((y) => y.nod.id)) : []));
  }
  for (const [g, t] of Object.entries(texte)) {
    const x = noduri.find((y) => y.nod.id === g);
    const bloc = x ? blocText(x.nod) : null;
    if (!x || !bloc || campuriDin(bloc.continut).length === 0) return `instanța ${i.id}: ${g} nu e un text cu câmpuri`;
    if ([...sub].some(([h, s]) => h !== g && s.has(g))) return `instanța ${i.id}: ${g} stă sub alt text al plăcuței`;
    if (cuValori(bloc.continut, i.campuri ?? {}) !== t.continut) return `instanța ${i.id}: textul din ${g} nu e al valorilor ei`;
    const elemente = new Set<string>();
    for (const c of t.copii) {
      for (const { nod, adancime } of noduriPiesa(c)) {
        if (x.adancime + adancime > PLAFON.adancime) return `instanța ${i.id}: literele din ${g} trec de ${PLAFON.adancime} niveluri`;
        if (ids.has(nod.id) || litere.has(nod.id)) return `instanța ${i.id}: id-ul ${nod.id} e folosit`;
        litere.add(nod.id);
        if (nod.tip === 'element') elemente.add(nod.id);
      }
    }
    for (const [o, l] of Object.entries(t.operatii)) {
      if (!operatii.has(o) || new Set(l).size !== l.length || l.some((n) => !elemente.has(n))) return `instanța ${i.id}: ${o} nu taie literele din ${g}`;
    }
  }
  // Plafonul unei operații, pe ce taie ea în lumea instanței: nodurile șablonului rămase, plus literele plăcuței.
  const inlocuite = new Set([...sub.values()].flatMap((s) => [...s]));
  for (const o of p.operatii) {
    const n = o.noduri.filter((x) => !inlocuite.has(x)).length + Object.values(texte).reduce((s, t) => s + (t.operatii[o.id]?.length ?? 0), 0);
    if (n > PLAFON.noduriOperatie) return `instanța ${i.id}: ${o.id} taie ${n} noduri, peste ${PLAFON.noduriOperatie}`;
  }
  const m = matriciInMargini({ ...p, radacina: cuLitere(p.radacina, texte) });
  return m ? `instanța ${i.id}, cu literele ei: ${m}` : null;
}

/** Primul motiv pentru care literele plăcuțelor documentului nu trec, sau null. */
export function judecaTexte(d: Document): string | null {
  const piese = new Map(d.piese.map((p) => [p.id, p]));
  for (const f of d.foi) {
    for (const i of f.instante) {
      const p = piese.get(i.piesa);
      const t = p ? problemaTexte(p, i) : null;
      if (t) return t;
    }
  }
  return null;
}

inregistreazaJudecataTexte(judecaTexte);
