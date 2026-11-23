/**
 * Vestirile imprimantei (felia 3.6s, ADR 0194 §A, după schița acceptată): evenimentele din schimbările de stare, anunțate o
 * dată pe lucrare, printr-o bandă în aplicație, cu sunet, și prin notificarea sistemului cât cvs2 e ascuns; semnul de pe
 * butonul Imprimanta (locul îl pune carcasa, `#loc-semn-imprimanta`) și partea imprimantei din titlul filei. Fereastra
 * Imprimanta rămâne montată după prima deschidere, deci vestirile merg și cât lucrezi în Proiectare. Cardul Notificările ține
 * setările.
 *
 * Banda stă în meniul global, pe rândul ei (`#loc-anunt-imprimanta`, pus tot de carcasă), deci se vede din orice fereastră și
 * nu acoperă nimic: ce e sub meniu coboară cât e ea la vedere. Până la 13.11 plutea deasupra paginii și acoperea Reia și
 * uneltele (CI-ul complet, pe Linux). Fără locul acela, stă sus, în fereastra Imprimanta.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { explicaEroare, type IntrareCodImprimanta } from '../../shared/coduriImprimanta.ts';
import { limba, t } from '../i18n/t.ts';
import type { StareLucrare } from '../machine/imprimanta/driver.ts';
import { cheieEveniment, EVENIMENTE, evenimente, lucrareNoua, type Clipa, type Eveniment } from '../machine/imprimanta/evenimente.ts';
import type { StareImprimanta } from '../machine/imprimanta/sesiune.ts';
import {
  cereAtentie, cerePermisiunea, notificaSistemul, permisiune, semnImprimanta, suna, textEveniment, type Permisiune, type SetariNotificari,
} from './notificariImprimanta.ts';
import { intrareCuTermen, useCoduriImprimanta } from './coduriImprimanta.ts';
import { parteTitlu } from './titluFila.ts';
import { utilizarea } from './utilizare.ts';
import { evenimenteImprimanta } from './utilizareImprimanta.ts';

/** Banda își face textul la randare: o eroare își primește explicația când vine dicționarul (3.6v). */
type Anunt = { readonly e: Eveniment };

/** Cât așteaptă notificarea sistemului explicația unei erori; fără ea, pleacă cu cheia. */
const TERMEN_EXPLICATIE_MS = 1500;

