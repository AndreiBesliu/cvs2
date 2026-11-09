/**
 * Placa din fereastra Imprimanta (felia 3.6q, ADR 0193 §B, după schița acceptată): patul văzut de sus, mărit pe piese ca în
 * „Din desen…” (grila la 10 mm, fața imprimantei jos), cu piesele, piesa de acum, cele anulate, duza (doar cât imprimă și doar
 * în pat) și stratul de acum peste cel de dedesubt (căile vin din harta fișierului, pentru fișierele trimise din cvs2); lângă
 * ea, bara straturilor (cele făcute, stratul de acum, pauzele fișierului) și lista pieselor; cât imprimanta stă într-o pauză a
 * fișierului, nota ei. Din felia 3.6r (ADR 0193 §C): **Anulează…** pe fiecare piesă din listă (și un clic pe ea, pe placă)
 * deschide confirmarea; cererea în curs se vede pe rândul piesei, iar pentru piesa de acum, cu **Renunță**. Ultima piesă
 * rămasă n-are buton (pentru ea, Oprește).
 */
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { limba, t } from '../i18n/t.ts';
import { piesaAnulabila, type Imprimanta, type StareLucrare } from '../machine/imprimanta/driver.ts';
import type { HartaGcode, StratHarta } from '../machine/imprimanta/harta.ts';
import type { AnulareCeruta } from '../machine/imprimanta/sesiune.ts';
import type { StratViu } from '../machine/imprimanta/stratViu.ts';
import { etichetePiese, inContur, pauzaDeAcum } from './placaCalcul.ts';

const loc = (): string => (limba() === 'ro' ? 'ro-RO' : 'en-GB');
const mm = (v: number): string => v.toLocaleString(loc(), { maximumFractionDigits: 2 });

/** O piesă de arătat: numele (cel spus de imprimantă, cu majuscule), eticheta pentru om și conturul, în mm. */
type PiesaArata = { readonly nume: string; readonly eticheta: string; readonly contur: readonly (readonly [number, number])[] };

/** Căile unui strat, ca linii pe pânză; cele ale pieselor anulate, cu `alfaAnulate`. */
function cai(c: CanvasRenderingContext2D, s: StratHarta, X: (x: number) => number, Y: (y: number) => number, anulate: ReadonlySet<number>, alfaAnulate: number): void {
  for (const treceri of [false, true]) {
    if (treceri && anulate.size === 0) break;
    c.globalAlpha = treceri ? alfaAnulate : 1;
    c.beginPath();
    let cale = -1, inceput = true, sare = false;
    for (let i = 0; i < s.puncte.length; i += 2) {
      const x = s.puncte[i]!, y = s.puncte[i + 1]!;
      if (Number.isNaN(x)) { inceput = true; continue; }
      if (inceput) {
        cale++;
        inceput = false;
        sare = anulate.has(s.piese[cale] ?? -1) !== treceri;
        if (!sare) c.moveTo(X(x), Y(y));
        continue;
      }
      if (!sare) c.lineTo(X(x), Y(y));
    }
    c.stroke();
  }
  c.globalAlpha = 1;
}

