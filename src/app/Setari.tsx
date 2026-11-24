/**
 * Fereastra Setări (ADR 0330 §6, felia 10.4↑a-3): setările generale ale aplicației, pe secțiuni; acum una singură, Cotele.
 * Se deschide din meniul contului („Setări…”), din paletă (`vedere.setari`), cu Ctrl+, și din ⚙ al uneltei Cote. Fiecare
 * schimbare se aplică pe loc, tuturor cotelor, și se ține în browser (`setariCote.ts`); nu e nimic de păstrat sau de anulat,
 * deci fereastra are doar Închide (și Escape). Fiecare grup are „Înapoi la implicit”, fiecare setare o frază scurtă, iar sus
 * stă cota de probă, desenată cu setările de acum (aceeași geometrie ca pe pânză, `desenCota.ts`).
 *
 * Un număr se scrie cu virgulă sau cu punct; unul greșit sau în afara marginilor rămâne în câmp, spus, și nu se ține.
 * Vine la cerere, cu mesajele editării (`editare`).
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Punct } from '../geom/conturBaza.ts';
import { caleArc, cifraCota, desenCota, FELURI_CAPAT, LINII_RAZEI, LOCURI_CIFRA, type DesenCota } from '../model/desenCota.ts';
import type { Cota } from '../model/document.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import {
  eImplicit, FELURI_LIPIRE, formatCote, FRACTII_COTE, grupImplicit, GRUPURI_COTE, MARGINI, PREFIX_MAXIM, schimbaSetariCote, stilCote, UNITATI_COTE,
  useSetariCote, type GrupCote, type SetariCote,
} from './setariCote.ts';
import './setari.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Secțiunile ferestrei, în ordine; o secțiune nouă (lipirea, grila, colțurile, ADR 0330 §6) se adaugă aici. */
export const SECTIUNI_SETARI = ['cote'] as const;
export type SectiuneSetari = (typeof SECTIUNI_SETARI)[number];

type Margini = readonly [number, number];

/** Un rând: eticheta, controlul și fraza lui (legată de control, ca descriere). */
function Rand({ id, eticheta, nota, children }: { readonly id: string; readonly eticheta: string; readonly nota?: string; readonly children: ReactNode }): ReactNode {
  return (
    <div className="setari-rand">
      <label htmlFor={id}>{eticheta}</label>
      {children}
      {nota ? <small id={`${id}-nota`}>{nota}</small> : null}
    </div>
  );
}

/** Un număr în margini: scris liber, ținut la Enter sau la ieșirea din câmp, dacă e bun; altfel spus lângă el. */
function CampNumar({ id, setare, eticheta, nota, valoare, margini, la, virgula }: {
  readonly id: string; readonly setare: string; readonly eticheta: string; readonly nota?: string; readonly valoare: number;
  readonly margini: Margini; readonly la: (v: number) => void; readonly virgula: boolean;
}): ReactNode {
  const [text, setText] = useState<string | null>(null);
  const [gresit, setGresit] = useState(false);
  const ia = (): void => {
    if (text === null) return;
    const v = citesteNumar(text);
    if (v === null || v < margini[0] || v > margini[1]) {
      setGresit(true);
      return;
    }
    setGresit(false);
    setText(null);
    if (v !== valoare) la(v);
  };
  const descriere = [nota ? `${id}-nota` : '', gresit ? `${id}-gresit` : ''].filter(Boolean).join(' ');
  return (
    <Rand id={id} eticheta={eticheta} {...(nota ? { nota } : {})}>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} data-setare={setare}
        value={text ?? textNumar(valoare, virgula)} aria-invalid={gresit} aria-describedby={descriere || undefined}
        onChange={(e) => { setText(e.target.value); setGresit(false); }} onBlur={ia}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ia(); } }} />
      {gresit ? (
        <small id={`${id}-gresit`} className="setari-gresit" role="alert">
          {t('setari.gresit', { min: textNumar(margini[0], virgula), max: textNumar(margini[1], virgula) })}
        </small>
      ) : null}
    </Rand>
  );
}

