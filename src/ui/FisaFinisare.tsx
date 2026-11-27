import { type ReactNode } from 'react';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import { celuleAliniate } from './actiuniExportTipuri.ts';
import { Cartonase } from './exportPoze.tsx';
import { DesenAdaosRelief, DesenFreza, DesenLiniiRelief, DesenMargineRelief, DesenPodeaRelief, type DesenComun } from './exportDesene.tsx';
import { liniiReliefDesen, treceriPodeaRelief } from './exportDeseneCalcul.ts';
import type { GrupExport } from './exportGrupuri.ts';
import { GRUPURI_RELIEF } from './exportGrupuri.ts';
import type { CampRelief, FinisareExport, RandRelief } from './exportRelief.ts';
import { locFrezaRelief } from './exportRelief.ts';
import { stareOrigine, type FrezaOferita } from './exportRand.ts';
import { ListaBiblioteca, NotaBiblioteca, type InapoiNota } from './FisaOperatie.tsx';
import { citesteNumar } from './numar.ts';

export type { FinisareExport } from './exportRelief.ts';

/**
 * Fișa unei operații a reliefului în fereastra exportului, finisarea (ADR 0312 §7) sau degroșarea (ADR 0313 §7), editabilă din
 * felia 18.1↑d-4 (ADR 0315). Rândul stă în listă la locul lui în ordinea tăierii (se mută ca oricare altul în „A mea”), iar fișa
 * are grupurile ferestrei (ADR 0290): freza, liniile (cu pasul folosit și creasta pe plan), adaosul (la degroșare), marginea și
 * înălțimea (comune cu perechea rândului, ca în panou), adâncimea. Valorile se țin ca text în fereastră (`RandRelief`); Exportă
 * le scrie în operație (`operatieReliefDinDialog`). Starea și verificările sunt ale ferestrei, care le dă prin props.
 */

/** Forma frezei, în cuvinte. */
export function formaFinisareText(s: FinisareExport['scula'], f: (x: number) => string): string {
  return s.forma === 'bila' ? t('export.finisare.forma.bila') : s.forma === 'v' ? t('export.finisare.forma.v', { u: f(s.unghi ?? 0) })
    : t('export.finisare.forma.plata');
}

/** Ce îi dă fereastra fișei unei operații a reliefului (ca `ContextFisa` la celelalte operații). */
export type ContextFisaRelief = {
  readonly doarCitire: boolean;
  /**
   * Grupul unei întrebări, comun cu celelalte fișe (titlul, explicația câmpului activ, câmpurile, greșelile) și, din felia
   * 18.1↑d-6, desenul lui.
   */
  readonly grup: (id: GrupExport, fisa: string, corp: ReactNode, greseli?: ReadonlyArray<string>, desen?: (c: DesenComun) => ReactNode) => ReactNode;
  /** Formatul numerelor (al frezelor: până la miime). */
  readonly f: (x: number) => string;
  /** Creasta lăsată pe un plan de freza dată, la pasul dat (regula aplicației, `creastaPePlan`); lipsă = fără notă. */
  readonly creasta: ((s: FinisareExport['scula'], pasLateral: number) => number | null) | undefined;
  /*
   * Freza din „Frezele mele” (felia 18.1↑d-5, ADR 0316), ca la celelalte rânduri (ADR 0300 §4–§5): frezele oferite felului,
   * biblioteca întreagă (null cât nu e citită), alegerea, „Ia valorile noi” pe rând și pe toate, câte sunt și „Pune-o înapoi”.
   */
  readonly fmtFreza: Intl.NumberFormat;
  readonly frezeRelief: ((fel: 'finisare' | 'degrosare') => readonly FrezaOferita[]) | undefined;
  readonly bibliotecaToata: readonly FrezaOferita[] | null;
  readonly alege: (cheie: string, f: FrezaOferita) => void;
  readonly ia: (cheie: string, f: FrezaOferita) => void;
  readonly iaToate: (f: FrezaOferita) => void;
  readonly peToate: (id: string) => number;
  readonly inapoi: (cheie: string) => InapoiNota | undefined;
};

