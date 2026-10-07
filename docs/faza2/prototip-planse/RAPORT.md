# Sonda s10: prototipul clicabil al planșelor (variantele A și D)

Faza 2, tranșa 1 · 07.10.2026 · cod aruncabil, fără motor CAM, fără rețea.

- **Prototipul:** [`index.html`](index.html). E un singur fișier și se deschide direct în Chrome sau Edge, cu dublu-clic.
- **Capturile:** [`capturi/`](capturi/), câte una pe scenariu și variantă, plus tema întunecată și telefonul.
- **Testul și rezultatele:** [`cod/`](cod/).

**Legendă:**
- **[măsurat]** = am rulat;
- **[citit]** = din documente, cu sursa;
- **[dedus]** = concluzia mea.

---

## 1. Întrebarea

Ce model de planșe intră în plan?
- **A:** planșa e pânza, cu un singur arbore de obiecte.
- **D:** piese cu arbore propriu, puse ca instanțe pe foi de material care au și față. Al doilea nivel stă ascuns până îl ceri.

Sursele sunt `BRIEF.md` §9 și `LECTII.md` §5.6 [citit]. O **instanță** e o piesă așezată pe o foaie: o poziție care trimite la piesă, nu o copie a desenului.

Decizia e a owner-ului, după ce încearcă cele 8 scenarii din `LECTII.md` §5.7. Sonda avea de dat două lucruri:
- o pagină pe care owner-ul s-o poată judeca;
- dovada că pagina face ce spune.

## 2. Pe scurt

- **Prototipul e gata și probat.** 122 de verificări trec, cu gesturi reale de mouse și tastatură, în Edge 154. O rulare durează 9,6 s (mediana a 5 rulări). Șase sabotaje țintite sunt toate prinse, între ele micșorarea tăcută și rama copiată goală. [măsurat]
- **Pe scenariile 1, 2, 3 și 8, A și D sunt identice.** Au aceleași gesturi (2, 6, 15 și 11) și aceleași concepte, iar al doilea nivel al lui D nu apare. Deci, în prototip, 1, 2 și 8 **nu** cer două niveluri vizibile. Rămâne ca owner-ul să confirme că așa se și simte. [măsurat]
- **Diferența apare la 5 și 7:**
  - textul schimbat pe 12 suporturi: A are nevoie de 26 de gesturi, D de 6;
  - buzunarul pus pe spate: A are nevoie de 39 de gesturi, D de 9;
  - în A, după o mutare, spatele rămâne nealiniat cu 50 mm și nu apare niciun avertisment.

  [măsurat, pe drumul scris în test]
- **La 4 și 6 gesturile sunt egale** (7, respectiv 9), dar D mai numește un concept: piesa și instanța. În schimb, D stochează doar 2 noduri, față de 24 în A (12 suporturi) și 60 în A (30 de plăcuțe). [măsurat]
- **Recomandarea mea, ca ipoteză: D.** Scenariile 4–7 sunt în v1: foile și Multi-Plate (rândul 31), relieful pe spate cu întoarcere (rândul 76) [citit: `ACOPERIRE-ARTCAM-DESKPROTO.md`]. Owner-ul decide după încercare, iar trei alegeri din §5 sunt ale lui.

## 3. Candidații

