# Sabotajele feliei „estimarea timpului jobului” (ADR 0046), 18.10.2026: fiecare mecanism al modelului, al citirii `$$`, al
# secțiunilor postului și al rezumatului, stricat o dată; proba care îl apără trebuie să pice. Alese de autorul feliei
# (`PLAN.md` §4.3 cere otrăvurile alese independent după etapa 4: aceasta e plasa autorului, nu runda independentă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TIM = 'src/sim/timp.ts'
MAS = 'src/ir/masina.ts'
POS = 'src/post/post.ts'
REZ = 'src/ui/actiuniExportCalcul.ts'
JOB = 'src/cam/job.ts'

SETURI = {
    'timp': ['test/unit/timp.test.ts', 'test/unit/masina.setari.test.ts', 'test/unit/rezumat.test.ts', 'test/unit/timp.oracol.test.ts'],
    'timp2': ['test/unit/timp.test.ts', 'test/unit/masina.setari.test.ts', 'test/unit/rezumat.test.ts', 'test/unit/timp.oracol.test.ts',
              'test/unit/timp-oracol.cazuri.test.ts', 'test/unit/post.grbl.test.ts', 'test/unit/job.test.ts', 'test/unit/placa02.test.ts'],
}

# ---- planificatorul ----
o('T01', TIM, '(aj * dj * s) / (1 - s)', '(aj * dj * s) / (1 + s)', 'timp', 'joncțiunea: 1 + sin în loc de 1 − sin')
o('T02', TIM, '      } else if (cos < -0.999999) {\n        jonctiune2 = Infinity;', '      } else if (cos < -0.999999) {\n        jonctiune2 = vMinJ2;',
  'timp', 'linia dreaptă se oprește la fiecare joncțiune')
o('T03', TIM, '      if (cos > 0.999999) {\n        jonctiune2 = vMinJ2;', '      if (cos > 0.999999) {\n        jonctiune2 = Infinity;',
  'timp', 'întoarcerea la 180° fără oprire')
o('T04', TIM, 'if (this.coada.length >= this.B) this.executaPrimul();', 'if (this.coada.length > this.B) this.executaPrimul();',
  'timp', 'fereastra cu un bloc mai mare (16)')
o('T05', TIM, 'e2 = Math.min(c.intrareMaxima2, e2 + 2 * c.acc * c.mm);', 'e2 = Math.min(c.intrareMaxima2, e2 + c.acc * c.mm);',
  'timp', 'pasul înapoi cu jumătate din distanța de frânare')
o('T06', TIM, 'Math.min(e2, this.intrare2 + 2 * b.acc * b.mm)', 'e2', 'timp', 'ieșirea fără limita accelerării din intrare')
o('T07', TIM, "    if (!rapid && nominala > vitezaRapida) {\n      nominala = vitezaRapida;\n      limitate++;\n    }",
  "    if (!rapid && nominala > vitezaRapida) {\n      limitate++;\n    }", 'timp', 'avansul nu mai e tăiat la viteza maximă a mașinii')
o('T08', TIM, '    const vitezaRapida = limita(vmax, u);', '    const vitezaRapida = Math.min(...vmax);', 'timp', 'viteza rapidă fără versor (nu se mai adună axele)')
o('T09', TIM, '    const acc = limita(amax, u);', '    const acc = Math.min(...amax);', 'timp', 'accelerația fără versor')
o('T10', TIM, '    const intrareMaxima2 = Math.min(nominala > nominalaAnterioara ? nominalaAnterioara ** 2 : nominala ** 2, jonctiune2);',
  '    const intrareMaxima2 = Math.min(nominala ** 2, jonctiune2);', 'timp', 'intrarea fără viteza nominală a blocului dinainte')
o('T11', TIM, '    if (!(nominala > avansMinim)) nominala = avansMinim;', '', 'timp', 'fără avansul minim')
o('T12', TIM, '      limitate++;', '', 'timp', 'blocurile limitate nu se mai numără')
o('T13', TIM, '      const tp = lround((tinta[k] as number) * (pasi[k] as number));', '      const tp = (tinta[k] as number) * (pasi[k] as number);',
  'timp', 'fără cuantizarea pe pași')
o('T14', TIM, '  if (dAcc + dDec <= L) return (v - vi) / a + (v - ve) / a + (L - dAcc - dDec) / v;',
  '  if (dAcc + dDec <= L) return (v - vi) / a + (v - ve) / a + (L - dAcc) / v;', 'timp', 'croaziera numără și decelerarea')
o('T15', TIM, '(2 * a * L + vi * vi + ve * ve) / 2', '(2 * a * L + vi * vi + ve * ve)', 'timp', 'vârful triunghiului prea sus')
# ---- arcele ----
o('A01', TIM, '    const segmente = Math.floor(Math.abs(0.5 * unghi * raza) / Math.sqrt(tol * (2 * raza - tol)));',
  '    const segmente = Math.ceil(Math.abs(0.5 * unghi * raza) / Math.sqrt(tol * (2 * raza - tol)));', 'timp', 'segmentele rotunjite în sus')
