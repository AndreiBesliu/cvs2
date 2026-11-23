# Lista de otrăvuri a feliei 3.Xh-2 (biblioteca extensiilor, refăcută: fereastra de confirmare, „Scoate” cu întrebarea,
# mesajele pe înțeles, țintele; ADR 0231 §B.3–§B.5, §B.7), 23.11.2026, alese de autor: mărimea pe înțeles (marginile),
# semnul unui pachet abia citit, textele permisiunilor și ale mesajelor, controalele din manual; fereastra de confirmare
# (numele în titlu, sursa, avertismentul, lista „Ce poate face”, ce cere în plus întâi, semnul din cap), întrebarea de la
# „Scoate” (întreabă, Escape și „Păstrează” se întorc, focusul, ce se pierde, roșul), mesajele descărcării și ale
# catalogului, țintele la atingere și la densitatea mare, fereastra înaltă (pornește de sus, butoanele la vedere, numele lung).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MA = 'src/extensii/marime.ts'
SE = 'src/extensii/semn.ts'
IN = 'src/extensii/Instalare.tsx'
EX = 'src/extensii/Extensii.tsx'
CS = 'src/extensii/extensii.css'
RO = 'src/i18n/carcasa.ro.ts'
EN = 'src/i18n/carcasa.en.ts'

# Mărimea pe înțeles (src/extensii/marime.ts)
o('M01', MA, "  if (!(octeti > 0)) return { fel: 'zero' };", "  if (octeti === 0) return { fel: 'zero' };", 'marime',
  'o mărime negativă sau NaN devine text')
o('M02', MA, "  if (octeti < KB) return { fel: 'sub-kb' };", "  if (octeti <= KB) return { fel: 'sub-kb' };", 'marime',
  '1 kB întreg se spune „sub 1 kB”')
o('M03', MA, '  const kb = Math.round(octeti / KB);', '  const kb = Math.floor(octeti / KB);', 'marime',
  'kB-ii se taie în loc să se rotunjească')
o('M04', MA, "  if (kb < KB) return { fel: 'kb', n: kb };", "  if (kb <= KB) return { fel: 'kb', n: kb };", 'marime',
  'se scrie „1024 kB”')
o('M05', MA, 'Math.round((octeti / MB) * 10) / 10', 'Math.round(octeti / MB)', 'marime',
  'MB-ii își pierd zecimala')

# Semnul unui pachet abia citit (src/extensii/semn.ts)
o('S01', SE, "  const o = p.manifest.pictograma === undefined ? undefined : p.fisiere.get(p.manifest.pictograma);\n  return o && esteSvg(o) ? o : null;",
  "  const o = p.manifest.pictograma === undefined ? undefined : p.fisiere.get(p.manifest.pictograma);\n  return o ?? null;", 'semn',
  'semnul pachetului citit se arată și când nu e un SVG')

# Textele (src/i18n/carcasa.*.ts)
o('T01', RO, "  'extensii.poate.masina': 'încarcă programe", "  'extensii.poate.masina': 'să încarce programe", 'texte',
  'un rând al listei „Ce poate face” e încă o cerere („să …”)')
o('T02', EN, "  'extensii.poate.forme': 'receives", "  'extensii.poate.forme-x': 'receives", 'texte',
  'o permisiune fără „ce poate face” în engleză')
o('T03', RO, "'Biblioteca nu s-a putut încărca. Încearcă din nou peste puțin.'", "'Biblioteca nu s-a putut încărca ({motiv}).'", 'texte',
  'mesajul catalogului stricat poartă iar detaliul tehnic')
o('T04', RO, "  'extensii.gestionare.date': 'datele ei: {marime}',", "  'extensii.gestionare.date': 'datele ei: {kb} kB',", 'texte',
  'un text scrie iar mărimea în kB')
o('T05', EN, "  'extensii.adresa.esec-retea': 'The download failed. Check the address and your internet connection. If the host doesn’t let other pages download from it,",
  "  'extensii.adresa.esec-retea': 'The download failed. Check the address and your internet connection. If the host doesn’t allow it (CORS),", 'texte',
  'mesajul descărcării spune iar „CORS”')

