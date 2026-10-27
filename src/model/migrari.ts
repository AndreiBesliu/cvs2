import * as v from 'valibot';
import { SchemaDocumentV1, type DocumentV1 } from './schemaV1.ts';
import { motivSchema, type Brut, type Migrare } from './usaCurenta.ts';

/**
 * Migrările pure ale ușii (T16, ADR 0024), vN → vN+1, într-un modul al lor (ADR 0070): un proiect salvat de versiunea
 * curentă nu le aduce la pornire. Textul lor e mutat neschimbat din `incarcare.ts`.
 */

/**
 * v1 → v2 (ADR 0024): fiecare element devine o piesă cu o singură instanță, ambele cu id-ul elementului. Translația
 * matricei trece pe instanță, restul rămâne pe element, deci matricea în lume e numeric aceeași (instanța are rotirea 0).
 * Câmpurile necunoscute rămân: ale elementului pe elementul-rădăcină, ale matricei pe matrice, ale foii pe `stoc`, cele
 * de sus pe document. Primește intrarea BRUTĂ, deja validată: ieșirea valibot ar fi scos tăcut cheile `__proto__`,
 * `constructor` și `prototype`.
 */
function v1v2(doc: DocumentV1): Brut {
  const { schema: _schema, rev, foaie, elemente, ...restDoc } = doc;
  const piese: Brut[] = [];
  const instante: Brut[] = [];
  for (const el of elemente) {
    const { id, nume, matrice, ...restEl } = el;
    piese.push({
      id,
      ...(nume === undefined ? {} : { nume }),
      radacina: { ...restEl, tip: 'element', id, matrice: { ...matrice, e: 0, f: 0 } },
    });
    instante.push({ id, piesa: id, x: matrice.e, y: matrice.f, rotire: 0 });
  }
  return { ...restDoc, schema: 2, rev, piese, foi: [{ id: 'f1', stoc: foaie, instante }] };
}

/**
 * v2 → v3 (ADR 0025): fiecare piesă primește câte o operație de profil pe fiecare element al ei, în preordine, cu exact
 * implicitele cu care aplicația v2 exporta. ÎNGHEȚATĂ: are propria copie a implicitelor (operația implicită a aplicației
 * poate evolua, migrarea nu). Lucrează defensiv pe orice formă: nu adaugă nimic din ce schema v3 n-ar refuza oricum, iar
 * v3 conține toate regulile v2, deci un v2 stricat rămâne stricat și e refuzat după migrare.
 */
function v2v3(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 3 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    if (Object.hasOwn(piesa, 'operatii')) {
      return { ok: false, motiv: `piesa v2 ${String(piesa['id'])} are câmpul „operatii”, pe care v3 îl folosește: nu se poate migra fără să-l piardă` };
    }
    const operatii: Brut[] = [];
    const stiva: unknown[] = [piesa['radacina']];
    while (stiva.length > 0) {
      const nod = stiva.pop();
      if (typeof nod !== 'object' || nod === null) continue;
      const n = nod as Brut;
      if (n['tip'] === 'element') {
        const forma = n['forma'] as Brut | undefined;
        const scula = { numar: 1, nume: 'freza plata', diametru: 6 };
        if (forma?.['tip'] === 'cerc') {
          operatii.push({ id: n['id'], tip: 'profil', noduri: [n['id']], scula, latura: 'interior', adancime: 8, pas: 4 });
        } else if (forma?.['tip'] === 'dreptunghi') {
          operatii.push({ id: n['id'], tip: 'profil', noduri: [n['id']], scula, latura: 'exterior', adancime: 3, pas: 3 });
        }
      } else if (n['tip'] === 'grup' && Array.isArray(n['copii'])) {
        for (let k = n['copii'].length - 1; k >= 0; k--) stiva.push(n['copii'][k]);
      }
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 3, piese: noi } };
}

/**
 * v3 → v4 (ADR 0027): fiecare operație primește `sens: 'urcare'`, implicitul owner-ului. Defensivă, ca v2 → v3: o
 * operație care are deja un câmp `sens` e o ciocnire de nume și e refuzată; restul formelor le judecă schema v4.
 */
function v3v4(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 4 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'sens')) {
        return { ok: false, motiv: `operația v3 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „sens”, pe care v4 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), sens: 'urcare' });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 4, piese: noi } };
}

/**
 * v4 → v5 (ADR 0028): fiecare operație primește `urechi: null`, adică fără urechi, deci programul rămâne același octet cu
 * octet. Defensivă, ca v3 → v4: o operație care are deja un câmp `urechi` e o ciocnire de nume și e refuzată.
 */
function v4v5(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 5 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'urechi')) {
        return { ok: false, motiv: `operația v4 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „urechi”, pe care v5 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), urechi: null });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 5, piese: noi } };
}

