# Lista de otrăvuri a feliei A.8a (utilizarea aplicației: contractul, callable-ul `utilizare`, setările din admin; ADR 0262
# §1–§2, §5, §8), 23.11.2026, alese de autor: contractul (lista albă a evenimentelor și a contextului, marginile lotului,
# setările cerute și citite, ce află editorul, ștergerea singură), istoricul setărilor utilizării, serverul (contul deschis,
# colectarea oprită, reîncercarea, plafonul pe oră, ora sesiunii, păstrarea din setări, evenimentele refăcute, planul;
# setările doar ale owner-ului, pe versiunea văzută, neschimbate fără scriere, auditul), regulile (setările doar ale
# owner-ului, loturile ale nimănui din client) și secțiunea din fila Setări, pe emulatoare.
# Unitarele se rulează cu `scripts/otravuri.py`; seturile `server` și `reguli` tot cu el, dar în `firebase emulators:exec`;
# cele de pe emulatoare cu `scripts/otravuri-emulatoare.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'shared/utilizare.ts'
I = 'src/admin/setari/istoric.ts'
AU = 'functions/src/utilizare/actiuni.ts'
FR = 'firestore.rules'
SU = 'src/admin/setari/SetariUtilizarii.tsx'
IS = 'src/admin/setari/IstoricSetari.tsx'

# Contractul (unitare): lista albă.
o('U01', S, '  return cerute.every((k) => k in o) && chei.every((k) => cerute.includes(k) || optionale.includes(k));',
  '  return cerute.every((k) => k in o) && chei.length >= 0;', 'contract', 'un câmp în plus (un text, un e-mail) trece de lista albă')
o('U02', S, "      if (!id(i) || !din(SURSE, de) || typeof rez !== 'string'", "      if (!id(i) || typeof de !== 'string' || typeof rez !== 'string'", 'contract',
  'sursa unei acțiuni poate fi orice text')
o('U03', S, 'const RE_ID = /^[a-z][a-z0-9-]{0,39}(?:\\.[a-z0-9-]{1,40}){0,3}$/;', 'const RE_ID = /^[a-z][a-z0-9-]{0,39}(?:\\.[a-z0-9-]{1,40}){0,3}$/i;', 'contract',
  'un id cu majuscule (altceva decât un id din cod) trece')
o('U04', S, 'const RE_REZULTAT = /^(?:ok|motiv\\.[a-z0-9-]{1,60}(?:\\.[a-z0-9-]{1,40}){0,2})$/;', 'const RE_REZULTAT = /^.{1,200}$/;', 'contract',
  'rezultatul unei acțiuni poate fi orice text')
o('U05', S, 'return intreg(n, 1, REPETARI_MAX) ?', 'return intreg(n, 1, Number.MAX_SAFE_INTEGER) ?', 'contract', 'repetările n-au plafon')
o('U06', S, "  if (!o || !intreg(o['t'], 0, acum)) return null;", "  if (!o || !intreg(o['t'], 0, SESIUNE_MAX_MS)) return null;", 'contract',
  'un eveniment de după trimiterea lotului (din viitor) trece')
o('U07', S, 'evenimente.length > EVENIMENTE_PE_LOT) return null;', 'evenimente.length > 10 * EVENIMENTE_PE_LOT) return null;', 'contract',
  'un lot de 2 000 de evenimente trece')
o('U08', S, ' || !din(ECRANE, ecran) || !din(BROWSERE, browser)) return null;', ' || !din(ECRANE, ecran)) return null;', 'contract',
  'browserul poate fi tot antetul User-Agent')
o('U09', S, "  if (!o || !cheiExact(o, ['sesiune', 'nr', 'acum', 'context', 'evenimente'])) return null;", '  if (!o) return null;', 'contract',
  'un câmp în plus al lotului trece')
o('U10', S, "  if (typeof atingere !== 'boolean' || typeof online !== 'boolean') return null;", "  if (typeof online !== 'boolean') return null;", 'contract',
  '„atingere” poate fi orice')
o('U11', S, "      return cheiExact(o, ['fel', 't', 'id', 'rez']) && id(i) && din(REZULTATE_DIALOG, rez)", "      return cheiExact(o, ['fel', 't', 'id', 'rez']) && id(i) && typeof rez === 'string'",
  'contract', 'rezultatul unui dialog poate fi orice text')
o('U12', S, "export const idLot = (sesiune: string, nr: number): string => `${sesiune}-${nr}`;", "export const idLot = (sesiune: string, nr: number): string => `${sesiune}-${nr}-${Date.now()}`;",
  'contract', 'o reîncercare a aceluiași lot cade pe alt document (lotul se scrie de două ori)')

# Contractul (unitare): setările.
o('U13', S, '    if (!intreg(v, min, max)) return null;\n    n[k] = v;', '    if (!intreg(v, min - 1, max)) return null;\n    n[k] = v;', 'contract',
  'marginea de jos a fiecărui număr cu unu mai jos (lotul de 0 minute)')
