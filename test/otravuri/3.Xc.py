# Sabotajele feliei 3.Xc, fereastra extensiei și senderul prin `HostApi` (ADR 0199), 03.11.2026: fiecare apărare a
# serviciului `masina.*` (permisiunea, live, metoda, argumentele, plafonul, așteptarea ferestrei Mașina), a părții pure din
# fereastra Mașina (starea pentru extensie, pornirea, reluarea, pauza, învelișul cu confirmarea legată de programul și de
# starea arătate), a ferestrei imitate din planificator, a catalogului și a legării în pagină (fereastra extensiei, fila,
# confirmarea, starea trimisă, lucrarea trimisă), stricată o dată; proba care o apără trebuie să pice. Alese de autorul
# feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - încărcătorul (`shared/cadruExtensie.ts`): orice schimbare a textului lui schimbă amprenta, deci o prinde
#   `csp.extensii.test.ts` oricare ar fi; învelișurile `host.masina` și `host.descarcari` le folosesc probele e2e;
# - `if (j === ultima) return;` (starea trimisă doar la schimbare): fără el, aceeași stare pleacă de mai multe ori (doar mai
#   multe mesaje), echivalent pentru extensie;
# - `if (f !== FEREASTRA_EXTENSIE) tineFereastra(f);`: fereastra ținută se citește prin `fereastraTinuta`, care nu știe de
#   fereastra extensiei și dă prima din listă, deci și fără gardă aplicația pornește în Proiectare (doar fereastra Mașina,
#   dacă era ținută, se uită).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MAS = 'src/extensii/masina.ts'
MEX = 'src/app/masinaExtensii.ts'
FLX = 'src/machine/flux.ts'
INT = 'extensii/trenulet/intrare.ts'
PAC = 'src/extensii/pachet.ts'
GAZ = 'src/extensii/cadru.ts'
APP = 'src/app/App.tsx'
EXT = 'src/extensii/Extensii.tsx'
CON = 'src/app/ConfirmareMasina.tsx'
PAN = 'src/app/PanouMasina.tsx'
DLG = 'src/app/DialogLucrare.tsx'
EDI = 'src/app/Editare.tsx'

E2E = ['test/e2e/extensii.masina.spec.ts', 'test/e2e/trenulet.spec.ts']

SETURI = {
    'serviciu': ['test/unit/extensii.masina.test.ts'],
    'pure': ['test/unit/masina.extensii.test.ts'],
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
    'pachet': ['test/unit/extensii.pachet.test.ts', 'test/unit/trenulet.test.ts'],
}

# ---- serviciul gazdei (unitar) ----
o('S01', MAS, "  if (!ext.permisiuni.includes('masina')) return refuz('permisiune');\n", '', 'serviciu', 'senderul fără permisiune')
o('S02', MAS, "  if (!s.activ) return refuz('live');\n", '', 'serviciu', 'senderul pornit și pe live')
o('S03', MAS, "      return refuz('necunoscut');", "      return { ok: true, rezultat: null };", 'serviciu', 'o metodă necunoscută „reușește”')
o('S04', MAS, 's.masina()?.stare() ?? FARA_MASINA', 's.masina()?.stare() ?? null', 'serviciu', 'starea fără fereastra Mașina: nimic')
o('S05', MAS, 'TIPURI_PROGRAM.includes(tip) ? n : null', 'n', 'serviciu', 'orice tip de fișier e program')
o('S06', MAS, "      if (date === null) return refuz('date');\n", "      if (date === null) return refuz('nume');\n", 'serviciu', 'datele greșite, cu alt cod')
o('S07', MAS, 'if (date.size > OCTETI_PROGRAM)', 'if (date.size > OCTETI_PROGRAM + 1)', 'serviciu', 'un octet peste plafon trece')
o('S08', MAS, '      const m = await s.asteapta();\n', '      const m = s.masina();\n', 'serviciu', 'încărcarea nu montează fereastra Mașina')
o('S09', MAS, 'din(await m.incarca(nume, octeti, ext.nume))', 'din(await m.incarca(nume, octeti, ext.id))', 'serviciu', 'programul „de la” id, nu de la numele extensiei')
o('S10', MAS, "return m ? din(await m[metoda](ext.nume)) : refuz('neconectat');", "return m ? din(await m[metoda](ext.nume)) : { ok: true, rezultat: null };", 'serviciu', 'pornirea fără fereastra Mașina „reușește”')
o('S11', MAS, "return m ? din(m[metoda]()) : refuz('neconectat');", "return m ? din(m[metoda]()) : { ok: true, rezultat: null };", 'serviciu', 'oprirea fără fereastra Mașina „reușește”')
o('S12', MAS, "return r === null ? refuz('lucrare') : { ok: true, rezultat: r };", "return { ok: true, rezultat: r };", 'serviciu', 'lucrarea fără forma protocolului „primită”')
o('S13', MAS, "eroare: `masina:${cod}`", "eroare: cod", 'serviciu', 'refuzurile fără prefixul serviciului')