export function Vestiri({ st, stare, strat, pauzaFisier, setari, vizibila, deschide, numeImprimanta, numeFisier, durata }: {
  readonly st: StareImprimanta; readonly stare: StareLucrare;
  /** Stratul viu (3.6q) și pauza din fișier la care stă imprimanta, cu nota scrisă în cvs2. */
  readonly strat: number | null; readonly pauzaFisier: Clipa['pauzaFisier'];
  readonly setari: SetariNotificari;
  /** Fereastra Imprimanta e cea de acum; `deschide` o aduce în față. */
  readonly vizibila: boolean; readonly deschide: () => void;
  readonly numeImprimanta: string; readonly numeFisier: (cale: string | null) => string; readonly durata: (s: number) => string;
}): ReactNode {
  const i = st.imprimanta;
  const legatura = st.legatura === 'conectat' ? 'vie' : st.legatura === 'pierduta' ? 'pierduta' : 'alta';
  const clipa: Clipa = {
    legatura, lucrare: stare, fisier: i.fisier, eroare: i.eroare, cheieEroare: i.cheieEroare, faraFilament: i.faraFilament,
    reluareDupaPana: i.reluareDupaPana, strat, pauzaFisier, trecut: i.trecut, filament: i.filament,
  };
  const semnatura = JSON.stringify(clipa);
  const inainte = useRef<Clipa | null>(null);
  const anuntate = useRef(new Set<string>());
  const [anunt, setAnunt] = useState<Anunt | null>(null);
  const [gataNevazut, setGataNevazut] = useState(false);
  const familie = st.driver.coduri;
  const coduri = useCoduriImprimanta(familie, i.eroare);
  const explicatie = (e: Eveniment): IntrareCodImprimanta | null => (e.fel === 'eroare' && typeof coduri === 'object' && coduri !== null
    ? explicaEroare(coduri, e.cod, e.cheie)?.intrare ?? null : null);
  useEffect(() => {
    const a = inainte.current;
    inainte.current = clipa;
    // Utilizarea aplicației (ADR 0262, A.8d): toate evenimentele, oricare ar fi setările notificărilor.
    for (const e of evenimenteImprimanta(a, clipa)) utilizarea.eveniment({ fel: 'imprimanta', ...e });
    if (lucrareNoua(a, clipa)) {
      anuntate.current.clear();
      setGataNevazut(false);
    }
    // O bandă rămasă fără rost se închide singură: pauza, după Reia; legătura pierdută, la revenire.
    setAnunt((x) => {
      if (x === null) return x;
      if ((x.e.fel === 'pauza' || x.e.fel === 'pauzaFisier' || x.e.fel === 'faraFilament') && clipa.lucrare === 'imprima') return null;
      if (x.e.fel === 'pana' && clipa.reluareDupaPana !== true) return null;
      return x.e.fel === 'pierduta' && clipa.legatura === 'vie' ? null : x;
    });
    for (const e of evenimente(a, clipa)) {
      if (!setari.evenimente[e.fel]) continue;
      const k = cheieEveniment(e);
      if (anuntate.current.has(k)) continue;
      anuntate.current.add(k);
      setAnunt({ e });
      if (e.fel === 'gata') setGataNevazut(true);
      const ascuns = document.visibilityState !== 'visible';
      const sistem = (ascuns || setari.sistemInFata) && permisiune() === 'acordata';
      if (sistem) {
        const trimite = (x: IntrareCodImprimanta | null): void => {
          const text = textEveniment(e, numeImprimanta, numeFisier(e.fisier), durata, x);
          notificaSistemul(text.titlu, text.corp, `cvs2-imprimanta-${e.fel}`, deschide);
        };
        // O eroare așteaptă puțin explicația (dicționarul vine la prima eroare); restul pleacă pe loc.
        if (e.fel === 'eroare' && familie !== null) void intrareCuTermen(familie, limba(), e.cod, e.cheie, TERMEN_EXPLICATIE_MS).then(trimite);
        else trimite(null);
      }
      // Cu notificarea sistemului cât cvs2 e ascuns, sunetul e al sistemului.
      if (setari.sunet && !(ascuns && sistem)) suna(cereAtentie(e.fel));
    }
  }, [semnatura]);
  // Fereastra deschisă: finalul a fost văzut.
  useEffect(() => { if (vizibila) setGataNevazut(false); }, [vizibila]);

  const parte = !setari.titlu || legatura !== 'vie' ? null
    : stare === 'imprima' && i.progres !== null ? `${Math.round(i.progres)} %`
      : stare === 'pauza' ? t('imprimanta.titlu.pauza', { p: Math.round(i.progres ?? 0) }) : null;
  useEffect(() => { parteTitlu('imprimanta', parte); }, [parte]);
  useEffect(() => () => { parteTitlu('imprimanta', null); }, []);

  const [loc, setLoc] = useState<HTMLElement | null>(null);
  const [locAnunt, setLocAnunt] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setLoc(document.getElementById('loc-semn-imprimanta'));
    setLocAnunt(document.getElementById('loc-anunt-imprimanta'));
  });
  const semn = semnImprimanta({ legatura, lucrare: stare, progres: i.progres, faraFilament: i.faraFilament, eroare: i.eroare, gataNevazut });
  const textAnunt = anunt === null ? null : textEveniment(anunt.e, numeImprimanta, numeFisier(anunt.e.fisier), durata, explicatie(anunt.e));
  const banda = anunt === null || textAnunt === null ? null : (
    <div className="imprimanta-anunt" data-fel={anunt.e.fel} role={cereAtentie(anunt.e.fel) ? 'alert' : 'status'} data-testid="imprimanta-anunt">
      <strong>{textAnunt.titlu}</strong>
      {textAnunt.corp !== '' && <span>{textAnunt.corp}</span>}
      <span className="imprimanta-butoane">
        {!vizibila && <button type="button" data-imprimanta="anunt-deschide" onClick={deschide}>{t('imprimanta.anunt.deschide')}</button>}
        <button type="button" data-imprimanta="anunt-inchide" onClick={() => { setAnunt(null); }}>{t('imprimanta.anunt.inchide')}</button>
      </span>
    </div>
  );
  return (
    <>
      {loc !== null && semn !== null && createPortal(
        <span className="semn-imprimanta" data-stare={semn.fel} data-testid="imprimanta-semn"><i aria-hidden="true" /><span>{semn.text}</span></span>, loc,
      )}
      {banda !== null && (locAnunt === null ? banda : createPortal(banda, locAnunt))}
    </>
  );
}

