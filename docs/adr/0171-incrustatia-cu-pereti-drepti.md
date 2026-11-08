# ADR 0171 — Incrustația cu pereți drepți: locașul și dopul cu aceeași freză, colțurile potrivite

**Starea:** acceptat pe 07.11.2026. Owner-ul a întrebat „cate dintre ele pot fi puse impreuna ca optiuni puse la dispozitia
utilizatorului?”, apoi a răspuns „Da, toate trei” la propunerea de a le pune pe toate trei (1, 2 și 4) în felie. Propus tot pe
07.11, în linia incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`). Felia 12.1↑b, după nucleul V (12.1↑,
ADR 0170), fără mașină. Cererea owner-ului: „Da, 12.1↑b”, după răspunsul 6 din ADR 0170 („si a si b”: amândouă tehnicile,
pereții drepți imediat după nucleul V).

**Ce au schimbat răspunsurile** (față de propunerea de mai jos, care rămâne valabilă în rest):
- **1, 2 și 4, alese la export:**
  - dopul ridicat pe semifabricatul lui sau decupat prin toată placa, cu punți (`dop: 'ridicat' | 'decupat'`);
  - sprijinul pe fund sau pe față (`sprijin`), doar la dopul ridicat (cel decupat stă mereu pe fund);
  - frezele dopului, implicit aceleași ca ale locașului, sau ale lui (`frezeDop`).
- **Frezele dopului pot fi oricare:** locașul se închide cu raza celei mai mici freze a dopului minus jocul (nu a locașului),
  deci unghiurile dopului au exact raza frezei lui. Condiția „cel mult cât cea mai mică a locașului” nu mai e necesară.
- **Dopul decupat:** desenul neoglindit (intră în locaș fără întoarcere), tăiat ca exterior, cu punți, prin placa lui de
  grosime D + H; partea care iese peste placă (H) se rindeluiește. Câmpul `fierastrau` ține deci H în ambele feluri: ce rămâne
  peste placă, de tăiat sau de rindeluit.
- **3, 5 și 6:** recomandările (colțurile potrivite de aplicație, jocul lateral implicit 0,1 mm, rolul nou). Răspunsul a fost
  la întrebarea despre opțiuni: 3 și 6 nu sunt opțiuni utile, iar 5 e doar o valoare implicită, pe care o schimbi oricând.
- **Cât se retrage cel mai ascuțit vârf** apare în fereastra exportului, după calcul (o calculează lucrarea, din contururi),
  nu în panou. În panou rămân razele, jocul, înălțimea dopului și grosimea semifabricatului.
**Rândul din prag:** „Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`). **Criteriul din prag, pentru pereții drepți:** steaua cu 5 colțuri, freza Ø3, adâncimea 6,
jocul 0,1; dopul simulat și oglindit intră în cavitate cu 0,10 mm joc (± 0,02) pe tot conturul. **Documentul:** v21. Gaura
și treptele vin în felia 12.1↑f.
**Schița:** <https://claude.ai/artifact/5cfiGBoZaXDnot9ksHAqGR> (cinci planșe: panoul, colțurile pe hârtie, pe ce se
sprijină dopul, exportul, întrebările), în culorile aplicației.

## Problema

Incrustația în V se oprește singură: pereții înclinați ai dopului se sprijină pe ai locașului, iar jocurile ies din adâncimi
(ADR 0170). Cu pereți drepți, dopul și locașul au pereți verticali. Două lucruri se schimbă:

- **Colțurile.** Freza dreaptă e rotundă, deci nu poate tăia un colț ascuțit într-un loc în care intră doar cu vârful.
  - În locaș, vârfurile desenului (colțurile convexe) ies rotunjite cu raza frezei.
  - La dop, pe care freza îl ocolește pe dinafară, se rotunjesc unghiurile intrânde.
  - Dacă nu le potrivește nimeni, dopul cu vârfuri ascuțite nu intră în vârfurile rotunjite ale locașului, iar unghiurile lui
    rotunjite lasă goluri în unghiurile ascuțite ale locașului.
- **Oprirea.** Pereții verticali nu țin dopul. El se oprește pe fundul locașului sau cu fața coborâtă a semifabricatului pe
  placă, deci rămâne un singur spațiu: între plăci (pentru fierăstrău) sau sub dop (pentru clei), nu amândouă ca la V.

## Ce am aflat (cercetarea din 07.11)

- **ArtCAM 2018, Inlay Wizard** (documentația lui, din `CERCETARE-DETALIATA.json`):
  - are pereți drepți (buzunar, gaură, buzunar în trepte, gaură în trepte, dop drept, dop în trepte);
  - locașul și dopul se taie cu aceeași freză, iar programul potrivește colțurile ca piesele să se îmbine exact;
  - parametrii: adâncimea de start și finală, jocul (≥ 0: mărește cavitatea sau micșorează dopul), toleranța, umărul treptei,
    freza de finisare și cea de degroșare cu adaosul ei, strategia (raster sau offset), rampa.