/** Freza rândului, citită (pentru creastă): forma, diametrul, unghiul și vârful V-ului; `null` cât nu se citește. */
function frezaCitita(r: RandRelief): FinisareExport['scula'] | null {
  const n = citesteNumar(r.numarScula), d = citesteNumar(r.diametruScula);
  if (n === null || d === null) return null;
  if (r.fel === 'finisare' && r.formaScula === 'v') {
    const u = citesteNumar(r.unghiV), v = citesteNumar(r.varfV);
    return u === null || v === null ? null : { numar: n, diametru: d, forma: 'v', unghi: u, ...(v > 0 ? { varf: v } : {}) };
  }
  return { numar: n, diametru: d, forma: r.fel === 'finisare' && r.formaScula === 'bila' ? 'bila' : 'plata' };
}

/** Un câmp numeric al fișei reliefului: eticheta, explicația (titlul) și valoarea ca text; `data-camp` scris în sursă. */
function Intrare({ 'data-camp': dc, eticheta, titlu, valoare, oprit, rau, mod = 'decimal', onText }: {
  readonly 'data-camp': string; readonly eticheta: string; readonly titlu: string; readonly valoare: string; readonly oprit: boolean;
  readonly rau: boolean; readonly mod?: 'decimal' | 'numeric'; readonly onText: (s: string) => void;
}): ReactNode {
  return (
    <label title={titlu}>
      {eticheta}
      <input type="text" inputMode={mod} value={valoare} data-camp={dc} disabled={oprit} aria-invalid={rau} onChange={(ev) => { onText(ev.target.value); }} />
    </label>
  );
}

