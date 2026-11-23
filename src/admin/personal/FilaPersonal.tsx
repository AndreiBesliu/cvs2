import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { collection, getDocs } from 'firebase/firestore/lite';
import { COLECTII_PERSONAL, NUME_ROL_MAX, OWNER, PERMISIUNI, type CererePersonal, type Permisiune, type RaspunsPersonal } from '../../../shared/personal.ts';
import { administreazaPersonalul, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { EroareCitire, SeIncarca } from '../carcasa/stari.tsx';
import { dataScurta, motivDin, ziScurta } from '../erori/date.ts';
import { etichetaPermisiune, grupePermisiuni, invitatieDin, numeRol, omDin, rolDin, type Invitatie, type Om, type RolCustom } from './date.ts';
import './personal.css';

/**
 * Fila Personal (ADR 0049; așezarea: ADR 0260 §6, felia A.5), doar a owner-ului. La stânga, oamenii: sub nume, cum a intrat
 * fiecare (Google, prin invitație; parolă, pe un cont creat aici; adăugat în consolă), rolul, scoaterea, linkul de parolă;
 * invitațiile deschise stau în aceeași listă, iar „Adaugă un om” deschide formularul (invitația pe e-mail sau contul cu
 * parolă). La dreapta, matricea rol × permisiune: toate rolurile alături, cu permisiunile catalogului pe rânduri; un rol se
 * editează pe coloana lui (numele și bifele), cu „Salvează rolul”. Citirile trec prin reguli; fiecare schimbare trece prin
 * callable-ul `administreazaPersonalul`, cu auditul pe server.
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

  if (date === null) return <SeIncarca text={t('admin.pers.se-incarca')} />;
  if (!date.ok) {
    return (
      <EroareCitire text={t('admin.pers.citire', { motiv: date.motiv })} motiv={date.motiv} reincarca={() => { setDate(null); setRev((n) => n + 1); }}
        atribute={{ 'data-personal': 'eroare-citire' }} />
    );
  }
  const { oameni, roluri, invitatii } = date.d;
  const ocupat = lucru.faza === 'lucreaza';
  return (
    <div className="pers pers-doua">
      <Stare lucru={lucru} />
      <Oameni oameni={oameni} invitatii={invitatii} roluri={roluri} eu={eu} emailEu={emailEu} ocupat={ocupat} fa={fa} limba={limba} />
      <Matrice roluri={roluri} oameni={oameni} invitatii={invitatii} ocupat={ocupat} fa={fa} />
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
    <form className="pers-formular" onSubmit={trimite('invita')} data-personal="formular-adauga">
      <p className="admin-slab">{t('admin.pers.adauga-text')}</p>
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
  );
}

const SURSE = { consola: 'admin.pers.sursa.consola', invitatie: 'admin.pers.sursa.invitatie', 'cont-creat': 'admin.pers.sursa.cont-creat' } as const;

function Oameni({ oameni, invitatii, roluri, eu, emailEu, ocupat, fa, limba }: {
  readonly oameni: readonly Om[]; readonly invitatii: readonly Invitatie[]; readonly roluri: readonly RolCustom[]; readonly eu: string;
  readonly emailEu: string | null; readonly ocupat: boolean; readonly fa: Fa; readonly limba: string;
}): ReactElement {
  const [adauga, setAdauga] = useState(false);
  const [deScos, setDeScos] = useState<string | null>(null);
  const acum = Date.now();
  return (
    <section className="pers-sectiune" aria-labelledby="pers-oameni">
      <div className="pers-cap">
        <h2 id="pers-oameni">{t('admin.pers.oameni')} <span className="admin-slab">{oameni.length}</span></h2>
        <button type="button" className="principal" aria-expanded={adauga} data-personal="adauga" onClick={() => { setAdauga((x) => !x); }}>{t('admin.pers.adauga')}</button>
      </div>
      {adauga ? <Adauga roluri={roluri} ocupat={ocupat} fa={fa} limba={limba} /> : null}
      <ul className="pers-lista">
        {oameni.map((o) => {
          const cine = o.email ?? (o.uid === eu ? emailEu : null) ?? o.uid;
          const nume = numeRol(o.rol, roluri);
          // ADR 0071: owner-ul e fix aici (nici scos, nici alt rol); se schimbă doar din consolă.
          const fix = o.rol === OWNER;
          return (
            <li key={o.uid} data-om={o.email ?? o.uid}>
              <div className="pers-rand">
                <span className="pers-om">
                  <span className="pers-cine">{cine}{o.uid === eu ? <span className="admin-slab"> · {t('admin.pers.tu')}</span> : null}</span>
                  {/* Cum a intrat omul (ADR 0260 §6), din sursa documentului lui. */}
                  <span className="admin-slab" data-personal="metoda">{t(SURSE[o.sursa])}{o.adaugatLa ? ` · ${ziScurta(o.adaugatLa, limba)}` : ''}</span>
                </span>
                {fix ? (
                  <span className="admin-cip" data-stare="atentie" data-personal="owner-fix" title={t('admin.pers.owner-fix')}>{OWNER}</span>
                ) : (
                  <select className="pers-rol" value={nume === null ? '' : (o.rol ?? '')} disabled={ocupat} aria-label={t('admin.pers.rolul-lui', { cine })} data-personal="rol"
                    onChange={(e) => { fa({ actiune: 'schimba-rolul', uid: o.uid, rol: e.target.value }, () => t('admin.pers.rol-schimbat', { cine })); }}>
                    {nume === null ? <option value="" disabled>{t('admin.pers.rol-necunoscut', { rol: o.rol ?? '—' })}</option> : null}
                    <OptiuniRol roluri={roluri} />
                  </select>
                )}
              </div>
              {fix && o.sursa !== 'cont-creat' ? null : (
                <div className="admin-randuri">
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
              )}
            </li>
          );
        })}
        {invitatii.map((i) => {
          const expirata = i.expiraLa !== null && i.expiraLa.getTime() <= acum;
          return (
            <li key={i.id} data-invitatie={i.email}>
              <div className="pers-rand">
                <span className="pers-om">
                  <span className="pers-cine">{i.email}</span>
                  <span className={expirata ? 'admin-eroare' : 'admin-slab'} data-personal="metoda">
                    {t('admin.pers.invitatie-trimisa')} · {t(expirata ? 'admin.pers.expirata' : 'admin.pers.expira', { data: ziScurta(i.expiraLa, limba) })}
                  </span>
                </span>
                <span className="admin-cip">{numeRol(i.rol, roluri) ?? t('admin.pers.rol-necunoscut', { rol: i.rol ?? '—' })}</span>
              </div>
              <button type="button" disabled={ocupat} data-personal="anuleaza"
                onClick={() => { fa({ actiune: 'anuleaza-invitatia', id: i.id }, () => t('admin.pers.anulata', { email: i.email })); }}>
                {t('admin.pers.anuleaza')}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Coloana unui rol nou, până la salvare (id-urile rolurilor au 20 de caractere). */
const NOU = 'nou';

/**
 * Matricea rol × permisiune (ADR 0260 §6): o coloană pe rol (owner-ul are tot), un rând pe permisiunea din catalog, pe
 * zone. Un rol se editează pe coloana lui: numele în capul ei, bifele în celule, apoi „Salvează rolul” (aceeași cerere
 * `salveaza-rol`, cu lista întreagă); „Rol nou” adaugă o coloană în editare.
 */
function Matrice({ roluri, oameni, invitatii, ocupat, fa }: {
  readonly roluri: readonly RolCustom[]; readonly oameni: readonly Om[]; readonly invitatii: readonly Invitatie[]; readonly ocupat: boolean; readonly fa: Fa;
}): ReactElement {
  const [editat, setEditat] = useState<string | null>(null);
  const [nume, setNume] = useState('');
  const [bife, setBife] = useState<ReadonlySet<Permisiune>>(new Set());
  const incepe = (r: RolCustom | null): void => {
    setEditat(r?.id ?? NOU);
    setNume(r?.nume ?? '');
    setBife(new Set(r?.permisiuni ?? []));
  };
  const salveaza = (e: FormEvent): void => {
    e.preventDefault();
    if (editat === null) return;
    const permisiuni = PERMISIUNI.filter((p) => bife.has(p));
    fa({ actiune: 'salveaza-rol', ...(editat === NOU ? {} : { id: editat }), nume, permisiuni }, () => t('admin.pers.rol-salvat', { nume: nume.trim() }));
    setEditat(null);
  };
  const coloane: readonly (RolCustom | null)[] = editat === NOU ? [...roluri, null] : roluri;
  const folosit = (id: string): boolean => oameni.some((o) => o.rol === id) || invitatii.some((i) => i.rol === id);
  return (
    <section className="pers-sectiune" aria-labelledby="pers-roluri">
      <div className="pers-cap">
        <h2 id="pers-roluri">{t('admin.pers.roluri')} <span className="admin-slab">{roluri.length}</span></h2>
        <button type="button" disabled={ocupat || editat !== null} data-personal="rol-nou-buton" onClick={() => { incepe(null); }}>{t('admin.pers.rol-nou')}</button>
      </div>
      <p className="admin-slab">{t('admin.pers.roluri-text')}</p>
      <form className="pers-matrice-loc" onSubmit={salveaza} data-personal="editor-rol">
        <table className="pers-matrice" data-personal="matrice">
          <thead>
            <tr>
              <th colSpan={2} scope="col">{t('admin.pers.permisiuni')}</th>
              <th scope="col">{OWNER}</th>
              {coloane.map((r) => (
                <th key={r?.id ?? NOU} scope="col" data-rol={r?.nume ?? ''}>
                  {editat === (r?.id ?? NOU) ? (
                    <input type="text" required maxLength={NUME_ROL_MAX} value={nume} aria-label={t('admin.pers.nume-rol')} placeholder={t('admin.pers.nume-rol')}
                      data-personal="nume-rol" onChange={(e) => { setNume(e.target.value); }} />
                  ) : r === null ? null : (
                    <>
                      <span>{r.nume}</span>
                      <span className="pers-matrice-act">
                        <button type="button" disabled={ocupat || editat !== null} data-personal="editeaza" onClick={() => { incepe(r); }}>{t('admin.pers.editeaza')}</button>
                        <button type="button" disabled={ocupat || editat !== null || folosit(r.id)} title={folosit(r.id) ? t('admin.pers.rol-folosit') : undefined} data-personal="sterge-rol"
                          onClick={() => { fa({ actiune: 'sterge-rol', id: r.id }, () => t('admin.pers.rol-sters', { nume: r.nume })); }}>
                          {t('admin.pers.sterge')}
                        </button>
                      </span>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupePermisiuni().map((g) => g.permisiuni.map((p, k) => {
              const e = etichetaPermisiune(t(`admin.perm.${p}`));
              return (
                <tr key={p} data-zona={k === 0 ? g.zona : undefined}>
                  {k === 0 ? <th scope="rowgroup" rowSpan={g.permisiuni.length} colSpan={e.fapta === '' ? 2 : 1} title={e.fapta === '' ? t(`admin.perm.${p}.text`) : undefined}>{e.zona}</th> : null}
                  {e.fapta === '' ? null : <th scope="row" title={t(`admin.perm.${p}.text`)}>{e.fapta}</th>}
                  <td className="admin-slab">{t('admin.pers.tot')}</td>
                  {coloane.map((r) => {
                    const id = r?.id ?? NOU;
                    const are = editat === id ? bife.has(p) : r?.permisiuni.includes(p) === true;
                    return (
                      <td key={id} data-celula={`${r?.nume ?? ''}/${p}`} data-are={are}>
                        {editat === id ? (
                          <input type="checkbox" checked={are} aria-label={t(`admin.perm.${p}`)} title={t(`admin.perm.${p}.text`)} data-permisiune={p} onChange={(ev) => {
                            const n = new Set(bife);
                            if (ev.target.checked) n.add(p);
                            else n.delete(p);
                            setBife(n);
                          }} />
                        ) : are ? <span className="pers-da">✓</span> : null}
                      </td>
                    );
                  })}
                </tr>
              );
            }))}
          </tbody>
        </table>
        {editat === null ? null : (
          <div className="admin-randuri">
            <button type="submit" className="principal" disabled={ocupat} data-personal="salveaza-rol">{t('admin.pers.salveaza')}</button>
            <button type="button" data-personal="renunta-rol" onClick={() => { setEditat(null); }}>{t('admin.pers.renunta')}</button>
          </div>
        )}
      </form>
    </section>
  );
}
