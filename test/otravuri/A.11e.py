# Lista de otrăvuri a feliei A.11e (disocierea utilizării unui cont; ADR 0262 §3), 24.11.2026, alese de autor: serverul
# (permisiunea, contul care lipsește, pseudonimul pe loturile care vin, rescrierea celor de până acum, pseudonimul doar pe
# server, a doua oară, auditul fără pseudonim), regula colecției pseudonimelor, modelul contului și pagina (confirmarea,
# dreptul, lista citită din nou).
# Unitarele și serverul se rulează cu `scripts/otravuri.py` (serverul în `firebase emulators:exec`, cu funcțiile); setul
# „e2e”, cu `scripts/otravuri-emulatoare.py`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'functions/src/utilizare/actiuni.ts'
D = 'src/admin/utilizatori/Disocierea.tsx'

o('S01', S, "    if (!drepturi.permisiuni.has('conturi.administreaza')) throw new HttpsError('permission-denied', 'disocierea cere „Conturi: administrează”');\n",
  '', 'server', 'oricine din personal desparte orice cont')
o('S02', S, "    if (!cont.exists) throw new HttpsError('not-found', 'contul nu există');\n", '', 'server', 'un cont care nu există nu e spus ca atare')
o('S03', S, "uid: typeof pseudonim === 'string' && pseudonim !== '' ? pseudonim : uid,", 'uid,', 'server',
  'loturile de după despărțire se scriu tot sub cont')
o('S04', S, '    if (s.empty) break;', '    break;', 'server', 'loturile de până acum rămân sub cont')
o('S05', S, '    tx.update(refCont, { disociatLa: cand });', '    tx.update(refCont, { disociatLa: cand, pseudonim: p });', 'server',
  'pseudonimul ajunge în contul pe care îl citește fila (legătura se poate reface)')
o('S06', S, '    if (disociat.exists) return null;\n', '', 'server', 'a doua despărțire nu e recunoscută ca atare')
o('S07', S, 'inainte: null, dupa: { disociat: true },', 'inainte: null, dupa: { disociat: true, pseudonim: p },', 'server',
  'pseudonimul ajunge în audit')
o('R01', 'firestore.rules', "    // Pseudonimele disocierii (`utilizareDisociate`, felia A.11e): doar ale serverului; nicio regulă, deci refuzate oricui.\n",
  "    match /utilizareDisociate/{uid} {\n      allow read: if eOwner();\n    }\n", 'reguli', 'owner-ul citește legătura cont → pseudonim')

o('U01', 'src/admin/utilizatori/date.ts', "    disociatLa: dataDin(d['disociatLa']),", '    disociatLa: null,', 'utilizatori', 'fila nu știe că un cont e despărțit')

o('E01', D, "onClick={() => { setStare({ faza: 'confirma' }); }}>{t('admin.util.dis.buton')}", "onClick={disociaza}>{t('admin.util.dis.buton')}", 'e2e',
  'despărțirea pleacă fără confirmare')
o('E02', 'src/admin/utilizatori/FilaUtilizatori.tsx', '{poateAdministra ? <Disocierea', '{true ? <Disocierea', 'e2e',
  'despărțirea apare și unui rol care doar citește conturile')
o('E03', D, "(r) => { setStare({ faza: 'gata', loturi: r.loturi }); dupa(); },", "(r) => { setStare({ faza: 'gata', loturi: r.loturi }); },", 'e2e',
  'după despărțire, lista nu se citește din nou: contul nu arată data')

SETURI = {
    'server': ['functions/test/utilizare.emulator.test.ts'],
    'reguli': ['functions/test/reguli.emulator.test.ts'],
    'utilizatori': ['test/unit/admin.utilizatori.test.ts'],
}
E2E = ['test/e2e-emulator/utilizatori.emulator.spec.ts']
GREP = {'E01': 'disocierea', 'E02': 'un rol care doar citește conturile', 'E03': 'disocierea'}
