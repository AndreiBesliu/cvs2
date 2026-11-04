import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Vedere } from '../canvas/protocol.ts';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { Document } from '../model/document.ts';
import { instantaDin } from '../model/lume.ts';
import type { Problema, RezultatVerificare } from '../model/verificare.ts';
import { PRAG_BUCLA, TOLERANTA_MAXIMA, TOLERANTA_MINIMA, TOLERANTA_VERIFICARE } from '../model/verificareLimite.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import './verificare.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Verificarea vectorilor (ADR 0124 §7, felia 10.1↑), adusă la cerere din extensia barei: toleranța, pragul buclei mici,
 * „doar formele alese”, lista problemelor pe feluri; pe pânză, locul fiecăreia (roșu în aceeași formă, verde între forme).
 * Calculul e al workerului CAM, cerut prin bucata calculului exportului; cât panoul e deschis, o schimbare a documentului îl
 * reface (după 300 ms). Un clic pe un rând alege instanțele formelor problemei și o scoate în față pe pânză. Nimic nu se
 * schimbă în document.
 */

/** Ce arată pânza: rezultatul și rândul ales (indicele în `probleme`). */
export type StareVerificare = { readonly rezultat: RezultatVerificare | 'calcul' | 'eroare'; readonly aleasa: number | null };

const FELURI: ReadonlyArray<Problema['fel']> = ['duplicat', 'intersectie', 'autointersectie', 'noduri', 'deschis'];
/** Câte rânduri arată un fel; restul se spun printr-un număr. */
const RANDURI_PE_FEL = 200;
const ASTEPTARE_MS = 300;

/** Un număr rotunjit la `zecimale`, cu virgulă în română (ca dialogul exportului). */
const numar = (x: number, zecimale: number, virgula: boolean): string => textNumar(Math.round(x * 10 ** zecimale) / 10 ** zecimale, virgula);
const lungime = (p: Problema): number => (p.puncte.length === 2 ? Math.hypot(p.puncte[1].x - p.puncte[0].x, p.puncte[1].y - p.puncte[0].y) : 0);

/** Textul rândului unei probleme; `prag` e pragul buclei mici, în procente. */
function textProblema(p: Problema, prag: number, virgula: boolean): string {
  const mm = (x: number): string => numar(x, 4, virgula);
  switch (p.fel) {
    case 'duplicat':
      return t('editare.verificare.rand.duplicat', { n: String(p.elemente.length) });
    case 'intersectie':
      return p.puncte.length === 2 ? t('editare.verificare.rand.suprapunere', { mm: mm(lungime(p)) }) : t('editare.verificare.rand.intersectie');
    case 'autointersectie': {
      if (p.puncte.length === 2) return t('editare.verificare.rand.suprapunere-singura', { mm: mm(lungime(p)) });
      const b = p.bucla;
      if (!b) return t('editare.verificare.rand.autointersectie');
      const arie = numar(b.arie, 3, virgula);
      if (b.procent === null) return t('editare.verificare.rand.bucla-deschisa', { arie });
      const procent = numar(b.procent, 2, virgula);
      return t(b.procent < prag ? 'editare.verificare.rand.bucla-mica' : 'editare.verificare.rand.bucla', { arie, procent });
    }
    case 'noduri':
      return t(p.elemente.length === 1 ? 'editare.verificare.rand.noduri' : p.capete ? 'editare.verificare.rand.capete' : 'editare.verificare.rand.noduri-intre', { mm: mm(p.distanta) });
    case 'deschis':
      return t('editare.verificare.rand.deschis', { mm: mm(p.distanta) });
  }
}

