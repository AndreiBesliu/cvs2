# ADR 0056: Roadmap-ul în engleză

**Starea:** acceptat pe 24.10.2026. Cererea owner-ului: „O sa vrea roadmap si in engleza, dar dupa asta” (20.10), apoi „Fa
oricum roadmapul in eng” (24.10). **Intră în:** etapa 3, lângă documentația admin (ADR 0048), fără mașină. **Continuă:**
ADR 0048.

**Problema.** Fila Roadmap din `/admin` își are etichetele prin `t()`, deci în engleză când interfața e în engleză, dar tot
conținutul (țintele etapelor, feliile, notele din jurnale, cererile către owner, titlurile ADR-urilor) vine din fișele
scrise în română. Pagina `/admin` nici nu avea un comutator de limbă: lua limba aleasă în aplicație.

## Decizia

**1. Fișele rămân singurul adevăr, în română.** Traducerea stă într-un dicționar din repo, `docs/traduceri/roadmap.en.json`
(`{ schema: 1, texte: { amprentă: { ro, en } } }`): cheia e amprenta textului român (sha256, primii 16 hex), iar româna stă
lângă engleză, ca să se poată revizui. Un text schimbat în fișă își schimbă amprenta, deci traducerea veche nu se mai
potrivește și nu se folosește niciodată pe un text pe care nu-l traduce.

**2. La build, două fișiere.** Generatorul (`scripts/documentatie.ts`) scrie, lângă `documentatie/roadmap.json`, și
`documentatie/roadmap.en.json`: aceeași formă, cu `limba: 'en'` și `netraduse` (câte texte n-au încă traducere și apar în
română). Se traduc țintele, ce închide, placa și live-ul etapelor, titlurile, descrierile și notele întregi ale feliilor,
punctele din `PLAN.md` §5.3, cererile către owner și titlurile ADR-urilor. „Nota” scurtă a unei felii nu se traduce separat:
se ia din nota întreagă tradusă, cu aceeași funcție ca în română (`primaPropozitie`). Ce nu e text (id-uri, stări, date,
cifre, căi) rămâne neschimbat. Codul pur e în `scripts/traducere.ts`.

**3. Fila alege fișierul după limba activă** și îl cere din nou la schimbarea limbii (fiecare fișier o singură dată pe
pagină). Antetul `/admin` are acum comutatorul RO / EN, același mecanism ca în aplicație (dicționarul adus întâi, alegerea
ținută în browser). Dacă există texte netraduse, fila o spune, sub cronologie.

**4. Traducerea vine odată cu fișa.** `npm run traduceri` pune dicționarul la zi după fișele de acum: păstrează traducerile
folosite, adaugă intrări goale (`en: ""`) pentru textele noi sau schimbate și scoate ce nu mai e folosit. Integratorul
completează `en` în același commit cu rândul feliei. Proba din nivelul rapid (`test/unit/traducere.test.ts`) cere zero texte
netraduse și zero traduceri nefolosite pe roadmap-ul real, deci un rând de jurnal fără traducere înroșește CI-ul, cu mesajul
care spune ce e de făcut.

**5. Doar roadmap-ul.** Fila Documentație (planul, fișele, ADR-urile întregi) rămâne în română. A le traduce ar însemna ~0,9 MB
de text ținut la zi în două limbi. Se poate cere separat.

## Respinse

- **O coloană în engleză în tabelele fișelor:** dublează fiecare rând de jurnal și schimbă forma citită de poartă (ADR 0048).
- **Un roadmap în engleză scris de mână:** a doua listă, care derivă tăcut (respins și în ADR 0048).
- **Traducerea automată la build** (un model chemat de pipeline): rețea, cost și un build care nu mai e determinist.

## Probele

`test/unit/traducere.test.ts`: amprenta; textele de tradus (unice, fără „—”, nota scurtă derivată); traducerea pe un roadmap
mic (fiecare câmp, nota scurtă din nota întreagă tradusă, lipsurile numărate și lăsate în română, o intrare a cărei română
nu e textul nefolosită); dicționarul la zi și citirea lui; roadmap-ul real (forma ambelor fișiere, zero lipsuri, zero
traduceri nefolosite, aceeași structură). Controlul negativ: cu o traducere golită, proba cade cu mesajul ei.
`test/unit/admin.documentatie.test.ts`: aducerea fișierului fiecărei limbi; forma fără `limba` / `netraduse`, refuzată.
`test/e2e-emulator/documentatie.emulator.spec.ts`: EN din antet cere `roadmap.en.json`, arată felia 3.4a și cererea
owner-ului în engleză, iar înapoi în română nu mai cere nimic. Poarta build-ului (`scripts/build-determinist.ts`) cere
`roadmap.en.json` cu forma și etapele roadmap-ului român și spune câte texte sunt netraduse.
