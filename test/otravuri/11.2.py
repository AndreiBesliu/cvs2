# Lista de otrăvuri a feliei 11.2↑ (piesele puse de mai multe ori, ADR 0210 §2), 08.11.2026, alese de autor: unde ajung
# copiile («Încă…», «+1»: marginea, distanța, freza, rândurile, obstacolele, foaia următoare goală, foile noi), «Desprinde»
# (ultima păstrează piesa), „Duplică foaia cu aceleași piese”, gruparea cu surori (întrebarea, «Doar aceasta», «În toate cele
# N» cu gazda rotită, o singură piesă cu surori), editarea legată (forma, o singură schimbare a piesei), alegerea ținută,
# și legăturile din interfață (banda, întrebarea, rândurile meniului, „Ține minte”, panoul, lista, meniul foii).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PL = 'src/model/pieseLegate.ts'
AC = 'src/ui/actiuniDocumentCalcul.ts'
TR = 'src/model/transformare.ts'
GS = 'src/ui/grupareSurori.ts'
ED = 'src/app/Editare.tsx'
PP = 'src/app/PanouProprietati.tsx'
AP = 'src/app/App.tsx'
LV = 'src/ui/ListaVectori.tsx'
MF = 'src/ui/MeniuFoaie.tsx'

# Unde ajung copiile (unitare, pe hârtie).
o('L01', PL, 'export const MARGINE_COPII = 10;', 'export const MARGINE_COPII = 5;', 'legate', 'marginea foii e 5 mm')
o('L02', PL, 'export const DISTANTA_COPII = 5;', 'export const DISTANTA_COPII = 3;', 'legate', 'distanța minimă dintre copii e 3 mm')
o('L03', PL, "  for (const o of piesa.operatii) if (o.tip === 'profil' && o.latura === 'exterior') d = Math.max(d, o.scula.diametru);\n", '',
  'legate', 'freza profilelor exterioare nu mărește distanța')
o('L04', PL, '    let x = dupa ? dupa.maxX + d : m;', '    let x = dupa ? dupa.maxX : m;', 'legate', 'prima copie se lipește de piesă')
o('L05', PL, '      y -= h + d;', '      y += h + d;', 'legate', 'rândurile urcă în loc să coboare')
o('L06', PL, '          if (x < m - EPS || ocupate.some((b) => preaAproape(b, c, d))) continue;', '          if (x < m - EPS) continue;', 'legate',
  'copiile se pun peste piesele de pe foaie')
o('L07', PL, '    if (!f || f.instante.length > 0 || !incape(f)) break;', '    if (!f || !incape(f)) break;', 'legate',
  'copiile intră și pe o foaie următoare care nu e goală')
o('L08', PL, '  if (!incape(sursa)) return { ok: false, motiv: \'prea-mare\' };\n', '', 'legate',
  'o piesă care nu încape între margini cere foi noi fără sfârșit')
o('L09', PL, '    if (!ids.has(i.id) || !p || cate < 2) continue;', '    if (!ids.has(i.id) || !p) continue;', 'legate',
  'și ultima instanță își face o piesă nouă (piesa veche rămâne fără instanțe)')
o('L10', PL, '    return { ...structuredClone(i), id: nid };', '    return { ...structuredClone(i), id: nid, x: i.x + 1 };', 'legate',
  'copia legată a foii mută instanțele')
# Registrul (unitare).
o('C01', AC, '  if (!Number.isInteger(total) || total <= n || total > INCA_MAXIM)', '  if (!Number.isInteger(total) || total < n || total > INCA_MAXIM)',
  'legate', '«Încă…» primește totalul de acum (nicio copie)')
o('C02', AC, '  if (!Number.isInteger(total) || total <= n || total > INCA_MAXIM)', '  if (!Number.isInteger(total) || total <= n)',
  'legate', '«Încă…» trece de 1 000')
o('C03', AC, '  const ultima = i ? instantePiesei(doc, i.piesa).at(-1) : undefined;', '  const ultima = i ? instantePiesei(doc, i.piesa).at(0) : undefined;',
  'legate', '«+1» pune copia după prima, nu după ultima')
o('C04', AC, '  const fata = rotatie(-g.rotire);', '  const fata = rotatie(g.rotire);', 'legate',
  'în toată piesa, formele se rotesc pe dos față de gazda rotită')
o('C05', AC, "  if (!gazda || cuSurori.length !== 1) return { ok: false, motiv: 'motiv.grupare-toate-una' };",
  "  if (!gazda) return { ok: false, motiv: 'motiv.grupare-toate-una' };", 'legate', 'în toată piesa, cu două piese cu surori')
