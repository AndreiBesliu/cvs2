# Sabotajele feliei 3.Tf, numele pluginului: Easy 3Draw (ADR 0167), 05.11.2026: fiecare loc unde omul vede numele (manifestul:
# instalarea, meniul, fereastra, „Trimite la”, „Propus de”; titlul paginii, antetele arhivei CNC și ale listei de printat,
# sfatul filei „Din cvs2”, originea lucrării), numele lăsat netradus, id-ul păstrat și actualizarea care păstrează datele,
# stricat o dată; proba care îl apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - manualul (ro, en): numele din text nu are probă; l-am citit după înlocuire (nicio „Trenuleț” rămasă);
# - ce rămâne „trenulet” cu bună știință (antetul G-code-ului, numele fișierelor și al pachetului): îl apără probele de
#   dinainte (amprentele v18, conținutul pachetului).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MAN = 'extensii/trenulet/extensie.json'
CAP = 'extensii/trenulet/sursa/planificator/head.html'
PLA = 'extensii/trenulet/sursa/planificator/app.ts'
ATE = 'extensii/trenulet/sursa/planificator/atelier.ts'
DIC = 'extensii/trenulet/sursa/planificator/texte.en.json'
TXT = 'scripts/texte-trenulet.ts'
INS = 'src/extensii/Instalare.tsx'

E2E = ['test/e2e/trenulet.spec.ts']

SETURI = {
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}

# manifestul: ce arată cvs2
o('F01', MAN, '"nume": "Easy 3Draw",', '"nume": "Planificator Trenuleț",', 'e2e',
  'cvs2 arată numele vechi: la instalare, în meniu, în fereastră, la „Trimite la” și „Propus de”')
o('F02', MAN, '"versiune": "18.7.0",', '"versiune": "18.6.0",', 'e2e',
  'pachetul cu numele nou poartă versiunea veche')
o('F03', MAN, '"id": "trenulet",', '"id": "easy-3draw",', 'e2e',
  'id-ul se schimbă cu numele: peste 18.6.0, extensia nouă stă alături, fără circuitele de dinainte')
o('F11', INS, '      await scrieExtensia({\n', '      await scoateExtensia(p.manifest.id);\n      await scrieExtensia({\n', 'e2e',
  'o versiune nouă instalată peste cea veche îi șterge datele')
# planificatorul: ce arată pagina și ce trimite
o('F04', CAP, '<title>Easy 3Draw</title>', '<title>Planificator Trenuleț</title>', 'e2e',
  'pagina de sine stătătoare are titlul vechi')
o('F05', PLA, '    de_la: { aplicatie: "Easy 3Draw", versiune: VERSIUNE },', '    de_la: { aplicatie: "Planificator Trenuleț", versiune: VERSIUNE },', 'e2e',
  'lucrarea trimisă la cvs2 vine tot de la „Planificator Trenuleț”')
o('F06', PLA, '    tr("EASY 3DRAW — fișierele pentru CNC"),\n', '    tr("TRENULEȚ — fișierele pentru CNC"),\n', 'engleza',
  'README-ul arhivei CNC are antetul vechi')
o('F07', DIC, '"EASY 3DRAW — fișierele pentru CNC": "EASY 3DRAW — the files for the CNC"',
  '"EASY 3DRAW — fișierele pentru CNC": "TRENULEȚ — the files for the CNC"', 'engleza',
  'traducerea antetului păstrează numele vechi, cu diacritice (scutirea lui „Trenuleț” nu mai există)')
o('F08', ATE, 'tr("PIESE DE PRINTAT — din atelierul 3D din Easy 3Draw")', 'tr("PIESE DE PRINTAT — din atelierul 3D al Planificatorului Trenuleț")', 'engleza',
  'lista de printat are antetul vechi')
o('F09', ATE, 'apasă Trimite la Easy 3Draw: le primești aici', 'apasă Trimite la Planificator Trenuleț: le primești aici', 'engleza',
  'sfatul filei „Din cvs2” numește un buton care nu mai există')
o('F10', TXT, "'RichAuto (DSP)', 'Easy 3Draw', 'La comanda',", "'RichAuto (DSP)', 'La comanda',", 'engleza',
  'numele produsului ajunge în dicționar, de tradus')
