import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traseazaCulori, type OptiuniCulori, type PiesaCuloare } from '../../src/trasare/culori.ts';
import { traseazaCuloriMediane, type OptiuniMedianeCulori, type PiesaMediana, type RezultatCuloriMediane } from '../../src/trasare/medianeCulori.ts';
import type { CaiTrasate, ImagineRGBA } from '../../src/trasare/trasare.ts';
import { HARTIE_COLOR, LINII_COLORATE, desenLiniiColorate } from './ajutor-poze.ts';

/**
 * Rezultatul pe fiecare culoare (ADR 0228, felia 25.3↑e): pe desenul probelor din 25.3↑c (o linie roșie tăiată de una
 * albastră și de un cerc verde, un pătrat galben plin cu marginea neagră), fiecare culoare bifată pe contururi sau pe linii
 * mediane, după `peLinii`: reducerea culorilor o singură dată, contururile doar pentru culorile pe contururi, liniile doar
 * pentru celelalte; pragul părților late din culorile pe linii; legarea și peste culorile pe contururi; culorile legate, cu
 * felul primei. Așteptările, din prototip (`.tmp/proto-0228.ts`, în ADR) și din trasările întregi de azi.
 */

const OC: OptiuniCulori = { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: 25, gauriPx: 0 };
const OM: OptiuniMedianeCulori = { capete: 'centru', late: 'mediane', pragLatPx: null, semnaleaza: false, bucle: 'linie', leaga: true };
type Nume = keyof typeof LINII_COLORATE;
type Ok = Extract<RezultatCuloriMediane, { ok: true }>;
const NUME: readonly Nume[] = ['rosu', 'albastru', 'verde', 'negru', 'galben'];

const IMG = desenLiniiColorate();
/** Paleta desenului (aceeași la fiecare trasare: reducerea nu depinde de bife și de feluri). */
const PALETA = (() => {
  const r = traseazaCulori(IMG, { ...OC, doarEtichete: true });
  assert.ok(r.ok);
  return r.raport.paleta;
})();
/** Indicele culorii cu numele dat: cea mai apropiată din paletă. */
function idx(nume: Nume, paleta = PALETA): number {
  const t = LINII_COLORATE[nume];
  let bun = -1, d = Infinity;
  for (const [k, c] of paleta.entries()) {
    const v = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16));
    const e = (t[0] - (v[0] ?? 0)) ** 2 + (t[1] - (v[1] ?? 0)) ** 2 + (t[2] - (v[2] ?? 0)) ** 2;
    if (e < d) { d = e; bun = k; }
  }
  assert.ok(bun >= 0 && d < 400, `${nume}: nicio culoare apropiată`);
  return bun;
}
/** `peLinii` cu culorile date pe linii mediane, celelalte pe contururi. */
const peLinii = (nume: readonly Nume[], paleta = PALETA): boolean[] => paleta.map((_, k) => nume.some((n) => idx(n, paleta) === k));
function amestec(linii: readonly Nume[], om: Partial<OptiuniMedianeCulori> = {}, oc: Partial<OptiuniCulori> = {}, img = IMG): Ok {
  const r = traseazaCuloriMediane(img, { ...OC, ...oc, peLinii: peLinii(linii) }, { ...OM, ...om });
  assert.ok(r.ok);
  return r;
}
const piesaDe = (piese: ReadonlyArray<PiesaCuloare>, nume: Nume): PiesaCuloare | undefined => piese.find((p) => p.culoare === idx(nume));
const eLinie = (p: PiesaCuloare | undefined): p is PiesaMediana => p !== undefined && 'grosime' in p;
/** Ce căi are o piesă: contururile (fără `deschisa`, ca la ADR 0221) sau, pe linii, cele deschise și buclele. */
function fel(c: CaiTrasate): { contururi: number } | { deschise: number; bucle: number } {
  const n = c.inceput.length - 1;
  if (!c.deschisa) return { contururi: n };
  let deschise = 0;
  for (let k = 0; k < n; k++) if (c.deschisa[k] === 1) deschise++;
  return { deschise, bucle: n - deschise };
}

