/**
 * Fereastra „Biblioteca extensiilor” (ADR 0231 §A, direcția B; felia 3.Xh-3), adusă la cerere, odată cu ferestrele instalării.
 * În stânga, lista: extensiile din catalog („Toate”) sau cele din browserul acesta („Instalate”, și cele venite din afara
 * bibliotecii). În dreapta, pagina extensiei alese: semnul, numele, cine o publică, versiunea și mărimea; capturile;
 * descrierea; „Ce poate face”; „Ce e nou”; și gestul ei, chiar acolo: „Instalează”, „Actualizează la …”, „Deschide”, „Scoate”.
 *
 * Marginile din ADR 0230 rămân: nimic nu se descarcă înainte de clic; pachetul se verifică după amprenta din catalog înaintea
 * cititorului (`biblioteca.ts`); o actualizare merge dintr-un clic, iar fereastra de confirmare apare doar când versiunea
 * nouă cere ceva în plus; un defect al publicării ajunge și în jurnal (`onDefect`). Catalogul îl cere gazda (`Extensii.tsx`),
 * la deschidere; cât vine, lista arată un schelet, iar fereastra își ține mărimea.
 *
 * Pe un ecran îngust, lista și pagina sunt două vederi: un rând ales deschide pagina lui, iar „Înapoi la listă” se întoarce.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { comparaVersiuni, type CatalogBiblioteca, type RandBiblioteca } from '../../shared/biblioteca.ts';
import { instaleazaDinBiblioteca, stareRand, type StareRand } from './biblioteca.ts';
import { FaraStocare, octetiDate, scrieExtensia, type ExtensieInstalata } from './depozit.ts';
import { textMarime } from './marimeText.ts';
import { adresaCatalog, IntrebareScoatere, motivText, Poate, textSursa } from './parti.tsx';
import { Semn, useSemnInstalat } from './Semn.tsx';
import { adresaSemnCatalog } from './semn.ts';
import type { CerereInstalare } from './tipuri.ts';

/** Catalogul, cum îl vede fereastra: se încarcă (sau încă necerut), a venit, fără rețea, ori un defect al publicării. */
export type CatalogVazut =
  | { readonly fel: 'incarca' }
  | { readonly fel: 'ok'; readonly catalog: CatalogBiblioteca }
  | { readonly fel: 'retea' }
  | { readonly fel: 'defect' };

type Fila = 'toate' | 'instalate';
/** Un rând al listei: din catalog, din browserul acesta, sau amândouă. */
type Element = { readonly id: string; readonly rand: RandBiblioteca | null; readonly instalata: ExtensieInstalata | null };
/** Gestul paginii, în lucru sau încheiat: instalarea ori actualizarea dintr-un clic. */
type Progres =
  | { readonly fel: 'lucreaza' }
  | { readonly fel: 'gata'; readonly cum: 'instalata' | 'actualizata'; readonly versiune: string }
  | { readonly fel: 'eroare'; readonly text: string; readonly motiv?: string };
/** Starea unui rând: a rândului din catalog față de ce e instalat, sau „locală” (o extensie din afara bibliotecii). */
type Stare = StareRand | { readonly fel: 'locala' };

const stareaLui = (e: Element): Stare => (e.rand ? stareRand(e.rand, e.instalata?.manifest) : { fel: 'locala' });
const numeleLui = (e: Element): string => e.rand?.nume ?? e.instalata?.manifest.nume ?? e.id;

/** Semnul unui rând: al rândului din catalog (de lângă el); altfel al extensiei instalate, din pachetul ei. */
function SemnElement({ element, marime }: { readonly element: Element; readonly marime: 28 | 48 }): ReactNode {
  const dinPachet = useSemnInstalat(element.instalata);
  // Fără catalog (sau fără semn în el), cel din pachet: se vede și fără internet.
  const dinCatalog = element.rand ? adresaSemnCatalog(element.rand, adresaCatalog()) : null;
  return <Semn adresa={element.instalata ? dinPachet ?? dinCatalog : dinCatalog} marime={marime} />;
}

