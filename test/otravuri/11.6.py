# Lista de otrăvuri a feliei 11.6↑ (raportul foilor și lista de tăiere, ADR 0210 §6), 13.11.2026, alese de autor: calculul
# (mărimea tăiată sau a desenului: profilul exterior, prin toată grosimea, fără despărțire; axele piesei; trecerile, urechile,
# freza în V, despărțirea; semnătura foilor identice: fără id-uri și fără numele frezei, cu locurile, mărimea, materialul,
# în orice ordine; totalurile pe piesă și pe material; cât din foaie e folosit; rotirile, valorile, numele), CSV-ul (BOM,
# ghilimelele, virgula zecimală, rotunjirea, foaia goală, foile 1-based, CRLF, de câte ori) și fereastra cu legăturile ei
# (marcajul „desen”, comutatoarele, titlul foilor identice, operațiile, tipărirea, Escape, paleta, butonul exportului).
# Fără otrăvuri care fac bucle fără capăt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/model/raportFoi.ts'
RC = 'src/app/raportCsv.ts'
DR = 'src/app/DialogRaportFoi.tsx'
AP = 'src/app/App.tsx'
DE = 'src/ui/DialogExport.tsx'
EC = 'src/app/ExportConectat.tsx'
AE = 'src/ui/actiuniExport.ts'
ST = 'src/app/stil.css'

# Mărimea pieselor (unitare).
o('R01', RF, "o.tip === 'profil' && o.latura === 'exterior' && o.despartire !== true", "o.tip === 'profil' && o.despartire !== true", 'raport',
  'un profil interior prin toată grosimea decupează piesa')
o('R02', RF, "o.latura === 'exterior' && o.despartire !== true && o.adancime", "o.latura === 'exterior' && o.adancime", 'raport',
  'despărțirea foii decupează piesa')
o('R03', RF, 'o.adancime >= grosime - 1e-6', 'o.adancime >= 0', 'raport', 'orice adâncime decupează piesa')
o('R04', RF, "    if (c.maxX >= c.minX) return din(c, 'taiata');", '    if (false) return din(c, \'taiata\');', 'raport', 'mărimea e mereu a desenului')
o('R05', RF, "  return din(cutie(elemente), 'desen');", "  return din(cutie(elemente), 'taiata');", 'raport', 'mărimea desenului, marcată tăiată')
o('R06', RF, 'latime: r6(Math.max(0, c.maxX - c.minX)), inaltime: r6(Math.max(0, c.maxY - c.minY))',
  'latime: r6(Math.max(0, c.maxY - c.minY)), inaltime: r6(Math.max(0, c.maxX - c.minX))', 'raport', 'lățimea și înălțimea inversate')
o('R07', RF, '  const elemente = elementeInstanta(p.radacina, i, IDENTITATE);', '  const elemente = elementeInstanta(p.radacina, i, matriceInstanta(i));', 'raport',
  'mărimea în axele foii (rotirea o schimbă)')
# Operațiile (unitare).
o('R08', RF, 'Math.max(1, Math.ceil(o.adancime / o.pas - 1e-9))', 'Math.max(1, Math.floor(o.adancime / o.pas))', 'raport', 'trecerile rotunjite în jos')
o('R09', RF, 'urechi: o.urechi?.numar ?? 0,', 'urechi: 0,', 'raport', 'fără urechi')
o('R10', RF, "unghi: o.scula.forma?.tip === 'v' ? o.scula.forma.unghi : null", 'unghi: null', 'raport', 'freza în V fără unghi')
o('R11', RF, '    despartire: o.despartire === true,', '    despartire: false,', 'raport', 'despărțirea nu se spune')
# Foile identice (unitare).
o('R12', RF, 'parti.push(`o${jsonCanonic([rest, scula, ', 'parti.push(`o${jsonCanonic([rest, o.scula, ', 'raport',
  'numele frezei face foile diferite (copia separată)')
