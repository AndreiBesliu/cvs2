import type { Eveniment } from '../../shared/utilizare.ts';
import { CATALOG_CONTROALE } from './catalogControale.ts';
import { INTERACTIV, numeControl } from './numeControl.ts';
import { sursaDin } from './utilizare.ts';

/**
 * Ce se prinde din pagină (ADR 0262, felia A.8c), în bucata înregistratorului, deci nimic în pornire: clicul pe un control, cu
 * numele lui din catalog (`numeControl.ts`) și zona; rotița, ca zoom pe pânză și derulare în rest (treptele unui gest se
 * numără în înregistrator); dialogurile (tot ce are `role="dialog"`), deschise și închise. Un dialog închis a „mers până la
 * capăt” dacă între timp a reușit o acțiune a registrului sau s-a apăsat butonul lui principal; altfel e „renunțat”. Clicurile,
 * derularea și zoom-ul le oprește înregistratorul când clicurile fine sunt oprite din Setări; dialogurile intră mereu.
 */

export interface DepsDom {
  readonly doc: Document;
  readonly win: Window;
  readonly ceas: () => number;
  readonly primeste: (ev: Eveniment) => void;
  /** Câte acțiuni reușite are sesiunea până acum. */
  readonly reusite: () => number;
  readonly catalog?: ReadonlySet<string>;
}

const ROL_DIALOG = '[role="dialog"]';
const PRINCIPAL = '.principal, [type="submit"]';

export function urmaresteControalele(d: DepsDom): void {
  const catalog = d.catalog ?? CATALOG_CONTROALE;
  const deschise = new Map<Element, { readonly id: string; readonly reusite: number; principal: boolean }>();

  d.win.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest(INTERACTIV) : null;
    if (!el) return;
    if (el.matches(PRINCIPAL)) {
      for (const [dialog, x] of deschise) if (dialog.contains(el)) x.principal = true;
    }
    const id = numeControl(el, catalog);
    if (id) d.primeste({ fel: 'clic', t: d.ceas(), id, de: sursaDin(el, false) });
  }, true);

  d.win.addEventListener('wheel', (e) => {
    const de = sursaDin(e.target instanceof Element ? e.target : null, false);
    d.primeste({ fel: de === 'panza' ? 'zoom' : 'derulare', t: d.ceas(), de, n: 1 });
  }, { capture: true, passive: true });

  const deschide = (dialog: Element): void => {
    if (deschise.has(dialog)) return;
    const id = numeControl(dialog, catalog);
    if (!id) return;
    deschise.set(dialog, { id, reusite: d.reusite(), principal: false });
    d.primeste({ fel: 'dialog', t: d.ceas(), id, rez: 'deschis' });
  };
  new MutationObserver((schimbari) => {
    for (const s of schimbari) {
      for (const n of s.addedNodes) {
        if (!(n instanceof Element)) continue;
        if (n.matches(ROL_DIALOG)) deschide(n);
        for (const x of n.querySelectorAll(ROL_DIALOG)) deschide(x);
      }
    }
    for (const [dialog, x] of deschise) {
      if (dialog.isConnected) continue;
      deschise.delete(dialog);
      d.primeste({ fel: 'dialog', t: d.ceas(), id: x.id, rez: x.principal || d.reusite() > x.reusite ? 'gata' : 'renuntat' });
    }
  }).observe(d.doc.body, { childList: true, subtree: true });
}
