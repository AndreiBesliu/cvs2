# Lista de otrăvuri a feliei 25.2↑ (trasarea pe culori, ADR 0221), 07.11.2026, alese de autor: reducerea (spațiul cu
# luminozitatea pe jumătate, amestecurile scoase, multe clase unite după distanță, pragul de 0,2 %), etichetele (amestecul
# necurat, aura lățită din regiuni, proiecția de 50 %), fundalul, legăturile (ciclul, fundalul), curățarea, plasa (trecerile,
# joncțiunile prin cele mai mici pătrate), arcele deschise, adunarea pieselor, calculul, ușa (numele, pagina comună, piesele
# aduse împreună), comanda importului (un pas, locurile, lăsarea pe planșă, id-urile, selecția) și interfața prin e2e.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CU = 'src/trasare/culori.ts'
LG = 'src/trasare/legaturi.ts'
TR = 'src/trasare/trasare.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
DC = 'src/ui/actiuniDocumentCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'
DI = 'src/ui/DialogImport.tsx'

# ---- Reducerea ----
o('R01', CU, 'const KL = 0.5;', 'const KL = 1;', 'nuc', 'OKLab simplu: umbrirea se împarte, griul deschis trece la albastru')
o('R02', CU, '      if (amestec(x, y)) { amestecat[p] = 1; continue; }', '      if (amestec(x, y) && false) { amestecat[p] = 1; continue; }', 'nuc',
  'amestecurile de margine intră în reducere')
o('R03', CU, 'const AMESTEC = { contrast: 30, capat: 0.12, abatere: 0.25 } as const;', 'const AMESTEC = { contrast: 300, capat: 0.12, abatere: 0.25 } as const;', 'nuc',
  'niciun amestec recunoscut (contrastul cerut, peste orice)')
o('R04', CU, '  const r0 = kmeansMulte(lab, w, Math.max(1, Math.min(u, 2 * CULORI_MAXIM)));', '  const r0 = kmeansMulte(lab, w, Math.max(1, Math.min(u, 4)));', 'nuc',
  'puține clase înainte de unire: culoarea mică pierdută')
o('R05', CU, '    if ((M[s] ?? 0) / total >= PRAG_AUTOMAT.pondere) break;', '    if (true) break;', 'nuc', 'clasele sub 0,2 % rămân culori')
o('R06', CU, 'export const PRAG_AUTOMAT = { distanta: 0.08, pondere: 0.002 } as const;', 'export const PRAG_AUTOMAT = { distanta: 0.03, pondere: 0.002 } as const;', 'nuc',
  'pragul automat de distanță prea mic: umbrirea împărțită')
o('R07', CU, '    if (numar === null && C.length <= CULORI_MAXIM && d2(a, b) >= PRAG_AUTOMAT.distanta ** 2) break;',
  '    if (numar === null && C.length <= CULORI_MAXIM) break;', 'nuc', 'automat: nicio unire după distanță')
o('R08', CU, '    C[i] = [(p[0] * mi + q[0] * mj) / m, (p[1] * mi + q[1] * mj) / m, (p[2] * mi + q[2] * mj) / m];',
  '    C[i] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];', 'nuc', 'unirea fără ponderi (centrul la mijloc)')
o('R09', CU, '    for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) if (d2(i, j) < d2(a, b)) { a = i; b = j; }',
  '    for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) if (d2(i, j) > d2(a, b)) { a = i; b = j; }', 'nuc',
  'se unește perechea cea mai depărtată')
o('R10', CU, '    for (let k = 0; k < C.length; k++) if (k !== s && d2(s, k) < d2(s, b)) b = k;', '', 'nuc',
  'clasa prea mică unită cu prima, nu cu cea mai apropiată')

