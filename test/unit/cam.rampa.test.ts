/**
 * Rampa pe hârtie (ADR 0029). Din IR se reconstituie Z(s) de-a lungul buclei desfășurate (s în plan, arcele ca r·|θ|),
 * apoi se compară, pe bucăți, cu funcția scrisă direct din contract: intrările e₁ = 0, e_{k+1} = scoate(e_k + Lr), rampa
 * Z = max(zR, zP) pe [e_k; e_k + Lr], tura la zP până la intrarea următoare. Perimetrul se calculează ANALITIC din formă,
 * decalată cu raza sculei. Oracolul independent (`test/oracles/rampa.ts`) face aceleași măsurători pe textul G-code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil } from '../../src/cam/profil.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/contur.ts';
import { baleiajArc, type Miscare } from '../../src/ir/ir.ts';

const R = 3;
const REGIM = { zSigur: 5, avans: 1000, avansPlonjare: 300 };
const perimDrept = (w: number, h: number, r = 0): number => 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * (r + R);
const perimCerc = (r: number): number => 2 * Math.PI * (r + R);

type Bucata = { s0: number; s1: number; z0: number; z1: number; f: number; verticala: boolean };

/** Bucățile de tăiere de după coborârea la fața de sus, cu s desfășurat (în plan) și Z la capete. */
function bucati(miscari: readonly Miscare[]): { bucati: Bucata[]; rapideInTaiere: number; plonjari: Miscare[] } {
  let x = 0, y = 0, z = 5, s = 0, inceput = false, rapideInTaiere = 0;
  const rez: Bucata[] = [];
  const plonjari: Miscare[] = [];
  for (const m of miscari) {
    if (m.tip === 'rapida') {
      if (inceput && m.la.Z !== undefined && m.la.Z > 0 && rez.length > 0) rapideInTaiere++;
      x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
      continue;
    }
    if (m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const x1 = m.la.X ?? x, y1 = m.la.Y ?? y, z1 = m.la.Z ?? z;
    const L = m.tip === 'arc'
      ? Math.hypot(x - m.centru.x, y - m.centru.y) * Math.abs(baleiajArc({ x, y }, { x: x1, y: y1 }, m.centru, m.sens === 'trigonometric'))
      : Math.hypot(x1 - x, y1 - y);
    if (!inceput) {
      // Prima mișcare de tăiere: coborârea până la fața de sus, pe verticală, prin aer.
      assert.ok(L === 0 && z1 === 0, `prima tăiere e coborârea la Z0, nu ${JSON.stringify(m)}`);
      plonjari.push(m);
      inceput = true;
    } else {
      if (L === 0) plonjari.push(m);
      rez.push({ s0: s, s1: s + L, z0: z, z1, f: m.avans, verticala: L === 0 });
      s += L;
    }
    x = x1; y = y1; z = z1;
  }
  return { bucati: rez, rapideInTaiere: rapideInTaiere - 1, plonjari };
}

type Urechi = { numar: number; latime: number; varf: number };

/** Funcția Z(s) din contract, pe toată bucla desfășurată, cu toate trecerile. */
function asteptat(P: number, lungime: number, adancimi: readonly number[], u?: Urechi): { z: (s: number) => number; capat: number; intrari: number[] } {
  const Lr = Math.min(lungime, P / 2);
  const S = u ? P / u.numar : 0, h = u ? u.latime / 2 : 0, l = u ? Math.min(u.latime / 2, 0.45 * (S - u.latime)) : 0;
  const centre = u ? Array.from({ length: u.numar }, (_, k) => (k + 0.5) * S) : [];
  const mod = (s: number): number => s - Math.floor(s / P) * P;
  const zP = (s: number, d: number): number => {
    if (!u || d <= u.varf) return -d;
    const t = mod(s);
    let z = -d;
    for (const c of centre) {
      const dist = Math.abs(t - c);
      if (dist <= h) z = Math.max(z, -u.varf);
      else if (dist < h + l) z = Math.max(z, -d + ((d - u.varf) * (h + l - dist)) / l);
    }
    return z;
  };
  const scoate = (s: number): number => {
    const t = mod(s);
    for (const c of centre) if (t > c - h - l && t < c + h + l) return s + (c + h + l - t);
    return s;
  };
  const intrari = [0];
  for (let k = 1; k < adancimi.length; k++) intrari.push(scoate((intrari[k - 1] as number) + Lr));
  // Trecerea k ține pe [e_k; e_{k+1} + P] (ultima, pe [e_n; e_n + Lr + P]); trecerea următoare pornește din e_{k+1}, același
  // punct. Drumul parcurs T e suma lungimilor trecerilor de dinainte, plus poziția în trecerea curentă.
  const lungimi = adancimi.map((_, k) => (k === adancimi.length - 1 ? Lr + P : (intrari[k + 1] as number) + P - (intrari[k] as number)));
  const capat = lungimi.reduce((x, y) => x + y, 0);
  const z = (T: number): number => {
    let T0 = 0;
    for (let k = 0; k < adancimi.length; k++) {
      const lung = lungimi[k] as number;
      if (T <= T0 + lung + 1e-9) {
        const e = intrari[k] as number, d = adancimi[k] as number, dPrec = k === 0 ? 0 : (adancimi[k - 1] as number);
        const s = e + (T - T0);
        if (s <= e + Lr) return Math.max(-(dPrec + ((d - dPrec) * (s - e)) / Lr), zP(s, d));
        return zP(s, d);
      }
      T0 += lung;
    }
    return Number.NaN;
  };
  return { z, capat, intrari };
}

function verifica(nume: string, contur: Contur, latura: 'exterior' | 'interior', P: number, adancime: number, pas: number, lungime: number, u?: Urechi): number[] {
  const pr = profil(contur, { latura, sens: 'urcare', diametruScula: 2 * R, adancime, pas });
  assert.ok(pr.ok, pr.ok ? '' : pr.motiv);
  if (!pr.ok) return [];
  const tr = traseuProfil(pr.treceri, REGIM, u, { lungime });
  assert.ok(tr.ok, tr.ok ? '' : tr.motiv);
  if (!tr.ok) return [];
  const adancimi = pr.treceri.map((t) => t.adancime);
  const a = asteptat(P, lungime, adancimi, u);
  const { bucati: b, rapideInTaiere, plonjari } = bucati(tr.miscari);
  assert.equal(rapideInTaiere, 0, `${nume}: nicio ridicare între treceri`);
  assert.equal(plonjari.length, 1, `${nume}: o singură mișcare verticală (la fața de sus, prin aer)`);
  assert.ok(b.every((x) => !x.verticala), `${nume}: nicio coborâre verticală în material`);
  const ultima = b[b.length - 1] as Bucata;
  assert.ok(Math.abs(ultima.s1 - a.capat) < 1e-6, `${nume}: drumul are lungimea trecerilor din contract (${ultima.s1} față de ${a.capat})`);
  // Pe fiecare bucată, Z e liniar: capetele și mijlocul, față de funcția din contract.
  for (const x of b) {
    for (const [s, z] of [[x.s0, x.z0], [x.s1, x.z1], [(x.s0 + x.s1) / 2, (x.z0 + x.z1) / 2]] as const) {
      const v = a.z(s);
      assert.ok(Math.abs(z - v) < 1e-6, `${nume}: la s = ${s.toFixed(4)}, Z ${z} față de ${v}`);
    }
    // Viteza pe verticală, cel mult avansul de plonjare; plafonată exact unde coboară.
    const dz = x.z1 - x.z0;
    if (dz < 0) {
      const vert = (x.f * -dz) / Math.hypot(x.s1 - x.s0, dz);
      assert.ok(vert <= REGIM.avansPlonjare + 1e-9, `${nume}: ${vert} mm/min pe verticală`);
    } else assert.equal(x.f, REGIM.avans);
  }
  return a.intrari;
}

test('rampa pe dreptunghiul 300 × 200, 3 treceri, rampa de 10: intrările la 0, 10, 20; Z(s) ca în contract', () => {
  const intrari = verifica('dreptunghi', conturDreptunghi(20, 20, 300, 200), 'exterior', perimDrept(300, 200), 12, 4, 10);
  assert.deepEqual(intrari, [0, 10, 20]);
});

test('rampa pe cercul R100 (elice pe arce) și pe gaura lui (interior)', () => {
  verifica('cerc exterior', conturCerc(200, 200, 100), 'exterior', perimCerc(100), 12, 4, 10);
  verifica('cerc interior', conturCerc(200, 200, 100), 'interior', 2 * Math.PI * (100 - R), 12, 4, 10);
});

test('pe o buclă scurtă, rampa se scurtează la P / 2', () => {
  const P = perimCerc(5); // 50,27 mm
  const intrari = verifica('cerc R5', conturCerc(50, 50, 5), 'exterior', P, 6, 2, 40);
  assert.ok(Math.abs((intrari[1] as number) - P / 2) < 1e-9 && Math.abs((intrari[2] as number) - P) < 1e-9, intrari.join(', '));
});

test('cu urechi: intrarea care ar cădea într-o zonă se mută la capătul ei; rampa care trece peste o ureche ia Z-ul cel mai puțin adânc', () => {
  // Placa 2: 120 × 80 R10, MDF 12, pasul 4, urechi 4 × 8 cu puntea de 2 (vârful la 10).
  const P = perimDrept(120, 80, 10);
  const S = P / 4, h = 4, l = Math.min(4, 0.45 * (S - 8));
  const u = { numar: 4, latime: 8, varf: 10 };
  // Rampa de 25: intrările 0, 25, 50 → 50 e în zona primei urechi [c − h − ℓ; c + h + ℓ], deci se mută la capătul ei.
  const i25 = verifica('placa 2, rampa 25', conturDreptunghi(50, 50, 120, 80, 10), 'exterior', P, 12, 4, 25, u);
  assert.ok(Math.abs((i25[2] as number) - (S / 2 + h + l)) < 1e-9, `intrarea 3 la ${i25[2]}, nu la capătul zonei ${S / 2 + h + l}`);
  // Rampa de 45: a treia trecere (singura care traversează urechile) rampează peste zona celei de-a doua urechi.
  const i45 = verifica('placa 2, rampa 45', conturDreptunghi(50, 50, 120, 80, 10), 'exterior', P, 12, 4, 45, u);
  const c2 = 1.5 * S;
  assert.ok((i45[2] as number) < c2 - h - l && (i45[2] as number) + 45 > c2 - h - l, `rampa a treia [${i45[2]}; +45] trece peste zona de la ${c2 - h - l}`);
});

test('fără rampă, trecerile rămân cum erau: plonjare în vârful 0 și ridicare între treceri', () => {
  const pr = profil(conturDreptunghi(20, 20, 100, 60), { latura: 'exterior', sens: 'urcare', diametruScula: 6, adancime: 8, pas: 4 });
  assert.ok(pr.ok);
  if (!pr.ok) return;
  const tr = traseuProfil(pr.treceri, REGIM);
  assert.ok(tr.ok);
  if (!tr.ok) return;
  const plonjari = tr.miscari.filter((m) => m.tip === 'taiere' && m.la.X === undefined && m.la.Y === undefined);
  assert.deepEqual(plonjari.map((m) => (m.tip === 'taiere' ? m.la.Z : null)), [-4, -8]);
  assert.equal(tr.miscari.filter((m) => m.tip === 'rapida' && m.la.Z === 5).length, 4);
});
