import { useEffect, useId, useRef, useState, type FormEvent, type ReactElement, type RefObject } from 'react';
import { esteStare, NOTA_MAX, STARI_SUGESTIE, type ContinutSugestie, type StareSugestie } from '../../../shared/sugestii.ts';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataScurta } from '../erori/date.ts';
import { areDecizie, lipsesteNota, notaCeruta, poateEdita, type Sugestie } from './date.ts';
import { Formular, PozaSugestiei } from './Formular.tsx';

/**
 * Ferestrele tablei Sugestii (ADR 0260 §4): detaliul unui card (textul, poza, decizia, editarea autorului, decizia owner-ului)
 * și nota cerută la o mutare în Respinsă sau Amânată. Ferestre modale native, ca manualul: restul paginii e inert, Esc le
 * închide. Stau în fila lor (nu într-un portal), deci au stilurile formularelor ei; `showModal` le pune oricum deasupra.
 */

/**
 * Formularul deschis în detaliu: sugestia, felul și versiunea pe care s-a deschis. O sugestie cu altă versiune (schimbată de
 * o mutare sau reîncărcată) își închide formularul: omul îl redeschide pe varianta nouă, pe care o vede.
 */
export type Deschis = { readonly id: string; readonly fel: 'editeaza' | 'decide'; readonly versiune: number | null } | null;

/** Fereastra modală, deschisă la montare; `inchisa` vine la orice închidere (Esc, butonul, după o trimitere). */
function useFereastra(inchisa: () => void): RefObject<HTMLDialogElement | null> {
  const d = useRef<HTMLDialogElement>(null);
  const laInchidere = useRef(inchisa);
  useEffect(() => { laInchidere.current = inchisa; });
  useEffect(() => {
    const el = d.current;
    if (!el) return undefined;
    if (!el.open) el.showModal();
    const inchide = (): void => { laInchidere.current(); };
    el.addEventListener('close', inchide);
    return () => {
      el.removeEventListener('close', inchide);
      if (el.open) el.close();
    };
  }, []);
  return d;
}

export function DetaliuSugestie({ con, s, eu, owner, poateScrie, deschis, deschide, ocupat, faraAppCheck, eroare, gata, editeaza, decide, inchisa }: {
  readonly con: Conexiune; readonly s: Sugestie; readonly eu: string; readonly owner: boolean; readonly poateScrie: boolean;
  readonly deschis: Deschis; readonly deschide: (d: Deschis) => void; readonly ocupat: boolean; readonly faraAppCheck: boolean;
  readonly eroare: string | null; readonly gata: string | null;
  readonly editeaza: (c: ContinutSugestie, versiune: number) => void;
  readonly decide: (stare: StareSugestie, nota: string, versiune: number) => void;
  readonly inchisa: () => void;
}): ReactElement {
  const limba = useLimba();
  const titlu = useId();
  const d = useFereastra(inchisa);
  const cine = s.autor === eu ? t('admin.pers.tu') : s.autorEmail ?? s.autor ?? '—';
  const editabila = poateScrie && poateEdita(s, eu);
  const editata = s.modificataLa !== null && s.creataLa !== null && s.modificataLa.getTime() > s.creataLa.getTime();
  const fel = deschis?.id === s.id && deschis.versiune === s.versiune ? deschis.fel : null;
  return (
    <dialog ref={d} className="sug-fereastra" aria-labelledby={titlu} data-sug="detaliu">
      <div className="sug-fereastra-cap">
        <h2 id={titlu}>{s.titlu}</h2>
        <button type="button" aria-label={t('admin.rm.inchide')} data-sug="inchide" onClick={() => { d.current?.close(); }}>×</button>
      </div>
      <p className="sug-meta">
        <span className="sug-stare" data-stare={s.stare ?? 'necunoscuta'} data-sug="stare">{t(`admin.sug.stare.${s.stare ?? 'necunoscuta'}`)}</span>
      </p>
      <p className="admin-slab sug-meta" data-sug="meta">
        {s.tip ? t(`admin.sug.tip.${s.tip}`) : '?'} · {t(`admin.sug.zona.${s.zona ?? 'nespecificata'}`)}
        {' · '}{t('admin.sug.autor', { cine, data: dataScurta(s.creataLa, limba) })}
        {editata ? ` · ${t('admin.sug.editata', { data: dataScurta(s.modificataLa, limba) })}` : ''}
      </p>
      {s.descriere ? <p className="sug-text" data-sug="descriere-text">{s.descriere}</p> : null}
      {s.poza ? <PozaSugestiei con={con} s={s} /> : null}
      {areDecizie(s) ? (
        <div className="sug-decizia" data-sug="decizia">
          <p className="admin-slab">{t('admin.sug.decizia', { data: dataScurta(s.decisaLa, limba) })}</p>
          {s.nota ? <p className="sug-text" data-sug="nota-owner">{s.nota}</p> : null}
        </div>
      ) : null}
      {gata ? <p className="admin-mesaj" role="status" data-sug="gata-detaliu">{gata}</p> : null}
      {editabila || owner ? (
        <div className="admin-randuri">
          {editabila ? (
            <button type="button" disabled={ocupat} aria-expanded={fel === 'editeaza'} data-sug="editeaza" onClick={() => { deschide({ id: s.id, fel: 'editeaza', versiune: s.versiune }); }}>
              {t('admin.sug.editeaza')}
            </button>
          ) : null}
          {owner ? (
            <button type="button" disabled={ocupat || s.versiune === null} aria-expanded={fel === 'decide'} data-sug="decide" onClick={() => { deschide({ id: s.id, fel: 'decide', versiune: s.versiune }); }}>
              {t('admin.sug.decide')}
            </button>
          ) : null}
        </div>
      ) : null}
      {fel === 'editeaza' && editabila ? (
        <Formular initial={s} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroare} renunta={() => { deschide(null); }}
          trimite={(c, versiune) => { if (versiune !== null) editeaza(c, versiune); }} />
      ) : null}
      {fel === 'decide' && owner ? (
        <Decizie s={s} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroare} renunta={() => { deschide(null); }} decide={decide} />
      ) : null}
    </dialog>
  );
}