test('galbenul și negrul pe contururi, roșul, albastrul și verdele pe linii mediane: exact desenul, câte o piesă pe culoare', () => {
  const r = amestec(['rosu', 'albastru', 'verde']);
  assert.equal(r.piese.length, 5);
  // Piesele, în ordinea paletei (ca pe contururi și ca pe linii).
  assert.deepEqual(r.piese.map((p) => p.culoare), [...r.piese.map((p) => p.culoare)].sort((a, b) => a - b));
  const galben = piesaDe(r.piese, 'galben'), negru = piesaDe(r.piese, 'negru');
  const rosu = piesaDe(r.piese, 'rosu'), albastru = piesaDe(r.piese, 'albastru'), verde = piesaDe(r.piese, 'verde');
  // Pătratul galben, un contur exterior; marginea neagră, un inel: conturul de afară și cel dinăuntru.
  assert.ok(galben && !eLinie(galben) && negru && !eLinie(negru));
  assert.deepEqual(fel(galben.cai), { contururi: 1 });
  assert.deepEqual([...galben.cai.exterior], [1]);
  assert.deepEqual(fel(negru.cai), { contururi: 2 });
  assert.deepEqual([...negru.cai.exterior].sort(), [0, 1]);
  // Roșul, o singură linie, legată de trei ori; albastrul, o linie; verdele, o buclă.
  assert.ok(eLinie(rosu) && eLinie(albastru) && eLinie(verde));
  assert.deepEqual(fel(rosu.cai), { deschise: 1, bucle: 0 });
  assert.equal(rosu.legaturi, 3);
  assert.deepEqual(fel(albastru.cai), { deschise: 1, bucle: 0 });
  assert.deepEqual(fel(verde.cai), { deschise: 0, bucle: 1 });
  // Raportul liniilor: doar al culorilor pe linii (galbenul nu mai e punct); numărătorile, ale tuturor pieselor.
  assert.equal(r.raport.mediane.puncte, 0);
  assert.equal(r.raport.mediane.legaturi, 3);
  assert.equal(r.raport.contururi, 6);
  assert.equal(r.raport.varfuri, r.piese.reduce((s, p) => s + p.cai.tip.length, 0));
  // Bifele rămân ale culorilor: galbenul e tot „se trasează”.
  assert.equal(r.raport.paleta[idx('galben')]?.bifata, true);
});

test('fiecare culoare pe fiecare fel: piesele amestecului sunt exact ale trasării întregi pe contururi, ori pe linii mediane', () => {
  const toate = traseazaCulori(IMG, OC), linii = traseazaCuloriMediane(IMG, OC, OM);
  assert.ok(toate.ok && linii.ok);
  for (const pe of [['rosu', 'albastru', 'verde'], ['galben', 'negru'], ['rosu'], ['albastru', 'negru', 'galben']] as const) {
    const r = amestec(pe);
    for (const nume of NUME) {
      const p = piesaDe(r.piese, nume);
      const asteptat: PiesaCuloare | undefined = (pe as readonly Nume[]).includes(nume) ? piesaDe(linii.piese, nume) : piesaDe(toate.piese, nume);
      // Galbenul pe linii e un punct (25.3↑d): fără piesă, ca pe linii.
      assert.deepEqual(p, asteptat, `${nume}, cu ${pe.join(', ')} pe linii`);
    }
  }
  // Toate pe linii, ori toate pe contururi, prin `peLinii`: rezultatele de azi.
  assert.deepEqual(amestec(NUME).piese, linii.piese);
  assert.deepEqual(amestec([]).piese, toate.piese);
});

/**
 * 400 × 300, fără netezire: o linie roșie de 4 px (y 48–51, x 50–349) și trei bare albastre de 24 px (x 68, 188, 308, y
 * 90–289): pe linii, barele (mai lungi, împreună) dau grosimea desenului întreg.
 */
function desenBare(): ImagineRGBA {
  const W = 400, H = 300, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c: readonly number[] = HARTIE_COLOR;
      if (y >= 48 && y < 52 && x >= 50 && x < 350) c = LINII_COLORATE.rosu;
      else if (y >= 90 && y < 290 && [68, 188, 308].some((x0) => x >= x0 && x < x0 + 24)) c = LINII_COLORATE.albastru;
      d.set([c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, 255], 4 * (y * W + x));
    }
  }
  return { latime: W, inaltime: H, date: d };
}

test('pragul părților late vine din culorile pe linii mediane: barele albastre pe contururi nu-l mai mută', () => {
  const img = desenBare(), om = { ...OM, semnaleaza: true };
  const r0 = traseazaCulori(img, { ...OC, doarEtichete: true });
  assert.ok(r0.ok);
  const paleta = r0.raport.paleta;
  const linii = traseazaCuloriMediane(img, OC, om);
  assert.ok(linii.ok);
  // Toate pe linii: grosimea desenului întreg e a barelor (24 px), pragul, dublul ei.
  assert.ok(Math.abs(linii.raport.mediane.grosime - 24) <= 2, `toate pe linii: ${linii.raport.mediane.grosime}`);
  assert.ok(Math.abs((linii.raport.mediane.parti?.pragPx ?? 0) - 2 * linii.raport.mediane.grosime) < 1e-9);
  // Barele pe contururi: grosimea și pragul, doar ale liniei roșii (4 px, pragul 8).
  const r = traseazaCuloriMediane(img, { ...OC, peLinii: peLinii(['rosu'], paleta) }, om);
  assert.ok(r.ok);
  assert.ok(Math.abs(r.raport.mediane.grosime - 4) <= 1, `roșul singur pe linii: ${r.raport.mediane.grosime}`);
  assert.ok(Math.abs((r.raport.mediane.parti?.pragPx ?? 0) - 2 * r.raport.mediane.grosime) < 1e-9);
  const bare = r.piese.find((p) => p.culoare === idx('albastru', paleta));
  assert.ok(bare && !eLinie(bare));
  assert.deepEqual(fel(bare.cai), { contururi: 3 });
});