export function Placa({ i, stare, harta, etichete, viu, pat, anuleaza, anulari, retrage }: {
  readonly i: Imprimanta; readonly stare: StareLucrare; readonly harta: HartaGcode | null;
  readonly etichete: Readonly<Record<string, string>> | null; readonly viu: StratViu; readonly pat: readonly [number, number, number];
  /** Felia 3.6r: deschide confirmarea anulării (null: imprimanta n-o are sau legătura lipsește); cererile; retragerea uneia. */
  readonly anuleaza: ((nume: string, eticheta: string) => void) | null; readonly anulari: readonly AnulareCeruta[];
  readonly retrage: (nume: string) => void;
}): ReactNode {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // Cutia desenată (mm → pixelii pânzei), pentru clicul pe o piesă.
  const cutie = useRef<{ readonly x0: number; readonly y0: number; readonly s: number; readonly ox: number; readonly oy: number } | null>(null);
  const [latime, setLatime] = useState(0);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(() => { setLatime(cv.clientWidth); });
    o.observe(cv);
    return () => { o.disconnect(); };
  }, []);
  // Piesele: cele spuse de imprimantă, altfel ale fișierului.
  const surse = i.piese !== null && i.piese.length > 0 ? i.piese.map((p) => ({ nume: p.nume, contur: p.contur })) : (harta?.piese ?? []);
  const nume = etichetePiese(surse.map((p) => p.nume), etichete);
  const piese: PiesaArata[] = surse.map((p, k) => ({ nume: p.nume.toUpperCase(), eticheta: nume[k]!, contur: p.contur }));
  const anulate = new Set((i.anulate ?? []).map((x) => x.toUpperCase()));
  const acum = i.piesaAcum?.toUpperCase() ?? null;
  const n = harta !== null && harta.straturi.length > 0 ? harta.straturi.length : i.straturi;
  const k = viu.strat;
  const z = harta !== null && k !== null ? (harta.straturi[k - 1]?.z ?? null) : null;
  const poz = i.pozitie;
  const duza = stare === 'imprima' && poz !== null && poz.x >= 0 && poz.y >= 0 && poz.x <= pat[0] && poz.y <= pat[1] ? poz : null;
  const pauza = stare === 'pauza' && harta !== null ? pauzaDeAcum(harta.pauze, k) : null;
  // Anularea (3.6r): cererea în curs a fiecărei piese și piesele care se pot anula acum.
  const cerere = (p: PiesaArata): AnulareCeruta | undefined => anulari.find((a) => a.nume.toUpperCase() === p.nume);
  const sePoate = (p: PiesaArata): boolean => anuleaza !== null && piesaAnulabila(i, p.nume) === null && cerere(p)?.esuataLa !== null;
  const ramase = piese.filter((p) => !anulate.has(p.nume)).length;
  const clic = (e: MouseEvent<HTMLCanvasElement>): void => {
    const cv = ref.current, b = cutie.current;
    if (!cv || !b || anuleaza === null) return;
    const r = cv.getBoundingClientRect();
    const x = b.x0 + (((e.clientX - r.left) * cv.width) / r.width - b.ox) / b.s;
    const y = b.y0 + (cv.height - ((e.clientY - r.top) * cv.height) / r.height - b.oy) / b.s;
    const p = piese.find((q) => q.contur.length > 2 && inContur(q.contur, x, y));
    if (p !== undefined && sePoate(p)) anuleaza(p.nume, p.eticheta);
  };

  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const css = getComputedStyle(cv);
    const culoare = (v: string, rez: string): string => css.getPropertyValue(v).trim() || rez;
    // Cutia: căile fișierului și conturul pieselor, cu o margine; cel puțin 60 mm; fără nimic, tot patul.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    if (harta?.cutie) ({ x0, y0, x1, y1 } = harta.cutie);
    for (const p of piese) for (const [x, y] of p.contur) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (!(x0 <= x1)) { x0 = 0; y0 = 0; x1 = pat[0]; y1 = pat[1]; }
    const m = Math.max(4, 0.08 * Math.max(x1 - x0, y1 - y0));
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    if (x1 - x0 < 60) { const d = (60 - (x1 - x0)) / 2; x0 -= d; x1 += d; }
    if (y1 - y0 < 60) { const d = (60 - (y1 - y0)) / 2; y0 -= d; y1 += d; }
    const W = cv.clientWidth || 360, H = Math.min(420, Math.max(160, (W * (y1 - y0)) / (x1 - x0)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = `${H}px`;
    const s = Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
    const ox = (cv.width - (x1 - x0) * s) / 2, oy = (cv.height - (y1 - y0) * s) / 2;
    const X = (x: number): number => ox + (x - x0) * s, Y = (y: number): number => cv.height - (oy + (y - y0) * s);
    cutie.current = { x0, y0, s, ox, oy };
    c.fillStyle = culoare('--plc-pat', '#22262c');
    c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = culoare('--plc-grila', '#2f343b'); c.lineWidth = Math.max(1, dpr * 0.5);
    c.beginPath();
    for (let g = Math.ceil(x0 / 10) * 10; g <= x1; g += 10) { c.moveTo(X(g), 0); c.lineTo(X(g), cv.height); }
    for (let g = Math.ceil(y0 / 10) * 10; g <= y1; g += 10) { c.moveTo(0, Y(g)); c.lineTo(cv.width, Y(g)); }
    c.stroke();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // Indexurile pieselor anulate, pe harta fișierului (căile lor, estompate).
    const anulateHarta = new Set<number>();
    harta?.piese.forEach((p, idx) => { if (anulate.has(p.nume)) anulateHarta.add(idx); });
    const latimeCale = Math.max(1, 0.42 * s);
    if (harta !== null && k !== null) {
      const jos = harta.straturi[k - 2];
      if (jos) { c.strokeStyle = culoare('--plc-jos', '#3b4149'); c.lineWidth = latimeCale; cai(c, jos, X, Y, anulateHarta, 0.35); }
      const sus = harta.straturi[k - 1];
      if (sus) { c.strokeStyle = culoare('--plc-cale', '#ff8a1f'); c.lineWidth = latimeCale; cai(c, sus, X, Y, anulateHarta, 0.3); }
    }
    // Conturul pieselor; piesa de acum, mai gros; cele anulate, tăiate.
    for (const p of piese) {
      if (p.contur.length < 2) continue;
      const eAcum = acum !== null && p.nume === acum;
      c.strokeStyle = eAcum ? culoare('--plc-acum', '#4fd1c5') : culoare('--plc-contur', '#c9ced6');
      c.lineWidth = eAcum ? Math.max(2, 3 * dpr) : Math.max(1, dpr);
      c.globalAlpha = eAcum ? 1 : 0.55;
      c.beginPath();
      p.contur.forEach(([x, y], q) => { if (q === 0) c.moveTo(X(x), Y(y)); else c.lineTo(X(x), Y(y)); });
      c.closePath();
      c.stroke();
      c.globalAlpha = 1;
      if (anulate.has(p.nume)) {
        let a = Infinity, b = Infinity, e = -Infinity, f = -Infinity;
        for (const [x, y] of p.contur) { a = Math.min(a, x); e = Math.max(e, x); b = Math.min(b, y); f = Math.max(f, y); }
        c.strokeStyle = culoare('--plc-anulata', '#ff3b30'); c.lineWidth = Math.max(2, 2.5 * dpr);
        c.beginPath();
        c.moveTo(X(a), Y(b)); c.lineTo(X(e), Y(f)); c.moveTo(X(a), Y(f)); c.lineTo(X(e), Y(b));
        c.stroke();
      }
    }
    if (duza !== null) {
      const r = Math.max(4, 2.2 * s);
      c.strokeStyle = culoare('--plc-duza', '#ffffff'); c.globalAlpha = 0.45; c.lineWidth = Math.max(1.5, dpr);
      c.beginPath(); c.arc(X(duza.x), Y(duza.y), r * 2, 0, 2 * Math.PI); c.stroke();
      c.globalAlpha = 1; c.fillStyle = culoare('--plc-duza', '#ffffff');
      c.beginPath(); c.arc(X(duza.x), Y(duza.y), r, 0, 2 * Math.PI); c.fill();
    }
  }, [harta, k, i.piese, i.anulate, acum, duza?.x, duza?.y, latime]);

  const facute = k !== null && n !== null && n > 0 ? (k - 1) / n : 0;
  return (
    <div className="imprimanta-placa" data-testid="imprimanta-placa" data-strat={k ?? ''} data-sursa={viu.sursa ?? ''} data-cai={harta === null ? 'nu' : 'da'}
      data-duza={duza === null ? '' : `${duza.x},${duza.y}`}>
      <div className="imprimanta-placa-cap">
        <strong data-testid="imprimanta-placa-strat">
          {k === null || n === null ? t('imprimanta.placa.strat-necunoscut')
            : z === null ? t('imprimanta.placa.strat', { k, n }) : t('imprimanta.placa.strat-z', { k, n, z: mm(z) })}
        </strong>
        {viu.sursa !== null && (
          <span className="imprimanta-slab">{viu.sursa === 'filament'
            ? t('imprimanta.placa.sursa.filament', { m: ((i.filament ?? 0) / 1000).toLocaleString(loc(), { maximumFractionDigits: 2 }) })
            : t('imprimanta.placa.sursa.imprimanta')}</span>
        )}
      </div>
      {pauza !== null && (
        <div className="imprimanta-placa-pauza" role="status" data-testid="imprimanta-placa-pauza">
          <strong>{pauza.z === null ? t('imprimanta.placa.pauza', { k: pauza.strat }) : t('imprimanta.placa.pauza-z', { k: pauza.strat, z: mm(pauza.z) })}</strong>
          {pauza.nota !== null && <span>{pauza.nota}</span>}
          <span className="imprimanta-ajutor">{t('imprimanta.placa.pauza.reia')}</span>
        </div>
      )}
      <div className="imprimanta-placa-corp">
        <canvas ref={ref} className="imprimanta-placa-pat" role="img" aria-label={t('imprimanta.placa.aria')} data-testid="imprimanta-placa-pat"
          data-anulare={piese.some(sePoate) ? 'da' : undefined} onClick={clic} />
        {n !== null && n > 0 && (
          <div className="imprimanta-placa-bara" aria-label={k === null ? t('imprimanta.placa.bara-fara', { n }) : t('imprimanta.placa.bara', { k, n })} role="img">
            <i className="imprimanta-placa-facut" style={{ ['--k' as string]: String(facute) }} />
            {(harta?.pauze ?? []).map((p) => (
              <i key={p.strat} className="imprimanta-placa-semn-pauza" data-strat={p.strat} style={{ ['--k' as string]: String((p.strat - 1) / n) }} />
            ))}
            {k !== null && <i className="imprimanta-placa-acum" style={{ ['--k' as string]: String((k - 0.5) / n) }}>{k}</i>}
          </div>
        )}
      </div>
      <ul className="imprimanta-placa-legenda">
        {harta !== null && <li><i data-fel="cale" />{t('imprimanta.placa.legenda.strat')}</li>}
        <li><i data-fel="acum" />{t('imprimanta.placa.legenda.piesa')}</li>
        <li><i data-fel="anulata" />{t('imprimanta.placa.legenda.anulata')}</li>
        <li><i data-fel="duza" />{t('imprimanta.placa.legenda.duza')}</li>
        {harta !== null && harta.pauze.length > 0 && <li><i data-fel="pauza" />{t('imprimanta.placa.legenda.pauza')}</li>}
      </ul>
      {harta === null && <p className="imprimanta-ajutor" data-testid="imprimanta-placa-fara-cai">{t('imprimanta.placa.fara-cai')}</p>}
      {piese.length > 0 && (
        <>
          <p className="imprimanta-placa-titlu">{t('imprimanta.placa.piese')}</p>
          <ul className="imprimanta-placa-piese" data-testid="imprimanta-placa-piese">
            {piese.map((p) => {
              const eAcum = acum !== null && p.nume === acum, anulata = anulate.has(p.nume);
              const c = anulata ? undefined : cerere(p);
              const asteapta = c !== undefined && c.esuataLa === null;
              // De ce nu se poate (ADR 0193 §C.12): doar numele nesigur se spune; ultima piesă n-are buton.
              const motiv = anulata || asteapta || anuleaza === null ? null : piesaAnulabila(i, p.nume);
              return (
                <li key={p.nume} data-piesa={p.nume} data-acum={eAcum ? 'da' : undefined} data-anulata={anulata ? 'da' : undefined}
                  data-cerere={c === undefined ? undefined : asteapta ? 'asteapta' : 'esuata'}>
                  <span className="imprimanta-placa-piesa">{p.eticheta}</span>
                  {anulata ? <small>{t('imprimanta.placa.piesa.anulata')}</small> : eAcum ? <small>{t('imprimanta.placa.piesa.acum')}</small> : null}
                  {asteapta && (
                    <span className="imprimanta-placa-cerere">
                      <span className="imprimanta-asteapta">→ {t(c.acum ? 'imprimanta.anulare.cand-trece' : 'imprimanta.anulare.asteapta')}</span>
                      {c.acum && <button type="button" data-imprimanta="anulare-retrage" onClick={() => { retrage(c.nume); }}>{t('imprimanta.anulare.retrage')}</button>}
                      {c.acum && <small>{t('imprimanta.anulare.acum-ajutor')}</small>}
                    </span>
                  )}
                  {c !== undefined && !asteapta && <span className="imprimanta-neconfirmat">{t('imprimanta.cerere.esuata')}</span>}
                  {anuleaza !== null && (motiv === null || motiv === 'nume') && !anulata && !asteapta && (
                    <button type="button" className="imprimanta-placa-anuleaza" data-imprimanta="anuleaza-piesa" disabled={motiv !== null}
                      aria-label={t('imprimanta.anulare.aria', { piesa: p.eticheta })} onClick={() => { anuleaza(p.nume, p.eticheta); }}>
                      {t('imprimanta.anulare.buton')}
                    </button>
                  )}
                  {motiv === 'nume' && <small>{t('imprimanta.anulare.nume')}</small>}
                </li>
              );
            })}
          </ul>
          {anuleaza !== null && piese.length > 1 && ramase === 1 && <p className="imprimanta-ajutor" data-testid="imprimanta-placa-ultima">{t('imprimanta.anulare.ultima')}</p>}
        </>
      )}
    </div>
  );
}
