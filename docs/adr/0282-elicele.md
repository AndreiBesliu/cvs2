# ADR 0282: Elicele în atelierul Easy 3Draw: configurabile, tipărite fără suport, cu prinderea LEGO

**Starea:** acceptat pe 22.11.2026 (1a, 2a, 3a); **felia 3.Tq implementată pe ramura `wip/3.Tq-elice`, Easy 3Draw 18.19.0**
(23.11, în sesiunea cloud a liniei; cifrele, la „Implementarea”); **felia 3.Tr (elicea de barcă) implementată pe aceeași
ramură, Easy 3Draw 18.20.0** (23.11, la „pornește 3.Tr” al owner-ului; „Implementarea (3.Tr)”); 3.Ts, la cuvântul owner-ului.
Propus pe 22.11, la
cererea owner-ului: „Vreau ca pluginul sa faca si elice, pentru imprimanta, si sa fie
si configurabile elicele si compatibile cu lego”. **Completează:** ADR 0280 (roțile, fulia, roțile la 90° și șenila),
ADR 0281 (piesele pe file), ADR 0169 (rotițele dințate, cu gaura pentru ax din calibrare), ADR 0129 (Planificatorul ca
extensie). Al treilea număr al intervalului 0280–0289 al pluginului. Schița, cu macheta de încercat și întrebările:
<https://claude.ai/artifact/CNQtNLBfAXxrMqQ3L4RebT>.

**Ce e azi.** Atelierul face cărămizi, legături și roți (fila Roți: roata dințată, conica, coroana, conica dublă, fulia,
roata cu anvelopă, șenila), toate cu prinderea LEGO din calibrare. Nicio piesă nu împinge aer sau apă.

**Elicele LEGO**, din numele pieselor în biblioteca LDraw („diametrul” e în știfturi, un știft = 8 mm): cu 3 palete, 6041
(Ø3½, gaură de ax), 65768 (Ø3½, gaură de știft), 2421 (Ø4, știft de roată), 4617b și 92842 (Ø5½, gaură de știft; 92842 cu
vârfurile drepte), 15790 (Ø9, gaură de știft); cu mai multe palete, 41530 (8, Ø5, gaură de ax), 87751 (7, Ø6, gaură de
știft) și 80273 (5, Ø9, gaură pătrată). Cotele exacte (butucul, gaura, unghiul paletelor), după întrebarea 3.

## Decizia (propusă)

1. **O piesă nouă, „Elice”**, din câțiva parametri:
   - **paletele:** de la 2 la 8;
   - **diametrul:** în știfturi, de la 3 la 25, din jumătate în jumătate (24–200 mm; masa imprimantei are 220);
   - **pasul**, cât ar înainta elicea într-o rotație, ca raport față de diametru (0,3–1,5; implicit 0,7); unghiul paletei la
     raza r vine din el: β(r) = atan(pas / 2πr);
   - **lățimea** (coarda cea mai mare, ca procent din rază) și **forma** paletei: rotunjită, îngustată spre vârf sau dreaptă;
     rădăcina e mai îngustă, iar paletele nu se ating la butuc;
   - **profilul:** placă curbată (implicit, se tipărește sigur) sau profil de aripă (mai eficient, cu muchia de fugă subțire);
   - **sensul:** dreapta sau stânga; „Fă perechea” pune în listă aceeași elice în ambele sensuri, pentru două motoare;
   - **prinderea**, ca la rotițe: gaura pentru ax (crucea din calibrare), rotundă pentru știft, pentru bară (Ø3,2, ca
     elicele mici LEGO pe o placă cu bară) sau fără; butucul de Ø10, înalt cât un știft (8 mm) sau cât cere paleta la
     rădăcină;
   - **conul din față**, la alegere.
