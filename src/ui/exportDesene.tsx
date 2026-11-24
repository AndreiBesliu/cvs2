/**
 * Desenele întrebărilor din fereastra exportului (ADR 0290, felia 28.8↑b): stau în stânga grupului, deasupra explicației, și se
 * desenează din valorile omului. Cota câmpului pe care stă omul se aprinde (`aprins`, numele `data-camp` al câmpului). Stilul e
 * al tokenurilor (`.dx-ilu` din `stil.css`): lemnul, masa, freza, traseul verde, cota activă în accent, în ambele teme.
 *
 * Sunt schițe la scară liberă: valorile stau scrise pe cote, iar ce spun (trecerile, partea piesei, locurile urechilor) e socotit
 * ca în lucrare (`exportDeseneCalcul.ts`, cu proba lui).
 */
import type { ReactNode } from 'react';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import { centreUrechiDesen, treceriEgale, type LocuriUrechiDesen } from './exportDeseneCalcul.ts';

/** Formatul numerelor în desene (zecimalele limbii); `aprins` = câmpurile grupului cu focusul și de sub maus. */
export type DesenComun = { readonly f: (x: number) => string; readonly aprins: readonly string[] };

const r = (x: number): number => Math.round(x * 10) / 10;
/** Vârful unei săgeți cu vârful în (x, y), îndreptat spre (−ux, −uy). */
const varf = (x: number, y: number, ux: number, uy: number, a = 5, b = 2.6): string =>
  `M${r(x)} ${r(y)}L${r(x + ux * a - uy * b)} ${r(y + uy * a + ux * b)}L${r(x + ux * a + uy * b)} ${r(y + uy * a - ux * b)}Z`;
/** Un vârf plin în (x, y), spre unghiul dat (grade, pe ecran). */
const Sv = ({ x, y, g, c = 'sv' }: { x: number; y: number; g: number; c?: string }): ReactNode =>
  <path className={c} d={varf(x, y, -Math.cos((g * Math.PI) / 180), -Math.sin((g * Math.PI) / 180), 7, 3.6)} />;

/** O cotă: linia cu săgeți la capete și textul; aprinsă când omul stă pe câmpul ei. */
function Cota({ pentru: id, c, x1, y1, x2, y2, text, tx, ty, anc = 'middle' }: {
  pentru: string; c: DesenComun; x1?: number; y1?: number; x2?: number; y2?: number; text: string; tx: number; ty: number; anc?: 'start' | 'middle' | 'end';
}): ReactNode {
  let linie: ReactNode = null;
  if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    linie = <><path className="sg-l" d={`M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}`} /><path className="sg-v" d={varf(x1, y1, ux, uy) + varf(x2, y2, -ux, -uy)} /></>;
  }
  return (
    <g className="cota" data-cota={id} data-aprinsa={c.aprins.includes(id) ? '' : undefined}>
      {linie}<text x={r(tx)} y={r(ty)} textAnchor={anc}>{text}</text>
    </g>
  );
}

const Desen = ({ eticheta, children, ...rest }: { eticheta: string; children: ReactNode } & Record<`data-${string}`, string>): ReactNode =>
  <svg className="dx-ilu" viewBox="0 0 260 150" role="img" aria-label={eticheta} {...rest}>{children}</svg>;

/** Mijlocul textului de jos al fiecărui desen. */
const Jos = ({ children, tare = false }: { children: string; tare?: boolean }): ReactNode =>
  <text x={130} y={146} textAnchor="middle" className={tare ? 'tare' : undefined}>{children}</text>;

export type ColtDesen = 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus';

