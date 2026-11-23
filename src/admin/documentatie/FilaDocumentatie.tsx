import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { CATEGORII, type Catalog, type DocumentCatalog } from '../../../shared/documentatie.ts';
import { ancora as ancoraTitlului, felLegatura, rezolvaRelativ } from '../../docs/markdown.ts';
import { Markdown, TextMd, type Legaturi } from '../../docs/Markdown.tsx';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { EroareCitire, SeIncarca } from '../carcasa/stari.tsx';
import type { AducatorDocumentatie } from './aducere.ts';
import { cuprins, dataStarii, desparteTitlul, sectiuneaDeAcum, type IntrareCuprins } from './cuprins.ts';
import { legaturaDocument, type Deschide } from './legaturi.ts';
import './documentatie.css';

/**
 * Fila Documentație din `/admin` (ADR 0048): documentele repo-ului (starea, planul, fișele etapelor, plăcile, ADR-urile),
 * generate la build, aduse la cerere și randate de cititorul de markdown din `src/docs/`. Linkurile dintre documente
 * navighează în filă; ce nu e în documentație rămâne text. Alături, cuprinsul documentului, cu secțiunea de acum, iar sub
 * titlul unui ADR, starea lui (ADR 0260 §8, felia A.6).
 */
export function FilaDocumentatie({ aducator, cale, ancora, deschide }: {
  readonly aducator: AducatorDocumentatie;
  readonly cale: string | null;
  readonly ancora: string | null;
  readonly deschide: Deschide;
}): ReactElement {
  useLimba();
  const [catalog, setCatalog] = useState<{ readonly faza: 'se-incarca' } | { readonly faza: 'eroare'; readonly motiv: string } | { readonly faza: 'gata'; readonly c: Catalog }>({ faza: 'se-incarca' });
  const viu = useRef(true);
  const incarca = useCallback((): void => {
    setCatalog({ faza: 'se-incarca' });
    aducator.catalog().then(
      (c) => { if (viu.current) setCatalog({ faza: 'gata', c }); },
      (e: unknown) => { if (viu.current) setCatalog({ faza: 'eroare', motiv: motiv(e) }); },
    );
  }, [aducator]);
  useEffect(() => {
    viu.current = true;
    incarca();
    return () => { viu.current = false; };
  }, [incarca]);

  if (catalog.faza === 'se-incarca') return <SeIncarca text={t('admin.doc.se-incarca')} />;
  if (catalog.faza === 'eroare') {
    return <EroareCitire text={t('admin.doc.esec', { motiv: catalog.motiv })} motiv={catalog.motiv} reincarca={incarca} atribute={{ 'data-documentatie': 'eroare' }} />;
  }
  return <Navigator c={catalog.c} aducator={aducator} cale={cale} ancora={ancora} deschide={deschide} />;
}

function motiv(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m === 'forma' ? t('admin.doc.forma') : m;
}

function Eroare({ motiv: m, reincearca }: { readonly motiv: string; readonly reincearca: () => void }): ReactElement {
  return (
    <div className="admin-randuri" role="alert">
      <p className="admin-eroare">{t('admin.doc.esec', { motiv: m })}</p>
      <button type="button" onClick={reincearca}>{t('admin.doc.reincearca')}</button>
    </div>
  );
}

