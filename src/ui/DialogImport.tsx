import { useEffect, useRef } from 'react';
import '../i18n/import.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { CODURI_AVERTISMENT_DXF, UNITATI_DXF } from '../io/dxfCoduri.ts';
import { formatImport } from '../io/formatImport.ts';
import { CODURI_AVERTISMENT_PDF } from '../io/pdfCoduri.ts';
import {
  CODURI_AVERTISMENT, CODURI_ENTITATI, type Avertismente, type AvertismenteDxf, type AvertismentePdf, type CodAvertisment, type CodAvertismentDxf,
  type CodAvertismentPdf, type CodEntitati, type CodRefuzImport, type FormatImport, type PrevizualizareImport, type UnitateDxf,
} from './actiuniImport.ts';
import { useLimba } from './useLimba.ts';

const REFUZ: Readonly<Record<CodRefuzImport, CheieSimpla>> = {
  octeti: 'import.refuz.octeti', svgz: 'import.refuz.svgz', entitati: 'import.refuz.entitati', parsare: 'import.refuz.parsare',
  radacina: 'import.refuz.radacina', gol: 'import.refuz.gol', departe: 'import.refuz.departe', plafon: 'import.refuz.plafon',
  neincarcat: 'dialog.neincarcat', tip: 'import.refuz.tip', binar: 'import.refuz.binar', dxf: 'import.refuz.dxf',
  'nu-e-pdf': 'import.pdf.nu-e-pdf', 'ai-vechi': 'import.pdf.ai-vechi', criptat: 'import.pdf.criptat', pdf: 'import.pdf.pdf',
  pagina: 'import.pdf.pagina-lipsa',
};

/** Motivul refuzului entităților, tradus din codul ușii: niciun text din fișier nu ajunge în interfață. */
const ENTITATI: Readonly<Record<CodEntitati, CheieSimpla>> = {
  parametru: 'import.entitati.parametru', 'fara-nume': 'import.entitati.fara-nume', externa: 'import.entitati.externa',
  neterminata: 'import.entitati.neterminata', valoare: 'import.entitati.valoare', numar: 'import.entitati.numar',
  expansiune: 'import.entitati.expansiune', attlist: 'import.entitati.attlist',
};

const AVERTISMENT = {
  deschise: 'import.av.deschise', degenerate: 'import.av.degenerate', 'prea-mari': 'import.av.prea-mari',
  'sarit-text': 'import.av.sarit-text', 'sarit-use': 'import.av.sarit-use', 'sarit-image': 'import.av.sarit-image',
  'sarit-foreignObject': 'import.av.sarit-foreignObject', 'sarit-svg': 'import.av.sarit-svg', ascunse: 'import.av.ascunse',
  'eroare-date': 'import.av.eroare-date', 'atribut-invalid': 'import.av.atribut-invalid',
  'transformare-invalida': 'import.av.transformare-invalida', singulara: 'import.av.singulara',
  'arce-eliptice': 'import.av.arce-eliptice', 'arce-plate': 'import.av.arce-plate', 'cubice-din-arce': 'import.av.cubice-din-arce',
  'nonzero-normalizate': 'import.av.nonzero-normalizate', 'nonzero-refuzate': 'import.av.nonzero-refuzate', 'pagina-fara-marime': 'import.av.pagina-fara-marime', 'viewbox-invalid': 'import.av.viewbox-invalid',
  'transformare-radacina': 'import.av.transformare-radacina', stil: 'import.av.stil',
  'inchise-de-umplere': 'import.av.inchise-de-umplere', 'inchise-la-usa': 'import.av.inchise-la-usa',
  'sub-rezolutie': 'import.av.sub-rezolutie',
} as const satisfies Readonly<Record<CodAvertisment, string>>;

