import { useEffect, useRef, useState } from 'react';
import '../i18n/carcasa.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { RezultatActiune } from './actiuni.ts';
import { useLimba } from './useLimba.ts';

/** O acțiune a registrului, cum o arată paleta: din `toate()` (`actiuni.ts`). */
export type ElementPaleta = { readonly id: string; readonly eticheta: CheieSimpla; readonly stare: RezultatActiune };

type Props = {
  readonly elemente: readonly ElementPaleta[];
  /** Scurtătura arătată a unei acțiuni (`scurtaturi.ts`, primită de la aplicație: paleta nu-și aduce o copie). */
  readonly tasta: (id: string) => string | undefined;
  /** O acțiune activă, aleasă: paleta se închide, iar aplicația o rulează prin registru. */
  readonly onAlege: (id: string) => void;
  readonly onInchide: () => void;
  /**
   * Unde era focusul când s-a cerut paleta, citit de aplicație chiar atunci: la prima randare a paletei (care vine la
   * cerere) aplicația e deja inertă, iar browserul poate să fi mutat focusul pe pagină.
   */
  readonly focusInapoi: Element | null;
};

/**
 * Acțiunile care pornesc dintr-un gest (clicul, tragerea) sau dintr-o fereastră, nu dintr-o comandă: paleta le arată,
 * ca registrul să se vadă întreg, dar spune unde se fac, nu motivul tehnic („nu s-a dat niciun punct”).
 */
const GESTURI: Readonly<Record<string, CheieSimpla>> = {
  'selectie.la-punct': 'paleta.gest.selectie.la-punct',
  'selectie.din-lista': 'paleta.gest.selectie.din-lista',
  'document.muta-selectia': 'paleta.gest.document.muta-selectia',
  'document.importa': 'paleta.gest.document.importa',
  'document.aplica-operatii': 'paleta.gest.document.aplica-operatii',
};

/** Grupurile, în ordinea paletei, după prefixul id-ului. */
const GRUPURI: ReadonlyArray<readonly [CheieSimpla, readonly string[]]> = [
  ['paleta.grup.fisier', ['import', 'export']],
  ['paleta.grup.document', ['document']],
  ['paleta.grup.istoric', ['istoric']],
  ['paleta.grup.selectie', ['selectie']],
  ['paleta.grup.vedere', ['vedere']],
];

/** Fără diacritice și fără majuscule: „sterge” găsește „Șterge selecția”. */
const simplu = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Paleta de comenzi (Ctrl+K): toate acțiunile registrelor, cu numele traduse, scurtătura și, pentru cele inactive,
 * motivul. Se încarcă la cerere, ca dialogurile. Doar o acțiune activă se poate alege; aplicația o rulează tot prin
 * registru, deci starea și motivul sunt aceleași ca în bară.
 */
export function Paleta({ elemente, tasta, onAlege, onInchide, focusInapoi }: Props) {
  useLimba();
  const [text, setText] = useState('');
  const [activ, setActiv] = useState(0);
  const camp = useRef<HTMLInputElement>(null);
  // Focusul intră în câmp; la închidere (curățarea rulează după ce aplicația nu mai e inertă) se întoarce unde era.
  useEffect(() => {
    camp.current?.focus();
    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };
  }, [focusInapoi]);

  const q = simplu(text.trim());
  const grupuri = GRUPURI.map(([cheie, prefixe]) => ({
    cheie,
    elemente: elemente
      .filter((e) => prefixe.includes(e.id.split('.')[0] ?? '') && (!q || simplu(`${t(e.eticheta)} ${t(cheie)}`).includes(q)))
      // În grup, cele care se pot rula acum vin primele; gesturile, la urmă.
      .sort((a, b) => Number(a.id in GESTURI) - Number(b.id in GESTURI) || Number(!a.stare.ok) - Number(!b.stare.ok)),
  })).filter((g) => g.elemente.length > 0);
  const lista = grupuri.flatMap((g) => g.elemente);
  const curent = lista[Math.min(activ, lista.length - 1)];

  useEffect(() => {
    if (curent) document.getElementById(`paleta-${curent.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [curent]);

  const alege = (e: ElementPaleta | undefined): void => {
    if (e?.stare.ok && !(e.id in GESTURI)) onAlege(e.id);
  };

  const apasa = (ev: React.KeyboardEvent<HTMLInputElement>): void => {
    const pas = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
    if (pas !== 0) {
      ev.preventDefault();
      setActiv((Math.min(activ, lista.length - 1) + pas + lista.length) % Math.max(lista.length, 1));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      alege(curent);
    } else if (ev.key === 'Escape' || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k')) {
      // Ctrl+K o închide, ca pe un comutator (și nu ajunge la căutarea browserului).
      ev.preventDefault();
      onInchide();
    } else if (ev.key === 'Tab') {
      // Câmpul e singurul loc cu focus: Tab nu iese din paletă, în spatele căreia aplicația e inertă.
      ev.preventDefault();
    }
  };

  return (
    <div className="paleta-fond" onPointerDown={(e) => { if (e.target === e.currentTarget) onInchide(); }}>
      {/* Un clic în paletă (pe o opțiune, chiar inactivă) nu ia focusul din câmp: săgețile și Escape merg mai departe. */}
      <div className="paleta" role="dialog" aria-modal="true" aria-label={t('paleta.titlu')} data-icona="vedere.paleta"
        onMouseDown={(e) => { if (e.target !== camp.current) e.preventDefault(); }}>
        <input
          ref={camp}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="paleta-lista"
          aria-autocomplete="list"
          aria-activedescendant={curent ? `paleta-${curent.id}` : undefined}
          aria-label={t('paleta.cauta')}
          placeholder={t('paleta.cauta')}
          value={text}
          onChange={(e) => { setText(e.target.value); setActiv(0); }}
          onKeyDown={apasa}
        />
        <div id="paleta-lista" role="listbox" aria-label={t('paleta.titlu')} className="paleta-lista">
          {grupuri.map((g) => (
            <div key={g.cheie} role="group" aria-labelledby={`paleta-${g.cheie}`}>
              <div id={`paleta-${g.cheie}`} className="paleta-grup" role="presentation">{t(g.cheie)}</div>
              {g.elemente.map((e) => {
                const gest = GESTURI[e.id];
                const k = tasta(e.id);
                return (
                  <div
                    key={e.id}
                    id={`paleta-${e.id}`}
                    role="option"
                    aria-selected={e === curent}
                    aria-disabled={!e.stare.ok || gest !== undefined}
                    data-icona={e.id}
                    className="paleta-optiune"
                    onPointerMove={() => { if (e !== curent) setActiv(lista.indexOf(e)); }}
                    onClick={() => { alege(e); }}
                  >
                    <span className="paleta-nume">{t(e.eticheta)}</span>
                    {gest ? <span className="paleta-motiv">{t(gest)}</span>
                      : !e.stare.ok && <span className="paleta-motiv">{t(e.stare.motiv)}</span>}
                    {k && <kbd>{k}</kbd>}
                  </div>
                );
              })}
            </div>
          ))}
          {lista.length === 0 && <p className="paleta-gol">{t('paleta.niciuna', { text })}</p>}
        </div>
        <p className="paleta-ajutor" aria-hidden="true">{t('paleta.ajutor')}</p>
      </div>
    </div>
  );
}