export function FisaFinisare({ fin, r, loc, total, c, greseli, gresite, onSchimba }: {
  readonly fin: FinisareExport; readonly r: RandRelief; readonly loc: number; readonly total: number; readonly c: ContextFisaRelief;
  /** Greșelile rândului, fiecare cu grupul în care se spune. */
  readonly greseli: ReadonlyArray<readonly [string, GrupExport]>;
  /** Câmpurile greșite (se înroșesc; „Du-mă la …” pune focusul pe primul). */
  readonly gresite: readonly CampRelief[];
  readonly onSchimba: (p: Partial<RandRelief>) => void;
}): ReactNode {
  const { doarCitire: oprit, grup, f } = c;
  const deg = fin.fel === 'degrosare';
  const rau = (x: CampRelief): boolean => gresite.includes(x);
  const aici = (g: GrupExport): string[] => greseli.filter(([, x]) => x === g).map(([m]) => m);
  // Pasul folosit (ADR 0314): cu liniile la 0° sau 90°, prin centrele celulelor, rotunjit în jos la celule întregi.
  const s = citesteNumar(r.pasLateral), u = citesteNumar(r.unghi), celula = fin.celula;
  // Cu pasul greșit (greșeala lui se spune în grup), notele pasului folosit și ale crestei tac.
  const aliniate = (deg || r.aliniat) && (u === 0 || u === 90) && !rau('pas-lateral');
  const k = aliniate && s !== null && s > 0 && celula !== undefined && celula > 0 ? celuleAliniate(s, celula) : null;
  const folosit = k !== null && celula !== undefined ? k * celula : s;
  const freza = frezaCitita(r);
  const creasta = !deg && !rau('pas-lateral') && !rau('diametru') && freza !== null && folosit !== null && folosit > 0 && c.creasta
    ? c.creasta(freza, folosit) : undefined;
  // Freza față de bibliotecă (felia 18.1↑d-5): nota ei și recunoașterea celei scrise de mână.
  const st = stareOrigine(locFrezaRelief(r), c.bibliotecaToata);
  const oferite = c.frezeRelief ? c.frezeRelief(fin.fel) : [];
  const corp = (g: GrupExport): ReactNode => {
    switch (g) {
      case 'freza-relief': return (<>
        {/* Lista „Din frezele mele” stă pe rândul ei, ca la celelalte fișe (28.8↑k). */}
        <ListaBiblioteca data-camp="relief-biblioteca" oferite={oferite} origine={r.origineScula} oprit={oprit}
          recunoscuta={st?.fel === 'recunoscuta' ? st.freza.nume : undefined}
          onAlege={(x) => { c.alege(fin.cheie, x); }} onMana={() => { onSchimba({ origineScula: null }); }} />
        <NotaBiblioteca stare={st} origine={r.origineScula} peToate={st?.fel === 'schimbata' ? c.peToate(st.freza.id) : 0} oprit={oprit}
          fmt={c.fmtFreza} onIa={(x) => { c.ia(fin.cheie, x); }} onIaToate={c.iaToate}
          inapoi={st?.fel === 'stearsa' ? c.inapoi(fin.cheie) : undefined} />
        <div className="dx-rand">
        <Intrare data-camp="relief-scula" eticheta={t('export.freza.numar')} titlu={t('export.relief.scula.titlu')} valoare={r.numarScula} oprit={oprit} rau={rau('scula')} mod="numeric"
          onText={(x) => { onSchimba({ numarScula: x }); }} />
        {/* Un diametru sau o formă schimbate de mână fac freza scrisă de mână (originea pleacă), ca la celelalte rânduri. */}
        <Intrare data-camp="relief-diametru" eticheta={t('export.freza.diametru')} titlu={t('export.relief.diametru.titlu')} valoare={r.diametruScula} oprit={oprit} rau={rau('diametru')}
          onText={(x) => { onSchimba({ diametruScula: x, origineScula: null }); }} />
        {deg ? <p className="nota" data-nota="relief-plata">{t('export.degrosare.doar-plata')}</p> : (
        <label title={t('export.relief.forma.titlu')}>
          {t('export.freza.forma')}
          <select value={r.formaScula} data-camp="relief-forma" disabled={oprit}
            onChange={(ev) => { const v = ev.target.value; if (v === 'bila' || v === 'plata' || v === 'v') onSchimba({ formaScula: v, origineScula: null }); }}>
            <option value="bila">{t('export.finisare.forma.bila')}</option>
            <option value="plata">{t('export.finisare.forma.plata')}</option>
            <option value="v">{t('export.freza.v')}</option>
          </select>
        </label>
        )}
        {!deg && r.formaScula === 'v' && <Intrare data-camp="relief-unghi-v" eticheta={t('export.freza.unghi')} titlu={t('export.freza.unghi')} valoare={r.unghiV} oprit={oprit} rau={rau('unghi-v')}
          onText={(x) => { onSchimba({ unghiV: x, origineScula: null }); }} />}
        {!deg && r.formaScula === 'v' && <Intrare data-camp="relief-varf-v" eticheta={t('export.freza.varf')} titlu={t('export.freza.varf.titlu')} valoare={r.varfV} oprit={oprit} rau={rau('varf-v')}
          onText={(x) => { onSchimba({ varfV: x, origineScula: null }); }} />}
        </div>
      </>);
      case 'linii': return (<div className="dx-rand">
        <Intrare data-camp="relief-pas-lateral" eticheta={t('export.finisare.pas-lateral')} titlu={t(deg ? 'export.relief.pas-lateral.deg.titlu' : 'export.relief.pas-lateral.titlu')} valoare={r.pasLateral} oprit={oprit} rau={rau('pas-lateral')}
          onText={(x) => { onSchimba({ pasLateral: x }); }} />
        <Intrare data-camp="relief-unghi" eticheta={t('export.relief.unghi')} titlu={t('export.relief.unghi.titlu')} valoare={r.unghi} oprit={oprit} rau={rau('unghi')}
          onText={(x) => { onSchimba({ unghi: x }); }} />
        {!deg && (
        <Cartonase data-camp="relief-aliniat" poze="relief-linii" eticheta={t('export.finisare.linii')} nume={`relief-aliniat-${fin.cheie}`}
          valoare={r.aliniat ? 'aliniate' : 'nealiniate'} oprit={oprit} titlu={t('export.relief.linii.titlu')}
          onAlege={(v) => { onSchimba({ aliniat: v === 'aliniate' }); }}
          variante={[
            { v: 'aliniate', text: t('export.relief.linii.aliniate'), nota: t('export.relief.linii.aliniate.nota') },
            { v: 'nealiniate', text: t('export.relief.linii.nealiniate'), nota: t('export.relief.linii.nealiniate.nota') },
          ]} />
        )}
        {k !== null && folosit !== null && celula !== undefined && (
          <p className="nota" data-nota="relief-pas-folosit">{t('export.relief.pas-folosit', { n: k, mm: f(folosit), c: f(celula) })}</p>
        )}
        {creasta !== undefined && <p className="nota" data-finisare="creasta">{creasta === null ? t('export.finisare.creasta.prea-mare')
          : t('export.relief.creasta', { mm: f(Math.round(creasta * 1e4) / 1e4) })}</p>}
      </div>);
      case 'adaos': return (<div className="dx-rand">
        <Intrare data-camp="relief-adaos" eticheta={t('export.degrosare.adaos')} titlu={t('export.relief.adaos.titlu')} valoare={r.adaos} oprit={oprit} rau={rau('adaos')}
          onText={(x) => { onSchimba({ adaos: x }); }} />
      </div>);
      case 'margine': return (<div className="dx-rand">
        <Cartonase data-camp="relief-margine" poze="relief-margine" eticheta={t('export.finisare.margine')} nume={`relief-margine-${fin.cheie}`}
          valoare={r.margine} oprit={oprit} titlu={t('export.relief.margine.titlu')} onAlege={(v) => { onSchimba({ margine: v }); }}
          variante={[
            { v: 'perete', text: t('export.relief.margine.perete'), nota: t('export.relief.margine.perete.nota') },
            { v: 'trece', text: t('export.relief.margine.trece'), nota: t('export.relief.margine.trece.nota') },
          ]} />
        <Cartonase data-camp="relief-z" poze="relief-z" eticheta={t('export.finisare.z')} nume={`relief-z-${fin.cheie}`}
          valoare={r.z} oprit={oprit} titlu={t('export.relief.z.titlu')} onAlege={(v) => { onSchimba({ z: v }); }}
          variante={[
            { v: 'varf', text: t('export.relief.z.varf'), nota: t('export.relief.z.varf.nota') },
            { v: 'plan', text: t('export.relief.z.plan'), nota: t('export.relief.z.plan.nota') },
          ]} />
        {r.z === 'plan' && <Intrare data-camp="relief-plan-zero" eticheta={t('export.relief.plan-zero')} titlu={t('export.relief.plan-zero.titlu')} valoare={r.planZero} oprit={oprit} rau={rau('plan-zero')}
          onText={(x) => { onSchimba({ planZero: x }); }} />}
        {fin.perechi.length > 0 && <p className="nota" data-nota="relief-perechi">{t(deg ? 'export.relief.perechi.deg' : 'export.relief.perechi.fin')}</p>}
      </div>);
      case 'podea': return (<div className="dx-rand">
        <Intrare data-camp="relief-adancime" eticheta={t('export.relief.adancime')} titlu={t('export.relief.adancime.titlu')} valoare={r.adancime} oprit={oprit} rau={rau('adancime')}
          onText={(x) => { onSchimba({ adancime: x }); }} />
        <Intrare data-camp="relief-pas" eticheta={t('export.relief.pas')} titlu={t('export.relief.pas.titlu')} valoare={r.pas} oprit={oprit} rau={rau('pas')}
          onText={(x) => { onSchimba({ pas: x }); }} />
      </div>);
      default: return null;
    }
  };
  /*
   * Desenul fiecărei întrebări (felia 18.1↑d-6, ADR 0317), din valorile rândului; trecerile pe Z și pasul liniilor, ca lucrarea
   * (`exportDeseneCalcul.ts`). Desenul frezei e cel al celorlalte fișe: cotele lui poartă numele câmpurilor fără `relief-`.
   */
  const nr = (x: string, camp: CampRelief): number | null => (rau(camp) ? null : citesteNumar(x));
  const desen = (g: GrupExport): ((dc: DesenComun) => ReactNode) | undefined => {
    switch (g) {
      case 'freza-relief': return (dc) => (
        <DesenFreza c={{ ...dc, aprins: dc.aprins.map((x) => (x.startsWith('relief-') ? x.slice(7) : x)) }} numar={r.numarScula}
          diametru={nr(r.diametruScula, 'diametru')} v={!deg && r.formaScula === 'v'} unghi={nr(r.unghiV, 'unghi-v')} varfPlat={nr(r.varfV, 'varf-v')}
          {...(!deg && r.formaScula === 'bila' ? { rotunda: 'bila' as const } : {})} />
      );
      case 'linii': return (dc) => (
        <DesenLiniiRelief c={dc} unghi={u} linii={((p) => (p === null ? null : liniiReliefDesen(p, celula, deg || r.aliniat, u ?? 0)))(nr(r.pasLateral, 'pas-lateral'))} />
      );
      case 'adaos': return (dc) => <DesenAdaosRelief c={dc} adaos={nr(r.adaos, 'adaos')} />;
      case 'margine': return (dc) => <DesenMargineRelief c={dc} margine={r.margine} z={r.z} planZero={nr(r.planZero, 'plan-zero')} />;
      case 'podea': return (dc) => {
        const a = nr(r.adancime, 'adancime'), p = nr(r.pas, 'pas'), x = deg ? nr(r.adaos, 'adaos') ?? 0 : 0;
        return <DesenPodeaRelief c={dc} adancime={a} pas={p} treceri={a === null || p === null ? { funduri: [], n: 0, podea: 0 } : treceriPodeaRelief(a, p, x)} />;
      };
      default: return undefined;
    }
  };
  return (
    <section className="dx-fisa" data-fisa="op" data-operatie={fin.cheie} data-fel={fin.fel}>
      <h3 tabIndex={-1}>{fin.descriere}</h3>
      {/* Felul, înaintea locului: degroșarea și finisarea aceluiași relief au același nume. */}
      <p className="dx-loc">{t(deg ? 'export.degrosare.lista' : 'export.finisare.lista')} · {t('export.fisa.loc', { n: loc + 1, total })}</p>
      {GRUPURI_RELIEF[fin.fel].map((g) => grup(g, fin.cheie, corp(g), aici(g), desen(g)))}
    </section>
  );
}

