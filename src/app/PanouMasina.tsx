/**
 * Panoul mașinii (ADR 0081, felia 3.6b): conexiunea (portul Web Serial; pe instanța de test și mașina simulată), starea din
 * rapoarte, programul (ultimul export, exact octeții lui, sau un fișier străin, verificat), lucrarea (faza, linia, erorile) cu
 * butoanele ei, comenzile manuale și jurnalul. Sesiunea (`src/machine/sesiune.ts`) e una pe pagină: rămâne conectată și cu
 * panoul strâns. Tot ce trimite la mașină trece prin fluxul senderului (ADR 0080); panoul doar arată și cere.
 *
 * Poziționarea (ADR 0082, felia 3.7a): jog-ul (pași de 0,1–100 mm, diagonalele într-o singură mișcare), WCS-ul activ (G54–G59),
 * zero-ul XY / Z și palparea Z cu placa de contact. Zero-ul și palparea se scriu în WCS-ul programului încărcat (altfel în cel
 * activ), cu numele lui pe buton; nepotrivirea cu WCS-ul activ se spune; lângă zero stă Z0-ul declarat de program (lecțiile
 * ediției întâi). Un buton care nu se poate folosi acum e dezactivat, cu motivul alături.
 */
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import '../i18n/masina.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { PALPARE_IMPLICITA, WCS, esteWcs, type AxaJog, type FelMiscare, type Wcs } from '../machine/proceduri.ts';
import { incarcaProgram, montajDeclarat, type RezultatIncarcare } from '../machine/program.ts';
import { pozitieDeLucru } from '../machine/raspunsuri.ts';
import { deschideSerial, serialDisponibil } from '../machine/serial.ts';
import { SesiuneMasina, type Ceas, type LinieJurnal, type Procedura, type StareSesiune } from '../machine/sesiune.ts';
import { useLimba } from '../ui/useLimba.ts';
import './masina.css';

/** Programul ultimului export (octeții exacți și amprenta lor), dat de carcasă. */
export type ExportPentruMasina = { readonly octeti: Uint8Array; readonly sha256: string; readonly nume: string };

const CEAS: Ceas = {
  setInterval: (f, ms) => window.setInterval(f, ms),
  clearInterval: (id) => { window.clearInterval(id as number); },
  setTimeout: (f, ms) => window.setTimeout(f, ms),
};
let comuna: SesiuneMasina | null = null;
/** Sesiunea paginii: una singură, creată la prima deschidere a panoului. */
function sesiunea(): SesiuneMasina {
  comuna ??= new SesiuneMasina(CEAS);
  return comuna;
}

const AXE = ['X', 'Y', 'Z', 'A', 'B', 'C'];
const VITEZE = [1, 10, 100] as const;
const IN_FLUX = new Set(['trimite', 'golire', 'terminare']);
const PASI_JOG = [0.1, 1, 10, 100] as const;
/** Butoanele jog-ului, pe o grilă 4 × 3: XY cu diagonalele (o singură mișcare), Z în dreapta; null e o celulă goală. */
const DIRECTII: readonly ({ readonly id: string; readonly simbol: string; readonly d: Partial<Record<AxaJog, number>> } | null)[] = [
  { id: 'X-Y+', simbol: '↖', d: { X: -1, Y: 1 } }, { id: 'Y+', simbol: '↑', d: { Y: 1 } }, { id: 'X+Y+', simbol: '↗', d: { X: 1, Y: 1 } }, { id: 'Z+', simbol: 'Z+', d: { Z: 1 } },
  { id: 'X-', simbol: '←', d: { X: -1 } }, null, { id: 'X+', simbol: '→', d: { X: 1 } }, null,
  { id: 'X-Y-', simbol: '↙', d: { X: -1, Y: -1 } }, { id: 'Y-', simbol: '↓', d: { Y: -1 } }, { id: 'X+Y-', simbol: '↘', d: { X: 1, Y: -1 } }, { id: 'Z-', simbol: 'Z−', d: { Z: -1 } },
];

