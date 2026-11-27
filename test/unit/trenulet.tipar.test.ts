/**
 * Tipărirea elicelor din atelierul Easy 3Draw, spusă cinstit (ADR 0340, felia 3.Cm-2; auditul elicelor, constatarea 1):
 * - consola de la vârf (0,2 / tan β, a corzii, deci în medie pe secțiune), pe hârtie;
 * - treapta cea mai mare dintre două straturi de 0,2 mm (tăiate la mijloc, la 0,1 + 0,2k), măsurată aici pe plasă, pe
 *   secțiunile paletei din afara butucului: e cea spusă de motor; pe paleta curbată, mai mare decât consola de la vârf
 *   (spre muchia de sus), iar la un vârf jos, de un strat, mai mică (nu iese peste nimic);
 * - verdictul, pe praguri: treapta de cel mult 0,5 mm, fără suport; peste 1 mm și treapta, și consola de la vârf, cu suport
 *   sub vârfuri; altfel, fără suport, dar aspru pe alocuri; înclinată spre pupa, cu suport sub palete;
 * - primul strat (felia plasei la 0,1 mm), măsurat aici pe plasă: aria lui și cât din discul paletelor acoperă; sub 10 %,
 *   margine de aderență (brim);
 * - carcasa ventilatorului (un tub în picioare) nu primește verdictul paletelor; nici o altă piesă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Tipar = { consola: number; treapta: number; fel: 'bine' | 'aspru' | 'suport'; ridicata: boolean; aria: number; parte: number; brim: boolean };
type Piesa = { tri: Tri[]; baza: number[]; tipar?: Tipar };
type Lego = {
  construieste(d: Record<string, unknown>): Piesa;
  eliceCote(d: Record<string, unknown>): { consola: number; R: number };
  eliceBarcaCote(d: Record<string, unknown>): { consola: number; R: number; rh: number };
  ventilatorCote(d: Record<string, unknown>): { consola: number; Rt: number; rh: number };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const tipar = (d: Record<string, unknown>): Tipar => {
  const t = L.construieste(d).tipar;
  assert.ok(t, `${JSON.stringify(d)}: fără verdictul tipăririi`);
  return t;
};

/** Plasa mutată cu butucul în origine (motorul o mută cu −baza, colțul cutiei). */
function centrata(p: Piesa): Tri[] {
  const [cx, cy] = [-p.baza[0]!, -p.baza[1]!];
  return p.tri.map((t) => t.map(([x, y, z]): P3 => [x - cx, y - cy, z]) as Tri);
}

/**
 * Treapta cea mai mare dintre două straturi, pe plasă: muchiile cu ambele capete la aceeași rază (> rh) și pe paleta 0 sunt
 * conturul secțiunii de la acea rază (la vârf, și diagonalele capacului, care nu schimbă marginile); pe fiecare plan
 * h = 0,1 + 0,2k, marginile secțiunii (s = r · θ); treapta, cât iese stratul de deasupra peste cel de dedesubt, la oricare
 * margine.
 */
