# Lista de otrăvuri a feliei 11.1↑d (rândul comenzilor foii nu trece de lățimea foii lui; ADR 0210 §1), 24.11.2026, alese de
# autor: lățimea rândului pe hârtie, cum încape sub foaie (întreg, strâns, ascuns), locul unui rând deschis ținut în pânză,
# zoom-ul luat în seamă, rândul strâns și desfăcut („⋯”, mausul plecat, Escape, focusul), comanda care îl strânge, butonul
# măsurat (densitatea mare), rotița dată pânzei, rândul deschis deasupra vecinilor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (e2e-ul, cu configul repo-ului, pe 4173).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CC = 'src/ui/controaleFoiCalcul.ts'
MF = 'src/ui/MeniuFoaie.tsx'
CS = 'src/app/stil.css'

# Partea pură (unitare, pe hârtie).
o('D01', CC, "if (latimeFoaiePx >= latimeRand(BUTOANE_RAND, buton)) return 'intreg';", "if (latimeFoaiePx > latimeRand(BUTOANE_RAND, buton)) return 'intreg';", 'calcul',
  'foaia lată exact cât rândul îl primește strâns')
o('D02', CC, "return latimeFoaiePx >= latimeRand(1, buton) ? 'strans' : 'ascuns';", "return 'strans';", 'calcul', 'rândul nu se ascunde niciodată')
o('D03', CC, 'return n * buton + (n - 1) * GOL_BUTOANE_PX + 2 * MARGINE_RAND_PX;', 'return n * buton + (n - 1) * GOL_BUTOANE_PX;', 'calcul',
  'lățimea rândului fără marginile lui')
o('D04', CC, 'return n * buton + (n - 1) * GOL_BUTOANE_PX + 2 * MARGINE_RAND_PX;', 'return n * buton + 2 * MARGINE_RAND_PX;', 'calcul',
  'lățimea rândului fără golurile dintre butoane')
o('D05', CC, 'return Math.max(margine, Math.min(stanga, latimePanza - latimeRandPx - margine));', 'return Math.min(stanga, latimePanza - latimeRandPx - margine);', 'calcul',
  'rândul deschis iese în stânga pânzei')
o('D06', CC, 'return Math.max(margine, Math.min(stanga, latimePanza - latimeRandPx - margine));', 'return Math.max(margine, stanga);', 'calcul',
  'rândul deschis iese în dreapta pânzei')
o('D07', CC, 'if (!(latimePanza > 0) || !(latimeRandPx > 0)) return stanga;\n', '', 'calcul', 'fără măsuri, rândul sare în marginea pânzei')
o('D08', CC, "if (!(latimeFoaiePx > 0) || !(buton > 0)) return 'ascuns';\n", '', 'calcul', 'un buton de lățime zero dă un rând întreg')

# Rândul pe pânză (e2e).
o('F01', MF, 'const fel = felRand(f.latime * vedere.scara, buton);', 'const fel = felRand(f.latime, buton);', 'e2e', 'zoom-ul nu e luat în seamă: rândul rămâne întreg')
o('F02', MF, "        if (fel === 'ascuns') return null;\n", '', 'e2e', 'sub o foaie minusculă rândul tot se arată')
o('F03', MF, "const strans = fel === 'strans' && !extins && !intreaba;", 'const strans = false;', 'e2e', 'rândul nu se strânge niciodată')
o('F04', MF, "title={t('panza.foaie-arata-comenzile')} onClick={() => { onExtinde(f.id); }} />", "title={t('panza.foaie-arata-comenzile')} onClick={() => { }} />", 'e2e',
  '„⋯” nu desface rândul')
o('F05', MF, 'onPointerLeave={extins ? () => { onExtinde(null); } : undefined}', 'onPointerLeave={undefined}', 'e2e', 'mausul plecat nu strânge rândul')
o('F06', MF, "if (e.key === 'Escape') { e.stopPropagation(); revine.current = true; onExtinde(null); }", "if (e.key === 'Escape') { e.stopPropagation(); revine.current = true; }", 'e2e',
  'Escape nu strânge rândul')
o('F07', MF, "    if (extins) rand.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();\n    else if (revine.current) {",
  '    if (revine.current) {', 'e2e', 'rândul desfăcut nu primește focusul')
o('F08', MF, "if (e.key === 'Escape') { e.stopPropagation(); revine.current = true; onExtinde(null); }", "if (e.key === 'Escape') { e.stopPropagation(); onExtinde(null); }", 'e2e',
  'după Escape, focusul nu se întoarce pe „⋯”')
o('F09', MF, '      onWheel={roataLaPanza}\n', '', 'e2e', 'cu cursorul pe rând, rotița nu micșorează pânza')
o('F10', MF, '      if (b > 0) setButon(b);\n', '', 'e2e', 'butonul nu e măsurat: la densitatea mare rândul rămâne întreg peste foaie')
o('F11', CS, ".controale-foaie[data-peste='da'] {\n  z-index: 2;\n}", '', 'e2e', 'rândul desfăcut stă sub rândurile vecine')
o('F12', MF, '                  onExtinde(null);\n                  actiuni.ruleaza(id, f.id);', '                  actiuni.ruleaza(id, f.id);', 'e2e',
  'după o comandă, rândul rămâne desfăcut')
o('F13', MF, "data-fel={strans ? 'strans' : 'intreg'} data-peste={peste ? 'da' : 'nu'}", "data-fel={strans ? 'strans' : 'intreg'} data-peste=\"nu\"", 'e2e',
  'rândul desfăcut nu se știe deasupra')
o('F14', MF, ' clientX: e.clientX, clientY: e.clientY,\n', '\n', 'e2e', 'rotița dată pânzei își pierde locul cursorului')

SETURI = {
    'calcul': ['test/unit/controaleFoi.test.ts'],
}
E2E = ['test/e2e/controale-foi.spec.ts']
