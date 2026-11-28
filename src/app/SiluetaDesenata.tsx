/**
 * Silueta desenată în „Frezele mele” (ADR 0304 §5, 5a, felia 16.A↑f-5): editorul punctelor și tabelul lor din fișă.
 *
 * Editorul ține punctele ca text scris de om (cu virgula sau punctul zecimal), ca restul câmpurilor ferestrei; freza din ele o
 * face fereastra (`frezaDin`), iar greșeala vine de la judecata frezei (`problemaPuncte`). Primul punct e vârful frezei, fix în
 * (0, 0); ultimul dă diametrul. Desenul la scară are un mâner pe fiecare punct: tras, punctul se lipește la 0,1 mm și rămâne
 * între vecini (r la cel puțin 0,1 mm de ei, h între h-urile lor), deci silueta rămâne bună; cu săgețile, se mută cu 0,1 mm
 * (cu Shift, 1 mm). Cât ține tragerea, scara desenului rămâne cea de la început: nimic nu fuge de sub cursor.
 * „Pornește de la…” copiază silueta unei freze din bibliotecă sau a unui profil din catalog (`puncteDesenate`).
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import { PLAFON } from '../model/document.ts';
import { puncteDesenate, type Freza, type MotivPuncte } from '../model/freza.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';

/** Un punct, ca text scris de om (r, h). */
export type PunctText = readonly [string, string];
/** O freză de la care se poate porni: id-ul opțiunii, numele arătat, freza. */
export type SursaSilueta = { readonly id: string; readonly nume: string; readonly f: Freza };

const PAS_TRAS = 0.1;
const curat = (x: number): number => Math.round(x * 1e4) / 1e4;
const lipit = (x: number): number => Math.round(x / PAS_TRAS) / 10;
const finit = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x);
const numar = (s: string): number => citesteNumar(s.trim()) ?? Number.NaN;

/** Punctele ca numere (un text greșit e NaN). */
export function puncteNumere(p: readonly PunctText[]): Array<[number, number]> {
  return p.map(([r, h]): [number, number] => [numar(r), numar(h)]);
}

/** Punctul `i` mutat la (r, h), ținut între vecini: r la cel puțin `PAS_TRAS` de ei, h între h-urile lor; un vecin greșit nu ține. */
function intreVecini(P: ReadonlyArray<readonly [number, number]>, i: number, r: number, h: number): [number, number] {
  const [r0, h0] = P[i]!;
  const a = P[i - 1], b = P[i + 1];
  const ra = a && finit(a[0]) ? a[0] + PAS_TRAS : 0;
  const rb = b && finit(b[0]) ? b[0] - PAS_TRAS : PLAFON.diametruScula / 2;
  const ha = a && finit(a[1]) ? a[1] : 0;
  const hb = b && finit(b[1]) ? b[1] : PLAFON.adancimeOperatie;
  const tine = (x: number, lo: number, hi: number, vechi: number): number => (lo <= hi ? Math.min(hi, Math.max(lo, x)) : vechi);
  return [curat(tine(r, ra, rb, r0)), curat(tine(h, ha, hb, h0))];
}

/** Cadrul desenului: cât de departe merg r și h (cu o margine), ca scara să cuprindă silueta. */
type Cadru = { readonly rMax: number; readonly hMax: number };
function cadruDin(P: ReadonlyArray<readonly [number, number]>): Cadru {
  const rs = P.map(([r]) => r).filter(finit), hs = P.map(([, h]) => h).filter(finit);
  const rMax = Math.max(1, ...rs) * 1.15;
  return { rMax, hMax: Math.max(rMax * 0.5, Math.max(0, ...hs) * 1.25, 1) };
}

const W = 320, H = 210, OX = 22, OY = H - 20, M = 10;
/** Pasul grilei, în mm: cel mai mic din șir care lasă cel puțin 14 px între linii. */
function pasGrila(k: number): number {
  for (const g of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]) if (g * k >= 14) return g;
  return 1000;
}

