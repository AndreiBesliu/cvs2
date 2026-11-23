# ADR 0290: Fereastra „Exportă G-code”: lista și fișa, cu desenul fiecărei setări

**Starea:** propus pe 23.11.2026, la cererea owner-ului, cu schița și patru întrebări. Codul pornește doar după răspunsuri.
Primul număr al intervalului 0290–0299, al liniei exportului (ramura `wip/28.8-export`, canalul `export` al instanței de
test). Schița, cu fereastra propusă de încercat, capturile de azi și formularul întrebărilor:
<https://claude.ai/artifact/FX4y5HfSixLXthAcnrzUQP>.

**Cererea owner-ului**, exactă, după ce a încercat incrustația în trepte (12.1↑e-4), cu două capturi ale ferestrei: „in
primul rand, nu imi place deloc fereastra asta, nici nu este clar ce anume imi ceri sa fac, vreau sa facem un design pentru
fereastra export, si vreau ca ficare setare sa fie insotita de o ilustratie sugestiva, ca sa ajute userul sa inteleaga ce
reprezinta”.

**Intră în:** etapa 28 („Cele două interfețe, ghidul de pornire”), adusă în etapa 3, fără mașină (feliile 28.8↑a–f).
**Completează:** ADR 0250 (aranjamentele; fereastra exportului din fiecare, pe canvas). **Nu schimbă** ce face fereastra:
aceleași câmpuri, aceleași valori, același program, octet cu octet. Câmpurile vin din ADR 0025–0037 (profilul), 0069, 0076,
0093, 0094 (buzunarul), 0087 (găurirea), 0090–0092 (V-carve, fundul plat, gravarea), 0133 (ordinea de mână), 0170–0177
(incrustațiile, gaura, treptele, supracursa), 0210–0211 (foile, urechile). **Documentul:** neschimbat.

## Ce e azi (măsurat pe 23.11, pe `main` `d6fd5d68`)

Fereastra e `src/ui/DialogExport.tsx` (1 918 rânduri), legată în `src/ui/ExportConectat.tsx`, adusă la cerere: 18,9 kB gzip.
Capturile sunt făcute în Edge, pe `dist/` servit de `vite preview`, la 1280 × 800 și 1024 × 768, în română și în engleză:
exteriorul cu urechi și rampă, buzunarul cu o freză de rest, V-carve, incrustația în V, incrustația cu pereți drepți (și cu
treapta), găurirea, două foi cu „Toate foile”. Sunt în schiță.

1. **Tabelul iese din fereastră.** Cutia are cel mult 56 rem (894 px de conținut, și la 1280, și la 1024), iar tabelul are 1 270
   px (1 414 la V-carve, cu unghiul și vârful în celula frezei; în engleză 1 206 și 1 350). Coloanele Urechi, Rampă, Intrări,
   Colțuri și Despărțire se văd doar derulând în lateral. După un clic pe un câmp din dreapta, fereastra se derulează singură,
   iar numele formelor ies din vedere.
