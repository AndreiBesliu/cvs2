/**
 * Valorile frezei pe material în „Frezele mele” (ADR 0305 §1, felia 16.A↑g-1): editorul seturilor și tabelul lor din fișă.
 *
 * Editorul ține seturile ca text scris de om (cu virgula sau punctul zecimal), ca restul câmpurilor ferestrei; freza din ele o
 * face fereastra (`frezaDin`), iar greșeala vine de la judecata frezei (`problemaMateriale`), cu setul și câmpul ei. Un set nou
 * pornește de la valorile frezei de acum, cu materialul gol; „✕” îl scoate. Câmpurile necunoscute ale unui set (ale unei
 * versiuni mai noi) rămân, în `brut`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import { calculeazaAvans, MARGINI_FZ, MARGINI_VC, type MotivAvans } from '../model/calculatorAvans.ts';
import { CAMPURI_SET, MARGINI_FREZA, type CampSet, type MotivFreza, type SetMaterial } from '../model/freza.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';

/** Un set, ca text scris de om; `brut` e setul citit (cu câmpurile lui necunoscute), null pentru unul nou. */
export type SetText = { readonly material: string } & { readonly [C in CampSet]: string } & { readonly brut: Readonly<Record<string, unknown>> | null };

const numar = (s: string): number => citesteNumar(s.trim()) ?? Number.NaN;

/** Seturile ca text (pentru editor), din freză. */
export function seturiText(seturi: readonly SetMaterial[] | undefined, ro: boolean): SetText[] {
  return (seturi ?? []).map((s) => ({
    material: s.material, brut: s,
    ...Object.fromEntries(CAMPURI_SET.map((c) => [c, Number.isFinite(s[c]) ? textNumar(s[c], ro) : ''])) as { [C in CampSet]: string },
  }));
}

/** Seturile din text: un număr greșit e NaN (îl spune judecata); câmpurile necunoscute ale setului citit rămân. */
export function seturiNumere(seturi: readonly SetText[]): SetMaterial[] {
  return seturi.map((s) => ({
    ...(s.brut ?? {}), material: s.material,
    ...Object.fromEntries(CAMPURI_SET.map((c) => [c, numar(s[c])])) as { [C in CampSet]: number },
  }));
}

/** Eticheta câmpului unui set. */
export function etichetaSet(c: CampSet): string {
  switch (c) {
    case 'turatie': return t('freze.turatie');
    case 'avans': return t('freze.avans');
    case 'plonjare': return t('freze.plonjare');
    case 'pas': return t('freze.pas');
    case 'pasLateral': return t('freze.pas-lateral');
  }
}

/** Unitatea câmpului unui set. */
function unitateSet(c: CampSet): string {
  switch (c) {
    case 'turatie': return t('freze.unitate.rpm');
    case 'avans': case 'plonjare': return t('freze.unitate.mm-min');
    case 'pas': return t('freze.unitate.mm');
    case 'pasLateral': return t('freze.unitate.procent');
  }
}

/** Greșeala de arătat: motivul, setul și câmpul ei (null: a listei întregi sau a setului întreg). */
export type ProblemaSet = { readonly motiv: MotivFreza; readonly set: number | null; readonly camp: 'material' | CampSet | null };

/** Textul motivului unui calcul care nu se poate scrie (ADR 0305 §4). */
function textMotivAvans(m: MotivAvans, ro: boolean): string {
  switch (m) {
    case 'taisuri': return t('freze.calculator.taisuri');
    case 'fz': return t('freze.calculator.fz.margini', { max: textNumar(MARGINI_FZ, ro) });
    case 'vc': return t('freze.calculator.vc.margini', { max: textNumar(MARGINI_VC, ro) });
    case 'diametru': return t('freze.calculator.diametru');
    case 'turatie': return t('freze.calculator.turatie');
    case 'margini-turatie': return t('freze.calculator.margini-turatie', { max: textNumar(MARGINI_FREZA.turatie, ro) });
    case 'margini-avans': return t('freze.calculator.margini-avans', { max: textNumar(MARGINI_FREZA.avans, ro) });
  }
}

/**
 * Calculatorul avansului (ADR 0305 §4), strâns la început: avansul pe dinte și, la alegere, viteza de așchiere; „Calculează”
 * scrie turația (doar cu viteza) și avansul în câmpurile de deasupra, sau spune de ce nu poate. `unde` deosebește calculatorul
 * valorilor de lucru de al unui set.
 */
