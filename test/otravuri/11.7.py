# Lista de otrăvuri a feliei 11.7 (fișa plăcii 11, ADR 0210), 17.11.2026, alese de autor: documentul plăcii (foaia, distanța,
# colțul așezării, materialul, ordinea numelor), ramele (freza, latura, trecerile, urechile: câte, cât de late, cât de groase,
# fără ele), numele (locul, mărimea și alinierea textului) și exportul (Z0). Fiecare trebuie prinsă de cotele pe hârtie
# (setul „placa11”, pe exportul proaspăt), nu de proba de aur, care cade la orice schimbare a programelor. Plus un martor,
# care nu schimbă nimic și trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PG = 'test/placi/placa-11/genereaza.ts'

o('R00', PG, 'export const DISTANTA = 10;', 'export const DISTANTA = 10;\nconst NEFOLOSIT = 1;', 'placa11',
  'martorul: o constantă nefolosită (trebuie să scape)')
o('R01', PG, 'distantaX: DISTANTA, distantaY: DISTANTA };', 'distantaX: DISTANTA, distantaY: 5 };', 'placa11',
  'distanța implicită de 5 pe Y: rândurile se strâng, urechile dintre ele nu mai țin')
o('R02', PG, 'export const FOAIA = { latime: 300, inaltime: 220, grosime: 12 } as const;',
  'export const FOAIA = { latime: 300, inaltime: 200, grosime: 12 } as const;', 'placa11',
  'foile de 300 × 200: încap doar 4 rânduri, 12 + 12 + 1')
o('R03', PG, "const asezare = { ...ASEZARE_IMPLICITA, distantaX",
  "const asezare = { ...ASEZARE_IMPLICITA, colt: 'stanga-jos' as const, distantaX", 'placa11',
  'așezarea din stânga-jos: rândurile de jos în sus')
o('R04', PG, "export const MATERIAL = 'MDF 12';", "export const MATERIAL = 'MDF 10';", 'placa11', 'materialul foilor')
o('R05', PG, 'return date.map((r, k) =>', 'return date.reverse().map((r, k) =>', 'placa11', 'numele în ordinea inversă')
o('R06', PG, "export const FREZA_RAMA: Scula = { numar: 5, nume: 'freza plata 3.175', diametru: 3.175 };",
  "export const FREZA_RAMA: Scula = { numar: 5, nume: 'freza plata 3.175', diametru: 3 };", 'placa11',
  'freza ramelor de Ø3: drumul la 1,5 de plăcuță, nu la 1,5875')
o('R07', PG, "latura: 'exterior', sens: 'urcare', adancime: FOAIA.grosime,", "latura: 'interior', sens: 'urcare', adancime: FOAIA.grosime,",
  'placa11', 'ramele pe dinăuntru: plăcuțele ies mai mici cu o freză')
o('R08', PG, 'export const PAS_RAMA = 3;', 'export const PAS_RAMA = 4;', 'placa11', 'trei treceri de 4 mm, nu patru de 3')
o('R09', PG, 'export const URECHI = { numar: 2, latime: 6, grosime: 2 } as const;',
  'export const URECHI = { numar: 1, latime: 6, grosime: 2 } as const;', 'placa11', 'o singură ureche pe plăcuță')
o('R10', PG, 'export const URECHI = { numar: 2, latime: 6, grosime: 2 } as const;',
  'export const URECHI = { numar: 2, latime: 4, grosime: 2 } as const;', 'placa11', 'urechile de 4 mm, nu de 6')
o('R11', PG, 'export const URECHI = { numar: 2, latime: 6, grosime: 2 } as const;',
  'export const URECHI = { numar: 2, latime: 6, grosime: 1 } as const;', 'placa11', 'urechile groase de 1 mm, nu de 2')
o('R12', PG, 'pas: PAS_RAMA, urechi: { ...URECHI },', 'pas: PAS_RAMA, urechi: null,', 'placa11',
  'ramele fără urechi: toate plăcuțele cad')
o('R13', PG, 'export const PLACUTA = { latime: 80, inaltime: 30, textX: 40, textY: 11, majuscula: 8 } as const;',
  'export const PLACUTA = { latime: 80, inaltime: 30, textX: 38, textY: 11, majuscula: 8 } as const;', 'placa11',
  'textul cu 2 mm la stânga: numele nu mai e centrat')
o('R14', PG, 'export const PLACUTA = { latime: 80, inaltime: 30, textX: 40, textY: 11, majuscula: 8 } as const;',
  'export const PLACUTA = { latime: 80, inaltime: 30, textX: 40, textY: 12, majuscula: 8 } as const;', 'placa11',
  'textul cu 1 mm mai sus')
o('R15', PG, 'export const PLACUTA = { latime: 80, inaltime: 30, textX: 40, textY: 11, majuscula: 8 } as const;',
  'export const PLACUTA = { latime: 80, inaltime: 30, textX: 40, textY: 11, majuscula: 7 } as const;', 'placa11',
  'majuscula de 7 mm, nu de 8')
o('R16', PG, "interlinie: 1.2, aliniere: 'centru' };", "interlinie: 1.2, aliniere: 'stanga' };", 'placa11',
  'textul aliniat la stânga, de la mijlocul plăcuței')
o('R17', PG, "export const PARAMETRI = { origine: 'stanga-jos', z0: 'sus',", "export const PARAMETRI = { origine: 'stanga-jos', z0: 'jos',",
  'placa11', 'Z0 pe fața de jos a foii: adâncimile urcă cu 12')


# ---- Seturile ----
SETURI = {
    'placa11': ['test/unit/placa11.test.ts'],
    'placa11aur': ['test/unit/placa11.test.ts', 'test/unit/placa11.aur.test.ts'],
}
