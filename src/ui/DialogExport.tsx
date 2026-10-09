import { useEffect, useRef, useState } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { MARGINI_OPERATIE, type Depasire, type IesireFoaie, type ParametriExport } from './actiuniExportTipuri.ts';
import { citesteNumar, textNumar } from './numar.ts';
import { useLimba } from './useLimba.ts';

type Latura = 'exterior' | 'interior' | 'pe-linie';
/** Ce se schimbă dintr-o operație de profil în dialog; scula (freza) e comună tuturor, până la schimbarea sculei. */
/** Sensul de tăiere (ADR 0027): urcare = materialul păstrat în dreapta sensului de mers, cu axul M3. */
type Sens = 'urcare' | 'opozitie';
export type ValoriOperatie = { readonly latura: Latura; readonly sens: Sens; readonly adancime: number; readonly pas: number };

/** Un rând: o operație a unei piese (ADR 0025), cu cheia `<piesă>/<operație>`. */
export type OperatieExport = { readonly cheie: string; readonly descriere: string; readonly valori: ValoriOperatie };

/** Ce trimite dialogul la Exportă: montajul, valorile operațiilor (se scriu în document) și confirmarea. */
export type CerereExport = ParametriExport & { readonly diametru: number; readonly valori: ReadonlyMap<string, ValoriOperatie> };

/** Ultimul rezultat: liniile și SHA-256, motivul, sau ieșirea din foaie care așteaptă confirmarea omului. */
export type StareExport =
  | { readonly ok: true; readonly linii: number; readonly sha256: string }
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare?: IesireFoaie };

type Props = {
  readonly operatii: readonly OperatieExport[];
  /** Diametrul frezei arătat: al primei operații. */
  readonly diametru: number;
  /**
   * Frezele distincte ale operațiilor de pe foaie, după ce compară exportul (număr și diametru): mai multe înseamnă freze
   * amestecate, spuse pe față.
   */
  readonly freze: ReadonlyArray<{ readonly numar: number; readonly diametru: number }>;
  /**
   * Crește cu fiecare document venit din bază (o versiune a altei file, preluarea scrierii). Valorile operațiilor îl
   * urmează; montajul ales (colțul, Z0) rămâne.
   */
  readonly baza: number;
  /** Descrierea fiecărui element în lume (`<instanță>/<element>`), pentru locul unde freza iese din foaie. */
  readonly descrieri: ReadonlyMap<string, string>;
  /** Fila doar citește: operațiile nu se pot schimba, exportul merge pe cele din document. */
  readonly doarCitire: boolean;
  readonly onExporta: (p: CerereExport) => void;
  readonly onInchide: () => void;
  /** Un parametru s-a schimbat: rezultatul vechi (și ieșirea confirmată odată cu el) nu mai e al lor. */
  readonly onReseteaza: () => void;
  readonly stare: StareExport | null;
};

const LATURI_FOAIE: ReadonlyArray<readonly [keyof Depasire, CheieSimpla]> = [
  ['stanga', 'export.iesire.stanga'], ['dreapta', 'export.iesire.dreapta'], ['jos', 'export.iesire.jos'], ['sus', 'export.iesire.sus'],
];

/**
 * Laturile pe care freza iese din foaie, cu cât, în cuvinte. Cu 3 zecimale, ca în antet, dar scrise după limbă: în română
 * punctul ar citi „26.000 mm” ca douăzeci și șase de mii.
 */
function laturi(d: Depasire, limba: string): string {
  const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return LATURI_FOAIE.filter(([k]) => d[k] > 0).map(([k, cheie]) => t(cheie, { mm: f.format(d[k]) })).join(', ');
}

const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
const LATURI: readonly Latura[] = ['exterior', 'interior', 'pe-linie'];
const CHEI_COLT: Readonly<Record<(typeof COLTURI)[number], CheieSimpla>> = {
  'stanga-jos': 'export.colt.stanga-jos', 'dreapta-jos': 'export.colt.dreapta-jos',
  'dreapta-sus': 'export.colt.dreapta-sus', 'stanga-sus': 'export.colt.stanga-sus',
};
const CHEI_LATURA: Readonly<Record<Latura, CheieSimpla>> = {
  exterior: 'export.latura.exterior', interior: 'export.latura.interior', 'pe-linie': 'export.latura.pe-linie',
};

/** În (0, plafon]: marginile schemei v3, ca operațiile scrise în document să treacă de ușă la redeschidere. */
function inMargini(s: string, plafon: number): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isFinite(x) && x > 0 && x <= plafon;
}

type Rand = { readonly latura: Latura; readonly sens: Sens; readonly adancime: string; readonly pas: string };

const SENSURI: readonly Sens[] = ['urcare', 'opozitie'];
const CHEI_SENS: Readonly<Record<Sens, CheieSimpla>> = { urcare: 'export.sens.urcare', opozitie: 'export.sens.opozitie' };

