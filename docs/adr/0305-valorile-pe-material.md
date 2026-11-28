# ADR 0305: Valorile frezei pe material și calculatorul avansului

**Starea:** propus pe 28.11.2026, în sesiunea cloud a liniei frezelor (ramura `wip/16.A-freze-g`, din vârful lui 16.A↑f-5), la
cuvântul owner-ului transmis de sesiunea principală pe 28.11: „Porneste sesiunile, pune-le sa continue cu ce aveau la rand”,
cu „Apoi g (valorile pe material), tot cu recomandările acolo unde sunt întrebări”. Întrebările de la capăt merg la owner
grupat; linia merge mai departe cu recomandările, ca la ADR 0303 și 0304. **Completează:** ADR 0300 §1 („mai târziu și seturi
pe material (§11, felia g)”), §2 (numărul de tăișuri, „calculatorul avansului”, felia g) și §11 (felia 16.A↑g); ADR 0210 §1
(materialul foii: „Biblioteca de materiale (esența, avansurile) vine mai târziu, cu câmpul ei”).

## Ce e azi

- Fiecare freză din „Frezele mele” are un singur set de valori de lucru: turația, avansul, plonjarea, pasul pe trecere și
  pasul lateral (în procente din diametru). Numărul de tăișuri (`taisuri`) e ținut, dar nefolosit.
- Foaia are o etichetă liberă de material („MDF alb 18”), pentru lista de tăiere și numele fișierelor; nu schimbă tăierea
  și nu e în schemă (`materialFoaie`, ADR 0210, felia 11.1↑).
- Când omul alege o freză din bibliotecă (Tăierea, rândurile exportului, frezele în plus ale rândului), copia din proiect
  primește valorile ei (`regim`, documentul v27) și pașii; nota „s-a schimbat în bibliotecă” (16.A↑b-4) compară copia cu
  freza din bibliotecă.
- Același lemn nu se taie cu aceleași valori ca acrilul sau ca aluminiul; azi omul ține câte o freză pe material („Plată Ø6
  MDF”, „Plată Ø6 acril”), cu același diametru și același T, deci rândul T le vede ca două freze diferite.

## Ce fac alții (referință funcțională)

- Vectric (VCarve, Aspire, de la 10): baza de scule are o listă de materiale, iar fiecare sculă are valori pe material;
  materialul jobului alege setul.
- Fusion 360 și Carbide Create: presetări pe sculă, pe material; calculatorul din Fusion pornește de la viteza de așchiere
  (Vc, m/min) și avansul pe dinte (fz, mm).
- Formula e aceeași peste tot: turația n = Vc · 1000 / (π · D), avansul F = n · z · fz (z, tăișurile).

## Decizia (propusă)

### 1. Seturile pe material stau în freză

- Câmpul nou `materiale` pe freza din bibliotecă: o listă de cel mult 20 de seturi, fiecare cu numele materialului (≤ 40 de
  caractere, unic în freză fără majuscule și fără diacritice) și cele cinci valori de lucru (turația, avansul, plonjarea,
  pasul, pasul lateral), cu marginile valorilor de azi.
- Valorile de azi rămân setul implicit („Orice material”), folosit când foaia n-are material sau niciun set nu se potrivește.
- Biblioteca în cont nu se schimbă: freza stă ca text JSON, îmbinată pe câmpuri (16.A↑c), deci `materiale` e un câmp ca
  oricare altul (o schimbare pe ambele calculatoare a listei întreabă o dată, pentru toată lista). Un client vechi ține
  câmpul neatins.
- Fișierul JSON îl poartă dus-întors. CSV-ul poartă doar setul implicit (o freză e un rând); un import CSV peste o freză cu
  seturi le păstrează pe ale ei.

### 2. Potrivirea cu eticheta foii

- Un set se potrivește cu eticheta foii când toate cuvintele lui sunt printre cuvintele etichetei, fără majuscule și fără
  diacritice: „MDF” se potrivește cu „MDF alb 18” și cu „mdf 16”, „Lemn tare” cu „lemn tare stejar”, dar nu cu „lemn moale”.
- Dintre seturile care se potrivesc, câștigă cel cu cele mai multe cuvinte („MDF alb” înaintea lui „MDF”); la egalitate,
  primul din listă.
- Pur, în model (`setPentru(freza, eticheta)`, `valoriPeMaterial`), cu probele pe hârtie.

### 3. Alegerea în proiect

- Unde se alege o freză din bibliotecă (Tăierea, rândurile exportului, frezele în plus ale rândului, „Ia valorile noi”),
  copia primește valorile setului potrivit materialului foii active (altfel, implicitul); documentul nu se schimbă (copia ține
  deja valorile, `regim`, v27), deci **fără schemă nouă**.
