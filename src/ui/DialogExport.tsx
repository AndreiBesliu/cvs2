import { Fragment, useEffect, useRef, useState } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { MARGINI_OPERATIE, type Depasire, type IesireFoaie, type ParametriExport } from './actiuniExportTipuri.ts';
import { citesteNumar, textNumar } from './numar.ts';
import { useLimba } from './useLimba.ts';

type Latura = 'exterior' | 'interior' | 'pe-linie';
/** Ce se schimbă dintr-o operație de profil în dialog; scula (freza) e comună tuturor, până la schimbarea sculei. */
/** Sensul de tăiere (ADR 0027): urcare = materialul păstrat în dreapta sensului de mers, cu axul M3. */
type Sens = 'urcare' | 'opozitie';
/** Urechile (ADR 0028): câte pe buclă, lungimea palierului pe traseul frezei, grosimea punții de la fața de jos (mm). */
export type UrechiOperatie = { readonly numar: number; readonly latime: number; readonly grosime: number };
/** Rampa (ADR 0029): lungimea în plan pe care coboară o trecere (mm). */
export type RampaOperatie = { readonly lungime: number };
export type ValoriOperatie = {
  readonly latura: Latura; readonly sens: Sens; readonly adancime: number; readonly pas: number; readonly urechi: UrechiOperatie | null;
  readonly rampa: RampaOperatie | null;
};

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

/** Urechile pornite sau nu; câmpurile lor rămân scrise și cu bifa scoasă, ca o bifă pusă la loc să nu le piardă. */
type Rand = {
  readonly latura: Latura; readonly sens: Sens; readonly adancime: string; readonly pas: string;
  readonly urechi: boolean; readonly numarUrechi: string; readonly latimeUreche: string; readonly grosimeUreche: string;
  readonly rampa: boolean; readonly lungimeRampa: string;
};

/** Lungimea cu care pornește bifa rampei pe un rând care n-avea (ADR 0029 §1). */
const RAMPA_IMPLICITA: RampaOperatie = { lungime: 10 };

/** Urechile cu care pornește bifa pe un rând care n-avea: cele ale plăcii 2 (ADR 0028 §1). */
const URECHI_IMPLICITE: UrechiOperatie = { numar: 4, latime: 8, grosime: 2 };