o('U14', S, '    if (!intreg(v, min, max)) return null;\n    n[k] = v;', "    if (typeof v !== 'number' || v < min || v > max) return null;\n    n[k] = v;", 'contract',
  'un număr cu zecimale trece (lotul de 2,5 minute)')
o('U15', S, "  if (!o || !cheiExact(o, CAMPURI_SETARI)) return null;", '  if (!o) return null;', 'contract',
  'setări incomplete sau cu altceva trec')
o('U16', S, '    return intreg(v, min, max) ? v : SETARI_UTILIZARE_IMPLICITE[k];', "    return typeof v === 'number' ? v : SETARI_UTILIZARE_IMPLICITE[k];", 'contract',
  'un număr stricat din document (999 de minute) e luat de bun')
o('U17', S, "  colectare: s.colectare, clicuri: s.clicuri, lotMinute: s.lotMinute, pasiEroare: s.pasiEroare,\n});",
  "  colectare: s.colectare, clicuri: s.clicuri, lotMinute: s.lotMinute, pasiEroare: s.pasiEroare, zileEvenimente: s.zileEvenimente,\n});", 'contract',
  'editorul află și păstrările, care nu-l privesc')
o('U18', S, 'acumMs + zile * 86_400_000;', 'acumMs + zile * 3_600_000;', 'contract', 'lotul se șterge după ore, nu după zile')
o('U19', S, 'CAMPURI_SETARI.every((k) => a[k] === b[k]);', 'a.colectare === b.colectare && a.lotMinute === b.lotMinute;', 'contract',
  'setările cu alți pași dinaintea erorii par aceleași: salvarea nu scrie')

# Istoricul setărilor utilizării (unitare).
o('U20', I, '  const a = fara ? SETARI_UTILIZARE_IMPLICITE : setariUtilizareDin(inainte).setari;', '  const a = setariUtilizareDin(fara ? dupa : inainte).setari;',
  'setari', 'prima salvare nu pornește de la implicite: pare că n-a schimbat nimic')
o('U21', I, "    ...COMUTATOARE.filter((k) => a[k] !== b[k])", '    ...COMUTATOARE.filter(() => true)', 'setari',
  'și comutatoarele neschimbate apar, „colectarea pornită” la fiecare salvare')
o('U22', I, "map((k): Schimbare => ({ fel: k, dupa: b[k] }))", "map((k): Schimbare => ({ fel: k, dupa: a[k] }))", 'setari',
  'un comutator schimbat e spus cu starea de dinainte')
o('U23', I, "  ['lotMinute', 'lot'], ['zileEvenimente', 'evenimente'], ['zileSume', 'sume'], ['pasiEroare', 'pasi'],",
  "  ['zileEvenimente', 'evenimente'], ['lotMinute', 'lot'], ['zileSume', 'sume'], ['pasiEroare', 'pasi'],", 'setari',
  'numerele vin în altă ordine decât în formular')

# Serverul (`functions/test/utilizare.emulator.test.ts`), pe emulatoare.
o('F01', AU, "    if (!cont.exists && !staff.exists) throw new HttpsError('permission-denied',", "    if (false) throw new HttpsError('permission-denied',", 'server',
  'un om logat fără cont deschis trimite loturi')
o('F02', AU, '    if (!setari.colectare || existent.exists) return { ...raspuns, scris: false };', '    if (existent.exists) return { ...raspuns, scris: false };',
  'server', 'colectarea oprită din Setări nu oprește nimic')
o('F03', AU, '    if (!setari.colectare || existent.exists) return { ...raspuns, scris: false };', '    if (!setari.colectare) return { ...raspuns, scris: false };',
  'server', 'o reîncercare a aceluiași lot cade pe documentul existent cu o eroare')
o('F04', AU, '    if (pana >= LOTURI_PE_ORA) throw', '    if (pana > LOTURI_PE_ORA) throw', 'server', 'plafonul lasă un lot în plus pe oră')
o('F05', AU, '.doc(`${uid}_${ora}`);', '.doc(uid);', 'server', 'contorul nu se schimbă cu ora: după un ceas plin, contul rămâne oprit')
o('F06', AU, 'inceput: Timestamp.fromMillis(acum.getTime() - l.acum),', 'inceput: Timestamp.fromDate(acum),', 'server',
  'începutul sesiunii e ora primirii: evenimentele cad în timp după trimitere')
o('F07', AU, 'expiraUtilizareLa(acum.getTime(), setari.zileEvenimente)', 'expiraUtilizareLa(acum.getTime(), 90)', 'server',
  'păstrarea din Setări nu se aplică')
o('F08', AU, '      evenimente: l.evenimente, aruncate,', "      evenimente: obiect(d['lot'])['evenimente'] as unknown[], aruncate,", 'server',
  'serverul scrie evenimentele cum au venit, cu textul din cele aruncate')