/** Cardul Notificările (schița, planșa B): permisiunea, evenimentele, sunetul, notificarea în față, titlul, legarea la deschidere. */
export function CardNotificari({ setari, schimba }: { readonly setari: SetariNotificari; readonly schimba: (s: SetariNotificari) => void }): ReactNode {
  const [perm, setPerm] = useState<Permisiune>(permisiune);
  const pune = (camp: 'sunet' | 'sistemInFata' | 'titlu' | 'legare') => (e: { readonly target: HTMLInputElement }): void => { schimba({ ...setari, [camp]: e.target.checked }); };
  return (
    <section className="imprimanta-card" aria-labelledby="imprimanta-notificari" data-testid="imprimanta-notificari">
      <h3 id="imprimanta-notificari">{t('imprimanta.notificari')}</h3>
      {perm === 'acordata' ? <p className="imprimanta-permis" role="status">{t('imprimanta.notificari.permise')}</p>
        : perm === 'nedecisa' ? (
          <div className="imprimanta-butoane">
            <button type="button" className="principal" data-imprimanta="notificari-porneste"
              onClick={() => { suna(false); void cerePermisiunea().then(setPerm); }}>{t('imprimanta.notificari.porneste')}</button>
          </div>
        ) : <p className="imprimanta-ajutor" data-testid="imprimanta-notificari-refuzate">{t(perm === 'refuzata' ? 'imprimanta.notificari.refuzate' : 'imprimanta.notificari.indisponibile')}</p>}
      <fieldset className="imprimanta-bife">
        <legend>{t('imprimanta.notificari.cand')}</legend>
        {EVENIMENTE.map((f) => (
          <label key={f} className="imprimanta-bifa-mica">
            <input type="checkbox" data-imprimanta="notificare-eveniment" data-eveniment={f} checked={setari.evenimente[f]}
              onChange={(e) => { schimba({ ...setari, evenimente: { ...setari.evenimente, [f]: e.target.checked } }); }} />
            <span>{t(`imprimanta.notificari.ev.${f}`)}</span>
          </label>
        ))}
      </fieldset>
      <div className="imprimanta-bife">
        <label className="imprimanta-bifa-mica">
          <input type="checkbox" data-imprimanta="notificari-sunet" checked={setari.sunet} onChange={pune('sunet')} /><span>{t('imprimanta.notificari.sunet')}</span>
        </label>
        <label className="imprimanta-bifa-mica">
          <input type="checkbox" data-imprimanta="notificari-sistem" checked={setari.sistemInFata} onChange={pune('sistemInFata')} /><span>{t('imprimanta.notificari.sistem')}</span>
        </label>
        <label className="imprimanta-bifa-mica">
          <input type="checkbox" data-imprimanta="notificari-titlu" checked={setari.titlu} onChange={pune('titlu')} /><span>{t('imprimanta.notificari.titlu')}</span>
        </label>
        <label className="imprimanta-bifa-mica">
          <input type="checkbox" data-imprimanta="notificari-legare" checked={setari.legare} onChange={pune('legare')} /><span>{t('imprimanta.notificari.legare')}</span>
        </label>
      </div>
      <p className="imprimanta-ajutor">{t('imprimanta.notificari.ajutor')}</p>
    </section>
  );
}