export function FereastraBiblioteca({ cerere, catalog, instalate, limba, acoperita, onReincearca, onInchide, onDeschide, onSchimbata, onScoasa, onCere, onDefect }: {
  readonly cerere: Extract<CerereInstalare, { readonly fel: 'fereastra' }>;
  readonly catalog: CatalogVazut;
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  /** O fereastră de confirmare stă deasupra: biblioteca e inertă. */
  readonly acoperita: boolean;
  readonly onReincearca: () => void;
  readonly onInchide: () => void;
  /** „Deschide”: fereastra se închide, iar extensia se deschide în fereastra ei. */
  readonly onDeschide: (e: ExtensieInstalata) => void;
  /** O extensie instalată sau actualizată aici: lista celor instalate se citește din nou. */
  readonly onSchimbata: (id: string) => void;
  readonly onScoasa: (id: string) => void;
  /** Ce deschide gazda deasupra: fișierul de ales, fereastra adresei, confirmarea unei versiuni care cere ceva în plus. */
  readonly onCere: (c: CerereInstalare | 'fisier') => void;
  readonly onDefect: (e: Error) => void;
}): ReactNode {
  const [fila, setFila] = useState<Fila>('toate');
  const [ales, setAles] = useState<string | null>(cerere.id);
  const [progres, setProgres] = useState<Readonly<Record<string, Progres>>>({});
  const [deScos, setDeScos] = useState<ExtensieInstalata | null>(null);
  // După întrebarea de la „Scoate”, focusul se întoarce pe gestul paginii (sau, dacă extensia a plecat, pe ×).
  const radacina = useRef<HTMLDivElement | null>(null);
  const intors = useRef(false);
  useEffect(() => {
    if (deScos) { intors.current = true; return; }
    if (!intors.current) return;
    intors.current = false;
    const r = radacina.current;
    (r?.querySelector<HTMLButtonElement>('[data-extensii="pagina-scoate"]') ?? r?.querySelector<HTMLButtonElement>('[data-extensii="inchide-biblioteca"]'))?.focus();
  }, [deScos]);
  // Cât ocupă datele fiecărei extensii instalate (ADR 0128 §B); null: nu s-au putut număra.
  const [date, setDate] = useState<Readonly<Record<string, number | null>>>({});
  useEffect(() => {
    let viu = true;
    void Promise.all(instalate.map(async (x) => [x.id, await octetiDate(x.id).catch(() => null)] as const))
      .then((r) => { if (viu) setDate(Object.fromEntries(r)); });
    return () => { viu = false; };
  }, [instalate]);

  const randuri = catalog.fel === 'ok' ? catalog.catalog.extensii : [];
  const elemente: readonly Element[] = fila === 'toate'
    ? randuri.map((r) => ({ id: r.id, rand: r, instalata: instalate.find((x) => x.id === r.id) ?? null }))
    : instalate.map((x) => ({ id: x.id, rand: randuri.find((r) => r.id === x.id) ?? null, instalata: x }));
  const alesul = ales === null ? undefined : elemente.find((e) => e.id === ales);
  // Linkul spre o extensie care nu e în catalogul de acum: pagina o spune, nu arată alta în locul ei.
  const lipsa = cerere.dinLink && ales !== null && ales === cerere.id && fila === 'toate' && catalog.fel === 'ok' && !alesul;
  const aratat = alesul ?? (lipsa ? undefined : elemente[0]);

  const inchide = (): void => { onInchide(); };
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    inchide();
  };
  const schimbaFila = (f: Fila): void => { setFila(f); setAles(null); };

  /** Instalarea sau actualizarea dintr-un clic, în pagină: descărcarea verificată, scrierea, apoi lista celor instalate. */
  const instaleaza = async (rand: RandBiblioteca, cum: 'instalata' | 'actualizata'): Promise<void> => {
    setProgres((p) => ({ ...p, [rand.id]: { fel: 'lucreaza' } }));
    let r: Awaited<ReturnType<typeof instaleazaDinBiblioteca>>;
    try {
      r = await instaleazaDinBiblioteca(rand, { adresaCatalog: adresaCatalog(), scrie: scrieExtensia });
    } catch (e) {
      const text = e instanceof FaraStocare ? t('extensii.instalare.fara-stocare') : String(e);
      setProgres((p) => ({ ...p, [rand.id]: { fel: 'eroare', text } }));
      return;
    }
    if (!r.ok) {
      if (r.defect) onDefect(new Error(`biblioteca: ${rand.id} ${rand.versiune}: ${r.motiv}${r.detaliu ? ` (${r.detaliu})` : ''}`));
      const text = t('extensii.instalare.refuz', { motiv: motivText(r.motiv, r.detaliu) });
      setProgres((p) => ({ ...p, [rand.id]: { fel: 'eroare', text, motiv: r.motiv } }));
      return;
    }
    setProgres((p) => ({ ...p, [rand.id]: { fel: 'gata', cum, versiune: rand.versiune } }));
    onSchimbata(rand.id);
  };

  const cardul = (e: Element): ReactNode => {
    const s = stareaLui(e);
    return (
      <button key={e.id} type="button" className="bib-card" data-extensii="rand-biblioteca" data-id={e.id} data-stare={s.fel}
        {...(aratat?.id === e.id ? { 'aria-current': 'true' as const } : {})} onClick={() => { setAles(e.id); }}>
        <SemnElement element={e} marime={28} />
        <span className="bib-card-text">
          <strong>{numeleLui(e)}</strong>
          <small>{e.rand ? e.rand.descriere[limba] : e.instalata?.manifest.versiune}</small>
        </span>
        {s.fel === 'actualizeaza' && e.rand && <span className="bib-pil">{e.rand.versiune}</span>}
        {(s.fel === 'instalata' || s.fel === 'alta' || s.fel === 'locala') && <span className="bib-pil ok" aria-hidden="true">✓</span>}
      </button>
    );
  };

  const lista = (
    <div className="bib-lista" data-testid="biblioteca-lista">
      {fila === 'toate' && catalog.fel === 'incarca' && (
        <div className="bib-schelet" role="status" aria-label={t('extensii.biblioteca.incarca')} data-testid="biblioteca-schelet">
          <span /><span />
        </div>
      )}
      {fila === 'toate' && (catalog.fel === 'retea' || catalog.fel === 'defect') && (
        <div className="bib-nota">
          <p role="alert">{catalog.fel === 'retea' ? t('extensii.biblioteca.fara-retea') : t('extensii.biblioteca.eroare')}</p>
          <button type="button" data-extensii="biblioteca-reincearca" onClick={onReincearca}>{t('extensii.biblioteca.reincearca')}</button>
        </div>
      )}
      {fila === 'toate' && catalog.fel === 'ok' && elemente.length === 0 && <p className="bib-nota">{t('extensii.biblioteca.goala')}</p>}
      {fila === 'instalate' && elemente.length === 0 && <p className="bib-nota">{t('extensii.niciuna')}</p>}
      {elemente.map(cardul)}
      <div className="bib-afara">
        <span>{t('extensii.biblioteca.din-afara')}</span>
        <button type="button" data-extensii="din-fisier" onClick={() => { onCere('fisier'); }}>{t('extensii.din-fisier')}</button>
        <button type="button" data-extensii="din-adresa" onClick={() => { onCere({ fel: 'adresa', adresa: '', dinLink: false }); }}>{t('extensii.din-adresa')}</button>
      </div>
    </div>
  );

  return (
    <>
      <div ref={radacina} className="dialog dialog-biblioteca" role="dialog" aria-modal="true" aria-labelledby="fereastra-biblioteca-titlu" data-testid="fereastra-biblioteca"
        {...(ales !== null ? { 'data-ales': '' } : {})} {...(acoperita || deScos ? { inert: true } : {})} onKeyDown={tasta}>
        <div className="dialog-cutie">
          <div className="bib-cap">
            <button type="button" className="bib-inapoi" data-extensii="inapoi-lista" aria-label={t('extensii.biblioteca.inapoi')} title={t('extensii.biblioteca.inapoi')}
              onClick={() => { setAles(null); }}>
              <span aria-hidden="true">‹</span>
            </button>
            <h2 id="fereastra-biblioteca-titlu">{t('extensii.biblioteca.titlu')}</h2>
            <div className="bib-file" role="tablist" aria-label={t('extensii.biblioteca.titlu')}>
              <button type="button" role="tab" aria-selected={fila === 'toate'} data-extensii="fila-toate" onClick={() => { schimbaFila('toate'); }}>
                {t('extensii.biblioteca.fila-toate')}{catalog.fel === 'ok' ? ` · ${randuri.length}` : ''}
              </button>
              <button type="button" role="tab" aria-selected={fila === 'instalate'} data-extensii="fila-instalate" onClick={() => { schimbaFila('instalate'); }}>
                {t('extensii.biblioteca.fila-instalate')} · {instalate.length}
              </button>
            </div>
            <button type="button" className="bib-inchide" data-extensii="inchide-biblioteca" aria-label={t('extensii.biblioteca.inchide')} title={t('extensii.biblioteca.inchide')}
              autoFocus onClick={inchide}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="bib-corp">
            {lista}
            <div className="bib-detaliu">
              {cerere.dinLink && <p className="confirmare-nota" data-testid="extensii-link">{t('extensii.biblioteca.link')}</p>}
              {lipsa && <p data-testid="pagina-lipsa">{t('extensii.biblioteca.lipsa', { id: cerere.id ?? '' })}</p>}
              {aratat && (
                <Pagina key={aratat.id} element={aratat} limba={limba} progres={progres[aratat.id]} octeti={date[aratat.id]}
                  onInstaleaza={(rand) => { void instaleaza(rand, 'instalata'); }}
                  onActualizeaza={(rand, noi) => {
                    // Ce cere în plus trece prin fereastra de confirmare (ADR 0230 §D); altfel, dintr-un clic, aici.
                    if (noi) onCere({ fel: 'biblioteca', id: rand.id, rand, dinLink: false });
                    else void instaleaza(rand, 'actualizata');
                  }}
                  onDeschide={onDeschide} onScoate={setDeScos} />
              )}
              {!aratat && !lipsa && <p className="bib-nota">{t('extensii.biblioteca.alege')}</p>}
            </div>
          </div>
        </div>
      </div>
      {deScos && (
        <IntrebareScoatere extensie={deScos} octeti={date[deScos.id]} limba={limba} onPastreaza={() => { setDeScos(null); }}
          onScoasa={(id) => {
            setDeScos(null);
            setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== id)));
            if (fila === 'instalate') setAles(null);
            onScoasa(id);
          }} />
      )}
    </>
  );
}

