# Sabotajele feliei 3.Te, planificatorul în engleză (ADR 0165), 04.11.2026: fiecare apărare (`tr` cu șirul, șablonul și
# contextul, traducerea pe pagină, dicționarul adus doar în engleză, limba de la pornire, repornirea după salvări, cel mult o
# dată la 2 s, zecimalele și data, eroarea motorului citită din proprietate, unealta și proba dicționarului), stricată o dată;
# proba care o apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - încărcătorul (`shared/cadruExtensie.ts`, `reporneste()`): orice schimbare a textului lui schimbă amprenta, deci o prinde
#   `csp.extensii.test.ts` oricare ar fi; învelișul îl folosește proba e2e a repornirii, cu butonul extensiei „Salut”;
# - `characterData` în `Limba.urmareste`: niciun cod al planificatorului nu schimbă pe loc un nod de text (`.data =`,
#   `nodeValue`: nimic), deci nimic nu-l pune la lucru; e plasa pentru codul de mâine;
# - `FARA` (SCRIPT, STYLE, TEXTAREA): nicio cheie a dicționarului nu e tot conținutul unui textarea sau script, deci azi nu
#   se traduce nimic acolo nici fără el;
# - sufixul exemplelor (`tr(" (exemplu)")`): nicio probă nu deschide un exemplu în engleză;
# - cuvântul ales prin context la LEGO (`știft@pin`) și la profiluri (`tr(opt.fel)`): un cuvânt englezesc greșit nu-l vede
#   nicio probă (proba e2e caută româna); mecanismul contextului e probat (T04, patul imprimantei);
# - `window.cvs2.limba` fix sau viu: `limba.ts` îl citește o dată, la pornire, și nimic altceva nu-l citește.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LIM = 'extensii/trenulet/sursa/planificator/limba.ts'
INT = 'extensii/trenulet/intrare.ts'
CON = 'scripts/construieste-trenulet.ts'
CAD = 'src/extensii/cadru.ts'
EXT = 'src/extensii/Extensii.tsx'
REP = 'src/extensii/repornire.ts'
CNC = 'extensii/trenulet/sursa/planificator/cnc.ts'
APP = 'extensii/trenulet/sursa/planificator/app.ts'
ATE = 'extensii/trenulet/sursa/planificator/atelier.ts'
DIC = 'extensii/trenulet/sursa/planificator/texte.en.json'
UNE = 'scripts/texte-trenulet.ts'

E2E = ['test/e2e/extensii.lucru.spec.ts', 'test/e2e/trenulet.spec.ts']