/** Raportul ușii DXF (ADR 0101 §9), cod cu cod. */
const AVERTISMENT_DXF = {
  'unitati-nedeclarate': 'import.dxf.unitati-nedeclarate', 'unitati-necunoscute': 'import.dxf.unitati-necunoscute',
  'deschise': 'import.dxf.deschise', 'unite': 'import.dxf.unite', 'goluri': 'import.dxf.goluri', 'degenerate': 'import.dxf.degenerate',
  'sub-rezolutie': 'import.dxf.sub-rezolutie', 'prea-mari': 'import.dxf.prea-mari', 'ascunse': 'import.dxf.ascunse',
  'hartie': 'import.dxf.hartie', 'sarit-text': 'import.dxf.sarit-text', 'sarit-hasura': 'import.dxf.sarit-hasura',
  'sarit-cota': 'import.dxf.sarit-cota', 'sarit-punct': 'import.dxf.sarit-punct', 'sarit-3d': 'import.dxf.sarit-3d',
  'sarit-imagine': 'import.dxf.sarit-imagine', 'sarit-altele': 'import.dxf.sarit-altele', 'inclinate': 'import.dxf.inclinate',
  'proiectate': 'import.dxf.proiectate', 'blocuri-lipsa': 'import.dxf.blocuri-lipsa', 'blocuri-adanci': 'import.dxf.blocuri-adanci',
  'xref': 'import.dxf.xref', 'singulare': 'import.dxf.singulare', 'arce-eliptice': 'import.dxf.arce-eliptice',
  'arce-plate': 'import.dxf.arce-plate', 'cubice-din-arce': 'import.dxf.cubice-din-arce',
  'spline-aproximate': 'import.dxf.spline-aproximate', 'spline-fara-control': 'import.dxf.spline-fara-control',
  'spline-invalide': 'import.dxf.spline-invalide', 'eroare-date': 'import.dxf.eroare-date',
} as const satisfies Readonly<Record<CodAvertismentDxf, string>>;

/** Raportul ușii PDF (ADR 0104 §6), cod cu cod. */
const AVERTISMENT_PDF = {
  deschise: 'import.pdf.deschise', degenerate: 'import.pdf.degenerate', 'prea-mari': 'import.pdf.prea-mari',
  'sub-rezolutie': 'import.pdf.sub-rezolutie', 'sarit-text': 'import.pdf.sarit-text', 'sarit-imagine': 'import.pdf.sarit-imagine',
  'sarit-umbrire': 'import.pdf.sarit-umbrire', decupaje: 'import.pdf.decupaje', nepictate: 'import.pdf.nepictate',
  ascunse: 'import.pdf.ascunse', 'inchise-de-umplere': 'import.pdf.inchise-de-umplere', 'inchise-la-usa': 'import.pdf.inchise-la-usa',
  'nonzero-normalizate': 'import.pdf.nonzero-normalizate', 'nonzero-refuzate': 'import.pdf.nonzero-refuzate',
  'forme-adanci': 'import.pdf.forme-adanci', 'fluxuri-stricate': 'import.pdf.fluxuri-stricate', 'xref-reconstruit': 'import.pdf.xref-reconstruit',
} as const satisfies Readonly<Record<CodAvertismentPdf, string>>;

/** Câte straturi numește dialogul (un PDF poate avea sute): restul, „…”; un nume lung (scris de fișier) se taie. */
const STRATURI_ARATATE = 8;
const NUME_STRAT_ARATAT = 60;
const numeStrat = (s: string): string => (s.length > NUME_STRAT_ARATAT ? `${s.slice(0, NUME_STRAT_ARATAT)}…` : s);

/** Unitățile de ales pentru un DXF care nu și le declară, cu numele lor. */
const UNITATE = {
  mm: 'import.unitati.mm', cm: 'import.unitati.cm', m: 'import.unitati.m', inch: 'import.unitati.inch', ft: 'import.unitati.ft',
} as const satisfies Readonly<Record<UnitateDxf, CheieSimpla>>;

/** Raportul ușii care a citit fișierul, în ordinea codurilor ei. */
function ListaAvertismente({ a, format }: {
  readonly a: Avertismente | AvertismenteDxf | AvertismentePdf | undefined; readonly format: FormatImport | undefined;
}) {
  const randuri: ReadonlyArray<{ readonly cod: string; readonly text: string }> = !a ? [] : format === 'dxf'
    ? CODURI_AVERTISMENT_DXF.filter((c) => ((a as AvertismenteDxf)[c] ?? 0) > 0).map((c) => ({ cod: c, text: t(AVERTISMENT_DXF[c], { n: (a as AvertismenteDxf)[c] }) }))
    : format === 'pdf'
      ? CODURI_AVERTISMENT_PDF.filter((c) => ((a as AvertismentePdf)[c] ?? 0) > 0).map((c) => ({ cod: c, text: t(AVERTISMENT_PDF[c], { n: (a as AvertismentePdf)[c] }) }))
      : CODURI_AVERTISMENT.filter((c) => ((a as Avertismente)[c] ?? 0) > 0).map((c) => ({ cod: c, text: t(AVERTISMENT[c], { n: (a as Avertismente)[c] }) }));
  if (randuri.length === 0) return null;
  return (
    <>
      <p>{t('import.avertismente')}</p>
      <ul className="avertisment" data-testid="import-avertismente">
        {randuri.map((r) => <li key={r.cod} data-avertisment={r.cod}>{r.text}</li>)}
      </ul>
    </>
  );
}

/**
 * Textul unui refuz: codul ușii, cu detaliul lui tradus (entitățile, plafonul includerilor, mărimea fișierului). `nume`:
 * fișierul (o eroare de citire a unui DXF sau PDF nu spune „nu e un SVG”; un AI fără conținut PDF își primește sfatul).
 */
