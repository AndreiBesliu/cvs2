import type { ReactElement } from 'react';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Potrivire, PotrivireDreapta, PotrivireTrepte, PotrivireV } from '../ui/actiuniExportTipuri.ts';
import { desenSectiune } from './sectiuneDesen.ts';

/**
 * „Împreună (secțiunea)” (ADR 0179 §4, §5): dopul întors și așezat în locașul simulat, în secțiune pe orizontală, cu tabelul
 * planșei: valorile pe hârtie lângă cele simulate, rândurile care ies din toleranță în roșu, cu locul lor. Desenul e la scara
 * 1:1 pe ambele axe (Z în sus): placa până la D + 1,5 mm sub față (la gaura prin foaie, cât foaia), dopul până la fața lui de
 * sus, jocul cu clei albastru, contactul verde, tăietura cu fierăstrăul la mijlocul spațiului dintre plăci; geometria lui e
 * în `sectiuneDesen.ts`. Valorile, cu două zecimale și punct, ca secțiunea pe hârtie din panou. Dopul în V are patru rânduri;
 * cel cu pereți drepți (felia 12.1↑e-3), cinci: jocul lateral, dopul în locaș, adâncimea, înălțimea, sprijinul; cel în trepte
 * (felia 12.1↑e-4), zece: jocul la flanșă și la tijă, dopul în locaș, flanșa pe umăr, umărul, fundul, tija, înălțimea, jocul cu
 * clei (sub tijă sau deasupra umărului) și spațiul de peste placă.
 */
type Props = { readonly p: Potrivire; readonly n: number };
type Rand = {
  readonly id: string; readonly eticheta: string; readonly hartie: string; readonly simulat: string;
  readonly r: PotrivireV['randuri']['intra']; readonly titlu: string | undefined;
};

const mm = (v: number): string => `${v.toFixed(2)} mm`;

/** Desenul: căile vin din `desenSectiune` (pur, probat pe hârtie); aici doar straturile și culorile lor. */
function Desen({ p }: { readonly p: Potrivire }): ReactElement {
  const g = desenSectiune(p);
  return (
    <svg
      data-testid="sectiune-svg" role="img"
      aria-label={t(g.taiere.fel === 'rindea' ? 'editare.3d.sectiune.svg-decupat' : 'editare.3d.sectiune.svg', { y: p.sectiune.y.toFixed(2) })}
      viewBox={g.cutie} preserveAspectRatio="xMidYMid meet"
    >
      <path data-strat="placa" d={g.placa} className="sectiune-placa" />
      <path data-strat="dop" d={g.dop} className="sectiune-dop" />
      {g.clei ? <path data-strat="clei" d={g.clei} className="sectiune-clei" /> : null}
      {g.contact.map((puncte) => <polyline key={puncte} data-strat="contact" className="sectiune-contact" points={puncte} />)}
      <line data-strat={g.taiere.fel} className="sectiune-fierastrau" x1={g.x0} x2={g.x1} y1={g.taiere.y} y2={g.taiere.y} />
      {g.marcaj !== null ? <line data-strat="marcaj" className="sectiune-marcaj" x1={g.marcaj} x2={g.marcaj} y1={g.ySus} y2={g.yJos} /> : null}
    </svg>
  );
}

const interval = (a: number, b: number): string => (a < b ? `${a.toFixed(2)}–${b.toFixed(2)} mm` : mm(b));
const banda = (b: PotrivireV['sub']): string | undefined => (b.n > 0 ? t('editare.3d.sectiune.banda', { min: b.min.toFixed(2), max: b.max.toFixed(2) }) : undefined);

/** Rândurile dopului în V: cât intră, pereții în contact, sub dop, între plăci. */
function randuriV(p: PotrivireV): Rand[] {
  const h = p.hartie;
  return [
    { id: 'intra', eticheta: t('editare.3d.sectiune.intra'), hartie: mm(h.S), simulat: mm(p.asezare), r: p.randuri.intra, titlu: undefined },
    {
      id: 'contact', eticheta: t('editare.3d.sectiune.contact'), hartie: t('editare.3d.sectiune.contact-hartie'),
      simulat: p.contact.n > 0 ? `${Math.round(p.contact.fractie * 100)} %` : t('editare.3d.sectiune.fara-pereti'), r: p.randuri.contact, titlu: undefined,
    },
    {
      id: 'sub', eticheta: t('editare.3d.sectiune.sub'), hartie: interval(h.g - h.creastaLocas, h.g),
      simulat: p.sub.n > 0 ? mm(p.sub.med) : t('editare.3d.sectiune.fara-fund'), r: p.randuri.sub, titlu: banda(p.sub),
    },
    {
      id: 'intre', eticheta: t('editare.3d.sectiune.intre'), hartie: interval(h.H - h.creastaDop, h.H),
      simulat: p.intre.n > 0 ? mm(p.intre.med) : '—', r: p.randuri.intre, titlu: banda(p.intre),
    },
  ];
}

