import * as v from 'valibot';
import { blocText } from './blocText.ts';
import { campuriDin, cuValori } from './campuriText.ts';
import { noduriPiesa, numara, PLAFON, plafonDepasit, type Document, type Instanta, type Piesa } from './document.ts';
import { cuLitere } from './lume.ts';
import { inregistreazaJudecataTexte, matriciInMargini, SchemaTextePlacuta } from './schemaDocument.ts';

/**
 * Judecata literelor plăcuțelor (ADR 0210 §7; v23), partea ușii adusă la cerere: doar pentru un document cu plăcuțe la
 * pornire (`proiectLocal.ts`), mereu în ușa întreagă (`incarcare.ts`) și în acțiunile care fac litere. Se înregistrează în
 * `schemaDocument.ts` când e importat: fără ea, acolo un document cu plăcuțe nu trece. Pentru că nu stă în pachetul de
 * pornire, blocul șablonului se judecă întreg (schema lui și amprenta contururilor, `blocText`), cum cere ADR-ul.
 */

/**
 * Cheile pe care un dicționar al validatorului le sare (valibot, ca apărare a prototipului), dar care sunt date (ADR 0024 §9):
 * judecata le vede pe documentul brut, deci le judecă aici și forma.
 */
const SARITE = ['__proto__', 'constructor', 'prototype'] as const;
const sarite = (o: object): boolean => SARITE.some((k) => Object.hasOwn(o, k));

/** Forma intrărilor pe care validatorul le-a sărit: literele unei chei sărite, o valoare a unui câmp sărit, o listă a unei operații sărite. */
function problemaSarite(i: Instanta): string | null {
  const texte = i.texte ?? {};
  for (const k of SARITE) {
    if (Object.hasOwn(texte, k) && !v.is(SchemaTextePlacuta, texte[k])) return `instanța ${i.id}: literele din ${k} nu sunt în forma lor`;
    const c = i.campuri && Object.hasOwn(i.campuri, k) ? i.campuri[k] : '';
    if (typeof c !== 'string' || c.length > PLAFON.campLungime) return `instanța ${i.id}: câmpul ${k} nu e un text de cel mult ${PLAFON.campLungime} de caractere`;
  }
  for (const [g, t] of Object.entries(texte)) {
    for (const k of SARITE) {
      const l: unknown = Object.hasOwn(t.operatii, k) ? t.operatii[k] : [];
      if (!Array.isArray(l) || l.some((n) => typeof n !== 'string')) return `instanța ${i.id}: ${k} nu taie literele din ${g}`;
    }
  }
  return null;
}

function problemaTexte(p: Piesa, i: Instanta): string | null {
  const texte = i.texte;
  if (!texte) return null;
  const s = problemaSarite(i);
  if (s) return s;
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
  // Plafoanele de ansamblu (`numara`) le-a socotit schema fără literele de sub o cheie sărită: aici, cu ele.
  if (d.foi.some((f) => f.instante.some((i) => i.texte && sarite(i.texte)))) {
    for (const f of d.foi) for (const i of f.instante) if (i.texte) { const s = problemaSarite(i); if (s) return s; }
    const p = plafonDepasit(numara(d));
    if (p) return p;
  }
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
