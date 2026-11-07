# ADR 0170 — Incrustațiile: perechea în document și incrustația în V

**Starea:** acceptat pe 07.11.2026, cu răspunsurile owner-ului la cele șase întrebări: „1a; 2 - vreau sa pot alege intre
optiuni atuci cand fac exportul; 3 - la fel ca la 2 - vreau sa am ambele optiuni; 4a+b; 5a; 6 - si a si b”. Propus pe 06.11, în
linia incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`). Felia 12.1↑, adusă din etapa 12, fără mașină.
Cererea owner-ului: „vreau sa deschidem worktrees pentru alte etape sau felii”, apoi alegerea liniei „Inlays, stage 12”.
**Rândul din prag:** „Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`). **Documentul:** v20. Pereții drepți și treptele primesc ADR-ul lor (0171), la felia lor.
**Schița:** <https://claude.ai/artifact/GKxS4iWgdjLghybs2FYxPK> (cinci planșe: panoul, exportul, potrivirea pe hârtie, dopul
în vederea 3D, întrebările), la zi cu răspunsurile.

**Ce au schimbat răspunsurile** (față de propunerea de mai jos, care rămâne valabilă în rest):
- **2 și 3, alese la export:** lemnul din jurul dopului are ambele feluri, `jurDop: 'fata' | 'banda'` în `incrustatie` (fața
  coborâtă toată, cu freza dreaptă; sau banda îngustă, săpată cu V-ul, apoi decuparea). Jocurile au două valori, iar fereastra
  exportului are bifa „Același spațiu pentru clei și fierăstrău”, care le ține egale; documentul păstrează mereu ambele numere.
- **4, ambele:** fundul plat cu freza dreaptă (`fundPlat`), sau doar cu freza V, prin inele dese. Alegerea e chiar freza din
  coloana Fund plat: fără freză dreaptă, pe o incrustație, fundul îl scoate V-ul (creasta cel mult g/2 în locaș și H/2 pe fața
  dopului), nu rămâne netăiat ca la un V-carve obișnuit.
- **6, amândouă tehnicile, devreme:** pereții drepți vin imediat după nucleul V-ului, înaintea opțiunilor lui. Ordinea feliilor:
  12.1↑ (nucleul V: v20, adâncimea de start, dopul cu fața coborâtă, oracolul potrivirii, rolul, exportul cu două fișiere și
  bifa jocurilor); 12.1↑b (pereții drepți: buzunarul și dopul, ADR 0171); 12.1↑c (banda îngustă și decuparea dopului, cu
  punți); 12.1↑d (fundul doar cu V); 12.1↑e (dopul în vederea 3D și potrivirea simulată); 12.1↑f (gaura și treptele); fișa
  plăcii 12. Până la felia lor, `jurDop: 'banda'` și fundul doar cu V se refuză cu motivul și cu felia care le aduce.

**Problema.** O incrustație pune o piesă dintr-un alt lemn (dopul) într-o cavitate (locașul) tăiată după același desen. În
ediția întâi, „dopul” a fost 3,5 luni o a doua cavitate: 612 din 616 mișcări cădeau în interiorul conturului, iar dopul umplea
0 % din locaș; testul judeca structura („e oglinda?”), nu lemnul (`LECTII.md` §1). `PLAN.md` §3.1 cere ca perechea să fie
**declarată** în document, nu ghicită, iar §4.1 cere oracolul potrivirii înaintea funcției. Azi, cvs2 are V-carve-ul pe distanța
exactă (ADR 0090), fundul plat cu freza dreaptă (0091), simularea și oracolul ei (0047, 0057), joburile cu mai multe freze și
fișierele separate (0084). Nu are adâncimea de start a unui V-carve, iar aplicația arată o singură foaie (foile multiple sunt
etapa 11).

## Ce am aflat (cercetarea din 06.11)

