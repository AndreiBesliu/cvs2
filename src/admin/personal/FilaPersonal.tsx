import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { COLECTII_PERSONAL, NUME_ROL_MAX, OWNER, PERMISIUNI, type CererePersonal, type Permisiune, type RaspunsPersonal } from '../../../shared/personal.ts';
import { administreazaPersonalul, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataScurta, motivDin } from '../erori/date.ts';
import { invitatieDin, numeRol, omDin, rolDin, type Invitatie, type Om, type RolCustom } from './date.ts';
import './personal.css';

/**
 * Fila Personal (ADR 0049), doar a owner-ului: oamenii (rolul, scoaterea, linkul de parolă), adăugarea unui om (invitația
 * pe e-mail sau contul cu parolă), invitațiile deschise și rolurile custom (numele și bifele din catalog). Citirile trec
 * prin reguli; fiecare schimbare trece prin callable-ul `administreazaPersonalul`, cu auditul pe server.
 */

interface Date_ {
  readonly oameni: readonly Om[];
  readonly roluri: readonly RolCustom[];
  readonly invitatii: readonly Invitatie[];
}

type Lucru =
  | { readonly faza: 'liber' }
  | { readonly faza: 'lucreaza' }
  | { readonly faza: 'gata'; readonly mesaj: string; readonly link?: string | null }
  | { readonly faza: 'eroare'; readonly motiv: string };

export function FilaPersonal({ con, eu, emailEu }: { readonly con: Conexiune; readonly eu: string; readonly emailEu: string | null }): ReactElement {
  const limba = useLimba();
  const [date, setDate] = useState<{ readonly ok: true; readonly d: Date_ } | { readonly ok: false; readonly motiv: string } | null>(null);
  const [rev, setRev] = useState(0);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });

  useEffect(() => {
    let viu = true;
    Promise.all([
      getDocs(collection(con.db, COLECTII_PERSONAL.staff)),
      getDocs(collection(con.db, COLECTII_PERSONAL.roluri)),
      getDocs(collection(con.db, COLECTII_PERSONAL.invitatii)),
    ]).then(([s, r, i]) => {
      if (!viu) return;
      const roluri = r.docs.map((x) => rolDin(x.id, x.data())).sort((a, b) => a.nume.localeCompare(b.nume, limba));
      const oameni = s.docs.map((x) => omDin(x.id, x.data())).sort((a, b) => (a.email ?? a.uid).localeCompare(b.email ?? b.uid));
      const invitatii = i.docs.map((x) => invitatieDin(x.id, x.data())).sort((a, b) => a.email.localeCompare(b.email));
      setDate({ ok: true, d: { oameni, roluri, invitatii } });
    }, (e: unknown) => { if (viu) setDate({ ok: false, motiv: motivDin(e) }); });
    return () => { viu = false; };
  }, [con, rev, limba]);

  /** O acțiune a owner-ului: callable-ul, apoi mesajul și listele citite din nou. */
  const fa = (cerere: CererePersonal, mesaj: (r: RaspunsPersonal) => string): void => {
    setLucru({ faza: 'lucreaza' });
    administreazaPersonalul(con, cerere).then((r) => {
      setLucru(r.link === undefined ? { faza: 'gata', mesaj: mesaj(r) } : { faza: 'gata', mesaj: mesaj(r), link: r.link });
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e) }); });
  };

  if (date === null) return <p className="admin-mesaj" aria-busy="true">{t('admin.pers.se-incarca')}</p>;
  if (!date.ok) {
    return (
      <div className="admin-randuri" role="alert">
        <p className="admin-eroare">{t('admin.pers.citire', { motiv: date.motiv })}</p>
        <button type="button" onClick={() => { setDate(null); setRev((n) => n + 1); }}>{t('admin.doc.reincearca')}</button>
      </div>
    );
  }
  const { oameni, roluri, invitatii } = date.d;
  const ocupat = lucru.faza === 'lucreaza';
  return (
    <div className="pers">
      <Stare lucru={lucru} />
      <Adauga roluri={roluri} ocupat={ocupat} fa={fa} limba={limba} />
      <Oameni oameni={oameni} roluri={roluri} eu={eu} emailEu={emailEu} ocupat={ocupat} fa={fa} limba={limba} />
      <Invitatii invitatii={invitatii} roluri={roluri} ocupat={ocupat} fa={fa} limba={limba} />
      <Roluri roluri={roluri} oameni={oameni} invitatii={invitatii} ocupat={ocupat} fa={fa} />
    </div>
  );
}

