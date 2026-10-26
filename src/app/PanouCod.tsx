/**
 * Explicația codurilor controlerului în panoul mașinii (ADR 0085): ultimul `error:N` / `ALARM:N` (sau blocarea fără cod), cu ce
 * s-a întâmplat, ce faci și butoanele care ajută, din dicționarul familiei controlerului (`coduri/<limba>.json`, generat la
 * build, în precache). Un cod care nu e în tabel își arată linia, fără o explicație ghicită. Deblocarea după o alarmă care
 * pierde poziția cere o confirmare care spune ce se poate strica (o singură dată, nu două ferestre la fel).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { esteDictionarCoduri, fisierCoduri, type ActiuneCod, type DictionarCoduri, type LimbaCoduri } from '../../shared/coduri.ts';
import { t } from '../i18n/t.ts';
import type { CodControler, LocCod, StareSesiune } from '../machine/sesiune.ts';
import { useLimba } from '../ui/useLimba.ts';
import { explica, linieCod, type StareDictionar } from './explicaCod.ts';

export { cuTitlu, deblocareCuConfirmare, titluCod, type StareDictionar } from './explicaCod.ts';

/** Dicționarele aduse în pagina asta (cererea, nu răspunsul: două panouri nu cer de două ori). */
const aduse = new Map<LimbaCoduri, Promise<DictionarCoduri>>();

function adu(limba: LimbaCoduri): Promise<DictionarCoduri> {
  let p = aduse.get(limba);
  if (!p) {
    p = fetch(`/${fisierCoduri(limba)}`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const x: unknown = await r.json();
      if (!esteDictionarCoduri(x) || x.limba !== limba) throw new Error('fișierul dicționarului nu are forma așteptată');
      return x;
    });
    // O cerere căzută (fără rețea, înainte de precache) se reîncearcă la următoarea deschidere a panoului.
    p.catch(() => { aduse.delete(limba); });
    aduse.set(limba, p);
  }
  return p;
}

/** Dicționarul limbii de acum, cerut la deschiderea panoului (ca să fie gata la prima alarmă). */
export function useDictionarCoduri(): StareDictionar {
  const limba = useLimba();
  const [d, setD] = useState<StareDictionar>('incarca');
  useEffect(() => {
    let viu = true;
    setD('incarca');
    adu(limba).then((x) => { if (viu) setD(x); }, () => { if (viu) setD('lipsa'); });
    return () => { viu = false; };
  }, [limba]);
  return d;
}

const textLoc = (la: LocCod): string | null => {
  switch (la.tip) {
    case 'program': return t('masina.cod.la.program', { linie: la.linie + 1 });
    case 'comanda': return t('masina.cod.la.comanda', { text: la.text });
    case 'jog': return t('masina.cod.la.jog');
    case 'procedura': return t('masina.cod.la.procedura');
    case 'controler': return null;
  }
};

/** Confirmarea deblocării, cu ce se poate strica; aceeași în card și sub butoanele lucrării. */
export function ConfirmareDeblocare({ onDa, onNu }: { readonly onDa: () => void; readonly onNu: () => void }): ReactNode {
  return (
    <div className="masina-confirmare" role="alertdialog" aria-label={t('masina.deblocheaza')} data-testid="masina-confirmare-deblocare">
      <p>{t('masina.deblocare.confirma')}</p>
      <div className="masina-butoane">
        <button type="button" className="masina-opreste" data-masina="deblocheaza-oricum" onClick={onDa}>{t('masina.deblocare.oricum')}</button>
        <button type="button" data-masina="deblocare-renunta" onClick={onNu}>{t('masina.deblocare.renunta')}</button>
      </div>
    </div>
  );
}

