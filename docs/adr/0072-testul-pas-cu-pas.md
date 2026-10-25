# ADR 0072: Testul pas cu pas, în aplicație

**Starea:** acceptat pe 25.10.2026, la cererea owner-ului: „vreau ca testarea asta sa fie ca un tutorial direct in app. vreau
si un buton cu care sa pot face snapshot la plansa. aceasta imagine se ataseaza automat la raportul pe care ti-l voi da la
final. deci nu ar trebui sa fie incarcata in server” (și „Da, pornește tutorialul de test în aplicație, cu butonul de snapshot
al planșei”). **Înlocuiește:** pagina testului din artifact (25.10, 31 de pași, fără niciun rezultat scris încă).
**Schimbă:** ADR 0045 §2 și ADR 0042 (o a doua parte doar online, cu plafonul ei, ca `/admin`).

**Problema.** Testul uneltelor de desen stătea într-o pagină separată: omul trecea între ea și aplicație, iar ce vedea pe
planșă nu ajungea la asistent decât descris în cuvinte.

## Decizia

**1. Pașii sunt un document** (`docs/tutorial/unelte-desen.md`): secțiuni (`##`), pași (`###`) cu `%% pas: id`, `%% faci`,
`%% vezi`. Build-ul îl citește (`scripts/tutorial.ts`, cu poarta lui: id lipsă sau repetat, câmp lipsă, cheie necunoscută
opresc build-ul) și scrie `dist/tutorial/unelte-desen.json` (`shared/tutorial.ts`). Cei 31 de pași ai artifact-ului, cu
aceleași id-uri, scriși pentru aplicație (primul nu mai trimite la un link). Doar în română: testul e al owner-ului; textele
panoului trec prin `t()`, în ambele limbi.

**2. Butonul Test** stă în extensia barei, lângă „?”, doar pe o instanță care nu e `live` (`config.json`: test și local). La
clic, panoul vine la cerere: o bucată proprie (`TestPasCuPas`), plutitoare în stânga-jos, peste bare și dialoguri (pasul se
citește și cu exportul deschis), mutată din titlu (locul se ține în `localStorage`), strânsă cu ▾. Pe pas: secțiunea,
titlul, ce faci, ce trebuie să vezi (markdown, cu cititorul manualului), Bine / Nu / Sărit (al doilea clic scoate starea), o
notă, **Poză**, Înapoi / Înainte; sus, o listă a tuturor pașilor (cu starea fiecăruia); jos, numărătoarea, **Descarcă
raportul** și **Începe din nou** (cu o confirmare). După un clic pe panou, focusul se întoarce paginii, ca tastele uneltelor
(R, O, N…) să meargă imediat; nota e un câmp, deci tastele scrise acolo nu ating aplicația.

**3. Totul stă în browser:** baza IndexedDB `cncvs2-test`, separată de proiecte (`stocareTest.ts`): starea (pasul și
rezultatele: starea, nota, ora) și pozele (PNG). Rămân după reîncărcare și după o versiune nouă; nimic nu pleacă pe server.

**4. Poza planșei** (`pozaPlansei.ts`) se compune local, fără nicio permisiune: pânza (desenată de worker, afișată prin
`bitmaprenderer`), straturile ei canvas (traseul, vederea 3D: amândouă cu `preserveDrawingBuffer`), straturile SVG de
deasupra (riglele, ghidajele, nodurile, cadrul, previzualizările), cu stilul calculat al fiecărui element copiat în SVG, și
mânerele transformării (elemente HTML: fondul, marginea, rotunjirea). Barele și panourile (insulele) nu intră. La rezoluția
pânzei (pixelii ecranului).

**5. Raportul e un singur fișier HTML**, descărcat (`raportTest.ts`, pur): titlul, versiunea, instanța, ora, browserul,
numărătoarea, apoi fiecare pas cu starea, nota (scăpată de HTML) și pozele lui încorporate (`data:` URL, `data-pas`); la
final, aceleași date în `<script type="application/json" id="date-raport">`, citite de asistent. Omul îl deschide în orice
browser și mi-l trimite.

**6. Doar online, cu plafonul lui:** testul există doar pe instanța de test, deci bucata lui (5,7 kB gzip la 25.10) și pașii
nu intră în precache (`shared/precache.ts`: `DOAR_ONLINE`) și nici în totalul aplicației (300 kB, 295,1 la 25.10): au
plafonul lor, 12 kB (`scripts/build-determinist.ts`), ca `/admin`. Nimeni nu le descarcă în afara testului. Pornirea nu
primește nimic (modulul editării e deja la cerere).

## Respinse

- **Captura ferestrei** (`getDisplayMedia`, fila curentă): ar prinde și dialogurile, dar cere permisiunea la fiecare sesiune
  și ține bara de partajare pe ecran; owner-ul a cerut planșa.
- **O bibliotecă de capturi HTML** (html2canvas): ~45 kB gzip, peste orice plafon, pentru dialoguri pe care nu le cere nimeni.
- **Pozele urcate în Storage**: owner-ul a spus „nu ar trebui sa fie incarcata in server”.
- **Raportul ca arhivă** (JSON + PNG-uri într-un ZIP): o bibliotecă în plus și un fișier pe care omul nu-l poate citi direct.

## Mai departe

Decizia owner-ului din aceeași zi: „Ma gandesc sa folosim acest test/tutorial si pe viitor, in aplicatia live, exact ca un
turorial. Ceva care sa ajute userii sa lucreze cu aplicatia. Asa ca, nu trebuie sa pierdem codul asta. Va fi repurposed”.
Codul de aici (panoul, pașii ca document cu generatorul lor, poza planșei, raportul) rămâne și nu se șterge; tutorialul pentru
utilizatori pe live îl refolosește, într-o felie a lui.

## Se redeschide dacă

- e nevoie de dialoguri în poze (atunci, captura filei, cu permisiunea ei, la cerere);
- testul trebuie să meargă și offline (atunci, în precache, cu bucata lui în totalul aplicației);
- tutorialul ajunge pe live (decizia de mai sus): butonul și pe instanța live, pașii și în engleză, bucata în precache și în
  totalul aplicației (sau un plafon al ei, decis atunci), poza și raportul doar unde au sens pentru utilizatori.