| Nume | Licență | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| **A** · planșa e pânza | cod propriu, fără biblioteci | Planșa e materialul și pânza. Arborele are grup, ramă (grup cu contur) și element. Repetarea face copii. A doua față e altă planșă, copiată oglindit. | 55/55 verificări. Gesturi pe scenariile 1–8: 2, 6, 15, 7, 26, 9, 39, 11. Noduri: 24 pentru 12 suporturi, 60 pentru 30 de plăcuțe. Spatele nu urmează fața. | bun la 1, 2, 3, 8; slab la 5 și 7 |
| **D** · piese pe foi | cod propriu, fără biblioteci | Fiecare piesă are același arbore. Pe foi stau instanțe. Foaia poartă fața de jos și știfturile. Lista de piese apare abia la «Încă…», «Din CSV…» sau «+1». | 61/61 verificări. Gesturi: 2, 6, 15, 7, 6, 9, 9, 11. Noduri: 2, atât pentru 12 suporturi, cât și pentru 30 de plăcuțe. Spatele urmează fața. | ca A la 1, 2, 3, 8; mai bun la 5 și 7; un concept în plus la 4 și 6 |
| playwright-core 1.63.0 | Apache-2.0 | conduce browserul în test | — | unealtă de test, nu intră în aplicație |
| Microsoft Edge 154.0.4258.62 | proprietar | browserul testului | — | unealtă de test |
| Pillow 12.3.0 (Python) | MIT-CMU | comprimă capturile PNG | 1 750 KB → 684 KB | unealtă de lucru |

Licențele vin din metadatele instalate (`package.json`, metadatele Python) [citit]. Prototipul nu folosește nicio bibliotecă, deci nu aduce nicio licență în aplicație [măsurat].

### Ce conține prototipul

**Sus, mereu vizibil:** comutatorul A / D. Antetul rămâne lipit și pe telefon.

**Panoul de scenarii.** Pentru fiecare dintre cele 8 scenarii:
- sarcina, un indiciu ascuns și ce observăm;
- butonul «Reset scenariu»;
- notițe separate pentru A și pentru D. Se salvează în memoria locală a browserului (`localStorage`), în try/catch, și rămân după reîncărcare;
- «Copiază notițele»: tot textul, cu toate scenariile și conceptele numite, gata de trimis.

**Pânza** (în SVG, desenul vectorial al browserului):
- clic, Shift+clic sau un dreptunghi tras pe fundal ca să alegi;
- tragere și mânere de redimensionare;
- dublu-clic intră în grup, ramă sau piesă; Escape iese un nivel;
- firul de sus (breadcrumb) arată unde ești și se poate apăsa;
- Ctrl+D, Delete, Ctrl+G / Ctrl+Shift+G (inclusiv grup în grup), R (rotire cu 90°), săgețile, Ctrl+Z / Ctrl+Y;
- rotița mărește, iar tragerea pe fundal mută vederea.

**Rama:**
- Conturul are **inele**, adică contururi paralele la distanță fixă, de exemplu canelura la 10 mm.
- Când mărești rama, inelele rămân la aceeași distanță. Conținutul își păstrează mărimea și se ține de o margine: **ancora**, una din 9 poziții.
- Liniile verzi arată de ce margine se ține fiecare lucru și la ce distanță.
- Când scrii L sau Î, vezi întâi conturul-fantomă (previzualizarea). Enter aplică, Escape renunță.

**Foile:**
- «Așază pe rânduri»: marginea 10 mm, distanța 10 mm, după dreptunghiul fiecăruia, cu surplusul pe foaia următoare;
- mutarea între foi, prin tragere sau din listă;
- «+ Foaie».

**Avertismente în loc de reparații:** iese din foaie, iese din ramă, se suprapun, inelul nu mai încape, numele nu încape. Nimic nu se micșorează și nu se reașază singur.

**Doar în A:**
- «Multiplică…» face copii;
- «Din CSV…» face copii, cu numele scris în fiecare;
- «Duplică planșa oglindit».

**Doar în D:**
- «Încă…» face instanțe legate;
- «Din CSV…» face instanțe, cu valoarea pe instanță;
- «Desprinde» și lista «Piese»;
- banda violet „Editezi piesa: se schimbă toate cele N”;
- «Fața: Sus / Jos», cu vederea feței de jos și cu știfturile.

**Un ajutor pentru probă, nu parte din aplicația reală:** o etichetă care spune dacă al doilea nivel a apărut și la ce gest („Nivelul 2: ascuns” sau „vizibil, apărut la …”).

**Restul:** tema întunecată apare automat, iar pagina nu se strică la 390 px lățime.

## 4. Măsurători

### Metoda [măsurat]