- **Fizica, pe hârtie.** Freza în V ascuțită are unghiul inclus θ, cu t = tan(θ/2); d e distanța exactă de la un punct la
  conturul desenului; D e adâncimea locașului, g jocul pentru clei, H spațiul pentru fierăstrău, S = D − g.
  - Locașul e săpat la adâncimea min(D, d/t) în desen. Fundul e plat la D, unde d ≥ D·t.
  - Dopul e desenul oglindit, săpat ca și cum fața lui ar fi cu S mai jos: în conturul lui, la max(0, S − d/t); în afara
    lui, la min(S + H, S + d/t).
  - Întors și coborât, dopul se oprește la S: unde d/t ≤ S, suma celor două adâncimi e exact S. Pereții se ating pe o
    bandă lată de S·t de la contur spre interior. Sub dop rămâne jocul g, unde d ≥ D·t. Între plăci rămâne H. O trăsătură
    îngustă (d/t ≤ S peste tot) umple șanțul fără joc.
  - **Exemplul de lucru:** V60 Ø6 (t = 0,5774; conul are 3 / t = 5,196 mm), D = 3, g = 0,5, H = 2. Rezultă S = 2,5, contactul
    pe 1,443 mm de la contur, fundul plat de la 1,732 mm, dopul săpat până la 4,5 mm (sub con).
  - **Criteriul din prag (DeskProto):** V90, adâncimea 4, „spațiul” 1. Desenul dopului e coborât cu 3, pereții se suprapun pe
    3,0 mm, iar fierăstrăul și cleiul au câte 1,0 mm (± 0,05). În modelul de mai sus: D = 4, g = H = 1.
- **Ce strică potrivirea** (măsurat în ediția întâi, cu oracolul ei fizic; pe 10 forme × 2 unghiuri, dopul ajungea la cel mult
  0,045 mm de umăr):
  - conul prea scurt pentru adâncime: tija taie pereți drepți, iar dopul stă cu 0,90 mm mai sus;
  - crestele fundului mai înalte decât jocul;
  - formele care se ating: o creastă pe muchia comună, iar dopul stă la 1,788 în loc de 2,5;
  - alte freze pe cele două jumătăți: dopul cu 1,025 mm mai sus.

  Pe hârtie, la noi: o freză cu vârf plat de rază a lasă fundul șanțurilor înguste cu a/t mai sus, deci dopul s-ar opri pe el.
- **ArtCAM și DeskProto** (documentația lor, din `CERCETARE-DETALIATA.json`, `ref`). În V, dopul se taie cu desenul oglindit
  și coborât, iar materialul din jurul lui se scoate până la marginea semifabricatului. ArtCAM are și incrustațiile cu pereți
  drepți (buzunar, gaură, în trepte, dopul), cu jocul și colțurile potrivite între ele.
- **Ediția întâi** (referință, nu șablon: `CNCVectorStudio/src/cam/inlay.ts`, ramura `wip/inlay-traseu-decupare`):
  - o limită automată în jurul dopului, adică o bandă îngustă săpată cu V-ul;
  - jocul implicit 0,5 mm și aceeași freză V pe ambele jumătăți;
  - dopul și limita grupate;
  - decuparea dopului pe linia cea mai adâncă a benzii, neterminată.

  Perechea era recunoscută din vectori (`clipToId` și grupul), deci se putea rupe: de aici avertismentul `inlayBoundaryTooClose`.

## Decizia (propusă, cu recomandările întrebărilor)

1. **Perechea în document (v20).** Câmpul opțional `incrustatie: { fel: 'v', joc, fierastrau, margine, jurDop }` stă pe operația
   V-carve: operația e locașul și își declară dopul.
   - Dopul nu se desenează și nu se ține separat: se calculează la fiecare export din aceleași contururi, oglindite. Așa nu
     poate rămâne în urma desenului.
   - **Contractul ușii:** un obiect deschis (câmpurile necunoscute rămân), pe orice fel de operație (refuzurile lui, pe alt
     fel sau cu altă freză, sunt ale lucrării, ca la celelalte câmpuri); `fel` = `'v'`; `joc` și `fierastrau`, numere finite în
     (0, 1 000] mm (plafonul adâncimii unei operații); `margine`, număr finit în [0, 10 000] mm (plafonul laturii); `jurDop`,
     `'fata'` sau `'banda'`. Toate cinci sunt cerute.
   - Migrarea v19 → v20 schimbă doar numărul. Un document v19 cu un câmp propriu `incrustatie` pe o operație e refuzat.
   - Oracolul documentului trece la v20 (`CAMPURI_NOI_O`, `problemeOperatieO`, frontierele pe hârtie), iar corpusul de aur
     primește adăugirea versiunii 20 (ADR 0121).
