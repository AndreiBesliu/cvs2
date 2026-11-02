import { useEffect, useId, useState, type FormEvent, type ReactElement } from 'react';
import { Bytes, collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore/lite';
import type { Permisiune } from '../../../shared/personal.ts';
import { COLECTIE_POZE, ID_POZA } from '../../../shared/poza.ts';
import {
  COLECTIE_TICHETE, curataTextTichet, PLAFON_LISTA_TICHETE, RASPUNS_MAX, STARI_TICHET, type CerereTichet, type RaspunsTichet,
} from '../../../shared/tichete.ts';
import { tichete, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataScurta, motivDin, type Masura } from '../erori/date.ts';
import { useAdresaImaginii } from '../sugestii/FilaSugestii.tsx';
import { eRosu, filtreaza, numarePeStare, ordoneaza, tichetDin, type Filtru, type Tichet } from './date.ts';
import '../personal/personal.css';
import '../sugestii/sugestii.css';
import './tichete.css';

/**
 * Fila Tichete (ADR 0116 §13): raportările clienților, cele mai noi întâi, cu filtrul pe stare. Fiecare arată felul, cine și
 * când, vârsta (roșie după 48 h fără răspuns), textul, datele aplicației, amprentele erorilor din sesiune și poza planșei, la
 * cerere. Cu `tichete.raspunde` (și owner-ul): răspunsul (clientul îl vede în aplicație) și starea, prin callable-ul
 * `tichete`, pe versiunea văzută. Citirile trec prin reguli, la cerere („Reîncarcă”).
 */

/** Unde s-a pornit lucrul (id-ul tichetului); eroarea se arată acolo. */
type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza' }
  | { readonly faza: 'gata'; readonly mesaj: string }
  | { readonly faza: 'eroare'; readonly motiv: string; readonly loc: string };

type CererePersonal = Extract<CerereTichet, { actiune: 'raspunde' | 'stare' }>;
type Fa = (cerere: CererePersonal, loc: string, mesaj: (r: RaspunsTichet) => string) => void;

export function FilaTichete({ con, owner, permisiuni }: {
  readonly con: Conexiune; readonly owner: boolean; readonly permisiuni: ReadonlySet<Permisiune>;
}): ReactElement {
  const limba = useLimba();
  const poateRaspunde = owner || permisiuni.has('tichete.raspunde');
  const [lista, setLista] = useState<Masura<readonly Tichet[]> | null>(null);
  const [rev, setRev] = useState(0);
  const [filtru, setFiltru] = useState<Filtru>('toate');
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  // Un răspuns trimis golește formularul rândului: cheia lui crește.
  const [trimise, setTrimise] = useState(0);
  useEffect(() => {
    let viu = true;
    getDocs(query(collection(con.db, COLECTIE_TICHETE), orderBy('creatLa', 'desc'), limit(PLAFON_LISTA_TICHETE))).then(
      (s) => { if (viu) setLista({ ok: true, valoare: ordoneaza(s.docs.map((d) => tichetDin(d.id, d.data()))) }); },
      (e: unknown) => { if (viu) setLista({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, rev]);

  const fa: Fa = (cerere, loc, mesaj) => {
    setLucru({ faza: 'lucreaza' });
    tichete(con, cerere).then((r) => {
      setLucru({ faza: 'gata', mesaj: mesaj(r) });
      if (cerere.actiune === 'raspunde') setTrimise((n) => n + 1);
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), loc }); });
  };

  const ocupat = lucru.faza === 'lucreaza';
  // Fără cheia App Check pe instanță, serverul refuză orice scriere: butoanele se opresc.
  const faraAppCheck = con.appCheck === 'oprit';
  const toate = lista?.ok ? lista.valoare : [];
  const numare = numarePeStare(toate);
  const aratate = filtreaza(toate, filtru);
  const acum = Date.now();
  const eroareLa = (loc: string): string | null => (lucru.faza === 'eroare' && lucru.loc === loc ? lucru.motiv : null);

  return (
    <div className="pers sug tic">
      {lucru.faza === 'lucreaza' ? <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.tic.lucreaza')}</p> : null}
      {lucru.faza === 'gata' ? <div className="pers-stare" role="status" data-tic="gata"><p>{lucru.mesaj}</p></div> : null}
      <section className="pers-sectiune" aria-labelledby="tic-lista">
        <h2 id="tic-lista">{t('admin.tic.titlu')} <span className="admin-slab">{toate.length}</span></h2>
        <p className="admin-slab">{t('admin.tic.text')}</p>
        {poateRaspunde ? null : <p className="admin-mesaj" data-tic="doar-citire">{t('admin.tic.doar-citire')}</p>}
        <div className="admin-randuri">
          {(['toate', ...STARI_TICHET] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filtru === f} data-filtru-tic={f} onClick={() => { setFiltru(f); }}>
              {f === 'toate' ? t('admin.tic.filtru.toate') : t('admin.tic.filtru', { nume: t(`admin.tic.stare.${f}`), n: numare[f] })}
            </button>
          ))}
          <button type="button" data-tic="reincarca" onClick={() => { setRev((n) => n + 1); }}>{t('admin.tic.reincarca')}</button>
        </div>
        {lista === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.tic.se-incarca')}</p>
          : !lista.ok ? <p className="admin-eroare" role="alert" data-tic="eroare-lista">{t('admin.tic.citire', { motiv: lista.motiv })}</p>
            : toate.length === 0 ? <p className="admin-mesaj" data-tic="gol">{t('admin.tic.niciunul')}</p>
              : aratate.length === 0 ? <p className="admin-mesaj" data-tic="gol-filtru">{t('admin.tic.niciunul-filtru')}</p>
                : (
                  <ul className="pers-lista">
                    {aratate.map((x) => (
                      <Rand key={x.id} con={con} x={x} poateRaspunde={poateRaspunde} ocupat={ocupat} faraAppCheck={faraAppCheck}
                        eroare={eroareLa(x.id)} fa={fa} limba={limba} acum={acum} trimise={trimise} />
                    ))}
                  </ul>
                )}
        {toate.length >= PLAFON_LISTA_TICHETE ? <p className="admin-slab" data-tic="plafon">{t('admin.tic.plafon', { n: PLAFON_LISTA_TICHETE })}</p> : null}
      </section>
    </div>
  );
}

function Rand({ con, x, poateRaspunde, ocupat, faraAppCheck, eroare, fa, limba, acum, trimise }: {
  readonly con: Conexiune; readonly x: Tichet; readonly poateRaspunde: boolean; readonly ocupat: boolean; readonly faraAppCheck: boolean;
  readonly eroare: string | null; readonly fa: Fa; readonly limba: string; readonly acum: number; readonly trimise: number;
}): ReactElement {
  const ore = x.creatLa ? Math.floor((acum - x.creatLa.getTime()) / 3_600_000) : 0;
  const a = x.aplicatia;
  const stare = (s: 'rezolvat' | 'deschis', eticheta: string): ReactElement => (
    <button type="button" disabled={ocupat || faraAppCheck || x.versiune === null} data-tic={s === 'rezolvat' ? 'rezolva' : 'redeschide'}
      onClick={() => {
        if (x.versiune === null) return;
        fa({ actiune: 'stare', id: x.id, versiune: x.versiune, stare: s }, x.id,
          (r) => (r.schimbat ? t('admin.tic.stare-schimbata', { stare: t(`admin.tic.stare.${s}`) }) : t('admin.tic.neschimbat')));
      }}>
      {eticheta}
    </button>
  );
  return (
    <li data-tichet={x.id} data-stare={x.stare ?? 'necunoscuta'}>
      <div className="pers-rand">
        <span className="pers-cine">{x.fel ? t(`admin.tic.fel.${x.fel}`) : '?'} · {x.autorEmail ?? '—'}</span>
        <span className="sug-stare tic-stare" data-stare={x.stare ?? 'necunoscuta'} data-tic="stare">{t(`admin.tic.stare.${x.stare ?? 'necunoscuta'}`)}</span>
      </div>
      <p className="admin-slab sug-meta">
        {dataScurta(x.creatLa, limba)}
        {eRosu(x, acum) ? <span className="tic-rosu" data-tic="fara-raspuns">{` · ${t('admin.tic.fara-raspuns', { ore })}`}</span> : null}
      </p>
      <p className="sug-text" data-tic="text">{x.text}</p>
      {a ? (
        <p className="admin-slab tic-aplicatia" data-tic="aplicatia">
          {t('admin.tic.aplicatia', { versiune: a.versiune, instanta: a.instanta, limba: a.limba, plan: a.plan ?? t('admin.tic.fara-plan') })}
          <br />
          {t('admin.tic.browser', { browser: a.browser })}
        </p>
      ) : null}
      <p className="admin-slab tic-amprente" data-tic="amprente">
        {x.amprente.length > 0 ? t('admin.tic.amprente', { lista: x.amprente.join(', ') }) : t('admin.tic.fara-amprente')}
      </p>
      {x.poza ? <PozaTichetului con={con} x={x} /> : null}
      {x.raspunsuri.map((r, k) => (
        <div key={k} className="sug-decizia" data-tic="raspuns">
          <p className="admin-slab">{t('admin.tic.raspunsul', { cine: r.deEmail ?? '—', data: dataScurta(r.la, limba) })}</p>
          <p className="sug-text">{r.text}</p>
        </div>
      ))}
      {poateRaspunde ? (
        <>
          <Raspuns key={trimise} x={x} ocupat={ocupat} faraAppCheck={faraAppCheck} fa={fa} />
          <div className="admin-randuri">
            {x.stare === 'rezolvat' ? stare('deschis', t('admin.tic.redeschide')) : stare('rezolvat', t('admin.tic.rezolva'))}
          </div>
        </>
      ) : null}
      {eroare ? <p className="admin-eroare" role="alert" data-tic="eroare">{t('admin.tic.esec', { motiv: eroare })}</p> : null}
    </li>
  );
}

/** Răspunsul la un tichet, pe versiunea de la deschiderea rândului. */
function Raspuns({ x, ocupat, faraAppCheck, fa }: {
  readonly x: Tichet; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly fa: Fa;
}): ReactElement {
  const id = useId();
  const [versiune] = useState(x.versiune);
  const [text, setText] = useState('');
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (versiune === null || curataTextTichet(text, RASPUNS_MAX) === null) return;
    fa({ actiune: 'raspunde', id: x.id, versiune, text }, x.id, () => t('admin.tic.trimis'));
  };
  return (
    <form className="sug-formular tic-raspuns" onSubmit={trimite} data-tic="formular-raspuns">
      <label htmlFor={id}>{t('admin.tic.raspunde')}</label>
      <textarea id={id} rows={3} maxLength={RASPUNS_MAX} value={text} data-tic="raspuns-text" onChange={(e) => { setText(e.target.value); }} />
      <p className="admin-slab sug-ajutor">{t('admin.tic.raspuns-ajutor')}</p>
      <div className="admin-randuri">
        <button type="submit" data-tic="trimite" disabled={ocupat || faraAppCheck || versiune === null || curataTextTichet(text, RASPUNS_MAX) === null}>
          {t('admin.tic.trimite')}
        </button>
      </div>
    </form>
  );
}

