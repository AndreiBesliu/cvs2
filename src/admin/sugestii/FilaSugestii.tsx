import { useEffect, useId, useState, type FormEvent, type ReactElement } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { Permisiune } from '../../../shared/personal.ts';
import {
  COLECTIE_SUGESTII, curataTitlu, DESCRIERE_MAX, esteStare, esteTip, esteZona, NOTA_MAX, PLAFON_LISTA_SUGESTII, STARI_SUGESTIE, TIPURI_SUGESTIE,
  TITLU_MAX, ZONE_SUGESTIE, type CerereSugestie, type ContinutSugestie, type RaspunsSugestie, type StareSugestie, type TipSugestie,
  type ZonaSugestie,
} from '../../../shared/sugestii.ts';
import { sugestii, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataScurta, motivDin, type Masura } from '../erori/date.ts';
import { areDecizie, filtreaza, numarePeStare, ordoneaza, poateEdita, sugestieDin, type Filtru, type Sugestie } from './date.ts';
import '../personal/personal.css';
import './sugestii.css';

/**
 * Fila Sugestii (ADR 0107): cine are `sugestii.scrie` scrie o sugestie și își vede sugestiile, cu decizia owner-ului pe
 * fiecare; cu `sugestii.citeste` (și owner-ul), lista întregului personal. Owner-ul decide pe fiecare, cu o notă. Citirile
 * trec prin reguli, la cerere („Reîncarcă”); fiecare schimbare trece prin callable-ul `sugestii`, cu auditul pe server.
 * Editarea și decizia trimit versiunea văzută la deschiderea formularului: una schimbată între timp e refuzată de server.
 */

/** Unde s-a pornit lucrul: formularul nou (`nou`) sau o sugestie (id-ul ei); eroarea se arată acolo. */
type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza' }
  | { readonly faza: 'gata'; readonly mesaj: string }
  | { readonly faza: 'eroare'; readonly motiv: string; readonly loc: string };

/**
 * Formularul deschis: sugestia, felul și versiunea pe care s-a deschis. O sugestie adusă cu altă versiune (reîncărcată după o
 * schimbare) își închide formularul: omul îl redeschide pe varianta nouă, pe care o vede.
 */
type Deschis = { readonly id: string; readonly fel: 'editeaza' | 'decide'; readonly versiune: number | null } | null;

type Fa = (cerere: CerereSugestie, loc: string, mesaj: (r: RaspunsSugestie) => string, dupa?: () => void) => void;

/** Titlul din mesaje, cum îl scrie serverul (spațiile adunate). */
const titluScris = (titlu: string): string => curataTitlu(titlu) ?? titlu.trim();