/** Pagina unei extensii: capul cu gestul ei, capturile, descrierea, „Ce poate face”, „Ce e nou”. */
function Pagina({ element, limba, progres, octeti, onInstaleaza, onActualizeaza, onDeschide, onScoate }: {
  readonly element: Element; readonly limba: Limba; readonly progres: Progres | undefined; readonly octeti: number | null | undefined;
  readonly onInstaleaza: (rand: RandBiblioteca) => void;
  /** `noi`: versiunea nouă cere ceva în plus. */
  readonly onActualizeaza: (rand: RandBiblioteca, noi: boolean) => void;
  readonly onDeschide: (e: ExtensieInstalata) => void;
  readonly onScoate: (e: ExtensieInstalata) => void;
}): ReactNode {
  const { rand, instalata } = element;
  const s = stareaLui(element);
  const lucreaza = progres?.fel === 'lucreaza';
  const data = (iso: string): string => new Date(iso).toLocaleDateString(limba === 'ro' ? 'ro-RO' : 'en-GB');

  const despre = rand
    ? [rand.autor ? t('extensii.biblioteca.de', { autor: rand.autor }) : null, rand.versiune, textMarime(rand.octeti, limba)].filter((x) => x !== null).join(' · ')
    : instalata?.manifest.versiune ?? '';
  // Starea, sub butoane: ce s-a întâmplat acum, altfel ce e de știut înaintea gestului.
  let stare: string | null = null;
  if (lucreaza) stare = t('extensii.instalare.descarc-verific');
  else if (progres?.fel === 'gata') stare = progres.cum === 'instalata' ? t('extensii.biblioteca.instalata-acum') : t('extensii.biblioteca.actualizata', { versiune: progres.versiune });
  else if (s.fel === 'instaleaza') stare = t('extensii.biblioteca.verificat');
  else if (s.fel === 'actualizeaza') stare = t('extensii.biblioteca.ai', { versiune: s.de });
  else if (s.fel === 'instalata') stare = t('extensii.biblioteca.la-zi');
  else if (s.fel === 'alta') stare = t('extensii.biblioteca.alta', { versiune: s.versiune });
  else if (s.fel === 'reincarca') stare = t('extensii.biblioteca.reincarca');
  else stare = t('extensii.biblioteca.locala');

  const noi = s.fel === 'actualizeaza' ? s.permisiuniNoi : [];
  const permisiuni = rand?.permisiuni ?? instalata?.manifest.permisiuni ?? [];
  const pastrate = permisiuni.filter((p) => !noi.includes(p));
  // „Ce e nou”: la o actualizare, doar versiunile de după cea instalată.
  const noutati = (rand?.noutati ?? []).filter((n) => s.fel !== 'actualizeaza' || comparaVersiuni(n.versiune, s.de) === 1);
  const capturi = rand?.capturi?.[limba] ?? [];

  return (
    <article className="bib-pagina" data-testid="biblioteca-pagina" data-id={element.id} data-stare={s.fel}>
      <header className="pagina-cap">
        <SemnElement element={element} marime={48} />
        <div className="pagina-nume">
          <h3>{numeleLui(element)}</h3>
          <p className="confirmare-sursa" data-testid="pagina-despre">{despre}</p>
        </div>
        <div className="pagina-gest">
          <div className="pagina-actiuni">
            {s.fel === 'instaleaza' && rand && (
              <button type="button" className="principal" data-extensii="pagina-instaleaza" disabled={lucreaza} onClick={() => { onInstaleaza(rand); }}>
                {t('extensii.biblioteca.instaleaza')}
              </button>
            )}
            {s.fel === 'actualizeaza' && rand && (
              <button type="button" className="principal" data-extensii="pagina-actualizeaza" disabled={lucreaza} onClick={() => { onActualizeaza(rand, noi.length > 0); }}>
                {t('extensii.biblioteca.actualizeaza', { versiune: rand.versiune })}
              </button>
            )}
            {instalata && (
              <button type="button" className={s.fel === 'actualizeaza' ? undefined : 'principal'} data-extensii="pagina-deschide" disabled={lucreaza}
                onClick={() => { onDeschide(instalata); }}>
                {t('extensii.instalare.deschide')}
              </button>
            )}
            {instalata && s.fel !== 'actualizeaza' && (
              <button type="button" data-extensii="pagina-scoate" disabled={lucreaza} onClick={() => { onScoate(instalata); }}>{t('extensii.gestionare.scoate')}</button>
            )}
          </div>
          <p className="confirmare-nota" role={lucreaza ? 'status' : undefined} data-testid="pagina-stare">{stare}</p>
        </div>
      </header>
      {progres?.fel === 'eroare' && (
        <p className="avertisment" role="alert" data-testid="pagina-eroare" {...(progres.motiv ? { 'data-motiv': progres.motiv } : {})}>{progres.text}</p>
      )}
      {instalata && (
        <p className="confirmare-nota" data-testid="pagina-sursa">
          {instalata.sursa.fel === 'biblioteca'
            ? t('extensii.gestionare.din-biblioteca', { data: data(instalata.instalat) })
            : t('extensii.gestionare.sursa', { sursa: textSursa(instalata.sursa), data: data(instalata.instalat) })}
          {typeof octeti === 'number' && <> · {t('extensii.gestionare.date', { marime: textMarime(octeti, limba) })}</>}
        </p>
      )}
      {capturi.length > 0 && (
        <div className="pagina-capturi" data-testid="pagina-capturi">
          {capturi.map((c) => (
            <figure key={c.fisier}>
              <img src={new URL(c.fisier, adresaCatalog()).href} alt={c.alt} width={c.lat} height={c.inalt} loading="lazy" draggable={false} />
            </figure>
          ))}
        </div>
      )}
      {rand && <p data-testid="pagina-descriere">{rand.despre?.[limba] ?? rand.descriere[limba]}</p>}
      <div className="pagina-coloane">
        <div data-testid="pagina-poate">
          {noi.length > 0 && <Poate titlu={t('extensii.poate.nou')} permisiuni={noi} limba={limba} test="extensii-permisiuni-noi" nou />}
          {(noi.length === 0 || pastrate.length > 0) && (
            <Poate titlu={noi.length > 0 ? t('extensii.poate.pana-acum') : t('extensii.poate.titlu')} permisiuni={pastrate} limba={limba} />
          )}
        </div>
        <div>
          {noutati.length > 0 && (
            <section className="poate">
              <h3>{t('extensii.biblioteca.nou')}</h3>
              <ul className="pagina-noutati" data-testid="pagina-noutati">
                {noutati.map((n) => <li key={n.versiune}><strong>{n.versiune}</strong> <span>{n[limba]}</span></li>)}
              </ul>
            </section>
          )}
          <p className="confirmare-nota" data-testid="extensii-izolare">{t('extensii.instalare.izolare')}</p>
        </div>
      </div>
    </article>
  );
}
