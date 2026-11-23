# Lista de otrăvuri a feliei 3.Xh-3 (biblioteca extensiilor, refăcută: fereastra „Biblioteca extensiilor”, meniul scurtat,
# acțiunea din paletă; ADR 0231, direcția B), 23.11.2026, alese de autor: lista și pagina (filele, alegerea, linkul spre o
# extensie care lipsește, „ce e nou” de la versiunea omului, sursa și datele), gesturile paginii (instalarea, actualizarea
# dintr-un clic sau prin confirmare, „Deschide”, „Scoate”), stările (scheletul, mărimea ținută, fără rețea, catalogul
# stricat), meniul (actualizarea din rând, lățimea ținută), paleta (acțiunea, grupul, de oriunde, ancora ștearsă, focusul),
# telefonul (lista și pagina pe rând, numele lung) și țintele. Poartă și urmașele otrăvurilor din listele vechi al căror cod
# s-a mutat aici (3.Xb E03–E04, 3.Xg E01–E02, E06, E10, E12, 3.Xh-1 U03 și U05, 3.Xh-2 A01, E04–E05, E12–E19, E21, E23–E25).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


BI = 'src/extensii/Biblioteca.tsx'
PA = 'src/extensii/parti.tsx'
IN = 'src/extensii/Instalare.tsx'
EX = 'src/extensii/Extensii.tsx'
CS = 'src/extensii/extensii.css'
AC = 'src/ui/actiuniExtensii.ts'
AP = 'src/app/App.tsx'
PL = 'src/ui/Paleta.tsx'

# Acțiunea din paletă (unitar) și controalele din manual
o('U01', AC, "  activa: () => true,\n  ruleaza: (ctx) => { ctx.deschideBiblioteca(); },", "  activa: () => 'motiv.nimic-ales',\n  ruleaza: (ctx) => { ctx.deschideBiblioteca(); },", 'actiune',
  '„Biblioteca extensiilor” din paletă e inactivă')
o('U02', AC, "  ruleaza: (ctx) => { ctx.deschideBiblioteca(); },", "  ruleaza: () => {},", 'actiune',
  '„Biblioteca extensiilor” din paletă nu face nimic')
o('U03', PA, 'data-extensii="scoate-pastreaza"', 'data-extensii="pastreaza"', 'manual',
  'un control al extensiilor, fără locul lui în lista manualului')
o('U04', BI, 'data-extensii="pagina-scoate" disabled={lucreaza}', 'data-extensii="pagina-sterge" disabled={lucreaza}', 'manual',
  'un control al paginii, fără locul lui în lista manualului')

# Lista și pagina
o('L01', BI, "  const elemente: readonly Element[] = fila === 'toate'", "  const elemente: readonly Element[] = fila !== 'toate'", 'e2e',
  'filele își schimbă listele între ele')
o('L02', BI, '  const aratat = alesul ?? (lipsa ? undefined : elemente[0]);', '  const aratat = alesul ?? elemente[0];', 'e2e',
  'linkul spre o extensie care lipsește arată alta în locul ei')
o('L03', BI, "  const lipsa = cerere.dinLink && ales !== null && ales === cerere.id && fila === 'toate' && catalog.fel === 'ok' && !alesul;", '  const lipsa = false;', 'e2e',
  'linkul spre o extensie care lipsește nu spune nimic')
o('L05', BI, "(n) => s.fel !== 'actualizeaza' || comparaVersiuni(n.versiune, s.de) === 1", "() => true", 'e2e',
  '„ce e nou” la o actualizare arată și versiunile pe care omul le are deja')
o('L06', BI, "{typeof octeti === 'number' && <> · {t('extensii.gestionare.date'", "{false && <> · {t('extensii.gestionare.date'", 'e2e',
  'pagina unei extensii instalate nu arată cât ocupă datele ei')
o('L07', BI, "          {instalata.sursa.fel === 'biblioteca'\n            ? t('extensii.gestionare.din-biblioteca'", "          {instalata.sursa.fel !== 'biblioteca'\n            ? t('extensii.gestionare.din-biblioteca'", 'e2e',
  'sursa extensiei instalate, spusă pe dos')
