# ADR 0172 — Banda îngustă din jurul dopului în V și decuparea lui

**Starea:** acceptat pe 07.11.2026. Owner-ul a răspuns la cele șase întrebări: „ca de obicei, vreau cat mai multe optiuni pe
care userul sa le poata alege”. Propus tot pe 07.11, în linia incrustațiilor (worktree-ul `incrustatii`, ramura
`wip/12.1-incrustatii`). Felia 12.1↑c, după pereții drepți (12.1↑b, ADR 0171), fără mașină. Cererea owner-ului: „Da, 12.1↑c”,
după răspunsul 2 din ADR 0170 („vreau sa pot alege intre optiuni atuci cand fac exportul”: fața coborâtă sau banda îngustă,
alese la export; banda „se decupează de mână acum, apoi de aplicație, cu punți”). **Documentul:** v22. **Schița:**
<https://claude.ai/artifact/6ykTvBaNppvWvQSX6EfSNk> (cinci planșe: fereastra exportului, la zi cu răspunsurile; dopul în
secțiune; așezarea; fața coborâtă sau banda; întrebările), la scară, din exemplul de mai jos.

**Ce au schimbat răspunsurile** (față de propunerea de mai jos, care rămâne valabilă în rest): la fiecare întrebare, omul
alege în fereastra exportului, iar recomandarea devine valoarea implicită.
- **1, lățimea benzii:** cea calculată e cea mai mică și e implicită; un câmp o poate lărgi (`latime`; lipsă = cea calculată).
  Mai îngustă decât cea mai mică, refuzată cu motivul. Cea mai mică ține și de freza decupării: M = 2·H·t + max(Ø fundului
  plat, Ø decupării) + 2c, ca fundul plat să încapă freza lui, iar tăietura să stea pe el.
- **2, decuparea:** o bifă, pusă implicit (`decupare`). Fără ea rămâne doar banda, iar dopul îl tai tu cu fierăstrăul, în
  șanț; atunci placa are „cel puțin” S + H + 1, ca la fața coborâtă.
- **3, grosimea plăcii dopului:** un câmp (`grosimePlaca`), implicit S + H + 1; cu decuparea, cel puțin S + H + grosimea
  punților.
- **4, freza decupării:** implicit freza dreaptă a fundului plat; la cerere, alta, aleasă în fereastră (`freza`, cu numărul și
  diametrul ei).
- **5, punțile:** câte pe buclă, cât de late și cât de groase, în fereastră (`punti`), implicit 4, 4 mm și 1 mm; palierul pe
  traseu e lățimea plus freza, ca la 12.1↑b.
- **6, plafonul:** fără răspuns anume; citit ca acceptat din „cat mai multe optiuni” (mai multe opțiuni cer mai mult cod).
  Linia trece de ~10 kB, iar totalul rămâne sub 550. Dacă vrei altfel, se reface.
- **Documentul v22:** câmpul opțional `banda` în incrustația în V: `{ latime?, decupare, grosimePlaca, freza?, punti }`, scris
  doar cu `jurDop: 'banda'`. Migrarea v21 → v22 schimbă doar numărul; un v21 cu `banda` în incrustație e o ciocnire. Oracolul
  documentului și corpusul de aur trec la v22.

## Problema

Dopul în V (ADR 0170) se taie azi cu fața coborâtă toată (`jurDop: 'fata'`): freza dreaptă scoate tot lemnul din jurul
dopului, până dincolo de marginile semifabricatului. Semifabricatul se prinde deci fără cleme pe margini, iar spatele lui se
taie cu fierăstrăul după lipire. Răspunsul 2 din ADR 0170 a cerut și cealaltă cale, aleasă la export (`jurDop: 'banda'`, până
acum refuzat): doar o bandă îngustă în jurul dopului, săpată cu V-ul, apoi dopul decupat din placă de aplicație, cu punți.
Trebuie hotărâte:

- cât de lată e banda și ce rămâne în ea, ca dopul așezat să lase tot H între plăci și g sub el;
- pe unde se decupează, cu ce freză și cu ce punți;
- cât de adânc: prin toată placa, deci grosimea ei trebuie știută, iar un câmp nou în document înseamnă v22.

## Ce am aflat

- **Ediția întâi** (referință, nu șablon: `CNCVectorStudio/src/cam/inlay.ts`, ramura `wip/inlay-traseu-decupare`, `f4732ff`,
  neterminată):
  - limita automată la D·t + 2 mm de dop, iar dopul săpat cu V-ul între limită și desen;
  - decuparea cu freza cilindrică, prin placă, cu punți, pe un contur la e de dop;
  - trei condiții, pe hârtie: peretele dopului rămâne întreg (tăietura stă la cel puțin c de contur); niciun lemn păstrat
    dincolo de linia cea mai adâncă a șanțului (altfel lovește placa la așezare); vârful punților rămâne pe partea care se
    rindeluiește;
  - recenzia ei (28.09.2026): prin placă la export, nu cu grosimea înghețată; cele două freze alese în fereastră; punțile pe
    măsura buclei.
