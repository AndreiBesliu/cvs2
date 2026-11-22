import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore/lite';
import type { Permisiune } from '../../../shared/personal.ts';
import { baza64 } from '../../../shared/poza.ts';
import {
  COLECTIE_SUGESTII, curataTitlu, PLAFON_LISTA_SUGESTII, type CerereSugestie, type RaspunsSugestie, type StareSugestie,
} from '../../../shared/sugestii.ts';
import { CANAL_POZA, iaPoza, stergePoza, type PozaInAsteptare } from '../../app/pozaSugestiei.ts';
import { sugestii, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { ceaMaiRecenta } from '../carcasa/date.ts';
import { EroareCitire, ListaGoala, SeIncarca } from '../carcasa/stari.tsx';
import { dataScurta, motivDin, type Masura } from '../erori/date.ts';
import {
  aleLui, cuMutarea, dupaDecizie, notaCeruta, ordoneaza, sugestieDin, tabla, type DecizieTrimisa, type Mutare, type Sugestie,
} from './date.ts';
import { DetaliuSugestie, NotaMutarii, type Deschis } from './Detaliu.tsx';
import { Formular } from './Formular.tsx';
import { TablaSugestii } from './Tabla.tsx';
import '../personal/personal.css';
import './sugestii.css';

/**
 * Fila Sugestii (ADR 0107; tabla: ADR 0260 §4): cine are `sugestii.scrie` scrie o sugestie („Sugestie nouă”) și își vede
 * sugestiile pe tablă, cu decizia owner-ului; cu `sugestii.citeste` (și owner-ul), ale întregului personal. Owner-ul mută un
 * card dintr-o coloană în alta (tragerea sau „Mută în…”), cu nota cerută la Respinsă și Amânată, ori decide din detaliu.
 * Citirile trec prin reguli, la cerere („Reîncarcă”); fiecare schimbare trece prin callable-ul `sugestii`, cu auditul pe
 * server, pe versiunea văzută: una schimbată între timp e refuzată de server.
 */

/**
 * Ce se întâmplă acum: o cerere (cu mutarea arătată pe tablă), mesajul ei, sau eroarea, la locul ei (`nou` sau sugestia).
 * Mesajul unei decizii e discret (doar pentru cititorul de ecran): tabla nu sare sub cursorul care trage.
 */
type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza'; readonly mutare: Mutare | null }
  | { readonly faza: 'gata'; readonly mesaj: string; readonly id: string | null; readonly discret: boolean }
  | { readonly faza: 'eroare'; readonly motiv: string; readonly loc: string };

/** O mutare care așteaptă nota (Respinsă, Amânată); din meniu, focusul se întoarce apoi pe card. */
type CereNota = { readonly id: string; readonly spre: StareSugestie; readonly dinMeniu: boolean } | null;

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
  const [aleMele, setAleMele] = useState(false);
  const [deschis, setDeschis] = useState<Deschis>(null);
  const [detaliu, setDetaliu] = useState<string | null>(null);
  const [cereNota, setCereNota] = useState<CereNota>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const focusGata = useCallback(() => { setFocus(null); }, []);
  // Formularul nou stă sub „Sugestie nouă”; se golește după o trimitere reușită (cheia lui crește).
  const [noua, setNoua] = useState(false);
  const butonNoua = useRef<HTMLButtonElement>(null);
  const [trimise, setTrimise] = useState(0);
  // Poza planșei lăsată de editor (ADR 0111) intră în formularul nou (deschis singur); una nouă, anunțată pe canal, o înlocuiește.
  const [pozaNoua, setPozaNoua] = useState<PozaInAsteptare | null>(null);
  const [revPoza, setRevPoza] = useState(0);
  useEffect(() => {
    if (!poateScrie) return undefined;
    let viu = true;
    iaPoza().then((p) => { if (viu) setPozaNoua(p); }, () => { if (viu) setPozaNoua(null); });
    return () => { viu = false; };
  }, [poateScrie, revPoza]);
  useEffect(() => {
    if (!poateScrie) return undefined;
    // Poza nouă se anunță pe canal; fără el (sau dacă anunțul se pierde), fila o recitește când revine în față.
    const reciteste = (): void => { setRevPoza((n) => n + 1); };
    const c = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CANAL_POZA);
    if (c) c.onmessage = reciteste;
    const vizibila = (): void => { if (document.visibilityState === 'visible') reciteste(); };
    document.addEventListener('visibilitychange', vizibila);
    return () => {
      c?.close();
      document.removeEventListener('visibilitychange', vizibila);
    };
  }, [poateScrie]);
  useEffect(() => { if (pozaNoua) setNoua(true); }, [pozaNoua]);
  // Poza iese din formular abia după ce s-a șters din browser: o reîncărcare imediată n-o mai aduce înapoi.
  const scoatePoza = (): void => {
    const gata = (): void => { setPozaNoua(null); };
    stergePoza().then(gata, gata);
  };

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

  /** Scrierea și editarea: la răspuns, lista se recitește (documentul nou are câmpuri puse de server). */
  const fa: Fa = (cerere, loc, mesaj, dupa) => {
    setLucru({ faza: 'lucreaza', mutare: null });
    sugestii(con, cerere).then((r) => {
      setLucru({ faza: 'gata', mesaj: mesaj(r), id: loc === 'nou' ? null : loc, discret: false });
      setDeschis(null);
      dupa?.();
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), loc }); });
  };

  /**
   * Decizia owner-ului (o mutare pe tablă sau formularul din detaliu): cardul trece în coloana nouă cât cererea e în drum, iar
   * la răspuns lista ține decizia fără s-o recitească (`dupaDecizie`); la refuz, cardul revine, cu motivul pe el.
   */
  const decide = (s: Sugestie, stare: StareSugestie, nota: string, versiune: number, dinMeniu: boolean): void => {
    const d: DecizieTrimisa = { id: s.id, versiune, stare, nota };
    setLucru({ faza: 'lucreaza', mutare: { id: s.id, spre: stare, la: new Date() } });
    if (dinMeniu) setFocus(s.id);
    sugestii(con, { actiune: 'decide', ...d }).then((r) => {
      setLista((l) => (l?.ok ? { ok: true, valoare: dupaDecizie(l.valoare, d, r, new Date()) } : l));
      setLucru({
        faza: 'gata', id: s.id, discret: true,
        mesaj: r.schimbat ? t('admin.sug.decisa', { titlu: s.titlu, stare: t(`admin.sug.stare.${stare}`) }) : t('admin.sug.neschimbata'),
      });
      setDeschis(null);
      if (dinMeniu) setFocus(s.id);
    }, (e: unknown) => {
      setLucru({ faza: 'eroare', motiv: motivDin(e), loc: s.id });
      if (dinMeniu) setFocus(s.id);
    });
  };

  const ocupat = lucru.faza === 'lucreaza';
  // Fără cheia App Check pe instanță, serverul refuză orice scriere: butoanele se opresc și spun de ce.
  const faraAppCheck = con.appCheck === 'oprit';
  const blocat = ocupat || faraAppCheck;
  const muta = (s: Sugestie, spre: StareSugestie, dinMeniu: boolean): void => {
    if (blocat || s.versiune === null || s.stare === spre) return;
    if (notaCeruta(spre)) setCereNota({ id: s.id, spre, dinMeniu });
    else decide(s, spre, s.nota, s.versiune, dinMeniu);
  };
  const toate = lista?.ok ? lista.valoare : [];
  const aratate = aleLui(toate, aleMele ? eu : null);
  const mutare = lucru.faza === 'lucreaza' ? lucru.mutare : null;
  const ultimaDecizie = ceaMaiRecenta(toate.map((s) => s.decisaLa));
  const eroareLa = (loc: string): string | null => (lucru.faza === 'eroare' && lucru.loc === loc ? lucru.motiv : null);
  // Un formular deschis sau închis șterge mesajul de dinainte (o eroare veche n-are ce căuta în formularul nou).
  const deschide = (d: Deschis): void => {
    setLucru((l) => (l.faza === 'lucreaza' ? l : { faza: 'liber' }));
    setDeschis((v) => (d && v?.id === d.id && v.fel === d.fel && v.versiune === d.versiune ? null : d));
  };
  // „Reîncarcă” (sfatul unui refuz pe o versiune veche) șterge și motivul: lista nouă e cea de judecat.
  const reincarca = (): void => {
    setRev((n) => n + 1);
    setLucru((l) => (l.faza === 'eroare' ? { faza: 'liber' } : l));
  };
  const sDetaliu = detaliu === null ? null : toate.find((s) => s.id === detaliu) ?? null;
  const sNota = cereNota === null ? null : toate.find((s) => s.id === cereNota.id) ?? null;

  return (
    <div className="pers sug">
      {lucru.faza === 'lucreaza' && lucru.mutare === null ? <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.sug.lucreaza')}</p> : null}
      {lucru.faza === 'gata' && !lucru.discret ? <div className="pers-stare" role="status" data-sug="gata"><p>{lucru.mesaj}</p></div> : null}
      <p className="sug-ascuns" role="status" data-sug="anunt">{lucru.faza === 'gata' && lucru.discret ? lucru.mesaj : ''}</p>
      <div className="admin-erori-cap">
        <h2 className="sug-titlu-fila">{t(vedeToate ? 'admin.sug.toate' : 'admin.sug.ale-tale')} <span className="admin-slab">{toate.length}</span></h2>
        {vedeToate && poateScrie ? (
          <div className="admin-segmente" role="group" aria-label={t('admin.sug.vedere')}>
            <button type="button" aria-pressed={aleMele} data-sug="ale-mele" onClick={() => { setAleMele(true); }}>{t('admin.sug.ale-mele')}</button>
            <button type="button" aria-pressed={!aleMele} data-sug="toate" onClick={() => { setAleMele(false); }}>{t('admin.sug.filtru.toate')}</button>
          </div>
        ) : null}
        <button type="button" data-sug="reincarca" onClick={reincarca}>{t('admin.sug.reincarca')}</button>
        {poateScrie ? (
          <button ref={butonNoua} type="button" className="principal" aria-expanded={noua} data-sug="noua" onClick={() => { setNoua((x) => !x); }}>
            {t('admin.sug.noua')}
          </button>
        ) : null}
      </div>
      {!poateScrie ? <p className="admin-mesaj" data-sug="doar-citire">{t('admin.sug.doar-citire')}</p> : null}
      {owner && faraAppCheck ? <p className="admin-slab" data-sug="fara-appcheck-tabla">{t('admin.erori.fara-appcheck')}</p> : null}
      {poateScrie && noua ? (
        <section className="pers-sectiune" aria-labelledby="sug-noua" data-sug="panou-nou">
          <h2 id="sug-noua">{t('admin.sug.noua')}</h2>
          <p className="admin-slab">{t('admin.sug.noua-text')}</p>
          <Formular key={trimise} initial={null} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroareLa('nou')}
            poza={pozaNoua} scoatePoza={scoatePoza} renunta={() => { setNoua(false); butonNoua.current?.focus(); }}
            trimite={(c) => {
              const cuPoza = pozaNoua;
              const mesaj = (): string => t('admin.sug.trimisa', { titlu: titluScris(c.titlu) });
              const dupa = (): void => {
                setTrimise((n) => n + 1);
                if (cuPoza) scoatePoza();
                setNoua(false);
                butonNoua.current?.focus();
              };
              if (!cuPoza) {
                fa({ actiune: 'scrie', ...c }, 'nou', mesaj, dupa);
                return;
              }
              setLucru({ faza: 'lucreaza', mutare: null });
              cuPoza.imagine.arrayBuffer().then(
                (b) => { fa({ actiune: 'scrie', ...c, poza: baza64(new Uint8Array(b)) }, 'nou', mesaj, dupa); },
                (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), loc: 'nou' }); },
              );
            }} />
        </section>
      ) : null}
      {lista === null ? <SeIncarca text={t('admin.sug.se-incarca')} />
        : !lista.ok ? (
          <EroareCitire text={t('admin.sug.citire', { motiv: lista.motiv })} motiv={lista.motiv} reincarca={reincarca}
            atribute={{ 'data-sug': 'eroare-lista' }} />
        )
          : toate.length === 0 ? <ListaGoala text={t('admin.sug.niciuna')} atribute={{ 'data-sug': 'gol' }} />
            : aratate.length === 0 ? (
              <ListaGoala text={t('admin.sug.niciuna-filtru')} atribute={{ 'data-sug': 'gol-filtru' }}
                ultima={ultimaDecizie ? t('admin.stari.ultima-decizie', { data: dataScurta(ultimaDecizie, limba) }) : null} />
            )
              : (
                <TablaSugestii tabla={tabla(cuMutarea(aratate, mutare))} eu={eu} owner={owner} blocat={blocat} inDrum={mutare?.id ?? null}
                  eroareLa={eroareLa} focus={focus} focusGata={focusGata} deschide={(id) => { deschide(null); setDetaliu(id); }} muta={muta} />
              )}
      {toate.length >= PLAFON_LISTA_SUGESTII ? <p className="admin-slab" data-sug="plafon">{t('admin.sug.plafon', { n: PLAFON_LISTA_SUGESTII })}</p> : null}
      {sDetaliu ? (
        <DetaliuSugestie con={con} s={sDetaliu} eu={eu} owner={owner} poateScrie={poateScrie} deschis={deschis} deschide={deschide}
          ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroareLa(sDetaliu.id)}
          gata={lucru.faza === 'gata' && lucru.id === sDetaliu.id ? lucru.mesaj : null}
          editeaza={(c, versiune) => {
            fa({ actiune: 'editeaza', id: sDetaliu.id, versiune, ...c }, sDetaliu.id,
              (r) => (r.schimbat ? t('admin.sug.salvata', { titlu: titluScris(c.titlu) }) : t('admin.sug.neschimbata')));
          }}
          decide={(stare, nota, versiune) => { decide(sDetaliu, stare, nota, versiune, false); }}
          inchisa={() => {
            const id = sDetaliu.id;
            setDetaliu(null);
            setDeschis(null);
            setLucru((l) => (l.faza === 'eroare' && l.loc === id ? { faza: 'liber' } : l));
            setFocus(id);
          }} />
      ) : null}
      {cereNota && sNota ? (
        <NotaMutarii key={`${sNota.id}:${cereNota.spre}`} s={sNota} spre={cereNota.spre}
          muta={(nota) => { if (sNota.versiune !== null) decide(sNota, cereNota.spre, nota, sNota.versiune, cereNota.dinMeniu); }}
          inchisa={() => {
            setCereNota(null);
            if (cereNota.dinMeniu) setFocus(sNota.id);
          }} />
      ) : null}
    </div>
  );
}
