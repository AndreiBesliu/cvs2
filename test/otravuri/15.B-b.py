# Lista de otrăvuri a feliei 15.B↑b (proiectul atașat și păstrarea tichetelor, ADR 0116 §12, §16), 07.11.2026, alese de
# autor: proiectul din cerere (plafonul la despachetare, base64 canonic, UTF-8 strict, schema), ordinea din callable
# (refuzurile înaintea încărcării, scoaterea după o tranzacție căzută), cine descarcă, jurnalul fișierului lipsă,
# `rezolvatLa`, meta din tichet, auditul, „Raportările mele”; jobul (limita, rejudecarea în
# tranzacție, setarea, poza, fișierul, orfanii tineri și ai unui tichet viu, numele străine, paginile, cursorul, plafonul,
# eșecurile și cel reparat în aceeași rulare, cheia paginii de fișiere); regulile Storage; editorul și fila Tichete pe hârtie
# (JSON-ul canonic, plafonul, mărimea citită, meta, calea, amprenta descărcării); două de interfață, prin e2e-ul pe emulatoare.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit. Seturile „server”,
# „job” și „reguli” cer emulatoarele (Firestore și Storage): comanda trece prin `firebase emulators:exec --only
# auth,firestore,functions,storage`, cu dosarul temporar al rulării. Cele „e2e” cer build-ul și e2e-ul pe emulatoare, pe
# 4173: trec prin bucla din raportul feliei (vite și Playwright prin `node`, în `emulators:exec`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PR = 'functions/src/tichete/proiect.ts'
AC = 'functions/src/tichete/actiuni.ts'
FI = 'functions/src/fisiere.ts'
PS = 'functions/src/joburi/pastrare.ts'
SR = 'storage.rules'
RP = 'src/app/raportare.ts'
TC = 'shared/tichete.ts'
AD = 'src/admin/tichete/date.ts'
RA = 'src/app/Raportari.tsx'
FT = 'src/admin/tichete/FilaTichete.tsx'

# ---- Proiectul din cerere și callable-ul `tichete` ----
o('S01', PR, '    json = gunzipSync(gz, { maxOutputLength: PROIECT_MAX_OCTETI });', '    json = gunzipSync(gz);', 'server',
  'fără plafon la despachetare: un proiect de peste 10 MB trece')
o('S02', PR, "  return o.toString('base64') === p ? o : null;", '  return o;', 'server',
  'base64-ul necanonic (un rând nou, fără umplutură) trece')
o('S03', PR, "    doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json));",
  "    doc = JSON.parse(new TextDecoder('utf-8').decode(json));", 'server', 'UTF-8 stricat devine „�”, iar JSON-ul trece')
o('S04', PR, "  if (typeof schema !== 'number' || !Number.isSafeInteger(schema) || schema < 1 || schema > 1000) throw",
  "  if (typeof schema !== 'number') throw", 'server', 'schema 0 sau fracționară trece')
o('S05', AC, '    raportariAzi(c, s, l, zi);\n', '', 'server', 'proiectul urcă și pentru o raportare care oricum se refuză')
o('S06', AC, '        await fisiere.sterge(cale);', '        void cale;', 'server', 'o tranzacție căzută lasă proiectul în Storage')
o('S07', AC, "  const poate = t.get('autor') === uid || drepturi.permisiuni.has('tichete.citeste') || drepturi.permisiuni.has('tichete.raspunde');",
  '  const poate = true;', 'server', 'oricine logat descarcă proiectul oricui')
o('S08', AC, "  const poate = t.get('autor') === uid || drepturi", '  const poate = drepturi', 'server', 'autorul nu-și mai descarcă proiectul')
o('S09', AC, "    await logServerError('callable:tichete', new Error(`proiectul tichetului ${id} lipsește din Storage`), { uid, actiune: 'proiect' }, db, acum);\n",
  '', 'server', 'fișierul lipsă sub un tichet cu proiect nu intră în jurnal')
o('S10', AC, "    tx.update(ref, { stare, rezolvatLa: stare === 'rezolvat' ? cand : null, modificatLa: cand, versiune: versiune + 1 });",
  '    tx.update(ref, { stare, modificatLa: cand, versiune: versiune + 1 });', 'server', 'rezolvarea nu pune data (jobul n-ar șterge niciodată)')
o('S11', AC, "rezolvatLa: stare === 'rezolvat' ? cand : null,", 'rezolvatLa: cand,', 'server', 'redeschiderea lasă data rezolvării')
o('S12', AC, 'proiect: proiect?.meta ?? null, stare:', 'proiect: null, stare:', 'server', 'tichetul nu ține meta proiectului')
o('S13', AC, '          proiect: proiect ? { marime: proiect.meta.marime, comprimat: proiect.meta.comprimat } : null,',
  '          proiect: proiect ? proiect.meta : null,', 'server', 'auditul ține și amprenta proiectului')
o('S14', AC, "    proiect: metaProiectDin(s.get('proiect'))?.marime ?? null,", '    proiect: null,', 'server',
  '„Raportările mele” nu arată proiectul')

# ---- Jobul de păstrare ----
o('J01', PS, ".where('rezolvatLa', '<', Timestamp.fromMillis(limita))", ".where('rezolvatLa', '<=', Timestamp.fromMillis(limita))", 'job',
  'tichetul exact la limită ajunge la judecată')
