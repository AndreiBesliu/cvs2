# Lista de otrăvuri a feliei 28.1↑d (tăierea din butoane mari a Atelierului; ADR 0250, planșa „C · Întunecat”), 18.11.2026,
# alese de autor: − / + (pasul, rotunjirea, oprirea înainte de zero), freza comună, numele rolului cu majusculă, acțiunea
# „Trimite la mașină” și starea ei, felul tăierii în datele aranjamentului și verificarea lui, ușa din manual; în aplicație,
# butoanele doar în Atelier, rolul apăsat, − / + oprite cu motivul lor, cartela care deschide exportul, „Trimite la mașină”
# până în Mașina (și „Exportă” pentru un controler pe care senderul nu-l vorbește), motivul scris, butoanele lipite de
# marginea panoului, numele rolurilor întregi, tăierea prima în panou.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.9` și configul local (`.tmp/pw.config.ts`, portul 4182 al worktree-ului `aranjamente`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TB = 'src/app/taiereButoane.ts'
AE = 'src/ui/actiuniExport.ts'
AR = 'src/ui/aranjament.ts'
AT = 'src/ui/aranjamentAtelier.ts'
MR = 'docs/manual/ro.md'
AP = 'src/app/App.tsx'
DE = 'src/ui/DialogExport.tsx'
PP = 'src/app/PanouProprietati.tsx'
CS = 'src/ui/atelier.css'

# Calculul, acțiunea și datele (unitare).
o('U01', TB, '  return x > 0 ? x : null;\n', '  return x;\n', 'taiere', '− ajunge la zero')
o('U02', TB, 'Math.round((valoare + semn * PAS_PLUS_MINUS) * 1000) / 1000', 'valoare + semn * PAS_PLUS_MINUS', 'taiere',
  'zecimalele lungi ale virgulei mobile ajung în document')
o('U03', TB, 'u: x.forma?.unghi ?? null, ', '', 'taiere', 'două freze V cu unghiuri diferite par aceeași')
o('U04', TB, '  return text.charAt(0).toLocaleUpperCase(limba) + text.slice(1);\n', '  return text;\n', 'taiere',
  'numele rolului rămâne cu literă mică')
o('U05', AE, "eticheta: 'actiune.trimite-masina', capabilitate: 'export-gcode', activa: deExportat,",
  "eticheta: 'actiune.trimite-masina', capabilitate: 'export-gcode', activa: () => true,", 'taiere',
  '„Trimite la mașină” activ pe o foaie goală')
o('U06', AR, "  if (!cunoscut(TAIERI, a.taierea)) probleme.push(`tăierea „${String(a.taierea)}” nu există`);\n", '', 'taiere',
  'un fel de tăiere necunoscut trece de verificare')
o('U07', AT, "  taierea: 'butoane',\n", "  taierea: 'lista',\n", 'taiere', 'Atelierul pierde tăierea din butoane')
o('U08', MR, '%% capitol: atelier\n%% acopera: export.trimite\n', '%% capitol: atelier\n', 'manual',
  '„Trimite la mașină” nu e în manual')
# Panoul și fereastra exportului (e2e, `atelier.taiere.spec.ts`).
o('E01', AP, '              taierea={aranjament.taierea}\n', "              taierea=\"butoane\"\n", 'e2e', 'și Insulele primesc butoanele')
o('E02', AP, '        if (trimiteLaMasina.current && r.sender) {\n          duInMasina();\n          return;\n        }\n', '', 'e2e',
  '„Trimite la mașină” se oprește în fereastra exportului')
o('E03', AP, "      trimiteLaMasina.current = id === 'export.trimite';\n", '      trimiteLaMasina.current = true;\n', 'e2e',
  '„Exportă G-code” trimite și el, după o trimitere')
o('E04', DE, '  const trimiteAcum = trimite && postAles?.sender !== false;\n', '  const trimiteAcum = trimite;\n', 'e2e',
  'butonul spune „Trimite la mașină” și pentru NcStudio')
o('E05', PP, 'aria-pressed={personalComun === null && rolComun === r}', "aria-pressed={r === 'exterior'}", 'e2e',
  'butonul apăsat nu urmează rolul piesei')
o('E06', PP, 'disabled={doarCitire || plusMinus(valoare, semn) === null}', 'disabled={doarCitire}', 'e2e',
  '− / + rămân pornite fără de la ce porni')
o('E07', PP, "        {...(motiv ? { title: motiv } : {})} onClick={() => { apasaPlus(c, valoare, semn); }}>{semnVazut}</button>",
  "        onClick={() => { apasaPlus(c, valoare, semn); }}>{semnVazut}</button>", 'e2e', '− / + oprite, fără motiv')
o('E08', PP, '      {!trimite.ok && <p className="prop-nota" data-motiv="trimite">{t(trimite.motiv)}</p>}\n', '', 'e2e',
  '„Trimite la mașină” oprit, fără motivul scris')
o('E09', PP, 'data-buton="trimite" disabled={!trimite.ok}', 'data-buton="trimite"', 'e2e', '„Trimite la mașină” pornit pe o foaie goală')
o('E10', CS, '  position: sticky;\n  bottom: calc(-1 * var(--sp-3));\n', '', 'e2e',
  '„Trimite la mașină” iese din panou când acesta se derulează')
o('E11', CS, "button:is([data-rol^='incrustatie'], [data-rol^='p:']) {\n  grid-column: span 3;",
  "button:is([data-rol^='incrustatie'], [data-rol^='p:']) {\n  grid-column: span 2;", 'e2e',
  'incrustațiile, în a treia parte de rând: cuvinte rupte')
o('E12', PP, '      {butoane && taiere}\n', '', 'e2e', 'Atelierul pierde tăierea')
o('E13', PP, "title={t('prop.atelier.schimba.titlu')} onClick={onEditeazaOperatii}>", "title={t('prop.atelier.schimba.titlu')}>",
  'e2e', '„Schimbă” nu deschide exportul')

SETURI = {
    'taiere': ['test/unit/taiereButoane.test.ts', 'test/unit/aranjament.test.ts', 'test/unit/aranjamentAtelier.test.ts'],
    'manual': ['test/unit/manual.test.ts'],
}
E2E = ['test/e2e/atelier.taiere.spec.ts']
