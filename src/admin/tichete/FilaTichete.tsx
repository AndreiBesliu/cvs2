import { useEffect, useId, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { Bytes, collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore/lite';
import type { Permisiune } from '../../../shared/personal.ts';
import { COLECTIE_POZE, ID_POZA } from '../../../shared/poza.ts';
import { CALE_RASPUNSURI_RAPIDE, rapideDin, TEXT_RAPID_MAX, textRapid, type RaspunsRapid } from '../../../shared/raspunsuriRapide.ts';
import {
  COLECTIE_TICHETE, curataTextTichet, marimeCitita, PLAFON_LISTA_TICHETE, RASPUNS_MAX, STARI_TICHET, type MetaProiectTichet, type RaspunsTichet,
  type StareTichet,
} from '../../../shared/tichete.ts';
import { proiectulTichetului, tichete, type Conexiune } from '../../cloud/conexiune.ts';
import { limba as limbaDeAcum, t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { ceaMaiRecenta } from '../carcasa/date.ts';
import { EroareCitire, LegaturaFila, ListaGoala, SeIncarca, useCatSpatiulDeJos, usePublica, useVedeFila, type Tinta } from '../carcasa/stari.tsx';
import { dataScurta, motivDin, randDin, type Masura, type RandGrup } from '../erori/date.ts';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { alesDupaLista } from '../erori/vedere.ts';
import { PasiDinainte, useNumeActiuni } from '../pasi/Pasi.tsx';
import { useAdresaImaginii } from '../sugestii/Formular.tsx';
import { despacheteazaProiect, eRosu, filtreaza, numeFisierProiect, ordoneaza, proiectVerificat, tichetDin, type Filtru, type Tichet } from './date.ts';
import { eroriSesiune, incapeRapid, insereazaLaCursor, numereFiltru, stareDupaRaspuns, titluTichet } from './vedere.ts';
import '../sugestii/sugestii.css';
import './tichete.css';

/**
 * Fila Tichete (ADR 0116 §13; ADR 0260 §3, felia A.3): raportările clienților, cele mai noi întâi, în stânga, cu filtrul pe
 * stare și numărul fiecăreia; tichetul ales în dreapta, ca o conversație: raportarea clientului (textul, poza planșei la
 * cerere, proiectul atașat, erorile din sesiune cu legătura spre fila Erori, datele aplicației), apoi răspunsurile echipei și,
 * cu `tichete.raspunde` (și owner-ul), câmpul răspunsului, „Răspunde și rezolvă” (sau „… și redeschide”) și starea, prin
 * callable-ul `tichete`, pe versiunea văzută. Citirile trec prin reguli, la cerere („Reîncarcă”); un tichet găsit de căutarea
 * din antet (`tinta`) vine ales.
 */

/**
 * Ciornele răspunsurilor, pe tichet, cât e deschisă pagina: alegerea altui tichet sau un drum în altă filă (la o eroare din
 * sesiune, de pildă) nu pierde ce s-a scris; un răspuns trimis își golește ciorna. Nu trec de o reîncărcare a paginii.
 */
const CIORNE = new Map<string, string>();

/** Unde s-a pornit lucrul (id-ul tichetului): mesajul și eroarea se arată acolo. */
type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza'; readonly loc: string }
  | { readonly faza: 'gata'; readonly mesaj: string; readonly loc: string }
  | { readonly faza: 'eroare'; readonly motiv: string; readonly loc: string };

export function FilaTichete({ con, owner, permisiuni, tinta = null, aducator }: {
  readonly con: Conexiune; readonly owner: boolean; readonly permisiuni: ReadonlySet<Permisiune>; readonly tinta?: Tinta | null;
  readonly aducator?: AducatorDocumentatie;
}): ReactElement {
  const limba = useLimba();
  const nume = useNumeActiuni(aducator, limba);
  const publica = usePublica();
  const poateRaspunde = owner || permisiuni.has('tichete.raspunde');
  const [lista, setLista] = useState<Masura<readonly Tichet[]> | null>(null);
  const [rev, setRev] = useState(0);
  // După o schimbare, lista se citește din nou; până vine, nu pleacă nimic (versiunea văzută ar fi cea veche).
  const [recitire, setRecitire] = useState(false);
  const [filtru, setFiltru] = useState<Filtru>('toate');
  const [ales, setAles] = useState<string | null>(tinta?.id ?? null);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  const [ciorne, setCiorne] = useState<ReadonlyMap<string, string>>(() => new Map(CIORNE));
  const scrie = (id: string, text: string): void => {
    if (text === '') CIORNE.delete(id);
    else CIORNE.set(id, text);
    setCiorne(new Map(CIORNE));
  };

  useEffect(() => {
    let viu = true;
    getDocs(query(collection(con.db, COLECTIE_TICHETE), orderBy('creatLa', 'desc'), limit(PLAFON_LISTA_TICHETE))).then(
      (s) => {
        if (!viu) return;
        const randuri = ordoneaza(s.docs.map((d) => tichetDin(d.id, d.data())));
        setLista({ ok: true, valoare: randuri });
        setRecitire(false);
        // Căutarea din antet găsește tichetul după text, adresă sau id (ADR 0260 §1).
        publica('tichete', randuri.map((x) => ({ id: x.id, text: x.text.slice(0, 160), detaliu: x.autorEmail ?? '' })));
      },
      (e: unknown) => {
        if (!viu) return;
        setLista({ ok: false, motiv: motivDin(e) });
        setRecitire(false);
      },
    );
    return () => { viu = false; };
  }, [con, rev, publica]);

  // Răspunsurile rapide (ADR 0261 §6): o citire la deschidere și la „Reîncarcă”, doar pentru cine poate răspunde (regula le
  // dă doar lor). Căzută, câmpul merge mai departe, iar locul butoanelor spune motivul.
  const [rapide, setRapide] = useState<Masura<readonly RaspunsRapid[]> | null>(null);
  const [revRapide, setRevRapide] = useState(0);
  useEffect(() => {
    if (!poateRaspunde) return undefined;
    let viu = true;
    getDoc(doc(con.db, CALE_RASPUNSURI_RAPIDE.colectie, CALE_RASPUNSURI_RAPIDE.id)).then(
      (s) => { if (viu) setRapide({ ok: true, valoare: rapideDin(s.data()).lista }); },
      (e: unknown) => { if (viu) setRapide({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, poateRaspunde, revRapide]);

  const reincarca = (): void => {
    setRecitire(true);
    setRev((n) => n + 1);
  };

  const raspunde = (x: Tichet, text: string, apoi: StareTichet | null): void => {
    const versiune = x.versiune;
    if (versiune === null) return;
    setLucru({ faza: 'lucreaza', loc: x.id });
    void (async () => {
      let r: RaspunsTichet;
      try {
        r = await tichete(con, { actiune: 'raspunde', id: x.id, versiune, text });
      } catch (e: unknown) {
        setLucru({ faza: 'eroare', motiv: motivDin(e), loc: x.id });
        return;
      }
      scrie(x.id, '');
      if (apoi !== null) {
        try {
          // Starea, pe versiunea întoarsă de răspuns: nimeni altcineva n-a văzut-o între timp.
          await tichete(con, { actiune: 'stare', id: x.id, versiune: r.versiune, stare: apoi });
        } catch (e: unknown) {
          setLucru({ faza: 'eroare', motiv: t('admin.tic.trimis-fara-stare', { motiv: motivDin(e) }), loc: x.id });
          reincarca();
          return;
        }
      }
      setLucru({ faza: 'gata', loc: x.id, mesaj: apoi === null ? t('admin.tic.trimis') : t('admin.tic.trimis-si', { stare: t(`admin.tic.stare.${apoi}`) }) });
      reincarca();
    })();
  };

  const schimbaStarea = (x: Tichet, stare: StareTichet): void => {
    const versiune = x.versiune;
    if (versiune === null) return;
    setLucru({ faza: 'lucreaza', loc: x.id });
    tichete(con, { actiune: 'stare', id: x.id, versiune, stare }).then((r) => {
      setLucru({ faza: 'gata', loc: x.id, mesaj: r.schimbat ? t('admin.tic.stare-schimbata', { stare: t(`admin.tic.stare.${stare}`) }) : t('admin.tic.neschimbat') });
      reincarca();
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), loc: x.id }); });
  };

  const toate = lista?.ok ? lista.valoare : [];
  const numere = numereFiltru(toate);
  const aratate = filtreaza(toate, filtru);
  const alesAcum = alesDupaLista(ales, aratate);
  // Ales e cel văzut: dacă filtrul (sau un răspuns care îi schimbă starea) îl ascunde, alegerea trece pe primul arătat și
  // rămâne acolo. Ajustarea se face în randare, ca în fila Erori.
  if (lista?.ok && alesAcum !== ales) setAles(alesAcum);
  const tichet = aratate.find((x) => x.id === alesAcum) ?? null;
  const ultimulRezolvat = ceaMaiRecenta(toate.filter((x) => x.stare === 'rezolvat').map((x) => x.rezolvatLa));
  const acum = Date.now();
  const ocupat = lucru.faza === 'lucreaza' || recitire;
  // Mesajul unui lucru terminat pe alt tichet (unul care a ieșit din filtru) stă deasupra listei.
  const mesajSus = lucru.faza === 'gata' && lucru.loc !== tichet?.id ? lucru.mesaj : null;

  return (
    <div className="admin-erori admin-tichete sug">
      <div className="admin-erori-cap">
        <h2 className="tic-titlu-fila">{t('admin.tic.titlu')}</h2>
        <div className="admin-segmente" role="group" aria-label={t('admin.tic.stare')}>
          {(['toate', ...STARI_TICHET] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filtru === f} data-filtru-tic={f} onClick={() => { setFiltru(f); }}>
              {t('admin.tic.filtru', { nume: t(f === 'toate' ? 'admin.tic.filtru.toate' : `admin.tic.stare.${f}`), n: numere[f] })}
            </button>
          ))}
        </div>
        <button type="button" data-tic="reincarca" onClick={() => { reincarca(); setRevRapide((n) => n + 1); }}>{t('admin.tic.reincarca')}</button>
      </div>
      <p className="admin-slab tic-text-fila">{t('admin.tic.text')}</p>
      {mesajSus ? <p className="admin-mesaj" role="status" data-tic="gata">{mesajSus}</p> : null}
      {lista === null ? <SeIncarca text={t('admin.tic.se-incarca')} />
        : !lista.ok ? (
          <EroareCitire text={t('admin.tic.citire', { motiv: lista.motiv })} motiv={lista.motiv} reincarca={reincarca}
            atribute={{ 'data-tic': 'eroare-lista' }} />
        )
          : toate.length === 0 ? <ListaGoala text={t('admin.tic.niciunul')} atribute={{ 'data-tic': 'gol' }} />
            : aratate.length === 0 ? (
              <ListaGoala text={t('admin.tic.niciunul-filtru')} atribute={{ 'data-tic': 'gol-filtru' }}
                ultima={ultimulRezolvat ? t('admin.stari.ultimul-rezolvat', { data: dataScurta(ultimulRezolvat, limba) }) : null} />
            )
              : (
                <div className="admin-erori-corp">
                  <ul className="admin-erori-lista tic-lista" data-tic="lista">
                    {aratate.map((x) => (
                      <RandTichet key={x.id} x={x} ales={x.id === alesAcum} limba={limba} acum={acum} alege={() => { setAles(x.id); }} />
                    ))}
                  </ul>
                  {tichet ? (
                    <DetaliuTichet key={tichet.id} con={con} x={tichet} nume={nume} poateRaspunde={poateRaspunde} ocupat={ocupat} limba={limba} acum={acum}
                      lucru={lucru.faza !== 'liber' && lucru.loc === tichet.id ? lucru : null}
                      compune={poateRaspunde ? (
                        <Raspuns x={tichet} text={ciorne.get(tichet.id) ?? ''} scrie={(s) => { scrie(tichet.id, s); }} ocupat={ocupat}
                          faraAppCheck={con.appCheck === 'oprit'} raspunde={raspunde} rapide={rapide} owner={owner} />
                      ) : null}
                      schimbaStarea={schimbaStarea} />
                  ) : null}
                </div>
              )}
      {toate.length >= PLAFON_LISTA_TICHETE ? <p className="admin-slab" data-tic="plafon">{t('admin.tic.plafon', { n: PLAFON_LISTA_TICHETE })}</p> : null}
    </div>
  );
}

/** Un rând al listei: titlul (din text), starea, felul, când și cine, vârsta roșie, câte răspunsuri. */
function RandTichet({ x, ales, limba, acum, alege }: {
  readonly x: Tichet; readonly ales: boolean; readonly limba: string; readonly acum: number; readonly alege: () => void;
}): ReactElement {
  const ore = x.creatLa ? Math.floor((acum - x.creatLa.getTime()) / 3_600_000) : 0;
  return (
    <li data-tichet={x.id} data-stare={x.stare ?? 'necunoscuta'} data-ales={ales}>
      <button type="button" aria-current={ales ? 'true' : undefined} onClick={alege}>
        <span className="tic-titlu" data-tic="titlu">{titluTichet(x.text) || t('admin.tic.fara-text')}</span>
        <span className="admin-erori-meta">
          <CipStare stare={x.stare} />
          {x.fel ? <span className="admin-cip">{t(`admin.tic.fel.${x.fel}`)}</span> : null}
          <span>{dataScurta(x.creatLa, limba)}</span>
          {x.raspunsuri.length > 0 ? <span>{t('admin.tic.raspunsuri', { n: x.raspunsuri.length })}</span> : null}
          {eRosu(x, acum) ? <span className="tic-rosu" data-tic="fara-raspuns">{t('admin.tic.fara-raspuns', { ore })}</span> : null}
        </span>
      </button>
    </li>
  );
}

function CipStare({ stare }: { readonly stare: StareTichet | null }): ReactElement {
  return <span className="admin-cip tic-cip" data-tic-stare={stare ?? 'necunoscuta'}>{t(`admin.tic.stare.${stare ?? 'necunoscuta'}`)}</span>;
}

/**
 * Tichetul ales, ca o conversație: capul (titlul, starea, felul, schimbarea stării), raportarea clientului, răspunsurile
 * echipei, apoi câmpul răspunsului (doar cu `tichete.raspunde`). Lipit sus la derulare, cu conversația derulată în el.
 */
function DetaliuTichet({ con, x, poateRaspunde, ocupat, limba, acum, lucru, compune, schimbaStarea, nume }: {
  readonly con: Conexiune; readonly x: Tichet; readonly nume: ReadonlyMap<string, string>; readonly poateRaspunde: boolean; readonly ocupat: boolean; readonly limba: string; readonly acum: number;
  readonly lucru: Exclude<Lucru, { faza: 'liber' }> | null; readonly compune: ReactNode; readonly schimbaStarea: (x: Tichet, s: StareTichet) => void;
}): ReactElement {
  const ore = x.creatLa ? Math.floor((acum - x.creatLa.getTime()) / 3_600_000) : 0;
  const a = x.aplicatia;
  const faraAppCheck = con.appCheck === 'oprit';
  const stareNoua: StareTichet = x.stare === 'rezolvat' ? 'deschis' : 'rezolvat';
  const catSpatiul = useCatSpatiulDeJos();
  return (
    <section ref={catSpatiul} className="admin-erori-detaliu tic-detaliu" data-tic="detaliu" data-tic-ales={x.id} aria-labelledby="tichet-ales">
      <div className="admin-erori-detaliu-cap">
        <h3 id="tichet-ales" className="tic-titlu-detaliu">{titluTichet(x.text) || t('admin.tic.fara-text')}</h3>
        {poateRaspunde && x.stare !== null ? (
          <button type="button" disabled={ocupat || faraAppCheck || x.versiune === null} data-tic={stareNoua === 'rezolvat' ? 'rezolva' : 'redeschide'}
            onClick={() => { schimbaStarea(x, stareNoua); }}>
            {t(stareNoua === 'rezolvat' ? 'admin.tic.rezolva' : 'admin.tic.redeschide')}
          </button>
        ) : null}
      </div>
      <p className="admin-erori-meta tic-cap-meta">
        <CipStare stare={x.stare} />
        {x.fel ? <span className="admin-cip" data-tic="fel">{t(`admin.tic.fel.${x.fel}`)}</span> : null}
        <span>{x.autorEmail ?? '—'}</span>
        <span>{dataScurta(x.creatLa, limba)}</span>
        {eRosu(x, acum) ? <span className="tic-rosu" data-tic="fara-raspuns">{t('admin.tic.fara-raspuns', { ore })}</span> : null}
      </p>
      {lucru?.faza === 'gata' ? <p className="admin-mesaj" role="status" data-tic="gata">{lucru.mesaj}</p> : null}
      {lucru?.faza === 'lucreaza' ? <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.tic.lucreaza')}</p> : null}
      {lucru?.faza === 'eroare' ? <p className="admin-eroare" role="alert" data-tic="eroare">{t('admin.tic.esec', { motiv: lucru.motiv })}</p> : null}
      <ol className="tic-conversatia" data-tic="conversatia" aria-label={t('admin.tic.conversatia')}>
        <li className="tic-mesaj" data-de="client" data-tic="raportarea">
          <p className="admin-slab tic-mesaj-cap">{t('admin.tic.raportarea', { cine: x.autorEmail ?? '—', data: dataScurta(x.creatLa, limba) })}</p>
          <p className="sug-text" data-tic="text">{x.text}</p>
          {x.poza ? <PozaTichetului con={con} x={x} /> : null}
          {x.proiect ? <ProiectulTichetului con={con} id={x.id} meta={x.proiect} /> : null}
          <ErorileSesiunii con={con} amprente={x.amprente} />
          {x.pasi.length > 0 ? <PasiDinainte pasi={x.pasi} nume={nume} titlu={t('admin.tic.pasi', { n: x.pasi.length })} nota={t('admin.tic.pasi.nota')} /> : null}
          {a ? (
            <p className="admin-slab tic-aplicatia" data-tic="aplicatia">
              {t('admin.tic.aplicatia', { versiune: a.versiune, instanta: a.instanta, limba: a.limba, plan: a.plan ?? t('admin.tic.fara-plan') })}
              <br />
              {t('admin.tic.browser', { browser: a.browser })}
            </p>
          ) : null}
        </li>
        {x.raspunsuri.map((r, k) => (
          <li key={k} className="tic-mesaj" data-de="echipa" data-tic="raspuns">
            <p className="admin-slab tic-mesaj-cap">{t('admin.tic.raspunsul', { cine: r.deEmail ?? '—', data: dataScurta(r.la, limba) })}</p>
            <p className="sug-text">{r.text}</p>
          </li>
        ))}
      </ol>
      {poateRaspunde ? compune : <p className="admin-slab" data-tic="doar-citire">{t('admin.tic.doar-citire')}</p>}
    </section>
  );
}

/**
 * Erorile din sesiunea raportării (amprentele, ADR 0116 §11): cu fila Erori (rolul o vede, deci și citește `errorLogs`),
 * fiecare grup se citește o dată, la alegerea tichetului, și arată mesajul, starea și legătura spre el în fila Erori (ADR 0260
 * §3); fără, doar amprentele. Un grup care nu mai e în jurnal o spune.
 */
function ErorileSesiunii({ con, amprente }: { readonly con: Conexiune; readonly amprente: readonly string[] }): ReactElement {
  const poateCiti = useVedeFila('erori');
  const [citite, setCitite] = useState<Masura<ReadonlyMap<string, RandGrup | null>> | null>(null);
  const cheie = amprente.join(',');
  useEffect(() => {
    if (!poateCiti || cheie === '') return undefined;
    let viu = true;
    Promise.all(cheie.split(',').map((a) => getDoc(doc(con.db, 'errorLogs', a)).then((d) => [a, d.exists() ? randDin(d.id, d.data()) : null] as const))).then(
      (perechi) => { if (viu) setCitite({ ok: true, valoare: new Map(perechi) }); },
      (e: unknown) => { if (viu) setCitite({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, cheie, poateCiti]);

  if (amprente.length === 0) return <p className="admin-slab tic-erori" data-tic="amprente">{t('admin.tic.fara-amprente')}</p>;
  const doarAmprente = <p className="admin-slab tic-amprente">{amprente.join(', ')}</p>;
  return (
    <div className="tic-erori" data-tic="amprente">
      <p className="admin-slab">{t('admin.tic.erori-sesiune', { n: amprente.length })}</p>
      {!poateCiti ? doarAmprente
        : citite === null ? <p className="admin-slab" aria-busy="true">{t('admin.tic.erori-se-citesc')}</p>
          : !citite.ok ? (
            <>
              <p className="admin-eroare" role="alert" data-tic="erori-citire">{t('admin.tic.erori-citire', { motiv: citite.motiv })}</p>
              {doarAmprente}
            </>
          )
            : (
              <ul className="tic-erori-lista">
                {eroriSesiune(amprente, citite.valoare).map((e) => (
                  <li key={e.amprenta} data-amprenta={e.amprenta}>
                    {e.grup ? (
                      <>
                        <span className="tic-eroare-mesaj">{e.grup.mesaj || e.amprenta}</span>
                        {e.grup.rezolvat ? <span className="admin-cip" data-stare="bine">{t('admin.erori.rezolvat')}</span> : null}
                        <LegaturaFila fila="erori" tinta={{ id: e.amprenta, rezolvat: e.grup.rezolvat }} data-tic="spre-erori">
                          {t('admin.tic.spre-erori')}
                        </LegaturaFila>
                      </>
                    ) : (
                      <>
                        <span className="tic-amprente">{e.amprenta}</span>
                        <span className="admin-slab" data-tic="eroare-lipsa">{t('admin.tic.eroare-lipsa')}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
    </div>
  );
}

/**
 * Răspunsul la tichet: textul (ciorna tichetului), „Răspunde” și „Răspunde și rezolvă” (sau „… și redeschide”, la unul
 * rezolvat). Pleacă pe versiunea tichetului arătat acum (lista se citește din nou după fiecare schimbare, iar cât se citește,
 * nimic nu pleacă).
 */
function Raspuns({ x, text, scrie, ocupat, faraAppCheck, raspunde, rapide, owner }: {
  readonly x: Tichet; readonly text: string; readonly scrie: (text: string) => void; readonly ocupat: boolean; readonly faraAppCheck: boolean;
  readonly raspunde: (x: Tichet, text: string, apoi: StareTichet | null) => void; readonly rapide: Masura<readonly RaspunsRapid[]> | null;
  readonly owner: boolean;
}): ReactElement {
  const id = useId();
  const camp = useRef<HTMLTextAreaElement>(null);
  const curat = curataTextTichet(text, RASPUNS_MAX);
  // Un răspuns rapid intră la cursor (sau în locul selecției), fără să șteargă restul; apoi câmpul primește focusul, cu
  // cursorul după bucata pusă (ADR 0261 §5). Cât de mare poate fi câmpul: cât un răspuns.
  const pune = (bucata: string): void => {
    const el = camp.current;
    const n = insereazaLaCursor(text, el?.selectionStart ?? text.length, el?.selectionEnd ?? text.length, bucata);
    if (n.text.length > RASPUNS_MAX) return;
    scrie(n.text);
    requestAnimationFrame(() => {
      camp.current?.focus();
      camp.current?.setSelectionRange(n.cursor, n.cursor);
    });
  };
  const oprit = ocupat || faraAppCheck || x.versiune === null || curat === null;
  const apoi = stareDupaRaspuns(x.stare);
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (!oprit) raspunde(x, text, null);
  };
  return (
    <form className="tic-compune" onSubmit={trimite} data-tic="formular-raspuns">
      <RaspunsuriRapide rapide={rapide} owner={owner} text={text} limba={x.aplicatia?.limba ?? null} pune={pune} />
      <label htmlFor={id}>{t('admin.tic.raspunde')}</label>
      <textarea ref={camp} id={id} rows={3} maxLength={RASPUNS_MAX} value={text} placeholder={t('admin.tic.raspuns-loc')} data-tic="raspuns-text"
        onChange={(e) => { scrie(e.target.value); }} />
      <div className="tic-compune-jos">
        <p className="admin-slab">{faraAppCheck ? t('admin.erori.fara-appcheck') : t('admin.tic.raspuns-ajutor')}</p>
        {apoi ? (
          <button type="button" data-tic="trimite-si" disabled={oprit} onClick={() => { if (!oprit) raspunde(x, text, apoi); }}>
            {t(apoi === 'rezolvat' ? 'admin.tic.trimite-rezolva' : 'admin.tic.trimite-redeschide')}
          </button>
        ) : null}
        <button type="submit" className="principal" data-tic="trimite" disabled={oprit}>{t('admin.tic.trimite')}</button>
      </div>
    </form>
  );
}

/**
 * Butoanele răspunsurilor rapide (ADR 0261 §5), deasupra câmpului: câte unul pe etichetă, cu textul din limba raportării la
 * hover; unul al cărui text nu mai încape în câmp se oprește, cu motivul. Owner-ul are lângă ele legătura spre Setări, unde
 * le scrie (și, cât lista e goală, vorba că acolo se scriu). O citire căzută spune motivul; câmpul merge mai departe.
 */
function RaspunsuriRapide({ rapide, owner, text, limba, pune }: {
  readonly rapide: Masura<readonly RaspunsRapid[]> | null; readonly owner: boolean; readonly text: string; readonly limba: string | null;
  readonly pune: (bucata: string) => void;
}): ReactElement | null {
  if (rapide === null) return null;
  if (!rapide.ok) return <p className="admin-slab tic-rapide-eroare" data-tic="rapide-eroare">{t('admin.tic.rapide-citire', { motiv: rapide.motiv })}</p>;
  if (rapide.valoare.length === 0 && !owner) return null;
  return (
    <div className="tic-rapide" data-tic="rapide">
      <div className="tic-rapide-cap">
        <span className="admin-slab">{t('admin.tic.rapide')}</span>
        {owner ? <LegaturaFila fila="setari" className="tic-rapide-setari" data-tic="rapide-setari">{t('admin.tic.rapide-schimba')}</LegaturaFila> : null}
      </div>
      {rapide.valoare.length === 0 ? <p className="admin-slab" data-tic="rapide-gol">{t('admin.tic.rapide-niciunul')}</p> : (
        <div className="tic-rapide-butoane">
          {rapide.valoare.map((r, k) => {
            const bucata = textRapid(r, limba);
            const incape = incapeRapid(text, bucata, RASPUNS_MAX);
            return (
              <button key={`${k}:${r.eticheta}`} type="button" data-rapid={r.eticheta} disabled={!incape}
                title={incape ? bucata : t('admin.tic.rapide-nu-incape', { max: TEXT_RAPID_MAX })} onClick={() => { pune(bucata); }}>
                {r.eticheta}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Descarcă octeții exacți ai proiectului, ca fișier JSON. */
function salveaza(octeti: Uint8Array<ArrayBuffer>, nume: string): void {
  const url = URL.createObjectURL(new Blob([octeti], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}

/**
 * Proiectul atașat tichetului (ADR 0116 §12, felia 15.B↑b): adus la cerere prin callable (din Storage nu citește nimeni din
 * client), despachetat și verificat față de mărimea și amprenta din tichet, apoi descărcat ca JSON-ul canonic al proiectului.
 */
function ProiectulTichetului({ con, id, meta }: { readonly con: Conexiune; readonly id: string; readonly meta: MetaProiectTichet }): ReactElement {
  const [stare, setStare] = useState<{ readonly faza: 'liber' | 'lucreaza' | 'gata' } | { readonly faza: 'eroare'; readonly motiv: string }>({ faza: 'liber' });
  const descarca = (): void => {
    setStare({ faza: 'lucreaza' });
    (async () => {
      const r = await proiectulTichetului(con, id);
      const json = await despacheteazaProiect(r.proiect);
      if (!(await proiectVerificat(json, meta))) throw new Error(t('admin.tic.proiect-amprenta'));
      salveaza(json, numeFisierProiect(id));
      setStare({ faza: 'gata' });
    })().catch((e: unknown) => { setStare({ faza: 'eroare', motiv: motivDin(e) }); });
  };
  return (
    <div className="sug-poza-rand tic-proiect">
      <button type="button" data-tic="descarca-proiect" disabled={stare.faza === 'lucreaza' || con.appCheck === 'oprit'} onClick={descarca}>
        {t('admin.tic.proiect-descarca', { marime: marimeCitita(meta.marime, limbaDeAcum()), schema: meta.schema })}
      </button>
      {stare.faza === 'lucreaza' ? <p className="admin-mesaj" aria-busy="true">{t('admin.tic.proiect-se-descarca')}</p> : null}
      {stare.faza === 'gata' ? <p className="admin-slab" role="status" data-tic="proiect-descarcat">{t('admin.tic.proiect-descarcat', { nume: numeFisierProiect(id) })}</p> : null}
      {stare.faza === 'eroare' ? <p className="admin-eroare" role="alert" data-tic="proiect-eroare">{t('admin.tic.proiect-eroare', { motiv: stare.motiv })}</p> : null}
    </div>
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
