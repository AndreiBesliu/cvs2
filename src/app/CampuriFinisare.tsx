/**
 * Câmpurile finisării reliefului în secțiunea Tăierea (ADR 0312, felia 18.1↑c-3), când toate operațiile alese sunt finisări:
 * freza (forma și diametrul), pasul lateral, unghiul liniilor, alinierea, marginea și locul pe Z. Valorile se scriu pe toate
 * operațiile alese, îmbinate (un câmp necunoscut rămâne); cu valori diferite, câmpul e gol, iar lista arată „—”.
 */
import type { ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { Document, Operatie, Piesa } from '../model/document.ts';
import { cuFinisare, formaFinisare, type FormaFinisare, type SchimbareFinisare } from '../model/finisare.ts';
import { frezaFinisare } from '../model/rol.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';

type Props = {
  readonly doc: Document;
  readonly piese: readonly Piesa[];
  readonly cheie: string;
  readonly doarCitire: boolean;
  readonly oprit?: string;
  readonly onOperatii: (noi: ReadonlyMap<string, readonly Operatie[]>) => RezultatActiune;
};

const rand = (eticheta: string, valoare: ReactNode): ReactNode => (
  <div className="prop-rand" key={eticheta}><dt>{eticheta}</dt><dd>{valoare}</dd></div>
);

export function CampuriFinisare({ doc, piese, cheie, doarCitire, oprit, onOperatii }: Props): ReactNode {
  const ops = piese.flatMap((p) => p.operatii);
  if (ops.length === 0 || !ops.every((o) => o.tip === 'finisare')) return null;
  const comun = <T,>(f: (o: Operatie) => T): T | null => {
    const a = f(ops[0]!);
    return ops.every((o) => f(o) === a) ? a : null;
  };
  const scrie = (f: (o: Operatie) => Operatie): RezultatActiune => onOperatii(new Map(piese.map((p) => [p.id, p.operatii.map(f)])));
  const scrieFin = (v: SchimbareFinisare): RezultatActiune => scrie((o) => cuFinisare(o, v));
  const titlu = oprit ? { title: oprit } : {};
  const camp = (eticheta: string, numeCamp: string, valoare: number | null, unitate: string, onAplica: (x: number) => RezultatActiune): ReactNode => (
    <CampNumeric key={`${cheie}/${numeCamp}`} eticheta={eticheta} camp={numeCamp} valoare={valoare} unitate={unitate}
      dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={onAplica} />
  );
  const forma = comun((o) => formaFinisare(o.scula));
  const diametru = comun((o) => o.scula.diametru);
  const aliniat = comun((o) => (o.finisare?.nealiniat === true ? 'nu' : 'da'));
  const margine = comun((o) => (o.finisare?.margine === 'trece' ? 'trece' : 'perete'));
  const z = comun((o) => (o.finisare?.planZero === undefined ? 'varf' : 'plan'));
  const planZero = comun((o) => o.finisare?.planZero ?? Number.NaN);
  const freza = (f: FormaFinisare, d: number): RezultatActiune => scrie((o) => (o.tip === 'finisare' ? { ...o, scula: frezaFinisare(doc, o.scula, f, d) } : o));
  return (
    <>
      {rand(t('prop.fin.forma'), (
        <select key={`${cheie}/fin-forma`} value={forma ?? ''} data-camp="fin-forma" aria-label={t('prop.fin.forma')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { const v = ev.target.value; if ((v === 'bila' || v === 'plata' || v === 'v') && diametru !== null) freza(v, diametru); }}>
          {forma === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="bila">{t('prop.fin.forma.bila')}</option>
          <option value="plata">{t('prop.fin.forma.plata')}</option>
          <option value="v">{t('prop.fin.forma.v')}</option>
        </select>
      ))}
      {rand(t('prop.fin.diametru'), camp(t('prop.fin.diametru'), 'fin-diametru', diametru, 'mm', (x) => (forma === null
        ? { ok: false, motiv: 'motiv.operatie-invalida' } : freza(forma, x))))}
      {rand(t('prop.fin.pas-lateral'), camp(t('prop.fin.pas-lateral'), 'fin-pas-lateral', comun((o) => o.pasLateral ?? Number.NaN), 'mm',
        (x) => scrie((o) => ({ ...o, pasLateral: x }))))}
      {rand(t('prop.fin.unghi'), camp(t('prop.fin.unghi'), 'fin-unghi', comun((o) => o.finisare?.unghi ?? 0), '°', (x) => scrieFin({ unghi: x })))}
      {rand(t('prop.fin.linii'), (
        <select key={`${cheie}/fin-linii`} value={aliniat ?? ''} data-camp="fin-linii" aria-label={t('prop.fin.linii')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { scrieFin({ nealiniat: ev.target.value === 'nu' ? true : null }); }}>
          {aliniat === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="da">{t('prop.fin.linii.aliniate')}</option>
          <option value="nu">{t('prop.fin.linii.nealiniate')}</option>
        </select>
      ))}
      {rand(t('prop.fin.margine'), (
        <select key={`${cheie}/fin-margine`} value={margine ?? ''} data-camp="fin-margine" aria-label={t('prop.fin.margine')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { scrieFin({ margine: ev.target.value === 'trece' ? 'trece' : null }); }}>
          {margine === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="perete">{t('prop.fin.margine.perete')}</option>
          <option value="trece">{t('prop.fin.margine.trece')}</option>
        </select>
      ))}
      {rand(t('prop.fin.z'), (
        <select key={`${cheie}/fin-z`} value={z ?? ''} data-camp="fin-z" aria-label={t('prop.fin.z')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { scrieFin({ planZero: ev.target.value === 'plan' ? 0 : null }); }}>
          {z === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="varf">{t('prop.fin.z.varf')}</option>
          <option value="plan">{t('prop.fin.z.plan')}</option>
        </select>
      ))}
      {z === 'plan' && rand(t('prop.fin.plan-zero'), camp(t('prop.fin.plan-zero'), 'fin-plan-zero', planZero, 'mm', (x) => scrieFin({ planZero: x })))}
    </>
  );
}
