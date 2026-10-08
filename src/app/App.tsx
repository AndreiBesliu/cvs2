import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Panza } from '../canvas/Panza.tsx';
import { t } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { avertismente } from '../model/avertismente.ts';
import { documentNou } from '../model/document.ts';
import { istoricNou, type Istoric } from '../model/jurnal.ts';
import { elementeFoaie, type ElementLume } from '../model/lume.ts';
import { creeazaRegistru, ruleaza, stare } from '../ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT, type ContextExport, type ParametriExport, type RezultatExport } from '../ui/actiuniExport.ts';
import { DialogExport, type StareExport } from '../ui/DialogExport.tsx';
import { ListaVectori, type RandLista } from '../ui/ListaVectori.tsx';
import { useLimba } from '../ui/useLimba.ts';
import type { RezultatConfig } from './config.ts';
import { listaDesen } from './desen.ts';
import type { Jurnal } from './jurnalErori.ts';
import type { ProiectDeschis } from './proiectLocal.ts';

type Props = {
  readonly config: RezultatConfig;
  readonly jurnal: Jurnal;
  readonly diagnostic: string | null;
  readonly alegeLimba: (l: Limba) => void;
  /** Proiectul din browser, deschis înainte de prima randare (`proiectLocal.ts`). */
  readonly proiect: ProiectDeschis;
};

/** Diagnosticul `?diagnostic=eroare-de-randare` aruncă la randare, ca ErrorBoundary-ul să se poată proba pe build. */
function EroareProvocata(): never {
  throw new Error('Eroare de randare provocată (diagnostic)');
}

