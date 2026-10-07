import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Panza } from '../canvas/Panza.tsx';
import { t } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { avertismente } from '../model/avertismente.ts';
import { documentNou, type ElementDoc } from '../model/document.ts';
import { istoricNou, type Istoric } from '../model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT, type ContextExport, type ParametriExport, type RezultatExport } from '../ui/actiuniExport.ts';
import { DialogExport, type StareExport } from '../ui/DialogExport.tsx';
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
  const registruExport = useMemo(() => creeazaRegistru(ACTIUNI_EXPORT, () => true), []);
  const [dialogExport, setDialogExport] = useState(false);
  const [stareExport, setStareExport] = useState<StareExport | null>(null);
  const contextExport = (p?: ParametriExport): ContextExport => ({
    document: () => curenta.current.istoric.doc,
    parametri: () => p ?? { origine: 'stanga-jos', z0: 'sus', diametruScula: 6, elemente: new Map() },
    rezultat: (r: RezultatExport) => {
      if (r.ok) {
        descarca(r.program.octeti, `cncvs2-${p?.origine ?? 'stanga-jos'}.${r.program.extensie}`);
        setStareExport({ ok: true, linii: r.program.linii, sha256: r.program.sha256 });
      } else {
        setStareExport('cereConfirmare' in r ? { ok: false, motiv: r.motiv, cereConfirmare: r.cereConfirmare } : { ok: false, motiv: r.motiv });
      }
    },
  });
  // Lista de desen se reface doar când se schimbă documentul: o listă nouă la fiecare randare ar cere un redesen inutil.
  const forme = useMemo(() => listaDesen(istoric.doc), [istoric.doc]);
  // Avertismentele: tot după fiecare schimbare a documentului; se arată în bara de jos, niciodată pe pânză.
  const avert = useMemo(() => avertismente(istoric.doc), [istoric.doc]);

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
      <Panza
        forme={forme}
        foaie={doc.foaie}
        selectie={selectie}
        onClic={(x, y, toleranta) => { ruleaza(registru, 'selectie.la-punct', context({ punct: () => ({ x, y, toleranta }) })); }}
        onMutare={(dx, dy) => { ruleaza(registru, 'document.muta-selectia', context({ deplasare: () => ({ dx, dy }) })); }}
      />
      {dialogExport && (
        <DialogExport
          elemente={doc.elemente.map((e) => ({
            id: e.id,
            descriere: descriere(e),
            // Aceleași implicite ca `parametriImpliciti` din `src/cam/job.ts`, scrise aici ca pachetul de pornire să nu tragă CAM-ul.
            implicit: e.forma.tip === 'cerc' ? { latura: 'interior', adancime: 8, pas: 4 } : { latura: 'exterior', adancime: 3, pas: 3 },
          }))}
          stare={stareExport}
          onExporta={(p) => { ruleaza(registruExport, 'export.gcode', contextExport(p)); }}
          onInchide={() => { setDialogExport(false); }}
          onReseteaza={() => { setStareExport(null); }}
        />
      )}
      <footer>
        <span data-testid="selectie">{selectat ? t('stare.selectie', { descriere: descriere(selectat) }) : t('stare.nimic-selectat')}</span>
        {avert.length > 0 && (
          <span className="avertismente">
            {avert.map((a) => {
              const e = doc.elemente.find((x) => x.id === a.id);
              return (
                <span key={a.id} className="avertisment-bara" data-testid="avertisment">
                  {t('avertisment.iese-din-foaie', { descriere: e ? descriere(e) : a.id })}
                </span>
              );
            })}
          </span>
        )}
        <span data-testid="jurnal">{t('jurnal.intrari', { n: intrari })}</span>
      </footer>
    </div>
  );
}