export function CalculatorAvans({ unde, diametru, taisuri, turatie, dezactivat, ro, onScrie }: {
  readonly unde: string;
  readonly diametru: number;
  readonly taisuri: number | undefined;
  /** Turația de acum, ca text (fără viteza de așchiere, avansul pleacă de la ea). */
  readonly turatie: string;
  readonly dezactivat: boolean;
  readonly ro: boolean;
  readonly onScrie: (turatie: string, avans: string) => void;
}): ReactNode {
  const [fz, setFz] = useState('');
  const [vc, setVc] = useState('');
  const [rezultat, setRezultat] = useState<{ readonly ok: boolean; readonly text: string } | null>(null);
  const calculeaza = (): void => {
    const r = calculeazaAvans({ diametru, taisuri, fz: numar(fz), vc: vc.trim() === '' ? null : numar(vc), turatie: numar(turatie) });
    if (!r.ok) { setRezultat({ ok: false, text: textMotivAvans(r.motiv, ro) }); return; }
    onScrie(textNumar(r.turatie, ro), textNumar(r.avans, ro));
    setRezultat({ ok: true, text: t('freze.calculator.scrise', { turatie: textNumar(r.turatie, ro), avans: textNumar(r.avans, ro) }) });
  };
  return (
    <details className="freze-calculator" data-freze="calculator" data-unde={unde}>
      <summary>{t('freze.calculator')}</summary>
      <p className="freze-ajutor">{t('freze.calculator.nota')}</p>
      <div className="freze-grila">
        <label className="freze-camp">
          <span>{t('freze.calculator.fz')}</span>
          <span className="freze-unitate">
            <input type="text" inputMode="decimal" data-freze-calc="fz" value={fz} disabled={dezactivat}
              onChange={(e) => { setFz(e.currentTarget.value); setRezultat(null); }} />
            <span>{t('freze.unitate.mm')}</span>
          </span>
        </label>
        <label className="freze-camp">
          <span>{t('freze.calculator.vc')}</span>
          <span className="freze-unitate">
            <input type="text" inputMode="decimal" data-freze-calc="vc" value={vc} disabled={dezactivat} placeholder={t('freze.calculator.vc.gol')}
              onChange={(e) => { setVc(e.currentTarget.value); setRezultat(null); }} />
            <span>{t('freze.unitate.m-min')}</span>
          </span>
        </label>
      </div>
      <div className="freze-materiale-jos">
        <button type="button" data-freze="calculeaza" disabled={dezactivat} onClick={calculeaza}>{t('freze.calculator.calculeaza')}</button>
        {rezultat ? (
          <small className={rezultat.ok ? 'freze-ajutor' : 'freze-eroare'} data-freze-calc="rezultat" role={rezultat.ok ? 'status' : 'alert'}>{rezultat.text}</small>
        ) : null}
      </div>
    </details>
  );
}

