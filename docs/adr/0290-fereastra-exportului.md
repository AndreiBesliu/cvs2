# ADR 0290: Fereastra „Exportă G-code”: lista și fișa, cu desenul fiecărei setări

**Starea:** propus pe 23.11.2026, la cererea owner-ului, cu schița și patru întrebări; **acceptat în aceeași zi, cu toate
recomandările („1a, 2a, 3a, 4a”;** secțiunea „Răspunsurile owner-ului”). Întâi tabla de pe canvas, apoi feliile 28.8↑a–f.
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

**Precizarea din 23.11, după unirea lui 11.3↑f în `main` (`c8b235ab`):** urechile au încă trei locuri (`urechi-lungi`,
`urechi-scurte`, `urechi-mijloc`, ADR 0211, varianta c), deci fereastra are 91 de câmpuri, 19 mereu la vedere și 72 după o
alegere sau o condiție; pozele cerute de inventar, ~60. Cifrele de mai sus, din „Ce e azi”, sunt cele de pe `d6fd5d68`.

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
| `urechi-egale` / `urechi-alese` / `urechi-lemn` / `urechi-lungi` / `urechi-scurte` / `urechi-mijloc`, „Alege pe desen…” | cu urechi (numărul oprit la alese și la mijloc) | titlu la „unde ține” și pe laturi, plus notele la vedere | poză pentru fiecare (6); desenul urechilor le pune la locurile regulii |
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

- **Pozele alegerilor** (pe cartonașe, 64 × 44): desenate de mână, fixe. Sunt 53 în schiță; inventarul cere ~60 (lipsesc
  direcția pe linie, despărțirea, frezele de rest și lemnul din jurul dopului).
- **Desenele întrebărilor** (260 × 150, lângă câmpuri): generate din valorile omului, cu valorile pe cote; cota câmpului pe care
  stai (clic, Tab, maus; pe ecranul tactil, atingerea) se aprinde, iar sub desen apare explicația câmpului (textele `….titlu`
  de azi, aduse la vedere). 11 în schiță: freza, adâncimea și trecerile, sensul, rampa, intrările, urechile, pasul lateral,
  coborârea, treapta, colțul XY0, Z0 cu supracursa. Mai rămân 4: fundul plat al V-carve-ului, incrustația în V, banda,
  ciocănirea găuririi. Formulele din desene sunt cele din cod (trecerile egale din `adancimiTreceri`, rampele zigzagului din
  `src/cam/coborare.ts`), și o probă le compară.

**Costul, măsurat** pe desenele din schiță (terser, apoi gzip -9; în TSX ies de același ordin, iar fiecare felie le măsoară din
nou): cele 11 desene, cu ajutoarele lor (cote, săgeți), 5,8 kB; cele 53 de poze, 1,9 kB ca JavaScript sau tot 1,9 kB ca fișier SVG
de date. Totalul e 770,0 / 800 kB pe `d6fd5d68` și 770,9 după unirea lui 11.3↑f (`c8b235ab`), deci ~29 kB pentru toate
liniile; pornirea (108,5 / 115) nu se schimbă, fiindcă fereastra
vine la cerere.

## Întrebările (doar ce se exclude), cu recomandarea întâi

1. **Așezarea.**
   - **a (recomandat):** B, lista și fișa.
   - **b:** A, tabelul cu panoul explicațiilor.
   - **c:** C, pașii, în toate aranjamentele.
2. **Desenele.**
   - **a (recomandat):** pozele desenate de mână și desenele întrebărilor generate din valori, totul în bucata ferestrei,
     adusă la cerere: ≈ +8 kB pe total.
   - **b:** la fel, dar pozele într-un fișier de date în precache (ca dicționarul codurilor, ADR 0085): ≈ +6 kB JS și 1,9 kB
     date, cu încă un încărcător și un plafon, pentru 1,9 kB.
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

## Răspunsurile owner-ului

Pe 23.11.2026, exact: „1a, 2a, 3a, 4a”.