/** Foaia văzută oblic, cu colțul XY0 ales și axele din el; un clic pe un colț îl alege (lista rămâne câmpul pentru tastatură). */
export function DesenColt({ colt, nume, onColt }: { colt: ColtDesen; nume: string; onColt: (c: ColtDesen) => void }): ReactNode {
  const P: Record<ColtDesen, readonly [number, number]> = { 'stanga-jos': [40, 112], 'dreapta-jos': [178, 112], 'dreapta-sus': [226, 70], 'stanga-sus': [88, 70] };
  const [FL, FR, BR, BL] = [P['stanga-jos'], P['dreapta-jos'], P['dreapta-sus'], P['stanga-sus']];
  const O = P[colt], g = 14;
  const ax = (spre: readonly [number, number], de: readonly [number, number], L: number): [number, number] => {
    const dx = spre[0] - de[0], dy = spre[1] - de[1], n = Math.hypot(dx, dy);
    return [O[0] + (dx / n) * L, O[1] + (dy / n) * L];
  };
  const X = ax(FR, FL, 40), Y = ax(BL, FL, 32);
  const sag = (q: readonly [number, number]): ReactNode => {
    const L = Math.hypot(q[0] - O[0], q[1] - O[1]);
    return <><path className="ua" d={`M${r(O[0])} ${r(O[1])}L${r(q[0])} ${r(q[1])}`} /><path className="u" d={varf(q[0], q[1], (O[0] - q[0]) / L, (O[1] - q[1]) / L, 7, 3.5)} /></>;
  };
  return (
    <Desen eticheta={t('export.desen.colt', { colt: nume })} data-colt-ales={colt}>
      <text x={8} y={20}>{t('export.desen.colt.vedere')}</text>
      <path className="l2" data-lemn d={`M${FR[0]} ${FR[1]}L${BR[0]} ${BR[1]}V${BR[1] + g}L${FR[0]} ${FR[1] + g}Z`} />
      <path className="l" d={`M${FL[0]} ${FL[1]}H${FR[0]}V${FR[1] + g}H${FL[0]}Z`} />
      <path className="l" d={`M${FL[0]} ${FL[1]}L${FR[0]} ${FR[1]}L${BR[0]} ${BR[1]}L${BL[0]} ${BL[1]}Z`} />
      <path className="cs" d="M78 102H130L150 86H98Z" />
      {sag(X)}{sag(Y)}
      <text x={r(X[0] + 2)} y={r(X[1] + 14)} className="tare">X</text><text x={r(Y[0] - 12)} y={r(Y[1] - 2)} className="tare">Y</text>
      {(Object.keys(P) as ColtDesen[]).map((k) => (
        <g key={k} className="colt" data-colt={k} data-ales={k === colt ? '' : undefined} onClick={() => { onColt(k); }}>
          <circle cx={P[k][0]} cy={P[k][1]} r={13} className="tinta" /><circle cx={P[k][0]} cy={P[k][1]} r={7} />
        </g>
      ))}
      <Jos tare>{t('export.desen.colt.ales', { colt: nume })}</Jos>
    </Desen>
  );
}

/** Secțiunea foii pe masă: Z0 sus sau jos, gaura incrustației (mereu cu supracursa) și o tăietură scrisă cât foaia (cu bifa). */
export function DesenZ0({ c, z0, supracursa, prinFoaie }: { c: DesenComun; z0: 'sus' | 'jos'; supracursa: number | null; prinFoaie: boolean }): ReactNode {
  const y0 = 54, yb = 94, sup = supracursa ?? 0, sp = sup > 0 ? Math.max(4, Math.min(sup * 8, 22)) : 0, yz = z0 === 'sus' ? y0 : yb;
  return (
    <Desen eticheta={t('export.desen.z0')} data-z0={z0}>
      <rect className="m" x={6} y={yb} width={248} height={26} /><text x={12} y={yb + 18}>{t('export.desen.masa')}</text>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={yb - y0} />
      <rect className="g" x={150} y={y0} width={16} height={yb - y0 + sp} />
      <rect className="g" x={196} y={y0} width={16} height={yb - y0 + (prinFoaie ? sp : 0)} />
      <text x={158} y={y0 - 6} textAnchor="middle">{t('export.desen.z0.gaura')}</text>
      <text x={204} y={y0 - 20} textAnchor="middle">{t('export.desen.z0.foaia')}</text>
      {sp > 0 && <Cota pentru="supracursa" c={c} x1={140} y1={yb} x2={140} y2={yb + sp} text={c.f(sup)} tx={136} ty={yb + sp / 2 + 4} anc="end" />}
      <path className="ua" d={`M6 ${yz}H${z0 === 'sus' ? 96 : 140}`} /><text x={8} y={yz - 6} className="tare z0">Z0</text>
      <Jos>{sp > 0 ? t('export.desen.z0.cu', { mm: c.f(sup) }) : t('export.desen.z0.fara')}</Jos>
    </Desen>
  );
}

