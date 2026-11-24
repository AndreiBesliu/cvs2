# Lista de otrăvuri a feliei 16.A↑c (biblioteca de freze în cont; ADR 0300 §3, §7), 24.11.2026, 47, alese de autor: serverul
# (versiunea văzută, plafoanele, numărătorile, semnele ștergerii și plecarea lor, lista întreagă, paginile, dreptul `cloud`,
# id-urile), îmbinarea pe câmpuri și sincronizarea pură (ce vine, ce pleacă, răspunsurile, lista întreagă, conflictul,
# numele, starea ținută, aducerea din browser), depozitul pe cont, trecerea (paginile, loturile, contul plin, lista întreagă,
# erorile) și fereastra pe emulatoare (biblioteca contului, aducerea, conflictul, programarea, editorul la zi, starea).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. Seturile `server` și `reguli` cer
# emulatorul Firestore (`firebase emulators:exec --only firestore`); setul `e2e`, `scripts/otravuri-emulatoare.py`, în
# `firebase emulators:exec --only auth,firestore,functions,storage`, cu funcțiile compilate.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SA = 'functions/src/freze/actiuni.ts'
SF = 'shared/freze.ts'
SC = 'shared/conturi.ts'
M = 'src/model/frezeSincron.ts'
D = 'src/app/frezeMele.ts'
OR = 'src/app/frezeSincronizare.ts'
F = 'src/app/FrezeleMele.tsx'

# Serverul (emulatorul Firestore).
o('S01', SA, '      if (f.vazuta !== acolo.versiune) {', '      if (false && f.vazuta !== acolo.versiune) {', 'server', 'versiunea văzută nu se judecă')
o('S02', SA, '      if (!vie && numar >= l.freze) {', '      if (!vie && numar > l.freze) {', 'server', 'a 501-a freză intră')
o('S03', SA, '      if (!vie) numar++;\n', '', 'server', 'frezele noi nu se numără')
o('S04', SA, '        tx.set(col.doc(f.id), { versiune, json: null, stearsaLa: versiune, schimbatLa: cand });',
  '        tx.delete(col.doc(f.id));', 'server', 'ștergerea nu lasă semn')
o('S05', SA, '    const complet = dupa === 0 || dupa < sincron.purjatPana || dupa > sincron.versiune;', '    const complet = dupa === 0;', 'server',
  'un calculator rămas în urma semnelor plecate nu primește lista întreagă')
o('S06', SA, '    const mai = q.docs.length > l.pagina;', '    const mai = false;', 'server', 'fără pagina următoare')
o('S07', SA, '    const pana = mai ? freze[freze.length - 1]!.versiune : sincron.versiune;', '    const pana = sincron.versiune;', 'server',
  'pagina spune versiunea contului, nu a ultimei freze date')
o('S08', SA, '    if (!(await poateScrie(tx, db, uid, acum.getTime()))) {', '    if (false && !(await poateScrie(tx, db, uid, acum.getTime()))) {', 'server',
  'scrierea fără capabilitatea `cloud`')
o('S09', SA, "      purjatPana = Math.max(purjatPana, intreg(d.get('versiune')));\n", '', 'server', 'plecarea semnelor nu se ține minte')
o('S10', SA, 'Math.max(0, sincron.sterse + semneNoi - l.sterse)', 'Math.max(0, sincron.sterse - l.sterse)', 'server',
  'semnele noi nu se socotesc la plafon')
o('S11', SA, '      if (!vie && acolo.versiune > 0) sterse--;\n', '', 'server', 'o freză readusă rămâne numărată ca semn')
o('S12', SA, '      tx.set(col.doc(f.id), { versiune, json: f.json, schimbatLa: cand });',
  '      tx.set(col.doc(f.id), { versiune, json: f.json, schimbatLa: cand, stearsaLa: acolo.versiune });', 'server',
  'o freză readusă păstrează semnul ștergerii')
o('S13', SF, 'if (typeof json !== \'string\' || octeti(json) > OCTETI_FREZA) return false;',
  'if (typeof json !== \'string\' || json.length > OCTETI_FREZA) return false;', 'server', 'plafonul pe caractere, nu pe octeți UTF-8')