- **Geometria, pe hârtie.** R e raza frezei, c jocul lateral, S desenul.
  - Locașul taie conturul P: deschiderea cu R a închiderii cu R − c a desenului. Vârfurile lui au raza R, unghiurile intrânde
    au raza R − c.
  - Dopul e P micșorat cu c (offset spre interior): vârfurile au raza R − c, unghiurile intrânde au raza (R − c) + c = R, cât
    freza. Aceeași freză îl taie deci exact, fără material rămas în unghiuri.
  - Arcele perechi sunt concentrice, iar laturile paralele: jocul e c pe tot conturul, și în colțuri.
  - O trăsătură mai îngustă decât 2R dispare din locaș: freza nu intră în ea.
- **Exemplul de lucru, criteriul din prag:** steaua cu raza exterioară 12 și cea interioară 5, Ø3 (R = 1,5), adâncimea 6, c =
  0,1.
  - Vârful are 40,55°. Rotunjit cu R1,5, se retrage 2,83 mm pe bisectoare; arcul atinge laturile la 4,06 mm de vârf.
  - Pana bazei (unghiul intrând al stelei) are 112,55° și se rotunjește cu R1,4 (tangentă la 0,94 mm).
  - Din fiecare latură de 8,48 mm rămân drepte 3,49 mm.
  - Dopul are vârfurile R1,4 și unghiurile R1,5.
  - Cu Ø6, arcele s-ar suprapune: steaua iese aproape rotundă, deci aplicația trebuie să spună cât se retrage cel mai ascuțit
    vârf.
- **O precizare la criteriul din prag:** el spune că și colțurile exterioare ale dopului au R1,5. Cu jocul 0,1 pe tot
  conturul, vârfurile dopului au R − c = 1,4, concentrice cu R1,5 ale locașului. Două arce R1,5 cu centre diferite n-ar ține
  jocul în ± 0,02 la un vârf de 40°. Oracolul cere jocul, iar razele le arată pe hârtie.
- **Oprirea, pe hârtie:** dopul e ridicat pe semifabricatul lui, cu înălțimea h.
  - **Pe fund:** h = D + H; dopul atinge fundul, iar între fața coborâtă și placă rămâne H. Cleiul stă pe pereți, în jocul c.
  - **Pe față:** h = D − g; fața coborâtă stă pe placă, iar sub dop rămâne g. Nu mai e loc de fierăstrău: spatele
    semifabricatului se rindeluiește tot.
  - Pentru steaua de mai sus, cu H = 2: h = 8, iar semifabricatul are cel puțin 9 mm.
- **Ce avem deja în cvs2:** buzunarul cu inele, linii paralele, coborâri și freze de rest (ADR 0069, 0076, 0093, 0094); dopul pe
  semifabricatul lui, oglindit, cu fișierul lui, regiunea lărgită și avertismentul marginilor (ADR 0170); oracolul simulării cu
  freza plată.

## Decizia (propusă, cu recomandările întrebărilor)

1. **Documentul v21:** `incrustatie` cu `fel: 'drept'` pe un buzunar.
   - Câmpurile noi: `jocLateral` (c) și `sprijin: 'fund' | 'fata'`. Rămân `joc` (g), `fierastrau` (H), `margine` și `jurDop`.
   - Pe un V-carve rămâne doar `fel: 'v'`, iar pe un buzunar doar `fel: 'drept'`.
   - Migrarea v20 → v21 schimbă doar numărul. Un v20 care are deja `jocLateral` sau `sprijin` în `incrustatie` (câmpuri
     necunoscute atunci) e refuzat, ca la orice ciocnire.
   - Oracolul documentului și corpusul de aur trec la v21 (ADR 0121).
2. **Locașul** e buzunarul conturului P: aplicația îl calculează din desen și din freza cea mai mică a operației, cu toate
   strategiile buzunarului (inelele, liniile paralele, coborârea, frezele de rest).
3. **Dopul** e un program separat, pe semifabricatul lui, ca la V:
   - conturul P micșorat cu c, oglindit pe X;
   - semifabricatul e cutia lui, plus `margine`; XY0 e în colțul ales, Z0 pe fața lui;
   - fața se coboară în jur la h, cu aceleași freze, până dincolo de margini, cu avertismentul;
   - un fișier pe dop, `…-dop-N`.
4. **Refuzurile, cu motivul,** înainte de export:
   - c ≤ 0 sau c ≥ R;
   - o freză în V pe un buzunar cu incrustație;
   - g ≥ D, când dopul se sprijină pe față;
   - o parte a desenului care dispare din locaș (mai îngustă decât freza), cu elementul ei.
5. **Interfața:**
   - rolul „incrustație cu pereți drepți”, lângă „incrustație în V”, în panou și în fereastra exportului;
   - sub adâncime: jocul lateral, pe ce se sprijină dopul, spațiul pentru fierăstrău sau jocul de sub dop, marginea dopului;
   - „Pe hârtie”: razele colțurilor (locașul R și R − c, dopul R − c și R), jocul, înălțimea dopului, grosimea semifabricatului
     și cât se retrage cel mai ascuțit vârf față de desen.
