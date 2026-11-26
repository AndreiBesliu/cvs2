# Lista de otrăvuri a feliei 18.1↑d-2 (fișa plăcii reliefului, placa 18; ADR 0310 §13, ADR 0312, ADR 0313), 26.11.2026, alese
# de autor: documentul plăcii (adaosul, pasul pe trecere, pașii laterali, freza finisării, locul reliefului, înălțimea calotei,
# Z0), freza degroșării și regula coborârii din CAM. Fiecare trebuie prinsă de cotele prezise de oracolul simulării (setul
# „placa18”, pe exportul proaspăt), nu de proba de aur, care cade la orice schimbare a programelor. Plus un martor, care nu
# schimbă nimic și trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PG = 'test/placi/placa-18/genereaza.ts'
RF = 'src/cam/reliefFinisare.ts'

o('P00', PG, "export const BAZA = 'placa-18';", "export const BAZA = 'placa-18';\nconst NEFOLOSIT = 1;", 'placa18',
  'martorul: o constantă nefolosită (trebuie să scape)')
o('P01', PG, 'export const DEGROSARE = { pas: 3, pasLateral: 2.5, adaos: 0.5, unghi: 0 } as const;',
  'export const DEGROSARE = { pas: 3, pasLateral: 2.5, adaos: 0.3, unghi: 0 } as const;', 'placa18',
  'adaosul 0,3 în loc de 0,5: fundul și platoul după T1 cu 0,2 mai jos')
o('P02', PG, 'export const DEGROSARE = { pas: 3, pasLateral: 2.5, adaos: 0.5, unghi: 0 } as const;',
  'export const DEGROSARE = { pas: 4, pasLateral: 2.5, adaos: 0.5, unghi: 0 } as const;', 'placa18',
  'degroșarea în trepte de 4: intră mai adânc decât pasul plăcii')
o('P03', PG, 'export const FINISARE = { pas: 3, pasLateral: 1.5, unghi: 0 } as const;',
  'export const FINISARE = { pas: 3, pasLateral: 2, unghi: 0 } as const;', 'placa18',
  'liniile finisării la 2 mm: creasta 0,172, nu 0,095')
o('P04', PG, "export const FREZA_FINISARE: Scula = { numar: 2, nume: 'freza bila 6', diametru: 6, forma: { tip: 'bila' } };",
  "export const FREZA_FINISARE: Scula = { numar: 2, nume: 'freza bila 6', diametru: 6 };", 'placa18',
  'finisarea cu freza plată: fără creastă, iar pe rampă trepte')
o('P05', PG, 'export const RELIEF = { latime: 80, inaltime: 50, celula: 0.25, x: 30, y: 25 } as const;',
  'export const RELIEF = { latime: 80, inaltime: 50, celula: 0.25, x: 31, y: 25 } as const;', 'placa18',
  'relieful mutat cu 1 mm pe X: punctele fișei cad altundeva')
o('P06', PG, 'export const CALOTA = { cx: 22, cy: 25, raza: 15, inaltime: 8 } as const;',
  'export const CALOTA = { cx: 22, cy: 25, raza: 15, inaltime: 7.5 } as const;', 'placa18',
  'calota înaltă de 7,5: fundul la 7,5 sub față, nu la 8')
o('P07', PG, "export const PARAMETRI: ParametriExport = { origine: 'stanga-jos', z0: 'sus', strategieScula: 'fisiere-separate' };",
  "export const PARAMETRI: ParametriExport = { origine: 'stanga-jos', z0: 'jos', strategieScula: 'fisiere-separate' };", 'placa18',
  'Z0 pe fața de jos a foii: adâncimile urcă cu 18')
o('P08', PG, "export const FREZA_DEGROSARE: Scula = { numar: 1, nume: 'freza plata 6', diametru: 6 };",
  "export const FREZA_DEGROSARE: Scula = { numar: 1, nume: 'freza plata 6', diametru: 8 };", 'placa18',
  'degroșarea cu o freză plată Ø8 (fișa spune Ø6): pe rampă rămâne mai mult lemn')
o('P09', RF, "    return (o.avans * dz) / Math.hypot(bx - ax, by - ay, dz) > o.avansPlonjare ? o.avansPlonjare : o.avans;",
  "    return o.avans;", 'placa18', 'coborârea de pe perete cu avansul de tăiere')
o('P10', RF, "    const l = linii(p, o, so.degrosare && o.margine !== 'trece' ? so.cota.raza : 0);", "    const l = linii(p, o, 0);",
  'placa18', 'fâșia de lângă pereții paraleli cu liniile degroșării: după T1, lângă perete rămâne lemn peste adaos')


# ---- Seturile ----
SETURI = {
    'placa18': ['test/unit/placa18.test.ts'],
    'placa18aur': ['test/unit/placa18.test.ts', 'test/unit/placa18.aur.test.ts'],
}
