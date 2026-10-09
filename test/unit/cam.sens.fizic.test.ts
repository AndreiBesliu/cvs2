/**
 * Sensul de tăiere ancorat în cinematica așchiei, nu într-un tabel (ADR 0027, precizarea din recenzie). Prima versiune
 * a contractului avea regula întoarsă, iar testele care copiau tabelul treceau oricum. Aici:
 * 1. Modelul așchiei, pe hârtie: scula de rază R merge spre +X cu f pe rotație și scoate o bandă de lățime ae lângă un
 *    perete. Pe jumătatea din față, grosimea așchiei la unghiul θ (măsurat trigonometric de la +X) e h(θ) = f·cos θ. Cu
 *    axul M3 (orar văzut de sus), θ scade: dintele intră în bandă la unghiul ei mai mare și iese la cel mai mic. Urcare =
 *    intră gros și iese subțire; opoziție = invers.
 * 2. Pe traseele profilului: materialul păstrat (ADR 0026, partea proprie) e de partea pe care o cere modelul pentru
 *    sensul operației, pe fiecare buclă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil } from '../../src/cam/profil.ts';
import { cerculArcului, conturCerc, conturDreptunghi, numarSegmente, segment, type Contur, type Punct } from '../../src/geom/contur.ts';
import { inRegiune } from '../../src/geom/distanta.ts';

/** Cu M3: modul de frezare când peretele păstrat e în stânga sau în dreapta sensului de mers. */
function mod(perete: 'stanga' | 'dreapta', R = 3, ae = 0.6, f = 0.2): 'urcare' | 'opozitie' {
  const t0 = Math.asin(1 - ae / R);
  // Banda, pe jumătatea din față (cos θ > 0): lângă peretele din stânga (y = +R), θ ∈ [t0, π/2]; din dreapta, [−π/2, −t0].
  const [mare, mic] = perete === 'stanga' ? [Math.PI / 2, t0] : [-t0, -Math.PI / 2];
  // Unghiul scade: dintele intră la `mare` și iese la `mic`.
  const hIntrare = f * Math.cos(mare);
  const hIesire = f * Math.cos(mic);
  return hIntrare > hIesire ? 'urcare' : 'opozitie';
}

test('modelul așchiei, pe hârtie: cu M3, peretele din stânga dă opoziție (intră pe perete, cu așchia 0), cel din dreapta urcare', () => {
  // Stânga: intrarea la 90°, h = f·cos 90° = 0; ieșirea la asin(0,8) ≈ 53,1°, h = 0,2·0,6 = 0,12. Subțire → gros.
  assert.equal(mod('stanga'), 'opozitie');
  // Dreapta: intrarea la −53,1°, h = 0,12; ieșirea la −90°, h = 0, chiar pe peretele păstrat. Gros → subțire.
  assert.equal(mod('dreapta'), 'urcare');
  // La orice lățime a benzii și orice avans, același rezultat.
  for (const ae of [0.1, 1, 2.9]) for (const f of [0.01, 0.5]) {
    assert.equal(mod('stanga', 3, ae, f), 'opozitie');
    assert.equal(mod('dreapta', 3, ae, f), 'urcare');
  }
});

/** Partea pe care stă un punct față de segmentul i al buclei: 'stanga' sau 'dreapta' sensului de mers, la mijlocul lui. */
function puncteLaterale(b: Contur, i: number, d: number): { stanga: Punct; dreapta: Punct } {
  const { a, b: c, s } = segment(b, i);
  let m: Punct;
  let dir: Punct;
  if (s.tip === 'A') {
    const k = cerculArcului(a, c, s.bulge);
    const u = k.start + k.baleiaj / 2;
    m = { x: k.centru.x + k.raza * Math.cos(u), y: k.centru.y + k.raza * Math.sin(u) };
    // Tangenta în sensul de parcurgere: perpendiculara pe rază, întoarsă după semnul baleiajului.
    const sg = Math.sign(k.baleiaj);
    dir = { x: -Math.sin(u) * sg, y: Math.cos(u) * sg };
  } else {
    m = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
    const l = Math.hypot(c.x - a.x, c.y - a.y);
    dir = { x: (c.x - a.x) / l, y: (c.y - a.y) / l };
  }
  // Stânga = dir rotit cu +90°; dreapta = cu −90°.
  return { stanga: { x: m.x - dir.y * d, y: m.y + dir.x * d }, dreapta: { x: m.x + dir.y * d, y: m.y - dir.x * d } };
}

test('pe traseele profilului, materialul păstrat e exact de partea pe care o cere modelul pentru sensul operației', () => {
  const R = 3;
  const forme: ReadonlyArray<readonly [string, Contur]> = [
    ['dreptunghi', conturDreptunghi(20, 20, 100, 60)], ['dreptunghi rotunjit', conturDreptunghi(20, 20, 100, 60, 8)], ['cerc', conturCerc(70, 50, 15)],
  ];
  for (const [nume, c] of forme) {
    for (const latura of ['exterior', 'interior'] as const) {
      for (const sens of ['urcare', 'opozitie'] as const) {
        const r = profil(c, { latura, sens, diametruScula: 2 * R, adancime: 3, pas: 3 });
        assert.ok(r.ok, r.ok ? '' : r.motiv);
        if (!r.ok) continue;
        for (const bucla of r.treceri[0]?.contururi ?? []) {
          for (let i = 0; i < numarSegmente(bucla); i++) {
            // La R/2 de traseu, spre conturul tăiat: un punct e în materialul păstrat, celălalt în tăietură.
            const { stanga, dreapta } = puncteLaterale(bucla, i, R / 2);
            const pastrat = (p: Punct): boolean => (latura === 'exterior' ? inRegiune(p, [c]) : !inRegiune(p, [c]));
            // Pe partea dinspre contur, la R/2 de traseu, punctul e încă în tăietură; mai departe, la 2R, e în material.
            const departe = puncteLaterale(bucla, i, 2 * R);
            const perete = pastrat(departe.stanga) ? 'stanga' : pastrat(departe.dreapta) ? 'dreapta' : null;
            assert.ok(perete, `${nume} ${latura} ${sens}, segmentul ${i}: niciun perete păstrat lângă traseu`);
            assert.ok(!pastrat(stanga) && !pastrat(dreapta), `${nume} ${latura}: scula nu stă în material`);
            assert.equal(mod(perete ?? 'stanga'), sens, `${nume} ${latura} ${sens}, segmentul ${i}: peretele e în ${perete}`);
          }
        }
      }
    }
  }
});