o('R13', RF, '    for (const g of el.values()) parti.push(`e${g}`);', '    for (const g of el.values()) parti.push(`e${i.id}${g}`);', 'raport',
  'id-ul instanței face foile diferite (copia legată)')
o('R14', RF, 'jsonCanonic([e.forma, m6(e.matrice)])', 'jsonCanonic([e.forma])', 'raport', 'locul pieselor nu contează')
o('R15', RF, 'return jsonCanonic([f.stoc, materialFoaie(f), parti.sort()]);', 'return jsonCanonic([materialFoaie(f), parti.sort()]);', 'raport',
  'mărimea foii nu contează')
o('R16', RF, 'return jsonCanonic([f.stoc, materialFoaie(f), parti.sort()]);', 'return jsonCanonic([f.stoc, parti.sort()]);', 'raport',
  'materialul nu contează')
o('R17', RF, 'return jsonCanonic([f.stoc, materialFoaie(f), parti.sort()]);', 'return jsonCanonic([f.stoc, materialFoaie(f), parti]);', 'raport',
  'ordinea instanțelor contează')
o('R18', RF, '    if (grup) {', '    if (false) {', 'raport', 'foile identice nu se grupează')
# Totalurile și foaia (unitare).
o('R19', RF, '      t.cate += r.cate;', '      t.cate = r.cate;', 'raport', 'totalul ia doar ultima foaie')
o('R20', RF, '      if (!t.materiale.includes(material)) t.materiale.push(material);', '      t.materiale.push(material);', 'raport', 'materialul repetat')
o('R21', RF, '    m.foi++;', '    m.foi = 1;', 'raport', 'o foaie pe material')
o('R22', RF, 'folosita: r6((arie * 100) / (f.stoc.latime * f.stoc.inaltime))', 'folosita: r6(arie / (f.stoc.latime * f.stoc.inaltime))', 'raport',
  'folosirea ca fracție, nu procent')
o('R23', RF, '    arie += m.latime * m.inaltime;', '    arie += m.latime;', 'raport', 'aria fără înălțime')
o('R24', RF, 'r.rotiriSet.add(r6(((i.rotire % 360) + 360) % 360));', 'r.rotiriSet.add(r6(i.rotire));', 'raport', 'rotirile nenormalizate')
o('R25', RF, '    if (valori.length > 0) r.valori.push(', '    r.valori.push(', 'raport', 'o valoare goală pentru piesele fără CSV')
o('R26', RF, 'nume: p.nume?.trim() || null', 'nume: null', 'raport', 'piesele fără nume')
o('R27', RF, "forma: prim?.tip === 'element' ? prim.forma.tip : null", 'forma: null', 'raport', 'felul formei pierdut')
o('R28', RF, '      const cheie = jsonCanonic([r.piesa, r2(r.latime), r2(r.inaltime), r.din]);', '      const cheie = jsonCanonic([r.piesa]);', 'raport',
  'totalurile amestecă mărimea tăiată cu a desenului')
# CSV-ul (unitare, două prin e2e).
o('K01', RC, '  return BOM + randuri', '  return randuri', 'raport', 'fără BOM')
o('K02', RC, '  return s.includes(sep) || CAPETE', '  return CAPETE', 'raport', 'separatorul din celulă fără ghilimele')
o('K03', RC, "s.replaceAll('\"', '\"\"')", "s.replaceAll('\"', '\"')", 'raport', 'ghilimelele nedublate')
o('K04', RC, 'const CAPETE = [String.fromCharCode(10), String.fromCharCode(13), \'"\'];', "const CAPETE = ['\"'];", 'raport',
  'rândul nou din celulă fără ghilimele')
