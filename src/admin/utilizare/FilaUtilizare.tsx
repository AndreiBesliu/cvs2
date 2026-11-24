import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore/lite';
import type { CatalogActiuni } from '../../../shared/documentatie.ts';
import { CALCULE, TREPTE_MS, type Calcul } from '../../../shared/utilizare.ts';
import { COLECTIE_UTILIZARE_ZI, ziuaLocala } from '../../../shared/utilizareZi.ts';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { limba, t, traduce, type Cheie } from '../../i18n/t.ts';
import type { Limba } from '../../i18n/tipuri.ts';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { motivDin, type Masura } from '../erori/date.ts';
import {
  ALEGERI_SEGMENT, celeMaiFolosite, cifre, dialoguriParasite, durate, nefolosite, PERIOADE, primaZi, refuzuri, sumePerioada,
  type AlegereSegment, type Perioada,
} from './date.ts';
import './utilizare.css';

/**
 * Fila Utilizare (ADR 0262 §6, felia A.9b): sumele zilelor unei perioade (ieri și zilele dinainte), scrise de jobul de noapte;
 * nicio citire a loturilor. Perioada (7, 30, 90 de zile) și cine (clienții, personalul, toți); cifrele; cele mai folosite
 * acțiuni, cu partea pornită din taste și din paletă; ce nu se folosește (din catalogul acțiunilor, generat la build);
 * frecările (refuzurile cu motivul, dialogurile părăsite); duratele (mediana și cele mai lente 5 %). Vine într-o bucată a ei,
 * adusă la deschiderea filei. Cere „Utilizare: citește”.
 */

const esteCalcul = (x: string): x is Calcul => (CALCULE as readonly string[]).includes(x);
const barPe = (p: number): CSSProperties => ({ ['--p' as string]: String(Math.max(0, Math.min(1, p))) }) as CSSProperties;

/**
 * Textul unui motiv de refuz, dacă e o cheie a mesajelor de bază (încărcate și în `/admin`), fără locuri de completat; altfel
 * null, și fila arată cheia. Motivele editorului (din mesajele lui, aduse la cerere) rămân chei.
 */
function textMotiv(motiv: string, l: Limba): string | null {
  if (!motiv.startsWith('motiv.')) return null;
  try {
    const x = traduce(l, motiv as Cheie);
    return /\{\w+\}/.test(x) ? null : x;
  } catch {
    return null;
  }
}

/** Treapta unei durate, ca text: „sub 0,3 s”, „sub 5 min”; ultima, „peste 5 min”. */
function textTreapta(ms: number | null, l: string): string {
  if (ms === null) return '–';
  const nr = new Intl.NumberFormat(l === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 1 });
  const v = (x: number): string => (x >= 60_000 ? `${nr.format(x / 60_000)} min` : `${nr.format(x / 1000)} s`);
  const ultima = TREPTE_MS[TREPTE_MS.length - 1];
  const penultima = TREPTE_MS[TREPTE_MS.length - 2] ?? 0;
  return ms === ultima ? t('admin.uz.peste', { v: v(penultima) }) : t('admin.uz.sub', { v: v(ms) });
}