/**
 * v5 → v6 (ADR 0029): fiecare operație primește `rampa: null`, adică fără rampă, deci programul rămâne același octet cu
 * octet. Defensivă, ca v4 → v5: o operație care are deja un câmp `rampa` e o ciocnire de nume și e refuzată.
 */
function v5v6(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 6 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'rampa')) {
        return { ok: false, motiv: `operația v5 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „rampa”, pe care v6 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), rampa: null });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 6, piese: noi } };
}

/**
 * v6 → v7 (ADR 0030): fiecare operație primește `intrari: null`, adică fără intrări, deci programul rămâne același octet
 * cu octet. Defensivă, ca v5 → v6: o operație care are deja un câmp `intrari` e o ciocnire de nume și e refuzată.
 */
function v6v7(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 7 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'intrari')) {
        return { ok: false, motiv: `operația v6 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „intrari”, pe care v7 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), intrari: null });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 7, piese: noi } };
}

/**
 * v7 → v8 (ADR 0032): fiecare operație primește `colturi: null`, adică fără degajări, deci programul rămâne același octet
 * cu octet. Defensivă, ca v6 → v7: o operație care are deja un câmp `colturi` e o ciocnire de nume și e refuzată.
 */
function v7v8(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 8 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'colturi')) {
        return { ok: false, motiv: `operația v7 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „colturi”, pe care v8 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), colturi: null });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 8, piese: noi } };
}

/**
 * v8 → v9 (ADR 0034 §3): doar numărul. v9 adaugă o formă, „cale”, fără niciun câmp nou pe ce exista, deci un document v8
 * e un document v9 valid, iar programul lui rămâne același, octet cu octet. Un document marcat v8 care conține o cale e
 * refuzat: v8 n-o cunoaște, deci nu e un v8 valid (oracolul 2.7b), iar ușa nu ghicește cine l-a scris.
 */
function v8v9(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const stiva: unknown[] = [(p as Brut)['radacina']];
    while (stiva.length > 0) {
      const nod = stiva.pop();
      if (typeof nod !== 'object' || nod === null) continue;
      const n = nod as Brut;
      const forma = n['forma'];
      if (n['tip'] === 'element' && typeof forma === 'object' && forma !== null && (forma as Brut)['tip'] === 'cale') {
        return { ok: false, motiv: `elementul v8 ${String(n['id'])} are o formă „cale”, pe care v8 n-o cunoaște: nu e un document v8 valid` };
      }
      if (n['tip'] === 'grup' && Array.isArray(n['copii'])) for (const c of n['copii']) stiva.push(c);
    }
  }
  return { ok: true, doc: { ...doc, schema: 9 } };
}

/**
 * v9 → v10 (ADR 0037 §2): doar numărul. v10 adaugă calea deschisă (`inchis: false`), laturile `stanga` / `dreapta` și
 * marcajul `despartire`, fără niciun câmp nou obligatoriu, deci un document v9 e un document v10 valid, iar programul lui
 * rămâne același, octet cu octet. Un document marcat v9 care conține una din ele e refuzat, ca la v8 → v9: v9 n-o
 * cunoaște, deci nu e un v9 valid, iar ușa nu ghicește cine l-a scris. (O versiune v9 refuză la rândul ei un document
 * v10: nu poate tăia o cale deschisă închizând-o.)
 */
function v9v10(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    const stiva: unknown[] = [piesa['radacina']];
    while (stiva.length > 0) {
      const nod = stiva.pop();
      if (typeof nod !== 'object' || nod === null) continue;
      const n = nod as Brut;
      const forma = n['forma'];
      if (n['tip'] === 'element' && typeof forma === 'object' && forma !== null && (forma as Brut)['tip'] === 'cale' && (forma as Brut)['inchis'] !== true) {
        return { ok: false, motiv: `elementul v9 ${String(n['id'])} are o cale care nu e închisă, pe care v9 n-o cunoaște: nu e un document v9 valid` };
      }
      if (n['tip'] === 'grup' && Array.isArray(n['copii'])) for (const c of n['copii']) stiva.push(c);
    }
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      const unde = `operația v9 ${String(op['id'])} din piesa ${String(piesa['id'])}`;
      if (op['latura'] === 'stanga' || op['latura'] === 'dreapta') {
        return { ok: false, motiv: `${unde} are latura „${op['latura']}”, pe care v9 n-o cunoaște: nu e un document v9 valid` };
      }
      if (Object.hasOwn(op, 'despartire')) {
        return { ok: false, motiv: `${unde} are câmpul „despartire”, pe care v10 îl folosește: nu e un document v9 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 10 } };
}

