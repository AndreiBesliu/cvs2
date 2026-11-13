# Lista de otrăvuri a feliei 11.4↑ (plăcuțele, ADR 0210 §4, §7), 08.11.2026, alese de autor: operațiile literelor unei
# plăcuțe (felul, ce taie șablonul, găurirea, listele goale), literele din font (prefixul liber, valorile, caseta limitată,
# textul care nu încape, curba), șablonul (textele cu câmpuri, valorile goale), coacerea (blocul, numele, operațiile fără
# noduri), «Desprinde» (plăcuța singură, copia), acțiunea textului (valorile, piesa schimbată, refacerea șablonului, motivul),
# rolul de tăiere, gruparea și degruparea, scalarea (plăcuțele alese, celelalte, textul grupat), și legăturile din interfață
# (panoul plăcuței, valoarea, «Desprinde» pe una singură, numele din listă, acțiunea din panou, refacerea din panoul textului,
# banda ascunsă, nota). Judecata ușii (v23) e prinsă de oracolul documentului (pasul 1), nu aici.
# Fără otrăvuri care fac bucle fără capăt (11.2: L05 și L08 au ieșit prin termen, după 300 s).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PO = 'src/io/placuteOperatii.ts'
PM = 'src/model/placute.ts'
PT = 'src/text/placute.ts'
AC = 'src/ui/actiuniDocumentCalcul.ts'
TR = 'src/model/transformare.ts'
PL = 'src/model/pieseLegate.ts'
PP = 'src/app/PanouProprietati.tsx'
PX = 'src/app/PanouText.tsx'
ED = 'src/app/Editare.tsx'
AP = 'src/app/App.tsx'

# Operațiile literelor (unitare).
o('P01', PO, "  if (o.tip === 'gaurire') return null;\n", '', 'placute', 'găurirea se mută pe literele plăcuței (pe toate)')
o('P02', PO, '  const taie = p.operatii.filter((o) => o.noduri.some((n) => sablon.has(n)));', '  const taie = p.operatii;', 'placute',
  'și operațiile care nu taie textul șablonului (rama) taie literele plăcuței')
o('P03', PO, '      noduri = elemente.filter((_, k) => l[k] === fel).map((e) => e.id);', '      noduri = elemente.map((e) => e.id);', 'placute',
  'profilul pe exterior (sau pe interior) taie toate contururile literelor')
o('P04', PO, '    if (noduri.length > 0) rez[o.id] = noduri;', '    rez[o.id] = noduri;', 'placute', 'o operație fără nimic de tăiat rămâne, cu lista goală')
# Literele din font (unitare).
o('P05', PT, '    for (let n = 2; !liber(prefix); n++)', '    for (let n = 2; false; n++)', 'placute', 'prefixul literelor se ciocnește cu un id al piesei')
o('P06', PT, "    const continut = cuValori(t.bloc.continut, campuri) ?? '';", '    const continut = t.bloc.continut;', 'placute',
  'plăcuța are textul șablonului („Masa {nr}”), nu valorile ei')
# P07 („limitat de casetă, plăcuța pornește de la înălțimea șablonului”) a scăpat la prima rulare (`c2784f2`): echivalentă,
# fiindcă așezarea limitată caută oricum de la `caseta.ceruta`. Codul ei a fost scos (mutantul mai bun = codul scos).
o('P08', PT, "  if (drept.raport['caseta-prea-mica'] > 0) return 'caseta';\n", '', 'placute', 'un text care nu încape în casetă trece')
o('P09', PT, '  if (!c) return drept;', '  if (!c || c) return drept;', 'placute', 'șablonul pe curbă dă plăcuțe cu textul drept')
# Șablonul și coacerea (unitare).
o('P10', PM, '    if (bloc && campuri.length > 0) {', '    if (bloc) {', 'placute', 'un text fără câmpuri e luat drept șablon')
o('P11', PM, "  for (const c of campuriPiesei(p)) if (!Object.hasOwn(rez, c)) Object.defineProperty(", "  for (const c of []) if (!Object.hasOwn(rez, c)) Object.defineProperty(",
  'placute', 'un câmp fără valoare nu primește textul gol')
