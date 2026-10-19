# Otrăvurile feliei „simularea, nucleul CPU, felia 1” (ADR 0047), 19.10.2026. Întâi cele 7 otrăvuri ale sondei s4
# (`docs/faza2/sonde/s4-simulare/cod/test/poisons.mjs`, controlul negativ din `PLAN.md` §4.1), puse pe nucleul aplicației;
# apoi câte una pe fiecare mecanism al feliei: atlasul și compactarea, benzile și filtrul lor, amprenta, rezumatul,
# trigonometria proprie, programul IR, bazinul, exportul și dialogul. Proba care apără mecanismul trebuie să pice.
# Alese de autorul feliei (plasa autorului, nu runda independentă din `PLAN.md` §4.3).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Rezultatul: prima rundă (clona de la 3f2caee, 49 de otrăvuri): 43 / 44 unitare și 4 / 5 e2e; scăpate P06 (raza capetelor
# arcului) și D03 (tăietura prin foaie pe hartă) → probele lor. A doua rundă, pe codul final cu remedierile celor două
# recenzii (clona de la bad8474, 61): 60 / 61, toate prin probe, niciuna de termen; D05 (dialogul închis nu oprea
# simularea: nimic pe ecran, workerele lucrau degeaba) scăpată → proba workerelor oprite la închidere, apoi prinsă: 61 / 61.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NUC = 'src/sim/nucleu.ts'
CAM = 'src/sim/camp.ts'
BAN = 'src/sim/banda.ts'
UNG = 'src/sim/unghi.ts'
PRG = 'src/sim/program.ts'
BAZ = 'src/jobs/bazin.ts'
EXP = 'src/ui/actiuniExportCalcul.ts'
PRE = 'src/ui/PrevizualizareSimulare.tsx'
APP = 'src/app/App.tsx'

E2E = ['test/e2e/simulare.spec.ts']

SETURI = {
    'sim': ['test/unit/simulare.corpus.test.ts', 'test/unit/simulare.corpus2.test.ts', 'test/unit/simulare.benzi.test.ts',
            'test/unit/simulare.program.test.ts', 'test/unit/simulare.rezumat.test.ts', 'test/unit/simulare.unghi.test.ts',
            'test/unit/simulare.bazin.test.ts', 'test/unit/simulare.export.test.ts'],
    'sim2': ['test/unit/simulare.corpus.test.ts', 'test/unit/simulare.corpus2.test.ts', 'test/unit/simulare.benzi.test.ts',
             'test/unit/simulare.program.test.ts', 'test/unit/simulare.rezumat.test.ts', 'test/unit/simulare.unghi.test.ts',
             'test/unit/simulare.bazin.test.ts', 'test/unit/simulare.export.test.ts', 'test/unit/export.calcul.test.ts',
             'test/unit/actiuni.export.test.ts', 'test/unit/rezumat.test.ts'],
}

# ---- cele 7 otrăvuri din s4, pe nucleul aplicației ----
o('S01', NUC, 'if (!mare) return c0 >= 0 && c1 >= 0;', 'if (!mare) return c0 >= 0 || c1 >= 0;', 'sim',
  's4 „arc-baleiaj-sau”: testul de baleiaj al arcului cu „sau” în loc de „și”')
o('S02', NUC, 'k: 1 / tanD((f.unghi * Math.PI) / 360) }', 'k: tanD((f.unghi * Math.PI) / 360) }', 'sim',
  's4 „v-tan-in-loc-de-cot”: V-ul cu tan în loc de 1/tan')
o('S03', NUC, 'zs = az + dz * (dz > 0 ? ta : tb);', 'zs = az + dz * (dz > 0 ? tb : ta);', 'sim',
  's4 „rampa-capat-gresit”: rampa plată ia capătul greșit al intervalului')
o('S04', NUC, '    const q = T.R2 - d * d;', '    const q = T.R2 - d;', 'sim',
  's4 „bila-fara-patrat”: bila cu R² − d în loc de R² − d² (silueta, pe arce și plonjări)')
o('S04b', NUC, 'const q = rho2 - sv * sv;', 'const q = rho2 - sv;', 'sim',
  's4 „bila-fara-patrat”, pe linia 3D: R² − d în loc de R² − d²')
o('S05', NUC, '      const px = F.x0 + (i + 0.5) * cell;\n      const ex = px - ax, ey = py - ay;',
  '      const px = F.x0 + i * cell;\n      const ex = px - ax, ey = py - ay;', 'sim', 's4 „centrul-celulei”: centrul celulei la i în loc de i + 0,5')
o('S06', NUC, 'lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax);\n      } else if (ea * dy',
  'lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));\n      } else if (ea * dy', 'sim',
  's4 „span-fara-ax”: intervalul pe rând fără deplasarea +ax')