**Cum rulează testul** (`cod/test-planse.mjs`):
- deschide prototipul în Edge 154, fără fereastră (headless);
- îl servește local, pe portul 5180.

**Ce face pe fiecare variantă și scenariu:**
1. încarcă scenariul;
2. face gesturile-cheie cu mouse-ul și tastatura, nu prin apeluri interne;
3. verifică starea și desenul.

**De unde citește:**
- Starea vine dintr-un cârlig doar de citire, `window.__proto`.
- Unele verificări se fac direct pe desen. De exemplu, inelul desenat are 380×180, iar buzunarul de pe fața de jos stă la x 310..430.
- Pentru acestea, testul calculează coordonatele din `viewBox`, adică din fereastra de vizualizare a SVG-ului, nu din codul aplicației.

**Ce numără:**
- **gesturi:** clicuri, dublu-clicuri, trageri, taste și câmpuri completate pe drumul scris în test;
- **concepte:** cuvintele de structură pe care drumul a trebuit să le folosească, după contorul din pagină;
- **noduri stocate:** câte forme ține documentul.

### Oracolul: valori pe hârtie, scrise ca numere în test

- **Scenariul 1.** Mânerul e dus la x = 440, cu marginea stângă la 40.
  - Rama ajunge la 400×200.
  - Canelura are 400 − 2·10 = 380 pe 200 − 2·10 = 180.
  - Textul e centrat la 400 / 2 = 200 și rămâne la mărimea 24.
  - Gaura are tot Ø8, cu centrul la (200, 28).
- **Scenariul 4.** Suporturi de 150×100 pe o foaie de 600×400, cu marginea și distanța de 10 mm.
  - Pe un rând încap ⌊(600 − 20 + 10) / 160⌋ = 3.
  - Încap ⌊(400 − 20 + 10) / 110⌋ = 3 rânduri.
  - Deci pe o foaie încap 9, iar 12 = 9 + 3.
  - Pozițiile: x 10 / 170 / 330 și y 10 / 120 / 230.
  - Rotit, un suport intră exact în fâșia x 490..590.
- **Scenariul 6.** Plăcuțe de 180×60.
  - Pe un rând încap 3, fiindcă 3·180 + 2·10 = 560 ≤ 580.
  - Încap 5 rânduri, fiindcă 5·60 + 4·10 = 340 ≤ 380.
  - Deci 30 = 15 + 15.
- **Scenariul 7.**
  - În A, ușița stă la x 80..380 pe o foaie de 600, deci oglinda ei e la x 220..520.
  - În D, buzunarul stă la x 170..290, deci pe fața de jos apare la 600 − 290 .. 600 − 170 = 310..430.
  - După o mutare cu +50 mm, pe fața de jos ajunge la 260..380.
- **Scenariul 8.** Chenarul la 20 mm pe 1200×400 dă cutia (20, 20, 1160, 360).

### Cifrele [măsurat]

| Scenariul | Gesturi A | Gesturi D | Concepte A | Concepte D | Noduri A | Noduri D |
|---|---:|---:|---|---|---:|---:|
| 1. Plăcuța mărită | 2 | 2 | Ramă | Ramă | 3 | 3 |
| 2. Gesturile pe ramă | 6 | 6 | Ramă, Copie | Ramă, Copie | 3 | 3 |
| 3. Grup în grup | 15 | 15 | Ramă, Grup | Ramă, Grup | 7 | 7 |
| 4. Suporturi pe foaie | 7 | 7 | 3: Copie, Așezare, Planșă | 4: Piesă, Instanță, Așezare, Foaie | 24 | 2 |
| 5. Piesa-sursă editată | 26 | 6 | 1: Ramă | 4: Piesă, Instanță, Ramă, Desprindere | 24 | 4 |
| 6. Plăcuțe din CSV | 9 | 9 | 5: Câmp, Copie, Așezare, Planșă, Ramă | 6: Câmp, Piesă, Instanță, Așezare, Foaie, Ramă | 60 | 2 |
| 7. Două fețe | 39 | 9 | 5: Planșă, Copie, Oglindire, Ramă, Știft | 3: Fața de jos, Știft, Ramă | 8 | 3 |
| 8. Semnul unic | 11 | 11 | Planșă | Foaie | 2 | 2 |

