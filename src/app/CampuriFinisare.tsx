/**
 * Câmpurile operațiilor reliefului în secțiunea Tăierea, când toate operațiile alese sunt ale reliefului:
 * - ale finisării (ADR 0312, felia 18.1↑c-3): freza (forma și diametrul; la toroidală și raza colțului, 18.1↑e-1, ADR 0319),
 *   pasul lateral, unghiul liniilor, alinierea;
 * - ale degroșării (ADR 0313, felia 18.1↑d-1): diametrul frezei plate, pasul lateral, adaosul, unghiul liniilor;
 * - marginea și locul pe Z, scrise pe amândouă (lucrarea le cere egale pe același relief).
 * Valorile se scriu pe toate operațiile alese de felul lor, îmbinate (un câmp necunoscut rămâne); cu valori diferite, câmpul e
 * gol, iar lista arată „—”.
 */
import type { ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { Document, Operatie, Piesa } from '../model/document.ts';
import { cuDegrosare, cuFinisare, formaFinisare, type FormaFinisare, type SchimbareFinisare } from '../model/finisare.ts';
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
  const toate = piese.flatMap((p) => p.operatii);
  if (toate.length === 0 || !toate.every((o) => o.tip === 'finisare' || o.tip === 'degrosare')) return null;
  const ops = toate.filter((o) => o.tip === 'finisare'), deg = toate.filter((o) => o.tip === 'degrosare');
  const comunPe = <T,>(lista: readonly Operatie[], f: (o: Operatie) => T): T | null => {
    const a = f(lista[0]!);
    return lista.every((o) => f(o) === a) ? a : null;
  };
  const comun = <T,>(f: (o: Operatie) => T): T | null => comunPe(ops, f);
  const scrie = (f: (o: Operatie) => Operatie): RezultatActiune => onOperatii(new Map(piese.map((p) => [p.id, p.operatii.map(f)])));
  const scrieFin = (v: SchimbareFinisare): RezultatActiune => scrie((o) => cuFinisare(o, v));
  /** Marginea și planul zero: pe finisări și pe degroșări deodată. */
  const scrieAmbele = (v: Pick<SchimbareFinisare, 'margine' | 'planZero'>): RezultatActiune => scrie((o) => cuDegrosare(cuFinisare(o, v), v));
  const valoriRelief = (o: Operatie): { readonly margine?: 'trece'; readonly planZero?: number } | undefined => (o.tip === 'degrosare' ? o.degrosare : o.finisare);
  const titlu = oprit ? { title: oprit } : {};
  const camp = (eticheta: string, numeCamp: string, valoare: number | null, unitate: string, onAplica: (x: number) => RezultatActiune): ReactNode => (
    <CampNumeric key={`${cheie}/${numeCamp}`} eticheta={eticheta} camp={numeCamp} valoare={valoare} unitate={unitate}
      dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={onAplica} />
  );
  const forma = ops.length > 0 ? comun((o) => formaFinisare(o.scula)) : null;
  const diametru = ops.length > 0 ? comun((o) => o.scula.diametru) : null;
  const aliniat = ops.length > 0 ? comun((o) => (o.finisare?.nealiniat === true ? 'nu' : 'da')) : null;
  const margine = comunPe(toate, (o) => (valoriRelief(o)?.margine === 'trece' ? 'trece' : 'perete'));
  const z = comunPe(toate, (o) => (valoriRelief(o)?.planZero === undefined ? 'varf' : 'plan'));
  const planZero = comunPe(toate, (o) => valoriRelief(o)?.planZero ?? Number.NaN);
  const freza = (f: FormaFinisare, d: number, raza?: number): RezultatActiune =>
    scrie((o) => (o.tip === 'finisare' ? { ...o, scula: frezaFinisare(doc, o.scula, f, d, raza) } : o));
  const razaColt = forma === 'toroidala' ? comun((o) => (o.scula.forma?.tip === 'toroidala' ? o.scula.forma.raza : Number.NaN)) : null;
  const frezaDeg = (d: number): RezultatActiune => scrie((o) => (o.tip === 'degrosare' ? { ...o, scula: frezaFinisare(doc, o.scula, 'plata', d) } : o));
  const finisare = ops.length > 0 && (
    <>
      {rand(t('prop.fin.forma'), (
        <select key={`${cheie}/fin-forma`} value={forma ?? ''} data-camp="fin-forma" aria-label={t('prop.fin.forma')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { const v = ev.target.value; if ((v === 'bila' || v === 'plata' || v === 'v' || v === 'toroidala') && diametru !== null) freza(v, diametru); }}>
          {forma === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="bila">{t('prop.fin.forma.bila')}</option>
          <option value="plata">{t('prop.fin.forma.plata')}</option>
          <option value="v">{t('prop.fin.forma.v')}</option>
          <option value="toroidala">{t('prop.fin.forma.toroidala')}</option>
        </select>
      ))}
      {forma === 'toroidala' && rand(t('prop.fin.raza-colt'), camp(t('prop.fin.raza-colt'), 'fin-raza-colt', razaColt, 'mm', (x) => (diametru === null || !(x > 0) || x >= diametru / 2
        ? { ok: false, motiv: 'motiv.operatie-invalida' } : freza('toroidala', diametru, x))))}
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
    </>
  );
  const degrosare = deg.length > 0 && (
    <>
      {rand(t('prop.deg.diametru'), camp(t('prop.deg.diametru'), 'deg-diametru', comunPe(deg, (o) => o.scula.diametru), 'mm', frezaDeg))}
      {rand(t('prop.deg.pas-lateral'), camp(t('prop.deg.pas-lateral'), 'deg-pas-lateral', comunPe(deg, (o) => o.pasLateral ?? Number.NaN), 'mm',
        (x) => scrie((o) => (o.tip === 'degrosare' ? { ...o, pasLateral: x } : o))))}
      {rand(t('prop.deg.adaos'), camp(t('prop.deg.adaos'), 'deg-adaos', comunPe(deg, (o) => o.degrosare?.adaos ?? Number.NaN), 'mm',
        (x) => scrie((o) => cuDegrosare(o, { adaos: x }))))}
      {rand(t('prop.deg.unghi'), camp(t('prop.deg.unghi'), 'deg-unghi', comunPe(deg, (o) => o.degrosare?.unghi ?? 0), '°', (x) => scrie((o) => cuDegrosare(o, { unghi: x }))))}
    </>
  );
  return (
    <>
      {degrosare}
      {finisare}
      {rand(t('prop.fin.margine'), (
        <select key={`${cheie}/fin-margine`} value={margine ?? ''} data-camp="fin-margine" aria-label={t('prop.fin.margine')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { scrieAmbele({ margine: ev.target.value === 'trece' ? 'trece' : null }); }}>
          {margine === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="perete">{t('prop.fin.margine.perete')}</option>
          <option value="trece">{t('prop.fin.margine.trece')}</option>
        </select>
      ))}
      {rand(t('prop.fin.z'), (
        <select key={`${cheie}/fin-z`} value={z ?? ''} data-camp="fin-z" aria-label={t('prop.fin.z')} disabled={doarCitire} {...titlu}
          onChange={(ev) => { scrieAmbele({ planZero: ev.target.value === 'plan' ? 0 : null }); }}>
          {z === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
          <option value="varf">{t('prop.fin.z.varf')}</option>
          <option value="plan">{t('prop.fin.z.plan')}</option>
        </select>
      ))}
      {z === 'plan' && rand(t('prop.fin.plan-zero'), camp(t('prop.fin.plan-zero'), 'fin-plan-zero', planZero, 'mm', (x) => scrieAmbele({ planZero: x })))}
    </>
  );
}