# ---- Etichetele ----
o('L01', CU, '    curat[p] = l >= 32 && !amestecat[p] ? 1 : 0;', '    curat[p] = l >= 32 ? 1 : 0;', 'nuc', 'un amestec cu culoarea unui centru, curat')
o('L02', CU, '      if (candidati.size === 0) { if (!plinPixel(p)) { asteapta[p] = 1; asteptand++; } continue; }', '      if (candidati.size === 0) continue;', 'nuc',
  'aura fără vecin curat ia centrul cel mai apropiat')
o('L03', CU, '        eticheteNoi[p] = s < 0.5 ? a : b;', '        eticheteNoi[p] = s < 0.2 ? a : b;', 'nuc', 'amestecul împărțit la 20 %, nu la 50 %')
o('L04', CU, '          asteapta[q] = 0; eticheteNoi[q] = l; urm.push(q);', '          asteapta[q] = 0; urm.push(q);', 'nuc', 'aura lățită fără eticheta regiunii')

# ---- Fundalul, legăturile ----
o('F01', CU, '  if (!transparenta && K > 1) {', '  if (false) {', 'nuc', 'imaginea opacă fără fundal')
o('F02', CU, '  const eFundal = (l: number): boolean => l >= K || (fundal >= 0 && l === (prima[fundal] ?? -1));',
  '  const eFundal = (l: number): boolean => l >= K;', 'nuc', 'fundalul opac nu mai e fundal')
o('F03', CU, '(o.bifate ? o.bifate[l] === true : !eFundal(l))', '(!eFundal(l))', 'nuc', 'bifele ignorate')
o('F04', CU, '  for (let p = 0; p < n; p++) { const l = orig[p] ?? 0; et[p] = l < K ? (prima[l] ?? l) : l; }',
  '  for (let p = 0; p < n; p++) { const l = orig[p] ?? 0; et[p] = l; }', 'nuc', 'legăturile ignorate în etichete')
o('F05', LG, '      if (i >= 0) { j = Math.min(...drum.slice(i)); break; }', '      if (i >= 0) break;', 'nuc', 'ciclul: fiecare culoare cu altă primă')
o('F06', CU, '  const eFundal = (l: number): boolean => l >= K || (fundal >= 0 && l === (prima[fundal] ?? -1));',
  '  const eFundal = (l: number): boolean => l >= K || (fundal >= 0 && l === fundal);', 'nuc', 'culoarea legată de fundal nu devine fundal')

# ---- Curățarea ----
o('K01', CU, '      if (!eFundal(l) && (arie[c] ?? 0) < o.petePx) tinte.push(c);', '      if (!eFundal(l) && (arie[c] ?? 0) < o.petePx / 4) tinte.push(c);', 'nuc',
  'petele șterse doar sub un sfert din prag')
o('K02', CU, '      else if (eFundal(l) && !margine[c] && (arie[c] ?? 0) < o.gauriPx) tinte.push(c);', '      else if (eFundal(l) && (arie[c] ?? 0) < o.gauriPx) tinte.push(c);', 'nuc',
  'golul lipit de marginea imaginii, umplut')
o('K03', CU, '        for (const p of ps) { et[p] = nou; orig[p] = nou; }', '        for (const p of ps) { orig[p] = nou; }', 'nuc', 'pata mutată doar în etichetele vechi')

# ---- Plasa, trecerile, joncțiunile ----
o('X01', CU, '      if (l2 > 0) { sa = pr(pa); sb = pr(pb); }', '', 'nuc', 'trecerile dintre culori la mijloc, fără amestec')
o('X02', CU, '  const acop = (p: number): number => (p < 0 ? 0 : transparenta ? Math.min(1, A(p) / plin) : 1);',
  '  const acop = (p: number): number => (p < 0 ? 0 : transparenta ? Math.min(1, A(p) / 128) : 1);', 'nuc', 'acoperirea față de alfa 128, nu de nivelul plin')
