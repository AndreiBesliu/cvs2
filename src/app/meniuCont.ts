/**
 * Meniul contului (ADR 0120), pe hârtie: rândurile lui după cine e logat, capul (numele și planul de azi, sau că nu e nimeni)
 * și ce scrie pe butonul Cont. Capul vine din contul ținut de aplicație (`dreptCont.ts`), deci meniul se deschide pe loc,
 * fără server; serverul îl întreabă doar panoul contului.
 */
import { dreptLaZi, ZILE_PROBA, zileRamase } from '../../shared/conturi.ts';
import { limba, traduce } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import type { ContTinut } from './dreptCont.ts';

/** Un rând al meniului: panoul contului (logat) sau logarea (nelogat), manualul, sugestia, ieșirea. */
export type IdMeniuCont = 'cont' | 'intra' | 'manual' | 'sugestie' | 'iesi';

/**
 * Rândurile, de sus în jos; `null` e linia dinaintea ieșirii. Sugestia stă doar unde stătea și butonul ei (ADR 0111: în
 * afara instanței live, fără `?test`), iar ieșirea doar cu un cont ținut.
 */
export function randuriMeniuCont(cont: ContTinut | null, sugestie: boolean): readonly (IdMeniuCont | null)[] {
  return [
    cont ? 'cont' : 'intra',
    'manual',
    ...(sugestie ? (['sugestie'] as const) : []),
    ...(cont ? ([null, 'iesi'] as const) : []),
  ];
}

/**
 * Capul meniului: numele și planul de azi (după zilele offline, proba poate fi trecută); adresa neconfirmată, încă fără
 * drept; sau nimeni logat, cu proba unui cont nou.
 */
export function capMeniuCont(cont: ContTinut | null, acum: number, l: Limba = limba()): { readonly titlu: string; readonly rand: string } {
  if (!cont) return { titlu: traduce(l, 'editare.cont.nelogat'), rand: traduce(l, 'editare.cont.proba-noua', { n: ZILE_PROBA }) };
  if (!cont.drept) return { titlu: cont.nume, rand: traduce(l, 'editare.cont.neconfirmat') };
  const d = dreptLaZi(cont.drept, acum);
  if (d.plan === 'proba') {
    return {
      titlu: cont.nume,
      rand: d.pana === null ? traduce(l, 'editare.cont.plan.expirat') : traduce(l, 'editare.cont.plan.proba', { n: zileRamase(d.pana, acum) }),
    };
  }
  return { titlu: cont.nume, rand: traduce(l, `editare.cont.plan.${d.plan}`) };
}

/** Numele de pe butonul Cont: primul cuvânt; o adresă (contul neconfirmat poartă adresa ca nume), partea dinaintea lui @. */
export function numeButon(nume: string): string {
  const s = nume.trim();
  return (s.includes('@') ? s.slice(0, s.indexOf('@')) : s.split(/\s+/)[0]) || s;
}

/**
 * Inițialele din cercul butonului: primele litere ale primelor două cuvinte, cu majusculă. O adresă (fără spații) dă o singură
 * literă, a părții dinaintea lui @.
 */
export function initiale(nume: string): string {
  const s = nume.trim();
  const cuvinte = (s.includes('@') ? s.slice(0, s.indexOf('@')) : s).split(/\s+/).filter((c) => c !== '');
  return cuvinte.slice(0, 2).map((c) => [...c][0] ?? '').join('').toLocaleUpperCase() || '?';
}