/**
 * Rândul finisării în lista ferestrei (ADR 0312 §7): locul în ordine, cu mânerul și săgețile în „A mea” (ca la celelalte
 * rânduri), numele și, dedesubt, felul, freza și adâncimea. Mutarea, tragerea și alegerea fișei sunt ale ferestrei.
 */
export function RandListaFinisare({ fin, r, gresit = false, loc, total, nr = loc + 1, sus = loc > 0, jos = loc < total - 1, mana, tras, curent, f, onMuta, onTrage, onDu }: {
  readonly fin: FinisareExport; readonly loc: number; readonly total: number; readonly mana: boolean; readonly tras: string | null;
  /** Rândul scris în fereastră (felia 18.1↑d-4): freza și adâncimea arătate sunt ale lui; lipsă = ale documentului. */
  readonly r?: RandRelief;
  /** Rândul are o valoare greșită (semnul din listă, ca la celelalte rânduri). */
  readonly gresit?: boolean;
  /** Numărul arătat și dacă rândul se poate muta în sus și în jos (cu „Toate foile”, doar în foaia lui; 28.8↑q). */
  readonly nr?: number; readonly sus?: boolean; readonly jos?: boolean;
  readonly curent: boolean; readonly f: (x: number) => string;
  readonly onMuta: (de: number, la: number) => void;
  /** Tragerea începe (cheia) sau se termină (null); lăsarea altui rând pe acesta îl mută aici. */
  readonly onTrage: (cheie: string | null) => void;
  readonly onDu: () => void;
}): ReactNode {
  const c = fin.cheie;
  return (
    <div className={tras === c ? 'dx-nav-op tras' : 'dx-nav-op'} data-nav-op={c} data-fel={fin.fel}
      onDragOver={mana && tras !== null ? (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } : undefined}
      onDrop={mana && tras !== null ? (ev) => { ev.preventDefault(); onMuta(-1, loc); onTrage(null); } : undefined}>
      <span className="ordine">
        {mana && (
          <button type="button" className="trage" draggable data-trage={c} aria-label={t('export.ordine.trage', { n: nr })}
            title={t('export.ordine.trage', { n: nr })}
            onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', c); ev.dataTransfer.effectAllowed = 'move'; onTrage(c); }}
            onDragEnd={() => { onTrage(null); }}>
            <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
              <circle cx="3" cy="3" r="1.4" /><circle cx="7" cy="3" r="1.4" /><circle cx="3" cy="8" r="1.4" />
              <circle cx="7" cy="8" r="1.4" /><circle cx="3" cy="13" r="1.4" /><circle cx="7" cy="13" r="1.4" />
            </svg>
          </button>
        )}
        <span className="loc" data-loc={nr}>{nr}</span>
        {mana && (
          <span className="sageti">
            <button type="button" data-sus={c} disabled={!sus} aria-label={t('export.ordine.sus', { n: nr })}
              title={t('export.ordine.sus', { n: nr })} onClick={() => { onMuta(loc, loc - 1); }}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 2.5 10.5 8.5H1.5Z" /></svg>
            </button>
            <button type="button" data-jos={c} disabled={!jos} aria-label={t('export.ordine.jos', { n: nr })}
              title={t('export.ordine.jos', { n: nr })} onClick={() => { onMuta(loc, loc + 1); }}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 9.5 1.5 3.5H10.5Z" /></svg>
            </button>
          </span>
        )}
      </span>
      <button type="button" className="dx-nav" data-nav={c} aria-current={curent} onClick={onDu} data-gresit={gresit ? '' : undefined}>
        <span className="dx-nume">{fin.descriere}</span>
        <span className="dx-meta">
          {t(fin.fel === 'degrosare' ? 'export.degrosare.lista' : 'export.finisare.lista')} · {r ? metaRand(r, f) : metaDocument(fin, f)}
        </span>
      </button>
    </div>
  );
}

/** Freza și adâncimea din document, pe rândul listei. */
function metaDocument(fin: FinisareExport, f: (x: number) => string): string {
  return `T${fin.scula.numar} Ø${f(fin.scula.diametru)} ${formaFinisareText(fin.scula, f)} · ${t('export.finisare.mm', { mm: f(fin.adancime) })}`;
}

/** Freza și adâncimea scrise în fereastră (un număr care nu se citește: „—”, ca la celelalte rânduri). */
function metaRand(r: RandRelief, f: (x: number) => string): string {
  const nr = (s: string): string => ((x) => (x === null ? '—' : f(x)))(citesteNumar(s));
  const forma = r.fel === 'degrosare' || r.formaScula === 'plata' ? t('export.finisare.forma.plata') : r.formaScula === 'bila' ? t('export.finisare.forma.bila')
    : t('export.finisare.forma.v', { u: nr(r.unghiV) });
  return `T${nr(r.numarScula)} Ø${nr(r.diametruScula)} ${forma} · ${t('export.finisare.mm', { mm: nr(r.adancime) })}`;
}
