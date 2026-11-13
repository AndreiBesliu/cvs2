# Lista de otrăvuri a feliei 11.4↑c (textul care iese din plăcuță și unealta Text pe un șablon cu ramă, ADR 0210 §4,
# răspunsul 5), 09.11.2026, alese de autor: judecata (toleranța, laturile cutiei, rama dreptunghi sau nu, conturul cel mai
# mare, textele fixe, literele măsurate, contururile deschise, punctele de pe arce și curbe, ținerea pe obiecte, foaia,
# numele), avertismentele (înregistrarea), textul grupat (`sablonCuAsezat`: grupul care nu e text, locul), cererea `editat`
# cu grupul, alegerea la clic (`texteGrupate`) și interfața (fereastra CSV, bara de jos, panoul, exportul, unealta Text).
# Fără otrăvuri care fac bucle fără capăt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PI = 'src/model/placuteIesire.ts'
AV = 'src/model/avertismente.ts'
TG = 'src/app/texteGrupate.ts'
TP = 'src/text/placute.ts'
AC = 'src/ui/actiuniDocumentCalcul.ts'
DC = 'src/app/DialogCsv.tsx'
AP = 'src/app/App.tsx'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
PP = 'src/app/PanouProprietati.tsx'
ED = 'src/app/Editare.tsx'
PT = 'src/app/PanouText.tsx'

# Judecata (unitare).
o('I01', PI, "  const c = cutieContur(l), t = TOLERANTA_PROIECT, p = placa.cutie;", "  const c = cutieContur(l), t = 0, p = placa.cutie;", 'iesire',
  'fără toleranță: o literă la 0,0005 mm peste latură iese')
o('I02', PI, " || c.maxX > p.maxX + t || ", ' || ', 'iesire', 'latura dreaptă nu se judecă')
o('I03', PI, "  if (placa.dreptunghi) return false;", '  if (true) return false;', 'iesire', 'orice ramă e judecată doar după cutie (și cercul)')
o('I04', PI, "dreptunghi: a >= (cutie.maxX - cutie.minX) * (cutie.maxY - cutie.minY) * (1 - 1e-9) };", 'dreptunghi: true };', 'iesire',
  'cercul e luat drept dreptunghi')
o('I05', PI, "    if (a <= arie) continue;", '    if (false) continue;', 'iesire', 'plăcuța e ultimul contur închis (gaura), nu cel mai mare')
o('I06', PI, " : blocText(x.nod) ? 'altul' : 'nu';", " : 'nu';", 'iesire', 'literele unui text fix intră în plăcuță')
o('I07', PI, "litere?.has(x.nod.id) ? 'masurat'", "false ? 'masurat'", 'iesire', 'literele plăcuței nu se măsoară')
o('I08', PI, "    if (!c.inchis || c.varfuri.length < 2) continue;", '    if (c.varfuri.length < 2) continue;', 'iesire',
  'o linie deschisă poate fi plăcuța')
o('I09', PI, "    for (const t of [0.25, 0.5, 0.75]) {", '    for (const t of [] as number[]) {', 'iesire', 'fără punctele dintre vârfuri (arce, curbe)')
o('I10', PI, "        const u = k.start + k.baleiaj * t;", '        const u = k.start;', 'iesire', 'punctele arcului stau toate în capătul lui')
o('I11', PI, "  peTexte.set(p, rez);", "  peTexte.set(p, rez);\n  judecate.set(texte, { get: () => rez, set: () => peTexte } as unknown as WeakMap<Piesa, boolean>);", 'iesire',
  'judecata ținută doar pe litere, nu și pe piesă')
o('I12', PI, "doc.foi.slice(indexFoaie, indexFoaie + 1)", 'doc.foi', 'iesire', 'avertismentele foii le au și pe ale celorlalte foi')
o('I13', PI, "[0]?.trim()) || p?.nume", '[0]) || p?.nume', 'iesire', 'numele plăcuței păstrează spațiile')
o('I14', PI, "id: i.id, instanta: i.id })));", "id: i.id, instanta: i.piesa })));", 'iesire', 'avertismentul arată piesa, nu plăcuța')
o('I15', AV, "  return placute ? rez.concat(placute(doc, indexFoaie)) : rez;", '  return rez;', 'iesire', 'avertismentele plăcuțelor nu ajung în listă')
# Textul grupat și alegerea lui (unitare).
o('G01', TG, "    if (!al && grupuri.has(n.id)) {", '    if (!al && blocText(n)) {', 'iesire', 'grupurile textelor judecate pe plăcuță (amprenta nu se potrivește)')
o('G02', TG, "  if (blocText(p.radacina)) return texte;\n", '', 'iesire', 'o piesă-text are un „text grupat”: rădăcina')
o('S01', TP, "  if (!grup || grup.tip !== 'grup' || !blocText(grup)) return { ok: false, motiv: 'gol' };\n  if (p.radacina.id === g)",
  "  if (!grup || grup.tip !== 'grup') return { ok: false, motiv: 'gol' };\n  if (p.radacina.id === g)", 'iesire',
  'rădăcina unui șablon cu ramă e luată drept text: textul ia locul piesei')