/**
 * Exportul G-code: colțul de origine, Z0, freza și profilul fiecărei operații. Operațiile vin din document și se scriu
 * înapoi în el la Exportă, ca o singură comandă (ADR 0025): se salvează și se anulează cu Ctrl+Z.
 */
export function DialogExport(
  { operatii, diametru: diametruInitial, freze, baza, descrieri, doarCitire, onExporta, onInchide, onReseteaza, stare }: Props,
) {
  const limba = useLimba();
  // În română, numerele se arată cu virgulă; se citesc cu oricare separator.
  const text = (x: number): string => textNumar(x, limba === 'ro');
  const [origine, setOrigine] = useState<(typeof COLTURI)[number]>('stanga-jos');
  const [z0, setZ0] = useState<'sus' | 'jos'>('sus');
  // Valorile se țin ca text, cum le scrie omul; se citesc abia la verificare și la Exportă.
  const [diametru, setDiametru] = useState(() => text(diametruInitial));
  const dinDocument = (): Record<string, Rand> => Object.fromEntries(operatii.map((o) => [
    o.cheie, { latura: o.valori.latura, sens: o.valori.sens, adancime: text(o.valori.adancime), pas: text(o.valori.pas) },
  ]));
  const [param, setParam] = useState<Record<string, Rand>>(dinDocument);
  const cere = stare && !stare.ok ? stare.cereConfirmare : undefined;
  /**
   * Ieșirea bifată: chiar obiectul primit de la export, nu un „da” general. Orice cerere nouă (alt traseu, alți parametri,
   * sau doar un export repetat) e alt obiect, deci vine nebifată: fiecare program care taie în afara foii are bifa lui.
   */
  const [confirmata, setConfirmata] = useState<IesireFoaie | null>(null);
  /**
   * În fila care scrie, documentul nu se schimbă sub dialog (aplicația e inertă, scrierile oprite). În cea care citește,
   * o versiune nouă venită de la scriitor (sau preluarea scrierii) aduce `baza` nouă: valorile operațiilor se iau din nou
   * din document, ca dialogul să nu arate una și să exporte alta, iar după preluare să nu scrie înapoi valori vechi peste
   * munca altei file. Câmpurile operațiilor erau oprite (fila citea), deci nu se pierde nimic scris.
   */
  const [bazaVazuta, setBazaVazuta] = useState(baza);
  if (bazaVazuta !== baza) {
    setBazaVazuta(baza);
    setDiametru(text(diametruInitial));
    setParam(dinDocument());
    setConfirmata(null);
  }
  const bifat = cere !== undefined && confirmata === cere;
  const cutie = useRef<HTMLDivElement>(null);
  const cerereVizibila = useRef<HTMLDivElement>(null);
  // La deschidere, focusul intră în dialog (butonul care l-a deschis rămâne sub el, inert).
  useEffect(() => { cutie.current?.focus(); }, []);
  // Când apare cererea, focusul trece pe textul ei, nu pe bifă: butonul Exportă devine inactiv și focusul ar cădea pe
  // pagină, iar pe bifă un al doilea Space ar bifa-o fără ca omul s-o fi citit. Bifa e la un Tab distanță.
  useEffect(() => { if (cere) cerereVizibila.current?.focus(); }, [cere]);
  const diametruBun = inMargini(diametru, MARGINI_OPERATIE.diametru);
  const randBun = (p: Rand | undefined): { adancime: boolean; pas: boolean } => ({
    adancime: p !== undefined && inMargini(p.adancime, MARGINI_OPERATIE.adancime),
    pas: p !== undefined && inMargini(p.pas, MARGINI_OPERATIE.adancime),
  });
  const valid = diametruBun && operatii.every((o) => {
    const b = randBun(param[o.cheie]);
    return b.adancime && b.pas;
  });
  /**
   * Orice parametru schimbat face vechi rezultatul. Bifa nu mai trebuie ștearsă aici: cererea următoare e alt obiect, deci
   * vine oricum nebifată.
   */
  const schimbat = (): void => {
    onReseteaza();
  };
  const schimba = (id: string, p: Partial<Rand>): void => {
    schimbat();
    setParam((v) => {
      const vechi = v[id];
      return vechi ? { ...v, [id]: { ...vechi, ...p } } : v;
    });
  };
  const valori = (): Map<string, ValoriOperatie> => new Map(operatii.flatMap((o) => {
    const p = param[o.cheie];
    const adancime = p ? citesteNumar(p.adancime) : null;
    const pas = p ? citesteNumar(p.pas) : null;
    return p && adancime !== null && pas !== null ? [[o.cheie, { latura: p.latura, sens: p.sens, adancime, pas }] as const] : [];
  }));
  const fmtFreza = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 3 });

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-titlu">
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id="export-titlu">{t('export.titlu')}</h2>
        <div className="campuri">
          <label>
            {t('export.origine')}
            <select value={origine} data-camp="origine" onChange={(e) => { schimbat(); setOrigine(e.target.value as (typeof COLTURI)[number]); }}>
              {COLTURI.map((c) => <option key={c} value={c}>{t(CHEI_COLT[c])}</option>)}
            </select>
          </label>
          <label>
            {t('export.z0')}
            <select value={z0} data-camp="z0" onChange={(e) => { schimbat(); setZ0(e.target.value === 'jos' ? 'jos' : 'sus'); }}>
              <option value="sus">{t('export.z0.sus')}</option>
              <option value="jos">{t('export.z0.jos')}</option>
            </select>
          </label>
          <label>
            {t('export.freza')}
            <input type="text" inputMode="decimal" value={diametru} data-camp="diametru" disabled={doarCitire} aria-invalid={!diametruBun}
              onChange={(e) => { schimbat(); setDiametru(e.target.value); }} />
          </label>
        </div>
        {freze.length > 1 && (
          <p className="nota avertisment" data-testid="freze-diferite">
            {t(doarCitire ? 'export.freze-diferite.citire' : 'export.freze-diferite', {
              freze: freze.map((f) => `T${f.numar} Ø${fmtFreza.format(f.diametru)}`).join(', '),
            })}
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>{t('export.element')}</th><th>{t('export.latura')}</th><th title={t('export.sens.titlu')}>{t('export.sens')}</th>
              <th>{t('export.adancime')}</th><th>{t('export.pas')}</th>
            </tr>
          </thead>
          <tbody>
            {operatii.map((o) => {
              const p = param[o.cheie];
              if (!p) return null;
              const b = randBun(p);
              return (
                <tr key={o.cheie} data-operatie={o.cheie}>
                  <td>{o.descriere}</td>
                  <td>
                    <select value={p.latura} data-camp="latura" disabled={doarCitire} onChange={(ev) => { schimba(o.cheie, { latura: ev.target.value as Latura }); }}>
                      {LATURI.map((l) => <option key={l} value={l}>{t(CHEI_LATURA[l])}</option>)}
                    </select>
                  </td>
                  <td>
                    {/* Pe linie, scula taie ambii pereți: sensul nu schimbă materialul (ADR 0027 §3). */}
                    <select value={p.sens} data-camp="sens" disabled={doarCitire || p.latura === 'pe-linie'} title={t('export.sens.titlu')}
                      onChange={(ev) => { schimba(o.cheie, { sens: ev.target.value === 'opozitie' ? 'opozitie' : 'urcare' }); }}>
                      {SENSURI.map((s) => <option key={s} value={s}>{t(CHEI_SENS[s])}</option>)}
                    </select>
                  </td>
                  <td><input type="text" inputMode="decimal" value={p.adancime} disabled={doarCitire} aria-invalid={!b.adancime} onChange={(ev) => { schimba(o.cheie, { adancime: ev.target.value }); }} /></td>
                  <td><input type="text" inputMode="decimal" value={p.pas} disabled={doarCitire} aria-invalid={!b.pas} onChange={(ev) => { schimba(o.cheie, { pas: ev.target.value }); }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="nota">{t('export.regim')}</p>
        {!valid && <p role="status" className="avertisment" data-testid="export-invalid">{t('motiv.operatie-invalida')}</p>}
        {cere && (
          <div className="confirmare-iesire" data-testid="iesire-foaie" ref={cerereVizibila} tabIndex={-1}>
            <div role="alert">
              <p><strong>{t('export.iesire.titlu')}</strong> {laturi(cere.depasire, limba)}.</p>
              <p>{t('export.iesire.unde', { etichete: cere.elemente.map((id) => descrieri.get(id) ?? id).join('; ') })}</p>
            </div>
            <label>
              <input type="checkbox" checked={bifat} data-camp="confirma-iesire"
                onChange={(e) => { setConfirmata(e.target.checked ? cere : null); }} />
              {t('export.iesire.confirma')}
            </label>
          </div>
        )}
        <div className="butoane">
          <button type="button" disabled={!valid || (cere !== undefined && !bifat)} data-buton="exporta"
            title={valid ? undefined : t('motiv.operatie-invalida')}
            onClick={() => {
              const d = citesteNumar(diametru);
              if (!valid || d === null) return;
              onExporta({
                origine, z0, diametru: d, valori: valori(),
                ...(cere && bifat ? { confirmareIesire: cere } : {}),
              });
            }}>
            {t('export.exporta')}
          </button>
          <button type="button" onClick={onInchide}>{t('export.inchide')}</button>
        </div>
        {stare?.ok && <p role="status" data-testid="export-stare">{t('export.gata', { n: stare.linii, sha: stare.sha256 })}</p>}
        {stare && !stare.ok && !cere && <p role="status" className="avertisment" data-testid="export-stare">{t('export.eroare', { motiv: stare.motiv })}</p>}
      </div>
    </div>
  );
}
