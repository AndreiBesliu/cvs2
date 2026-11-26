# Lista de otrăvuri a feliei 18.1↑d-4 (rândul editabil al reliefului în fereastra exportului; ADR 0315), 26.11.2026, alese de
# autor: scrierea în operație (`operatieReliefDinDialog`), câmpurile greșite și perechile (`exportRelief.ts`), grupurile
# (`exportGrupuri.ts`), fereastra (`DialogExport.tsx`: verificarea, perechile, greșeala în grupul ei, valorile date la Exportă,
# „Du-mă la …”), fișa (`FisaFinisare.tsx`: pasul folosit, notele) și scrierea din aplicație (`ExportConectat.tsx`). Cele pure,
# prinse de probele unitare; cele ale ferestrei, de e2e (`relief.export.spec.ts`). Plus un martor, care trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


VO = 'src/app/valoriOperatii.ts'
ER = 'src/ui/exportRelief.ts'
EG = 'src/ui/exportGrupuri.ts'
DE = 'src/ui/DialogExport.tsx'
FF = 'src/ui/FisaFinisare.tsx'
EC = 'src/app/ExportConectat.tsx'

o('E00', ER, "/** Valorile citite ale rândului, sau `null` cât un câmp nu se citește (fereastra oprește atunci Exportă). */",
  "/** Valorile citite ale rândului, sau `null` cât un câmp nu se citește (fereastra oprește atunci Exportă).  */", 'unit',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('E01', VO, "  if (r.pasLateral !== v.pasLateral) r = { ...r, pasLateral: v.pasLateral };", "  if (false) r = { ...r, pasLateral: v.pasLateral };", 'unit',
  'Exportă nu scrie pasul lateral schimbat')
o('E02', VO, "    : s.forma?.tip === 'v' && s.forma.unghi === formaNoua.unghi && (s.forma.varf ?? 0) === (formaNoua.varf ?? 0);",
  "    : s.forma?.tip === 'v' && s.forma.unghi === formaNoua.unghi;", 'unit', 'un vârf schimbat al V-ului nu se scrie')
o('E03', VO, "  } else if (s.numar !== v.scula.numar) scula = { ...s, numar: v.scula.numar };",
  "  } else if (s.numar !== v.scula.numar) scula = { numar: v.scula.numar, nume: s.nume, diametru: s.diametru, ...(s.forma ? { forma: s.forma } : {}) };", 'unit',
  'alt T pierde originea frezei din bibliotecă')
o('E04', VO, "  const ch: SchimbareFinisare = { ...comun, ...(nealiniat === v.aliniat ? { nealiniat: v.aliniat ? null : true } : {}) };",
  "  const ch: SchimbareFinisare = { ...comun, ...(nealiniat === v.aliniat ? { nealiniat: v.aliniat ? true : null } : {}) };", 'unit',
  'liniile aliniate scrise invers')
o('E05', VO, "    const ch: SchimbareDegrosare = { ...comun, ...(c?.adaos !== v.adaos ? { adaos: v.adaos } : {}) };",
  "    const ch: SchimbareDegrosare = { ...comun };", 'unit', 'adaosul degroșării nu se scrie')
o('E06', VO, "    if (formaNoua === null) scula = { numar: v.scula.numar, nume: 'freza plata', diametru: v.scula.diametru };",
  "    if (formaNoua === null) scula = { ...s, numar: v.scula.numar, nume: 'freza plata', diametru: v.scula.diametru };", 'unit',
  'freza plată cu alt diametru își păstrează originea și forma veche')
o('E07', ER, "  if (!inMargini(r.pasLateral, MARGINI_OPERATIE.pasLateral) || (dBun && d !== null && s !== null && s > d)) rez.push('pas-lateral');",
  "  if (!inMargini(r.pasLateral, MARGINI_OPERATIE.pasLateral)) rez.push('pas-lateral');", 'unit',
  'pasul lateral peste diametrul frezei trece de fereastră (lucrarea îl refuză abia la Exportă)')
o('E08', ER, "  if (r.fel === 'degrosare' && !inMarginiCuZero(r.adaos, MARGINI_OPERATIE.adaos)) rez.push('adaos');",
  "  if (!inMarginiCuZero(r.adaos, MARGINI_OPERATIE.adaos)) rez.push('adaos');", 'unit', 'adaosul judecat și pe finisare')
o('E09', ER, "  return x !== null && Number.isFinite(x) && x >= 0 && x <= plafon;", "  return x !== null && Number.isFinite(x) && x > 0 && x <= plafon;", 'unit',
  'adaosul 0 și planul zero 0 refuzate')
o('E10', ER, "  if (!((u) => u !== null && Number.isFinite(u) && u >= 0 && u < 180)(citesteNumar(r.unghi))) rez.push('unghi');",
  "  if (!((u) => u !== null && Number.isFinite(u) && u >= 0 && u <= 180)(citesteNumar(r.unghi))) rez.push('unghi');", 'unit', 'unghiul de 180° trece')
o('E11', ER, "    for (const k of perechi.get(cheie) ?? []) {", "    for (const k of [] as string[]) {", 'unit',
  'marginea și planul zero nu ajung pe perechea rândului')
o('E12', ER, "    ...(p.margine !== undefined ? { margine: p.margine } : {}), ...(p.z !== undefined ? { z: p.z } : {}),",
  "    ...(p.margine !== undefined ? { margine: p.margine } : {}), ...(p.z !== undefined ? { z: p.z } : {}), ...(p.pasLateral !== undefined ? { pasLateral: p.pasLateral } : {}),",
  'unit', 'și pasul lateral ajunge pe pereche')
o('E13', ER, "  if (r.fel === 'finisare' && r.formaScula === 'bila') forma = { tip: 'bila' };", "  if (r.formaScula === 'bila') forma = { tip: 'bila' };", 'unit',
  'degroșarea primește bila')
o('E14', EG, "  finisare: ['freza-relief', 'linii', 'margine', 'podea'],", "  finisare: ['freza-relief', 'linii', 'adaos', 'margine', 'podea'],", 'unit',
  'finisarea are grupul adaosului')
o('E15', DE, "    && supracursaBuna && numeBun && aerBun && gauriBune && reliefBun;", "    && supracursaBuna && numeBun && aerBun && gauriBune;", 'e2e',
  'un rând greșit al reliefului nu oprește Exportă')
o('E16', DE, """        }), 'linii'];
        case 'adaos':""", """        }), 'podea'];
        case 'adaos':""", 'e2e', 'greșeala pasului lateral în alt grup decât al liniilor')
o('E17', DE, "    setParamRelief((v) => cuPerechile(v, perechiRelief, cheie, p));", "    setParamRelief((v) => cuPerechile(v, new Map(), cheie, p));", 'e2e',
  'fereastra nu scrie marginea pe pereche')
o('E18', EC, "          const vr = c.valoriRelief?.get(cheie);", "          const vr = undefined as ReturnType<NonNullable<typeof c.valoriRelief>['get']>;", 'e2e',
  'Exportă nu scrie valorile reliefului în proiect')
o('E19', DE, "valoriRelief: valoriReliefToate(),", "valoriRelief: new Map(),", 'e2e', 'fereastra nu dă valorile reliefului la Exportă')
o('E20', DE, "                    : dupaCheie.get(primaGresita)?.descriere ?? finisareDupaCheie.get(primaGresita)?.descriere ?? primaGresita })}",
  "                    : dupaCheie.get(primaGresita)?.descriere ?? primaGresita })}", 'e2e', '„Du-mă la …” spune cheia rândului reliefului')
o('E21', FF, "  const k = aliniate && s !== null && s > 0 && celula !== undefined && celula > 0 ? celuleAliniate(s, celula) : null;",
  "  const k = aliniate && s !== null && s > 0 && celula !== undefined && celula > 0 ? celuleAliniate(s, celula) + 1 : null;", 'e2e',
  'nota pasului folosit spune alt număr de celule decât lucrarea')
o('E22', FF, "  const aliniate = (deg || r.aliniat) && (u === 0 || u === 90) && !rau('pas-lateral');", "  const aliniate = (deg || r.aliniat) && (u === 0 || u === 90);", 'e2e',
  'nota pasului folosit rămâne cu pasul greșit')
o('E23', DE, "    if (paramRelief[cheie]) return motiveRelief(cheie);", "    if (paramRelief[cheie]) return [];", 'e2e',
  'greșelile rândului reliefului nu se spun (nici marcajul din listă, nici „Du-mă la …”)')


# ---- Seturile ----
SETURI = {
    'unit': ['test/unit/export.relief.test.ts', 'test/unit/export.grupuri.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.export.spec.ts']
