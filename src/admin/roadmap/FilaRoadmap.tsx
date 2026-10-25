import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import type { CerereOwner, Etapa, Felie, Roadmap } from '../../../shared/documentatie.ts';
import { textSimplu, parseazaInline } from '../../docs/markdown.ts';
import { TextMd, type Legaturi } from '../../docs/Markdown.tsx';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { legaturaDocument, legaturiSpreDocumente, type Deschide } from '../documentatie/legaturi.ts';
import { aduseGata, etapaImplicita, interval, progresEtapa, reperLive } from './vedere.ts';
import './roadmap.css';

/**
 * Fila Roadmap din `/admin` (ADR 0048): cele 30 de etape pe săptămâni, cu starea dedusă la build din fișe (nimic scris de
 * mână), plăcile și live-urile ca repere, panoul etapei alese (ținta, ce închide, placa, feliile cu datele și ADR-urile
 * lor) și ce așteaptă de la owner, sus. Datele vin la deschiderea filei (`roadmap.json`), nu cu pagina.
 */
export function FilaRoadmap({ aducator, deschide }: { readonly aducator: AducatorDocumentatie; readonly deschide: Deschide }): ReactElement {
  // Limba activă alege fișierul (ADR 0056); la schimbarea ei, roadmap-ul se cere din nou.
  const limba = useLimba();
  const [stare, setStare] = useState<{ readonly faza: 'se-incarca' } | { readonly faza: 'eroare'; readonly motiv: string } | { readonly faza: 'gata'; readonly r: Roadmap }>({ faza: 'se-incarca' });
  const viu = useRef(true);
  const incarca = useCallback((): void => {
    setStare({ faza: 'se-incarca' });
    aducator.roadmap(limba).then(
      (r) => { if (viu.current) setStare({ faza: 'gata', r }); },
      (e: unknown) => { if (viu.current) setStare({ faza: 'eroare', motiv: e instanceof Error ? e.message : String(e) }); },
    );
  }, [aducator, limba]);
  useEffect(() => {
    viu.current = true;
    incarca();
    return () => { viu.current = false; };
  }, [incarca]);

  if (stare.faza === 'se-incarca') return <p className="admin-mesaj" aria-busy="true">{t('admin.doc.se-incarca')}</p>;
  if (stare.faza === 'eroare') {
    return (
      <div className="admin-randuri" role="alert">
        <p className="admin-eroare">{t('admin.doc.esec', { motiv: stare.motiv === 'forma' ? t('admin.doc.forma') : stare.motiv })}</p>
        <button type="button" onClick={incarca}>{t('admin.doc.reincearca')}</button>
      </div>
    );
  }
  return <VedereRoadmap r={stare.r} deschide={deschide} />;
}

const numeEtapa = (e: Etapa): string => (e.numar === null ? t('admin.rm.tampon', { id: e.id }) : t('admin.rm.etapa', { id: e.id }));
const textStare = (e: Etapa): string => (e.asteaptaPlaca ? t('admin.rm.asteapta-placa') : t(`admin.rm.stare.${e.stare}`));

