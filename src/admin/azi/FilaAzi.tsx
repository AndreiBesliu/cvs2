import { useContext, useEffect, useState, type ReactElement } from 'react';
import type { CerereOwner } from '../../../shared/documentatie.ts';
import { parseazaInline, textSimplu } from '../../docs/markdown.ts';
import { t, traduce, type CheieSimpla } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import type { Fila } from '../adresa.ts';
import { cheieIntamplare, joburiDin, problemeDiagnoza, punctDiagnoza, type Intamplare, type ParteAzi } from '../carcasa/date.ts';
import { ContextCarcasa, EroareCitire, LegaturaFila, ListaGoala, SeIncarca } from '../carcasa/stari.tsx';
import type { Sumar } from '../carcasa/sumar.ts';
import type { Verificare } from '../diagnoza/verificari.ts';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { dataScurta, type Masura } from '../erori/date.ts';

/**
 * Fila Azi (ADR 0260 §1), prima după intrare: cifrele care cer o mână, joburile de noapte (cu restul problemelor
 * Diagnozei), „Ce așteaptă de la tine” (din roadmap, doar owner-ul) și ultimele întâmplări (din audit). Fiecare rând
 * duce în fila lui. Doar părțile pe care rolul le vede (`partiAzi`); cifrele vin din rezumatul citit de carcasă.
 */

const CARTELE: readonly { readonly parte: 'erori' | 'tichete' | 'sugestii' | 'conturi'; readonly fila: Fila; readonly text: CheieSimpla }[] = [
  { parte: 'erori', fila: 'erori', text: 'admin.azi.erori' },
  { parte: 'tichete', fila: 'tichete', text: 'admin.azi.tichete' },
  { parte: 'sugestii', fila: 'sugestii', text: 'admin.azi.sugestii' },
  { parte: 'conturi', fila: 'utilizatori', text: 'admin.azi.conturi' },
];

const STARI: Readonly<Record<Verificare['stare'], CheieSimpla>> = {
  bine: 'admin.diag.bine', atentie: 'admin.diag.atentie', esec: 'admin.diag.esec', info: 'admin.diag.info',
};

export function FilaAzi({ parti, sumar, reincarca, aducator }: {
  readonly parti: ReadonlySet<ParteAzi>; readonly sumar: Sumar | null; readonly reincarca: () => void; readonly aducator: AducatorDocumentatie;
}): ReactElement {
  const l = useLimba();
  const cartele = CARTELE.filter((c) => parti.has(c.parte));
  return (
    <div className="azi" data-admin="azi">
      <div className="azi-cap">
        <h2>{t('admin.fila.azi')}</h2>
        <span className="admin-slab">{new Intl.DateTimeFormat(l, { dateStyle: 'full' }).format(Date.now())}</span>
        <button type="button" data-azi="reincarca" disabled={sumar === null} onClick={reincarca}>{t('admin.erori.reincarca')}</button>
      </div>
      {cartele.length > 0 ? (
        <ul className="azi-cifre">
          {cartele.map((c) => {
            const m: Masura<number> | undefined = sumar?.[c.parte];
            return (
              <li key={c.parte}>
                <LegaturaFila fila={c.fila} className="azi-cartela" data-azi={c.parte}>
                  <span className="admin-slab">{t(c.text)}</span>
                  <strong data-cifra="">{m === undefined ? (sumar === null ? '…' : '?') : m.ok ? m.valoare : '?'}</strong>
                  {m && !m.ok ? <span className="admin-eroare">{t('admin.azi.necitit', { motiv: m.motiv })}</span> : null}
                </LegaturaFila>
              </li>
            );
          })}
        </ul>
      ) : null}
      {parti.has('joburi') || parti.has('asteapta') ? (
        <div className="azi-coloane">
          {parti.has('joburi') ? <Joburi v={sumar === null ? null : sumar.diagnoza ?? []} /> : null}
          {parti.has('asteapta') ? <Asteapta aducator={aducator} /> : null}
        </div>
      ) : null}
      {parti.has('intamplari') ? <Intamplari m={sumar === null ? null : sumar.intamplari ?? null} /> : null}
    </div>
  );
}

