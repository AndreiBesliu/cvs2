# Lista de otrăvuri a feliei 18.1↑g (relieful ca imagine gri pe 16 biți; ADR 0322), 28.11.2026, alese de autor: codecul PNG
# (`src/relief/png16.ts`), cererea workerului (`calculRelief.ts`: exportul, importul pe 16 biți, Z-ul din fișier, metadatele),
# numele fișierului (`reliefPng.ts`) și fereastra (`FereastraRelief.tsx`). Cele pure, prinse de probele pe hârtie (`png16`,
# `relief.calcul`, `relief.png.nume`); ale interfeței, de e2e (`relief.png16.spec.ts`). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PN = 'src/relief/png16.ts'
CR = 'src/jobs/calculRelief.ts'
RP = 'src/app/reliefPng.ts'
FR = 'src/app/FereastraRelief.tsx'

o('G00', PN, "/** Adâncimea unui PNG din antetul lui (8, 16 …), ori null dacă nu e un PNG. */",
  "/** Adâncimea unui PNG din antetul lui (8, 16 …), ori null dacă nu e un PNG.  */", 'png', 'martorul: un spațiu într-un comentariu (trebuie să scape)')
# Codecul.
o('G01', PN, "  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;", "  return pa <= pb && pa <= pc ? a : pb < pc ? b : c;", 'png',
  'Paeth cu egalitatea pe dos (la pb = pc ia c, nu b)')
o('G02', PN, "      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);",
  "      const pred = f === 0 ? 0 : f === 1 ? b : f === 2 ? a : f === 3 ? (a + b) >> 1 : paeth(a, b, c);", 'png', 'filtrele Sub și Up întoarse')
o('G03', PN, "      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);",
  "      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b + 1) >> 1 : paeth(a, b, c);", 'png', 'Average rotunjit în sus')
o('G04', PN, "    return (oct === 2 ? ((pix[q] ?? 0) << 8) | (pix[q + 1] ?? 0) : pix[q] ?? 0) * 255 / maxim;",
  "    return (oct === 2 ? ((pix[q + 1] ?? 0) << 8) | (pix[q] ?? 0) : pix[q] ?? 0) * 255 / maxim;", 'png', 'eșantioanele little-endian')
o('G05', PN, "    return (oct === 2 ? ((pix[q] ?? 0) << 8) | (pix[q + 1] ?? 0) : pix[q] ?? 0) * 255 / maxim;",
  "    return (oct === 2 ? (pix[q] ?? 0) : pix[q] ?? 0) * 255 / 255;", 'png', 'PNG-ul pe 16 biți citit doar pe octetul de sus (8 biți)')
o('G06', PN, "    rgba[4 * k + 3] = alfa ? es(k, canale - 1) : 255;", "    rgba[4 * k + 3] = 255;", 'png', 'alfa ignorată: golurile devin pline')
o('G07', PN, "  if (intretesut !== 0) return { eroare: 'intretesut' };", "", 'png', 'un PNG întrețesut citit ca neîntrețesut (pixeli amestecați)')
o('G08', PN, "      if (z > 0) text[latin1(d.subarray(0, z))] = latin1(d.subarray(z + 1));", "", 'png', 'blocurile de text pierdute: Z-ul din fișier nu ajunge')
o('G09', PN, "      brut[q] = s >> 8; brut[q + 1] = s & 255;", "      brut[q] = s & 255; brut[q + 1] = s >> 8;", 'png', 'scriitorul little-endian')
# Workerul.
o('G10', CR, "      v[(c.ny - 1 - j) * c.nx + i] = d > 0 ? Math.round((x - z.min) / d * 65535) : 0;",
  "      v[j * c.nx + i] = d > 0 ? Math.round((x - z.min) / d * 65535) : 0;", 'calcul', 'imaginea exportată cu susul în jos')
o('G11', CR, "      v[(c.ny - 1 - j) * c.nx + i] = d > 0 ? Math.round((x - z.min) / d * 65535) : 0;",
  "      v[(c.ny - 1 - j) * c.nx + i] = d > 0 ? Math.floor((x - z.min) / d * 65535) : 0;", 'calcul', 'scalarea trunchiată, nu rotunjită (o treaptă pierdută)')
o('G12', CR, "    for (let k = 0; k < v.length; k++) { const x = l[k] ?? NaN; v[k] = x !== x ? NaN : m.zMin + x * (m.zMax - m.zMin); }",
  "    for (let k = 0; k < v.length; k++) { const x = l[k] ?? NaN; v[k] = x !== x ? NaN : x * m.zMax; }", 'calcul', 'Z-ul din fișier fără z_min')
o('G13', CR, "  if (adancimePng(new Uint8Array(await b.slice(0, 33).arrayBuffer())) === 16) {",
  "  if (adancimePng(new Uint8Array(await b.slice(0, 33).arrayBuffer())) === 17) {", 'calcul', 'PNG-ul pe 16 biți lăsat browserului (tăiat la 8 biți)')
o('G14', CR, "  const octeti = await scriePngGri16(v, c.nx, c.ny, { text, pixeliPeMetru: 1000 / c.celula });",
  "  const octeti = await scriePngGri16(v, c.nx, c.ny, { text, pixeliPeMetru: 1 / c.celula });", 'calcul', 'scara în pixeli pe mm, nu pe metru')
o('G15', CR, "    return m.v === 1 && n(m.zMin) && n(m.zMax) && n(m.celula) && m.zMax >= m.zMin && m.celula > 0 ? { zMin: m.zMin, zMax: m.zMax, celula: m.celula } : {};",
  "    return n(m.zMin) && n(m.zMax) && n(m.celula) ? { zMin: m.zMin, zMax: m.zMax, celula: m.celula } : {};", 'calcul',
  'metadatele crezute fără versiune și fără margini (o celulă negativă trece)')
# Numele și fereastra.
o('G16', RP, ".trim().replace(/-16bit$/, '').slice(0, 120);", ".trim().slice(0, 120);", 'nume', 'sufixul -16bit dublat la al doilea export')
o('G17', FR, "      const felul = litofanie ? { litofanie: lit } : pe ? {} : { zDinFisier: zFisier };",
  "      const felul = litofanie ? { litofanie: lit } : {};", 'e2e', 'fereastra nu cere Z-ul din fișier: relieful întors are alt Z și altă celulă')


# ---- Seturile ----
SETURI = {
    'png': ['test/unit/png16.test.ts', 'test/unit/relief.calcul.test.ts'],
    'calcul': ['test/unit/relief.calcul.test.ts'],
    'nume': ['test/unit/relief.png.nume.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.png16.spec.ts']