type Refuz = Extract<RezultatIncarcare, { ok: false }>;
/** Motivul portului închis: gol (închis de dispozitiv) sau un cod al nostru se traduc; altfel, textul browserului. */
const textMotiv = (m: string): string => (m === '' ? t('masina.motiv.inchis') : m === 'fara-web-serial' || m === 'port-fara-scriere' ? t(`masina.motiv.${m}`) : m);
/** O linie a jurnalului: ce spune sesiunea (un cod) în limba omului; restul, cum l-a trimis controlerul. */
const textJurnal = (l: LinieJurnal): string => {
  if (l.cod === undefined) return l.fel === 'trimis' ? `> ${l.text}` : l.text;
  if (l.cod === 'port-inchis') return t('masina.eroare', { motiv: textMotiv(l.motiv ?? '') });
  if (l.cod === 'miscare') return t('masina.jurnal.miscare', { motiv: t(`masina.miscare.${l.motiv ?? 'ocupata'}` as CheieSimpla) });
  return t(`masina.jurnal.${l.cod}` as CheieSimpla);
};
/** Ce a făcut ultima procedură (zero, WCS, palparea), în limba omului; gol când nu e nimic de spus. */
function textProcedura(p: Procedura): string {
  if (p.fel !== 'palpare') {
    if (p.rezultat === 'pierdut') return t('masina.procedura.pierdut');
    if (typeof p.rezultat === 'number') return p.fel === 'zero' ? t('masina.zero.eroare', { cod: p.rezultat }) : t('masina.wcs.eroare', { wcs: p.wcs, cod: p.rezultat });
    if (p.fel === 'wcs') return '';
    return p.rezultat === 'ok' ? t('masina.zero.ok', { axe: p.axe.join(''), wcs: p.wcs }) : t('masina.zero.in-curs');
  }
  const s = p.stare;
  if (s.pas === 'gata') return t('masina.palpare.gata', { wcs: s.p.wcs, z: (s.zAtingere ?? 0).toFixed(3), grosime: s.p.grosime });
  if (s.pas === 'esuat') return t(`masina.palpare.esuat.${s.motiv ?? 'intrerupt'}` as CheieSimpla, { cod: s.cod ?? '' });
  return t(`masina.palpare.pas.${s.pas}` as CheieSimpla);
}
const numar = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.replace(',', '.')));
const textRefuz = (r: Refuz): string => {
  const cod = r.cod === 'fara-wcs' && r.linie !== null ? 'fara-wcs-linie' : r.cod;
  return t(`masina.refuz.${cod}` as CheieSimpla, { linie: (r.linie ?? 0) + 1 });
};

