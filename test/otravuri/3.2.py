# Lista de otrăvuri a feliei 3.2 (raportorul de erori din client, ADR 0043), 18.10.2026: a doua rundă, pe codul final
# (după remedierile recenziei și ale reverificării). Partea „R” reaplică pe codul nou otrăvurile scăpate în prima rundă
# (lentila „probe” a recenziei din 17.10: J1, U1, U3–U8, U16, U17, U20); partea „N” e nouă, pe remedieri (cursele,
# reîncercarea, starea, cheia App Check la publicare, carantina). Remedierile reverificării din 18.10 (marcajul „doar
# local”, cheia locală, curățarea, inactivitatea) au sabotajele lor separat (12, toate prinse; DEVLOG).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


POR = 'src/app/raportorPornire.ts'
TRI = 'src/cloud/raportor.ts'
JUR = 'src/app/jurnalErori.ts'
CON = 'src/cloud/conexiuneBaza.ts'
CHE = 'scripts/appcheck-cheie.ts'
PUB = 'scripts/pregateste-publicare.ts'

# ---- R: otrăvurile scăpate în prima rundă, reaplicate ----
o('J1', JUR,
  "        // Depozitul plin sau blocat: intrările rămân în memorie, pentru sesiunea asta.\n      }",
  "        // Depozitul plin sau blocat: intrările rămân în memorie, pentru sesiunea asta.\n        return;\n      }",
  'raportor', 'cu depozitul plin, ascultătorii (raportorul) nu mai află de intrarea nouă')
o('U1', TRI, "  if (r.ok !== false) return 'altul';\n", '', 'raportor', '{ ok: "da", motiv: "plafon" } stinge raportorul')
o('U3', POR, 'export const PLAFON_SESIUNE = 20;', 'export const PLAFON_SESIUNE = 200;', 'raportor', '200 de rapoarte pe încărcare')
o('U4', POR, 'export const PAUZA_REINCERCARE_MS = 5_000;', 'export const PAUZA_REINCERCARE_MS = 0;', 'raportor', 'reîncercarea imediată, fără pauză')
o('U5', TRI,
  "trimite: (raport) => cursa(() => d.apel(raport).then((r) => dinRaspuns(r.data)), TERMEN_APEL_MS, 'termen', dinEroare, amana),",
  "trimite: (raport) => d.apel(raport).then((r) => dinRaspuns(r.data), dinEroare),",
  'raportor', 'fără termenul propriu al apelului: un apel agățat ține pompa')
o('U6', TRI, 'dinRaspuns(r.data)), TERMEN_APEL_MS', 'dinRaspuns(r)), TERMEN_APEL_MS', 'raportor', 'răspunsul citit din plic, nu din `data`')
o('U7', POR,
  "      try {\n        t = m.creeazaTrimitere(c);\n      } catch {\n        t = null;\n      }",
  "      t = m.creeazaTrimitere(c);",
  'raportor', 'conexiunea care aruncă la creare lasă raportorul agățat în „pornit”')
o('U8', POR, 'const browser = deps.browser ?? navigator.userAgent;', "const browser = deps.browser ?? '';", 'raportor', 'browserul gol în raport')
o('U16', CHE, '{ resolveOnHTTPError: true }', '{ resolveOnHTTPError: false }', 'cheie', 'un 404 aruncă: publicarea se oprește în loc de avertisment')
o('U17', PUB, "writeFileSync(join(dir, 'public', 'config.json'), json);",
  "writeFileSync(join(dir, 'public', 'config.json'), `${JSON.stringify({ instanta: 'test', firebase })}\\n`);",
  'cheie', 'config.json publicat fără appCheck')
o('U20', POR, 'adresa: taie(faraInterogare(i.adresa), PLAFON_ADRESA),', "adresa: taie(i.adresa.split('?')[0] ?? '', PLAFON_ADRESA),",
  'raportor', 'fragmentul adresei pleacă (fără query, cu `#access_token`)')

# ---- N: remedierile (17.10) ----
o('N01', TRI, 'TERMEN_APP_CHECK_MS, false, () => false, amana)', 'TERMEN_APP_CHECK_MS, true, () => false, amana)',
  'raportor', 'tokenul App Check care nu vine trece drept venit')
o('N02', TRI, 'TERMEN_APP_CHECK_MS, false, () => false, amana)', 'TERMEN_APP_CHECK_MS, false, () => true, amana)',
  'raportor', 'tokenul App Check care aruncă trece drept venit')