/**
 * Rândurile dopului cu pereți drepți (felia 12.1↑e-3): jocul lateral, dopul în locaș, adâncimea, înălțimea și sprijinul: între
 * plăci (H, ridicat pe fund), sub dop (g, ridicat pe față) sau peste placă (H, decupat: se rindeluiește).
 */
function randuriDrepte(p: PotrivireDreapta): Rand[] {
  const h = p.hartie, peFund = h.decupat || h.sprijin === 'fund';
  const sprijin = h.decupat ? 'peste' : peFund ? 'intre' : 'sub';
  return [
    {
      id: 'joc', eticheta: t('editare.3d.sectiune.joc'), hartie: mm(h.c), simulat: p.joc.n > 0 ? mm(p.joc.med) : '—', r: p.randuri.joc,
      titlu: banda(p.joc),
    },
    {
      id: 'dop', eticheta: t('editare.3d.sectiune.dop'), hartie: t('editare.3d.sectiune.dop-hartie'),
      simulat: p.dop.afara === 0 ? t('editare.3d.sectiune.dop-tot', { n: p.dop.n }) : t('editare.3d.sectiune.dop-afara', { k: p.dop.afara, n: p.dop.n }),
      r: p.randuri.dop, titlu: undefined,
    },
    { id: 'adancime', eticheta: t('editare.3d.sectiune.adancime'), hartie: mm(h.D), simulat: mm(p.adancime), r: p.randuri.adancime, titlu: undefined },
    { id: 'inaltime', eticheta: t('editare.3d.sectiune.inaltime'), hartie: mm(h.h), simulat: mm(p.inaltime), r: p.randuri.inaltime, titlu: undefined },
    {
      id: sprijin, hartie: mm(peFund ? h.H : h.g),
      eticheta: sprijin === 'peste' ? t('editare.3d.sectiune.peste') : sprijin === 'intre' ? t('editare.3d.sectiune.intre') : t('editare.3d.sectiune.sub'),
      simulat: mm(peFund ? p.inaltime - p.adancime : p.adancime - p.inaltime), r: p.randuri.sprijin, titlu: undefined,
    },
  ];
}

/**
 * Rândurile dopului în trepte (felia 12.1↑e-4): jocul lateral pe fiecare nivel, dopul în locaș (flanșa și tija), flanșa pe umăr,
 * umărul, fundul, tija, înălțimea, jocul cu clei (pe umăr, sub tijă: g, la gaură 0; pe fund, deasupra umărului: g) și spațiul
 * de peste placă (H: între plăci, sau de rindeluit la dopul decupat).
 */
