import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { capitolPentru, esteManual, fisierManual, type LimbaManual, type Manual as DateManual } from '../../shared/manual.ts';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import { normalizeazaCautare as normalizeaza } from '../docs/cautare.ts';
import { Markdown, TextMd, type Legaturi } from '../docs/Markdown.tsx';
import './manual.css';

/**
 * Fereastra manualului (documentația live, ADR 0058), la cerere din modulul editării: butonul „?” din extensia barei sau
 * F1. Manualul limbii de acum vine din `manual/<limba>.json` (generat la build, în precache: merge și fără rețea), o dată
 * pe pagină. Se deschide la capitolul care descrie ușa de acum (unealta aleasă, vederea 3D, fereastra deschisă), altfel
 * la ultimul citit. O fereastră nativă (`showModal`): restul paginii e inert, Esc o închide, focusul se întoarce unde era;
 * tastele apăsate în ea nu ajung la scurtăturile aplicației.
 */

type Props = {
  /** Ușa interfeței de acum (`unealta.cerc`, `editare.3d`, `export.gcode`): manualul se deschide la capitolul ei. */
  readonly usa: string | null;
  readonly onInchide: () => void;
};

type Stare =
  | { readonly fel: 'incarca' }
  | { readonly fel: 'gata'; readonly manual: DateManual }
  | { readonly fel: 'eroare'; readonly motiv: string };

/** Manualele aduse în pagina asta (cererea, nu răspunsul: două deschideri la rând nu cer de două ori). */
const aduse = new Map<LimbaManual, Promise<DateManual>>();
/** Ultimul capitol citit, pentru deschiderea fără context. */
let ultimul: string | null = null;

function adu(limba: LimbaManual): Promise<DateManual> {
  let p = aduse.get(limba);
  if (!p) {
    p = fetch(`/${fisierManual(limba)}`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const x: unknown = await r.json();
      if (!esteManual(x) || x.limba !== limba) throw new Error('fișierul manualului nu are forma așteptată');
      return x;
    });
    // O cerere căzută (fără rețea, înainte ca manualul să fi intrat în cache) se reîncearcă la deschiderea următoare.
    p.catch(() => { aduse.delete(limba); });
    aduse.set(limba, p);
  }
  return p;
}

export function Manual({ usa, onInchide }: Props): ReactElement {
  const limba = useLimba();
  const [stare, setStare] = useState<Stare>({ fel: 'incarca' });
  const [ales, setAles] = useState<string | null>(null);
  const [cautare, setCautare] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const articol = useRef<HTMLElement>(null);
  const inchide = useRef(onInchide);
  inchide.current = onInchide;

  useEffect(() => {
    let viu = true;
    setStare({ fel: 'incarca' });
    adu(limba).then((manual) => {
      if (!viu) return;
      setStare({ fel: 'gata', manual });
      setAles((a) => {
        const exista = (id: string | null): id is string => id !== null && manual.capitole.some((c) => c.id === id);
        if (exista(a)) return a;
        const dupaUsa = usa ? capitolPentru(manual, usa)?.id ?? null : null;
        return exista(dupaUsa) ? dupaUsa : exista(ultimul) ? ultimul : manual.capitole[0]!.id;
      });
    }, (e: unknown) => {
      if (viu) setStare({ fel: 'eroare', motiv: e instanceof Error ? e.message : String(e) });
    });
    return () => { viu = false; };
  }, [limba, usa]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (!d.open) d.showModal();
    // Scurtăturile aplicației (T, Delete, Ctrl+Z) ascultă pe fereastră: tastele din manual se opresc aici.
    const tasta = (e: KeyboardEvent): void => { e.stopPropagation(); };
    const inchisa = (): void => { inchide.current(); };
    d.addEventListener('keydown', tasta);
    d.addEventListener('close', inchisa);
    return () => {
      d.removeEventListener('keydown', tasta);
      d.removeEventListener('close', inchisa);
      if (d.open) d.close();
    };
  }, []);

  useEffect(() => {
    if (ales) ultimul = ales;
    articol.current?.scrollTo?.({ top: 0 });
  }, [ales]);

  const manual = stare.fel === 'gata' ? stare.manual : null;
  const q = normalizeaza(cautare.trim());
  const potrivite = useMemo(() => (manual && q !== ''
    ? manual.capitole.filter((c) => normalizeaza(`${c.titlu}\n${c.text}`).includes(q))
    : manual?.capitole ?? []), [manual, q]);
  const capitol = manual?.capitole.find((c) => c.id === ales) ?? null;
  const legaturi: Legaturi = {
    interna: (href) => {
      const id = href.startsWith('#') ? href.slice(1) : null;
      return id && manual?.capitole.some((c) => c.id === id) ? { href, actiune: () => { setAles(id); } } : null;
    },
  };

  return createPortal(
    <dialog ref={dialog} className="manual" aria-labelledby="manual-titlu" data-testid="manual" data-stare={stare.fel} data-limba={limba}>
      <header className="manual-sus">
        <h2 id="manual-titlu">{manual?.titlu ?? t('editare.manual.titlu')}</h2>
        <input type="search" className="manual-cauta" value={cautare} placeholder={t('editare.manual.cauta')} aria-label={t('editare.manual.cauta')}
          data-testid="manual-cauta" onChange={(e) => { setCautare(e.target.value); }} />
        <button type="button" className="manual-inchide" title={t('editare.manual.inchide')} aria-label={t('editare.manual.inchide')}
          data-testid="manual-inchide" onClick={() => { dialog.current?.close(); }}>×</button>
      </header>
      {stare.fel === 'incarca' ? <p className="manual-mesaj" role="status">{t('editare.manual.incarca')}</p> : null}
      {stare.fel === 'eroare' ? <p className="manual-mesaj cip cip-rosu" role="status">{t('editare.manual.eroare', { motiv: stare.motiv })}</p> : null}
      {manual ? (
        <div className="manual-corp">
          <nav className="manual-cuprins" aria-label={t('editare.manual.cuprins')}>
            <ol>
              {potrivite.map((c) => (
                <li key={c.id}>
                  <button type="button" data-capitol={c.id} aria-current={c.id === ales ? 'page' : undefined} onClick={() => { setAles(c.id); }}>
                    <TextMd md={c.titlu} />
                  </button>
                </li>
              ))}
            </ol>
            {potrivite.length === 0 ? <p className="manual-niciunul" role="status">{t('editare.manual.niciun-rezultat', { text: cautare.trim() })}</p> : null}
          </nav>
          <article ref={articol} className="manual-text" data-testid="manual-capitol" data-capitol={capitol?.id} tabIndex={-1}>
            {capitol ? (
              <>
                <h3 className="manual-titlu-capitol"><TextMd md={capitol.titlu} legaturi={legaturi} /></h3>
                <Markdown text={capitol.text} legaturi={legaturi} nivelBaza={2} prefixAncora={`manual-${capitol.id}-`} />
              </>
            ) : null}
          </article>
        </div>
      ) : null}
    </dialog>,
    document.body,
  );
}
