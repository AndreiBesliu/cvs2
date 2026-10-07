import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Panza } from '../canvas/Panza.tsx';
import { t } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { documentNou, type ElementDoc } from '../model/document.ts';
import { istoricNou, type Istoric } from '../model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../ui/actiuniDocument.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { RezultatConfig } from './config.ts';
import { listaDesen } from './desen.ts';
import type { Jurnal } from './jurnalErori.ts';

type Props = {
  readonly config: RezultatConfig;
  readonly jurnal: Jurnal;
  readonly diagnostic: string | null;
  readonly alegeLimba: (l: Limba) => void;
};

/** Diagnosticul `?diagnostic=eroare-de-randare` aruncă la randare, ca ErrorBoundary-ul să se poată proba pe build. */
function EroareProvocata(): never {
  throw new Error('Eroare de randare provocată (diagnostic)');
}

/** Foaia documentului nou: bucata minimă a plăcii 1. */
const FOAIA_IMPLICITA = { latime: 300, inaltime: 200, grosime: 18 };

/** Acțiunile din bară, în ordine; toate trec prin registru. */
const BARA = ['document.adauga-dreptunghi', 'document.adauga-cerc', 'document.sterge-selectia', 'istoric.anuleaza', 'istoric.reface'] as const;

const doua = (x: number): string => x.toFixed(2);

function descriere(e: ElementDoc): string {
  const { e: x, f: y } = e.matrice;
  return e.forma.tip === 'dreptunghi'
    ? t('forma.dreptunghi', { latime: doua(e.forma.latime), inaltime: doua(e.forma.inaltime), x: doua(x), y: doua(y) })
    : t('forma.cerc', { raza: doua(e.forma.raza), x: doua(x), y: doua(y) });
}

export function App({ config, jurnal, diagnostic, alegeLimba }: Props) {
  const limbaActiva = useLimba();
  const intrari = useSyncExternalStore(jurnal.asculta, () => jurnal.citeste().length);
  const [istoric, setIstoric] = useState<Istoric>(() => istoricNou(documentNou(FOAIA_IMPLICITA)));
  const [selectie, setSelectie] = useState<readonly string[]>([]);
  // Acțiunile citesc și scriu starea sincron: referința ține mereu ultima valoare, starea React redesenează.
  const curenta = useRef({ istoric, selectie });
  curenta.current = { istoric, selectie };
  const registru = useMemo(() => creeazaRegistru(ACTIUNI_DOCUMENT, () => true), []);
  // Lista de desen se reface doar când se schimbă documentul: o listă nouă la fiecare randare ar cere un redesen inutil.
  const forme = useMemo(() => listaDesen(istoric.doc), [istoric.doc]);

  const context = (extra: Partial<Pick<ContextDocument, 'deplasare' | 'punct'>> = {}): ContextDocument => ({
    istoric: () => curenta.current.istoric,
    scrie: (h) => { curenta.current = { ...curenta.current, istoric: h }; setIstoric(h); },
    selectie: () => curenta.current.selectie,
    selecteaza: (ids) => { curenta.current = { ...curenta.current, selectie: ids }; setSelectie(ids); },
    ...extra,
  });

  useEffect(() => {
    document.documentElement.lang = limbaActiva;
  }, [limbaActiva]);

  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const id = e.key === 'Delete' ? 'document.sterge-selectia'
        : ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey ? 'istoric.anuleaza'
          : ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) ? 'istoric.reface'
            : null;
      if (!id) return;
      e.preventDefault();
      ruleaza(registru, id, context());
    };
    window.addEventListener('keydown', tasta);
    return () => { window.removeEventListener('keydown', tasta); };
  });

  // Pe live, diagnosticul nu există.
  if (diagnostic === 'eroare-de-randare' && config.ok && config.config.instanta !== 'live') return <EroareProvocata />;

  const instanta = config.ok ? config.config.instanta : t('app.instanta.necunoscuta');
  const doc = istoric.doc;
  const selectat = selectie.length === 1 ? doc.elemente.find((e) => e.id === selectie[0]) : undefined;

  return (
    <div className="aplicatie">
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
              onClick={() => { ruleaza(registru, id, context()); }}>
              {t(a.eticheta)}
            </button>
          );
        })}
      </div>
      {!config.ok && <p role="status" className="avertisment">{t('eroare.config', { motiv: config.motiv })}</p>}
      <Panza
        forme={forme}
        foaie={doc.foaie}
        selectie={selectie}
        onClic={(x, y, toleranta) => { ruleaza(registru, 'selectie.la-punct', context({ punct: () => ({ x, y, toleranta }) })); }}
        onMutare={(dx, dy) => { ruleaza(registru, 'document.muta-selectia', context({ deplasare: () => ({ dx, dy }) })); }}
      />
      <footer>
        <span data-testid="selectie">{selectat ? t('stare.selectie', { descriere: descriere(selectat) }) : t('stare.nimic-selectat')}</span>
        <span data-testid="jurnal">{t('jurnal.intrari', { n: intrari })}</span>
      </footer>
    </div>
  );
}