function treaptaPePlasa(tri: readonly Tri[], rh: number, palete: number): number {
  const statii = new Map<number, { r: number; e: [[number, number], [number, number]][] }>();
  for (const t of tri) for (let i = 0; i < 3; i++) {
    const a = t[i]!, b = t[(i + 1) % 3]!;
    const ra = Math.hypot(a[0], a[1]), rb = Math.hypot(b[0], b[1]), ta = Math.atan2(a[1], a[0]), tb = Math.atan2(b[1], b[0]);
    if (Math.abs(ra - rb) > 1e-7 || ra <= rh + 1e-6 || Math.abs(ta) > Math.PI / palete || Math.abs(tb) > Math.PI / palete) continue;
    const k = Math.round(ra * 1e5);
    if (!statii.has(k)) statii.set(k, { r: ra, e: [] });
    statii.get(k)!.e.push([[ra * ta, a[2]], [ra * tb, b[2]]]);
  }
  assert.ok(statii.size > 10, `prea puține secțiuni pe plasă: ${statii.size}`);
  let max = 0;
  for (const { e } of statii.values()) {
    const hmax = Math.max(...e.flat().map((q) => q[1]));
    let inainte: { lo: number; hi: number } | null = null;
    for (let k = 0; 0.1 + 0.2 * k < hmax; k++) {
      const h = 0.1 + 0.2 * k, xs: number[] = [];
      for (const [a, b] of e) if ((a[1] - h) * (b[1] - h) < 0) xs.push(a[0] + (h - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      if (xs.length < 2) { inainte = null; continue; }
      const lo = Math.min(...xs), hi = Math.max(...xs);
      if (inainte) max = Math.max(max, hi - inainte.hi, inainte.lo - lo);
      inainte = { lo, hi };
    }
  }
  return max;
}

/** Aria secțiunii plasei închise la planul z = h: ½ Σ p × q pe segmentele tăiate, orientate după normala triunghiului. */
function ariaPePlasa(tri: readonly Tri[], h: number): number {
  let a = 0;
  for (const t of tri) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const p = t[i]!, q = t[(i + 1) % 3]!;
      if ((p[2] - h) * (q[2] - h) < 0) { const u = (h - p[2]) / (q[2] - p[2]); pts.push([p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])]); }
    }
    if (pts.length !== 2) continue;
    const e1 = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]], e2 = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!, ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!;
    let [p, q] = pts as [[number, number], [number, number]];
    if ((q[0] - p[0]) * -ny + (q[1] - p[1]) * nx < 0) [p, q] = [q, p];
    a += 0.5 * (p[0] * q[1] - p[1] * q[0]);
  }
  return a;
}

test('consola de la vârf, pe hârtie (0,2 · 2πR / P la paleta răsucită), e cea din cote', () => {
  const cazuri: [Record<string, unknown>, number][] = [
    [{ tip: 'elice' }, 0.2 * 2 * Math.PI * 36 / 50.4],
    [{ tip: 'elice', pas: 0.3 }, 0.2 * 2 * Math.PI * 36 / 21.6],
    [{ tip: 'elice', pas: 1.5 }, 0.2 * 2 * Math.PI * 36 / 108],
    // paleta plată: β e cel de la 70 % din rază, deci consola e 0,2 · 2π · 0,7R / P
    [{ tip: 'elice', paleta: 'plata' }, 0.2 * 2 * Math.PI * 0.7 * 36 / 50.4],
    // elicea de barcă Ø40, pasul 1: 0,2 · 2π · 20 / 40
    [{ tip: 'eliceBarca' }, 0.2 * 2 * Math.PI * 20 / 40],
    [{ tip: 'eliceBarca', diametru: 20, pas: 0.5 }, 0.2 * 2 * Math.PI * 10 / 10],
    // rotorul Ø40, jocul 0,8: vârful la 19,2, pasul 0,8 · 40 = 32
    [{ tip: 'ventilator' }, 0.2 * 2 * Math.PI * 19.2 / 32],
    [{ tip: 'ventilator', pas: 0.3 }, 0.2 * 2 * Math.PI * 19.2 / 12],
  ];
  for (const [d, consola] of cazuri) {
    const t = tipar(d);
    assert.ok(Math.abs(t.consola - consola) < 1e-9, `${JSON.stringify(d)}: consola ${t.consola}, pe hârtie ${consola}`);
    assert.equal(t.ridicata, false);
  }
  assert.equal(tipar({ tip: 'elice', pas: 0.9 }).consola, L.eliceCote({ pas: 0.9 }).consola);
  assert.equal(tipar({ tip: 'eliceBarca', pas: 0.9 }).consola, L.eliceBarcaCote({ pas: 0.9 }).consola);
  assert.equal(tipar({ tip: 'ventilator', pas: 0.9 }).consola, L.ventilatorCote({ pas: 0.9 }).consola);
});