/** Profilul frezei: plată sau în V, cu T, diametrul, unghiul și vârful pe cote. */
export function DesenFreza({ c, numar, diametru, v, unghi, varfPlat }: {
  c: DesenComun; numar: string; diametru: number | null; v: boolean; unghi: number | null; varfPlat: number | null;
}): ReactNode {
  const D = diametru === null ? '?' : c.f(diametru);
  let corp: ReactNode;
  if (v) {
    const a = unghi !== null && unghi > 0 && unghi < 180 ? unghi : 60, h = Math.min(60, 34 / Math.tan((a * Math.PI) / 360));
    const vf = Math.min(varfPlat ?? 0, 2) * 4, s = Math.sin((a * Math.PI) / 360), co = Math.cos((a * Math.PI) / 360), yv = 44 + h;
    corp = (<>
      <path className="f" d={`M114 6H146V44H164L${r(130 + vf)} ${r(yv)}H${r(130 - vf)}L96 44H114Z`} />
      <g className="cota" data-cota="unghi-v" data-aprinsa={c.aprins.includes('unghi-v') ? '' : undefined}>
        <path className="sg-l" d={`M${r(130 - 20 * s)} ${r(yv - 20 * co)}A20 20 0 0 1 ${r(130 + 20 * s)} ${r(yv - 20 * co)}`} />
        <text x={130} y={r(yv - 24)} textAnchor="middle">{`${unghi === null ? '?' : c.f(unghi)}°`}</text>
      </g>
      <Cota pentru="varf-v" c={c} text={t('export.desen.freza.varf', { mm: varfPlat === null ? '?' : c.f(varfPlat) })} tx={172} ty={yv + 4} anc="start" />
      <Cota pentru="diametru" c={c} x1={96} y1={30} x2={164} y2={30} text={`Ø ${D} mm`} tx={130} ty={24} />
    </>);
  } else {
    corp = (<>
      <path className="f" d="M116 6H144V44H150V112H110V44H116Z" /><path className="c slab" d="M114 52L144 104M114 76L132 108" />
      <Cota pentru="diametru" c={c} x1={110} y1={126} x2={150} y2={126} text={`Ø ${D} mm`} tx={130} ty={141} />
    </>);
  }
  return (
    <Desen eticheta={t('export.desen.freza')}>
      {corp}
      <Cota pentru="scula" c={c} text={`T${numar.trim() === '' ? '?' : numar.trim()}`} tx={104} ty={20} anc="end" />
    </Desen>
  );
}

