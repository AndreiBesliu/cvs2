/**
 * Ventilatorul ca trusă (ADR 0340, felia 3.Cm-3; auditul elicelor, constatarea 3), pe hârtie și pe plase:
 * - grinda de sub carcasă are 2k + 1 găuri (pasul de 8): cele de la capete cad pe găurile a două urechi opuse ale carcasei
 *   (la k · 8 mm de ax), cea din mijloc pe ax;
 * - pe grindă, o jumătate de bucșă (3,8 mm), apoi rotorul: paletele stau toate în tub (de la 3,8 la 3,8 + înălțimea lor, sub
 *   marginea de sus a carcasei), iar rotorul nu se freacă de grindă;
 * - axul, cât cel mai scurt care trece prin grindă, prin bucșă și prin butucul rotorului (în pași de 8 mm).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Prindere = { fel: string; p: P3; d: P3; lung: number };
type Piesa = { tri: Tri[]; dim: number[]; baza: number[]; ax: number[] | null; prinderi: Prindere[] };
type Trusa = { gauri: number; ax: number; bucsa: number; jos: number; sus: number };
type Lego = {
  construieste(d: Record<string, unknown>): Piesa;
  ventilatorCote(d: Record<string, unknown>): { k: number; Hh: number; Hc: number; rh: number };
  ventilatorTrusa(d: Record<string, unknown>): Trusa;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const GRINDA = 7.8, BUCSA = 0.5 * 8 - 0.2;

const CAZURI: Record<string, unknown>[] = [
  {}, { diametru: 24 }, { diametru: 48 }, { diametru: 120 }, { diametru: 120, palete: 12, pas: 1.5, latime: 60 },
  { diametru: 24, pas: 0.3, joc: 0.3 }, { diametru: 56.3, joc: 1.5, pas: 1.2 }, { inel: 'da' }, { urechi: 4 }, { diametru: 64, pas: 1.5 },
];

test('grinda: 2k + 1 găuri; cele de la capete, pe găurile urechilor opuse; cea din mijloc, pe ax (pe hârtie: Ø40 → 7, Ø48 → 9)', () => {
  assert.equal(L.ventilatorTrusa({}).gauri, 7);
  assert.equal(L.ventilatorTrusa({ diametru: 48 }).gauri, 9);
  for (const d of CAZURI) {
    const t = L.ventilatorTrusa(d), q = L.ventilatorCote(d), c = L.construieste({ tip: 'ventilator', piesa: 'carcasa', ...d });
    assert.equal(t.gauri, 2 * q.k + 1, JSON.stringify(d));
    // găurile urechilor carcasei, față de axul ei: la (gauri − 1) / 2 pași, adică la capetele grinzii centrate pe ax
    const urechi = c.prinderi.filter((p) => p.fel === 'gauraStift');
    assert.ok(urechi.length >= 2, JSON.stringify(d));
    const raze = urechi.map((p) => Math.hypot(p.p[0] - c.ax![0]!, p.p[1] - c.ax![1]!));
    for (const r of raze) assert.ok(Math.abs(r - (t.gauri - 1) / 2 * 8) < 1e-6, `${JSON.stringify(d)}: o gaură la ${r} de ax`);
    // două dintre ele, opuse (o grindă dreaptă le prinde pe amândouă)
    const opuse = urechi.some((a) => urechi.some((b) => Math.hypot(a.p[0] + b.p[0] - 2 * c.ax![0]!, a.p[1] + b.p[1] - 2 * c.ax![1]!) < 1e-6 && a !== b));
    assert.ok(opuse, JSON.stringify(d));
  }
});

test('rotorul, pe o jumătate de bucșă pe grindă: paletele stau toate în tub, iar rotorul nu atinge grinda', () => {
  for (const d of CAZURI) {
    const t = L.ventilatorTrusa(d), q = L.ventilatorCote(d), r = L.construieste({ tip: 'ventilator', piesa: 'rotor', ...d });
    assert.ok(Math.abs(t.bucsa - BUCSA) < 1e-9);
    // rotorul începe deasupra bucșei: între el și grindă, cât bucșa
    assert.ok(Math.abs(t.jos - BUCSA) < 1e-9, JSON.stringify(d));
    // vârful paletelor (pe plasă: punctele din afara butucului), sub marginea de sus a carcasei
    const [cx, cy] = [r.ax![0]!, r.ax![1]!];
    const palete = r.tri.flat().filter(([x, y]) => Math.hypot(x - cx, y - cy) > q.rh + 0.5);
    const varf = Math.max(...palete.map((p) => p[2]));
    assert.ok(t.jos + varf <= q.Hc + 1e-9, `${JSON.stringify(d)}: paletele până la ${t.jos + varf}, carcasa de ${q.Hc}`);
    // butucul, până unde ajunge rotorul
    assert.ok(Math.abs(t.sus - (t.jos + q.Hh)) < 1e-9, JSON.stringify(d));
  }
});

test('axul: cel mai scurt care trece prin grindă, prin bucșă și prin butucul rotorului', () => {
  for (const d of CAZURI) {
    const t = L.ventilatorTrusa(d), q = L.ventilatorCote(d), cat = GRINDA + BUCSA + q.Hh;
    assert.ok(t.ax * 8 >= cat - 1e-9, `${JSON.stringify(d)}: axul de ${t.ax} (${t.ax * 8} mm), trebuie ${cat}`);
    assert.ok((t.ax - 1) * 8 < cat, `${JSON.stringify(d)}: axul de ${t.ax} e prea lung pentru ${cat}`);
  }
  // pe hârtie: Ø40, butucul de 8: 7,8 + 3,8 + 8 = 19,6 → axul de 3
  assert.equal(L.ventilatorTrusa({}).ax, 3);
});