o('K05', RC, "  return sep === ';' ? s.replace('.', ',') : s;", '  return s;', 'raport', 'punctul zecimal și lângă `;`')
o('K06', RC, '  const s = String(Math.round(x * 100) / 100);', '  const s = String(x);', 'raport', 'numerele nerotunjite')
o('K07', RC, "    if (f.piese.length === 0) randuri.push([...foaie, '', '', '', '', '', '', '']);", '', 'raport', 'foaia goală lipsește')
o('K08', RC, 'String(1 + f.identice.length)', "'1'", 'e2e', 'foile identice numărate o dată')
o('K09', RC, 'p.foi.map((k) => String(k + 1))', 'p.foi.map((k) => String(k))', 'raport', 'foile numerotate de la 0')
o('K10', RC, '.join(CRLF) + CRLF;', '.join(CRLF);', 'raport', 'ultimul rând fără CRLF')
o('K11', RC, "r.forma === 'cerc' ? 'export.raport.forma.cerc'", "r.forma === 'cerc' ? 'export.raport.forma.cale'", 'e2e', 'cercul numit cale')
o('K12', RC, "t(din === 'taiata' ? 'export.raport.marime.taiata' : 'export.raport.marime.desen')", "t('export.raport.marime.taiata')", 'raport',
  'mărimea desenului numită tăiată')
# Fereastra și legăturile ei (e2e).
o('U01', DR, "fel === 'taiata' && x.din === 'desen' ? t('export.raport.desen-marcaj', { marime: m }) : m", 'm', 'e2e', 'fără marcajul „(desen)”')
o('U02', DR, "setFel(v === 'desen' ? 'desen' : 'taiata');", "setFel('taiata');", 'e2e', 'mărimea desenului nu se poate alege')
o('U03', DR, "setSep(v === ',' ? ',' : ';');", "setSep(';');", 'e2e', 'virgula nu se poate alege')
o('U04', DR, "f.identice.length > 0 ? t('export.foi.identice'", "false ? t('export.foi.identice'", 'e2e', 'titlul nu spune foile identice')
o('U05', DR, '{f.operatii.length > 0 && <p', '{false && <p', 'e2e', 'fără rândul operațiilor')
o('U06', DR, "n.format(o.adancime), n: o.treceri })", "n.format(o.adancime), n: 1 })", 'e2e', 'trecerile spuse mereu una')
o('U07', DR, 'onClick={() => { window.print(); }}', 'onClick={() => undefined}', 'e2e', 'Tipărește nu tipărește')
o('U08', ST, '  body > :not(.raport-foi-tipar) {', '  body > :not(.raport-foi-tipar):not(#root) {', 'e2e', 'la tipar rămâne și aplicația')
o('U09', DR, "    if (e.key !== 'Escape') return;", '    return;', 'e2e', 'Escape nu închide raportul')
o('U10', AP, "    else if (id === 'export.raport') setRaport({ origine: 'stanga-jos', z0: 'sus' });", '', 'e2e', 'paleta nu deschide raportul')
o('U11', AP, '      : registruExport.actiuni.has(id) ? stare(registruExport, id, contextExport())',
  "      : id === 'export.gcode' ? stare(registruExport, id, contextExport())", 'e2e', 'raportul nu are starea lui (refuzat ca necunoscut)')
o('U12', AP, 'setDialogExport(false); setRaport(p); }}', "setDialogExport(false); setRaport({ origine: 'stanga-jos', z0: 'sus' }); }}", 'e2e',
  'raportul din export uită colțul și Z0')
o('U13', DE, 'onClick={() => { onRaport({ origine, z0 }); }}', "onClick={() => { onRaport({ origine: 'stanga-jos', z0 }); }}", 'e2e',
  'butonul exportului uită colțul')
o('U14', EC, '      {...(onRaport ? { onRaport } : {})}', '', 'e2e', 'fereastra exportului fără butonul raportului')
o('U15', AE, "capabilitate: 'desen', activa: () => true, ruleaza: () => undefined", "capabilitate: 'desen', activa: () => 'motiv.nimic-ales', ruleaza: () => undefined",
  'e2e', 'raportul inactiv în paletă')

SETURI = {
    'raport': ['test/unit/raport.foi.test.ts'],
}
E2E = ['test/e2e/raport-foi.spec.ts']