o('S07', NUC, 'const cand = dz < 0 ? hi : lo;', 'const cand = dz < 0 ? lo : hi;', 'sim', 's4 „elice-z-invers”: elicea plată ia capătul greșit')

# ---- nucleul: restul formulelor ----
o('N01', NUC, 'const C = rho > 1e-12 ? (rho2 + r * r - R2) / (2 * rho * r)', 'const C = rho > 1e-12 ? (rho2 + r * r + R2) / (2 * rho * r)', 'sim',
  'elicea: legea cosinusului cu +R² (scula acoperă alt interval de unghiuri)')
o('N02', NUC, 'const plin = S >= DOI_PI, mare = !plin && S > Math.PI;', 'const plin = S >= DOI_PI, mare = false;', 'sim',
  'arcul peste 180° tratat ca arc mic')
o('N03', NUC, "  if (!trig) { let t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }\n", '', 'sim',
  'arcul orar fără schimbarea capetelor (taie complementul)')
o('N04', NUC, '        if (cur <= zlo) continue;', '        if (cur <= zlo + 0.01) continue;', 'sim',
  'sărirea celulei „deja mai adâncă” cu 0,01 mm prea devreme (lasă material)')
o('N05', NUC, 'else sv = perp2 > 0 ? (-m * Math.sqrt(perp2)) / Math.sqrt(k2 - m2) : 0;', 'else sv = 0;', 'sim',
  'V-ul pe rampă: punctul de minim luat în dreptul proiecției, nu la optimul convex')
o('N06', NUC, 'let sv = mBila * srho;', 'let sv = 0;', 'sim', 'bila pe rampă: punctul de minim luat în dreptul proiecției')
o('N07', NUC, '  const Re = raza(T, top - zlo) * (1 + 1e-12) + 1e-9, Re2 = Re * Re;', '  const Re = raza(T, top - zlo) * 0.9, Re2 = Re * Re;', 'sim',
  'raza efectivă a liniei prea mică (căutarea taie marginea șanțului)')
o('N09', NUC, 'const xi = ri > 0 && wy * wy < ri * ri ? Math.sqrt(ri * ri - wy * wy) : -1;',
  'const xi = ri > 0 && wy * wy < ri * ri ? Math.sqrt(ri * ri - wy * wy) + 3 * cell : -1;', 'sim', 'elicea sare și celulele de pe peretele interior al inelului')
o('N08', NUC, '    if (bn > 1 && (j >> SH) % bn !== bw) continue;\n    const py = F.y0 + (j + 0.5) * cell, ey = py - cy;',
  '    const py = F.y0 + (j + 0.5) * cell, ey = py - cy;', 'sim', 'arcul scrie și în rândurile altor benzi')

# ---- câmpul: atlasul și compactarea ----
o('C01', CAM, 'F.atlas.fill(F.loc[d] === UNIFORMA ? F.uniforma[d]! : F.sus,', 'F.atlas.fill(F.sus,', 'sim',
  'o dală uniformă scrisă din nou pierde valoarea ei (se umple cu fața)')
o('C02', CAM, 'for (let k = 1; k < CELULE_DALA; k++) if (atlas[b + k] !== v) { uniform = false; break; }',
  'for (let k = 1; k < 2; k++) if (atlas[b + k] !== v) { uniform = false; break; }', 'sim',
  'compactarea declară uniformă o dală după primele două celule')
o('C03', CAM, 'atlas.copyWithin(scrise * CELULE_DALA, b, b + CELULE_DALA);', 'atlas.copyWithin(scrise * CELULE_DALA, b, b + CELULE_DALA - 1);', 'sim',
  'compactarea mută dala fără ultima celulă')
o('C04', CAM, "const nou = new Float32Array((acum + Math.max(64, Math.min(acum, 8192))) * CELULE_DALA);\n    nou.set(F.atlas.subarray(0, s * CELULE_DALA));",
  "const nou = new Float32Array((acum + Math.max(64, Math.min(acum, 8192))) * CELULE_DALA);\n    nou.set(F.atlas.subarray(0, (s - 1) * CELULE_DALA));", 'sim',
  'creșterea atlasului pierde ultima dală')


# ---- benzile, amprenta, rezumatul ----
o('B01', BAN, '    for (let r = r0; !a && r <= r1; r++) if (r % b.n === b.w) a = true;', '    for (let r = r0; !a && r <= r1; r++) if (r % b.n === (b.w + 1) % b.n) a = true;', 'sim',
  'filtrul trimite mutările benzii vecine')
o('B02', BAN, '    const re = (mutari[o] !== 0 && mutari[o + 3] !== mutari[o + 6] ? T.R : raza(T, p.sus - zlo)) * (1 + 1e-12) + p.celula;',
  '    const re = raza(T, p.sus - zlo) * 0.5;', 'sim', 'filtrul cu jumătate din raza efectivă (aruncă mutări care ating banda)')
