/**
 * Desenele întrebărilor din fereastra exportului (ADR 0290, felia 28.8↑b): stau în stânga grupului, deasupra explicației, și se
 * desenează din valorile omului. Cota câmpului pe care stă omul se aprinde (`aprins`, numele `data-camp` al câmpului). Stilul e
 * al tokenurilor (`.dx-ilu` din `stil.css`): lemnul, masa, freza, traseul verde, cota activă în accent, în ambele teme.
 *
 * Sunt schițe la scară liberă: valorile stau scrise pe cote. Ce face lucrarea cu ele (adâncimea tăiată, trecerile, felul găuririi
 * și pașii ciocănirii) vine din funcțiile lucrării, prin rândul „pe hârtie” al fișei (ADR 0291, felia 28.8↑h); locurile
 * urechilor, pasul lateral, coborârea, V-carve-ul și incrustațiile, din `exportDeseneCalcul.ts`, cu proba lui față de lucrare.
 */
import type { ReactNode } from 'react';
import '../i18n/export.ts';
import { susLaMicron } from './actiuniExportTipuri.ts';
import { t } from '../i18n/t.ts';
import {
  bandaDesen, centreUrechiDesen, coborareDesen, dopDreptDesen, incrustatieDesen, treceriLaterale, vcarveDesen, type FelCoborare,
  type LocuriUrechiDesen,
} from './exportDeseneCalcul.ts';
import type { HartieRand } from './exportRand.ts';

/**
 * Formatul numerelor în desene (zecimalele limbii): `f` la sutime, ca o fișă de atelier; `fz` al frezelor, la miime (Ø3,175, nu
 * 3,18); `aprins` = câmpurile grupului cu focusul și de sub maus.
 */
export type DesenComun = { readonly f: (x: number) => string; readonly fz: (x: number) => string; readonly aprins: readonly string[] };

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

export type ColtDesen = 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus' | 'centru';

/**
 * Foaia văzută oblic, cu XY0 ales (un colț sau centrul, ADR 0291 §6) și axele din el; un clic pe un punct îl alege (lista
 * rămâne câmpul pentru tastatură).
 */
export function DesenColt({ colt, nume, onColt }: { colt: ColtDesen; nume: string; onColt: (c: ColtDesen) => void }): ReactNode {
  // Centrul: mijlocul celor patru colțuri, adică al foii văzute oblic.
  const P: Record<ColtDesen, readonly [number, number]> = { 'stanga-jos': [40, 112], 'dreapta-jos': [178, 112], 'dreapta-sus': [226, 70], 'stanga-sus': [88, 70], centru: [133, 91] };
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
    <Desen eticheta={colt === 'centru' ? t('export.desen.colt.centru') : t('export.desen.colt', { colt: nume })} data-colt-ales={colt}>
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
      <Jos tare>{colt === 'centru' ? t('export.desen.colt.ales.centru') : t('export.desen.colt.ales', { colt: nume })}</Jos>
    </Desen>
  );
}

/**
 * Secțiunea foii pe masă: Z0 sus sau jos; gaura incrustației (mereu cu supracursa), doar dacă foaia are o incrustație cu gaură
 * prin foaie, și o tăietură scrisă cât foaia, doar cu supracursa peste 0 și bifa ei (28.8↑k, constatarea 12 a auditului: altfel
 * cine deschide fereastra vede goluri care nu sunt în proiectul lui).
 */
export function DesenZ0({ c, z0, supracursa, prinFoaie, gaura }: {
  c: DesenComun; z0: 'sus' | 'jos'; supracursa: number | null; prinFoaie: boolean; gaura: boolean;
}): ReactNode {
  const y0 = 54, yb = 94, sup = supracursa ?? 0, sp = sup > 0 ? Math.max(4, Math.min(sup * 8, 22)) : 0, yz = z0 === 'sus' ? y0 : yb;
  // Cota supracursei, lângă golul care se vede (cel al incrustației, altfel cel scris cât foaia).
  const xc = !gaura && prinFoaie && sp > 0 ? 186 : 140;
  return (
    <Desen eticheta={t('export.desen.z0')} data-z0={z0}>
      <rect className="m" x={6} y={yb} width={248} height={26} /><text x={12} y={yb + 18}>{t('export.desen.masa')}</text>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={yb - y0} />
      {gaura && <>
        <rect className="g" data-gol="gaura" x={150} y={y0} width={16} height={yb - y0 + sp} />
        <text x={158} y={y0 - 6} textAnchor="middle">{t('export.desen.z0.gaura')}</text>
      </>}
      {prinFoaie && sp > 0 && <>
        <rect className="g" data-gol="foaia" x={196} y={y0} width={16} height={yb - y0 + sp} />
        <text x={204} y={y0 - 20} textAnchor="middle">{t('export.desen.z0.foaia')}</text>
      </>}
      {sp > 0 && <Cota pentru="supracursa" c={c} x1={xc} y1={yb} x2={xc} y2={yb + sp} text={c.f(sup)} tx={xc - 4} ty={yb + sp / 2 + 4} anc="end" />}
      <path className="ua" d={`M6 ${yz}H${z0 === 'sus' ? 96 : 140}`} /><text x={8} y={yz - 6} className="tare z0">Z0</text>
      <Jos>{sp > 0 ? t('export.desen.z0.cu', { mm: c.f(sup) }) : t('export.desen.z0.fara')}</Jos>
    </Desen>
  );
}

