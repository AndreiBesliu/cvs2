# Lista de otrăvuri a feliei 25.9↑ (fereastra trasării, refăcută, ADR 0273), 23.11.2026, alese de autor: partea pură
# („Desenul” după limbă, fără separatorul miilor; alegerile ținute: implicitele, versiunea, valorile străine; cutia căilor cu
# extremele cubicelor), mărimea desenului (corecția scării, plafonul corecțiilor, „Scara” fixă, lățimea imaginii doar în
# modul ei), grupurile (strânse la prima deschidere, Simplu, ținute), sugestia ca buton (schimbă și deschide grupul),
# raportul scurt și Detaliile ținute, „Desenul” la celelalte formate, și așezarea (coloana setărilor derulată singură,
# previzualizarea care crește, telefonul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CL = 'src/ui/fereastraTrasareCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'
DI = 'src/ui/DialogImport.tsx'
ST = 'src/app/stil.css'

# Partea pură.
o('P01', CL, "{ minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }", "{ minimumFractionDigits: 2, maximumFractionDigits: 2 }",
  'calc', '„Desenul: 1.524,00” (separatorul miilor)')
o('P02', CL, "  const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB',", "  const f = new Intl.NumberFormat('en-GB',", 'calc',
  '„Desenul” cu punct și în română')
o('P03', CL, "  deschise: { imagine: false, trasare: true, curatare: false, marime: true },", "  deschise: { imagine: true, trasare: true, curatare: false, marime: true },",
  'calc', 'Imaginea deschisă la prima deschidere')
o('P04', CL, "(x as { readonly v?: unknown }).v !== 1)", "(x as { readonly v?: unknown }).v === undefined)", 'calc',
  'o versiune străină a alegerilor citită ca a ei')
o('P05', CL, "for (const g of GRUPURI) { const v = d[g]; if (typeof v === 'boolean') deschise[g] = v; }",
  "for (const g of GRUPURI) { const v = d[g]; if (v !== undefined) deschise[g] = v as boolean; }", 'calc', 'o valoare străină a unui grup trece')
o('P06', CL, "        if (!(u > 0 && u < 1)) continue;", "        continue;", 'calc', 'cutia fără extremele cubicelor (doar vârfurile)')
o('P07', CL, "      if (c.tip[v] !== 1 || (deschisa && v === b - 1)) continue;", "      if (c.tip[v] !== 1) continue;", 'calc',
  'mânerele ultimului vârf al unei căi deschise intră în cutie')

# Mărimea desenului.
o('M01', FE, "    if (corectii.current >= CORECTII_MAXIME) return;", "    if (corectii.current >= 0) return;", 'e2e',
  'nicio corecție: desenul nu ajunge la mărimea scrisă')
o('M02', FE, "    onSchimba({ latimeMm: raport.latimeMm * (tinta.mm / acum) });", "    onSchimba({ latimeMm: tinta.mm });", 'e2e',
  'mărimea scrisă luată drept lățimea imaginii')
o('M03', FE, "      if (tinute.fix === 'scara') {", "      if (false) {", 'e2e', '„Scara” ține mărimea scrisă, câmpul nu se golește')
o('M04', FE, "if (tinuteAcum.current.marime === 'imagine' && lat !== a.latimeMm", "if (lat !== a.latimeMm", 'e2e',
  'un câmp cu valori schimbat (petele) scoate scara mărimii desenului')
o('M05', FE, "onChange={(e) => { setCiorna({ ...ciorna, desenI: e.target.value, desenL: '' }); setScris({ fel: 'i', text: e.target.value }); }}",
  "onChange={(e) => { setCiorna({ ...ciorna, desenI: e.target.value, desenL: '' }); setScris({ fel: 'l', text: e.target.value }); }}", 'e2e',
  'înălțimea scrisă luată drept lățime')

# Grupurile, Simplu, sugestia, Detaliile.
o('G01', FE, "          {!tinute.simplu && (\n            <GrupSetari id=\"imagine\"", "          {(\n            <GrupSetari id=\"imagine\"", 'e2e',
  'Simplu nu ascunde Imaginea')
o('G02', FE, "    <details className=\"trasare-grup\" data-grup={id} open={deschis} onToggle={(e) => { if (e.currentTarget.open !== deschis) onDeschis(e.currentTarget.open); }}>",
  "    <details className=\"trasare-grup\" data-grup={id} open={deschis}>", 'e2e', 'deschiderea unui grup nu se ține')
o('G03', FE, "onClick={() => { deschide('imagine', true); onSchimba({ lumina: 'neuniforma' }); }}", "onClick={() => { onSchimba({ lumina: 'neuniforma' }); }}",
  'e2e', '„Aplică” nu deschide grupul Imaginea')
o('G04', FE, "              semn={sugestieLumina || sugestieFoaie || sugestieRotire}>", "              semn={sugestieFoaie || sugestieRotire}>", 'e2e',
  'fără semnul sugestiei luminii pe titlul grupului')
o('G05', FE, "if (e.currentTarget.open !== tinute.detalii) tine({ detalii: e.currentTarget.open });",
  "if (e.currentTarget.open !== tinute.detalii) { const d = e.currentTarget.open; setTinute((v) => ({ ...v, detalii: d })); }",
  'e2e', 'Detaliile deschise nu se țin în browser')
o('G06', FE, "<span data-testid=\"trasare-scurt-cai\">{t('import.trasare.scurt.contururi', { n: desen.exterioare + desen.interioare })}</span>",
  "<span data-testid=\"trasare-scurt-cai\">{t('import.trasare.scurt.contururi', { n: desen.exterioare })}</span>", 'e2e', 'raportul scurt numără doar exterioarele')
o('G07', FE, "    ...(alegeri.margine ? [t('import.trasare.rezumat.margine')] : []),", "", 'e2e', 'rezumatul Imaginii nu spune marginea')
o('G08', DI, "      {!imagine && <p data-testid=\"import-marime\">{textMarime(ok.latime, ok.inaltime, limba)}</p>}", "", 'e2e',
  '„Desenul” lipsește la celelalte formate')

# Așezarea.
o('A01', ST, "  min-height: 0;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  padding-right: var(--sp-2);",
  "  min-height: 0;\n  overflow-y: visible;\n  overscroll-behavior: contain;\n  padding-right: var(--sp-2);", 'e2e',
  'coloana setărilor nu se derulează: fereastra ar trebui derulată')
o('A02', ST, ".trasare-panza-loc {\n  position: relative;\n  flex: 1 1 auto;\n  min-height: 10rem;\n}",
  ".trasare-panza-loc {\n  position: relative;\n  flex: none;\n  min-height: 10rem;\n}", 'e2e', 'previzualizarea nu crește cu fereastra')
o('A03', ST, "  .trasare-comenzi,\n  .trasare-previz {\n    min-height: auto;\n  }\n", "", 'e2e',
  'pe telefon, setările strânse sub previzualizare')
o('A04', ST, "  height: calc(100vh - 2rem);\n  height: calc(100dvh - 2rem);\n  display: flex;", "  display: flex;", 'e2e',
  'fereastra cât conținutul, nu cât ecranul')

SETURI = {
    'calc': ['test/unit/trasare.fereastra.test.ts'],
}
E2E = ['test/e2e/trasare-fereastra.spec.ts', 'test/e2e/import.spec.ts']