export function EditorMateriale({ seturi, onSeturi, implicit, problema, textProblema, dezactivat, sugestii, diametru, taisuri, ro }: {
  readonly seturi: readonly SetText[];
  readonly onSeturi: (s: readonly SetText[]) => void;
  /** Valorile frezei de acum, ca text: un set nou pornește de la ele. */
  readonly implicit: { readonly [C in CampSet]: string };
  /** Greșeala de arătat (după regula ferestrei: după o schimbare a seturilor, sau toate la „Salvează”); null: nimic. */
  readonly problema: ProblemaSet | null;
  readonly textProblema: string | null;
  readonly dezactivat: boolean;
  /** Materialele scrise pe alte freze ale bibliotecii (lista de sugestii a câmpului). */
  readonly sugestii: readonly string[];
  /** Diametrul și tăișurile frezei, pentru calculatorul fiecărui set. */
  readonly diametru: number;
  readonly taisuri: number | undefined;
  readonly ro: boolean;
}): ReactNode {
  const refGrup = useRef<HTMLFieldSetElement>(null);
  const deFocus = useRef<string | null>(null);
  useEffect(() => {
    const s = deFocus.current;
    if (s === null) return;
    deFocus.current = null;
    refGrup.current?.querySelector<HTMLElement>(s)?.focus();
  });
  const plin = seturi.length >= MARGINI_FREZA.materiale;
  const schimba = (i: number, c: 'material' | CampSet, v: string): void => {
    onSeturi(seturi.map((s, j) => (j === i ? { ...s, [c]: v } : s)));
  };
  const adauga = (): void => {
    if (plin) return;
    deFocus.current = `[data-freze-set="${seturi.length}"] [data-freze-set-camp="material"]`;
    onSeturi([...seturi, { material: '', brut: null, ...implicit }]);
  };
  const scoate = (i: number): void => {
    // Focusul trece pe setul de după (sau pe cel de dinainte, sau pe „Un set pe material”).
    const n = seturi.length - 1;
    deFocus.current = n === 0 ? '[data-freze="set-adauga"]' : `[data-freze-set="${Math.min(i, n - 1)}"] [data-freze="set-scoate"]`;
    onSeturi(seturi.filter((_, j) => j !== i));
  };
  const gresit = (i: number, c: 'material' | CampSet): boolean => problema !== null && problema.set === i && (problema.camp === c || problema.camp === null);
  const descris = (i: number, c: 'material' | CampSet): string | undefined => (gresit(i, c) && textProblema ? 'freze-eroare-materiale' : undefined);
  return (
    <fieldset ref={refGrup} className="freze-materiale" data-freze="materiale">
      <legend>{t('freze.materiale')}</legend>
      <p className="freze-ajutor">{t('freze.materiale.nota')}</p>
      {seturi.length > 0 ? (
        <ol className="freze-seturi">
          {seturi.map((s, i) => (
            // Cheia e locul: seturile n-au id, iar textul se schimbă la fiecare literă.
            <li key={i} className="freze-set" data-freze-set={i}>
              <div className="freze-set-cap">
                <label className="freze-camp freze-set-material">
                  <span>{t('freze.material', { n: i + 1 })}</span>
                  <input type="text" data-freze-set-camp="material" list="freze-materiale-sugestii" value={s.material} disabled={dezactivat}
                    placeholder={t('freze.material.ajutor')} aria-invalid={gresit(i, 'material') ? true : undefined}
                    aria-describedby={descris(i, 'material')} onChange={(e) => { schimba(i, 'material', e.currentTarget.value); }} />
                </label>
                <button type="button" className="freze-set-scoate" data-freze="set-scoate" disabled={dezactivat}
                  aria-label={t('freze.material.scoate', { n: i + 1 })} title={t('freze.material.scoate', { n: i + 1 })}
                  onClick={() => { scoate(i); }}>✕</button>
              </div>
              <div className="freze-grila">
                {CAMPURI_SET.map((c) => (
                  <label className="freze-camp" key={c}>
                    <span>{etichetaSet(c)}</span>
                    <span className="freze-unitate">
                      <input type="text" inputMode="decimal" data-freze-set-camp={c} value={s[c]} disabled={dezactivat}
                        aria-invalid={gresit(i, c) ? true : undefined} aria-describedby={descris(i, c)}
                        onChange={(e) => { schimba(i, c, e.currentTarget.value); }} />
                      <span>{unitateSet(c)}</span>
                    </span>
                  </label>
                ))}
              </div>
              <CalculatorAvans unde={`set-${i}`} diametru={diametru} taisuri={taisuri} turatie={s.turatie} dezactivat={dezactivat} ro={ro}
                onScrie={(n, f) => { onSeturi(seturi.map((x, j) => (j === i ? { ...x, turatie: n, avans: f } : x))); }} />
            </li>
          ))}
        </ol>
      ) : null}
      <datalist id="freze-materiale-sugestii">{sugestii.map((m) => <option key={m} value={m} />)}</datalist>
      {textProblema ? <small className="freze-eroare" id="freze-eroare-materiale" role="alert">{textProblema}</small> : null}
      <div className="freze-materiale-jos">
        <button type="button" data-freze="set-adauga" disabled={dezactivat || plin} onClick={adauga}>+ {t('freze.material.adauga')}</button>
        {plin ? <span className="freze-ajutor">{t('freze.motiv.materiale-multe', { max: MARGINI_FREZA.materiale })}</span> : null}
      </div>
    </fieldset>
  );
}

/** Tabelul seturilor din fișa doar de citit. */
export function MaterialeFisa({ seturi, ro }: { readonly seturi: readonly SetMaterial[]; readonly ro: boolean }): ReactNode {
  return (
    <section className="freze-fisa-parte" aria-labelledby="freze-fisa-materiale">
      <h4 id="freze-fisa-materiale">{t('freze.materiale')}</h4>
      <div className="freze-seturi-lista">
        <table className="freze-seturi-tabel" data-freze="fisa-materiale">
          <thead>
            <tr>
              <th scope="col">{t('freze.material.coloana')}</th>
              {CAMPURI_SET.map((c) => <th scope="col" key={c}>{etichetaSet(c)} ({unitateSet(c)})</th>)}
            </tr>
          </thead>
          <tbody>
            {seturi.map((s, i) => (
              <tr key={i} data-freze-fisa-set={i}>
                <td>{s.material}</td>
                {CAMPURI_SET.map((c) => <td key={c}>{textNumar(s[c], ro)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
