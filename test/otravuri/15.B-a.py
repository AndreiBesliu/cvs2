# Lista de otrăvuri a feliei 15.B↑a (raportările clienților, ADR 0116 §C), 02.11.2026, alese de autor: callable-ul
# `tichete` (cine raportează, plafonul zilnic, cine răspunde, versiunea văzută, plafonul răspunsurilor, numărul necitit,
# citirea doar de autor, ordinea, auditul fără text, semnul din deschiderea contului), regulile (autorul doar pe ale lui, poza),
# editorul pe hârtie (sesiunea, erorile doar locale, amprentele o dată și ultimele 20, browserul tăiat și curățat, planul de
# azi, amprenta din mesajul trimis, rândurile meniului, semnul doar cu întregi), contractul și fila Tichete pe hârtie (planul
# greșit, vârsta roșie cu răspuns, amprentele greșite pe rând, ordinea) și cinci de interfață, prin e2e-ul pe
# emulatoare (amprentele și poza trimise, semnul la pornire, notarea citită, fereastra din rândul ei).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-un worktree în afara Drive-ului, după commit. Seturile
# „server” și „reguli” cer emulatoarele: comanda trece prin `firebase emulators:exec`. Cele „e2e” cer build-ul, deci, cu npm
# stricat pe mașină, trec prin bucla din raportul feliei (vite și Playwright prin `node`, în `emulators:exec`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AC = 'functions/src/tichete/actiuni.ts'
RG = 'firestore.rules'
RP = 'src/app/raportare.ts'
RT = 'src/cloud/raportor.ts'
MC = 'src/app/meniuCont.ts'
TC = 'shared/tichete.ts'
AD = 'src/admin/tichete/date.ts'
RN = 'src/app/raportariNecitite.ts'
RA = 'src/app/Raportari.tsx'
PC = 'src/app/PanouCont.tsx'
ED = 'src/app/Editare.tsx'

# ---- Callable-ul `tichete` ----
o('S01', AC, '    if (!cont.exists && !staff.exists) throw', '    if (false) throw', 'server', 'raportează și cine n-are contul deschis')
o('S02', AC, '    if (azi >= TICHETE_PE_ZI) throw', '    if (azi > TICHETE_PE_ZI) throw', 'server', 'o raportare peste plafonul zilnic')
o('S03', AC, "    const azi = l.get('zi') === zi ? numar(l.get('numar')) : 0;", "    const azi = numar(l.get('numar'));", 'server',
  'contorul nu se reia a doua zi')
o('S04', AC, """    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('tichete.raspunde')) throw new HttpsError('permission-denied', FARA_RASPUNS);
    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    const staff""", """    const drepturi = await drepturiIn(tx, db, uid);
    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    const staff""", 'server', 'răspunde oricine, fără tichete.raspunde')
o('S05', AC, """    if (!drepturi.permisiuni.has('tichete.raspunde')) throw new HttpsError('permission-denied', FARA_RASPUNS);
    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    if (!t.exists)""", """    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    if (!t.exists)""", 'server', 'starea o schimbă oricine')
o('S06', AC, """    if (t.get('versiune') !== versiune) throw new HttpsError('failed-precondition', SCHIMBAT);
    const vechi: unknown""", """    const vechi: unknown""", 'server', 'răspunsul pe o versiune veche trece')
o('S07', AC, """    if (t.get('versiune') !== versiune) throw new HttpsError('failed-precondition', SCHIMBAT);
    const inainte: unknown = t.get('stare');
    if (inainte === stare)""", """    const inainte: unknown = t.get('stare');
    if (inainte === stare)""", 'server', 'starea pe o versiune veche trece')
o('S08', AC, '    if (lista.length >= RASPUNSURI_MAX) throw', '    if (lista.length > RASPUNSURI_MAX) throw', 'server', 'un răspuns peste plafon')
o('S09', AC, "      necititeAutor: numar(t.get('necititeAutor')) + 1,", '      necititeAutor: 1,', 'server', 'răspunsurile necitite nu se adună')
o('S10', AC, "    const stare: StareTichet = !esteStareTichet(inainte) || inainte === 'nou' ? 'deschis' : inainte;",
  "    const stare: StareTichet = 'deschis';", 'server', 'un răspuns redeschide tichetul rezolvat')
o('S11', AC, "    if (t.get('autor') !== uid) throw new HttpsError('permission-denied', 'doar autorul",
  "    if (false) throw new HttpsError('permission-denied', 'doar autorul", 'server', 'altcineva notează citite răspunsurile autorului')
o('S12', AC, '  const toate = q.docs.map(raportareaDin).sort((a, b) => b.creatLa - a.creatLa);',
  '  const toate = q.docs.map(raportareaDin).sort((a, b) => a.creatLa - b.creatLa);', 'server', 'raportările mele, cele vechi întâi')
o('S13', AC, "      dupa: { fel, caractere: [...text].length, amprente: amprente.length, poza: meta },",
  "      dupa: { fel, text, amprente: amprente.length, poza: meta },", 'server', 'textul raportării în audit')
o('S14', AC, "  return q.docs.filter((s) => numar(s.get('necititeAutor')) > 0).length;", '  return q.docs.length;', 'server',
  'semnul numără toate raportările, nu doar pe cele cu răspuns nou')

# ---- Regulile ----
o('G01', RG, "        || (request.auth != null && resource.data.autor == request.auth.uid);",
  "        || request.auth != null;", 'reguli', 'orice om logat citește toate tichetele')