o('L08', BI, "rand.versiune, textMarime(rand.octeti, limba)]", "rand.versiune, String(rand.octeti)]", 'e2e',
  'pagina scrie mărimea în octeți')
o('L09', BI, '        <SemnElement element={e} marime={28} />', '        <Semn adresa={null} marime={28} />', 'e2e',
  'rândurile listei n-au semnul extensiei')
o('L10', BI, '        <SemnElement element={element} marime={48} />', '        <Semn adresa={null} marime={48} />', 'e2e',
  'pagina n-are semnul extensiei')
o('L11', BI, "  return <Semn adresa={element.instalata ? dinPachet ?? dinCatalog : dinCatalog} marime={marime} />;", "  return <Semn adresa={dinCatalog} marime={marime} />;", 'e2e',
  'fără rețea, extensia instalată își pierde semnul în bibliotecă')
o('L12', BI, "      {rand && <p data-testid=\"pagina-descriere\">{rand.despre?.[limba] ?? rand.descriere[limba]}</p>}", "      {rand && <p data-testid=\"pagina-descriere\">{rand.descriere[limba]}</p>}", 'e2e',
  'pagina arată descrierea scurtă, nu pe cea lungă')
o('L13', BI, "  const capturi = rand?.capturi?.[limba] ?? [];", "  const capturi = rand?.capturi?.ro ?? [];", 'e2e',
  'în engleză, capturile sunt cele românești')

# Gesturile paginii
o('G01', BI, "    setProgres((p) => ({ ...p, [rand.id]: { fel: 'gata', cum, versiune: rand.versiune } }));\n    onSchimbata(rand.id);", "    setProgres((p) => ({ ...p, [rand.id]: { fel: 'gata', cum, versiune: rand.versiune } }));", 'e2e',
  'după instalare, lista celor instalate nu se citește din nou')
o('G02', BI, "                    if (noi) onCere({ fel: 'biblioteca', id: rand.id, rand, dinLink: false });", "                    if (false) onCere({ fel: 'biblioteca', id: rand.id, rand, dinLink: false });", 'e2e',
  'din pagină, o versiune care cere ceva în plus se instalează fără confirmare')
o('G03', BI, "                    else void instaleaza(rand, 'actualizata');", "                    else void instaleaza(rand, 'instalata');", 'e2e',
  'după o actualizare, pagina spune „instalată”')
o('G04', BI, "onClick={() => { onActualizeaza(rand, noi.length > 0); }}", "onClick={() => { onActualizeaza(rand, true); }}", 'e2e',
  'din pagină, o actualizare fără nimic nou trece totuși prin confirmare')
o('G05', IN, "onDeschide={(e) => { onGata(e.id, e); }}", "onDeschide={(e) => { onGata(e.id); }}", 'e2e',
  '„Deschide” închide biblioteca, dar nu deschide extensia')
o('G06', BI, "      if (r.defect) onDefect(new Error(`biblioteca: ${rand.id} ${rand.versiune}: ${r.motiv}${r.detaliu ? ` (${r.detaliu})` : ''}`));\n      const text = t('extensii.instalare.refuz'", "      const text = t('extensii.instalare.refuz'", 'e2e',
  'un pachet schimbat pe drum nu mai ajunge în jurnal')
o('G07', BI, "        {...(ales !== null ? { 'data-ales': '' } : {})} {...(acoperita || deScos ? { inert: true } : {})} onKeyDown={tasta}>", "        {...(ales !== null ? { 'data-ales': '' } : {})} onKeyDown={tasta}>", 'e2e',
  'biblioteca de sub o confirmare rămâne activă')
o('G08', BI, "      {deScos && (\n        <IntrebareScoatere", "      {false && deScos && (\n        <IntrebareScoatere", 'e2e',
  'întrebarea de la „Scoate” nu mai apare')
o('G09', BI, "    if (deScos) { intors.current = true; return; }", "    if (deScos) return;", 'e2e',
  'după întrebare, focusul nu se întoarce pe gestul paginii')
