# Lista de otrăvuri a feliei 6.V↑d (opțiunile ancorei și ale tastelor, ADR 0240 §A.7, §B.17, §C.19–§C.20, §E.25, §F.30),
# 08.11.2026, alese de autor: cercul din colț (ignorat, Shift + Ctrl dat lui Ctrl, Alt pierdut), poligonul întins (primul vârf,
# semiaxele inversate), rândul tastelor (opțiunile ignorate, tasta ținută neevidențiată, rândul ascuns), „Alt ține fix”
# (ignorat, ancora ținută pe loc și când nu e punctul fix, ținta plină, eticheta rotirii, nețiut), formele rotite oblic (scalate
# ca drepte, scara față de origine, arcele refuzate, nodul oblic, eticheta), ancora în panou (nespusă, nemutată, rândul ascuns).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree (în afara Drive-ului), după commit, cu
# `python -I -X utf8`; cele „e2e” cer build-ul (vite și Playwright prin `node`, cu `.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DC = 'src/app/desenCalcul.ts'
EC = 'src/app/editareCalcul.ts'
ED = 'src/app/Editare.tsx'
TR = 'src/model/transformare.ts'
PP = 'src/app/PanouProprietati.tsx'

# Desenul: cercul din colț și poligonul întins.
o('D01', DC, "if (u === 'cerc' && cerc === 'colt') return", "if (false) return", 'desen', 'cercul din colț ignorat')
o('D02', DC, "cerculElipsa(taste) ? b : patrat(a, b)", "taste.ctrl ? b : patrat(a, b)", 'desen',
  'Shift + Ctrl la cercul din colț dat lui Ctrl')
o('D03', DC, "laturi, minim, { ...taste, shift: false });", "laturi, minim, { ...taste, shift: false, alt: false });", 'desen',
  'Alt pierdut la cercul din colț')
o('D04', DC, "const u0 = Math.PI / 2 + (2 * Math.PI * k) / n;", "const u0 = (2 * Math.PI * k) / n;", 'desen',
  'primul vârf al poligonului întins nu e sus')
o('D05', DC, "return L({ x: Math.abs(dx) * Math.cos(u0), y: Math.abs(dy) * Math.sin(u0) });",
  "return L({ x: Math.abs(dy) * Math.cos(u0), y: Math.abs(dx) * Math.sin(u0) });", 'desen', 'semiaxele poligonului întins inversate')
o('D06', DC, "r('alt', o.altFix === 'centru' ? 'editare.mod.fix.centru' : 'editare.mod.fix.ancora')",
  "r('alt', 'editare.mod.fix.ancora')", 'desen', 'rândul tastelor ignoră „Alt ține fix”')
o('D07', DC, "return o.cerc === 'colt' ? [r('ctrl', 'editare.desen.elipsa'), r('alt', 'editare.desen.din-centru')] : [r('ctrl', 'editare.desen.elipsa')];",
  "return [r('ctrl', 'editare.desen.elipsa')];", 'desen', 'rândul tastelor ignoră cercul din colț')

# „Alt ține fix”.
o('D08', EC, "(altFix === 'centru' ? centrul(c) : ancora)", "(ancora)", 'ancora', '„Alt ține fix: centrul” ignorat')

# Formele rotite oblic, scalate pe o axă.
o('D09', TR, "const q = uniforma(sx, sy) ? 0 : sferturi(i.rotire);", "const q = uniforma(sx, sy) ? 0 : (sferturi(i.rotire) ?? 0);",
  'transformare', 'instanța rotită oblic scalată ca una dreaptă (geometrie greșită)')
o('D10', TR, "const S = compune(translatie(ancora.x, ancora.y), compune({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }, translatie(-ancora.x, -ancora.y)));",
  "const S = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };", 'transformare', 'scalarea oblică față de origine, nu de ancoră')
o('D11', TR, "compune(translatie(i.x, i.y), rotatie(i.rotire)), S, true);", "compune(translatie(i.x, i.y), rotatie(i.rotire)), S, false);",
  'transformare', 'arcele formei rotite oblic refuzate')
o('D12', TR, "if (q === null) return 'oblic';", "if (q === null) return n;", 'transformare', 'nodul rotit oblic rămâne nescalat')
o('D13', TR, "r.rotite ||= rotita;", "", 'transformare', 'eticheta nu află de formele rotite oblic')
o('D14', TR, "if (b && (rotita || !textNeuniformPosibil(b))) r.text = true;", "if (b && !textNeuniformPosibil(b)) r.text = true;",
  'transformare', 'textul drept rotit oblic nu e spus „vectori”')