const fara = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function Navigator({ c, aducator, cale, ancora, deschide }: {
  readonly c: Catalog; readonly aducator: AducatorDocumentatie; readonly cale: string | null; readonly ancora: string | null; readonly deschide: Deschide;
}): ReactElement {
  const [filtru, setFiltru] = useState('');
  const ales = cale ?? c.documente.find((d) => d.categorie === 'stare')?.cale ?? c.documente[0]?.cale ?? null;
  const document = c.documente.find((d) => d.cale === ales) ?? null;
  const potrivite = useMemo(() => {
    const f = fara(filtru.trim());
    return f === '' ? c.documente : c.documente.filter((d) => fara(`${d.eticheta} ${d.cale}`).includes(f));
  }, [c, filtru]);

  return (
    <div className="doc">
      <nav className="doc-nav" aria-label={t('admin.doc.lista')}>
        <input type="search" className="doc-cauta" value={filtru} placeholder={t('admin.doc.cauta')} aria-label={t('admin.doc.cauta')}
          onChange={(e) => { setFiltru(e.target.value); }} />
        {potrivite.length === 0 ? <p className="admin-slab">{t('admin.doc.niciunul')}</p> : CATEGORII.map((cat) => {
          const din = potrivite.filter((d) => d.categorie === cat);
          if (din.length === 0) return null;
          return (
            <div key={cat} className="doc-categorie">
              <h3>{t(`admin.doc.cat.${cat}`)} <span className="doc-cate">{din.length}</span></h3>
              <ul>
                {din.map((d) => {
                  const l = legaturaDocument(d.cale, null, deschide);
                  return (
                    <li key={d.cale}>
                      <a href={l.href} data-doc={d.cale} aria-current={d.cale === ales ? 'page' : undefined}
                        onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); l.actiune(); } }}>
                        <span>{d.eticheta}</span>
                        {d.stare !== null && d.stare !== 'acceptat' ? <span className="doc-stare" data-stare={d.stare}>{t(`admin.doc.adr.${d.stare}`)}</span> : null}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      {document === null
        ? <div className="doc-articol"><p className="admin-eroare" role="alert">{ales ? t('admin.doc.necunoscut', { cale: ales }) : t('admin.doc.alege')}</p></div>
        : <Articol d={document} c={c} aducator={aducator} ancora={ancora} deschide={deschide} />}
    </div>
  );
}

function Articol({ d, c, aducator, ancora, deschide }: {
  readonly d: DocumentCatalog; readonly c: Catalog; readonly aducator: AducatorDocumentatie; readonly ancora: string | null; readonly deschide: Deschide;
}): ReactElement {
  const [text, setText] = useState<{ readonly cale: string; readonly text: string } | { readonly cale: string; readonly eroare: string } | null>(null);
  const [incercare, setIncercare] = useState(0);
  const articol = useRef<HTMLElement>(null);
  useEffect(() => {
    let viu = true;
    aducator.document(d.cale).then(
      (x) => { if (viu) setText({ cale: d.cale, text: x }); },
      (e: unknown) => { if (viu) setText({ cale: d.cale, eroare: motiv(e) }); },
    );
    return () => { viu = false; };
  }, [aducator, d.cale, incercare]);

  const cunoscute = useMemo(() => new Set(c.documente.map((x) => x.cale)), [c]);
  const legaturi = useMemo((): Legaturi => ({
    interna: (href) => {
      const tinta = rezolvaRelativ(d.cale, href);
      if (tinta === null || felLegatura(href) !== 'interna') return null;
      const diez = tinta.indexOf('#');
      const cale = diez < 0 ? tinta : tinta.slice(0, diez);
      const a = diez < 0 ? null : tinta.slice(diez + 1);
      return cunoscute.has(cale) ? legaturaDocument(cale, a, deschide) : null;
    },
    cod: (x) => (cunoscute.has(x) ? legaturaDocument(x, null, deschide) : null),
  }), [cunoscute, d.cale, deschide]);

  const gata = text !== null && text.cale === d.cale && 'text' in text;
  // Un ADR își arată starea sub titlu: titlul se desparte de rest (ancora lui, ca a cititorului: primul titlu e unic).
  const parti = useMemo(() => {
    if (text === null || text.cale !== d.cale || !('text' in text)) return null;
    return d.stare === null ? { titlu: null, rest: text.text } : desparteTitlul(text.text);
  }, [text, d.cale, d.stare]);
  const intrari = useMemo(() => (parti ? cuprins(parti.rest) : []), [parti]);
  const data = useMemo(() => (parti?.titlu ? dataStarii(parti.rest) : null), [parti]);
  const activ = useSectiuneaDeAcum(intrari);
  // După ce vine documentul: la ancora cerută, altfel la începutul lui, dar doar dacă începutul nu se vede. Derulat adânc
  // în documentul de dinainte (navigatorul rămâne lipit sus), articolul nou începea altfel de la mijloc; cu începutul pe
  // ecran, pagina nu se mișcă (filele rămân la vedere).
  useEffect(() => {
    if (!gata) return;
    const tinta = ancora ? globalThis.document.getElementById(`md-${ancora}`) : null;
    if (tinta) {
      tinta.scrollIntoView({ block: 'start' });
      return;
    }
    const sus = articol.current?.getBoundingClientRect().top ?? 0;
    if (sus < 0 || sus > globalThis.innerHeight) articol.current?.scrollIntoView({ block: 'start' });
  }, [gata, ancora, d.cale]);

  return (
    <>
      {intrari.length > 1 ? <Cuprins intrari={intrari} activ={activ} cale={d.cale} deschide={deschide} /> : null}
      <article className="doc-articol" ref={articol} aria-busy={!gata} data-document={d.cale}>
        <header className="doc-cap">
          <span className="doc-cale">{d.cale}</span>
          <span className="admin-slab">{(d.octeti / 1024).toFixed(1)} kB</span>
        </header>
        {text === null || text.cale !== d.cale ? <p className="admin-mesaj">{t('admin.doc.se-incarca')}</p>
          : 'eroare' in text ? <Eroare motiv={text.eroare} reincearca={() => { setText(null); setIncercare((n) => n + 1); }} />
            : (
              <>
                {parti?.titlu ? (
                  <div className="md">
                    <h2 id={`md-${ancoraTitlului(parti.titlu)}`} className="md-titlu"><TextMd md={parti.titlu} legaturi={legaturi} /></h2>
                    <p className="doc-adr" data-doc-stare={d.stare ?? 'altul'}>
                      <span className="doc-stare" data-stare={d.stare ?? 'altul'}>{t(`admin.doc.adr.${d.stare ?? 'altul'}`)}</span>
                      {data ? <span className="admin-slab">{data}</span> : null}
                    </p>
                  </div>
                ) : null}
                <Markdown text={parti?.rest ?? text.text} legaturi={legaturi} nivelBaza={1} />
              </>
            )}
        <p className="admin-slab doc-sursa">{t('admin.doc.generat')}</p>
      </article>
    </>
  );
}

/** Pragul de sus al secțiunii de acum: un titlu ajuns la el (de jos) e secțiunea citită. */
const PRAG_SECTIUNE = 96;

/** Indicele secțiunii de acum, la fiecare derulare (o dată pe cadru) și la redimensionare; -1 înaintea primului titlu. */
function useSectiuneaDeAcum(intrari: readonly IntrareCuprins[]): number {
  const [activ, setActiv] = useState(-1);
  useEffect(() => {
    if (intrari.length === 0) return undefined;
    let cadru = 0;
    const masoara = (): void => {
      cadru = 0;
      const sus = intrari.map((i) => globalThis.document.getElementById(`md-${i.ancora}`)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY);
      const radacina = globalThis.document.documentElement;
      setActiv(sectiuneaDeAcum(sus, PRAG_SECTIUNE, globalThis.innerHeight + globalThis.scrollY >= radacina.scrollHeight - 2));
    };
    const cere = (): void => { if (cadru === 0) cadru = requestAnimationFrame(masoara); };
    masoara();
    globalThis.addEventListener('scroll', cere, { passive: true });
    globalThis.addEventListener('resize', cere);
    return () => {
      globalThis.removeEventListener('scroll', cere);
      globalThis.removeEventListener('resize', cere);
      if (cadru !== 0) cancelAnimationFrame(cadru);
    };
  }, [intrari]);
  return activ;
}

/**
 * Cuprinsul documentului (ADR 0260 §8): titlurile de nivel 2 și 3, cu secțiunea de acum marcată (și ținută la vedere în
 * cuprins, când el se derulează). Un clic duce la titlu și pune ancora în adresă.
 */
function Cuprins({ intrari, activ, cale, deschide }: {
  readonly intrari: readonly IntrareCuprins[]; readonly activ: number; readonly cale: string; readonly deschide: Deschide;
}): ReactElement {
  const lista = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const c = lista.current;
    const el = c?.querySelector<HTMLElement>('[aria-current]');
    if (!c || !el || c.scrollHeight <= c.clientHeight) return;
    if (el.offsetTop < c.scrollTop) c.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > c.scrollTop + c.clientHeight) c.scrollTop = el.offsetTop + el.offsetHeight - c.clientHeight;
  }, [activ]);
  return (
    <nav className="doc-cuprins" aria-labelledby="doc-cuprins-titlu" data-doc="cuprins">
      <h3 id="doc-cuprins-titlu">{t('admin.doc.cuprins')}</h3>
      <ol ref={lista}>
        {intrari.map((i, k) => {
          const l = legaturaDocument(cale, i.ancora, deschide);
          return (
            <li key={i.ancora} data-nivel={i.nivel}>
              <a href={l.href} data-ancora={i.ancora} aria-current={k === activ ? 'location' : undefined}
                onClick={(e) => {
                  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                  e.preventDefault();
                  l.actiune();
                  // Și la al doilea clic pe aceeași ancoră (adresa nu se mai schimbă, deci nici derularea din document).
                  globalThis.document.getElementById(`md-${i.ancora}`)?.scrollIntoView({ block: 'start' });
                }}>
                {i.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