/** Secțiunea tăieturii prin foaie: trecerile egale (ca lucrarea), adâncimea, pasul, masa și ce trece în ea. */
export function DesenAdancime({ c, adancime, pas, grosime, supracursa }: {
  c: DesenComun; adancime: number | null; pas: number | null; grosime: number | undefined; supracursa: number;
}): ReactNode {
  const tr = treceriEgale(adancime, pas), A = adancime ?? 0, G = grosime ?? Math.max(A, 1) * 1.25;
  const y0 = 34, k = 74 / (G + 2), yb = y0 + G * k, sx = 112, sw = 34, Ad = Math.min(A, G + 2);
  const benzi: ReactNode[] = [];
  if (tr && tr.n <= 40) {
    for (let i = 0; i < tr.n; i++) {
      const ya = y0 + i * tr.d * k, h = Math.min(tr.d * k, y0 + Ad * k - ya);
      if (h > 0) benzi.push(<rect key={i} className={i % 2 ? 'g' : 'g2'} data-trecere={i + 1} x={sx} y={r(ya)} width={sw} height={r(h)} />);
      if (tr.n <= 12 && tr.d * k >= 9 && h >= 9) benzi.push(<text key={`n${i}`} x={sx + sw / 2} y={r(ya + h / 2 + 3.5)} textAnchor="middle">{i + 1}</text>);
    }
  }
  return (
    <Desen eticheta={t('export.desen.adancime')}>
      <rect className="m" x={6} y={r(yb)} width={248} height={14} /><text x={12} y={r(yb + 11)}>{t('export.desen.masa')}</text>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={r(G * k)} />
      <text x={8} y={y0 - 6}>{grosime === undefined ? t('export.desen.foaia.fara') : t('export.desen.foaia', { mm: c.f(grosime) })}</text>
      {tr && tr.n > 40 && <rect className="g" x={sx} y={y0} width={sw} height={r(Ad * k)} />}
      {benzi}
      {tr ? (<>
        <Cota pentru="adancime" c={c} x1={sx + sw + 12} y1={y0} x2={sx + sw + 12} y2={y0 + Ad * k} text={`${c.f(A)} mm`} tx={sx + sw + 18} ty={y0 + (Ad * k) / 2 + 4} anc="start" />
        <Cota pentru="pas" c={c} x1={sx - 12} y1={y0} x2={sx - 12} y2={y0 + Math.min(tr.d, Ad) * k} text={c.f(tr.d)} tx={sx - 18} ty={y0 + (Math.min(tr.d, Ad) * k) / 2 + 4} anc="end" />
        <text x={130} y={r(yb + 30)} textAnchor="middle" className="tare">{t('export.desen.treceri', { n: tr.n, mm: c.f(tr.d) })}</text>
        {grosime !== undefined && A > grosime + 1e-9 && (
          <text x={248} y={r(yb + 11)} textAnchor="end">{A > grosime + supracursa + 1e-9 ? t('export.desen.adancime.peste') : t('export.desen.adancime.masa', { mm: c.f(A - grosime) })}</text>
        )}
      </>) : <text x={130} y={y0 + 40} textAnchor="middle" className="tare">{t('export.desen.adancime.lipsa')}</text>}
      <path className="f" d={`M${sx + 9} 4H${sx + sw - 9}V16H${sx + sw}V${y0 - 3}H${sx}V16H${sx + 9}Z`} />
    </Desen>
  );
}

/**
 * Sensul de tăiere văzut de sus, cu axul M3 (ADR 0027): la urcare, ce rămâne stă în dreapta mersului. Exteriorul ține piesa
 * înăuntrul buclei (urcare = orar), gaura ține foaia din jur (urcare = trigonometric); pe o parte, freza merge în sensul
 * desenului când partea frezei e stânga și sensul e urcarea (ADR 0037 §8); pe linie, sensul nu schimbă nimic.
 */