export function FilaUtilizare({ con, aducator }: { readonly con: Conexiune; readonly aducator: AducatorDocumentatie }): ReactElement {
  const l = limba();
  const [perioada, setPerioada] = useState<Perioada>(30);
  const [segment, setSegment] = useState<AlegereSegment>('clienti');
  const [rev, setRev] = useState(0);
  const [zile, setZile] = useState<Masura<readonly unknown[]> | null>(null);
  const [catalog, setCatalog] = useState<Masura<CatalogActiuni> | null>(null);

  useEffect(() => {
    let viu = true;
    setZile(null);
    const azi = ziuaLocala(Date.now());
    getDocs(query(collection(con.db, COLECTIE_UTILIZARE_ZI), where('zi', '>=', primaZi(azi, perioada)), where('zi', '<', azi))).then(
      (s) => { if (viu) setZile({ ok: true, valoare: s.docs.map((d) => d.data()) }); },
      (e: unknown) => { if (viu) setZile({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, perioada, rev]);
  useEffect(() => {
    let viu = true;
    aducator.actiuni().then(
      (c) => { if (viu) setCatalog({ ok: true, valoare: c }); },
      (e: unknown) => { if (viu) setCatalog({ ok: false, motiv: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { viu = false; };
  }, [aducator, rev]);

  const sume = useMemo(() => (zile?.ok ? sumePerioada(zile.valoare, segment) : null), [zile, segment]);
  const nume = useMemo(() => {
    const m = new Map<string, string>();
    if (catalog?.ok) for (const a of [...catalog.valoare.actiuni, ...catalog.valoare.unelte]) m.set(a.id, l === 'en' ? a.en : a.ro);
    return m;
  }, [catalog, l]);
  const numeActiune = (id: string): ReactElement => <span title={id}>{nume.get(id) ?? <code>{id}</code>}</span>;

  const alegeri = (
    <div className="uz-alegeri">
      <div role="group" aria-label={t('admin.uz.perioada')} className="admin-segmente">
        {PERIOADE.map((p) => (
          <button key={p} type="button" data-uz-perioada={p} aria-pressed={p === perioada} onClick={() => { setPerioada(p); }}>
            {t('admin.uz.zile', { n: p })}
          </button>
        ))}
      </div>
      <label className="uz-segment">
        {t('admin.uz.segment')}{' '}
        <select data-uz="segment" value={segment} onChange={(e) => { setSegment(e.currentTarget.value as AlegereSegment); }}>
          {ALEGERI_SEGMENT.map((s) => <option key={s} value={s}>{t(`admin.uz.segment.${s}`)}</option>)}
        </select>
      </label>
    </div>
  );

  if (zile === null) return <div className="uz">{alegeri}<p className="admin-slab" aria-busy="true">…</p></div>;
  if (!zile.ok || sume === null) {
    return (
      <div className="uz">
        {alegeri}
        <p className="admin-eroare" role="alert" data-uz="eroare">{t('admin.uz.citire', { motiv: zile.ok ? '' : zile.motiv })}</p>
        <button type="button" onClick={() => { setRev((r) => r + 1); }}>{t('admin.uz.reincearca')}</button>
      </div>
    );
  }
  if (sume.zile === 0) return <div className="uz">{alegeri}<p className="admin-slab" data-uz="gol">{t('admin.uz.gol')}</p></div>;

  const c = cifre(sume);
  const folosite = celeMaiFolosite(sume);
  const maxim = folosite[0]?.n ?? 1;
  const refuz = refuzuri(sume);
  const parasite = dialoguriParasite(sume);
  const dur = durate(sume);
  return (
    <div className="uz" data-uz="fila">
      {alegeri}
      <p className="admin-slab" data-uz="adunate">{t('admin.uz.adunate', { n: sume.zile })}</p>
      <dl className="uz-cifre">
        <div data-uz-cifra="oameni"><dt>{t('admin.uz.cifra.oameni')}</dt><dd>{t('admin.uz.aprox', { n: c.oameni })}</dd></div>
        <div data-uz-cifra="sesiuni"><dt>{t('admin.uz.cifra.sesiuni')}</dt><dd>{c.sesiuni}</dd></div>
        <div data-uz-cifra="exporturi"><dt>{t('admin.uz.cifra.exporturi')}</dt><dd>{c.exporturi}</dd></div>
        <div data-uz-cifra="refuzate"><dt>{t('admin.uz.cifra.refuzate')}</dt><dd>{c.refuzate}</dd></div>
      </dl>

      <section className="uz-sectiune" aria-labelledby="uz-folosite">
        <h3 id="uz-folosite">{t('admin.uz.folosite')} <span className="admin-slab">{t('admin.uz.folosite.nota')}</span></h3>
        {folosite.length === 0 ? <p className="admin-slab">{t('admin.uz.nimic')}</p> : (
          <ol className="uz-bare">
            {folosite.map((r) => (
              <li key={r.id} data-uz-folosita={r.id}>
                <span className="uz-nume">{numeActiune(r.id)}</span>
                <span className="uz-bara" style={barPe(r.n / maxim)} title={t('admin.uz.taste', { n: r.taste })}>
                  <span className="uz-bara-taste" style={barPe(r.n > 0 ? r.taste / r.n : 0)} />
                </span>
                <span className="uz-numar">{t('admin.uz.rand', { n: r.oameni, ori: r.n })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="uz-sectiune" aria-labelledby="uz-nefolosite">
        <h3 id="uz-nefolosite">{t('admin.uz.nefolosite')} <span className="admin-slab">{t('admin.uz.nefolosite.nota')}</span></h3>
        {catalog === null ? <p className="admin-slab" aria-busy="true">…</p>
          : !catalog.ok ? <p className="admin-eroare" role="alert" data-uz="catalog-eroare">{t('admin.uz.catalog', { motiv: catalog.motiv })}</p> : (
            <table className="uz-tabel" data-uz="nefolosite">
              <thead><tr><th scope="col">{t('admin.uz.col.nume')}</th><th scope="col">{t('admin.uz.col.oameni')}</th><th scope="col">{t('admin.uz.col.ori')}</th></tr></thead>
              <tbody>
                {nefolosite(catalog.valoare, sume).map((r) => (
                  <tr key={`${r.fel}:${r.id}`} data-uz-nefolosita={r.id}>
                    <th scope="row">{numeActiune(r.id)}{r.fel === 'unealta' ? <span className="admin-slab"> · {t('admin.uz.unealta')}</span> : null}</th>
                    <td>{r.oameni}</td><td>{r.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>

      <section className="uz-sectiune" aria-labelledby="uz-frecari">
        <h3 id="uz-frecari">{t('admin.uz.frecari')}</h3>
        <h4>{t('admin.uz.refuzuri')}</h4>
        {refuz.length === 0 ? <p className="admin-slab">{t('admin.uz.nimic')}</p> : (
          <ol className="uz-lista" data-uz="refuzuri">
            {refuz.map((r) => {
              const text = textMotiv(r.motiv, l);
              return (
                <li key={`${r.id} ${r.motiv}`} data-uz-refuz={r.id} data-uz-motiv={r.motiv}>
                  {numeActiune(r.id)} · {text === null ? <code>{r.motiv}</code> : <span title={r.motiv}>{text}</span>} · {r.n}
                </li>
              );
            })}
          </ol>
        )}
        <h4>{t('admin.uz.parasite')}</h4>
        {parasite.length === 0 ? <p className="admin-slab">{t('admin.uz.nimic')}</p> : (
          <ol className="uz-lista" data-uz="parasite">
            {parasite.map((d) => <li key={d.id} data-uz-parasit={d.id}><code>{d.id}</code> · {t('admin.uz.parasit', { n: d.deschis, renuntat: d.renuntat })}</li>)}
          </ol>
        )}
      </section>

      <section className="uz-sectiune" aria-labelledby="uz-durate">
        <h3 id="uz-durate">{t('admin.uz.durate')} <span className="admin-slab">{t('admin.uz.durate.nota')}</span></h3>
        {dur.length === 0 ? <p className="admin-slab">{t('admin.uz.nimic')}</p> : (
          <table className="uz-tabel" data-uz="durate">
            <thead>
              <tr>
                <th scope="col">{t('admin.uz.col.calcul')}</th><th scope="col">{t('admin.uz.col.cate')}</th><th scope="col">{t('admin.uz.col.mediana')}</th>
                <th scope="col">{t('admin.uz.col.lente')}</th><th scope="col">{t('admin.uz.col.erori')}</th>
              </tr>
            </thead>
            <tbody>
              {dur.map((r) => (
                <tr key={r.id} data-uz-durata={r.id}>
                  <th scope="row">{esteCalcul(r.id) ? t(`admin.uz.calcul.${r.id}`) : <code>{r.id}</code>}</th><td>{r.n}</td><td>{textTreapta(r.mediana, l)}</td>
                  <td>{textTreapta(r.lente, l)}</td><td>{r.erori}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