/** Descarcă octeții exacți ai programului: același fișier, același hash. */
function descarca(octeti: Uint8Array<ArrayBuffer>, nume: string): void {
  const url = URL.createObjectURL(new Blob([octeti], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}

/** Foaia documentului nou: bucata minimă a plăcii 1. */
const FOAIA_IMPLICITA = { latime: 300, inaltime: 200, grosime: 18 };

/** Acțiunile din bară, în ordine; toate trec prin registru. */
const BARA = [
  'document.adauga-dreptunghi', 'document.adauga-cerc', 'document.duplica-selectia', 'document.sterge-selectia',
  'istoric.anuleaza', 'istoric.reface',
] as const;

const doua = (x: number): string => x.toFixed(2);

/** Un element în lume, în cuvinte: forma și unde stă pe foaie. */
function descriere(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  const { e: x, f: y } = e.matrice;
  return e.forma.tip === 'dreptunghi'
    ? t('forma.dreptunghi', { latime: doua(e.forma.latime), inaltime: doua(e.forma.inaltime), x: doua(x), y: doua(y) })
    : t('forma.cerc', { raza: doua(e.forma.raza), x: doua(x), y: doua(y) });
}

/** O instanță, în cuvinte: numele piesei, sau primul ei element (și câte mai are). */
function descriereInstanta(elemente: readonly ElementLume[], nume: string | undefined): string {
  const [primul] = elemente;
  if (nume) return nume;
  if (!primul) return '—';
  return elemente.length === 1 ? descriere(primul) : `${descriere(primul)} (+${elemente.length - 1})`;
}

/** Ce spune bara de jos despre salvare, după cum s-a deschis proiectul. */
function mesajProiect(p: ProiectDeschis): string | null {
  if (p.mod === 'doar-citire') return t('depozit.doar-citire');
  if (p.mod === 'fara-memorie') return t('depozit.fara-memorie');
  if (p.mod === 'nu-se-deschide') return t('depozit.nu-se-deschide', { motiv: p.motiv });
  return null;
}

export function App({ config, jurnal, diagnostic, alegeLimba, proiect }: Props) {
  const limbaActiva = useLimba();
  const intrari = useSyncExternalStore(jurnal.asculta, () => jurnal.citeste().length);
  const docPornire = useMemo(
    () => ((proiect.mod === 'scriitor' || proiect.mod === 'doar-citire') && proiect.doc ? proiect.doc : documentNou(FOAIA_IMPLICITA)),
    [proiect],
  );
  const [istoric, setIstoric] = useState<Istoric>(() => istoricNou(docPornire));
  const [selectie, setSelectie] = useState<readonly string[]>([]);
  const [eroareSalvare, setEroareSalvare] = useState<string | null>(null);
  // Acțiunile citesc și scriu starea sincron: referința ține mereu ultima valoare, starea React redesenează.
  const curenta = useRef({ istoric, selectie });
  curenta.current = { istoric, selectie };
  const registru = useMemo(() => creeazaRegistru(ACTIUNI_DOCUMENT, () => true), []);
  const registruExport = useMemo(() => creeazaRegistru(ACTIUNI_EXPORT, () => true), []);
  const [dialogExport, setDialogExport] = useState(false);
  const [stareExport, setStareExport] = useState<StareExport | null>(null);
  /**
   * Numărul ultimei cereri de export. Un rezultat întârziat (calculul se încarcă la cerere) e al altor parametri dacă între
   * timp s-a pornit alt export, s-a schimbat un parametru sau s-a închis dialogul: nu se afișează și nu se descarcă.
   */
  const cerereExport = useRef(0);
  const contextExport = (p?: ParametriExport, cerere = cerereExport.current): ContextExport => ({
    document: () => curenta.current.istoric.doc,
    parametri: () => p ?? { origine: 'stanga-jos', z0: 'sus', diametruScula: 6, elemente: new Map() },
    rezultat: (r: RezultatExport) => {
      if (cerere !== cerereExport.current) return;
      if (r.ok) {
        descarca(r.program.octeti, `cncvs2-${p?.origine ?? 'stanga-jos'}.${r.program.extensie}`);
        setStareExport({ ok: true, linii: r.program.linii, sha256: r.program.sha256 });
      } else {
        setStareExport('cereConfirmare' in r ? { ok: false, motiv: r.motiv, cereConfirmare: r.cereConfirmare } : { ok: false, motiv: r.motiv });
      }
    },
  });
  const doc = istoric.doc;
  const foaie = doc.foi[0] ?? documentNou(FOAIA_IMPLICITA).foi[0];
  // Lista de desen și elementele în lume se refac doar când se schimbă documentul.
  const lume = useMemo(() => elementeFoaie(doc, 0), [doc]);
  const forme = useMemo(() => listaDesen(doc), [doc]);
  // Avertismentele: tot după fiecare schimbare a documentului; în bara de jos și în listă, niciodată pe pânză.
  const avert = useMemo(() => avertismente(doc, 0), [doc]);
  // Selecția ține instanțe; pânza primește elementele lor în lume.
  const selectieDesen = useMemo(() => {
    const alese = new Set(selectie);
    return lume.filter((e) => alese.has(e.instanta)).map((e) => e.idLume);
  }, [lume, selectie]);

  // Salvarea: fiecare document nou (după o comandă, o anulare sau o refacere) pleacă în IndexedDB, doar din fila care scrie.
  useEffect(() => {
    if (proiect.mod !== 'scriitor' || doc === docPornire) return;
    proiect.depozit.scrie(doc).then(
      () => { setEroareSalvare(null); },
      (e: unknown) => {
        const motiv = e instanceof Error ? e.message : String(e);
        jurnal.adauga('salvare', e);
        setEroareSalvare(motiv);
      },
    );
  }, [doc, docPornire, proiect, jurnal]);

  const context = (extra: Partial<Pick<ContextDocument, 'deplasare' | 'punct' | 'alese'>> = {}): ContextDocument => ({
    istoric: () => curenta.current.istoric,
    scrie: (h) => { curenta.current = { ...curenta.current, istoric: h }; setIstoric(h); },
    selectie: () => curenta.current.selectie,
    selecteaza: (ids) => { curenta.current = { ...curenta.current, selectie: ids }; setSelectie(ids); },
    doarCitire: () => proiect.mod === 'doar-citire',
    ...extra,
  });

  useEffect(() => {
    document.documentElement.lang = limbaActiva;
  }, [limbaActiva]);

  /**
   * Ușa unică a acțiunilor de document. Cât e deschis dialogul de export, nicio acțiune nu rulează, oricare ar fi calea:
   * o scurtătură, un buton atins cu Tab sau o tragere pornită înainte de dialog. Confirmarea unei ieșiri din foaie rămâne
   * a desenului pe care omul îl vede.
   */
  const dialogDeschis = useRef(false);
  dialogDeschis.current = dialogExport;
  const ruleazaDocument = (id: string, ctx: ContextDocument): void => {
    if (dialogDeschis.current) return;
    ruleaza(registru, id, ctx);
  };

  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const id = e.key === 'Delete' ? 'document.sterge-selectia'
        : ctrl && k === 'z' && !e.shiftKey ? 'istoric.anuleaza'
          : ctrl && (k === 'y' || (k === 'z' && e.shiftKey)) ? 'istoric.reface'
            : ctrl && k === 'd' && !e.shiftKey ? 'document.duplica-selectia'
              : null;
      if (!id) return;
      // Ctrl+D ar pune altfel pagina la favorite.
      e.preventDefault();
      ruleazaDocument(id, context());
    };
    window.addEventListener('keydown', tasta);
    return () => { window.removeEventListener('keydown', tasta); };
  });

  // Pe live, diagnosticul nu există.
  if (diagnostic === 'eroare-de-randare' && config.ok && config.config.instanta !== 'live') return <EroareProvocata />;

  const instanta = config.ok ? config.config.instanta : t('app.instanta.necunoscuta');
  const elementeInstanta = (id: string): ElementLume[] => lume.filter((e) => e.instanta === id);
  const numePiesa = (id: string): string | undefined => {
    const i = foaie?.instante.find((x) => x.id === id);
    return i ? doc.piese.find((p) => p.id === i.piesa)?.nume : undefined;
  };
  const selectata = selectie.length === 1 && selectie[0] !== undefined ? selectie[0] : null;
  const descriereLume = (idLume: string): string => {
    const e = lume.find((x) => x.idLume === idLume);
    return e ? descriere(e) : idLume;
  };
  const avertInstanta = new Map<string, string[]>();
  for (const a of avert) avertInstanta.set(a.instanta, [...(avertInstanta.get(a.instanta) ?? []), t('avertisment.iese-din-foaie', { descriere: descriereLume(a.id) })]);
  const randuri: RandLista[] = (foaie?.instante ?? []).map((i) => ({
    id: i.id,
    descriere: descriereInstanta(elementeInstanta(i.id), numePiesa(i.id)),
    avertisment: avertInstanta.get(i.id)?.join('\n') ?? null,
    selectat: selectie.includes(i.id),
  }));
  const mesaj = mesajProiect(proiect);

  return (
    <>
      {/* Sub dialog, aplicația e inertă: nici Tab, nici clicul nu mai ajung la bară sau la pânză. */}
      <div className="aplicatie" inert={dialogExport}>
        <header>
          <h1>{t('app.titlu')}</h1>
          <span data-testid="instanta" className="instanta">{t('app.instanta', { nume: instanta })}</span>
          <nav aria-label={t('app.limba')}>
            {LIMBI.map((l) => (
              <button key={l} type="button" aria-pressed={l === limbaActiva} onClick={() => { alegeLimba(l); }}>
                {l.toUpperCase()}
              </button>
            ))}
          </nav>
        </header>
        <div className="bara" role="toolbar" aria-label={t('bara.actiuni')}>
          {BARA.map((id) => {
            const s = stare(registru, id, context());
            const a = registru.actiuni.get(id);
            if (!a) return null;
            return (
              <button key={id} type="button" disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)} data-actiune={id}
                onClick={() => { ruleazaDocument(id, context()); }}>
                {t(a.eticheta)}
              </button>
            );
          })}
          {(() => {
            const s = stare(registruExport, 'export.gcode', contextExport());
            return (
              <button type="button" disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)} data-actiune="export.gcode"
                onClick={() => { setStareExport(null); setDialogExport(true); }}>
                {t('actiune.exporta-gcode')}
              </button>
            );
          })()}
        </div>
        {!config.ok && <p role="status" className="avertisment">{t('eroare.config', { motiv: config.motiv })}</p>}
        <div className="lucru">
          <Panza
            forme={forme}
            foaie={foaie?.stoc ?? FOAIA_IMPLICITA}
            selectie={selectieDesen}
            onClic={(x, y, toleranta) => { ruleazaDocument('selectie.la-punct', context({ punct: () => ({ x, y, toleranta }) })); }}
            onMutare={(dx, dy) => { ruleazaDocument('document.muta-selectia', context({ deplasare: () => ({ dx, dy }) })); }}
          />
          <ListaVectori
            randuri={randuri}
            onAlege={(id) => { ruleazaDocument('selectie.din-lista', context({ alese: () => [id] })); }}
          />
        </div>
        <footer>
          <span data-testid="selectie">
            {selectata ? t('stare.selectie', { descriere: descriereInstanta(elementeInstanta(selectata), numePiesa(selectata)) }) : t('stare.nimic-selectat')}
          </span>
          {avert.length > 0 && (() => {
            // Un singur rând, oricâte avertismente: bara nu crește peste pânză. Lista întreagă stă în titlu și, cu roșu, în
            // lista de vectori.
            const toate = avert.map((a) => t('avertisment.iese-din-foaie', { descriere: descriereLume(a.id) }));
            return (
              <span className="avertisment-bara" data-testid="avertisment" title={toate.join('\n')}>
                {toate.length === 1 ? toate[0] : t('avertisment.forme-ies-din-foaie', { n: toate.length })}
              </span>
            );
          })()}
          {(mesaj ?? eroareSalvare) !== null && (
            <span className="avertisment-bara" data-testid="proiect" role="status">
              {mesaj ?? t('depozit.eroare', { motiv: eroareSalvare ?? '' })}
            </span>
          )}
          <span data-testid="jurnal">{t('jurnal.intrari', { n: intrari })}</span>
        </footer>
      </div>
      {dialogExport && (
        <DialogExport
          elemente={lume.map((e) => ({
            id: e.idLume,
            descriere: descriere(e),
            // Aceleași implicite ca `parametriImpliciti` din `src/cam/job.ts`, scrise aici ca pachetul de pornire să nu tragă CAM-ul.
            implicit: e.forma.tip === 'cerc' ? { latura: 'interior', adancime: 8, pas: 4 } : { latura: 'exterior', adancime: 3, pas: 3 },
          }))}
          stare={stareExport}
          onExporta={(p) => { ruleaza(registruExport, 'export.gcode', contextExport(p, ++cerereExport.current)); }}
          onInchide={() => { cerereExport.current++; setDialogExport(false); }}
          onReseteaza={() => { cerereExport.current++; setStareExport(null); }}
        />
      )}
    </>
  );
}