/** Un text scurt (prefixul razei, al diametrului): ținut la fiecare schimbare, cât are cel mult `maxim` semne. */
function CampText({ id, setare, eticheta, nota, valoare, maxim, la }: {
  readonly id: string; readonly setare: string; readonly eticheta: string; readonly nota?: string; readonly valoare: string;
  readonly maxim: number; readonly la: (v: string) => void;
}): ReactNode {
  return (
    <Rand id={id} eticheta={eticheta} {...(nota ? { nota } : {})}>
      <input id={id} type="text" autoComplete="off" spellCheck={false} data-setare={setare} value={valoare} maxLength={maxim}
        aria-describedby={nota ? `${id}-nota` : undefined} onChange={(e) => { const v = e.currentTarget.value; if ([...v].length <= maxim) la(v); }} />
    </Rand>
  );
}

/** O alegere dintre câteva valori, ca listă. */
function Alegere<T extends string>({ id, setare, eticheta, nota, valoare, valori, la }: {
  readonly id: string; readonly setare: string; readonly eticheta: string; readonly nota?: string; readonly valoare: T;
  readonly valori: readonly { readonly v: T; readonly text: string }[]; readonly la: (v: T) => void;
}): ReactNode {
  return (
    <Rand id={id} eticheta={eticheta} {...(nota ? { nota } : {})}>
      <select id={id} data-setare={setare} value={valoare} aria-describedby={nota ? `${id}-nota` : undefined}
        onChange={(e) => { const v = valori.find((x) => x.v === e.currentTarget.value); if (v) la(v.v); }}>
        {valori.map((x) => <option key={x.v} value={x.v}>{x.text}</option>)}
      </select>
    </Rand>
  );
}

/** O bifă, cu fraza ei. */
function Bifa({ id, setare, eticheta, nota, valoare, la }: {
  readonly id: string; readonly setare: string; readonly eticheta: string; readonly nota?: string; readonly valoare: boolean; readonly la: (v: boolean) => void;
}): ReactNode {
  return (
    <div className="setari-rand setari-bifa">
      <input id={id} type="checkbox" data-setare={setare} checked={valoare} aria-describedby={nota ? `${id}-nota` : undefined}
        onChange={(e) => { la(e.currentTarget.checked); }} />
      <label htmlFor={id}>{eticheta}</label>
      {nota ? <small id={`${id}-nota`}>{nota}</small> : null}
    </div>
  );
}

/** Un grup de setări, cu titlul și „Înapoi la implicit” (oprit cât grupul are deja implicitele). */
function Grup({ grup, s, children }: { readonly grup: GrupCote; readonly s: SetariCote; readonly children: ReactNode }): ReactNode {
  const titlu = `setari-grup-${grup}`;
  return (
    <section className="setari-grup" aria-labelledby={titlu} data-grup={grup}>
      <header>
        <h4 id={titlu}>{t(`setari.cote.grup.${grup}`)}</h4>
        <button type="button" className="setari-implicit" data-setari-implicit={grup} disabled={eImplicit(s, grup)}
          onClick={() => { schimbaSetariCote(grupImplicit(s, grup)); }}>{t('setari.implicit')}</button>
      </header>
      {children}
    </section>
  );
}

/**
 * Cota de probă: un dreptunghi de 120,5 × 40 mm cu o cotă orizontală deasupra și una verticală la dreapta, un cerc de rază 14
 * cu raza lui și un unghi de 25° sub dreptunghi, desenate cu setările de acum, în mm (viewBox-ul le cuprinde pe toate; liniile
 * au grosimea ecranului, nu a scării).
 */
