import { type ReactNode } from 'react';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';

/**
 * Fișa finisării reliefului în fereastra exportului (ADR 0312 §7, cererea sesiunii principale din 25.11): doar de citit. Rândul
 * stă în listă la locul lui în ordinea tăierii (se mută ca oricare altul în „A mea”), iar fișa spune ce taie programul: freza,
 * pasul lateral, creasta pe plan, liniile, marginea, înălțimea și adâncimea cea mai mare, cu nota că valorile se schimbă din
 * secțiunea Tăierea a panoului. Câmpurile editabile vin într-o felie a lor; aici nimic nu se scrie.
 */

/** Ce arată fereastra despre o finisare: valorile documentului, citite de cel care deschide fereastra (`ExportConectat`). */
export type FinisareExport = {
  /** Cheia rândului, ca la celelalte operații: `<piesă>/<operație>`. */
  readonly cheie: string;
  readonly descriere: string;
  /** Locul în ordinea de mână (ADR 0133), dacă documentul îl are. */
  readonly rang?: number;
  readonly scula: {
    readonly numar: number; readonly diametru: number; readonly forma: 'bila' | 'plata' | 'v';
    readonly unghi?: number; readonly varf?: number;
  };
  readonly pasLateral: number;
  /** Creasta lăsată pe un plan între două linii, pe hârtie; `null` când pasul lateral trece de diametru. */
  readonly creasta: number | null;
  readonly unghi: number;
  readonly aliniat: boolean;
  readonly margine: 'perete' | 'trece';
  /** Planul zero, în mm sub fața plăcii; lipsă = vârful reliefului la fața plăcii. */
  readonly planZero?: number;
  /** Podeaua: adâncimea cea mai mare la care coboară finisarea. */
  readonly adancime: number;
  readonly pas: number;
};

/** Forma frezei, în cuvinte. */
export function formaFinisareText(s: FinisareExport['scula'], f: (x: number) => string): string {
  return s.forma === 'bila' ? t('export.finisare.forma.bila') : s.forma === 'v' ? t('export.finisare.forma.v', { u: f(s.unghi ?? 0) })
    : t('export.finisare.forma.plata');
}