**Ce verifică testul, pe scenarii:**
- **1.** Rama ajunge la 400×200, canelura are 380×180, textul e centrat la 200 și rămâne la mărimea 24, gaura rămâne Ø8 sus.
  - Fantoma apare înainte de Enter și dispare la Escape.
  - În D, nivelul 2 rămâne ascuns.
- **2.** Dublu-clicul intră în ramă și alege textul. Textul coboară 20 mm, iar rama nu se mișcă.
  - Ctrl+D copiază rama cu tot conținutul. Delete o șterge cu tot conținutul și nu lasă nimic pe foaie.
- **3.** Testul intră pe trei niveluri (Plăcuță › Logo › Frunze). Escape urcă câte un nivel, iar firul permite și saltul direct.
  - Ctrl+G face grup în grup în grup, iar Ctrl+Z îl desface.
- **4.** Se așază 9 + 3, pe pozițiile din oracol.
  - R rotește un suport în jurul centrului lui, la (355, −15, 100, 150).
  - Mutat înapoi, suportul ajunge exact la (490, 10, 100, 150), fără niciun avertisment.
- **5.**
  - În A se schimbă doar copia editată: 1 «CEAI» și 11 «CAFÉ».
  - În D, banda spune „toate cele 12 instanțe” și un singur gest le schimbă pe toate 12.
  - «Desprinde» lasă o piesă cu 11 instanțe și una cu o instanță. La final sunt 11 «CEAI» și 1 «ZAHĂR».
- **6.** Plăcuțele se așază 15 + 15, cu numele în ordinea din CSV.
  - În A, mărimea textului se schimbă pe 1 plăcuță din 30. În D se schimbă pe toate 30.
  - Un singur nume se corectează (Diana devine Mihaela), iar restul rămân neatinse.
- **7.**
  - În D, foaia are 2 știfturi pe axa x = 300 și apare doar fața. Buzunarul e pe spate, oglindit la 310..430, și urmează ușița după mutare.
  - În A, planșa 2 e o copie oglindită la x 220..520 și ai nevoie de 4 știfturi puse de mână. După mutare, spatele rămâne nealiniat cu 50 mm, fără niciun avertisment.
- **8.** Foaia ajunge la 1200×400 și chenarul la (20, 20, 1160, 360). În D, nivelul 2 nu apare.

**Toate verificările:** 122/122, adică 55 în A, 61 în D și 6 comune. Cele comune verifică:
- notița rămâne după reîncărcare;
- «Copiază notițele» pune în clipboard toate cele 8 scenarii, A și D;
- tema întunecată schimbă fundalul;
- la 390 px nu apare derulare orizontală, iar comutatorul rămâne vizibil și după derulare;
- consola nu are nicio eroare sau avertisment.

**Durata** a 5 rulări: 9,1 / 9,1 / 9,6 / 9,6 / 9,7 s, cu mediana 9,6 s. Cifrele din tabel au fost identice în toate cele 5.

**Separat, pe adresa `file://`** (fișierul deschis direct, cum îl va deschide owner-ul): notița rămâne după reîncărcare, copierea în clipboard reușește și consola nu are erori. Proba e în `cod/filecheck.mjs`.

### Sabotajele [măsurat]

Un **sabotaj** e o greșeală pusă intenționat într-o copie a prototipului. Testul trebuie să devină roșu pe fiecare. Un sabotaj a cărui înlocuire nu se aplică se numără „VOID”, nu „prins” (s-a întâmplat o dată și l-am reparat).

