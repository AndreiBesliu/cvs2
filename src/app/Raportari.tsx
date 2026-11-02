import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import type { AplicatiaTichet, FelTichet, RaportareaMea } from '../../shared/tichete.ts';
import { versiuneDin } from '../../shared/versiune.ts';
import {
  codEroare, conecteazaContul, FELURI_TICHET, marcheazaCitita, primaStare, raportarileMele, TEXT_MAX, TICHETE_PE_ZI, trimiteRaportarea, type ContEditor,
} from '../cloud/contEditor.ts';
import '../i18n/carcasa.ts';
import { limba, t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { Config } from './config.ts';
import { contTinut } from './dreptCont.ts';
import { textEroareCont, useFereastraCont } from './ferestreCont.ts';
import type { IntrareEroare } from './jurnalErori.ts';
import { aplicatiaTichet, amprenteleSesiunii } from './raportare.ts';
import { puneRaportariNecitite, raportariNecitite } from './raportariNecitite.ts';
import './raportari.css';

/**
 * Raportările clienților, în editor (ADR 0116 §C, felia 15.B↑a): fereastra unei raportări noi și „Raportările mele”, cu
 * răspunsurile echipei. Stau în bucata panoului contului (o reexportă `PanouCont.tsx`): doar online, cu contul Firebase la
 * cerere. Editorul nu citește Firestore: totul trece prin callable-ul `tichete`.
 */

/** Când a pornit sesiunea (ms): erorile de dinainte, din depozitul jurnalului, nu sunt ale ei. */
const inceputSesiunii = (): number => Math.floor(performance.timeOrigin);

/** Textul unei erori a raportării: plafonul zilnic și contul lipsă au mesajul lor, restul ca la panoul contului. */
function textEroareRaportare(e: unknown): string {
  switch (codEroare(e)) {
    case 'functions/resource-exhausted':
      return t('raport.eroare.plafon', { n: TICHETE_PE_ZI });
    case 'functions/permission-denied':
    case 'functions/unauthenticated':
      return t('raport.eroare.cont');
    default:
      return textEroareCont(e);
  }
}

const dataSiOra = (ms: number): string => new Date(ms).toLocaleString(limba(), { dateStyle: 'medium', timeStyle: 'short' });

/** Ce au în comun cele două ferestre: legătura cu contul, până la omul logat (sau nimeni). */
type Legatura = 'indisponibil' | 'incarca' | 'iesit' | { readonly ce: ContEditor };

function useLegatura(config: Config | null, laEroare: (e: unknown) => void): Legatura {
  const [l, setL] = useState<Legatura>(config?.firebase ? 'incarca' : 'indisponibil');
  useEffect(() => {
    if (!config?.firebase) return;
    const r = conecteazaContul(config);
    if (!r.ok) {
      setL('indisponibil');
      return;
    }
    let viu = true;
    primaStare(r.cont).then((u) => { if (viu) setL(u ? { ce: r.cont } : 'iesit'); }, (e: unknown) => {
      if (!viu) return;
      setL('iesit');
      laEroare(e);
    });
    return () => { viu = false; };
  }, []);
  return l;
}

/** Cadrul unei ferestre a contului: titlul, corpul, eroarea, butonul de jos. */
function Fereastra({ id, titlu, testid, cutie, eroare, inchide, onInchide, children }: {
  readonly id: string; readonly titlu: string; readonly testid: string; readonly cutie: ReturnType<typeof useFereastraCont>;
  readonly eroare: string | null; readonly inchide: string; readonly onInchide: () => void; readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="dialog dialog-cont dialog-raport" role="dialog" aria-modal="true" aria-labelledby={id} data-testid={testid}>
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id={id}>{titlu}</h2>
        {children}
        {eroare !== null && <p className="camp-motiv" role="alert" data-motiv="raport">{eroare}</p>}
        <div className="butoane">
          <button type="button" data-buton="inchide-raport" onClick={onInchide}>{inchide}</button>
        </div>
      </div>
    </div>
  );
}

/** Legătura fără om: instanța fără Firebase, contul care se deschide, sau nimeni logat. */
function faraOm(l: Exclude<Legatura, { readonly ce: ContEditor }>): ReactElement {
  if (l === 'indisponibil') return <p className="nota" data-raport="indisponibil">{t('raport.indisponibil')}</p>;
  if (l === 'incarca') return <p className="nota" data-raport="incarca">{t('cont.incarca')}</p>;
  return <p className="nota" data-raport="iesit">{t('raport.iesit')}</p>;
}

/**
 * O raportare nouă (ADR 0116 §11): felul, textul, poza planșei la cerere și, la vedere, ce mai pleacă odată cu ea (datele
 * aplicației, luate la deschidere, și amprentele erorilor din sesiune, fără conținutul lor).
 */
export function RaportareNoua({ config, intrari = () => [], onInchide }: {
  readonly config: Config | null; readonly intrari?: () => readonly IntrareEroare[]; readonly onInchide: () => void;
}): ReactElement {
  useLimba();
  const cutie = useFereastraCont(onInchide);
  const [eroare, setEroare] = useState<string | null>(null);
  const legatura = useLegatura(config, (e) => { setEroare(textEroareCont(e)); });
  const [fel, setFel] = useState<FelTichet>('problema');
  const [text, setText] = useState('');
  const [poza, setPoza] = useState(false);
  const [lucreaza, setLucreaza] = useState(false);
  const [trimis, setTrimis] = useState(false);
  // Datele aplicației, luate la deschidere (limba de atunci, planul de azi).
  const [app] = useState<AplicatiaTichet | null>(() => (config ? aplicatiaTichet({
    versiune: versiuneDin(document), instanta: config.instanta, limba: limba(), browser: navigator.userAgent, drept: contTinut()?.drept ?? null,
  }, Date.now()) : null));
  // Amprentele, o dată, la deschidere: ce arată fereastra e ce pleacă. Un eșec (bucata raportorului n-a venit) = niciuna.
  const [amprente, setAmprente] = useState<readonly string[] | null>(null);
  useEffect(() => {
    let viu = true;
    amprenteleSesiunii(intrari(), inceputSesiunii()).then((a) => { if (viu) setAmprente(a); }, () => { if (viu) setAmprente([]); });
    return () => { viu = false; };
  }, []);

  const trimite = (ce: ContEditor, app: AplicatiaTichet, a: readonly string[]): void => {
    setLucreaza(true);
    setEroare(null);
    (async () => {
      let p: string | undefined;
      if (poza) {
        try {
          p = await (await import('./SugestieDinEditor.ts')).pozaPentruRaportare();
        } catch (e) {
          setEroare(t('raport.poza.esec', { motiv: e instanceof Error ? e.message : String(e) }));
          return;
        }
      }
      try {
        await trimiteRaportarea(ce, { actiune: 'raporteaza', fel, text, aplicatia: app, amprente: a, ...(p === undefined ? {} : { poza: p }) });
        setTrimis(true);
      } catch (e) {
        setEroare(textEroareRaportare(e));
      }
    })().finally(() => { setLucreaza(false); });
  };

  let corp: ReactElement;
  if (typeof legatura === 'string' || app === null) {
    // Fără configurație, legătura e oricum „indisponibil”.
    corp = faraOm(typeof legatura === 'string' ? legatura : 'indisponibil');
  } else if (trimis) {
    corp = <p className="nota" role="status" data-raport="trimis">{t('raport.trimis')}</p>;
  } else {
    const { ce } = legatura;
    corp = (
      <form className="cont-formular" data-raport="formular" onSubmit={(e) => {
        e.preventDefault();
        if (amprente !== null) trimite(ce, app, amprente);
      }}>
        <fieldset className="raport-fel">
          <legend>{t('raport.fel')}</legend>
          {FELURI_TICHET.map((f) => (
            <label key={f}>
              <input type="radio" name="raport-fel" value={f} data-camp={`raport-fel-${f}`} checked={fel === f} onChange={() => { setFel(f); }} />
              {t(`raport.fel.${f}`)}
            </label>
          ))}
        </fieldset>
        <label>
          {t('raport.text')}
          <textarea data-camp="raport-text" rows={6} maxLength={TEXT_MAX} value={text} onChange={(e) => { setText(e.target.value); }} />
        </label>
        <label className="raport-bifa">
          <input type="checkbox" data-camp="raport-poza" checked={poza} onChange={(e) => { setPoza(e.target.checked); }} />
          {t('raport.poza')}
        </label>
        <details className="raport-date" data-testid="raport-date">
          <summary>{t('raport.date.titlu')}</summary>
          <ul>
            <li>{t('raport.date.versiune', { versiune: app.versiune, instanta: app.instanta })}</li>
            <li>{t('raport.date.limba', { limba: app.limba })}</li>
            <li>{app.plan === null ? t('raport.date.fara-plan') : t('raport.date.plan', { plan: app.plan })}</li>
            <li className="raport-browser">{t('raport.date.browser', { browser: app.browser })}</li>
            <li data-raport-amprente={amprente?.length ?? ''}>
              {amprente === null ? t('raport.date.amprente-calcul') : amprente.length === 0 ? t('raport.date.fara-erori') : t('raport.date.amprente', { n: amprente.length })}
            </li>
          </ul>
        </details>
        <div className="cont-butoane">
          <button type="submit" data-buton="raport-trimite" disabled={lucreaza || amprente === null || text.trim() === ''}>{t('raport.trimite')}</button>
        </div>
      </form>
    );
  }
  return (
    <Fereastra id="raport-titlu" titlu={t('raport.titlu')} testid="dialog-raportare" cutie={cutie} eroare={eroare}
      inchide={trimis || typeof legatura === 'string' ? t('cont.inchide') : t('raport.renunta')} onInchide={onInchide}>
      {corp}
    </Fereastra>
  );
}

/**
 * Raportările mele (ADR 0116 §14): cele mai noi întâi, cu starea și răspunsurile echipei. Un răspuns nou se vede marcat, apoi
 * se notează citit pe server, iar semnul din meniul contului scade cu fiecare; un eșec al notării îl lasă pentru data viitoare.
 */
export function RaportarileMele({ config, onInchide }: { readonly config: Config | null; readonly onInchide: () => void }): ReactElement {
  useLimba();
  const cutie = useFereastraCont(onInchide);
  const [eroare, setEroare] = useState<string | null>(null);
  const legatura = useLegatura(config, (e) => { setEroare(textEroareCont(e)); });
  const [raportari, setRaportari] = useState<readonly RaportareaMea[] | null>(null);
  const ce = typeof legatura === 'string' ? null : legatura.ce;
  useEffect(() => {
    if (!ce) return;
    let viu = true;
    raportarileMele(ce).then(async (r) => {
      if (!viu) return;
      setRaportari(r.raportari);
      puneRaportariNecitite(r.necitite);
      for (const x of r.raportari) {
        if (x.necitite === 0) continue;
        const ok = await marcheazaCitita(ce, x.id).then(() => true, () => false);
        if (ok) puneRaportariNecitite(raportariNecitite() - 1);
      }
    }, (e: unknown) => { if (viu) setEroare(textEroareCont(e)); });
    return () => { viu = false; };
  }, [ce]);

  let corp: ReactElement;
  if (typeof legatura === 'string') {
    corp = faraOm(legatura);
  } else if (raportari === null) {
    corp = <p className="nota" data-raport="incarca">{eroare === null ? t('raport.mele.incarca') : ''}</p>;
  } else if (raportari.length === 0) {
    corp = <p className="nota" data-raport="goala">{t('raport.mele.goala')}</p>;
  } else {
    corp = (
      <ul className="raportari-lista" data-testid="raportarile-mele">
        {raportari.map((r) => (
          <li key={r.id} data-raportare={r.id} data-stare={r.stare} data-noua={r.necitite > 0 ? '' : undefined}>
            <div className="raportare-cap">
              <strong>{t(`raport.fel.${r.fel}`)}</strong>
              <span className="raportare-stare" data-stare={r.stare}>{t(`raport.stare.${r.stare}`)}</span>
              <time dateTime={new Date(r.creatLa).toISOString()}>{dataSiOra(r.creatLa)}</time>
              {r.necitite > 0 ? <span className="raportare-noua">{t('raport.mele.nou', { n: r.necitite })}</span> : null}
            </div>
            <p className="raportare-text">{r.text}</p>
            {r.raspunsuri.length === 0 ? <p className="nota">{t('raport.mele.fara-raspuns')}</p> : (
              <ol className="raportare-raspunsuri">
                {r.raspunsuri.map((x, k) => (
                  <li key={k} data-raspuns={k}>
                    <span className="raportare-de">{t('raport.mele.echipa', { data: dataSiOra(x.la) })}</span>
                    <p>{x.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Fereastra id="raportari-titlu" titlu={t('raport.mele.titlu')} testid="dialog-raportarile-mele" cutie={cutie} eroare={eroare}
      inchide={t('cont.inchide')} onInchide={onInchide}>
      {corp}
    </Fereastra>
  );
}