export function PanouVerificare({ doc, selectie, stare, onStare, onAlege, onInchide }: {
  readonly doc: Document;
  /** Selecția aplicației: id-urile instanțelor. */
  readonly selectie: readonly string[];
  readonly stare: StareVerificare | null;
  readonly onStare: (s: StareVerificare) => void;
  /** Alege instanțele formelor unei probleme (selecția e pe instanțe). */
  readonly onAlege: (alese: readonly string[]) => void;
  readonly onInchide: () => void;
}): ReactElement {
  const virgula = useLimba() === 'ro';
  const [textToleranta, setTextToleranta] = useState(() => textNumar(TOLERANTA_VERIFICARE, virgula));
  const [textPrag, setTextPrag] = useState(() => textNumar(PRAG_BUCLA, virgula));
  // Formele alese la bifă: un clic pe un rând schimbă selecția, dar nu și ce se verifică.
  const [alese, setAlese] = useState<readonly string[] | null>(null);
  const toleranta = citesteNumar(textToleranta);
  const tolerantaBuna = toleranta !== null && toleranta >= TOLERANTA_MINIMA && toleranta <= TOLERANTA_MAXIMA ? toleranta : null;
  const prag = citesteNumar(textPrag);
  const pragBun = prag !== null && prag <= 100 ? prag : null;
  const prima = useRef(true);

  useEffect(() => {
    if (tolerantaBuna === null) return undefined;
    const semnal = new AbortController();
    // Calculul trece prin bucata calculului exportului (ca vederea 3D): bazinul CAM stă doar acolo. Un eșec care nu e o
    // anulare (workerul căzut, o excepție a verificării) e o defecțiune: merge în jurnal.
    const cade = (e: unknown): void => {
      if (semnal.signal.aborted) return;
      reportError(new Error(`verificarea vectorilor: ${e instanceof Error ? e.message : String(e)}`));
      onStare({ rezultat: 'eroare', aleasa: null });
    };
    const porneste = (): void => {
      onStare({ rezultat: 'calcul', aleasa: null });
      import('../ui/actiuniExportCalcul.ts').then((calc) => {
        if (semnal.signal.aborted) return;
        calc.verificaVectorii(doc, { toleranta: tolerantaBuna, alese }, semnal.signal).then(
          (r) => { if (!semnal.signal.aborted) onStare({ rezultat: r, aleasa: null }); },
          (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); },
        );
      }, cade);
    };
    // La deschidere, imediat; după o schimbare a documentului sau a toleranței, după o pauză.
    const ceas = setTimeout(porneste, prima.current ? 0 : ASTEPTARE_MS);
    prima.current = false;
    return () => { clearTimeout(ceas); semnal.abort(); };
  }, [doc, tolerantaBuna, alese, onStare]);

  const r = stare?.rezultat;
  const gata = r && typeof r !== 'string' && r.ok ? r : null;
  const grupe = useMemo(() => {
    if (!gata) return [];
    return FELURI.map((fel) => ({ fel, randuri: gata.probleme.flatMap((p, k) => (p.fel === fel ? [{ p, k }] : [])) })).filter((g) => g.randuri.length > 0);
  }, [gata]);

  const stareRea = tolerantaBuna === null || pragBun === null || r === 'eroare' || (r !== undefined && typeof r !== 'string' && !r.ok);
  const stareText = tolerantaBuna === null ? t('editare.verificare.motiv.toleranta')
    : pragBun === null ? t('editare.verificare.motiv.prag')
      : r === undefined || r === 'calcul' ? t('editare.verificare.calcul')
        : r === 'eroare' ? t('editare.verificare.eroare')
          : !r.ok ? t('editare.verificare.motiv.toleranta')
            : r.probleme.length === 0 ? t('editare.verificare.nimic', { n: String(r.forme) })
              : t('editare.verificare.gasite', { n: String(r.probleme.length), forme: String(r.forme) });

  return (
    <>
      <div className="campuri-retea">
        <label className="camp-retea" title={t('editare.verificare.toleranta.titlu')}>
          <span>{t('editare.verificare.toleranta')}</span>
          <input value={textToleranta} inputMode="decimal" data-verificare="toleranta" onChange={(e) => { setTextToleranta(e.target.value); }} />
        </label>
        <label className="camp-retea" title={t('editare.verificare.prag.titlu')}>
          <span>{t('editare.verificare.prag')}</span>
          <input value={textPrag} inputMode="decimal" data-verificare="prag" onChange={(e) => { setTextPrag(e.target.value); }} />
        </label>
      </div>
      <label className="bifa-verificare">
        <input type="checkbox" checked={alese !== null} disabled={alese === null && selectie.length === 0} data-verificare="alese"
          onChange={(e) => { setAlese(e.target.checked ? [...selectie] : null); }} />
        <span>{t('editare.verificare.alese', { n: String((alese ?? selectie).length) })}</span>
      </label>
      <p className={stareRea ? 'motiv-retea' : 'stare-verificare'} role="status" data-testid="verificare-stare">{stareText}</p>
      {gata && gata.neverificate > 0 ? <p className="motiv-retea" data-testid="verificare-neverificate">{t('editare.verificare.neverificate', { n: String(gata.neverificate) })}</p> : null}
      {gata?.oprit ? <p className="motiv-retea" data-testid="verificare-oprit">{t('editare.verificare.oprit')}</p> : null}
      {grupe.length > 0 ? (
        <>
          <p className="legenda-verificare">
            <span className="punct-verificare in-forma" aria-hidden="true" />{t('editare.verificare.legenda.forma')}
            <span className="punct-verificare intre-forme" aria-hidden="true" />{t('editare.verificare.legenda.intre')}
          </p>
          <div className="lista-verificare" data-testid="verificare-lista">
            {grupe.map((g) => (
              <section key={g.fel} data-fel={g.fel}>
                <h3>{t(`editare.verificare.fel.${g.fel}`, { n: String(g.randuri.length) })}</h3>
                <ul>
                  {g.randuri.slice(0, RANDURI_PE_FEL).map(({ p, k }) => (
                    <li key={k}>
                      <button type="button" aria-pressed={stare?.aleasa === k} data-problema={k} data-fel={p.fel}
                        onClick={() => { onStare({ rezultat: gata as RezultatVerificare, aleasa: k }); onAlege([...new Set(p.elemente.map(instantaDin))]); }}>
                        <span className={`punct-verificare ${p.elemente.length > 1 ? 'intre-forme' : 'in-forma'}`} aria-hidden="true" />
                        {textProblema(p, pragBun ?? PRAG_BUCLA, virgula)}
                      </button>
                    </li>
                  ))}
                </ul>
                {g.randuri.length > RANDURI_PE_FEL ? <p className="motiv-retea">{t('editare.verificare.inca', { n: String(g.randuri.length - RANDURI_PE_FEL) })}</p> : null}
              </section>
            ))}
          </div>
        </>
      ) : null}
      <div className="butoane-retea">
        <button type="button" data-verificare="inchide" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </>
  );
}

