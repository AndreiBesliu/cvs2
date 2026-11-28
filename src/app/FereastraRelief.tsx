import { useEffect, useMemo, useRef, useState } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { dpiImagine } from '../io/imagine.ts';
import { reliefInBazin, ReliefAnulat } from '../jobs/bazinRelief.ts';
import type { CodRefuzRelief, OptiuniImagine, RaspunsRelief, ReliefDinImagine } from '../jobs/calculRelief.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { AlegereRezultat, type RezultatImagine } from '../ui/AlegereRezultat.tsx';
import { CampNumeric } from '../ui/CampNumeric.tsx';
import type { ImportPregatit } from '../ui/actiuniImport.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { FormaRelief } from '../model/document.ts';
import { cuStratNou } from '../model/straturiRelief.ts';
import { pregatitRelief } from './reliefImport.ts';

/** Alegerile implicite (ADR 0310 §7, §12): luminanța, alb = sus, 5 mm, baza 0, fără netezire. */
const IMPLICITE: OptiuniImagine = { sursa: 'l', albSus: true, inaltime: 5, baza: 0, sigma: 0 };
/** Cât se așteaptă după o schimbare înainte de calcul: un câmp scris cifră cu cifră nu pornește un calcul pe fiecare. */
const ASTEPTARE_MS = 250;

/** Alegerile ferestrei, ținute cât stă modulul încărcat (până la reîncărcarea paginii), ca la trasare. */
let tinute: OptiuniImagine = IMPLICITE;

const REFUZ: Readonly<Record<CodRefuzRelief, CheieSimpla>> = {
  'imagine-citire': 'import.relief.refuz.imagine-citire', 'prea-mare': 'import.relief.refuz.prea-mare', celula: 'import.relief.refuz.celula',
  gol: 'import.relief.refuz.gol', 'dale-lipsa': 'import.relief.refuz.altul', harta: 'import.relief.refuz.altul',
};

/**
 * Relieful ales pe foaie (ADR 0320, felia 18.1↑j): imaginea poate deveni un strat nou al lui, prin `document.forma` (starea și
 * rularea, pe forma nouă), în locul unei piese noi.
 */
export type TintaStrat = {
  readonly nume: string;
  readonly forma: FormaRelief;
  readonly stare: (f: FormaRelief) => RezultatActiune;
  readonly adauga: (f: FormaRelief) => RezultatActiune;
};

type Props = {
  readonly nume: string;
  readonly octeti: Uint8Array;
  /** Înapoi la vectori (trasarea). */
  readonly onAlege: (r: RezultatImagine) => void;
  /** Starea lui `document.importa` pentru importul pregătit (motivul refuzului: fila care doar citește, plafonul…). */
  readonly stareImporta: (p: ImportPregatit) => RezultatActiune;
  readonly importa: (p: ImportPregatit) => RezultatActiune;
  /** Importat: fișierul următor din coadă, ori închiderea. */
  readonly onImportat: () => void;
  readonly onInchide: () => void;
  readonly coada?: { readonly k: number; readonly n: number };
  readonly onSari?: () => void;
  readonly de?: string;
  /** O excepție (un defect, nu o imagine greșită): în jurnalul de erori. */
  readonly jurnal: (e: unknown) => void;
  /** Relieful ales, dacă e unul: „Un strat nou pe …” devine a doua alegere. */
  readonly tinta?: TintaStrat;
};

/**
 * Fereastra „Relief din imagine” (ADR 0310 §7, felia 18.1↑a): setările în stânga (sursa, sensul, înălțimea și baza, lățimea,
 * netezirea), relieful umbrit în dreapta, calculat în workerul reliefului din dalele cuantizate (ce se vede e ce se salvează).
 * „Importă” păstrează întâi dalele în baza reliefurilor, apoi adaugă piesa prin `document.importa`.
 */
