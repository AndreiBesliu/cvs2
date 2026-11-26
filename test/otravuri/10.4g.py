# Lista de otrăvuri a feliei 10.4↑g (setările cotelor în cont; ADR 0330, întrebarea 14a), 26.11.2026, alese de autor: îmbinarea
# pe câmpuri (ce vine, ce rămâne, ciocnirea, listele, cheile primejdioase, „Ia-le pe cele din cont”), trecerea (scrierea cu
# versiunea văzută, contul gol, baza, ciocnirea ținută, fără `cloud`, reluarea, starea altui cont), contractul și callable-ul
# `preferinte` (pe emulatorul Firestore), banda și rândul stării (pe emulatoare).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


M = 'src/model/preferinteSincron.ts'
S = 'src/app/preferinteSincronizare.ts'
C = 'shared/preferinte.ts'
F = 'functions/src/preferinte/actiuni.ts'
U = 'src/app/Setari.tsx'
T = 'src/app/Cote.tsx'

# Îmbinarea.
o('M01', M, "    else if (egale(va, vb)) v = vc;\n", "    else if (egale(va, vb)) v = va;\n", 'model', 'ce s-a schimbat doar în cont nu vine')
o('M02', M, "    else if (egale(vc, vb) || egale(va, vc)) v = va;\n", "    else if (egale(va, vc)) v = va;\n", 'model', 'schimbat doar aici: ciocnire')
o('M03', M, "      ciocniri.push([...cale, k]);\n      v = va;", "      v = va;", 'model', 'ciocnirea nespusă')
o('M04', M, "      ciocniri.push([...cale, k]);\n      v = va;", "      ciocniri.push([...cale, k]);\n      v = vc;", 'model', 'la ciocnire vine valoarea din cont')
o('M05', M, "const obiect = (x: unknown): x is ObiectJson => typeof x === 'object' && x !== null && !Array.isArray(x);",
  "const obiect = (x: unknown): x is ObiectJson => typeof x === 'object' && x !== null;", 'model', 'listele îmbinate pe elemente')
o('M06', M, "  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });", "  o[k] = v;", 'model',
  '„__proto__” pus ca prototip')
o('M07', M, "    if (v !== undefined) pune(rez, k, v);", "    pune(rez, k, v);", 'model', 'un câmp scos rămâne, nedefinit')
o('M08', M, "        if (acolo === undefined) delete aici[k];\n        else pune(aici, k, acolo);", "        pune(aici, k, acolo);", 'model',
  '„Ia-le pe cele din cont” nu scoate un câmp lipsă în cont')
o('M09', M, "  for (const cale of cai) {", "  for (const cale of cai.slice(1)) {", 'model', '„Ia-le pe cele din cont” sare prima ciocnire')
# Trecerea.
o('S02', S, "        if (aici === baza) return 'la-zi';", "        if (aici === baza && vb > 0) return 'la-zi';", 'trecere', 'contul gol primește implicitele')
o('S03', S, "      if (!r.poateScrie) return 'citire';", "", 'trecere', 'fără `cloud` încearcă totuși să scrie')
o('S04', S, "        if (rez === cont) return 'la-zi';\n        deScris = rez;", "        if (rez === cont) return 'la-zi';\n        deScris = aici;", 'trecere',
  'scrie setările de dinaintea îmbinării')
o('S10', S, "        if (m.ciocniri.length > 0) {", "        if (m.ciocniri.length > 1) {", 'trecere', 'o singură ciocnire nu oprește scrierea')
o('S05', S, "      r = { ok: true, versiune: w.versiune, json: w.json, poateScrie: true };\n    }\n    return 'eroare';",
  "      return 'eroare';\n    }\n    return 'eroare';", 'trecere', 'fără reluare după ciocnirea serverului')
o('S06', S, "    const st = tinuta?.uid === d.uid ? tinuta : null;", "    const st = tinuta;", 'trecere', 'starea altui cont folosită ca bază')
o('S07', S, "        d.tine({ uid: d.uid, versiune: r.versiune, baza: cont, ciocnire: null });\n        vb = r.versiune;",
  "        vb = r.versiune;", 'trecere', 'baza nețiunută după ce vine din cont')