const L_PROBA = 120.5, H_PROBA = 40;
const CERC_PROBA = { x: L_PROBA + 50, y: 20, r: 14 };
const UNGHI_PROBA = { v: { x: 10, y: -30 }, a: (25 * Math.PI) / 180, l: 55 };
const COTE_PROBA: readonly { readonly cota: Cota; readonly p: readonly Punct[]; readonly v: number }[] = [
  { cota: { id: 'o', fel: 'orizontala', linie: { d: 12 } }, p: [{ x: 0, y: H_PROBA }, { x: L_PROBA, y: H_PROBA }], v: L_PROBA },
  { cota: { id: 'v', fel: 'verticala', linie: { d: -14 } }, p: [{ x: L_PROBA, y: 0 }, { x: L_PROBA, y: H_PROBA }], v: H_PROBA },
  {
    cota: { id: 'r', fel: 'raza', linie: { d: 6 } },
    p: [{ x: CERC_PROBA.x, y: CERC_PROBA.y }, { x: CERC_PROBA.x + CERC_PROBA.r * Math.SQRT1_2, y: CERC_PROBA.y + CERC_PROBA.r * Math.SQRT1_2 }],
    v: CERC_PROBA.r,
  },
  {
    cota: { id: 'u', fel: 'unghi', linie: { d: 40, s1: 1, s2: 1 } },
    p: [UNGHI_PROBA.v, { x: UNGHI_PROBA.v.x + UNGHI_PROBA.l, y: UNGHI_PROBA.v.y },
      { x: UNGHI_PROBA.v.x + UNGHI_PROBA.l * Math.cos(UNGHI_PROBA.a), y: UNGHI_PROBA.v.y + UNGHI_PROBA.l * Math.sin(UNGHI_PROBA.a) }],
    v: 25,
  },
];

function Proba({ s, virgula }: { readonly s: SetariCote; readonly virgula: boolean }): ReactNode {
  const stil = stilCote(s), format = formatCote(s, virgula);
  const L = L_PROBA, H = H_PROBA, C = CERC_PROBA, U = COTE_PROBA[3]?.p ?? [];
  const cote: { readonly dc: DesenCota | null; readonly text: string; readonly fel: string }[] = COTE_PROBA.map((c) => {
    const text = cifraCota(c.cota.fel, c.v, format);
    return { dc: desenCota(c.cota, c.p, stil, text), text, fel: c.cota.fel };
  });
  const puncte: Punct[] = [{ x: 0, y: 0 }, { x: L, y: H }, { x: C.x - C.r, y: C.y - C.r }, { x: C.x + C.r, y: C.y + C.r }, ...U];
  for (const { dc, text } of cote) {
    if (!dc) continue;
    for (const b of [...dc.bucati, ...dc.extensii]) puncte.push(b[0], b[1]);
    for (const a of dc.arce) puncte.push(...[0, 0.5, 1].map((k) => ({ x: a.centru.x + a.raza * Math.cos(a.de + k * a.baleiaj), y: a.centru.y + a.raza * Math.sin(a.de + k * a.baleiaj) })));
    const w = [...text].length * 0.6 * dc.text.inaltime;
    puncte.push({ x: dc.text.p.x - w, y: dc.text.p.y - w }, { x: dc.text.p.x + w, y: dc.text.p.y + w });
  }
  const xs = puncte.map((p) => p.x), ys = puncte.map((p) => p.y);
  const m = 2, x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
  const y = (v: number): number => -v;
  return (
    <figure className="setari-proba" data-testid="setari-proba">
      <svg viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} role="img" aria-label={t('setari.proba')}
        style={s.comportament.culoare ? ({ '--cota': s.comportament.culoare } as CSSProperties) : undefined}>
        <rect className="setari-proba-forma" x={0} y={-H} width={L} height={H} vectorEffect="non-scaling-stroke" />
        <circle className="setari-proba-forma" cx={C.x} cy={-C.y} r={C.r} vectorEffect="non-scaling-stroke" />
        <polyline className="setari-proba-forma" points={[U[1], U[0], U[2]].map((q) => (q ? `${q.x},${y(q.y)}` : '')).join(' ')} vectorEffect="non-scaling-stroke" />
        {cote.map(({ dc, text, fel }, k) => dc ? (
          <g key={k} className="setari-proba-cota" data-text={text} data-fel={fel}>
            {[...dc.extensii, ...dc.bucati].map((b, j) => <line key={j} x1={b[0].x} y1={y(b[0].y)} x2={b[1].x} y2={y(b[1].y)} vectorEffect="non-scaling-stroke" />)}
            {dc.arce.map((a, j) => <path key={`a${j}`} d={caleArc(a, (v) => v, y, 1)} vectorEffect="non-scaling-stroke" />)}
            {dc.capete.map((c, j) => c.fel === 'bara'
              ? <line key={`c${j}`} className="setari-proba-bara" x1={c.bucata[0].x} y1={y(c.bucata[0].y)} x2={c.bucata[1].x} y2={y(c.bucata[1].y)} vectorEffect="non-scaling-stroke" />
              : c.fel === 'punct'
                ? <circle key={`c${j}`} className="setari-proba-plin" cx={c.centru.x} cy={y(c.centru.y)} r={c.raza} />
                : <polygon key={`c${j}`} className={c.plina ? 'setari-proba-plin' : 'setari-proba-gol'} points={c.puncte.map((q) => `${q.x},${y(q.y)}`).join(' ')} vectorEffect="non-scaling-stroke" />)}
            <text x={dc.text.p.x} y={y(dc.text.p.y)} fontSize={dc.text.inaltime} textAnchor="middle"
              transform={`rotate(${-dc.text.unghi} ${dc.text.p.x} ${y(dc.text.p.y)})`}>{text}</text>
          </g>
        ) : null)}
      </svg>
      <figcaption>{t('setari.proba')}</figcaption>
    </figure>
  );
}