/**
 * Locurile problemelor pe pânză, cât panoul e deschis: un cerc de mărime fixă pe ecran (o problemă de 0,005 mm se vede la
 * orice apropiere), o linie pentru o suprapunere, una punctată între capetele unei căi deschise; roșu în aceeași formă,
 * verde între forme; rândul ales, mai mare.
 */
export function MarcajeVerificare({ stare, vedere, marime }: {
  readonly stare: StareVerificare | null;
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
}): ReactElement | null {
  const r = stare?.rezultat;
  if (!r || typeof r === 'string' || !r.ok || r.probleme.length === 0) return null;
  const x = (p: { readonly x: number }): number => vedere.tx + p.x * vedere.scara;
  const y = (p: { readonly y: number }): number => vedere.ty - p.y * vedere.scara;
  return (
    <svg className="rigle-desen marcaje-verificare" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="verificare-marcaje"
      data-numar={r.probleme.length}>
      {r.probleme.map((p, k) => {
        const aleasa = stare?.aleasa === k;
        const clasa = `${p.elemente.length > 1 ? 'intre-forme' : 'in-forma'}${aleasa ? ' aleasa' : ''}`;
        const raza = aleasa ? 11 : 7;
        const [a, b] = [p.puncte[0], p.puncte[1]];
        const departe = b !== undefined && Math.hypot(x(b) - x(a), y(b) - y(a)) > 2 * raza;
        return (
          <g key={k} className={clasa} data-problema={k} data-fel={p.fel}>
            {b !== undefined && departe ? (
              <>
                <line className={p.fel === 'deschis' ? 'gol' : 'bucata'} x1={x(a)} y1={y(a)} x2={x(b)} y2={y(b)} />
                <circle cx={x(a)} cy={y(a)} r={raza} />
                <circle cx={x(b)} cy={y(b)} r={raza} />
              </>
            ) : (
              <circle cx={b !== undefined ? (x(a) + x(b)) / 2 : x(a)} cy={b !== undefined ? (y(a) + y(b)) / 2 : y(a)} r={raza} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