# ---- partea pură a ferestrei Mașina (unitar) ----
o('P01', MEX, 'indicator: i ? { fel: i.fel, procent: i.procent, linie: i.linie, cod: i.cod } : null,', 'indicator: i,', 'pure', 'indicatorul întreg (culoarea, butonul) ajunge la extensie')
o('P02', MEX, 'program: p ? { nume, sha256: p.sha256, linii: p.linii.length } : null,', 'program: p ? { nume: null, sha256: p.sha256, linii: p.linii.length } : null,', 'pure', 'programul fără nume')
o('P03', MEX, "  if (!permis) return 'fara-capabilitate';\n", '', 'pure', 'pornirea fără capabilitatea contului')
o('P04', MEX, "  if (st.conexiune !== 'conectat') return 'neconectat';\n  return refuzStart(st.flux);", '  return refuzStart(st.flux);', 'pure', 'pornirea întrebată fără legătură')
o('P05', MEX, "  if (i?.fel === 'alarma') return { ok: false, cod: 'alarma' };\n", '', 'pure', 'reluarea în alarmă')
o('P06', MEX, "  if (st.flux.faza === 'bariera') return { ok: false, cod: 'bariera' };\n", '', 'pure', 'bariera fără codul ei')
o('P07', MEX, "if (i?.buton === 'reia') return { ok: true, eveniment: 'eliberare' };", "if (i?.buton === 'reia') return { ok: true, eveniment: 'reia' };", 'pure', 'din Hold, reluarea după eroare în loc de eliberare')
o('P08', MEX, "return indicatorLucrare(st)?.buton === 'pauza' ? null : 'nimic';", "return indicatorLucrare(st) !== null ? null : 'nimic';", 'pure', 'pauză și când nu rulează')
o('P09', FLX, '|| s.inZbor.length > 0 || s.coada.length > 0) return \'faza\';', '|| s.inZbor.length > 0) return \'faza\';', 'pure', 'pornirea cu o comandă manuală la coadă')
o('P10', MEX, "    if (cerere) { rezolva({ ok: false, cod: 'ocupat' }); return; }\n", '', 'pure', 'două întrebări odată')
o('P11', MEX, "        if (acum.flux.program !== program) { rezolva({ ok: false, cod: 'schimbat' }); return; }\n", '', 'pure', 'confirmarea pornește alt program decât cel arătat')
o('P12', MEX, "        if (r.eveniment !== eveniment) { rezolva({ ok: false, cod: 'schimbat' }); return; }\n", '', 'pure', 'confirmarea reia altfel decât s-a arătat')
o('P13', MEX, "          const cod = refuzPornire(acum, f.permis());\n          if (cod) { rezolva({ ok: false, cod }); return; }\n          if (acum.transport", "          if (acum.transport", 'pure', 'contul nejudecat din nou la confirmare')
o('P14', MEX, "        if (cerere !== c) return;\n", '', 'pure', 'un al doilea răspuns la aceeași întrebare contează')
o('P15', MEX, "        if (!da) { rezolva({ ok: false, cod: 'renuntat' }); return; }\n", '', 'pure', '„Nu” pornește')
o('P16', MEX, "          if (acum.transport === 'retea') f.avertizat();\n", '', 'pure', 'avertismentul WiFi necontat la o pornire confirmată')
o('P17', MEX, "  const ocupat = (): RezultatMasina | null => (cerere\n", "  const ocupat = (): RezultatMasina | null => (false\n", 'pure', 'încărcarea cât așteaptă o confirmare')
o('P18', MEX, ": lucrareInceputa(s.stare().flux.faza) ? { ok: false, cod: 'in-lucru' } : null);", ': null);', 'pure', 'încărcarea în timpul unei lucrări')
o('P19', MEX, "`program:${rez.cod}${rez.linie === null ? '' : `:${rez.linie + 1}`}`", "`program:${rez.cod}${rez.linie === null ? '' : `:${rez.linie}`}`", 'pure', 'linia refuzului numărată de la 0')
o('P20', MEX, '      f.incarcat(nume, extensie);\n', '', 'pure', 'fereastra nu află ce program a adus extensia')
o('P21', MEX, 'cerere && (extensie === undefined || cerere.extensie === extensie)', 'cerere', 'pure', 'anularea închide și întrebarea altei extensii')
o('P22', MEX, "      if (cod) return { ok: false, cod };\n      s.eveniment({ tip: 'hold' });", "      s.eveniment({ tip: 'hold' });", 'pure', 'pauza trimisă și când nu rulează')

