/**
 * Fereastra „Raportul foilor și lista de tăiere” (ADR 0210 §6, răspunsul 7; felia 11.6↑; planșa 7 a schiței), deschisă din
 * fereastra exportului și din paletă. Pe fiecare foaie (foile identice o dată, ×N): previzualizarea (SVG-ul exportului de
 * vectori, cu straturile lui), materialul, mărimea, cât e folosită, operațiile și piesele (câte, mărimea, rotirile, valorile
 * din CSV); la capăt, totalurile pe piesă și foile pe material. Mărimea pieselor: tăiată (implicit) sau a desenului. CSV-ul
 * cu `;` (implicit, Excel în română) sau `,`, și tipărirea (PDF din browser): fereastra stă direct sub `body`, ca tipărirea
 * s-o ia singură, pe oricâte pagini. Vine la cerere, cu mesajele exportului.
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import '../i18n/export.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { scrieSvg } from '../io/svgExport.ts';
import { vectoriFoaie } from '../io/vectori.ts';
import type { ColtOrigine } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import { numeFoaie } from '../model/foi.ts';
import { raportFoi, type MarimeRaport, type OperatieRaport } from '../model/raportFoi.ts';
import { csvRaport, numeMarime, numePiesaRaport, type SeparatorCsv } from './raportCsv.ts';
import { useLimba } from '../ui/useLimba.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Cel mult atâtea valori ale plăcuțelor pe rând; restul, numărate. */
const VALORI = 3;

/** O operație a foii, în cuvinte: felul, freza, adâncimea cu trecerile și urechile („profil exterior, T1 Ø6, 18 mm, 3 treceri”). */
function textOperatie(o: OperatieRaport, n: Intl.NumberFormat): string {
  const fel = o.despartire ? t('export.raport.op.despartire') : o.tip === 'profil' ? t(`export.raport.op.profil.${o.latura}`) : t(`export.raport.op.${o.tip}`);
  const freza = `T${o.scula.numar} ${o.scula.unghi === null ? '' : `V ${n.format(o.scula.unghi)}° `}Ø${n.format(o.scula.diametru)}`;
  const parti = [fel, freza, t('export.raport.op.adancime', { adancime: n.format(o.adancime), n: o.treceri })];
  if (o.urechi > 0) parti.push(t('export.raport.op.urechi', { n: o.urechi }));
  return parti.join(', ');
}