function Joburi({ v }: { readonly v: readonly Verificare[] | null }): ReactElement {
  const l = useLimba();
  const probleme = v === null ? [] : problemeDiagnoza(v);
  return (
    <section className="azi-sectiune" data-azi="joburi" aria-labelledby="azi-joburi">
      <h3 id="azi-joburi">{t('admin.azi.joburi')}</h3>
      {v === null ? <SeIncarca text={t('admin.diag.se-ruleaza')} /> : (
        <ul className="azi-randuri">
          {joburiDin(v).map((j) => (
            <li key={j.id}>
              <LegaturaFila fila="diagnoza" className="azi-rand" data-azi-job={j.id.slice('job:'.length)} data-stare={j.stare}>
                <span className="admin-cip" data-stare={j.stare}>{t(STARI[j.stare])}</span>
                <span className="azi-rand-text">{t(j.titlu)}</span>
                <span className="admin-slab">{traduce(l, j.masura.cheie, j.masura.param)}</span>
              </LegaturaFila>
            </li>
          ))}
          {probleme.length > 0 ? (
            <li>
              <LegaturaFila fila="diagnoza" className="azi-rand" data-azi-diagnoza="">
                <span className="admin-cip" data-stare={punctDiagnoza(probleme) ?? 'info'}>{t(STARI[punctDiagnoza(probleme) ?? 'info'])}</span>
                <span className="azi-rand-text">{t('admin.azi.diagnoza', { n: probleme.length })}</span>
              </LegaturaFila>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

/** „Ce așteaptă de la tine”: aceeași listă ca în fila Roadmap (ADR 0048), adusă la deschiderea filei Azi. */
function Asteapta({ aducator }: { readonly aducator: AducatorDocumentatie }): ReactElement {
  const l = useLimba();
  const [r, setR] = useState<Masura<readonly CerereOwner[]> | null>(null);
  const [rev, setRev] = useState(0);
  useEffect(() => {
    let viu = true;
    setR(null);
    aducator.roadmap(l).then(
      (x) => { if (viu) setR({ ok: true, valoare: x.owner }); },
      (e: unknown) => { if (viu) setR({ ok: false, motiv: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { viu = false; };
  }, [aducator, l, rev]);
  const simplu = (md: string): string => textSimplu(parseazaInline(md));
  return (
    <section className="azi-sectiune" data-azi="asteapta" aria-labelledby="azi-asteapta">
      <div className="azi-sectiune-cap">
        <h3 id="azi-asteapta">{t('admin.azi.asteapta')}</h3>
        <LegaturaFila fila="roadmap">{t('admin.azi.spre-roadmap')}</LegaturaFila>
      </div>
      {r === null ? <SeIncarca text={t('admin.doc.se-incarca')} />
        : !r.ok ? (
          <EroareCitire text={t('admin.doc.esec', { motiv: r.motiv === 'forma' ? t('admin.doc.forma') : r.motiv })} motiv={r.motiv}
            reincarca={() => { setRev((n) => n + 1); }} atribute={{ 'data-azi-eroare': 'asteapta' }} />
        )
          : r.valoare.length === 0 ? <ListaGoala text={t('admin.azi.asteapta-gol')} atribute={{ 'data-azi-gol': 'asteapta' }} />
            : (
              <ul className="azi-randuri">
                {r.valoare.slice(0, 5).map((o, k) => (
                  <li key={k}>
                    <LegaturaFila fila="roadmap" className="azi-rand" data-asteapta="" title={simplu(o.ce)}>
                      <span className="azi-rand-text">{simplu(o.ce)}</span>
                      <span className="admin-slab">{simplu(o.pentru)}</span>
                    </LegaturaFila>
                  </li>
                ))}
              </ul>
            )}
    </section>
  );
}

function textIntamplare(i: Intamplare): string {
  const c = cheieIntamplare(i);
  switch (c.cheie) {
    case 'admin.azi.ev.tichet-stare': return t(c.cheie, { stare: t(`admin.tic.stare.${c.stare ?? 'necunoscuta'}`) });
    case 'admin.azi.ev.sugestie-decisa': return t(c.cheie, { stare: t(`admin.sug.stare.${c.stare ?? 'necunoscuta'}`) });
    case 'admin.azi.ev.sugestie-noua':
    case 'admin.azi.ev.sugestie-editata': return t(c.cheie, { titlu: c.titlu });
    case 'admin.azi.ev.alta': return t(c.cheie, { actiune: i.actiune || '?' });
    default: return t(c.cheie);
  }
}

/** Ultimele întâmplări, din auditul existent (ADR 0040 §4), cea mai nouă întâi; fiecare duce în fila țintei ei. */
function Intamplari({ m }: { readonly m: Masura<readonly Intamplare[]> | null }): ReactElement {
  const l = useLimba();
  const c = useContext(ContextCarcasa);
  return (
    <section className="azi-sectiune" data-azi="intamplari" aria-labelledby="azi-intamplari">
      <h3 id="azi-intamplari">{t('admin.azi.intamplari')}</h3>
      {m === null ? <SeIncarca text={t('admin.erori.se-incarca')} />
        : !m.ok ? <EroareCitire text={t('admin.azi.necitit', { motiv: m.motiv })} motiv={m.motiv} atribute={{ 'data-azi-eroare': 'intamplari' }} />
          : m.valoare.length === 0 ? <ListaGoala text={t('admin.azi.intamplari-gol')} atribute={{ 'data-azi-gol': 'intamplari' }} />
            : (
              <ul className="azi-randuri">
                {m.valoare.map((i) => {
                  const continut = (
                    <>
                      <span className="azi-ora">{dataScurta(i.cand, l)}</span>
                      <span className="azi-rand-text">{textIntamplare(i)}</span>
                      <span className="admin-slab">{t(`admin.azi.cine.${i.cine}`)}</span>
                    </>
                  );
                  return (
                    <li key={i.id}>
                      {i.fila !== null && c?.vede(i.fila) ? <LegaturaFila fila={i.fila} className="azi-rand" data-intamplare={i.id}>{continut}</LegaturaFila>
                        : <span className="azi-rand" data-intamplare={i.id}>{continut}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
    </section>
  );
}