2. **Listele se taie:** „incrustație cu pe…”, „fața de sus a ma…” (Z0), „inele (paralele c…”, „Plonjare (fără ra…”.
3. **Explicațiile nu se văd.** 61 de texte `export.*.titlu` explică un câmp, dar doar în atributul `title`: apar cât ții mausul
   pe câmp, iar pe ecranul tactil niciodată.
4. **Câmpurile apar fără să spună de ce.** Din 88 de câmpuri (fără cele trei note `banda-minima`, `banda-placa-minima`,
   `rampe-zigzag`), 19 sunt mereu la vedere, iar 69 apar doar după o alegere sau o condiție. Apar la capătul rândului de sub
   operație, un șir care se rupe unde apucă: umărul abia la „Treapta: spre interior”, jocul de sub tijă la „Se sprijină: pe
   umăr”, coborârea doar la „Traseul: inele”, banda la „Lemnul din jurul dopului: banda îngustă”.
5. **Greșeala se spune departe de cauză.** Incrustația în V pornește cu freza plată, iar „V-carve-ul cere o freză în V” apare sub
   tabel, lângă butoane, cu Exportă oprit; alegerea frezei e în capul rândului. Toate motivele (`motiv.*`) vin pe același loc.
6. **Forma se numește după geometrie:** „cerc R15.00 cu centrul la X 70.00, Y 50.00”, pe 6–8 rânduri, cu punctul zecimal în
   română.
7. **Ce nu e o setare arată ca una:** regimul („Axul la 18 000 rot/min…”) stă între câmpuri, iar bifa „și tăieturile cât foaia”
   e oprită cât supracursa e 0, fără să spună asta.
8. **Rezultatul vine sub butoane:** fișierele, dopurile, avertismentele, rezumatul și simularea apar după export, iar fereastra
   crește în jos.

## Inventarul: setările, după întrebarea la care răspund

„Mereu” = pe orice rând de operație (cu ≥ 2 foi, și „Ce exporți”). „Titlu” = explicația de azi e doar în `title`. Desenul:
**poză** = poza unei alegeri, pe cartonașul ei, desenată de mână; **desen** = desenul întrebării, generat din valorile omului,
cu cota câmpului activ aprinsă. Numele din prima coloană sunt `data-camp` (sau alt `data-*` unde e scris).

**Ce exporți și unde e piesa pe mașină** (o dată pentru toată foaia)

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| Foaia activă / Toate foile (`data-foi`) | cu ≥ 2 foi | nota, la vedere | poză: o foaie / mai multe foi, o arhivă |
| `origine` (colțul XY0) | mereu | nimic | desen: foaia văzută oblic, cu cele patru colțuri apăsabile și axele X, Y din colțul ales |
| `z0` (fața de sus / masa) | mereu | nimic | poză pentru fiecare (secțiunea, Z0 marcat) |
| `supracursa` | mereu | titlu, lung | desen: secțiunea foii pe masă, tăietura care intră în masă, cota supracursei |
| `supracursa-prin-foaie` | mereu, oprită cu supracursa 0 | titlu | același desen: a doua tăietură („18 scris”) trece sau nu; motivul opririi, scris |

**Mașina și fișierul**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `post` (controlerul) | mereu | titlu, plus notele postului la vedere | fără; lista împărțită: „le pornești din cvs2” / „doar se descarcă” |
| `unitati` | mereu | nimic | poză: mm / in |
| `strategie` (schimbarea frezei) | cu mai multe freze | titlu | poză pentru fiecare din cele patru (oprire în cvs2, M6, M0 cu comentariu, câte un fișier) |
| `setari-masina` ($$) | mereu, strâns | nota, la vedere | fără |
| regimul (ax, avans, Z sigur) | mereu, text fix | — | fără; scris ca fapte, nu ca setare |

**Ordinea tăierii**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| Automată / A mea (`data-ordine`) | mereu | nota, la vedere | în listă: numerele, mânerul, săgețile, „cu N” la V-carve-urile legate |
| `confirma-ordine` | la un exterior înaintea interiorului lui | textul, la vedere | fără |

**Ce tăiere** (pe operație)

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `latura` (exterior, interior, pe linie, stânga, dreapta, buzunar, V-carve, găurire, incrustație în V, cu pereți drepți) | mereu; ce nu se potrivește, oprit | titlu, doar pe căile deschise | poză pentru fiecare (10), cu motivul sub cele oprite („doar pe cercuri”) |
| `sens` (urcare / opoziție) | profil; oprit pe linie | titlu | poză pentru fiecare; desen: de sus, drumul în jurul piesei sau al găurii, cu axul M3 și partea piesei |
| `directie` (ca desenul / invers / cel mai scurt) | pe linie | titlu | poză pentru fiecare |
| `despartire` | pe căi deschise | titlu | poză: foaia despărțită, tăiată la urmă |

**Freza**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `scula` (T), `diametru` | mereu | titlul coloanei | desen: profilul frezei, cu T și cota Ø |
| `forma-scula` (plată / în V) | mereu | nimic | poză pentru fiecare |
| `unghi-v`, `varf-v` | freza în V | titlu | același desen: cota unghiului, cota vârfului |
| frezele de rest (`rest-*`, `fund-rest-*`, `dop-rest-*`: T, Ø, pasul, Adaugă, Scoate) | buzunar; fundul plat; freza dopului | titlu | poză: colțul în care freza mare nu ajunge, cu cea mică |

**Cât de adânc**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `adancime` | mereu (la gaura incrustației, oprită: grosimea foii) | nimic | desen: secțiunea tăieturii prin foaie, cu trecerile, masa și cota adâncimii |
| `pas` | mereu | nimic | același desen: n = ⌈adâncime / pas⌉ treceri egale de adâncime / n (`adancimiTreceri`), scris sub el |

**Cum intră freza**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `rampa`, `rampa-lungime` | profil închis | titlu | desen: din lateral, bucla desfășurată, rampa și tura de după ea; cota lungimii |
| `intrari`, `intrari-raza` | profil închis, nu pe linie | titlu | desen: de sus, sferturile de cerc prin deșeu; cota razei |
| `coborare` (plonjare, rampă, zigzag, elice) | buzunar pe inele | titlu | poză pentru fiecare; desen: din lateral, cu cota unghiului |
| `unghi-coborare`, `lungime-zigzag`, `raza-elice`, `rampe-zigzag` | după coborâre | titlu | același desen; la zigzag, numărul rampelor din `coborare.ts` |
| `retragere` | găurire | titlu | desen: ciocănirea, pașii, ridicarea de 1 mm, ieșirea la al N-lea |

**Cum golește** (buzunarul)

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `strategie` (inele / linii paralele) | buzunar | titlu | poză pentru fiecare |
| `pas-lateral`, `unghi-paralel` | buzunar; unghiul la linii | titlu | desen: de sus, trei treceri cu cercurile frezei, suprapunerea scrisă |

**Colțurile**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `colturi` (rotunde / dog-bone / T-bone) | profil închis, nu pe linie | titlu | poză pentru fiecare: colțul găurii, cu cepul punctat |

**Ce ține piesa prinsă**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `urechi` | profil închis | titlu | desen: de sus, bucla cu urechile la locurile lor; alături, secțiunea de-a lungul tăieturii |
| `urechi-numar`, `urechi-latime`, `urechi-grosime` | cu urechi (numărul, doar la distanțe egale) | titlu (nu la număr și grosime) | același desen: cotele |
| `urechi-egale` / `urechi-alese` / `urechi-lemn`, „Alege pe desen…” | cu urechi | titlu, doar la „unde ține” | poză pentru fiecare |
| „Pune urechile unde țin” | după export, cu piese desprinse | titlu | fără |

**V-carve și incrustația în V**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `fund-plat`, `fund-scula`, `fund-diametru`, `fund-pas` | V-carve | titlu, plus nota V-carve la vedere | desen: secțiunea în V, unde ajunge V-ul și fundul plat al frezei drepte |
| `inc-joc`, `inc-acelasi`, `inc-fierastrau` | incrustație în V | titlu | desen: secțiunea locașului și a dopului, cotele g și s |
| `inc-margine` | incrustație în V | titlu | desen: semifabricatul de sus, cota marginii |
| `inc-jur` (fața coborâtă / banda) | incrustație în V | titlu | poză pentru fiecare |
| `banda-latime`, `banda-decupare`, `banda-placa`, `banda-punti-*`, `banda-freza`, `banda-scula`, `banda-diametru` | banda; restul, cu decuparea | titlu, plus minimele la vedere | desen: secțiunea benzii, cotele; punțile ca urechile |

**Incrustația cu pereți drepți**

| Setarea | Când apare | Explicația azi | Desenul propus |
| --- | --- | --- | --- |
| `inc-lateral` (jocul lateral) | mereu în ea | titlu | același desen ca treapta, cu jocul mărit |
| `inc-locas` (buzunar / gaură prin foaie) | mereu în ea | titlu | poză pentru fiecare |
| `inc-treapta` (fără / spre interior / spre exterior) | mereu în ea | titlu, lung | poză pentru fiecare, cu „desenul” marcat (sus sau la deschidere); desen: secțiunea locașului și a dopului |
| `inc-treapta-adancime`, `inc-treapta-latime` | cu treaptă | titlu | același desen: cotele umărului |
| `inc-dop` (ridicat / decupat) | mereu în ea | titlu | poză pentru fiecare |
| `inc-sprijin` (pe umăr / pe fund / pe față) | după treaptă și locaș | titlu | poză pentru fiecare, cu locul sprijinului marcat |
| `inc-joc`, `inc-fierastrau`, `inc-margine` | după sprijin | titlu | cotele desenului secțiunii |
| `dop-punti-*`, `inc-freza-dop`, `dop-scula`, `dop-diametru`, `dop-pas` | dop decupat; altă freză | titlu | punțile ca urechile; freza ca la „Freza” |

**La export**

| Ce | Când apare | Azi | Propus |
| --- | --- | --- | --- |
| `confirma-iesire`, `confirma-placute` | ieșirea din foaie, plăcuțele | sub tabel | lângă butoane, cu „du-mă acolo” |
| Exportă / Trimite la mașină, Închide, Raportul foilor…, Deschide în Mașina | mereu | jos | jos, lipite de margine, cu sumarul alături |
| fișierele, dopurile, avertismentele, rezumatul, simularea | după export | sub butoane | „Rezultatul”, în listă, după operații |

## Direcțiile

- **B (recomandată): lista și fișa.** În stânga: „Foaia și originea”, „Mașina și fișierul”, apoi operațiile în ordinea tăierii
  (cu Automată / A mea, mânerul și săgețile), fiecare cu poza tăieturii, numele piesei, freza, adâncimea și un punct roșu la o
  greșeală. În dreapta: fișa celei alese, pe întrebări (ce tăiere, freza, cât de adânc, sensul, cum intră freza, colțurile,
  ce ține piesa, dopul), fiecare cu desenul ei în stânga și câmpurile în dreapta. Alegerile sunt cartonașe cu poză (nu se mai
  taie); ce depinde de o alegere apare sub ea, într-o cutie care spune „Pentru «spre interior»:”. Greșeala stă sub câmpul ei,
  iar jos, lângă Exportă, „De corectat: Placa · Adâncimea” duce la el. Fereastra are 70 rem (1 120 px), deci la 1280 lista
  are 272 px și fișa ~830; la 1024, 244 și ~700. Nimic nu iese din fereastră. Se potrivește cu schița Clasicului de pe
  canvas (lista în stânga, panoul în dreapta).
- **A: tabelul, cu panoul explicațiilor.** Tabelul rămâne, cu 6 coloane în loc de 12; restul trece sub rând; un panou în
  dreapta arată desenul și textul câmpului activ. Cel mai mic pas (selectorii e2e rămân aproape toți), dar desenul stă departe
  de câmp, iar rândul de sub operație rămâne un șir lung. 3–4 felii.
- **C: pașii.** Foaia → Operațiile, una câte una → Mașina → Verifică și exportă. Blând pentru prima dată, lent la exporturile
  de zi cu zi și dublează pasul 5 al lui Pas cu pas. Recomandat doar în aranjamentul Pas cu pas, cu aceleași fișe ca B.

## Desenele

Două feluri, în același stil: linii de culoarea textului (`currentColor`), lemnul bej, masa gri, traseul în verdele traseului de
pe pânză, cota câmpului activ în culoarea de accent. Se desenează prin tokenuri, deci merg în ambele teme fără a doua desenare.

- **Pozele alegerilor** (pe cartonașe, 64 × 44): desenate de mână, fixe. Sunt 50 în schiță; inventarul cere ~57 (lipsesc
  direcția pe linie, despărțirea, frezele de rest și lemnul din jurul dopului).
- **Desenele întrebărilor** (260 × 150, lângă câmpuri): generate din valorile omului, cu valorile pe cote; cota câmpului pe care
  stai (clic, Tab, maus; pe ecranul tactil, atingerea) se aprinde, iar sub desen apare explicația câmpului (textele `….titlu`
  de azi, aduse la vedere). 11 în schiță: freza, adâncimea și trecerile, sensul, rampa, intrările, urechile, pasul lateral,
  coborârea, treapta, colțul XY0, Z0 cu supracursa. Mai rămân 4: fundul plat al V-carve-ului, incrustația în V, banda,
  ciocănirea găuririi. Formulele din desene sunt cele din cod (trecerile egale din `adancimiTreceri`, rampele zigzagului din
  `src/cam/coborare.ts`), și o probă le compară.

**Costul, măsurat** pe desenele din schiță (terser, apoi gzip -9; în TSX ies de același ordin, iar fiecare felie le măsoară din
nou): cele 11 desene, cu ajutoarele lor (cote, săgeți), 5,5 kB; cele 50 de poze, 1,8 kB ca JavaScript sau 1,9 kB ca fișier SVG
de date. Totalul e azi 770,0 / 800 kB, deci 30 kB pentru toate liniile; pornirea (108,5 / 115) nu se schimbă, fiindcă fereastra
vine la cerere.

## Întrebările (doar ce se exclude), cu recomandarea întâi

1. **Așezarea.**
   - **a (recomandat):** B, lista și fișa.
   - **b:** A, tabelul cu panoul explicațiilor.
   - **c:** C, pașii, în toate aranjamentele.
2. **Desenele.**
   - **a (recomandat):** pozele desenate de mână și desenele întrebărilor generate din valori, totul în bucata ferestrei,
     adusă la cerere: ≈ +7,5 kB pe total.
   - **b:** la fel, dar pozele într-un fișier de date în precache (ca dicționarul codurilor, ADR 0085): ≈ +5,7 kB JS și 1,9 kB
     date, cu încă un încărcător și un plafon, pentru 1,8 kB.
   - **c:** doar desene fixe, fără valorile omului: ≈ +3,5 kB (estimat).
3. **Explicația scrisă.**
   - **a (recomandat):** sub desenul întrebării, textul câmpului activ; plus o propoziție scurtă, mereu la vedere, sub câmpurile
     care o cer (unitatea, limita, ce urmează din valoare: „3 treceri de 3,33 mm”).
   - **b:** tot textul fiecărui câmp, mereu la vedere, sub el (fișa devine de ~2 ori mai lungă).
4. **Aranjamentele.**
   - **a (recomandat):** aceeași fereastră în Insule și în Clasic (în Clasic, lista mai densă, cu coloanele de pe canvas:
     Operația, Freza, Adâncimea, Pasul, Timpul), în Atelier cu densitatea mare, iar fișa operației e panoul pasului 2 (Tăierile)
     al lui Pas cu pas. Întâi o tablă pe canvas („Exportul G-code, în cele patru”), apoi codul (regula din ADR 0250).
   - **b:** acum doar Insule; celelalte aranjamente își fac fereastra în feliile lor (28.2↑, 28.4↑).

## Cu canvas-ul aranjamentelor

Harta schițelor are, la „Exportul G-code”: Insule = „fereastra de azi”, Clasic = „B · Fereastra exportului”, Atelier = „C ·
Trimite la mașină”, Pas cu pas = „D · Pasul 5”. Propunerea:

- **schimbă** ce scrie harta la Insule (fereastra de azi devine lista și fișa);
- la **Clasic** păstrează lista cu coloanele de pe canvas și pune fișa operației în locul panoului din dreapta; Coborârea trece din
  filă în fișa buzunarului (e a fiecărei operații), Simularea rămâne filă. **Nu aduce** ce desenează canvas-ul și nu există azi:
  Z sigur editabil și începutul G-code-ului la vedere (ar fi felii ale lor);
- la **Atelier** nu atinge „Trimite la mașină”: lista de dinainte de pornire rămâne a ferestrei Mașina (ADR 0250 §8);
- la **Pas cu pas**, fișa operației e panoul pasului 2, iar pasul 5 ia „Foaia și originea” și „Mașina și fișierul”.

## Probele (pentru felii)

- **Nimic nu iese din fereastră:** `scrollWidth ≤ clientWidth` pe fereastră și pe fișă, la 1280, 1024 și 390 px, cu fontul lat
  (Verdana aici, DejaVu Sans pe Linux), în română și în engleză; niciun cartonaș cu textul tăiat.
- **Niciun câmp pierdut:** o probă unitară ține lista din inventar (fiecare `data-camp` cu condiția lui), iar una e2e o parcurge:
  după alegerea din coloana „Când apare”, câmpul e la vedere, cu desenul sau poza lui și cu explicația lui.
- **Fiecare câmp are explicația lui la vedere:** o probă cere, pentru fiecare câmp din inventar, textul (cheia `….titlu`, în
  ambele limbi) și desenul sau poza (o hartă câmp → desen, ca `TASTA_UNELTEI`).
- **Desenele spun adevărul:** numărul și adâncimea trecerilor din desen = `adancimiTreceri`; rampele zigzagului = formula din
  `coborare.ts`; colțul XY0 și Z0 din desen = cele trimise exportului.
- **Același program:** exporturile probelor de azi dau aceiași octeți (corpusul CAM, plăcile); fereastra nu atinge calculul.
- **Greșeala lângă cauză:** fiecare `motiv.*` al exportului are câmpul lui; punctul roșu din listă și „De corectat” duc la el.
- **Selectorii:** 15 fișiere e2e citesc fereastra (`tr[data-operatie]`, `tr[data-detalii]`, `[data-camp]`); `data-operatie` și
  `data-camp` rămân, pe elementele noi, iar `tr[data-detalii]` dispare (câmpurile stau în fișă). Probele se mută odată cu
  felia care le mută câmpurile.
- **Manualul:** capitolul „Exportul G-code” (`%% acopera: export.gcode`) se rescrie, în ambele limbi, pe noua așezare.

## Feliile (cu recomandările)

| Felia | Ce aduce | Mărimea |
| --- | --- | --- |
| 28.8↑a | Carcasa: lista, fișa, jos sumarul și butoanele; greșelile lângă câmp și punctul roșu; cartonașele cu poze; probele e2e mutate | ≈ +2,5 kB |
| 28.8↑b | Fișa profilului: tăietura, freza, adâncimea și trecerile, sensul, rampa, intrările, colțurile, urechile, despărțirea | ≈ +2,5 kB |
| 28.8↑c | Buzunarul (traseul, pasul lateral, coborârea, frezele de rest) și găurirea | ≈ +1,5 kB |
| 28.8↑d | V-carve, fundul plat, incrustația în V și banda dopului | ≈ +1 kB |
| 28.8↑e | Incrustația cu pereți drepți: locașul, treapta, dopul, sprijinul, jocurile, punțile | ≈ +1 kB |
| 28.8↑f | Rezultatul în fereastră, manualul, Atelier și Clasic, privirea pe fereastra reală cu fontul lat | ≈ +0,5 kB |

Fiecare felie are proba scrisă înainte, e2e, otrăvurile, documentele și canalul `export`. Înaintea lui 28.8↑a, tabla de pe canvas.