o('F09', AU, 'plan: planDin(cont),', 'plan: null,', 'server', 'planul contului lipsește din lot')
o('F10', AU, "    if (!(await drepturiIn(tx, db, uid)).owner) throw new HttpsError('permission-denied', 'doar owner-ul schimbă setările utilizării');",
  "    await drepturiIn(tx, db, uid);", 'server', 'oricine cu cont schimbă setările')
o('F11', AU, "    if (acolo.versiune !== vazuta) throw new HttpsError('failed-precondition',", "    if (false) throw new HttpsError('failed-precondition',", 'server',
  'o salvare pe o versiune veche (altă filă) le calcă pe cele noi')
o('F12', AU, '    if (aceleasiSetariUtilizare(acolo.setari, cerute)) return { ok: true, schimbat: false, versiune: acolo.versiune };\n', '', 'server',
  'o salvare fără schimbare scrie și lasă un rând de audit')
o('F13', AU, 'inainte: s.exists ? acolo.setari : null, dupa: cerute,', 'inainte: null, dupa: cerute,', 'server', 'auditul uită setările dinainte')
o('F14', AU, "  const cerute = setariUtilizareCerute(d['setari']);", "  const cerute = setariUtilizareDin(d['setari']).setari;", 'server',
  'setările greșite sunt înlocuite tăcut cu implicitele, în loc să fie refuzate')

# Regulile (`functions/test/reguli.emulator.test.ts`), pe emulator.
o('R01', FR, "allow get: if ((id == 'conturi' || id == 'utilizare') && eOwner())", "allow get: if (id == 'conturi' && eOwner()) || (id == 'utilizare' && request.auth != null)",
  'reguli', 'setările utilizării le citește oricine e logat')
o('R02', FR, '    // Loturile utilizării (ADR 0262) și contoarele lor pe oră', '    match /utilizare/{id} {\n      allow read: if eOwner();\n    }\n    // Loturile utilizării (ADR 0262) și contoarele lor pe oră',
  'reguli', 'owner-ul citește loturile din client (adminul ar trebui să vadă doar sumele zilei)')

# Secțiunea din fila Setări, pe emulatoare.
o('E01', SU, '    colectare, clicuri, lotMinute: numar(numere.lotMinute),', '    colectare: initiale.colectare, clicuri, lotMinute: numar(numere.lotMinute),', 'e2e',
  'bifa colectării nu ajunge în salvare')
o('E02', SU, "  const numar = (s: string): number => (s.trim() === '' ? Number.NaN : Number(s));", '  const numar = (s: string): number => Number(s);', 'e2e',
  'un câmp gol e 0: pașii dinaintea erorii se salvează goi')
o('E03', SU, 'disabled={ocupat || faraAppCheck || cerute === null}', 'disabled={ocupat || faraAppCheck}', 'e2e',
  '„Salvează” rămâne activ cu un număr din afara marginilor')
o('E04', SU, 'salveaza={(s) => { salveaza(s, citite.valoare.versiune); }}', 'salveaza={(s) => { salveaza(s, 0); }}', 'e2e',
  'a doua salvare pleacă pe versiunea 0 și e refuzată')
o('E05', SU, 'rev={rev} limba={limba} nume="utilizare"', 'rev={0} limba={limba} nume="utilizare"', 'e2e',
  'după o salvare, istoricul utilizării nu se citește din nou')
o('E06', SU, 'tinta={`${CALE_SETARI_UTILIZARE.colectie}/${CALE_SETARI_UTILIZARE.id}`}', 'tinta="setari/conturi"', 'e2e',
  'sub setările utilizării stă istoricul conturilor')
o('E07', SU, '{citite.valoare.versiune > 0 ?', '{citite.valoare.versiune > 1 ?', 'e2e', 'după prima salvare, secțiunea spune încă „Nesalvate”')
o('E08', I, "  ['setari.utilizare', schimbariUtilizare],\n", '', 'e2e', 'istoricul setărilor utilizării rămâne gol')
o('E09', IS, "t(`admin.set.ist.${s.fel}.${s.dupa ? 'pornit' : 'oprit'}`)", "t(`admin.set.ist.${s.fel}.${s.dupa ? 'oprit' : 'pornit'}`)", 'e2e',
  'istoricul spune „pornită” la o colectare oprită')

SETURI = {
    'contract': ['test/unit/utilizare.contract.test.ts'],
    'setari': ['test/unit/admin.setari.istoric.test.ts'],
    # Câte un singur fișier de emulator pe set, rulat în `firebase emulators:exec`.
    'server': ['functions/test/utilizare.emulator.test.ts'],
    'reguli': ['functions/test/reguli.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/utilizatori.emulator.spec.ts']
SU1 = (E2E[0], 'setările utilizării')
GREP = {k: SU1 for k in ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09']}