o('G10', BI, "            if (fila === 'instalate') setAles(null);\n", "", 'e2e',
  'după „Scoate”, pe telefon, pagina rămâne goală în locul listei')
o('G11', PA, "onEscape={() => { if (!scot) onPastreaza(); }}", "onEscape={() => {}}", 'e2e',
  'Escape nu mai închide întrebarea de la „Scoate”')
o('G12', PA, 'data-extensii="scoate-pastreaza" autoFocus disabled={scot} onClick={onPastreaza}', 'data-extensii="scoate-pastreaza" autoFocus disabled={scot} onClick={() => { void scoate(); }}', 'e2e',
  '„Păstrează” scoate extensia')
o('G13', PA, 'data-extensii="scoate-pastreaza" autoFocus disabled', 'data-extensii="scoate-pastreaza" disabled', 'e2e',
  'întrebarea nu mai pune focusul pe „Păstrează”')
o('G14', PA, "    : octeti === 0 ? t('extensii.scoatere.fara-date')", "    : octeti >= 0 ? t('extensii.scoatere.fara-date')", 'e2e',
  'întrebarea spune „n-are date” unei extensii care are')
o('G15', PA, 'className="pericol" data-extensii="scoate-confirma"', 'data-extensii="scoate-confirma"', 'e2e',
  'gestul care șterge arată ca unul obișnuit')
o('G16', PA, '<strong>{numePermisiune(p, limba)}</strong> ', '', 'e2e',
  'rândurile din „Ce poate face” n-au numele permisiunii')
o('G17', PA, '  return s.charAt(0).toLocaleUpperCase(limba) + s.slice(1);', '  return s;', 'e2e',
  'numele permisiunii începe cu literă mică')
o('G18', PA, "      {permisiuni.length === 0 ? <p data-testid={test}>", "      {true ? <p data-testid={test}>", 'e2e',
  'fereastra de confirmare nu spune ce poate face extensia')

# Stările ferestrei
o('S01', BI, "      {fila === 'toate' && catalog.fel === 'incarca' && (", "      {false && (", 'e2e',
  'cât vine catalogul, lista e goală, fără schelet')
o('S02', CS, "  height: min(41rem, calc(100vh - 2rem));\n  max-width: none;", "  max-height: min(41rem, calc(100vh - 2rem));\n  max-width: none;", 'e2e',
  'fereastra își schimbă mărimea când vine catalogul')
o('S03', BI, "{catalog.fel === 'ok' ? ` · ${randuri.length}` : ''}", "{` · ${randuri.length}`}", 'e2e',
  'cât vine catalogul, fila spune „Toate · 0”')
o('S04', BI, "<p role=\"alert\">{catalog.fel === 'retea' ? t('extensii.biblioteca.fara-retea') : t('extensii.biblioteca.eroare')}</p>", "<p role=\"alert\">{t('extensii.biblioteca.fara-retea')}</p>", 'e2e',
  'un catalog stricat e spus ca lipsa internetului')
o('S05', BI, 'data-extensii="biblioteca-reincearca" onClick={onReincearca}', 'data-extensii="biblioteca-reincearca" onClick={() => {}}', 'e2e',
  '„Reîncearcă” nu mai cere catalogul')

# Meniul
o('M01', EX, "                    if (noua.cere) alege(() => {", "                    if (true) alege(() => {", 'e2e',
  'din meniu, o actualizare fără nimic nou trece totuși prin fereastră')
o('M02', EX, "              : noua ? t('extensii.meniu.noua', { veche: x.manifest.versiune, noua: noua.rand.versiune }) : x.manifest.versiune;", "              : x.manifest.versiune;", 'e2e',
  'rândul extensiei instalate nu mai spune că are o versiune nouă')
o('M03', CS, "  width: min(21rem, calc(100vw - 0.5rem));\n  box-sizing: border-box;", "  min-width: 15rem;\n  max-width: 24rem;", 'e2e',
  'meniul își schimbă lățimea când vine catalogul')
o('M08', CS, ".rand-text > span,\n.rand-text small {", ".rand-text small {", 'e2e',
  'un nume lung se rupe pe două rânduri când apare „Actualizează”: meniul crește')