/**
 * v10 → v11 (ADR 0069 §2): doar numărul. v11 adaugă felul `buzunar` al operației, cu `pasLateral`, fără niciun câmp nou
 * obligatoriu pe ce exista, deci un document v10 e un document v11 valid, iar programul lui rămâne același, octet cu
 * octet. Un document marcat v10 cu un buzunar sau cu un câmp propriu `pasLateral` pe o operație e refuzat, ca la v9 → v10:
 * v10 nu le cunoaște, deci nu e un v10 valid. (O versiune v10 refuză la rândul ei un document v11: ar tăia buzunarul ca
 * profil, adică l-ar decupa.)
 */
function v10v11(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      const unde = `operația v10 ${String(op['id'])} din piesa ${String(piesa['id'])}`;
      if (op['tip'] !== 'profil') return { ok: false, motiv: `${unde} are tipul „${String(op['tip'])}”, pe care v10 nu-l cunoaște: nu e un document v10 valid` };
      if (Object.hasOwn(op, 'pasLateral')) {
        return { ok: false, motiv: `${unde} are câmpul „pasLateral”, pe care v11 îl folosește: nu e un document v10 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 11 } };
}

/**
 * v11 → v12 (ADR 0076): doar numărul. v12 adaugă coborârea în buzunar (`coborare`, opțională), deci un document v11 e un
 * document v12 valid, cu același program (fără coborare, plonjarea de până acum). Un document marcat v11 cu un câmp propriu
 * `coborare` pe o operație e refuzat: v11 nu-l cunoaște, deci nu e un v11 valid. (O versiune v11 refuză un document v12:
 * ar plonja acolo unde omul a cerut rampa, iar o freză care nu taie în centru s-ar rupe.)
 */
function v11v12(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      if (Object.hasOwn(op, 'coborare')) {
        return { ok: false, motiv: `operația v11 ${String(op['id'])} din piesa ${String(piesa['id'])} are câmpul „coborare”, pe care v12 îl folosește: nu e un document v11 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 12 } };
}

/**
 * v12 → v13 (ADR 0087): doar numărul. v13 adaugă felul `gaurire` al operației, cu `retragereCompleta` (opțională), deci un
 * document v12 e un document v13 valid, cu același program. Un document marcat v12 cu o găurire sau cu un câmp propriu
 * `retragereCompleta` pe o operație e refuzat: v12 nu le cunoaște, deci nu e un v12 valid. (O versiune v12 refuză un
 * document v13: n-ar ști să găurească cercul.)
 */
function v12v13(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      const unde = `operația v12 ${String(op['id'])} din piesa ${String(piesa['id'])}`;
      if (op['tip'] === 'gaurire') return { ok: false, motiv: `${unde} are tipul „gaurire”, pe care v12 nu-l cunoaște: nu e un document v12 valid` };
      if (Object.hasOwn(op, 'retragereCompleta')) {
        return { ok: false, motiv: `${unde} are câmpul „retragereCompleta”, pe care v13 îl folosește: nu e un document v12 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 13 } };
}

/**
 * v13 → v14 (ADR 0090): doar numărul. v14 adaugă felul `vcarve` al operației și forma frezei (`scula.forma`, opțională), deci
 * un document v13 e un document v14 valid, cu același program. Un document marcat v13 cu un V-carve sau cu un câmp propriu
 * `forma` pe scula unei operații e refuzat: v13 nu le cunoaște, deci nu e un v13 valid. (O versiune v13 refuză un document
 * v14: n-ar ști să sape cu freza în V.)
 */
function v13v14(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      const unde = `operația v13 ${String(op['id'])} din piesa ${String(piesa['id'])}`;
      if (op['tip'] === 'vcarve') return { ok: false, motiv: `${unde} are tipul „vcarve”, pe care v13 nu-l cunoaște: nu e un document v13 valid` };
      const scula = op['scula'];
      if (typeof scula === 'object' && scula !== null && Object.hasOwn(scula, 'forma')) {
        return { ok: false, motiv: `${unde} are câmpul „forma” pe sculă, pe care v14 îl folosește: nu e un document v13 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 14 } };
}

