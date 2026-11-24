# Lista de otrăvuri a feliei 3.Xi-2 (extensiile, claritatea; ADR 0232 §B), 24.11.2026, alese de autor: ordinea permisiunilor
# (mașina prima, marcată; una necunoscută, la urmă), fraza izolării și textele filelor, manualul; fereastra bibliotecii fără
# catalog (trecerea singură pe „Instalate”, banda, „Reîncearcă”, fila aleasă de om, pagina fără nicio extensie, „Instalată din
# bibliotecă”), focusul întors în fereastră și Escape de pe pagină, meniul (extensia deschisă, rolurile, eroarea sub listă),
# fila extensiei (numele tăiat, × cât o țintă), subtextele de 12 px.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PA = 'src/extensii/pachet.ts'
PR = 'src/extensii/parti.tsx'
EX = 'src/extensii/Extensii.tsx'
BI = 'src/extensii/Biblioteca.tsx'
CS = 'src/extensii/extensii.css'
RO = 'src/i18n/carcasa.ro.ts'
EN = 'src/i18n/carcasa.en.ts'

# --- unitare: ordinea permisiunilor, textele, manualul ---
o('U01', PA, "['masina', 'forme', 'cont', 'descarcari', 'stocare'];", "['forme', 'masina', 'cont', 'descarcari', 'stocare'];", 'permisiuni',
  'formele trec înaintea mașinii')
o('U02', PA, "return i < 0 ? ORDINE_SENSIBILITATE.length : i;", "return i < 0 ? -1 : i;", 'permisiuni',
  'o permisiune necunoscută urcă prima')
o('U03', PA, "sort((a, b) => loc(a.p) - loc(b.p) || a.i - b.i)", "sort((a, b) => loc(a.p) - loc(b.p) || b.i - a.i)", 'permisiuni',
  'cele necunoscute își întorc ordinea')
o('U04', PA, "return permisiuni.map((p, i) => ({ p, i })).sort(", "return (permisiuni as string[]).sort(() => 0) && permisiuni.map((p, i) => ({ p, i })).filter((x) => loc(x.p) < ORDINE_SENSIBILITATE.length).sort(", 'permisiuni',
  'o permisiune necunoscută dispare din listă')
o('U05', PA, "new Set(['masina']);", "new Set(['masina', 'forme']);", 'permisiuni',
  'și formele sunt marcate ca sensibile')
o('U06', PA, "['masina', 'forme', 'cont', 'descarcari', 'stocare'];", "['masina', 'forme', 'cont', 'descarcari'];", 'permisiuni',
  'o permisiune din catalog n-are loc în ordine')
o('U07', RO, "poate doar ce scrie mai sus. Nu-ți vede desenul, proiectele, adresa sau parola", "nu vede desenul, proiectele, contul sau portul mașinii; adresa sau parola", 'texte',
  'fraza izolării contrazice iar permisiunile')
o('U08', EN, "'extensii.biblioteca.fila-toate': 'Library',", "'extensii.biblioteca.fila-toate': 'All',", 'texte',
  'în engleză, fila se numește iar „All”')
o('U09', RO, "'extensii.biblioteca.verificat': 'Verificată de cvs2 la instalare.',", "'extensii.biblioteca.verificat': 'Amprenta se verifică la instalare.',", 'texte',
  'sub „Instalează” scrie iar despre amprentă')
o('U10', 'docs/manual/ro.md', "**Din bibliotecă** arată", "Prima filă arată", 'manual',
  'fila redenumită lipsește din manual')
o('U11', 'docs/manual/en.md', "**Library** shows", "The first tab shows", 'manual',
  'fila redenumită lipsește din manualul în engleză')

# --- e2e: „Ce poate face” ---
o('E01', PR, "{dupaSensibilitate(permisiuni).map((p) => (", "{permisiuni.map((p) => (", 'e2e',
  'permisiunile rămân în ordinea manifestului')
o('E02', PR, "{...(PERMISIUNI_SENSIBILE.has(p) ? { 'data-sensibila': '' } : {})}", "", 'e2e',
  'mașina nu mai e marcată')
o('E03', PR, "{...(PERMISIUNI_SENSIBILE.has(p) ? { 'data-sensibila': '' } : {})}", "data-sensibila=\"\"", 'e2e',
  'toate permisiunile sunt marcate ca sensibile')

