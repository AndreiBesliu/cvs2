# Lista de otrăvuri a feliei 28.8↑f-2 (Rezultatul pe grupuri, ADR 0290), 24.11.2026, alese de autor: ordinea grupurilor,
# avertismentele ascunse sau mutate, timpul și avertismentele din rândul listei, punctul lor, titlurile grupurilor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; toate „e2e” (cer build-ul).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DLG = 'src/ui/DialogExport.tsx'

o('E01', DLG, "{stare?.ok && (stare.avertismente.length > 0 || (undeTine.length > 0 && !doarCitire)) && (",
  "{stare?.ok && false && (", 'e2e', 'avertismentele nu se mai arată')
o('E02', DLG, "data-avertisment={stare?.ok && stare.avertismente.length > 0 ? '' : undefined}", 'data-avertisment={undefined}', 'e2e',
  'rândul Rezultatului fără punctul avertismentelor')
o('E03', DLG, "...(stare.rezumat.ok ? [durata(stare.rezumat.total.secunde, limba)] : []),", '', 'e2e', 'rândul Rezultatului fără timp')
o('E04', DLG, "[t('export.rezultat.meta.avertismente', { n: stare.avertismente.length })]", "[t('export.rezultat.meta.avertismente', { n: 1 })]",
  'e2e', 'rândul Rezultatului numără mereu un avertisment')
o('E05', DLG, "...(stare.avertismente.length > 0 ? [t(", "...(stare.avertismente.length >= 0 ? [t(", 'e2e',
  'rândul Rezultatului spune avertismente și când nu sunt')
o('E06', DLG, '                {stare?.ok && <div className="dx-rez" data-rezultat="timp"><Rezumat r={stare.rezumat} operatii={operatii} limba={limba} /></div>}\n'
  '                {stare?.ok && <div className="dx-rez" data-rezultat="simulare"><PrevizualizareSimulare s={stare.simulare} limba={limba} /></div>}\n',
  '                {stare?.ok && <div className="dx-rez" data-rezultat="simulare"><PrevizualizareSimulare s={stare.simulare} limba={limba} /></div>}\n'
  '                {stare?.ok && <div className="dx-rez" data-rezultat="timp"><Rezumat r={stare.rezumat} operatii={operatii} limba={limba} /></div>}\n',
  'e2e', 'simularea înaintea timpului')
o('E07', DLG, "                  <h4>{t('export.rezultat.fisiere')}</h4>\n", '', 'e2e', 'fișierele fără titlul lor')

SETURI = {}
E2E = ['test/e2e/export.fisa.spec.ts']
