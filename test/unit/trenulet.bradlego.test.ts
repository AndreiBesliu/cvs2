/**
 * Brăduțul LEGO din atelierul Easy 3Draw (ADR 0285, felia 3.Cl-4), pe plasele reale ale motorului:
 * - etajul: un trunchi de con cu marginea zimțată (sau netedă), cu locașul 2 × 2 dedesubt (tubul din mijloc și golul
 *   știfturilor) și cu patru știfturi sus; modelul de pe hârtie e scris aici, iar plasa e întrebată punct cu punct, la mai
 *   multe înălțimi;
 * - etajul se pune pe cele patru știfturi ale unei piese rotunde 2 × 2 (sau ale etajului de dedesubt): știfturile au loc,
 *   tubul le atinge;
 * - steaua de vârf: plată, cu un umăr și un cui care intră în știftul gol al vârfului (conul 2 × 2 cu gaură de bară);
 * - brăduțul întreg: trunchiul, etajele din două în două știfturi, vârful și steaua.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, dinMotor, type P3 } from './ajutor-plasa-lego.ts';
import { type P2, type Def, RAD, r2, num, inPoli, steaPoli, caPeHartie, inchisa } from './ajutor-craciun.ts';

type Prindere = { fel: string; p: number[]; d: number[]; lung: number; orb?: boolean };
type Cote = { piesa: string; diam: number; placi: number; margine: string; marime: number; inaltime: number; zimti: number; gros: number };
const Lg = L as typeof L & {
  bradLegoCote(d: Def): Cote; bradLegoPiese(d: Def): Def[]; prinderi(d: Def): Prindere[]; asezareModel(d: Def): { ax: boolean };
};
const brad = (d: Def = {}) => L.construieste({ tip: 'bradLego', ...d }) as ReturnType<typeof L.construieste> & { prinderi: Prindere[] };
const P = L.parametri(), E = L.efective();
const s = P.pas!, DIAG = Math.hypot(s / 2, s / 2);

// ------------------------------------------------------------------------------------------------- etajul, pe hârtie
/** Vârful plat al etajului: cât să țină cele patru știfturi (cel mai depărtat punct al lor e la 4 · √2 + 2,4 = 8,06 mm). */
const RT = 9.2;
type Etaj = { R: number; H: number; ad: number; zc: number; Rc: number; ro: number; ri: number; contur: P2[] | null };
/** Etajul de pe hârtie (ADR 0285), cu axul în origine. */
function etajPeHartie(d: Def = {}): Etaj {
  const D = num(d.diam, 8), R = D * s / 2 - P.joc_lateral!, H = num(d.placi, 5) * P.placa!;
  // locașul: adânc cât la orice piesă (dar cu cel puțin 0,8 mm de tavan), apoi 1 mm de margine dreaptă, apoi conul
  const ad = Math.min(P.locas_h!, H - 0.8), zc = Math.min(H - 0.6, ad + 1);
  // golul știfturilor: un cilindru care le ține din afară, la jocul din calibrare; tubul din mijloc le ține dinăuntru, la fel
  const Rc = DIAG + P.stift_d! / 2 + E.joc!, ro = P.tub_contact! - E.joc!, ri = Math.min(ro - 0.8, P.stift_d! / 2);
  // marginea zimțată: 2 · D + 4 zimți, cu vârfurile pe R și golurile mai înăuntru cu 12 % din rază (cel puțin 2 mm)
  const n = 2 * D + 4, contur = d.margine === 'neteda' ? null : steaPoli(n, R, R - Math.max(2, 0.12 * R), 90 * RAD);
  return { R, H, ad, zc, Rc, ro, ri, contur };
}
/**
 * Conturul etajului la înălțimea z: jos, marginea; de la zc în sus, fiecare vârf al marginii merge drept spre cercul de sus,
 * pe raza lui. Fiecare latură a conului e din două triunghiuri, cu muchia dintre ele de la vârful de jos la vârful următor
 * de sus: la înălțimea z, conturul are, pe fiecare latură, și punctul acelei muchii.
 */