export function FilaSugestii({ con, eu, owner, permisiuni }: {
  readonly con: Conexiune; readonly eu: string; readonly owner: boolean; readonly permisiuni: ReadonlySet<Permisiune>;
}): ReactElement {
  const limba = useLimba();
  const poateScrie = owner || permisiuni.has('sugestii.scrie');
  const vedeToate = owner || permisiuni.has('sugestii.citeste');
  const [lista, setLista] = useState<Masura<readonly Sugestie[]> | null>(null);
  const [rev, setRev] = useState(0);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  const [filtru, setFiltru] = useState<Filtru>('toate');
  const [aleMele, setAleMele] = useState(false);
  const [deschis, setDeschis] = useState<Deschis>(null);
  // Formularul nou se golește după o trimitere reușită: cheia lui crește.
  const [trimise, setTrimise] = useState(0);

  useEffect(() => {
    let viu = true;
    const col = collection(con.db, COLECTIE_SUGESTII);
    // Cine le vede pe toate citește cele mai noi (indexul simplu al lui `creataLa`); autorul, doar pe ale lui (regulile cer
    // filtrul pe `autor`), fără index compus: ordinea o face pagina.
    const q = vedeToate
      ? query(col, orderBy('creataLa', 'desc'), limit(PLAFON_LISTA_SUGESTII))
      : query(col, where('autor', '==', eu), limit(PLAFON_LISTA_SUGESTII));
    getDocs(q).then(
      (s) => { if (viu) setLista({ ok: true, valoare: ordoneaza(s.docs.map((d) => sugestieDin(d.id, d.data()))) }); },
      (e: unknown) => { if (viu) setLista({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, eu, vedeToate, rev]);

  const fa: Fa = (cerere, loc, mesaj, dupa) => {
    setLucru({ faza: 'lucreaza' });
    sugestii(con, cerere).then((r) => {
      setLucru({ faza: 'gata', mesaj: mesaj(r) });
      setDeschis(null);
      dupa?.();
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), loc }); });
  };

  const ocupat = lucru.faza === 'lucreaza';
  // Fără cheia App Check pe instanță, serverul refuză orice scriere: butoanele se opresc și spun de ce.
  const faraAppCheck = con.appCheck === 'oprit';
  const toate = lista?.ok ? lista.valoare : [];
  const numare = numarePeStare(toate);
  const aratate = filtreaza(toate, filtru, aleMele ? eu : null);
  const eroareLa = (loc: string): string | null => (lucru.faza === 'eroare' && lucru.loc === loc ? lucru.motiv : null);
  // Un formular deschis sau închis șterge mesajul de dinainte (o eroare veche n-are ce căuta în formularul nou).
  const deschide = (d: Deschis): void => {
    setLucru((l) => (l.faza === 'lucreaza' ? l : { faza: 'liber' }));
    setDeschis((v) => (d && v?.id === d.id && v.fel === d.fel && v.versiune === d.versiune ? null : d));
  };

  return (
    <div className="pers sug">
      {lucru.faza === 'lucreaza' ? <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.sug.lucreaza')}</p> : null}
      {lucru.faza === 'gata' ? <div className="pers-stare" role="status" data-sug="gata"><p>{lucru.mesaj}</p></div> : null}
      {poateScrie ? (
        <section className="pers-sectiune" aria-labelledby="sug-noua">
          <h2 id="sug-noua">{t('admin.sug.noua')}</h2>
          <p className="admin-slab">{t('admin.sug.noua-text')}</p>
          <Formular key={trimise} initial={null} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroareLa('nou')}
            trimite={(c) => { fa({ actiune: 'scrie', ...c }, 'nou', () => t('admin.sug.trimisa', { titlu: titluScris(c.titlu) }), () => { setTrimise((n) => n + 1); }); }} />
        </section>
      ) : <p className="admin-mesaj" data-sug="doar-citire">{t('admin.sug.doar-citire')}</p>}
      <section className="pers-sectiune" aria-labelledby="sug-lista">
        <h2 id="sug-lista">{t(vedeToate ? 'admin.sug.toate' : 'admin.sug.ale-tale')} <span className="admin-slab">{toate.length}</span></h2>
        <div className="admin-randuri">
          {(['toate', ...STARI_SUGESTIE] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filtru === f} data-filtru-sug={f} onClick={() => { setFiltru(f); }}>
              {f === 'toate' ? t('admin.sug.filtru.toate') : t('admin.sug.filtru', { nume: t(`admin.sug.stare.${f}`), n: numare[f] })}
            </button>
          ))}
          {vedeToate && poateScrie ? (
            <button type="button" aria-pressed={aleMele} data-sug="ale-mele" onClick={() => { setAleMele((x) => !x); }}>{t('admin.sug.ale-mele')}</button>
          ) : null}
          <button type="button" data-sug="reincarca" onClick={() => { setRev((n) => n + 1); }}>{t('admin.sug.reincarca')}</button>
        </div>
        {lista === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.sug.se-incarca')}</p>
          : !lista.ok ? <p className="admin-eroare" role="alert" data-sug="eroare-lista">{t('admin.sug.citire', { motiv: lista.motiv })}</p>
            : toate.length === 0 ? <p className="admin-mesaj" data-sug="gol">{t('admin.sug.niciuna')}</p>
              : aratate.length === 0 ? <p className="admin-mesaj" data-sug="gol-filtru">{t('admin.sug.niciuna-filtru')}</p>
                : (
                  <ul className="pers-lista">
                    {aratate.map((s) => (
                      <Rand key={s.id} s={s} eu={eu} owner={owner} poateScrie={poateScrie} deschis={deschis} deschide={deschide}
                        ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroareLa(s.id)} fa={fa} limba={limba} />
                    ))}
                  </ul>
                )}
        {toate.length >= PLAFON_LISTA_SUGESTII ? <p className="admin-slab" data-sug="plafon">{t('admin.sug.plafon', { n: PLAFON_LISTA_SUGESTII })}</p> : null}
      </section>
    </div>
  );
}