2. **Tipărită fără suport:** butucul pe masă, iar fiecare secțiune a paletei își are muchia de jos tot pe masă. Paleta urcă
   deasupra ei înclinată cu β: abruptă lângă butuc, culcată spre vârf. La vârf, un strat de 0,2 mm iese cu 0,2 / tan β peste
   cel de dedesubt (la pasul 0,7, 0,9 mm): o consolă scurtă, fără suport; dedesubtul paletei iese ceva mai aspru decât fața
   de sus. Grosimea paletei scade de la 1,2 mm la butuc la 0,8 mm la vârf (două linii de duză). Toate paletele sunt la fel,
   deci elicea e echilibrată prin formă.
3. **Pe grila LEGO:** diametrul în știfturi și butucul cât un știft; „Ca LEGO …” pune parametrii elicelor de mai sus, iar
   elicea tipărită se montează pe același ax ca elicea LEGO pe care o înlocuiește.
4. **Toate tipurile intră, pe felii** (ordinea, după întrebarea 2): elicea (avion, aeroglisor, ventilator, rotor); elicea de
   barcă (3–5 palete late, înclinate înapoi, pentru bărcile cu motoare LEGO); ventilatorul cu carcasă (inelul din jurul
   elicei, cu jocul din calibrare și cu găuri de știft pentru grinzi).
5. **Ce nu face deocamdată:** nu estimează tracțiunea (poate veni ca felie, pe motoarele LEGO L, XL și Buggy); nu face elice
   mai mari decât masa imprimantei (un rotor din palete separate, prinse pe butuc, ar fi o felie a lui).

## Întrebările (recomandarea întâi)

1. **Unde stau elicele?**
   - **1a.** O filă nouă, „Elice”: elicea, elicea de barcă și ventilatorul cu carcasă (recomandat: familia crește, iar fila
     Roți are deja 7 piese).
   - **1b.** În fila Roți, după șenilă, fără filă nouă (fila ajunge la 10 piese).
2. **Ce vine întâi?**
   - **2a.** Elicea (avion, aeroglisor, ventilator, rotor), apoi barca, apoi carcasa (recomandat: e cea mai folosită cu
     motoarele LEGO).
   - **2b.** Elicea de barcă întâi.
   - **2c.** Ventilatorul cu carcasă întâi.
3. **De unde iau cotele LEGO?**
   - **3a.** Din LDraw, ca la roți: descarc fișierele celor 9 elice și pe cele comune pe care le folosesc (text, câțiva kB
     fiecare; licența CC BY 4.0) și măsor butucul, gaura, diametrul și unghiul paletelor (recomandat).
   - **3b.** Fără descărcare: doar diametrul și gaura, din numele pieselor; paletele, după modelul nostru.

## Răspunsurile

Owner-ul a răspuns în conversație pe 22.11.2026: „1a, 2a, 3a”.

- **1a:** o filă nouă, „Elice”, după Roți: elicea, apoi elicea de barcă și ventilatorul cu carcasă.
- **2a:** elicea întâi (3.Tq), apoi barca (3.Tr), apoi carcasa (3.Ts).
- **3a:** cotele din LDraw. Aduse cele 9 elice și ce folosesc (licența CC BY 4.0), în afara repo-ului (`.tmp/ldraw`, cu
  `scripts/ldraw/aduce.py`), și măsurate cu `scripts/ldraw/elice_masura.py` (suprafața eșantionată: diametrul, butucul,
  paletele și unghiul lor pe direcția principală a secțiunii cilindrice), `elice_desfasurata.py` (banda cilindrică,
  desfăcută) și `felie_axa.py` (gaura, la mijlocul butucului). **Cotele de mai jos sunt cele corectate pe 23.11** (vezi
  „Corectura din 23.11”), măsurate față de axa piesei:
  - **6041:** Ø27,4; butucul Ø8 × 9,6, gaură de ax; paletele plate, la ≈ 23°, coarda 7,7 → 9,2 (se lățesc spre vârf); pe
    stânga.
  - **65768:** Ø26,7; butucul Ø8 × 8, gaură de știft Ø4,8; paletele la ≈ 25–26°, coarda 7 → 10; pe stânga.
  - **2421:** Ø32,0; paletele la ≈ 19–21°, coarda 5; pe dreapta.
  - **4617b:** Ø43,2; butucul Ø8 × 6,4, gaură de știft Ø4,8; paletele la ≈ 16–20°, coarda 9,3 → 5,8; pe dreapta.
  - **92842:** Ø43,1; butucul Ø7,5 × 8, gaură de știft Ø4,8; paletele la ≈ 14–17° (15° la 70 % din rază), coarda 7,1 → 5,8, cu
    vârfurile drepte; pe dreapta.
  - **15790:** Ø73,9; butucul Ø8 × 8, gaură de știft Ø4,8; paletele plate, la ≈ 15° de la rădăcină la vârf, coarda 10,2 → 8,2;
    pe dreapta.
  - **41530:** Ø36,9; opt pereți drepți, paraleli cu axa (o roată cu palete, nu o elice cu pas), gaură de ax: e reperul
    ventilatorului cu carcasă (3.Ts), nu al elicei.
  - **87751:** Ø49,8; șapte palete, aproape plate spre vârf (16° lângă butuc, 1–2° la vârf); butucul Ø8 × 8, gaură de știft.
  - **80273:** Ø71,2; cinci palete drepte pe o grindă, gaură pătrată.

  „Diametrul” din numele pieselor (în știfturi) e deci bun, la 1–2 mm: 3½ = 28 (6041: 27,4), 4 = 32 (2421: 32,0), 5½ = 44
  (92842: 43,1), 9 = 72 (15790: 73,9). „Ca LEGO” ia cotele măsurate.