o('P17', PM, "Object.defineProperty(rez, c, { value: '', enumerable: true, writable: true, configurable: true });", "rez[c] = '';", 'placute',
  'un câmp numit `__proto__` fără valoare nu primește textul gol (atribuirea nu creează proprietatea)')
o('P12', PM, '    return n.length > 0 ? [{ ...structuredClone(o), noduri: [...n] }] : [];', '    return [{ ...structuredClone(o), noduri: [...n] }];', 'placute',
  'coacerea lasă operațiile fără nimic de tăiat')
o('P13', PM, '    return { ...grup, copii: t.copii, ...(bloc ? { text: bloc } : {}) };', '    return { ...grup, copii: t.copii };', 'placute',
  'textul copt nu mai are bloc (devine doar vectori)')
o('P14', PM, '  const nume = peRadacina ?', '  const nume = false ?', 'placute', 'piesa coaptă păstrează numele șablonului („Masa {nr}”)')
# «Desprinde» (unitare).
o('P15', PL, '      if (!i.texte) continue;\n      const c = placutaCoapta(p, i, p.id);', '      continue;\n      const c = placutaCoapta(p, i, p.id);', 'placute',
  'o plăcuță singură nu se coace')
o('P16', PL, '    const c = placutaCoapta(p, i, nid);', '    const c = placutaCoapta(p, { ...i, texte: undefined }, nid);', 'placute',
  'plăcuța desprinsă își pierde literele (primește textul șablonului)')
# Acțiunea textului, rolul, gruparea (unitare).
o('C01', AC, "    if (p !== c.piesa) return { ok: false, motiv: 'motiv.placute' };\n", '', 'placute',
  'literele făcute pe o piesă schimbată între timp trec')
o('C02', AC, "  return judecaTexte(brut) === null ? null : 'motiv.placute';", '  return null;', 'placute',
  'acțiunile nu mai cer judecata plăcuțelor (o schimbare care le strică literele trece)')
o('C03', AC, '      if (!x.instanta.texte) continue;\n      if (!c.texte)', '      if (!c.texte)', 'placute',
  'editarea șablonului face plăcuță și din instanța fără valori')
o('C04', AC, "  return { ...rest, ...(Object.keys(campuri).length > 0 ? { campuri: { ...campuri } } : {}), ...(texte ? { texte: structuredClone(texte) } : {}) };",
  "  return { ...rest, ...(Object.keys(campuri).length > 0 ? { campuri: { ...campuri } } : {}) };", 'placute', 'plăcuța nu primește literele')
o('C05', AC, '    comenzi.push(...placute);\n', '', 'placute', 'rolul nou nu se mută pe literele plăcuțelor')
o('C06', AC, '    const coapta = p && i.texte ? placutaCoapta(p, i, p.id) : null;', '    const coapta = null;', 'placute',
  'degruparea unei plăcuțe nu o coace întâi')
o('C07', AC, '  const g = grupDin(parti.map((x) => (x.instanta.texte ? placutaCoapta(x.piesa, x.instanta, x.piesa.id) : x)), id);',
  '  const g = grupDin(parti, id);', 'placute', 'gruparea unei plăcuțe nu o coace întâi')
o('C08', AC, '  for (const x of r.placute ?? []) comenzi.push(', '  for (const x of []) comenzi.push(', 'placute',
  'plăcuțele neselectate ale piesei scalate rămân cu literele vechi')
# Ușa: judecata pe documentul brut, cu cheile sărite de validator (unitare).
o('U01', 'src/model/usaCurenta.ts', '  if (t) return { ok: false, motiv: `documentul nu respectă schema: ${t}` };\n', '', 'placute',
  'ușa nu mai judecă literele plăcuțelor')
o('U02', 'src/model/judecataTexte.ts', '    if (Object.hasOwn(texte, k) && !v.is(SchemaTextePlacuta, texte[k])) return', '    if (false) return', 'placute',
  'literele de sub o cheie sărită nu se judecă în forma lor')