# Controalele din manual
o('A01', IN, 'data-extensii="scoate-pastreaza"', 'data-extensii="pastreaza"', 'manual',
  'un control nou al extensiilor, fără locul lui în lista manualului')

# Fereastra de confirmare (e2e)
o('E01', IN, "    <Fereastra titlu={t('extensii.instalare.titlu-nume', { nume: p.manifest.nume })} test=\"extensii-instalare\" onEscape={renunta}",
  "    <Fereastra titlu={t('extensii.instalare.titlu')} test=\"extensii-instalare\" onEscape={renunta}", 'e2e',
  'titlul confirmării nu mai spune ce extensie se instalează')
o('E02', IN, "sub: sursa.fel === 'fisier' ? t('extensii.instalare.din-fisier', deUnde) : t('extensii.instalare.de-la-adresa', deUnde)",
  "sub: t('extensii.instalare.de-la-adresa', deUnde)", 'e2e',
  'un pachet din fișier e spus ca venit de la o adresă')
o('E03', IN, "      <p className=\"avertisment\" data-testid=\"extensii-din-afara\">{t('extensii.instalare.din-afara')}</p>\n", '', 'e2e',
  'un pachet din afara bibliotecii vine fără avertisment')
o('E04', IN, '<strong>{numePermisiune(p, limba)}</strong> ', '', 'e2e',
  'rândurile din „Ce poate face” n-au numele permisiunii')
o('E05', IN, '  return s.charAt(0).toLocaleUpperCase(limba) + s.slice(1);', '  return s;', 'e2e',
  'numele permisiunii începe cu literă mică')
o('E06', IN, "      {noi.length > 0 && <Poate titlu={t('extensii.poate.nou')} permisiuni={noi} limba={limba} test=\"extensii-permisiuni-noi\" nou />}\n", '', 'e2e',
  'actualizarea nu mai spune ce cere în plus')
o('E07', IN, '  const pastrate = rand.permisiuni.filter((p) => !noi.includes(p));', '  const pastrate = rand.permisiuni;', 'e2e',
  'ce cere în plus apare și la „ce putea până acum”')
o('E08', IN, "noi.length > 0 ? t('extensii.poate.pana-acum') : t('extensii.poate.titlu')", "t('extensii.poate.titlu')", 'e2e',
  'la o actualizare, lista veche se cheamă tot „Ce poate face”')
o('E09', IN, '        semn: semnRand,\n        sub: actualizare', '        semn: null,\n        sub: actualizare', 'e2e',
  'fereastra unui rând din bibliotecă n-are semnul extensiei')
o('E10', IN, '  const semn = useSemnOcteti(useMemo(() => (citit ? octetiSemnPachet(citit) : null), [citit]));', '  const semn = useSemnOcteti(null);', 'e2e',
  'confirmarea unui pachet din fișier nu-i arată semnul')
o('E11', IN, "      <Poate titlu={t('extensii.poate.titlu')} permisiuni={p.manifest.permisiuni} limba={limba} />\n      <p className=\"confirmare-nota\" data-testid=\"extensii-izolare\">{t('extensii.instalare.izolare')}</p>",
  "      <Poate titlu={t('extensii.poate.titlu')} permisiuni={p.manifest.permisiuni} limba={limba} />", 'e2e',
  'confirmarea nu mai spune că extensia rulează izolată')

# „Scoate” cu întrebarea (e2e)
o('E12', IN, 'data-extensii="scoate" onClick={() => { setDeScos(x); }}', 'data-extensii="scoate" onClick={() => { void scoate(x.id); }}', 'e2e',
  '„Scoate” șterge pe loc, fără întrebare')
o('E13', IN, 'onEscape={() => { if (!scot) setDeScos(null); }}', 'onEscape={() => { onGata(null); }}', 'e2e',
  'Escape în întrebare închide toată gestionarea')
o('E14', IN, 'data-extensii="scoate-pastreaza" autoFocus disabled={scot} onClick={() => { setDeScos(null); }}',
  'data-extensii="scoate-pastreaza" autoFocus disabled={scot} onClick={() => { void scoate(deScos.id); }}', 'e2e',
  '„Păstrează” scoate extensia')