o('A02', TIM, 'Math.sqrt(tol * (2 * raza - tol))', 'Math.sqrt(tol * (2 * raza))', 'timp', 'rădăcina fără „− $12”')
o('A03', TIM, '    } else if (unghi <= EPS_ARC) {', '    } else if (unghi < 0) {', 'timp', 'cercul întreg trigonometric devine un arc de 0')
o('A04', TIM, '    if (dr > 0.005 && (dr > 0.5 || dr > 0.001 * raza)) {', '    if (false) {', 'timp', 'fără error:33')
o('A05', TIM, '    if (!(2 * raza > tol)) throw', '    if (2 * raza < 0) throw', 'timp', 'arcul cu 2r ≤ $12 acceptat')
o('A06', TIM, '      if (unghi >= -EPS_ARC) unghi -= 2 * Math.PI;', '      if (unghi > 0) unghi -= 2 * Math.PI;', 'timp', 'G2 cu startul în capăt: arc de 0, nu cerc (doar oracolul o vede)')
# ---- sincronizările și pauza ----
o('S01', TIM, "    if (mAx !== undefined && mAx !== ax) {\n      sincronizeaza();", "    if (mAx !== undefined && mAx !== ax) {", 'timp', 'M3 / M5 nu mai opresc mișcarea')
o('S02', TIM, "      if (v.S !== turatie && ax === 'pornit') sincronizeaza();", '', 'timp', 'S nou cu axul pornit nu mai oprește')
o('S03', TIM, '    if (mRacire !== undefined && mRacire !== racire) {\n      sincronizeaza();', '    if (mRacire !== undefined && mRacire !== racire) {',
  'timp', 'răcirea nu mai oprește')
o('S04', TIM, "      sincronizeaza();\n      const pauza", "      const pauza", 'timp', 'G4 nu mai golește bufferul')
o('S05', TIM, 'const pauza = Math.ceil(v.P / fw.pasPauza - 1e-9) * fw.pasPauza;', 'const pauza = Math.round(v.P / fw.pasPauza) * fw.pasPauza;',
  'timp', 'pauza rotunjită la cel mai apropiat pas')
o('S06', TIM, "const MM_PE_INCH = 25.4;", "const MM_PE_INCH = 25;", 'timp', 'inch-ul greșit')
o('S07', TIM, 'return incremental ? (poz[k] as number) + w * unitate : w * unitate;', 'return w * unitate;', 'timp', 'G91 ignorat')
# ---- după recenzie (18.10): M4, M2 / M30, cititorul ca protocol.c, plafonul ----
o('S08', TIM, "          case 4: grup('ax', cod); mAx = 'ccw'; break;", "          case 4: grup('ax', cod); mAx = 'cw'; break;", 'timp', 'M4 e tot M3: trecerea nu mai oprește')
o('S09', TIM, '      incremental = false;\n', '', 'timp', 'M30 nu mai readuce G90')
o('S10', TIM, "      ax = 'oprit';\n", '', 'timp', 'axul rămâne pornit după M30')
o('S11', TIM, '      miscare = 1;\n', '', 'timp', 'modul rămâne G0 după M30')
o('S12', TIM, '      racire = false;\n', '', 'timp', 'răcirea rămâne pornită după M30')
o('P01', TIM, 'if (curat.length > 79)', 'if (curat.length > 80)', 'timp', 'linia de 80 de caractere utile trece')
o('P02', TIM, "    if (valoare < 0 && 'FNPST'.includes(litera))", '    if (false)', 'timp', 'valorile negative trec')
o('P03', TIM, " || c === '/') continue;", ') continue;', 'timp', '`/` refuzat, nu ignorat')
o('P04', TIM, 'if (blocuri > plafonBlocuri) {', 'if (blocuri > plafonBlocuri + 1) {', 'timp', 'plafonul cu un bloc mai mare')
o('R07', REZ, "    if (!s.ok) return { ok: false, sursa: 'setari',", "    if (!s.ok) return { ok: false, sursa: 'program',", 'timp', 'greșeala din `$$` atribuită programului')
# ---- `$$` ----
o('M01', MAS, '    const zeroValid = numarSetare === 11;', '    const zeroValid = numarSetare === 12;', 'timp', '$12 = 0 acceptat, $11 = 0 refuzat')
o('M02', MAS, "    if (valori.has(numarSetare)) return { ok: false, motiv: `$${numarSetare} e scris de două ori`, linie: i + 1 };", '',
  'timp', 'setarea dublată trece (ultima câștigă)')
o('M03', MAS, '    if (!existenta && scrise.some(Boolean) && !scrise.every(Boolean)) {', '    if (false) {', 'timp', 'axa A pe jumătate trece')
o('M04', MAS, "  return n === 11 || n === 12 || SETARI_AXE.some(", "  return n === 11 || SETARI_AXE.some(", 'timp', '$12 din $$ ignorat')
# ---- secțiunile și rezumatul ----
o('R01', POS, '            linie: linii.length, ...(mv.element', '            linie: linii.length + 1, ...(mv.element', 'timp', 'secțiunea începe o linie mai jos')
o('R02', POS, '  sectiuni.push({ linie: linii.length });\n', '', 'timp', 'fără secțiunea finalului (retragerea intră în ultima operație)')
o('R03', REZ, '    const p = e.portiuni[k + 1];', '    const p = e.portiuni[k];', 'timp', 'porțiunile decalate cu una')
o('R04', REZ, '  adauga(restul, e.portiuni[0]);\n', '', 'timp', 'pornirea (Z sigur, pauza axului) pierdută din rest')
o('R05', JOB, "element: t.idLume, operatie: `${t.piesa}/${t.operatie}`,", 'element: t.idLume,', 'timp', 'eticheta fără operație')
o('R06', REZ, '    profil = s.profil;', '', 'timp', '`$$` citit, dar neaplicat')