o('U03', 'src/model/judecataTexte.ts', "    if (typeof c !== 'string' || c.length > PLAFON.campLungime) return", '    if (false) return', 'placute',
  'valoarea unui câmp sărit nu se judecă')
o('U04', 'src/model/judecataTexte.ts', "      if (!Array.isArray(l) || l.some((n) => typeof n !== 'string')) return", '      if (false) return', 'placute',
  'lista unei operații sărite nu se judecă')

# Scalarea (unitare).
o('T01', TR, '    if (texte) noiInstante[k] = { ...i, texte };', '    void texte;', 'placute', 'plăcuța scalată își păstrează literele vechi')
o('T02', TR, '      if (texte) placute.push({ foaie: f.id, vechi: i, nou: { ...i, texte } });', '      void texte;', 'placute',
  'plăcuțele de pe altă foaie nu se scalează')
o('T03', TR, '    const radacina = uniforma(sx, sy) ? blocuriScalate(piesa.radacina, scalata, lx) : blocScalat(piesa.radacina, scalata, bx, by, false);',
  '    const radacina = blocScalat(piesa.radacina, scalata, bx, by, uniforma(sx, sy));', 'placute', 'textul grupat își pierde blocul la scalare')
# Interfața (e2e).
o('E01', PP, '      {instanta && campuriSablon.length > 0 && (', '      {false && (', 'e2e', 'panoul n-are „Pe această plăcuță”')
o('E02', PP, '    const valori = { ...(instanta.campuri ?? {}), [nume]: text.trim() };', "    const valori = { ...(instanta.campuri ?? {}), [nume]: 'x' };", 'e2e',
  'valoarea scrisă nu ajunge pe plăcuță')
o('E03', PP, '            {(pusa > 1 || !!instanta.texte) && (', '            {(pusa > 1) && (', 'e2e', 'o plăcuță singură nu se poate desprinde')
o('E04', AP, "    const nume = new Map((foaie?.instante ?? []).map((i) => [i.id, (i.texte && Object.values(i.texte)[0]?.continut.split('\\n')[0]?.trim()) || piese.get(i.piesa)?.nume]));",
  '    const nume = new Map((foaie?.instante ?? []).map((i) => [i.id, piese.get(i.piesa)?.nume]));', 'e2e', 'lista numește plăcuțele după șablon')
o('E05', AP, "              onPlacuta={(c) => aplicaDinPanou('document.text', { textNou: () => c })}\n", '', 'e2e', 'panoul n-are acțiunea plăcuței (câmpul oprit)')
o('E06', PX, '      texte: (nou, valori) => modul.textePlacutei(nou, valori, (id) => (id === form.font ? font : null)),\n', '', 'e2e',
  'panoul textului nu reface plăcuțele (editarea șablonului e refuzată)')
o('E07', ED, "      {surori && unealta !== 'text' ? (", '      {surori ? (', 'e2e', 'banda acoperă butoanele panoului textului')
o('E08', PX, "        {editat?.placute ? <p className=\"nota-retea\" data-testid=\"text-placute\">", "        {false ? <p className=\"nota-retea\" data-testid=\"text-placute\">", 'e2e',
  'panoul textului nu spune câte plăcuțe reface')
o('E09', ED, '    return inst && bloc ? { instanta: inst.id, bloc, pusa: ale.length, placute: ale.filter((i) => i.texte).length } : null;',
  '    return inst && bloc ? { instanta: inst.id, bloc, pusa: ale.length, placute: 0 } : null;', 'e2e', 'plăcuțele nu se numără pentru panoul textului')

SETURI = {
    'placute': ['test/unit/placute.test.ts'],
    'placute2': ['test/unit/placute.test.ts', 'test/unit/document.v23.oracol.test.ts', 'test/unit/pieseLegate.test.ts', 'test/unit/pieseLegate.actiuni.test.ts',
                 'test/unit/transformare.test.ts', 'test/unit/text.actiune.test.ts', 'test/unit/grupare.test.ts', 'test/unit/degrupare.test.ts'],
}
E2E = ['test/e2e/placute.spec.ts']