/** Un întreg între 1 și plafon (câte urechi pe buclă). */
function intregInMargini(s: string, plafon: number): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isInteger(x) && x >= 1 && x <= plafon;
}

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
  const dinDocument = (): Record<string, Rand> => Object.fromEntries(operatii.map((o) => {
    const u = o.valori.urechi ?? URECHI_IMPLICITE;
    return [o.cheie, {
      latura: o.valori.latura, sens: o.valori.sens, adancime: text(o.valori.adancime), pas: text(o.valori.pas),
      urechi: o.valori.urechi !== null, numarUrechi: text(u.numar), latimeUreche: text(u.latime), grosimeUreche: text(u.grosime),
      rampa: o.valori.rampa !== null, lungimeRampa: text((o.valori.rampa ?? RAMPA_IMPLICITA).lungime),
    }];
  }));
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
  // Câmpurile urechilor se judecă doar cu bifa pusă: oprite, nu intră în document.
  const randBun = (p: Rand | undefined): {
    adancime: boolean; pas: boolean; numar: boolean; latime: boolean; grosime: boolean; rampa: boolean;
  } => ({
    adancime: p !== undefined && inMargini(p.adancime, MARGINI_OPERATIE.adancime),
    pas: p !== undefined && inMargini(p.pas, MARGINI_OPERATIE.adancime),
    numar: p !== undefined && (!p.urechi || intregInMargini(p.numarUrechi, MARGINI_OPERATIE.urechi)),
    latime: p !== undefined && (!p.urechi || inMargini(p.latimeUreche, MARGINI_OPERATIE.latimeUreche)),
    grosime: p !== undefined && (!p.urechi || inMargini(p.grosimeUreche, MARGINI_OPERATIE.grosimeUreche)),
    rampa: p !== undefined && (!p.rampa || inMargini(p.lungimeRampa, MARGINI_OPERATIE.lungimeRampa)),
  });
  const randuri = operatii.map((o) => randBun(param[o.cheie]));
  const operatiiBune = diametruBun && randuri.every((b) => b.adancime && b.pas);
  const urechiBune = randuri.every((b) => b.numar && b.latime && b.grosime);
  const rampeBune = randuri.every((b) => b.rampa);
  const valid = operatiiBune && urechiBune && rampeBune;
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
    if (!p || adancime === null || pas === null) return [];
    const numar = citesteNumar(p.numarUrechi), latime = citesteNumar(p.latimeUreche), grosime = citesteNumar(p.grosimeUreche);
    if (p.urechi && (numar === null || latime === null || grosime === null)) return [];
    const urechi = p.urechi && numar !== null && latime !== null && grosime !== null ? { numar, latime, grosime } : null;
    const lungime = citesteNumar(p.lungimeRampa);
    if (p.rampa && lungime === null) return [];
    const rampa = p.rampa && lungime !== null ? { lungime } : null;
    return [[o.cheie, { latura: p.latura, sens: p.sens, adancime, pas, urechi, rampa }] as const];
  }));
  const fmtFreza = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 3 });
  // Motivul spune ce câmp e greșit: valorile operației, urechile, sau amândouă (recenzia feliei 2.4).
  const motivInvalid = [
    ...(operatiiBune ? [] : [t('motiv.operatie-invalida')]),
    ...(urechiBune ? [] : [t('motiv.urechi-invalide', {
      n: MARGINI_OPERATIE.urechi, latime: fmtFreza.format(MARGINI_OPERATIE.latimeUreche), grosime: fmtFreza.format(MARGINI_OPERATIE.grosimeUreche),
    })]),
    ...(rampeBune ? [] : [t('motiv.rampa-invalida', { lungime: fmtFreza.format(MARGINI_OPERATIE.lungimeRampa) })]),
  ].join(' ');

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
              <th title={t('export.urechi.titlu')}>{t('export.urechi')}</th>
              <th title={t('export.rampa.titlu')}>{t('export.rampa')}</th>
            </tr>
          </thead>
          <tbody>
            {operatii.map((o) => {
              const p = param[o.cheie];
              if (!p) return null;
              const b = randBun(p);
              return (
                <Fragment key={o.cheie}>
                <tr data-operatie={o.cheie}>
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
                  <td>
                    <input type="checkbox" checked={p.urechi} data-camp="urechi" disabled={doarCitire} aria-label={t('export.urechi')}
                      title={t('export.urechi.titlu')} onChange={(ev) => { schimba(o.cheie, { urechi: ev.target.checked }); }} />
                  </td>
                  <td>
                    <input type="checkbox" checked={p.rampa} data-camp="rampa" disabled={doarCitire} aria-label={t('export.rampa')}
                      title={t('export.rampa.titlu')} onChange={(ev) => { schimba(o.cheie, { rampa: ev.target.checked }); }} />
                  </td>
                </tr>
                {(p.urechi || p.rampa) && (
                  // Câmpurile urechilor și ale rampei, pe un rând al lor sub operație: tabelul rămâne îngust.
                  <tr className="detalii" data-detalii={o.cheie}>
                    <td />
                    <td colSpan={6}>
                      <div className="campuri-detalii">
                      {p.urechi && (
                      <div className="campuri-urechi" data-urechi={o.cheie}>
                      <label>
                        {t('export.urechi.numar')}
                        <input type="text" inputMode="numeric" value={p.numarUrechi} data-camp="urechi-numar" disabled={doarCitire}
                          aria-invalid={!b.numar} onChange={(ev) => { schimba(o.cheie, { numarUrechi: ev.target.value }); }} />
                      </label>
                      <label title={t('export.urechi.latime.titlu')}>
                        {t('export.urechi.latime')}
                        <input type="text" inputMode="decimal" value={p.latimeUreche} data-camp="urechi-latime" disabled={doarCitire}
                          aria-invalid={!b.latime} onChange={(ev) => { schimba(o.cheie, { latimeUreche: ev.target.value }); }} />
                      </label>
                      <label>
                        {t('export.urechi.grosime')}
                        <input type="text" inputMode="decimal" value={p.grosimeUreche} data-camp="urechi-grosime" disabled={doarCitire}
                          aria-invalid={!b.grosime} onChange={(ev) => { schimba(o.cheie, { grosimeUreche: ev.target.value }); }} />
                      </label>
                      </div>
                      )}
                      {p.rampa && (
                      <div className="campuri-rampa" data-rampa={o.cheie}>
                      <label title={t('export.rampa.lungime.titlu')}>
                        {t('export.rampa.lungime')}
                        <input type="text" inputMode="decimal" value={p.lungimeRampa} data-camp="rampa-lungime" disabled={doarCitire}
                          aria-invalid={!b.rampa} onChange={(ev) => { schimba(o.cheie, { lungimeRampa: ev.target.value }); }} />
                      </label>
                      </div>
                      )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <p className="nota">{t('export.regim')}</p>
        {!valid && <p role="status" className="avertisment" data-testid="export-invalid">{motivInvalid}</p>}
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
            title={valid ? undefined : motivInvalid}
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