export function DialogRaportFoi({ doc, origine, z0, onInchide }: {
  readonly doc: Document;
  /** Colțul de origine și Z0 ale exportului (ale ferestrei lui, sau cele implicite): raportul le spune, nu le schimbă. */
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
  readonly onInchide: () => void;
}): ReactNode {
  const limba = useLimba();
  const [fel, setFel] = useState<MarimeRaport>('taiata');
  const [sep, setSep] = useState<SeparatorCsv>(';');
  const sablon = (k: number): string => t('foaia.n', { n: String(k) });
  const r = useMemo(() => raportFoi(doc, fel, sablon), [doc, fel, limba]);
  // Previzualizarea fiecărei foi spuse: SVG-ul exportului de vectori, cu foaia (ținut cât rămâne documentul). Liniile lui au
  // 0,1 mm (fișierul tăiat); în cele ~160 px ale previzualizării, cam un pixel: a 150-a parte din latura mare a foii.
  const imagini = useMemo(() => new Map(r.foi.map((f) => {
    const svg = scrieSvg(vectoriFoaie(doc, f.k, true), Math.max(f.latime, f.inaltime) / 150);
    return [f.k, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`];
  })), [doc, r]);
  const n = useMemo(() => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 2, useGrouping: false }), [limba]);
  const marime = (x: { readonly latime: number; readonly inaltime: number; readonly din: MarimeRaport }): string => {
    const m = `${n.format(x.latime)} × ${n.format(x.inaltime)}`;
    return fel === 'taiata' && x.din === 'desen' ? t('export.raport.desen-marcaj', { marime: m }) : m;
  };
  const numeFoii = (k: number): string => {
    const f = doc.foi[k];
    return f ? numeFoaie(f, k, sablon) : '';
  };
  const descarcaCsv = (): void => {
    const url = URL.createObjectURL(new Blob([csvRaport(r, sep)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cncvs2-lista-de-taiere.csv';
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
  };
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onInchide();
  };
  const comutator = (atribut: string, valori: ReadonlyArray<readonly [string, string]>, ales: string, alege: (v: string) => void): ReactNode => (
    <div role="group" className="raport-comutator">
      {valori.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === ales} {...{ [atribut]: v }} onClick={() => { alege(v); }}>{text}</button>
      ))}
    </div>
  );

  return createPortal(
    <div className="dialog raport-foi-tipar" role="dialog" aria-modal="true" aria-labelledby="raport-titlu" data-testid="dialog-raport" onKeyDown={tasta}>
      <div className="dialog-cutie raport-foi">
        <h2 id="raport-titlu">{t('export.raport.titlu')}</h2>
        <p className="nota">{t('export.raport.parametri', { z0: t(`export.z0.${z0}`), colt: t(`export.colt.${origine}`) })}</p>
        <div className="ordine-taierii fara-tipar">
          <span className="eticheta">{t('export.raport.marime')}</span>
          {comutator('data-raport-marime', [['taiata', numeMarime('taiata')], ['desen', numeMarime('desen')]], fel, (v) => { setFel(v === 'desen' ? 'desen' : 'taiata'); })}
          <span className="eticheta">{t('export.raport.separator')}</span>
          {comutator('data-raport-separator', [[';', ';'], [',', ',']], sep, (v) => { setSep(v === ',' ? ',' : ';'); })}
          <button type="button" data-raport="csv" onClick={descarcaCsv} autoFocus>{t('export.raport.csv')}</button>
          <button type="button" data-raport="tipareste" onClick={() => { window.print(); }}>{t('export.raport.tipareste')}</button>
          <button type="button" data-raport="inchide" onClick={onInchide}>{t('export.inchide')}</button>
        </div>
        <p className="nota fara-tipar">{t('export.raport.marime.nota')}</p>
        {r.foi.map((f) => (
          <section key={f.id} className="raport-foaie" data-raport-foaie={f.id}>
            <img src={imagini.get(f.k)} alt={t('export.raport.previzualizare', { foaie: f.nume })} />
            <div>
              <h3>{f.identice.length > 0 ? t('export.foi.identice', { foaie: f.nume, n: f.identice.length + 1, alte: f.identice.map(numeFoii).join(', ') }) : f.nume}</h3>
              <p data-raport="foaie">{t('export.raport.foaie', {
                material: f.material ?? t('export.raport.fara-material'), latime: n.format(f.latime), inaltime: n.format(f.inaltime),
                grosime: n.format(f.grosime), procent: n.format(f.folosita),
              })}</p>
              {f.operatii.length > 0 && <p className="nota" data-raport="operatii">{t('export.raport.operatii', { lista: f.operatii.map((o) => textOperatie(o, n)).join(' · ') })}</p>}
              {f.piese.length === 0 ? <p className="nota">{t('export.raport.goala')}</p> : (
                <table>
                  <thead><tr><th>{t('export.raport.csv.piesa')}</th><th>{t('export.raport.csv.cate')}</th><th>{t('export.raport.col.marime')}</th><th>{t('export.raport.csv.rotirea')}</th><th>{t('export.raport.csv.valorile')}</th></tr></thead>
                  <tbody>
                    {f.piese.map((p) => (
                      <tr key={`${p.piesa}|${p.latime}|${p.inaltime}|${p.din}`} data-raport-piesa={p.piesa}>
                        <th scope="row">{numePiesaRaport(p)}</th>
                        <td>{p.cate}</td>
                        <td>{marime(p)}</td>
                        <td>{p.rotiri.map((g) => `${n.format(g)}°`).join(', ')}</td>
                        <td>{p.valori.length > VALORI ? t('export.raport.valori-mai-multe', { lista: p.valori.slice(0, VALORI).join(', '), n: p.valori.length }) : p.valori.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ))}
        <h3>{t('export.raport.totaluri')}</h3>
        <table data-raport="totaluri">
          <thead><tr><th>{t('export.raport.csv.piesa')}</th><th>{t('export.raport.csv.cate')}</th><th>{t('export.raport.col.marime')}</th><th>{t('export.raport.csv.material')}</th><th>{t('export.raport.csv.pe-foile')}</th></tr></thead>
          <tbody>
            {r.piese.map((p) => (
              <tr key={`${p.piesa}|${p.latime}|${p.inaltime}|${p.din}`}>
                <th scope="row">{numePiesaRaport(p)}</th>
                <td>{p.cate}</td>
                <td>{marime(p)}</td>
                <td>{p.materiale.map((m) => m ?? t('export.raport.fara-material')).join(', ')}</td>
                <td>{p.foi.map((k) => k + 1).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{t('export.raport.materiale')}</h3>
        <table data-raport="materiale">
          <thead><tr><th>{t('export.raport.csv.material')}</th><th>{t('export.raport.col.foaia')}</th><th>{t('export.raport.csv.foi')}</th></tr></thead>
          <tbody>
            {r.materiale.map((m) => (
              <tr key={`${m.material ?? ''}|${m.latime}|${m.inaltime}|${m.grosime}`}>
                <th scope="row">{m.material ?? t('export.raport.fara-material')}</th>
                <td>{`${n.format(m.latime)} × ${n.format(m.inaltime)} × ${n.format(m.grosime)}`}</td>
                <td>{m.foi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,
    document.body,
  );
}