function inEtaj(e: Etaj, [x, y]: P2, z: number): boolean {
  const r = Math.hypot(x, y);
  if (z < 0) return false;
  if (z > e.H) return z <= e.H + P.stift_h! && [[1, 1], [-1, 1], [1, -1], [-1, -1]].some(([a, b]) => Math.hypot(x - a! * s / 2, y - b! * s / 2) <= E.stiftD! / 2);
  const t = z <= e.zc ? 0 : (z - e.zc) / (e.H - e.zc), sus = ([a, b]: P2): P2 => { const u = Math.atan2(b, a); return [RT * Math.cos(u), RT * Math.sin(u)]; };
  const intre = (a: P2, b: P2): P2 => [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t];
  const inContur = e.contur ? inPoli(e.contur.flatMap((a, k): P2[] => [intre(a, sus(a)), intre(a, sus(e.contur![(k + 1) % e.contur!.length]!))]), [x, y]) : r <= e.R * (1 - t) + RT * t;
  if (!inContur) return false;
  return z >= e.ad || r >= e.Rc || (r >= e.ri && r <= e.ro);
}

test('etajul e cel de pe hârtie, punct cu punct, la mai multe înălțimi: marginea, conul, locașul, știfturile', () => {
  const cazuri: Def[] = [{}, { diam: 4 }, { diam: 6 }, { diam: 8, placi: 3 }, { diam: 10, placi: 9 }, { margine: 'neteda' }, { diam: 4, placi: 4, margine: 'neteda' }, { diam: 10, margine: 'neteda', placi: 6 }];
  for (const d of cazuri) {
    const e = etajPeHartie(d), p = brad(d), ce = JSON.stringify(d), cutie = [-e.R - 1, -e.R - 1, e.R + 1, e.R + 1] as const;
    // în locaș, sub tavanul lui; în marginea dreaptă; pe con, jos, la mijloc și sus; în știfturi
    const niveluri = [e.ad / 2, e.ad - 0.05, e.ad + 0.2, (e.ad + e.zc) / 2, e.zc + 0.1 * (e.H - e.zc), (e.zc + e.H) / 2, e.H - 0.1, e.H + P.stift_h! / 2];
    for (const z of niveluri) {
      const r = caPeHartie(p, q => inEtaj(e, q, z), cutie, z, `${ce}, la z = ${r2(z)}`, 1200);
      assert.ok(r.judecate > 1000 && r.lemn > 12, `${ce}, la z = ${r2(z)}: ${JSON.stringify(r)}`);
    }
    // deasupra știfturilor și sub piesă nu e nimic
    assert.deepEqual(cote(p).map(r2), [r2(2 * e.R), r2(2 * e.R), r2(e.H + P.stift_h!)], ce);
    inchisa(p, ce, plasa(p.tri).corpuri);
  }
  // etajul neted e rotund și când e mare: la 0,03 mm de margine e lemn de jur împrejur (un cerc din 48 de laturi ar fi cu
  // 0,085 mm mai înăuntru la mijlocul unei laturi)
  const mare = brad({ diam: 10, margine: 'neteda' }), em = etajPeHartie({ diam: 10, margine: 'neteda' });
  for (let k = 0; k < 96; k++) assert.equal(plin(mare, dinMotor(mare, [(em.R - 0.03) * Math.cos(k * Math.PI / 48), (em.R - 0.03) * Math.sin(k * Math.PI / 48), em.ad + 0.5] as P3)), true, `etajul neted de 10, la unghiul ${k}`);
  // mărimile: etajul de 8 are 63,8 mm (8 · 8 − 2 · 0,1) și 5 plăci (16 mm), plus știfturile
  assert.deepEqual(cote(brad()).map(r2), [63.8, 63.8, r2(16 + P.stift_h!)]);
  const q = Lg.bradLegoCote({});
  assert.deepEqual([q.piesa, q.diam, q.placi, q.margine, q.inaltime, q.zimti], ['etaj', 8, 5, 'zimti', 16, 20]);
  assert.deepEqual([Lg.bradLegoCote({ diam: 4 }).zimti, Lg.bradLegoCote({ diam: 10 }).zimti, Lg.bradLegoCote({ margine: 'neteda' }).zimti], [12, 24, 0]);
});