o('X03', CU, '    if (lista.length < 3) continue;', '    if (lista.length < 99) continue;', 'nuc', 'joncțiunile rămân media celulei')
o('X04', CU, '          if (Math.abs(dU) > JONCTIUNE.cotitura) break;', '', 'nuc', 'dreapta joncțiunii trece peste colț (granița în L)')
o('X05', CU, '      if (rest > JONCTIUNE.rest) continue;', '', 'nuc', 'votează și dreapta care nu se potrivește')
o('X06', CU, '    if (!(Math.hypot(x - x0, y - y0) <= JONCTIUNE.mutare)) continue;', '    if (!(Math.hypot(x - x0, y - y0) <= 0.01)) continue;', 'nuc',
  'joncțiunea aproape nemutată')

# ---- Arcele, piesele ----
o('A01', TR, '    if (!inchisa && (lb - 3 < 0 || ra + 3 > n - 1)) continue;', '', 'nuc', 'teșitura unui arc trece peste capăt')
o('A02', TR, '        if (eroare <= tau && eroare < ab) {', '        if (false) {', 'nuc', 'arcul scurt rămâne coardă')
o('A03', TR, '  const scurta = Math.max(4.5, 6 * eps);', '  const scurta = Math.max(3.5, 6 * eps);', 'nuc', 'teșitura de 4 px a unui colț de arc nestrânsă')
o('B01', CU, '      exterior.push(ariaD > 0 ? 1 : 0);', '      exterior.push(ariaD < 0 ? 1 : 0);', 'usa', 'exterioarele și golurile inversate')
o('B02', CU, '            tipuri.push(b.tip); xy.push(capat.x, capat.y, b.c2x, b.c2y, b.c1x, b.c1y);',
  '            tipuri.push(b.tip); xy.push(capat.x, capat.y, b.c1x, b.c1y, b.c2x, b.c2y);', 'nuc', 'arcul întors cu mânerele neschimbate')
o('B03', CU, '            if (r < cel) { cel = r; urm = x; }', '            if (r > cel) { cel = r; urm = x; }', 'nuc',
  'la un vârf cu culoarea de două ori, prima latură oarecare')

# ---- Calculul și ușa ----
o('D01', CT, '  if (c.culori) {', '  if (false) {', 'usa', 'cererea pe culori trasată alb-negru')
o('D02', CT, '    const sy = Math.min(H - 1, Math.floor(((y + 0.5) * H) / h));', '    const sy = Math.min(H - 1, Math.floor((y * H) / h));', 'usa',
  'imaginea pictată redusă din colțul celulei')
o('D03', CA, '    const c = comune(f, cai, pagina, undefined, laturi, `${baza.slice(0, PLAFON.numeLungime - pc.hex.length - 1)} ${pc.hex}`);',
  '    const c = comune(f, cai, pagina, undefined, laturi);', 'usa', 'piesele fără culoarea în nume')
o('D04', CA, '    pregatit: rest.length > 0 ? { ...prima.pregatit, impreuna: rest.map((p) => p.pregatit) } : prima.pregatit,', '    pregatit: prima.pregatit,', 'usa',
  'doar prima culoare ajunge la Importă')
o('D05', CA, '  const pagina = { latime: trasare.latimeMm, inaltime: trasare.inaltimeMm };', '  const pagina = null;', 'usa', 'piesele fără pagina imaginii (nealiniate)')
o('D06', CA, "  if (!prima) return { ok: false, cod: 'gol', format: 'imagine', avertismente, trasare };",
  "  if (!prima) return { ok: false, cod: 'gol', format: 'imagine', avertismente };", 'usa', 'refuzul fără paletă (pastilele dispar)')
o('D07', DC, '      tip: \'adauga\', foaie: foaie.id, instanta: { id, piesa: id, x: pus.x + dx, y: pus.y + dy, rotire: 0 }, pozitie: foaie.instante.length + i,',
  '      tip: \'adauga\', foaie: foaie.id, instanta: { id, piesa: id, x: pus.x, y: pus.y, rotire: 0 }, pozitie: foaie.instante.length + i,', 'usa',
  'lăsate pe planșă, rămân în locul din pagină')