**Ce schimbă cotele față de propunere:** butucul e Ø8 × 8, ca la LEGO (nu Ø10). Paletele LEGO sunt plate, cu unghiul la
fel de la rădăcină la vârf, nu cu pas constant: paleta „plată” intră lângă cea „răsucită” (implicită, care trage mai bine),
iar „Ca LEGO” (6041, 92842, 15790) pune paleta plată, cu unghiul măsurat, la 70 % din rază, și sensul piesei. Cu multe
palete pe butucul LEGO, rădăcina iese îngustă: secțiunea reală a paletei (cu grosimea ei) încape în 85 % din pasul dintre
palete.

## Corectura din 23.11 (privirea pe piesa reală)

La privirea pe piesele LDraw, randate lângă ale noastre, înaintea unirii:

- **Diametrele măsurate pe 22.11 erau greșite cu ~13 %.** `elice_masura.py` măsura razele față de centrul cutiei piesei, nu
  față de axa ei de rotație; la o elice cu 3 palete, centrul cutiei cade la un sfert de rază de axă. Așa ieșiseră Ø30,2 /
  48,5 / 83,3 (și concluzia că numele pieselor ar fi aproximative), în loc de Ø27,4 / 43,1 / 73,9. Dovada: față de originea
  piesei (unde e modelată gaura butucului), vârfurile celor trei palete sunt la aceeași rază (13,69; 21,56; 36,96 mm), gaura
  de știft e un cerc cu raza 2,35–2,38, iar aceeași unealtă, pe plasele motorului nostru, dă înapoi cotele din parametri
  (Ø83,30 cerut: 83,30; 14,0° cerut: 13,9°). Unghiul lui 15790 la 70 % din rază e 15°, nu 14°.
- **Sensul.** LDraw are un reper drept, deci semnul pantei paletei e sensul elicei: 15790, 92842, 4617b și 2421 sunt elicoizi
  drepți („dreapta” motorului nostru, măsurată cu aceeași unealtă: +1), iar 6041 și 65768, stângi (−1). „Ca LEGO” pune deci
  și sensul piesei: elicea tipărită împinge aerul ca piesa LEGO pe care o înlocuiește, la aceeași rotație a motorului.
- **Uneltele:** `elice_masura.py` și `elice_desfasurata.py` măsoară față de axa prin origine (cu verificarea ei: razele
  vârfurilor) și dau semnul pantei în reper drept pe orice axă; `randare.mts` rotește piesele LDraw (y → −y, z → −z) în loc
  să le oglindească (doar y → −y arăta elicele pe invers).