o('D15', TR, "const nod = (n: Nod): boolean => sferturiMatrice(n.matrice) === null || (n.tip === 'grup' && n.copii.some(nod));",
  "const nod = (n: Nod): boolean => false;", 'transformare', 'nodul oblic din piesă nu e văzut de etichetă')

# Interfața (e2e): „Alt ține fix”, cercul din colț, rândul tastelor, ancora în panou, eticheta.
o('D16', ED, "acum.current.lipire(false), acum.current.fixAlt);", "acum.current.lipire(false), acum.current.ancora);", 'e2e',
  'mânerele nu primesc punctul fix ales')
o('D17', ED, "&& f.x === a.x && f.y === a.y) onTine(a);", ") onTine(a);", 'e2e',
  'ancora ținută pe loc și când centrul a fost punctul fix')
o('D18', ED, "scrieLocal(CHEIE_ALT_FIX, k);", "", 'e2e', '„Alt ține fix” nețiut în browser')
o('D19', ED, "formaDesenata(u, a, b, s.laturi, MINIM_DESEN_PX / scara, mod, s.modCerc);", "formaDesenata(u, a, b, s.laturi, MINIM_DESEN_PX / scara, mod);",
  'e2e', 'felul cercului netrimis desenului')
o('D20', ED, "className={tinute[k.tasta] ? 'tinuta' : undefined}", "className={undefined}", 'e2e', 'tasta ținută neevidențiată')
o('D21', ED, "locTaste && activ && !vedere3d && randul.length > 0 ? createPortal(", "false ? createPortal(", 'e2e', 'rândul tastelor ascuns')
o('D22', ED, "ancoraPanou.pune(ancoraInPanou ? { x: ancoraInPanou.x, y: ancoraInPanou.y, muta: mutaAncoraStabil } : null);",
  "ancoraPanou.pune(null);", 'e2e', 'ancora nespusă panoului')
o('D23', ED, "mutaAncora.current = (q) => { if (cutie) setAncoraLibera(fractiiDinPunct(cutie, q)); };", "mutaAncora.current = () => undefined;",
  'e2e', 'X / Y din panou nu mută ancora')
o('D24', ED, "...(forme.rotite && neuniform ? [t('editare.mod.rotite')] : []),", "", 'e2e', 'eticheta nu spune formele rotite oblic')
o('D25', ED, "&& fixAlt.x === ancora.x && fixAlt.y === ancora.y;", ";", 'e2e', 'ținta plină și când nu e punctul fix')
o('D26', ED, "const inCentru = fixAlt.x === cx && fixAlt.y === cy;", "const inCentru = ancora.x === cx && ancora.y === cy;", 'e2e',
  'eticheta rotirii spune ancora și când rotirea e în jurul centrului')
o('D27', ED, "if (unealta === 'poligon' && cerculElipsa(taste)) parti.push(t('editare.desen.intins'));", "", 'e2e',
  'eticheta nu spune poligonul întins')
o('D28', ED, " || (unealta === 'cerc' && cerc === 'colt'))) parti.push(t('editare.desen.din-centru'));",
  ")) parti.push(t('editare.desen.din-centru'));", 'e2e', 'eticheta nu spune cercul din colț pornit din centru')
o('D29', PP, "{ancora && cutie && (", "{false && (", 'e2e', 'rândul ancorei ascuns în panou')


SETURI = {
    'desen': ['test/unit/unelte-desen.test.ts'],
    'desen2': ['test/unit/unelte-desen.test.ts', 'test/unit/editare.test.ts', 'test/unit/formeParametrice.test.ts'],
    'ancora': ['test/unit/ancora.test.ts'],
    'ancora2': ['test/unit/ancora.test.ts', 'test/unit/editare.test.ts'],
    'transformare': ['test/unit/transformare.test.ts', 'test/unit/text.piesa.test.ts'],
    'transformare2': ['test/unit/transformare.test.ts', 'test/unit/text.piesa.test.ts', 'test/unit/actiuni.editare.test.ts',
                      'test/unit/inclinare.test.ts'],
}
E2E = ['test/e2e/ancore.spec.ts']