test('verdictul, pe praguri: treapta de cel mult 0,5 mm, fără suport; peste 1 mm, și treapta, și consola, cu suport; altfel, aspru', () => {
  // regula, pe fiecare piesă din plaja de mai jos, cu treapta și consola ei
  const regula = (t: Tipar) => (t.consola > 1 && t.treapta > 1 ? 'suport' : t.treapta > 0.5 ? 'aspru' : 'bine');
  for (const tip of ['elice', 'eliceBarca', 'ventilator']) for (const pas of [0.3, 0.8, 1.5, 1.6]) for (const diametru of [20, 40, 72])
    for (const profil of ['placa', 'aripa']) {
      const d = { tip, pas, diametru, profil }, t = tipar(d);
      assert.equal(t.fel, regula(t), `${JSON.stringify(d)}: treapta ${t.treapta}, consola ${t.consola}`);
    }
  // cele patru feluri, fiecare cu piesa lui
  const cazuri: [Record<string, unknown>, Tipar['fel'], string][] = [
    // treapta sub 0,5 (0,49): fără suport
    [{ tip: 'eliceBarca', pas: 1.6 }, 'bine', 'treapta 0,49'],
    // treapta peste 0,5 (0,525), consola sub 1: aspru
    [{ tip: 'eliceBarca', pas: 1.5 }, 'aspru', 'treapta 0,53'],
    // treapta peste 1 doar spre muchia de sus (1,53), consola de la vârf 0,90: aspru, nu suport
    [{ tip: 'elice' }, 'aspru', 'treapta 1,53, consola 0,90'],
    // consola de la vârf peste 1 (1,26), dar vârful jos nu iese peste nimic: treapta 0,66, aspru
    [{ tip: 'eliceBarca', diametru: 20, pas: 0.5, latime: 40, inclinare: 0 }, 'aspru', 'treapta 0,66, consola 1,26'],
    // amândouă peste 1: cu suport; pragul cade pe consola de la vârf între pasul 0,65 (0,2 · 2π · 36 / 46,8 = 0,967, aspru)
    // și 0,6 (0,2 · 2π · 36 / 43,2 = 1,047, suport), cu treapta peste 1,6 la amândouă
    [{ tip: 'elice', pas: 0.65 }, 'aspru', 'treapta 1,63, consola 0,97'],
    [{ tip: 'elice', pas: 0.6 }, 'suport', 'treapta 2,03, consola 1,05'],
    [{ tip: 'elice', pas: 0.3 }, 'suport', 'treapta 4,7, consola 2,09'],
    [{ tip: 'ventilator', pas: 0.3 }, 'suport', 'treapta 3,0, consola 2,01'],
  ];
  for (const [d, fel, de] of cazuri) assert.equal(tipar(d).fel, fel, `${JSON.stringify(d)} (${de})`);
  // pragurile cad între valorile pieselor de mai sus
  assert.ok(tipar({ tip: 'eliceBarca', pas: 1.6 }).treapta <= 0.5 && tipar({ tip: 'eliceBarca', pas: 1.5 }).treapta > 0.5);
  assert.ok(Math.abs(tipar({ tip: 'elice', pas: 0.6 }).consola - 0.2 * 2 * Math.PI * 36 / 43.2) < 1e-9);
  assert.ok(tipar({ tip: 'elice', pas: 0.65 }).treapta > 1 && tipar({ tip: 'elice', pas: 0.6 }).treapta > 1);
  const jos = tipar({ tip: 'eliceBarca', diametru: 20, pas: 0.5, latime: 40, inclinare: 0 });
  assert.ok(jos.consola > 1 && jos.treapta < 1, `consola ${jos.consola}, treapta ${jos.treapta}`);
});

test('înclinată spre pupa, elicea de barcă cere suport sub palete, oricât ar fi consola', () => {
  for (const pupa of [1, 10, 15]) {
    const t = tipar({ tip: 'eliceBarca', pupa, pas: 1.6 });
    assert.equal(t.ridicata, true);
    assert.equal(t.fel, 'suport', `pupa ${pupa}`);
  }
});