1. **a, lista și fișa** (direcția B).
2. **a, pozele desenate de mână și desenele întrebărilor generate din valori,** totul în bucata ferestrei, adusă la cerere.
3. **a, sub desenul întrebării, textul câmpului activ,** plus propoziția scurtă mereu la vedere sub câmpurile care o cer.
4. **a, aceeași fereastră în toate aranjamentele,** cu tabla pe canvas înaintea codului. În cod există azi Insule și Atelier
   (28.1↑c); Clasicul (28.2↑) și Pas cu pas (28.4↑) nu sunt încă scrise, deci fișa operației se face o componentă de sine
   stătătoare, pe care o iau ele când vin, iar felia 28.8↑f le pregătește locul.

**Feliile, precizate la acceptare.** Carcasa nouă nu poate lăsa jumătate din câmpuri în tabelul vechi, deci 28.8↑a mută toate
câmpurile de azi în fișă, grupate pe întrebări, fără desene încă (cu explicația câmpului activ, din textele de azi); desenele și
pozele vin apoi pe familii (b–e). Tabelul de la „Feliile” e cel de după acceptare.

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
| 28.8↑a | Carcasa: lista (foaia și originea, mașina și fișierul, operațiile în ordinea tăierii, cu ordinea de mână), fișa operației cu toate câmpurile de azi grupate pe întrebări, explicația câmpului activ la vedere, greșelile lângă câmp și punctul roșu, jos sumarul și butoanele; probele e2e mutate pe selectorii noi; manualul | ≈ +2,5 kB |
| 28.8↑b | Desenele și pozele foii, ale mașinii și ale profilului: colțul XY0, Z0 și supracursa, tăietura, freza, adâncimea și trecerile, sensul, rampa, intrările, colțurile, urechile, despărțirea | ≈ +3 kB |
| 28.8↑c | Ale buzunarului (traseul, pasul lateral, coborârea, frezele de rest) și ale găuririi | ≈ +1,5 kB |
| 28.8↑d | Ale V-carve-ului, fundului plat, incrustației în V și benzii dopului | ≈ +1 kB |
| 28.8↑e | Ale incrustației cu pereți drepți: locașul, treapta, dopul, sprijinul, jocurile, punțile | ≈ +1 kB |
| 28.8↑f | Rezultatul în fereastră, Atelier (densitatea mare), fișa ca piesă de sine stătătoare pentru Clasic și Pas cu pas, privirea pe fereastra reală cu fontul lat | ≈ +0,5 kB |

Fiecare felie are proba scrisă înainte, e2e, otrăvurile, documentele și canalul `export`. Înaintea lui 28.8↑a, tabla de pe canvas.

## Tabla de pe canvas (23.11)

Pe canvas-ul aranjamentelor (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>), tabla „Exportul G-code” arată fereastra în
cele patru aranjamente, cu harta schițelor schimbată ca la „Cu canvas-ul aranjamentelor”: Insule = lista și fișa.

## Implementarea 28.8↑a (23.11)

- **Toate fișele una sub alta, într-un singur panou derulat**, nu o fișă pe rând: Foaia și originea, Mașina și fișierul,
  operațiile în ordinea tăierii, Rezultatul. Un clic în listă aduce fișa sus; derularea marchează în listă fișa de sus
  (`aria-current`). Așa, un câmp e mereu în pagină (probele și „du-mă acolo” îl găsesc), iar Tab merge prin toată fereastra.
  Sub ultima fișă stă un loc gol, ca și ea să poată veni sus.
- **Grupurile fiecărui fel de operație și grupul fiecărui câmp** stau în `src/ui/exportGrupuri.ts` (pur); proba
  `test/unit/export.grupuri.test.ts` citește câmpurile din sursa ferestrei, deci un câmp nou fără grup cade acolo.
- **Ce nu se aplică nu apare:** pe un buzunar, o găurire, un V-carve sau o cale deschisă, rampa, intrările, colțurile și urechile
  lipsesc, cu nota de azi sub Tăietura; despărțirea apare doar pe o operație cu căi deschise. Valorile lor rămân în rând (doar
  nu se arată), deci programul e același.
- **Explicația** e textul `title` al câmpului din fereastra de azi: la maus sau la focus, ia locul explicației grupului.
- **Greșelile** sunt verificările de azi ale rândului (`randBun`), fiecare în grupul câmpului de reparat; un T cu două freze se
  spune la fiecare loc al operației unde e scris (freza, fundul plat, frezele de rest, dopul, banda). Motivul de sub butoane
  rămâne, cu „Du-mă la …” spre prima fișă greșită.
