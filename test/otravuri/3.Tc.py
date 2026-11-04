# Sabotajele feliei 3.Tc, sursele planificatorului Trenuleț în TypeScript (ADR 0162), 04.11.2026: fiecare apărare a
# conversiei (construcția și ham-ul referințelor șterg tipurile; proiectul de tipuri al planificatorului le are pe toate și
# e verificat; proiectul aplicației nu vede numele lor globale; declarațiile din `globale.d.ts`; tipurile surselor), stricată
# o dată; proba care o apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - un `.js` uitat lângă surse: o otravă e o înlocuire de text, nu un fișier nou (proba îl caută oricum, prima din
#   `trenulet.tipuri.test.ts`);
# - `npm run typecheck` fără proiectul planificatorului: `package.json` nu-l citește nicio probă, dar a doua plasă,
#   `trenulet.tipuri.test.ts`, rulează compilatorul pe proiect în suita unitară.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CON = 'scripts/construieste-trenulet.ts'
HAM = 'extensii/trenulet/sursa/teste/incarca.js'
RAD = 'tsconfig.json'
PLAN = 'extensii/trenulet/sursa/tsconfig.json'
GLOB = 'extensii/trenulet/sursa/globale.d.ts'
CNC = 'extensii/trenulet/sursa/planificator/cnc.ts'
APP = 'extensii/trenulet/sursa/planificator/app.ts'
LEGO = 'extensii/trenulet/sursa/lego/lego.ts'

SETURI = {
    'pagina': ['test/unit/trenulet.test.ts'],
    'tipuri': ['test/unit/trenulet.tipuri.test.ts'],
    'referinte': ['test/unit/trenulet.referinte.test.ts'],
}

o('T01', CON, "    { nume: 'cnc.js', text: faraTipuri('planificator', 'cnc.ts') },",
  "    { nume: 'cnc.js', text: citeste('planificator', 'cnc.ts') },", 'pagina',
  'motorul CNC intră în pachet cu tipuri: nu mai e JavaScript')
o('T02', CON, "  const app = faraTipuri('planificator', 'app.ts').replace(",
  "  const app = citeste('planificator', 'app.ts').replace(", 'pagina',
  'planul intră în pagină cu tipuri')
o('T03', HAM, "  const sursa = f => stripTypeScriptTypes(citeste(f), { mode: 'strip' });",
  "  const sursa = f => citeste(f);", 'referinte',
  'ham-ul referințelor rulează sursele cu tipuri')
o('T04', RAD, '  "exclude": ["extensii/trenulet/sursa"],\n', '  "exclude": [],\n', 'tipuri',
  'proiectul aplicației vede numele globale ale planificatorului')
o('T05', PLAN, '"include": ["planificator/*.ts", "lego/*.ts", "*.d.ts"]', '"include": ["planificator/*.ts", "*.d.ts"]', 'tipuri',
  'motorul LEGO iese din proiectul de tipuri (nu-l mai verifică nimeni)')
o('T06', PLAN, ',\n  "exclude": []', '', 'tipuri',
  'proiectul planificatorului moștenește excluderea rădăcinii: nicio sursă verificată')
o('T07', CNC, 'function arcInfo(p0: Pt, p1: Pt, b: number): Arc | null {', 'function arcInfo(p0: Pt, p1: Pt, b: string): Arc | null {', 'tipuri',
  'o eroare de tipuri în motorul CNC (JavaScript-ul rulat rămâne același)')
o('T08', GLOB, '    readonly negPlines: readonly { readonly pline: CavalierPline }[];\n', '', 'tipuri',
  'declarația lui Cavalier pierde un câmp folosit de motorul LEGO')
o('T09', APP, 'type PiesaPusa = { uid: string;', 'type PiesaPusa = { uid: number;', 'tipuri',
  'o eroare de tipuri în plan')
o('T10', LEGO, '  const N_CERC = 48;', '  const N_CERC = 47;', 'referinte',
  'o schimbare de cod în motorul LEGO: referințele citesc sursa TypeScript, nu o copie veche')