2. **Locașul** e V-carve-ul de azi: adâncimea D, freza V și fundul plat (ADR 0091) unde desenul e mai lat decât 2·D·t.
3. **Dopul** e un program separat, pe semifabricatul lui.
   - Desenul se oglindește pe X: dopul se întoarce ca o pagină.
   - Semifabricatul e cutia desenului oglindit, cu `margine` (implicit 5 mm) pe fiecare parte. Originea e în colțul ales în
     fereastra exportului (implicit stânga-jos), iar Z0 e mereu pe fața semifabricatului.
   - Fața semifabricatului se coboară la S + H în jurul dopului, cu freza dreaptă. Pereții dopului îi taie freza V, cu
     adâncimea de start S: V-carve-ul primește adâncimea de start și sapă la min(S + H, S + d/t).
   - Un fișier pe dop (`…-dop-N.nc`), cu schimbarea sculei aleasă în fereastră.
4. **Refuzurile, cu motivul,** judecate de lucrare înainte de export:
   - D peste înălțimea conului, sau S + H peste ea;
   - g sub 0,1 mm (de două ori creasta inelelor din colțuri, 0,05) sau cel puțin cât D;
   - o freză V cu vârf plat;
   - o zonă lată a locașului fără freză dreaptă, sau dopul fără ea;
   - contururile deschise (ca la orice V-carve).
5. **Interfața:**
   - rolul „Incrustație în V”, în secțiunea Tăierea a panoului și în lista Tăietura din fereastra exportului;
   - sub adâncime: jocul pentru clei, spațiul pentru fierăstrău și marginea dopului, cu secțiunea pe hârtie alături (cât
     intră dopul, contactul, jocurile, conul folosit);
   - în fereastra exportului, rândul dopului: semifabricatul (W × L, gros de cel puțin S + H + 1 mm), originea, Z0 și fișierul;
   - în vederea 3D, „Foaia / Dopul N” (felia 12.1↑b).
6. **Probele, scrise întâi:**
   - V-carve-ul cu adâncimea de start, pe oracolul simulării, față de suprafața ideală min(S + H, S + d/t);
   - **oracolul potrivirii** (`test/oracles/incrustatie.ts`, zero importuri din `src/`):
     - citește textul celor două programe și le simulează cu oracolul simulării, pe sculă;
     - întoarce dopul după contractul de la punctul 3, îl coboară până la primul contact și măsoară;
     - cere: oprirea la S ± 0,05, jocul de sub dop g ± 0,05, pereții în contact pe cel puțin 95 % din bandă, spațiul dintre
       plăci H ± 0,05;
     - cazurile pe hârtie: dreptunghiul, cercul, steaua, o literă cu gol, o trăsătură îngustă (fără fund plat), exemplul
       DeskProto;
     - controlul negativ: un dop tăiat ca a doua cavitate (defectul din ediția întâi) trebuie să pice;
   - otrăvurile țintite (`test/otravuri/12.1.py`): adâncimea de start ± 0,02, oglinda pe altă axă, jocul neaplicat, originea
     semifabricatului mutată, freza dreaptă prea aproape de pereți.
7. **Feliile:**
   - 12.1↑: locașul și dopul în V, documentul v20, oracolul potrivirii, rolul și exportul. Estimarea: ~5 h, după cele
     măsurate la 8.1↑ (2,2 h), 8.2↑ (1,4 h) și 5.9↑ (4 h);
   - 12.1↑b: dopul în vederea 3D și potrivirea simulată, arătată lângă valorile pe hârtie;
   - 12.1↑c: decuparea dopului, dacă întrebarea 2 alege banda;
   - 12.1↑d: pereții drepți, buzunarul și dopul (ADR 0171);
   - 12.1↑e: gaura și treptele;
   - fișa plăcii 12 („dopul intră; jocul pe linia de lipire”).

   Plafonul total e comun cu celelalte linii: linia ține sub ~10 kB în plus.