o('S14', SF, " && ID.test(x) && !/^__.*__$/.test(x);", ' && ID.test(x);', 'server', 'id-urile `__…__` trec (Firestore le refuză)')
o('S15', SC, "new Set<Capabilitate>(['export-gcode', 'masina', 'cloud'])", "new Set<Capabilitate>(['export-gcode', 'masina'])", 'server',
  'proba trecută scrie în cont')

# Îmbinarea și sincronizarea pură (unitare).
o('M01', M, '  if (baza !== null && egale(mea, baza)) return { ok: true, rezultat: cont };', '  if (baza !== null && egale(mea, baza)) return { ok: true, rezultat: mea };',
  'model', 'neschimbată aici, cea din cont se pierde')
o('M02', M, '    const ia = m === b ? cont : c === b || m === c ? mea : null;', '    const ia = m === b ? cont : mea;', 'model',
  'același câmp schimbat pe ambele părți: a mea câștigă, fără conflict')
o('M03', M, '  if (frezaDinDate(rezultat) === null) return', '  if (false) return', 'model', 'o îmbinare care nu e o freză bună trece')
o('M04', M, "rev: Math.max(numar(mea['rev']), numar(cont['rev'])) + 1,", "rev: Math.max(numar(mea['rev']), numar(cont['rev'])),", 'model',
  'îmbinarea fără versiune nouă')
o('M05', M, '    const schimbataAici = !brutaAici && (baza ? (deAici === null ? baza.json !== null : jsonCanonic(deAici) !== baza.json) : deAici !== null);',
  '    const schimbataAici = false;', 'model', 'o schimbare de aici se pierde sub cea venită')
o('M06', M, '    if (b.sincron.conflicte.has(f.id) || !esteIdFreza(f.id)) continue;', '    if (!esteIdFreza(f.id)) continue;', 'model',
  'o freză în conflict pleacă')
o('M07', M, '    if (octeti(json) > OCTETI_FREZA) { mari.push(f.id); continue; }', '', 'model', 'o freză peste plafon pleacă (și tot lotul e refuzat)')
o('M08', M, '  for (const x of b.brute) { const id = idDin(x); if (id !== null) aici.add(id); }\n', '', 'model',
  'frezele brute se șterg din cont')
o('M09', M, '      if (!l.plina.includes(r.id)) l.plina.push(r.id);', '', 'model', 'contul plin nu se ține minte')
o('M10', M, '      if (r.versiune === 0) l.baze.delete(r.id);\n      else l.baze.set', '      l.baze.set', 'model',
  'ștergerea unei freze pe care contul n-a avut-o lasă o bază')
o('M11', M, "    if (schimbata) { l.conflicte.set(id, { versiune: 0, json: null, campuri: ['*'] }); continue; }\n", '', 'model',
  'la lista întreagă, o freză schimbată aici se șterge')
o('M12', M, "  if (alesa === 'mea') return l.gata();\n", '', 'model', '„a mea” ia freza din cont')
o('M13', M, 'nume: numeLiber(mea.nume, [...l.citite.values()], l.numeBrute()) };', 'nume: mea.nume };', 'model',
  '„amândouă” lasă două freze cu același nume')
o('M14', M, '      const deRedenumit = !this.baze.has(alta.id) ? alta : venita;', '      const deRedenumit = venita;', 'model',
  'freza venită e redenumită, nu cea nouă de aici')
o('M15', M, "    if (obiect(e) && esteIdFreza(e['id']) && versiuneBuna(e['versiune'])", "    if (obiect(e) && typeof e['id'] === 'string' && versiuneBuna(e['versiune'])",
  'model', 'starea ținută primește cheia `__proto__`')
o('M16', M, '  const stiute = new Set<string>([...b.freze.map((f) => f.id), ...b.sincron.baze.keys()]);',
  '  const stiute = new Set<string>(b.freze.map((f) => f.id));', 'model', 'o freză ștearsă din cont e adusă iar din browser')