test('treapta cea mai mare dintre straturi e cea măsurată pe plasă; pe paleta curbată, mai mare decât consola de la vârf', () => {
  const cazuri: Record<string, unknown>[] = [
    { tip: 'elice' }, { tip: 'elice', profil: 'aripa' }, { tip: 'elice', pas: 0.3 }, { tip: 'elice', pas: 1.5 },
    { tip: 'elice', paleta: 'plata', sens: 'stanga' }, { tip: 'elice', palete: 2, diametru: 200, pas: 1.5, latime: 60 },
    { tip: 'elice', palete: 3, diametru: 27.4, pas: 0.93, latime: 60, forma: 'drept', paleta: 'plata', sens: 'stanga' },
    { tip: 'eliceBarca' }, { tip: 'eliceBarca', pas: 0.5, sens: 'stanga' }, { tip: 'eliceBarca', diametru: 120 }, { tip: 'eliceBarca', pupa: 10 },
    { tip: 'ventilator' }, { tip: 'ventilator', pas: 0.3 }, { tip: 'ventilator', inel: 'da', palete: 12 },
  ];
  for (const d of cazuri) {
    const p = L.construieste(d), t = p.tipar!;
    const z = (d.palete as number | undefined) ?? (d.tip === 'ventilator' ? 7 : 3);
    const rh = d.tip === 'elice' ? 4 : d.tip === 'eliceBarca' ? L.eliceBarcaCote(d).rh : L.ventilatorCote(d).rh;
    const m = treaptaPePlasa(centrata(p), rh, z);
    assert.ok(Math.abs(t.treapta - m) < 1e-6, `${JSON.stringify(d)}: treapta ${t.treapta}, pe plasă ${m}`);
    if (!t.ridicata) assert.ok(t.treapta > t.consola, `${JSON.stringify(d)}: treapta ${t.treapta} ≤ consola ${t.consola}`);
  }
  // elicea implicită: 0,90 la vârf, dar spre muchia de sus a paletei, pe alocuri, peste 1,4 mm (auditul o socotise doar pe cea
  // de la vârf)
  const t = tipar({ tip: 'elice' });
  assert.ok(t.treapta > 1.4 && t.treapta < 1.7, `treapta elicei implicite: ${t.treapta}`);
});

test('primul strat: aria (felia plasei la 0,1 mm) și cât din discul paletelor acoperă; sub 10 %, margine (brim)', () => {
  const cazuri: [Record<string, unknown>, number, boolean][] = [
    [{ tip: 'elice' }, 36, true],
    [{ tip: 'elice', diametru: 20 }, 10, false],
    [{ tip: 'elice', palete: 2, diametru: 200, pas: 1.5, latime: 60 }, 100, true],
    [{ tip: 'elice', palete: 3, diametru: 27.4, pas: 0.93, latime: 60, forma: 'drept', paleta: 'plata', sens: 'stanga' }, 13.7, true],
    [{ tip: 'eliceBarca' }, 20, true],
    [{ tip: 'eliceBarca', diametru: 20 }, 10, false],
    [{ tip: 'eliceBarca', pupa: 10 }, 20, true],
    [{ tip: 'ventilator' }, 19.2, true],
    [{ tip: 'ventilator', diametru: 24 }, 11.2, false],
  ];
  for (const [d, R, brim] of cazuri) {
    const p = L.construieste(d), t = p.tipar!, a = ariaPePlasa(centrata(p), 0.1);
    assert.ok(Math.abs(t.aria - a) < 1e-6, `${JSON.stringify(d)}: aria ${t.aria}, pe plasă ${a}`);
    assert.ok(Math.abs(t.parte - a / (Math.PI * R * R)) < 1e-9, `${JSON.stringify(d)}: partea ${t.parte}, pe hârtie ${a / (Math.PI * R * R)}`);
    assert.equal(t.brim, t.parte < 0.1);
    assert.equal(t.brim, brim, `${JSON.stringify(d)}: ${(100 * t.parte).toFixed(1)} % din disc`);
  }
  // fără gaură, butucul întreg stă pe masă: aria e cel puțin discul lui (pe hârtie, π · 4²), plus fâșiile paletelor
  const plin = tipar({ tip: 'elice', gaura: 'nu' });
  assert.ok(plin.aria > Math.PI * 16, `aria ${plin.aria}`);
  // cu inelul (pe masă, cât tot conturul), rotorul acoperă mai mult din disc decât fără el
  assert.ok(tipar({ tip: 'ventilator', inel: 'da' }).parte > tipar({ tip: 'ventilator' }).parte + 0.05);
});

test('carcasa ventilatorului și celelalte piese n-au verdictul paletelor', () => {
  assert.equal(L.construieste({ tip: 'ventilator', piesa: 'carcasa' }).tipar, undefined);
  for (const tip of ['rotita', 'roataPalete', 'cama', 'grinda', 'fulg']) assert.equal(L.construieste({ tip }).tipar, undefined, tip);
});