test('etajul se pune pe patru știfturi: ele au loc în locaș, tubul din mijloc le atinge, iar prinderile sunt la locul lor', () => {
  for (const d of [{}, { diam: 4, margine: 'neteda' }, { diam: 10, placi: 3 }] as Def[]) {
    const e = etajPeHartie(d), p = brad(d), ce = JSON.stringify(d);
    const lemn = (x: number, y: number, z: number) => plin(p, dinMotor(p, [x, y, z] as P3));
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const cx = a * s / 2, cy = b * s / 2;
      // știftul de dedesubt (Ø4,8, înalt cât spune profilul): în el și pe marginea lui nu e lemn
      for (let k = 0; k < 24; k++) for (const rr of [0, 1.2, P.stift_d! / 2]) for (const z of [0.05, P.stift_h! / 2, P.stift_h! - 0.05]) {
        assert.equal(lemn(cx + rr * Math.cos(k * 15 * RAD), cy + rr * Math.sin(k * 15 * RAD), z), false, `${ce}: lemn în știftul (${a}, ${b}), la raza ${rr}, z = ${z}`);
      }
      // spre mijloc, la jocul din calibrare, e tubul; spre afară, tot la jocul din calibrare, peretele golului: știftul e
      // ținut din două părți (imediat după joc e lemn)
      const spre = (r: number): [number, number] => [cx - a * r / Math.SQRT2, cy - b * r / Math.SQRT2];
      assert.equal(lemn(...spre(P.stift_d! / 2 + E.joc! - 0.03), 1), false, `${ce}: tubul apasă știftul (${a}, ${b})`);
      assert.equal(lemn(...spre(P.stift_d! / 2 + E.joc! + 0.05), 1), true, `${ce}: tubul nu atinge știftul (${a}, ${b})`);
      assert.equal(lemn(...spre(-(P.stift_d! / 2 + E.joc! - 0.03)), 1), false, `${ce}: peretele golului apasă știftul (${a}, ${b})`);
      assert.equal(lemn(...spre(-(P.stift_d! / 2 + E.joc! + 0.05)), 1), true, `${ce}: peretele golului nu atinge știftul (${a}, ${b})`);
    }
    // patru locașuri dedesubt, sub știfturile de sus; patru știfturi sus
    const pr = Array.from(p.prinderi, x => ({ fel: x.fel, p: dinPlasa(p, x.p), d: [...x.d], lung: r2(x.lung), orb: x.orb }));
    const colturi = [[-4, -4], [4, -4], [-4, 4], [4, 4]];
    assert.deepEqual(pr.filter(x => x.fel === 'locas').map(x => [x.p, x.d, x.lung, x.orb]), colturi.map(([x, y]) => [[x, y, 0], [0, 0, -1], r2(e.ad), true]), ce);
    assert.deepEqual(pr.filter(x => x.fel === 'stift').map(x => [x.p, x.d, x.lung]), colturi.map(([x, y]) => [[x, y, r2(e.H)], [0, 0, 1], r2(P.stift_h!)]), ce);
    assert.equal(pr.length, 8, ce);
  }
  // etajul nu e o piesă rotundă a „Modelului”: stă pe grilă, ca o cărămidă (locașul lui e între patru știfturi)
  assert.equal(Lg.asezareModel({ tip: 'bradLego' }).ax, false);
});
/** Un punct al plasei (mutate în origine), înapoi în coordonatele piesei (cu axul în origine), rotunjit. */
const dinPlasa = (p: { baza: number[] }, q: readonly number[]): number[] => Array.from(q, (v, k) => r2(v + p.baza[k]!));