export function DesenSens({ fel, sens }: { fel: 'exterior' | 'gaura' | 'pe-linie' | 'stanga' | 'dreapta'; sens: 'urcare' | 'opozitie' }): ReactNode {
  const urcare = sens === 'urcare', text = t(urcare ? 'export.desen.sens.dreapta' : 'export.desen.sens.stanga');
  const ax = (bx: number, by: number): ReactNode => (<>
    <circle className="f" cx={bx} cy={by} r={9} /><path className="c" d={`M${bx - 5} ${by - 13}A14 14 0 0 1 ${bx + 13} ${by + 5}`} />
    <Sv x={bx + 13.5} y={by + 6} g={95} /><text x={bx} y={by + 30} textAnchor="middle">{t('export.desen.sens.ax')}</text>
  </>);
  if (fel === 'pe-linie' || fel === 'stanga' || fel === 'dreapta') {
    const inainte = fel !== 'pe-linie' && (fel === 'stanga') === urcare, yf = fel === 'stanga' ? 62 : 88;
    return (
      <Desen eticheta={t('export.desen.sens')}>
        <rect className="l" data-lemn x={6} y={fel === 'stanga' ? 75 : 20} width={248} height={55} />
        <path className="c" d="M30 75H230" /><Sv x={130} y={75} g={0} c="sv slab" />
        {fel === 'pe-linie' ? <path className="lat" d="M30 75H230" /> : (<>
          <path className="d" d={`M30 ${yf}H230`} /><Sv x={inainte ? 234 : 26} y={yf} g={inainte ? 0 : 180} c="dv" />
          {ax(inainte ? 200 : 60, yf)}
        </>)}
        <Jos>{fel === 'pe-linie' ? t('export.desen.sens.linie') : text}</Jos>
      </Desen>
    );
  }
  const ext = fel === 'exterior', orar = ext ? urcare : !urcare;
  const [x, y, w, h, rr] = ext ? [60, 30, 140, 90, 14] : [86, 56, 88, 38, 6];
  const xm = x + w / 2, ym = y + h / 2;
  return (
    <Desen eticheta={t('export.desen.sens')} data-orar={String(orar)}>
      {ext ? (<>
        <rect className="l" data-lemn x={74} y={44} width={112} height={62} rx={2} /><text x={130} y={79} textAnchor="middle" className="tare">{t('export.desen.piesa')}</text>
      </>) : (<>
        <rect className="l" data-lemn x={14} y={14} width={232} height={118} rx={3} /><rect className="g" x={74} y={44} width={112} height={62} />
        <text x={130} y={32} textAnchor="middle" className="tare">{t('export.desen.sens.foaia')}</text>
      </>)}
      <rect className="d" x={x} y={y} width={w} height={h} rx={rr} />
      {orar ? (<><Sv x={xm + 6} y={y} g={0} c="dv" /><Sv x={xm - 6} y={y + h} g={180} c="dv" /><Sv x={x} y={ym - 6} g={-90} c="dv" /></>)
        : (<><Sv x={xm - 6} y={y} g={180} c="dv" /><Sv x={xm + 6} y={y + h} g={0} c="dv" /><Sv x={x} y={ym + 6} g={90} c="dv" /></>)}
      {ax(x + w, ym)}
      <Jos>{text}</Jos>
    </Desen>
  );
}