/** Poza planșei atașată tichetului, adusă la cerere din documentul ei (ca la sugestii, ADR 0111). */
function PozaTichetului({ con, x }: { readonly con: Conexiune; readonly x: Tichet }): ReactElement {
  const [deschisa, setDeschisa] = useState(false);
  const [imagine, setImagine] = useState<Masura<Blob> | null>(null);
  useEffect(() => {
    if (!deschisa || imagine !== null) return undefined;
    let viu = true;
    getDoc(doc(con.db, COLECTIE_TICHETE, x.id, COLECTIE_POZE, ID_POZA)).then((d) => {
      if (!viu) return;
      const o: unknown = d.get('octeti');
      setImagine(o instanceof Bytes
        ? { ok: true, valoare: new Blob([new Uint8Array(o.toUint8Array())], { type: x.poza?.tip ?? 'image/jpeg' }) }
        : { ok: false, motiv: t('admin.sug.poza-lipsa') });
    }, (e: unknown) => { if (viu) setImagine({ ok: false, motiv: motivDin(e) }); });
    return () => { viu = false; };
  }, [deschisa, imagine, con, x.id, x.poza]);
  const adresa = useAdresaImaginii(imagine?.ok ? imagine.valoare : null);
  return (
    <div className="sug-poza-rand">
      <button type="button" aria-expanded={deschisa} data-tic="arata-poza" onClick={() => { setDeschisa((v) => !v); }}>
        {t(deschisa ? 'admin.tic.poza-ascunde' : 'admin.tic.poza-arata')}
      </button>
      {!deschisa ? null
        : imagine === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.tic.poza-se-incarca')}</p>
          : !imagine.ok ? <p className="admin-eroare" role="alert" data-tic="poza-eroare">{t('admin.tic.poza-lipsa', { motiv: imagine.motiv })}</p>
            : adresa ? (
              <a href={adresa} target="_blank" rel="noopener">
                <img className="sug-poza-img" src={adresa} alt={t('admin.tic.poza-arata')} data-tic="poza" />
              </a>
            ) : null}
    </div>
  );
}