o('D08', DC, '  const dx = la ? la.x - (x0 + x1) / 2 : 0, dy = la ? la.y - (y0 + y1) / 2 : 0;', '  const dx = la ? la.x - x0 : 0, dy = la ? la.y - y0 : 0;', 'usa',
  'lăsate pe planșă: colțul, nu centrul, în punct')
o('D09', DC, '    const id = idNou(doc, ocupate);\n    ocupate.add(id);\n', '    const id = idNou(doc, ocupate);\n', 'usa', 'același id pentru toate piesele')
o('D10', DC, '      ctx.selecteaza([...r.ids]);', '      ctx.selecteaza(r.ids.slice(0, 1));', 'usa', 'doar prima piesă selectată')

# ---- Interfața (e2e) ----
o('E01', FE, "            <option value=\"culori\">{t('import.trasare.sursa.culori')}</option>\n", '', 'e2e', 'sursa „Culorile” lipsește')
o('E02', FE, '        {!peCulori && <div className="trasare-prag">', '        {<div className="trasare-prag">', 'e2e', 'pragul arătat și pe culori')
o('E03', FE, '<input type="checkbox" checked={c.bifate ? c.bifate[k] === true : x.bifata}', '<input type="checkbox" checked={x.bifata}', 'e2e',
  'bifa urmează raportul, nu clicul')
o('E04', FE, '                if (Number.isInteger(a) && a !== k && a !== p) leaga(a, p);', '                if (Number.isInteger(a) && a !== k && a !== p) leaga(p, a);', 'e2e',
  'pastila trasă: legătura în sens invers')
o('E05', FE, "    const id = setTimeout(() => { onSchimba({ culori: { numar, legaturi: [], bifate: null } }); }, 250);",
  "    const id = setTimeout(() => { onSchimba({ culori: { ...c, numar } }); }, 250);", 'e2e', 'alt număr păstrează legăturile și bifele vechi')
o('E06', DI, "              <p data-testid=\"import-piese\">{t('import.trasare.piese', { n: 1 + (ok.pregatit.impreuna?.length ?? 0) })}</p>",
  "              <p data-testid=\"import-piese\">{t('import.trasare.piese', { n: 1 })}</p>", 'e2e', 'numărul pieselor spus greșit')
o('E07', DI, "  if (cod === 'gol' && format === 'imagine') return t(culori ? 'import.imagine.gol-culori' : 'import.imagine.gol');",
  "  if (cod === 'gol' && format === 'imagine') return t('import.imagine.gol');", 'e2e', 'refuzul pe culori spune de prag')
o('E08', FE, '                  <button type="button" data-buton="trasare-dezleaga" onClick={() => { leaga(k, -1); }}>',
  '                  <button type="button" data-buton="trasare-dezleaga" onClick={() => undefined}>', 'e2e', '„Dezleagă” nu face nimic')
o('E09', FE, "              onDragStart={(e) => { e.dataTransfer.setData(TRAGERE_CULOARE, String(k)); e.dataTransfer.effectAllowed = 'link'; }}",
  "              onDragStart={(e) => { e.dataTransfer.setData(TRAGERE_CULOARE, String(k + 1)); e.dataTransfer.effectAllowed = 'link'; }}", 'e2e',
  'tragerea poartă altă culoare')

SETURI = {
    'nuc': ['test/unit/trasare.culori.test.ts', 'test/unit/trasare.culori.corpus.test.ts'],
    'nuc2': ['test/unit/trasare.culori.test.ts', 'test/unit/trasare.culori.corpus.test.ts', 'test/unit/import.imagine.test.ts', 'test/unit/trasare.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts'],
    'usa2': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts', 'test/unit/trasare.culori.test.ts'],
}
E2E = ['test/e2e/trasare-culori.spec.ts']