o('B03', BAN, '    h1 = Math.imul(h1 ^ tx, P1);\n    h2 = Math.imul(h2 ^ tx, P2);\n', '', 'sim', 'amprenta rândului nu ține de coloana dalei')
o('B04', BAN, '  randuri.sort((a, b) => a[0] - b[0]);', '', 'sim', 'unirea benzilor fără ordinea rândurilor (amprenta depinde de N)')
o('B05', BAN, '        vol += F.sus - (v > fund ? v : fund);', '        vol += F.sus - v;', 'sim', 'volumul scoate și sub fața de jos a foii')
o('B06', BAN, 'prinFoaie: zMin <= Math.fround(fund),', 'prinFoaie: zMin < Math.fround(fund) - 1,', 'sim', '„prin foaie” cu 1 mm prea târziu')
o('B10', BAN, 'prinFoaie: zMin <= Math.fround(fund),', 'prinFoaie: zMin <= fund,', 'sim',
  '„prin foaie” comparat în Float64: 12,7 și 19,05 mm (placajul) ies false')
o('B11', BAN, '      for (let k = 0; k < CELULE_DALA; k++) { const w = biti[b + k]!; h1 = Math.imul(h1 ^ w, P1); h2 = Math.imul(h2 ^ ((w << 7) | (w >>> 25)), P2); }',
  '      for (let k = 0; k < CELULE_DALA; k++) { const w = biti[b + k]!; h1 = Math.imul(h1 ^ w, P1); h2 = Math.imul(h2 ^ (w >>> 7), P2); }', 'sim',
  'a doua jumătate a amprentei nu vede cei 7 biți de jos (ca în s4)')
o('B07', BAN, 'const px = Math.floor(i / bloc), py = Math.floor(j / bloc)', 'const px = Math.round(i / bloc), py = Math.round(j / bloc)', 'sim',
  'previzualizarea pune celula în blocul vecin')
o('B08', BAN, "  amesteca(nx);\n  amesteca(ny);\n  for (const v of [p.x0, p.y0, p.celula]) { f64[0] = v; amesteca(u64[0]!); amesteca(u64[1]!); }\n", '', 'sim',
  'amprenta nu ține de grilă')
o('B09', BAN, '  const bloc = Math.max(1, Math.ceil(Math.max(nx, ny) / maxim));', '  const bloc = Math.max(1, Math.floor(Math.max(nx, ny) / maxim));', 'sim',
  'previzualizarea depășește 480 de pixeli')

# ---- trigonometria proprie ----
o('U01', UNG, '  for (let k = 11; k >= 0; k--) p = ATAN[k]! + t2 * p;', '  for (let k = 5; k >= 0; k--) p = ATAN[k]! + t2 * p;', 'sim',
  'seria arctangentei tăiată la t¹¹')
o('U02', UNG, '  if (x < 0 || (x === 0 && 1 / x < 0)) a = PI - a;', '  if (x < 0 || (x === 0 && 1 / x < 0)) a = PI + a;', 'sim',
  'atan2: cadranul stâng greșit')
o('U03', UNG, '    case 1: return [c, -s];', '    case 1: return [c, s];', 'sim', 'sin / cos: cadranul al doilea greșit')
o('U04', UNG, '  return atan2D(Math.sqrt((1 - c) * (1 + c)), c);', '  return atan2D(Math.sqrt(1 - c), c);', 'sim', 'acos fără (1 + c)')

# ---- programul IR ----
o('P01', PRG, '  if (x === nx && y === ny) return DOI_PI;\n', '', 'sim', 'start = capăt nu mai e cercul întreg')
o('P02', PRG, "      if (nz !== undefined && nz < sus) return refuz('mișcarea coboară în material dintr-o poziție necunoscută', q);\n", '', 'sim',
  'coborârea în material dintr-o poziție necunoscută, sărită în tăcere')
o('P03', PRG, '    } else if (!inAer) {', "    } else if (!inAer && m.tip === 'taiere') {", 'sim', 'rapidele prin material nu mai taie în simulare')
o('P04', PRG, "    if (la.A !== undefined) return refuz('axa A nu se simulează în v1 (doar X, Y, Z)', q);\n", '', 'sim', 'axa A dintr-o mutare ignorată')
o('P05', PRG, "      if (z !== nz && forma.tip !== 'plata' && !inAer) return refuz(", "      if (false && z !== nz && forma.tip !== 'plata' && !inAer) return refuz(", 'sim',
  'elicea cu bilă / V nerefuzată (nucleul ar arunca la mijlocul jobului)')
o('P06', PRG, 'const TOLERANTA_RAZA = 1e-9;', 'const TOLERANTA_RAZA = 1e-6;', 'sim',
  'arcul cu capetele pe raze diferite acceptat până la 1 µm (nucleul desenează un singur cerc)')
