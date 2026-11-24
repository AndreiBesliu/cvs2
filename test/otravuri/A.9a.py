# Lista de otrăvuri a feliei A.9a (sumele zilei ale utilizării, jobul de noapte, permisiunea „Utilizare: citește”; ADR 0262
# §5, §6), 24.11.2026, alese de autor: schița oamenilor (rangul, maximul pe registru, numărarea liniară, unirea, textul),
# zilele în fusul României, treptele sesiunii, sumatorul (segmentele, repetările, reușitele și motivele, evenimentele
# aruncate, durata sesiunii în zi, clicurile, oamenii pe acțiune, codurile mașinii), jobul (paginile, marginea zilei, zilele
# recalculate, ștergerea singură, lotul fără formă, setările citite), regula sumelor, catalogul permisiunilor și al joburilor.
# Unitarele se rulează cu `scripts/otravuri.py`; seturile `server` și `reguli` tot cu el, în `firebase emulators:exec`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


Z = 'shared/utilizareZi.ts'
J = 'functions/src/utilizare/agregare.ts'
R = 'firestore.rules'
P = 'shared/personal.ts'
JB = 'shared/joburi.ts'

# Sumele, pure (unitare).
o('Z01', Z, 'Math.clz32(rest) + 1;', 'Math.clz32(rest);', 'zi', 'rangul pierde un bit: jumătate din oameni nu se văd')
o('Z02', Z, '  if (rang > (s[j] ?? 0)) s[j] = rang;', '  s[j] = rang;', 'zi', 'registrul ține ultimul rang, nu maximul: estimarea mare scade de câteva ori')
o('Z03', Z, 'zero > 0 ? m * Math.log(m / zero) : e;', 'zero > 0 ? e : e;', 'zi', 'fără numărarea liniară: pe numere mici, sute de oameni în loc de unul')
o('Z04', Z, 'Math.max(a[i] ?? 0, b[i] ?? 0)', 'Math.min(a[i] ?? 0, b[i] ?? 0)', 'zi', 'unirea a două zile dă oamenii comuni, nu pe toți')
o('Z05', Z, 'if (r < 0 || r > 33 - p) return null;', 'if (r < 0) return null;', 'zi', 'o schiță cu un rang imposibil se citește')
o('Z06', Z, 'ms + offsetMs(ms, fus)', 'ms - offsetMs(ms, fus)', 'zi', 'ziua locală e socotită pe dos: lotul de la miezul nopții cade în altă zi')
o('Z07', Z, '(z ?? 1) + n)', '(z ?? 1))', 'zi', 'ziua de după e aceeași zi')
o('Z08', Z, 'TREPTE_SESIUNE_MIN.find((x) => min < x)', 'TREPTE_SESIUNE_MIN.find((x) => min <= x)', 'zi', 'o sesiune de un minut cade în treapta „sub un minut”')
o('Z09', Z, "this.s[l.personal ? 'personal' : 'clienti']", "this.s['clienti']", 'zi', 'personalul intră în sumele clienților')
o('Z10', Z, '          const n = e.n ?? 1;', '          const n = 1;', 'zi', 'repetările unei acțiuni nu se numără')
o('Z11', Z, "          if (e.rez === 'ok') a.ok += n;\n          else creste(a.motive, e.rez, n);", '          a.ok += n;', 'zi',
  'refuzurile se numără ca reușite, fără motivul lor')
o('Z12', Z, '        s.aruncate++;\n        continue;', '        continue;', 'zi', 'un eveniment din afara listei albe se pierde fără urmă')
o('Z13', Z, 'max >= min ? max - min : 0', 'max >= min ? max : 0', 'zi', 'durata sesiunii se numără de la începutul ei, nu de la primul eveniment din zi')
o('Z14', Z, "case 'clic': creste(s.clicuri, e.id, e.n ?? 1); break;", "case 'clic': creste(s.clicuri, e.id); break;", 'zi', 'clicurile repetate se numără o dată')
o('Z15', Z, '          adaugaInSchita(a.oameni, P_ACTIUNE, h);\n', '', 'zi', 'oamenii unei acțiuni nu se numără')
o('Z16', Z, '          if (e.cod !== undefined) creste(s.coduriMasina, `${e.id}:${e.cod}`);\n', '', 'zi', 'alarmele mașinii pierd codul')

# Jobul, pe emulator.
o('J01', J, '    if (pagina.size < PAGINA_LOTURI) break;', '    break;', 'server', 'doar prima pagină de loturi se adună')
o('J02', J, ".where('primit', '<', pana)", ".where('primit', '<=', pana)", 'server', 'lotul de la miezul nopții intră în ambele zile')
o('J03', J, 'k >= 1; k--', 'k >= 0; k--', 'server', 'și ziua de azi, neîncheiată, se scrie ca și cum ar fi gata')
o('J04', J, 'pana.toMillis() + zileSume * ZI_MS', 'acum.getTime() + zileSume * ZI_MS', 'server', 'sumele se șterg după ora rulării, nu după capătul zilei')
o('J05', J, " || !Array.isArray(evenimente)) return null;", ') return null;', 'server', 'un lot cu evenimentele stricate se numără ca bun')
o('J06', J, '  const { zileSume } = setariUtilizareDin(s.exists ? s.data() : undefined).setari;', '  const zileSume = 730;', 'server',
  'păstrarea sumelor din Setări e ignorată')

# Regula sumelor, pe emulator.
o('R01', R, "      allow read: if are('utilizare.citeste');", '      allow read: if true;', 'reguli', 'oricine citește sumele')
o('R02', R, "      allow read: if are('utilizare.citeste');", "      allow read, write: if are('utilizare.citeste');", 'reguli',
  'cine citește sumele le poate și scrie')
o('R03', R, "      allow read: if are('utilizare.citeste');", "      allow get: if are('utilizare.citeste');", 'reguli',
  'sumele unei perioade nu se pot cere (doar o zi pe rând)')

# Cataloagele (unitare).
o('P01', P, "'tichete.raspunde', 'utilizare.citeste',", "'tichete.raspunde',", 'personal', 'permisiunea lipsește din catalog: niciun rol n-o poate primi')
o('P02', JB, "  { nume: 'agregaUtilizarea', programare: '30 2 * * *', fus: 'Europe/Bucharest', intervalOre: 24, timeoutSecunde: 540 },\n", '',
  'joburi', 'jobul lipsește din catalog: Diagnoza nu-l judecă')

SETURI = {
    'zi': ['test/unit/utilizare.zi.test.ts'],
    'personal': ['test/unit/personal.test.ts'],
    'joburi': ['test/unit/joburi.test.ts'],
    # Câte un singur fișier de emulator pe set, rulat în `firebase emulators:exec`.
    'server': ['functions/test/agregare.emulator.test.ts'],
    'reguli': ['functions/test/reguli.emulator.test.ts'],
}
