/**
 * Pozele alegerilor din fereastra exportului (ADR 0290, felia 28.8↑b-2): desenate de mână, fixe, 64 × 44, pe cartonașele
 * alegerilor. Același stil ca desenele întrebărilor (`.dx-ilu`): lemnul, traseul verde, accentul pentru ce se alege.
 * Cartonașul (`Cartonase`) e un grup de butoane radio: inputul acoperă tot cartonașul, deci clicul, tastatura (săgețile) și
 * probele lucrează pe el, iar `data-camp` stă pe grup (sau pe fiecare variantă, unde fiecare are numele ei).
 */
import type { ReactNode } from 'react';

const LEMN = <rect className="l" x={3} y={3} width={58} height={38} rx={2} />;
const BUCLA = (<><rect className="l" x={15} y={11} width={34} height={22} rx={1} /><rect className="d" x={10} y={6} width={44} height={32} rx={6} /></>);
const sag = (d: string): ReactNode => <path className="dv" d={d} />;

/** Pozele, după numele alegerii (`<camp>.<valoare>`). */
export const POZE: Readonly<Record<string, ReactNode>> = {
  'latura.exterior': <><rect className="l" x={17} y={13} width={30} height={18} rx={1} /><rect className="d" x={11} y={7} width={42} height={30} rx={6} /><circle className="f" cx={53} cy={22} r={4} /></>,
  'latura.interior': <>{LEMN}<rect className="g contur" x={16} y={10} width={32} height={24} rx={1} /><rect className="d" x={21} y={15} width={22} height={14} rx={3} /><circle className="f" cx={43} cy={22} r={4} /></>,
  'latura.pe-linie': <><path className="lat" d="M7 33C19 3 38 43 57 11" /><path className="c" d="M7 33C19 3 38 43 57 11" /><circle className="f" cx={57} cy={11} r={4} /></>,
  'latura.stanga': <><path className="c" d="M8 32L56 14" /><path className="d" d="M6.4 27.3L54.4 9.3" /><circle className="f" cx={54.4} cy={9.3} r={4} /></>,
  'latura.dreapta': <><path className="c" d="M8 32L56 14" /><path className="d" d="M9.6 36.7L57.6 18.7" /><circle className="f" cx={57.6} cy={18.7} r={4} /></>,
  'latura.buzunar': <>{LEMN}<rect className="g contur" x={12} y={9} width={40} height={26} rx={2} /><rect className="d" x={16} y={13} width={32} height={18} rx={3} /><rect className="d" x={21} y={18} width={22} height={8} rx={2} /></>,
  'latura.vcarve': <><path className="l" d="M3 16H21L32 38L43 16H61V41H3Z" /><path className="f" d="M29 2H35V8H38L32 20L26 8H29Z" /><path className="d" d="M32 21V37" /></>,
  'latura.gaurire': <>{LEMN}<circle className="g contur" cx={16} cy={22} r={5} /><circle className="g contur" cx={32} cy={22} r={5} /><circle className="g contur" cx={48} cy={22} r={5} /><path className="c" d="M45 22h6M48 19v6" /></>,
  'latura.incrustatie': <><path className="l" d="M3 26H21L32 42L43 26H61V43H3Z" /><path className="l2" d="M18 3H46V9H43L32 25L21 9H18Z" /></>,
  'latura.incrustatie-drept': <><path className="l" d="M3 27H20V39H44V27H61V43H3Z" /><path className="l2" d="M14 4H50V10H43V21H21V10H14Z" /></>,
  'colturi.': <><rect className="l" x={3} y={3} width={58} height={38} /><path className="g" d="M3 41V12H45A9 9 0 0 1 54 21V41Z" /><path className="cs" d="M3 12H54V41" /></>,
  'colturi.dog-bone': <><rect className="l" x={3} y={3} width={58} height={38} /><path className="g" d="M3 41V12H45.4A5.5 5.5 0 1 1 54 20.6V41Z" /></>,
  'colturi.t-bone': <><rect className="l" x={3} y={3} width={58} height={38} /><path className="g" d="M3 41V12H43A5.5 5.5 0 0 1 54 12V41Z" /></>,
  'urechi.egale': <>{BUCLA}<path className="ua" d="M21 3V9M43 35V41M7 29H13M51 15H57" /></>,
  'urechi.lungi': <>{BUCLA}<path className="ua" d="M24 3V9M40 3V9M24 35V41M40 35V41" /></>,
  'urechi.scurte': <>{BUCLA}<path className="ua" d="M7 16H13M7 28H13M51 16H57M51 28H57" /></>,
  'urechi.mijloc': <>{BUCLA}<path className="ua" d="M32 3V9M32 35V41M7 22H13M51 22H57" /></>,
  'urechi.alese': <>{BUCLA}<path className="ua" d="M20 3V9M44 35V41M7 15H13" /><path className="sv" d="M46 6l8 6-4 1 3 5-2 1-3-5-3 3z" /></>,
  'urechi.lemn': <><path className="m" d="M3 3H8V41H3Z" />{BUCLA}<path className="ua" d="M7 15H13M7 29H13" /></>,
  'directie.': <><path className="d" d="M8 34C20 6 40 40 56 10" /><circle className="sv" cx={8} cy={34} r={2.5} />{sag('M56 10l-1.5 7-5.2-3.6z')}</>,
  'directie.invers': <><path className="d" d="M8 34C20 6 40 40 56 10" /><circle className="sv" cx={56} cy={10} r={2.5} />{sag('M8 34l1.6-7 5.1 3.7z')}</>,
  'directie.scurt': <><path className="d" d="M6 12H28M36 32H58" /><path className="cs" d="M28 12L36 32" />{sag('M58 32l-6 3V29z')}<circle className="sv" cx={6} cy={12} r={2.5} /></>,
  despartire: <><rect className="l" x={3} y={6} width={27} height={32} /><rect className="l" x={34} y={6} width={27} height={32} /><path className="ua" d="M32 2V42" /></>,
  'unitati.mm': <text x={32} y={28} textAnchor="middle" className="tare mare">mm</text>,
  'unitati.inch': <text x={32} y={28} textAnchor="middle" className="tare mare">in</text>,
  'strategie.bariera-sender': <><rect className="g contur" x={16} y={4} width={32} height={30} rx={7} /><path className="c gros" d="M28 12V26M36 12V26" /><text x={32} y={43} textAnchor="middle">T2</text></>,
  'strategie.m6-controler': <><rect className="g contur" x={8} y={8} width={48} height={26} rx={5} /><text x={32} y={26} textAnchor="middle" className="tare">T2 M6</text></>,
  'strategie.m0-comentariu': <><rect className="g contur" x={4} y={8} width={56} height={26} rx={5} /><text x={32} y={26} textAnchor="middle" className="tare">M0 ;T2</text></>,
  'strategie.fisiere-separate': <><path className="g contur" d="M14 8H30L36 14V36H14Z" /><path className="g contur" d="M26 4H42L48 10V32H26Z" /><text x={37} y={24} textAnchor="middle">-2</text></>,
  'foi.activa': <><rect className="g contur slab" x={6} y={10} width={26} height={20} /><rect className="l" x={30} y={6} width={28} height={22} /><path className="ua" d="M30 34H58" /></>,
  'foi.toate': <><rect className="l" x={6} y={12} width={26} height={20} /><rect className="l" x={30} y={6} width={28} height={22} /><path className="ua" d="M6 38H32M30 34H58" /></>,
};

