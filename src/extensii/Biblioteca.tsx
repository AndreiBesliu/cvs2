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
 *
 * Tastatura (ADR 0231 §B.7): la deschidere, focusul stă pe fila aleasă; ← și → schimbă fila; în listă, ↑ și ↓ mută focusul
 * între rânduri, iar Enter deschide pagina rândului; Escape închide fereastra. Din file și din listă, doar fila aleasă și
 * rândul arătat sunt în ordinea lui Tab.
 *
 * Căutarea și categoriile (ADR 0233): într-o bară sub capul ferestrei, câmpul „Caută o extensie” filtrează lista la fiecare literă (regula, în
 * `cautare.ts`), iar rândul categoriilor arată rafturile listei de acum, fiecare cu numărul ei; pagina extensiei își spune
 * rafturile, iar un clic pe unul îl alege. Amândouă țin de fereastra deschisă: nu se țin minte și nu pleacă nicăieri. „/”
 * duce în câmp, ↓ din câmp în listă, Enter deschide primul rezultat; Escape golește întâi câmpul, apoi închide fereastra.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import type { CatalogBiblioteca, CategorieBiblioteca, RandBiblioteca } from '../../shared/biblioteca.ts';
import { instaleazaDinBiblioteca, noutatiDupa, stareRand, type StareRand } from './biblioteca.ts';
import { CapturaMarita } from './CapturaMarita.tsx';
import { useEscapeFereastra } from '../ui/escapeFereastra.ts';
import { categoriiPrezente, cauta, cuvinteCautate } from './cautare.ts';
import { FaraStocare, octetiDate, scrieExtensia, type ExtensieInstalata } from './depozit.ts';
import { textMarime } from './marimeText.ts';
import { adresaCatalog, IntrebareScoatere, motivText, Noutati, Poate, textSursa } from './parti.tsx';
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
const numeCategorie = (c: CategorieBiblioteca): string => t(`extensii.categorie.${c}`);
/** Pe un ecran îngust, lista și pagina sunt două vederi. */
const ingust = (): boolean => matchMedia('(max-width: 40rem)').matches;

/** Semnul unui rând: al rândului din catalog (de lângă el); altfel al extensiei instalate, din pachetul ei. */
function SemnElement({ element, marime }: { readonly element: Element; readonly marime: 28 | 48 }): ReactNode {
  const dinPachet = useSemnInstalat(element.instalata);
  // Fără catalog (sau fără semn în el), cel din pachet: se vede și fără internet.
  const dinCatalog = element.rand ? adresaSemnCatalog(element.rand, adresaCatalog()) : null;
  return <Semn adresa={element.instalata ? dinPachet ?? dinCatalog : dinCatalog} marime={marime} />;
}