type Fa = (cerere: CererePersonal, mesaj: (r: RaspunsPersonal) => string) => void;

function Stare({ lucru }: { readonly lucru: Lucru }): ReactElement | null {
  const [copiat, setCopiat] = useState(false);
  useEffect(() => { setCopiat(false); }, [lucru]);
  if (lucru.faza === 'liber') return null;
  if (lucru.faza === 'lucreaza') return <p className="admin-mesaj" role="status" aria-busy="true">{t('admin.pers.lucreaza')}</p>;
  if (lucru.faza === 'eroare') return <p className="admin-eroare pers-stare" role="alert" data-personal="eroare">{t('admin.pers.esec', { motiv: lucru.motiv })}</p>;
  return (
    <div className="pers-stare" role="status" data-personal="gata">
      <p>{lucru.mesaj}</p>
      {lucru.link ? (
        <div className="pers-link">
          <input type="text" readOnly value={lucru.link} aria-label={t('admin.pers.link')} data-personal="link" onFocus={(e) => { e.currentTarget.select(); }} />
          <button type="button" onClick={() => {
            navigator.clipboard.writeText(lucru.link ?? '').then(() => { setCopiat(true); }, () => { setCopiat(false); });
          }}>{copiat ? t('admin.cont.copiat') : t('admin.pers.copiaza-link')}</button>
          <p className="admin-slab">{t('admin.pers.link-ajutor')}</p>
        </div>
      ) : null}
      {lucru.link === null ? <p className="admin-eroare">{t('admin.pers.link-lipsa')}</p> : null}
    </div>
  );
}

/** Opțiunile de rol: rolurile custom după nume. `owner` se dă doar din consolă (ADR 0071). */
function OptiuniRol({ roluri }: { readonly roluri: readonly RolCustom[] }): ReactElement {
  return <>{roluri.map((r) => <option key={r.id} value={r.id}>{r.nume}</option>)}</>;
}

function Adauga({ roluri, ocupat, fa, limba }: { readonly roluri: readonly RolCustom[]; readonly ocupat: boolean; readonly fa: Fa; readonly limba: string }): ReactElement {
  const [email, setEmail] = useState('');
  // Fără rol preselectat: un clic grăbit nu dă cuiva un rol pe care nu l-a ales.
  const [rol, setRol] = useState('');
  const trimite = (actiune: 'invita' | 'creeaza-cont') => (e?: FormEvent): void => {
    e?.preventDefault();
    const adresa = email.trim();
    if (actiune === 'invita') {
      fa({ actiune, email: adresa, rol }, (r) => t('admin.pers.invitat', {
        email: adresa, data: dataScurta(r.expiraLa === undefined ? null : new Date(r.expiraLa), limba), adresa: `${location.origin}/admin`,
      }));
    } else {
      fa({ actiune, email: adresa, rol }, () => t('admin.pers.cont-creat', { email: adresa }));
    }
  };
  return (
    <section className="pers-sectiune" aria-labelledby="pers-adauga">
      <h2 id="pers-adauga">{t('admin.pers.adauga')}</h2>
      <p className="admin-slab">{t('admin.pers.adauga-text')}</p>
      <form className="pers-formular" onSubmit={trimite('invita')}>
        <label>
          <span>{t('admin.pers.email')}</span>
          <input type="email" required autoComplete="off" value={email} data-personal="email" onChange={(e) => { setEmail(e.target.value); }} />
        </label>
        <label>
          <span>{t('admin.pers.rol')}</span>
          <select required value={rol} data-personal="rol-nou" onChange={(e) => { setRol(e.target.value); }}>
            <option value="" disabled>{t('admin.pers.alege-rol')}</option>
            <OptiuniRol roluri={roluri} />
          </select>
        </label>
        <div className="admin-randuri">
          <button type="submit" className="principal" disabled={ocupat || rol === ''} data-personal="invita">{t('admin.pers.invita')}</button>
          <button type="button" disabled={ocupat || email.trim() === '' || rol === ''} data-personal="creeaza-cont" onClick={() => { trimite('creeaza-cont')(); }}>
            {t('admin.pers.creeaza-cont')}
          </button>
        </div>
      </form>
    </section>
  );
}

const SURSE = { consola: 'admin.pers.sursa.consola', invitatie: 'admin.pers.sursa.invitatie', 'cont-creat': 'admin.pers.sursa.cont-creat' } as const;