- **Rezultatul vine sus o singură dată**, când apare: simularea sosește după descărcare și schimbă starea din nou, iar panoul nu
  mai sare sub mausul omului (reprodus cu o probă care debifa „și tăieturile cât foaia” după export).
- Eroarea unui export refuzat stă jos, lângă butoane, nu în Rezultat.
- Mărimea: totalul 770,8 → 773,1 / 800 kB (+2,3), pornirea neschimbată (108,5 / 115).

## Implementarea 28.8↑b-1 (23.11–24.11)

- **Felia 28.8↑b s-a împărțit la pornire** în b-1 (desenele întrebărilor, generate din valori) și b-2 (alegerile ca cartonașe cu
  poze: tăietura, sensul, direcția, colțurile, locurile urechilor, despărțirea, foile, Z0, unitățile, schimbarea, forma frezei).
  Cartonașele schimbă câmpurile din liste în butoane radio, deci mută ~60 de folosiri ale câmpurilor în 21 de spec-uri: au felia lor.
- **Desenele** (`src/ui/exportDesene.tsx`, în bucata ferestrei): colțul XY0, Z0 cu supracursa, freza, adâncimea, sensul, rampa,
  intrările, urechile. Stau deasupra explicației, în stânga grupului (coloana are 11–17 rem); pe ecranul îngust, deasupra
  câmpurilor, cel mult 20 rem. Tokenurile lemnului, ale mesei și ale frezei au ambele teme (`.dx-desen`). Fiecare desen e un
  `role="img"` cu numele lui; un clic pe un colț din desenul XY0 îl alege, iar lista rămâne câmpul pentru tastatură.
- **Ce spun e socotit ca în lucrare** (`src/ui/exportDeseneCalcul.ts`, fără importuri din ea): trecerile egale și locurile
  urechilor, la distanțe egale și după reguli (pe un dreptunghi cu laturile desenului). Proba `export.desene.test.ts` le compară
  cu `adancimiTreceri`, `geometrieUrechi` și `urechiPeLaturi`. Locurile alese și „unde ține” sunt schițate: se știu doar pe
  desen și la export. Sensul: cu M3, la urcare ce rămâne stă în dreapta drumului (exteriorul orar, gaura trigonometric; pe o
  parte, freza merge în sensul desenului când partea ei e stânga și sensul e urcarea, ADR 0037 §8).
- **Cota câmpului activ** (focusul sau mausul) se aprinde; explicația, ca în 28.8↑a.
- **Caseta explicației își ține înălțimea** (`rezervaExplicatii`): cea a celui mai lung text al grupului (al lui și titlurile
  câmpurilor), măsurată pe o copie goală, cu `box-sizing: border-box`. Fără ea, cu desenul, stânga grupului e mai înaltă decât
  câmpurile, iar la clic focusul schimba textul la apăsare: grupul își schimba înălțimea și ce era dedesubt fugea de sub cursor
  înainte de ridicare (bifa Urechi nu se mai bifa, în probă ca pentru om).
- **Mărimea:** bucata ferestrei 21,3 → 26,2 kB gzip, totalul 795,9 → 800,8 / 900 (+4,9 kB), pornirea neschimbată (109,4 / 115).
  E peste cei ~3 kB estimați pentru tot 28.8↑b: desenele în JSX ies mai mari decât aceleași desene ca șiruri în schiță, iar
  textele lor stau în mesaje (date, în afara totalului). Pentru feliile c–e, estimarea se reface din cifra asta (~0,6 kB pe
  desen).

## Implementarea 28.8↑b-2 (24.11)

