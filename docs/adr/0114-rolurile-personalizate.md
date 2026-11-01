# ADR 0114: Rolurile personalizate (felia 15.A↑)

**Starea:** acceptat pe 01.11.2026, la felia 15.A↑ (adusă din etapa 15: prima parte a rândului de prag „Șabloane de operații
(aceleași setări pe alt desen) și calcul în lot”), din cererea owner-ului din 31.10, cu alegerile recomandate („Rolurile, pe
implicite”: în browser, toate valorile, salvarea din panou cu lista ei, rolurile de bază întâi). **Completează:** ADR 0112
(rolul de tăiere din panou). **Schimbă:** ADR 0112 §3 (rolul arătat: și rolul personalizat) și „Ce am respins” din ADR 0112
(freza aleasă din panou): un rol personalizat aduce freza lui, cu regula numerelor de la §5.

**Problema.** Owner-ul: „vreau sa facem roluri de taiere customizabile”. Rolul din panou (ADR 0112) alege doar felul
tăieturii; valorile (freza, adâncimea, pasul, urechile, rampa, intrările, coborârea, strategia, frezele de rest, fundul plat)
se pun de fiecare dată, din panou și din fereastra exportului. Într-un atelier, aceleași tăieturi se repetă: decuparea plăcii
de 18 mm cu urechi, gravura cu V60 de 2 mm, buzunarul de 5 mm cu freza de rest. ArtCAM le ține ca șabloane de operații.

## Decizia

1. **Un rol personalizat** are un nume, un **rol de bază** (unul din cele opt ale ADR 0112) și **toate valorile operației**:
   tot ce ține o operație, în afară de id, fel, forme, latură și despărțirea foii (marcajul unei linii anume, ADR 0037 §2).
   Valorile se țin ca o operație-model, care trece de aceeași schemă ca operațiile documentului (`operatieInMargini`), cu
   câmpurile necunoscute păstrate, ca la schimbarea rolului. La exterior și interior, golurile au operația-model a lor, dacă
   valorile lor diferă de ale conturului de afară.
2. **Se salvează din panou:** „Salvează ca rol…” în secțiunea Tăierea, cu numele scris (propus din rol, freză și adâncime).
   Merge când piesele alese au același rol de bază recunoscut (ADR 0112 §3) și aceleași valori. Refuzurile au motivul lor:
   - piesele n-au un rol recunoscut (operații amestecate) sau au roluri ori valori diferite;
   - operațiile aceluiași fel ale unei piese au valori diferite (bucățile peste plafonul nodurilor pe operație);
   - numele e gol, are peste 40 de caractere sau e folosit (fără deosebire de majuscule);
   - aceleași valori sunt deja ale altui rol (se spune numele lui);
   - sunt deja 100 de roluri.
3. **Se păstrează în browser, pentru toate proiectele:** `localStorage`, cheia `cncvs2.roluri`, o listă cu versiunea ei
   (`v: 1`). Un rol citit care nu trece de verificare (§1) se sare, iar restul rămân. Un text stricat se ia drept listă goală;
   o listă cu altă versiune (a unei aplicații mai noi) nu se rescrie, iar panoul o spune. O altă filă vede schimbarea
   (evenimentul `storage`). Fără stocare (fereastră privată, date blocate, spațiul plin), rolurile țin cât fila, iar panoul
   o spune.
4. **În listă**, rolurile de bază rămân primele, iar dedesubt vine grupul „Rolurile mele”: doar rolurile al căror rol de bază
   se potrivește tuturor pieselor alese (ADR 0112 §3). Alegerea unuia înlocuiește operațiile pieselor alese într-un pas de
   anulare (`document.rol`): grupele rolului de bază (ADR 0112 §2), fiecare cu operația-model a rolului (golurile cu a lor,
   sau cu a conturului dacă rolul n-o are). O operație care rămâne una își păstrează id-ul. Valorile vin cum au fost
   salvate: freza și adâncimea vin împreună din rol, deci nu se mai aplică limita conului din ADR 0112 (precizarea 5.8↑c).
5. **Numerele frezelor:** fiecare freză a rolului, una după alta (a operației, a fundului plat, frezele de rest), își păstrează
   numărul salvat cât nicio altă freză din proiect (alt diametru sau altă formă) nu-l are. Altfel ia numărul unei freze
   identice din proiect sau, dacă nu e una, cel mai mic număr liber (ca ADR 0112 §5). Operațiile pieselor înlocuite nu se
   numără. Așa, numerotarea omului (T1 = Ø6) rămâne când se poate, iar exportul nu primește două freze sub același T
   (ADR 0084).
