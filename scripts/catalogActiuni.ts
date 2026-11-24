/**
 * Catalogul acțiunilor pentru fila Utilizare (ADR 0262 §6, felia A.9b), generat la build (`scripts/documentatie.ts`):
 * acțiunile registrului (aceleași liste ca poarta manualului) și uneltele, cu eticheta lor în română și în engleză, din
 * dicționarele aplicației, scurtate ca în manual (`numeScurt`). O etichetă care nu e un text simplu în ambele limbi oprește build-ul (o cheie greșită n-ajunge în
 * admin ca „undefined”).
 */
import { UNELTE } from '../src/app/desenCalcul.ts';
import { numeScurt } from '../src/app/editareCalcul.ts';
import { enCarcasa } from '../src/i18n/carcasa.en.ts';
import { roCarcasa } from '../src/i18n/carcasa.ro.ts';
import { enEditare } from '../src/i18n/editare.en.ts';
import { roEditare } from '../src/i18n/editare.ro.ts';
import { enImprimanta } from '../src/i18n/imprimanta.en.ts';
import { roImprimanta } from '../src/i18n/imprimanta.ro.ts';
import { enMasina } from '../src/i18n/masina.en.ts';
import { roMasina } from '../src/i18n/masina.ro.ts';
import { en } from '../src/i18n/mesaje.en.ts';
import { ro } from '../src/i18n/mesaje.ro.ts';
import { ACTIUNI_DOCUMENT } from '../src/ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT } from '../src/ui/actiuniExport.ts';
import { ACTIUNI_EXTENSII } from '../src/ui/actiuniExtensii.ts';
import { ACTIUNI_IMPORT } from '../src/ui/actiuniImport.ts';
import { ACTIUNI_VEDERE } from '../src/ui/actiuniVedere.ts';
import type { CatalogActiuni, IntrareActiune } from '../shared/documentatie.ts';

const DICTIONAR = {
  ro: { ...ro, ...roEditare, ...roMasina, ...roImprimanta, ...roCarcasa } as Record<string, unknown>,
  en: { ...en, ...enEditare, ...enMasina, ...enImprimanta, ...enCarcasa } as Record<string, unknown>,
};

function intrare(id: string, cheie: string): IntrareActiune {
  const r = DICTIONAR.ro[cheie], e = DICTIONAR.en[cheie];
  if (typeof r !== 'string' || typeof e !== 'string') throw new Error(`catalogul acțiunilor: cheia „${cheie}” (${id}) nu e un text simplu în ambele limbi`);
  // Numele de pe ecran, ca în manual: fără tasta și explicația din eticheta lungă.
  return { id, ro: numeScurt(r), en: numeScurt(e) };
}

export function catalogActiuni(): CatalogActiuni {
  const actiuni = [...ACTIUNI_DOCUMENT, ...ACTIUNI_VEDERE, ...ACTIUNI_IMPORT, ...ACTIUNI_EXPORT, ...ACTIUNI_EXTENSII]
    .map((a) => intrare(a.id, a.eticheta));
  const ids = new Set<string>();
  for (const a of actiuni) {
    if (ids.has(a.id)) throw new Error(`catalogul acțiunilor: „${a.id}” apare de două ori`);
    ids.add(a.id);
  }
  return {
    schema: 1,
    actiuni: [...actiuni].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    unelte: UNELTE.map((u) => intrare(u, `editare.unealta.${u}`)),
  };
}