function textRefuz(cod: CodRefuzImport, detaliu: string | undefined, nume: string, format: FormatImport | undefined): string {
  if (cod === 'parsare' && formatImport(nume, '') !== 'svg' && format !== 'svg') return t('import.refuz.citire');
  if (cod === 'gol' && format === 'pdf') return t(/\.ai$/i.test(nume) ? 'import.pdf.gol-ai' : 'import.pdf.gol');
  if (cod === 'plafon' && detaliu === 'decodare') return t('import.pdf.decodare');
  if (cod === 'entitati') {
    const motiv = (CODURI_ENTITATI as readonly string[]).includes(detaliu ?? '') ? ENTITATI[detaliu as CodEntitati] : 'import.entitati.valoare';
    return t('import.refuz.entitati', { motiv: t(motiv) });
  }
  if (cod === 'plafon' && detaliu === 'includeri') return t('import.refuz.includeri');
  if (cod === 'plafon' && detaliu === 'css') return t('import.refuz.css');
  if (cod === 'dxf') return t('import.refuz.dxf', { linie: detaliu ?? '?' });
  return t(REFUZ[cod], { mb: (Number(detaliu ?? 0) / 1048576).toFixed(1) });
}

type Props = {
  readonly nume: string;
  /** Previzualizarea, sau `citire` cât se încarcă ușa și se citește fișierul. */
  readonly stare: PrevizualizareImport | 'citire';
  readonly pxPeTol: 96 | 72;
  /** `pxPeTol` = 72 a fost ales după comentariul Illustrator din fișier. */
  readonly pxAutomat: boolean;
  /** Unitatea aleasă pentru un DXF care nu și le declară (ADR 0101 §2). */
  readonly unitate: UnitateDxf;
  /** Pagina citită dintr-un PDF (de la 1, ADR 0104 §7). */
  readonly pagina: number;
  /** Se recitește cu altă alegere: previzualizarea de pe ecran e cea veche, deci „Importă” așteaptă. */
  readonly seRecitesc: boolean;
  /** De ce nu se poate importa (plafonul, ușa documentului, fila care doar citește), sau null. */
  readonly motiv: CheieSimpla | null;
  readonly onPx: (px: 96 | 72) => void;
  readonly onUnitate: (u: UnitateDxf) => void;
  readonly onPagina: (pagina: number) => void;
  readonly onImporta: () => void;
  readonly onInchide: () => void;
  /** Mai multe fișiere lăsate deodată (felia 2.8b): al câtelea e acesta; „Renunță” le închide pe toate. */
  readonly coada?: { readonly k: number; readonly n: number };
  /** Trece la fișierul următor fără să-l importe pe acesta. */
  readonly onSari?: () => void;
};

/**
 * Dialogul importului SVG (ADR 0035 §9, ADR 0037 §12), DXF (ADR 0101 §8) și PDF / AI (ADR 0104 §7): ce ar adăuga
 * „Importă”, înainte de a schimba documentul. Mărimea desenului, contururile închise pe laturi, căile deschise (tăiate pe
 * linie) cu nota grosimii liniei, alegerea px-ului (SVG), a unităților (un DXF care nu și le declară) sau a paginii (un PDF
 * cu mai multe; și după un refuz, fiindcă o pagină poate fi goală) când contează, straturile unui PDF și raportul.
 */
