import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore/lite';
import { ZILE_PROBA, zileRamase, type Plan } from '../../../shared/conturi.ts';
import { COLECTIE_CONTURI, MARGINI_PROBA, type SchimbarePlan } from '../../../shared/conturiPlan.ts';
import { planulContului, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataScurta, motivDin, type Masura } from '../erori/date.ts';
import { contDin, planAfisat, PLAFON_LISTA_CONTURI, type ContClient } from './date.ts';
import '../personal/personal.css';
import './utilizatori.css';

/**
 * Fila Utilizatori (ADR 0116 §19, felia 14.C↑b): conturile clienților, cele mai noi întâi, cu planul de acum, numele,
 * crearea și ultima logare. Cine are `conturi.administreaza` (și owner-ul) dă planul gratuit, o probă de N zile de azi,
 * dezactivează sau reactivează un cont, prin callable-ul `administreazaConturile`, cu auditul pe server. Cererea numește
 * planul văzut în listă: unul schimbat între timp e refuzat. Lista se citește prin reguli, la cerere („Reîncarcă”);
 * căutarea pe server și dosarul contului vin în 14.D↑.
 */

type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza' }
  | { readonly faza: 'gata'; readonly mesaj: string }
  | { readonly faza: 'eroare'; readonly motiv: string; readonly uid: string };

type Fel = SchimbarePlan['fel'];