test('legarea trece și peste culorile pe contururi: roșul singur pe linii, legat peste albastrul și verdele pe contururi', () => {
  const r = amestec(['rosu']);
  const rosu = piesaDe(r.piese, 'rosu'), albastru = piesaDe(r.piese, 'albastru'), verde = piesaDe(r.piese, 'verde');
  assert.ok(eLinie(rosu));
  assert.deepEqual(fel(rosu.cai), { deschise: 1, bucle: 0 });
  assert.equal(rosu.legaturi, 3);
  assert.equal(r.raport.mediane.legaturi, 3);
  assert.ok(albastru && !eLinie(albastru) && verde && !eLinie(verde));
  assert.deepEqual(fel(albastru.cai), { contururi: 1 });
  assert.deepEqual(fel(verde.cai), { contururi: 2 });
  // Fără legare, roșul rămâne rupt în patru, și lângă contururi.
  const fara = piesaDe(amestec(['rosu'], { leaga: false }).piese, 'rosu');
  assert.ok(eLinie(fara));
  assert.deepEqual(fel(fara.cai), { deschise: 4, bucle: 0 });
  assert.equal(fara.legaturi, 0);
});

test('reducerea culorilor se face o singură dată: și în amestec, și cu toate pe linii', () => {
  let n = 0;
  const culori: typeof traseazaCulori = (img, o) => { n++; return traseazaCulori(img, o); };
  const r = traseazaCuloriMediane(IMG, { ...OC, peLinii: peLinii(['rosu', 'albastru', 'verde']) }, OM, { culori });
  assert.equal(n, 1);
  assert.deepEqual(r, amestec(['rosu', 'albastru', 'verde']));
  n = 0;
  traseazaCuloriMediane(IMG, OC, OM, { culori });
  assert.equal(n, 1);
  n = 0;
  traseazaCuloriMediane(IMG, { ...OC, peLinii: peLinii([]) }, OM, { culori });
  assert.equal(n, 1);
});

test('culorile legate iau felul primei: verdele legat de roșu urmează roșul, oricare i-ar fi propriul fel', () => {
  const legaturi = PALETA.map(() => -1);
  legaturi[idx('verde')] = idx('rosu');
  // Roșul pe linii, verdele (legat de el) pe contururi: o singură piesă, pe linii.
  const a = amestec(['rosu'], {}, { legaturi });
  assert.equal(piesaDe(a.piese, 'verde'), undefined);
  assert.ok(eLinie(piesaDe(a.piese, 'rosu')));
  // Roșul pe contururi, verdele pe linii: o singură piesă, pe contururi.
  const b = amestec(['verde'], {}, { legaturi });
  assert.equal(piesaDe(b.piese, 'verde'), undefined);
  const rosu = piesaDe(b.piese, 'rosu');
  assert.ok(rosu && !eLinie(rosu));
});

test('culorile nebifate nu dau piese pe niciun fel; fără nicio culoare pe linii, contururile de azi, cu raportul liniilor gol', () => {
  const bifate = PALETA.map((c, k) => !c.fundal && k !== idx('rosu') && k !== idx('galben'));
  const r = amestec(['rosu', 'verde'], {}, { bifate });
  assert.deepEqual(r.piese.map((p) => p.culoare).sort(), [idx('albastru'), idx('verde'), idx('negru')].sort());
  assert.ok(eLinie(piesaDe(r.piese, 'verde')));
  const toate = traseazaCulori(IMG, OC);
  assert.ok(toate.ok);
  // Cu semnalarea părților late pornită: fără culori pe linii, nimic de semnalat.
  const c = amestec([], { semnaleaza: true });
  assert.deepEqual(c.piese, toate.piese);
  assert.deepEqual([c.raport.mediane.puncte, c.raport.mediane.legaturi, c.raport.mediane.bucle], [0, 0, 0]);
  assert.equal(c.late, undefined);
});

test('nucleul culorilor, cu `peLinii`: fără contururile culorilor pe linii; cu toate pe linii, fără plasă, doar etichetele', () => {
  const toate = traseazaCulori(IMG, OC), etichete = traseazaCulori(IMG, { ...OC, doarEtichete: true });
  assert.ok(toate.ok && etichete.ok);
  const r = traseazaCulori(IMG, { ...OC, peLinii: peLinii(['rosu', 'verde']) });
  assert.ok(r.ok);
  assert.deepEqual(r.piese, toate.piese.filter((p) => p.culoare !== idx('rosu') && p.culoare !== idx('verde')));
  assert.deepEqual(r.etichete, toate.etichete);
  assert.deepEqual(r.raport.paleta, toate.raport.paleta);
  // Curbele, doar pe granițele culorilor pe contururi: cele dintre roșu, verde și hârtie nu se mai potrivesc.
  assert.ok(r.raport.granite < toate.raport.granite, `${r.raport.granite} față de ${toate.raport.granite}`);
  const g = traseazaCulori(IMG, { ...OC, peLinii: peLinii(NUME) });
  assert.ok(g.ok);
  assert.deepEqual(g.piese, []);
  assert.equal(g.raport.granite, 0);
  assert.deepEqual(g.etichete, etichete.etichete);
});