o('S08', S, "        if (rez !== aici) d.pune(rez);\n        if (m.ciocniri.length > 0) {", "        if (m.ciocniri.length > 0) {", 'trecere',
  'ce a venit din cont nu se pune aici')
o('S09', S, "  d.tine({ uid: d.uid, versiune: c.versiune, baza: c.json, ciocnire: null });\n  return true;",
  "  d.tine({ uid: d.uid, versiune: st.versiune, baza: st.baza, ciocnire: null });\n  return true;", 'trecere',
  'după alegere, baza rămâne cea veche')
# Contractul și callable-ul (pe emulatorul Firestore).
o('C01', C, "export const CHEI_PREFERINTE = ['cote'] as const;", "export const CHEI_PREFERINTE = ['cote', 'freze'] as const;", 'server',
  'o cheie necunoscută primită')
o('C02', C, "    return typeof x === 'object' && x !== null && !Array.isArray(x);\n  } catch {", "    return typeof x === 'object';\n  } catch {",
  'server', 'o listă sau null primite ca setări')
o('C03', C, "  if (typeof json !== 'string' || octetiPreferinte(json) > OCTETI_PREFERINTE) return false;",
  "  if (typeof json !== 'string') return false;", 'server', 'fără plafon')
o('C04', C, "const versiuneBuna = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;",
  "const versiuneBuna = (x: unknown): x is number => typeof x === 'number';", 'server', 'o versiune negativă sau fracționară primită')
o('C05', F, "    if (vazuta !== acolo.versiune) return { ok: true, stare: 'conflict', ...acolo };", "", 'server', 'scrie peste o versiune nevăzută')
o('C06', F, "    if (!(await poateScrie(tx, db, uid, acum.getTime()))) {", "    if (false) {", 'server', 'scrie fără `cloud`')
o('C07', F, "    return { ok: true, ...inCont((await tx.get(ref(db, uid, cheie))).data()), poateScrie: scrie };",
  "    return { ok: true, ...inCont((await tx.get(ref(db, uid, cheie))).data()), poateScrie: true };", 'server', 'citirea spune mereu că poate scrie')
o('C08', F, "  return versiune > 0 && typeof json === 'string' ? { versiune, json } : { versiune: 0, json: null };",
  "  return { versiune, json: typeof json === 'string' ? json : null };", 'server', 'un document stricat citit cu versiunea lui')
o('C09', F, "    tx.set(r, { versiune, json, schimbatLa: Timestamp.fromDate(acum) });", "    tx.set(r, { versiune, json });", 'server',
  'fără momentul scrierii')
# Interfața (pe emulatoare).
o('E01', U, "      m.legaSetarileCotelor(uid, config);\n      setSincron(m);", "      setSincron(m);", 'e2e', 'Setările nu leagă contul')
o('E02', U, "          <button type=\"button\" data-buton=\"cote-cont-din-cont\" onClick={() => { m.alegeLaCiocnire('cont'); }}>",
  "          <button type=\"button\" data-buton=\"cote-cont-din-cont\" onClick={() => { m.alegeLaCiocnire('aici'); }}>", 'e2e',
  '„Ia-le pe cele din cont” păstrează cele de aici')
o('E03', U, "  if (st.ciocniri > 0) {", "  if (st.ciocniri > 99) {", 'e2e', 'fără banda ciocnirii')
o('E04', S, "  ceas = setTimeout(() => { ceas = null; porneste(); }, 2000);", "  ceas = setTimeout(() => { ceas = null; }, 2000);", 'e2e',
  'o schimbare nu mai pleacă în cont')
o('E05', S, "    ascultaSetariCote(programeaza);\n", "", 'e2e', 'schimbările nu se ascultă')

SETURI = {
    'model': ['test/unit/preferinte.sincron.test.ts'],
    'trecere': ['test/unit/preferinte.trecere.test.ts'],
    'server': ['functions/test/preferinte.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/setariCont.emulator.spec.ts']
P = 'test/e2e-emulator/setariCont.emulator.spec.ts'
T1, T2 = (P, 'două browsere ale aceluiași cont'), (P, 'cu proba trecută')
GREP = {'E01': T1, 'E02': T1, 'E03': T1, 'E04': T1, 'E05': T1}