SETURI = {
    'limba': ['test/unit/trenulet.limba.test.ts'],
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
    'pachet': ['test/unit/trenulet.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
    'repornire': ['test/unit/extensii.repornire.test.ts'],
}

# tr, în limba.ts
o('T01', LIM, 'if (typeof s === "string") return en ? ((typeof v[0] === "string" ? dictionar[s + "@" + v[0]] : undefined) ?? dictionar[s] ?? s) : s;',
  'if (typeof s === "string") return s;', 'limba',
  'în engleză, un șir trecut prin tr rămâne românesc')
o('T02', LIM, '(m, k) => (+k < v.length ? String(v[+k]) : m)', '((i) => () => String(v[i++]))(0)', 'limba',
  'traducerea unui șablon nu mai poate muta valorile: le pune în ordinea din română')
o('T03', LIM, 'cheie += "{" + (i - 1) + "}" + s[i];', 'cheie += "{}" + s[i];', 'limba',
  'cheia unui șablon nu mai e cea scrisă de unealtă ({0}, {1}…): niciun șablon nu se mai traduce')
o('T04', LIM, '(typeof v[0] === "string" ? dictionar[s + "@" + v[0]] : undefined) ?? ', '', 'limba',
  'contextul e uitat: patul imprimantei devine „board”, ca placa de lemn')
o('T05', LIM, '  if (en && typeof document !== "undefined" && document.body) urmareste(document.body);\n', '', 'e2e',
  'în engleză, textele fixe de pe pagină rămân românești')
o('T06', LIM, '        if (m.type === "childList") m.addedNodes.forEach(traduArbore);\n',
  '        if (m.type === "childList") void 0;\n', 'e2e',
  'ce intră pe pagină după pornire (foile, listele, mesajele) rămâne românesc')
o('T07', LIM, r'    const k = s.replace(/\s+/g, " ").trim();', '    const k = s;', 'e2e',
  'textele din marcaj, cu spații și rânduri noi în jur, nu-și mai găsesc traducerea')
o('T08', LIM, '  const ATRIBUTE = ["title", "aria-label", "placeholder", "alt"];', '  const ATRIBUTE: string[] = [];', 'e2e',
  'atributele (title, aria-label, placeholder, alt) rămân românești')
o('T09', LIM, 'zecimal: en ? "." : ","', 'zecimal: ","', 'limba',
  'în engleză, zecimalele rămân cu virgulă')
o('T10', LIM, 'locala: en ? "en-GB" : "ro-RO"', 'locala: "ro-RO"', 'limba',
  'în engleză, data rămâne ca în română')
# intrarea planificatorului
o('T11', INT, "  if (host.limba !== 'en') return;\n", '', 'adaptoare',
  'dicționarul englez e adus și în română')
o('T12', INT, 'value: Object.freeze(texte)', 'value: texte', 'adaptoare',
  'dicționarul englez se poate schimba din pagină')
o('T13', INT, '    void lucru.goleste().then(() => { host.reporneste(); });\n', '    host.reporneste();\n', 'adaptoare',
  'la o limbă nouă, pagina repornește înainte să-și fi salvat lucrul')
o('T14', INT, '    if (ceruta || c.limba === laPornire) return;\n', '    if (c.limba === laPornire) return;\n', 'adaptoare',
  'după o limbă nouă, orice altă schimbare (o temă) cere încă o repornire')
o('T15', INT, '    if (ceruta || c.limba === laPornire) return;\n', '    if (ceruta) return;\n', 'adaptoare',
  'o temă nouă, în aceeași limbă, repornește pagina')
o('T16', INT, '    limba: host.limba,\n', '', 'adaptoare',
  'pagina nu mai știe limba lui cvs2')
o('T17', INT, '  await dictionarPeste(host);\n', '', 'e2e',
  'intrarea nu mai aduce dicționarul: în engleză, pagina rămâne românească')
o('T18', INT, '  limbaPeste(host, lucru);\n', '', 'e2e',
  'o limbă nouă în cvs2 nu mai ajunge în extensia deschisă')
o('T19', INT, "const SCRIPTURI = ['limba.js', 'cavalier.js', 'cnc.js', 'gcode.js', 'earcut.js', 'lego.js', 'profiluri.js', 'atelier.js', 'app.js'];",
  "const SCRIPTURI = ['cavalier.js', 'cnc.js', 'gcode.js', 'earcut.js', 'lego.js', 'profiluri.js', 'atelier.js', 'app.js', 'limba.js'];", 'e2e',
  'limba.js vine după scripturile care o folosesc')
o('T20', CON, "['texte.en.json', octeti(citeste('planificator', 'texte.en.json'))],", '', 'pachet',
  'dicționarul englez lipsește din pachet')
# repornirea, partea lui cvs2
o('T21', CAD, "      case 'reporneste':\n", '', 'e2e',
  'cvs2 nu mai aude cererea de repornire a extensiei')
# (T22–T24 țintesc, din a doua rulare, `repornire.ts`: în componentă, T22 scăpase, fiindcă proba e2e numără deschiderile
# reușite, iar două reporniri în aceeași clipă se văd ca una; proba unitară numără temporizatoarele.)
o('T22', REP, '      if (amanata) return;\n', '', 'repornire',
  'cererile dese de repornire nu se mai adună într-una: câte un temporizator pentru fiecare')
o('T23', REP, '      if (peste <= 0) { acum(); return; }\n      amanata = true;\n      temporizator = ceas.dupa(peste, acum);\n',
  '      acum();\n', 'repornire',
  'repornirile nu mai așteaptă cele 2 s dintre ele')
o('T24', REP, '    ultima = ceas.acum();\n', '', 'repornire',
  'cvs2 nu mai ține minte ultima repornire: nicio pauză între ele')
o('T38', REP, '      ceas.anuleaza(temporizator);\n', '', 'repornire',
  'oprirea nu mai anulează repornirea amânată')
o('T39', REP, '      ceas.anuleaza(temporizator);\n      amanata = false;\n', '      ceas.anuleaza(temporizator);\n', 'repornire',
  'după o oprire, nicio cerere nu mai repornește extensia')
o('T40', EXT, "        else if (e.tip === 'reporneste') repornire.cere();\n", "        else if (e.tip === 'reporneste') void 0;\n", 'e2e',
  'fereastra extensiei nu mai ascultă cererea de repornire')
o('T41', EXT, '      repornire.opreste();\n', '', 'e2e',
  'o repornire amânată, rămasă după închidere, repornește extensia deschisă din nou')
o('T25', EXT, '  }, [deschisa, pornire]);\n', '  }, [deschisa]);\n', 'e2e',
  'cererea de repornire nu mai reface cadrul')
# sursele planificatorului
o('T26', CNC, 'throw Object.assign(new Error(tr`Piesa ${p.titlu || p.nume} nu încape pe placă`), { piesa: p.titlu || p.nume });',
  'throw new Error(tr`Piesa ${p.titlu || p.nume} nu încape pe placă`);', 'e2e',
  'motorul nu mai spune ce piesă nu încape: mesajul pentru om se pierde')
o('T27', APP, 'typeof piesa === "string" ? tr`${numeTaiat(piesa)}', 'typeof piesa === "number" ? tr`${numeTaiat(piesa)}', 'e2e',
  'exportul nu mai citește piesa din eroarea motorului')
o('T28', APP, 'const fmt = (v: number) => String(Math.round(v * 10) / 10).replace(".", Limba.zecimal);',
  'const fmt = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");', 'e2e',
  'zecimalele planului și ale exportului rămân cu virgulă în engleză')
o('T29', ATE, '  const fmt = (v: number, z = 1) => String(Math.round(v * 10 ** z) / 10 ** z).replace(".", Limba.zecimal);',
  '  const fmt = (v: number, z = 1) => String(Math.round(v * 10 ** z) / 10 ** z).replace(".", ",");', 'e2e',
  'zecimalele atelierului (mărimi, grame) rămân cu virgulă în engleză')
o('T30', ATE, 'return tr`Pantă inversă ${Math.round(unghiPanta(d))}°', 'return `Pantă inversă ${Math.round(unghiPanta(d))}°', 'e2e',
  'numele pantei inverse, din atelier, rămâne românesc')
o('T31', APP, '[{ nume: tr("CITESTE.txt"), text: textCiteste(r) }', '[{ nume: "CITESTE.txt", text: textCiteste(r) }', 'e2e',
  'README-ul arhivei CNC se numește tot CITESTE.txt în engleză')
o('T32', APP, 'tr("circuit")} · ${new Date().toLocaleString(Limba.locala)}', 'tr("circuit")} · ${new Date().toLocaleString("ro-RO")}', 'e2e',
  'data din README-ul arhivei rămâne ca în română')
# dicționarul și unealta lui
o('T33', DIC, ' "Circuite": "Layouts",\n', '', 'engleza',
  'un text cerut de surse rămâne fără traducere')
o('T34', DIC, '"{0} does not fit on the {1} × {2} mm board (with the margin).', '"{0} does not fit on the {1} mm board (with the margin).', 'engleza',
  'o traducere pierde o valoare ({2})')
o('T35', DIC, '"Pantă": "Slope",', '"Pantă": "Slopă",', 'engleza',
  'o traducere are litere românești')
o('T36', UNE, "        cere(q.map((x, i) => (i ? `{${i - 1}}` : '') + ((x['value'] as { cooked: string }).cooked)).join(''), unde(n));\n", '', 'engleza',
  'unealta nu mai cere traducerea șabloanelor tr`…`')
o('T37', UNE, "const ctx = c && c.type === 'Literal' && typeof c['value'] === 'string' ? `@${c['value'] as string}` : '';", "const ctx = '';", 'engleza',
  'unealta uită contextul: cuvintele cu două sensuri primesc o singură traducere')