6. **Probele, scrise întâi:**
   - **oracolul pereților drepți** (`test/oracles/incrustatieDreapta.ts`, zero importuri din `src/`):
     - simulează cele două programe, cu freza plată, întoarce dopul după contract și îl coboară până la primul contact;
     - cere jocul lateral c ± 0,02 pe tot conturul, măsurat pe o grilă de 0,01 mm în fâșia de lângă contur;
     - cere oprirea pe fund sau pe față, iar spațiul rămas (H sau g) ± 0,05;
     - cere razele colțurilor ± 0,02;
   - cazurile pe hârtie: steaua din prag, un dreptunghi, un L, un inel (litera cu gol), o trăsătură prea îngustă (refuzată);
   - controlul negativ: un dop cu vârfuri ascuțite (colțurile nepotrivite) trebuie să pice, pe vârfuri;
   - otrăvurile țintite: raza fără c, jocul aplicat de două ori, oglinda, înălțimea dopului cu H în loc de g, fără închidere
     (unghiurile dopului cu material rămas).
7. **Felia 12.1↑b:** v21, locașul și dopul cu pereți drepți (sprijinul pe fund și pe față), oracolul, rolul, exportul, manualul.
   Estimarea: ~3 h (12.1↑ a cerut 2 h 17 min de cod după răspunsuri, față de ~5 h estimate).

   Plafonul total e comun cu celelalte linii: linia ține sub ~10 kB în plus (după 12.1↑, +4,3 kB).

## Ce am respins

- **Dopul cu vârfuri ascuțite și degajări (dog-bone) în colțurile locașului:** degajările se văd la suprafață, în jurul
  dopului, tocmai unde incrustația trebuie să arate curat.
- **Un tip nou de operație:** locașul e un buzunar întreg (strategiile, frezele de rest, coborârea), deci un câmp pe buzunar
  le moștenește pe toate, ca la V-carve.
- **Ambele spații (clei și fierăstrău) deodată:** cu pereți verticali, dopul se oprește pe fund sau pe față, nu între ele.

## Ce impune

- Conturul tăiat nu mai e desenul: colțurile se rotunjesc. Aplicația îl arată pe hârtie acum și în 3D în 12.1↑e.
- Freza cea mai mică a operației dă razele colțurilor, iar dopul se taie cu aceleași freze.
- Un buzunar cu `incrustatie` nu se unește cu unul fără ea (cheia buzunarului o cuprinde, ca la V).
- Probele care țin versiunea curentă trec pe v21. Fiecare buton nou are capitolul lui în manual, în ambele limbi.

**Se redeschide dacă:** placa 12 arată alt joc decât simularea, sau o altă linie urcă schema înaintea unirii (atunci una devine
v22).

## Întrebările (recomandarea întâi)

1. **Cum se face dopul?**
   - **a)** ridicat pe semifabricatul lui: fața din jur se coboară cu freza dreaptă, apoi îl întorci, îl lipești și tai sau
     rindeluiești spatele (ca la V; nicio piesă mică liberă, merge și pe text);
   - b) decupat prin toată placa, cu punți, și pus în locaș fără întoarcere;
   - c) amândouă, alese la export: a acum, b în 12.1↑c (împreună cu decuparea benzii de la V).
2. **Pe ce se sprijină dopul?** (pereții drepți nu-l opresc)
   - **a)** pe fundul locașului: între plăci rămâne spațiul pentru fierăstrău (implicit 2 mm), iar cleiul stă pe pereți, în
     jocul lateral;
   - b) cu fața coborâtă pe placă: sub dop rămâne jocul pentru clei (implicit 0,5 mm), fără loc de fierăstrău;
   - c) amândouă, alese la export.
3. **Colțurile:**
   - **a)** aplicația le potrivește singură (locașul: vârfurile R, unghiurile R − c; dopul invers) și arată în panou razele și
     cât se retrage cel mai ascuțit vârf;
   - b) refuză desenele cu colțuri mai ascuțite decât freza, iar tu le rotunjești înainte.
4. **Frezele:**
   - **a)** aceleași pentru locaș și dop (și frezele de rest): colțurile le dă cea mai mică;
   - b) fiecare jumătate cu frezele ei (dopul cu o freză cel mult cât cea mai mică a locașului).
5. **Jocul lateral implicit:**
   - **a)** 0,1 mm, ca în criteriul din prag;
   - b) 0,2 mm (lemn moale, clei mai gros);
   - c) altul (spui tu cât).
6. **Unde alegi incrustația cu pereți drepți?**
   - **a)** un rol nou, „incrustație cu pereți drepți”, lângă „incrustație în V”, în panou și în fereastra exportului;
   - b) o bifă „cu dop” pe buzunar.
