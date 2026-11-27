# Lista de otrăvuri a feliei 16.A↑f-3 (profilul desenat în proiect; ADR 0304 §1, §5), 27.11.2026, aleasă de autor: punctele
# profilurilor parametrice (abaterea, treapta, felurile), copia pentru document și felurile cu CAM, regula formei de pe rând,
# identitatea frezei pe T, regula ferestrei, forma citită din rând, copia de readus, nota bibliotecii, ce scrie Exportă și, în
# fereastră, forma din document, refuzul pe exterior și diametrul doar de citit. Se rulează cu `scripts/otravuri.py`
# (docs/otravuri.md), dintr-o clonă, după commit (setul `e2e` cere `.tmp/pw.config.ts` în clonă).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PF = 'src/model/profilFreza.ts'
FZ = 'src/model/freza.ts'
FF = 'src/model/formaFrezei.ts'
ER = 'src/ui/exportRand.ts'
VO = 'src/app/valoriOperatii.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'

# ── Modelul ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('H01', PF, "  const tinta = ABATERE_PROFIL * 0.9;", "  const tinta = ABATERE_PROFIL * 3;", 'm', 'arcele împărțite prea rar: abaterea peste 0,001 mm')
o('H02', PF, "    rez.push([r0 > rl ? r0 : rl + PAS_TREAPTA, h]);", "    rez.push([r0 > rl ? r0 : rl, h]);", 'm',
  'treapta verticală a ogee-ului roman lăsată verticală (r nu crește strict)')
o('H03', PF, "export const FELURI_PROFIL = ['rotunjire', 'ogee', 'ogee-roman', 'panou'] as const;",
  "export const FELURI_PROFIL = ['rotunjire', 'ogee', 'ogee-roman'] as const;", 'm', 'panoul ridicat fără puncte')
o('H04', FZ, "export const FELURI_CU_CAM = ['plata', 'v', 'gravare', 'bila', 'toroidala', 'rotunjire', 'ogee', 'ogee-roman', 'panou'] as const;",
  "export const FELURI_CU_CAM = ['plata', 'v', 'gravare', 'bila', 'toroidala'] as const;", 'm', 'profilurile rămân „în curând”')
o('H05', FZ, "  if (puncte !== null) return { ...baza, forma: { tip: 'profil', puncte } };\n", '', 'm',
  'copia unui profil pentru document fără siluetă (o plată)')
# ── Fereastra (partea pură) ──────────────────────────────────────────────────────────────────────────────────────────
o('H06', FF, "forma.tip === 'toroidala' || forma.tip === 'profil';\n}", "forma.tip === 'toroidala';\n}", 'm',
  'rândul nu poartă profilul: Tăierea nu-l oferă pe canelură')
o('H07', FF, "&& f.scula.forma?.tip !== 'toroidala' && f.scula.forma?.tip !== 'profil')));", "&& f.scula.forma?.tip !== 'toroidala')));", 'm',
  'operația cu profilul pe o freză de rest primește rând (Exportă l-ar face plată)')
o('H08', ER, "    return b.tip === 'profil' && a.puncte.length === b.puncte.length\n      && a.puncte.every(([r, h], i) => egal(r, b.puncte[i]![0]) && egal(h, b.puncte[i]![1]));",
  "    return b.tip === 'profil';", 'm', 'două siluete luate drept aceeași freză (același T)')
o('H09', ER, "  return motivProfilRand(p) === null;", "  return true;", 'm',
  'fereastra lasă profilul în buzunar și pe o parte peste înălțimea lui (ancora mutată în 16.A↑f-4)')
o('H10', ER, "  if (p.formaScula === 'profil') return p.profil !== undefined && p.profil.length >= 2 ? { tip: 'profil', puncte: p.profil } : undefined;",
  "  if (p.formaScula === 'profil') return null;", 'm', 'rândul cu profil scrie o freză plată')
o('H11', ER, "  if (loc.forma?.tip === 'profil') return null;\n", '', 'm', 'un profil pus înapoi în bibliotecă fără felul lui')
o('H12', ER, "      rez.push({ camp: 'silueta', aici: pa.puncte[pa.puncte.length - 1]![1], acolo: pb.puncte[pb.puncte.length - 1]![1] });",
  "      void 0;", 'm', 'nota bibliotecii nu vede silueta schimbată')
o('H13', VO, "nume: aceeasi ? o.nume : numeMana, forma: { ...(vechiul ?? {}), tip: 'profil', puncte } }",
  "nume: numeMana, forma: { ...(vechiul ?? {}), tip: 'profil', puncte } }", 'm', 'Exportă fără schimbare redenumește freza profilată')
o('H14', VO, "forma: { ...(vechiul ?? {}), tip: 'profil', puncte } }", "forma: { tip: 'profil', puncte } }", 'm',
  'Exportă pierde câmpurile necunoscute ale formei profilate')
# ── Fereastra (e2e) ──────────────────────────────────────────────────────────────────────────────────────────────────
o('H15', EC, "  if (f?.tip === 'profil') return { forma: { tip: 'profil', puncte: f.puncte } };\n", '', 'e2e',
  'fereastra redeschisă nu citește profilul din document')
o('H16', DE, "    rotunda: p !== undefined && rotundaPermisa(p) && profilPermis(p),", "    rotunda: p !== undefined && rotundaPermisa(p),", 'e2e',
  'pe exterior, profilul nu oprește exportul')
o('H17', FO, "            readOnly={p.formaScula === 'profil'} ", "            readOnly={false} ", 'e2e', 'diametrul profilului se poate schimba de mână')

SETURI = {
    'm': ['test/unit/profil.document.test.ts', 'test/unit/export.profil.test.ts', 'test/unit/freza.test.ts', 'test/unit/profil.lucrare.test.ts'],
}

E2E = ['test/e2e/export.profil.spec.ts']
