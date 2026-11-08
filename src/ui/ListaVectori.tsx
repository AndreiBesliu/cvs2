import { Fragment, lazy, Suspense, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { cuMesaje, t } from '../i18n/t.ts';
import type { ActiuniFoi } from './MeniuFoaie.tsx';
import type { OperatieArbore } from './NivelPiesa.tsx';

/** Ce poate schimba lista la foi (ADR 0210 §1): tipul stă cu meniul foii, care vine la cerere. */
export type { ActiuniFoi };

/**
 * Nivelul de sub instanță (piesa și operațiile ei) vine la cerere, cu mesajele lui: nu intră în pachetul de pornire. Dacă
 * nu se poate aduce (o publicare nouă i-a schimbat numele), arborele rămâne cu foaia și instanțele.
 */
export const incarcaNivelPiesa = () => import('./NivelPiesa.tsx').then(cuMesaje);
const NivelPiesa = lazy(() => incarcaNivelPiesa().then((m) => ({ default: m.NivelPiesa }), () => ({ default: () => null })));
/** Meniul unei foi (ADR 0210 §1), tot la cerere: la primul ⋯ sau clic dreapta pe o foaie, ori preîncărcat după pornire. */
export const incarcaMeniuFoaie = () => import('./MeniuFoaie.tsx').then(cuMesaje);
const MeniuFoaie = lazy(() => incarcaMeniuFoaie().then((m) => ({ default: m.MeniuFoaie }), () => ({ default: () => null })));

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
 *
 * Din felia 11.1↑ (ADR 0210 §1), arborele are foile proiectului: un rând pe foaie (numele, mărimea, materialul, câte piese),
 * clic pe el = foaia activă; doar foaia activă își arată piesele. Meniul foii (⋯) are proprietățile ei, copia, mutarea în
 * listă și ștergerea (cu o confirmare când are piese); „+ Foaie” la capăt. Un rând de piesă tras pe altă foaie o mută acolo.
 */
export type RandLista = {
  readonly id: string;
  readonly descriere: string;
  /** O piesă pusă de mai multe ori (ADR 0210 §2): al câtelea e rândul din toate („(4 din 12)”), sau null. */
  readonly legata?: string | null;
  readonly avertisment: string | null;
  readonly selectat: boolean;
  /** Piesa instanței: câte forme desenează și operațiile ei (ADR 0025). */
  readonly elemente: number;
  readonly operatii: readonly OperatieArbore[];
};

/** O foaie a proiectului, cum o arată lista (ADR 0210 §1). */
export type FoaieLista = {
  readonly id: string;
  /** Numele arătat („Foaia 2”, sau cel scris de om). */
  readonly eticheta: string;
  /** Mărimea, materialul (dacă e scris) și câte piese are, arătate cu „ · ” între ele („300 × 200 × 10 mm · MDF alb 18 · 2 piese”). */
  readonly detalii: readonly string[];
  /** Câte instanțe are (ștergerea cere confirmare când nu e goală). */
  readonly piese: number;
  readonly activa: boolean;
};


type Props = {
  readonly foi: readonly FoaieLista[];
  /** Rândurile foii active. */
  readonly randuri: readonly RandLista[];
  readonly onAlege: (id: string) => void;
  readonly onActiveaza: (foaie: string) => void;
  readonly actiuni: ActiuniFoi | null;
};

/** Tipul datelor tragerii unui rând de piesă (nu un fișier: importul nu-l ia drept al lui). */
const TRAGERE = 'application/x-cncvs2-instanta';

export function ListaVectori({ foi, randuri, onAlege, onActiveaza, actiuni }: Props) {
  const radacina = useRef<HTMLElement>(null);
  // Rândurile deschise sau închise de mână; celelalte urmează selecția.
  const [comutate, setComutate] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const comuta = (id: string, deschis: boolean): void => { setComutate((m) => new Map(m).set(id, deschis)); };
  const alese = randuri.filter((r) => r.selectat).map((r) => r.id).join(' ');
  // Meniul deschis: id-ul foii lui.
  const [meniu, setMeniu] = useState<string | null>(null);
  const [peste, setPeste] = useState<string | null>(null);

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
  const inchideMeniul = (): void => { setMeniu(null); };
  const peFoaie = (id: string) => ({
    onDragOver: (e: DragEvent<HTMLElement>): void => {
      if (!actiuni || !e.dataTransfer.types.includes(TRAGERE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setPeste(id);
    },
    onDragLeave: (): void => { setPeste((x) => (x === id ? null : x)); },
    onDrop: (e: DragEvent<HTMLElement>): void => {
      const instanta = e.dataTransfer.getData(TRAGERE);
      setPeste(null);
      if (!actiuni || !instanta) return;
      e.preventDefault();
      actiuni.muta(instanta, id);
    },
  });

  return (
    <aside ref={radacina} className="lista-vectori" aria-label={t('lista.titlu')} data-testid="lista-vectori">
      <h2>{t('lista.titlu')}</h2>
      {foi.map((f) => (
        <section key={f.id} className={peste === f.id ? 'foaie-lista peste' : 'foaie-lista'} data-foaie={f.id} data-activa={f.activa ? 'da' : 'nu'}
          // Rândurile sunt ale foii active: se trag doar pe altă foaie.
          {...(f.activa ? {} : peFoaie(f.id))}>
          <div className="foaie-cap">
            <button type="button" className="nod nod-foaie" data-nod="foaie" data-icona="arbore.foaie" aria-pressed={f.activa}
              onClick={() => { onActiveaza(f.id); }}
              // Clic dreapta pe foaie: meniul ei, ca butonul ⋯ (ADR 0210 §1).
              onContextMenu={actiuni ? (e) => { e.preventDefault(); setMeniu(f.id); } : undefined}>
              <span className="foaie-nume">{f.eticheta}</span>
              <span className="foaie-detalii">{f.detalii.map((d, k) => <Fragment key={k}>{k > 0 && ' · '}<span>{d}</span></Fragment>)}</span>
            </button>
            {actiuni && (
              <button type="button" className="foaie-meniu-buton" data-foaie-meniu={f.id} aria-haspopup="menu" aria-expanded={meniu === f.id}
                aria-label={t('lista.foaie-meniu')} title={t('lista.foaie-meniu')}
                onClick={() => { setMeniu((m) => (m === f.id ? null : f.id)); }}>⋯</button>
            )}
          </div>
          {actiuni && meniu === f.id && (
            <Suspense fallback={null}><MeniuFoaie foaie={f.id} piese={f.piese} actiuni={actiuni} inchide={inchideMeniul} /></Suspense>
          )}
          {!f.activa ? null : randuri.length === 0 ? (
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
                      draggable={actiuni !== null && foi.length > 1}
                      onDragStart={(e) => { e.dataTransfer.setData(TRAGERE, r.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onClick={() => { onAlege(r.id); }}
                      onKeyDown={(e) => { sageti(e, r.id, deschis); }}
                    >
                      {r.descriere}
                      {/* Spațiul e în text (numele butonului îl citește), nu doar în stil. */}
                      {r.legata ? <>{' '}<span className="legata">{r.legata}</span></> : null}
                    </button>
                    {deschis && <Suspense fallback={null}><NivelPiesa elemente={r.elemente} operatii={r.operatii} /></Suspense>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
      {actiuni && (
        <button type="button" className="foaie-noua" data-actiune="foaie.adauga" onClick={actiuni.adauga}>+ {t('actiune.foaie-adauga')}</button>
      )}
    </aside>
  );
}