- **Cartonașele** (`src/ui/exportPoze.tsx`): colțurile, locurile urechilor, direcția pe linie, unitățile, schimbarea frezei și
  foile. Fiecare variantă are poza ei, desenată de mână (64 × 44, aceleași clase ca desenele), numele și o notă scurtă. Un
  cartonaș e un `<label>` cu un input radio transparent peste el: clicul oriunde îl alege, săgețile trec între variante, iar
  probele lucrează pe input (`test/e2e/ajutor-export.ts`: `alege`, `aleasa`). `data-camp` stă pe fiecare input, scris în
  sursă (`<Cartonase data-camp="colturi">`, `<Card data-camp="urechi-lungi">`), ca generatorul catalogului controalelor
  (ADR 0262, unit în `main` pe 24.11) să-l vadă; grupul are `data-alegere`. Așa, clicurile pe cartonașe se înregistrează cu
  aceleași nume ca listele de dinainte, plus cele trei reguli ale urechilor, care lipseau din catalog (erau făcute din
  șablon). Cotele desenelor își iau câmpul din `pentru`, nu din `id` (generatorul le-ar fi luat drept controale). Foile
  rămân butoane (`data-foi`, `aria-pressed`), cu poza și aspectul de cartonaș.
- **O variantă oprită spune de ce,** pe cartonaș („nu pe linie” la „unde ține”); colțurile pe linie sunt toate oprite, cu nota
  de sub ele. Inch lipsește unde postul nu-l scrie, ca înainte.
- **Rămân liste:** tăietura (28.8↑b-3: ~55 de folosiri în 21 de spec-uri), colțul XY0, Z0, sensul și forma frezei (desenul
  întrebării le arată deja, iar colțul se alege și din desen), postul (are opt intrări, pe două familii) și traseul
  buzunarului (în 28.8↑c, cu desenele lui).
- **Tokenurile lemnului, ale mesei și ale frezei** stau pe `.dx-ilu` (desenele și pozele): pe `.dx-desen`, pozele ieșeau negre.
- **Mărimea:** bucata ferestrei 26,2 → 27,5 kB gzip, totalul 800,8 → 802,1 / 900 (+1,3 kB), pornirea neschimbată.

## Implementarea 28.8↑b-3 (24.11)

- **Tăietura e cartonașe** (`<Cartonase data-camp="latura">`), ca alegerile din 28.8↑b-2: exteriorul, interiorul, pe linie
  (stânga și dreapta, pe o cale deschisă, după `laturiOferite`), apoi, pe contururi închise, buzunarul, găurirea, V-carve-ul și
  cele două incrustații. Găurirea stă și pe un rând fără cercuri, oprită, cu „doar pe cercuri” (inventarul: „cu motivul sub
  cele oprite”); pe o cale deschisă, tăieturile contururilor închise nu apar (nota de sub Tăietura spune de ce).
- **În listă,** sub numele operației, poza tăieturii ei (1,6 rem), pe rândul textului. Pe o coloană a ei, numele se rupea pe
  patru rânduri, iar rândurile de ~156 px făceau ca tragerea din ordinea de mână să nu mai pornească în probă. Și așa, rândul
  are ~117 px, iar lista (~480 px văzuți la 1280 × 720) se derulează: în completul de pe `a0613840`, mânerul celui de-al
  doilea rând ieșea, cu fonturile runner-ului, sub marginea listei. Proba aduce acum ținta în vedere, ca omul (`6fc38abf`).
- **Inputul unui cartonaș oprit rămâne ascuns:** regula câmpurilor oprite (`.dialog input:disabled`, 0,55) îl arăta ca un
  cerc peste cartonaș, și pe colțurile de pe linie din 28.8↑b-2.
- **Probele** aleg cartonașul (`input[data-camp="latura"][value="…"]`), iar valoarea se citește pe cel bifat (`:checked`);
  o probă care numără tăieturile posibile le numără pe cele de ales (`:enabled`).
- **Mărimea:** bucata ferestrei +0,7 kB; totalul 808,8 / 900 (cu `main` din 24.11), pornirea neschimbată.
- **28.8↑b e încheiată.** Rămân liste: colțul XY0, Z0, sensul și forma frezei (desenul lor le arată deja), postul și traseul
  buzunarului (28.8↑c). Urmează 28.8↑c: desenele și pozele buzunarului (traseul, pasul lateral, coborârea, frezele de rest) și
  ale găuririi.

## Implementarea 28.8↑c (24.11)

- **Traseul buzunarului și coborârea sunt cartonașe** (`<Cartonase data-camp="strategie">`, `data-camp="coborare"`), cu pozele
  lor (inelele, liniile paralele; plonjarea, rampa, zigzagul, elicea). Traseul vine primul în grup, apoi pasul lateral și
  unghiul. Câmpurile, valorile și programul nu se schimbă.