- **În atelier** (`ELICE_LEGO`): 6041 → Ø27,4, pasul 0,93 (23°), lățimea 60 %, gaura de ax, stânga; 92842 → Ø43,1, pasul
  0,59 (15°), 29 %, gaura rotundă, dreapta; 15790 → Ø73,9, pasul 0,59 (15°), 25 %, gaura rotundă, dreapta.

## Implementarea (3.Tq)

Pe ramura `wip/3.Tq-elice`, Easy 3Draw 18.19.0 (22–23.11; din 23.11, în sesiunea cloud a liniei, pilotul lucrului în cloud).

- **Motorul** (`extensii/trenulet/sursa/lego/lego.ts`): `elice` (tipul nou al lui `construieste`), `eliceCote` (cotele din
  parametri, și pentru editor) și `sectiuneElice`. Plaja: 2–8 palete, Ø20–200 mm, pasul 0,3–1,5 × diametrul, lățimea 15–60 %
  din rază. Butucul Ø8 × 8 (sau cât cere paleta la rădăcină), cu gaura din calibrare (ax, știft, bară sau fără); rădăcina
  paletei intră 0,4 mm în butuc; 28 de stații pe paletă; grosimea de la 1,2 la 0,8; placa curbată (săgeata 4 %) sau NACA
  4412, cel puțin cât placa; conul, 1,3 raze de butuc, așezat 0,1 mm în el.
- **Atelierul** (`planificator/atelier.ts`): fila „Elice” (familia `propulsie`, după Roți), editorul (`at-el-*`), „Ca LEGO”
  (6041, 92842, 15790), „Fă perechea”, textul cu pasul, unghiurile și consola la vârf, pictograma; 31 de texte în engleză.
- **Probele:** unitare 13 (`test/unit/trenulet.elice.test.ts`: corpul închis pe plajă, cotele, muchia de jos pe masă,
  unghiul din plasă, paletele care nu se ating, oglinda, secțiunea plăcii și a profilului de aripă pe hârtie, formele,
  vârful la diametrele cu rotunjire, butucul și conul, implicitele și marginile); e2e 6 (`test/e2e/trenulet.elice.spec.ts`), plus filele și proba în engleză
  din cvs2, care parcurge acum și fila Elice.
- **Otrăvurile:** `test/otravuri/3.Tq.py`, 138 (77 pe motor, 59 pe atelier prin e2e, pictograma și traducerea), toate prinse
  pe codul final: 134 din prima, una (rotunjirea pasului din câmp) după proba ei, iar din trei socotite întâi echivalente și
  rulate totuși, una era prinsă și una a cerut proba ei: garda radicalului din forma rotunjită ține plasa întreagă la 99
  dintre diametrele din 0,1 în 0,1 mm (fără ea, vârful ar fi NaN); `3.Tq-en.py`, 4 / 4 (textele rămase în română fără
  diacritice, văzute doar în cvs2, în engleză); trei echivalente, lăsate afară cu motivul în liste.
- **Cursa din editor, găsită de o cădere rară a probei** (1 din 30 sub încărcare): după ce sosește three.js, partea 3D alege
  din nou piesa și redesenează editorul. Dacă omul tocmai a scris într-un câmp, redesenarea scoate câmpul din pagină, iar
  browserul îi dă `change` în mijlocul ei: valoarea intra în piesă, dar editorul rămânea desenat cu ce era (piesa cu 4 palete,
  editorul cu 3 și cu „Ca LEGO 15790” apăsat). `editor()` ia acum întâi câmpul activ, apoi desenează: e pentru toate piesele
  atelierului. Proba ei ține three.js până scrie omul, apoi îi dă drumul; probele elicei așteaptă pornirea părții 3D.
