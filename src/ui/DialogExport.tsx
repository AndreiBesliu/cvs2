import { useState } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { ParametriExport } from './actiuniExportTipuri.ts';
import { useLimba } from './useLimba.ts';

type Latura = 'exterior' | 'interior' | 'pe-linie';
type ParametriElement = { latura: Latura; adancime: number; pas: number };

export type ElementExport = { readonly id: string; readonly descriere: string; readonly implicit: ParametriElement };

type Props = {
  readonly elemente: readonly ElementExport[];
  readonly onExporta: (p: ParametriExport) => void;
  readonly onInchide: () => void;
  /** Ultimul rezultat: liniile și SHA-256, sau motivul. */
  readonly stare: { readonly ok: true; readonly linii: number; readonly sha256: string } | { readonly ok: false; readonly motiv: string } | null;
};

const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
const LATURI: readonly Latura[] = ['exterior', 'interior', 'pe-linie'];
const CHEI_COLT: Readonly<Record<(typeof COLTURI)[number], CheieSimpla>> = {
  'stanga-jos': 'export.colt.stanga-jos', 'dreapta-jos': 'export.colt.dreapta-jos',
  'dreapta-sus': 'export.colt.dreapta-sus', 'stanga-sus': 'export.colt.stanga-sus',
};
const CHEI_LATURA: Readonly<Record<Latura, CheieSimpla>> = {
  exterior: 'export.latura.exterior', interior: 'export.latura.interior', 'pe-linie': 'export.latura.pe-linie',
};

const pozitiv = (x: number): boolean => Number.isFinite(x) && x > 0;

/** Exportul G-code v0: colțul de origine, Z0, freza și profilul fiecărui element. Parametrii trăiesc doar în dialog. */
export function DialogExport({ elemente, onExporta, onInchide, stare }: Props) {
  useLimba();
  const [origine, setOrigine] = useState<(typeof COLTURI)[number]>('stanga-jos');
  const [z0, setZ0] = useState<'sus' | 'jos'>('sus');
  const [diametru, setDiametru] = useState(6);
  const [param, setParam] = useState<Record<string, ParametriElement>>(() => Object.fromEntries(elemente.map((e) => [e.id, e.implicit])));
  const valid = pozitiv(diametru) && elemente.every((e) => {
    const p = param[e.id];
    return p !== undefined && pozitiv(p.adancime) && pozitiv(p.pas);
  });
  const schimba = (id: string, p: Partial<ParametriElement>): void => {
    setParam((v) => {
      const vechi = v[id];
      return vechi ? { ...v, [id]: { ...vechi, ...p } } : v;
    });
  };

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-titlu">
      <div className="dialog-cutie">
        <h2 id="export-titlu">{t('export.titlu')}</h2>
        <div className="campuri">
          <label>
            {t('export.origine')}
            <select value={origine} data-camp="origine" onChange={(e) => { setOrigine(e.target.value as (typeof COLTURI)[number]); }}>
              {COLTURI.map((c) => <option key={c} value={c}>{t(CHEI_COLT[c])}</option>)}
            </select>
          </label>
          <label>
            {t('export.z0')}
            <select value={z0} data-camp="z0" onChange={(e) => { setZ0(e.target.value === 'jos' ? 'jos' : 'sus'); }}>
              <option value="sus">{t('export.z0.sus')}</option>
              <option value="jos">{t('export.z0.jos')}</option>
            </select>
          </label>
          <label>
            {t('export.freza')}
            <input type="number" min="0.1" step="0.001" value={diametru} data-camp="diametru"
              onChange={(e) => { setDiametru(Number(e.target.value)); }} />
          </label>
        </div>
        <table>
          <thead>
            <tr><th>{t('export.element')}</th><th>{t('export.latura')}</th><th>{t('export.adancime')}</th><th>{t('export.pas')}</th></tr>
          </thead>
          <tbody>
            {elemente.map((e) => {
              const p = param[e.id] ?? e.implicit;
              return (
                <tr key={e.id} data-element={e.id}>
                  <td>{e.descriere}</td>
                  <td>
                    <select value={p.latura} onChange={(ev) => { schimba(e.id, { latura: ev.target.value as Latura }); }}>
                      {LATURI.map((l) => <option key={l} value={l}>{t(CHEI_LATURA[l])}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="0.01" step="0.01" value={p.adancime} onChange={(ev) => { schimba(e.id, { adancime: Number(ev.target.value) }); }} /></td>
                  <td><input type="number" min="0.01" step="0.01" value={p.pas} onChange={(ev) => { schimba(e.id, { pas: Number(ev.target.value) }); }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="nota">{t('export.regim')}</p>
        <div className="butoane">
          <button type="button" disabled={!valid} data-buton="exporta"
            onClick={() => { onExporta({ origine, z0, diametruScula: diametru, elemente: new Map(Object.entries(param)) }); }}>
            {t('export.exporta')}
          </button>
          <button type="button" onClick={onInchide}>{t('export.inchide')}</button>
        </div>
        {stare?.ok && <p role="status" data-testid="export-stare">{t('export.gata', { n: stare.linii, sha: stare.sha256 })}</p>}
        {stare && !stare.ok && <p role="status" className="avertisment" data-testid="export-stare">{t('export.eroare', { motiv: stare.motiv })}</p>}
      </div>
    </div>
  );
}
