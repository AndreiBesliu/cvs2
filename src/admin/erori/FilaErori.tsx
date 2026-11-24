import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { collection, doc, getCount, getDoc, getDocs, limit, orderBy, query, where, type Query } from 'firebase/firestore/lite';
import type { CatalogActiuni } from '../../../shared/documentatie.ts';
import type { PasEroare } from '../../../shared/pasiEroare.ts';
import { marcheazaEroarea, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { rezolvareDin } from '../carcasa/date.ts';
import { EroareCitire, ListaGoala, SeIncarca, useCatSpatiulDeJos, usePublica, type Tinta } from '../carcasa/stari.tsx';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { aparitieDin, dataScurta, laPlafonOameni, motivDin, randDin, textInainte, type Aparitie, type Masura, type RandGrup } from './date.ts';
import { alesDupaLista, aparitiiPeZile, baraGrafic, cuTinta, filtreazaSursa, SURSE, type FiltruSursa } from './vedere.ts';

/** Câte grupuri arată fila; peste, ADR 0040 („Se redeschide dacă”) cere paginarea. */
export const PLAFON_GRUPURI = 100;
const PLAFON_APARITII = 20;

type Stare = 'nerezolvate' | 'toate';

const numara = (q: Query): Promise<number | null> => getCount(q).then((s) => s.data().count, () => null);

/**
 * Fila Erori (ADR 0040 §4; ADR 0260 §2, felia A.2): grupurile din `errorLogs`, cele mai recente întâi, citite la cerere
 * prin reguli, în stânga; grupul ales în dreapta, fără să împingă lista: ultima apariție, aparițiile pe 14 zile (graficul,
 * din ultimele 20 citite), stiva, ultimele apariții și „Rezolvat” / „Redeschide” prin callable. Filtrul pe stare, cu
 * numărul fiecăreia, și filtrul pe sursă (browser / server, pe ce s-a citit). Un grup găsit de căutarea din antet (`tinta`)
 * vine ales, cu filtrul „Toate” dacă e rezolvat (ADR 0260 §1). Unul cerut dintr-un tichet (amprenta unei erori din sesiune,
 * felia A.3) poate fi mai vechi decât cele mai recente 100: atunci se aduce singur și stă primul în listă.
 */
export function FilaErori({ con, poateMarca, tinta = null, aducator }: {
  readonly con: Conexiune; readonly poateMarca: boolean; readonly tinta?: Tinta | null; readonly aducator?: AducatorDocumentatie;
}): ReactElement {
  const l = useLimba();
  const nume = useNumeActiuni(aducator, l);
  const publica = usePublica();
  const [filtru, setFiltru] = useState<Stare>(tinta?.rezolvat === true ? 'toate' : 'nerezolvate');
  const [sursa, setSursa] = useState<FiltruSursa>('toate');
  const [lista, setLista] = useState<Masura<readonly RandGrup[]> | null>(null);
  // Fără nicio eroare nerezolvată: când s-a rezolvat ultima (ideea 76).
  const [ultima, setUltima] = useState<Date | null>(null);
  const [ales, setAles] = useState<string | null>(tinta?.id ?? null);
  const [numere, setNumere] = useState<Readonly<Record<Stare, number | null>>>({ nerezolvate: null, toate: null });
  const [rev, setRev] = useState(0);
  const idTinta = tinta?.id ?? null;

  useEffect(() => {
    let viu = true;
    setLista(null);
    const col = collection(con.db, 'errorLogs');
    const q = filtru === 'nerezolvate'
      ? query(col, where('rezolvat', '==', false), orderBy('ultimaData', 'desc'), limit(PLAFON_GRUPURI))
      : query(col, orderBy('ultimaData', 'desc'), limit(PLAFON_GRUPURI));
    getDocs(q).then(
      async (s) => {
        const citite = s.docs.map((d) => randDin(d.id, d.data()));
        // Grupul cerut din altă filă, dacă nu e între cele citite: adus singur (o citire căzută îl lasă deoparte).
        const adus = idTinta === null || citite.some((g) => g.id === idTinta) ? null
          : await getDoc(doc(col, idTinta)).then((d) => (d.exists() ? randDin(d.id, d.data()) : null), () => null);
        const randuri = cuTinta(citite, adus, filtru === 'nerezolvate');
        // Indexul simplu al lui `marcatLa`, descendent: cea mai recentă marcare (fără nerezolvate, ea a fost o rezolvare).
        const u = randuri.length > 0 || filtru !== 'nerezolvate' ? null
          : await getDocs(query(col, orderBy('marcatLa', 'desc'), limit(1))).then((x) => (x.docs[0] ? rezolvareDin(x.docs[0].data()) : null), () => null);
        if (!viu) return;
        setUltima(u);
        setLista({ ok: true, valoare: randuri });
        publica('erori', randuri.map((g) => ({ id: g.id, text: g.mesaj, detaliu: g.tip, rezolvat: g.rezolvat })));
      },
      (e: unknown) => { if (viu) setLista({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, filtru, rev, publica, idTinta]);

  // Numerele filtrului (schițele): numărători pe indexul simplu al lui `rezolvat` și pe colecție, la fiecare citire.
  useEffect(() => {
    let viu = true;
    const col = collection(con.db, 'errorLogs');
    void Promise.all([numara(query(col, where('rezolvat', '==', false))), numara(query(col))]).then(([nerezolvate, toate]) => {
      if (viu) setNumere({ nerezolvate, toate });
    });
    return () => { viu = false; };
  }, [con, rev]);

  const aratate = lista?.ok ? filtreazaSursa(lista.valoare, sursa) : [];
  const alesAcum = alesDupaLista(ales, aratate);
  // Aleasă e cea văzută: dacă un filtru o ascunde, alegerea trece pe prima arătată și rămâne acolo (nu sare înapoi
  // când filtrul se ridică). Ajustarea se face în randare, nu într-un efect (fără o randare cu starea veche).
  if (lista?.ok && alesAcum !== ales) setAles(alesAcum);
  const grup = aratate.find((g) => g.id === alesAcum) ?? null;

  return (
    <div className="admin-erori">
      <div className="admin-erori-cap">
        <div className="admin-segmente" role="group" aria-label={t('admin.erori.stare')}>
          {(['nerezolvate', 'toate'] as const).map((f) => {
            const n = numere[f];
            const nume = t(f === 'nerezolvate' ? 'admin.erori.nerezolvate' : 'admin.erori.toate');
            return (
              <button key={f} type="button" aria-pressed={filtru === f} data-filtru={f} onClick={() => { setFiltru(f); }}>
                {n === null ? nume : t('admin.erori.cu-numar', { nume, n })}
              </button>
            );
          })}
        </div>
        <div className="admin-segmente" role="group" aria-label={t('admin.erori.sursa')}>
          {SURSE.map((s) => (
            <button key={s} type="button" aria-pressed={sursa === s} data-filtru-sursa={s} onClick={() => { setSursa(s); }}>
              {t(s === 'toate' ? 'admin.erori.toate' : s === 'server' ? 'admin.erori.sursa.server' : 'admin.erori.sursa.client')}
            </button>
          ))}
        </div>
        <button type="button" data-admin="reincarca" onClick={() => { setRev((r) => r + 1); }}>{t('admin.erori.reincarca')}</button>
      </div>
      {lista === null ? <SeIncarca text={t('admin.erori.se-incarca')} />
        : !lista.ok ? (
          <EroareCitire text={t('admin.erori.citire', { motiv: lista.motiv })} motiv={lista.motiv} reincarca={() => { setRev((r) => r + 1); }}
            atribute={{ 'data-admin': 'eroare-lista' }} />
        )
          : lista.valoare.length === 0 ? (
            <ListaGoala text={t('admin.erori.niciuna')} atribute={{ 'data-admin': 'gol' }}
              ultima={ultima ? t('admin.stari.ultima-rezolvata', { data: dataScurta(ultima, l) }) : null} />
          )
            : aratate.length === 0 ? <ListaGoala text={t('admin.erori.niciuna-sursa')} atribute={{ 'data-admin': 'gol-sursa' }} />
              : (
                <div className="admin-erori-corp">
                  <ul className="admin-erori-lista" data-admin="lista-erori">
                    {aratate.map((g) => (
                      <li key={g.id} data-grup={g.id} data-rezolvat={g.rezolvat} data-ales={g.id === alesAcum}>
                        <button type="button" aria-current={g.id === alesAcum ? 'true' : undefined} onClick={() => { setAles(g.id); }}>
                          <span className="admin-grup-mesaj">{g.mesaj}</span>
                          <span className="admin-erori-meta">
                            <span className="admin-cip" data-sursa={g.sursa}>{t(g.sursa === 'server' ? 'admin.erori.sursa.server' : 'admin.erori.sursa.client')}</span>
                            <span>
                              {g.oameni === null ? '?' : laPlafonOameni(g.oameni) ? t('admin.erori.oameni-plafon') : t('admin.erori.oameni', { n: g.oameni })}
                              {' · '}
                              {g.numar === null ? '?' : t('admin.erori.numar', { n: g.numar })}
                              {' · '}
                              {t('admin.erori.ultima', { data: dataScurta(g.ultimaData, l) })}
                            </span>
                            {g.rezolvat ? <span className="admin-cip" data-stare="bine">{t('admin.erori.rezolvat')}</span> : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {grup ? <DetaliuGrup key={grup.id} con={con} grup={grup} poateMarca={poateMarca} nume={nume} marcat={() => { setRev((r) => r + 1); }} /> : null}
                </div>
              )}
    </div>
  );
}

/**
 * Numele acțiunilor și ale uneltelor, din catalogul generat la build (ca în fila Utilizare), pentru pașii dinaintea unei
 * erori; până vine (sau fără el), pașii arată id-ul.
 */
function useNumeActiuni(aducator: AducatorDocumentatie | undefined, l: string): ReadonlyMap<string, string> {
  const [catalog, setCatalog] = useState<CatalogActiuni | null>(null);
  useEffect(() => {
    if (!aducator) return undefined;
    let viu = true;
    aducator.actiuni().then((c) => { if (viu) setCatalog(c); }, () => undefined);
    return () => { viu = false; };
  }, [aducator]);
  return useMemo(() => new Map((catalog ? [...catalog.actiuni, ...catalog.unelte] : []).map((a) => [a.id, l === 'en' ? a.en : a.ro])), [catalog, l]);
}

/** Pașii dinaintea erorii (ADR 0262 §4, felia A.11a): cât înainte, ce (cu numele, unde îl știm), felul, rezultatul altul decât „ok”. */
function PasiDinainte({ pasi, nume }: { readonly pasi: readonly PasEroare[]; readonly nume: ReadonlyMap<string, string> }): ReactElement {
  const l = useLimba();
  return (
    <details open data-admin="pasi">
      <summary>{t('admin.erori.pasi', { n: pasi.length })} <span className="admin-slab">{t('admin.erori.pasi.nota')}</span></summary>
      <ol className="admin-pasi">
        {pasi.map((p, i) => (
          <li key={i} data-pas={p.fel} data-pas-id={p.id}>
            <span className="admin-slab">{textInainte(p.ms, l)}</span>{' '}
            {(p.fel === 'actiune' || p.fel === 'unealta') && nume.has(p.id) ? <span title={p.id}>{nume.get(p.id)}</span> : <code>{p.id}</code>}
            <span className="admin-slab"> · {t(`admin.erori.pas.${p.fel}`)}</span>
            {p.rez !== undefined && p.rez !== 'ok' ? <> · <code>{p.rez}</code></> : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

function DetaliiAparitie({ a, nume }: { readonly a: Aparitie; readonly nume: ReadonlyMap<string, string> }): ReactElement {
  return (
    <div className="admin-aparitie">
      <p>{t('admin.erori.build', { build: a.build || '—', instanta: a.instanta || '—' })}</p>
      {a.adresa ? <p>{t('admin.erori.adresa', { adresa: a.adresa })}</p> : null}
      {a.browser ? <p>{t('admin.erori.browser', { browser: a.browser })}</p> : null}
      <p>{a.uid ? t('admin.erori.uid', { uid: a.uid }) : t('admin.erori.fara-cont')}</p>
      {a.context ? <p>{t('admin.erori.context', { context: a.context })}</p> : null}
      {a.pasi.length > 0 ? <PasiDinainte pasi={a.pasi} nume={nume} /> : null}
      {a.stiva ? <details><summary>{t('admin.erori.stiva')}</summary><pre>{a.stiva}</pre></details> : null}
    </div>
  );
}

const INALTIME_GRAFIC = 48;

/**
 * Aparițiile pe 14 zile (ADR 0260 §2), din aparițiile citite: o bară pe zi (baza pe axă, capătul rotunjit), în culoarea de
 * accent; fiecare bară spune ziua și numărul la hover, iar eticheta graficului, totalul. Fără bibliotecă. Barele se
 * desenează la lățimea măsurată a graficului (fără scalare, deci colțurile rămân rotunde); fără nicio apariție în cele
 * 14 zile, o propoziție în locul axei goale.
 */
function GraficAparitii({ aparitii }: { readonly aparitii: readonly Aparitie[] }): ReactElement {
  const l = useLimba();
  const [latime, setLatime] = useState(280);
  const masoara = useCallback((el: SVGSVGElement | null) => {
    if (!el) return undefined;
    const o = new ResizeObserver(([e]) => {
      const w = Math.round(e?.contentRect.width ?? 0);
      if (w > 0) setLatime(w);
    });
    o.observe(el);
    return () => { o.disconnect(); };
  }, []);
  const acum = new Date();
  const zile = aparitiiPeZile(aparitii.map((a) => a.cand), acum);
  const total = zile.reduce((s, x) => s + x, 0);
  const ziua = (k: number): string => new Intl.DateTimeFormat(l, { day: '2-digit', month: '2-digit' })
    .format(new Date(acum.getFullYear(), acum.getMonth(), acum.getDate() - (zile.length - 1 - k)));
  return (
    <figure className="admin-grafic">
      <figcaption className="admin-slab">{t('admin.erori.grafic')}</figcaption>
      {total === 0 ? <p className="admin-slab" data-grafic="gol">{t('admin.erori.grafic-gol')}</p> : (
        <>
          <svg ref={masoara} viewBox={`0 0 ${latime} ${INALTIME_GRAFIC}`} role="img" aria-label={t('admin.erori.grafic-eticheta', { n: total })}
            data-grafic="aparitii">
            <line x1="0" y1={INALTIME_GRAFIC - 0.5} x2={latime} y2={INALTIME_GRAFIC - 0.5} className="admin-grafic-axa" />
            {baraGrafic(zile, latime, INALTIME_GRAFIC).map((b, k) => (b.cale ? (
              <path key={k} d={b.cale} data-zi={k} className="admin-grafic-bara"><title>{`${ziua(k)} · ${zile[k] ?? 0}`}</title></path>
            ) : null))}
          </svg>
          <div className="admin-grafic-capete admin-slab"><span>{ziua(0)}</span><span>{t('admin.erori.azi')}</span></div>
        </>
      )}
    </figure>
  );
}

function DetaliuGrup({ con, grup, poateMarca, nume, marcat }: {
  readonly con: Conexiune; readonly grup: RandGrup; readonly poateMarca: boolean; readonly nume: ReadonlyMap<string, string>; readonly marcat: () => void;
}): ReactElement {
  const l = useLimba();
  const [aparitii, setAparitii] = useState<Masura<readonly Aparitie[]> | null>(null);
  const [marcare, setMarcare] = useState<{ readonly faza: 'liber' } | { readonly faza: 'se-marcheaza' } | { readonly faza: 'esec'; readonly motiv: string }>({ faza: 'liber' });

  useEffect(() => {
    let viu = true;
    getDocs(query(collection(con.db, 'errorLogs', grup.id, 'aparitii'), orderBy('cand', 'desc'), limit(PLAFON_APARITII))).then(
      (s) => { if (viu) setAparitii({ ok: true, valoare: s.docs.map((d) => aparitieDin(d.data())) }); },
      (e: unknown) => { if (viu) setAparitii({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, grup.id]);

  const faraAppCheck = con.appCheck === 'oprit';
  // Lipit sus, dar cât spațiul de sub el (A.3): un detaliu mai înalt decât ecranul se derulează în el, nu doar la capătul listei.
  const catSpatiul = useCatSpatiulDeJos();
  const marcheaza = (): void => {
    setMarcare({ faza: 'se-marcheaza' });
    marcheazaEroarea(con, grup.id, !grup.rezolvat).then(
      () => { setMarcare({ faza: 'liber' }); marcat(); },
      (e: unknown) => { setMarcare({ faza: 'esec', motiv: motivDin(e) }); },
    );
  };

  return (
    <section ref={catSpatiul} className="admin-erori-detaliu" data-admin="detaliu-eroare" aria-labelledby="eroare-aleasa">
      <div className="admin-erori-detaliu-cap">
        <h3 id="eroare-aleasa" className="admin-grup-mesaj">{grup.mesaj}</h3>
        {/* Fără `erori.rezolva` (ADR 0049), rolul doar citește: butonul nu se arată (serverul l-ar refuza oricum). */}
        {poateMarca ? (
          <button type="button" className="principal" data-admin="marcheaza" disabled={faraAppCheck || marcare.faza === 'se-marcheaza'} onClick={marcheaza}>
            {marcare.faza === 'se-marcheaza' ? t('admin.erori.se-marcheaza') : grup.rezolvat ? t('admin.erori.redeschide') : t('admin.erori.marcheaza')}
          </button>
        ) : null}
      </div>
      {poateMarca && faraAppCheck ? <p className="admin-slab" data-admin="fara-appcheck">{t('admin.erori.fara-appcheck')}</p> : null}
      {marcare.faza === 'esec' ? <p className="admin-eroare" role="alert">{t('admin.erori.marcare-esec', { motiv: marcare.motiv })}</p> : null}
      <p className="admin-slab">
        {t('admin.erori.prima', { data: dataScurta(grup.primaData, l) })}
        {' · '}
        {t('admin.erori.ultima', { data: dataScurta(grup.ultimaData, l) })}
      </p>
      <DetaliiAparitie a={grup.ultima} nume={nume} />
      {aparitii === null ? <SeIncarca text={t('admin.erori.se-incarca')} />
        : !aparitii.ok ? <p className="admin-eroare" role="alert">{t('admin.erori.aparitii-citire', { motiv: aparitii.motiv })}</p>
          : aparitii.valoare.length === 0 ? <p className="admin-slab" data-admin="fara-aparitii">{t('admin.erori.fara-aparitii')}</p>
          : (
            <>
              <GraficAparitii aparitii={aparitii.valoare} />
              <h4>{t('admin.erori.aparitii')}</h4>
              <ol className="admin-aparitii">
                {aparitii.valoare.map((a, i) => (
                  <li key={i}>
                    <span className="admin-slab">{dataScurta(a.cand, l)}</span> {a.mesaj}
                  </li>
                ))}
              </ol>
            </>
          )}
    </section>
  );
}
