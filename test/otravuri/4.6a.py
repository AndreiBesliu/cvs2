# Lista de otrăvuri a feliei 4.6↑a (contractele atelierelor: NcStudio, RichAuto, Syntec, Mach3, Mach4; ADR 0125), 02.11.2026,
# alese de autor: postul (compensarea și pornirea sculei, unitatea pauzei, refuzurile RichAuto, deplasarea rapidă despărțită,
# setările în antet, WCS-ul lipsă, pauza din program), contractele (Syntec fără O0001, NcStudio cu G94, Mach3 cu T și M6 pe
# aceeași linie, RichAuto cu elice), numele scurte, iar în aplicație: exportul atelierelor ajuns la sender și inch pe RichAuto.
# Cele din post și contracte trebuie prinse de proba nouă SINGURĂ (setul „posturi”); cele din aplicație, de e2e.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PO = 'src/post/post.ts'
EX = 'src/post/export.ts'
K = 'src/post/contracte/'

o('P01', PO, '        for (const l of cuScula(k.scula.compensare, s.numar)) adauga(l);\n', '', 'posturi',
  'după schimbare, fără G43 H (Syntec: lungimea sculei vechi pentru cea nouă)')
o('P02', PO, '  for (const l of cuScula(k.scula.pornire, program.scula.numar)) adauga(l);\n', '', 'posturi',
  'fără T1 M6 la pornire (Syntec: G43 H1 pe scula montată, oricare ar fi ea)')
o('P03', PO, 'String(Math.round(secunde * 1000))', 'String(Math.round(secunde * 100))', 'posturi', 'pauza în ms greșită de zece ori')
o('P04', PO, "    if (k.comentariu === null) throw new EroarePost(`${k.nume} n-are comentarii: ieșirea din foaie confirmată nu se poate scrie în program`);\n",
  '', 'posturi', 'ieșirea din foaie confirmată, pe un contract fără comentarii, fără refuz')
o('P05', PO, '  if (inch && k.unitati.inch === null) throw new EroarePost(`${k.nume} citește programe doar în mm`);\n', '', 'posturi',
  'RichAuto primește inch, fără cuvântul unităților')
o('P06', PO, 'doc.z === undefined || Z >= doc.z ? [z, xy] : [xy, z]', 'doc.z === undefined || Z >= doc.z ? [xy, z] : [z, xy]', 'posturi',
  'deplasarea despărțită în ordinea întoarsă (coboară întâi, apoi merge în XY)')
o('P07', PO, 'if (k.rapidaSeparata && Z !== undefined', 'if (!k.rapidaSeparata && Z !== undefined', 'posturi',
  'deplasarea despărțită pe familia GRBL, nedespărțită pe Syntec')
o('P08', PO, '  for (const s of k.setari) comentariu(`controler: ${s}`);\n', '', 'posturi', 'setările controlerului lipsă din antet')
o('P09', PO, '  if (k.wcs !== null) adauga(k.wcs);\n  for (const l of cuScula(k.scula.compensare, program.scula.numar)) adauga(l);',
  "  adauga(k.wcs ?? 'G54');\n  for (const l of cuScula(k.scula.compensare, program.scula.numar)) adauga(l);", 'posturi',
  'RichAuto primește G54 (contractul: WCS-ul activ pe controler)')
o('P10', PO, '        if (p === null) throw new EroarePost(`${k.nume} n-are o pauză documentată (G4): programul nu poate aștepta ${mv.secunde} s`);\n',
  '        if (p === null) break;\n', 'posturi', 'pauza din program sărită în tăcere pe RichAuto')
o('P11', K + 'syntec.ts', "  inceput: ['%', 'O0001'],", "  inceput: ['%'],", 'posturi', 'Syntec fără numărul de program')
o('P12', K + 'ncstudio.ts', "  antet: ['G90 G17 {unitati}', 'G40 G49 G80'],", "  antet: ['G90 G17 {unitati} G94', 'G40 G49 G80'],", 'posturi',
  'NcStudio cu G94, care nu e în lista lui de coduri')
o('P13', K + 'mach3.ts', "    schimbare: ['T{n}', 'M6'], pornire: [], compensare: [],", "    schimbare: ['T{n} M6'], pornire: [], compensare: [],", 'posturi',
  'Mach3 cu T și M6 pe aceeași linie')
o('P14', K + 'richauto.ts', '  elice: false,', '  elice: true,', 'posturi', 'RichAuto scrie elicea (nicio sursă n-o pomenește)')
o('P15', EX, '  if (contract.numeScurt) {', '  if (!contract.numeScurt) {', 'posturi', 'numele scurte pe toate posturile, cele lungi pe RichAuto')
o('A01', 'src/app/App.tsx', '        setUltimulExport(r.sender ? fisiere.map(({ octeti, sha256, nume }) => ({ octeti, sha256, nume })) : null);',
  '        setUltimulExport(fisiere.map(({ octeti, sha256, nume }) => ({ octeti, sha256, nume })));', 'e2e',
  'exportul NcStudio ajunge în panoul mașinii')
o('A02', 'src/jobs/calculCam.ts', 'sender: contract.senderAplicatie,', 'sender: true,', 'e2e', 'workerul spune „sender” pe orice post')
o('A03', 'src/ui/DialogExport.tsx', "              {postAles?.inch !== false && <option value=\"inch\">{t('export.unitati.inch')}</option>}",
  "              <option value=\"inch\">{t('export.unitati.inch')}</option>", 'e2e', 'inch oferit pe RichAuto')


# ---- Seturile ----
E2E = ['test/e2e/export.spec.ts']

SETURI = {
    'posturi': ['test/unit/post.contracte.ateliere.test.ts'],
    'posturi2': ['test/unit/post.contracte.ateliere.test.ts', 'test/unit/post.contracte.test.ts', 'test/unit/post.grbl.test.ts',
                 'test/unit/coduri.test.ts', 'test/unit/cam.bazin.test.ts'],
}