# ---- fereastra imitată a planificatorului (unitar) ----
o('I01', INT, "    if (!adresa.endsWith('#primeste-lucrare')) return null;\n", '', 'adaptoare', 'orice adresă deschide fereastra imitată')
o('I02', INT, '      origine = new URL(adresa).origin;\n', '      origine = adresa;\n', 'adaptoare', 'originea e adresa întreagă')
o('I03', INT, "d.protocol !== PROTOCOL) return;", "d.protocol === undefined) return;", 'adaptoare', 'un alt protocol primește „gata”')
o('I04', INT, "host.cere('masina.trimite', m)", "host.cere('masina.lucrare', m)", 'adaptoare', 'lucrarea cerută altui serviciu')
o('I05', INT, '            inchisa = true;\n', '', 'adaptoare', 'un refuz lasă fereastra „deschisă”')
o('I06', INT, '            host.raporteaza(new Error(`Trimite la cvs2: ${e instanceof Error ? e.message : String(e)}`));\n', '', 'adaptoare', 'refuzul nu ajunge în jurnal')
o('I07', INT, 'source: imitata })', 'source: null })', 'adaptoare', 'mesajul nu vine de la fereastra imitată')

# ---- catalogul (unitar) ----
o('K01', PAC, "['stocare', 'descarcari', 'masina']", "['stocare', 'descarcari']", 'pachet', 'senderul scos din catalog')

# ---- legarea în pagină (e2e) ----
o('E01', INT, "  if (await host.cere('masina.stare').then(() => true, () => false)) deschiderePeste(host);\n", '', 'e2e', '„Trimite la cvs2” fără fereastra imitată')
o('E02', GAZ, "          : serviciu === 'masina'\n", "          : serviciu === 'mașina'\n", 'e2e', 'cererile senderului nu ajung la serviciu')
o('E03', GAZ, "  if (gazda.activ && ext.manifest.permisiuni.includes('masina')) {", '  if (false) {', 'e2e', 'starea nu se trimite cadrului')
o('E04', GAZ, '      masinaPentruExtensii.citeste()?.anuleaza(ext.manifest.nume);\n', '', 'e2e', 'confirmarea unei extensii oprite rămâne deschisă')
o('E05', APP, "    if (x !== null) deschideFereastra(FEREASTRA_EXTENSIE);\n", '', 'e2e', 'extensia deschisă nu-și arată fereastra')
o('E06', APP, "    else if (fereastraRef.current === FEREASTRA_EXTENSIE) deschideFereastra('proiectare');\n", '', 'e2e', 'după ×, fereastra rămâne goală')
o('E07', APP, ' || modalExtensii || modalMasina;', ' || modalExtensii;', 'e2e', 'aplicația nu e inertă sub confirmare')
o('E08', APP, "usaAcoperita={fereastra === FEREASTRA_EXTENSIE ? 'extensii.buton' : 'vedere.masina'}", "usaAcoperita={'vedere.masina'}", 'e2e', 'F1 în fereastra extensiei deschide capitolul mașinii')
o('E09', APP, ' onModal={setModalMasina} />', ' />', 'e2e', 'confirmarea nu ajunge la carcasă')
o('E10', EXT, "{...(fereastra ? { 'aria-current': 'page' as const } : {})}", '', 'e2e', 'fila extensiei niciodată apăsată')
o('E11', CON, '  const [activ, setActiv] = useState(false);', '  const [activ, setActiv] = useState(true);', 'e2e', '„Pornește” activ de la început')
o('E12', CON, 'data-masina="confirma-renunta" autoFocus', 'data-masina="confirma-renunta"', 'e2e', 'focusul nu stă pe „Nu”')
o('E13', CON, "    if (e.key !== 'Escape') return;\n", "    if (e.key !== 'Esc') return;\n", 'e2e', 'Escape nu e „Nu”')
o('E14', PAN, '        setDeLa(extensie);\n', '', 'e2e', 'fereastra Mașina nu spune de la cine e programul')
o('E15', DLG, "  if (origine.startsWith(ORIGINE_EXTENSIE)) return t('masina.lucrare.origine-extensie', { nume: origine.slice(ORIGINE_EXTENSIE.length) });\n", '', 'e2e', 'dialogul primirii arată originea brută a extensiei')
o('E16', DLG, '  if (!r.ok) return Promise.resolve(null);\n', '  if (!r.ok) return new Promise(() => {});\n', 'e2e', 'lucrarea fără formă nu primește niciun răspuns')
o('E17', EDI, '  if (!activ) return acoperita;', "  if (!activ) return 'vedere.masina';", 'e2e', 'F1 nu ține seama de fereastra care acoperă')