- **Desenul golirii** (de sus): trei treceri cu urma frezei, lată cât freza, la pasul lateral; urmele vecine se suprapun mai
  închis, iar suprapunerea (D − s, în mm și procente) e scrisă dedesubt. Pe inele, lângă perete, prima la R de el, apoi R + s,
  R + 2s, ca inelele lucrării (`ineleBuzunar`); pe linii paralele, aceleași treceri rotite la unghiul lor față de X, cu arcul
  unghiului. Peste D / 2 (cum judecă fereastra), fără urme.
- **Desenul coborârii** (din lateral, pe o trecere): pe **trecerea egală** a lucrării (adâncimea / n, nu pasul scris): rampa de
  trecere / tan(unghi), zigzagul cu ⌈trecere / (lungime · tan(unghi))⌉ rampe dus-întors, elicea cu turele ei pe cercul de rază
  dată; plonjarea, drept în jos. O valoare refuzată de fereastră (unghiul peste 45°) nu se desenează.
- **Nota „N rampe pe trecere” e acum a lucrării:** se socotea pe pasul scris; cu 10 mm și pasul 6 (două treceri de 5), la 3° și
  20 mm, spunea 6 rampe, iar programul face 5. Acum se socotește pe trecerea egală, ca `intrareZigzag`.
- **Desenul frezelor de rest** (de sus): colțul în care freza lasă raza ei (R) și cea mai mică freză de rest, raza ei; lemnul
  rămas în colț. E schițat din valori, nu o poză fixă: raza din colț e chiar raza frezei.
- **Desenul găuririi:** ciocănirea pas cu pas, ca `traseuGaurire` pe un cerc cât freza: fiecare pas tăiat în jos, ridicarea de
  1 mm, ieșirea la al N-lea pas și coborârea rapidă la 0,5 mm deasupra fundului; textul spune pașii și ieșirea.
- **Probele:** formulele (`treceriLaterale`, `coborareDesen`, `ciocanire`, în `exportDeseneCalcul.ts`) față de lucrare, măsurate
  pe mișcările ei (lungimea în plan a coborârii, rampele, Z-urile ciocănirii) în `export.desene.test.ts`; e2e-ul desenelor și
  al cartonașelor (`export.desene.spec.ts`); `buzunar.spec.ts` și `paralel.spec.ts` aleg din cartonașe.
- **Găsit pe drum:** cota câmpului activ urmează ultimul dintre focus și maus (regula din 28.8↑b-1); cu mausul lăsat pe un
  cartonaș, derularea de la scrierea într-un câmp pune sub el alt câmp, care ia explicația. Pentru om e ce vede sub maus; proba
  dă clic în câmp, ca omul.
- **Mărimea:** totalul 808,8 → 811,4 / 900 (desenele, ~2,6 kB, peste estimarea de ~1,5), pornirea neschimbată (109,4 / 115).
- Urmează 28.8↑d: ale V-carve-ului, fundului plat, incrustației în V și benzii dopului (despărțită în d-1 și d-2).

## Implementarea 28.8↑d-1 (24.11)

- **Desenul fundului** (secțiunea unei trăsături V-carve): pereții tăiați de freza V până la adâncimea maximă D, la D·tan(θ/2)
  de contur (inelul regiunii decalate al lucrării, `traseuVcarve`); între ei, după bifă și felul operației: fundul plat al
  frezei drepte (cu Ø pe cotă și pragul spus: plat de la 2·D·tan(θ/2) lățime), inelele V ale unei incrustații fără freză
  dreaptă (ADR 0173, creasta g / 2), ori lemnul rămas, pe un V-carve fără fund plat (ADR 0090: „fundul plat dintre ei rămâne”).
- **Desenul incrustației în V** (secțiunea): locașul cu fundul la D și dopul întors, coborât până la S = D − g; jocul g sub dop,
  spațiul H dintre plăci (cu „Același spațiu”, cât jocul), contactul pereților pe S·tan(θ/2) de la contur (accentul) și marginea
  semifabricatului dopului. Valorile, ca `valoriIncrustatie` (panoul și dopul). Un joc cât adâncimea nu se desenează.