function VedereRoadmap({ r, deschide }: { readonly r: Roadmap; readonly deschide: Deschide }): ReactElement {
  const [ales, setAles] = useState<string | null>(() => etapaImplicita(r));
  const legaturi = useMemo(() => legaturiSpreDocumente(deschide), [deschide]);
  const etapa = r.etape.find((e) => e.id === ales) ?? r.etape[0];
  const curenta = r.etape.find((e) => e.curenta);
  const c = r.cifre;
  return (
    <div className="rm">
      <ul className="rm-cifre">
        <li className="rm-cifra" data-cifra="etapa">
          <span className="rm-cifra-nume">{t('admin.rm.cifra.etapa')}</span>
          <span className="rm-cifra-valoare">{c.etapaCurenta ?? '—'} <small>{t('admin.rm.cifra.din', { total: c.etape })}</small></span>
          <span className="rm-cifra-bara" aria-hidden="true"><span style={umplere((curenta?.saptamana ?? 0) / Math.max(1, c.saptamani))} /></span>
          <span className="rm-cifra-detaliu">{t('admin.rm.cifra.saptamana', { s: curenta?.saptamana ?? 0, total: c.saptamani })}</span>
        </li>
        <li className="rm-cifra" data-cifra="felii">
          <span className="rm-cifra-nume">{t('admin.rm.cifra.felii')}</span>
          <span className="rm-cifra-valoare">{c.felii.gata}</span>
          <span className="rm-cifra-bara" aria-hidden="true"><span style={umplere(c.felii.gata / Math.max(1, c.felii.gata + c.felii.inLucru + c.felii.deFacut))} /></span>
          <span className="rm-cifra-detaliu">{t('admin.rm.cifra.felii-det', { aduse: c.felii.aduse, deFacut: c.felii.deFacut })}</span>
        </li>
        <li className="rm-cifra" data-cifra="adr">
          <span className="rm-cifra-nume">{t('admin.rm.cifra.adr')}</span>
          <span className="rm-cifra-valoare">{c.adr.total}</span>
          <span className="rm-cifra-bara" aria-hidden="true"><span style={umplere(c.adr.acceptate / Math.max(1, c.adr.total))} /></span>
          <span className="rm-cifra-detaliu">{t('admin.rm.cifra.adr-det', { acceptate: c.adr.acceptate, propuse: c.adr.propuse })}</span>
        </li>
        <li className="rm-cifra" data-cifra="placi">
          <span className="rm-cifra-nume">{t('admin.rm.cifra.placi')}</span>
          <span className="rm-cifra-valoare">{c.placi.taiate} <small>{t('admin.rm.cifra.din', { total: c.placi.fise })}</small></span>
          <span className="rm-cifra-bara" aria-hidden="true"><span style={umplere(c.placi.taiate / Math.max(1, c.placi.fise))} /></span>
          <span className="rm-cifra-detaliu">{t('admin.rm.cifra.placi-det', { fise: c.placi.fise })}</span>
        </li>
      </ul>

      <PanouOwner owner={r.owner} legaturi={legaturi} deschide={deschide} />

      <section className="rm-cronologie" aria-labelledby="rm-cronologie-titlu">
        <div className="rm-cap">
          <h2 id="rm-cronologie-titlu">{t('admin.rm.cronologie')}</h2>
          <Legenda />
        </div>
        <Pista etape={r.etape} ales={etapa?.id ?? null} alege={setAles} />
      </section>

      {etapa ? <PanouEtapa e={etapa} r={r} legaturi={legaturi} deschide={deschide} /> : null}
      <p className="admin-slab rm-sursa">{t('admin.rm.generat')}</p>
      {r.netraduse > 0 ? <p className="admin-slab rm-sursa" data-rm="netraduse">{t('admin.rm.netraduse', { n: r.netraduse })}</p> : null}
    </div>
  );
}

/** Lățimea umplerii, prin proprietatea CSS `--p` (CSSOM, deci permisă de CSP-ul fără stiluri inline). */
function umplere(p: number): CSSProperties {
  return { ['--p' as string]: String(Math.max(0, Math.min(1, p))) } as CSSProperties;
}

