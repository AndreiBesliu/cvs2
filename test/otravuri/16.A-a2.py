# Lista de otrăvuri a feliei 16.A↑a-2 (frezele standard puse singure în bibliotecă; ADR 0300 §3, precizarea din 24.11),
# alese de autor: id-urile și punerea setului (doar cele care lipsesc, numele libere), depozitul (o dată, steagul ținut,
# biblioteca cu freze, butonul), sincronizarea (doar un cont fără freze, doar cu scriere), fereastra și panoul (citirea
# setului, întrebarea după prima trecere, biblioteca panoului).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


F = 'src/model/freza.ts'
M = 'src/app/frezeMele.ts'
S = 'src/app/frezeSincronizare.ts'
ST = 'src/app/frezeStandard.ts'
W = 'src/app/FrezeleMele.tsx'
P = 'src/app/PanouProprietati.tsx'

# Modelul (unitare: `freza.test.ts`).
o('F01', F, '    if (rez.some((f) => f.id === s.id)) continue;\n', '', 'model', 'o freză standard care e deja se pune din nou')
o('F02', F, "    const r = cuFreza(rez, null, { ...s, nume: numeLiber(s.nume, rez, rezervate) }, () => s.id, acum, rezervate);",
  "    const r = cuFreza(rez, null, { ...s, nume: numeLiber(s.nume, rez, rezervate) }, () => `x${rez.length}`, acum, rezervate);", 'model',
  'id-urile nu mai sunt cele fixe')
o('F03', F, "    const r = cuFreza(rez, null, { ...s, nume: numeLiber(s.nume, rez, rezervate) }, () => s.id, acum, rezervate);",
  "    const r = cuFreza(rez, null, { ...s }, () => s.id, acum, rezervate);", 'model', 'un nume luat de altă freză nu primește „(2)” (freza se sare)')
o('F04', F, "export const ID_PORNIRE: readonly string[] = ['std-plata-3175', 'std-plata-6',",
  "export const ID_PORNIRE: readonly string[] = ['std-plata-3175', 'std-plata-3175',", 'model', 'două freze standard cu același id')

# Depozitul (unitare: `frezeMele.test.ts`).
o('M01', M, "        if (primaData && c.extra['standard'] === true) return null;\n", '', 'depozit', 'setul se pune la fiecare deschidere')
o('M02', M, '        const pune = !primaData || (c.freze.length === 0 && c.brute.length === 0);', '        const pune = true;', 'depozit',
  'o bibliotecă cu freze primește și setul')
o('M03', M, "        return { citita: { ...c, freze: r.lista, extra: { ...c.extra, standard: true } }, adaugate: r.adaugate };",
  "        return { citita: { ...c, freze: r.lista }, adaugate: r.adaugate };", 'depozit', 'steagul nu se ține: una ștearsă revine')
o('M04', M, "      standard: c.extra['standard'] === true,", '      standard: false,', 'depozit', 'starea nu spune că setul a fost hotărât')

# Sincronizarea (unitare: `frezeSincronizare.test.ts`).
o('S01', S, "    if (standard && !b.stare().standard && poateScrie) await b.puneStandard(pana === 0 ? standard() : [], true);",
  "    if (standard && !b.stare().standard && poateScrie) await b.puneStandard(standard(), true);", 'sincron',
  'un cont cu frezele șterse le primește din nou')
o('S02', S, "    if (standard && !b.stare().standard && poateScrie) await b.puneStandard(pana === 0 ? standard() : [], true);",
  "    if (standard && !b.stare().standard) await b.puneStandard(pana === 0 ? standard() : [], true);", 'sincron',
  'un cont doar de citit le primește (și rămân doar aici)')

# Fereastra și panoul (Edge: `freze.spec.ts`, `frezeTaiere.spec.ts`; pe emulatoare: `freze.emulator.spec.ts`).
o('E01', ST, "    await b.puneStandard(frezeleStandard(limba() === 'ro'), true);", "    await b.puneStandard(frezeleStandard(true), true);", 'e2e',
  'numele frezelor standard mereu în română')
o('E02', W, '    void cuFrezeleStandard();\n', '', 'e2e', 'fereastra nu pune setul (doar panoul)')
o('E03', P, '    void cuFrezeleStandard();\n', '', 'e2e', 'panoul nu pune setul: fără fereastră, rândul „Freza” lipsește')
o('E04', W, '    void biblioteca.puneStandard(frezeleStandard(ro), false).then((r) => {', '    void biblioteca.puneStandard(frezeleStandard(ro), true).then((r) => {', 'e2e',
  'butonul unei biblioteci golite nu mai pune nimic')

SETURI = {
    'model': ['test/unit/freza.test.ts'],
    'depozit': ['test/unit/frezeMele.test.ts'],
    'sincron': ['test/unit/frezeSincronizare.test.ts'],
}
E2E = ['test/e2e/freze.spec.ts', 'test/e2e/frezeTaiere.spec.ts']
# Cele pe emulatoare (sincronizarea din fereastră, întrebarea): `test/otravuri/16.A-a2-emu.py`.