o('M17', M, '    if (freze.length >= plafon) break;\n', '', 'model', 'aducerea din browser trece de plafon')
o('M18', M, "  if (mea === null || cont === null) return mea === cont ? { ok: true, rezultat: null } : { ok: false, campuri: ['*'] };",
  "  if (mea === null || cont === null) return { ok: false, campuri: ['*'] };", 'model', 'ștearsă pe ambele părți e conflict')

# Depozitul pe cont și trecerea (unitare).
o('D01', D, 'const deScris = (c: Citita): Record<string, unknown> => ({ ...c.extra, v: VERSIUNE_FREZE,',
  'const deScris = (c: Citita): Record<string, unknown> => ({ v: VERSIUNE_FREZE,', 'orchestra', 'o schimbare a omului pierde starea sincronizării')
o('D02', D, "            if (b === null) throw new RefuzLista({ lista: 'versiune' });", '            if (b === null) return deScris(c);', 'orchestra',
  'o trecere fără nimic de schimbat scrie')
o('T01', OR, '      if (!r.mai) break;', '      break;', 'orchestra', 'doar prima pagină a listei')
o('T02', OR, '  for (let i = 0; i < l.length; i += LOT_FREZE) yield l.slice(i, i + LOT_FREZE);',
  '  for (let i = 0; i < l.length; i += LOT_FREZE + 1) yield l.slice(i, i + LOT_FREZE + 1);', 'orchestra', 'loturi de 51')
o('T03', OR, "        for (const x of r.rezultate) if (x.stare === 'plina') refuzate.add(x.id);\n", '', 'orchestra',
  'contul plin: freza refuzată se trimite iar în aceeași trecere')
o('T04', OR, '    if (complet) await b.schimbaCont((c) => cuListaCompleta(c, vazute));\n', '', 'orchestra',
  'lista întreagă nu șterge frezele care lipsesc')
o('T05', OR, "    case 'functions/unavailable': case 'functions/deadline-exceeded': case 'functions/cancelled': return 'fara-retea';",
  "    case 'functions/deadline-exceeded': case 'functions/cancelled': return 'fara-retea';", 'orchestra', 'fără rețea spune „eroare”')

# Fereastra, pe emulatoare.
o('E01', F, '  const cheie = uid ? cheieCont(uid) : CHEIE_LOCALA;', '  const cheie = CHEIE_LOCALA;', 'e2e', 'fereastra nu lucrează pe biblioteca contului')
o('E02', F, '        {deAdus > 0 && !doarCitire ? (', '        {false ? (', 'e2e', 'nicio întrebare despre frezele din browser')
o('E03', F, '        {conflict ? (', '        {false ? (', 'e2e', 'conflictul nu se arată')
o('E04', F, "    setMesaj(t('freze.stare.salvat'));\n    sincronizare.programeaza();\n    return r.id;", "    setMesaj(t('freze.stare.salvat'));\n    return r.id;", 'e2e',
  'salvarea nu sincronizează')
o('E05', F, '    if (JSON.stringify(c) !== JSON.stringify(initiala)) { setCiorna(c); setInitiala(c); }\n', '', 'e2e',
  'editorul nu arată schimbarea venită din cont')
o('E06', F, "    if (legatura.ultima !== 'la-zi') return [t(`freze.loc.${legatura.ultima}`), 'atentie'];\n", '', 'e2e',
  'doar citirea nu se spune')
o('E07', F, "onClick={() => { rezolva(conflict[0], 'mea'); }}", "onClick={() => { rezolva(conflict[0], 'cont'); }}", 'e2e',
  '„Păstrează-o pe a mea” ia freza din cont')

SETURI = {
    'model': ['test/unit/frezeSincron.test.ts'],
    'orchestra': ['test/unit/frezeSincronizare.test.ts', 'test/unit/frezeMele.test.ts'],
    'server': ['functions/test/freze.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/freze.emulator.spec.ts']
P = 'test/e2e-emulator/freze.emulator.spec.ts'
T1, T2 = (P, 'două browsere ale aceluiași cont'), (P, 'cu proba trecută')
GREP = {'E01': T1, 'E02': T1, 'E03': T1, 'E04': T1, 'E05': T1, 'E06': T2, 'E07': T1}