o('C06', AC, "    if (alegere === null) return { ok: false, motiv: 'motiv.grupare-intrebare' };\n", '', 'legate',
  'fără alegere, gruparea nu mai întreabă (grupează în toată piesa)')
o('C07', AC, '      if (!r) return;\n      ctx.scrie(executa(h, r.comanda));\n      ctx.selecteaza([]);\n      ctx.activeazaFoaie?.(r.id);\n',
  '      if (!r) return;\n      ctx.scrie(executa(h, r.comanda));\n      ctx.selecteaza([]);\n', 'legate', 'foaia duplicată legat nu devine activă')
o('C09', AC, "  if (!vechi) return null;\n  // Elementul cerut",
  "  if (!vechi || h.doc.foi.reduce((n, f) => n + f.instante.filter((x) => x.piesa === vechi.id).length, 0) > 1) return null;\n  // Elementul cerut",
  'editare', 'forma unei piese puse de mai multe ori nu se mai poate schimba (refuzul vechi)')
o('T01', TR, '  if (deja) return jsonCanonic(deja) === jsonCanonic(p);', '  if (deja) return true;', 'transf',
  'două instanțe rotite altfel schimbă piesa diferit, fără refuz (câștigă prima)')
o('G01', GS, "    return v === 'doar' || v === 'toate' ? v : null;", '    return v as AlegereGrupare | null;', 'legate',
  'orice valoare ținută trece drept alegere')
# Interfața (e2e).
o('E01', ED, '    return i && foaie ? { n: n.get(i.piesa) ?? 0, aici: foaie.instante.filter((x) => x.piesa === i.piesa).length } : null;',
  '    return null;', 'e2e', 'fără bandă, fără întrebare, fără rândurile din meniu')
o('E02', ED, "    if (!r.ok && r.motiv === 'motiv.grupare-intrebare') {", '    if (false) {', 'e2e',
  'butonul Grupează arată motivul în loc de întrebare')
o('E03', ED, '    if (tineGrupare) tineAlegerea(alegere);\n', '', 'e2e', '„Ține minte alegerea” nu ține nimic')
o('E04', ED, '    const grupare: ArticolMeniu[] = surori === null', '    const grupare: ArticolMeniu[] = true', 'e2e',
  'meniul de clic dreapta n-are rândurile „doar aceasta” / „în toată piesa”')
o('E05', ED, "onClick={() => { const r = ruleaza('piesa.desprinde', {});", "onClick={() => { const r = ruleaza('piesa.plus-unu', {});", 'e2e',
  'butonul benzii pune încă una în loc să desprindă')
o('E06', PP, 'String(Math.min(INCA_MAXIM, Math.max(2, pusa + 1)))', 'String(Math.min(INCA_MAXIM, pusa))', 'e2e',
  '«Încă…» pornește de la totalul de acum')
o('E07', PP, '    ...(planInca.foiNoi > 0 ?', '    ...(false ?', 'e2e', 'locul copiilor nu spune foile noi')
o('E08', AP, "              onInca={(total) => aplicaDinPanou('piesa.inca', { cateInTotal: () => total })}",
  "              onInca={(total) => aplicaDinPanou('piesa.inca', { cateInTotal: () => total + 1 })}", 'e2e', 'panoul adaugă una în plus')
o('E09', AP, '      k.set(i.id, c);', '      k.set(i.id, 1);', 'e2e', 'lista spune „1 din N” la toate')
o('E10', AP, '    legata: (surori.n.get(i.piesa) ?? 0) > 1 ?', '    legata: (surori.n.get(i.piesa) ?? 0) > 0 ?', 'e2e',
  'și piesele puse o dată au „(1 din 1)”')
o('E11', LV, "      {r.legata ? <>{' '}<span className=\"legata\">{r.legata}</span></> : null}", '      {null}', 'e2e', 'lista nu arată „(k din N)”')
o('E12', MF, "  ['foaie.duplica-legat', 'actiune.foaie-duplica-legat'],\n", '', 'e2e', 'meniul foii n-are „Duplică foaia cu aceleași piese”')

SETURI = {
    'legate': ['test/unit/pieseLegate.test.ts', 'test/unit/pieseLegate.actiuni.test.ts', 'test/unit/grupare.test.ts'],
    'editare': ['test/unit/actiuni.editare.test.ts', 'test/unit/pieseLegate.actiuni.test.ts'],
    'transf': ['test/unit/transformare.test.ts', 'test/unit/inclinare.test.ts'],
}
E2E = ['test/e2e/piese-legate.spec.ts']
