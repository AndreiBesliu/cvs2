# Sabotajele feliei 3.Xd, pluginul ca parte din cvs2 (ADR 0164), 04.11.2026: fiecare apărare (tema și fonturile lui cvs2 în
# cadru și în planificator, contul văzut doar cu permisiunea lui, lucrul nesalvat urmărit și salvat la închidere, întrebarea
# pentru ce rămâne nesalvat, la ×, la altă extensie, la o versiune nouă și la reîncărcare), stricată o dată; proba care o
# apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - încărcătorul (`shared/cadruExtensie.ts`: `host.cont`, `nesalvat`, `laInchidere`, „inchidere”): orice schimbare a textului
#   lui schimbă amprenta, deci o prinde `csp.extensii.test.ts` oricare ar fi (în e2e, CSP-ul ar opri tot cadrul); învelișurile
#   noi le folosesc probele e2e ale extensiei „Salut”;
# - al doilea clic pe × cât se așteaptă salvările (`seInchide`): ar cere-o încă o dată, fără să strice ceva;
# - planul necunoscut arătat cu codul lui (`|| c.plan`, în planificator): cvs2 nu-l poate trimite fără să schimbe API-ul
#   (`PlanCont`, verificat de compilator în `src/extensii/cont.ts`);
# - nuanțele derivate (`--pericol-moale`) și culoarea inelului de focus: le arată captura din raport.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CAD = 'src/extensii/cadru.ts'
EXT = 'src/extensii/Extensii.tsx'
CONT = 'src/extensii/cont.ts'
PAC = 'src/extensii/pachet.ts'
INT = 'extensii/trenulet/intrare.ts'
APP = 'extensii/trenulet/sursa/planificator/app.ts'
ATE = 'extensii/trenulet/sursa/planificator/atelier.ts'
CSS = 'extensii/trenulet/sursa/planificator/head.html'

E2E = ['test/e2e/extensii.lucru.spec.ts', 'test/e2e/trenulet.spec.ts']

SETURI = {
    'cont': ['test/unit/extensii.cont.test.ts'],
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
    'pachet': ['test/unit/trenulet.test.ts', 'test/unit/extensii.pachet.test.ts'],
}

# tema și fonturile lui cvs2, în cadru
o('X01', CAD, "  '--l-camp', '--fond', '--font', '--mono', 'color-scheme',\n", "  '--l-camp', '--fond', '--font', '--mono',\n", 'e2e',
  'cadrul nu mai primește tema aleasă în cvs2 (color-scheme)')
o('X02', CAD, "  '--l-camp', '--fond', '--font', '--mono', 'color-scheme',\n", "  '--l-camp', '--fond', 'color-scheme',\n", 'e2e',
  'cadrul nu mai primește fonturile lui cvs2')
# lucrul nesalvat și închiderea, partea lui cvs2
o('X03', CAD, "        nesalvat = m.da === true;\n", "        nesalvat = false;\n", 'e2e',
  'cvs2 nu mai ține minte lucrul nesalvat al extensiei')
o('X04', CAD, "      port.postMessage({ tip: 'inchidere', id });\n", "      gata(true);\n", 'e2e',
  'la ×, cvs2 nu-i mai cere extensiei salvările ei')
o('X05', CAD, "      const ceas = setTimeout(() => { gata(false); }, ms);\n", "      const ceas = setTimeout(() => { gata(false); }, 0);\n", 'e2e',
  'la ×, cvs2 nu mai așteaptă salvările extensiei')
o('X06', EXT, "      if (!h.nesalvat()) { dupa(); return; }\n", "      if (!h.nesalvat() || true) { dupa(); return; }\n", 'e2e',
  'ce rămâne nesalvat se închide fără întrebare')
o('X07', EXT, "      if (!pornit.current?.nesalvat()) return;\n", "      if (!pornit.current?.nesalvat() || true) return;\n", 'e2e',
  'reîncărcarea paginii nu mai întreabă de lucrul nesalvat')
o('X08', EXT, "        ramai();\n", "", 'e2e',
  'Escape nu mai închide întrebarea')
o('X09', EXT, "    setTimeout(() => { butonInchide.current?.focus(); }, 0);\n", "", 'e2e',
  'după „Rămân”, focusul nu se mai întoarce la ×')
o('X10', EXT, "    if (deschisa?.id === x.id) { onFereastra(); return; }\n", "", 'e2e',
  'extensia deschisă, aleasă din meniu, nu-și mai arată fereastra')
o('X11', EXT, "    inchideCuGrija(() => { setDeschisa(x); });\n", "    setDeschisa(x);\n", 'e2e',
  'altă extensie o înlocuiește pe cea nesalvată fără întrebare')
o('X12', EXT, "              if (id !== null && deschisa?.id === id) inchideCuGrija();\n",
  "              if (id !== null && deschisa?.id === id) setDeschisa(null);\n", 'e2e',
  'o versiune nouă închide extensia nesalvată fără întrebare')
# contul
o('X13', EXT, "  useEffect(() => aboneazaCont(() => { trimiteContext.current?.(); }), []);\n",
  "  useEffect(() => aboneazaCont(() => {}), []);\n", 'e2e',
  'ieșirea din cont nu mai ajunge în extensie')