function Oameni({ oameni, roluri, eu, emailEu, ocupat, fa, limba }: {
  readonly oameni: readonly Om[]; readonly roluri: readonly RolCustom[]; readonly eu: string; readonly emailEu: string | null; readonly ocupat: boolean;
  readonly fa: Fa; readonly limba: string;
}): ReactElement {
  const [deScos, setDeScos] = useState<string | null>(null);
  return (
    <section className="pers-sectiune" aria-labelledby="pers-oameni">
      <h2 id="pers-oameni">{t('admin.pers.oameni')} <span className="admin-slab">{oameni.length}</span></h2>
      <ul className="pers-lista">
        {oameni.map((o) => {
          const cine = o.email ?? (o.uid === eu ? emailEu : null) ?? o.uid;
          const nume = numeRol(o.rol, roluri);
          // ADR 0071: owner-ul e fix aici (nici scos, nici alt rol); se schimbă doar din consolă.
          const fix = o.rol === OWNER;
          return (
            <li key={o.uid} data-om={o.email ?? o.uid}>
              <div className="pers-rand">
                <span className="pers-cine">{cine}{o.uid === eu ? <span className="admin-slab"> · {t('admin.pers.tu')}</span> : null}</span>
                <span className="admin-slab">{t(SURSE[o.sursa])} · {dataScurta(o.adaugatLa, limba)}</span>
              </div>
              <div className="admin-randuri">
                {fix ? (
                  <span className="pers-rol" data-personal="owner-fix" title={t('admin.pers.owner-fix')}>
                    <span className="admin-slab">{t('admin.pers.rol')}</span> {t('admin.pers.rol-owner')}
                    <span className="admin-slab"> · {t('admin.pers.owner-fix')}</span>
                  </span>
                ) : (
                  <label className="pers-rol">
                    <span className="admin-slab">{t('admin.pers.rol')}</span>
                    <select value={nume === null ? '' : (o.rol ?? '')} disabled={ocupat} aria-label={t('admin.pers.rolul-lui', { cine })} data-personal="rol"
                      onChange={(e) => { fa({ actiune: 'schimba-rolul', uid: o.uid, rol: e.target.value }, () => t('admin.pers.rol-schimbat', { cine })); }}>
                      {nume === null ? <option value="" disabled>{t('admin.pers.rol-necunoscut', { rol: o.rol ?? '—' })}</option> : null}
                      <OptiuniRol roluri={roluri} />
                    </select>
                  </label>
                )}
                {o.sursa === 'cont-creat' ? (
                  <button type="button" disabled={ocupat} data-personal="link-nou"
                    onClick={() => { fa({ actiune: 'link-parola', uid: o.uid }, () => t('admin.pers.link-nou-gata', { cine })); }}>
                    {t('admin.pers.link-nou')}
                  </button>
                ) : null}
                {fix ? null : deScos === o.uid ? (
                  <>
                    <button type="button" className="pers-pericol" disabled={ocupat} data-personal="scoate-confirma"
                      onClick={() => { setDeScos(null); fa({ actiune: 'scoate', uid: o.uid }, () => t('admin.pers.scos', { cine })); }}>
                      {t('admin.pers.scoate-confirma', { cine })}
                    </button>
                    <button type="button" onClick={() => { setDeScos(null); }}>{t('admin.pers.renunta')}</button>
                  </>
                ) : (
                  <button type="button" disabled={ocupat} data-personal="scoate" onClick={() => { setDeScos(o.uid); }}>{t('admin.pers.scoate')}</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Invitatii({ invitatii, roluri, ocupat, fa, limba }: {
  readonly invitatii: readonly Invitatie[]; readonly roluri: readonly RolCustom[]; readonly ocupat: boolean; readonly fa: Fa; readonly limba: string;
}): ReactElement {
  const acum = Date.now();
  return (
    <section className="pers-sectiune" aria-labelledby="pers-invitatii">
      <h2 id="pers-invitatii">{t('admin.pers.invitatii')} <span className="admin-slab">{invitatii.length}</span></h2>
      {invitatii.length === 0 ? <p className="admin-slab">{t('admin.pers.invitatii-gol')}</p> : (
        <ul className="pers-lista">
          {invitatii.map((i) => {
            const expirata = i.expiraLa !== null && i.expiraLa.getTime() <= acum;
            return (
              <li key={i.id} data-invitatie={i.email}>
                <div className="pers-rand">
                  <span className="pers-cine">{i.email}</span>
                  <span className={expirata ? 'admin-eroare' : 'admin-slab'}>
                    {numeRol(i.rol, roluri) ?? t('admin.pers.rol-necunoscut', { rol: i.rol ?? '—' })} · {t(expirata ? 'admin.pers.expirata' : 'admin.pers.expira', { data: dataScurta(i.expiraLa, limba) })}
                  </span>
                </div>
                <button type="button" disabled={ocupat} data-personal="anuleaza"
                  onClick={() => { fa({ actiune: 'anuleaza-invitatia', id: i.id }, () => t('admin.pers.anulata', { email: i.email })); }}>
                  {t('admin.pers.anuleaza')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Roluri({ roluri, oameni, invitatii, ocupat, fa }: {
  readonly roluri: readonly RolCustom[]; readonly oameni: readonly Om[]; readonly invitatii: readonly Invitatie[]; readonly ocupat: boolean; readonly fa: Fa;
}): ReactElement {
  const [editat, setEditat] = useState<string | 'nou' | null>(null);
  return (
    <section className="pers-sectiune" aria-labelledby="pers-roluri">
      <h2 id="pers-roluri">{t('admin.pers.roluri')} <span className="admin-slab">{roluri.length}</span></h2>
      <p className="admin-slab">{t('admin.pers.roluri-text')}</p>
      <ul className="pers-lista">
        {roluri.map((r) => {
          const folosit = oameni.some((o) => o.rol === r.id) || invitatii.some((i) => i.rol === r.id);
          return editat === r.id ? (
            <li key={r.id}><EditorRol rol={r} ocupat={ocupat} fa={fa} gata={() => { setEditat(null); }} /></li>
          ) : (
            <li key={r.id} data-rol={r.nume}>
              <div className="pers-rand">
                <span className="pers-cine">{r.nume}</span>
                <span className="pers-permisiuni">
                  {r.permisiuni.length === 0 ? <span className="admin-slab">{t('admin.pers.fara-permisiuni')}</span>
                    : r.permisiuni.map((p) => <span key={p} className="pers-permisiune">{t(`admin.perm.${p}`)}</span>)}
                </span>
              </div>
              <div className="admin-randuri">
                <button type="button" disabled={ocupat} data-personal="editeaza" onClick={() => { setEditat(r.id); }}>{t('admin.pers.editeaza')}</button>
                <button type="button" disabled={ocupat || folosit} title={folosit ? t('admin.pers.rol-folosit') : undefined} data-personal="sterge-rol"
                  onClick={() => { fa({ actiune: 'sterge-rol', id: r.id }, () => t('admin.pers.rol-sters', { nume: r.nume })); }}>
                  {t('admin.pers.sterge')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {editat === 'nou'
        ? <EditorRol rol={null} ocupat={ocupat} fa={fa} gata={() => { setEditat(null); }} />
        : <button type="button" disabled={ocupat} data-personal="rol-nou-buton" onClick={() => { setEditat('nou'); }}>{t('admin.pers.rol-nou')}</button>}
    </section>
  );
}

function EditorRol({ rol, ocupat, fa, gata }: { readonly rol: RolCustom | null; readonly ocupat: boolean; readonly fa: Fa; readonly gata: () => void }): ReactElement {
  const [nume, setNume] = useState(rol?.nume ?? '');
  const [bife, setBife] = useState<ReadonlySet<Permisiune>>(() => new Set(rol?.permisiuni ?? []));
  const salveaza = (e: FormEvent): void => {
    e.preventDefault();
    const permisiuni = PERMISIUNI.filter((p) => bife.has(p));
    fa({ actiune: 'salveaza-rol', ...(rol ? { id: rol.id } : {}), nume, permisiuni }, () => t('admin.pers.rol-salvat', { nume: nume.trim() }));
    gata();
  };
  return (
    <form className="pers-editor" onSubmit={salveaza} data-personal="editor-rol">
      <label>
        <span>{t('admin.pers.nume-rol')}</span>
        <input type="text" required maxLength={NUME_ROL_MAX} value={nume} data-personal="nume-rol" onChange={(e) => { setNume(e.target.value); }} />
      </label>
      <fieldset>
        <legend>{t('admin.pers.permisiuni')}</legend>
        {PERMISIUNI.map((p) => (
          <label key={p} className="pers-bifa">
            <input type="checkbox" checked={bife.has(p)} data-permisiune={p} onChange={(e) => {
              const n = new Set(bife);
              if (e.target.checked) n.add(p);
              else n.delete(p);
              setBife(n);
            }} />
            <span>
              <span className="pers-bifa-nume">{t(`admin.perm.${p}`)}</span>
              <span className="admin-slab">{t(`admin.perm.${p}.text`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat} data-personal="salveaza-rol">{t('admin.pers.salveaza')}</button>
        <button type="button" onClick={gata}>{t('admin.pers.renunta')}</button>
      </div>
    </form>
  );
}