- Rândul și Tăierea spun ce set s-a folosit („valorile pentru „MDF””), ca omul să vadă de ce turația nu e cea din fișă.
- Nota „s-a schimbat în bibliotecă” compară copia cu setul foii active; un material schimbat pe foaie după alegere arată
  aceeași notă, cu „Ia valorile noi”, nu schimbă copia singur (ADR 0300 §4a: un proiect nu se schimbă singur).
- O piesă pusă pe două foi cu materiale diferite are o singură copie (operațiile sunt ale piesei): valorile sunt ale foii
  active la alegere; cu „Toate foile”, rândurile celeilalte foi arată nota. Limita e spusă în fișă.

### 4. Calculatorul avansului

- În editorul frezei, lângă valorile de lucru (implicitul și fiecare set), un calculator la cerere: avansul pe dinte (fz,
  mm) și, la alegere, viteza de așchiere (Vc, m/min). Cu Vc, scrie turația (rotunjită la 10 rot/min); cu tăișurile frezei,
  scrie avansul (rotunjit la 1 mm/min); plonjarea rămâne a omului.
- Calculatorul doar scrie în câmpuri: nu ține fz și Vc (o freză are doar valorile de lucru, ca azi).
- Fără tăișuri sau cu un rezultat în afara marginilor, calculatorul spune motivul, fără să scrie.

### 5. Feliile

| Felia | Ce aduce | Se încearcă |
|---|---|---|
| 16.A↑g-1 | Modelul (`materiale`, judecata, potrivirea, JSON, CSV-ul care le păstrează), editorul seturilor în „Frezele mele”, fișa | canalul `freze` |
| 16.A↑g-2 | Alegerea în proiect: Tăierea, rândurile exportului, frezele în plus, nota bibliotecii, cu setul foii active | canalul `freze` |
| 16.A↑g-3 | Calculatorul avansului în editor | canalul `freze` |

### 6. Mărimea

Fără nimic în pornire (fereastra și modelul sunt la cerere); totalul, ~+3 kB pe toate trei.

## Probele

- **Pe hârtie:** marginile setului (cele ale valorilor de azi), numele (gol, lung, dublat fără majuscule și diacritice),
  potrivirea (cuvintele, cel mai lung, ordinea, fără potrivire), calculatorul (n și F pe exemple scrise de mână).
- **Programul:** fără `materiale`, aceiași octeți (corpusul CAM, plăcile); cu un set ales, turația și avansurile scrise, pe
  hârtie.
- **E2e (Edge):** editorul (set nou, valori, ștergere, reîncărcare), alegerea pe o foaie cu material și fără, nota la
  schimbarea materialului, calculatorul; 1280 px cu fontul lat și telefonul (390, 360, 320 px), în ambele limbi.
- **Otrăvurile** fiecărei felii, în clonă (`test/otravuri/16.A-g*.py`).

## Ce am respins

- **O bibliotecă de materiale separată** (o listă a aplicației, aleasă pe foaie): ar cere eticheta foii în schemă și o
  fereastră nouă; eticheta liberă de azi, potrivită pe cuvinte, ajunge pentru seturi.
- **Valorile pe material în proiect** (copia ține toate seturile): proiectul ar duce valorile tuturor materialelor; ține
  doar ce taie.
- **Calculatorul care ține fz și Vc în freză:** două câmpuri în plus pe fiecare set, iar o turație scrisă de mână ar
  contrazice fz; pot veni mai târziu, cu cererea omului.
- **Seturi de pornire pe materiale** (MDF, placaj, acril) în frezele standard și în catalog: valorile depind de mașină;
  ar fi numere ale noastre luate drept adevăr.

## Întrebările pentru owner (doar ce se exclude), cu recomandarea în față

1. **Unde stau valorile pe material:**
   - **a (recomandat):** în fiecare freză, ca seturi după numele materialului, potrivite cu eticheta foii;
   - b: o bibliotecă de materiale a aplicației, aleasă pe foaie (eticheta intră în schemă), iar freza ține valori pe materialul
     ales.
2. **Cum se potrivește un set cu eticheta foii:**
   - **a (recomandat):** toate cuvintele setului sunt în etichetă, fără majuscule și diacritice; cel mai lung câștigă;
   - b: eticheta întreagă, egală (după aceeași normalizare);
   - c: omul alege setul pe foaie, din listă.
3. **Ce face calculatorul:**
   - **a (recomandat):** scrie turația și avansul în câmpuri, fără să țină fz și Vc;
   - b: ține fz (și Vc) în fiecare set, iar avansul urmează turația.
4. **CSV-ul:**
   - **a (recomandat):** doar setul implicit; seturile merg în JSON și rămân la un import CSV;
   - b: un rând în plus pe set (coloana `material`), după rândul frezei.