- **Ce se vede pe randări și pe capturi:** paletele nu se ating nici la 8 palete (în plan, golul dintre două palete vecine
  e cel puțin 15 % din pasul dintre ele: la Ø72 cu 8 palete, 0,5 mm lângă butuc și 1,4 mm la raza de 12), plasa e orientată
  corect (nicio față întoarsă), editorul încape la 390 px. **De încercat pe imprimantă:** la vârf paleta e culcată (13° la elicea implicită, 15° la „Ca LEGO
  15790”), deci dedesubtul ei iese aspru (consola de 0,9, respectiv 0,7 mm pe strat, spusă în editor), iar pe masă stă doar
  butucul și câte o linie subțire sub fiecare paletă: o margine de aderență (brim) din slicer ajută.

## Implementarea (3.Tr): elicea de barcă

Pe ramura `wip/3.Tq-elice`, Easy 3Draw 18.20.0 (23.11, în sesiunea cloud a liniei), la „pornește 3.Tr” al owner-ului.
Decizia spunea doar „3–5 palete late, înclinate înapoi, pentru bărcile cu motoare LEGO”; restul s-a hotărât la implementare
și e scris aici, cu motivul.

**Reperul LEGO** (din LDraw, ca la 3.Tq; `scripts/ldraw/aduce.py`, licența CC BY 4.0, în afara repo-ului): niciuna dintre
elicele LEGO nu e numită „de barcă”; singura făcută pentru apă e cea a motorului de barcă (48085, cu elicea u9216): Ø21,6,
trei palete ovale, plate, la ≈ 10°, care acoperă ~80 % din disc, pe un butuc de Ø5 cu un arbore de Ø2. Nu stă pe un ax
LEGO, deci e reperul formei (palete late, rotunde), nu al prinderii: de aceea elicea de barcă n-are „Ca LEGO”, ci
diametrele pe grila de știfturi.

- **Ce face:** a doua piesă a filei „Elice”, „Elice de barcă”: 3–5 palete, Ø20–120 mm (implicit Ø40, 5 știfturi), pasul
  0,5–1,6 × diametrul (implicit 1), același de la butuc la vârf (β(r) = atan(P / 2πr), ca la elicele navale), lățimea
  40–150 % din rază (implicit 100 %), înclinarea înapoi 0–40° (implicit 20°), sensul și „Fă perechea”, gaura din calibrare
  (ax, știft, bară sau fără), capacul rotunjit, la alegere.
- **Paleta lată:** conturul e o „ureche”: coarda crește eliptic de la 60 % (la rădăcină) la lățimea cerută (la 60 % din
  paletă), apoi se rotunjește eliptic spre vârf. Pe fiecare rază, secțiunea reală ocupă cel mult 85 % din pasul dintre
  palete, deci paletele nu se ating nici la 5 palete cu lățimea 150 % (acoperă atunci 76 % din disc; implicita, 55 %).
  Editorul spune cât din disc acoperă paletele.
- **„Înclinate înapoi” e pe cerc, nu spre pupa.** Înclinarea navală are două feluri: pe cerc (skew: vârful rămâne în urma
  rotației) și pe axă (rake: vârful e împins spre pupa). Cea pe axă ar ridica muchia de jos a paletei de pe masă, cu o
  pantă de 10–15° față de orizontală: nu se tipărește fără suport. Cea pe cerc doar mută fiecare secțiune pe cercul ei
  (cu unghiul · x², x fiind locul pe paletă), deci muchia de jos rămâne toată pe masă. S-a făcut cea pe cerc. Dacă owner-ul
  vrea și înclinarea spre pupa, e o opțiune în plus, cu suport la tipărire.
- **Secțiunea ogivală** (ca la elicele navale), nu placa curbată a elicei de aer: fața care împinge apa e plată, spatele
  e bombat; groasă la mijlocul corzii de la 4 % din diametru la rădăcină (între 1,6 și 3 mm) la 0,8 la vârf, cu muchiile
  de 0,6 (o linie de duză și jumătate).
- **Cum stă pe masă:** cu partea dinspre barcă jos. Axul intră de jos (dinspre barcă), iar capacul, dacă e ales, închide
  butucul sus, spre pupa; fața plată a paletei (cea care împinge apa) e cea de sus, care iese curată, iar spatele, cel de
  dedesubt, mai aspru. Fiecare secțiune își are punctul cel mai de jos la z = 0, ca la elice. Sensul „dreapta” e același
  elicoid ca la elice: privită dinspre pupa, se rotește în sensul acelor de ceasornic la mers înainte.
