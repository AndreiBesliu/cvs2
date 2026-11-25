import { type ReactNode } from 'react';
import '../i18n/export.ts';
// Durata în cuvinte (`durata.*`) stă în dicționarul traseului, comun cu cipul timpului de lângă traseu (ADR 0046 §8).
import '../i18n/traseu.ts';
import { t } from '../i18n/t.ts';
import { laturiOferite, MARGINI_OPERATIE, susLaMicron } from './actiuniExportTipuri.ts';
import { citesteNumar } from './numar.ts';
import { grupuriOperatie, type GrupExport } from './exportGrupuri.ts';
import { coborareDesen, treceriEgale } from './exportDeseneCalcul.ts';
import {
  DesenAdancime, DesenBanda, DesenCoborare, DesenDopDrept, DesenFreza, DesenFund, DesenGaurire, DesenGolire, DesenIncrustatie,
  DesenIntrari, DesenLocasDrept, DesenRampa, DesenRest, DesenSens, DesenTreapta, DesenUrechi, type DesenComun,
} from './exportDesene.tsx';
import { Card, Cartonase, GrupCartonase, Poza } from './exportPoze.tsx';
import {
  bandaBuna, bandaRand, CHEI_LATURA, CHEI_SENS, faraNumar, FELURI_COBORARE, inMargini, jocFolosit, margineBuna, SENSURI,
  spatiuFolosit, URECHI_IMPLICITE, type BunRand, type FrezaOferita, type Latura, type OperatieExport, type OrigineFreza, type Rand,
  type UndeFreza,
} from './exportRand.ts';

/** Pseudo-rândul cu care se cer frezele drepte (fundul plat, frezele de rest, dopul, decuparea benzii): doar frezele plate. */
export const RAND_DREPT: Pick<Rand, 'tip' | 'latura'> = { tip: 'buzunar', latura: 'interior' };

/**
 * Lista „Din frezele mele” a unei freze (ADR 0300 §4; a operației din 16.A↑b-3, cele în plus din 16.A↑b-5): „Scrisă de mână”,
 * frezele oferite și, dacă freza din document nu mai e printre ele (alt fel, ștearsă), ea însăși. Fără freze oferite și fără
 * origine, nimic. `eticheta`: cu numele listei în față (la frezele de rest, doar ca etichetă pentru cititorul de ecran).
 */
export function ListaBiblioteca(props: {
  readonly 'data-camp': string; readonly oferite: readonly FrezaOferita[]; readonly origine: OrigineFreza | null | undefined;
  readonly oprit: boolean; readonly eticheta?: boolean; readonly onAlege: (f: FrezaOferita) => void; readonly onMana: () => void;
}): ReactNode {
  const { oferite, origine, oprit, eticheta = true, onAlege, onMana } = props;
  if (oferite.length === 0 && !origine) return null;
  const lista = (
    <select value={origine?.biblioteca.id ?? ''} data-camp={props['data-camp']} disabled={oprit} aria-label={t('export.freza.biblioteca')}
      title={t('export.freza.biblioteca.titlu')} onChange={(ev) => {
        const f = oferite.find((x) => x.id === ev.target.value);
        if (f) onAlege(f);
        else onMana();
      }}>
      <option value="">{t('export.freza.de-mana')}</option>
      {oferite.map((f) => <option key={f.id} value={f.id}>{f.nume}</option>)}
      {origine && !oferite.some((f) => f.id === origine.biblioteca.id) ? <option value={origine.biblioteca.id}>{origine.nume}</option> : null}
    </select>
  );
  return eticheta ? <label className="freza-biblioteca" title={t('export.freza.biblioteca.titlu')}>{t('export.freza.biblioteca')}{lista}</label> : lista;
}

/**
 * Fișa unei operații în fereastra exportului (ADR 0290, felia 28.8↑f-3): titlul, locul în ordinea tăierii, grupurile felului ei
 * (fiecare cu desenul, explicația, câmpurile și greșelile lui) și greșelile rămase fără grup. E o componentă de sine stătătoare:
 * fereastra exportului o pune una sub alta, iar Clasicul (28.2↑) și Pas cu pas (28.4↑) o pot pune în panoul lor, cu același
 * context. Starea (rândurile, verificările, schimbarea) rămâne a celui care o folosește și intră prin `ContextFisa`.
 */

/** Ce îi dă fișei cel care o arată: rândurile și starea lor, verificările, schimbarea, formatele, grupul și frezele de rest. */
export interface ContextFisa {
  /** Operația fiecărei chei și rândul ei de câmpuri (textele scrise de om). */
  readonly dupaCheie: ReadonlyMap<string, OperatieExport>;
  readonly param: Readonly<Record<string, Rand>>;
  /** Câte operații sunt în ordinea tăierii („a N-a din M”). */
  readonly total: number;
  readonly doarCitire: boolean;
  readonly schimba: (id: string, p: Partial<Rand>) => void;
  readonly randBun: (p: Rand | undefined) => BunRand;
  readonly greseliRand: (cheie: string) => ReadonlyArray<readonly [string, GrupExport]>;
  /** Un T cu două freze diferite (numărul și cele două diametre scrise), dacă e. */
  readonly conflict: readonly [number, ReadonlyMap<string, string>] | undefined;
  readonly treceri: (p: Rand) => readonly [number | null, number];
  readonly taieturaRand: (p: Rand) => Latura | 'buzunar' | 'gaurire' | 'vcarve' | 'incrustatie' | 'incrustatie-drept';
  readonly text: (x: number) => string;
  readonly fmtFreza: Intl.NumberFormat;
  readonly fmtTrecere: Intl.NumberFormat;
  readonly grosimeFoaie: number | undefined;
  readonly supracursaCitita: number | null;
  readonly cuSupracursa: boolean;
  readonly onAlegeUrechi: ((cheie: string, urechi: { readonly numar: number; readonly latime: number; readonly grosime: number }) => void) | undefined;
  /** Frezele de rest ale buzunarului, ale fundului plat sau ale dopului, ca listă de câmpuri (cu listele lor „Din frezele mele”). */
  readonly frezeRest: (cheie: string, p: Rand, fel: 'buzunar' | 'fund' | 'dop', oprit: boolean) => ReactNode;
  /** Grupul unei întrebări: desenul și explicația în stânga, câmpurile și greșelile în dreapta (comun cu foaia și mașina). */
  readonly grup: (id: GrupExport, fisa: string, corp: ReactNode, greseli?: readonly string[], desen?: (c: DesenComun) => ReactNode) => ReactNode;
  /** Frezele din „Frezele mele” care merg pe tăietura rândului (ADR 0300 §4, felia 16.A↑b-3); lipsă = fără listă. */
  readonly frezeOferite: ((r: Pick<Rand, 'tip' | 'latura'>) => readonly FrezaOferita[]) | undefined;
  /**
   * Freza aleasă din listă pe locul dat al rândului (lipsă: freza operației): T-ul, Ø-ul, pașii, originea și, la freza operației,
   * forma (ADR 0300 §4, felia 16.A↑b-5).
   */
  readonly alegeFreza: (cheie: string, f: FrezaOferita, unde?: UndeFreza) => void;
}

