import type { ReactElement } from 'react';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Potrivire, PotrivireDreapta, PotrivireV } from '../ui/actiuniExportTipuri.ts';
import { desenSectiune } from './sectiuneDesen.ts';

/**
 * „Împreună (secțiunea)” (ADR 0179 §4, §5): dopul întors și așezat în locașul simulat, în secțiune pe orizontală, cu tabelul
 * planșei: valorile pe hârtie lângă cele simulate, rândurile care ies din toleranță în roșu, cu locul lor. Desenul e la scara
 * 1:1 pe ambele axe (Z în sus): placa până la D + 1,5 mm sub față (la gaura prin foaie, cât foaia), dopul până la fața lui de
 * sus, jocul cu clei albastru, contactul verde, tăietura cu fierăstrăul la mijlocul spațiului dintre plăci; geometria lui e
 * în `sectiuneDesen.ts`. Valorile, cu două zecimale și punct, ca secțiunea pe hârtie din panou. Dopul în V are patru rânduri;
 * cel cu pereți drepți (felia 12.1↑e-3), cinci: jocul lateral, dopul în locaș, adâncimea, înălțimea, sprijinul.
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

export function Sectiune3D({ p, n }: Props): ReactElement {
  const randuri = p.fel === 'v' ? randuriV(p) : randuriDrepte(p);
  // Dopul decupat intră cum a fost tăiat, neîntors (ADR 0171); cel în V și cel drept ridicat, întors.
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
      <p className="sectiune-nota">{t(p.fel === 'v' ? 'editare.3d.sectiune.nota' : 'editare.3d.sectiune.nota-dreapta', { celula: String(p.celula) })}</p>
    </>
  );
}