function randuriTrepte(p: PotrivireTrepte): Rand[] {
  const h = p.hartie, peUmar = h.sprijin === 'umar';
  const afara = p.sus.dop.afara + p.jos.dop.afara, puncte = p.sus.dop.n + p.jos.dop.n;
  return [
    { id: 'joc-sus', eticheta: t('editare.3d.sectiune.joc-sus'), hartie: mm(h.c), simulat: p.sus.joc.n > 0 ? mm(p.sus.joc.med) : '—', r: p.randuri.jocSus, titlu: banda(p.sus.joc) },
    { id: 'joc-jos', eticheta: t('editare.3d.sectiune.joc-jos'), hartie: mm(h.c), simulat: p.jos.joc.n > 0 ? mm(p.jos.joc.med) : '—', r: p.randuri.jocJos, titlu: banda(p.jos.joc) },
    {
      id: 'dop', eticheta: t('editare.3d.sectiune.dop'), hartie: t('editare.3d.sectiune.dop-hartie'),
      simulat: afara === 0 ? t('editare.3d.sectiune.dop-tot', { n: puncte }) : t('editare.3d.sectiune.dop-afara', { k: afara, n: puncte }), r: p.randuri.dop, titlu: undefined,
    },
    {
      id: 'reazem', eticheta: t('editare.3d.sectiune.reazem'), hartie: t('editare.3d.sectiune.dop-hartie'),
      simulat: p.reazem.nu === 0 ? t('editare.3d.sectiune.reazem-tot', { min: p.reazem.banda.n > 0 ? p.reazem.banda.min.toFixed(2) : '—' })
        : t('editare.3d.sectiune.reazem-nu', { k: p.reazem.nu, n: p.reazem.banda.n }),
      r: p.randuri.reazem, titlu: undefined,
    },
    { id: 'umar', eticheta: t('editare.3d.sectiune.umar'), hartie: mm(h.d), simulat: mm(p.umar), r: p.randuri.umar, titlu: undefined },
    { id: 'adancime', eticheta: t('editare.3d.sectiune.adancime'), hartie: mm(h.D), simulat: mm(p.adancime), r: p.randuri.adancime, titlu: undefined },
    { id: 'tija', eticheta: t('editare.3d.sectiune.tija'), hartie: mm(h.tija), simulat: mm(p.tija), r: p.randuri.tija, titlu: undefined },
    { id: 'inaltime', eticheta: t('editare.3d.sectiune.inaltime'), hartie: mm(h.h), simulat: mm(p.inaltime), r: p.randuri.inaltime, titlu: undefined },
    {
      id: peUmar ? 'sub-tija' : 'peste-umar', eticheta: t(peUmar ? 'editare.3d.sectiune.sub-tija' : 'editare.3d.sectiune.peste-umar'),
      hartie: mm(peUmar && h.gaura ? 0 : h.g), simulat: mm(peUmar ? p.adancime - p.umar - p.tija : p.tija - (p.adancime - p.umar)), r: p.randuri.clei, titlu: undefined,
    },
    {
      id: h.decupat ? 'peste' : 'intre', eticheta: t(h.decupat ? 'editare.3d.sectiune.peste' : 'editare.3d.sectiune.intre'), hartie: mm(h.H),
      simulat: mm(peUmar ? p.inaltime - p.tija - p.umar : p.inaltime - p.adancime), r: p.randuri.placi, titlu: undefined,
    },
  ];
}

export function Sectiune3D({ p, n }: Props): ReactElement {
  const randuri = p.fel === 'v' ? randuriV(p) : p.fel === 'drept' ? randuriDrepte(p) : randuriTrepte(p);
  // Dopul decupat cu pereți drepți intră cum a fost tăiat, neîntors (ADR 0171); cel în V, cel drept ridicat și cel în trepte
  // (oricum ar fi tăiat, ADR 0175), întors.
  const titlu = p.fel === 'drept' && p.hartie.decupat ? 'editare.3d.sectiune.titlu-decupat' : 'editare.3d.sectiune.titlu';
  return (
    <>
      <h3>{t(titlu, { n, y: p.sectiune.y.toFixed(2) })}</h3>
      <Desen p={p} />
      <table data-testid="sectiune-tabel">
        <thead>
          <tr>
            <th scope="col">{t('editare.3d.sectiune.valoarea')}</th>
            <th scope="col">{t('editare.3d.sectiune.hartie')}</th>
            <th scope="col">{t('editare.3d.sectiune.simulare')}</th>
          </tr>
        </thead>
        <tbody>
          {randuri.map((r) => (
            <tr key={r.id} data-rand={r.id} className={r.r.ok ? undefined : 'diferit'}>
              <th scope="row">{r.eticheta}</th>
              <td>{r.hartie}</td>
              <td title={r.titlu}>
                {r.simulat}
                {!r.r.ok && r.r.unde ? ` · ${t('editare.3d.sectiune.diferit', { x: r.r.unde[0].toFixed(2), y: r.r.unde[1].toFixed(2) })}` : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sectiune-nota">{t(p.fel === 'v' ? 'editare.3d.sectiune.nota' : p.fel === 'drept' ? 'editare.3d.sectiune.nota-dreapta' : 'editare.3d.sectiune.nota-trepte', { celula: String(p.celula) })}</p>
    </>
  );
}