export function CardCod({ d, st, cod, confirmare, onActiune, onAscunde }: {
  readonly d: StareDictionar;
  readonly st: StareSesiune;
  readonly cod: CodControler;
  /** Confirmarea deblocării, când e cerută (se arată în card). */
  readonly confirmare: ReactNode;
  readonly onActiune: (a: ActiuneCod) => void;
  readonly onAscunde: () => void;
}): ReactNode {
  const linie = linieCod(cod);
  const e = typeof d === 'object' ? explica(d, st, cod) : null;
  const loc = textLoc(cod.la);
  const stare = st.flux.raport?.stare ?? null;
  const conectat = st.conexiune === 'conectat';
  // Butoanele, doar unde ajută acum: deblocarea în Alarm (după repornire, dacă o cere controlerul), reluarea după ușă sau pauză.
  const actiuni = (e?.intrare?.actiuni ?? []).filter((a) => conectat && (a !== 'deblocare' || stare === 'Alarm') && (a !== 'eliberare' || stare === 'Door' || stare === 'Hold'));
  const alarma = st.alarma !== null && st.alarma.nr !== cod.nr && typeof d === 'object' ? st.alarma : null;
  const titluAlarma = alarma && typeof d === 'object' ? explica(d, st, alarma).text?.titlu ?? null : null;

  return (
    <section className="masina-cod" role="alert" aria-label={t('masina.cod')} data-testid="masina-cod" data-cod={linie}>
      <p className="masina-cap">
        <strong>{linie}</strong>{' — '}
        {e === null ? (d === 'incarca' ? t('masina.cod.incarca') : t('masina.cod.fara-dictionar'))
          : e.text ? e.text.titlu : t('masina.cod.necunoscut', { nume: e.nume })}
      </p>
      {loc !== null && <p className="masina-cod-meta" data-testid="masina-cod-loc">{loc}</p>}
      {e !== null && (e.text ? <>
        <p data-testid="masina-cod-ce">{e.text.ce}</p>
        <p data-testid="masina-cod-faci"><strong>{t('masina.cod.faci')}</strong> {e.text.faci}</p>
      </> : <>
        <p data-testid="masina-cod-ce">{t('masina.cod.necunoscut.ce', { cod: linie, nume: e.nume })}</p>
        <p data-testid="masina-cod-faci"><strong>{t('masina.cod.faci')}</strong> {t('masina.cod.necunoscut.faci')}</p>
      </>)}
      {cod.fel === 'eroare' && e?.intrare && (
        <p className="masina-cod-meta">{t(e.intrare.gravitate === 'linie' ? 'masina.cod.linie' : 'masina.cod.oprit')}</p>
      )}
      {alarma && titluAlarma !== null && <p className="masina-nota" data-testid="masina-cod-alarma">{t('masina.cod.alarma-acum', { cod: linieCod(alarma), titlu: titluAlarma })}</p>}
      {st.repornire && conectat && <p className="masina-cap" data-testid="masina-cod-repornire">{t('masina.cod.repornire')}</p>}
      {e !== null && <p className="masina-cod-meta">{e.presupus ? t('masina.cod.presupus') : t('masina.cod.tabel', { nume: e.nume })}</p>}
      {confirmare}
      <div className="masina-butoane">
        {actiuni.map((a) => {
          const f = (): void => { onActiune(a); };
          switch (a) {
            case 'repornire': return <button key={a} type="button" className="masina-opreste" data-masina="cod-repornire" onClick={f}>{t('masina.opreste')}</button>;
            case 'deblocare': return (
              <button key={a} type="button" data-masina="cod-deblocare" disabled={st.repornire}
                title={st.repornire ? t('masina.cod.intai-repornire') : undefined} onClick={f}>{t('masina.deblocheaza')}</button>
            );
            case 'eliberare': return <button key={a} type="button" data-masina="cod-eliberare" onClick={f}>{t('masina.eliberare')}</button>;
            case 'jog': return <button key={a} type="button" data-masina="cod-jog" onClick={f}>{t('masina.cod.la-jog')}</button>;
            case 'palpare': return <button key={a} type="button" data-masina="cod-palpare" onClick={f}>{t('masina.cod.la-palpare')}</button>;
          }
        })}
        <button type="button" data-masina="cod-ascunde" onClick={onAscunde}>{t('masina.cod.ascunde')}</button>
      </div>
    </section>
  );
}
