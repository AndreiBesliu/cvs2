# Lista de otrăvuri a feliei 28.1↑c (Atelierul pe Proiectare, așezarea; ADR 0250 §1, §3, §5, §7), 17.11.2026, alese de autor:
# datele Atelierului (nimic pierdut față de Insule, panourile în dreapta), aranjamentele build-ului și încărcarea lor, bucata
# cu CSS-ul ei, așteptarea ei înaintea primei randări și căderea pe Insule fără ea, prima alegere (întunecat, butoane mari),
# Renunță, motivul din fereastră, numele uneltelor ascunse în Insule, rândul de jos de sub 1024 px, locul rezervat al coloanei
# și potrivirea foii după sosirea modulului editării.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.9` și configul local (`.tmp/pw.config.ts`, portul 4182 al worktree-ului `aranjamente`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AT = 'src/ui/aranjamentAtelier.ts'
IN = 'src/ui/incarcaAranjament.ts'
BU = 'src/ui/atelier.ts'
CS = 'src/ui/atelier.css'
MA = 'src/app/main.tsx'
AP = 'src/app/App.tsx'
AS = 'src/app/Aspectul.tsx'
RI = 'src/canvas/rigle.css'

# Datele și încărcarea (unitare).
o('C01', IN, "  atelier: () => import('./atelier.ts').then((m) => m.ARANJAMENT_ATELIER),\n", '', 'atelier', 'Atelierul lipsește din build')
o('C02', AT, "{ actiune: 'import.svg' }, { control: 'vectori' }, ", "{ actiune: 'import.svg' }, ", 'atelier', 'Atelierul pierde exportul vectorilor')
o('C03', AT, "docuri: { stanga: [], dreapta: ['proprietati', 'lista'] }", "docuri: { stanga: ['lista'], dreapta: ['proprietati'] }", 'atelier',
  'lista stă în stânga, peste coloana uneltelor')
o('C04', IN, 'return f ? f() : Promise.reject(', 'return f ? f() : Promise.resolve(ARANJAMENT_MODERN) ?? Promise.reject(', 'atelier',
  'un aranjament lipsă dă Insule în loc să fie refuzat')
# Bucata, pornirea și fereastra (e2e, `atelier.spec.ts`).
o('E01', BU, "import './atelier.css';\n", '', 'e2e', 'bucata vine fără CSS-ul ei')
o('E02', MA, '  const [proiect, aranjament] = await Promise.all([deschideProiect(), aranjamentGata]);\n',
  '  const proiect = await deschideProiect();\n  const aranjament = ARANJAMENT_MODERN;\n  void aranjamentGata;\n', 'e2e',
  'pornirea nu așteaptă aranjamentul ales')
o('E03', MA, "  document.documentElement.dataset['aranjament'] = ARANJAMENT_MODERN.id;\n  return ARANJAMENT_MODERN;\n", '  return ARANJAMENT_MODERN;\n', 'e2e',
  'fără bucată, `<html>` spune tot Atelier')
o('E04', AS, "      if (primaAtelier && tema !== 'intunecata') onTema('intunecata');\n", '', 'e2e', 'prima alegere nu e întunecată')
o('E05', AS, "densitate: primaAtelier ? 'mare' : de.densitate", 'densitate: de.densitate', 'e2e', 'prima alegere fără butoane mari')
o('E06', AS, '    if (alegere.aranjament !== inainte.aranjament) void onAranjament(inainte.aranjament);\n', '', 'e2e',
  'Renunță nu pune Insulele la loc')
o('E07', AS, "        setMesaj(t('aspect.neadus', { nume: t(`aranjament.${id}`) }));\n", '', 'e2e', 'fără bucată, fereastra nu spune de ce')
o('E08', RI, '.nume-unealta {\n  display: none;\n}', '.nume-unealta {\n  display: inline;\n}', 'e2e', 'numele uneltelor se văd și în Insule')
o('E09', CS, "      'centru' minmax(0, 1fr)\n      'unelte' auto\n", "      'unelte' auto\n      'centru' minmax(0, 1fr)\n", 'e2e',
  'sub 1024 px, rândul uneltelor stă deasupra pânzei')
o('E10', CS, '  width: 18.75rem;\n', '', 'e2e', 'locul coloanei nu e rezervat de la pornire')
o('E11', AP, '    mo.observe(ext, { childList: true });\n', '', 'e2e', 'foaia nu se potrivește din nou când vine modulul editării')
o('E12', AP, '    // Zona liberă s-a mutat (alte bare, alte panouri): foaia se potrivește din nou în ea, ca la „Arată toată foaia”.\n'
  '    setCadruPotrivire(null);\n    setPotrivire((n) => n + 1);\n', '', 'e2e', 'schimbat pe loc, foaia rămâne unde era')

SETURI = {
    'atelier': ['test/unit/aranjamentAtelier.test.ts'],
}
E2E = ['test/e2e/atelier.spec.ts']