o('N03', TRI, "  if (cod === 'unavailable' || (cod === 'internal'", "  if ((cod === 'internal'", 'raportor', '503 nu se mai reîncearcă')
o('N04', TRI, "o.message.endsWith('[0]')", "o.message.includes('[')", 'raportor', 'un 500 se reîncearcă (serverul a primit cererea)')
o('N05', TRI, "  if (cod === 'deadline-exceeded') return 'termen';", "  if (cod === 'deadline-exceeded') return 'retea';",
  'raportor', 'termenul depășit se reîncearcă (dublura)')
o('N06', POR, "if (rez === 'retea' && faza === 'pornit')", "if ((rez === 'retea' || rez === 'termen') && faza === 'pornit')",
  'raportor', 'și termenul propriu se reîncearcă')
o('N07', POR, "if (!(await t.pregateste().catch(() => false)))", "if (!(await t.pregateste().catch(() => true)))",
  'raportor', 'o pregătire care respinge trece drept reușită')
o('N08', POR, "    if (i.doarLocala) {\n      n.locale++;\n      return;\n    }\n", '', 'raportor', 'intrările „doar locale” pleacă')
o('N09', POR, 'taie(mesaj.trim() ? mesaj : MESAJ_GOL, PLAFON_MESAJ)', 'taie(mesaj, PLAFON_MESAJ)', 'raportor', 'mesajul gol pleacă gol (serverul îl refuză)')
o('N10', JUR, "...(context.raportorul === undefined ? [] : [`raportorul: ${context.raportorul}`]),", '',
  'raportor', 'starea raportorului lipsește din „Copiază raportul”')
o('N11', CON, 'isTokenAutoRefreshEnabled: false });', 'isTokenAutoRefreshEnabled: true });', 'conex', 'reîmprospătarea tokenului în fundal (reCAPTCHA periodic)')
o('N12', CHE, "if (siteKey === undefined || siteKey === '') return { stare: 'neinregistrata' };",
  "if (typeof siteKey !== 'string' || siteKey === '') return { stare: 'neinregistrata' };",
  'cheie', 'un siteKey de alt tip devine „neînregistrat” (App Check scos tăcut), nu eroare')
o('N13', CHE, "  if (!citit.ok) throw new Error(`config.json publicat ar fi refuzat de aplicație: ${citit.motiv}`);\n", '',
  'cheie', 'un config.json pe care aplicația l-ar refuza se publică')
o('N14', CON, 'return gazdaLocala(gazda) && ADRESA_CONT_LOCALA', 'return ADRESA_CONT_LOCALA', 'conex', 'emulatoarele acceptate și cu pagina în afara gazdei locale')
o('N15', CON, r"const GAZDA_PORT_LOCALA = /^(?:localhost|127\.0\.0\.1):\d{1,5}$/;", r"const GAZDA_PORT_LOCALA = /^(?:localhost|127\.0\.0\.1):\d{1,5}/;",
  'conex', 'Firestore / funcțiile cu ceva după port (`:8085@colector.ro`)')
o('N16', POR, "      if (pornit) return;\n      pornit = true;\n", "      pornit = true;\n", 'raportor', 'dubla pornire')
o('N17', POR, 'if (vazute >= PLAFON_PE_CHEIE) {', 'if (vazute > PLAFON_PE_CHEIE) {', 'raportor', '4 rapoarte pe cheie')
o('N18', POR, "    n.renuntate += coada.length;\n    coada.length = 0;\n", "    n.renuntate += coada.length;\n", 'raportor', 'stins, dar coada rămâne')
o('N19', POR, "    if (faza === 'stins') {\n      n.renuntate++;\n      return;\n    }\n", '', 'raportor', 'stins, dar intrările noi tot intră în coadă')
o('N20', TRI, "  if (cod === 'unauthenticated' || cod === 'permission-denied') return 'neautorizat';",
  "  if (cod === 'unauthenticated') return 'neautorizat';", 'raportor', '403 nu stinge raportorul')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    'raportor': u('raportor', 'jurnalErori'),
    'conex': u('conexiuneBaza', 'admin'),
    'cheie': u('appcheck-cheie'),
    'raportor2': u('raportor', 'jurnalErori', 'conexiuneBaza', 'admin', 'appcheck-cheie', 'i18n'),
}
SETURI['conex2'] = SETURI['raportor2']
SETURI['cheie2'] = SETURI['raportor2']
E2E = ['test/e2e/raportor.spec.ts', 'test/e2e/csp.spec.ts']