export function FereastraBiblioteca({ cerere, catalog, instalate, limba, acoperita, onReincearca, onInchide, onDeschide, onSchimbata, onScoasa, onCere, onDefect, inainte }: {
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
  /** Înaintea scrierii unei versiuni noi peste extensia deschisă (ADR 0232 §A.2); `false`: nu se instalează nimic. */
  readonly inainte: ((id: string) => Promise<boolean>) | undefined;
}): ReactNode {
  const [fila, setFila] = useState<Fila>(cerere.fila ?? 'toate');
  // Fără catalog (fără internet ori stricat), cu extensii instalate: fereastra trece singură pe „Instalate” (ADR 0232 §B.8),
  // cât omul n-a ales el o filă; când catalogul vine (după „Reîncearcă”), se întoarce la bibliotecă.
  const aAles = useRef(cerere.fila !== undefined || cerere.id !== null);
  const mutata = useRef(false);
  const faraCatalog = catalog.fel === 'retea' || catalog.fel === 'defect';
  useEffect(() => {
    if (aAles.current) return;
    if (faraCatalog && instalate.length > 0) { mutata.current = true; setFila('instalate'); }
    else if (catalog.fel === 'ok' && mutata.current) { mutata.current = false; setFila('toate'); }
  }, [faraCatalog, catalog.fel, instalate.length]);
  const alegeFila = (f: Fila): void => { aAles.current = true; setFila(f); };
  const [ales, setAles] = useState<string | null>(cerere.id);
  // Căutarea și raftul ales (ADR 0233): ale ferestrei deschise, de la zero la fiecare deschidere.
  const [cautat, setCautat] = useState('');
  const [categorie, setCategorie] = useState<CategorieBiblioteca | null>(null);
  const camp = useRef<HTMLInputElement | null>(null);
  const [progres, setProgres] = useState<Readonly<Record<string, Progres>>>({});
  const [deScos, setDeScos] = useState<ExtensieInstalata | null>(null);
  const radacina = useRef<HTMLDivElement | null>(null);
  // La deschidere, focusul stă pe fila aleasă; pe un ecran îngust, deschisă pe o pagină (dintr-un link), pe „Înapoi la listă”.
  useEffect(() => {
    const posibile = radacina.current?.querySelectorAll<HTMLButtonElement>('[data-extensii="inapoi-lista"], [role="tab"][aria-selected="true"], [data-extensii="inchide-biblioteca"]');
    [...(posibile ?? [])].find((x) => x.offsetParent !== null)?.focus();
  }, []);
  // Butonul apăsat poate pleca de pe ecran („Instalează” devine „Deschide”, „Reîncearcă” dispare cât se cere catalogul), iar
  // focusul cade atunci pe pagină: îl întoarcem în fereastră, pe gestul principal al paginii, altfel pe fila aleasă (pe un
  // ecran îngust, pe ×). Cât butonul apăsat doar lucrează (dezactivat), focusul așteaptă.
  const ultimul = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const r = radacina.current;
    const u = ultimul.current;
    if (!r || !u || u.isConnected || acoperita || deScos || document.activeElement !== document.body) return;
    ultimul.current = null;
    for (const cine of ['.pagina-actiuni .principal:not(:disabled)', '[role="tab"][aria-selected="true"]', '[data-extensii="inchide-biblioteca"]']) {
      const x = [...r.querySelectorAll<HTMLElement>(cine)].find((e) => e.offsetParent !== null);
      if (x) { x.focus(); return; }
    }
  });
  // Escape închide fereastra și cu focusul căzut pe pagină (butonul apăsat lucrează, dezactivat): în fereastră îl prinde
  // `tasta` (care îl oprește), aici ce pleacă de pe `body`, cât nimic nu stă deasupra. Prin ascultătorul comun (3.Ay): o
  // captură mărită, deschisă după fereastră, îl ia ea.
  useEscapeFereastra(onInchide, !acoperita && !deScos);
  // După întrebarea de la „Scoate”, focusul se întoarce pe gestul paginii (sau, dacă extensia a plecat, pe ×).
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
  // Unde se caută (ADR 0233): numele și id-ul; apoi descrierea, descrierea lungă, autorul și numele rafturilor, în limba
  // aplicației. O extensie din afara bibliotecii are doar numele și nu stă pe niciun raft.
  const cautabile = elemente.map((e) => ({
    ...e, nume: numeleLui(e), categorii: e.rand?.categorii ?? [],
    texte: e.rand ? [e.rand.descriere[limba], e.rand.despre?.[limba] ?? '', e.rand.autor ?? '', ...(e.rand.categorii ?? []).map(numeCategorie)] : [],
  }));
  const rafturi = categoriiPrezente(cautabile);
  // Raftul ales ține doar cât există în lista de acum (altă filă, o extensie scoasă): altfel, toate.
  const raft = categorie !== null && rafturi.some((r) => r.id === categorie) ? categorie : null;
  useEffect(() => { if (categorie !== raft) setCategorie(raft); }, [categorie, raft]);
  const { vizibile, inAlteCategorii } = cauta(cautabile, cautat, raft);
  const cuText = cuvinteCautate(cautat).length > 0;
  const filtrat = cuText || raft !== null;
  const alesul = ales === null ? undefined : vizibile.find((e) => e.id === ales);
  // Linkul spre o extensie care nu e în catalogul de acum: pagina o spune, nu arată alta în locul ei.
  const lipsa = cerere.dinLink && ales !== null && ales === cerere.id && fila === 'toate' && catalog.fel === 'ok' && !elemente.some((e) => e.id === ales);
  const aratat = alesul ?? (lipsa ? undefined : vizibile[0]);

  const inchide = (): void => { onInchide(); };
  const tasta = (e: KeyboardEvent): void => {
    // „/” duce în câmpul căutării, de oriunde din fereastră în afară de un câmp de scris.
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement)) {
      const c = camp.current;
      if (c && !c.disabled && c.offsetParent !== null) { e.preventDefault(); c.focus(); c.select(); }
      return;
    }
    if (e.key !== 'Escape') return;
    e.preventDefault();
    inchide();
  };
  // În câmpul căutării: Escape îl golește întâi (fereastra rămâne); ↓ trece pe primul rând; Enter îi deschide pagina.
  const tastaCautare = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape' && cautat !== '') {
      e.preventDefault();
      e.stopPropagation();
      setCautat('');
    } else if (e.key === 'ArrowDown') {
      const primul = radacina.current?.querySelector<HTMLButtonElement>('[data-extensii="rand-biblioteca"]');
      if (!primul) return;
      e.preventDefault();
      e.stopPropagation();
      primul.focus();
    } else if (e.key === 'Enter' && vizibile[0]) {
      e.preventDefault();
      setAles(vizibile[0].id);
    }
  };
  /** Un raft ales (sau toate, `null`); butonul apăsat poate pleca de pe ecran, deci focusul trece în câmp. */
  const peRaft = (c: CategorieBiblioteca | null, inCamp: boolean): void => {
    setCategorie(c);
    if (inCamp) camp.current?.focus();
  };

  // ← și → schimbă fila, cu focusul după ele (și de la un capăt la celălalt).
  const tastaFile = (e: KeyboardEvent): void => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const f: Fila = fila === 'toate' ? 'instalate' : 'toate';
    alegeFila(f);
    radacina.current?.querySelector<HTMLButtonElement>(`[data-extensii="fila-${f}"]`)?.focus();
  };
  // ↑ și ↓ mută focusul între rândurile listei (și de la un capăt la celălalt); Enter, pe rând, îi deschide pagina.
  const tastaLista = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const randurile = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-extensii="rand-biblioteca"]')];
    const i = randurile.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    randurile[(i + (e.key === 'ArrowDown' ? 1 : randurile.length - 1)) % randurile.length]?.focus();
  };

  /** Instalarea sau actualizarea dintr-un clic, în pagină: descărcarea verificată, scrierea, apoi lista celor instalate. */
  const instaleaza = async (rand: RandBiblioteca, cum: 'instalata' | 'actualizata'): Promise<void> => {
    setProgres((p) => ({ ...p, [rand.id]: { fel: 'lucreaza' } }));
    if (inainte && !await inainte(rand.id)) {
      setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== rand.id)));
      return;
    }
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
      const text = motivText(r.motiv, r.detaliu);
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
        tabIndex={aratat?.id === e.id ? 0 : -1} {...(aratat?.id === e.id ? { 'aria-current': 'true' as const } : {})} onClick={() => { setAles(e.id); }}>
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

  // Căutarea și rafturile (ADR 0233): o bară pe toată lățimea ferestrei, deasupra listei și a paginii.
  const filtre = (
    <div className="bib-filtre">
      <div className="bib-cautare">
        <input ref={camp} type="search" className="bib-camp" data-extensii="cauta-extensie" value={cautat} disabled={elemente.length === 0}
          aria-label={t('extensii.biblioteca.cauta')} placeholder={t('extensii.biblioteca.cauta')} autoComplete="off" spellCheck={false} enterKeyHint="search"
          onChange={(e) => { setCautat(e.target.value); }} onKeyDown={tastaCautare} />
        {filtrat && (
          <span className="bib-gasite" role="status" data-testid="biblioteca-gasite">{t('extensii.biblioteca.gasite', { n: vizibile.length, m: elemente.length })}</span>
        )}
      </div>
      {rafturi.length > 0 && (
        <div className="bib-categorii" role="group" aria-label={t('extensii.biblioteca.categorii')} data-testid="biblioteca-categorii">
          <button type="button" data-extensii="categorie" data-categorie="" aria-pressed={raft === null} onClick={() => { peRaft(null, false); }}>
            {t('extensii.biblioteca.toate-categoriile')} <span className="bib-cate">{elemente.length}</span>
          </button>
          {rafturi.map((r) => (
            <button key={r.id} type="button" data-extensii="categorie" data-categorie={r.id} aria-pressed={raft === r.id} onClick={() => { peRaft(r.id, false); }}>
              {numeCategorie(r.id)} <span className="bib-cate">{r.cate}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const lista = (
    <div className="bib-lista" id="bib-lista" role="tabpanel" aria-labelledby={`bib-fila-${fila}`} data-testid="biblioteca-lista" onKeyDown={tastaLista}>
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
      {fila === 'instalate' && faraCatalog && elemente.length > 0 && (
        <div className="bib-nota bib-banda" data-testid="biblioteca-fara-catalog">
          <p role="status">{catalog.fel === 'retea' ? t('extensii.biblioteca.fara-retea-instalate') : t('extensii.biblioteca.eroare-instalate')}</p>
          <button type="button" data-extensii="biblioteca-reincearca" onClick={onReincearca}>{t('extensii.biblioteca.reincearca')}</button>
        </div>
      )}
      {fila === 'instalate' && elemente.length === 0 && <p className="bib-nota">{t('extensii.niciuna')}</p>}
      {filtrat && vizibile.length === 0 && elemente.length > 0 && (
        <div className="bib-nota" data-testid="biblioteca-nimic">
          <p role="status">
            {raft !== null && cuText
              ? t('extensii.biblioteca.nimic-categorie', { categorie: numeCategorie(raft), text: cautat.trim() })
              : t('extensii.biblioteca.nimic', { text: cautat.trim() })}
          </p>
          {inAlteCategorii > 0 && (
            <button type="button" data-extensii="in-toate-categoriile" onClick={() => { peRaft(null, true); }}>
              {t('extensii.biblioteca.in-toate', { n: inAlteCategorii })}
            </button>
          )}
          <button type="button" data-extensii="arata-toate" onClick={() => { setCautat(''); peRaft(null, true); }}>{t('extensii.biblioteca.arata-toate')}</button>
        </div>
      )}
      {vizibile.map(cardul)}
      {vizibile.length > 0 && inAlteCategorii > 0 && (
        <button type="button" className="bib-alte" data-extensii="in-toate-categoriile" onClick={() => { peRaft(null, true); }}>
          {t('extensii.biblioteca.in-toate', { n: inAlteCategorii })}
        </button>
      )}
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
        {...(ales !== null ? { 'data-ales': '' } : {})} {...(acoperita || deScos ? { inert: true } : {})} onKeyDown={tasta}
        onFocus={(e) => { ultimul.current = e.target as HTMLElement; }}>
        <div className="dialog-cutie">
          <div className="bib-cap">
            <button type="button" className="bib-inapoi" data-extensii="inapoi-lista" aria-label={t('extensii.biblioteca.inapoi')} title={t('extensii.biblioteca.inapoi')}
              onClick={() => { setAles(null); }}>
              <span aria-hidden="true">‹</span>
            </button>
            <h2 id="fereastra-biblioteca-titlu">{t('extensii.biblioteca.titlu')}</h2>
            <div className="bib-file" role="tablist" aria-label={t('extensii.biblioteca.titlu')} onKeyDown={tastaFile}>
              <button type="button" role="tab" id="bib-fila-toate" aria-selected={fila === 'toate'} aria-controls="bib-lista" tabIndex={fila === 'toate' ? 0 : -1}
                data-extensii="fila-toate" onClick={() => { alegeFila('toate'); }}>
                {t('extensii.biblioteca.fila-toate')}{catalog.fel === 'ok' ? ` · ${randuri.length}` : ''}
              </button>
              <button type="button" role="tab" id="bib-fila-instalate" aria-selected={fila === 'instalate'} aria-controls="bib-lista" tabIndex={fila === 'instalate' ? 0 : -1}
                data-extensii="fila-instalate" onClick={() => { alegeFila('instalate'); }}>
                {t('extensii.biblioteca.fila-instalate')} · {instalate.length}
              </button>
            </div>
            <button type="button" className="bib-inchide" data-extensii="inchide-biblioteca" aria-label={t('extensii.biblioteca.inchide')} title={t('extensii.biblioteca.inchide')}
              onClick={inchide}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          {filtre}
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
                  onDeschide={onDeschide} onScoate={setDeScos}
                  onCategorie={(c) => {
                    setCategorie(c);
                    // Pe un ecran îngust, raftul se vede în listă: pagina se închide.
                    if (ingust()) setAles(null);
                  }} />
              )}
              {!aratat && !lipsa && filtrat && elemente.length > 0 && <p className="bib-nota" data-testid="pagina-nimic">{t('extensii.biblioteca.nimic-pagina')}</p>}
              {/* O listă goală (nimic instalat, catalogul n-a venit): drumurile din afara bibliotecii, nu „alege din listă”. */}
              {!aratat && !lipsa && catalog.fel !== 'incarca' && !(filtrat && elemente.length > 0) && (
                <div className="bib-nota pagina-goala" data-testid="pagina-goala">
                  <p>{t('extensii.biblioteca.gol-afara')}</p>
                  <button type="button" data-extensii="pagina-din-fisier" onClick={() => { onCere('fisier'); }}>{t('extensii.din-fisier')}</button>
                  <button type="button" data-extensii="pagina-din-adresa" onClick={() => { onCere({ fel: 'adresa', adresa: '', dinLink: false }); }}>{t('extensii.din-adresa')}</button>
                </div>
              )}
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
function Pagina({ element, limba, progres, octeti, onInstaleaza, onActualizeaza, onDeschide, onScoate, onCategorie }: {
  readonly element: Element; readonly limba: Limba; readonly progres: Progres | undefined; readonly octeti: number | null | undefined;
  readonly onInstaleaza: (rand: RandBiblioteca) => void;
  /** `noi`: versiunea nouă cere ceva în plus. */
  readonly onActualizeaza: (rand: RandBiblioteca, noi: boolean) => void;
  readonly onDeschide: (e: ExtensieInstalata) => void;
  readonly onScoate: (e: ExtensieInstalata) => void;
  /** Un raft al extensiei, ales de pe pagina ei (ADR 0233). */
  readonly onCategorie: (c: CategorieBiblioteca) => void;
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
  else stare = t(instalata?.sursa.fel === 'biblioteca' ? 'extensii.biblioteca.din-biblioteca' : 'extensii.biblioteca.locala');

  const noi = s.fel === 'actualizeaza' ? s.permisiuniNoi : [];
  const permisiuni = rand?.permisiuni ?? instalata?.manifest.permisiuni ?? [];
  const pastrate = permisiuni.filter((p) => !noi.includes(p));
  // „Ce e nou”: la o actualizare, doar versiunile de după cea instalată.
  const noutati = noutatiDupa(rand?.noutati, s.fel === 'actualizeaza' ? s.de : null);
  const capturi = rand?.capturi?.[limba] ?? [];
  // Captura mărită (ADR 0232 §C.12): a câta e, sau null; doar unde fereastra are loc (nu pe un ecran îngust).
  const [marita, setMarita] = useState<number | null>(null);
  const locCapturi = useRef<HTMLDivElement | null>(null);
  const marire = !ingust();

  return (
    <article className="bib-pagina" data-testid="biblioteca-pagina" data-id={element.id} data-stare={s.fel}>
      <header className="pagina-cap">
        <SemnElement element={element} marime={48} />
        <div className="pagina-nume">
          <h3>{numeleLui(element)}</h3>
          <p className="confirmare-sursa" data-testid="pagina-despre">{despre}</p>
          {rand?.categorii && rand.categorii.length > 0 && (
            <p className="pagina-categorii" data-testid="pagina-categorii">
              {rand.categorii.map((c) => (
                <button key={c} type="button" className="bib-eticheta" data-extensii="categorie-pagina" data-categorie={c} onClick={() => { onCategorie(c); }}>
                  {numeCategorie(c)}
                </button>
              ))}
            </p>
          )}
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
            {/* „Scoate” rămâne și cât biblioteca are o versiune nouă: nimeni nu trebuie să actualizeze ca să poată scoate. */}
            {instalata && (
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
        <div ref={locCapturi} className="pagina-capturi" data-testid="pagina-capturi">
          {capturi.map((c, i) => {
            const img = <img src={new URL(c.fisier, adresaCatalog()).href} alt={c.alt} width={c.lat} height={c.inalt} loading="lazy" draggable={false} />;
            // La birou, captura se mărește la clic (sau Enter); pe un ecran îngust rămâne cum e, derulată în pagină.
            return (
              <figure key={c.fisier}>
                {marire ? <button type="button" data-extensii="captura" title={t('extensii.captura.mareste')} onClick={() => { setMarita(i); }}>{img}</button> : img}
              </figure>
            );
          })}
        </div>
      )}
      {marita !== null && (
        <CapturaMarita capturi={capturi.map((c) => ({ adresa: new URL(c.fisier, adresaCatalog()).href, alt: c.alt, lat: c.lat, inalt: c.inalt }))}
          loc={marita} onLoc={setMarita}
          onInchide={() => {
            const i = marita;
            setMarita(null);
            // Focusul, înapoi pe captura la care s-a ajuns.
            locCapturi.current?.querySelectorAll<HTMLButtonElement>('[data-extensii="captura"]')[i]?.focus();
          }} />
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
          <Noutati noutati={noutati} limba={limba} test="pagina-noutati" />
          <p className="confirmare-nota" data-testid="extensii-izolare">{t('extensii.instalare.izolare')}</p>
        </div>
      </div>
    </article>
  );
}