o('G02', RG, "          || (request.auth != null && get(/databases/$(database)/documents/tichete/$(id)).data.autor == request.auth.uid);",
  "          || request.auth != null;", 'reguli', 'orice om logat citește poza oricărui tichet')

# ---- Editorul, pe hârtie ----
o('C01', RP, '  return intrari.filter((i) => !i.doarLocala && Date.parse(i.cand) >= inceput);',
  '  return intrari.filter((i) => !i.doarLocala && Date.parse(i.cand) > inceput);', 'client', 'eroarea din clipa pornirii lipsește')
o('C02', RP, '  return intrari.filter((i) => !i.doarLocala && Date.parse(i.cand) >= inceput);',
  '  return intrari.filter((i) => Date.parse(i.cand) >= inceput);', 'client', 'și erorile doar locale (care nu ajung pe server)')
o('C03', RP, '  const alese = [...ultimele.values()].slice(-AMPRENTE_MAX);', '  const alese = [...ultimele.values()].slice(0, AMPRENTE_MAX);',
  'client', 'primele 20 de erori, nu ultimele')
o('C04', RP, '    ultimele.delete(cheie);\n', '', 'client', 'locul unei erori repetate e al primei apariții')
o('C05', RP, "    browser: [...(browser || 'necunoscut')].slice(0, BROWSER_MAX).join('').trim(),",
  "    browser: browser || 'necunoscut',", 'client', 'browserul netăiat (serverul refuză toată raportarea)')
o('C06', RP, "  const browser = x.browser.replace(/[\\u0000-\\u001f\\u007f]/g, ' ').replace(/\\s+/g, ' ').trim();",
  "  const browser = x.browser.replace(/\\s+/g, ' ').trim();", 'client', 'caracterele de control rămân în browser')
o('C07', RP, '    plan: x.drept ? dreptLaZi(x.drept, acum).plan : null,', '    plan: x.drept ? x.drept.plan : null,', 'client',
  'planul ținut, nejudecat azi (proba trecută rămâne „proba”)')
o('C08', RT, "cheieAmprenta('client', i.tip, mesajRaportat(i.mesaj))", "cheieAmprenta('client', i.tip, i.mesaj)", 'client2',
  'amprenta din mesajul brut, nu din cel trimis')
o('C09', MC, '  const deschis = cont !== null && cont.drept !== null;', '  const deschis = cont !== null;', 'client',
  'raportările și cu adresa neconfirmată (serverul le refuză)')
o('C10', RN, '  const x = Number.isSafeInteger(n) && n > 0 ? n : 0;', '  const x = n > 0 ? n : 0;', 'client', 'semnul primește fracții și infinit')

# ---- Contractul și fila Tichete, pe hârtie ----
o('A01', TC, "  if (versiune === null || instanta === null || browser === null || (o['plan'] !== null && plan === null) || (limba !== 'ro' && limba !== 'en')) return null;",
  "  if (versiune === null || instanta === null || browser === null || (limba !== 'ro' && limba !== 'en')) return null;", 'client',
  'un plan greșit trece drept „fără plan”')
o('A02', TC, "  return t.stare !== 'rezolvat' && t.raspunsuri === 0 && acum - t.creatLa >= FARA_RASPUNS_MS;",
  "  return t.stare !== 'rezolvat' && acum - t.creatLa >= FARA_RASPUNS_MS;", 'client', 'roșu și un tichet cu răspuns')
o('A03', AD, "amprente.filter((a): a is string => typeof a === 'string' && RE_AMPRENTA.test(a))",
  "amprente.filter((a): a is string => typeof a === 'string')", 'client', 'pe rând, și amprentele greșite')
o('A04', AD, '  return [...lista].sort((a, b) => cand(b) - cand(a) || a.id.localeCompare(b.id));',
  '  return [...lista].sort((a, b) => cand(a) - cand(b) || a.id.localeCompare(b.id));', 'client', 'fila arată întâi tichetele vechi')

# ---- Interfața (e2e pe emulatoare) ----
o('E01', RA, "aplicatia: app, amprente: a,", "aplicatia: app, amprente: [],", 'e2e', 'amprentele arătate nu pleacă')
o('E02', RA, """      if (poza) {
        try {""", """      if (false) {
        try {""", 'e2e', 'bifa pozei nu atașează poza')
o('E03', RA, '        if (ok) puneRaportariNecitite(raportariNecitite() - 1);', '        if (ok) puneRaportariNecitite(raportariNecitite());', 'e2e',
  'răspunsul văzut nu stinge semnul')
o('E04', PC, '  puneRaportariNecitite(r.verificat ? r.raportariNecitite ?? 0 : 0);', '  puneRaportariNecitite(0);', 'e2e',
  'deschiderea contului nu aprinde semnul')
o('E05', ED, """    } else if (id === 'raportari') {
      setRaportari(true);""", """    } else if (id === 'raportari') {
      setRaportare(true);""", 'e2e', '„Raportările mele” deschide o raportare nouă')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    # Câte un singur fișier de emulator pe set: două fișiere în același `node --test` rulează în paralel pe același emulator și
    # își golesc unul altuia documentele (baza iese roșie, iar verdictele ei nu contează).
    'server': ['functions/test/tichete.emulator.test.ts'],
    'reguli': ['functions/test/reguli.emulator.test.ts'],
    'client': u('raportare', 'meniuCont', 'manual', 'tichete'),
    'client2': u('raportare', 'meniuCont', 'manual', 'tichete', 'raportor', 'erori.contract'),
}
E2E = ['test/e2e-emulator/tichete.emulator.spec.ts']
