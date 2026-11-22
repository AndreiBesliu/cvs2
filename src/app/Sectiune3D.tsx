import type { ReactElement } from 'react';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Potrivire, PotrivireDreapta, PotrivireV } from '../ui/actiuniExportTipuri.ts';

/**
 * „Împreună (secțiunea)” (ADR 0179 §4, §5): dopul întors și așezat în locașul simulat, în secțiune pe orizontală, cu tabelul
 * planșei: valorile pe hârtie lângă cele simulate, rândurile care ies din toleranță în roșu, cu locul lor. Desenul e la scara
 * 1:1 pe ambele axe (Z în sus): placa până la D + 1,5 mm sub față, dopul până la fața lui de sus, jocul cu clei albastru,
 * pereții în contact verzi, tăietura cu fierăstrăul la mijlocul spațiului dintre plăci. Valorile, cu două zecimale și punct,
 * ca secțiunea pe hârtie din panou. Dopul în V are patru rânduri; cel cu pereți drepți (felia 12.1↑e-3), cinci: jocul
 * lateral, dopul în locaș, adâncimea, înălțimea, sprijinul.
 */
type Props = { readonly p: Potrivire; readonly n: number };
type Rand = {
  readonly id: string; readonly eticheta: string; readonly hartie: string; readonly simulat: string;
  readonly r: PotrivireV['randuri']['intra']; readonly titlu: string | undefined;
};

const mm = (v: number): string => `${v.toFixed(2)} mm`;
/** Sub cât jocul dintre fața dopului și placă e contact, în desen (mm); peste, în locaș, e jocul cu clei. */
const CONTACT = 0.05;
/** Sub atât (mm) suprafața plăcii e fața ei, nu locașul. */
const FATA = 0.01;

/** Rulările consecutive de indici pentru care `ok(i)` e adevărat. */
function rulari(n: number, ok: (i: number) => boolean): Array<readonly [number, number]> {
  const rez: Array<readonly [number, number]> = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && ok(i)) { if (start < 0) start = i; } else if (start >= 0) { rez.push([start, i - 1]); start = -1; }
  }
  return rez;
}

function Desen({ p }: { readonly p: Potrivire }): ReactElement {
  const s = p.sectiune, h = p.hartie, n = s.placa.length, c = s.celula;
  const x = (i: number): number => s.x0 + (i + 0.5) * c;
  const y = (z: number): number => -z;
  const zJos = -(h.D + 1.5), zSus = s.grosimeDop - p.asezare, X0 = s.x0, X1 = s.x0 + n * c;
  const f = (v: number): string => (Math.round(v * 1000) / 1000).toString();
  const placa = `M${f(X0)} ${f(y(zJos))}${Array.from(s.placa, (z, i) => ` L${f(x(i))} ${f(y(z))}`).join('')} L${f(X1)} ${f(y(zJos))}Z`;
  const dop = rulari(n, (i) => Number.isFinite(s.dop[i]!)).map(([a, b]) => {
    let d = `M${f(x(a) - c / 2)} ${f(y(zSus))} L${f(x(b) + c / 2)} ${f(y(zSus))}`;
    for (let i = b; i >= a; i--) d += ` L${f(x(i))} ${f(y(s.dop[i]!))}`;
    return `${d}Z`;
  }).join(' ');
  const inLocas = (i: number): boolean => Number.isFinite(s.dop[i]!) && s.placa[i]! < -FATA;
  const clei = rulari(n, (i) => inLocas(i) && s.dop[i]! - s.placa[i]! >= CONTACT).map(([a, b]) => {
    let d = `M${f(x(a))} ${f(y(s.dop[a]!))}`;
    for (let i = a + 1; i <= b; i++) d += ` L${f(x(i))} ${f(y(s.dop[i]!))}`;
    for (let i = b; i >= a; i--) d += ` L${f(x(i))} ${f(y(s.placa[i]!))}`;
    return `${d}Z`;
  }).join(' ');
  const contact = rulari(n, (i) => inLocas(i) && s.dop[i]! - s.placa[i]! < CONTACT);
  // Tăietura cu fierăstrăul: la mijlocul spațiului dintre plăci (mediana lui simulată; fără ea, H de pe hârtie). Dopul drept
  // pe față stă cu fața coborâtă pe placă: tăietura e la fața plăcii. Dopul decupat n-are a doua placă: ce iese peste placă se
  // rindeluiește până la fața ei (ADR 0171).
  const rindea = p.fel === 'drept' && p.hartie.decupat;
  const zTaiere = p.fel === 'v' ? (Number.isFinite(p.intre.med) ? p.intre.med : h.H) / 2 : rindea ? 0 : Math.max(0, p.inaltime - p.adancime) / 2;
  const latime = X1 - X0, inaltime = zSus - zJos;
  return (
    <svg
      data-testid="sectiune-svg" role="img" aria-label={t(rindea ? 'editare.3d.sectiune.svg-decupat' : 'editare.3d.sectiune.svg', { y: s.y.toFixed(2) })}
      viewBox={`${f(X0)} ${f(y(zSus))} ${f(latime)} ${f(inaltime)}`} preserveAspectRatio="xMidYMid meet"
    >
      <path data-strat="placa" d={placa} className="sectiune-placa" />
      <path data-strat="dop" d={dop} className="sectiune-dop" />
      {clei ? <path data-strat="clei" d={clei} className="sectiune-clei" /> : null}
      {contact.map(([a, b]) => (
        <polyline
          key={a} data-strat="contact" className="sectiune-contact"
          points={Array.from({ length: b - a + 1 }, (_, k) => `${f(x(a + k))},${f(y(s.placa[a + k]!))}`).join(' ')}
        />
      ))}
      <line data-strat={rindea ? 'rindea' : 'fierastrau'} className="sectiune-fierastrau" x1={f(X0)} x2={f(X1)} y1={f(y(zTaiere))} y2={f(y(zTaiere))} />
      {s.marcaj !== null ? (
        <line data-strat="marcaj" className="sectiune-marcaj" x1={f(s.marcaj)} x2={f(s.marcaj)} y1={f(y(zSus))} y2={f(y(zJos))} />
      ) : null}
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
