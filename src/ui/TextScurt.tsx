/*
 * Un text lung al ferestrei exportului, prescurtat (ADR 0291, felia 28.8↑k; constatarea 21 a auditului): prima propoziție la
 * vedere, restul sub „Mai mult” (`scurtat`, `exportRand.ts`). Un text scurt se arată întreg, fără buton. Pentru notele de sine
 * stătătoare (ordinea automată, dopul); explicațiile grupurilor au „Mai mult”-ul lor, al grupului (`DialogExport.tsx`).
 */
import { useState, type ReactNode } from 'react';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import { scurtat, textStrans } from './exportRand.ts';

/** Textul, prescurtat cât e strâns, cu butonul care îl desface; un text nou (altă alegere) pornește strâns. */
export function TextScurt({ text }: { readonly text: string }): ReactNode {
  const [deschisPentru, setDeschisPentru] = useState<string | null>(null);
  if (scurtat(text).rest === '') return text;
  const deschis = deschisPentru === text;
  return (<>
    {deschis ? text : textStrans(text)}
    <ButonMaiMult deschis={deschis} onComuta={() => { setDeschisPentru(deschis ? null : text); }} />
  </>);
}

/** „Mai mult” / „Mai puțin”, cu starea lui pentru cititorul de ecran. */
export function ButonMaiMult({ deschis, onComuta }: { readonly deschis: boolean; readonly onComuta: () => void }): ReactNode {
  return (
    <button type="button" className="dx-mai-mult" data-mai-mult aria-expanded={deschis} onClick={onComuta}>
      {t(deschis ? 'export.mai-putin' : 'export.mai-mult')}
    </button>
  );
}
