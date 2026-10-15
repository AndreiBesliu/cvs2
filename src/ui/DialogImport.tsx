import { useEffect, useRef } from 'react';
import '../i18n/import.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import {
  CODURI_AVERTISMENT, CODURI_ENTITATI, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz, type PrevizualizareImport,
} from './actiuniImport.ts';
import { useLimba } from './useLimba.ts';

const REFUZ: Readonly<Record<CodRefuz, CheieSimpla>> = {
  octeti: 'import.refuz.octeti', svgz: 'import.refuz.svgz', entitati: 'import.refuz.entitati', parsare: 'import.refuz.parsare',
  radacina: 'import.refuz.radacina', gol: 'import.refuz.gol', departe: 'import.refuz.departe', plafon: 'import.refuz.plafon',
  neincarcat: 'dialog.neincarcat', tip: 'import.refuz.tip',
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

function ListaAvertismente({ a }: { readonly a: Avertismente | undefined }) {
  const randuri = a ? CODURI_AVERTISMENT.filter((c) => a[c] > 0) : [];
  if (!a || randuri.length === 0) return null;
  return (
    <>
      <p>{t('import.avertismente')}</p>
      <ul className="avertisment" data-testid="import-avertismente">
        {randuri.map((c) => <li key={c} data-avertisment={c}>{t(AVERTISMENT[c], { n: a[c] })}</li>)}
      </ul>
    </>
  );
}

/** Textul unui refuz: codul ușii, cu detaliul lui tradus (entitățile, plafonul includerilor, mărimea fișierului). */
function textRefuz(cod: CodRefuz, detaliu: string | undefined): string {
  if (cod === 'entitati') {
    const motiv = (CODURI_ENTITATI as readonly string[]).includes(detaliu ?? '') ? ENTITATI[detaliu as CodEntitati] : 'import.entitati.valoare';
    return t('import.refuz.entitati', { motiv: t(motiv) });
  }
  if (cod === 'plafon' && detaliu === 'includeri') return t('import.refuz.includeri');
  if (cod === 'plafon' && detaliu === 'css') return t('import.refuz.css');
  return t(REFUZ[cod], { mb: (Number(detaliu ?? 0) / 1048576).toFixed(1) });
}

type Props = {
  readonly nume: string;
  /** Previzualizarea, sau `citire` cât se încarcă ușa și se citește fișierul. */
  readonly stare: PrevizualizareImport | 'citire';
  readonly pxPeTol: 96 | 72;
  /** `pxPeTol` = 72 a fost ales după comentariul Illustrator din fișier. */
  readonly pxAutomat: boolean;
  /** Se recitește cu alt px: previzualizarea de pe ecran e cea veche, deci „Importă” așteaptă. */
  readonly seRecitesc: boolean;
  /** De ce nu se poate importa (plafonul, ușa documentului, fila care doar citește), sau null. */
  readonly motiv: CheieSimpla | null;
  readonly onPx: (px: 96 | 72) => void;
  readonly onImporta: () => void;
  readonly onInchide: () => void;
  /** Mai multe fișiere lăsate deodată (felia 2.8b): al câtelea e acesta; „Renunță” le închide pe toate. */
  readonly coada?: { readonly k: number; readonly n: number };
  /** Trece la fișierul următor fără să-l importe pe acesta. */
  readonly onSari?: () => void;
};

/**
 * Dialogul importului SVG (ADR 0035 §9, ADR 0037 §12): ce ar adăuga „Importă”, înainte de a schimba documentul. Mărimea
 * desenului, contururile închise pe laturi, căile deschise (tăiate pe linie) cu nota grosimii liniei, alegerea px-ului
 * când contează și raportul.
 */
export function DialogImport({ nume, stare, pxPeTol, pxAutomat, seRecitesc, motiv, onPx, onImporta, onInchide, coada, onSari }: Props) {
  useLimba();
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
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="import-titlu">
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id="import-titlu">
          {t('import.titlu', { nume })}
          {coada && <span data-testid="import-coada">{' '}{t('import.coada', { k: coada.k, n: coada.n })}</span>}
        </h2>
        {stare === 'citire' && <p role="status">{t('import.citeste')}</p>}
        {stare !== 'citire' && !stare.ok && (
          <>
            <p role="alert" className="avertisment" data-testid="import-refuz">{textRefuz(stare.cod, stare.detaliu)}</p>
            <ListaAvertismente a={stare.avertismente} />
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
            {ok.px && (
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
            <ListaAvertismente a={ok.avertismente} />
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