- **Butucul** crește cu elicea: Ø8 sub Ø45, apoi 18 % din diametru (Ø21,6 la Ø120), și e înalt cât cea mai înaltă
  secțiune a paletei (cel puțin un știft, 8 mm): la elicea implicită, Ø8 × 11,5. Paleta lată e abruptă la rădăcină (58°),
  deci înaltă; pe un butuc de 8, paletele ar fi ieșit peste el. Capacul e o jumătate de elipsoid, înalt de 1,2 raze.
- **Motorul** (`lego.ts`): `eliceBarca`, `eliceBarcaCote` (cotele, butucul, unghiurile, consola, cât din disc acoperă
  paletele) și `sectiuneBarca`. Paletele elicei și ale elicei de barcă ies din aceeași funcție (`paleteElice`; capetele
  secțiunii cu fața plată se închid ca o fâșie, fiindcă tăierea urechilor pierde punctele coliniare), iar butucul, din
  `butucElice`. Elicea din 3.Tq a rămas aceeași la octet (amprenta a 3 456 de combinații, înainte și după).
- **Atelierul** (`atelier.ts`): piesa `eliceBarca` în familia `propulsie`, editorul (`at-eb-*`), „Repede” (Ø24, Ø32, Ø40,
  Ø56: 3, 4, 5 și 7 știfturi), textul (pasul, unghiurile, acoperirea, butucul, consola), pictograma; lățimea și înclinarea
  intră în numele piesei doar când nu sunt cele obișnuite (două elice diferite nu pot avea același nume în listă); 13
  texte în engleză.
- **Probele:** unitare 12 (`test/unit/trenulet.barca.test.ts`: corpul închis pe plajă, cotele, muchia de jos pe masă,
  pasul măsurat pe fața plată, secțiunea și conturul pe hârtie, înclinarea, paletele care nu se ating, oglinda,
  acoperirea față de aceeași sumă făcută pe plasă, vârful la diametrele cu rotunjire, marginile); valorile pe hârtie sunt
  calculate separat de motor. E2e 5 (`test/e2e/trenulet.barca.spec.ts`), plus filele, căutarea („bar” găsește acum și
  „Elice de barcă”), pictogramele (și cele două elice, care lipseau din proba e2e) și proba în engleză din cvs2.
- **Otrăvurile:** `test/otravuri/3.Tr.py`, 141 (87 pe motor, 52 pe atelier prin e2e, pictograma și traducerea): 139 prinse
  din prima; capacul cu alt profil spre vârf și ordinea „gaură, capac” din nume, după probele lor. `3.Tr-en.py`, 6 / 6.
  Trei echivalente, lăsate afară cu motivul în listă. Lista lui 3.Tq, mutată pe codul comun (0 VOID).
- **Ce se vede pe randări și pe capturi:** paletele seamănă cu ale unei elice de barcă (late, rotunde, aplecate înapoi),
  nu se ating la 5 palete, editorul încape la 390 px. **De încercat pe imprimantă:** la pasul 1, vârful stă la 18°
  (consola de 0,6 mm pe strat, mai bună decât la elicea de aer); pe masă stau butucul și muchia de jos a fiecărei palete,
  deci o margine de aderență (brim) ajută și aici.

## Feliile

- **3.Tq:** elicea (tot ce e la punctul 1), cu fila după răspunsul 1 și „Ca LEGO” după răspunsul 3.
- **3.Tr:** elicea de barcă.
- **3.Ts:** ventilatorul cu carcasă.

Ordinea, după întrebarea 2. Fiecare felie are motorul (`lego.ts`), editorul (`atelier.ts`), probele pe plase (corpul
închis, cotele, consola la vârf, paletele care nu se ating, pe toată plaja parametrilor) și otrăvurile, ca la roți; pachetul
urcă o versiune minoră la fiecare felie.
