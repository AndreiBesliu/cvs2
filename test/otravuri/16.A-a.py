# Lista de otrăvuri a feliei 16.A↑a (biblioteca de freze în browser, fereastra „Frezele mele”; ADR 0300 §2, §3, §7, §8),
# 23.11.2026, alese de autor: modelul frezei (marginile ca ale ușii documentului, conul, numele unice fără deosebire de
# majuscule, câmpurile felului curățate, versiunea, câmpurile necunoscute păstrate, copia pentru document, plafonul, numele
# liber, importul), fișierul (virgula zecimală, coloanele necesare, versiunea, valorile implicite, fără id-uri la export,
# plafonul), depozitul (frezele necitite păstrate și cu numele luate, lista unei versiuni mai noi doar citită, căderea pe
# memorie, citirea în tranzacție) și fereastra (rândul din meniu, paleta din orice fereastră, F1, focusul, plecarea cu
# schimbări, numele propus, întrebarea ștergerii, Escape, importul, celelalte file, telefonul, păstrarea, exportul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


M = 'src/model/freza.ts'
F = 'src/io/frezeFisier.ts'
S = 'src/app/frezeMele.ts'
FM = 'src/app/FrezeleMele.tsx'
CSS = 'src/app/freze.css'
AP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
MC = 'src/app/meniuCont.ts'
MR = 'docs/manual/ro.md'

# Modelul (unitare).
o('M01', M, "pune('diametru', interval(f.diametru, MARGINI_FREZA.diametru));", "pune('diametru', interval(f.diametru, 1000));", 'freza',
  'un diametru peste plafonul ușii trece')
o('M02', M, "pune('numar', interval(f.numar, MARGINI_FREZA.numar, true));", "pune('numar', interval(f.numar, MARGINI_FREZA.numar));", 'freza',
  'T 1,5 trece')
o('M03', M, 'else if (f.unghi < MARGINI_FREZA.unghiMinim || f.unghi > MARGINI_FREZA.unghiMaxim)', 'else if (f.unghi > MARGINI_FREZA.unghiMaxim)',
  'freza', 'un unghi sub 1° trece')
o('M04', M, "else if (!p.diametru && f.varf >= f.diametru) p.varf = 'varf';", "else if (!p.diametru && f.varf > f.diametru) p.varf = 'varf';",
  'freza', 'vârful cât diametrul trece')
o('M05', M, "f.tais! < inaltimeCon(f) - 1e-9) p.tais = 'con';", "f.tais! < 0) p.tais = 'con';", 'freza', 'tăișul mai scurt decât conul trece')
o('M06', M, 'return (f.diametru / 2 - a) / Math.tan', 'return (f.diametru / 2) / Math.tan', 'freza', 'conul gravării ignoră vârful plat')
o('M07', M, ".replace(/\\s+/gu, ' ').toLocaleLowerCase('ro');", ".replace(/\\s+/gu, ' ');", 'freza', 'numele se deosebesc după majuscule')
o('M08', M, "return nume.normalize('NFC').trim()", 'return nume.trim()', 'freza', 'ă compus și ă precompus sunt nume diferite')
o('M09', M, '    ...(areUnghi(f.fel) ? { unghi: f.unghi } : {}),\n', '    unghi: f.unghi,\n', 'freza', 'freza plată ține unghiul')
o('M10', M, 'rev: veche.rev + 1, schimbatLa: acum', 'rev: veche.rev, schimbatLa: acum', 'freza', 'versiunea nu crește la schimbare')
o('M11', M, 'const noua = curata({ ...veche, ...f, id: veche.id', 'const noua = curata({ ...f, id: veche.id', 'freza',
  'câmpurile necunoscute se pierd la schimbare')
o('M12', M, "? { tip: 'v', unghi: f.unghi, varf: f.varf } : { tip: 'v', unghi: f.unghi }", "? { tip: 'v', unghi: f.unghi } : { tip: 'v', unghi: f.unghi }",
  'freza', 'copia gravării pierde vârful plat')
o('M13', M, 'if (!veche && lista.length >= MARGINI_FREZA.freze)', 'if (!veche && lista.length > MARGINI_FREZA.freze)', 'freza',
  'biblioteca trece de 500')
o('M14', M, '.slice(0, MARGINI_FREZA.nume - sufix.length)', '.slice(0, MARGINI_FREZA.nume)', 'freza', 'numele liber trece de 40 de caractere')
o('M15', M, "    if ((existenta || rezervat) && politica === 'sari') { sarite++; continue; }\n", '', 'freza', '„Sari” nu sare')
o('M16', M, 'pasLateral: 50,', 'pasLateral: 100,', 'freza', 'pasul lateral trece de jumătate din diametru')
o('M17', M, '  const { id: _i, rev: _r, schimbatLa: _s, ...f } = x;\n  void _i; void _r; void _s;',
  '  const { rev: _r, schimbatLa: _s, ...f } = x;\n  void _r; void _s;', 'freza', 'o freză din fișier își aduce id-ul')
# Fișierul (unitare).
o('F01', F, "const virgula = sep !== ',';", 'const virgula = false;', 'freza', 'CSV-ul din Excel în română: „3,175” nu se citește')
o('F02', F, "if (!loc.has('nume') || !loc.has('fel') || !loc.has('diametru')) return", "if (!loc.has('nume')) return", 'freza',
  'un CSV fără fel și diametru nu e refuzat')
