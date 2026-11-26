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
  'golire.inele': <>{LEMN}<rect className="g contur" x={8} y={7} width={48} height={30} rx={2} /><rect className="d" x={12} y={11} width={40} height={22} rx={3} /><rect className="d" x={17} y={16} width={30} height={12} rx={2} /><path className="d" d="M22 21H42" /></>,
  'golire.paralel': <>{LEMN}<rect className="g contur" x={8} y={7} width={48} height={30} rx={2} /><path className="d" d="M13 12H51V17H13V22H51V27H13V32H51" /></>,
  'coborare.plonjare': <><rect className="l" x={3} y={14} width={58} height={27} /><path className="d" d="M12 3V30H58" />{sag('M12 31l-3-6h6z')}</>,
  'coborare.rampa': <><rect className="l" x={3} y={14} width={58} height={27} /><path className="d" d="M6 7L14 14L44 30H58" />{sag('M59 30l-6 3v-6z')}</>,
  'coborare.zigzag': <><rect className="l" x={3} y={14} width={58} height={27} /><path className="d" d="M6 7L12 14L32 19L12 24L32 29H58" />{sag('M59 29l-6 3v-6z')}</>,
  'coborare.elice': <><rect className="l" x={3} y={14} width={58} height={27} /><path className="d" d="M14 6V14Q34 16.5 14 19Q34 21.5 14 24Q34 26.5 14 29H58" />{sag('M59 29l-6 3v-6z')}</>,
  'jur.fata': <><path className="l2" d="M3 41V31H19L25 15H39L45 31H61V41Z" /><path className="cs" d="M3 21H61" /></>,
  'jur.banda': <><path className="l2" d="M3 41V12H13V31H19L25 15H39L45 31H51V12H61V41Z" /><path className="ua" d="M13 35H19M45 35H51" /></>,
  'locas.buzunar': <><path className="l" d="M3 10H18V30H46V10H61V41H3Z" /><path className="g" d="M18 10H46V30H18Z" /></>,
  'locas.gaura': <><path className="l" d="M3 10H18V41H3ZM46 10H61V41H46Z" /><path className="m" d="M18 38H46V41H18Z" /></>,
  'treapta.fara': <><path className="l" d="M3 8H20V34H44V8H61V41H3Z" /><path className="l2" d="M22 4H42V32H22Z" /><path className="ua" d="M20 8H44" /></>,
  'treapta.interior': <><path className="l" d="M3 8H16V18H24V36H40V18H48V8H61V41H3Z" /><path className="l2" d="M17 4H47V17H39V34H25V17H17Z" /><path className="ua" d="M16 8H48" /></>,
  'treapta.exterior': <><path className="l" d="M3 8H12V18H20V36H44V18H52V8H61V41H3Z" /><path className="l2" d="M13 4H51V17H43V34H21V17H13Z" /><path className="ua" d="M20 18H44" /></>,
  'dop.ridicat': <><path className="l2" d="M3 41V30H20V10H44V30H61V41Z" /><path className="cs" d="M3 21H20M44 21H61" /></>,
  'dop.decupat': <><path className="l2" d="M3 41V10H17V41ZM21 10H43V41H21ZM47 10H61V41H47Z" /><path className="ua" d="M17 38H21M43 38H47" /></>,
  'sprijin.umar': <><path className="l" d="M3 12H14V22H22V40H42V22H50V12H61V43H3Z" /><path className="l2" d="M15 3H49V21H41V36H23V21H15Z" /><path className="ua" d="M14 22H22M42 22H50" /></>,
  'sprijin.fund': <><path className="l" d="M3 12H20V40H44V12H61V43H3Z" /><path className="l2" d="M22 3H42V40H22Z" /><path className="ua" d="M22 40H42" /></>,
  'sprijin.fata': <><path className="l" d="M3 14H20V40H44V14H61V43H3Z" /><path className="l2" d="M12 3H52V14H44V34H20V14H12Z" /><path className="ua" d="M12 14H20M44 14H52" /></>,
  'foi.activa': <><rect className="g contur slab" x={6} y={10} width={26} height={20} /><rect className="l" x={30} y={6} width={28} height={22} /><path className="ua" d="M30 34H58" /></>,
  'foi.toate': <><rect className="l" x={6} y={12} width={26} height={20} /><rect className="l" x={30} y={6} width={28} height={22} /><path className="ua" d="M6 38H32M30 34H58" /></>,
  // Operațiile reliefului (felia 18.1↑d-4): liniile prin centrele celulelor sau nu, marginea, unde stă relieful pe Z.
  'relief-linii.aliniate': <>{LEMN}<path className="cs" d="M3 17.5H61M3 26.5H61M12 3V41M21 3V41M30 3V41M39 3V41M48 3V41" /><path className="d" d="M5 13H59M5 22H59M5 31H59" /></>,
  'relief-linii.nealiniate': <>{LEMN}<path className="cs" d="M3 17.5H61M3 26.5H61M12 3V41M21 3V41M30 3V41M39 3V41M48 3V41" /><path className="d" d="M5 15.5H59M5 23.5H59M5 31.5H59" /></>,
  'relief-margine.perete': <><path className="l" d="M3 12H16V41H3ZM48 12H61V41H48Z" /><path className="l2" d="M16 41V30Q32 14 48 30V41Z" /><circle className="f" cx={43} cy={23} r={4} /></>,
  'relief-margine.trece': <><path className="l" d="M3 34H61V41H3Z" /><path className="l2" d="M12 41V30Q30 12 48 30V41Z" /><circle className="f" cx={53} cy={30} r={4} /></>,
  'relief-z.varf': <><path className="l" d="M3 12H14V41H3ZM50 12H61V41H50Z" /><path className="l2" d="M14 41V28Q32 -4 50 28V41Z" /><path className="ua" d="M3 12H61" /></>,
  'relief-z.plan': <><path className="l" d="M3 12H14V41H3ZM50 12H61V41H50Z" /><path className="l2" d="M14 41V32Q32 12 50 32V41Z" /><path className="ua" d="M3 12H61M8 12V20" /></>,
  // Parcarea de la final (ADR 0291 §3, felia 28.8↑p): freza rămâne deasupra ultimei tăieturi, merge la XY0 sau într-un punct ales.
  'parcare.nu': <>{LEMN}<rect className="d" x={14} y={11} width={26} height={22} rx={3} /><circle className="f" cx={40} cy={22} r={4} /></>,
  'parcare.origine': <>{LEMN}<rect className="d" x={22} y={9} width={30} height={20} rx={3} /><path className="cs" d="M52 19L10 35" /><path className="ua" d="M4 40H14M4 40V30" /><circle className="f" cx={8} cy={36} r={4} /></>,
  'parcare.punct': <><rect className="l" x={3} y={12} width={42} height={29} rx={2} /><rect className="d" x={10} y={18} width={24} height={16} rx={3} /><path className="cs" d="M34 26L55 9" /><circle className="f" cx={56} cy={8} r={4} /></>,
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