export function FilaUtilizatori({ con, poateAdministra }: { readonly con: Conexiune; readonly poateAdministra: boolean }): ReactElement {
  const limba = useLimba();
  const [lista, setLista] = useState<Masura<{ readonly conturi: readonly ContClient[]; readonly la: number }> | null>(null);
  const [rev, setRev] = useState(0);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  const [deschis, setDeschis] = useState<string | null>(null);

  useEffect(() => {
    let viu = true;
    // Cele mai noi întâi: indexul simplu al lui `creatLa`, fără index compus.
    getDocs(query(collection(con.db, COLECTIE_CONTURI), orderBy('creatLa', 'desc'), limit(PLAFON_LISTA_CONTURI))).then(
      (s) => { if (viu) setLista({ ok: true, valoare: { conturi: s.docs.map((d) => contDin(d.id, d.data())), la: Date.now() } }); },
      (e: unknown) => { if (viu) setLista({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, rev]);

  const schimba = (c: ContClient, schimbare: SchimbarePlan): void => {
    setLucru({ faza: 'lucreaza' });
    planulContului(con, { actiune: 'plan', uid: c.uid, schimbare, vazut: c.vazut }).then((r) => {
      const cine = c.email ?? c.uid;
      setLucru({ faza: 'gata', mesaj: r.schimbat ? t('admin.util.schimbat', { cine, plan: t(`admin.util.plan.${r.drept.plan}`) }) : t('admin.util.neschimbat', { cine }) });
      setDeschis(null);
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e), uid: c.uid }); });
  };

  const ocupat = lucru.faza === 'lucreaza';
  // Fără cheia App Check pe instanță, serverul refuză orice scriere: butoanele se opresc și spun de ce.
  const faraAppCheck = con.appCheck === 'oprit';
  const conturi = lista?.ok ? lista.valoare.conturi : [];
  const deschide = (uid: string): void => {
    setLucru((l) => (l.faza === 'lucreaza' ? l : { faza: 'liber' }));
    setDeschis((d) => (d === uid ? null : uid));
  };

  return (
    <div className="pers util">
      {lucru.faza === 'lucreaza' ? <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.util.lucreaza')}</p> : null}
      {lucru.faza === 'gata' ? <div className="pers-stare" role="status" data-util="gata"><p>{lucru.mesaj}</p></div> : null}
      <section className="pers-sectiune" aria-labelledby="util-lista">
        <h2 id="util-lista">{t('admin.util.titlu')} <span className="admin-slab">{conturi.length}</span></h2>
        <p className="admin-slab">{t(poateAdministra ? 'admin.util.text-administreaza' : 'admin.util.text-citeste')}</p>
        <div className="admin-randuri">
          <button type="button" data-util="reincarca" onClick={() => { setRev((n) => n + 1); }}>{t('admin.util.reincarca')}</button>
        </div>
        {lista === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.util.se-incarca')}</p>
          : !lista.ok ? <p className="admin-eroare" role="alert" data-util="eroare-lista">{t('admin.util.citire', { motiv: lista.motiv })}</p>
            : conturi.length === 0 ? <p className="admin-mesaj" data-util="gol">{t('admin.util.niciunul')}</p>
              : (
                <ul className="pers-lista">
                  {conturi.map((c) => (
                    <Rand key={c.uid} c={c} acum={lista.valoare.la} limba={limba} poateAdministra={poateAdministra} deschis={deschis === c.uid}
                      deschide={() => { deschide(c.uid); }} ocupat={ocupat} faraAppCheck={faraAppCheck}
                      eroare={lucru.faza === 'eroare' && lucru.uid === c.uid ? lucru.motiv : null} schimba={(s) => { schimba(c, s); }} />
                  ))}
                </ul>
              )}
        {conturi.length >= PLAFON_LISTA_CONTURI ? <p className="admin-slab" data-util="plafon">{t('admin.util.plafon', { n: PLAFON_LISTA_CONTURI })}</p> : null}
      </section>
    </div>
  );
}

function textPlan(c: ContClient, plan: Plan, acum: number, limba: string): string {
  const pana = c.probaPana;
  if (plan === 'proba' && pana) return t('admin.util.plan-proba', { n: zileRamase(pana.getTime(), acum), data: dataScurta(pana, limba) });
  if (plan === 'expirat' && pana) return t('admin.util.plan-expirat', { data: dataScurta(pana, limba) });
  return t(`admin.util.plan.${plan}`);
}

function Rand({ c, acum, limba, poateAdministra, deschis, deschide, ocupat, faraAppCheck, eroare, schimba }: {
  readonly c: ContClient; readonly acum: number; readonly limba: string; readonly poateAdministra: boolean; readonly deschis: boolean;
  readonly deschide: () => void; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly schimba: (s: SchimbarePlan) => void;
}): ReactElement {
  const plan = planAfisat(c, acum);
  return (
    <li data-cont={c.email ?? c.uid} data-plan={plan}>
      <div className="pers-rand">
        <span className="pers-cine">{c.email ?? c.uid}</span>
        <span className="util-plan" data-plan={plan} data-util="plan">{textPlan(c, plan, acum, limba)}</span>
      </div>
      <p className="admin-slab util-meta">
        {c.nume ?? '—'}
        {' · '}{t('admin.util.creat', { data: dataScurta(c.creatLa, limba) })}
        {' · '}{t('admin.util.ultima', { data: dataScurta(c.ultimaLogare, limba) })}
        {c.personal ? ` · ${t('admin.util.personal-tinut', { plan: c.plan ? t(`admin.util.plan.${c.plan}`) : '?' })}` : ''}
      </p>
      {poateAdministra ? (
        <div className="admin-randuri">
          <button type="button" disabled={ocupat} aria-expanded={deschis} data-util="schimba" onClick={deschide}>{t('admin.util.schimba')}</button>
        </div>
      ) : null}
      {deschis && poateAdministra ? <FormularPlan c={c} ocupat={ocupat} faraAppCheck={faraAppCheck} eroare={eroare} renunta={deschide} schimba={schimba} /> : null}
    </li>
  );
}

/** Planul nou: gratuit, o probă de N zile de azi, dezactivarea (sau reactivarea, pe un cont dezactivat). */
function FormularPlan({ c, ocupat, faraAppCheck, eroare, renunta, schimba }: {
  readonly c: ContClient; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly renunta: () => void; readonly schimba: (s: SchimbarePlan) => void;
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
        <button type="button" onClick={renunta}>{t('admin.pers.renunta')}</button>
        {faraAppCheck ? <span className="admin-slab" data-util="fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-util="eroare">{t('admin.util.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}