- **La noi**, dopul în V e deja un V-carve cu adâncimea de start S pe o regiune (semifabricatul lărgit, cu desenul oglindit ca
  insule), cu fundul plat al frezei drepte. Banda e aceeași lucrare pe o regiune mai mică: desenul oglindit lărgit cu M, fără
  desen. Decuparea e un profil exterior cu punți, ca la dopul decupat cu pereți drepți (12.1↑b: palierul punții e lățimea
  plus freza, placa are grosimea exactă).
- **Pe hârtie** (x = distanța în afara conturului oglindit; t = tan(θ/2); r = raza frezei drepte; c = 0,5 mm, rezerva):
  - V-ul sapă banda de la S (pe contur) până la S + H (la x = H·t); de acolo, fundul plat la S + H, cu freza dreaptă, până la
    M − H·t; pe marginea benzii, peretele urcă iar la S (x = M), iar la fața plăcii șanțul ajunge până la M + S·t;
  - decuparea: freza dreaptă merge pe offsetul conturului cu e + r, unde e = H·t + c. Piesa păstrată ajunge până la x = e,
    deci stă toată pe peretele de sub umăr (0 < x < H·t, care după așezare rămâne deasupra plăcii) sau pe fund (S + H). Așezată,
    nimic din ea nu coboară sub fața plăcii, iar între plăci rămâne H;
  - ca tăietura să stea toată pe fundul plat: M = 2·H·t + 2r + 2c. Și într-un unghi intrând al desenului, unde freza nu
    intră, piesa păstrată ajunge cel mult la e + r, tot pe fund;
  - punțile rămân la fundul plăcii, pe piesa păstrată: după așezare stau deasupra plăcii și se rindeluiesc odată cu restul
    plăcii dopului. Placa trebuie să aibă cel puțin S + H + 1 (grosimea punții);
  - **exemplul de lucru** (cercul R15 din proba 12.1↑: V60, D 3, g 0,5, H 2, freza dreaptă Ø3,175): H·t = 1,155; M = 6,484;
    fundul plat de la 1,155 la 5,330; tăietura între 1,655 și 4,830 de contur; piesa păstrată, cu raza 16,655. Semifabricatul
    are 55,9 × 55,9 (față de 40 × 40 cu fața coborâtă), iar placa, cel puțin 5,5. Așezat, dopul intră 2,5, sub el rămâne 0,5,
    iar fundul benzii stă la 2 peste placă.
- **Ce câștigă banda:** semifabricatul se prinde cu cleme pe margini (marginile rămân întregi), iar freza dreaptă scoate doar
  banda, nu toată fața. **Ce pierde:** semifabricatul e mai mare (banda plus marginea), iar placa dopului trebuie să aibă
  grosimea cunoscută, fiindcă tăietura trece prin ea.

## Decizia (propusă, cu recomandările întrebărilor)

1. **Banda** (`jurDop: 'banda'`, deja în documentul v20): regiunea dopului e desenul oglindit lărgit cu M = 2·H·t + 2r + 2c,
   fără desen; restul e lucrarea de azi (V-ul cu adâncimea de start S, fundul plat cu freza dreaptă, frezele de rest). Lățimea
   o calculează aplicația și o arată.
2. **Decuparea:** un profil exterior pe offsetul desenului oglindit cu e = H·t + c (golurile desenului nu se decupează), cu
   freza dreaptă a fundului plat, prin toată placa, cu 4 punți pe buclă, late de 4 mm și groase de 1 mm (palierul e lățimea
   plus freza, ca la 12.1↑b).
3. **Grosimea plăcii dopului:** un câmp nou în `incrustatie` (`grosimePlaca`), cel puțin S + H + 1, implicit S + H + 1.
   Documentul v22: migrarea v21 → v22 schimbă doar numărul, un v21 cu `grosimePlaca` e o ciocnire, iar oracolul documentului și
   corpusul de aur trec la v22.
4. **Semifabricatul:** cutia desenului, cu M + S·t + `margine` pe fiecare parte (marginea rămâne lemnul din afara șanțului,
   pentru cleme); fereastra arată placa „groasă de exact T”, ca la dopul decupat cu pereți drepți.
5. **Interfața:** în fereastra exportului, pe rândul incrustației în V, „Lemnul din jurul dopului”: fața coborâtă sau banda
   îngustă, cu decupare; cu banda, grosimea plăcii. În panou, „Pe hârtie” arată și lățimea benzii și placa.
6. **Probele, scrise întâi:** oracolul potrivirii (`test/oracles/incrustatie.ts`) primește decuparea. Piesa păstrată (punțile
   rupte), întoarsă și așezată, trebuie să lase g sub dop și H între plăci și să nu atingă placa în afara locașului, cu
   pereții în contact ca azi.
   - cazurile pe hârtie: cercul, steaua, L-ul, litera cu gol;
   - controlul negativ: o decupare care taie peretele dopului (x < H·t) sau care lasă lemn dincolo de fundul plat trebuie să
     pice;
   - punțile, citite pe program, ca la 12.1↑b.
