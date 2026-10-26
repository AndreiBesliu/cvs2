# ADR 0084: Joburile cu mai multe freze din document

**Starea:** acceptat pe 26.10.2026. Felia 3.8b, la cererea owner-ului („Da, pornește 3.8b: joburile cu mai multe freze din
document (freza pe operație, jobul CAM, simularea și estimarea peste schimbări, fișierele separate), ca să pot încerca
schimbarea sculei pe mașina simulată.”). **Continuă:** ADR 0083 (postul: evenimentul `schimba-scula`, strategiile, blocul de
după), ADR 0047 (simularea), ADR 0046 (estimarea și rezumatul), ADR 0081 / 0082 (panoul mașinii). **Schimbă:** ADR 0025 §3
(„dialogul are o singură freză până la schimbarea sculei”) și precizarea ei 3 („Exportă aduce toate operațiile la freza
arătată”). **Documentul:** neschimbat (scula era deja pe fiecare operație, `scula: { numar, nume, diametru }`).

**Problema.** Postul știa schimbarea sculei (3.8a), dar nimic nu i-o dădea: jobul refuza o foaie cu freze diferite, dialogul
avea o singură freză, iar simularea și estimarea refuzau un program cu schimbări.

## Decizia

**1. Fiecare rând al ferestrei exportului are freza lui:** numărul sculei (T, întreg între 1 și plafon) și diametrul frezei
plate, scrise în operație la Exportă (ca restul valorilor). Același număr cu două diametre oprește exportul, cu motivul („T1
are două diametre (6, 8 mm): fiecare freză cere numărul ei”): omul de la mașină ar monta o singură freză sub același T. Un
proiect vechi cu freze amestecate nu mai e adus la o singură freză: dialogul arată frezele lui, așa cum sunt.

**2. Jobul CAM socotește fiecare tăietură cu diametrul sculei ei** (profilul, regiunea păstrată, urechile, intrările,
degajările, buzunarul, ieșirea din foaie). Între două tăieturi cu scule diferite, programul are `schimba-scula`, cu turația
regimului. **Ordinea programului** e cea a contractului (`taieturiFoaie`: interioarele, pe linie, exterioarele, despărțirile),
cu fiecare clasă grupată pe sculă (`grupeazaPeScula`): întâi scula montată la capătul clasei de dinainte, apoi celelalte în
ordinea în care apar. Clasele nu se amestecă (o gaură nu se taie după ce piesa e eliberată), deci aceeași freză poate reveni
(T2, T1, T2). Lista tăieturilor documentului (contractul judecat de oracolul documentului) rămâne neschimbată: gruparea e a
programului.

**3. Simularea taie peste schimbări:** fiecare schimbare începe un grup cu scula ei (`apoi`, după primul grup `scula` +
`mutari`), tăiat pe același câmp, unul după altul, în bazin și în workere. Un program cu o singură sculă rămâne exact ca
înainte (aceeași amprentă).

**4. Estimarea cu opririle senderului** (`opriri`): liniile cu `M0`, `M1` sau `M6` nu pleacă la controler (ADR 0080, regula 6),
deci golesc planificatorul, se numără și nu intră în timp (timpul omului). Fără opțiune, estimarea rămâne a programului trimis
întreg la GRBL 1.1h, care le refuză (oracolul timpului o judecă așa). **Rezumatul pe scule:** fiecare secțiune a postului merge
la scula montată atunci (postul pune o secțiune, cu scula, chiar după linia de schimbare: blocul de după e al noii freze); sub
timp, „plus N opriri pentru schimbarea frezei”.

**5. Strategia se alege în fereastră** („Schimbarea frezei”), doar când rândurile au freze diferite, dintre cele acceptate de
postul ales (implicit, oprirea în senderul aplicației). **Câte un fișier pe freză:** fiecare se descarcă, cu ordinea și freza
în nume (`cncvs2-stanga-jos-1-T2.nc`, `-2-T1.nc`, …), iar rezumatul le adună. Panoul mașinii are lista lor („Fișierul ultimului
export”) și încarcă fișierul ales.

**6. La oprire, panoul spune ce freză se montează**, din comentariul postului („oprită la linia 34: montează T1 freza plata
D6.000, ridică freza, palpează Z, apoi Continuă”).

## Probele

- jobul: două scule (scula de antet a primei tăieturi, schimbarea cu turația regimului, exteriorul dreptunghiului cu raza 1,5:
  X 18,5 … 121,5); T1 cu două diametre refuzat; gruparea în clasă și scula montată întâi în clasa următoare (a, c, T2, b, e,
  T1, d); doar numele diferit = aceeași sculă;
- simularea: canalele Ø6 și Ø20 pe hârtie (marginile la raza fiecăreia), bazinul pe 1 și 3 benzi = nucleul grup cu grup, fără
  grupul al doilea altă amprentă, o sculă nevalidă după schimbare refuzată;
- estimarea: opririle = programul despărțit de `G4 P0` (pe hârtie), numărate; fără opțiune, refuzate; T-ul liniei de oprire nu
  se citește;
- rezumatul: secțiunea de după `T2 M6` poartă scula 2, pauza fiecărei scule 3 s, suma sculelor = totalul, plonjarea noii freze
  de la Z sigur; placa 2 cu o piesă pe T2: T2, T1, T2 (două opriri, trei fișiere);
- scula de montat din comentariu (M6 și M0), o pauză simplă fără sculă;
- e2e: dialogul (frezele unui proiect salvat, conflictul, strategia, `T2 M6` și `T3 M6`, frezele scrise în document); pe mașina
  simulată, două freze: oprirea cu „montează T1 freza plata D6.000”, palparea, Continuă, gata, fără `T1 M6` trimis; fișierele
  separate: două descărcări în ordine, panoul încarcă al doilea.

## Limitele

- Turația e una pe job (a regimului); o turație pe freză vine cu biblioteca de scule (etapa 8).
- Ordinea e automată (clasele, apoi frezele); reordonarea de mână a operațiilor rămâne în rândul de prag.
- Timpul schimbării (al omului) nu se estimează; doar se numără.
- Totul e probat pe emulator; pe mașină, cu placa 3.

## Respinse

- **Gruparea în lista tăieturilor documentului:** schimbă contractul ordinii (ADR 0025, 0037 §8), judecat de oracolul
  documentului; gruparea e a programului.
- **Toate tăieturile unei freze împreună, peste clase:** o gaură s-ar tăia după ce piesa e eliberată.
- **Fișierele separate cu numele doar după freză:** aceeași freză poate reveni (T2, T1, T2), iar ordinea trebuie să se vadă.