// ----------------------------------------------------------------------------------------------------- steaua de vârf
type Stea = { R: number; g: number; zb: number; contur: P2[]; yt: number };
/** Steaua de vârf, pe hârtie: cinci colțuri (vârfurile dinăuntru la 45 %), un umăr cât știftul și un cui de 6 mm. */
function steaPeHartie(d: Def = {}): Stea {
  const R = num(d.marime, 28) / 2;
  // cuiul: o bară de 3,2 mm, culcată (tăiată dedesubt cu 0,25, ca să stea pe pat); steaua e groasă cât ea
  return { R, g: P.bara_d! - 0.25, zb: P.bara_d! / 2 - 0.25, contur: steaPoli(5, R, 0.45 * R, 90 * RAD), yt: -R * Math.cos(36 * RAD) };
}
const UMAR = 5.2, CUI = 6;
const inStea = (st: Stea, [x, y]: P2, z: number): boolean => inPoli(st.contur, [x, y])
  // umărul: de la nivelul colțurilor de jos până în stea (1 mm peste vârful dinăuntru de jos)
  || (Math.abs(x) <= UMAR / 2 && y >= st.yt && y <= -0.45 * st.R + 1)
  // cuiul: sub umăr, rotund (la înălțimea z, cât de lat e cercul barei)
  || (y >= st.yt - CUI && y <= st.yt + 0.5 && Math.hypot(x, z - st.zb) <= P.bara_d! / 2);

test('steaua de vârf e cea de pe hârtie: plată, cu umărul și cuiul care intră în știftul gol al vârfului', () => {
  for (const d of [{ piesa: 'stea' }, { piesa: 'stea', marime: 16 }, { piesa: 'stea', marime: 48 }] as Def[]) {
    const st = steaPeHartie(d), p = brad(d), ce = JSON.stringify(d);
    // la trei înălțimi: jos (cuiul e mai îngust: bara e rotundă), la mijloc și sus
    for (const z of [0.3, st.g / 2, st.g - 0.2]) {
      const r = caPeHartie(p, q => inStea(st, q, z), [-st.R - 1, st.yt - CUI - 1, st.R + 1, st.R + 1], z, `${ce}, la z = ${z}`, 2000);
      assert.ok(r.judecate > 1600 && r.lemn > 250, `${ce}: ${JSON.stringify(r)}`);
    }
    inchisa(p, ce, plasa(p.tri).corpuri);
    assert.deepEqual(cote(p).map(r2), [r2(2 * st.R * Math.cos(18 * RAD)), r2(st.R - st.yt + CUI), r2(st.g)], ce);
    // cuiul e o bară: de la vârful lui în sus (spre stea), lung de 6 mm, cu axul la 1,35 mm de pat
    assert.deepEqual(Array.from(p.prinderi, x => [x.fel, dinPlasa(p, x.p), [...x.d], x.lung]), [['bara', [0, r2(st.yt - CUI), r2(st.zb)], [0, 1, 0], CUI]], ce);
  }
  // steaua e groasă cât bara culcată: 3,2 − 0,25
  const q = Lg.bradLegoCote({ piesa: 'stea' });
  assert.deepEqual([q.piesa, q.marime, r2(q.gros)], ['stea', 28, 2.95]);
});