7. **Felia 12.1↑c:** v22 (dacă 3a), banda, decuparea, fereastra, panoul, oracolul, manualul. Estimarea: ~5 h (12.1↑b a cerut
   4 h 36 min de cod, cu otrăvurile și unirea lui `main`).

   Plafonul: linia e la +9,9 kB din ~10 (12.1↑ +4,3, 12.1↑b +5,6); banda și decuparea mai cer ~2–3 kB (întrebarea 6).

## Ce am respins

- **Decuparea pe linia cea mai adâncă a unui șanț fără fund plat** (ediția întâi): cu V-ul singur, adâncimea benzii depinde
  de lățimea ei, iar piesa păstrată trebuie să încapă în jumătatea benzii. Cu fundul plat, tot ce rămâne pe piesă stă la S + H,
  deci H e exact pe toată lățimea.
- **Decuparea până la S + H + 1, oricare ar fi placa:** o placă mai groasă n-ar fi tăiată până jos, iar una mai subțire ar
  rămâne cu punțile prea subțiri sau fără ele.
- **Banda fără decupare, mereu:** e calea ediției întâi, cu fierăstrăul de mână în șanț. Rămâne ca răspuns, dacă nu vrei
  decuparea (întrebarea 2).

## Ce impune

- Fereastra exportului alege lemnul din jurul dopului (până acum, cel din document).
- Un dop cu bandă are placa de grosime exactă; cu fața coborâtă, „cel puțin”, ca azi.
- Fiecare buton nou are capitolul lui în manual, în ambele limbi.

**Se redeschide dacă:** vin foile multiple (etapa 11), când dopurile cu bandă se pot așeza mai multe pe o placă, ca piese. Sau
placa 12 arată altă așezare decât simularea.

## La implementare (felia 12.1↑c)

- **Decuparea merge pe linie**, pe reuniunea exterioarelor desenului oglindit lărgite cu e + r, nu ca profil exterior pe
  fiecare buclă lărgită cu e. Pe o buclă singură e aceeași tăietură; cu litere apropiate (două bucle la mai puțin de Ø una de
  alta), profilul fiecăreia ar fi tăiat în piesa păstrată a celeilalte, până în peretele dopului. Pe linie, fiecare punct al
  tăieturii stă la cel puțin e de orice parte a desenului, iar piesa păstrată ajunge cel mult la e + r, pe fundul plat.
- **Golurile reuniunii se taie afară, pe linie, fără punți:** desenul din bucăți separate care închid un loc (rama din patru
  bare, în proba benzii) lasă la mijloc lemn de la fața plăcii, mai departe de M; rămas în dop, s-ar opri pe placă. Golurile
  literelor nu se taie (sunt în bandă, la S + H, ca la fața coborâtă).
- **Freza decupării lărgește banda doar cu decuparea;** fără ea, nu taie nimic și nici nu se judecă.
- **Valorile cele mai mici** (lățimea benzii, placa) se arată rotunjite în sus la 0,001 mm, ca numărul arătat, scris înapoi,
  să fie primit.
- **Punțile lucrării au rampe:** pe oracol, palierul fiecăreia iese 1,1–1,2 din lățimea cerută, iar între rampe tăietura trece
  prin placă (26–51 % din inelul tăieturii, pe cele șase cazuri pe hârtie).
- Dopul în V s-a mutat în `src/cam/dopV.ts` (ca dopul cu pereți drepți, în `dopDrept.ts`): el cere lucrarea foii pentru
  decupare, iar lucrarea cere refuzul incrustației, care rămâne în `incrustatie.ts` (fără ciclu).

## Întrebările (recomandarea întâi)

1. **Lățimea benzii:**
   - **a)** calculată de aplicație (cât trebuie pentru pereți, fundul plat și tăietură: 6,5 mm în exemplu) și arătată;
   - b) un câmp, cel puțin cât cea calculată.
2. **Decuparea:**
   - **a)** mereu, cu banda: aplicația decupează dopul, cu punți;
   - b) o bifă: fără ea, banda rămâne, iar dopul îl tai tu cu fierăstrăul, în șanț.
3. **Grosimea plăcii dopului** (decuparea trece prin ea):
   - **a)** un câmp în fereastra exportului, ținut în proiect (documentul v22), implicit S + H + 1;
   - b) mereu S + H + 1: placa se rindeluiește la ea înainte, fără câmp nou în document.
4. **Freza decupării:**
   - **a)** freza dreaptă a fundului plat (aceeași care scoate fundul benzii);
   - b) o freză a ei, aleasă în fereastră.
5. **Punțile:**
   - **a)** 4 pe buclă, late de 4 mm, groase de 1 mm, ca la dopul decupat cu pereți drepți;
   - b) alese în fereastră (câte, cât de late, cât de groase).
6. **Plafonul liniei** (+9,9 kB din ~10; banda cu decuparea mai cere ~2–3 kB, iar totalul rămâne sub 550):
   - **a)** da, linia trece la ~13 kB;
   - b) întâi economii în codul liniei, apoi banda.
