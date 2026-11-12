# Lista de otrăvuri a feliei 10.3↑c (decuparea la ultima formă aleasă; ADR 0180 §4, §6), 07.11.2026, alese de autor: ce rămâne
# (partea păstrată, întoarsă; o formă toată de partea păstrată; una fără nimic acolo; formele netăiate, citite), formele care
# trec granița (se taie, se șterg, rămân întregi), granița (închisă, neschimbată), ștergerile (în rezultat, în acțiune, doar
# ștergeri) și trei legături din panou (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
C = 'src/ui/actiuniDocumentCalcul.ts'
P = 'src/app/PanouTaiere.tsx'

# Ce rămâne.
o('D01', T, "  const [pastrate, plecate] = o.pastreaza === 'inauntru' ? [inauntru, afara] : [afara, inauntru];",
  "  const [pastrate, plecate] = o.pastreaza === 'inauntru' ? [afara, inauntru] : [inauntru, afara];", 'decupare', 'partea păstrată, întoarsă')
o('D02', T, '  if (plecate.length === 0) return null;\n', '  if (plecate.length === 0) return { sterge: true };\n', 'decupare',
  'o formă toată de partea păstrată se șterge')
o('D03', T, '  if (pastrate.length === 0) return { sterge: true };\n', '  if (pastrate.length === 0) return null;\n', 'decupare',
  'o formă fără nimic de partea păstrată rămâne')
o('D04', T, '  const xs = r ? [...r.noi, ...r.intregi] : toateIntregi(inst, p);', '  const xs = r ? [...r.noi, ...r.intregi] : [];', 'decupare',
  'formele netăiate de graniță nu se mai citesc (rămân toate)')
o('D05', T, '  return { parti: [{ elemente: pastrate }], taiate: r?.taiate ?? 0 };', '  return { parti: [{ elemente: [...pastrate, ...plecate] }], taiate: r?.taiate ?? 0 };',
  'decupare', 'partea nepăstrată rămâne și ea')
# Formele care trec granița.
o('D06', T, "  if (o.trec === 'intregi') return null;\n", '', 'decupare', '„rămân întregi” le taie')
o('D07', T, "  if (o.trec === 'sterge') return { sterge: true };\n", '', 'decupare', '„se șterg” le taie')
# Granița.
o('D08', T, "    if (!K.inchis) return { ok: false, motiv: 'granita' };\n", '', 'decupare', 'o graniță deschisă nu se refuză')
o('D09', T, "    // Granița rămâne neschimbată și trebuie să fie închisă.\n    alese.delete(c.id);\n", "    // Granița rămâne neschimbată și trebuie să fie închisă.\n",
  'decupare', 'granița se decupează și ea')
# Ștergerile.
o('D10', T, "    if ('sterge' in r) { sterse.push(inst.id); continue; }", "    if ('sterge' in r) { continue; }", 'decupare',
  'formele de șters nu ajung în rezultat')
o('D11', T, "  if (degrupate.length === 0 && sterse.length === 0) return { ok: false, motiv: 'nimic-taiat' };",
  "  if (degrupate.length === 0) return { ok: false, motiv: 'nimic-taiat' };", 'decupare', 'o decupare doar cu ștergeri e refuzată')
o('D12', C, '    if (sterse.length > 0) comenzi.push(...comenziStergere(h.doc, new Set(sterse)).comenzi);\n', '', 'decupare',
  'acțiunea nu șterge nimic')
# Panoul (e2e).
o('U01', P, "  const decupeaza = (): void => { if (forma) ruleaza({ fel: 'decupare', id: forma, pastreaza, trec }, inchide); };",
  "  const decupeaza = (): void => { if (forma) ruleaza({ fel: 'decupare', id: forma, pastreaza, trec: 'taie' }, inchide); };", 'e2e',
  'alegerea pentru formele care trec granița nu ajunge la calcul')
o('U02', P, "onChange={() => { setTrec(x); }}", "onChange={() => undefined}", 'e2e', 'butoanele „Formele care trec granița” nu schimbă nimic')
o('U03', P, "t('editare.taiere.decupat', { n: String(r.degrupate.length), s: String(r.sterse.length), parti })",
  "t('editare.taiere.decupat', { n: String(r.sterse.length), s: String(r.degrupate.length), parti })", 'e2e', 'numerele decupării, inversate')

SETURI = {
    'decupare': ['test/unit/taiere.decupare.test.ts', 'test/unit/taiere.decupare.oracol.test.ts'],
    'decupare2': ['test/unit/taiere.decupare.test.ts', 'test/unit/taiere.decupare.oracol.test.ts', 'test/unit/taiere.forma.test.ts',
                  'test/unit/taiere.forma.oracol.test.ts', 'test/unit/taiere.test.ts', 'test/unit/actiuni.calcul.test.ts'],
}
E2E = ['test/e2e/taiere.spec.ts']