/** Poza unei alegeri, ca SVG decorativ (numele alegerii e textul cartonașului). */
export const Poza = ({ k }: { k: string }): ReactNode =>
  <svg className="dx-ilu dx-poza" viewBox="0 0 64 44" aria-hidden="true">{POZE[k] ?? LEMN}</svg>;

/** O variantă: valoarea, textul, o notă scurtă sub el; `motiv` o oprește și se scrie în locul notei. */
export type Varianta<T extends string> = {
  readonly v: T; readonly text: string; readonly nota?: string; readonly motiv?: string | undefined; readonly titlu?: string;
};

/**
 * Un cartonaș: un input radio transparent peste poză, nume și notă. `data-camp` (scris în sursă, ca generatorul catalogului
 * controalelor să-l vadă, ADR 0262) stă pe input: îl citesc probele, explicația câmpului activ și utilizarea aplicației.
 */
export function Card<T extends string>({ 'data-camp': camp, poze, nume, x, ales, oprit, onAlege }: {
  'data-camp': string; poze: string; nume: string; x: Varianta<T>; ales: boolean; oprit: boolean; onAlege: (v: T) => void;
}): ReactNode {
  return (
    <label className="dx-card" title={x.motiv ?? x.titlu}>
      <input type="radio" name={nume} value={x.v} checked={ales} disabled={oprit || x.motiv !== undefined} data-camp={camp}
        onChange={() => { onAlege(x.v); }} />
      <Poza k={`${poze}.${x.v}`} />
      <span>{x.text}</span>
      {(x.motiv ?? x.nota) !== undefined && <small>{x.motiv ?? x.nota}</small>}
    </label>
  );
}

/** Grupul cartonașelor (radiogroup); `mari` pentru textele lungi; `data-alegere`, numele alegerii (câmpul e pe inputuri). */
export const GrupCartonase = ({ eticheta, titlu, mari = false, children, ...rest }: {
  eticheta: string; titlu?: string | undefined; mari?: boolean; children: ReactNode; 'data-alegere'?: string;
}): ReactNode => (
  <div className={mari ? 'dx-carduri mari' : 'dx-carduri'} role="radiogroup" aria-label={eticheta} title={titlu} {...rest}>{children}</div>
);

/**
 * Cartonașele unei alegeri cu un singur nume (`data-camp` pe fiecare input; grupul are `data-alegere` cu același nume): o
 * variantă pe cartonaș, cu poza ei (`poze.<valoare>` din `POZE`); `nume` e numele grupului radio, unic în fereastră.
 */
export function Cartonase<T extends string>({ 'data-camp': camp, poze, eticheta, nume, valoare, variante, onAlege, oprit = false, titlu, mari = false }: {
  'data-camp': string; poze: string; eticheta: string; nume: string; valoare: T | undefined; variante: readonly Varianta<T>[]; onAlege: (v: T) => void;
  oprit?: boolean; titlu?: string | undefined; mari?: boolean;
}): ReactNode {
  return (
    <GrupCartonase eticheta={eticheta} titlu={titlu} mari={mari} data-alegere={camp}>
      {variante.map((x) => <Card key={x.v} data-camp={camp} poze={poze} nume={nume} x={x} ales={x.v === valoare} oprit={oprit} onAlege={onAlege} />)}
    </GrupCartonase>
  );
}