/**
 * v14 → v15 (ADR 0091): doar numărul. v15 adaugă fundul plat al V-carve-ului (`fundPlat`, opțional), deci un document v14
 * e un document v15 valid, cu același program. Un document marcat v14 cu un câmp propriu `fundPlat` pe o operație e refuzat:
 * v14 nu-l cunoaște, deci nu e un v14 valid. (O versiune v14 refuză un document v15: ar lăsa fundul plat netăiat.)
 */
function v14v15(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      if (Object.hasOwn(op, 'fundPlat')) {
        return { ok: false, motiv: `operația v14 ${String(op['id'])} din piesa ${String(piesa['id'])} are câmpul „fundPlat”, pe care v15 îl folosește: nu e un document v14 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 15 } };
}

/**
 * v15 → v16 (ADR 0092): doar numărul. v16 adaugă vârful plat al frezei în V (`scula.forma.varf`) și direcția tăieturii pe
 * linie (`directie`), ambele opționale, deci un document v15 e un document v16 valid, cu același program. Un document marcat
 * v15 cu un câmp propriu `directie` pe o operație sau `varf` în forma unei freze (a operației sau a fundului plat) e refuzat:
 * v15 nu le cunoaște, deci nu e un v15 valid. (O versiune v15 refuză un document v16: ar tăia cu un vârf ascuțit unde freza
 * are un platou, sau în sensul desenului.)
 */
function v15v16(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  const areVarf = (s: unknown): boolean => {
    const f = typeof s === 'object' && s !== null ? (s as Brut)['forma'] : undefined;
    return typeof f === 'object' && f !== null && Object.hasOwn(f, 'varf');
  };
  for (const p of Array.isArray(piese) ? piese : []) {
    if (typeof p !== 'object' || p === null) continue;
    const piesa = p as Brut;
    for (const o of Array.isArray(piesa['operatii']) ? piesa['operatii'] as unknown[] : []) {
      if (typeof o !== 'object' || o === null) continue;
      const op = o as Brut;
      const unde = `operația v15 ${String(op['id'])} din piesa ${String(piesa['id'])}`;
      if (Object.hasOwn(op, 'directie')) {
        return { ok: false, motiv: `${unde} are câmpul „directie”, pe care v16 îl folosește: nu e un document v15 valid` };
      }
      const fp = op['fundPlat'];
      if (areVarf(op['scula']) || (typeof fp === 'object' && fp !== null && areVarf((fp as Brut)['scula']))) {
        return { ok: false, motiv: `${unde} are câmpul „varf” în forma frezei, pe care v16 îl folosește: nu e un document v15 valid` };
      }
    }
  }
  return { ok: true, doc: { ...doc, schema: 16 } };
}

/**
 * Migrările pure, vN → vN+1. Cheia e versiunea de PLECARE. Lista crește; o migrare scrisă nu se mai schimbă. Fiecare
 * lucrează doar pe forma pe care o promite: v1 → v2 își validează intrarea cu schema v1 înghețată; v2 → v3 … v15 → v16
 * lucrează defensiv, iar schema curentă (care conține toate regulile de dinainte) judecă rezultatul.
 */
export const MIGRARI: Readonly<Record<number, Migrare>> = {
  1: (brut) => {
    const r = v.safeParse(SchemaDocumentV1, brut);
    if (!r.success) return { ok: false, motiv: `documentul v1 nu respectă schema${motivSchema(r.issues)}` };
    // Un câmp necunoscut cu numele unui câmp din v2 s-ar pierde în migrare: refuzat, cu motiv, nu acoperit (ADR 0024).
    for (const k of ['piese', 'foi'] as const) {
      if (Object.hasOwn(brut, k)) return { ok: false, motiv: `documentul v1 are câmpul „${k}”, pe care v2 îl folosește: nu se poate migra fără să-l piardă` };
    }
    const elemente = (brut as unknown as DocumentV1).elemente;
    const ciocnire = elemente.find((e) => Object.hasOwn(e, 'tip'));
    if (ciocnire) return { ok: false, motiv: `elementul v1 ${ciocnire.id} are câmpul „tip”, pe care v2 îl folosește: nu se poate migra fără să-l piardă` };
    return { ok: true, doc: v1v2(brut as unknown as DocumentV1) };
  },
  2: v2v3,
  3: v3v4,
  4: v4v5,
  5: v5v6,
  6: v6v7,
  7: v7v8,
  8: v8v9,
  9: v9v10,
  10: v10v11,
  11: v11v12,
  12: v12v13,
  13: v13v14,
  14: v14v15,
  15: v15v16,
};