o('M04', EX, "    if (Date.now() - ultimulCatalog.current > 5000) incarcaBiblioteca();", "", 'e2e',
  'din paletă sau din link, catalogul nu se mai cere')
o('M05', EX, "    if (Date.now() - ultimulCatalog.current > 5000) incarcaBiblioteca();", "    incarcaBiblioteca();", 'e2e',
  'catalogul abia cerut de meniu se cere a doua oară')
o('M06', EX, "        if (/^[a-z0-9-]{1,40}$/.test(id)) deschideBiblioteca(id, true);", "        if (/^[a-z0-9-]{1,40}$/.test(id)) deschideBiblioteca(id, false);", 'e2e',
  'pagina deschisă dintr-un link nu spune că vine dintr-un link')
o('M07', CS, ".meniu-extensii [role='menuitem'].rand-extensie {\n  flex-direction: row;\n  align-items: center;\n  justify-content: flex-start;", ".meniu-extensii [role='menuitem'].rand-extensie {\n  flex-direction: row;\n  align-items: center;", 'e2e',
  'rândul unei extensii instalate stă la mijlocul meniului')

# Paleta
o('P01', AP, "'vedere.aspect', 'extensii.biblioteca', ...Object.values(DESCHIDE_FEREASTRA)", "'vedere.aspect', ...Object.values(DESCHIDE_FEREASTRA)", 'e2e',
  '„Biblioteca extensiilor” din paletă mută omul la Proiectare')
o('P02', PL, "  ['paleta.grup.extensii', ['extensii']],\n", "", 'e2e',
  'acțiunile extensiilor nu apar în paletă')
o('P03', EX, "      if (location.hash === ANCORA_FEREASTRA) {\n        history.replaceState(history.state, '', `${location.pathname}${location.search}`);", "      if (location.hash === ANCORA_FEREASTRA) {", 'e2e',
  'ancora paletei rămâne în adresă')
o('P04', EX, "              setTimeout(() => { buton.current?.focus(); }, 0);", "", 'e2e',
  'după închiderea bibliotecii, focusul nu se întoarce la piesa de puzzle')

# Telefonul și țintele
o('T01', CS, "  .dialog-biblioteca[data-ales] .bib-lista,\n  .dialog-biblioteca[data-ales] .bib-file {\n    display: none;\n  }", "", 'e2e',
  'pe telefon, lista rămâne peste pagina extensiei')
o('T02', BI, "              onClick={() => { setAles(null); }}>", "              onClick={() => {}}>", 'e2e',
  '„Înapoi la listă” nu face nimic')
o('T03', CS, "  line-height: 1.45;\n  overflow-wrap: anywhere;\n}", "  line-height: 1.45;\n}", 'e2e',
  'un nume lung de fișier împinge pagina extensiei în lateral')
o('T04', CS, "  .meniu-extensii .biblioteca-buton[role='menuitem'],\n  .dialog-biblioteca .bib-file [role='tab'] {\n    min-height: var(--tinta);\n  }\n}", "  .meniu-extensii .biblioteca-buton[role='menuitem'] {\n    min-height: var(--tinta);\n  }\n}", 'e2e',
  'la atingere, filele bibliotecii rămân mici')
o('T05', CS, "@media (pointer: coarse) {\n  .meniu-extensii [role='menuitem'],", "@media (pointer: fine) {\n  .meniu-extensii [role='menuitem'],", 'e2e',
  'la atingere, rândurile meniului rămân de 30 px')
o('T06', CS, ":root[data-densitate='mare'] .meniu-extensii [role='menuitem'],\n", ":root[data-densitate='mica'] .meniu-extensii [role='menuitem'],\n", 'e2e',
  'la densitatea mare, meniul rămâne strâns')

SETURI = {
    'actiune': ['test/unit/extensii.forme.test.ts'],
    'manual': ['test/unit/manual.test.ts'],
}
E2E = ['test/e2e/biblioteca.spec.ts', 'test/e2e/extensii.spec.ts', 'test/e2e/extensii.tinte.spec.ts']