/** Profilul frezei: plată sau în V, cu T, diametrul, unghiul și vârful pe cote. */
export function DesenFreza({ c, numar, diametru, v, unghi, varfPlat, rotunda, razaColt, profil }: {
  c: DesenComun; numar: string; diametru: number | null; v: boolean; unghi: number | null; varfPlat: number | null;
  /** Bila sau toroidala (ADR 0303, felia 16.A↑e-4): capătul rotund, cu raza colțului (la toroidală) cotată. */
  rotunda?: 'bila' | 'toroidala'; razaColt?: number | null;
  /** Profilul desenat (ADR 0304, felia 16.A↑f-3): silueta, la scara corpului (raza frezei = 20 px). */
  profil?: readonly (readonly [number, number])[];
}): ReactNode {
  const D = diametru === null ? '?' : c.fz(diametru);
  let corp: ReactNode;
  if (profil && profil.length >= 2) {
    // Silueta în oglindă: din capătul ei (R, h) pe dreapta, prin vârf, până la (R, h) pe stânga; sus, coada.
    const R = profil[profil.length - 1]![0], k = 20 / Math.max(1e-9, R);
    const y = (h: number): number => r(Math.max(44, 112 - h * k));
    const dreapta = [...profil].reverse().map(([x, h]) => `L${r(130 + x * k)} ${y(h)}`).join('');
    const stanga = profil.map(([x, h]) => `L${r(130 - x * k)} ${y(h)}`).join('');
    corp = (<>
      <path className="f" d={`M116 6H144V44H150${dreapta}${stanga}L110 44H116Z`} data-desen="profil" />
      <Cota pentru="diametru" c={c} x1={110} y1={126} x2={150} y2={126} text={`Ø ${D} mm`} tx={130} ty={141} />
    </>);
  } else if (v) {
    const a = unghi !== null && unghi > 0 && unghi < 180 ? unghi : 60, h = Math.min(60, 34 / Math.tan((a * Math.PI) / 360));
    const vf = Math.min(varfPlat ?? 0, 2) * 4, s = Math.sin((a * Math.PI) / 360), co = Math.cos((a * Math.PI) / 360), yv = 44 + h;
    corp = (<>
      <path className="f" d={`M114 6H146V44H164L${r(130 + vf)} ${r(yv)}H${r(130 - vf)}L96 44H114Z`} />
      <g className="cota" data-cota="unghi-v" data-aprinsa={c.aprins.includes('unghi-v') ? '' : undefined}>
        <path className="sg-l" d={`M${r(130 - 20 * s)} ${r(yv - 20 * co)}A20 20 0 0 1 ${r(130 + 20 * s)} ${r(yv - 20 * co)}`} />
        <text x={130} y={r(yv - 24)} textAnchor="middle">{`${unghi === null ? '?' : c.f(unghi)}°`}</text>
      </g>
      <Cota pentru="varf-v" c={c} text={t('export.desen.freza.varf', { mm: varfPlat === null ? '?' : c.f(varfPlat) })} tx={172} ty={yv + 4} anc="start" />
      {/* Diametrul sub vârf, ca la freza plată, cu liniile ajutătoare din marginile conului (28.8↑k, constatarea 17): pe coadă,
          un diametru lung („Ø 3,175 mm”) trecea peste T. */}
      <path className="c slab" d="M96 48V130M164 48V130" />
      <Cota pentru="diametru" c={c} x1={96} y1={126} x2={164} y2={126} text={`Ø ${D} mm`} tx={130} ty={141} />
    </>);
  } else if (rotunda) {
    // Corpul de 40 px lățime: bila are capătul semicerc de 20 px; toroidala, colțurile la scara razei față de raza frezei.
    const rr = rotunda === 'bila' ? 20 : Math.max(2, Math.min(18, ((razaColt ?? 0) / Math.max(1e-9, (diametru ?? 6) / 2)) * 20));
    corp = (<>
      <path className="f" d={`M116 6H144V44H150V${r(112 - rr)}A${r(rr)} ${r(rr)} 0 0 1 ${r(150 - rr)} 112H${r(110 + rr)}A${r(rr)} ${r(rr)} 0 0 1 110 ${r(112 - rr)}V44H116Z`} />
      {rotunda === 'toroidala' && (
        <Cota pentru="raza-colt" c={c} text={t('export.desen.freza.raza', { mm: razaColt === null || razaColt === undefined ? '?' : c.f(razaColt) })} tx={160} ty={r(112 - rr / 2)} anc="start" />
      )}
      <Cota pentru="diametru" c={c} x1={110} y1={126} x2={150} y2={126} text={`Ø ${D} mm`} tx={130} ty={141} />
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
export function DesenAdancime({ c, adancime, treceri, grosime, supracursa }: {
  c: DesenComun; adancime: number | null; treceri: readonly number[] | null; grosime: number | undefined; supracursa: number;
}): ReactNode {
  // Adâncimea tăiată și trecerile lucrării (egale, `adancimiTreceri`), din rândul „pe hârtie” (ADR 0291, felia 28.8↑h).
  const tr = treceri && treceri.length > 0 ? { n: treceri.length, d: treceri[0] ?? 0 } : null, A = adancime ?? 0, G = grosime ?? Math.max(A, 1) * 1.25;
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
export function DesenRampa({ c, rampa, lungime, trecere }: {
  c: DesenComun; rampa: boolean; lungime: number | null; trecere: number | null;
}): ReactNode {
  // Trecerea egală a lucrării, pe adâncimea tăiată (ADR 0291, felia 28.8↑h).
  const dp = trecere ?? 3, y0 = 40, x0 = 26, yd = y0 + Math.min(dp, 7) * 9;
  const L = lungime ?? 0, x1 = Math.min(x0 + L * 5, 236);
  return (
    <Desen eticheta={t('export.desen.rampa')}>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={70} /><text x={254} y={y0 - 8} textAnchor="end">{t('export.desen.rampa.bucla')}</text>
      {rampa && L > 0 ? (<>
        <path className="g" d={`M${x0} ${y0}L${r(x1)} ${r(yd)}H250V${y0}Z`} />
        <path className="d" d={`M${x0} ${y0 - 14}V${y0}L${r(x1)} ${r(yd)}H246`} /><Sv x={250} y={yd} g={0} c="dv" />
        <path className="d slab" d={`M${x0} ${r(yd + 1)}H${r(x1)}`} strokeDasharray="3 3" />
        <Cota pentru="rampa-lungime" c={c} x1={x0} y1={yd + 16} x2={x1} y2={yd + 16} text={`${c.f(L)} mm`} tx={(x0 + x1) / 2} ty={yd + 30} />
        {trecere !== null && <Cota pentru="pas" c={c} x1={14} y1={y0} x2={14} y2={yd} text={c.f(trecere)} tx={18} ty={(y0 + yd) / 2 + 4} anc="start" />}
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

/** Un unghi pe desen: arcul din (cx, cy), de la a0 la a1 (grade, pe ecran, în sensul acelor), cu textul; aprins ca o cotă. */
function Unghi({ pentru, c, cx, cy, raza, a0, a1, text, tx, ty, anc = 'start' }: {
  pentru: string; c: DesenComun; cx: number; cy: number; raza: number; a0: number; a1: number; text: string; tx: number; ty: number; anc?: 'start' | 'middle' | 'end';
}): ReactNode {
  const p = (a: number): string => `${r(cx + raza * Math.cos((a * Math.PI) / 180))} ${r(cy + raza * Math.sin((a * Math.PI) / 180))}`;
  const mare = Math.abs(a1 - a0) > 180 ? 1 : 0, sens = a1 > a0 ? 1 : 0;
  return (
    <g className="cota" data-cota={pentru} data-aprinsa={c.aprins.includes(pentru) ? '' : undefined}>
      {Math.abs(a1 - a0) > 0.5 && <path className="sg-l" d={`M${p(a0)}A${raza} ${raza} 0 ${mare} ${sens} ${p(a1)}`} />}
      <text x={r(tx)} y={r(ty)} textAnchor={anc}>{text}</text>
    </g>
  );
}

/**
 * Buzunarul văzut de sus (ADR 0069, ADR 0094): trei treceri, fiecare cu urma frezei (lată cât freza), la pasul lateral; urmele
 * vecine se suprapun, mai închis. Pe inele, lângă perete: prima trece la raza frezei de el, ca inelele lucrării. Pe linii
 * paralele, aceleași treceri rotite la unghiul lor față de X.
 */
export function DesenGolire({ c, diametru, pas, paralel, unghi }: {
  c: DesenComun; diametru: number | null; pas: number | null; paralel: boolean; unghi: number | null;
}): ReactNode {
  const tr = treceriLaterale(diametru, pas);
  if (!tr || diametru === null || pas === null) {
    return (
      <Desen eticheta={t('export.desen.golire')} data-paralel={String(paralel)}>
        <rect className="g" x={6} y={14} width={248} height={104} /><Jos tare>{t('export.desen.golire.lipsa')}</Jos>
      </Desen>
    );
  }
  const R = diametru / 2, k = Math.min(16, (paralel ? 80 : 150) / (2 * pas + diametru));
  // Pe inele, de la perete (x = 34); pe linii, în jurul mijlocului desenului, apoi rotite: o linie la θ față de X e o linie
  // verticală rotită cu 90 − θ, în sensul acelor pe ecran.
  const xp = paralel ? 130 - (pas + R) * k + R * k : 34, y0 = paralel ? 0 : 18, y1 = paralel ? 136 : 122;
  const cx = paralel ? tr.centre.map((x) => xp + (x - R) * k) : tr.centre.map((x) => xp + x * k);
  const a = unghi !== null && Number.isFinite(unghi) && unghi >= 0 && unghi < 180 ? unghi : 0;
  const treceri = (
    <g transform={paralel ? `rotate(${r(90 - a)} 130 68)` : undefined}>
      {cx.map((x, i) => <rect key={`u${i}`} className="urma" data-trecere-laterala={i + 1} x={r(x - R * k)} y={y0} width={r(diametru * k)} height={y1 - y0} />)}
      {cx.map((x, i) => (<g key={`d${i}`}>
        <path className="d" data-linie-laterala d={`M${r(x)} ${y0 + 4}V${y1 - 8}`} /><Sv x={x} y={y1 - 3} g={90} c="dv" />
        <circle className="c slab" data-freza-laterala cx={r(x)} cy={68} r={r(R * k)} />
      </g>))}
      {!paralel && <Cota pentru="pas-lateral" c={c} x1={cx[0] ?? 0} y1={14} x2={cx[1] ?? 0} y2={14} text={c.f(pas)} tx={(cx[1] ?? 0) + 6} ty={18} anc="start" />}
    </g>
  );
  return (
    <Desen eticheta={t('export.desen.golire')} data-paralel={String(paralel)}>
      {paralel ? (<>
        <rect className="g" x={6} y={6} width={248} height={124} />
        <path className="cs" d="M70 68H246" /><text x={248} y={64} textAnchor="end" className="tare">X</text>
        {treceri}
        <Unghi pentru="unghi-paralel" c={c} cx={130} cy={68} raza={44} a0={0} a1={-a} text={`${c.f(a)}°`} tx={180} ty={60} />
        <Cota pentru="pas-lateral" c={c} text={t('export.desen.golire.pas', { mm: c.f(pas) })} tx={10} ty={20} anc="start" />
      </>) : (<>
        <rect className="l" data-lemn x={6} y={6} width={28} height={124} /><rect className="g" x={34} y={6} width={220} height={124} />
        <text x={8} y={15} className="tare">{t('export.desen.golire.perete')}</text>
        {treceri}
      </>)}
      <Jos>{t('export.desen.golire.suprapun', { mm: c.f(tr.suprapunere), p: c.f(Math.round(tr.procent)) })}</Jos>
    </Desen>
  );
}

/**
 * Coborârea în buzunar văzută din lateral (ADR 0076), pe o trecere (cea egală a lucrării), cu drumul desfășurat: drept în jos,
 * rampa pe inel, zigzagul dus-întors sau elicea (din lateral, o spirală). Schiță: panta e mărită, valorile stau pe cote.
 */
export function DesenCoborare({ c, fel, bun, trecere, unghi, lungime, raza }: {
  c: DesenComun; fel: FelCoborare; bun: boolean; trecere: number | null; unghi: number | null; lungime: number | null; raza: number | null;
}): ReactNode {
  // `bun`: verdictul ferestrei pe valorile coborârii (marginile documentului): o valoare refuzată nu se desenează.
  const cob = bun ? coborareDesen(fel, trecere, unghi, lungime, raza) : null, y0 = 44, yd = 84, x0 = 34;
  const lemn = (<>
    <rect className="l" data-lemn x={6} y={y0} width={248} height={70} /><text x={254} y={16} textAnchor="end">{t('export.desen.rampa.bucla')}</text>
    {trecere !== null && trecere > 0 && <Cota pentru="pas" c={c} x1={14} y1={y0} x2={14} y2={yd} text={c.f(trecere)} tx={18} ty={(y0 + yd) / 2 + 4} anc="start" />}
  </>);
  const fin = (x: number): ReactNode => (<><path className="d" d={`M${r(x)} ${yd}H246`} /><Sv x={250} y={yd} g={0} c="dv" /></>);
  const ung = (x: number, y: number, a: number): ReactNode => unghi !== null
    ? <Unghi pentru="unghi-coborare" c={c} cx={x} cy={y} raza={28} a0={0} a1={a} text={`${c.f(unghi)}°`} tx={x + 32} ty={y + 12} /> : null;
  let corp: ReactNode, jos: string;
  if (!cob) {
    corp = <path className="d slab" d={`M${x0} ${y0 - 22}V${y0}`} />;
    jos = t('export.desen.coborare.lipsa');
  } else if (cob.fel === 'plonjare') {
    corp = (<><path className="g" d={`M${x0 - 6} ${y0}V${yd}H250V${y0}Z`} /><path className="d" d={`M${x0} ${y0 - 26}V${yd}`} />{fin(x0)}</>);
    jos = t('export.desen.coborare.plonjare');
  } else if (cob.fel === 'rampa') {
    const x1 = 190;
    corp = (<><path className="g" d={`M${x0} ${y0}L${x1} ${yd}H250V${y0}Z`} /><path className="d" d={`M${x0} ${y0 - 22}V${y0}L${x1} ${yd}`} />{fin(x1)}{ung(x0, y0, 14.4)}</>);
    jos = t('export.desen.coborare.rampa', { mm: c.f(Math.round(cob.lungime * 10) / 10) });
  } else if (cob.fel === 'zigzag') {
    const n = Math.min(cob.rampe, 12), x1 = 150, h = (yd - y0) / n;
    const pts = Array.from({ length: n + 1 }, (_, i) => `${i % 2 === 0 ? x0 : x1} ${r(y0 + i * h)}`);
    const ramp = Array.from({ length: n }, (_, i) => <path key={i} className="d" data-rampa={i + 1} d={`M${pts[i]}L${pts[i + 1]}`} />);
    corp = (<>
      <path className="g" d={`M${x0} ${y0}L${x1} ${r(y0 + h)}V${yd}H250V${y0}Z`} /><path className="d" d={`M${x0} ${y0 - 22}V${y0}`} />{ramp}{fin(n % 2 === 1 ? x1 : x0)}
      {ung(x0, y0, (Math.atan2(h, x1 - x0) * 180) / Math.PI)}
      {lungime !== null && <Cota pentru="lungime-zigzag" c={c} x1={x0} y1={yd + 14} x2={x1} y2={yd + 14} text={`${c.f(lungime)} mm`} tx={(x0 + x1) / 2} ty={yd + 28} />}
    </>);
    jos = t('export.desen.coborare.zigzag', { n: cob.rampe, mm: c.f(cob.lungime) });
  } else {
    // Elicea din lateral: x = centru + r · sin, coborând liniar; cel mult 6 ture desenate, apoi cercul plin, la fund.
    const ture = Math.min(cob.ture, 6), xc = 74, rx = 30, pe = 24, N = Math.max(2, Math.ceil(ture * pe));
    const pts = Array.from({ length: N + 1 }, (_, i) => {
      const u = (i / N) * ture;
      return `${r(xc + rx * Math.sin(2 * Math.PI * u))} ${r(y0 + (yd - y0) * (u / ture))}`;
    });
    const cerc = Array.from({ length: pe + 1 }, (_, i) => `${r(xc + rx * Math.sin(2 * Math.PI * (ture + i / pe)))} ${yd}`);
    corp = (<>
      <rect className="g" x={xc - rx - 4} y={y0} width={2 * rx + 8} height={yd - y0} />
      <path className="d" data-elice d={`M${pts[0]}L${pts.slice(1).join('L')}L${cerc.join('L')}`} />{fin(xc + rx * Math.sin(2 * Math.PI * (ture + 1)))}
      {raza !== null && <Cota pentru="raza-elice" c={c} x1={xc} y1={y0 - 12} x2={xc + rx} y2={y0 - 12} text={`R ${c.f(raza)}`} tx={xc + rx + 6} ty={y0 - 8} anc="start" />}
      {unghi !== null && <Cota pentru="unghi-coborare" c={c} text={`${c.f(unghi)}°`} tx={xc + rx + 12} ty={(y0 + yd) / 2 + 4} anc="start" />}
    </>);
    jos = t('export.desen.coborare.elice', { ture: c.f(Math.round(cob.ture * 10) / 10), r: raza === null ? '?' : c.f(raza) });
  }
  return (
    <Desen eticheta={t('export.desen.coborare')} data-coborare={cob ? fel : 'lipsa'}>
      {lemn}{corp}<Jos tare={!cob}>{jos}</Jos>
    </Desen>
  );
}

/**
 * Colțul buzunarului văzut de sus (ADR 0093): freza lasă în colț raza ei; freza de rest cea mai mică o duce la raza ei. Lemnul
 * rămas în colț, cât îl lasă fiecare.
 */
export function DesenRest({ c, diametru, rest }: { c: DesenComun; diametru: number | null; rest: readonly (number | null)[] }): ReactNode {
  const Ra = diametru !== null && diametru > 0 ? diametru / 2 : null;
  const mici = Ra === null ? [] : rest.filter((d): d is number => d !== null && d > 0 && d < 2 * Ra);
  const Rb = mici.length > 0 ? Math.min(...mici) / 2 : null;
  const X = 40, Y = 22, k = Ra === null ? 1 : 50 / Ra;
  const colt = (raza: number): string => `M${X} ${Y}H${r(X + raza * k)}A${r(raza * k)} ${r(raza * k)} 0 0 0 ${X} ${r(Y + raza * k)}Z`;
  return (
    <Desen eticheta={t('export.desen.rest')}>
      <rect className="l" data-lemn x={6} y={6} width={248} height={Y - 6} /><rect className="l" x={6} y={6} width={X - 6} height={124} />
      <rect className="g" x={X} y={Y} width={254 - X} height={130 - Y} />
      {Ra !== null && (<>
        {Rb !== null ? (<><path className="g2" d={colt(Ra)} /><path className="l" data-ramas d={colt(Rb)} /></>) : <path className="l" data-ramas d={colt(Ra)} />}
        <circle className="c" cx={X + Ra * k} cy={Y + Ra * k} r={r(Ra * k)} />
        <text x={r(X + Ra * k * 1.72)} y={r(Y + Ra * k * 1.72 + 6)} className="tare">{`Ø ${c.f(2 * Ra)}`}</text>
        {Rb !== null && (<>
          <circle className="d" cx={r(X + Rb * k)} cy={r(Y + Rb * k)} r={r(Rb * k)} />
          <Cota pentru="rest-diametru" c={c} text={`Ø ${c.f(2 * Rb)}`} tx={X + Rb * k} ty={Y + Rb * k + 4} />
        </>)}
      </>)}
      <Jos>{Ra === null ? t('export.desen.rest.lipsa') : Rb === null ? t('export.desen.rest.fara', { mm: c.f(Ra) })
        : t('export.desen.rest.cu', { a: c.f(2 * Ra), ra: c.f(Ra), b: c.f(2 * Rb), rb: c.f(Rb) })}</Jos>
    </Desen>
  );
}

/**
 * Găurirea (ADR 0087), cum o face lucrarea cu cercurile rândului și freza scrisă (ADR 0291, felia 28.8↑h):
 * - **ciocănirea** (un cerc cât freza), pas cu pas: fiecare pas tăiat în jos (verde), ridicarea sau ieșirea din gaură și
 *   coborârea rapidă înapoi (punctat). În lateral e timpul, nu locul: freza stă deasupra centrului găurii;
 * - **elicea** (un cerc mai mare, până la două diametre), văzută din lateral: freza coboară pe perete, o tură pe trecere, pe
 *   cercul de rază (Dc − D) / 2, apoi o tură plină la fund;
 * - un cerc pe care freza nu-l poate găuri (mai mic decât ea, peste două diametre) nu se desenează: greșeala e lângă freză.
 * Cu cercuri amestecate, desenul arată ciocănirea, iar nota spune și elicea.
 */
export function DesenGaurire({ c, hartie, diametru, retragere }: {
  c: DesenComun; hartie: HartieRand; diametru: number | null; retragere: number | null;
}): ReactNode {
  const g = hartie.gaurire, tr = hartie.treceri, A = hartie.adancime ?? 0;
  const feluri = new Set(g?.cercuri.map((x) => x.fel) ?? []);
  const ciocanire = g?.ciocanire ?? null, elice = feluri.has('elice');
  const ys = 22, y0 = 36, yb = 112, k = A > 0 ? (yb - y0) / A : 0, x0 = 30;
  const d = tr?.[0] ?? 0, n = tr?.length ?? 0;
  const Lemn = <><rect className="l" data-lemn x={6} y={y0} width={248} height={yb - y0} /><path className="cs" d={`M6 ${ys}H254`} /></>;
  if (!tr || feluri.size === 0 || (!ciocanire && !elice)) {
    // Fără valori bune sau fără un cerc pe care freza să-l poată găuri.
    const nuMerge = feluri.size > 0 && !feluri.has('ciocanire') && !elice && !feluri.has('gresit');
    return (
      <Desen eticheta={t('export.desen.gaurire')} data-gaurire={nuMerge ? 'nu-merge' : 'lipsa'}>
        {Lemn}<text x={8} y={ys - 6}>{t('export.desen.gaurire.sus')}</text>
        <Jos tare>{nuMerge ? t('export.desen.gaurire.nu-merge') : t('export.desen.gaurire.lipsa')}</Jos>
      </Desen>
    );
  }
  if (ciocanire) {
    const y = (z: number | 'sus'): number => (z === 'sus' ? ys : y0 - z * k);
    // Cel mult 80 de mișcări desenate (pași foarte mulți ar ieși o pată); textul spune toți pașii.
    const pasi = ciocanire.slice(0, 80), dx = pasi.length > 0 ? Math.min(20, 214 / pasi.length) : 0;
    const linii: ReactNode[] = [];
    let x = x0, yc = ys;
    for (const [i, q] of pasi.entries()) {
      const x2 = x + dx, y2 = y(q.z), dd = `M${r(x)} ${r(yc)}L${r(x2)} ${r(y2)}`;
      linii.push(q.taie ? <path key={i} className="d" data-coboara d={dd} /> : <path key={i} className="cs" data-iese={q.z === 'sus' ? '' : undefined} d={dd} />);
      x = x2; yc = y2;
    }
    return (
      <Desen eticheta={t('export.desen.gaurire')} data-gaurire="ciocanire">
        {Lemn}
        <text x={8} y={ys - 6}>{t('export.desen.gaurire.sus')}</text><text x={252} y={ys - 6} textAnchor="end">{t('export.desen.gaurire.timp')}</text>
        {linii}
        <Cota pentru="pas" c={c} x1={16} y1={y0} x2={16} y2={y0 + d * k} text={c.f(Math.round(d * 100) / 100)} tx={20} ty={y0 + (d * k) / 2 + 4} anc="start" />
        <text x={130} y={130} textAnchor="middle">
          {`${t('export.desen.gaurire.pasi', { n, mm: c.f(Math.round(d * 100) / 100) })}; ${t('export.desen.gaurire.ridica', { mm: c.f(g?.ridicare ?? 0) })}`}
        </text>
        <Cota pentru="retragere" c={c} text={elice ? t('export.desen.gaurire.amestec') : t('export.desen.gaurire.iese', { n: retragere ?? 1 })} tx={130} ty={145} />
      </Desen>
    );
  }
  // Elicea pe cercul cel mai mare care se găurește așa: raza drumului centrului frezei, (Dc − D) / 2.
  const Dc = Math.max(...(g?.cercuri.filter((x) => x.fel === 'elice').map((x) => x.diametru) ?? [0]));
  const raza = diametru !== null ? (Dc - diametru) / 2 : 0;
  // Din lateral: freza merge de la un perete la celălalt și înapoi, o tură pe trecere, apoi o tură plină pe fund.
  const xl = 92, xr = 168, ture = Math.min(n, 30), dy = ture > 0 ? (yb - y0) / ture : 0;
  let cale = `M${xl} ${ys}V${y0}`;
  for (let i = 0; i < ture; i++) cale += `L${xr} ${r(y0 + (i + 0.5) * dy)}L${xl} ${r(y0 + (i + 1) * dy)}`;
  return (
    <Desen eticheta={t('export.desen.gaurire.elice')} data-gaurire="elice">
      {Lemn}
      <rect className="g" x={xl - 6} y={y0} width={xr - xl + 12} height={yb - y0} />
      <path className="d" data-elice d={cale} />
      <path className="d" data-fund-elice d={`M${xl} ${yb}H${xr}`} />
      <text x={8} y={ys - 6}>{t('export.desen.gaurire.sus')}</text>
      <Cota pentru="pas" c={c} x1={xr + 14} y1={y0} x2={xr + 14} y2={y0 + dy} text={c.f(Math.round(d * 100) / 100)} tx={xr + 18} ty={y0 + dy / 2 + 4} anc="start" />
      <Jos>{t('export.desen.gaurire.ture', { n, mm: c.f(Math.round(d * 100) / 100), r: c.f(Math.round(raza * 100) / 100) })}</Jos>
    </Desen>
  );
}

/**
 * Secțiunea unei trăsături V-carve (ADR 0090, ADR 0091, ADR 0173), schițată: pereții freza V îi taie până la adâncimea maximă,
 * la D·tan(θ/2) de contur; între ei, fundul plat îl scoate freza dreaptă, ori (pe o incrustație fără ea) inelele frezei V; fără
 * niciuna, între pereți rămâne lemn. Pragul spus: fundul e plat unde trăsătura e mai lată de 2·D·tan(θ/2).
 */
export function DesenFund({ c, adancime, unghi, fundPlat, diametruFund, incrustatie, joc }: {
  c: DesenComun; adancime: number | null; unghi: number | null; fundPlat: boolean; diametruFund: number | null; incrustatie: boolean; joc: number | null;
}): ReactNode {
  const v = vcarveDesen(adancime, unghi);
  if (!v || adancime === null) {
    return <Desen eticheta={t('export.desen.fund')} data-fund="lipsa"><rect className="l" data-lemn x={6} y={36} width={248} height={80} /><Jos tare>{t('export.desen.fund.lipsa')}</Jos></Desen>;
  }
  const fel = fundPlat ? 'plat' : incrustatie ? 'v' : 'lemn';
  const y0 = 36, xa = 40, xb = 220, k = Math.min(56 / adancime, 72 / (adancime * v.t)), h = adancime * k, w = adancime * v.t * k, yb = y0 + h;
  const perete = (x: number, s: 1 | -1): string => `M${x} ${y0}L${r(x + s * w)} ${r(yb)}`;
  let fund: ReactNode, jos: string;
  if (fel === 'lemn') {
    // Doar șanțurile pereților (inelul V la −D), lemnul dintre ele rămâne.
    fund = (<>
      <path className="g" d={`M${xa} ${y0}L${r(xa + w)} ${r(yb)}L${r(xa + 2 * w)} ${y0}ZM${xb} ${y0}L${r(xb - w)} ${r(yb)}L${r(xb - 2 * w)} ${y0}Z`} />
      <path className="ua slab" data-ramas d={`M${r(xa + 2 * w + 3)} ${y0 + 2}H${r(xb - 2 * w - 3)}`} />
    </>);
    jos = t('export.desen.fund.ramane');
  } else {
    fund = <path className={fel === 'plat' ? 'g2' : 'g'} d={`M${xa} ${y0}L${r(xa + w)} ${r(yb)}H${r(xb - w)}L${xb} ${y0}Z`} />;
    jos = fel === 'plat' ? t('export.desen.fund.plat', { w: c.f(v.prag), f: diametruFund === null ? '?' : c.fz(diametruFund) })
      : t('export.desen.fund.v', { mm: joc === null ? '?' : c.f(joc / 2) });
  }
  const df = diametruFund !== null && diametruFund > 0 ? Math.min(diametruFund * k, xb - xa - 2 * w - 8) : 0, xm = (xa + xb) / 2;
  const sv = Math.min(Math.tan((Math.min(unghi ?? 60, 170) * Math.PI) / 360), 3), xv = xa + w;
  return (
    <Desen eticheta={t('export.desen.fund')} data-fund={fel}>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={r(h + 24)} />
      {fund}
      <path className="d" d={perete(xa, 1) + perete(xb, -1)} />
      {fel === 'v' && <path className="d slab" data-inele d={Array.from({ length: Math.max(1, Math.floor((xb - xa - 2 * w) / 8)) }, (_, i) => {
        const x = xa + w + 4 + i * 8;
        return `M${r(x - 4)} ${r(yb)}L${r(x)} ${r(yb - 3)}L${r(x + 4)} ${r(yb)}`;
      }).join('')} />}
      {/* Freza V la peretele din stânga, cu vârful la −D. */}
      <path className="f" d={`M${r(xv)} ${r(yb)}L${r(xv - 22 * sv)} ${r(yb - 22)}V${r(y0 - 18)}H${r(xv + 22 * sv)}V${r(yb - 22)}Z`} />
      {fel === 'plat' && df > 0 && (<>
        <rect className="f" data-freza-fund x={r(xm - df / 2)} y={r(y0 - 20)} width={r(df)} height={r(h + 20)} />
        <Cota pentru="fund-diametru" c={c} x1={xm - df / 2} y1={y0 - 26} x2={xm + df / 2} y2={y0 - 26} text={`Ø ${c.fz(diametruFund ?? 0)}`} tx={xm + df / 2 + 6} ty={y0 - 22} anc="start" />
      </>)}
      <Cota pentru="adancime" c={c} x1={xb + 14} y1={y0} x2={xb + 14} y2={yb} text={`${c.f(adancime)} mm`} tx={xb + 14} ty={yb + 16} />
      <Jos tare={fel === 'lemn'}>{jos}</Jos>
    </Desen>
  );
}

/**
 * Incrustația în V în secțiune (ADR 0170), schițată: jos piesa cu locașul (adâncimea D, fundul plat), sus dopul întors,
 * coborât în locaș. Dopul se oprește la S = D − g: sub el rămâne jocul g, între plăci spațiul H, iar pereții se ating pe banda
 * S·t de la contur (accentul). Semifabricatul dopului trece de desen cu marginea.
 */
export function DesenIncrustatie({ c, adancime, unghi, joc, fierastrau, margine }: {
  c: DesenComun; adancime: number | null; unghi: number | null; joc: number | null; fierastrau: number | null; margine: number | null;
}): ReactNode {
  const v = incrustatieDesen(adancime, unghi, joc, fierastrau);
  if (!v || adancime === null || joc === null) {
    return <Desen eticheta={t('export.desen.incrustatie')} data-incrustatie="lipsa"><rect className="l" data-lemn x={6} y={88} width={248} height={44} /><Jos tare>{t('export.desen.incrustatie.lipsa')}</Jos></Desen>;
  }
  const ys = 88, k = Math.min(36 / adancime, 72 / (adancime + v.H)), xa = 74, xb = 186, tk = Math.min(v.t, 2.5) * k;
  const yS = ys + v.S * k, yD = ys + adancime * k, yF = ys - v.H * k, yT = Math.max(yF - 22, 18);
  const m = Math.min((margine ?? 0) * k, 40), xbl = xa - v.H * tk - m, xbr = xb + v.H * tk + m;
  const loc = `M6 ${ys}H${xa}L${r(xa + adancime * tk)} ${r(yD)}H${r(xb - adancime * tk)}L${xb} ${ys}H254V${r(yD + 10)}H6Z`;
  const dop = `M${r(xbl)} ${r(yT)}H${r(xbr)}V${r(yF)}H${r(xb + v.H * tk)}L${r(xb - v.S * tk)} ${r(yS)}H${r(xa + v.S * tk)}L${r(xa - v.H * tk)} ${r(yF)}H${r(xbl)}Z`;
  return (
    <Desen eticheta={t('export.desen.incrustatie')} data-incrustatie="ok">
      <path className="l" data-lemn d={loc} /><text x={10} y={r(yD + 6)}>{t('export.desen.piesa')}</text>
      <path className="l2" d={dop} /><text x={r(xbl + 4)} y={r(yT + 14)}>{t('export.desen.incrustatie.dop')}</text>
      {/* Contactul: pereții se ating de la suprafață până la S. */}
      <path className="ua" data-contact d={`M${xa} ${ys}L${r(xa + v.S * tk)} ${r(yS)}M${xb} ${ys}L${r(xb - v.S * tk)} ${r(yS)}`} />
      <Cota pentru="inc-joc" c={c} x1={130} y1={yS} x2={130} y2={yD} text={`g ${c.f(joc)}`} tx={136} ty={r((yS + yD) / 2 + 4)} anc="start" />
      {v.H > 0 && <Cota pentru="inc-fierastrau" c={c} x1={238} y1={yF} x2={238} y2={ys} text={`H ${c.f(v.H)}`} tx={234} ty={r((yF + ys) / 2 + 4)} anc="end" />}
      <Cota pentru="inc-margine" c={c} x1={xbl} y1={yT - 6} x2={xbl + m} y2={yT - 6} text={c.f(margine ?? 0)} tx={xbl + m + 4} ty={yT - 2} anc="start" />
      <Jos>{t('export.desen.incrustatie.intra', { s: c.f(v.S), c: c.f(v.contact) })}</Jos>
    </Desen>
  );
}

/**
 * Banda din jurul dopului în V (ADR 0172), pe semifabricatul dopului, în secțiune (jumătatea dreaptă): pereții V ai dopului de
 * la față până la S + H, fundul plat al benzii pe lățimea ei, peretele ei înapoi la față; cu decuparea, tăietura prin placă la e
 * de desen, cu puntea de la fundul plăcii. Valorile, ca `valoriBanda`.
 */
export function DesenBanda({ c, adancime, unghi, joc, fierastrau, latime, decupare, placa, puntiGrosime, fund, frezaDecupare }: {
  c: DesenComun; adancime: number | null; unghi: number | null; joc: number | null; fierastrau: number | null; latime: number | null; decupare: boolean;
  placa: number | null; puntiGrosime: number | null; fund: number | null; frezaDecupare: number | null;
}): ReactNode {
  const v = bandaDesen(adancime, unghi, joc, fierastrau, { latime, decupare, placa, puntiGrosime: puntiGrosime ?? 0, fund: fund ?? 0, frezaDecupare });
  if (!v) {
    return <Desen eticheta={t('export.desen.banda')} data-banda="lipsa"><rect className="l" data-lemn x={6} y={30} width={248} height={84} /><Jos tare>{t('export.desen.incrustatie.lipsa')}</Jos></Desen>;
  }
  const t2 = Math.min(v.t, 2.5), M = v.latime, P = Math.max(v.placa, v.S + v.H);
  const k = Math.min(150 / (M + v.S * t2), 84 / P), y0 = 30, xC = 70;
  const X = (x: number): number => r(xC + x * k), Y = (y: number): number => r(y0 + y * k);
  const sant = `M${X(-v.S * t2)} ${y0}L${xC} ${Y(v.S)}L${X(v.H * t2)} ${Y(v.S + v.H)}H${X(M - v.H * t2)}L${X(M)} ${Y(v.S)}L${X(M + v.S * t2)} ${y0}Z`;
  const dz = decupare ? Math.max(frezaDecupare ?? fund ?? 0, 0) : 0, xe = v.e, pg = Math.min(puntiGrosime ?? 0, P - v.S - v.H);
  return (
    <Desen eticheta={t('export.desen.banda')} data-banda={decupare ? 'decupat' : 'banda'}>
      <rect className="l" data-lemn x={6} y={y0} width={248} height={r(P * k)} />
      <path className="g" d={sant} /><path className="d" d={sant.replace(/Z$/, '')} />
      <text x={12} y={y0 + 18} className="tare">{t('export.desen.incrustatie.dop')}</text>
      {decupare && dz > 0 && (<>
        <rect className="g" data-decupare x={X(xe)} y={Y(v.S + v.H)} width={r(dz * k)} height={r((P - v.S - v.H) * k)} />
        {pg > 0 && <rect className="cs" data-punte x={X(xe)} y={Y(P - pg)} width={r(dz * k)} height={r(pg * k)} />}
        <Cota pentru="banda-punti-grosime" c={c} x1={X(xe) - 6} y1={Y(P - pg)} x2={X(xe) - 6} y2={Y(P)} text={`${t('export.desen.banda.punte')} ${c.f(pg)}`}
          tx={X(xe) - 10} ty={Y(P) - 2} anc="end" />
        {frezaDecupare !== null && <Cota pentru="banda-diametru" c={c} text={`Ø ${c.fz(frezaDecupare)}`} tx={X(xe + dz / 2)} ty={Y(v.S + v.H) - 4} />}
      </>)}
      {/* Lățimea ca în câmp: scrisă, sau cea mai mică rotunjită în sus la micron (nota „cea mai mică: … mm”). */}
      <Cota pentru="banda-latime" c={c} x1={xC} y1={y0 - 8} x2={X(M)} y2={y0 - 8} text={`${c.fz(latime ?? susLaMicron(M))} mm`} tx={(xC + X(M)) / 2} ty={y0 - 12} />
      <Cota pentru="banda-placa" c={c} x1={246} y1={y0} x2={246} y2={Y(P)} text={c.f(P)} tx={242} ty={Y(P) - 4} anc="end" />
      <Jos>{decupare ? t('export.desen.banda.decupat', { e: c.f(v.e), p: c.f(P) }) : t('export.desen.banda.fara')}</Jos>
    </Desen>
  );
}

/** Locașul și treapta incrustației cu pereți drepți, în pixeli: nivelul de sus (U), deschiderea (L), adâncimile umărului și a locașului. */
type LocasPx = { readonly u0: number; readonly u1: number; readonly l0: number; readonly l1: number; readonly yd: number; readonly yD: number };
function locasPx(ys: number, k: number, D: number, treapta: 'fara' | 'interior' | 'exterior', d: number, sp: number): LocasPx {
  const a = 82, b = 178;
  if (treapta === 'fara') return { u0: a, u1: b, l0: a, l1: b, yd: ys, yD: ys + D * k };
  return treapta === 'interior'
    ? { u0: a, u1: b, l0: a + sp, l1: b - sp, yd: ys + d * k, yD: ys + D * k }
    : { u0: a - sp, u1: b + sp, l0: a, l1: b, yd: ys + d * k, yD: ys + D * k };
}
const golLocas = (L: LocasPx, ys: number): string =>
  `M${r(L.u0)} ${ys}H${r(L.u1)}V${r(L.yd)}H${r(L.l1)}V${r(L.yD)}H${r(L.l0)}V${r(L.yd)}H${r(L.u0)}Z`;

/**
 * Locașul incrustației cu pereți drepți (ADR 0171, ADR 0175), în secțiune: buzunarul cu fund sau gaura prin foaie, cu dopul în
 * el și jocul lateral dintre pereți (mărit în desen: e de zecimi).
 */
export function DesenLocasDrept({ c, adancime, gaura, lateral }: { c: DesenComun; adancime: number | null; gaura: boolean; lateral: number | null }): ReactNode {
  const D = adancime !== null && adancime > 0 ? adancime : 6, ys = 40, k = 64 / D, L = locasPx(ys, k, D, 'fara', 0, 0);
  const cp = lateral !== null && lateral > 0 ? Math.min(Math.max(lateral * 40, 4), 12) : 0, yb = gaura ? L.yD : L.yD + 14;
  return (
    <Desen eticheta={t('export.desen.locas')} data-locas={gaura ? 'gaura' : 'buzunar'}>
      {gaura && <rect className="m" x={6} y={r(yb)} width={248} height={10} />}
      <rect className="l" data-lemn x={6} y={ys} width={248} height={r(yb - ys)} />
      <path className="g" d={golLocas(L, ys)} />
      <rect className="l2" x={r(L.u0 + cp)} y={ys - 14} width={r(L.u1 - L.u0 - 2 * cp)} height={r(L.yD - ys + 14)} />
      <text x={130} y={ys + 22} textAnchor="middle" className="tare">{t('export.desen.incrustatie.dop')}</text>
      {cp > 0 && <Cota pentru="inc-lateral" c={c} x1={L.u1 - cp} y1={ys + 34} x2={L.u1} y2={ys + 34} text={`c ${c.f(lateral ?? 0)}`} tx={L.u1 + 6} ty={ys + 38} anc="start" />}
      <Cota pentru="adancime" c={c} text={`${c.f(D)} mm`} tx={L.u0 - 8} ty={r((ys + L.yD) / 2 + 4)} anc="end" />
      <Jos>{t(gaura ? 'export.desen.locas.gaura' : 'export.desen.locas.buzunar', { d: c.f(D), c: c.f(lateral ?? 0) })}</Jos>
    </Desen>
  );
}

/** Treapta locașului (ADR 0175), în secțiune: umărul la d de la față, lat de s, spre interior (desenul e sus) sau spre exterior (desenul e la deschidere). */
export function DesenTreapta({ c, adancime, gaura, treapta, d, s: lat }: {
  c: DesenComun; adancime: number | null; gaura: boolean; treapta: 'fara' | 'interior' | 'exterior'; d: number | null; s: number | null;
}): ReactNode {
  const D = adancime !== null && adancime > 0 ? adancime : 6, ys = 30, k = 72 / D;
  const bun = treapta === 'fara' || (d !== null && d > 0 && d < D && lat !== null && lat > 0);
  const tr = bun ? treapta : 'fara', dd = tr === 'fara' ? 0 : d ?? 0, sp = Math.min(Math.max((lat ?? 0) * 6, 8), 30);
  const L = locasPx(ys, k, D, tr, dd, sp), yb = gaura ? L.yD : L.yD + 12;
  const desenY = tr === 'exterior' ? L.yd : ys, desen0 = tr === 'exterior' ? L.l0 : L.u0, desen1 = tr === 'exterior' ? L.l1 : L.u1;
  return (
    <Desen eticheta={t('export.desen.treapta')} data-treapta={bun ? treapta : 'lipsa'}>
      {gaura && <rect className="m" x={6} y={r(yb)} width={248} height={10} />}
      <rect className="l" data-lemn x={6} y={ys} width={248} height={r(yb - ys)} />
      <path className="g" d={golLocas(L, ys)} />
      <path className="ua" data-desen-marcat d={`M${r(desen0)} ${r(desenY)}H${r(desen1)}`} />
      <text x={r((desen0 + desen1) / 2)} y={r(desenY - 5)} textAnchor="middle" className="tare">{t('export.desen.treapta.desen')}</text>
      {tr !== 'fara' && (<>
        <Cota pentru="inc-treapta-adancime" c={c} x1={L.u0 - 14} y1={ys} x2={L.u0 - 14} y2={L.yd} text={c.f(dd)} tx={L.u0 - 18} ty={r((ys + L.yd) / 2 + 4)} anc="end" />
        <Cota pentru="inc-treapta-latime" c={c} x1={Math.min(L.l1, L.u1)} y1={L.yd + 10} x2={Math.max(L.l1, L.u1)} y2={L.yd + 10} text={c.f(lat ?? 0)}
          tx={Math.max(L.l1, L.u1) + 6} ty={L.yd + 14} anc="start" />
      </>)}
      <Jos tare={!bun}>{!bun ? t('export.desen.dop.lipsa') : t(`export.desen.treapta.${tr}`)}</Jos>
    </Desen>
  );
}

/**
 * Dopul cu pereți drepți așezat în locaș (ADR 0171, ADR 0175), în secțiune, după sprijin: pe fund (atinge fundul, între plăci H),
 * pe față (fața semifabricatului pe piesă, sub dop g), pe umăr (flanșa pe treaptă, sub tijă g); decupat, fără semifabricat
 * deasupra. Locul sprijinului, cu accentul; înălțimile, ca `valoriIncrustatieDreapta`.
 */
export function DesenDopDrept({ c, adancime, gaura, dop, sprijin, joc, fierastrau, treapta, d, s: lat }: {
  c: DesenComun; adancime: number | null; gaura: boolean; dop: 'ridicat' | 'decupat'; sprijin: 'fund' | 'fata' | 'umar'; joc: number | null;
  fierastrau: number | null; treapta: 'fara' | 'interior' | 'exterior'; d: number | null; s: number | null;
}): ReactNode {
  const v = dopDreptDesen({ adancime, gaura, dop, sprijin, joc, fierastrau, treapta: treapta === 'fara' ? null : { d, s: lat } });
  if (!v || adancime === null) {
    return <Desen eticheta={t('export.desen.dop')} data-dop="lipsa"><rect className="l" data-lemn x={6} y={60} width={248} height={60} /><Jos tare>{t('export.desen.dop.lipsa')}</Jos></Desen>;
  }
  const D = adancime, g = joc ?? 0, H = fierastrau ?? 0, dd = treapta === 'fara' ? 0 : d ?? 0;
  const k = 70 / (D + H), ys = 24 + H * k, sp = Math.min(Math.max((lat ?? 0) * 4, 8), 24);
  const L = locasPx(ys, k, D, treapta, dd, sp), yb = gaura ? L.yD : L.yD + 10;
  // Unde stă dopul: vârful lui (fața semifabricatului) și capetele flanșei și tijei.
  const peFata = treapta === 'fara' && dop === 'ridicat' && sprijin === 'fata';
  const sus = peFata ? ys : ys - H * k;
  const jos = peFata ? (gaura ? L.yD : ys + (D - g) * k) : treapta !== 'fara' && sprijin === 'umar' && !gaura ? ys + (D - g) * k : L.yD;
  const flansa = treapta === 'fara' ? jos : sprijin === 'fund' ? ys + (dd - g) * k : L.yd;
  const dopCale = `M${r(L.u0 + 1)} ${r(sus)}H${r(L.u1 - 1)}V${r(flansa)}H${r(L.l1 - 1)}V${r(jos)}H${r(L.l0 + 1)}V${r(flansa)}H${r(L.u0 + 1)}Z`;
  const contact = peFata ? `M${r(L.u0 - 26)} ${ys}H${r(L.u0)}M${r(L.u1)} ${ys}H${r(L.u1 + 26)}`
    : treapta !== 'fara' && sprijin === 'umar' ? `M${r(Math.min(L.u0, L.l0))} ${r(L.yd)}H${r(Math.max(L.u0, L.l0))}M${r(Math.min(L.u1, L.l1))} ${r(L.yd)}H${r(Math.max(L.u1, L.l1))}`
      : `M${r(L.l0)} ${r(L.yD)}H${r(L.l1)}`;
  const gol: readonly [number, number] | null = treapta === 'fara' ? (peFata && !gaura ? [jos, L.yD] : null)
    : sprijin === 'fund' ? [flansa, L.yd] : !gaura ? [jos, L.yD] : null;
  return (
    <Desen eticheta={t('export.desen.dop')} data-dop={`${dop}-${sprijin}`}>
      {gaura && <rect className="m" x={6} y={r(yb)} width={248} height={8} />}
      <rect className="l" data-lemn x={6} y={r(ys)} width={248} height={r(yb - ys)} />
      <path className="g" d={golLocas(L, ys)} />
      {dop === 'ridicat' && <rect className="l2" data-semifabricat x={r(L.u0 - 30)} y={r(sus - 14)} width={r(L.u1 - L.u0 + 60)} height={14} />}
      <path className="l2" data-dop-asezat d={dopCale} />
      <path className="ua" data-sprijin={sprijin} d={contact} />
      {gol && gol[1] - gol[0] > 0.5 && <Cota pentru="inc-joc" c={c} x1={130} y1={gol[0]} x2={130} y2={gol[1]} text={`g ${c.f(g)}`} tx={136} ty={r((gol[0] + gol[1]) / 2 + 4)} anc="start" />}
      {!peFata && H > 0 && <Cota pentru="inc-fierastrau" c={c} x1={240} y1={sus} x2={240} y2={ys} text={`H ${c.f(H)}`} tx={236} ty={r((sus + ys) / 2 + 4)} anc="end" />}
      <text x={130} y={128} textAnchor="middle">{v.treapta
        ? t('export.desen.dop.trepte', { h: c.f(v.inaltime), t: c.f(v.treapta.tija), f: c.f(v.treapta.flansa) })
        : t('export.desen.dop.inaltime', { h: c.f(v.inaltime) })}</text>
      <Jos>{t(dop === 'ridicat' ? 'export.desen.dop.semifabricat' : 'export.desen.dop.placa', { g: c.f(v.grosime) })}</Jos>
    </Desen>
  );
}

/*
 * Desenele fișei reliefului (felia 18.1↑d-6, ADR 0317): liniile de sus, adaosul degroșării, marginea și înălțimea, podeaua cu
 * trecerile. Schițe la scară liberă; ce face lucrarea (pasul folosit, fundurile trecerilor) vine din `exportDeseneCalcul.ts`, cu
 * proba lui față de lucrare (`export.desene.relief.test.ts`).
 */

/** Un profil de relief schițat, de la x0 la x1, între sus (y) și jos (y + h): un deal cu o vale, ca un model adevărat. */
function profilRelief(x0: number, x1: number, y: number, h: number, n = 24): Array<readonly [number, number]> {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 0.5 + 0.32 * Math.sin(u * Math.PI * 2.2 + 0.4) + 0.18 * Math.sin(u * Math.PI * 5.1);
    return [x0 + (x1 - x0) * u, y + h * (1 - Math.min(1, Math.max(0, v)))] as const;
  });
}
const linie = (p: ReadonlyArray<readonly [number, number]>): string => p.map(([x, y], i) => `${i ? 'L' : 'M'}${r(x)} ${r(y)}`).join('');

/**
 * Liniile reliefului văzute de sus (ADR 0310 §5, ADR 0314): prin centrele celulelor (grila, la 0° și 90°), la pasul folosit de
 * lucrare (k celule), sau la unghiul lor, la cel mult pasul cerut.
 */
export function DesenLiniiRelief({ c, linii, unghi }: {
  c: DesenComun; linii: { readonly aliniate: boolean; readonly pas: number; readonly celule: number | null } | null; unghi: number | null;
}): ReactNode {
  if (!linii) {
    return (<Desen eticheta={t('export.desen.relief.linii')}><rect className="l2" x={16} y={10} width={228} height={110} /><Jos tare>{t('export.desen.relief.linii.lipsa')}</Jos></Desen>);
  }
  const a = unghi !== null && Number.isFinite(unghi) && unghi >= 0 && unghi < 180 ? unghi : 0;
  const sp = 22, k = linii.celule, cel = k !== null ? sp / k : 0;
  // Liniile la unghiul lor, tăiate exact la marginile reliefului desenat (dreptunghiul 16…244 × 10…120): pe ecran, Y în jos.
  const ux = Math.cos((a * Math.PI) / 180), uy = -Math.sin((a * Math.PI) / 180);
  const segmente = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].flatMap((i) => {
    const px = 130 - uy * i * sp, py = 65 + ux * i * sp;
    let t0 = -Infinity, t1 = Infinity;
    for (const [p, d, lo, hi] of [[px, ux, 16, 244], [py, uy, 10, 120]] as const) {
      if (Math.abs(d) < 1e-12) { if (p < lo || p > hi) return []; continue; }
      const ta = (lo - p) / d, tb = (hi - p) / d;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    return t1 - t0 > 1 ? [`M${r(px + ux * t0)} ${r(py + uy * t0)}L${r(px + ux * t1)} ${r(py + uy * t1)}`] : [];
  });
  // Marginile celulelor, la jumătate de celulă de linii: liniile trec prin centrele lor.
  const grila: ReactNode[] = [];
  if (linii.aliniate && cel >= 4) {
    for (let x = 16 + cel; x < 244; x += cel) grila.push(<path key={`x${x}`} className="cs slab" d={`M${r(x)} 10V120`} />);
    for (let y = 65 + cel / 2 - Math.floor((55 + cel / 2) / cel) * cel; y <= 120; y += cel) {
      if (y > 10) grila.push(<path key={`y${y}`} className="cs slab" d={`M16 ${r(y)}H244`} />);
    }
  }
  return (
    <Desen eticheta={t('export.desen.relief.linii')} data-aliniate={String(linii.aliniate)}>
      <rect className="l2" x={16} y={10} width={228} height={110} />
      {grila}
      {segmente.map((d, i) => <path key={i} className="d" data-linie-relief d={d} />)}
      <Cota pentru="relief-pas-lateral" c={c} text={t('export.desen.golire.pas', { mm: c.f(linii.pas) })} tx={16} ty={132} anc="start" />
      <Unghi pentru="relief-unghi" c={c} cx={130} cy={65} raza={40} a0={0} a1={-a} text={`${c.f(a)}°`} tx={176} ty={58} />
      <Jos>{linii.aliniate && k !== null ? t('export.desen.relief.linii.celule', { n: k, mm: c.f(linii.pas) }) : t('export.desen.relief.linii.cel-mult', { mm: c.f(linii.pas) })}</Jos>
    </Desen>
  );
}

/** Adaosul degroșării (ADR 0313 §2), în secțiune: modelul, lemnul lăsat deasupra lui (în orice direcție) și treptele degroșării. */
export function DesenAdaosRelief({ c, adaos }: { c: DesenComun; adaos: number | null }): ReactNode {
  const model = profilRelief(16, 244, 52, 66), a = adaos ?? 0, ap = adaos === null || a <= 0 ? 0 : Math.max(5, Math.min(18, a * 12));
  // Adaosul pe normala modelului (în orice direcție, nu doar pe verticală).
  const sus = model.map(([x, y], i) => {
    const [xa, ya] = model[Math.max(0, i - 1)]!, [xb, yb] = model[Math.min(model.length - 1, i + 1)]!;
    const L = Math.hypot(xb - xa, yb - ya) || 1;
    return [x + (ap * (yb - ya)) / L, y - (ap * (xb - xa)) / L] as const;
  });
  const vf = model.reduce((m, p, i) => (p[1] < model[m]![1] ? i : m), 0), [xv, yv] = model[vf]!;
  const trepte = [30, 52, 74, 96].filter((y) => y < 118);
  return (
    <Desen eticheta={t('export.desen.relief.adaos')}>
      <rect className="l" data-lemn x={6} y={18} width={248} height={102} />
      <path className="g2" d={`${linie(sus)}L244 18H16Z`} />
      <path className="l2" d={`${linie(model)}L244 120H16Z`} />
      {ap > 0 && <path className="cs" d={linie(sus)} />}
      {trepte.map((y) => <path key={y} className="d slab" d={`M16 ${y}H244`} />)}
      {ap > 0 && <Cota pentru="relief-adaos" c={c} x1={xv} y1={yv - ap} x2={xv} y2={yv} text={`${c.f(a)} mm`} tx={xv + 8} ty={yv - ap / 2 + 4} anc="start" />}
      <Jos>{ap > 0 ? t('export.desen.relief.adaos.rest', { mm: c.f(a) }) : t('export.desen.relief.adaos.zero')}</Jos>
    </Desen>
  );
}

/**
 * Marginea și înălțimea reliefului (ADR 0312 §3, ADR 0313 §5), în secțiune: la perete freza nu iese din dreptunghiul reliefului
 * (peretele rămâne); la „trece”, freza trece de margine cu raza ei. Vârful la fața plăcii sau planul zero la `planZero` sub ea.
 */
export function DesenMargineRelief({ c, margine, z, planZero }: {
  c: DesenComun; margine: 'perete' | 'trece'; z: 'varf' | 'plan'; planZero: number | null;
}): ReactNode {
  const yf = 34, pz = z === 'plan' && planZero !== null && planZero > 0 ? Math.max(6, Math.min(30, planZero * 4)) : 0;
  const yb = yf + pz, model = profilRelief(70, 236, yb, 60), xe = 70, R = 12;
  const trece = margine === 'trece';
  return (
    <Desen eticheta={t('export.desen.relief.margine')} data-margine={margine}>
      <rect className="l" data-lemn x={6} y={yf} width={248} height={92} />
      <path className="g" d={`M${xe} ${yf}${linie(model).replace(/^M/u, 'L')}L236 ${yf}Z`} />
      {trece && <rect className="g" data-trece x={xe - R} y={yf} width={R} height={r(yb + 60 - yf)} />}
      <path className="l2" d={`${linie(model)}L236 126H${xe}Z`} />
      {/* Freza la margine: la perete, cu partea ei pe perete; la „trece”, cu centrul pe margine. */}
      <path className="f" d={`M${r((trece ? xe : xe + R) - 6)} 4H${r((trece ? xe : xe + R) + 6)}V16H${r((trece ? xe : xe + R) + R)}V${r(yb + 4)}A${R} ${R} 0 0 1 ${r((trece ? xe : xe + R) - R)} ${r(yb + 4)}V16H${r((trece ? xe : xe + R) - 6)}Z`} />
      <path className="ua" d={`M6 ${yf}H${xe - 4}`} /><text x={8} y={yf - 6} className="tare z0">Z0</text>
      {pz > 0 && <>
        <path className="cs" d={`M${xe} ${r(yb)}H244`} />
        <Cota pentru="relief-plan-zero" c={c} x1={248} y1={yf} x2={248} y2={yb} text={`${c.f(planZero ?? 0)} mm`} tx={244} ty={r(yb - pz / 2 + 4)} anc="end" />
      </>}
      <Jos>{t(trece ? 'export.desen.relief.trece' : 'export.desen.relief.perete')}</Jos>
    </Desen>
  );
}

/**
 * Podeaua și trecerile pe Z ale reliefului (ADR 0312 §4, ADR 0313 §3), în secțiune: fundurile la k · pas sub față și ultima pe
 * model, cel mult la podea (la degroșare, ridicată cu adaosul), ca lucrarea (`treceriPodeaRelief`).
 */
export function DesenPodeaRelief({ c, adancime, pas, treceri }: {
  c: DesenComun; adancime: number | null; pas: number | null; treceri: { readonly funduri: readonly number[]; readonly n: number; readonly podea: number };
}): ReactNode {
  if (treceri.n === 0 || adancime === null || pas === null) {
    return (<Desen eticheta={t('export.desen.relief.podea')}><rect className="l" data-lemn x={6} y={24} width={248} height={96} /><Jos tare>{t('export.desen.adancime.lipsa')}</Jos></Desen>);
  }
  const yf = 24, k = 84 / Math.max(adancime, 1e-9), yp = yf + treceri.podea * k;
  // Modelul coboară sub podea pe mijloc: acolo, ultima trecere rămâne pe podea.
  const model = profilRelief(30, 236, yf + 6, Math.max(12, adancime * k + 14)).map(([x, y]) => [x, Math.min(y, yp)] as const);
  return (
    <Desen eticheta={t('export.desen.relief.podea')}>
      <rect className="l" data-lemn x={6} y={yf} width={248} height={96} />
      <path className="g" d={`M30 ${yf}${linie(model).replace(/^M/u, 'L')}L236 ${yf}Z`} />
      {treceri.n <= 12 && treceri.funduri.map((f, i) => (<g key={i}>
        <path className="cs" data-fund={i + 1} d={`M30 ${r(yf + f * k)}H236`} />
        <text x={33} y={r(yf + f * k - 2)}>{i + 1}</text>
      </g>))}
      <path className="ua" data-podea d={`M30 ${r(yp)}H236`} />
      <Cota pentru="relief-pas" c={c} x1={24} y1={yf} x2={24} y2={yf + Math.min(pas, treceri.podea) * k} text={c.f(pas)} tx={19} ty={yf + 12} anc="end" />
      <Cota pentru="relief-adancime" c={c} x1={250} y1={yf} x2={250} y2={yf + adancime * k} text={`${c.f(adancime)} mm`} tx={246} ty={r(yf + adancime * k + 12)} anc="end" />
      <Jos>{t('export.desen.relief.treceri', { n: treceri.n, mm: c.f(pas) })}</Jos>
    </Desen>
  );
}