# --- e2e: biblioteca fără catalog ---
o('B01', BI, "if (faraCatalog && instalate.length > 0) { mutata.current = true; setFila('instalate'); }", "if (faraCatalog && instalate.length > 0) { mutata.current = true; }", 'e2e',
  'fără internet, fereastra nu mai trece pe „Instalate”')
o('B02', BI, "if (faraCatalog && instalate.length > 0) { mutata.current = true; setFila('instalate'); }", "if (faraCatalog) { mutata.current = true; setFila('instalate'); }", 'e2e',
  'fără internet și fără nimic instalat, fereastra trece tot pe „Instalate”')
o('B03', BI, "else if (catalog.fel === 'ok' && mutata.current) { mutata.current = false; setFila('toate'); }", "", 'e2e',
  'după „Reîncearcă”, fereastra nu se întoarce la bibliotecă')
o('B04', BI, "const alegeFila = (f: Fila): void => { aAles.current = true; setFila(f); };", "const alegeFila = (f: Fila): void => { setFila(f); };", 'e2e',
  'fila aleasă de om e schimbată înapoi de fereastră')
o('B05', BI, "const faraCatalog = catalog.fel === 'retea' || catalog.fel === 'defect';", "const faraCatalog = catalog.fel === 'retea';", 'e2e',
  'un catalog stricat nu mai trece fereastra pe „Instalate”')
o('B06', BI, "{fila === 'instalate' && faraCatalog && elemente.length > 0 && (", "{fila === 'instalate' && false && (", 'e2e',
  'banda „Biblioteca are nevoie de internet” lipsește')
o('B07', BI, "<p role=\"status\">{catalog.fel === 'retea' ? t('extensii.biblioteca.fara-retea-instalate') : t('extensii.biblioteca.eroare-instalate')}</p>", "<p role=\"status\">{t('extensii.biblioteca.fara-retea-instalate')}</p>", 'e2e',
  'un catalog stricat e spus ca lipsă de internet')
o('B08', BI, "<button type=\"button\" data-extensii=\"biblioteca-reincearca\" onClick={onReincearca}>{t('extensii.biblioteca.reincearca')}</button>\n        </div>\n      )}\n      {fila === 'instalate' && elemente.length === 0", "<button type=\"button\" data-extensii=\"biblioteca-reincearca\">{t('extensii.biblioteca.reincearca')}</button>\n        </div>\n      )}\n      {fila === 'instalate' && elemente.length === 0", 'e2e',
  '„Reîncearcă” din bandă nu face nimic')
o('B09', BI, "{!aratat && !lipsa && catalog.fel !== 'incarca' && (", "{!aratat && !lipsa && catalog.fel === 'ok' && (", 'e2e',
  'fără internet și fără extensii, pagina rămâne goală')
o('B10', BI, "data-extensii=\"pagina-din-fisier\" onClick={() => { onCere('fisier'); }}", "data-extensii=\"pagina-din-fisier\"", 'e2e',
  '„Instalează din fișier” din pagina goală nu face nimic')
o('B11', BI, "data-extensii=\"pagina-din-adresa\" onClick={() => { onCere({ fel: 'adresa', adresa: '', dinLink: false }); }}", "data-extensii=\"pagina-din-adresa\"", 'e2e',
  '„Instalează din adresă” din pagina goală nu face nimic')
o('B12', BI, "t(instalata?.sursa.fel === 'biblioteca' ? 'extensii.biblioteca.din-biblioteca' : 'extensii.biblioteca.locala')", "t('extensii.biblioteca.locala')", 'e2e',
  'fără internet, o extensie din bibliotecă e spusă „din afara bibliotecii”')
o('B13', BI, "t(instalata?.sursa.fel === 'biblioteca' ? 'extensii.biblioteca.din-biblioteca' : 'extensii.biblioteca.locala')", "t('extensii.biblioteca.din-biblioteca')", 'e2e',
  'o extensie din fișier e spusă „din bibliotecă”')

# --- e2e: focusul și Escape în fereastra bibliotecii ---
o('F01', BI, "onFocus={(e) => { ultimul.current = e.target as HTMLElement; }}", "", 'e2e',
  'fereastra nu mai știe unde era focusul: după „Instalează” cade pe pagină')
o('F02', BI, "['.pagina-actiuni .principal:not(:disabled)', '[role=\"tab\"][aria-selected=\"true\"]', '[data-extensii=\"inchide-biblioteca\"]']", "['[role=\"tab\"][aria-selected=\"true\"]', '[data-extensii=\"inchide-biblioteca\"]']", 'e2e',
  'după „Instalează”, focusul nu ajunge pe „Deschide”')
