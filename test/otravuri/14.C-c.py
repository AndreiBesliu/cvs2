# Lista de otrăvuri a feliei 14.C↑c (meniul contului, ADR 0120), 02.11.2026, alese de autor: rândurile după cont și sugestie,
# capul (fără cont, adresa neconfirmată, proba cu zilele ei, judecata de azi, planurile), numele și inițialele de pe buton;
# plus șapte de interfață, prin e2e: focusul la deschidere și după Escape, clicul pe buton, Tab, `aria-expanded`, sugestia pe
# live și ieșirea pe instanța locală.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; cele
# „e2e” cer build-ul, deci, cu npm stricat pe mașină, trec prin bucla din raportul feliei (vite și Playwright prin `node`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MC = 'src/app/meniuCont.ts'
ED = 'src/app/Editare.tsx'

# ---- Rândurile ----
o('R01', MC, "    cont ? 'cont' : 'intra',", "    cont ? 'intra' : 'cont',", 'meniu', 'logarea pentru cel logat, panoul pentru cel nelogat')
o('R02', MC, "    ...(sugestie ? (['sugestie'] as const) : []),", "    ...(['sugestie'] as const),", 'meniu', 'sugestia și pe live')
o('R03', MC, "    ...(cont ? ([null, 'iesi'] as const) : []),", "    ...([null, 'iesi'] as const),", 'meniu', 'ieșirea și fără cont')

# ---- Capul ----
o('C01', MC, "  if (!cont) return { titlu: traduce(l, 'editare.cont.nelogat')", "  if (!cont) return { titlu: traduce(l, 'editare.cont.neconfirmat')",
  'meniu', 'fără cont, capul spune adresa neconfirmată')
o('C02', MC, "  if (!cont.drept) return { titlu: cont.nume, rand: traduce(l, 'editare.cont.neconfirmat') };",
  "  if (!cont.drept) return { titlu: cont.nume, rand: traduce(l, 'editare.cont.plan.gratuit') };",
  'meniu', 'adresa neconfirmată trece drept plan gratuit')
o('C03', MC, '  const d = dreptLaZi(cont.drept, acum);', '  const d = cont.drept;', 'meniu', 'dreptul nejudecat azi (proba trecută, zilele offline)')
o('C04', MC, "      rand: d.pana === null ? traduce(l, 'editare.cont.plan.expirat')", "      rand: d.pana === null ? traduce(l, 'editare.cont.plan.gratuit')",
  'meniu', 'proba fără dată de sfârșit promite planul gratuit')
o('C05', MC, "traduce(l, 'editare.cont.plan.proba', { n: zileRamase(d.pana, acum) })",
  "traduce(l, 'editare.cont.plan.proba', { n: Math.floor((d.pana - acum) / 86_400_000) })",
  'meniu', 'zilele rotunjite în jos (cu o zi mai puțin decât în panou)')

# ---- Butonul ----
o('B01', MC, "  return (s.includes('@') ? s.slice(0, s.indexOf('@')) : s.split(/\\s+/)[0]) || s;",
  "  return (s.includes('@') ? s.slice(0, s.indexOf('@')) : s.split(/\\s+/).at(-1)) || s;",
  'meniu', 'numele de familie în locul prenumelui')
o('B02', MC, "  return (s.includes('@') ? s.slice(0, s.indexOf('@')) : s.split(/\\s+/)[0]) || s;",
  "  return s.split(/\\s+/)[0] || s;", 'meniu', 'adresa întreagă pe buton')
o('B03', MC, '  return cuvinte.slice(0, 2).map((c) => [...c][0] ??', '  return cuvinte.slice(0, 1).map((c) => [...c][0] ??',
  'meniu', 'o singură inițială')
o('B04', MC, "''].join('').toLocaleUpperCase() || '?';", "''].join('') || '?';", 'meniu', 'inițialele mici')
o('B05', MC, '  return cuvinte.slice(0, 2).map((c) => [...c][0] ??', '  return cuvinte.slice(0, 2).map((c) => c[0] ??',
  'meniu', 'o literă din afara planului de bază tăiată în două')
o('B06', MC, "''].join('').toLocaleUpperCase() || '?';", "''].join('').toLocaleUpperCase() || '';", 'meniu', 'fără nume, cercul gol')

# ---- Interfața (e2e) ----
o('E01', ED, """        inchide();
        refButonCont.current?.focus();
      } else if (e.key === 'Tab') {""", """        inchide();
      } else if (e.key === 'Tab') {""", 'e2e', 'Escape închide meniul, dar focusul nu se întoarce la buton')
o('E02', ED, '      if (tinta && (refMeniuCont.current?.contains(tinta) || refButonCont.current?.contains(tinta))) return;',
  '      if (tinta && refMeniuCont.current?.contains(tinta)) return;', 'e2e', 'clicul pe buton închide și redeschide meniul')
o('E03', ED, "    if (randuri && randuri.length > 0) randuri[focus === 'ultimul' ? randuri.length - 1 : 0]?.focus();",
  '    if (randuri && randuri.length > 0) randuri[randuri.length - 1]?.focus();', 'e2e', 'meniul se deschide mereu pe ultimul rând')
o('E04', ED, """      } else if (e.key === 'Tab') {
        setTimeout(inchide, 0);
      }""", """      }""", 'e2e', 'Tab lasă meniul deschis')
o('E05', ED, '            aria-label={t(\'editare.cont\')} data-editare="cont" aria-haspopup="menu" aria-expanded={meniuContDeschis}',
  '            aria-label={t(\'editare.cont\')} data-editare="cont" aria-haspopup="menu" aria-expanded={false}', 'e2e',
  '`aria-expanded` nu spune că meniul e deschis')
o('E06', ED, '        <MeniuCont refMeniu={refMeniuCont} buton={refButonCont} focus={meniuCont} cont={contul} sugestie={p.sugestie === true}',
  '        <MeniuCont refMeniu={refMeniuCont} buton={refButonCont} focus={meniuCont} cont={contul} sugestie',
  'e2e', 'sugestia și pe live')
o('E07', ED, """    if (!c?.firebase) {
      puneCont(null);
      return;
    }""", """    if (!c?.firebase) {
      return;
    }""", 'e2e', 'ieșirea pe instanța locală nu scoate contul ținut')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    'meniu': u('meniuCont', 'manual'),
    'meniu2': u('meniuCont', 'manual', 'documentatie', 'i18n'),
}
E2E = ['test/e2e/cont.spec.ts', 'test/e2e/tutorial.spec.ts']