- **Lemnul din jurul dopului** (fața coborâtă / banda) e cartonașe cu poze (`<Cartonase data-camp="inc-jur">`).
- **Frezele, la miime în desene** (`DesenComun.fz`): Ø3,175 apărea „Ø 3,18” și în desenul frezei din 28.8↑b-1.
- **Banda rămâne pentru d-2:** câmpurile ei stau încă în grupul incrustației (din 28.8↑a), iar grupul „banda” nu se arată; în
  d-2 trec în grupul lor, cu desenul benzii (lățimea, decuparea, placa, punțile).
- **Probele:** peretele, față de mișcările lui `traseuVcarve` la −D; valorile incrustației, față de `valoriIncrustatie`;
  e2e-ul desenelor; probele incrustației aleg lemnul din jurul dopului din cartonașe.
- **Mărimea:** totalul 811,4 → 812,7 / 900, pornirea neschimbată (109,4 / 115).

## Implementarea 28.8↑d-2 (24.11)

- **Câmpurile benzii trec în grupul lor.** Din 28.8↑a stăteau în grupul incrustației, iar grupul „banda” nu se randa (corpul
  lui era gol), deși `GRUP_CAMP` le punea acolo: explicațiile lor și, acum, desenul ajungeau la incrustație.
- **Desenul benzii:** semifabricatul dopului în secțiune (jumătatea dreaptă), cu pereții V ai dopului de la față până la S + H,
  fundul plat al benzii pe lățimea ei (scrisă sau cea mai mică) și peretele ei înapoi la față; cu decuparea, tăietura prin
  placă la e = H·tan(θ/2) + 0,5 mm de desen, cât freza ei, cu puntea de la fundul plăcii; fără decupare, doar banda. Valorile,
  ca `valoriBanda`; lățimea se scrie ca în câmp (cea mai mică, rotunjită în sus la micron, `susLaMicron`).
- **Probele:** valorile benzii față de `valoriBanda` (șase cazuri, între ele unul fără decupare, cu altă freză scrisă); e2e-ul
  benzii în grupul ei.
- **Mărimea:** totalul 812,7 → 813,4 / 900, pornirea neschimbată.
- **28.8↑d e încheiată.** Urmează 28.8↑e: ale incrustației cu pereți drepți (locașul, treapta, dopul, sprijinul, jocurile,
  punțile), despărțită în e-1 (grupurile și cartonașele) și e-2 (desenele).

## Implementarea 28.8↑e-1 (24.11)

- **Câmpurile incrustației cu pereți drepți trec în grupurile lor:** Locașul (felul locașului, jocul lateral), Treapta (felul
  treptei, adâncimea și lățimea umărului), Dopul (felul dopului, sprijinul, jocurile, marginea, punțile, frezele dopului). Din
  28.8↑a stăteau toate în Locașul, iar Treapta și Dopul nu se randau (corpul lor era gol, ca la bandă până la 28.8↑d-2).
  Cutia fiecărui grup păstrează `data-incrustatie` și `data-fel="drept"`, deci probele care le caută acolo merg mai departe.
- **Locașul, treapta, dopul și sprijinul sunt cartonașe cu poze** (`inc-locas`, `inc-treapta`, `inc-dop`, `inc-sprijin`).
  Sprijinul arată doar variantele care se pot, ca lista de dinainte: pe umăr cu treaptă, pe fund la buzunar, pe față fără
  treaptă; rândul lui are titlul vizibil („Se sprijină”), fiind al doilea rând de cartonașe din grupul Dopul. Mutările
  sprijinului la schimbarea locașului și a treptei, neschimbate.
- **Probele** aleg din cartonașe în `export.fisa`, `incrustatie3d`, `incrustatieDreapta` și `supracursa`; variantele
  sprijinului se citesc pe cartonașe (`[data-alegere="inc-sprijin"] .dx-card > span`).
- **Mărimea:** bucata ferestrei ~+0,5 kB; pornirea neschimbată de felie.
- Urmează 28.8↑e-2: desenele locașului, treptei și dopului (secțiunea cu umărul, tija și flanșa, jocurile), din
  `valoriIncrustatieDreapta`.

## Implementarea 28.8↑e-2 (24.11)