function PanouOwner({ owner, legaturi, deschide }: { readonly owner: readonly CerereOwner[]; readonly legaturi: Legaturi; readonly deschide: Deschide }): ReactElement {
  return (
    <section className="rm-owner" aria-labelledby="rm-owner-titlu" data-roadmap="owner">
      <h2 id="rm-owner-titlu">
        {t('admin.rm.owner')}
        <span className="rm-numar" aria-hidden="true">{owner.length}</span>
      </h2>
      {owner.length === 0 ? <p className="admin-slab">{t('admin.rm.owner-gol')}</p> : (
        <ol className="rm-owner-lista">
          {owner.map((o, k) => {
            const l = legaturaDocument(o.fisa, o.ancora, deschide);
            return (
              <li key={k}>
                <span className="rm-owner-ce"><TextMd md={o.ce} legaturi={legaturi} /></span>
                <span className="rm-owner-meta">
                  <span className="rm-eticheta-mica"><TextMd md={t('admin.rm.owner-pentru', { pentru: o.pentru })} legaturi={legaturi} /></span>
                  <span className="rm-eticheta-mica"><TextMd md={t('admin.rm.owner-termen', { termen: o.termen })} legaturi={legaturi} /></span>
                  <a href={l.href} onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); l.actiune(); } }}>
                    {t('admin.rm.owner-sursa', { etapa: o.etapa })}
                  </a>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Legenda(): ReactElement {
  return (
    <ul className="rm-legenda" aria-label={t('admin.rm.legenda')}>
      {(['gata', 'in-lucru', 'urmatoare', 'viitoare'] as const).map((s) => (
        <li key={s}><span className="rm-mostra" data-stare={s} aria-hidden="true" />{t(`admin.rm.stare.${s}`)}</li>
      ))}
      <li><span className="rm-mostra" data-stare="in-lucru" data-asteapta="true" aria-hidden="true" />{t('admin.rm.asteapta-placa')}</li>
      <li><span className="rm-semn rm-semn-placa" aria-hidden="true" />{t('admin.rm.leg.placa')}</li>
      <li><span className="rm-semn rm-semn-placa" data-taiata="true" aria-hidden="true" />{t('admin.rm.leg.placa-taiata')}</li>
      <li><span className="rm-semn rm-semn-live" aria-hidden="true" />{t('admin.rm.leg.live')}</li>
      <li><span className="rm-semn rm-semn-reper" aria-hidden="true" />{t('admin.rm.leg.reper')}</li>
      <li><span className="rm-aduse" aria-hidden="true">↑</span>{t('admin.rm.leg.aduse')}</li>
    </ul>
  );
}

function Pista({ etape, ales, alege }: { readonly etape: readonly Etapa[]; readonly ales: string | null; readonly alege: (id: string) => void }): ReactElement {
  const butoane = useRef(new Map<string, HTMLButtonElement>());
  const muta = (e: KeyboardEvent): void => {
    const k = etape.findIndex((x) => x.id === ales);
    const tinta = { ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: etape.length - 1 }[e.key];
    if (tinta === undefined) return;
    e.preventDefault();
    const urm = etape[Math.max(0, Math.min(etape.length - 1, tinta))];
    if (!urm) return;
    alege(urm.id);
    butoane.current.get(urm.id)?.focus();
  };
  return (
    <div className="rm-pista" role="group" aria-label={t('admin.rm.etapele')} onKeyDown={muta}>
      {etape.map((e) => {
        const p = progresEtapa(e);
        const reper = e.areLive ? reperLive(e.live) : null;
        const progres = p.total > 0 ? `, ${t(p.fel === 'felii' ? 'admin.rm.progres' : 'admin.rm.progres-puncte', { gata: p.gata, n: p.total })}` : '';
        const n = aduseGata(e);
        const eticheta = t('admin.rm.eticheta-etapa', {
          nume: numeEtapa(e), s: e.saptamana, stare: textStare(e), progres, aduse: n > 0 ? `, ${t('admin.rm.aduse-n', { n })}` : '',
          acum: e.curenta ? `, ${t('admin.rm.acum')}` : '',
        });
        return (
          <button
            key={e.id}
            ref={(b) => { if (b) butoane.current.set(e.id, b); else butoane.current.delete(e.id); }}
            type="button"
            className="rm-etapa"
            data-etapa={e.id}
            data-stare={e.stare}
            data-asteapta={e.asteaptaPlaca || undefined}
            data-tampon={e.numar === null || undefined}
            data-progres={p.fel}
            aria-pressed={e.id === ales}
            aria-current={e.curenta ? 'step' : undefined}
            aria-label={eticheta}
            title={`${numeEtapa(e)}: ${textSimplu(parseazaInline(e.tinta))}`}
            tabIndex={e.id === ales ? 0 : -1}
            onClick={() => { alege(e.id); }}
          >
            <span className="rm-acum" aria-hidden="true">{e.curenta ? t('admin.rm.acum') : ''}</span>
            <span className="rm-bara" aria-hidden="true"><span className="rm-umplere" style={umplere(p.total > 0 ? p.gata / p.total : 0)} /></span>
            <span className="rm-id" aria-hidden="true">{e.numar ?? e.id}</span>
            <span className="rm-semne" aria-hidden="true">
              {n > 0 ? <span className="rm-aduse" data-rm="aduse">↑{n}</span> : null}
              {e.fisaPlacii ? <span className="rm-semn rm-semn-placa" data-taiata={e.placaTaiata !== null || undefined} /> : null}
              {e.areLive ? <span className={reper ? 'rm-semn rm-semn-reper' : 'rm-semn rm-semn-live'} /> : null}
            </span>
            <span className="rm-sapt" aria-hidden="true">{t('admin.rm.sapt-scurt', { s: e.saptamana })}</span>
          </button>
        );
      })}
    </div>
  );
}

function PanouEtapa({ e, r, legaturi, deschide }: { readonly e: Etapa; readonly r: Roadmap; readonly legaturi: Legaturi; readonly deschide: Deschide }): ReactElement {
  const p = progresEtapa(e);
  const reper = e.areLive ? reperLive(e.live) : null;
  const link = (cale: string, text: string): ReactElement => {
    const l = legaturaDocument(cale, null, deschide);
    return <a href={l.href} onClick={(ev) => { if (ev.button === 0 && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) { ev.preventDefault(); l.actiune(); } }}>{text}</a>;
  };
  return (
    <section className="rm-detalii" aria-labelledby="rm-detalii-titlu" data-roadmap-etapa={e.id} data-stare={e.stare} data-asteapta={e.asteaptaPlaca || undefined}>
      <header className="rm-detalii-cap">
        <div className="admin-randuri">
          <span className="rm-insigna">{numeEtapa(e)} · {t('admin.rm.saptamana', { s: e.saptamana })}</span>
          <span className="rm-cip-stare" data-stare={e.stare} data-asteapta={e.asteaptaPlaca || undefined}>{textStare(e)}</span>
          {e.curenta ? <span className="rm-cip-acum">{t('admin.rm.acum')}</span> : null}
        </div>
        <h2 id="rm-detalii-titlu"><TextMd md={e.tinta} legaturi={legaturi} /></h2>
      </header>
      <dl className="rm-fapte">
        <div><dt>{t('admin.rm.inchide')}</dt><dd><TextMd md={e.inchide} legaturi={legaturi} /></dd></div>
        <div>
          <dt>{t('admin.rm.placa-proba')}</dt>
          <dd>
            <TextMd md={e.placa} legaturi={legaturi} />
            <span className="rm-sub">
              {e.fisaPlacii
                ? <>{link(e.fisaPlacii, t('admin.rm.fisa-placii'))} · {e.placaTaiata ? t('admin.rm.placa-taiata', { data: e.placaTaiata }) : t('admin.rm.placa-netaiata')}</>
                : t('admin.rm.placa-fara-fisa')}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t('admin.rm.live')}</dt>
          <dd>
            <span className="rm-live" data-live={e.areLive}><TextMd md={e.live} legaturi={legaturi} /></span>
            {reper ? <span className="rm-semn rm-semn-reper rm-semn-inline" aria-hidden="true" /> : null}
          </dd>
        </div>
        <div>
          <dt>{t('admin.rm.fisa')}</dt>
          <dd>
            {e.fisa ? link(e.fisa, e.fisa) : t('admin.rm.fisa-lipsa')}
            {e.pornita ? <span className="rm-sub">{t('admin.rm.pornita', { data: e.pornita })}</span> : null}
          </dd>
        </div>
      </dl>

      {p.total > 0 ? (
        <div className="rm-progres">
          <span className="rm-progres-bara" aria-hidden="true"><span style={umplere(p.gata / p.total)} /></span>
          <span>{t(p.fel === 'felii' ? 'admin.rm.progres' : 'admin.rm.progres-puncte', { gata: p.gata, n: p.total })}</span>
        </div>
      ) : null}

      {e.puncte.length > 0 ? (
        <>
          <h3>{t('admin.rm.puncte')}</h3>
          <ol className="rm-puncte">
            {e.puncte.map((pt) => (
              <li key={pt.numar} data-atins={pt.felii.length > 0 || undefined}>
                <span className="rm-punct-nr">{pt.numar}</span>
                <span className="rm-punct-titlu"><TextMd md={pt.titlu} legaturi={legaturi} /></span>
                {pt.felii.map((id) => {
                  const f = e.felii.find((x) => x.id === id);
                  return <span key={id} className="rm-cip-felie" data-stare={f?.stare}>{id}</span>;
                })}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <h3>{t('admin.rm.felii')}</h3>
      {e.felii.length === 0 ? <p className="admin-slab">{t('admin.rm.felii-goale')}</p> : (
        <ol className="rm-felii">
          {e.felii.map((f) => <RandFelie key={f.id} f={f} r={r} legaturi={legaturi} deschide={deschide} />)}
        </ol>
      )}
    </section>
  );
}

function RandFelie({ f, r, legaturi, deschide }: { readonly f: Felie; readonly r: Roadmap; readonly legaturi: Legaturi; readonly deschide: Deschide }): ReactElement {
  const cand = interval(f.started, f.completed);
  const etapaJurnal = f.jurnal ? /etapa-0*(\d+)\.md$/.exec(f.jurnal)?.[1] : undefined;
  return (
    <li className="rm-felie" data-felie={f.id} data-stare={f.stare} data-sub={f.parinte !== null || undefined}>
      <div className="rm-felie-cap">
        <span className="rm-felie-id">{f.id}</span>
        <span className="rm-felie-titlu"><TextMd md={f.titlu} legaturi={legaturi} /></span>
        <span className="rm-cip-felie" data-stare={f.stare}>{t(`admin.rm.felie.${f.stare}`)}</span>
        {f.adusa ? <span className="rm-cip-adusa">{t('admin.rm.adusa')}</span> : null}
      </div>
      <div className="rm-felie-meta">
        {cand ? <span className="rm-felie-cand">{cand}</span> : null}
        {f.treceri !== null ? <span>{t('admin.rm.treceri', { n: f.treceri })}</span> : null}
        {f.adusa && etapaJurnal ? <span>{t('admin.rm.adusa-din', { etapa: etapaJurnal })}</span> : null}
        {f.dinSubfelii ? <span>{t('admin.rm.din-subfelii')}</span> : null}
        {f.adr.map((n) => {
          const a = r.adr[n];
          if (!a) return <span key={n} className="rm-adr" data-lipsa="true">ADR {n}</span>;
          const l = legaturaDocument(a.cale, null, deschide);
          return (
            <a key={n} className="rm-adr" data-adr={n} data-stare={a.stare} href={l.href} title={t('admin.rm.adr-deschide', { numar: n, titlu: a.titlu })}
              onClick={(ev) => { if (ev.button === 0 && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) { ev.preventDefault(); l.actiune(); } }}>
              ADR {n}
            </a>
          );
        })}
      </div>
      {f.notaIntreaga !== '' || f.descriere !== f.titlu ? (
        <details className="rm-felie-nota">
          <summary><TextMd md={f.nota !== '' ? f.nota : f.descriere} legaturi={legaturi} /></summary>
          {f.notaIntreaga !== '' ? <p><strong>{t('admin.rm.nota')}:</strong> <TextMd md={f.notaIntreaga} legaturi={legaturi} /></p> : null}
          {f.descriere !== f.notaIntreaga ? <p><strong>{t('admin.rm.in-fisa')}:</strong> <TextMd md={f.descriere} legaturi={legaturi} /></p> : null}
        </details>
      ) : null}
    </li>
  );
}