// ---------------------------------------------------------------------------------------------------- brăduțul întreg
test('brăduțul întreg: trunchiul, etajele din două în două știfturi, vârful cu știft gol și steaua; se clădesc unul pe altul', () => {
  const piese = (d: Def) => Array.from(Lg.bradLegoPiese(d), x => ({ ...x }));
  assert.deepEqual(piese({}), [
    { tip: 'rotund', diam: 2, placi: 3, forma: 'cilindru', varf_d: 5.4, stifturi: 'toate' },
    { tip: 'bradLego', piesa: 'etaj', diam: 8, placi: 5, margine: 'zimti' },
    { tip: 'bradLego', piesa: 'etaj', diam: 6, placi: 5, margine: 'zimti' },
    { tip: 'bradLego', piesa: 'etaj', diam: 4, placi: 5, margine: 'zimti' },
    { tip: 'rotund', diam: 2, placi: 6, forma: 'con', varf_d: 5.4, stifturi: 'toate', gaura: 'bara' },
    { tip: 'bradLego', piesa: 'stea', marime: 28 },
  ]);
  // etajele: de la cel de jos, cu câte două știfturi mai puțin, câte încap până la 4
  const etaje = (d: Def) => piese(d).filter(x => x.piesa === 'etaj').map(x => x.diam);
  assert.deepEqual([etaje({ diam: 10, etaje: 4 }), etaje({ diam: 10, etaje: 2 }), etaje({ diam: 6, etaje: 4 }), etaje({ diam: 4, etaje: 3 }), etaje({ etaje: 1 })], [[10, 8, 6, 4], [10, 8], [6, 4], [4], [8]]);
  assert.deepEqual(piese({ diam: 6, etaje: 2, placi: 4, margine: 'neteda', marime: 20 }).filter(x => x.tip === 'bradLego'), [
    { tip: 'bradLego', piesa: 'etaj', diam: 6, placi: 4, margine: 'neteda' }, { tip: 'bradLego', piesa: 'etaj', diam: 4, placi: 4, margine: 'neteda' }, { tip: 'bradLego', piesa: 'stea', marime: 20 },
  ]);
  // fiecare piesă se face fără nicio vorbă și e închisă
  for (const d of piese({})) { const p = L.construieste(d as { tip: string }); assert.deepEqual([...p.avert], [], JSON.stringify(d)); assert.equal(plasa(p.tri).deschise, 0, JSON.stringify(d)); }
  // se clădesc: trunchiul și vârful au câte patru locașuri și știfturi ca etajele (vârful: un știft gol, cu gaura de bară)
  const pr = (d: Def) => Array.from(Lg.prinderi(d), x => x.fel).sort().join(' ');
  const [trunchi, , , , varf] = piese({});
  assert.equal(pr(trunchi!), 'locas locas locas locas stift stift stift stift');
  assert.equal(pr(varf!), 'gauraBara locas locas locas locas stift');
  // cuiul stelei e o bară (3,2 mm) mai scurtă decât gaura de bară a vârfului (3,4 mm)
  const gaura = Array.from(Lg.prinderi(varf!)).find(x => x.fel === 'gauraBara')!;
  assert.ok(CUI < gaura.lung && P.bara_d! < E.baraGauraD!);
});

// ------------------------------------------------------------------------------------------------------------ marginile
test('marginile brăduțului LEGO: ce iese din ele e adus înapoi, cu un mesaj', () => {
  const adus = (d: Def, camp: keyof Cote) => Lg.bradLegoCote(d)[camp];
  assert.deepEqual([adus({ diam: 5 }, 'diam'), adus({ diam: 7 }, 'diam'), adus({ diam: 2 }, 'diam'), adus({ diam: 30 }, 'diam'), adus({ diam: 'x' }, 'diam')], [6, 8, 4, 10, 8]);
  assert.deepEqual([adus({ placi: 1 }, 'placi'), adus({ placi: 20 }, 'placi'), adus({ placi: 4.4 }, 'placi')], [3, 9, 4]);
  assert.deepEqual([adus({ piesa: 'stea', marime: 5 }, 'marime'), adus({ piesa: 'stea', marime: 90 }, 'marime'), adus({ piesa: 'altceva' }, 'piesa'), adus({ margine: 'x' }, 'margine')], [16, 48, 'etaj', 'zimti']);
  const mesaj = (d: Def) => brad(d).avert.join(' | ');
  assert.match(mesaj({ diam: 5 }), /Un etaj are 4, 6, 8 sau 10 știfturi în diametru: l-am făcut de 6\./);
  assert.match(mesaj({ placi: 20 }), /Un etaj are între 3 și 9 plăci: l-am făcut de 9\./);
  assert.match(mesaj({ piesa: 'stea', marime: 90 }), /Steaua de vârf are între 16 și 48 mm: am făcut-o de 48 mm\./);
  // mărimile care nu sunt ale piesei nu se judecă
  assert.deepEqual([...brad({ marime: 90 }).avert], []);
  assert.deepEqual([...brad({ piesa: 'stea', diam: 5, placi: 20 }).avert], []);
  assert.deepEqual([...brad({}).avert], []);
});
