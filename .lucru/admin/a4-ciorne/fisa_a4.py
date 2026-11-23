"""Rândul 3.Ad în fișa etapei 3, traducerea lui în roadmap.en.json și rândul A.4.py din docs/otravuri.md (rulat din rădăcina
worktree-ului). Cifrele (CIFRE) se completează la final."""
import json
import sys

CIFRE = dict(
    sfarsit=sys.argv[1],          # ex. '23.11 01:30'
    unitare=sys.argv[2],          # ex. '6'
    otravuri=sys.argv[3],         # ex. '40 / 40'
    admin=sys.argv[4],            # ex. '123,0'
    admin_en=sys.argv[5],         # ex. '123.0'
    plus=sys.argv[6],             # ex. '+1,8'
    plus_en=sys.argv[7],          # ex. '+1.8'
    linia=sys.argv[8],            # ex. '+16,5'
    linia_en=sys.argv[9],         # ex. '+16.5'
)

TITLU = 'Sugestii ca tablă a deciziilor'
EN_TITLU = 'Suggestions as a decision board'
RO = (
    f"| 3.Ad | 22.11 21:42 | {CIFRE['sfarsit']} | 2 | **{TITLU}** (felia A.4 din ADR 0260 §4; fără mașină; a patra felie a liniei "
    "adminului, `3.Ad` în fișă; aceeași ramură, `wip/A.1-admin`, adusă înainte la `main` `88be9d6c`, care conține A.3; pornită "
    "la „Da, A.4”, cuvântul owner-ului). Fila Sugestii e tabla din schiță: o coloană pe decizie (Fără decizie, Acceptată, În "
    "lucru, Amânată, Făcută), Respinsele strânse dedesubt, arătate la cerere. Owner-ul trage un card în altă coloană sau alege "
    "din „⋯”, meniul „Mută în…” (calea din tastatură); la Respinsă și Amânată, o fereastră cere nota. Cât cererea e în drum, "
    "cardul stă deja în coloana nouă; la răspuns, lista ține decizia fără s-o recitească (o mutare nu mai costă cele până la "
    "300 de citiri ale listei); un refuz îl întoarce, cu motivul pe el. Detaliul cardului e o fereastră (textul, poza, decizia, "
    "editarea autorului, decizia owner-ului, cu nota cerută și acolo); „Sugestie nouă” deschide formularul, iar poza venită din "
    "editor îl deschide singură; „Ale mele” / „Toate”. Fără reguli, date sau funcții noi: callable-ul `sugestii` de azi, pe "
    f"versiunea văzută. **Probe:** {CIFRE['unitare']} unitare noi; proba e2e a Sugestiilor rescrisă pe tablă, plus două noi (tragerea, nota, "
    "meniul din tastatură, mutarea ținută pe drum, nicio citire a listei după mutări; refuzul care revine). **Otrăvuri:** "
    f"{CIFRE['otravuri']} prinse (14 unitare, 26 pe emulatoare). **Mărimea:** `/admin` 121,2 → {CIFRE['admin']} / 200 kB "
    f"({CIFRE['plus']}; linia, {CIFRE['linia']} din +25); pornirea și totalul neschimbate. |"
)
EN_NOTA = (
    f"**{EN_TITLU}** (slice A.4 of ADR 0260 §4; no machine; the fourth slice of the admin line, `3.Ad` in the sheet; the same "
    "branch, `wip/A.1-admin`, fast-forwarded to `main` `88be9d6c`, which contains A.3; started on “Da, A.4”, the owner’s "
    "word). The Suggestions tab is the board from the sketch: one column per decision (No decision, Accepted, In progress, "
    "Postponed, Done), the Rejected ones gathered below, shown on request. The owner drags a card to another column or picks "
    "from “⋯”, the “Move to…” menu (the keyboard path); for Rejected and Postponed, a dialog asks for the note. While the request "
    "is on its way, the card already sits in the new column; on the answer, the list keeps the decision without reading it again "
    "(a move no longer costs the up to 300 reads of the list); a refusal puts it back, with the reason on it. The card’s detail "
    "is a dialog (the text, the picture, the decision, the author’s edit, the owner’s decision, with the note required there "
    "too); “New suggestion” opens the form, and a picture coming from the editor opens it by itself; “Mine” / “All”. No new "
    "rules, data or functions: today’s `sugestii` callable, on the version seen. "
    f"**Tests:** {CIFRE['unitare']} new unit tests; the end-to-end test of Suggestions rewritten on the board, plus two new ones "
    "(dragging, the note, the keyboard menu, the move held on its way, no read of the list after moves; the refusal that comes "
    f"back). **Poisons:** {CIFRE['otravuri']} caught (14 unit, 26 on the emulators). **Size:** `/admin` 121.2 → "
    f"{CIFRE['admin_en']} / 200 kB ({CIFRE['plus_en']}; the line, {CIFRE['linia_en']} of +25); startup and total unchanged."
)
OTR = (
    "| `test/otravuri/A.4.py` | Sugestii ca tablă a deciziilor (ADR 0260 §4, felia A.4, `3.Ad` în fișă): partea pură (coloanele "
    "și ordinea lor, „Mută în…”, nota cerută, mutarea arătată cât e în drum, lista după răspuns, fără recitire) și pagina pe "
    "emulatoare (tragerea, fereastra notei, meniul din tastatură și focusul, mutarea ținută pe drum, refuzul care revine, "
    "„Reîncarcă”, „Sugestie nouă” și poza din editor, rolul care doar citește). "
    f"{CIFRE['otravuri']} prinse. |"
)

p = 'docs/etape/etapa-03.md'
s = open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
assert '| 3.Ad |' not in s
if not s.endswith(nl):
    s += nl
s += RO + nl
open(p, 'w', encoding='utf-8', newline='').write(s)

p = 'docs/traduceri/roadmap.en.json'
j = json.load(open(p, encoding='utf-8'))
t = j['texte']
gasite = 0
for k, v in t.items():
    if v['en'] != '':
        continue
    if v['ro'] == TITLU:
        v['en'] = EN_TITLU
        gasite += 1
    elif v['ro'].startswith(f'**{TITLU}**'):
        v['en'] = EN_NOTA
        gasite += 1
print('traduse', gasite)

p2 = 'docs/otravuri.md'
s2 = open(p2, encoding='utf-8', newline='').read()
nl2 = '\r\n' if '\r\n' in s2 else '\n'
anc = s2.index('| `test/otravuri/A.3.py` |')
capat = s2.index(nl2, anc) + len(nl2)
s2 = s2[:capat] + OTR + nl2 + s2[capat:]
open(p2, 'w', encoding='utf-8', newline='').write(s2)
if gasite != 2:
    print('ATENȚIE: întâi `node scripts/traduceri.ts --scrie` (cheile noi), apoi din nou partea traducerii')
open(p, 'w', encoding='utf-8', newline='').write(json.dumps(j, ensure_ascii=False, indent=2) + '\n')