o('X14', CONT, "  if (!c.drept) return { conectat: true, nume: '', plan: null };\n",
  "  if (!c.drept) return { conectat: true, nume: c.nume, plan: null };\n", 'cont',
  'cu adresa neconfirmată, extensia vede adresa (ca nume)')
o('X15', CONT, "planPentruExtensie(dreptLaZi(c.drept, acum).plan)", "planPentruExtensie(c.drept.plan)", 'cont',
  'planul nu mai e judecat la zi (proba trecută se vede tot „proba”)')
o('X16', CONT, "  return permisiuni.includes('cont') ? { limba, tema, cont: contPentruExtensie(c, acum) } : { limba, tema };\n",
  "  return { limba, tema, cont: contPentruExtensie(c, acum) };\n", 'cont',
  'contul ajunge și la extensia fără permisiunea `cont`')
o('X17', CONT, "nume: c.nume.slice(0, NUME_MAX)", "nume: c.nume", 'cont',
  'numele contului trece întreg, oricât de lung')
o('X18', PAC, "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare', 'descarcari', 'masina', 'cont'];",
  "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare', 'descarcari', 'masina'];", 'pachet',
  'permisiunea `cont` nu mai există: planificatorul nu se mai instalează')
# intrarea planificatorului
o('X19', INT, "  if (typeof host.laInchidere === 'function') host.laInchidere(() => lucru.goleste());\n", "", 'adaptoare',
  'la închidere, salvările amânate ale paginii nu mai pornesc')
o('X20', INT, "        esuate.add(cheie);\n", "", 'adaptoare',
  'o scriere refuzată nu mai lasă pagina „nesalvată”')
o('X21', INT, "        await new Promise<void>((r) => { setTimeout(r, 0); });\n", "", 'adaptoare',
  'la închidere, ce pornește după un temporizator din salvările de acum nu se mai așteaptă')
o('X22', INT, "    verifica = setTimeout(() => { verifica = null; if (!acum()) anunta(false); }, 0);\n", "    anunta(false);\n", 'adaptoare',
  'între două scrieri înlănțuite, pagina se spune o clipă „salvată”')
o('X23', INT, "        await scriere(lucru, DB + cale, () => host.stocare.scrie(", "        await scriere(undefined, DB + cale, () => host.stocare.scrie(", 'adaptoare',
  'scrierile documentelor (db) nu mai sunt urmărite')
o('X24', INT, "      scrie(scriere(lucru, LS + String(k), () => host.stocare.scrie(", "      scrie(scriere(undefined, LS + String(k), () => host.stocare.scrie(", 'adaptoare',
  'scrierile din localStorage nu mai sunt urmărite')
o('X25', INT, "    rad.dataset['theme'] = s;\n", "", 'adaptoare',
  'pagina nu mai urmează tema aleasă în cvs2 (luminoasă / întunecată)')
o('X26', INT, "  temaPeste(host);\n", "", 'e2e',
  'intrarea nu mai pune tema lui cvs2 pe pagină')
o('X27', INT, "    cont: () => host.cont ?? null,\n", "    cont: () => null,\n", 'adaptoare',
  'pagina nu mai vede contul')
# sursele planificatorului
o('X28', APP, "  if (window.cvs2) { window.cvs2.amana(\"circuit\", salveaza, 1200); return; }\n", "", 'e2e',
  'salvarea circuitului nu mai e a gazdei: × imediat după o schimbare o pierde')
o('X29', APP, "  if (window.cvs2) { window.cvs2.amana(\"cnc\", inDb, 900); return; }   // ca la circuite (ADR 0164)\n", "", 'e2e',
  'setările CNC: × imediat după o schimbare le pierde')
o('X30', APP, "  if (window.cvs2) { window.cvs2.amana(\"masini\", inDb, 900); return; }   // ca la circuite (ADR 0164)\n", "", 'e2e',
  'profilul mașinii: × imediat după o schimbare îl pierde')
o('X31', ATE, "    if (window.cvs2) { window.cvs2.amana(\"atelier\", inDb, 700); return; }\n", "", 'e2e',
  'atelierul: × imediat după o schimbare o pierde')
o('X32', APP, "  el.hidden = !c;\n", "  el.hidden = true;\n", 'e2e',
  'contul nu se mai arată la Circuite')
o('X33', APP, "  if (window.cvs2) window.cvs2.laSchimbare(randeazaCont);   // intrarea sau iesirea din contul lui cvs2, pe loc (ADR 0164)\n", "", 'e2e',
  'ieșirea din cont nu mai ajunge la Circuite')
o('X34', CSS, "  --panou: var(--s-panou); --panou-2: var(--s-peste);", "  --panou-2: var(--s-peste);", 'e2e',
  'suprafețele planificatorului nu mai sunt ale lui cvs2')
o('X35', CSS, "  --font-titlu: var(--font); --font-text: var(--font); --font-mono: var(--mono);",
  "  --font-titlu: var(--font); --font-mono: var(--mono);", 'e2e',
  'textul planificatorului nu mai are fontul lui cvs2')
o('X36', CSS, "  --pericol: var(--rosu); --pericol-moale:", "  --pericol-moale:", 'e2e',
  'roșul planificatorului nu mai e al lui cvs2')
