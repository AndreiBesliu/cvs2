# Lista de otrăvuri a feliei 28.8↑o (centrul foii ca origine XY0, ADR 0291 §6), 25.11.2026, alese de autor: montajul
# (translația, Z0 jos, lista), antetul citit de sender, numele dopului; în fereastră, alegerea din listă și din desen,
# eticheta desenului; nota din panoul Mașina și fraza raportului foilor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


M = 'src/ir/montaj.ts'
G = 'src/machine/program.ts'
C = 'src/jobs/calculCam.ts'
R = 'src/ui/exportRand.ts'
F = 'src/ui/exportDesene.tsx'
P = 'src/app/PanouMasina.tsx'
RF = 'src/app/DialogRaportFoi.tsx'

# Montajul, antetul și numele (proba unitară și oracolele).
o('U01', M, "e: -latime / 2, f: -inaltime / 2, dz:", "e: -latime, f: -inaltime / 2, dz:", 'centru',
  'centrul pe X e marginea din dreapta')
o('U02', M, "e: -latime / 2, f: -inaltime / 2, dz:", "e: -latime / 2, f: 0, dz:", 'centru', 'centrul pe Y e marginea de jos')
o('U03', M, "f: -inaltime / 2, dz: m.z0 === 'jos' ? grosime : 0 };", "f: -inaltime / 2, dz: 0 };", 'centru',
  'cu centrul, Z0 jos nu mai ridică programul cu grosimea')
o('U04', M, "export const ORIGINI: readonly OrigineXY[] = [...COLTURI, 'centru'];", "export const ORIGINI: readonly OrigineXY[] = [...COLTURI];",
  'centru', 'lista originilor fără centru')
o('U05', M, "  if (m.origine === 'centru') return", "  if (m.origine === 'centrul') return", 'centru',
  'centrul tratat ca stânga-jos (nicio translație)')
o('U06', G, "stanga-sus|centru), Z0 (sus|jos),/", "stanga-sus), Z0 (sus|jos),/", 'centru',
  'senderul nu mai citește „origine centru” din antet')
o('U07', C, "/^(cncvs2-(?:[a-z]+-[a-z]+|centru))(.*)$/", "/^(cncvs2-[a-z]+-[a-z]+)(.*)$/", 'centru',
  'dopul unui export cu centrul primește numele în fața celui al foii')

# Fereastra, panoul Mașina și raportul foilor (e2e).
o('E01', R, "export const ORIGINI = [...COLTURI, 'centru'] as const;", "export const ORIGINI = [...COLTURI] as const;", 'e2e',
  'lista ferestrei fără centru')
o('E02', F, ", centru: [133, 91] };", " };", 'e2e', 'desenul fără punctul din centru')
o('E03', F, "{colt === 'centru' ? t('export.desen.colt.ales.centru') : t('export.desen.colt.ales', { colt: nume })}",
  "{t('export.desen.colt.ales', { colt: nume })}", 'e2e', 'desenul spune „în colțul centrul foii”')
o('E04', F, "eticheta={colt === 'centru' ? t('export.desen.colt.centru') : t('export.desen.colt', { colt: nume })}",
  "eticheta={t('export.desen.colt', { colt: nume })}", 'e2e', 'eticheta desenului spune „în colțul centrul foii”')
o('E05', P, "{montaj.origine === 'centru' ? t('masina.origine.centru') : t('masina.origine', { colt: t(`masina.colt.${montaj.origine}`) })}",
  "{t('masina.origine', { colt: t(`masina.colt.${montaj.origine}`) })}", 'e2e', 'panoul Mașina nu spune centrul')
o('E06', RF, "{origine === 'centru' ? t('export.raport.parametri.centru', { z0: t(`export.z0.${z0}`) })",
  "{origine === 'centrul' ? t('export.raport.parametri.centru', { z0: t(`export.z0.${z0}`) })", 'e2e',
  'raportul foilor spune „în colțul centrul foii”')

SETURI = {
    'centru': ['test/unit/montaj.centru.oracol.test.ts', 'test/unit/sender.program.test.ts'],
}
E2E = ['test/e2e/export.centru.spec.ts']