function Rand({ s, eu, owner, poateScrie, deschis, deschide, ocupat, faraAppCheck, eroare, fa, limba }: {
  readonly s: Sugestie; readonly eu: string; readonly owner: boolean; readonly poateScrie: boolean; readonly deschis: Deschis;
  readonly deschide: (d: Deschis) => void; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly fa: Fa; readonly limba: string;
}): ReactElement {
  const cine = s.autor === eu ? t('admin.pers.tu') : s.autorEmail ?? s.autor ?? '—';
  const editabila = poateScrie && poateEdita(s, eu);
  const editata = s.modificataLa !== null && s.creataLa !== null && s.modificataLa.getTime() > s.creataLa.getTime();
  const fel = deschis?.id === s.id && deschis.versiune === s.versiune ? deschis.fel : null;
  return (
    <li data-sugestie={s.titlu} data-stare={s.stare ?? 'necunoscuta'}>
      <div className="pers-rand">
        <span className="pers-cine">{s.titlu}</span>
        <span className="sug-stare" data-stare={s.stare ?? 'necunoscuta'} data-sug="stare">{t(`admin.sug.stare.${s.stare ?? 'necunoscuta'}`)}</span>
      </div>
      <p className="admin-slab sug-meta">
        {s.tip ? t(`admin.sug.tip.${s.tip}`) : '?'} · {t(`admin.sug.zona.${s.zona ?? 'nespecificata'}`)}
        {' · '}{t('admin.sug.autor', { cine, data: dataScurta(s.creataLa, limba) })}
        {editata ? ` · ${t('admin.sug.editata', { data: dataScurta(s.modificataLa, limba) })}` : ''}
      </p>
      {s.descriere ? <p className="sug-text" data-sug="descriere-text">{s.descriere}</p> : null}
      {areDecizie(s) ? (
        <div className="sug-decizia" data-sug="decizia">
          <p className="admin-slab">{t('admin.sug.decizia', { data: dataScurta(s.decisaLa, limba) })}</p>
          {s.nota ? <p className="sug-text" data-sug="nota-owner">{s.nota}</p> : null}
        </div>
      ) : null}
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
          trimite={(c, versiune) => {
            if (versiune === null) return;
            fa({ actiune: 'editeaza', id: s.id, versiune, ...c }, s.id, (r) => (r.schimbat ? t('admin.sug.salvata', { titlu: titluScris(c.titlu) }) : t('admin.sug.neschimbata')));
          }} />
      ) : null}
      {fel === 'decide' && owner ? (
        <Decizie s={s} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroare} renunta={() => { deschide(null); }}
          decide={(stare, nota, versiune) => {
            fa({ actiune: 'decide', id: s.id, versiune, stare, nota }, s.id,
              (r) => (r.schimbat ? t('admin.sug.decisa', { titlu: s.titlu, stare: t(`admin.sug.stare.${stare}`) }) : t('admin.sug.neschimbata')));
          }} />
      ) : null}
    </li>
  );
}