o('F03', BI, "['.pagina-actiuni .principal:not(:disabled)', '[role=\"tab\"][aria-selected=\"true\"]', '[data-extensii=\"inchide-biblioteca\"]']", "['.pagina-actiuni .principal:not(:disabled)', '[data-extensii=\"inchide-biblioteca\"]']", 'e2e',
  'după „Reîncearcă”, focusul nu ajunge pe fila aleasă')
o('F04', BI, "if (e.key !== 'Escape' || e.target !== document.body || e.defaultPrevented) return;\n      e.preventDefault();\n      laInchidere.current();", "if (e.key !== 'Escape' || e.target !== document.body || e.defaultPrevented) return;\n      e.preventDefault();", 'e2e',
  'cu focusul pe pagină, Escape nu mai închide biblioteca')
o('F05', BI, "    if (acoperita || deScos) return undefined;\n    const pePagina", "    const pePagina", 'e2e',
  'cu o fereastră deasupra, Escape de pe pagină închide biblioteca de dedesubt')

# --- e2e: meniul ---
o('M01', EX, ": eDeschisa ? t('extensii.meniu.deschisa', { versiune: x.manifest.versiune }) : x.manifest.versiune;", ": x.manifest.versiune;", 'e2e',
  'rândul extensiei deschise nu mai spune „deschisă”')
o('M02', EX, "{...(eDeschisa ? { 'aria-current': 'true' as const } : {})} onClick={() => { alege(() => { deschideExtensia(x); }); }}>", "onClick={() => { alege(() => { deschideExtensia(x); }); }}>", 'e2e',
  'extensia deschisă nu mai are `aria-current`')
o('M03', EX, "{eDeschisa && <span className=\"rand-punct\" aria-hidden=\"true\" />}", "<span className=\"rand-punct\" aria-hidden=\"true\" />", 'e2e',
  'toate rândurile au punctul extensiei deschise')
o('M04', EX, "const eDeschisa = deschisa?.id === x.id;", "const eDeschisa = deschisa !== null;", 'e2e',
  'cu o extensie deschisă, toate rândurile sunt marcate')
o('M05', EX, "<div key={x.id} className=\"rand-instalat\" role=\"none\">", "<div key={x.id} className=\"rand-instalat\">", 'e2e',
  'meniul are copii care nu sunt rânduri de meniu')
o('M06', EX, "data-testid=\"meniu-eroare\">{t('extensii.meniu.eroare', { nume: x.manifest.nume, text: pr.text })}</p>", "data-testid=\"meniu-eroare\">{pr.text}</p>", 'e2e',
  'eroarea actualizării nu mai spune a cui e')
o('M07', EX, "title={deschisa.manifest.nume} {...(cuSemn", "{...(cuSemn", 'e2e',
  'un nume tăiat pe filă nu mai e întreg nicăieri')

# --- e2e: stilul ---
o('C01', CS, ".fila-extensie .eticheta {\n  max-width: 22ch;", ".fila-extensie .eticheta {\n  max-width: none;", 'e2e',
  'un nume lung lungește fila')
o('C02', CS, ".fila-inchide {\n  min-width: 28px;\n  min-height: 28px;", ".fila-inchide {\n  min-width: 24px;\n  min-height: 24px;", 'e2e',
  '× de pe filă e iar de 24 px')
o('C03', CS, "@media (pointer: coarse) {\n  .fila-inchide {\n    min-width: var(--tinta);\n  }\n", "@media (pointer: coarse) {\n", 'e2e',
  'la atingere, × de pe filă e îngust')
o('C04', CS, ".rand-text small,\n.bib-card-text small {\n  font-size: var(--fs-1);\n}", ".rand-text small,\n.bib-card-text small {\n  font-size: 0.68rem;\n}", 'e2e',
  'subtextele sunt iar sub 12 px')
o('C05', CS, ".rand-punct {\n  flex: none;\n  width: 8px;\n  height: 8px;", ".rand-punct {\n  display: none;\n  width: 8px;\n  height: 8px;", 'e2e',
  'punctul extensiei deschise nu se vede')

SETURI = {
    'permisiuni': ['test/unit/extensii.permisiuni.test.ts'],
    'texte': ['test/unit/extensii.texte.test.ts'],
    'manual': ['test/unit/manual.test.ts'],
}
E2E = ['test/e2e/extensii.claritate.spec.ts']
