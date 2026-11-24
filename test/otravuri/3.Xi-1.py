# Lista de otrăvuri a feliei 3.Xi-1 (extensiile, stările rupte; ADR 0232 §A), 24.11.2026, alese de autor: extensia ținută
# minte la reîncărcare (id-ul, adresa care are întâietate, cea care nu mai e instalată), motivele refuzului ca propoziții,
# manualul; starea „n-a pornit” și „pornește greu” (ieșirile, detaliile, „Copiază”, locul ei), versiunea nouă peste extensia
# deschisă (salvările și întrebarea înaintea instalării, „Rămân”, redeschiderea, fără a doua întrebare), focusul rămas în
# meniu, fereastra refuzului (titlul, sursa, drumul înapoi, „Încearcă din nou”), „Rămân” principal și „Închide oricum” roșu.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TI = 'src/extensii/tinuta.ts'
EX = 'src/extensii/Extensii.tsx'
SP = 'src/extensii/StarePornire.tsx'
IN = 'src/extensii/Instalare.tsx'
BI = 'src/extensii/Biblioteca.tsx'
MT = 'src/extensii/motivText.ts'
CS = 'src/extensii/extensii.css'
RO = 'src/i18n/carcasa.ro.ts'
EN = 'src/i18n/carcasa.en.ts'

# --- unitare: extensia ținută, textele, manualul ---
o('U01', TI, "const ID = /^[a-z0-9-]{1,40}$/;", "const ID = /^.{1,40}$/;", 'tinuta',
  'orice text scurt din stocare trece drept id de extensie')
o('U02', TI, "['#instaleaza=', '#biblioteca', '#primeste-lucrare']", "['#instaleaza=', '#primeste-lucrare']", 'tinuta',
  'linkul bibliotecii nu mai are întâietate la redeschidere')
o('U03', TI, "  if (new URLSearchParams(adresa.search).has('test')) return null;\n", "", 'tinuta',
  'extensia se redeschide și peste testul pas cu pas')
o('U04', TI, "return instalate.find((x) => x.id === tinuta) ?? null;", "return instalate[0] ?? null;", 'tinuta',
  'se redeschide prima extensie instalată, nu cea ținută')
o('U05', TI, "stocare?.removeItem(CHEIE_EXTENSIE_DESCHISA);", "stocare?.setItem(CHEIE_EXTENSIE_DESCHISA, '');", 'tinuta',
  'extensia uitată lasă cheia în stocare')
o('U06', TI, "    return v !== null && ID.test(v) ? v : null;\n  } catch {\n    return null;", "    return v !== null && ID.test(v) ? v : null;\n  } catch (e) {\n    throw e;", 'tinuta',
  'o stocare care aruncă oprește citirea extensiei ținute')
o('U07', RO, "'extensii.motiv.crc': 'Un fișier din arhivă e stricat (CRC). Descarc-o din nou.',", "'extensii.motiv.crc': 'un fișier din arhivă e stricat (CRC)',", 'texte',
  'un motiv de refuz nu mai e o propoziție întreagă')
o('U08', EN, "'extensii.biblioteca.esec': 'The update didn’t work. {motiv}',", "'extensii.biblioteca.esec': 'The update didn’t work: {motiv}',", 'texte',
  'în engleză, motivul e lipit iar după două puncte')
o('U09', RO, "'extensii.motiv.api': 'Extensia e făcută pentru altă versiune de cvs2 (HostApi).',", "'extensii.motiv.api': 'Extensia e făcută pentru altă versiune de cvs2.',", 'texte',
  'motivul își pierde termenul tehnic din paranteză')
o('U10', 'docs/manual/ro.md', "**Altă adresă…** te întoarce", "apoi te întoarce", 'manual',
  'un control nou al ferestrei refuzului lipsește din manual')
o('U11', 'docs/manual/en.md', "**See in the library** opens its page", "then it opens its page", 'manual',
  'un control nou al stării „n-a pornit” lipsește din manualul în engleză')