/** Scrierea unei sugestii noi sau editarea uneia fără decizie; versiunea e cea de la deschidere. */
function Formular({ initial, ocupat, faraAppCheck, eroare, trimite, renunta }: {
  readonly initial: Sugestie | null; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly trimite: (c: ContinutSugestie, versiune: number | null) => void; readonly renunta?: () => void;
}): ReactElement {
  const ajutor = useId();
  const [versiune] = useState(initial?.versiune ?? null);
  const [titlu, setTitlu] = useState(initial?.titlu ?? '');
  const [descriere, setDescriere] = useState(initial?.descriere ?? '');
  // Fără tip ales dinainte: tipul îl ajută pe owner să le despartă, deci îl alege omul.
  const [tip, setTip] = useState<TipSugestie | ''>(initial?.tip ?? '');
  const [zona, setZona] = useState<ZonaSugestie | ''>(initial?.zona ?? '');
  const trimiteFormular = (e: FormEvent): void => {
    e.preventDefault();
    if (tip !== '') trimite({ titlu, descriere, tip, zona: zona === '' ? null : zona }, versiune);
  };
  return (
    <form className="pers-formular sug-formular" onSubmit={trimiteFormular} data-sug={initial ? 'formular-editare' : 'formular'}>
      <label>
        <span>{t('admin.sug.titlu')}</span>
        <input type="text" required maxLength={TITLU_MAX} value={titlu} data-sug="titlu" onChange={(e) => { setTitlu(e.target.value); }} />
      </label>
      <label>
        <span>{t('admin.sug.descriere')}</span>
        <textarea rows={5} maxLength={DESCRIERE_MAX} value={descriere} aria-describedby={ajutor} data-sug="descriere" onChange={(e) => { setDescriere(e.target.value); }} />
      </label>
      <p className="admin-slab sug-ajutor" id={ajutor}>{t('admin.sug.descriere-ajutor')}</p>
      <div className="sug-alegeri">
        <label>
          <span>{t('admin.sug.tip')}</span>
          <select required value={tip} data-sug="tip" onChange={(e) => { const v = e.target.value; setTip(esteTip(v) ? v : ''); }}>
            <option value="" disabled>{t('admin.sug.alege-tip')}</option>
            {TIPURI_SUGESTIE.map((x) => <option key={x} value={x}>{t(`admin.sug.tip.${x}`)}</option>)}
          </select>
        </label>
        <label>
          <span>{t('admin.sug.zona')}</span>
          <select value={zona} data-sug="zona" onChange={(e) => { const v = e.target.value; setZona(esteZona(v) ? v : ''); }}>
            <option value="">{t('admin.sug.zona.nespecificata')}</option>
            {ZONE_SUGESTIE.map((x) => <option key={x} value={x}>{t(`admin.sug.zona.${x}`)}</option>)}
          </select>
        </label>
      </div>
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || titlu.trim() === '' || tip === ''} data-sug="trimite">
          {t(initial ? 'admin.sug.salveaza' : 'admin.sug.trimite')}
        </button>
        {renunta ? <button type="button" onClick={renunta}>{t('admin.pers.renunta')}</button> : null}
        {faraAppCheck ? <span className="admin-slab" data-sug="fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-sug="eroare">{t('admin.sug.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}

/** Decizia owner-ului: starea și nota, pe versiunea de la deschidere. */
function Decizie({ s, ocupat, faraAppCheck, eroare, decide, renunta }: {
  readonly s: Sugestie; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly decide: (stare: StareSugestie, nota: string, versiune: number) => void; readonly renunta: () => void;
}): ReactElement {
  const [versiune] = useState(s.versiune);
  const [stare, setStare] = useState<StareSugestie>(s.stare ?? 'noua');
  const [nota, setNota] = useState(s.nota);
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (versiune !== null) decide(stare, nota, versiune);
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
        <textarea rows={3} maxLength={NOTA_MAX} value={nota} data-sug="nota" onChange={(e) => { setNota(e.target.value); }} />
      </label>
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || versiune === null} data-sug="salveaza-decizia">
          {t('admin.sug.salveaza-decizia')}
        </button>
        <button type="button" onClick={renunta}>{t('admin.pers.renunta')}</button>
        {faraAppCheck ? <span className="admin-slab">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-sug="eroare">{t('admin.sug.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}