export function FereastraRelief({ nume, octeti, onAlege, stareImporta, importa, onImportat, onInchide, coada, onSari, de, jurnal, tinta }: Props) {
  const limba = useLimba();
  const nr = (x: number, z = 3): string => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: z }).format(x);
  const [optiuni, setOptiuni] = useState<OptiuniImagine>(tinute);
  /**
   * Unde merge imaginea (ADR 0320): o piesă nouă (implicit, ca înainte) sau un strat nou pe relieful ales; strat doar cu un
   * relief ales.
   */
  const [unde, setUnde] = useState<'piesa' | 'strat'>('piesa');
  const pe = unde === 'strat' && tinta ? tinta.forma : null;
  /** Lățimea scrisă (mm); null: din DPI-ul fișierului (sau 96 px pe țol), ori, pe un strat, lățimea reliefului. */
  const [latime, setLatime] = useState<number | null>(null);
  const dpi = useMemo(() => dpiImagine(octeti) ?? 96, [octeti]);
  const [rez, setRez] = useState<RaspunsRelief | 'calcul'>('calcul');
  const [lucru, setLucru] = useState(false);
  const [motiv, setMotiv] = useState<CheieSimpla | null>(null);
  const panza = useRef<HTMLCanvasElement>(null);
  const cutie = useRef<HTMLDivElement>(null);
  useEffect(() => { cutie.current?.focus(); }, []);
  // Escape închide fereastra oriunde ar fi focusul (ca dialogul importului).
  const inchide = useRef(onInchide);
  inchide.current = onInchide;
  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => { if (e.key === 'Escape') inchide.current(); };
    document.addEventListener('keydown', tasta);
    return () => { document.removeEventListener('keydown', tasta); };
  }, []);

  const schimba = (s: Partial<OptiuniImagine>): void => {
    const o = { ...optiuni, ...s };
    tinute = o;
    setOptiuni(o);
  };

  // Calculul, după o scurtă așteptare; o schimbare nouă (sau închiderea) îl oprește pe cel vechi, cu workerul lui.
  useEffect(() => {
    const ac = new AbortController();
    setRez('calcul');
    const ceas = setTimeout(() => {
      const scara = latime !== null ? { latimeMm: latime } : pe ? { latimeMm: pe.nx * pe.celula } : { dpi };
      const grila = pe ? { pe: { nx: pe.nx, ny: pe.ny, celula: pe.celula } } : {};
      reliefInBazin({ tip: 'din-imagine', imagine: new Blob([octeti.slice()]), optiuni, scara, ...grila }, { semnal: ac.signal }).then((r) => {
        if (!ac.signal.aborted) setRez(r);
      }, (e: unknown) => {
        if (e instanceof ReliefAnulat || ac.signal.aborted) return;
        jurnal(e);
        setRez({ ok: false, cod: 'imagine-citire', detaliu: e instanceof Error ? e.message : String(e) });
      });
    }, ASTEPTARE_MS);
    return () => { clearTimeout(ceas); ac.abort(); };
  }, [octeti, optiuni, latime, dpi, pe]);

  const ok: ReliefDinImagine | null = rez !== 'calcul' && rez.ok && rez.tip === 'din-imagine' ? rez : null;
  const pregatit = useMemo(() => (ok && !pe ? pregatitRelief(ok, nume) : null), [ok, nume, pe]);
  // Pe un strat: forma nouă a reliefului ales, doar cu stratul făcut pe grila lui (altfel e încă cel de dinainte de alegere).
  const peGrila = ok !== null && pe !== null && ok.nx === pe.nx && ok.ny === pe.ny && ok.celula === pe.celula;
  const formaNoua = useMemo(() => (peGrila && pe ? cuStratNou(pe, { dale: ok.amprenta, nume }) : null), [peGrila, pe, ok, nume]);
  const stare = pregatit ? stareImporta(pregatit) : formaNoua && tinta ? tinta.stare(formaNoua) : peGrila ? { ok: false, motiv: 'import.relief.straturi-plin' } as const : null;
  const motivImport = stare && !stare.ok ? stare.motiv : null;

  // Relieful umbrit, pe pânza previzualizării (mărimea imaginii; CSS-ul o încape în loc).
  useEffect(() => {
    const c = panza.current;
    if (!c || !ok) return;
    c.width = ok.umbrit.latime;
    c.height = ok.umbrit.inaltime;
    c.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(ok.umbrit.rgba), ok.umbrit.latime, ok.umbrit.inaltime), 0, 0);
  }, [ok]);

  const importaAcum = (): void => {
    if (!ok || !(pregatit || (formaNoua && tinta)) || lucru || motivImport) return;
    setLucru(true);
    setMotiv(null);
    import('./reliefStocare.ts').then((m) => m.pastreazaStrat({ text: ok.harta, amprenta: ok.amprenta }, ok.octeti)).then(() => {
      const r = pregatit ? importa(pregatit) : formaNoua && tinta ? tinta.adauga(formaNoua) : { ok: false, motiv: 'import.relief.straturi-plin' } as const;
      setLucru(false);
      if (r.ok) onImportat();
      else setMotiv(r.motiv);
    }, (e: unknown) => {
      jurnal(e);
      setLucru(false);
      setMotiv('import.relief.nepastrat');
    });
  };

  const latimeMm = ok ? ok.nx * ok.celula : null;
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="import-titlu">
      <div className="dialog-cutie dialog-trasare" ref={cutie} tabIndex={-1} data-testid="relief-fereastra">
        <h2 id="import-titlu">
          {t('import.titlu', { nume })}
          {coada && <span data-testid="import-coada">{' '}{t('import.coada', { k: coada.k, n: coada.n })}</span>}
        </h2>
        {de !== undefined && <p className="mic" data-testid="import-de">{t('import.propus-de', { nume: de })}</p>}
        <div className="trasare-fereastra">
          <div className="trasare-corp">
            <div className="trasare-comenzi" data-testid="relief-setari">
              <AlegereRezultat ales="relief" onAlege={onAlege} dezactivat={lucru} />
              <p className="mic">{t('import.relief.sfat')}</p>
              {tinta && (
                <div className="segmentat" role="radiogroup" aria-label={t('import.relief.unde')}>
                  {(['piesa', 'strat'] as const).map((u) => (
                    <label key={u}>
                      <input type="radio" name="relief-unde" checked={unde === u} data-camp={`relief-unde-${u}`} disabled={lucru}
                        onChange={() => { setUnde(u); setLatime(null); }} />
                      {u === 'piesa' ? t('import.relief.unde.piesa') : t('import.relief.unde.strat', { nume: tinta.nume })}
                    </label>
                  ))}
                </div>
              )}
              <label>
                {t('import.relief.sursa')}
                <select value={optiuni.sursa} data-camp="relief-sursa" onChange={(e) => {
                  const v = e.target.value;
                  schimba({ sursa: v === 'r' || v === 'g' || v === 'b' ? v : 'l' });
                }}>
                  {(['l', 'r', 'g', 'b'] as const).map((s) => <option key={s} value={s}>{t(`import.relief.sursa.${s}`)}</option>)}
                </select>
              </label>
              <div className="segmentat" role="radiogroup" aria-label={t('import.relief.sens')}>
                {([true, false] as const).map((alb) => (
                  <label key={String(alb)}>
                    <input type="radio" name="relief-sens" checked={optiuni.albSus === alb} data-camp={alb ? 'relief-alb-sus' : 'relief-negru-sus'}
                      onChange={() => { schimba({ albSus: alb }); }} />
                    {t(alb ? 'import.relief.sens.alb' : 'import.relief.sens.negru')}
                  </label>
                ))}
              </div>
              <label className="rand">
                {t('import.relief.inaltime')}
                <CampNumeric eticheta={t('import.relief.inaltime')} valoare={optiuni.inaltime} unitate="mm" semn camp="relief-inaltime"
                  onAplica={(x) => (Math.abs(x) <= 1000 ? (schimba({ inaltime: x }), { ok: true }) : { ok: false, motiv: 'motiv.valoare-invalida' })} />
              </label>
              <label className="rand">
                {t('import.relief.baza')}
                <CampNumeric eticheta={t('import.relief.baza')} valoare={optiuni.baza} unitate="mm" semn camp="relief-baza"
                  onAplica={(x) => (Math.abs(x) <= 1000 ? (schimba({ baza: x }), { ok: true }) : { ok: false, motiv: 'motiv.valoare-invalida' })} />
              </label>
              <label className="rand">
                {t(pe ? 'import.relief.latime.strat' : 'import.relief.latime')}
                <CampNumeric eticheta={t(pe ? 'import.relief.latime.strat' : 'import.relief.latime')} valoare={latime ?? (latimeMm === null ? null : Math.round(latimeMm * 1000) / 1000)} unitate="mm" camp="relief-latime"
                  onAplica={(x) => (x > 0 ? (setLatime(x), { ok: true }) : { ok: false, motiv: 'motiv.valoare-invalida' })} />
              </label>
              <label className="rand">
                {t('import.relief.netezire')}
                <CampNumeric eticheta={t('import.relief.netezire')} valoare={optiuni.sigma} unitate="" camp="relief-netezire"
                  onAplica={(x) => (x >= 0 && x <= 100 ? (schimba({ sigma: x }), { ok: true }) : { ok: false, motiv: 'motiv.valoare-invalida' })} />
              </label>
              <p className="mic">{t('import.relief.netezire.sfat')}</p>
            </div>
            <div className="trasare-previz">
              <div className="trasare-panza-loc">
                <canvas ref={panza} className="trasare-panza relief-previz" role="img" aria-label={t('import.relief.previzualizare')} data-testid="relief-previz"
                  hidden={!ok} />
              </div>
            </div>
          </div>
          <div className="trasare-picior">
            <div aria-live="polite">
              {rez === 'calcul' && <p role="status" data-testid="relief-calcul">{t('import.relief.calcul')}</p>}
              {ok && (
                <>
                  <p data-testid="relief-grila">
                    {t(pe && tinta ? 'import.relief.grila.strat' : 'import.relief.grila', {
                      nx: ok.nx, ny: ok.ny, celula: nr(ok.celula, 4), latime: nr(ok.nx * ok.celula, 2), inaltime: nr(ok.ny * ok.celula, 2), nume: tinta?.nume ?? '',
                    })}
                  </p>
                  {ok.z && <p data-testid="relief-z">{t('import.relief.z', { min: nr(ok.z.min), max: nr(ok.z.max) })}</p>}
                </>
              )}
              {rez !== 'calcul' && !rez.ok && (
                <p role="alert" className="avertisment" data-testid="relief-refuz">{t(REFUZ[rez.cod], { marime: rez.detaliu ?? '?' })}</p>
              )}
              {motivImport && <p role="status" className="avertisment" data-testid="import-motiv">{t(motivImport)}</p>}
              {motiv && <p role="alert" className="avertisment" data-testid="relief-motiv">{t(motiv)}</p>}
              {lucru && <p role="status" data-testid="relief-lucru">{t('import.relief.lucru')}</p>}
            </div>
            <div className="trasare-actiuni">
              <div className="butoane">
                <button type="button" data-buton="importa" disabled={!ok || lucru || motivImport !== null} title={motivImport ? t(motivImport) : undefined}
                  onClick={(e) => { if (e.detail <= 1) importaAcum(); }}>
                  {t('import.importa')}
                </button>
                {coada && onSari && <button type="button" data-buton="sari" onClick={(e) => { if (e.detail <= 1) onSari(); }}>{t('import.sari')}</button>}
                <button type="button" data-buton="renunta" onClick={onInchide}>{t(coada ? 'import.renunta-toate' : 'import.renunta')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