/** Secțiunea Cotele: cifrele, liniile și capetele, raza și unghiul, comportamentul, lipirea, măsurarea (tabelul ADR 0330 §6). */
function SectiuneCote({ s, virgula }: { readonly s: SetariCote; readonly virgula: boolean }): ReactNode {
  const id = useId();
  const pune = (n: SetariCote): void => { schimbaSetariCote(n); };
  const cifre = (c: Partial<SetariCote['cifre']>): void => { pune({ ...s, cifre: { ...s.cifre, ...c } }); };
  const linii = (l: Partial<SetariCote['linii']>): void => { pune({ ...s, linii: { ...s.linii, ...l } }); };
  const raza = (r: Partial<SetariCote['raza']>): void => { pune({ ...s, raza: { ...s.raza, ...r } }); };
  const comp = (c: Partial<SetariCote['comportament']>): void => { pune({ ...s, comportament: { ...s.comportament, ...c } }); };
  const lipire = (l: Partial<SetariCote['lipire']>): void => { pune({ ...s, lipire: { ...s.lipire, ...l } }); };
  const masurare = (m: Partial<SetariCote['masurare']>): void => { pune({ ...s, masurare: { ...s.masurare, ...m } }); };
  const v = <T extends string>(prefix: string, valori: readonly T[]): readonly { readonly v: T; readonly text: string }[] =>
    valori.map((x) => ({ v: x, text: t(`${prefix}.${x}` as CheieSimpla) }));
  const nr = (k: string, setare: string, eticheta: CheieSimpla, valoare: number, margini: Margini, la: (x: number) => void, nota?: CheieSimpla): ReactNode => (
    <CampNumar id={`${id}-${k}`} setare={setare} eticheta={t(eticheta)} valoare={valoare} margini={margini} la={la} virgula={virgula} {...(nota ? { nota: t(nota) } : {})} />
  );
  const zecimale = s.cifre.zecimale === null ? 'auto' : String(s.cifre.zecimale);
  // În fracții de inch, zecimalele și rotunjirea nu se aplică (fracția e rotunjirea); zerourile și separatorul țin și de unghiuri.
  const fractii = s.cifre.unitate === 'fractii';
  return (
    <div className="setari-sectiune" data-sectiune="cote">
      <h3 id={`${id}-titlu`}>{t('setari.sectiune.cote')}</h3>
      <p className="setari-intro">{t('setari.cote.intro')}</p>
      <Proba s={s} virgula={virgula} />
      <Grup grup="cifre" s={s}>
        <Alegere id={`${id}-unitate`} setare="cifre.unitate" eticheta={t('setari.cote.unitate')} nota={t('setari.cote.unitate.nota')}
          valoare={s.cifre.unitate} valori={v('setari.cote.unitate', UNITATI_COTE)} la={(x) => { cifre({ unitate: x }); }} />
        {fractii ? (
          <Alegere id={`${id}-fractie`} setare="cifre.fractie" eticheta={t('setari.cote.fractie')} nota={t('setari.cote.fractie.nota')} valoare={String(s.cifre.fractie)}
            valori={FRACTII_COTE.map((x) => ({ v: String(x), text: `1/${x}` }))} la={(x) => { cifre({ fractie: Number(x) }); }} />
        ) : (
          <Alegere id={`${id}-zecimale`} setare="cifre.zecimale" eticheta={t('setari.cote.zecimale')} valoare={zecimale}
            valori={[{ v: 'auto', text: t('setari.cote.zecimale.auto') }, ...['0', '1', '2', '3', '4', '5', '6'].map((x) => ({ v: x, text: x }))]}
            la={(x) => { cifre({ zecimale: x === 'auto' ? null : Number(x) }); }} />
        )}
        <Alegere id={`${id}-zerouri`} setare="cifre.zerouri" eticheta={t('setari.cote.zerouri')} valoare={s.cifre.zerouri}
          valori={v('setari.cote.zerouri', ['taiate', 'pastrate'] as const)} la={(x) => { cifre({ zerouri: x }); }} />
        {fractii ? null : (
          <Alegere id={`${id}-rotunjire`} setare="cifre.rotunjire" eticheta={t('setari.cote.rotunjire')} nota={t('setari.cote.rotunjire.nota')}
            valoare={s.cifre.pas === null ? 'zecimale' : 'pas'} valori={v('setari.cote.rotunjire', ['zecimale', 'pas'] as const)}
            la={(x) => { cifre({ pas: x === 'pas' ? (s.cifre.pas ?? 0.5) : null }); }} />
        )}
        {s.cifre.pas !== null && !fractii ? nr('pas', 'cifre.pas', 'setari.cote.pas', s.cifre.pas, MARGINI.pas, (x) => { cifre({ pas: x }); }) : null}
        <Alegere id={`${id}-separator`} setare="cifre.separator" eticheta={t('setari.cote.separator')} valoare={s.cifre.separator}
          valori={v('setari.cote.separator', ['limba', 'virgula', 'punct'] as const)} la={(x) => { cifre({ separator: x }); }} />
        <Bifa id={`${id}-cu-unitate`} setare="cifre.cuUnitate" eticheta={t('setari.cote.cu-unitate')} nota={t('setari.cote.cu-unitate.nota')}
          valoare={s.cifre.cuUnitate} la={(x) => { cifre({ cuUnitate: x }); }} />
        {nr('inaltime', 'cifre.inaltime', 'setari.cote.inaltime', s.cifre.inaltime, MARGINI.inaltime, (x) => { cifre({ inaltime: x }); }, 'setari.cote.inaltime.nota')}
        <Alegere id={`${id}-loc`} setare="cifre.loc" eticheta={t('setari.cote.loc')} valoare={s.cifre.loc}
          valori={v('setari.cote.loc', LOCURI_CIFRA)} la={(x) => { cifre({ loc: x }); }} />
      </Grup>
      <Grup grup="linii" s={s}>
        <Alegere id={`${id}-capete`} setare="linii.capete" eticheta={t('setari.cote.capete')} valoare={s.linii.capete}
          valori={v('setari.cote.capete', FELURI_CAPAT)} la={(x) => { linii({ capete: x }); }} />
        {nr('marime', 'linii.marime', 'setari.cote.marime', s.linii.marime, MARGINI.marime, (x) => { linii({ marime: x }); })}
        <Bifa id={`${id}-extensii`} setare="linii.extensii" eticheta={t('setari.cote.extensii')} nota={t('setari.cote.extensii.nota')}
          valoare={s.linii.extensii} la={(x) => { linii({ extensii: x }); }} />
        {nr('gol', 'linii.gol', 'setari.cote.gol', s.linii.gol, MARGINI.gol, (x) => { linii({ gol: x }); })}
        {nr('depasire', 'linii.depasire', 'setari.cote.depasire', s.linii.depasire, MARGINI.depasire, (x) => { linii({ depasire: x }); })}
        {nr('distanta', 'linii.distanta', 'setari.cote.distanta', s.linii.distanta, MARGINI.distanta, (x) => { linii({ distanta: x }); }, 'setari.cote.distanta.nota')}
      </Grup>
      <Grup grup="raza" s={s}>
        <CampText id={`${id}-prefix-r`} setare="raza.prefixR" eticheta={t('setari.cote.prefix-r')} nota={t('setari.cote.prefix.nota')}
          valoare={s.raza.prefixR} maxim={PREFIX_MAXIM} la={(x) => { raza({ prefixR: x }); }} />
        <CampText id={`${id}-prefix-d`} setare="raza.prefixD" eticheta={t('setari.cote.prefix-d')}
          valoare={s.raza.prefixD} maxim={PREFIX_MAXIM} la={(x) => { raza({ prefixD: x }); }} />
        <Alegere id={`${id}-unghiuri`} setare="raza.unghiuri" eticheta={t('setari.cote.unghiuri')} nota={t('setari.cote.unghiuri.nota')} valoare={s.raza.unghiuri}
          valori={v('setari.cote.unghiuri', ['zecimale', 'gms'] as const)} la={(x) => { raza({ unghiuri: x }); }} />
        <Alegere id={`${id}-zecimale-unghi`} setare="raza.zecimaleUnghi" eticheta={t('setari.cote.zecimale-unghi')} valoare={String(s.raza.zecimaleUnghi)}
          valori={['0', '1', '2', '3', '4'].map((x) => ({ v: x, text: x }))} la={(x) => { raza({ zecimaleUnghi: Number(x) }); }} />
        <Alegere id={`${id}-linia-razei`} setare="raza.linia" eticheta={t('setari.cote.linia-razei')} nota={t('setari.cote.linia-razei.nota')} valoare={s.raza.linia}
          valori={v('setari.cote.linia-razei', LINII_RAZEI)} la={(x) => { raza({ linia: x }); }} />
      </Grup>
      <Grup grup="comportament" s={s}>
        <Bifa id={`${id}-legate`} setare="comportament.legate" eticheta={t('setari.cote.legate')} nota={t('setari.cote.legate.nota')}
          valoare={s.comportament.legate} la={(x) => { comp({ legate: x }); }} />
        <Alegere id={`${id}-pornire`} setare="comportament.pornire" eticheta={t('setari.cote.pornire')} valoare={s.comportament.pornire}
          valori={v('setari.cote.pornire', ['automata', 'ultimul'] as const)} la={(x) => { comp({ pornire: x }); }} />
        <Alegere id={`${id}-dupa`} setare="comportament.dupa" eticheta={t('setari.cote.dupa')} valoare={s.comportament.dupa}
          valori={v('setari.cote.dupa', ['ramane', 'selectie'] as const)} la={(x) => { comp({ dupa: x }); }} />
        <Bifa id={`${id}-pe-panza`} setare="comportament.pePanza" eticheta={t('setari.cote.pe-panza')} nota={t('setari.cote.pe-panza.nota')}
          valoare={s.comportament.pePanza} la={(x) => { comp({ pePanza: x }); }} />
        <Alegere id={`${id}-vecine`} setare="comportament.vecine" eticheta={t('setari.cote.vecine')} nota={t('setari.cote.vecine.nota')}
          valoare={s.comportament.vecine} valori={v('setari.cote.vecine', ['estompate', 'ascunse'] as const)} la={(x) => { comp({ vecine: x }); }} />
        {nr('prag', 'comportament.pragCifre', 'setari.cote.prag', s.comportament.pragCifre, MARGINI.pragCifre, (x) => { comp({ pragCifre: x }); }, 'setari.cote.prag.nota')}
        <Alegere id={`${id}-culoare`} setare="comportament.culoare" eticheta={t('setari.cote.culoare')} valoare={s.comportament.culoare === null ? 'tema' : 'aleasa'}
          valori={v('setari.cote.culoare', ['tema', 'aleasa'] as const)} la={(x) => { comp({ culoare: x === 'tema' ? null : (s.comportament.culoare ?? '#0080a0') }); }} />
        {s.comportament.culoare !== null ? (
          <Rand id={`${id}-culoarea`} eticheta={t('setari.cote.culoarea')}>
            <input id={`${id}-culoarea`} type="color" data-setare="comportament.culoarea" value={s.comportament.culoare}
              onChange={(e) => { comp({ culoare: e.currentTarget.value.toLowerCase() }); }} />
          </Rand>
        ) : null}
      </Grup>
      <Grup grup="lipire" s={s}>
        <fieldset className="setari-bife">
          <legend>{t('setari.cote.puncte')}</legend>
          {FELURI_LIPIRE.map((f) => (
            <Bifa key={f} id={`${id}-lipire-${f}`} setare={`lipire.${f}`} eticheta={t(`setari.cote.punct.${f}`)} valoare={s.lipire.felurile[f]}
              la={(x) => { lipire({ felurile: { ...s.lipire.felurile, [f]: x } }); }} />
          ))}
        </fieldset>
        {nr('toleranta', 'lipire.toleranta', 'setari.cote.toleranta', s.lipire.toleranta, MARGINI.toleranta, (x) => { lipire({ toleranta: x }); }, 'setari.cote.toleranta.nota')}
        <Alegere id={`${id}-contur`} setare="lipire.contur" eticheta={t('setari.cote.contur')} valoare={s.lipire.contur}
          valori={v('setari.cote.contur', ['ctrl', 'mereu', 'niciodata'] as const)} la={(x) => { lipire({ contur: x }); }} />
      </Grup>
      <Grup grup="masurare" s={s}>
        <fieldset className="setari-bife">
          <legend>{t('setari.cote.ce-arata')}</legend>
          {(['distanta', 'delta', 'unghi'] as const).map((k) => (
            <Bifa key={k} id={`${id}-m-${k}`} setare={`masurare.${k}`} eticheta={t(`setari.cote.masurare.${k}`)} valoare={s.masurare[k]}
              la={(x) => { masurare({ [k]: x }); }} />
          ))}
        </fieldset>
        <fieldset className="setari-bife">
          <legend>{t('setari.cote.unde')}</legend>
          {(['cursor', 'bara'] as const).map((k) => (
            <Bifa key={k} id={`${id}-m-${k}`} setare={`masurare.${k}`} eticheta={t(`setari.cote.masurare.${k}`)} valoare={s.masurare[k]}
              la={(x) => { masurare({ [k]: x }); }} />
          ))}
        </fieldset>
      </Grup>
    </div>
  );
}