# --- e2e: extensia ținută minte ---
o('E01', EX, "{ setStare({ fel: 'pornit' }); tineExtensia(deschisa.id); }", "{ setStare({ fel: 'pornit' }); }", 'e2e',
  'extensia pornită nu se ține minte')
o('E02', EX, "const inchide = (): void => { uitaExtensia(); setDeschisa(null); };", "const inchide = (): void => { setDeschisa(null); };", 'e2e',
  'o extensie închisă de om se redeschide la reîncărcare')
o('E03', EX, "setStare({ fel: 'esuat', mesaj: e.mesaj }); uitaExtensia(); raporteaza(e.mesaj);", "setStare({ fel: 'esuat', mesaj: e.mesaj }); raporteaza(e.mesaj);", 'e2e',
  'după o extensie care n-a pornit, cea de dinainte rămâne ținută')
o('E04', EX, "deRedeschis(extensiaTinuta(), l, adresaLaPornire)", "deRedeschis(extensiaTinuta(), l, location)", 'e2e',
  'adresa se citește după ce ancorele au fost șterse: linkul bibliotecii nu mai are întâietate')

# --- e2e: starea „n-a pornit” și „pornește greu” ---
o('E05', EX, "const ceas = setTimeout(() => { setGreu(true); }, TIMP_PORNIRE_GREA_MS);", "const ceas = setTimeout(() => { setGreu(false); }, TIMP_PORNIRE_GREA_MS);", 'e2e',
  'o pornire care nu se termină rămâne la „Pornesc extensia…”')
o('E06', SP, "export const TIMP_PORNIRE_GREA_MS = 10_000;", "export const TIMP_PORNIRE_GREA_MS = 1_000;", 'e2e',
  '„pornește greu” apare după o secundă')
o('E07', EX, "onDinNou={() => { repornire.cere(); }}", "onDinNou={() => {}}", 'e2e',
  '„Încearcă din nou” nu repornește extensia')
o('E08', EX, "deschideBiblioteca(deschisa.id, false, 'instalate')", "deschideBiblioteca(deschisa.id, false)", 'e2e',
  '„Vezi în bibliotecă” deschide fila „Toate”, unde extensia din fișier nu e')
o('E09', EX, "onInchide={inchide} />", "onInchide={() => {}} />", 'e2e',
  '„Închide”, din starea „n-a pornit”, nu închide')
o('S01', SP, "t(esuat ? 'extensii.stare.esuat.titlu' : 'extensii.stare.greu.titlu', { nume })", "t(esuat ? 'extensii.stare.greu.titlu' : 'extensii.stare.esuat.titlu', { nume })", 'e2e',
  'titlurile celor două stări sunt schimbate între ele')
o('S02', SP, "e.sursa.fel === 'fisier' ? t('extensii.stare.pachet.fisier',", "e.sursa.fel === 'fisier' ? t('extensii.stare.pachet.adresa',", 'e2e',
  'un pachet din fișier e spus „de la” o adresă')
o('S03', SP, "writeText(`${nume}\\n${pachet}\\n${stare.mesaj}`)", "writeText(stare.mesaj)", 'e2e',
  '„Copiază” pune doar eroarea, fără nume și pachet')
o('S04', SP, ".then(() => { setCopiat(true); }, () => undefined);", ".then(() => undefined, () => undefined);", 'e2e',
  '„Copiază” nu spune că a copiat')
o('S05', SP, "      {esuat && (\n        <details>", "      {(\n        <details>", 'e2e',
  'și starea „pornește greu” are „Detalii”, deși n-are ce arăta')
o('C02', CS, "  box-shadow: var(--umbra-1);\n  transform: translate(-50%, -50%);\n", "  box-shadow: var(--umbra-1);\n", 'e2e',
  'starea nu mai stă la mijlocul ferestrei')