o('E15', IN, 'data-extensii="scoate-pastreaza" autoFocus disabled', 'data-extensii="scoate-pastreaza" disabled', 'e2e',
  'întrebarea nu mai pune focusul pe „Păstrează”')
o('E16', IN, '    if (deScos) { intors.current = deScos.id; return; }', '    if (deScos) return;', 'e2e',
  'după întrebare, focusul nu se întoarce pe rândul extensiei')
o('E17', IN, "      : o === 0 ? t('extensii.scoatere.fara-date')", "      : o >= 0 ? t('extensii.scoatere.fara-date')", 'e2e',
  'întrebarea spune „n-are date” unei extensii care are')
o('E18', IN, '          <button type="button" className="pericol" data-extensii="scoate-confirma"', '          <button type="button" data-extensii="scoate-confirma"', 'e2e',
  'gestul care șterge arată ca unul obișnuit')
o('E19', IN, '                <SemnInstalat extensie={x} marime={28} />\n', '', 'e2e',
  'rândurile gestionării n-au semnul extensiei')

# Mesajele pe înțeles (e2e)
o('E20', IN, "setEroare(d.motiv === 'http' ? t('extensii.adresa.esec-http', { status: d.status }) : t('extensii.adresa.esec-retea'));",
  "setEroare(t('extensii.adresa.esec-retea'));", 'e2e',
  'un răspuns 404 e spus ca o cădere a rețelei')
o('E21', EX, "biblioteca.fel === 'retea' ? t('extensii.biblioteca.fara-retea') : t('extensii.biblioteca.eroare')", "t('extensii.biblioteca.fara-retea')", 'e2e',
  'un catalog stricat e spus, în meniu, ca lipsa internetului')
o('E22', IN, "{pas.retea ? t('extensii.biblioteca.fara-retea') : t('extensii.biblioteca.eroare')}", "{t('extensii.biblioteca.fara-retea')}", 'e2e',
  'un catalog stricat e spus, în fereastra linkului, ca lipsa internetului')
o('E23', EX, '<span>{textMarime(r.octeti, limba)}</span>', '<span>{r.octeti}</span>', 'e2e',
  'rândul din bibliotecă scrie mărimea în octeți')

# Țintele și fereastra înaltă (e2e)
o('E24', CS, "@media (pointer: coarse) {\n  .meniu-extensii [role='menuitem'],\n  .meniu-extensii .biblioteca-buton[role='menuitem'] {\n    min-height: var(--tinta);\n  }\n}\n", '', 'e2e',
  'la atingere, rândurile meniului rămân de 30 px')
o('E25', CS, ":root[data-densitate='mare'] .meniu-extensii [role='menuitem'],\n:root[data-densitate='mare'] .meniu-extensii .biblioteca-buton[role='menuitem'] {\n  min-height: var(--tinta);\n}\n", '', 'e2e',
  'la densitatea mare, meniul rămâne strâns')
o('E27', CS, '  position: sticky;\n  bottom: calc(-1 * var(--sp-5));', '  position: static;', 'e2e',
  'butoanele unei ferestre înalte ies de pe ecran')
o('E28', CS, '.confirmare-sursa {\n  margin: 2px 0 0;\n  font-size: var(--fs-2);\n  color: var(--t-slab);\n  overflow-wrap: anywhere;\n}',
  '.confirmare-sursa {\n  margin: 2px 0 0;\n  font-size: var(--fs-2);\n  color: var(--t-slab);\n}', 'e2e',
  'un nume lung de fișier împinge confirmarea în lateral')
o('E29', CS, '.extensii-rand {\n  flex: 1;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}', '.extensii-rand {\n  flex: 1;\n}', 'e2e',
  'un nume lung de fișier împinge gestionarea în lateral')

SETURI = {
    'marime': ['test/unit/extensii.marime.test.ts'],
    'semn': ['test/unit/extensii.semn.test.ts'],
    'texte': ['test/unit/extensii.texte.test.ts'],
    'manual': ['test/unit/manual.test.ts'],
}
E2E = ['test/e2e/extensii.spec.ts', 'test/e2e/biblioteca.spec.ts', 'test/e2e/extensii.tinte.spec.ts']