export function DialogImport({
  nume, stare, pxPeTol, pxAutomat, unitate, pagina, seRecitesc, motiv, onPx, onUnitate, onPagina, onImporta, onInchide, coada, onSari,
}: Props) {
  const limba = useLimba();
  const mm = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumSignificantDigits: 12 });
  const cutie = useRef<HTMLDivElement>(null);
  useEffect(() => { cutie.current?.focus(); }, []);
  // Escape închide dialogul oriunde ar fi focusul (și când a căzut pe pagină; recenzia 2.7c).
  const inchide = useRef(onInchide);
  inchide.current = onInchide;
  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => { if (e.key === 'Escape') inchide.current(); };
    document.addEventListener('keydown', tasta);
    return () => { document.removeEventListener('keydown', tasta); };
  }, []);
  const ok = stare !== 'citire' && stare.ok ? stare : null;
  // Paginile unui PDF citit până la lista lor (și refuzat după aceea): peste una, alegerea paginii.
  const pagini = stare === 'citire' ? 0 : stare.ok ? (stare.format === 'pdf' ? stare.pagini : 0) : (stare.pagini ?? 0);
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="import-titlu">
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id="import-titlu">
          {t('import.titlu', { nume })}
          {coada && <span data-testid="import-coada">{' '}{t('import.coada', { k: coada.k, n: coada.n })}</span>}
        </h2>
        {stare === 'citire' && <p role="status">{t('import.citeste')}</p>}
        {pagini > 1 && (
          <div className="campuri">
            <label>
              {t('import.pdf.pagina', { n: pagini })}
              <select value={pagina} data-camp="pagina" onChange={(e) => { onPagina(Number(e.target.value)); }}>
                {Array.from({ length: pagini }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}
              </select>
            </label>
          </div>
        )}
        {stare !== 'citire' && !stare.ok && (
          <>
            <p role="alert" className="avertisment" data-testid="import-refuz">{textRefuz(stare.cod, stare.detaliu, nume, stare.format)}</p>
            <ListaAvertismente a={stare.avertismente} format={stare.format} />
          </>
        )}
        {ok && (
          <>
            <p data-testid="import-marime">{t('import.marime', { latime: ok.latime.toFixed(2), inaltime: ok.inaltime.toFixed(2) })}</p>
            {(ok.exterioare + ok.interioare > 0 || ok.deschise === 0) && (
              <p data-testid="import-cai">{t('import.cai', { n: ok.exterioare + ok.interioare, exterioare: ok.exterioare, interioare: ok.interioare })}</p>
            )}
            {/* Căile deschise (ADR 0037 §12): câte, cum se taie, și nota grosimii liniei (nu se citește din fișier). */}
            {ok.deschise > 0 && (
              <>
                <p data-testid="import-deschise">{t('import.deschise', { n: ok.deschise })}</p>
                <p data-testid="import-grosime-linie">{t('import.grosime-linie')}</p>
              </>
            )}
            {ok.format === 'dxf' && (ok.unitati.declarate ? (
              <p data-testid="import-unitati">
                {t('import.unitati.declarate', { unitate: ok.unitati.unitate ? t(UNITATE[ok.unitati.unitate]) : t('import.unitati.alta', { mm: mm.format(ok.unitati.mmPeUnitate) }) })}
              </p>
            ) : (
              <div className="campuri">
                <label>
                  {t('import.unitati')}
                  <select value={unitate} data-camp="unitate" onChange={(e) => { onUnitate(UNITATI_DXF.find((u) => u === e.target.value) ?? 'mm'); }}>
                    {UNITATI_DXF.map((u) => <option key={u} value={u}>{t(UNITATE[u])}</option>)}
                  </select>
                </label>
                <p data-testid="import-unitati">{t('import.unitati.nedeclarate')}</p>
              </div>
            ))}
            {ok.format === 'pdf' && ok.straturi.length > 0 && (
              <p data-testid="import-straturi">
                {t('import.pdf.straturi', {
                  n: ok.straturi.length,
                  straturi: ok.straturi.slice(0, STRATURI_ARATATE).map(numeStrat).join(', ') + (ok.straturi.length > STRATURI_ARATATE ? ', …' : ''),
                })}
              </p>
            )}
            {ok.format === 'svg' && ok.px && (
              <div className="campuri">
                <label>
                  {t('import.px')}
                  <select value={pxPeTol} data-camp="px" onChange={(e) => { onPx(e.target.value === '72' ? 72 : 96); }}>
                    <option value={96}>{t('import.px.96')}</option>
                    <option value={72}>{t('import.px.72')}</option>
                  </select>
                </label>
                {pxAutomat && pxPeTol === 72 && <p>{t('import.px.illustrator')}</p>}
              </div>
            )}
            <ListaAvertismente a={ok.avertismente} format={ok.format} />
          </>
        )}
        {ok && motiv && <p role="status" className="avertisment" data-testid="import-motiv">{t(motiv)}</p>}
        <div className="butoane">
          {ok && (
            <button type="button" disabled={motiv !== null || seRecitesc} title={motiv ? t(motiv) : undefined} data-buton="importa"
              onClick={(e) => { if (e.detail <= 1) onImporta(); }}>
              {t('import.importa')}
            </button>
          )}
          {stare !== 'citire' && !stare.ok && stare.cod === 'neincarcat' && (
            <button type="button" onClick={() => { window.location.reload(); }}>{t('eroare.reincarca')}</button>
          )}
          {/* Al doilea clic al unui dublu-clic cade pe butonul fișierului următor, în același loc: se ignoră (recenzia A). */}
          {coada && onSari && <button type="button" data-buton="sari" onClick={(e) => { if (e.detail <= 1) onSari(); }}>{t('import.sari')}</button>}
          <button type="button" data-buton="renunta" onClick={onInchide}>{t(coada ? 'import.renunta-toate' : 'import.renunta')}</button>
        </div>
      </div>
    </div>
  );
}