| Sabotajul | Ce strică | Rezultatul |
|---|---|---|
| control | nimic (copia neatinsă) | verde, 0 picate |
| M1 | rama mărită scalează și conținutul, ca micșorarea tăcută din ediția întâi | prins: 4 picate (scenariul 1, A și D) |
| M2 | Ctrl+D pe ramă copiază doar conturul | prins: 4 (scenariul 2) |
| M3 | D: fiecare instanță e de fapt o copie | prins: 4 (scenariile 4 și 5, D) |
| M4 | surplusul nu trece pe foaia următoare | prins: 6 (scenariile 4 și 6) |
| M5 | D: fața de jos nu e oglindită | prins: 2 (scenariul 7, D) |
| M6 | Escape sare direct sus | prins: 4 (scenariul 3) |

### Zgomotul

- Gesturile, conceptele și nodurile sunt deterministe: nu depind de mașină. Timpul (≈ 9–10 s) contează doar ca să încapă sub 3 minute. Pe mașină rulau în același timp alți 9 agenți.
- Sonda nu are cifre de GPU, fiindcă pânza e un SVG simplu. Performanța pânzei reale o măsoară sonda de pânză.

### Fiecare scenariu față de criteriul din `LECTII.md` §5.7

Criteriul [citit]:
- dacă 1, 2 și 8 cer două niveluri vizibile, alegem A;
- dacă 4–7 contează în v1, alegem D.

| Scenariul | Ce arată prototipul | Ce spune pentru criteriu |
|---|---|---|
| 1 | La fel în A și D. Fantoma și liniile verzi arată dinainte unde ajung canelura, textul și gaura. Gaura rămâne Ø8 sus; în ediția întâi ajungea la 98 mm [citit: §5.4]. | Nu cere al doilea nivel, deci nu favorizează nici A, nici D. |
| 2 | La fel: clicul, Ctrl+D și Delete iau rama cu tot conținutul. În ediția întâi, Ctrl+D dădea o ramă goală, iar Delete lăsa conținutul pe loc [citit: `docs/faza0/15` §2]. | La fel. |
| 3 | La fel: trei niveluri, Escape urcă câte unul, firul arată unde ești. | Nu e în criteriu; arborele e comun. |
| 4 | Gesturile sunt egale. D numește în plus piesa și instanța, iar nivelul 2 apare la «Încă…». | Foile sunt v1 [citit: BRIEF §9]. Argument pentru D doar dacă owner-ul vrea instanțe. |
| 5 | A: 12 editări separate, 26 de gesturi. D: o editare, cu banda violet și «Desprinde». | Argument puternic pentru D. |
| 6 | Gesturile sunt egale. A ține 60 de noduri, iar fontul se schimbă pe o singură copie. D ține valoarea pe instanță și fontul pe piesă. | Multi-Plate e v1 [citit: BRIEF §9], deci argument pentru D. |
| 7 | A: o planșă-copie, știfturi puse de mână și o nealiniere tăcută de 50 mm. D: aceeași foaie cu fața de jos, iar spatele urmează fața. | Relieful pe spate cu întoarcere e v1 (rândul 76), deci argument pentru D. Știfturile sunt v1.x (rândul 113) [citit]. |
| 8 | La fel în A și D; nivelul 2 nu apare. | Nu cere al doilea nivel. |

## 5. Ce schimbă în arhitectură

1. **Arborele și gesturile sunt comune.** Arborele (grup, ramă = grup cu contur, element) și tabelul de gesturi se pot construi și testa înainte de alegerea dintre A și D. Tabelul acoperă clicul, dublu-clicul, Escape, Ctrl+D, Delete și mânerele. Scenariile 1–3 au dat același rezultat în ambele variante [măsurat].
2. **Dacă alegem D, modelul e acesta:**
   - `Doc { parts, sheets }`;
   - `Part { name, root: Nod }`;
   - `Sheet { stoc, flip?, items: [{ partId, x, y, rot, fields }] }`.

   Instanța nu copiază geometria. La 12 suporturi sunt 2 noduri în loc de 24, iar la 30 de plăcuțe 2 în loc de 60 [măsurat]. Un șablon de 400 de forme pus de 50 de ori ar da 400 de noduri și 50 de plasări, nu 20 000 de forme [dedus; cifra veche e în `LECTII.md` §5.4].