/** Decizia owner-ului: starea și nota, pe versiunea de la deschidere; la Respinsă și la Amânată, fără notă nu pleacă. */
function Decizie({ s, ocupat, faraAppCheck, eroare, decide, renunta }: {
  readonly s: Sugestie; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly decide: (stare: StareSugestie, nota: string, versiune: number) => void; readonly renunta: () => void;
}): ReactElement {
  const ajutor = useId();
  const [versiune] = useState(s.versiune);
  const [stare, setStare] = useState<StareSugestie>(s.stare ?? 'noua');
  const [nota, setNota] = useState(s.nota);
  const ceruta = notaCeruta(stare);
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (versiune !== null && !lipsesteNota(stare, nota)) decide(stare, nota, versiune);
  };
  return (
    <form className="pers-formular sug-formular" onSubmit={trimite} data-sug="formular-decizie">
      <label>
        <span>{t('admin.sug.stare')}</span>
        <select value={stare} data-sug="stare-aleasa" onChange={(e) => { const v = e.target.value; if (esteStare(v)) setStare(v); }}>
          {STARI_SUGESTIE.map((x) => <option key={x} value={x}>{t(`admin.sug.stare.${x}`)}</option>)}
        </select>
      </label>
      <label>
        <span>{t('admin.sug.nota')}</span>
        <textarea rows={3} maxLength={NOTA_MAX} required={ceruta} aria-describedby={ceruta ? ajutor : undefined} value={nota} data-sug="nota"
          onChange={(e) => { setNota(e.target.value); }} />
      </label>
      {ceruta ? <p className="admin-slab sug-ajutor" id={ajutor} data-sug="nota-ceruta">{t('admin.sug.nota-ceruta')}</p> : null}
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || versiune === null || lipsesteNota(stare, nota)} data-sug="salveaza-decizia">
          {t('admin.sug.salveaza-decizia')}
        </button>
        <button type="button" onClick={renunta}>{t('admin.pers.renunta')}</button>
        {faraAppCheck ? <span className="admin-slab">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-sug="eroare">{t('admin.sug.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}

/**
 * Nota cerută la o mutare în Respinsă sau Amânată (cu tragerea sau din „Mută în…”): pornește de la nota de acum a cardului;
 * „Mută” pleacă doar cu o notă. Renunțarea (și Esc) lasă cardul unde era.
 */
export function NotaMutarii({ s, spre, muta, inchisa }: {
  readonly s: Sugestie; readonly spre: StareSugestie; readonly muta: (nota: string) => void; readonly inchisa: () => void;
}): ReactElement {
  const titlu = useId();
  const ajutor = useId();
  const d = useFereastra(inchisa);
  const [nota, setNota] = useState(s.nota);
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (lipsesteNota(spre, nota)) return;
    d.current?.close();
    muta(nota);
  };
  return (
    <dialog ref={d} className="sug-fereastra sug-fereastra-mica" aria-labelledby={titlu} data-sug="cere-nota">
      <form className="pers-formular" onSubmit={trimite}>
        <h2 id={titlu}>{t('admin.sug.muta-cu-nota', { titlu: s.titlu, stare: t(`admin.sug.stare.${spre}`) })}</h2>
        <label>
          <span>{t('admin.sug.nota')}</span>
          <textarea rows={3} maxLength={NOTA_MAX} required aria-describedby={ajutor} value={nota} data-sug="nota-mutarii"
            onChange={(e) => { setNota(e.target.value); }} />
        </label>
        <p className="admin-slab sug-ajutor" id={ajutor}>{t('admin.sug.nota-ceruta')}</p>
        <div className="admin-randuri">
          <button type="submit" className="principal" disabled={lipsesteNota(spre, nota)} data-sug="muta-cu-nota">{t('admin.sug.muta-buton')}</button>
          <button type="button" data-sug="renunta-nota" onClick={() => { d.current?.close(); }}>{t('admin.pers.renunta')}</button>
        </div>
      </form>
    </dialog>
  );
}
