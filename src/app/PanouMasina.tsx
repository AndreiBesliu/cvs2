/**
 * Panoul mașinii (ADR 0081, felia 3.6b): conexiunea (portul Web Serial; pe instanța de test și mașina simulată), starea din
 * rapoarte, programul (ultimul export, exact octeții lui, sau un fișier străin, verificat), lucrarea (faza, linia, erorile) cu
 * butoanele ei, comenzile manuale și jurnalul. Sesiunea (`src/machine/sesiune.ts`) e una pe pagină: rămâne conectată și cu
 * panoul strâns. Tot ce trimite la mașină trece prin fluxul senderului (ADR 0080); panoul doar arată și cere.
 */
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import '../i18n/masina.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { incarcaProgram, type RezultatIncarcare } from '../machine/program.ts';
import { pozitieDeLucru } from '../machine/raspunsuri.ts';
import { deschideSerial, serialDisponibil } from '../machine/serial.ts';
import { SesiuneMasina, type Ceas } from '../machine/sesiune.ts';
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

type Refuz = Extract<RezultatIncarcare, { ok: false }>;
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
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) setRefuz(e instanceof Error ? e.message : String(e));
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
        {st.eroare && <p className="masina-nota" role="status">{t('masina.eroare', { motiv: st.eroare })}</p>}
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
          {st.jurnal.slice(-60).map((l, k) => <li key={k} data-fel={l.fel}>{l.fel === 'trimis' ? `> ${l.text}` : l.text}</li>)}
        </ol>
      </section>
    </div>
  );
}
