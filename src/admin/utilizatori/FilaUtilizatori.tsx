import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore/lite';
import { ZILE_PROBA, zileRamase, type Plan } from '../../../shared/conturi.ts';
import { COLECTIE_CONTURI, MARGINI_PROBA, type SchimbarePlan } from '../../../shared/conturiPlan.ts';
import { planulContului, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { intamplareDin } from '../carcasa/date.ts';
import { EroareCitire, ListaGoala, SeIncarca, usePublica, type Tinta } from '../carcasa/stari.tsx';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { dataScurta, motivDin, ziScurta, type Masura } from '../erori/date.ts';
import { useNumeActiuni } from '../pasi/Pasi.tsx';
import { Activitatea } from './Activitatea.tsx';
import { contDin, planAfisat, PLAFON_LISTA_CONTURI, type ContClient } from './date.ts';
import { cautaConturi, dreptScurt, FILTRE_PLAN, istoricPlan, numarPePlan, pePlan, type FiltruPlan, type PasPlan } from './vedere.ts';
import '../personal/personal.css';
import './utilizatori.css';

/**
 * Fila Utilizatori (ADR 0116 §19, felia 14.C↑b; așezarea: ADR 0260 §5, felia A.5): conturile clienților, cele mai noi
 * întâi, într-un tabel (contul, planul, dreptul, crearea), cu filtrele pe plan (numărul fiecăruia) și căutarea în conturile
 * încărcate. Contul ales stă alături: numele, ultima logare, schimbarea planului (cine are `conturi.administreaza`: gratuit,
 * o probă de N zile de azi, dezactivarea sau reactivarea, prin callable-ul `administreazaConturile`, pe planul văzut, cu
 * auditul pe server) și istoricul planului, din rândurile de audit ale contului (doar cu „Audit: citește”). Lista se citește
 * prin reguli, la cerere („Reîncarcă”); căutarea pe server și dosarul contului vin în 14.D↑.
 */

type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza' }
  | { readonly faza: 'gata'; readonly mesaj: string }
  | { readonly faza: 'eroare'; readonly motiv: string; readonly uid: string };

type Fel = SchimbarePlan['fel'];

/** Câte rânduri de audit ale unui cont se citesc pentru istoricul planului (fără ordine pe server: fără index compus). */
const PLAFON_ISTORIC = 100;

export function FilaUtilizatori({ con, eu, poateAdministra, poateIstoric, poateActivitate = false, aducator, tinta }: {
  readonly con: Conexiune; readonly eu: string; readonly poateAdministra: boolean;
  /** „Audit: citește”: fără ea, istoricul planului nu se arată și nu se citește. */
  readonly poateIstoric: boolean;
  /** „Utilizare: sesiuni” (ADR 0262, A.11c): activitatea contului ales; fără ea, nici butonul. */
  readonly poateActivitate?: boolean;
  /** Catalogul acțiunilor, pentru numele pașilor din activitate. */
  readonly aducator?: AducatorDocumentatie;
  /** Contul găsit de căutarea din antet: vine ales. */
  readonly tinta: Tinta | null;
}): ReactElement {
  const limba = useLimba();
  const publica = usePublica();
  const nume = useNumeActiuni(poateActivitate ? aducator : undefined, limba);
  const [lista, setLista] = useState<Masura<{ readonly conturi: readonly ContClient[]; readonly la: number }> | null>(null);
  const [rev, setRev] = useState(0);
  // Cât lista se citește din nou, planul arătat poate fi cel vechi: nimic nu pleacă până sosește (serverul l-ar refuza).
  const [seCiteste, setSeCiteste] = useState(true);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  const [filtru, setFiltru] = useState<FiltruPlan>('toate');
  const [cautat, setCautat] = useState('');
  const [ales, setAles] = useState<string | null>(tinta?.id ?? null);

  useEffect(() => {
    let viu = true;
    setSeCiteste(true);
    // Cele mai noi întâi: indexul simplu al lui `creatLa`, fără index compus.
    getDocs(query(collection(con.db, COLECTIE_CONTURI), orderBy('creatLa', 'desc'), limit(PLAFON_LISTA_CONTURI))).then(
      (s) => {
        if (!viu) return;
        const conturi = s.docs.map((d) => contDin(d.id, d.data()));
        setLista({ ok: true, valoare: { conturi, la: Date.now() } });
        setSeCiteste(false);
        // Căutarea din antet găsește contul după adresă, nume sau uid (ADR 0260 §1).
        publica('conturi', conturi.map((c) => ({ id: c.uid, text: c.email ?? c.uid, detaliu: c.nume ?? '' })));
      },
      (e: unknown) => { if (viu) { setLista({ ok: false, motiv: motivDin(e) }); setSeCiteste(false); } },
    );
    return () => { viu = false; };
  }, [con, rev, publica]);

  const reincarca = (): void => { setRev((n) => n + 1); };
  const schimba = (c: ContClient, schimbare: SchimbarePlan): void => {
    setLucru({ faza: 'lucreaza' });
    planulContului(con, { actiune: 'plan', uid: c.uid, schimbare, vazut: c.vazut }).then((r) => {
      const cine = c.email ?? c.uid;
      setLucru({ faza: 'gata', mesaj: r.schimbat ? t('admin.util.schimbat', { cine, plan: t(`admin.util.plan.${r.drept.plan}`) }) : t('admin.util.neschimbat', { cine }) });
      reincarca();
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), uid: c.uid }); });
  };

  const ocupat = lucru.faza === 'lucreaza' || seCiteste;
  // Fără cheia App Check pe instanță, serverul refuză orice scriere: butoanele se opresc și spun de ce.
  const faraAppCheck = con.appCheck === 'oprit';
  const conturi = lista?.ok ? lista.valoare.conturi : [];
  const acum = lista?.ok ? lista.valoare.la : 0;
  // Numerele filtrelor sunt ale conturilor găsite: un filtru arată câte rânduri dă cu căutarea de acum.
  const gasite = cautaConturi(conturi, cautat);
  const numere = numarPePlan(gasite, acum);
  const aratate = pePlan(gasite, filtru, acum);
  const alesAcum = aratate.some((c) => c.uid === ales) ? ales : aratate[0]?.uid ?? null;
  // Ales e cel văzut (ca la Erori): un filtru care îl ascunde mută alegerea pe primul arătat, fără s-o mute înapoi.
  if (lista?.ok && alesAcum !== ales) setAles(alesAcum);
  const cont = aratate.find((c) => c.uid === alesAcum) ?? null;
  const alege = (uid: string): void => {
    setLucru((l) => (l.faza === 'lucreaza' ? l : { faza: 'liber' }));
    setAles(uid);
  };

  return (
    <div className="pers util">
      {lucru.faza === 'lucreaza' ? <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.util.lucreaza')}</p> : null}
      {lucru.faza === 'gata' ? <div className="pers-stare" role="status" data-util="gata"><p>{lucru.mesaj}</p></div> : null}
      <div className="admin-erori-cap">
        <h2 className="util-titlu">{t('admin.util.titlu')} <span className="admin-slab" data-util="numar">{conturi.length}</span></h2>
        <input type="search" value={cautat} placeholder={t('admin.util.cauta')} aria-label={t('admin.util.cauta')} data-util="cauta"
          onChange={(e) => { setCautat(e.target.value); }} />
        <button type="button" data-util="reincarca" onClick={reincarca}>{t('admin.util.reincarca')}</button>
      </div>
      <p className="admin-slab util-meta" data-util="text">{t(poateAdministra ? 'admin.util.text-administreaza' : 'admin.util.text-citeste')}</p>
      {lista === null ? <SeIncarca text={t('admin.util.se-incarca')} />
        : !lista.ok ? (
          <EroareCitire text={t('admin.util.citire', { motiv: lista.motiv })} motiv={lista.motiv} reincarca={reincarca} atribute={{ 'data-util': 'eroare-lista' }} />
        )
          : conturi.length === 0 ? <ListaGoala text={t('admin.util.niciunul')} atribute={{ 'data-util': 'gol' }} />
            : (
              <>
                <div className="admin-segmente util-filtre" role="group" aria-label={t('admin.util.col.plan')}>
                  {FILTRE_PLAN.map((f) => (
                    <button key={f} type="button" aria-pressed={filtru === f} data-filtru-plan={f} onClick={() => { setFiltru(f); }}>
                      {t('admin.erori.cu-numar', { nume: t(f === 'toate' ? 'admin.erori.toate' : `admin.util.plan.${f}`), n: numere[f] })}
                    </button>
                  ))}
                </div>
                {cont === null ? <ListaGoala text={t('admin.util.niciunul-filtru')} atribute={{ 'data-util': 'gol-filtru' }} /> : (
                  <div className="admin-erori-corp">
                    <table className="util-tabel" data-util="tabel">
                      <thead>
                        <tr>
                          <th scope="col">{t('admin.util.col.cont')}</th><th scope="col">{t('admin.util.col.plan')}</th>
                          <th scope="col">{t('admin.util.col.drept')}</th><th scope="col">{t('admin.util.col.creat')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aratate.map((c) => {
                          const plan = planAfisat(c, acum);
                          const d = dreptScurt(c, acum);
                          return (
                            <tr key={c.uid} data-cont={c.email ?? c.uid} data-uid={c.uid} data-plan={plan} data-ales={c.uid === alesAcum} onClick={() => { alege(c.uid); }}>
                              <td><button type="button" aria-current={c.uid === alesAcum ? 'true' : undefined} data-util="alege">{c.email ?? c.uid}</button></td>
                              <td><span className="util-plan" data-plan={plan} data-util="plan">{t(`admin.util.plan.${plan}`)}</span></td>
                              <td className="admin-slab" data-util="drept">
                                {d === null ? '—' : d.fel === 'nelimitat' ? t('admin.util.drept.nelimitat')
                                  : d.fel === 'zile' ? t('admin.util.drept.zile', { n: d.n }) : t('admin.util.drept.din', { data: ziScurta(d.data, limba) })}
                              </td>
                              <td className="admin-slab">{ziScurta(c.creatLa, limba)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Detaliu key={cont.uid} con={con} eu={eu} c={cont} acum={acum} limba={limba} poateAdministra={poateAdministra} poateIstoric={poateIstoric} rev={rev}
                      activitate={poateActivitate ? nume : null}
                      ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={lucru.faza === 'eroare' && lucru.uid === cont.uid ? lucru.motiv : null}
                      schimba={(s) => { schimba(cont, s); }} />
                  </div>
                )}
              </>
            )}
      {conturi.length >= PLAFON_LISTA_CONTURI ? <p className="admin-slab" data-util="plafon">{t('admin.util.plafon', { n: PLAFON_LISTA_CONTURI })}</p> : null}
    </div>
  );
}

function textPlan(c: ContClient, plan: Plan, acum: number, limba: string): string {
  const pana = c.probaPana;
  if (plan === 'proba' && pana) return t('admin.util.plan-proba', { n: zileRamase(pana.getTime(), acum), data: dataScurta(pana, limba) });
  if (plan === 'expirat' && pana) return t('admin.util.plan-expirat', { data: dataScurta(pana, limba) });
  return t(`admin.util.plan.${plan}`);
}

/** Contul ales, alături de tabel: planul de acum, numele și logările, schimbarea planului, istoricul lui. */
function Detaliu({ con, eu, c, acum, limba, poateAdministra, poateIstoric, activitate, rev, ocupat, faraAppCheck, eroare, schimba }: {
  readonly activitate: ReadonlyMap<string, string> | null;
  readonly con: Conexiune; readonly eu: string; readonly c: ContClient; readonly acum: number; readonly limba: string; readonly poateAdministra: boolean;
  readonly poateIstoric: boolean; readonly rev: number; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly schimba: (s: SchimbarePlan) => void;
}): ReactElement {
  const plan = planAfisat(c, acum);
  return (
    <section className="admin-erori-detaliu util-detaliu" data-util="detaliu" aria-labelledby="util-ales">
      <h3 id="util-ales">{c.email ?? c.uid}</h3>
      <p><span className="util-plan" data-plan={plan}>{textPlan(c, plan, acum, limba)}</span></p>
      <p className="admin-slab">
        {c.nume ?? '—'}
        {' · '}{t('admin.util.creat', { data: dataScurta(c.creatLa, limba) })}
        {' · '}{t('admin.util.ultima', { data: dataScurta(c.ultimaLogare, limba) })}
        {c.personal ? ` · ${t('admin.util.personal-tinut', { plan: c.plan ? t(`admin.util.plan.${c.plan}`) : '?' })}` : ''}
      </p>
      {poateAdministra ? (
        <>
          <h4>{t('admin.util.schimba')}</h4>
          {/* Formularul pornește din nou la un plan nou al contului (după o schimbare, lista sosește cu el). */}
          <FormularPlan key={`${c.vazut.plan}/${c.vazut.probaPana}`} c={c} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroare} schimba={schimba} />
        </>
      ) : null}
      {poateIstoric ? <Istoric con={con} eu={eu} uid={c.uid} rev={rev} limba={limba} /> : null}
      {activitate ? <Activitatea con={con} uid={c.uid} nume={activitate} limba={limba} /> : null}
    </section>
  );
}

/** Istoricul planului: rândurile de audit ale contului (ADR 0260 §5), citite la alegerea lui și după fiecare schimbare. */
function Istoric({ con, eu, uid, rev, limba }: {
  readonly con: Conexiune; readonly eu: string; readonly uid: string; readonly rev: number; readonly limba: string;
}): ReactElement {
  const [pasi, setPasi] = useState<Masura<readonly PasPlan[]> | null>(null);
  useEffect(() => {
    let viu = true;
    // Doar egalitatea pe `tinta` (indexul simplu); ordinea se face aici.
    getDocs(query(collection(con.db, 'audit'), where('tinta', '==', `${COLECTIE_CONTURI}/${uid}`), limit(PLAFON_ISTORIC))).then(
      (s) => { if (viu) setPasi({ ok: true, valoare: istoricPlan(s.docs.map((d) => intamplareDin(d.id, d.data(), eu))) }); },
      (e: unknown) => { if (viu) setPasi({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, eu, uid, rev]);
  return (
    <>
      <h4>{t('admin.util.ist')}</h4>
      {pasi === null ? <p className="admin-slab" aria-busy="true">…</p>
        : !pasi.ok ? <p className="admin-eroare" role="alert" data-util="istoric-eroare">{t('admin.util.ist.citire', { motiv: pasi.motiv })}</p>
          : pasi.valoare.length === 0 ? <p className="admin-slab" data-util="istoric-gol">{t('admin.util.ist.gol')}</p>
            : (
              <ol className="util-istoric" data-util="istoric">
                {pasi.valoare.map((p) => (
                  <li key={p.id} data-pas={p.plan ?? '?'}>
                    <span className="admin-slab">{ziScurta(p.cand, limba)}</span>
                    {' · '}{p.plan === null ? '?' : p.probaPana ? t('admin.util.ist.proba', { data: ziScurta(p.probaPana, limba) }) : t(`admin.util.plan.${p.plan}`)}
                    {' · '}<span className="admin-slab">{t(p.creare ? 'admin.azi.ev.cont-nou' : `admin.azi.cine.${p.cine}`)}</span>
                  </li>
                ))}
              </ol>
            )}
    </>
  );
}

/** Planul nou: gratuit, o probă de N zile de azi, dezactivarea (sau reactivarea, pe un cont dezactivat). */
function FormularPlan({ c, ocupat, faraAppCheck, eroare, schimba }: {
  readonly c: ContClient; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly schimba: (s: SchimbarePlan) => void;
}): ReactElement {
  const dezactivat = c.plan === 'dezactivat';
  const feluri: readonly Fel[] = dezactivat ? ['reactiveaza', 'gratuit', 'proba'] : ['gratuit', 'proba', 'dezactiveaza'];
  const [fel, setFel] = useState<Fel>(feluri[0] ?? 'gratuit');
  const [zile, setZile] = useState(String(ZILE_PROBA));
  const n = Number(zile);
  const zileBune = Number.isInteger(n) && n >= MARGINI_PROBA.min && n <= MARGINI_PROBA.max;
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (fel === 'proba') {
      if (zileBune) schimba({ fel, zile: n });
      return;
    }
    schimba({ fel });
  };
  return (
    <form className="pers-formular" onSubmit={trimite} data-util="formular-plan">
      <label>
        <span>{t('admin.util.plan-nou')}</span>
        <select value={fel} data-util="schimbare" onChange={(e) => { const v = feluri.find((f) => f === e.target.value); if (v) setFel(v); }}>
          {feluri.map((f) => <option key={f} value={f}>{t(`admin.util.fel.${f}`)}</option>)}
        </select>
      </label>
      {fel === 'proba' ? (
        <label>
          <span>{t('admin.util.zile', { min: MARGINI_PROBA.min, max: MARGINI_PROBA.max })}</span>
          <input type="number" required min={MARGINI_PROBA.min} max={MARGINI_PROBA.max} step={1} value={zile} data-util="zile" onChange={(e) => { setZile(e.target.value); }} />
        </label>
      ) : null}
      <p className="admin-slab">{t(`admin.util.efect.${fel}`)}</p>
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || (fel === 'proba' && !zileBune)} data-util="salveaza-plan">
          {t('admin.util.salveaza')}
        </button>
        {faraAppCheck ? <span className="admin-slab" data-util="fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-util="eroare">{t('admin.util.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}
