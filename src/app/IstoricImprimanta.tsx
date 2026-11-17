/**
 * Istoricul imprimărilor în fereastra Imprimanta (felia 3.6t, ADR 0194 §B, după schița acceptată, planșa C): înregistrarea
 * fiecărei imprimări văzute de fereastră în istoricul cvs2 (în browser), citirea lui, o dată pe pagină, și cardul Istoricul:
 * data, fișierul (cu numele pieselor din cvs2), rezultatul, durata față de estimare, filamentul, costul; dedesubt totalurile
 * lunii, Exportă CSV, Golește istoricul cvs2 (cu confirmare) și prețurile. Fereastra rămâne montată după prima deschidere, deci
 * înregistrarea merge și cât lucrezi în Proiectare.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { limba, t } from '../i18n/t.ts';
import type { RezultatImprimare, StareLucrare } from '../machine/imprimanta/driver.ts';
import type { StareImprimanta } from '../machine/imprimanta/sesiune.ts';
import { citesteImprimari, golesteImprimari, tineImprimare } from './fisiereImprimanta.ts';
import {
  cost, csvIstoric, FELURI_MATERIAL, grame, inregistreaza, materialDupa, MAX_KWH, MAX_PRET, MAX_PUTERE, totaluriLuna, type ClipaIstoric, type DinFisier,
  type ImprimareCvs2, type RandIstoric, type SetariIstoric,
} from './istoricImprimari.ts';

/** Istoricul cvs2 citit, comun paginii: o citire, apoi fiecare scriere îl înlocuiește. */
let cvs2: readonly ImprimareCvs2[] = [];
let citit = false;
const abonati = new Set<() => void>();
const pune = (l: readonly ImprimareCvs2[] | null): void => {
  if (l === null) return;
  cvs2 = l;
  for (const f of abonati) f();
};

export function useImprimariCvs2(): readonly ImprimareCvs2[] {
  useEffect(() => { if (!citit) { citit = true; void citesteImprimari().then(pune); } }, []);
  return useSyncExternalStore((f) => { abonati.add(f); return () => { abonati.delete(f); }; }, () => cvs2);
}

/**
 * Înregistrarea în istoricul cvs2 (pasul pur `inregistreaza`), la fiecare schimbare a clipei: lucrarea nouă, cifrele ei,
 * finalul. La final, cere și istoricul imprimantei, cu imprimarea abia încheiată (K1 îl trimite și singur).
 */
export function useInregistrare(st: StareImprimanta, stare: StareLucrare, din: DinFisier | null, cereIstoric: () => void): void {
  const i = st.imprimanta;
  const clipa: ClipaIstoric = {
    legatura: st.legatura === 'conectat' ? 'vie' : st.legatura === 'pierduta' ? 'pierduta' : 'alta', lucrare: stare, fisier: i.fisier,
    eroare: i.eroare, cheieEroare: i.cheieEroare, faraFilament: i.faraFilament, strat: null, pauzaFisier: null, trecut: i.trecut,
    filament: i.filament, progres: i.progres,
  };
  const semnatura = JSON.stringify([clipa, din, i.nume]);
  const inainte = useRef<ClipaIstoric | null>(null);
  const cur = useRef<ImprimareCvs2 | null>(null);
  useEffect(() => {
    const r = inregistreaza(cur.current, inainte.current, clipa, Date.now(), i.nume, din);
    inainte.current = clipa;
    cur.current = r.cur;
    if (r.scrie === null) return;
    void tineImprimare(r.scrie).then(pune);
    if (r.scrie.sfarsit !== null) setTimeout(cereIstoric, 5000);
  }, [semnatura]);
}

const SIMBOL: Readonly<Record<RezultatImprimare, string>> = { gata: '✓', oprita: '⏹', eroare: '⚠' };
const COLOANE = ['cand', 'fisier', 'rezultat', 'durata', 'filament', 'cost'] as const;
/** Cele mai noi rânduri arătate; restul sunt în CSV. */
const MAX_RANDURI = 50;
const doi = (x: number): string => String(x).padStart(2, '0');

/** Un număr scris de om într-un câmp: gol = scos (null); unul bun, între 0 și maxim; altfel nimic (undefined: câmpul rămâne). */
function valoare(text: string, max: number): number | null | undefined {
  if (text.trim() === '') return null;
  const v = Number(text);
  return Number.isFinite(v) && v >= 0 && v <= max ? v : undefined;
}