# --- e2e: versiunea nouă peste extensia deschisă ---
o('E10', EX, "      else inchideCuGrija(() => { setDeschisa(noua); });", "      else inchideCuGrija();", 'e2e',
  'după o versiune nouă, extensia deschisă se închide în loc să se redeschidă')
o('E11', EX, "if (a?.id === id && a.oricum) setDeschisa(noua);", "if (a?.id === id && !a.oricum) setDeschisa(noua);", 'e2e',
  'după „Închide oricum”, redeschiderea mai întreabă o dată')
o('E12', EX, "      if (!h.nesalvat()) { aprobata.current = { id, oricum: false }; return true; }\n      return new Promise<boolean>((gata) => {",
  "      if (h !== null) { aprobata.current = { id, oricum: false }; return true; }\n      return new Promise<boolean>((gata) => {", 'e2e',
  'cu lucru nesalvat, întrebarea vine abia după instalare')
o('E13', EX, "    const f = laRamas.current;\n    laRamas.current = () => {};\n    f();\n    setIntrebare(false);\n    onModal(", "    laRamas.current = () => {};\n    setIntrebare(false);\n    onModal(", 'e2e',
  '„Rămân” nu mai oprește instalarea care o aștepta')
o('E14', EX, "    if (!await inainteDeInlocuire(rand.id)) {\n      setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== rand.id)));\n      return;\n    }\n", "", 'e2e',
  'actualizarea din meniu nu mai cere întâi salvările extensiei deschise')
o('E15', EX, "    if (!await inainteDeInlocuire(rand.id)) {\n      setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== rand.id)));\n      return;",
  "    if (!await inainteDeInlocuire(rand.id)) {\n      return;", 'e2e',
  'după „Rămân”, rândul din meniu rămâne la „Se actualizează…”')
o('E16', EX, "    m.querySelector<HTMLButtonElement>('[role=\"menuitem\"]:not(:disabled)')?.focus();\n  }, [progres, intrebare]);", "  }, [progres, intrebare]);", 'e2e',
  'după o actualizare din meniu, focusul cade pe pagină și Escape nu mai închide meniul')
o('E17', EX, "setTimeout(() => { if (!refMeniu.current) butonInchide.current?.focus(); }, 0);", "setTimeout(() => { butonInchide.current?.focus(); }, 0);", 'e2e',
  'după „Rămân”, focusul pleacă din meniul deschis la × al filei')
o('E18', EX, "{progres[deschisa.id]?.fel === 'lucreaza' && <small", "{progres[deschisa.id]?.fel === 'gata' && <small", 'e2e',
  'fila nu spune „se actualizează…” cât vine pachetul')
o('E21', EX, "acoperita: cerere !== null || intrebare,", "acoperita: cerere !== null,", 'e2e',
  'biblioteca nu e inertă sub întrebarea de la actualizare')
o('E22', EX, "onSchimbata: dupaInlocuire,", "onSchimbata: () => { reincarca(); },", 'e2e',
  'după actualizarea din pagina bibliotecii, extensia deschisă rămâne la versiunea veche')
o('E23', EX, "              if (id !== null) dupaInlocuire(id);\n", "", 'e2e',
  'după instalarea dintr-un fișier, extensia deschisă rămâne la versiunea veche')
o('I04', IN, "if (inainte && !await inainte(p.manifest.id)) { onGata(null); return; }", "if (inainte && !await inainte(p.manifest.id)) { setScriu(false); return; }", 'e2e',
  'după „Rămân”, confirmarea pachetului rămâne deschisă')
o('I05', IN, "    if (inainte && !await inainte(p.manifest.id)) { onGata(null); return; }\n", "", 'e2e',
  'instalarea dintr-un fișier nu mai cere întâi salvările extensiei deschise')
o('I10', IN, "    if (inainte && !await inainte(rand.id)) { onGata(null); return; }\n", "", 'e2e',
  'confirmarea unei versiuni din bibliotecă nu mai cere întâi salvările extensiei deschise')