o('J02', PS, "    if (!t.exists || t.get('stare') !== 'rezolvat' || !(rezolvatLa instanceof Timestamp) || rezolvatLa.toMillis() >= limita) return 'sarit';",
  "    if (!t.exists || !(rezolvatLa instanceof Timestamp)) return 'sarit';", 'job', 'un tichet redeschis se șterge')
o('J03', PS, '  const zile = setariDin(s.exists ? s.data() : undefined).zilePastrareTichete;', '  const zile = 365;', 'job',
  'păstrarea din fila Setări e ignorată')
o('J04', PS, '    tx.delete(ref.collection(COLECTIE_POZE).doc(ID_POZA));\n', '', 'job', 'poza rămâne după tichet')
o('J05', PS, '        await fisiere.sterge(cale);\n        n.fisiereSterse++;', '        n.fisiereSterse++;', 'job',
  'proiectul nu se șterge odată cu tichetul (doar măturarea îl ia)')
o('J06', PS, '      if (exista.has(id) || acum.getTime() - f.creatLa < o.orfanDupaMs) continue;', '      if (exista.has(id)) continue;', 'job',
  'un fișier tânăr fără tichet (o raportare în lucru) se șterge')
o('J07', PS, '      if (exista.has(id) || acum.getTime()', '      if (acum.getTime()', 'job', 'proiectul unui tichet viu se șterge ca orfan')
o('J08', PS, '      if (id === null || !Number.isFinite(f.creatLa)) {', '      if (!Number.isFinite(f.creatLa)) {', 'job',
  'un nume străin de sub tichete/ se șterge')
o('J09', PS, '    if (pag.docs.length < o.pagina) break;', '    break;', 'job', 'doar prima pagină de tichete')
o('J10', PS, '    if (dupa) q = q.startAfter(dupa);\n', '', 'job', 'fără cursor: tichetele sărite se judecă din nou, la nesfârșit')
o('J11', PS, '      if (n.judecate >= o.plafon || peste()) {', '      if (n.judecate > o.plafon || peste()) {', 'job',
  'plafonul lasă un tichet în plus')
o('J12', PS, '  if (esecuri.size > 0) {', '  if (false) {', 'job', 'eșecurile nu ajung în marcaj')
o('J13', PS, '        esecuri.delete(f.nume);\n', '', 'job', 'un eșec reparat în aceeași rulare rămâne eșec')
o('J14', PS, '    token = p.urmatoarea;', '    token = null;', 'job', 'doar prima pagină de fișiere')

# ---- Regulile Storage ----
o('R01', SR, '      allow read, write: if false;', '      allow read: if request.auth != null;', 'reguli', 'orice om logat citește și listează')
o('R02', SR, '      allow read, write: if false;', '      allow write: if request.auth != null;', 'reguli', 'orice om logat scrie și șterge')
o('R03', SR, '      allow read, write: if false;', '      allow get: if true;', 'reguli', 'oricine descarcă un fișier, și fără cont')

# ---- Editorul și fila Tichete, pe hârtie ----
o('C01', RP, '  return new TextEncoder().encode(jsonCanonic(doc));', '  return new TextEncoder().encode(JSON.stringify(doc));', 'client',
  'proiectul nu e JSON-ul canonic (alți octeți decât salvarea)')
o('C02', RP, 'octeti > PROIECT_MAX_OCTETI;', 'octeti >= PROIECT_MAX_OCTETI;', 'client', 'exact 10 MB e refuzat')
o('C03', TC, '  if (octeti <= 999 * 1024) return', '  if (octeti < 1024 * 1024) return', 'client', '„1.024 kB” în loc de „1 MB”')
o('C04', TC, "  if (typeof sha256 !== 'string' || !RE_SHA256.test(sha256)) return null;", "  if (typeof sha256 !== 'string') return null;", 'client',
  'o amprentă greșită în tichet trece drept proiect')
o('C05', TC, '  const m = /^tichete\\/([A-Za-z0-9]{20})\\/proiect\\.json\\.gz$/.exec(cale);',
  '  const m = /tichete\\/([A-Za-z0-9]{20})\\/proiect\\.json\\.gz/.exec(cale);', 'client', 'un nume care doar conține calea e luat drept proiect')
o('C06', AD, '  return json.length === meta.marime && (await sha256Hex(json)) === meta.sha256;', '  return json.length === meta.marime;', 'client',
  'descărcarea nu verifică amprenta')
o('C07', AD, ".map((b) => b.toString(16).padStart(2, '0'))", '.map((b) => b.toString(16))', 'client', 'amprenta din browser nu e a serverului')

# ---- Interfața (e2e pe emulatoare) ----
o('E01', RA, '...(pr === undefined ? {} : { proiect: pr }),', '', 'e2e', 'bifa proiectului nu-l trimite')
o('E02', RA, '            setMarime(d ? octetiProiect(d).length : null);', '            setMarime(d ? 1 : null);', 'e2e',
  'mărimea arătată sub bifă nu e a proiectului')
o('E03', FT, "      if (!(await proiectVerificat(json, meta))) throw new Error(t('admin.tic.proiect-amprenta'));\n", '', 'e2e',
  'fila Tichete descarcă un fișier schimbat în Storage, fără să-i verifice amprenta')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    # Câte un singur fișier de emulator pe set (două în același `node --test` rulează în paralel pe același emulator).
    'server': ['functions/test/tichete.emulator.test.ts'],
    'job': ['functions/test/pastrare.emulator.test.ts'],
    'reguli': ['functions/test/reguli.storage.emulator.test.ts'],
    'client': u('raportare', 'tichete'),
}
E2E = ['test/e2e-emulator/tichete.emulator.spec.ts']