6. **Rolul arătat:** rolul personalizat, dacă operațiile piesei sunt exact cele pe care le-ar da el (grupele și valorile, fără
   numerele frezelor); altfel rolul de bază; altfel „—”. O valoare schimbată după aceea (adâncimea din panou, un câmp din
   export) arată rolul de bază.
7. **Lista „Rolurile mele (N)”**, sub câmpurile Tăierii: fiecare rând are numele, rolul de bază, „Redenumește” și „Șterge”
   (cu întrebarea „Piesele își păstrează operațiile”). Piesele nu țin legătura cu rolul, pentru că valorile se copiază. O
   piesă cu un rol șters sau redenumit rămâne cum era și arată rolul de bază, respectiv numele nou.
8. **Fila care doar citește:** salvarea, redenumirea și ștergerea merg, pentru că nu scriu proiectul. Alegerea rolului e
   oprită, ca la ADR 0112 §9.

## Probele

- **Pe hârtie** (`test/unit/rolPersonal.test.ts`):
  - rolul salvat dintr-un dreptunghi și dintr-o literă cu gol (golul cu valorile lui, sau fără, când sunt aceleași);
  - refuzurile salvării;
  - rolul aplicat pe alt contur și pe o literă, cu id-ul păstrat;
  - numerele frezelor: păstrat, luat de o freză identică, cel mai mic liber, două freze ale rolului cu același număr,
    piesele înlocuite ocolite;
  - rolul recunoscut înapoi după renumerotare, dar nu după o adâncime schimbată;
  - verificarea unui rol citit, lista stricată și cea cu altă versiune;
  - numele (gol, lung, folosit, cu alte majuscule), aceleași valori, plafonul;
  - fiecare operație dată trece de schema documentului.
- **Stocarea** (`test/unit/roluriMele.test.ts`, cu un depozit fals):
  - drumul dus-întors;
  - depozitul care aruncă la citire sau la scriere (rolurile țin în memorie, iar starea o spune);
  - lista unei versiuni noi, care nu se rescrie;
  - recitirea după schimbarea din altă filă.
- **Acțiunea** (`test/unit/actiuni.rol.test.ts`): rolul personalizat într-un pas de anulare, două piese cu aceleași numere de
  freză, refuzul când rolul de bază nu se potrivește.
- **E2e** (Edge, `test/e2e/rolPersonal.spec.ts`):
  - dreptunghiul cu adâncimea și pasul din panou se salvează ca rol;
  - un cerc primește rolul (fereastra exportului arată valorile), iar rolul rămâne după reîncărcarea paginii;
  - numele folosit e refuzat, cu motivul;
  - redenumirea se vede în listă și pe piesă;
  - după ștergere (cu întrebarea), cercul arată rolul de bază, iar lista dispare.

## Ce am respins

- **Rolurile în proiect** (ar pleca odată cu fișierul): fiecare proiect nou ar porni fără ele. Owner-ul a ales browserul.
- **Doar rolul, freza, adâncimea și pasul:** owner-ul a ales toate valorile.
- **O fereastră separată „Roluri”:** lista din panou e lângă locul unde se folosește.
- **Legătura piesei cu rolul** (rolul schimbat schimbă piesele): ar cere un câmp nou în document, cu schemă și migrare, plus o
  regulă pentru piesele schimbate de mână după aceea. Rolul se copiază, ca șabloanele de operații din ArtCAM.
- **Exportul și importul rolurilor ca fișier:** necerut acum.

## Limite

- Rolurile stau în browserul acesta. Pe alt calculator, în alt browser sau pe adresa live față de cea de test, lista e alta.
  Ștergerea datelor site-ului le șterge.
- Lista se gestionează doar cu o formă aleasă (secțiunea Tăierea).
- Calculul în lot, a doua parte a rândului de prag, rămâne pentru etapa 15.

## Se redeschide dacă

- owner-ul vrea rolurile în proiect sau în cont (sincronizate, cu conturile din etapa 14);
- owner-ul vrea legătura piesei cu rolul, sau exportul rolurilor ca fișier.
