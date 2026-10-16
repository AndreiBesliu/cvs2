import type { Cheie, CheieSimpla } from '../../i18n/t.ts';
import type { Masura } from '../erori/date.ts';

/**
 * Diagnoza minimă (ADR 0040 §5): verificări active, fiecare cu starea, măsura și indiciul. Pură: componenta adună
 * măsurile (citirile, apelul la funcție), iar aici se judecă.
 */

export type StareVerificare = 'bine' | 'atentie' | 'esec' | 'info';

export interface Verificare {
  readonly id: 'instanta' | 'build' | 'appcheck' | 'rol' | 'nerezolvate' | 'functii' | 'marcaje';
  readonly stare: StareVerificare;
  readonly titlu: CheieSimpla;
  /** Măsura: o cheie cu parametrii ei; `n` alege pluralul. */
  readonly masura: { readonly cheie: Cheie; readonly param?: Readonly<Record<string, string | number>> };
  readonly indiciu?: CheieSimpla;
}

export interface DateDiagnoza {
  readonly instanta: string;
  readonly proiect: string;
  readonly build: string;
  readonly appCheck: 'recaptcha' | 'proba' | 'oprit';
  readonly rol: string;
  readonly nerezolvate: Masura<number>;
  /** Codul HTTP al unui apel fără App Check la `logClientError`; trebuie să fie 401. */
  readonly functii: Masura<number>;
}

/** Proiectul la care trebuie să vorbească o instanță. */
export function proiectAsteptat(instanta: string, proiect: string): boolean {
  if (instanta === 'test') return proiect === 'cncvectorstudio-test';
  if (instanta === 'live') return proiect === 'cncvectorstudio';
  if (instanta === 'local') return proiect.startsWith('demo-');
  return false;
}

export function verificari(d: DateDiagnoza): readonly Verificare[] {
  const v: Verificare[] = [];
  const p = { instanta: d.instanta, proiect: d.proiect };
  v.push(proiectAsteptat(d.instanta, d.proiect)
    ? { id: 'instanta', stare: 'bine', titlu: 'admin.diag.instanta', masura: { cheie: 'admin.diag.instanta.bine', param: p } }
    : { id: 'instanta', stare: 'esec', titlu: 'admin.diag.instanta', masura: { cheie: 'admin.diag.instanta.esec', param: p }, indiciu: 'admin.diag.instanta.indiciu' });
  v.push({ id: 'build', stare: 'info', titlu: 'admin.diag.build', masura: { cheie: 'admin.erori.build', param: { build: d.build, instanta: d.instanta } } });
  v.push(d.appCheck === 'recaptcha'
    ? { id: 'appcheck', stare: 'bine', titlu: 'admin.diag.appcheck', masura: { cheie: 'admin.diag.appcheck.recaptcha' } }
    : d.appCheck === 'proba'
      ? { id: 'appcheck', stare: 'info', titlu: 'admin.diag.appcheck', masura: { cheie: 'admin.diag.appcheck.proba' } }
      : { id: 'appcheck', stare: 'atentie', titlu: 'admin.diag.appcheck', masura: { cheie: 'admin.diag.appcheck.oprit' }, indiciu: 'admin.diag.appcheck.indiciu' });
  v.push({ id: 'rol', stare: 'info', titlu: 'admin.diag.rol', masura: { cheie: 'admin.diag.rol.valoare', param: { rol: d.rol } } });
  const n = d.nerezolvate;
  v.push(!n.ok
    ? { id: 'nerezolvate', stare: 'esec', titlu: 'admin.diag.nerezolvate', masura: { cheie: 'admin.diag.nerezolvate.necunoscut', param: { motiv: n.motiv } } }
    : n.valoare === 0
      ? { id: 'nerezolvate', stare: 'bine', titlu: 'admin.diag.nerezolvate', masura: { cheie: 'admin.diag.nerezolvate.zero' } }
      : { id: 'nerezolvate', stare: 'atentie', titlu: 'admin.diag.nerezolvate', masura: { cheie: 'admin.diag.nerezolvate.cate', param: { n: n.valoare } }, indiciu: 'admin.diag.nerezolvate.indiciu' });
  const f = d.functii;
  const t = 'admin.diag.functii' as const;
  const i = 'admin.diag.functii.indiciu' as const;
  v.push(!f.ok
    ? { id: 'functii', stare: 'esec', titlu: t, masura: { cheie: 'admin.diag.functii.nu-raspunde', param: { motiv: f.motiv } }, indiciu: i }
    : f.valoare === 401
      ? { id: 'functii', stare: 'bine', titlu: t, masura: { cheie: 'admin.diag.functii.bine' } }
      : f.valoare >= 200 && f.valoare < 300
        ? { id: 'functii', stare: 'esec', titlu: t, masura: { cheie: 'admin.diag.functii.fara-impunere' } }
        : { id: 'functii', stare: 'esec', titlu: t, masura: { cheie: 'admin.diag.functii.cod', param: { cod: f.valoare } }, indiciu: i });
  v.push({ id: 'marcaje', stare: 'info', titlu: 'admin.diag.marcaje', masura: { cheie: 'admin.diag.marcaje.niciunul' } });
  return v;
}