export function Setari({ sectiune = 'cote', onInchide, focusInapoi }: {
  /** Secțiunea deschisă la început (⚙ al uneltei Cote: Cotele). */
  readonly sectiune?: SectiuneSetari;
  readonly onInchide: () => void;
  /** Unde era focusul înainte: acolo se întoarce la închidere. */
  readonly focusInapoi: Element | null;
}): ReactNode {
  const limba = useLimba();
  const s = useSetariCote();
  const [aleasa, setAleasa] = useState<SectiuneSetari>(sectiune);
  // Focusul pe prima secțiune; la închidere (curățarea rulează după ce aplicația nu mai e inertă) se întoarce unde era.
  const prima = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    prima.current?.focus();
    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };
  }, [focusInapoi]);
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    onInchide();
  };
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="setari-titlu" data-testid="dialog-setari" onKeyDown={tasta}>
      <div className="dialog-cutie dialog-setari">
        <h2 id="setari-titlu">{t('setari.titlu')}</h2>
        <div className="setari-corp">
          <nav className="setari-sectiuni" aria-label={t('setari.sectiuni')}>
            {SECTIUNI_SETARI.map((x, k) => (
              <button key={x} ref={k === 0 ? prima : undefined} type="button" data-setari-sectiune={x} aria-current={aleasa === x ? 'page' : undefined}
                onClick={() => { setAleasa(x); }}>{t(`setari.sectiune.${x}`)}</button>
            ))}
          </nav>
          {aleasa === 'cote' ? <SectiuneCote s={s} virgula={limba === 'ro'} /> : null}
        </div>
        <div className="butoane">
          <button type="button" data-buton="setari-inchide" onClick={onInchide}>{t('setari.inchide')}</button>
        </div>
      </div>
    </div>
  );
}