export function CardIstoric({ randuri, nCvs2, setari, schimba, cere, durata }: {
  readonly randuri: readonly RandIstoric[];
  /** Câte imprimări are istoricul cvs2 (Golește doar cu una). */
  readonly nCvs2: number;
  readonly setari: SetariIstoric; readonly schimba: (s: SetariIstoric) => void;
  /** Cere istoricul imprimantei: la deschiderea cardului (ADR 0194 §B.12). */
  readonly cere: () => void;
  readonly durata: (s: number) => string;
}): ReactNode {
  useEffect(() => { cere(); }, []);
  const [goleste, setGoleste] = useState(false);
  const renunta = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (goleste) renunta.current?.focus(); }, [goleste]);
  const ro = limba() === 'ro';
  const loc = ro ? 'ro-RO' : 'en-GB';
  const numar = (v: number, z: number): string => v.toLocaleString(loc, { minimumFractionDigits: z, maximumFractionDigits: z });
  const lei = (v: number): string => t('imprimanta.istoric.lei', { v: numar(v, 2) });
  const acum = new Date();
  const cand = (ms: number): string => {
    const d = new Date(ms);
    return `${doi(d.getDate())}.${doi(d.getMonth() + 1)}${d.getFullYear() === acum.getFullYear() ? '' : `.${d.getFullYear()}`} ${doi(d.getHours())}:${doi(d.getMinutes())}`;
  };
  const tot = totaluriLuna(randuri, setari, acum);
  const luna = acum.toLocaleDateString(loc, { month: 'long' });
  // Prețurile: felurile de material din istoric și cele cu preț pus (PLA, dacă nu e niciunul), în ordinea listei felierului.
  const felDe = (r: RandIstoric): string | undefined => materialDupa(r.material)?.tip;
  const feluri = new Set([...randuri.map(felDe), ...Object.keys(setari.preturi)]);
  const cuPret = FELURI_MATERIAL.filter((f) => feluri.has(f));
  const exporta = (): void => {
    const text = csvIstoric(randuri, setari, {
      antet: t('imprimanta.istoric.csv.coloane').split('|'), sep: ro ? ';' : ',', zecimala: ro ? ',' : '.', rezultat: (r) => t(`imprimanta.istoric.${r}`),
    });
    const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cvs2-istoric-${acum.getFullYear()}-${doi(acum.getMonth() + 1)}-${doi(acum.getDate())}.csv`;
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
  };
  // Câmpurile țin ce scrie omul (`defaultValue`); un număr bun ajunge în setări pe loc, unul gol le scoate.
  const laSchimbare = (max: number, pune: (x: number | null) => void) => (e: { readonly target: HTMLInputElement }): void => {
    const x = valoare(e.target.value, max);
    if (x !== undefined) pune(x);
  };
  const tasta = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); setGoleste(false); } };
  // Antetul coloanelor; pe telefon, fiecare celulă își poartă eticheta (`data-th`).
  const [eCand, eFisier, eRezultat, eDurata, eFilament, eCost] = COLOANE.map((c) => t(`imprimanta.istoric.${c}`));
  return (
    <section className="imprimanta-card imprimanta-lat" aria-labelledby="imprimanta-istoric" data-testid="imprimanta-istoric">
      <h3 id="imprimanta-istoric">{t('imprimanta.istoric')}</h3>
      {randuri.length === 0 ? <p className="imprimanta-slab">{t('imprimanta.istoric.gol')}</p> : (
        <div className="imprimanta-istoric-cutie">
          <table className="imprimanta-istoric">
            <thead>
              <tr>{[eCand, eFisier, eRezultat, eDurata, eFilament, eCost].map((x) => <th key={x}>{x}</th>)}</tr>
            </thead>
            <tbody>
              {randuri.slice(0, MAX_RANDURI).map((r, k) => {
                const g = grame(r.filament, r.material);
                const c = cost(r, setari);
                const dif = r.rezultat === 'gata' && r.durata !== null && r.estimare !== null && r.estimare > 0
                  ? Math.round((100 * (r.durata - r.estimare)) / r.estimare) : null;
                const piese = r.dinCvs2 && r.piese !== null && r.piese.length > 0
                  ? r.piese.slice(0, 3).join(', ') + (r.piese.length > 3 ? ', …' : '') : null;
                return (
                  <tr key={k} data-testid="imprimanta-istoric-rand" data-rez={r.rezultat ?? 'necunoscut'}>
                    <td data-th={eCand}>{cand(r.inceput)}</td>
                    <td data-th={eFisier} className="imprimanta-istoric-fisier">
                      {piese ?? r.fisier}
                      {r.dinCvs2 && <small>{piese === null ? t('imprimanta.istoric.cvs2') : t('imprimanta.istoric.din-cvs2', { fisier: r.fisier })}</small>}
                    </td>
                    <td data-th={eRezultat}>
                      <span className="imprimanta-rez" data-rez={r.rezultat ?? 'necunoscut'}>
                        {r.rezultat === null ? '—' : `${SIMBOL[r.rezultat]} ${t(`imprimanta.istoric.${r.rezultat}`)}`}
                      </span>
                    </td>
                    <td data-th={eDurata} className="imprimanta-numar">
                      {r.durata === null ? '—' : durata(r.durata)}
                      {dif !== null && r.estimare !== null ? (
                        <small data-testid="imprimanta-istoric-estimat">
                          {t('imprimanta.istoric.estimat', { timp: durata(r.estimare), dif: `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${Math.abs(dif)} %` })}
                        </small>
                      ) : r.rezultat === 'oprita' && r.progres !== null ? <small>{t('imprimanta.istoric.la', { p: Math.round(r.progres) })}</small> : null}
                    </td>
                    <td data-th={eFilament} className="imprimanta-numar">
                      {r.filament === null ? '—' : t('imprimanta.istoric.metri', { m: numar(r.filament / 1000, 2) })}
                      {g !== null && <small>{t('imprimanta.istoric.grame', { g: numar(g, 1), material: r.material ?? '' })}</small>}
                    </td>
                    <td data-th={eCost} className="imprimanta-numar" data-testid="imprimanta-istoric-cost">{c === null ? '—' : lei(c)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {randuri.length > MAX_RANDURI && <p className="imprimanta-ajutor">{t('imprimanta.istoric.mai-multe', { n: randuri.length - MAX_RANDURI })}</p>}
        </div>
      )}
      <div className="imprimanta-istoric-luna">
        <span data-testid="imprimanta-istoric-luna">
          {[
            t(tot.n === 1 ? 'imprimanta.istoric.luna.una' : 'imprimanta.istoric.luna', { luna: luna.charAt(0).toLocaleUpperCase(loc) + luna.slice(1), n: tot.n }),
            durata(tot.secunde),
            tot.grame >= 1000 ? `${numar(tot.grame / 1000, 2)} kg` : `${numar(tot.grame, 1)} g`,
            ...(tot.cost === null ? [] : [lei(tot.cost)]),
          ].join(' · ')}
        </span>
        <span className="imprimanta-butoane">
          <button type="button" data-imprimanta="istoric-csv" disabled={randuri.length === 0} onClick={exporta}>{t('imprimanta.istoric.csv')}</button>
          <button type="button" data-imprimanta="istoric-goleste" disabled={nCvs2 === 0} onClick={() => { setGoleste(true); }}>{t('imprimanta.istoric.goleste')}</button>
        </span>
      </div>
      {goleste && (
        <div className="imprimanta-dialog" role="alertdialog" aria-labelledby="imprimanta-goleste-titlu" aria-describedby="imprimanta-goleste-text"
          data-testid="imprimanta-istoric-goleste" onKeyDown={tasta}>
          <h3 id="imprimanta-goleste-titlu">{t('imprimanta.istoric.goleste.titlu')}</h3>
          <p id="imprimanta-goleste-text">{t('imprimanta.istoric.goleste.text')}</p>
          <div className="imprimanta-butoane">
            <button type="button" className="imprimanta-opreste plin" data-imprimanta="istoric-goleste-confirma"
              onClick={() => { setGoleste(false); void golesteImprimari().then(pune); }}>{t('imprimanta.istoric.goleste.confirma')}</button>
            <button type="button" data-imprimanta="istoric-goleste-renunta" ref={renunta} onClick={() => { setGoleste(false); }}>{t('imprimanta.istoric.goleste.renunta')}</button>
          </div>
        </div>
      )}
      <div className="imprimanta-istoric-preturi">
        <span>{t('imprimanta.istoric.pret')}</span>
        {(cuPret.length === 0 ? ['PLA'] : cuPret).map((f) => (
          <label key={f} className="imprimanta-istoric-camp">
            <span>{f}</span>
            <input type="number" className="imprimanta-camp-mic" min={0} max={MAX_PRET} step="any" inputMode="decimal" defaultValue={setari.preturi[f] ?? ''}
              data-imprimanta="istoric-pret" data-material={f} aria-label={t('imprimanta.istoric.pret.material', { material: f })}
              onChange={laSchimbare(MAX_PRET, (x) => {
                const preturi = Object.fromEntries(Object.entries(setari.preturi).filter(([k]) => k !== f));
                schimba({ ...setari, preturi: x === null ? preturi : { ...preturi, [f]: x } });
              })} />
            <span>{t('imprimanta.istoric.moneda')}</span>
          </label>
        ))}
      </div>
      <div className="imprimanta-istoric-preturi">
        <span>{t('imprimanta.istoric.curent')}</span>
        <label className="imprimanta-istoric-camp">
          <span>{t('imprimanta.istoric.putere')}</span>
          <input type="number" className="imprimanta-camp-mic" min={0} max={MAX_PUTERE} step="any" inputMode="decimal" defaultValue={setari.putere ?? ''}
            data-imprimanta="istoric-putere" onChange={laSchimbare(MAX_PUTERE, (x) => { schimba({ ...setari, putere: x }); })} />
        </label>
        <label className="imprimanta-istoric-camp">
          <span>{t('imprimanta.istoric.kwh')}</span>
          <input type="number" className="imprimanta-camp-mic" min={0} max={MAX_KWH} step="any" inputMode="decimal" defaultValue={setari.kwh ?? ''}
            data-imprimanta="istoric-kwh" onChange={laSchimbare(MAX_KWH, (x) => { schimba({ ...setari, kwh: x }); })} />
        </label>
      </div>
      <p className="imprimanta-ajutor">{t('imprimanta.istoric.ajutor')}</p>
    </section>
  );
}