export function PanouMasina({ ultimulExport, simulare }: {
  readonly ultimulExport: ExportPentruMasina | null;
  /** Mașina simulată se oferă (în afara instanței live). */
  readonly simulare: boolean;
}): ReactNode {
  useLimba();
  const s = sesiunea();
  const st = useSyncExternalStore((f) => s.aboneaza(f), () => s.stare());
  const [nume, setNume] = useState<string | null>(null);
  const [refuz, setRefuz] = useState<string | null>(null);
  const [viteza, setViteza] = useState<(typeof VITEZE)[number]>(10);
  const vitezaRef = useRef(viteza);
  vitezaRef.current = viteza;
  const [comanda, setComanda] = useState('');
  const fisier = useRef<HTMLInputElement | null>(null);
  const idComanda = useRef(0);

  const f = st.flux;
  const conectat = st.conexiune === 'conectat';
  const r = f.raport;
  const lucru = r ? pozitieDeLucru(r, f.wco) : null;
  const poz = lucru ?? r?.pozitie ?? null;
  const n = f.program?.linii.length ?? 0;

  const incarca = async (octeti: Uint8Array, sursa: 'export' | 'fisier', numeNou: string, sha256?: string): Promise<void> => {
    const rez = await incarcaProgram(octeti, { sursa, ...(sha256 ? { sha256 } : {}) });
    if (!rez.ok) { setRefuz(textRefuz(rez)); return; }
    setRefuz(null);
    setNume(numeNou);
    s.eveniment({ tip: 'incarca', program: rez.program });
  };
  const conecteazaSerial = async (): Promise<void> => {
    try {
      await s.conecteaza(await deschideSerial());
    } catch (e) {
      // Omul a închis fereastra de alegere: nimic de spus.
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) setRefuz(textMotiv(e instanceof Error ? e.message : String(e)));
    }
  };
  const conecteazaSimulata = async (): Promise<void> => {
    const m = await import('../machine/MasinaSimulata.ts');
    await s.conecteaza(m.deschideSimulata({ ceas: CEAS, viteza: () => vitezaRef.current }));
  };
  const trimiteComanda = (): void => {
    const text = comanda.trim();
    if (!text) return;
    s.eveniment({ tip: 'manual', id: `om-${++idComanda.current}`, text });
    setComanda('');
  };

  const faza = f.faza === 'bariera' && f.bariera
    ? t(f.bariera.m6 ? 'masina.faza.bariera.scula' : 'masina.faza.bariera', { linie: f.bariera.linie + 1 })
    : f.faza === 'pierdut' ? t('masina.faza.pierdut', { motiv: f.motiv ?? '' }) : t(`masina.faza.${f.faza}` as CheieSimpla);
  const inHold = r?.stare === 'Hold';

  return (
    <div className="masina">
      <h2>{t('vedere.masina')}</h2>

      <section aria-label={t('masina.conexiune')}>
        <p className="masina-cap" data-testid="masina-conexiune">
          {conectat ? t(st.transport === 'simulat' ? 'masina.conectat.simulat' : 'masina.conectat.serial') : t('masina.deconectat')}
        </p>
        {st.eroare !== null && <p className="masina-nota" role="status">{t('masina.eroare', { motiv: textMotiv(st.eroare) })}</p>}
        <div className="masina-butoane">
          {!conectat && (serialDisponibil()
            ? <button type="button" data-masina="conecteaza" title={t('masina.conecteaza.titlu')} onClick={() => { void conecteazaSerial(); }}>{t('masina.conecteaza')}</button>
            : <p className="masina-nota">{t('masina.fara-serial')}</p>)}
          {!conectat && simulare && (
            <button type="button" data-masina="simulata" title={t('masina.simulata.titlu')} onClick={() => { void conecteazaSimulata(); }}>{t('masina.simulata')}</button>
          )}
          {conectat && <button type="button" data-masina="deconecteaza" onClick={() => { void s.deconecteaza(); }}>{t('masina.deconecteaza')}</button>}
        </div>
        {simulare && (
          <label className="masina-camp">
            <span>{t('masina.viteza')}</span>
            <select value={viteza} data-masina="viteza" onChange={(e) => { setViteza(Number(e.target.value) as (typeof VITEZE)[number]); }}>
              {VITEZE.map((v) => <option key={v} value={v}>{`${v}×`}</option>)}
            </select>
          </label>
        )}
      </section>

      <section aria-label={t('masina.stare')}>
        <dl>
          <div className="masina-rand"><dt>{t('masina.stare')}</dt><dd data-testid="masina-stare">
            {r ? `${r.stare}${r.sub !== null ? `:${r.sub}` : ''}` : t('masina.stare.necunoscuta')}
          </dd></div>
          {poz && (
            <div className="masina-rand"><dt>{t(poz.cadru === 'lucru' ? 'masina.pozitie.lucru' : 'masina.pozitie.masina')}</dt><dd data-testid="masina-pozitie">
              {poz.valori.map((v, k) => `${AXE[k] ?? `#${k}`} ${v.toFixed(3)}`).join('  ')}
            </dd></div>
          )}
        </dl>
      </section>

      {conectat && <Pozitionare s={s} st={st} />}

      <section aria-label={t('masina.program')}>
        <div className="masina-butoane">
          <button type="button" data-masina="export" disabled={!ultimulExport || IN_FLUX.has(f.faza)}
            title={ultimulExport ? t('masina.program.export.titlu') : t('masina.program.export.lipsa')}
            onClick={() => { if (ultimulExport) void incarca(ultimulExport.octeti, 'export', ultimulExport.nume, ultimulExport.sha256); }}>
            {t('masina.program.export')}
          </button>
          <button type="button" data-masina="fisier" disabled={IN_FLUX.has(f.faza)} title={t('masina.program.fisier.titlu')} onClick={() => fisier.current?.click()}>
            {t('masina.program.fisier')}
          </button>
          <input ref={fisier} type="file" accept=".nc,.gcode,.ngc,.tap,.txt" hidden data-masina="fisier-ales"
            onChange={(e) => {
              const fis = e.target.files?.[0];
              e.target.value = '';
              if (fis) void fis.arrayBuffer().then((b) => incarca(new Uint8Array(b), 'fisier', fis.name));
            }} />
        </div>
        {refuz && <p className="masina-nota" role="alert" data-testid="masina-refuz">{refuz}</p>}
        <p className="masina-program" data-testid="masina-program">
          {f.program ? <>
            <strong>{nume ?? '—'}</strong>{' · '}{t('masina.program.linii', { n })}<br />
            <span className="masina-sha" title={f.program.sha256} data-sha={f.program.sha256}>SHA-256 {f.program.sha256.slice(0, 16)}…</span>
          </> : t('masina.program.niciunul')}
        </p>
      </section>

      <section aria-label={t('masina.faza')}>
        <p className="masina-cap" data-testid="masina-faza" data-faza={f.faza}>{faza}</p>
        {f.program && (
          <div className="masina-progres">
            <progress max={n} value={Math.min(f.urm, n)} />
            <span data-testid="masina-progres">{t('masina.progres', { urm: Math.min(f.urm, n), n })}</span>
          </div>
        )}
        {f.erori.length > 0 && (
          <ul className="masina-erori" aria-label={t('masina.erori')} data-testid="masina-erori">
            {f.erori.map((e, k) => <li key={k}>{t('masina.eroare.linie', { linie: e.linie + 1, cod: e.cod })}</li>)}
          </ul>
        )}
        <div className="masina-butoane">
          <button type="button" className="principal" data-masina="start"
            disabled={!conectat || !f.program || !['pregatit', 'terminat', 'pierdut'].includes(f.faza) || f.inZbor.length > 0}
            onClick={() => { s.eveniment({ tip: 'start' }); }}>{t('masina.start')}</button>
          {f.faza === 'suspendat' && <button type="button" className="principal" data-masina="reia" onClick={() => { s.eveniment({ tip: 'reia' }); }}>{t('masina.reia')}</button>}
          {f.faza === 'bariera' && <button type="button" className="principal" data-masina="continua" onClick={() => { s.eveniment({ tip: 'continua' }); }}>{t('masina.continua')}</button>}
          {conectat && f.faza !== 'suspendat' && (inHold
            ? <button type="button" data-masina="eliberare" onClick={() => { s.eveniment({ tip: 'eliberare' }); }}>{t('masina.eliberare')}</button>
            : <button type="button" data-masina="pauza" onClick={() => { s.eveniment({ tip: 'hold' }); }}>{t('masina.pauza')}</button>)}
          {conectat && <button type="button" className="masina-opreste" data-masina="opreste" title={t('masina.opreste.titlu')} onClick={() => { s.eveniment({ tip: 'opreste' }); }}>{t('masina.opreste')}</button>}
          {conectat && r?.stare === 'Alarm' && (
            <button type="button" data-masina="deblocheaza" onClick={() => { s.eveniment({ tip: 'manual', id: `om-${++idComanda.current}`, text: '$X' }); }}>{t('masina.deblocheaza')}</button>
          )}
        </div>
      </section>

      <section aria-label={t('masina.comanda')}>
        <form className="masina-comanda" onSubmit={(e) => { e.preventDefault(); trimiteComanda(); }}>
          <input value={comanda} data-masina="comanda" aria-label={t('masina.comanda')} placeholder="$G" disabled={!conectat}
            onChange={(e) => { setComanda(e.target.value); }} />
          <button type="submit" data-masina="trimite" disabled={!conectat || comanda.trim() === ''}>{t('masina.comanda.trimite')}</button>
        </form>
        <ol className="masina-jurnal" aria-label={t('masina.jurnal')} data-testid="masina-jurnal">
          {st.jurnal.slice(-60).map((l, k) => <li key={k} data-fel={l.fel}>{textJurnal(l)}</li>)}
        </ol>
      </section>
    </div>
  );
}

/** Jog-ul, WCS-ul, zero-ul și palparea Z (ADR 0082); doar cu mașina conectată. */
function Pozitionare({ s, st }: { readonly s: SesiuneMasina; readonly st: StareSesiune }): ReactNode {
  const [pas, setPas] = useState<(typeof PASI_JOG)[number]>(1);
  const [avans, setAvans] = useState('1000');
  const [grosime, setGrosime] = useState(String(PALPARE_IMPLICITA.grosime));
  const [distanta, setDistanta] = useState(String(PALPARE_IMPLICITA.distanta));
  const [avansPalpare, setAvansPalpare] = useState(String(PALPARE_IMPLICITA.avans));
  const f = st.flux;
  const motiv = (fel: FelMiscare): string | null => { const m = s.motiv(fel); return m === null ? null : t(`masina.miscare.${m}` as CheieSimpla); };
  // Zero-ul și palparea merg în WCS-ul programului (cel în care va tăia), altfel în cel activ.
  const wcsProgram = f.program && esteWcs(f.program.wcs) ? f.program.wcs : null;
  const tinta: Wcs | null = wcsProgram ?? st.wcsActiv;
  const montaj = f.program ? montajDeclarat(f.program) : null;
  const mJog = motiv('jog');
  const mZero = motiv('zero-z') ?? (tinta === null ? t('masina.wcs.necitit') : null);
  const mXy = motiv('zero-xy');
  const mWcs = motiv('wcs');
  const proc = st.procedura ? textProcedura(st.procedura) : '';
  const nr = numar(avans);

  return (
    <section aria-label={t('masina.pozitionare')} className="masina-pozitionare">
      <label className="masina-camp">
        <span>{t('masina.wcs')}</span>
        <select value={st.wcsActiv ?? ''} data-masina="wcs" title={mWcs ?? t('masina.wcs.titlu')} disabled={mWcs !== null}
          onChange={(e) => { const w = e.target.value; if (esteWcs(w)) s.alegeWcs(w); }}>
          {st.wcsActiv === null && <option value="">{t('masina.wcs.necitit')}</option>}
          {WCS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      {wcsProgram && st.wcsActiv && wcsProgram !== st.wcsActiv && (
        <div className="masina-nota masina-wcs-nepotrivit" role="status" data-testid="masina-wcs-nepotrivit">
          {t('masina.wcs.nepotrivit', { program: wcsProgram, activ: st.wcsActiv })}{' '}
          <button type="button" data-masina="wcs-program" disabled={mWcs !== null} onClick={() => { s.alegeWcs(wcsProgram); }}>
            {t('masina.wcs.treci', { wcs: wcsProgram })}
          </button>
        </div>
      )}

      <h3>{t('masina.jog')}</h3>
      <div className="masina-jog" role="group" aria-label={t('masina.jog')}>
        {DIRECTII.map((d, k) => (d === null ? <span key={k} /> : (
          <button key={d.id} type="button" data-masina="jog" data-jog={d.id} disabled={mJog !== null || !(nr > 0)}
            aria-label={t('masina.jog.axa', { axe: d.id.replace(/([XYZ])/g, ' $1').trim().replace(/-/g, '−') })}
            onClick={() => {
              const dep: Partial<Record<AxaJog, number>> = {};
              for (const [a, v] of Object.entries(d.d) as [AxaJog, number][]) dep[a] = v * pas;
              s.jog(dep, nr);
            }}>{d.simbol}</button>
        )))}
      </div>
      <div className="masina-butoane">
        <label className="masina-camp">
          <span>{t('masina.jog.pas')}</span>
          <select value={pas} data-masina="pas-jog" onChange={(e) => { setPas(Number(e.target.value) as (typeof PASI_JOG)[number]); }}>
            {PASI_JOG.map((p) => <option key={p} value={p}>{`${p} mm`}</option>)}
          </select>
        </label>
        <label className="masina-camp">
          <span>{t('masina.jog.avans')}</span>
          <input type="number" inputMode="decimal" min={1} step={100} value={avans} data-masina="avans-jog" className="masina-numar"
            onChange={(e) => { setAvans(e.target.value); }} />
        </label>
        {f.raport?.stare === 'Jog' && (
          <button type="button" className="masina-opreste" data-masina="anuleaza-jog" onClick={() => { s.anuleazaJog(); }}>{t('masina.jog.opreste')}</button>
        )}
      </div>
      {mJog !== null && <p className="masina-motiv" data-testid="masina-motiv-jog">{t('masina.miscare.acum', { motiv: mJog })}</p>}

      <div className="masina-butoane">
        <button type="button" data-masina="zero-xy" disabled={mZero !== null || mXy !== null || tinta === null}
          title={mXy ?? (tinta ? t('masina.zero.titlu', { wcs: tinta }) : undefined)}
          onClick={() => { if (tinta) s.zero(['X', 'Y'], tinta); }}>{t('masina.zero.xy', { wcs: tinta ?? '—' })}</button>
        <button type="button" data-masina="zero-z" disabled={mZero !== null || tinta === null}
          title={tinta ? t('masina.zero.titlu', { wcs: tinta }) : undefined}
          onClick={() => { if (tinta) s.zero(['Z'], tinta); }}>{t('masina.zero.z', { wcs: tinta ?? '—' })}</button>
      </div>
      {f.program && (
        <p className="masina-z0" data-testid="masina-z0">
          {montaj ? <>{t(`masina.z0.${montaj.z0}`)}<br />{t('masina.origine', { colt: t(`masina.colt.${montaj.origine}`) })}</> : t('masina.z0.necunoscut')}
        </p>
      )}

      <h3>{t('masina.palpare')}</h3>
      <div className="masina-palpare">
        <label className="masina-camp"><span>{t('masina.palpare.grosime')}</span>
          <input type="number" inputMode="decimal" min={0.1} max={100} step={0.1} value={grosime} data-masina="palpare-grosime" className="masina-numar"
            onChange={(e) => { setGrosime(e.target.value); }} /></label>
        <label className="masina-camp"><span>{t('masina.palpare.distanta')}</span>
          <input type="number" inputMode="decimal" min={1} max={300} step={1} value={distanta} data-masina="palpare-distanta" className="masina-numar"
            onChange={(e) => { setDistanta(e.target.value); }} /></label>
        <label className="masina-camp"><span>{t('masina.palpare.avans')}</span>
          <input type="number" inputMode="decimal" min={1} max={2000} step={10} value={avansPalpare} data-masina="palpare-avans" className="masina-numar"
            onChange={(e) => { setAvansPalpare(e.target.value); }} /></label>
      </div>
      <div className="masina-butoane">
        <button type="button" className="principal" data-masina="palpeaza" disabled={mZero !== null || tinta === null}
          title={tinta ? t('masina.palpare.titlu', { wcs: tinta }) : undefined}
          onClick={() => {
            if (tinta) s.palpeaza({ ...PALPARE_IMPLICITA, wcs: tinta, grosime: numar(grosime), distanta: numar(distanta), avans: numar(avansPalpare) });
          }}>{t('masina.palpare.porneste', { wcs: tinta ?? '—' })}</button>
      </div>
      {mZero !== null && mJog === null && <p className="masina-motiv" data-testid="masina-motiv-zero">{t('masina.miscare.acum', { motiv: mZero })}</p>}
      {proc !== '' && <p className="masina-cap" role="status" data-testid="masina-procedura">{proc}</p>}
    </section>
  );
}