3. **Nivelul al doilea ascuns e doar o chestiune de afișare.** Modelul rămâne același, iar interfața ascunde lista de piese până la prima cerere: «Încă…», «Din CSV…» sau «+1». D nu cere două scheme sau două spații de lucru [măsurat: așa e făcut prototipul].
4. **Fața de jos aparține foii** (materialului), cu axa de întoarcere și știfturile. Elementele piesei poartă `face: față | spate`. Asta acoperă rândul v1 „relief pe două fețe + întoarcere” și pregătește montajele din v1.x: știfturi, axa a 4-a [dedus].
5. **Exportul cu vectori reali** (`BRIEF.md` §16.2):
   - Instanțele lui D se pot scrie ca entități cu referință: `BLOCK` / `INSERT` în DXF, `<symbol>` / `<use>` în SVG, Form XObject în PDF. Fișierul iese mai mic, iar piesa rămâne editabilă ca un întreg în AutoCAD sau Inkscape. Dacă un program nu citește referințele, se scriu desfăcute.
   - Inelul ramei e un dreptunghi rotunjit cu raza max(r − d, 0). Asta e offsetul exact, făcut din linii și arce, nu un poligon.

   [dedus; formatele și bibliotecile le decide sonda de export]
6. **Avertismente, nu reparații.** O singură funcție de avertismente rulează după fiecare comandă și nu scrie nimic în document. Așa răspunde arhitectura la „nimic nu se micșorează singur” [măsurat în prototip; cerința e în `LECTII.md` §5.3].
7. **Invariante de testat din prima zi**, fiecare cu oracol pe hârtie și cu un sabotaj care o înroșește (M1–M6):
   - conținutul ramei nu-și schimbă mărimea;
   - inelul rămâne la distanța d;
   - așezarea pe rânduri și vărsarea pe foaia următoare;
   - oglindirea feței de jos;
   - Escape urcă pe niveluri.
8. **Adminul** (`BRIEF.md` §16.1) nu depinde de modelul planșelor; momentul lui se alege separat, în planul pe etape [dedus].

### Ce am inventat: decizii de știut înainte de încercare

Nu sunt decise de owner. Le-am ales ca prototipul să meargă, iar trei dintre ele (1, 2 și 3) îi cer explicit părerea:

1. **D: ce e „piesă” pe foaie.** Orice lucru pus direct pe foaie e, în spate, o piesă cu o singură instanță. Consecința: după ce apare nivelul 2, lista poate conține și gravuri, de exemplu „Text” sau „Dreptunghi”.
   - Alternativa: piesă e doar ce are contur de tăiere, iar restul aparține foii, ca în cazul „semnul este foaia”.
2. **D: Ctrl+D face o copie separată**, adică o piesă nouă, ca în A. Copiile legate se fac doar cu «Încă…».
   - Alternativa: Ctrl+D face încă o instanță.
3. **D: mărimea unei instanțe e mărimea piesei.** Mânerele unei instanțe cu surori sunt violet, iar banda spune „se schimbă toate cele N”.
   - Alternativa: blocarea mânerelor până intri în piesă.
4. **D: dublu-clic pe o instanță editează piesa** (toate instanțele). Surorile se conturează violet. «Desprinde» scoate una.
5. **Ancora.** Când pui un lucru în ramă (sau îl muți), ancora se alege din locul lui, după treimi: o margine sau centrul. Omul o poate schimba din panoul din dreapta; după aceea rămâne a lui.
6. **Așezarea pe rânduri:**
   - marginea 10 mm, distanța 10 mm, în ordinea din listă, fără rotire;
   - surplusul merge pe foaia următoare dacă e goală, altfel pe una nouă;
   - ce nu încape pe nicio foaie rămâne pe loc, cu mesaj.
7. **Fața de jos (D):**
   - întoarcere stânga↔dreapta, cu 2 știfturi de Ø8 pe axă, la 25 mm de margini;
   - vederea de jos e doar de privit;
   - spatele se lucrează din piesă, cu «Fața: Jos» activă: ce adaugi merge pe spate și apare punctat pe vederea de sus.