export function EditorPuncte({ puncte, onPuncte, problema, textProblema, dezactivat, ro, surse, onPornit }: {
  readonly puncte: readonly PunctText[];
  readonly onPuncte: (p: readonly PunctText[]) => void;
  /** Greșeala de arătat (după regula ferestrei: a câmpului schimbat, sau toate la „Salvează”), cu punctul ei; null: nimic. */
  readonly problema: { readonly motiv: MotivPuncte; readonly punct: number | null } | null;
  /** Textul greșelii (al punctelor sau, fără ea, al diametrului dat de ultimul punct); null: nimic. */
  readonly textProblema: string | null;
  readonly dezactivat: boolean;
  readonly ro: boolean;
  readonly surse: { readonly biblioteca: readonly SursaSilueta[]; readonly catalog: readonly SursaSilueta[] };
  readonly onPornit: (nume: string, n: number) => void;
}): ReactNode {
  const P = puncteNumere(puncte);
  const refDesen = useRef<SVGSVGElement>(null);
  const refTabel = useRef<HTMLTableElement>(null);
  const deFocus = useRef<string | null>(null);
  /** Tragerea în lucru: punctul și cadrul de la începutul ei (scara nu se schimbă sub cursor). */
  const [tras, setTras] = useState<{ readonly i: number; readonly cadru: Cadru } | null>(null);
  useEffect(() => {
    const s = deFocus.current;
    if (s === null) return;
    deFocus.current = null;
    refTabel.current?.querySelector<HTMLElement>(s)?.focus();
  });

  const text = (x: number): string => textNumar(curat(x), ro);
  const scrie = (i: number, j: 0 | 1, v: string): void => {
    onPuncte(puncte.map((p, k): PunctText => (k === i ? (j === 0 ? [v, p[1]] : [p[0], v]) : p)));
  };
  const muta = (i: number, r: number, h: number): void => {
    const [rr, hh] = intreVecini(P, i, r, h);
    onPuncte(puncte.map((p, k): PunctText => (k === i ? [text(rr), text(hh)] : p)));
  };
  /** „+”: după ultimul punct, unul cu 1 mm mai departe; între două, la mijloc. */
  const adauga = (i: number): void => {
    const [r, h] = P[i]!;
    const b = P[i + 1];
    const nou: [number, number] = b === undefined
      ? [finit(r) ? r + 1 : 1, finit(h) ? h : 0]
      : finit(r) && finit(h) && finit(b[0]) && finit(b[1]) ? [(r + b[0]) / 2, (h + b[1]) / 2] : [finit(r) ? r : 0, finit(h) ? h : 0];
    onPuncte([...puncte.slice(0, i + 1), [text(nou[0]), text(nou[1])], ...puncte.slice(i + 1)]);
    deFocus.current = `[data-freze-punct-r="${i + 1}"]`;
  };
  const scoate = (i: number): void => {
    onPuncte(puncte.filter((_, k) => k !== i));
    deFocus.current = `[data-freze-punct-r="${Math.min(i, puncte.length - 2)}"]`;
  };
  const porneste = (id: string): void => {
    const s = [...surse.biblioteca, ...surse.catalog].find((x) => x.id === id);
    const p = s ? puncteDesenate(s.f) : null;
    if (!s || !p) return;
    onPuncte(p.map(([r, h]): PunctText => [textNumar(r, ro), textNumar(h, ro)]));
    onPornit(s.nume, p.length);
  };

  // Desenul: scara din cadrul tragerii, dacă e una, altfel din punctele de acum.
  const cadru = tras?.cadru ?? cadruDin(P);
  const k = Math.min((W - OX - M) / cadru.rMax, (OY - M) / cadru.hMax);
  const X = (r: number): number => OX + r * k, Y = (h: number): number => OY - h * k;
  const bune = P.every(([r, h]) => finit(r) && finit(h));
  const R = P[P.length - 1]?.[0];
  const g = pasGrila(k);
  // Raza mânerelor: 7, sau cât lasă cea mai mică distanță dintre două puncte vecine pe desen (cel puțin 3).
  let dMin = Number.POSITIVE_INFINITY;
  for (let i = 1; i < P.length; i++) {
    const [ra, ha] = P[i - 1]!, [rb, hb] = P[i]!;
    if (finit(ra) && finit(ha) && finit(rb) && finit(hb)) dMin = Math.min(dMin, Math.hypot((rb - ra) * k, (hb - ha) * k));
  }
  const razaManer = Math.max(3, Math.min(7, dMin / 2.2));
  const linii: ReactNode[] = [];
  for (let x = g; x <= cadru.rMax + 1e-9; x += g) linii.push(<line key={`v${x}`} className="grila" x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(cadru.hMax)} />);
  for (let y = g; y <= cadru.hMax + 1e-9; y += g) linii.push(<line key={`o${y}`} className="grila" x1={X(0)} y1={Y(y)} x2={X(cadru.rMax)} y2={Y(y)} />);
  const din = (e: PointerEvent<SVGElement>): [number, number] | null => {
    const m = refDesen.current?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [(q.x - OX) / k, (OY - q.y) / k];
  };
  const tasta = (i: number) => (e: KeyboardEvent<SVGElement>): void => {
    const pas = e.shiftKey ? 1 : PAS_TRAS;
    const [r, h] = P[i]!;
    if (!finit(r) || !finit(h)) return;
    const d: Record<string, [number, number]> = { ArrowRight: [pas, 0], ArrowLeft: [-pas, 0], ArrowUp: [0, pas], ArrowDown: [0, -pas] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    muta(i, r + v[0], h + v[1]);
  };

  const greseala = problema?.punct ?? null;
  const invalid = (i: number, j: 0 | 1): true | undefined => {
    if (problema === null || greseala !== i) return undefined;
    if (problema.motiv === 'puncte-numar') return true;
    return (problema.motiv === 'puncte-r' ? j === 0 : problema.motiv === 'puncte-h' ? j === 1 : false) || undefined;
  };
  const descriere = textProblema !== null ? 'freze-eroare-puncte' : undefined;

  return (
    <fieldset className="freze-puncte" data-freze="puncte">
      <legend>{t('freze.puncte')}</legend>
      <p className="freze-ajutor">{t('freze.puncte.nota')}</p>
      <div className="freze-puncte-sus">
        <svg ref={refDesen} className="freze-puncte-desen" data-freze="desen-puncte" viewBox={`0 0 ${W} ${H}`} role="group"
          aria-label={t('freze.puncte.desen')}>
          {linii}
          <line className="axa" x1={X(0)} y1={Y(0)} x2={X(cadru.rMax)} y2={Y(0)} />
          <line className="axa" x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(cadru.hMax)} />
          <text className="cota-text" x={X(cadru.rMax)} y={Y(0) + 14} textAnchor="end">r</text>
          <text className="cota-text" x={X(0) - 6} y={Y(cadru.hMax) + 10} textAnchor="end">h</text>
          {bune && finit(R) ? (
            <>
              <polygon className="corp"
                points={[...P, [R, cadru.hMax] as const, [0, cadru.hMax] as const].map(([r, h]) => `${X(r).toFixed(2)},${Y(h).toFixed(2)}`).join(' ')} />
              <polyline className="profil" points={P.map(([r, h]) => `${X(r).toFixed(2)},${Y(h).toFixed(2)}`).join(' ')} />
            </>
          ) : null}
          <circle className="varf" cx={X(0)} cy={Y(0)} r={4} />
          {P.map(([r, h], i) => (i === 0 || !finit(r) || !finit(h) ? null : (
            <circle key={i} className="maner" data-freze-maner={i} data-tras={tras?.i === i ? true : undefined}
              data-gresit={greseala === i ? true : undefined} data-des={razaManer < 5 ? true : undefined} cx={X(r)} cy={Y(h)} r={razaManer} tabIndex={dezactivat ? -1 : 0} role="button"
              aria-label={t('freze.puncte.maner', { n: i + 1, r: text(r), h: text(h) })}
              onKeyDown={dezactivat ? undefined : tasta(i)}
              onPointerDown={dezactivat ? undefined : (e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                e.currentTarget.focus();
                setTras({ i, cadru });
              }}
              onPointerMove={(e) => {
                if (tras?.i !== i) return;
                const q = din(e);
                if (q) muta(i, lipit(q[0]), lipit(q[1]));
              }}
              onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setTras(null); }}
              onPointerCancel={() => { setTras(null); }} />
          )))}
        </svg>
        <div className="freze-puncte-unelte">
          <label className="freze-camp">
            <span>{t('freze.puncte.porneste')}</span>
            <select data-freze="porneste-de-la" value="" disabled={dezactivat} onChange={(e) => { porneste(e.currentTarget.value); }}>
              <option value="">{t('freze.puncte.porneste.alege')}</option>
              {surse.biblioteca.length > 0 ? (
                <optgroup label={t('freze.puncte.porneste.ale-mele')}>
                  {surse.biblioteca.map((s) => <option key={s.id} value={s.id}>{s.nume}</option>)}
                </optgroup>
              ) : null}
              <optgroup label={t('freze.puncte.porneste.catalog')}>
                {surse.catalog.map((s) => <option key={s.id} value={s.id}>{s.nume}</option>)}
              </optgroup>
            </select>
          </label>
          <p className="freze-ajutor" data-freze="puncte-diametru">
            {t('freze.puncte.diametru', { d: finit(R) ? text(2 * R) : '?' })}
          </p>
        </div>
      </div>
      <div className="freze-puncte-lista">
      <table ref={refTabel} className="freze-puncte-tabel">
        <colgroup>
          <col className="col-nr" />
          <col />
          <col />
          <col className="col-unelte" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{t('freze.puncte.nr')}</th>
            <th scope="col">{t('freze.puncte.r')}</th>
            <th scope="col">{t('freze.puncte.h')}</th>
            <th scope="col"><span className="freze-ascuns">{t('freze.puncte.unelte')}</span></th>
          </tr>
        </thead>
        <tbody>
          {puncte.map(([r, h], i) => (
            <tr key={i} data-freze-punct={i}>
              <th scope="row">{i + 1}</th>
              {i === 0 ? (
                <>
                  <td>0</td>
                  <td>0</td>
                </>
              ) : (
                <>
                  <td>
                    <input type="text" inputMode="decimal" data-freze-punct-r={i} value={r} disabled={dezactivat}
                      aria-label={t('freze.puncte.r.la', { n: i + 1 })} aria-invalid={invalid(i, 0)} aria-describedby={invalid(i, 0) ? descriere : undefined}
                      onChange={(e) => { scrie(i, 0, e.currentTarget.value); }} />
                  </td>
                  <td>
                    <input type="text" inputMode="decimal" data-freze-punct-h={i} value={h} disabled={dezactivat}
                      aria-label={t('freze.puncte.h.la', { n: i + 1 })} aria-invalid={invalid(i, 1)} aria-describedby={invalid(i, 1) ? descriere : undefined}
                      onChange={(e) => { scrie(i, 1, e.currentTarget.value); }} />
                  </td>
                </>
              )}
              <td className="freze-puncte-butoane">
                <span>
                <button type="button" data-freze="punct-adauga" disabled={dezactivat || puncte.length >= PLAFON.puncteProfil}
                  aria-label={t('freze.puncte.adauga', { n: i + 1 })} title={t('freze.puncte.adauga', { n: i + 1 })}
                  onClick={() => { adauga(i); }}>+</button>
                {i > 0 ? (
                  <button type="button" data-freze="punct-scoate" disabled={dezactivat || puncte.length <= 2}
                    aria-label={t('freze.puncte.scoate', { n: i + 1 })} title={t('freze.puncte.scoate', { n: i + 1 })}
                    onClick={() => { scoate(i); }}>✕</button>
                ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {textProblema !== null ? <small className="freze-eroare" id="freze-eroare-puncte">{textProblema}</small> : null}
    </fieldset>
  );
}

/** Punctele siluetei în fișa frezei, doar de citit: numărul, r și h; peste 12 puncte, strânse (se deschid la cerere). */
export function PuncteFisa({ puncte, ro }: { readonly puncte: ReadonlyArray<readonly [number, number]>; readonly ro: boolean }): ReactNode {
  return (
    <details className="freze-fisa-parte freze-fisa-puncte" data-freze="fisa-puncte" open={puncte.length <= 12}>
      <summary>{t('freze.puncte.fisa', { n: puncte.length })}</summary>
      <table className="freze-puncte-tabel">
        <colgroup>
          <col className="col-nr" />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{t('freze.puncte.nr')}</th>
            <th scope="col">{t('freze.puncte.r')}</th>
            <th scope="col">{t('freze.puncte.h')}</th>
          </tr>
        </thead>
        <tbody>
          {puncte.map(([r, h], i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              <td>{textNumar(r, ro)}</td>
              <td>{textNumar(h, ro)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