o('B02', BI, "    if (inainte && !await inainte(rand.id)) {\n      setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== rand.id)));\n      return;\n    }\n", "", 'e2e',
  'actualizarea din pagina bibliotecii nu mai cere întâi salvările extensiei deschise')
o('B03', BI, "    if (inainte && !await inainte(rand.id)) {\n      setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== rand.id)));\n      return;",
  "    if (inainte && !await inainte(rand.id)) {\n      return;", 'e2e',
  'după „Rămân”, pagina bibliotecii rămâne la „se instalează”')
o('B01', BI, "useState<Fila>(cerere.fila ?? 'toate')", "useState<Fila>('toate')", 'e2e',
  'biblioteca nu se deschide la fila cerută')

# --- e2e: fereastra refuzului ---
o('I01', IN, "<Fereastra titlu={t('extensii.refuz.titlu')} test=\"extensii-instalare\" onEscape={renunta}>\n        <p className=\"confirmare-sursa\" data-testid=\"extensii-refuz-sursa\">{deLaAdresa",
  "<Fereastra titlu={t('extensii.instalare.titlu')} test=\"extensii-instalare\" onEscape={renunta}>\n        <p className=\"confirmare-sursa\" data-testid=\"extensii-refuz-sursa\">{deLaAdresa", 'e2e',
  'refuzul unui fișier stă iar sub „Instalezi o extensie?”')
o('I02', IN, "{deLaAdresa ? adresa : cerere.fisier.name}", "{adresa}", 'e2e',
  'fereastra refuzului nu mai spune numele fișierului')
o('I03', IN, "onClick={onAltFisier}", "onClick={renunta}", 'e2e',
  '„Alege alt fișier…” doar închide fereastra')
o('I07', IN, "const descarcare = pas.motiv === 'retea' || pas.motiv === 'http';", "const descarcare = false;", 'e2e',
  'o descărcare căzută nu mai are „Încearcă din nou”')
o('I08', IN, "onClick={() => { void instaleaza(cerere.rand); }}>{t('extensii.refuz.din-nou')}", "onClick={renunta}>{t('extensii.refuz.din-nou')}", 'e2e',
  '„Încearcă din nou” doar închide fereastra')
o('I09', IN, "{`${cerere.rand.nume} ${cerere.rand.versiune}`}", "{cerere.rand.id}", 'e2e',
  'refuzul unui pachet din bibliotecă nu spune numele și versiunea')
o('P01', MT, "detaliu && m !== 'retea' ? ` (${detaliu})` : ''", "detaliu ? ` (${detaliu})` : ''", 'e2e',
  'la lipsa rețelei, refuzul arată textul browserului („Failed to fetch”)')

# --- e2e: „Închizi …?” ---
o('E19', EX, "<button type=\"button\" className=\"pericol\" data-extensii=\"inchidere-inchide\"", "<button type=\"button\" data-extensii=\"inchidere-inchide\"", 'e2e',
  '„Închide oricum” nu mai e roșu')
o('E20', EX, "data-extensii=\"inchidere-ramai\" autoFocus onClick={ramai}", "data-extensii=\"inchidere-ramai\" onClick={ramai}", 'e2e',
  '„Rămân” nu mai are focusul')
o('C01', CS, ".dialog .butoane button.pericol:not([data-buton='renunta']) {\n  color: var(--s-panou);", ".dialog .butoane button.pericol:first-child:not([data-buton='renunta']) {\n  color: var(--s-panou);", 'e2e',
  'un buton periculos e roșu doar dacă e primul')

SETURI = {
    'tinuta': ['test/unit/extensii.tinuta.test.ts'],
    'texte': ['test/unit/extensii.texte.test.ts'],
    'manual': ['test/unit/manual.test.ts'],
}
E2E = ['test/e2e/extensii.stari.spec.ts']