o('S02', TP, "  const nou: GrupNod = { ...grup, copii: litere.grupuri,", "  const nou: GrupNod = { ...grup, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, copii: litere.grupuri,", 'iesire',
  'textul grupat își pierde locul pe ramă')
o('C01', AC, "    const g = c.grup === undefined ? vechi.radacina : noduriPiesa(vechi.radacina).find((x) => x.nod.id === c.grup)?.nod;",
  '    const g = vechi.radacina;', 'iesire', 'textul grupat al unui șablon cu ramă e refuzat ca vectori')
o('C02', AC, "    if (!g || !blocText(g)) return { ok: false, motiv: 'motiv.text-vectori' };", "    if (!g) return { ok: false, motiv: 'motiv.text-vectori' };", 'iesire',
  'un grup care nu e text trece mai departe (alt motiv)')
# Interfața (e2e).
o('E01', DC, "        if (r.texte && textIese(piesa, r.texte)) iesite++;\n", '', 'e2e', 'rezultatul CSV nu spune din câte plăcuțe iese textul')
o('E02', DC, "iesite > 0 ? t(iesire === 'confirmare' ? 'csv.iesite.confirmare' : 'csv.iesite', { n: iesite }) : null,",
  "iesite > 0 ? t('csv.iesite', { n: iesite }) : null,", 'e2e', 'rezultatul nu spune că exportul cere confirmarea')
o('E03', DC, "setIesire(v); tineIesireaTextului(v); }}>", 'setIesire(v); }}>', 'e2e', 'alegerea nu se ține minte (exportul nu cere confirmarea)')
o('E04', AP, "    if (arePlacute && !placuteGata) import('../model/placuteIesire.ts')", "    if (false) import('../model/placuteIesire.ts')", 'e2e',
  'redeschis, judecata plăcuțelor nu vine (niciun avertisment)')
o('E05', AP, ": t('avertisment.text-iese-din-placuta', { nume: numePiesa(a.id) ?? a.id })", ": t('avertisment.text-iese-din-placuta', { nume: a.id })", 'e2e',
  'avertismentul arată id-ul plăcuței, nu numele ei')
o('E06', AP, "[doc, indexActiva, placuteGata]);", '[doc, indexActiva]);', 'e2e', 'avertismentele nu se refac după ce vine judecata')
o('E07', DE, "  const placuteOprite = placute?.confirmare === true && placuteVazute !== placute;", '  const placuteOprite = false;', 'e2e',
  'exportul pornește fără bifă')
o('E08', EC, "confirmare: iesireTextTinuta() === 'confirmare' }", 'confirmare: false }', 'e2e', 'confirmarea aleasă nu ajunge la export')
o('E09', DE, "(riscuriOrdine.length > 0 && !riscAcceptat) || placuteOprite}", '(riscuriOrdine.length > 0 && !riscAcceptat)}', 'e2e',
  'butonul Exportă nu așteaptă bifa plăcuțelor')
o('E10', PP, "{piesa && instanta.texte && textIese(piesa, instanta.texte) && <p", '{false && <p', 'e2e', 'panoul nu spune că textul iese')
o('E11', ED, "      if (lovita && lovit) {", '      if (false) {', 'e2e', 'clicul pe literele unui text grupat nu-l alege')
o('E12', ED, "const b = blocuri.find((x) => grupText?.instanta === inst.id && x.grup.id === grupText.grup) ?? blocuri[0];",
  'const b = blocuri[0];', 'e2e', 'unealta Text ia mereu primul text al ramei, nu pe cel ales')
o('E13', PT, ": modul.sablonCuAsezat(vechi, grup, asezat, bloc(p, asezat), grosime)),", ': modul.piesaText(asezat, bloc(p, asezat), vechi.id, undefined, vechi, grosime)),',
  'e2e', 'textul grupat editat ia locul piesei întregi (rama pleacă)')
o('E14', PT, "      ...(grup === undefined ? {} : { grup }),\n", '', 'e2e', 'cererea nu spune grupul (refuzată ca vectori)')
o('E15', PT, "(id) => (id === form.font ? font : altele?.(id) ?? null)", '(id) => (id === form.font ? font : null)', 'e2e',
  'plăcuțele nu primesc fontul celuilalt text al ramei')

SETURI = {
    'iesire': ['test/unit/placute.iesire.test.ts', 'test/unit/placute.text.test.ts'],
}
E2E = ['test/e2e/placute-iesire.spec.ts']
