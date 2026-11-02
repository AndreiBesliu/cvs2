# Lista de otrăvuri a feliei 13.A↑ (meniul global și fereastra Mașina, ADR 0132), 02.11.2026, alese de autor: indicatorul
# lucrării (ordinea alarmei și a întreruperii, procentul plafonat la 99 până la „gata”, butoanele Pauză / Reia, ușa, bariera,
# codul alarmei), lucrarea începută, fereastra ținută în browser, verificarea ferestrelor din aranjament, cipurile globale;
# plus cele de interfață, prin e2e: tastele oprite în Mașina (carcasa și modulul editării), paleta care întoarce la
# Proiectare, confirmarea la închiderea paginii, „Reîncarcă după lucrare”, bara de jos în Mașina, clicul pe indicator,
# „Deschide în Mașina”, Escape și F1 în Mașina.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; cele
# „e2e” cer build-ul (vite și Playwright prin `node`, pe portul din `.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


IN = 'src/machine/indicator.ts'
FE = 'src/app/fereastra.ts'
AR = 'src/ui/aranjament.ts'
APP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
PM = 'src/app/PanouMasina.tsx'
DE = 'src/ui/DialogExport.tsx'

# ---- Indicatorul și lucrarea începută ----
o('I01', IN, "  if (conectat && (st.alarma !== null || f.raport?.stare === 'Alarm')) {",
  "  if (st.alarma !== null || f.raport?.stare === 'Alarm') {", 'unitare', 'alarma și cu legătura căzută (în locul lucrării întrerupte)')
o('I02', IN, "  if (f.faza === 'pierdut') return de('intrerupta', 'rosu');", "  if (conectat && f.faza === 'pierdut') return de('intrerupta', 'rosu');",
  'unitare', 'cablul scos în mijlocul lucrării: indicatorul dispare')
o('I03', IN, 'Math.min(Math.floor((Math.min(f.urm, n) * 100) / n), 99)', 'Math.floor((Math.min(f.urm, n) * 100) / n)', 'unitare',
  '100 % cât mașina încă taie ultimele linii')
o('I04', IN, 'Math.min(Math.floor((Math.min(f.urm, n) * 100) / n), 99)', 'Math.min(Math.round((Math.min(f.urm, n) * 100) / n), 99)', 'unitare',
  'procentul rotunjit în sus')
o('I05', IN, "de('pauza', 'portocaliu', { buton: 'reia' })", "de('pauza', 'portocaliu', { buton: 'pauza' })", 'unitare', 'în Hold, tot Pauză')
o('I06', IN, "    if (f.raport?.stare === 'Door') return de('pauza', 'portocaliu');\n", '', 'unitare', 'ușa de siguranță cu Pauză alături')
o('I07', IN, "{ linie: (f.bariera?.linie ?? 0) + 1 }", "{ linie: f.bariera?.linie ?? 0 }", 'unitare', 'linia barierei numărată de la 0')
o('I08', IN, "f.bariera?.m6 ? 'oprita-m6' : 'oprita'", "f.bariera?.m6 ? 'oprita' : 'oprita-m6'", 'unitare', 'M6 și M0 inversate')
o('I09', IN, "cod: st.alarma?.fel === 'alarma' ? st.alarma.cod : null", "cod: st.alarma?.cod ?? null", 'unitare', 'o blocare fără cod primește un număr')
o('I10', IN, "  if (f.faza === 'terminat') return de('gata', 'neutru', { procent: 100 });", "  if (f.faza === 'terminat') return de('gata', 'neutru');",
  'unitare', 'gata la 99 %')
o('I11', IN, 'export const lucrareInceputa = (f: Faza): boolean => cuPunctDeReluare(f);', 'export const lucrareInceputa = (f: Faza): boolean => inFlux(f);',
  'unitare', 'bariera și suspendarea nu mai țin pagina')

# ---- Fereastra ținută ----
o('F01', FE, '    return ferestre.find((f) => f === v) ?? prima;', '    return (v as F | null) ?? prima;', 'unitare', 'o fereastră necunoscută se deschide')
o('F02', FE, """  try {
    stocare?.setItem(CHEIE_FEREASTRA, f);
  } catch {
    // Fără stocare, următoarea pornire începe cu prima fereastră.
  }""", '  stocare?.setItem(CHEIE_FEREASTRA, f);', 'unitare', 'o stocare plină oprește schimbarea ferestrei')

# ---- Aranjamentul ----
o('A01', AR, "  if (!ferestre.has('proiectare')) probleme.push('fără fereastra „proiectare”: desenul n-ar avea unde sta');\n", '', 'unitare',
  'un aranjament fără Proiectare trece')
o('A02', AR, '  if (ferestre.size > 1 && !cuFile)', '  if (!cuFile)', 'unitare', 'o singură fereastră cere file')
o('A03', AR, "new Set<IdCip>(['proiect', 'config', 'actualizare', 'jurnal'])", "new Set<IdCip>(['proiect', 'config', 'jurnal'])", 'unitare',
  'oferta versiunii noi dispare în Mașina')

# ---- Interfața (e2e) ----
o('E01', APP, "      if (fereastraRef.current !== 'proiectare' && !ORIUNDE.has(id)) return;\n", '', 'e2e', 'Delete și Ctrl+Z ating desenul acoperit')
o('E02', ED, '      if (!activRef.current) return;\n', '', 'e2e', 'uneltele, săgețile și oglindirea ating desenul acoperit')
o('E03', APP, "    if (fereastraRef.current !== 'proiectare' && !ORIUNDE.has(id)) deschideFereastra('proiectare');\n", '', 'e2e',
  'o comandă a desenului din paletă rulează nevăzută, din Mașina')
o('E04', PM, "    window.addEventListener('beforeunload', intreabaLaIesire);\n", '', 'e2e', 'pagina se închide fără întrebare în timpul lucrării')
o('E05', APP, '            {lucrare\n', '            {false\n', 'e2e', '„Reîncarcă” taie lucrarea')
o('E06', APP, "    const intrari = zona === 'jos' && fereastra !== 'proiectare' ? g.intrari.filter((x) => 'cip' in x && CIPURI_GLOBALE.has(x.cip)) : g.intrari;",
  '    const intrari = g.intrari;', 'e2e', 'cipurile pânzei rămân în bara de jos a Mașinii')
o('E07', PM, '      <IndicatorLucrare s={s} st={st} onDeschide={onDeschide} />', '      <IndicatorLucrare s={s} st={st} onDeschide={() => undefined} />', 'e2e',
  'clicul pe indicator nu deschide Mașina')
o('E08', PM, "    setFisierAles(0);\n    void incarca(x.octeti, 'export', x.nume, x.sha256);\n", '    setFisierAles(0);\n', 'e2e',
  '„Deschide în Mașina” nu încarcă programul')
o('E09', PM, "    if (e.key !== 'Escape') return;", "    if (e.key !== 'Esc') return;", 'e2e', 'Escape nu închide formularul WiFi')
o('E10', ED, "  if (!activ) return 'vedere.masina';\n", '', 'e2e', 'F1 în Mașina deschide capitolul uneltei')
o('E11', DE, '        {stare?.ok && onDeschideInMasina && (', '        {onDeschideInMasina && (', 'e2e', '„Deschide în Mașina” înaintea exportului')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    'unitare': u('indicator', 'fereastra', 'aranjament'),
    'unitare2': u('indicator', 'fereastra', 'aranjament', 'manual', 'sender.sesiune', 'sender.flux', 'i18n'),
}
E2E = ['test/e2e/fereastra.spec.ts', 'test/e2e/pwa.spec.ts']