export function FisaFinisare({ fin, loc, total, f }: {
  readonly fin: FinisareExport; readonly loc: number; readonly total: number; readonly f: (x: number) => string;
}): ReactNode {
  const mm = (x: number): string => t('export.finisare.mm', { mm: f(x) });
  const rand = (eticheta: string, valoare: string, nume: string): ReactNode => (
    <div className="dx-citire-rand" key={nume} data-finisare={nume}><dt>{eticheta}</dt><dd>{valoare}</dd></div>
  );
  return (
    <section className="dx-fisa" data-fisa="op" data-operatie={fin.cheie} data-fel="finisare">
      <h3>{fin.descriere}</h3>
      <p className="dx-loc">{t('export.fisa.loc', { n: loc + 1, total })}</p>
      <div className="dx-grup">
        <div className="dx-stanga">
          <p className="dx-explicatie" data-testid="finisare-nota">{t('export.finisare.nota')}</p>
        </div>
        <div className="dx-campuri">
          <h4>{t('export.finisare.titlu')}</h4>
          <dl className="dx-citire">
            {rand(t('export.finisare.freza'), t('export.finisare.freza.valoare', {
              t: String(fin.scula.numar), d: f(fin.scula.diametru), forma: formaFinisareText(fin.scula, f),
            }), 'freza')}
            {rand(t('export.finisare.pas-lateral'), mm(fin.pasLateral), 'pas-lateral')}
            {rand(t('export.finisare.creasta'), fin.creasta === null ? t('export.finisare.creasta.prea-mare') : mm(fin.creasta), 'creasta')}
            {rand(t('export.finisare.linii'), t(fin.aliniat ? 'export.finisare.linii.aliniate' : 'export.finisare.linii.nealiniate', { u: f(fin.unghi) }), 'linii')}
            {rand(t('export.finisare.margine'), t(fin.margine === 'trece' ? 'export.finisare.margine.trece' : 'export.finisare.margine.perete'), 'margine')}
            {rand(t('export.finisare.z'), fin.planZero === undefined ? t('export.finisare.z.varf') : t('export.finisare.z.plan', { mm: f(fin.planZero) }), 'z')}
            {rand(t('export.finisare.adancime'), t('export.finisare.adancime.valoare', { mm: f(fin.adancime), pas: f(fin.pas) }), 'adancime')}
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * Rândul finisării în lista ferestrei (ADR 0312 §7): locul în ordine, cu mânerul și săgețile în „A mea” (ca la celelalte
 * rânduri), numele și, dedesubt, felul, freza și adâncimea. Mutarea, tragerea și alegerea fișei sunt ale ferestrei.
 */
export function RandListaFinisare({ fin, loc, total, mana, tras, curent, f, onMuta, onTrage, onDu }: {
  readonly fin: FinisareExport; readonly loc: number; readonly total: number; readonly mana: boolean; readonly tras: string | null;
  readonly curent: boolean; readonly f: (x: number) => string;
  readonly onMuta: (de: number, la: number) => void;
  /** Tragerea începe (cheia) sau se termină (null); lăsarea altui rând pe acesta îl mută aici. */
  readonly onTrage: (cheie: string | null) => void;
  readonly onDu: () => void;
}): ReactNode {
  const c = fin.cheie;
  return (
    <div className={tras === c ? 'dx-nav-op tras' : 'dx-nav-op'} data-nav-op={c} data-fel="finisare"
      onDragOver={mana && tras !== null ? (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } : undefined}
      onDrop={mana && tras !== null ? (ev) => { ev.preventDefault(); onMuta(-1, loc); onTrage(null); } : undefined}>
      <span className="ordine">
        {mana && (
          <button type="button" className="trage" draggable data-trage={c} aria-label={t('export.ordine.trage', { n: loc + 1 })}
            title={t('export.ordine.trage', { n: loc + 1 })}
            onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', c); ev.dataTransfer.effectAllowed = 'move'; onTrage(c); }}
            onDragEnd={() => { onTrage(null); }}>
            <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
              <circle cx="3" cy="3" r="1.4" /><circle cx="7" cy="3" r="1.4" /><circle cx="3" cy="8" r="1.4" />
              <circle cx="7" cy="8" r="1.4" /><circle cx="3" cy="13" r="1.4" /><circle cx="7" cy="13" r="1.4" />
            </svg>
          </button>
        )}
        <span className="loc" data-loc={loc + 1}>{loc + 1}</span>
        {mana && (
          <span className="sageti">
            <button type="button" data-sus={c} disabled={loc === 0} aria-label={t('export.ordine.sus', { n: loc + 1 })}
              title={t('export.ordine.sus', { n: loc + 1 })} onClick={() => { onMuta(loc, loc - 1); }}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 2.5 10.5 8.5H1.5Z" /></svg>
            </button>
            <button type="button" data-jos={c} disabled={loc === total - 1} aria-label={t('export.ordine.jos', { n: loc + 1 })}
              title={t('export.ordine.jos', { n: loc + 1 })} onClick={() => { onMuta(loc, loc + 1); }}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 9.5 1.5 3.5H10.5Z" /></svg>
            </button>
          </span>
        )}
      </span>
      <button type="button" className="dx-nav" data-nav={c} aria-current={curent} onClick={onDu}>
        <span className="dx-nume">{fin.descriere}</span>
        <span className="dx-meta">
          {t('export.finisare.lista')} · T{fin.scula.numar} Ø{f(fin.scula.diametru)} {formaFinisareText(fin.scula, f)} · {t('export.finisare.mm', { mm: f(fin.adancime) })}
        </span>
      </button>
    </div>
  );
}