- **Grupul Locașul** desenează, în secțiune, buzunarul cu fund sau gaura prin foaie, cu dopul în el și jocul lateral pe cotă
  (mărit în desen: e de zecimi). **Treapta** desenează umărul la d de față, lat de s, spre interior (desenul rămâne pe față)
  sau spre exterior (desenul coboară la nivelul umărului), cu cotele lor; un umăr care nu e în (0, D) nu se desenează.
- **Dopul** e desenat așezat în locaș, după sprijin: pe fund (atinge fundul, H între plăci), pe față (fața semifabricatului
  pe piesă, g sub dop), pe umăr (flanșa pe treaptă, g sub tijă); locul sprijinului e marcat, iar semifabricatul de deasupra
  lipsește la dopul decupat. Sub desen: înălțimea dopului (cu tija și flanșa la treaptă) și semifabricatul sau placa.
- **Valorile** vin din `dopDreptDesen` (`src/ui/exportDeseneCalcul.ts`), probat pe toate sprijinurile pe care fereastra le
  oferă, cu și fără treaptă și gaură, față de `valoriIncrustatieDreapta`: tija și flanșa pe umăr D − d − g și d + H, pe fund
  D − d + g și d − g + H, la gaură D − d și d + H; fără treaptă, D − g pe față (D la gaură), altfel D + H; semifabricatul,
  dopul și 1 mm sub față (placa, cât dopul, la cel decupat).
- **Otrăvurile:** 19 / 19 (`test/otravuri/28.8e2.py`); proba nivelului desenului la treaptă a fost adăugată ca s-o prindă pe
  E05.
- **Mărimea:** totalul 820,4 / 900 kB (+1,5); pornirea neschimbată de felie.
- Urmează 28.8↑f: rezultatul în fereastră, Atelierul și densitatea mare, fișa de sine stătătoare, privirea cu fontul lat.

## Implementarea 28.8↑f-1 (24.11)

- **28.8↑f s-a împărțit** în f-1 (privirea cu fontul lat, telefonul, densitatea mare), f-2 (Rezultatul pe grupuri) și f-3
  (fișa operației ca componentă de sine stătătoare).
- **Proba privirii** (`test/e2e/export.privire.spec.ts`) rulează cu fontul lat al probelor de așezare (Verdana aici, DejaVu
  Sans pe Linux), în română și în engleză:
  - la 1280 și 1024 px, pe fiecare tăietură (și cu urechile, rampa, intrările, treapta, buzunarul cu elicea și cel paralel):
    fereastra stă în ecran, nimic nu iese din ea sau din panoul fișelor, niciun text nu e mai lat decât cutia lui;
  - la 390 px, la atingere: fiecare rând al listei se atinge și își aduce fișa, banda listei are sub o cincime din ecran,
    fiecare element al ei încape în ecran, iar prima operație se vede fără derulare;
  - în Atelier, cu densitatea mare: fiecare țintă (butoanele, câmpurile, alegerile, bifele, cartonașele) are cel puțin 48 px și
    se lovește în centrul ei, și cu ordinea mea.
- **Ce a găsit, pe telefon:**
  - rândul unei operații se strângea pe bandă la coloana locului (30 px), iar numele lui trecea peste rândul următor și îi lua
    atingerea: a doua operație nu se putea alege;
  - nota ordinii făcea banda cât jumătate de ecran.

  Acum rândul are 15 rem, nota nu apare pe bandă (Automată / A mea rămân), iar ordinea tăierii stă la capătul benzii.
- **Ce a găsit, în densitatea mare:** câmpurile și listele derulante ale ferestrei rămâneau de 32 px, bifele de 24, butoanele
  listei de 44 (lista e un `<nav>`). Acum au ținta densității (48 px, 56 la atingere), doar în fereastra exportului.
- **Otrăvurile:** 9 / 9 (`test/otravuri/28.8f1.py`). Două au scăpat întâi și au întărit proba: fereastra de 70 rem (`max-width`
  o ținea în ecran; acum se otrăvesc amândouă, iar proba cere fereastra în ecran) și nota ordinii pe bandă (după reparație nu
  mai înălța banda, ci făcea un element de ~1 000 px; proba cere fiecare element al benzii cât ecranul).
- **Mărimea:** doar CSS; totalul JavaScript neschimbat (821,8 / 900 kB, cu `main` adus).
- Urmează 28.8↑f-2: Rezultatul pe grupuri.