export function FisaOperatie({ cheie, loc, c: ctx }: { readonly cheie: string; readonly loc: number; readonly c: ContextFisa }): ReactNode {
  const {
    dupaCheie, param, total, doarCitire, schimba, randBun, greseliRand, conflict, treceri, taieturaRand, text, fmtFreza, fmtTrecere, grosimeFoaie,
    supracursaCitita, cuSupracursa, onAlegeUrechi, frezeRest, grup, frezeOferite, alegeFreza,
  } = ctx;
  const o = dupaCheie.get(cheie);
  const p = o ? param[o.cheie] : undefined;
  if (!o || !p) return null;
  const b = randBun(p);
  // Rândul are căi deschise (ADR 0037 §12): doar pe linie, fără urechi, rampă, intrări și degajări, cu motivul în titlu.
  const deschis = o.deschise > 0;
  // Pe un buzunar (ADR 0069 §1) și pe o găurire (ADR 0087 §1), ce e al profilului e oprit, cu motivul în titlu, ca pe
  // o cale deschisă.
  const buz = p.tip === 'buzunar', gaura = p.tip === 'gaurire', vc = p.tip === 'vcarve', nuProfil = buz || gaura || vc;
  const titluDeschis = deschis ? t('export.deschise.titlu') : buz ? t('export.buzunar.nu-se-aplica') : gaura ? t('export.gaurire.nu-se-aplica')
    : vc ? t('export.vcarve.nu-se-aplica') : undefined;
  const greseli = greseliRand(o.cheie);
  // Frezele din „Frezele mele” care merg pe tăietura rândului (ADR 0300 §4, felia 16.A↑b-3).
  const oferite = frezeOferite ? frezeOferite(p) : [];
  // Frezele drepte, pentru frezele în plus ale rândului (ADR 0300 §4, felia 16.A↑b-5).
  const drepte = frezeOferite ? frezeOferite(RAND_DREPT) : [];
  const aici = (g: GrupExport): string[] => greseli.filter(([, x]) => x === g).map(([m]) => m);
  const grupuri = grupuriOperatie({
    tip: p.tip, deschis, inele: p.strategie === 'inele', incrustatie: vc && p.incrustatie, banda: vc && p.incrustatie && p.jurDop === 'banda',
    incrustatieDreapta: buz && p.incrustatieDreapta,
  });
  // Desenul fiecărei întrebări (ADR 0290, felia 28.8↑b), din valorile rândului; grupurile fără desen încă, doar explicația.
  const adancimeRand = buz && p.incrustatieDreapta && p.locasInc === 'gaura' && grosimeFoaie !== undefined ? grosimeFoaie : citesteNumar(p.adancime);
  const desen = (g: GrupExport): ((c: DesenComun) => ReactNode) | undefined => {
    switch (g) {
      case 'freza': return (c) => <DesenFreza c={c} numar={p.numarScula} diametru={citesteNumar(p.diametruScula)} v={p.formaScula === 'v'}
        unghi={citesteNumar(p.unghiV)} varfPlat={citesteNumar(p.varfV)} />;
      case 'adancime': return (c) => <DesenAdancime c={c} adancime={adancimeRand} pas={citesteNumar(p.pas)} grosime={grosimeFoaie}
        supracursa={cuSupracursa ? supracursaCitita ?? 0 : 0} />;
      case 'sens': return () => <DesenSens sens={p.sens}
        fel={p.tip !== 'profil' || p.latura === 'interior' ? 'gaura' : p.latura} />;
      case 'rampa': return (c) => <DesenRampa c={c} rampa={p.rampa && !nuProfil} lungime={citesteNumar(p.lungimeRampa)} adancime={adancimeRand} pas={citesteNumar(p.pas)} />;
      case 'intrari': return (c) => <DesenIntrari c={c} intrari={p.intrari && p.latura !== 'pe-linie' && !nuProfil} raza={citesteNumar(p.razaIntrare)} />;
      case 'golire': return (c) => <DesenGolire c={c} diametru={citesteNumar(p.diametruScula)} pas={citesteNumar(p.pasLateral)}
        paralel={p.strategie === 'paralel'} unghi={citesteNumar(p.unghiParalel)} />;
      case 'coborare': return (c) => <DesenCoborare c={c} fel={p.coborare} bun={b.coborare} trecere={treceriEgale(adancimeRand, citesteNumar(p.pas))?.d ?? null}
        unghi={citesteNumar(p.unghiCoborare)} lungime={citesteNumar(p.lungimeZigzag)} raza={citesteNumar(p.razaElice)} />;
      case 'rest': return (c) => <DesenRest c={c} diametru={citesteNumar(p.diametruScula)} rest={p.rest.map((x) => citesteNumar(x.diametru))} />;
      case 'gaurire': return (c) => <DesenGaurire c={c} adancime={adancimeRand} pas={citesteNumar(p.pas)} retragere={citesteNumar(p.retragereCompleta)} />;
      case 'fund': return (c) => <DesenFund c={c} adancime={citesteNumar(p.adancime)} unghi={citesteNumar(p.unghiV)} fundPlat={p.fundPlat}
        diametruFund={citesteNumar(p.diametruSculaFund)} incrustatie={p.incrustatie} joc={citesteNumar(p.jocInc)} />;
      case 'incrustatie': return (c) => <DesenIncrustatie c={c} adancime={citesteNumar(p.adancime)} unghi={citesteNumar(p.unghiV)}
        joc={citesteNumar(p.jocInc)} fierastrau={citesteNumar(p.acelasiSpatiu ? p.jocInc : p.fierastrauInc)} margine={citesteNumar(p.margineInc)} />;
      case 'banda': return (c) => <DesenBanda c={c} adancime={citesteNumar(p.adancime)} unghi={citesteNumar(p.unghiV)} joc={citesteNumar(p.jocInc)}
        fierastrau={citesteNumar(p.acelasiSpatiu ? p.jocInc : p.fierastrauInc)} latime={p.latimeBanda.trim() === '' ? null : citesteNumar(p.latimeBanda)}
        decupare={p.decupareBanda} placa={p.placaBanda.trim() === '' ? null : citesteNumar(p.placaBanda)} puntiGrosime={citesteNumar(p.grosimePunti)}
        fund={p.fundPlat ? citesteNumar(p.diametruSculaFund) : 0} frezaDecupare={p.frezaBanda ? citesteNumar(p.diametruSculaBanda) : null} />;
      case 'locas': return (c) => <DesenLocasDrept c={c} adancime={adancimeRand} gaura={p.locasInc === 'gaura'} lateral={citesteNumar(p.lateralInc)} />;
      case 'treapta': return (c) => <DesenTreapta c={c} adancime={adancimeRand} gaura={p.locasInc === 'gaura'} treapta={p.treaptaInc}
        d={citesteNumar(p.adancimeTreapta)} s={citesteNumar(p.latimeTreapta)} />;
      case 'dop': return (c) => <DesenDopDrept c={c} adancime={adancimeRand} gaura={p.locasInc === 'gaura'} dop={p.dopInc} sprijin={p.sprijinInc}
        joc={citesteNumar(p.jocInc)} fierastrau={citesteNumar(p.fierastrauInc)} treapta={p.treaptaInc} d={citesteNumar(p.adancimeTreapta)}
        s={citesteNumar(p.latimeTreapta)} />;
      case 'urechi': return (c) => <DesenUrechi c={c} urechi={p.urechi && !nuProfil} mod={p.modUrechi} numar={citesteNumar(p.numarUrechi)}
        alese={o.valori.urechi?.alese ?? 0} latime={citesteNumar(p.latimeUreche)} grosime={citesteNumar(p.grosimeUreche)} grosimeFoaie={grosimeFoaie} />;
      default: return undefined;
    }
  };
  const corp = (g: GrupExport): ReactNode => {
    switch (g) {
      case 'taietura': return (<div className="dx-rand">
        {/* Buzunarul (ADR 0069), V-carve-ul și incrustațiile sunt alte tăieturi, doar pe un rând cu contururi închise; găurirea
            (ADR 0087), doar pe un rând numai cu cercuri (altfel oprită, cu motivul). */}
        <Cartonase data-camp="latura" poze="latura" eticheta={t('export.latura')} nume={`latura-${o.cheie}`} valoare={taieturaRand(p)}
          oprit={doarCitire} titlu={deschis ? t('export.latura.deschise.titlu') : undefined}
          onAlege={(v) => {
            // Incrustația (ADR 0170) e un V-carve care își declară dopul, cu freza dreaptă pusă (fața dopului o cere); cea
            // cu pereți drepți (ADR 0171), un buzunar care își declară dopul.
            const fara = { incrustatie: false, incrustatieDreapta: false } as const;
            schimba(o.cheie, v === 'incrustatie' ? { ...fara, tip: 'vcarve', incrustatie: true, fundPlat: true }
              : v === 'incrustatie-drept' ? { ...fara, tip: 'buzunar', incrustatieDreapta: true }
                : v === 'buzunar' || v === 'gaurire' || v === 'vcarve' ? { ...fara, tip: v } : { ...fara, tip: 'profil', latura: v });
          }}
          variante={[
            ...laturiOferite(o.deschise, o.noduri, p.latura).map((l) => ({ v: l, text: t(CHEI_LATURA[l]), nota: t(`export.card.latura.${l}`) })),
            ...(deschis ? [] : [
              { v: 'buzunar' as const, text: t(CHEI_LATURA.buzunar), nota: t('export.card.latura.buzunar') },
              { v: 'gaurire' as const, text: t('export.latura.gaurire'), nota: t('export.card.latura.gaurire'),
                motiv: o.cercuri === true ? undefined : t('export.card.latura.cercuri') },
              { v: 'vcarve' as const, text: t('export.latura.vcarve'), nota: t('export.card.latura.vcarve') },
              { v: 'incrustatie' as const, text: t('export.latura.incrustatie'), nota: t('export.card.latura.incrustatie') },
              { v: 'incrustatie-drept' as const, text: t('export.latura.incrustatie-drept'), nota: t('export.card.latura.incrustatie-drept') },
            ]),
          ]} />
        {/* Pe linie, direcția (ADR 0092 §4): ca desenul, invers sau cel mai scurt drum. */}
        {p.tip === 'profil' && p.latura === 'pe-linie' && (
        <Cartonase data-camp="directie" poze="directie" eticheta={t('export.directie')} nume={`directie-${o.cheie}`} valoare={p.directie}
          oprit={doarCitire} titlu={t('export.directie.titlu')} onAlege={(v) => { schimba(o.cheie, { directie: v }); }}
          variante={[{ v: '', text: t('export.directie.desen') }, { v: 'invers', text: t('export.directie.invers') }, { v: 'scurt', text: t('export.directie.scurt') }]} />
        )}
        {/* Despărțirea foii (ADR 0037 §8): doar pe un rând cu căi deschise; o marchează omul, aplicația n-o ghicește. */}
        {deschis && (
        <label className="alegere cu-poza" title={t('export.despartire.titlu')}>
          <input type="checkbox" checked={p.despartire} data-camp="despartire" disabled={doarCitire} aria-label={t('export.despartire')}
            onChange={(ev) => { schimba(o.cheie, { despartire: ev.target.checked }); }} />
          <Poza k="despartire" />
          {t('export.despartire')}
        </label>
        )}
        {titluDeschis !== undefined && <p className="nota" data-nota="nu-se-aplica">{titluDeschis}</p>}
      </div>);
      case 'freza': return (<div className="dx-rand">
        {/* Freza din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-3): doar cele care merg pe tăietura rândului. */}
        <ListaBiblioteca data-camp="freza-biblioteca" oferite={oferite} origine={p.origineScula} oprit={doarCitire}
          onAlege={(f) => { alegeFreza(o.cheie, f); }} onMana={() => { schimba(o.cheie, { origineScula: null }); }} />
        <label title={t('export.freza.titlu')}>
          {t('export.freza.numar')}
          <input type="text" inputMode="numeric" value={p.numarScula} data-camp="scula" disabled={doarCitire} aria-label={t('export.freza.numar')}
            aria-invalid={!b.scula || conflict !== undefined} className="numar-scula" onChange={(ev) => { schimba(o.cheie, { numarScula: ev.target.value }); }} />
        </label>
        <label title={t('export.freza.titlu')}>
          {t('export.freza.diametru')}
          <input type="text" inputMode="decimal" value={p.diametruScula} data-camp="diametru" disabled={doarCitire} aria-label={t('export.freza.diametru')}
            aria-invalid={!b.scula || conflict !== undefined} onChange={(ev) => { schimba(o.cheie, { diametruScula: ev.target.value, origineScula: null }); }} />
        </label>
        {/* Forma frezei (ADR 0090): plată sau în V, cu unghiul inclus. */}
        <label>
          {t('export.freza.forma')}
          <select value={p.formaScula} data-camp="forma-scula" disabled={doarCitire} aria-label={t('export.freza.forma')}
            aria-invalid={!b.vcarve || !b.vPeLinie} onChange={(ev) => { schimba(o.cheie, { formaScula: ev.target.value === 'v' ? 'v' : 'plata', origineScula: null }); }}>
            <option value="plata">{t('export.freza.plata')}</option>
            <option value="v">{t('export.freza.v')}</option>
          </select>
        </label>
        {p.formaScula === 'v' && (
        <label>
          {t('export.freza.unghi')}
          <input type="text" inputMode="decimal" value={p.unghiV} data-camp="unghi-v" disabled={doarCitire} aria-label={t('export.freza.unghi')}
            title={t('export.freza.unghi')} className="unghi-v" aria-invalid={!b.scula} onChange={(ev) => { schimba(o.cheie, { unghiV: ev.target.value, origineScula: null }); }} />
        </label>
        )}
        {/* Vârful plat (ADR 0092): freza de gravare; 0 = ascuțit. */}
        {p.formaScula === 'v' && (
        <label>
          {t('export.freza.varf')}
          <input type="text" inputMode="decimal" value={p.varfV} data-camp="varf-v" disabled={doarCitire} aria-label={t('export.freza.varf')}
            title={t('export.freza.varf.titlu')} className="unghi-v" aria-invalid={!b.varf} onChange={(ev) => { schimba(o.cheie, { varfV: ev.target.value, origineScula: null }); }} />
        </label>
        )}
      </div>);
      case 'adancime': return (<div className="dx-rand">
          {vc && <p className="nota-vcarve" data-vcarve={o.cheie}>{t('export.vcarve.nota')}</p>}
        <label>
          {t('export.adancime')}
      {buz && p.incrustatieDreapta && p.locasInc === 'gaura' ? (
      <input type="text" inputMode="decimal" value={grosimeFoaie !== undefined ? text(grosimeFoaie) : p.adancime} data-camp="adancime" disabled
        title={t('export.incrustatie-drept.gaura.adancime.titlu')} />
      ) : (
      <input type="text" inputMode="decimal" value={p.adancime} data-camp="adancime" disabled={doarCitire} aria-invalid={!b.adancime} onChange={(ev) => { schimba(o.cheie, { adancime: ev.target.value }); }} />
      )}
        </label>
        <label>
          {t('export.pas')}
          <input type="text" inputMode="decimal" value={p.pas} data-camp="pas" disabled={doarCitire} aria-invalid={!b.pas} onChange={(ev) => { schimba(o.cheie, { pas: ev.target.value }); }} />
        </label>
        {((n, d) => n !== null && <span className="nota-camp" data-treceri>{t('export.treceri', { n, mm: fmtTrecere.format(d) })}</span>)(...treceri(p))}
      </div>);
      case 'sens': return (<div className="dx-rand">
        {/* Pe linie, scula taie ambii pereți: sensul nu schimbă materialul (ADR 0027 §3). */}
        <label title={t('export.sens.titlu')}>
          {t('export.sens')}
          <select value={p.sens} data-camp="sens" disabled={doarCitire || p.latura === 'pe-linie'} title={t('export.sens.titlu')}
            onChange={(ev) => { schimba(o.cheie, { sens: ev.target.value === 'opozitie' ? 'opozitie' : 'urcare' }); }}>
            {SENSURI.map((s) => <option key={s} value={s}>{t(CHEI_SENS[s])}</option>)}
          </select>
        </label>
      </div>);
      case 'rampa': return (<div className="dx-rand">
        <label className="alegere" title={t('export.rampa.titlu')}>
          <input type="checkbox" checked={p.rampa && !nuProfil} data-camp="rampa" disabled={doarCitire || deschis || nuProfil} aria-label={t('export.rampa')}
            onChange={(ev) => { schimba(o.cheie, { rampa: ev.target.checked }); }} />
          {t('export.rampa')}
        </label>
          {p.rampa && !nuProfil && (
          <div className="campuri-rampa" data-rampa={o.cheie}>
          <label title={t('export.rampa.lungime.titlu')}>
            {t('export.rampa.lungime')}
            <input type="text" inputMode="decimal" value={p.lungimeRampa} data-camp="rampa-lungime" disabled={doarCitire}
              aria-invalid={!b.rampa} onChange={(ev) => { schimba(o.cheie, { lungimeRampa: ev.target.value }); }} />
          </label>
          {p.intrari && p.latura !== 'pe-linie' && (
            // ADR 0031 §7: cu intrări, rampa coboară pe sfertul intrării.
            <span className="nota" data-nota="rampa-pe-intrare">{t('export.rampa.peIntrare')}</span>
          )}
          </div>
          )}
      </div>);
      case 'intrari': return (<div className="dx-rand">
        {/* Pe linie, freza taie ambii pereți: nu există parte de deșeu pentru intrare (ADR 0030 §6). */}
        <label className="alegere" title={t('export.intrari.titlu')}>
          <input type="checkbox" checked={p.intrari && p.latura !== 'pe-linie' && !nuProfil} data-camp="intrari"
            disabled={doarCitire || deschis || nuProfil || p.latura === 'pe-linie'}
            aria-label={t('export.intrari')} onChange={(ev) => { schimba(o.cheie, { intrari: ev.target.checked }); }} />
          {t('export.intrari')}
        </label>
          {p.intrari && p.latura !== 'pe-linie' && !nuProfil && (
          <div className="campuri-intrari" data-intrari={o.cheie}>
          <label title={t('export.intrari.raza.titlu')}>
            {t('export.intrari.raza')}
            <input type="text" inputMode="decimal" value={p.razaIntrare} data-camp="intrari-raza" disabled={doarCitire}
              aria-invalid={!b.intrari} onChange={(ev) => { schimba(o.cheie, { razaIntrare: ev.target.value }); }} />
          </label>
          </div>
          )}
      </div>);
      case 'colturi': return (<div className="dx-rand">
        {/* Pe linie, nu există parte de deșeu pentru degajare (ADR 0032 §6). */}
        <Cartonase data-camp="colturi" poze="colturi" eticheta={t('export.colturi')} nume={`colturi-${o.cheie}`}
          valoare={p.latura === 'pe-linie' || nuProfil ? '' : p.colturi} titlu={t('export.colturi.titlu')}
          oprit={doarCitire || deschis || nuProfil || p.latura === 'pe-linie'} onAlege={(v) => { schimba(o.cheie, { colturi: v }); }}
          variante={[{ v: '', text: t('export.colturi.rotunde'), nota: t('export.card.colturi.fara') },
            { v: 'dog-bone', text: t('export.colturi.dog-bone'), nota: t('export.card.colturi.dog-bone') },
            { v: 't-bone', text: t('export.colturi.t-bone'), nota: t('export.card.colturi.t-bone') }]} />
        {p.latura === 'pe-linie' && <p className="nota" data-nota="colturi-linie">{t('export.card.colturi.linie')}</p>}
      </div>);
      case 'urechi': return (<div className="dx-rand">
        <label className="alegere" title={t('export.urechi.titlu')}>
          <input type="checkbox" checked={p.urechi && !nuProfil} data-camp="urechi" disabled={doarCitire || deschis || nuProfil} aria-label={t('export.urechi')}
            onChange={(ev) => { schimba(o.cheie, { urechi: ev.target.checked }); }} />
          {t('export.urechi')}
        </label>
          {p.urechi && !nuProfil && (
          <div className="campuri-urechi" data-urechi={o.cheie}>
          <label>
            {t('export.urechi.numar')}
            <input type="text" inputMode="numeric" value={p.numarUrechi} data-camp="urechi-numar" disabled={doarCitire || faraNumar(p.modUrechi)}
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
          {/* Locurile (ADR 0211): la distanțe egale, sau alese pe desen, în modul pânzei („Gata” te aduce înapoi aici). */}
          {/* Locurile (ADR 0211): la distanțe egale, alese pe desen (în modul pânzei; „Gata” te aduce înapoi aici), unde ține
              de lemn (cere o parte de deșeu, deci nu pe linie) sau după reguli, pe laturile drepte ale drumului frezei. */}
          <div className="locuri-urechi">
            <span className="dx-eticheta">{t('export.urechi.locuri')}</span>
            <GrupCartonase eticheta={t('export.urechi.locuri')} data-alegere="urechi-locuri">
              <Card data-camp="urechi-egale" poze="urechi" nume={`urechi-locuri-${o.cheie}`} oprit={doarCitire} ales={p.modUrechi === 'egale'}
                x={{ v: 'egale' as const, text: t('export.urechi.locuri.egale') }} onAlege={(v) => { schimba(o.cheie, { modUrechi: v }); }} />
              <Card data-camp="urechi-lungi" poze="urechi" nume={`urechi-locuri-${o.cheie}`} oprit={doarCitire} ales={p.modUrechi === 'lungi'}
                x={{ v: 'lungi' as const, text: t('export.urechi.locuri.lungi'), titlu: t('export.urechi.locuri.laturi.titlu') }}
                onAlege={(v) => { schimba(o.cheie, { modUrechi: v }); }} />
              <Card data-camp="urechi-scurte" poze="urechi" nume={`urechi-locuri-${o.cheie}`} oprit={doarCitire} ales={p.modUrechi === 'scurte'}
                x={{ v: 'scurte' as const, text: t('export.urechi.locuri.scurte'), titlu: t('export.urechi.locuri.laturi.titlu') }}
                onAlege={(v) => { schimba(o.cheie, { modUrechi: v }); }} />
              <Card data-camp="urechi-mijloc" poze="urechi" nume={`urechi-locuri-${o.cheie}`} oprit={doarCitire} ales={p.modUrechi === 'mijloc'}
                x={{ v: 'mijloc' as const, text: t('export.urechi.locuri.mijloc'), titlu: t('export.urechi.locuri.laturi.titlu') }}
                onAlege={(v) => { schimba(o.cheie, { modUrechi: v }); }} />
              <Card data-camp="urechi-alese" poze="urechi" nume={`urechi-locuri-${o.cheie}`} oprit={doarCitire} ales={p.modUrechi === 'alese'}
                x={{ v: 'alese' as const, text: t('export.urechi.locuri.alese') }} onAlege={(v) => { schimba(o.cheie, { modUrechi: v }); }} />
              <Card data-camp="urechi-lemn" poze="urechi" nume={`urechi-locuri-${o.cheie}`} oprit={doarCitire} ales={p.modUrechi === 'lemn'}
                x={{ v: 'lemn' as const, text: t('export.urechi.locuri.lemn'), titlu: t('export.urechi.locuri.lemn.titlu'),
                  motiv: p.latura === 'pe-linie' ? t('export.card.urechi.linie') : undefined }}
                onAlege={(v) => { schimba(o.cheie, { modUrechi: v }); }} />
            </GrupCartonase>
          </div>
          {p.modUrechi === 'lemn' && <span className="nota" data-nota="urechi-lemn">{t('export.urechi.lemn')}</span>}
          {(p.modUrechi === 'lungi' || p.modUrechi === 'scurte') && <span className="nota" data-nota="urechi-laturi">{t('export.urechi.laturi')}</span>}
          {p.modUrechi === 'mijloc' && <span className="nota" data-nota="urechi-mijloc">{t('export.urechi.mijloc')}</span>}
          {p.modUrechi === 'alese' && (<>
            <button type="button" data-buton="urechi-alege" disabled={doarCitire || !onAlegeUrechi || !b.latime || !b.grosime}
              onClick={() => {
                const latime = citesteNumar(p.latimeUreche), grosime = citesteNumar(p.grosimeUreche);
                if (latime === null || grosime === null) return;
                onAlegeUrechi?.(o.cheie, { numar: o.valori.urechi?.numar ?? URECHI_IMPLICITE.numar, latime, grosime });
              }}>
              {t('export.urechi.alege')}
            </button>
            <span className="nota" data-nota="urechi-alese">{t('export.urechi.alese', { n: o.valori.urechi?.alese ?? 0 })}</span>
          </>)}
          </div>
          )}
      </div>);
      case 'golire': return (<div className="dx-rand">
          {buz && (
          <div className="campuri-buzunar" data-buzunar={o.cheie}>
          {/* Strategia (ADR 0094): inelele sau liniile paralele, cu unghiul lor; apoi pasul lateral, comun. */}
          <Cartonase data-camp="strategie" poze="golire" eticheta={t('export.paralel')} nume={`golire-${o.cheie}`} valoare={p.strategie}
            oprit={doarCitire} titlu={t('export.paralel.titlu')} onAlege={(v) => { schimba(o.cheie, { strategie: v }); }}
            variante={[{ v: 'inele', text: t('export.paralel.inele'), nota: t('export.card.golire.inele') },
              { v: 'paralel', text: t('export.paralel.linii'), nota: t('export.card.golire.paralel') }]} />
          <label title={t('export.pas-lateral.titlu')}>
            {t('export.pas-lateral')}
            <input type="text" inputMode="decimal" value={p.pasLateral} data-camp="pas-lateral" disabled={doarCitire}
              aria-invalid={!b.pasLateral} onChange={(ev) => { schimba(o.cheie, { pasLateral: ev.target.value }); }} />
          </label>
          {p.strategie === 'paralel' && (
          <label title={t('export.paralel.unghi.titlu')}>
            {t('export.paralel.unghi')}
            <input type="text" inputMode="decimal" value={p.unghiParalel} data-camp="unghi-paralel" disabled={doarCitire}
              aria-invalid={!b.strategie} onChange={(ev) => { schimba(o.cheie, { unghiParalel: ev.target.value }); }} />
          </label>
          )}
          </div>
          )}
      </div>);
      case 'coborare': return (<div className="dx-rand">
          {buz && (<>
          {/* Coborârea în buzunar (ADR 0076): felul, apoi câmpurile lui; strategia paralelă coboară prin plonjare. */}
          {p.strategie === 'inele' && (<>
          <Cartonase data-camp="coborare" poze="coborare" eticheta={t('export.coborare')} nume={`coborare-${o.cheie}`} valoare={p.coborare}
            oprit={doarCitire} titlu={t('export.coborare.titlu')} onAlege={(v) => { schimba(o.cheie, { coborare: v }); }}
            variante={FELURI_COBORARE.map((f) => ({ v: f, text: t(`export.coborare.${f}`), nota: t(`export.card.coborare.${f}`) }))} />
          {p.coborare !== 'plonjare' && (
          <label title={t('export.coborare.unghi.titlu')}>
            {t('export.coborare.unghi')}
            <input type="text" inputMode="decimal" value={p.unghiCoborare} data-camp="unghi-coborare" disabled={doarCitire}
              aria-invalid={!b.coborare && !inMargini(p.unghiCoborare, MARGINI_OPERATIE.unghiCoborare, MARGINI_OPERATIE.unghiCoborareMinim)}
              onChange={(ev) => { schimba(o.cheie, { unghiCoborare: ev.target.value }); }} />
          </label>
          )}
          {p.coborare === 'zigzag' && (
          <label title={t('export.coborare.lungime.titlu')}>
            {t('export.coborare.lungime')}
            <input type="text" inputMode="decimal" value={p.lungimeZigzag} data-camp="lungime-zigzag" disabled={doarCitire}
              aria-invalid={!inMargini(p.lungimeZigzag, MARGINI_OPERATIE.lungimeZigzag, MARGINI_OPERATIE.lungimeZigzagMinima)}
              onChange={(ev) => { schimba(o.cheie, { lungimeZigzag: ev.target.value }); }} />
          </label>
          )}
          {p.coborare === 'zigzag' && (() => {
            // Câte rampe face zigzagul pe o trecere, cum le va tăia lucrarea: pe trecerea egală (adâncimea / n), nu pe pasul
            // scris (10 mm cu pasul 6 = două treceri de 5).
            const z = coborareDesen('zigzag', treceriEgale(adancimeRand, citesteNumar(p.pas))?.d ?? null, citesteNumar(p.unghiCoborare),
              citesteNumar(p.lungimeZigzag), null);
            if (z?.fel !== 'zigzag') return null;
            return <span className="nota-coborare" data-camp="rampe-zigzag">{t('export.coborare.rampe', { n: z.rampe })}</span>;
          })()}
          {p.coborare === 'elice' && (
          <label title={t('export.coborare.raza.titlu')}>
            {t('export.coborare.raza')}
            <input type="text" inputMode="decimal" value={p.razaElice} data-camp="raza-elice" disabled={doarCitire}
              aria-invalid={!inMargini(p.razaElice, MARGINI_OPERATIE.razaElice, MARGINI_OPERATIE.razaEliceMinima)}
              onChange={(ev) => { schimba(o.cheie, { razaElice: ev.target.value }); }} />
          </label>
          )}
          </>)}
          </>)}
      </div>);
      case 'rest': return (<div className="dx-rand">
        {buz && (<>
          {frezeRest(o.cheie, p, 'buzunar', doarCitire)}
        </>)}
      </div>);
      case 'gaurire': return (<div className="dx-rand">
          {/* Găurirea (ADR 0087): pasul e cât coboară freza între două retrageri; aici, când iese din gaură. */}
          {gaura && (
          <div className="campuri-gaurire" data-gaurire={o.cheie}>
          <label title={t('export.gaurire.retragere.titlu')}>
            {t('export.gaurire.retragere')}
            <input type="text" inputMode="numeric" value={p.retragereCompleta} data-camp="retragere" disabled={doarCitire}
              aria-invalid={!b.retragere} onChange={(ev) => { schimba(o.cheie, { retragereCompleta: ev.target.value }); }} />
          </label>
          </div>
          )}
      </div>);
      case 'fund': return (<div className="dx-rand">
          {vc && (
          <div className="campuri-fund" data-fund={o.cheie}>
          <label title={t('export.fund.titlu')}>
            <input type="checkbox" checked={p.fundPlat} data-camp="fund-plat" disabled={doarCitire}
              onChange={(ev) => { schimba(o.cheie, { fundPlat: ev.target.checked }); }} />
            {t('export.fund')}
          </label>
          {/* Freza dreaptă din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-5): doar frezele plate. */}
          <ListaBiblioteca data-camp="fund-biblioteca" oferite={drepte} origine={p.origineFund} oprit={doarCitire || !p.fundPlat}
            onAlege={(f) => { alegeFreza(o.cheie, f, 'fund'); }} onMana={() => { schimba(o.cheie, { origineFund: null }); }} />
          <label>
            {t('export.freza.numar')}
            <input type="text" inputMode="numeric" value={p.numarSculaFund} data-camp="fund-scula" disabled={doarCitire || !p.fundPlat}
              aria-invalid={p.fundPlat && (!b.fund || conflict !== undefined)} onChange={(ev) => { schimba(o.cheie, { numarSculaFund: ev.target.value }); }} />
          </label>
          <label>
            {t('export.freza.diametru')}
            <input type="text" inputMode="decimal" value={p.diametruSculaFund} data-camp="fund-diametru" disabled={doarCitire || !p.fundPlat}
              aria-invalid={p.fundPlat && (!b.fund || conflict !== undefined)} onChange={(ev) => { schimba(o.cheie, { diametruSculaFund: ev.target.value, origineFund: null }); }} />
          </label>
          <label title={t('export.fund.pas.titlu')}>
            {t('export.pas-lateral')}
            <input type="text" inputMode="decimal" value={p.pasLateralFund} data-camp="fund-pas" disabled={doarCitire || !p.fundPlat}
              aria-invalid={p.fundPlat && !b.fund} onChange={(ev) => { schimba(o.cheie, { pasLateralFund: ev.target.value }); }} />
          </label>
          {frezeRest(o.cheie, p, 'fund', doarCitire || !p.fundPlat)}
          </div>
          )}
      </div>);
      case 'incrustatie': case 'banda': return g === 'incrustatie' ? (<div className="dx-rand">
          {/* Incrustația (ADR 0170 §5): jocul pentru clei, spațiul pentru fierăstrău (sau același, răspunsul 3) și marginea
              dopului; dopul iese în fișierul lui, oglindit, pe semifabricatul lui. */}
          {vc && p.incrustatie && (
          <div className="campuri-incrustatie" data-incrustatie={o.cheie}>
          <label title={t('export.incrustatie.joc.titlu')}>
            {t('export.incrustatie.joc')}
            <input type="text" inputMode="decimal" value={p.jocInc} data-camp="inc-joc" disabled={doarCitire}
              aria-invalid={!b.incrustatie} onChange={(ev) => { schimba(o.cheie, { jocInc: ev.target.value }); }} />
          </label>
          <label title={t('export.incrustatie.acelasi.titlu')}>
            <input type="checkbox" checked={p.acelasiSpatiu} data-camp="inc-acelasi" disabled={doarCitire}
              onChange={(ev) => { schimba(o.cheie, { acelasiSpatiu: ev.target.checked }); }} />
            {t('export.incrustatie.acelasi')}
          </label>
          <label title={t('export.incrustatie.fierastrau.titlu')}>
            {t('export.incrustatie.fierastrau')}
            <input type="text" inputMode="decimal" value={p.acelasiSpatiu ? p.jocInc : p.fierastrauInc} data-camp="inc-fierastrau"
              disabled={doarCitire || p.acelasiSpatiu} aria-invalid={!b.incrustatie}
              onChange={(ev) => { schimba(o.cheie, { fierastrauInc: ev.target.value }); }} />
          </label>
          <label title={t('export.incrustatie.margine.titlu')}>
            {t('export.incrustatie.margine')}
            <input type="text" inputMode="decimal" value={p.margineInc} data-camp="inc-margine" disabled={doarCitire}
              aria-invalid={!b.incrustatie} onChange={(ev) => { schimba(o.cheie, { margineInc: ev.target.value }); }} />
          </label>
          {/* Lemnul din jurul dopului (ADR 0172): fața coborâtă sau banda îngustă, cu valorile ei, fiecare la alegerea omului. */}
          <Cartonase data-camp="inc-jur" poze="jur" eticheta={t('export.banda.jur')} nume={`jur-${o.cheie}`} valoare={p.jurDop}
            oprit={doarCitire} titlu={t('export.banda.jur.titlu')} onAlege={(v) => { schimba(o.cheie, { jurDop: v }); }}
            variante={[{ v: 'fata', text: t('export.banda.jur.fata'), nota: t('export.card.jur.fata') },
              { v: 'banda', text: t('export.banda.jur.banda'), nota: t('export.card.jur.banda') }]} />
          {/* Fără freză dreaptă (ADR 0173), nota spune că fundul îl fac inelele frezei V. */}
          <p className="nota-incrustatie" data-fund={p.fundPlat ? 'plat' : 'v'}>
            {t(p.jurDop === 'banda' ? (p.fundPlat ? 'export.banda.nota' : 'export.banda.nota-v') : (p.fundPlat ? 'export.incrustatie.nota' : 'export.incrustatie.nota-v'))}
          </p>
          </div>
          )}
      </div>) : (<div className="dx-rand">
          {/* Banda (ADR 0172, felia 28.8↑d-2): lățimea, decuparea, placa, punțile și freza ei, în grupul lor. */}
          {vc && p.incrustatie && p.jurDop === 'banda' && (
          <div className="campuri-incrustatie" data-banda={o.cheie}>
          {((v, ok) => (<>
          <label title={t('export.banda.latime.titlu')}>
            {t('export.banda.latime')}
            <input type="text" inputMode="decimal" value={p.latimeBanda} data-camp="banda-latime" disabled={doarCitire}
              placeholder={v?.minima != null ? fmtFreza.format(susLaMicron(v.minima)) : ''}
              aria-invalid={!ok.latime} onChange={(ev) => { schimba(o.cheie, { latimeBanda: ev.target.value }); }} />
            {v?.minima != null && <span className="nota-camp" data-camp="banda-minima">{t('export.banda.minima', { mm: fmtFreza.format(susLaMicron(v.minima)) })}</span>}
          </label>
          <label title={t('export.banda.decupare.titlu')}>
            <input type="checkbox" checked={p.decupareBanda} data-camp="banda-decupare" disabled={doarCitire}
              onChange={(ev) => { schimba(o.cheie, { decupareBanda: ev.target.checked }); }} />
            {t('export.banda.decupare')}
          </label>
          <label title={t('export.banda.placa.titlu')}>
            {t('export.banda.placa')}
            <input type="text" inputMode="decimal" value={p.placaBanda} data-camp="banda-placa" disabled={doarCitire || !p.decupareBanda}
              placeholder={v ? fmtFreza.format(v.placaImplicita) : ''}
              aria-invalid={!ok.placa} onChange={(ev) => { schimba(o.cheie, { placaBanda: ev.target.value }); }} />
            {p.decupareBanda && v?.placaMinima != null && <span className="nota-camp" data-camp="banda-placa-minima">{t('export.banda.placa.minima', { mm: fmtFreza.format(susLaMicron(v.placaMinima)) })}</span>}
          </label>
          <label title={t('export.banda.punti.numar.titlu')}>
            {t('export.banda.punti.numar')}
            <input type="text" inputMode="numeric" value={p.numarPunti} data-camp="banda-punti-numar" disabled={doarCitire || !p.decupareBanda}
              aria-invalid={!ok.punti} onChange={(ev) => { schimba(o.cheie, { numarPunti: ev.target.value }); }} />
          </label>
          <label title={t('export.banda.punti.latime.titlu')}>
            {t('export.banda.punti.latime')}
            <input type="text" inputMode="decimal" value={p.latimePunti} data-camp="banda-punti-latime" disabled={doarCitire || !p.decupareBanda}
              aria-invalid={!ok.punti} onChange={(ev) => { schimba(o.cheie, { latimePunti: ev.target.value }); }} />
          </label>
          <label title={t('export.banda.punti.grosime.titlu')}>
            {t('export.banda.punti.grosime')}
            <input type="text" inputMode="decimal" value={p.grosimePunti} data-camp="banda-punti-grosime" disabled={doarCitire || !p.decupareBanda}
              aria-invalid={!ok.punti} onChange={(ev) => { schimba(o.cheie, { grosimePunti: ev.target.value }); }} />
          </label>
          <label title={t('export.banda.freza.titlu')}>
            <input type="checkbox" checked={p.frezaBanda} data-camp="banda-freza" disabled={doarCitire || !p.decupareBanda}
              aria-invalid={!ok.freza && !p.frezaBanda} onChange={(ev) => { schimba(o.cheie, { frezaBanda: ev.target.checked }); }} />
            {t('export.banda.freza')}
          </label>
          {p.frezaBanda && (<>
          <ListaBiblioteca data-camp="banda-biblioteca" oferite={drepte} origine={p.origineBanda} oprit={doarCitire || !p.decupareBanda}
            onAlege={(f) => { alegeFreza(o.cheie, f, 'banda'); }} onMana={() => { schimba(o.cheie, { origineBanda: null }); }} />
          <label>
            {t('export.freza.numar')}
            <input type="text" inputMode="numeric" value={p.numarSculaBanda} data-camp="banda-scula" className="numar-scula" disabled={doarCitire || !p.decupareBanda}
              aria-invalid={!ok.freza || conflict !== undefined} onChange={(ev) => { schimba(o.cheie, { numarSculaBanda: ev.target.value }); }} />
          </label>
          <label>
            {t('export.freza.diametru')}
            <input type="text" inputMode="decimal" value={p.diametruSculaBanda} data-camp="banda-diametru" disabled={doarCitire || !p.decupareBanda}
              aria-invalid={!ok.freza || conflict !== undefined} onChange={(ev) => { schimba(o.cheie, { diametruSculaBanda: ev.target.value, origineBanda: null }); }} />
          </label>
          </>)}
          </>))(bandaRand(p), bandaBuna(p))}
          </div>
          )}
      </div>);
      case 'locas': case 'treapta': case 'dop': {
        // Incrustația cu pereți drepți (ADR 0171 §5, ADR 0175; felia 28.8↑e-1): fiecare întrebare în grupul ei, cu alegerile
        // pe cartonașe. Cutia fiecărui grup păstrează `data-incrustatie` și `data-fel`, ca până acum.
        if (!(buz && p.incrustatieDreapta)) return null;
        const cutie = (copii: ReactNode): ReactNode => (
          <div className="dx-rand"><div className="campuri-incrustatie" data-incrustatie={o.cheie} data-fel="drept">{copii}</div></div>
        );
        if (g === 'locas') return cutie(<>
          {/* Locașul (ADR 0175): buzunarul sau gaura prin foaie; la gaură, dopul ridicat stă pe față (n-are fund). */}
          <Cartonase data-camp="inc-locas" poze="locas" eticheta={t('export.incrustatie-drept.locas')} nume={`locas-${o.cheie}`} valoare={p.locasInc}
            oprit={doarCitire} titlu={t('export.incrustatie-drept.locas.titlu')}
            onAlege={(locasInc) => {
              schimba(o.cheie, { locasInc, ...(locasInc === 'gaura' && p.sprijinInc === 'fund' ? { sprijinInc: p.treaptaInc === 'fara' ? 'fata' : 'umar' } : {}) });
            }}
            variante={[{ v: 'buzunar', text: t('export.incrustatie-drept.locas.buzunar'), nota: t('export.card.locas.buzunar') },
              { v: 'gaura', text: t('export.incrustatie-drept.locas.gaura'), nota: t('export.card.locas.gaura') }]} />
          <label title={t('export.incrustatie-drept.lateral.titlu')}>
            {t('export.incrustatie-drept.lateral')}
            <input type="text" inputMode="decimal" value={p.lateralInc} data-camp="inc-lateral" disabled={doarCitire}
              aria-invalid={!inMargini(p.lateralInc, MARGINI_OPERATIE.adancime)} onChange={(ev) => { schimba(o.cheie, { lateralInc: ev.target.value }); }} />
          </label>
        </>);
        if (g === 'treapta') return cutie(<>
          {/* Treapta (ADR 0175 §5): umărul locașului, cu adâncimea și lățimea lui (ascunse fără treaptă; valorile rămân în
              rând). Sprijinul se mută odată cu ea: cu treaptă, pe umăr; fără ea, de pe umăr pe fund (la gaură, pe față). */}
          <Cartonase data-camp="inc-treapta" poze="treapta" eticheta={t('export.incrustatie-drept.treapta')} nume={`treapta-${o.cheie}`}
            valoare={p.treaptaInc} oprit={doarCitire} titlu={t('export.incrustatie-drept.treapta.titlu')}
            onAlege={(treaptaInc) => {
              const sprijinInc = treaptaInc === 'fara'
                ? (p.sprijinInc === 'umar' ? (p.locasInc === 'gaura' ? 'fata' : 'fund') : p.sprijinInc)
                : (p.treaptaInc === 'fara' || p.sprijinInc === 'fata' ? 'umar' : p.sprijinInc);
              schimba(o.cheie, { treaptaInc, sprijinInc });
            }}
            variante={[{ v: 'fara', text: t('export.incrustatie-drept.treapta.fara'), nota: t('export.card.treapta.fara') },
              { v: 'interior', text: t('export.incrustatie-drept.treapta.interior'), nota: t('export.card.treapta.interior') },
              { v: 'exterior', text: t('export.incrustatie-drept.treapta.exterior'), nota: t('export.card.treapta.exterior') }]} />
          {p.treaptaInc !== 'fara' && (<>
          <label title={t('export.incrustatie-drept.treapta.adancime.titlu')}>
            {t('export.incrustatie-drept.treapta.adancime')}
            <input type="text" inputMode="decimal" value={p.adancimeTreapta} data-camp="inc-treapta-adancime" disabled={doarCitire}
              aria-invalid={!inMargini(p.adancimeTreapta, MARGINI_OPERATIE.adancime)} onChange={(ev) => { schimba(o.cheie, { adancimeTreapta: ev.target.value }); }} />
          </label>
          <label title={t('export.incrustatie-drept.treapta.latime.titlu')}>
            {t('export.incrustatie-drept.treapta.latime')}
            <input type="text" inputMode="decimal" value={p.latimeTreapta} data-camp="inc-treapta-latime" disabled={doarCitire}
              aria-invalid={!inMargini(p.latimeTreapta, MARGINI_OPERATIE.latimeUmar)} onChange={(ev) => { schimba(o.cheie, { latimeTreapta: ev.target.value }); }} />
          </label>
          </>)}
        </>);
        return cutie(<>
          <Cartonase data-camp="inc-dop" poze="dop" eticheta={t('export.incrustatie-drept.dop')} nume={`dop-${o.cheie}`} valoare={p.dopInc}
            oprit={doarCitire} titlu={t('export.incrustatie-drept.dop.titlu')} onAlege={(dopInc) => { schimba(o.cheie, { dopInc }); }}
            variante={[{ v: 'ridicat', text: t('export.incrustatie-drept.dop.ridicat'), nota: t('export.card.dop.ridicat') },
              { v: 'decupat', text: t('export.incrustatie-drept.dop.decupat'), nota: t('export.card.dop.decupat') }]} />
          {/* Sprijinul: pe umăr doar cu treaptă, pe fund doar la buzunar, pe față doar fără treaptă (ca până acum). */}
          {(p.dopInc === 'ridicat' || p.treaptaInc !== 'fara') && (<>
          <span className="dx-subtitlu">{t('export.incrustatie-drept.sprijin')}</span>
          <Cartonase data-camp="inc-sprijin" poze="sprijin" eticheta={t('export.incrustatie-drept.sprijin')} nume={`sprijin-${o.cheie}`}
            valoare={p.sprijinInc} oprit={doarCitire}
            titlu={t(p.treaptaInc === 'fara' ? 'export.incrustatie-drept.sprijin.titlu' : 'export.incrustatie-drept.sprijin-trepte.titlu')}
            onAlege={(sprijinInc) => { schimba(o.cheie, { sprijinInc }); }}
            variante={[
              ...(p.treaptaInc !== 'fara' ? [{ v: 'umar' as const, text: t('export.incrustatie-drept.sprijin.umar'), nota: t('export.card.sprijin.umar') }] : []),
              ...(p.locasInc !== 'gaura' ? [{ v: 'fund' as const, text: t('export.incrustatie-drept.sprijin.fund'), nota: t('export.card.sprijin.fund') }] : []),
              ...(p.treaptaInc === 'fara' ? [{ v: 'fata' as const, text: t('export.incrustatie-drept.sprijin.fata'), nota: t('export.card.sprijin.fata') }] : []),
            ]} />
          </>)}
          {/* Jocul g: sub dopul ridicat pe față; în trepte, sub tijă (pe umăr) sau deasupra umărului (pe fund); nu la gaură. */}
          {jocFolosit(p) && (
          <label title={t(p.treaptaInc === 'fara' ? 'export.incrustatie-drept.joc.titlu' : p.sprijinInc === 'fund' ? 'export.incrustatie-drept.joc-umar.titlu' : 'export.incrustatie-drept.joc-tija.titlu')}>
            {t(p.treaptaInc === 'fara' ? 'export.incrustatie.joc' : p.sprijinInc === 'fund' ? 'export.incrustatie-drept.joc-umar' : 'export.incrustatie-drept.joc-tija')}
            <input type="text" inputMode="decimal" value={p.jocInc} data-camp="inc-joc" disabled={doarCitire}
              aria-invalid={!inMargini(p.jocInc, MARGINI_OPERATIE.adancime)} onChange={(ev) => { schimba(o.cheie, { jocInc: ev.target.value }); }} />
          </label>
          )}
          {spatiuFolosit(p) && (
          <label title={t(p.dopInc === 'decupat' ? 'export.incrustatie-drept.peste.titlu' : 'export.incrustatie-drept.fierastrau.titlu')}>
            {t(p.dopInc === 'decupat' ? 'export.incrustatie-drept.peste' : 'export.incrustatie.fierastrau')}
            <input type="text" inputMode="decimal" value={p.fierastrauInc} data-camp="inc-fierastrau" disabled={doarCitire}
              aria-invalid={!inMargini(p.fierastrauInc, MARGINI_OPERATIE.adancime)} onChange={(ev) => { schimba(o.cheie, { fierastrauInc: ev.target.value }); }} />
          </label>
          )}
          <label title={t('export.incrustatie-drept.margine.titlu')}>
            {t('export.incrustatie.margine')}
            <input type="text" inputMode="decimal" value={p.margineInc} data-camp="inc-margine" disabled={doarCitire}
              aria-invalid={!margineBuna(p.margineInc)} onChange={(ev) => { schimba(o.cheie, { margineInc: ev.target.value }); }} />
          </label>
          {/* Punțile dopului decupat (ADR 0174), ca ale benzii; pe dopul ridicat, ascunse (valorile rămân în rând). */}
          {p.dopInc === 'decupat' && (<>
          <label title={t('export.banda.punti.numar.titlu')}>
            {t('export.banda.punti.numar')}
            <input type="text" inputMode="numeric" value={p.numarPunti} data-camp="dop-punti-numar" disabled={doarCitire}
              aria-invalid={!b.puntiDop} onChange={(ev) => { schimba(o.cheie, { numarPunti: ev.target.value }); }} />
          </label>
          <label title={t('export.banda.punti.latime.titlu')}>
            {t('export.banda.punti.latime')}
            <input type="text" inputMode="decimal" value={p.latimePunti} data-camp="dop-punti-latime" disabled={doarCitire}
              aria-invalid={!b.puntiDop} onChange={(ev) => { schimba(o.cheie, { latimePunti: ev.target.value }); }} />
          </label>
          <label title={t('export.incrustatie-drept.punti.grosime.titlu')}>
            {t('export.banda.punti.grosime')}
            <input type="text" inputMode="decimal" value={p.grosimePunti} data-camp="dop-punti-grosime" disabled={doarCitire}
              aria-invalid={!b.puntiDop} onChange={(ev) => { schimba(o.cheie, { grosimePunti: ev.target.value }); }} />
          </label>
          </>)}
          <label title={t('export.incrustatie-drept.freza-dop.titlu')}>
            <input type="checkbox" checked={p.frezaDop} data-camp="inc-freza-dop" disabled={doarCitire}
              onChange={(ev) => { schimba(o.cheie, { frezaDop: ev.target.checked }); }} />
            {t('export.incrustatie-drept.freza-dop')}
          </label>
          {p.frezaDop && (<>
          <ListaBiblioteca data-camp="dop-biblioteca" oferite={drepte} origine={p.origineDop} oprit={doarCitire}
            onAlege={(f) => { alegeFreza(o.cheie, f, 'dop'); }} onMana={() => { schimba(o.cheie, { origineDop: null }); }} />
          <label>
            {t('export.freza.numar')}
            <input type="text" inputMode="numeric" value={p.numarSculaDop} data-camp="dop-scula" disabled={doarCitire}
              aria-invalid={!b.frezaDop || conflict !== undefined} onChange={(ev) => { schimba(o.cheie, { numarSculaDop: ev.target.value }); }} />
          </label>
          <label>
            {t('export.freza.diametru')}
            <input type="text" inputMode="decimal" value={p.diametruSculaDop} data-camp="dop-diametru" disabled={doarCitire}
              aria-invalid={!b.frezaDop || conflict !== undefined} onChange={(ev) => { schimba(o.cheie, { diametruSculaDop: ev.target.value, origineDop: null }); }} />
          </label>
          <label title={t('export.pas-lateral.titlu')}>
            {t('export.pas-lateral')}
            <input type="text" inputMode="decimal" value={p.pasLateralDop} data-camp="dop-pas" disabled={doarCitire}
              aria-invalid={!b.frezaDop} onChange={(ev) => { schimba(o.cheie, { pasLateralDop: ev.target.value }); }} />
          </label>
          {frezeRest(o.cheie, p, 'dop', doarCitire)}
          </>)}
          <p className="nota-incrustatie">{t('export.incrustatie-drept.nota')}</p>
        </>);
      }
      default: return null;
    }
  };
  return (
    <section className="dx-fisa" data-fisa="op" data-operatie={o.cheie} key={o.cheie}>
      <h3>{o.descriere}</h3>
      <p className="dx-loc">{t('export.fisa.loc', { n: loc + 1, total })}</p>
      {grupuri.map((g) => { const c = corp(g); return c === null ? null : grup(g, o.cheie, c, aici(g), desen(g)); })}
      {/* O greșeală al cărei grup nu e pe fișă (o bifă rămasă de la alt fel de tăiere) se spune la capăt, nu se pierde. */}
      {greseli.filter(([, g]) => !grupuri.includes(g)).map(([m]) => <p className="dx-greseala" data-greseala key={m}>{m}</p>)}
    </section>
  );
}