o('F03', F, "motiv: x['v'] > VERSIUNE_FISIER_FREZE ? 'versiune' : 'format'", "motiv: 'format'", 'freza', 'versiunea nouă se spune „alt format”')
o('F04', F, "pas: nr('pas') ?? (fel === 'plata' ? diametru / 2 : 1),", "pas: nr('pas') ?? 1,", 'freza', 'pasul implicit al frezei plate nu e raza')
o('F05', F, '    void _i; void _r; void _s;\n    return rest;', '    void _i; void _r; void _s;\n    return f;', 'freza',
  'exportul scrie id-urile, versiunea și data')
o('F06', F, "  if (lista.length > MARGINI_FREZA.freze) return { ok: false, motiv: 'prea-multe' };\n", '', 'freza',
  'un fișier cu 501 freze nu e refuzat')
# Depozitul (unitare).
o('S01', S, 'return { v: VERSIUNE_FREZE, freze: [...r.lista, ...c.brute] };', 'return { v: VERSIUNE_FREZE, freze: [...r.lista] };', 'freza',
  'frezele necitite se pierd la scriere')
o('S02', S, "          if (!c.scriere) throw new RefuzLista({ lista: 'versiune' });\n", '', 'freza', 'lista unei versiuni mai noi se rescrie')
o('S03', S, 'const r = f(c.freze, numeBrute(c.brute));', 'const r = f(c.freze, []);', 'freza', 'numele frezelor necitite nu mai sunt luate')
o('S04', S, 'pune({ ...stare, incarcata: true, freze: r.lista, pastrate: false });', 'pune({ ...stare, incarcata: true, freze: r.lista });',
  'freza', 'după o scriere căzută, starea spune că biblioteca e păstrată')
o('S05', S, '          const c = citesteDate(acum);', '          const c: Citita = { freze: stare.freze, brute, scriere: stare.scriere };',
  'freza', 'schimbarea pornește de la lista văzută de filă, nu de la cea din depozit')
o('S06', S, "return { freze, brute, scriere: x['v'] <= VERSIUNE_FREZE };", 'return { freze, brute, scriere: true };', 'freza',
  'lista unei versiuni mai noi se poate scrie')
# Rândul din meniu și ușa manualului (unitare).
o('A01', MC, "    'freze',\n    'manual',\n", "    'manual',\n", 'meniu', 'rândul lipsește din meniul contului')
o('A02', MR, '%% capitol: freze\n%% acopera: vedere.freze', '%% capitol: freze\n%% acopera: vedere.tema', 'meniu',
  'capitolul nu acoperă ușa ferestrei')
# Fereastra și legăturile ei (e2e, `freze.spec.ts`).
o('E01', AP, "'vedere.aspect', 'vedere.freze', ", "'vedere.aspect', ", 'e2e', 'din paletă, fereastra Mașina se închide')
o('E02', ED, "  if (document.querySelector('[aria-labelledby=\"freze-titlu\"]')) return 'vedere.freze';\n", '', 'e2e',
  'F1 în fereastră nu ajunge la capitolul ei')
o('E03', FM, '    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };\n', '', 'e2e', 'focusul nu se întoarce la Cont')
o('E04', FM, '    if (!schimbata || doarCitire) { apoi(); return; }', '    { apoi(); return; }', 'e2e', 'plecarea pierde schimbările')
o('E05', FM, 'void salveaza().then((id) => { if (id !== null) apoi(); });', 'void salveaza().then(() => { apoi(); });', 'e2e',
  'plecarea cu un câmp greșit nu ține editorul pe loc')
o('E06', FM, "return { ...f, nume: c.nume.trim() === '' ? numePropus(f, ro) : c.nume };", 'return { ...f, nume: c.nume };', 'e2e',
  'numele gol nu primește numele propus')
o('E07', FM, 'onClick={() => { setStergere(true); }}', 'onClick={sterge}', 'e2e', 'ștergerea fără întrebare')
o('E08', FM, '    if (stergere) setStergere(false);\n', '', 'e2e', 'Escape pe întrebarea ștergerii închide fereastra')
o('E09', FM, "setImportat({ freze: r.freze, sarite: r.sarite, politica: 'amandoua' });",
  "setImportat({ freze: r.freze, sarite: r.sarite, politica: 'inlocuieste' });", 'e2e', 'importul înlocuiește implicit')
o('E10', FM, 'sarite: r.sarite + importat.sarite', 'sarite: r.sarite', 'e2e', 'rândurile greșite ale fișierului nu se numără')
o('E11', S, '    canal.onmessage = () => { void b.reincarca(); };', '    canal.onmessage = () => undefined;', 'e2e',
  'cealaltă filă nu vede freza nouă')
o('E12', CSS, "  .freze-corp[data-pas='editor'] .freze-lista,\n", '', 'e2e', 'pe telefon, lista rămâne sub editor')
o('E13', S, '            s.put(schimba(r.result), cheie);', '            schimba(r.result);', 'e2e', 'nimic nu rămâne după reîncărcare')
o('E14', FM, "a.download = 'frezele-mele.cvs2freze.json';", "a.download = 'freze.json';", 'e2e', 'fișierul exportat are alt nume')
o('E15', FM, 'const freze = FREZE_PORNIRE.map((f) => ({ ...f, nume: numePropus(f, ro) }));',
  "const freze = FREZE_PORNIRE.map((f) => ({ ...f, nume: 'Freză' }));", 'e2e', 'frezele de pornire n-au numele propus')

SETURI = {
    'freza': ['test/unit/freza.test.ts', 'test/unit/frezeFisier.test.ts', 'test/unit/frezeMele.test.ts'],
    'meniu': ['test/unit/meniuCont.test.ts', 'test/unit/manual.test.ts'],
}
E2E = ['test/e2e/freze.spec.ts']