/** Rampa văzută din lateral, cu bucla desfășurată: coboară pe lungimea ei o trecere, apoi tura întreagă. */
export function DesenRampa({ c, rampa, lungime, adancime, pas }: {
  c: DesenComun; rampa: boolean; lungime: number | null; adancime: number | null; pas: number | null;
}): ReactNode {
  const tr = treceriEgale(adancime, pas), dp = tr?.d ?? 3, y0 = 40, x0 = 26, yd = y0 + Math.min(dp, 7) * 9;
  const L = lungime ?? 0, x1 = Math.min(x0 + L * 5, 236);
  return (
    <Desen eticheta={t('export.desen.rampa')}>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={70} /><text x={254} y={y0 - 8} textAnchor="end">{t('export.desen.rampa.bucla')}</text>
      {rampa && L > 0 ? (<>
        <path className="g" d={`M${x0} ${y0}L${r(x1)} ${r(yd)}H250V${y0}Z`} />
        <path className="d" d={`M${x0} ${y0 - 14}V${y0}L${r(x1)} ${r(yd)}H246`} /><Sv x={250} y={yd} g={0} c="dv" />
        <path className="d slab" d={`M${x0} ${r(yd + 1)}H${r(x1)}`} strokeDasharray="3 3" />
        <Cota pentru="rampa-lungime" c={c} x1={x0} y1={yd + 16} x2={x1} y2={yd + 16} text={`${c.f(L)} mm`} tx={(x0 + x1) / 2} ty={yd + 30} />
        {tr && <Cota pentru="pas" c={c} x1={14} y1={y0} x2={14} y2={yd} text={c.f(tr.d)} tx={18} ty={(y0 + yd) / 2 + 4} anc="start" />}
        <text x={r(Math.min(x1 + 6, 170))} y={r(yd + 32)}>{t('export.desen.rampa.apoi')}</text>
      </>) : (<>
        <path className="g" d={`M${x0 - 6} ${y0}V${r(yd)}H250V${y0}Z`} /><path className="d" d={`M${x0} ${y0 - 18}V${r(yd)}H246`} /><Sv x={250} y={yd} g={0} c="dv" />
        <text x={130} y={r(yd + 30)} textAnchor="middle" className="tare">{t('export.desen.rampa.fara')}</text>
      </>)}
    </Desen>
  );
}

/** Intrările văzute de sus: un sfert de cerc prin deșeu la intrare și la ieșire, cu raza pe drumul centrului frezei. */
export function DesenIntrari({ c, intrari, raza }: { c: DesenComun; intrari: boolean; raza: number | null }): ReactNode {
  const R = raza ?? 0, Rp = Math.max(4, Math.min(R * 6, 44)), y = 80, xa = 80, xb = 190;
  return (
    <Desen eticheta={t('export.desen.intrari')}>
      <rect className="l" data-lemn x={6} y={92} width={248} height={52} /><path className="c slab" d="M6 92H254" />
      <text x={12} y={134} className="tare">{t('export.desen.piesa')}</text><text x={12} y={20}>{t('export.desen.deseu')}</text>
      {intrari && R > 0 ? (<>
        <path className="d" d={`M${r(xa - Rp)} ${r(y - Rp)}A${r(Rp)} ${r(Rp)} 0 0 0 ${xa} ${y}H${xb}A${r(Rp)} ${r(Rp)} 0 0 0 ${r(xb + Rp)} ${r(y - Rp)}`} />
        <Sv x={xb + Rp} y={y - Rp - 1} g={-90} c="dv" />
        <Cota pentru="intrari-raza" c={c} x1={xa} y1={y - Rp} x2={xa} y2={y} text={`R ${c.f(R)}`} tx={xa + 6} ty={y - Rp / 2 + 4} anc="start" />
        <circle className="f" cx={xb} cy={y} r={10} />
      </>) : (<>
        <path className="d" d={`M70 ${y - 30}V${y}H200`} /><Sv x={204} y={y} g={0} c="dv" /><circle className="f" cx={70} cy={y} r={10} />
        <text x={130} y={40} textAnchor="middle" className="tare">{t('export.desen.intrari.fara')}</text>
      </>)}
    </Desen>
  );
}

export type ModUrechiDesen = 'egale' | 'alese' | 'lemn' | 'lungi' | 'scurte' | 'mijloc';

/**
 * Urechile: de sus, bucla cu urechile la locurile regulii (ca lucrarea, pe un dreptunghi), apoi secțiunea de-a lungul
 * tăieturii, cu lungimea și grosimea pe cote. Locurile alese și „unde ține” sunt schițate: se știu doar pe desen și la export.
 */