o('P08', PRG, "  if (d < BALEIAJ_AMBIGUU) return 'arcul are capetele aproape în același punct, dar nu în el: nu se știe dacă e un cerc întreg';\n", '', 'sim',
  'arcul ambiguu (capetele la sub 1e-9 rad) acceptat ca arc mic')
o('P09', PRG, "if (z !== nz && forma.tip !== 'plata' && !inAer) return refuz(", "if (z !== nz && forma.tip !== 'plata') return refuz(", 'sim',
  'elicea cu bilă / V refuzată și prin aer')
o('P10', PRG, "  if (m.sens === 'trigonometric') { if (b < 0) b += DOI_PI; } else if (b > 0) b -= DOI_PI;", "  if (m.sens === 'trigonometric') { if (b < 0) b += DOI_PI; }", 'sim',
  'arcul orar cu baleiajul greșit')
o('P07', PRG, "const forma = p.scula.forma ?? { tip: 'plata' as const };", "const forma = { tip: 'plata' as const };", 'sim',
  'forma sculei din IR ignorată (bila și V-ul simulate ca freză plată)')

# ---- bazinul, exportul, dialogul ----
o('Z01', BAZ, '  return Math.min(FIRE_MAXIME, Math.floor(nuclee) - 1);', '  return Math.min(FIRE_MAXIME, Math.floor(nuclee));', 'sim',
  'bazinul ia toate nucleele (niciunul pentru interfață)')
o('Z02', BAZ, 'mutari: mutariPentruBanda(c.mutari, c.scula, c.camp, banda) });', 'mutari: c.mutari });', 'e2e',
  'toate benzile primesc același tablou: primul transfer îl detașează pentru celelalte')
o('Z03', BAZ, '        raspunsuri[k] = e.data.raspuns;', '        raspunsuri[k] = { ...e.data.raspuns, randuri: e.data.raspuns.randuri.slice(1) };', 'sim',
  'răspunsul workerului pierde un rând la unire (proba cu workerul fals)')
o('Z04', BAZ, '      for (const w of workere) w.terminate();', '', 'sim', 'workerele jobului nu se opresc la capăt (un worker tăcut rămâne)')
o('Z05', BAZ, '    if (semnal?.aborted) { anuleaza(); return; }', '', 'sim', 'un job deja anulat pornește workere')
o('Z06', BAZ, '    if (--ramase > 0) return;', '    if (--ramase > 1) return;', 'sim', 'jobul se termină înainte de ultima bandă')
o('E01', EXP, '  const camp = campPentruFoaie(foaie), d = dimensiuni(camp.celula, camp.latime, camp.inaltime);',
  '  const camp = campPentruFoaie(foaie, 0.5), d = dimensiuni(camp.celula, camp.latime, camp.inaltime);', 'sim', 'exportul simulează la 0,5 mm')
o('E02', EXP, 'scula: p.scula, mutari: p.mutari, fund: -foaie.grosime }', 'scula: p.scula, mutari: p.mutari, fund: foaie.grosime }', 'sim',
  'fața de jos a foii cu semnul greșit')
o('E03', EXP, '    simulare: (semnal) => simuleazaExport(job.program, foaie.stoc, semnal),', "    simulare: async () => ({ ok: false, motiv: 'oprită', eroare: false }),", 'sim',
  'exportul fără simulare')
o('E04', EXP, '    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };',
  '    return { ok: false, motiv, eroare: false };', 'e2e', 'un worker căzut nu mai e o eroare (nu intră în jurnal)')
o('D01', PRE, '      const rand = (H - 1 - py) * W;', '      const rand = py * W;', 'e2e', 'harta întoarsă sus-jos')
o('D02', APP, "          setStareExport((v) => (v?.ok && v.simulare === 'calcul' ? { ...v, simulare: s } : v));", '', 'e2e',
  'rezultatul simulării nu ajunge în dialog (rămâne „se simulează”)')
o('D04', APP, "          if (!s.ok && s.eroare) jurnal.adauga('promisiune', new Error(`simularea: ${s.motiv}`));\n", '', 'e2e',
  'eșecul simulării nu intră în jurnal')
o('D05', APP, '          onInchide={() => { cerereExport.current++; exportInCurs.current = false; opresteSimularea(); setDialogExport(false); }}',
  '          onInchide={() => { exportInCurs.current = false; setDialogExport(false); }}', 'e2e',
  'dialogul închis nu oprește simularea (workerele ei lucrează degeaba)')
o('D03', PRE, '  if (-z >= grosime) return 0;', '  if (-z > grosime * 2) return 0;', 'e2e', 'tăietura prin foaie nu mai e neagră pe hartă')
