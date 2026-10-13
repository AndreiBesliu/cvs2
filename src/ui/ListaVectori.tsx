import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { t } from '../i18n/t.ts';
import type { OperatieArbore } from './NivelPiesa.tsx';

/**
 * Nivelul de sub instanță (piesa și operațiile ei) vine la cerere, cu mesajele lui: nu intră în pachetul de pornire. Dacă
 * nu se poate aduce (o publicare nouă i-a schimbat numele), arborele rămâne cu foaia și instanțele.
 */
export const incarcaNivelPiesa = () => import('./NivelPiesa.tsx');
const NivelPiesa = lazy(() => incarcaNivelPiesa().then((m) => ({ default: m.NivelPiesa }), () => ({ default: () => null })));

/**
 * Lista de vectori (owner-ul, la încercarea prototipului de planșe, `BRIEF.md` §16.3): ce stă pe foaie, în ordinea foii.
 * O formă cu avertisment apare cu roșu, iar avertismentul e în titlul ei; pe pânză nu apare niciodată. Lista primește
 * doar date gata scrise: alegerea pleacă înapoi prin registrul de acțiuni.
 *
 * Din felia 2.8a e arborele proiectului (prototipul A, în carcasa B), după modelul D (ADR 0024): foaia, instanțele ei și,
 * sub fiecare instanță, piesa și operațiile ei. Cât timp nivelul doi e ascuns, un rând al listei e o instanță (forma pusă
 * pe foaie). Rândul instanței alese se deschide singur (selecția de pe pânză se vede și aici); unul deschis sau închis de
 * mână rămâne cum l-a lăsat omul. Tastatura: Tab trece prin rânduri ca până acum; pe un rând, săgețile sus / jos merg la
 * rândul vecin, iar dreapta / stânga îl deschid și îl închid.
 */
export type RandLista = {
  readonly id: string;
  readonly descriere: string;
  readonly avertisment: string | null;
  readonly selectat: boolean;
  /** Piesa instanței: câte forme desenează și operațiile ei (ADR 0025). */
  readonly elemente: number;
  readonly operatii: readonly OperatieArbore[];
};

type Props = {
  /** Foaia, în cuvinte: rădăcina arborelui. */
  readonly foaie: string;
  readonly randuri: readonly RandLista[];
  readonly onAlege: (id: string) => void;
};

export function ListaVectori({ foaie, randuri, onAlege }: Props) {
  const radacina = useRef<HTMLElement>(null);
  // Rândurile deschise sau închise de mână; celelalte urmează selecția.
  const [comutate, setComutate] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const comuta = (id: string, deschis: boolean): void => { setComutate((m) => new Map(m).set(id, deschis)); };
  const alese = randuri.filter((r) => r.selectat).map((r) => r.id).join(' ');

  // O selecție nouă (de pe pânză, din bară sau de la tastatură) aduce în vedere primul rând ales, dacă nu se vede.
  useEffect(() => {
    if (alese) radacina.current?.querySelector('button[data-instanta][aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [alese]);

  const sageti = (e: KeyboardEvent<HTMLButtonElement>, id: string, deschis: boolean): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const toate = [...(radacina.current?.querySelectorAll<HTMLButtonElement>('button[data-instanta]') ?? [])];
      toate[toate.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
    } else if ((e.key === 'ArrowRight' && !deschis) || (e.key === 'ArrowLeft' && deschis)) {
      comuta(id, !deschis);
    } else {
      return;
    }
    // Săgețile nu mai derulează și lista.
    e.preventDefault();
  };

  return (
    <aside ref={radacina} className="lista-vectori" aria-label={t('lista.titlu')} data-testid="lista-vectori">
      <h2>{t('lista.titlu')}</h2>
      <p className="nod nod-foaie" data-nod="foaie" data-icona="arbore.foaie">{foaie}</p>
      {randuri.length === 0 ? (
        <p className="lista-goala">{t('lista.goala')}</p>
      ) : (
        <ul>
          {randuri.map((r) => {
            const deschis = comutate.get(r.id) ?? r.selectat;
            return (
              <li key={r.id}>
                <button type="button" className="comuta" data-comuta={r.id} aria-expanded={deschis} aria-label={t('arbore.detalii')}
                  title={t('arbore.detalii')} onClick={() => { comuta(r.id, !deschis); }} />
                <button
                  type="button"
                  data-instanta={r.id}
                  aria-pressed={r.selectat}
                  className={r.avertisment ? 'cu-avertisment' : undefined}
                  title={r.avertisment ?? undefined}
                  onClick={() => { onAlege(r.id); }}
                  onKeyDown={(e) => { sageti(e, r.id, deschis); }}
                >
                  {r.descriere}
                </button>
                {deschis && <Suspense fallback={null}><NivelPiesa elemente={r.elemente} operatii={r.operatii} /></Suspense>}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