export function DesenUrechi({ c, urechi, mod, numar, alese, latime, grosime, grosimeFoaie }: {
  c: DesenComun; urechi: boolean; mod: ModUrechiDesen; numar: number | null; alese: number; latime: number | null; grosime: number | null; grosimeFoaie: number | undefined;
}): ReactNode {
  const x = 20, y = 30, w = 116, h = 78, P = 2 * (w + h), N = Math.max(0, Math.min(12, Math.round(numar ?? 0)));
  const punct = (s: number): readonly [number, number, boolean] => {
    let d = ((s % P) + P) % P;
    if (d < w) return [x + d, y, true]; d -= w;
    if (d < h) return [x + w, y + d, false]; d -= h;
    if (d < w) return [x + w - d, y + h, true]; d -= w;
    return [x, y + h - d, false];
  };
  const locuri = !urechi ? [] : mod === 'alese' ? [0.07, 0.33, 0.58, 0.8, 0.45, 0.92].slice(0, Math.min(alese, 6)).map((q) => q * P)
    : mod === 'lemn' ? [0.84, 0.94].slice(0, Math.max(1, Math.min(N, 2))).map((q) => q * P)
      : centreUrechiDesen(mod as LocuriUrechiDesen, N, [w, h, w, h]);
  const L = latime ?? 0, G = grosime ?? 0, lp = Math.max(4, Math.min(L * 1.4, 26));
  const nota = !urechi ? t('export.desen.urechi.fara') : mod === 'alese' ? t('export.desen.urechi.alese', { n: alese })
    : mod === 'lemn' ? t('export.urechi.locuri.lemn') : mod === 'mijloc' ? t('export.urechi.locuri.mijloc')
      : t('export.desen.urechi.cate', { n: N }) + (mod === 'egale' ? '' : `, ${t(mod === 'lungi' ? 'export.urechi.locuri.lungi' : 'export.urechi.locuri.scurte')}`);
  const dx = 156, dw = 96, dy = 48, dh = 54;
  const tw = Math.max(6, Math.min(L * 3, 60)), th = Math.max(3, Math.min((G * dh) / (grosimeFoaie ?? Math.max(G * 4, 1)), dh - 4)), tx = dx + dw / 2 - tw / 2;
  return (
    <Desen eticheta={t('export.desen.urechi')}>
      {urechi && mod === 'lemn' && <rect className="m" x={0} y={8} width={10} height={122} />}
      <rect className="l" data-lemn x={30} y={40} width={96} height={58} rx={2} />
      <rect className="d" x={x} y={y} width={w} height={h} rx={10} />
      {locuri.map((s, i) => {
        const [px, py, o] = punct(s);
        return <path key={i} className="ua" data-ureche data-latura={o ? 'o' : 'v'} d={o ? `M${r(px - lp / 2)} ${r(py)}H${r(px + lp / 2)}` : `M${r(px)} ${r(py - lp / 2)}V${r(py + lp / 2)}`} />;
      })}
      {mod === 'egale' || mod === 'lungi' || mod === 'scurte'
        ? <Cota pentru="urechi-numar" c={c} text={nota} tx={78} ty={126} />
        : <text x={78} y={126} textAnchor="middle">{nota}</text>}
      <text x={dx} y={dy - 26}>{t('export.desen.urechi.sectiune')}</text>
      <rect className="m" x={dx} y={dy + dh} width={dw} height={8} /><rect className="g" x={dx} y={dy} width={dw} height={dh} /><path className="cs" d={`M${dx} ${dy}H${dx + dw}`} />
      {urechi && (<>
        <rect className="l" x={r(tx)} y={r(dy + dh - th)} width={r(tw)} height={r(th)} />
        <Cota pentru="urechi-latime" c={c} x1={tx} y1={dy + dh - th - 10} x2={tx + tw} y2={dy + dh - th - 10} text={`${c.f(L)} mm`} tx={dx + dw / 2} ty={dy + dh - th - 15} />
        <Cota pentru="urechi-grosime" c={c} x1={dx + dw + 6} y1={dy + dh - th} x2={dx + dw + 6} y2={dy + dh} text={c.f(G)} tx={dx + dw + 2} ty={dy + dh + 20} anc="end" />
      </>)}
    </Desen>
  );
}