## Ce am respins

- **Dopul ca vectori copiați lângă locaș** (ediția întâi): două autorități pentru același desen, iar perechea se rupe la
  degrupare sau la editare.
- **Dopul ca piesă pe o foaie a lui, acum:** cere foile multiple (etapa 11) aduse înainte. Rămâne drumul pentru când vin foile.
- **Un tip nou de operație (`tip: 'incrustatie'`):** locașul e un V-carve întreg (gruparea, fundul plat, frezele de rest,
  ordinea), deci un câmp pe V-carve le moștenește pe toate. Pereții drepți vor pune același câmp pe buzunar și pe profilul
  interior.

## Ce impune

- Un V-carve cu `incrustatie` nu se unește cu unul fără ea: cheia din `valoriVcarve` o cuprinde.
- Probele care țin versiunea curentă trec pe v20 (`schema: 19` și porțile `<= 19` din oracolele CAM).
- Fiecare buton nou are capitolul lui în manual, în ambele limbi.

**Se redeschide dacă:** vin foile multiple (etapa 11): dopul poate deveni o așezare pe foaia lui, cu mai multe dopuri pe o
placă, prin migrarea lui `incrustatie`. Sau placa 12 arată altă potrivire decât simularea.

## Întrebările (recomandarea întâi) și răspunsurile din 07.11

1. **Unde se taie dopul?**
   - **a)** calculat din desen, de aceeași operație: locașul rămâne în programul foii, dopul are fișierul lui, pe un
     semifabricat separat (XY0 în colțul lui, Z0 pe fața lui) și nu se poate desincroniza de locaș;
   - b) ca piesă pe o foaie a lui, mutată de tine (cere foile multiple din etapa 11, aduse înainte);
   - c) lângă locaș, pe aceeași foaie, ca în ediția întâi.
2. **Ce se întâmplă cu lemnul din jurul dopului?**
   - **a)** fața semifabricatului se coboară toată, cu freza dreaptă: lipești semifabricatul întreg, apoi tai spatele cu
     fierăstrăul în spațiul lăsat sau îl rindeluiești;
   - b) doar o bandă îngustă, săpată cu freza V (ca în ediția întâi); dopul se decupează de mână acum, apoi de aplicație, cu
     punți (felia 12.1↑c).
3. **Jocurile:**
   - **a)** două valori: jocul pentru clei (implicit 0,5 mm) și spațiul pentru fierăstrău (implicit 2 mm, cât încape în con);
   - b) o singură valoare pentru amândouă, ca la DeskProto.
4. **Fundul plat** (zonele late ale locașului și fața dopului):
   - **a)** cu freza dreaptă, cerută doar unde trebuie; fără ea, refuz cu motivul;
   - b) și doar cu freza V, prin inele dese: mai lent, pentru cine n-are freză dreaptă.
5. **Unde alegi incrustația?**
   - **a)** un rol nou în secțiunea Tăierea a panoului și în lista Tăietura din fereastra exportului, cu jocurile sub adâncime;
   - b) un buton și o fereastră separată, ca în ediția întâi.
6. **Ordinea feliilor:**
   - **a)** întâi V-ul (12.1↑, apoi dopul în 3D și decuparea, dacă e cazul), apoi pereții drepți, apoi gaura și treptele;
   - b) întâi pereții drepți.

**Răspunsurile (07.11):** 1, a. 2, „vreau sa pot alege intre optiuni atuci cand fac exportul”: ambele, alese în fereastra
exportului. 3, „la fel ca la 2 - vreau sa am ambele optiuni”: două valori, cu bifa care le ține egale. 4, a și b. 5, a. 6, „si a
si b”: amândouă tehnicile, cu pereții drepți imediat după nucleul V-ului (ordinea din „Ce au schimbat răspunsurile”).