8. **A:** «Duplică planșa oglindit» face o copie fără legătură; știfturile se pun de mână.
9. **CSV:** acoladele din text marchează câmpul, de exemplu {nume}. A completează numele în copie; D îl ține pe instanță.
10. **Suprapunerea** se semnalează doar între lucruri cu contur de tăiere; gravurile de pe același semn se pot suprapune.
11. **Mărunțișuri:**
    - rotirea doar cu 90° și doar pe ce stă direct pe foaie;
    - lipirea la grilă: 5 mm pe foaie, 1 mm înăuntru;
    - când sunt mai multe obiecte sub cursor, clicul îl ia pe cel mai mic;
    - clicul în afara nivelului curent urcă doar până la nivelul comun;
    - dublu-clicul e detectat în 450 ms și 6 px, iar o tastă apăsată între clicuri îl anulează.

## 6. Riscuri și ce a rămas neprobat

- **Prototipul nu ține loc de judecata owner-ului.** Gesturile și conceptele sunt numărate pe drumul scris de mine, nu pe al lui.
  - La A, cele 26 de gesturi din scenariul 5 sunt drumul cinstit: 12 editări.
  - Un om ar putea ocoli: șterge 11 copii, multiplică și așază din nou. Asta înseamnă ≈ 8 gesturi, dar pierde pozițiile alese de el.
- **Unele lucruri nu sunt făcute** (le au la fel A și D, deci nu schimbă alegerea):
  - tragerea unui obiect în ramă sau afară din ea;
  - rotirea în interiorul pieselor;
  - text pe spate și editarea direct pe vederea de jos;
  - nesting (e v2), dale pentru piese mai mari decât foaia, ordinea de tăiere, exportul.
- **D are riscurile lui:**
  - lista de piese care se umple cu gravuri (decizia 1 din §5);
  - surpriza la Ctrl+D, dacă owner-ul așteaptă copii legate (decizia 2).
- **Scara nu e probată.** Prototipul redesenează tot SVG-ul la fiecare mișcare. Ajunge pentru 30 de plăcuțe, nu pentru mii de forme. Pânza reală o măsoară altă sondă.
- **Browserul.** Testul a rulat doar în Edge 154, fără fereastră.
  - Chromium-ul Playwright (chromium-1228) n-a pornit: Windows refuză să-l execute („Permission denied”), chiar și în afara sandbox-ului.
  - N-am rulat deci în Chrome, iar owner-ul ar trebui să încerce și acolo.
- **Notițele stau în browserul în care au fost scrise.** Pe alt calculator sau în alt browser nu se văd; de aceea există «Copiază notițele».
- **Telefonul.** Pagina nu se strică la 390 px, dar nu are ciupire pentru zoom; gesturile cu degetul sunt cele de bază.
- **Codul vechi.** Nu l-am citit și nu l-am copiat pentru sonda asta. Am lucrat doar din `LECTII.md`, `BRIEF.md` și rapoartele 14 și 15 din `docs/faza0`.

## 7. Cum se reproduce

**Comanda „măsoară”** (sub 15 s; are nevoie de Microsoft Edge):

```
cd C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s10-prototip-planse
node test-planse.mjs
```

- Tipărește tabelul de gesturi și concepte și scrie `rezultate.json`.
- Capturile ajung în `capturi/` din dosarul sondei. Cele din repo s-au făcut cu `SHOTS_DIR=<repo>/docs/faza2/prototip-planse/capturi`, apoi s-au comprimat cu `comprima.py`.

**Sabotajele** (≈ 1 minut): `node sabotaj.mjs`, din același dosar, scrie `sabotaje.json`.

**Dacă dosarul temporar a dispărut:**
1. copiază `docs/faza2/prototip-planse/cod/` într-un dosar din afara Drive-ului;
2. rulează `npm ci`, apoi `node test-planse.mjs`.

Testul găsește singur prototipul din repo; altă copie se indică prin `PROTO_DIR`.
