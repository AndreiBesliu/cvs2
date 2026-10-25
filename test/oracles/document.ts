/**
 * ORACOLUL documentului v9 (ADR 0034: forma „cale”), peste v8 (ADR 0032: degajările colțurilor), peste v7 (ADR 0030: intrările și ieșirile), peste v6 (ADR 0029: rampa), peste v5 (ADR 0028: urechile), v4 (ADR 0027: sensul de tăiere), v3 (ADR
 * 0025: operațiile piesei) și v2 (ADR 0024, varianta D: piese cu arbore, instanțe pe foi, cu „Precizările contractului”
 * 1–10), cu ZERO importuri din `src/`. Totul e scris din textul ADR-urilor, nu din codul aplicației: matricea, ordinea
 * elementelor și a tăieturilor în lume, migrările v1 → v2 → v3 → v4 → v5 → v6, marginile lumii și regulile de validitate au aici propria lor copie. Dacă
 * aplicația și oracolul ar citi același fișier, o greșeală acolo ar trece prin amândouă.
 *
 * Convenția matricei (aceeași ca în tot proiectul, rescrisă aici): x′ = a·x + c·y + e, y′ = b·x + d·y + f;
 * `compuneO(m2, m1)` aplică întâi m1, apoi m2; rotirea e trigonometrică, în grade.
 *
 * Din precizările ADR 0024 (le urmez literal):
 * - adâncimea se numără în niveluri, rădăcina e nivelul 1 (32 trec, 33 nu); plafoanele de noduri și de instanțe sunt
 *   totaluri pe document, cu grupurile numărate ca noduri;
 * - compunerea merge de sus în jos: M = instanța, apoi M = compune(M, nod) pentru fiecare nod de pe drum. Rotirea
 *   neexactă folosește cos(r·π/180), sin(r·π/180), cu r adus în [0, 360): un r deja în interval rămâne NESCHIMBAT
 *   (`((r % 360) + 360) % 360` l-ar muta în ultimii biți: 0,1 → 0,10000000000002274);
 * - mărimile sunt strict pozitive, 0 ≤ razaColt ≤ min(latime, inaltime) / 2, `rev` e un întreg sigur ≥ 0; `nume`
 *   ≤ 200 de caractere, `campuri` ≤ 200 de chei, cheia ≤ 200, valoarea ≤ 10 000 (lungimile sunt unități UTF-16, ca
 *   `string.length`);
 * - lumea e mărginită: matricea compusă a fiecărui nod față de rădăcina piesei (pornind de la identitate), |x|, |y| ale
 *   instanței și cele cel mult 100 000 de elemente în lume de pe toate foile; categoria `[margini]`;
 * - o formă cu arce (cercul, dreptunghiul cu razaColt > 0) stă doar sub o matrice compusă (față de rădăcina piesei)
 *   care e similitudine, cu toleranța 1e-12 · max(hypot(a, b), hypot(c, d), 1) și determinantul ≠ 0; o formă pe care
 *   consumatorii n-o pot desena e categoria `[forma]`. Similitudinea se judecă doar sub o matrice compusă în margini
 *   (altfel problema e deja `[margini]`);
 * - tot JSON-ul are cel mult 200 de niveluri (fiecare obiect sau listă e un nivel, documentul e nivelul 1);
 * - migrarea v1 → v2 păstrează câmpurile necunoscute ale matricei și refuză ciocnirile de nume (`[ciocnire]`).
 *
 * Din ADR 0025 (le urmez literal; alegerile mele, acolo unde textul tace, sunt marcate „ALEGERE”):
 * - `Piesa.operatii` e obligatorie și poate fi goală; `Operatie { id, tip: 'profil', noduri, scula, latura, adancime,
 *   pas }`, cu câmpurile necunoscute păstrate. ALEGERE: și cele ale sculei (regula generală din ADR 0024);
 * - id-ul operației e ca orice id și e unic între operațiile ACELEIAȘI piese (spațiu de nume separat de noduri: poate
 *   fi egal cu id-ul unui nod, iar două piese pot avea operații cu același id);
 * - `noduri`: 1–10 000 de id-uri distincte, fiecare al unui ELEMENT din arborele piesei (nu al unui grup, nu al altei
 *   piese);
 * - `scula`: `numar` întreg 1–999, `nume` text ≤ 200 (ALEGERE: obligatoriu, poate fi gol), `diametru` finit în (0, 100];
 * - `latura` ∈ { exterior, interior, pe-linie }; `adancime` și `pas` finite în (0, 1 000]. Adâncimea față de grosimea
 *   foii și „o singură sculă pe program” sunt ale CAM-ului / exportului, nu ale ușii (`sculaUnicaO` le spune motivul);
 * - plafoanele: ≤ 100 000 de operații în document (și cele ale pieselor fără instanțe), ≤ 100 000 de tăieturi în lume
 *   (suma, peste instanțele tuturor foilor, a lungimilor listelor `noduri` din operațiile piesei lor);
 * - ordinea tăieturilor: clasa (interior < pe-linie < exterior), apoi instanța (ordinea foii), apoi operația (ordinea
 *   piesei), apoi nodul (ordinea operației). ALEGERE: o ordine lexicografică pe acest cvartet (instanța înaintea
 *   operației), nu „toate instanțele unei operații, apoi operația următoare”;
 * - migrarea v2 → v3: fiecare piesă primește câte o operație pe fiecare element, în preordine, cu id-ul elementului;
 *   cerc → interior 8 4, dreptunghi → exterior 3 3, scula { 1, 'freza plata', 6 }; o piesă v2 cu un câmp propriu
 *   `operatii` (ORICE valoare, și `[]`) e refuzată (`[ciocnire]`); un v1 trece v1 → v2 → v3, în lanț.
 *
 * Categoriile noi: `[operatie]` (lista `operatii` și câmpurile operației: tip, latura, adancime, pas, lista `noduri`
 * goală, cu duplicate sau cu ne-texte), `[unic-operatii]`, `[referinta-op]` (un nod care nu e element al piesei),
 * `[scula]` (tot ce ține de sculă); `[plafon]` (operații, tăieturi, peste 10 000 de noduri într-o operație) și
 * `[ciocnire]` se refolosesc; formatul id-ului operației rămâne `[id]` (un id ne-text, `[schema]`, ca peste tot).
 *
 * Din ADR 0027 (documentul v4, felia 2.3b; le urmez literal, alegerile mele sunt marcate „ALEGERE”):
 * - v4 = contractul v3 + `Operatie.sens`, OBLIGATORIU pe orice operație (și pe `pe-linie`, unde câmpul se păstrează
 *   fără să schimbe traseul), exact `'urcare'` sau `'opozitie'` (fără majuscule, diacritice sau spații). Categoria nouă
 *   e `[sens]`;
 * - migrarea v3 → v4 (pură): fiecare operație primește `sens: 'urcare'`; tot restul rămâne, cu câmpurile necunoscute.
 *   O operație v3 care are deja un câmp propriu `sens` (ORICE valoare, și `'urcare'`) e o ciocnire (`[ciocnire]`).
 *   ALEGERE: ciocnirea e doar pe OPERAȚIE (textul ADR-ului); un câmp `sens` pe sculă, pe nod, pe piesă, pe instanță,
 *   pe foaie sau sus rămâne un câmp necunoscut oarecare, fără refuz;
 * - lanțul v1 → v2 → v3 → v4 și v2 → v3 → v4: operațiile create de migrarea v2 → v3 nu au `sens`, deci nu se pot
 *   ciocni; primesc `urcare` la pasul următor.
 *
 * Din ADR 0028 (documentul v5, felia 2.4: urechile; le urmez literal, alegerile mele sunt marcate „ALEGERE”):
 * - v5 = contractul v4 + `Operatie.urechi`, OBLIGATORIU pe orice operație (și pe `pe-linie`: „toate laturile pot avea
 *   urechi”): `null` sau `{ numar, latime, grosime }`; `numar` întreg 1–100 (`PLAFON.urechi`, scris în ADR 0028),
 *   `latime` finit în (0, `PLAFON.latura`] = (0, 10 000], `grosime` finit în (0, `PLAFON.grosime`] = (0, 1 000] (ambele
 *   plafoane scrise în ADR 0024, „Plafoanele”). Categoria nouă e `[urechi]` (tot ce ține de câmp: lipsa lui, tipul,
 *   cele trei mărimi), ca `[scula]` pentru sculă;
 * - ALEGERE: câmpurile necunoscute DIN obiectul `urechi` se păstrează (regula generală din ADR 0024, ca la sculă); o
 *   listă, un număr, un text sau `false` în locul obiectului e `[urechi]`;
 * - ALEGERE: `numar` e întreg după `Number.isInteger` (deci 4.0 din JSON e 4); −0 nu e în 1–100;
 * - `grosime` față de grosimea foii, `latime` față de buclă (W ≤ 0,9·S) și adâncimea față de vârf sunt ale
 *   EXPORTULUI (ADR 0028 §2–§3), nu ale ușii: un document cu urechi care nu încap se încarcă și se refuză la export;
 * - migrarea v4 → v5 (pură): fiecare operație primește `urechi: null`; tot restul rămâne, cu câmpurile necunoscute. O
 *   operație v4 care are deja un câmp propriu `urechi` (ORICE valoare, și `null`) e o ciocnire (`[ciocnire]`).
 *   ALEGERE: ca la `sens`, ciocnirea e doar pe OPERAȚIE; `urechi` pe sculă, pe nod, pe piesă sau sus e un câmp
 *   necunoscut oarecare;
 * - lanțul v1 → … → v5: operațiile create de migrarea v2 → v3 n-au nici `sens`, nici `urechi`, deci nu se pot ciocni.
 *
 * Din ADR 0029 (documentul v6, felia 2.5a: rampa; sesiune independentă, scris doar din textul ADR-ului; alegerile mele
 * sunt marcate „ALEGERE”):
 * - v6 = contractul v5 + `Operatie.rampa`, OBLIGATORIU pe orice operație (ca `urechi`; ALEGERE: și pe `pe-linie`, unde
 *   ADR-ul nu spune nimic despre traseu, dar câmpul e al operației, nu al laturii): `null` sau `{ lungime }`, cu
 *   `lungime` finit în (0, `PLAFON.latura`] = (0, 10 000] mm. Categoria nouă e `[rampa]` (lipsa câmpului, tipul,
 *   lungimea);
 * - ALEGERE: câmpurile necunoscute DIN obiectul `rampa` se păstrează (regula generală din ADR 0024, ca la urechi și la
 *   sculă); o listă, un număr, un text sau `false` în locul obiectului e `[rampa]`;
 * - Lr = min(lungime, P / 2) și orice legătură cu bucla sunt ale EXPORTULUI (ADR 0029 §2), nu ale ușii: o rampă mai
 *   lungă decât bucla e un document valid;
 * - migrarea v5 → v6 (pură): fiecare operație primește `rampa: null`; tot restul rămâne, cu câmpurile necunoscute. O
 *   operație v5 care are deja un câmp propriu `rampa` (ORICE valoare, și `null`) e o ciocnire (`[ciocnire]`). ALEGERE:
 *   ca la `sens` și `urechi`, ciocnirea e doar pe OPERAȚIE; `rampa` pe sculă, în urechi, pe nod, pe piesă sau sus e un
 *   câmp necunoscut oarecare;
 * - lanțul v1 → … → v6: operațiile create de migrarea v2 → v3 n-au nici `sens`, nici `urechi`, nici `rampa`; un câmp
 *   `rampa` pus pe o operație v3 sau v4 trece prin migrările până la v5 (câmp necunoscut) și se ciocnește la v5 → v6.
 *
 * Din ADR 0030 (documentul v7, felia 2.5b: intrările și ieșirile; sesiune independentă, scris doar din textul ADR-ului;
 * alegerile mele sunt marcate „ALEGERE”):
 * - v7 = contractul v6 + `Operatie.intrari`, OBLIGATORIU pe orice operație (ca `rampa`; ALEGERE: și pe `pe-linie`, unde
 *   intrările sunt refuzate la EXPORT, §6, nu la ușă): `null` sau `{ raza }`, cu `raza` finit în (0, `PLAFON.latura`] =
 *   (0, 10 000] mm. Categoria nouă e `[intrari]` (lipsa câmpului, tipul, raza);
 * - ALEGERE: câmpurile necunoscute DIN obiectul `intrari` se păstrează (regula generală din ADR 0024, ca la rampă,
 *   urechi și sculă); o listă, un număr, un text sau `false` în locul obiectului e `[intrari]`;
 * - raza sub 0,5 mm, intrările pe `pe-linie` și intrările împreună cu rampa sunt refuzuri ale EXPORTULUI (§6), nu ale
 *   ușii: documentul le admite (raza e doar pozitivă);
 * - migrarea v6 → v7 (pură): fiecare operație primește `intrari: null`; tot restul rămâne, cu câmpurile necunoscute. O
 *   operație v6 care are deja un câmp propriu `intrari` (ORICE valoare, și `null`) e o ciocnire (`[ciocnire]`). ALEGERE:
 *   ca la `sens`, `urechi` și `rampa`, ciocnirea e doar pe OPERAȚIE; `intrari` pe sculă, în urechi, în rampă, pe nod, pe
 *   piesă sau sus e un câmp necunoscut oarecare;
 * - lanțul v1 → … → v7: operațiile create de migrarea v2 → v3 n-au `intrari`; un câmp `intrari` pus pe o operație v3,
 *   v4 sau v5 trece prin migrările până la v6 (câmp necunoscut) și se ciocnește la v6 → v7.
 *
 * Din ADR 0032 (documentul v8, felia 2.6: degajările colțurilor; sesiune independentă, scris doar din textul ADR-ului;
 * alegerile mele sunt marcate „ALEGERE”):
 * - v8 = contractul v7 + `Operatie.colturi`, OBLIGATORIU pe orice operație: `null` sau `{ tip }`, cu `tip` exact
 *   `'dog-bone'` sau `'t-bone'` (fără majuscule, spații sau alte grafii). Categoria nouă e `[colturi]` (lipsa câmpului,
 *   tipul obiectului, `tip`);
 * - câmpurile necunoscute DIN obiectul `colturi` se păstrează (§1, scris în ADR); o listă, un număr, un text sau
 *   `false` în locul obiectului e `[colturi]`;
 * - ALEGERE: și pe `pe-linie` câmpul e obligatoriu și poate fi `{ tip }`: degajările pe `pe-linie` sunt un refuz al
 *   EXPORTULUI (§6), nu al ușii (ca la intrări);
 * - migrarea v7 → v8 (pură): fiecare operație primește `colturi: null`; tot restul rămâne, cu câmpurile necunoscute. O
 *   operație v7 care are deja un câmp propriu `colturi` (ORICE valoare, și `null`) e o ciocnire (`[ciocnire]`).
 *   ALEGERE: ca la `sens`, `urechi`, `rampa` și `intrari`, ciocnirea e doar pe OPERAȚIE; `colturi` pe formă, pe sculă,
 *   în urechi, în rampă, în intrări, pe nod, pe piesă sau sus e un câmp necunoscut oarecare;
 * - lanțul v1 → … → v8: un câmp `colturi` pus pe o operație v3 … v6 trece prin migrările până la v7 (câmp necunoscut) și
 *   se ciocnește la v7 → v8.
 *
 * Din ADR 0034 (documentul v9, felia 2.7b: forma „cale”; sesiune independentă, scris doar din textul ADR-ului; alegerile
 * mele sunt marcate „ALEGERE”):
 * - forma nouă `{ tip: 'cale', inchis: true, varfuri: [{ p: { x, y }, s }, …] }`, `s` = `{ tip: 'L' }` | `{ tip: 'A',
 *   bulge }` | `{ tip: 'C', c1, c2 }`; câmpurile necunoscute se păstrează pe formă, pe vârf, pe segment și pe punct.
 *   Forma există doar de la v9: într-un document v8 (sau mai vechi), `cale` e o formă necunoscută (`[schema]`);
 * - refuzurile §2, cu categoriile mele (ALEGERE): `[cale]` = sub 2 vârfuri, `inchis` ≠ `true`, `varfuri` care nu e
 *   listă, un vârf / segment care nu e obiect, un tip de segment necunoscut, `bulge` 0 (și −0) sau un arc cu capetele în
 *   ACELAȘI punct (egalitate exactă a coordonatelor; 1e-9 mm alături trece: ușa nu judecă geometria); `[schema]` = o
 *   coordonată sau un `bulge` care nu e număr; `[finit]` = un număr nefinit; `[margini]` = o coordonată (p, c1, c2) cu
 *   |x| sau |y| peste `PLAFON.translatie` = 10⁷ mm; `[plafon]` = peste `PLAFON.varfuriCale` = 50 000 de vârfuri pe o
 *   cale; `[forma]` = o cale CU ARCE sub o matrice compusă care nu e similitudine (liniile și cubicele trec prin orice
 *   matrice afină); `bulge` nu are alt plafon decât să fie finit; RECENZIA (11.10, precizările §2): și `[plafon]` = un arc
 *   cu raza (c / 4)·(|b| + 1/|b|) peste `PLAFON.latura` = 10 000 mm; și `[forma]` = un element cu arce a cărui matrice în
 *   lume (instanța cu rotirea ei, apoi grupurile, apoi elementul, ca `geometrieV2`) nu e similitudine la 2e-12
 *   (`similitudineLume`, aceeași formă ca la 1e-12), judecată doar când matricea din piesă e în margini;
 * - plafoanele de ansamblu: vârfurile tuturor căilor pieselor (și ale pieselor fără instanțe) ≤ `PLAFON.varfuri` =
 *   200 000 (`[plafon]`); vârfurile în lume (fiecare instanță, de pe orice foaie, cu vârfurile căilor piesei ei) ≤
 *   `PLAFON.varfuriLume` = 1 000 000 (ALEGERE: `[margini]`, ca elementele în lume din ADR 0024);
 * - migrarea v8 → v9 schimbă doar `schema`; nu există ciocniri (niciun câmp nou). Un v8 cu o formă `cale` nu e un v8
 *   valid, deci nu se migrează (ADR 0034 §3, precizarea din 11.10).
 *
 * Din ADR 0037 §2 (documentul v10, felia 2.3c-2: contururile deschise; sesiune independentă, scris doar din textul
 * ADR-ului; tăieturile în ordinea de la §8 sunt în `document.v10.ts`; alegerile mele sunt marcate „ALEGERE”). Oracolul e
 * pe v10, ca la fiecare versiune de dinainte: `SCHEMA_CURENTA_O` = 10, `ridicaO` dă v10 (`ridicaV9O` păstrează lanțul
 * vechi până la 9), `verificaO` e ușa v10 (`verificaPanaLaV9O` e ușa unei aplicații rămase pe 9); migrarea v9 → v10
 * (`migreazaV9V10O`) schimbă doar numărul, iar un v9 cu un câmp propriu `despartire` pe o operație e o ciocnire
 * (`ciocniriDespartireO`). Contractul ușii v10:
 * - `inchis` e boolean (`[cale]` altfel); o cale deschisă are n ≥ 2 vârfuri și n − 1 segmente: segmentul ultimului vârf
 *   trebuie să fie `{ tip: 'L' }` (`[cale]` altfel; câmpurile lui necunoscute se păstrează) și nu se mai judecă altfel;
 *   verificările arcului (capetele diferite, raza ≤ 10 000) se fac doar pe cele n − 1 segmente reale, cu vecinul k + 1
 *   (fără `(k + 1) % n`, care ar închide calea);
 * - latura ∈ { exterior, interior, pe-linie, stanga, dreapta } (`[operatie]` altfel); potrivirea laturii cu `inchis` și
 *   geometria căii deschise (lungimea, autointersecția, capetele care coincid) NU sunt ale ușii, ci ale CAM-ului;
 * - `despartire`, câmpul opțional al operației de profil: lipsă = `false`. ALEGERE: dacă există, e boolean (`true` sau
 *   `false`), altfel categoria nouă `[despartire]`; ușa nu judecă dacă are sens (calea închisă, adâncimea sub grosimea
 *   foii: le refuză CAM-ul, §8);
 * - plafoanele rămân aceleași; vârfurile căilor deschise se numără la fel, cu tot cu vârful final.
 *
 * Din ADR 0069 §1–§2 (documentul v11: buzunarul, felia 5.1↑). ATENȚIE: scris de aceeași sesiune care a scris aplicația,
 * din textul ADR-ului, NU de o sesiune independentă (agenții erau opriți în timpul testului owner-ului); de reluat de una
 * independentă. Oracolul e pe v11: `SCHEMA_CURENTA_O` = 11, `ridicaO` dă v11 (`ridicaV10O` păstrează lanțul până la 10),
 * `verificaO` e ușa v11 (`verificaPanaLaV10O` e ușa unei aplicații rămase pe 10); migrarea v10 → v11 (`migreazaV10V11O`)
 * schimbă doar numărul, iar un v10 (sau mai vechi) cu un câmp propriu `pasLateral` pe o operație e o ciocnire
 * (`ciocniriPasLateralO`). Contractul ușii v11:
 * - `tip` ∈ { profil, buzunar } (`[operatie]` altfel);
 * - `pasLateral`, câmpul opțional al operației: dacă există, un număr finit în (0, 50] (jumătatea plafonului diametrului);
 *   altfel categoria nouă `[buzunar]`;
 * - ușa NU judecă potrivirea buzunarului (pasul lipsă sau peste raza frezei, latura alta decât interior, urechile, rampa,
 *   intrările, degajările, despărțirea pe un buzunar; pasul pe un profil), nici dacă are sens (calea deschisă, insulele,
 *   freza care nu încape): le refuză CAM-ul, cu motiv (§1, §6), ca latura unei căi deschise (ADR 0037 §2).
 *
 * Din ADR 0076 §1–§2 (documentul v12: coborârea în buzunar, felia 5.3↑). ATENȚIE: tot de aceeași sesiune, din textul
 * ADR-ului. Oracolul e pe v12: `SCHEMA_CURENTA_O` = 12, `ridicaO` dă v12 (`ridicaV11O` păstrează lanțul până la 11),
 * `verificaO` e ușa v12 (`verificaPanaLaV11O` e ușa unei aplicații rămase pe 11); migrarea v11 → v12 (`migreazaV11V12O`)
 * schimbă doar numărul, iar un v11 (sau mai vechi) cu un câmp propriu `coborare` pe o operație e o ciocnire
 * (`ciocniriCoborareO`). Contractul ușii v12:
 * - `coborare`, câmpul opțional al operației: dacă există, un obiect cu `fel` ∈ { plonjare, rampa, zigzag, elice }; pe
 *   `rampa`, `zigzag` și `elice`, `unghi` un număr finit în (0, 45]; pe `zigzag`, `lungime` în (0, 10 000]; pe `elice`,
 *   `raza` în (0, 100]; altfel categoria nouă `[coborare]`;
 * - ușa NU judecă potrivirea coborârii (unghiul sub 0,5°, zigzagul sub 1 mm, elicea care nu încape, coborârea pe un
 *   profil): le judecă CAM-ul.
 */

export type MatriceO = {
  readonly a: number; readonly b: number; readonly c: number;
  readonly d: number; readonly e: number; readonly f: number;
};

export type PunctO = { readonly x: number; readonly y: number };

/** Un obiect cu câmpuri necunoscute: contractul le păstrează pe toate. */
export type Liber = { [cheie: string]: unknown };

export type GrupO = Liber & { tip: 'grup'; id: string; nume?: string; matrice: MatriceO; copii: NodO[] };
export type ElementO = Liber & { tip: 'element'; id: string; nume?: string; forma: Liber; matrice: MatriceO };
export type NodO = GrupO | ElementO;
export type PiesaO = Liber & { id: string; nume?: string; radacina: NodO };
export type InstantaO = Liber & {
  id: string; piesa: string; x: number; y: number; rotire: number; campuri?: { [cheie: string]: string };
};
export type StocO = Liber & { latime: number; inaltime: number; grosime: number };
export type FoaieO = Liber & { id: string; nume?: string; stoc: StocO; instante: InstantaO[] };
export type DocV2O = Liber & { schema: 2; rev: number; piese: PiesaO[]; foi: FoaieO[] };

export type LaturaO = 'interior' | 'pe-linie' | 'exterior';
export type SculaO = Liber & { numar: number; nume: string; diametru: number };
export type OperatieO = Liber & {
  id: string; tip: 'profil'; noduri: string[]; scula: SculaO; latura: LaturaO; adancime: number; pas: number;
};
export type PiesaV3O = PiesaO & { operatii: OperatieO[] };
export type DocV3O = Liber & { schema: 3; rev: number; piese: PiesaV3O[]; foi: FoaieO[] };

/** ADR 0027: sensul de tăiere al unei operații (axul M3). */
export type SensO = 'urcare' | 'opozitie';
export type OperatieV4O = OperatieO & { sens: SensO };
export type PiesaV4O = PiesaO & { operatii: OperatieV4O[] };
export type DocV4O = Liber & { schema: 4; rev: number; piese: PiesaV4O[]; foi: FoaieO[] };

/** ADR 0028: urechile unei operații de profil (pe fiecare buclă), sau `null`. */
export type UrechiO = Liber & { numar: number; latime: number; grosime: number };
export type OperatieV5O = OperatieV4O & { urechi: UrechiO | null };
export type PiesaV5O = PiesaO & { operatii: OperatieV5O[] };
export type DocV5O = Liber & { schema: 5; rev: number; piese: PiesaV5O[]; foi: FoaieO[] };

/** ADR 0029: rampa unei operații de profil (lungimea în plan pe care freza coboară o trecere), sau `null`. */
export type RampaO = Liber & { lungime: number };
export type OperatieV6O = OperatieV5O & { rampa: RampaO | null };
export type PiesaV6O = PiesaO & { operatii: OperatieV6O[] };
export type DocV6O = Liber & { schema: 6; rev: number; piese: PiesaV6O[]; foi: FoaieO[] };

/** ADR 0030: intrările unei operații de profil (raza cercului intrării, pe traseul centrului frezei), sau `null`. */
export type IntrariO = Liber & { raza: number };
export type OperatieV7O = OperatieV6O & { intrari: IntrariO | null };
export type PiesaV7O = PiesaO & { operatii: OperatieV7O[] };
export type DocV7O = Liber & { schema: 7; rev: number; piese: PiesaV7O[]; foi: FoaieO[] };

/** ADR 0034: documentul v9 = v8 cu forma `cale` (operațiile nu se schimbă). */
export type PunctCaleO = Liber & { x: number; y: number };
export type SegmentCaleO = Liber & ({ tip: 'L' } | { tip: 'A'; bulge: number } | { tip: 'C'; c1: PunctCaleO; c2: PunctCaleO });
export type VarfCaleO = Liber & { p: PunctCaleO; s: SegmentCaleO };
export type FormaCaleO = Liber & { tip: 'cale'; inchis: true; varfuri: VarfCaleO[] };

/** ADR 0032: degajările colțurilor unei operații de profil (dog-bone sau T-bone), sau `null`. */
export type TipColturiO = 'dog-bone' | 't-bone';
export type ColturiO = Liber & { tip: TipColturiO };
export type OperatieV8O = OperatieV7O & { colturi: ColturiO | null };
export type PiesaV8O = PiesaO & { operatii: OperatieV8O[] };
export type DocV8O = Liber & { schema: 8; rev: number; piese: PiesaV8O[]; foi: FoaieO[] };
export type DocV9O = Liber & { schema: 9; rev: number; piese: PiesaV8O[]; foi: FoaieO[] };

/** Ce au în comun v2, v3, v4 și v5 pentru geometrie: operațiile nu schimbă nimic din ea. */
export type DocArboreO = { readonly piese: readonly PiesaO[]; readonly foi: readonly FoaieO[] };

export type ElementV1O = Liber & { id: string; nume?: string; forma: Liber; matrice: MatriceO };
export type DocV1O = Liber & { schema: 1; rev: number; foaie: StocO; elemente: ElementV1O[] };

export type ElementLumeO = { idLume: string; forma: unknown; matrice: MatriceO };

/**
 * O tăietură în lume. `scula` și `forma` sunt obiectele din document, cu câmpurile lor necunoscute; `matrice` e matricea
 * în lume a elementului (aceeași ca în `geometrieV2`). `idLume` NU e unic: un element în două operații dă două tăieturi.
 */
export type TaieturaO = {
  idLume: string; instanta: string; piesa: string; operatie: string; nod: string; latura: LaturaO;
  adancime: number; pas: number; scula: SculaO; forma: unknown; matrice: MatriceO;
};

/** Câmpurile unei tăieturi, exact (nici mai multe, nici mai puține). */
export const CAMPURI_TAIETURA_O = [
  'idLume', 'instanta', 'piesa', 'operatie', 'nod', 'latura', 'adancime', 'pas', 'scula', 'forma', 'matrice',
] as const;

/** O tăietură v4: aceleași câmpuri, plus sensul operației ei (ADR 0027). */
export type TaieturaV4O = TaieturaO & { sens: SensO };
/** O tăietură v5: și urechile operației ei (ADR 0028), obiectul din document sau `null`. */
export type TaieturaV5O = TaieturaV4O & { urechi: UrechiO | null };
/** O tăietură v6: și rampa operației ei (ADR 0029), obiectul din document sau `null`. */
export type TaieturaV6O = TaieturaV5O & { rampa: RampaO | null };
/** O tăietură v7: și intrările operației ei (ADR 0030), obiectul din document sau `null`. */
export type TaieturaV7O = TaieturaV6O & { intrari: IntrariO | null };
/** O tăietură v8: și degajările operației ei (ADR 0032), obiectul din document sau `null`. */
export type TaieturaV8O = TaieturaV7O & { colturi: ColturiO | null };

export type CategorieO =
  | 'schema' | 'id' | 'unic-piese' | 'unic-foi' | 'unic-instante' | 'unic-noduri' | 'unic-elemente' | 'referinta'
  | 'adancime' | 'rotire' | 'finit' | 'plafon' | 'foi' | 'pozitiv' | 'margini' | 'ciocnire' | 'forma'
  | 'operatie' | 'unic-operatii' | 'referinta-op' | 'scula' | 'sens' | 'urechi' | 'rampa' | 'intrari' | 'colturi' | 'cale'
  | 'despartire' | 'buzunar' | 'coborare';

/** ADR 0037 §2: laturile documentului v10, exact (ASCII, ca `opozitie`). */
export const LATURI_V10_O = ['interior', 'pe-linie', 'exterior', 'stanga', 'dreapta'] as const;
export type LaturaV10O = (typeof LATURI_V10_O)[number];

/** ADR 0037 §2: forma `cale` din v10 (`inchis` poate fi `false`). */
export type FormaCaleV10O = Liber & { tip: 'cale'; inchis: boolean; varfuri: VarfCaleO[] };
/** ADR 0037 §2: operația v10 = v8 cu laturile noi și `despartire` (opțional). */
export type OperatieV10O = Liber & {
  id: string; tip: 'profil'; noduri: string[]; scula: SculaO; latura: LaturaV10O; adancime: number; pas: number;
  sens: SensO; urechi: UrechiO | null; rampa: RampaO | null; intrari: IntrariO | null; colturi: ColturiO | null;
  despartire?: boolean;
};
export type PiesaV10O = PiesaO & { operatii: OperatieV10O[] };
export type DocV10O = Liber & { schema: 10; rev: number; piese: PiesaV10O[]; foi: FoaieO[] };

/** ADR 0069 §1: operația v11 = v10 cu felul `buzunar` și, doar pe el, `pasLateral`. */
export type OperatieV11O = Liber & Omit<OperatieV10O, 'tip'> & { tip: 'profil' | 'buzunar'; pasLateral?: number };
export type PiesaV11O = PiesaO & { operatii: OperatieV11O[] };
export type DocV11O = Liber & { schema: 11; rev: number; piese: PiesaV11O[]; foi: FoaieO[] };

/** ADR 0076 §1: operația v12 = v11 cu `coborare` opțională. */
export type OperatieV12O = OperatieV11O & { coborare?: Liber };
export type PiesaV12O = PiesaO & { operatii: OperatieV12O[] };
export type DocV12O = Liber & { schema: 12; rev: number; piese: PiesaV12O[]; foi: FoaieO[] };

/** ADR 0027 §5: valorile primite ale sensului, exact; implicitul migrării și al operației noi. */
export const SENSURI_O: readonly SensO[] = ['urcare', 'opozitie'];
export const SENS_IMPLICIT_O: SensO = 'urcare';
/** ADR 0028 §1: implicitul migrării v4 → v5 și al operației noi (fără urechi). */
export const URECHI_IMPLICITE_O = null;
/** ADR 0028 §1: valorile cu care se pornesc urechile din dialog (4 × 8 mm × 2 mm, cele ale plăcii 2). */
export const URECHI_DIALOG_O = { numar: 4, latime: 8, grosime: 2 } as const;
/** ADR 0029 §1: implicitul migrării v5 → v6 și al operației noi (fără rampă). */
export const RAMPA_IMPLICITA_O = null;
/** ADR 0029 §1: lungimea cu care se pornește rampa din dialog, în mm. */
export const RAMPA_DIALOG_O = { lungime: 10 } as const;
/** ADR 0030 §1: implicitul migrării v6 → v7 și al operației noi (fără intrări). */
export const INTRARI_IMPLICITE_O = null;
/** ADR 0030 §1: raza cu care se pornesc intrările din dialog, în mm. */
export const INTRARI_DIALOG_O = { raza: 3 } as const;
/** ADR 0030 §6: sub atât (mm), exportul refuză intrările (documentul le admite). */
export const RAZA_MINIMA_INTRARI_O = 0.5;
/** ADR 0032 §1: implicitul migrării v7 → v8 și al operației noi (fără degajări). */
export const COLTURI_IMPLICITE_O = null;
/** ADR 0032 §1: tipurile degajărilor, exact. */
export const TIPURI_COLTURI_O: readonly TipColturiO[] = ['dog-bone', 't-bone'];
/** Versiunea curentă a contractului documentului, după oracol. */
export const SCHEMA_CURENTA_O = 12;

export const PLAFOANE_O = {
  latura: 10_000,
  grosime: 1_000,
  noduri: 100_000,
  instante: 100_000,
  foi: 1_000,
  adancime: 32,
  idLungime: 64,
  numeLungime: 200,
  elementeV1: 100_000,
  /** |a|, |b|, |c|, |d| ai matricei compuse față de rădăcina piesei. */
  coeficient: 10_000,
  /** |e|, |f| ai matricei compuse față de rădăcina piesei, în mm. */
  translatie: 10_000_000,
  /** |x|, |y| ai instanței, în mm. */
  pozitie: 10_000_000,
  /** Elementele în lume ale tuturor foilor (cât plafonul de elemente din v1). */
  elementeLume: 100_000,
  /** Niveluri de imbricare ale întregului JSON (documentul e nivelul 1). */
  adancimeJson: 200,
  campuriChei: 200,
  campuriCheie: 200,
  campuriValoare: 10_000,
  /** Toleranța similitudinii, relativă la scară. */
  similitudine: 1e-12,
  /**
   * ADR 0034 §2 (precizarea recenziei, 11.10): toleranța similitudinii matricei în lume a unui element cu arce
   * (`TOLERANTA_SIMILITUDINE_LUME`), cu aceeași formă ca cea din piesă (relativă la scară).
   */
  similitudineLume: 2e-12,
  // ADR 0025.
  /** Operațiile din tot documentul, și ale pieselor fără instanțe. */
  operatii: 100_000,
  /** Tăieturile în lume: suma, pe instanțele tuturor foilor, a referințelor din operațiile piesei lor. */
  taieturiLume: 100_000,
  noduriOperatie: 10_000,
  sculaNumarMin: 1,
  sculaNumarMax: 999,
  sculaNume: 200,
  /** Diametrul sculei, în (0, 100] mm. */
  sculaDiametru: 100,
  /** Adâncimea și pasul, în (0, 1 000] mm. */
  adancimeOperatie: 1_000,
  pasOperatie: 1_000,
  // ADR 0028.
  /** `PLAFON.urechi`: câte urechi pe buclă, întreg în 1–100. */
  urechiMin: 1,
  urechi: 100,
  // ADR 0034.
  /** Vârfurile unei căi: cel puțin 2, cel mult `PLAFON.varfuriCale`. */
  varfuriCaleMin: 2,
  varfuriCale: 50_000,
  /** Vârfurile tuturor căilor pieselor, și ale celor fără instanțe. */
  varfuri: 200_000,
  /** Vârfurile în lume: fiecare instanță de pe orice foaie, cu vârfurile căilor piesei ei. */
  varfuriLume: 1_000_000,
} as const;

/** Clasele tăieturilor, în ordinea în care se taie. */
export const ORDINEA_LATURILOR_O: readonly LaturaO[] = ['interior', 'pe-linie', 'exterior'];

/** Migrarea v2 → v3: scula și parametrii impliciți, pe forme (ADR 0025). */
export const SCULA_IMPLICITA_O = { numar: 1, nume: 'freza plata', diametru: 6 } as const;
export const IMPLICITE_O = {
  cerc: { latura: 'interior', adancime: 8, pas: 4 },
  dreptunghi: { latura: 'exterior', adancime: 3, pas: 3 },
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Matricea, scrisă din convenție (p′ = m2(m1(p)), dezvoltat pe hârtie).

export const IDENTITATE_O: MatriceO = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** `compuneO(m2, m1)`: întâi m1, apoi m2. */
export function compuneO(m2: MatriceO, m1: MatriceO): MatriceO {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

export function aplicaO(m: MatriceO, p: PunctO): PunctO {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function translatieO(x: number, y: number): MatriceO {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

/** Cosinusul și sinusul exacte la multiplii de 90° (contractul), altfel `Math.cos` / `Math.sin`. */
const EXACTE_O: ReadonlyMap<number, readonly [number, number]> = new Map([
  [0, [1, 0]], [90, [0, 1]], [180, [-1, 0]], [270, [0, -1]],
]);

/** Rotirea trigonometrică (în sens invers acelor de ceas), în grade: (1, 0) ajunge în (cos, sin). */
export function rotatieO(grade: number): MatriceO {
  const r = grade >= 0 && grade < 360 ? grade : ((grade % 360) + 360) % 360;
  const exact = EXACTE_O.get(r);
  const cos = exact ? exact[0] : Math.cos((r * Math.PI) / 180);
  const sin = exact ? exact[1] : Math.sin((r * Math.PI) / 180);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/** Precizarea 5: o matrice compusă față de rădăcina piesei e în margini (NaN și ±∞ nu sunt). */
export function inMarginiO(m: MatriceO): boolean {
  const coeficienti = [m.a, m.b, m.c, m.d].every((v) => Math.abs(v) <= PLAFOANE_O.coeficient);
  const translatii = [m.e, m.f].every((v) => Math.abs(v) <= PLAFOANE_O.translatie);
  return coeficienti && translatii;
}

/** Precizarea 5: rotire + scalare uniformă, eventual cu oglindire, în toleranța relativă; determinantul ≠ 0. */
export function esteSimilitudineO(m: MatriceO, tol: number = PLAFOANE_O.similitudine): boolean {
  const scara = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d), 1);
  const toleranta = tol * scara;
  const directa = Math.abs(m.a - m.d) <= toleranta && Math.abs(m.b + m.c) <= toleranta;
  const oglindita = Math.abs(m.a + m.d) <= toleranta && Math.abs(m.b - m.c) <= toleranta;
  const determinant = m.a * m.d - m.b * m.c;
  return (directa || oglindita) && determinant !== 0;
}

/**
 * Un obiect sau o listă mai adâncă decât `max` niveluri (valoarea însăși e nivelul 1). Iterativ, cu oprire la prima
 * depășire: un lanț de 100 000 de niveluri nu umple stiva.
 */
export function preaAdancJsonO(v: unknown, max: number): boolean {
  const stiva: Array<readonly [unknown, number]> = [[v, 1]];
  for (let pas = stiva.pop(); pas !== undefined; pas = stiva.pop()) {
    const [x, nivel] = pas;
    if (typeof x !== 'object' || x === null) continue;
    if (nivel > max) return true;
    for (const copil of Object.values(x)) if (typeof copil === 'object' && copil !== null) stiva.push([copil, nivel + 1]);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------------------------
// Elementele și tăieturile în lume. Documentul e presupus valid.

/** v1: fiecare element e propria lui instanță, cu matricea neschimbată. */
export function geometrieV1(doc: DocV1O): ElementLumeO[] {
  return doc.elemente.map((e) => ({ idLume: `${e.id}/${e.id}`, forma: e.forma, matrice: e.matrice }));
}

type ElementInstantaO = { readonly id: string; readonly forma: unknown; readonly matrice: MatriceO };

/**
 * Elementele piesei unei instanțe, în preordine (grupurile nu desenează nimic), cu matricea în lume:
 * M = translație(x, y) ∘ rotație(rotire), apoi M = compune(M, nod) pe drum, de la rădăcină în jos (precizarea 3).
 */
function elementeInstantaO(piesa: PiesaO, inst: InstantaO): ElementInstantaO[] {
  const rez: ElementInstantaO[] = [];
  const coboara = (nod: NodO, deasupra: MatriceO): void => {
    const m = compuneO(deasupra, nod.matrice);
    if (nod.tip === 'element') {
      rez.push({ id: nod.id, forma: nod.forma, matrice: m });
      return;
    }
    for (const copil of nod.copii) coboara(copil, m);
  };
  coboara(piesa.radacina, compuneO(translatieO(inst.x, inst.y), rotatieO(inst.rotire)));
  return rez;
}

/** Piesele după id (la id-uri repetate, prima; un document valid nu le are). */
function indexPiese<P extends PiesaO>(piese: readonly P[]): Map<string, P> {
  const rez = new Map<string, P>();
  for (const p of piese) if (!rez.has(p.id)) rez.set(p.id, p);
  return rez;
}

/** O foaie, v2 sau v3: instanțele în ordinea foii; în fiecare piesă, elementele în preordine. */
export function geometrieV2(doc: DocArboreO, indexFoaie = 0): ElementLumeO[] {
  const foaie = doc.foi[indexFoaie];
  if (foaie === undefined) throw new Error(`foaia ${indexFoaie} nu există`);
  const piese = indexPiese(doc.piese);
  const rez: ElementLumeO[] = [];
  for (const inst of foaie.instante) {
    const piesa = piese.get(inst.piesa);
    if (piesa === undefined) throw new Error(`instanța ${inst.id} trimite la piesa lipsă ${inst.piesa}`);
    for (const e of elementeInstantaO(piesa, inst)) rez.push({ idLume: `${inst.id}/${e.id}`, forma: e.forma, matrice: e.matrice });
  }
  return rez;
}

/**
 * Tăieturile unei foi, cu operația din care vine fiecare, în ordinea contractului: clasa (interior, pe-linie,
 * exterior); în clasă, instanțele în ordinea foii, operațiile în ordinea piesei, nodurile în ordinea operației.
 * Elementele fără operație nu se taie.
 */
function taieturiCuOperatii<Op extends OperatieO>(
  doc: { readonly piese: ReadonlyArray<PiesaO & { operatii: readonly Op[] }>; readonly foi: readonly FoaieO[] }, indexFoaie: number,
): Array<{ readonly t: TaieturaO; readonly op: Op }> {
  const foaie = doc.foi[indexFoaie];
  if (foaie === undefined) throw new Error(`foaia ${indexFoaie} nu există`);
  const piese = indexPiese(doc.piese);
  // Matricele în lume ale elementelor fiecărei instanțe, calculate o singură dată.
  const lumi = foaie.instante.map((inst) => {
    const piesa = piese.get(inst.piesa);
    if (piesa === undefined) throw new Error(`instanța ${inst.id} trimite la piesa lipsă ${inst.piesa}`);
    const elemente = new Map<string, ElementInstantaO>();
    for (const e of elementeInstantaO(piesa, inst)) elemente.set(e.id, e);
    return { inst, piesa, elemente };
  });
  const rez: Array<{ readonly t: TaieturaO; readonly op: Op }> = [];
  for (const latura of ORDINEA_LATURILOR_O) {
    for (const { inst, piesa, elemente } of lumi) {
      for (const op of piesa.operatii) {
        if (op.latura !== latura) continue;
        for (const nod of op.noduri) {
          const e = elemente.get(nod);
          if (e === undefined) throw new Error(`operația ${op.id} a piesei ${piesa.id} trimite la ${nod}, care nu e element`);
          rez.push({
            t: {
              idLume: `${inst.id}/${nod}`, instanta: inst.id, piesa: piesa.id, operatie: op.id, nod,
              latura: op.latura, adancime: op.adancime, pas: op.pas, scula: op.scula, forma: e.forma, matrice: e.matrice,
            },
            op,
          });
        }
      }
    }
  }
  return rez;
}

/** Tăieturile unei foi v3, v4, v5 sau v6 (cele 11 câmpuri ale contractului din ADR 0025), în ordinea contractului. */
export function taieturiV3O(doc: DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O, indexFoaie = 0): TaieturaO[] {
  return taieturiCuOperatii<OperatieO>(doc, indexFoaie).map((x) => x.t);
}

/** Tăieturile unei foi v4 (sau v5), fiecare cu sensul operației ei (ADR 0027), în aceeași ordine. */
export function taieturiV4O(doc: DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O, indexFoaie = 0): TaieturaV4O[] {
  return taieturiCuOperatii<OperatieV4O>(doc, indexFoaie).map(({ t, op }) => ({ ...t, sens: op.sens }));
}

/** Tăieturile unei foi v5, fiecare cu sensul și urechile operației ei (ADR 0028), în aceeași ordine. */
export function taieturiV5O(doc: DocV5O | DocV6O | DocV7O | DocV8O | DocV9O, indexFoaie = 0): TaieturaV5O[] {
  return taieturiCuOperatii<OperatieV5O>(doc, indexFoaie).map(({ t, op }) => ({ ...t, sens: op.sens, urechi: op.urechi }));
}

/** Tăieturile unei foi v6, fiecare cu sensul, urechile și rampa operației ei (ADR 0029), în aceeași ordine. */
export function taieturiV6O(doc: DocV6O | DocV7O | DocV8O | DocV9O, indexFoaie = 0): TaieturaV6O[] {
  return taieturiCuOperatii<OperatieV6O>(doc, indexFoaie).map(({ t, op }) => ({ ...t, sens: op.sens, urechi: op.urechi, rampa: op.rampa }));
}

/** Tăieturile unei foi v7, fiecare cu sensul, urechile, rampa și intrările operației ei (ADR 0030), în aceeași ordine. */
export function taieturiV7O(doc: DocV7O | DocV8O | DocV9O, indexFoaie = 0): TaieturaV7O[] {
  return taieturiCuOperatii<OperatieV7O>(doc, indexFoaie).map(({ t, op }) => ({
    ...t, sens: op.sens, urechi: op.urechi, rampa: op.rampa, intrari: op.intrari,
  }));
}

/** Tăieturile unei foi v8, fiecare cu sensul, urechile, rampa, intrările și degajările operației ei (ADR 0032). */
export function taieturiV8O(doc: DocV8O | DocV9O, indexFoaie = 0): TaieturaV8O[] {
  return taieturiCuOperatii<OperatieV8O>(doc, indexFoaie).map(({ t, op }) => ({
    ...t, sens: op.sens, urechi: op.urechi, rampa: op.rampa, intrari: op.intrari, colturi: op.colturi,
  }));
}

/** ADR 0025: „o singură sculă pe program”. Motivul refuzului exportului (număr sau diametru diferit), sau nimic. */
export function sculaUnicaO(taieturi: readonly TaieturaO[]): string | undefined {
  const prima = taieturi[0];
  if (prima === undefined) return undefined;
  const alta = taieturi.find((t) => t.scula.numar !== prima.scula.numar || t.scula.diametru !== prima.scula.diametru);
  if (alta === undefined) return undefined;
  return `scule diferite în același program: ${prima.operatie} (T${prima.scula.numar}, Ø${prima.scula.diametru}) și `
    + `${alta.operatie} (T${alta.scula.numar}, Ø${alta.scula.diametru})`;
}

// ---------------------------------------------------------------------------------------------------------------
// Migrările, literal după contracte. Documentul de intrare e presupus primit (verificarea lui e goală).

const CHEI_DOC_V1: ReadonlySet<string> = new Set(['schema', 'rev', 'foaie', 'elemente']);
const CHEI_ELEMENT_V1: ReadonlySet<string> = new Set(['id', 'nume', 'forma', 'matrice']);
const CHEI_MATRICE: ReadonlySet<string> = new Set(['a', 'b', 'c', 'd', 'e', 'f']);

/** Câmpurile unui obiect, fără cele cunoscute, copiate adânc (cheile se creează ca proprii, și `__proto__`). */
function necunoscute(o: Liber, cunoscute: ReadonlySet<string>): Liber {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !cunoscute.has(k)).map(([k, v]) => [k, structuredClone(v)]));
}

/** Documentul v2 pe care ADR 0024 îl cere din v1. */
export function migreazaV1O(v1: DocV1O): DocV2O {
  const piese: PiesaO[] = [];
  const instante: InstantaO[] = [];
  for (const e of v1.elemente) {
    const m = e.matrice;
    const radacina: ElementO = {
      ...necunoscute(e, CHEI_ELEMENT_V1),
      tip: 'element',
      id: e.id,
      forma: structuredClone(e.forma),
      matrice: { ...necunoscute(m, CHEI_MATRICE), a: m.a, b: m.b, c: m.c, d: m.d, e: 0, f: 0 },
    };
    piese.push(e.nume === undefined ? { id: e.id, radacina } : { id: e.id, nume: e.nume, radacina });
    instante.push({ id: e.id, piesa: e.id, x: m.e, y: m.f, rotire: 0 });
  }
  return {
    ...necunoscute(v1, CHEI_DOC_V1),
    schema: 2,
    rev: v1.rev,
    piese,
    foi: [{ id: 'f1', stoc: structuredClone(v1.foaie), instante }],
  };
}

/** Elementele unui arbore, în preordine (grupurile nu intră). Iterativ. */
export function preordineElementeO(radacina: NodO): ElementO[] {
  const rez: ElementO[] = [];
  const stiva: NodO[] = [radacina];
  for (let nod = stiva.pop(); nod !== undefined; nod = stiva.pop()) {
    if (nod.tip === 'element') { rez.push(nod); continue; }
    for (let k = nod.copii.length - 1; k >= 0; k--) stiva.push(nod.copii[k] as NodO);
  }
  return rez;
}

/** Operația implicită a unui element la migrarea v2 → v3 (ADR 0025). */
export function operatieImplicitaO(e: ElementO): OperatieO {
  const tip = e.forma['tip'];
  const p = tip === 'cerc' ? IMPLICITE_O.cerc : tip === 'dreptunghi' ? IMPLICITE_O.dreptunghi : undefined;
  if (p === undefined) throw new Error(`elementul ${e.id} are forma ${String(tip)}, fără operație implicită`);
  return {
    id: e.id, tip: 'profil', noduri: [e.id], scula: { ...SCULA_IMPLICITA_O },
    latura: p.latura, adancime: p.adancime, pas: p.pas,
  };
}

/** Documentul v3 pe care ADR 0025 îl cere din v2: doar `schema` și `operatii` pe fiecare piesă; restul rămâne. */
export function migreazaV2V3O(v2: DocV2O): DocV3O {
  const copie = structuredClone(v2);
  const piese: PiesaV3O[] = copie.piese.map((p) => ({ ...p, operatii: preordineElementeO(p.radacina).map(operatieImplicitaO) }));
  return { ...copie, schema: 3, piese };
}

/**
 * Pașii de la v3 la v9: câmpul nou pe care fiecare îl pune pe operații și valoarea lui implicită (v8 → v9 n-are câmp nou,
 * doar numărul). Felia 2.7b: lanțurile lungi se fac cu O SINGURĂ copie și pașii pe loc (`urcaPeLoc`), nu cu câte o
 * copie la fiecare pas și fiecare lanț recalculat de la capăt (pătratic, minute întregi pe un document de 100 000 de
 * operații). Pașii unici (`migreazaV3V4O` … `migreazaV8V9O`) rămân definițiile de referință; `urcaPeLoc` face exact ce
 * fac ei (fiecare operație, un obiect NOU, cu câmpul adăugat la capăt; piesele, obiecte noi; cheile de sus, în ordinea
 * lor), iar sesiunea care a scris-o a comparat cele două căi pe tot corpusul (aceleași documente, octet cu octet).
 */
const PASI_O: ReadonlyArray<{ readonly de: number; readonly camp: string | null; readonly implicit: unknown }> = [
  { de: 3, camp: 'sens', implicit: SENS_IMPLICIT_O }, { de: 4, camp: 'urechi', implicit: URECHI_IMPLICITE_O },
  { de: 5, camp: 'rampa', implicit: RAMPA_IMPLICITA_O }, { de: 6, camp: 'intrari', implicit: INTRARI_IMPLICITE_O },
  { de: 7, camp: 'colturi', implicit: COLTURI_IMPLICITE_O }, { de: 8, camp: null, implicit: null },
  // ADR 0037 §2: v9 → v10 schimbă doar numărul (ciocnirea `despartire` o judecă ușa, `ciocniriDespartireO`).
  { de: 9, camp: null, implicit: null },
  // ADR 0069 §2: v10 → v11 schimbă doar numărul (ciocnirea `pasLateral` o judecă ușa, `ciocniriPasLateralO`).
  { de: 10, camp: null, implicit: null },
  // ADR 0076 §2: v11 → v12 schimbă doar numărul (ciocnirea `coborare` o judecă ușa, `ciocniriCoborareO`).
  { de: 11, camp: null, implicit: null },
];

/** Pasul vk → vk+1 (k = 3 … 9), pe loc, pe un document deja copiat (și deja verificat: nicio ciocnire). */
function urcaPeLoc(d: Liber, de: number): void {
  const pas = PASI_O.find((x) => x.de === de)!;
  if (pas.camp !== null) {
    const camp = pas.camp;
    d['piese'] = (d['piese'] as Liber[]).map((piesa) => ({
      ...piesa,
      operatii: (piesa['operatii'] as Liber[]).map((o) => ({ ...o, [camp]: pas.implicit })),
    }));
  }
  d['schema'] = de + 1;
}

/** Orice versiune până la `pana`, adusă la `pana` (o copie; un document deja la `pana` rămâne neschimbat). */
function ridicaLaO<T>(doc: { readonly schema: number }, pana: number): T {
  if (doc.schema === pana) return structuredClone(doc) as T;
  let d: Liber;
  if (doc.schema === 1) d = migreazaV2V3O(migreazaV1O(doc as DocV1O)) as Liber;
  else if (doc.schema === 2) d = migreazaV2V3O(doc as DocV2O) as Liber;
  else d = structuredClone(doc) as Liber;
  for (let k = d['schema'] as number; k < pana; k++) urcaPeLoc(d, k);
  return d as T;
}

/** v1 → v2 → v3, în lanț. */
export function migreazaV1V3O(v1: DocV1O): DocV3O {
  return migreazaV2V3O(migreazaV1O(v1));
}

/**
 * Documentul v4 pe care ADR 0027 îl cere din v3: `schema: 4` și `sens: 'urcare'` pe fiecare operație; restul rămâne,
 * cu câmpurile necunoscute. Documentul de intrare e presupus migrabil (nicio operație cu un câmp propriu `sens`).
 */
export function migreazaV3V4O(v3: DocV3O): DocV4O {
  const copie = structuredClone(v3);
  const piese: PiesaV4O[] = copie.piese.map((p) => ({
    ...p,
    operatii: p.operatii.map((o): OperatieV4O => ({ ...o, sens: SENS_IMPLICIT_O })),
  }));
  return { ...copie, schema: 4, piese };
}

/** v2 → v3 → v4, în lanț. */
export function migreazaV2V4O(v2: DocV2O): DocV4O {
  return ridicaLaO<DocV4O>(v2, 4);
}

/** v1 → v2 → v3 → v4, în lanț. */
export function migreazaV1V4O(v1: DocV1O): DocV4O {
  return ridicaLaO<DocV4O>(v1, 4);
}

/** Orice versiune primită până la 4, adusă la v4 (o copie; un v4 rămâne neschimbat). */
export function ridicaV4O(doc: DocV1O | DocV2O | DocV3O | DocV4O): DocV4O {
  return ridicaLaO<DocV4O>(doc, 4);
}

/**
 * Documentul v5 pe care ADR 0028 îl cere din v4: `schema: 5` și `urechi: null` pe fiecare operație; restul rămâne, cu
 * câmpurile necunoscute. Documentul de intrare e presupus migrabil (nicio operație cu un câmp propriu `urechi`).
 */
export function migreazaV4V5O(v4: DocV4O): DocV5O {
  const copie = structuredClone(v4);
  const piese: PiesaV5O[] = copie.piese.map((p) => ({
    ...p,
    operatii: p.operatii.map((o): OperatieV5O => ({ ...o, urechi: URECHI_IMPLICITE_O })),
  }));
  return { ...copie, schema: 5, piese };
}

/** v3 → v4 → v5, v2 → … → v5 și v1 → … → v5, în lanț. */
export function migreazaV3V5O(v3: DocV3O): DocV5O {
  return ridicaLaO<DocV5O>(v3, 5);
}
export function migreazaV2V5O(v2: DocV2O): DocV5O {
  return ridicaLaO<DocV5O>(v2, 5);
}
export function migreazaV1V5O(v1: DocV1O): DocV5O {
  return ridicaLaO<DocV5O>(v1, 5);
}

/** Orice versiune primită până la 5, adusă la v5 (o copie; un v5 rămâne neschimbat). */
export function ridicaV5O(doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O): DocV5O {
  return ridicaLaO<DocV5O>(doc, 5);
}

/**
 * Documentul v6 pe care ADR 0029 îl cere din v5: `schema: 6` și `rampa: null` pe fiecare operație; restul rămâne, cu
 * câmpurile necunoscute. Documentul de intrare e presupus migrabil (nicio operație cu un câmp propriu `rampa`).
 */
export function migreazaV5V6O(v5: DocV5O): DocV6O {
  const copie = structuredClone(v5);
  const piese: PiesaV6O[] = copie.piese.map((p) => ({
    ...p,
    operatii: p.operatii.map((o): OperatieV6O => ({ ...o, rampa: RAMPA_IMPLICITA_O })),
  }));
  return { ...copie, schema: 6, piese };
}

/** v4 → v5 → v6, v3 → … → v6, v2 → … → v6 și v1 → … → v6, în lanț. */
export function migreazaV4V6O(v4: DocV4O): DocV6O {
  return ridicaLaO<DocV6O>(v4, 6);
}
export function migreazaV3V6O(v3: DocV3O): DocV6O {
  return ridicaLaO<DocV6O>(v3, 6);
}
export function migreazaV2V6O(v2: DocV2O): DocV6O {
  return ridicaLaO<DocV6O>(v2, 6);
}
export function migreazaV1V6O(v1: DocV1O): DocV6O {
  return ridicaLaO<DocV6O>(v1, 6);
}

/** Orice versiune primită până la 6, adusă la v6 (o copie; un v6 rămâne neschimbat). */
export function ridicaV6O(doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O): DocV6O {
  return ridicaLaO<DocV6O>(doc, 6);
}

/**
 * Documentul v7 pe care ADR 0030 îl cere din v6: `schema: 7` și `intrari: null` pe fiecare operație; restul rămâne, cu
 * câmpurile necunoscute. Documentul de intrare e presupus migrabil (nicio operație cu un câmp propriu `intrari`).
 */
export function migreazaV6V7O(v6: DocV6O): DocV7O {
  const copie = structuredClone(v6);
  const piese: PiesaV7O[] = copie.piese.map((p) => ({
    ...p,
    operatii: p.operatii.map((o): OperatieV7O => ({ ...o, intrari: INTRARI_IMPLICITE_O })),
  }));
  return { ...copie, schema: 7, piese };
}

/** v5 → v6 → v7, …, v1 → … → v7, în lanț. */
export function migreazaV5V7O(v5: DocV5O): DocV7O {
  return ridicaLaO<DocV7O>(v5, 7);
}
export function migreazaV4V7O(v4: DocV4O): DocV7O {
  return ridicaLaO<DocV7O>(v4, 7);
}
export function migreazaV3V7O(v3: DocV3O): DocV7O {
  return ridicaLaO<DocV7O>(v3, 7);
}
export function migreazaV2V7O(v2: DocV2O): DocV7O {
  return ridicaLaO<DocV7O>(v2, 7);
}
export function migreazaV1V7O(v1: DocV1O): DocV7O {
  return ridicaLaO<DocV7O>(v1, 7);
}

/** Orice versiune primită până la 7, adusă la v7 (o copie; un v7 rămâne neschimbat). */
export function ridicaV7O(doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O | DocV7O): DocV7O {
  return ridicaLaO<DocV7O>(doc, 7);
}

/**
 * Documentul v8 pe care ADR 0032 îl cere din v7: `schema: 8` și `colturi: null` pe fiecare operație; restul rămâne, cu
 * câmpurile necunoscute. Documentul de intrare e presupus migrabil (nicio operație cu un câmp propriu `colturi`).
 */
export function migreazaV7V8O(v7: DocV7O): DocV8O {
  const copie = structuredClone(v7);
  const piese: PiesaV8O[] = copie.piese.map((p) => ({
    ...p,
    operatii: p.operatii.map((o): OperatieV8O => ({ ...o, colturi: COLTURI_IMPLICITE_O })),
  }));
  return { ...copie, schema: 8, piese };
}

/** v6 → v7 → v8, …, v1 → … → v8, în lanț. */
export function migreazaV6V8O(v6: DocV6O): DocV8O {
  return ridicaLaO<DocV8O>(v6, 8);
}
export function migreazaV5V8O(v5: DocV5O): DocV8O {
  return ridicaLaO<DocV8O>(v5, 8);
}
export function migreazaV4V8O(v4: DocV4O): DocV8O {
  return ridicaLaO<DocV8O>(v4, 8);
}
export function migreazaV3V8O(v3: DocV3O): DocV8O {
  return ridicaLaO<DocV8O>(v3, 8);
}
export function migreazaV2V8O(v2: DocV2O): DocV8O {
  return ridicaLaO<DocV8O>(v2, 8);
}
export function migreazaV1V8O(v1: DocV1O): DocV8O {
  return ridicaLaO<DocV8O>(v1, 8);
}

/** Orice versiune primită până la 8, adusă la v8 (o copie; un v8 rămâne neschimbat). */
export function ridicaV8O(doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O): DocV8O {
  return ridicaLaO<DocV8O>(doc, 8);
}

/** Documentul v9 pe care ADR 0034 §3 îl cere din v8: doar `schema: 9`; tot restul rămâne, cu câmpurile necunoscute. */
export function migreazaV8V9O(v8: DocV8O): DocV9O {
  return { ...structuredClone(v8), schema: 9 };
}

/** v7 → v8 → v9, …, v1 → … → v9, în lanț. */
export function migreazaV7V9O(v7: DocV7O): DocV9O {
  return ridicaLaO<DocV9O>(v7, 9);
}
export function migreazaV6V9O(v6: DocV6O): DocV9O {
  return ridicaLaO<DocV9O>(v6, 9);
}
export function migreazaV5V9O(v5: DocV5O): DocV9O {
  return ridicaLaO<DocV9O>(v5, 9);
}
export function migreazaV4V9O(v4: DocV4O): DocV9O {
  return ridicaLaO<DocV9O>(v4, 9);
}
export function migreazaV3V9O(v3: DocV3O): DocV9O {
  return ridicaLaO<DocV9O>(v3, 9);
}
export function migreazaV2V9O(v2: DocV2O): DocV9O {
  return ridicaLaO<DocV9O>(v2, 9);
}
export function migreazaV1V9O(v1: DocV1O): DocV9O {
  return ridicaLaO<DocV9O>(v1, 9);
}

/** Orice versiune primită până la 9, adusă la v9 (o copie; un v9 rămâne neschimbat): lanțul de dinainte de ADR 0037. */
export function ridicaV9O(doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O): DocV9O {
  return ridicaLaO<DocV9O>(doc, 9);
}

/** Documentul v10 pe care ADR 0037 §2 îl cere din v9: doar `schema: 10`; tot restul rămâne, cu câmpurile necunoscute. */
export function migreazaV9V10O(v9: DocV9O): DocV10O {
  return { ...structuredClone(v9), schema: 10 } as unknown as DocV10O;
}

/** v8 → v9 → v10, …, v1 → … → v10, în lanț (felia 2.3c-2: lanțurile spre ultima versiune primesc pasul v9 → v10). */
export function migreazaV8V10O(v8: DocV8O): DocV10O {
  return ridicaLaO<DocV10O>(v8, 10);
}
export function migreazaV7V10O(v7: DocV7O): DocV10O {
  return ridicaLaO<DocV10O>(v7, 10);
}
export function migreazaV6V10O(v6: DocV6O): DocV10O {
  return ridicaLaO<DocV10O>(v6, 10);
}
export function migreazaV5V10O(v5: DocV5O): DocV10O {
  return ridicaLaO<DocV10O>(v5, 10);
}
export function migreazaV4V10O(v4: DocV4O): DocV10O {
  return ridicaLaO<DocV10O>(v4, 10);
}
export function migreazaV1V10O(v1: DocV1O): DocV10O {
  return ridicaLaO<DocV10O>(v1, 10);
}

/**
 * Orice versiune primită până la 10, adusă la v10 (o copie; un v10 rămâne neschimbat): `ridicaO` de dinainte de ADR 0069.
 * Felia 2.3c-2: până la v9 era `ridicaO` de atunci (păstrat ca `ridicaV9O`).
 */
export function ridicaV10O(doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O): DocV10O {
  return ridicaLaO<DocV10O>(doc, 10);
}

/** Documentul v11 pe care ADR 0069 §2 îl cere din v10: doar `schema: 11`; tot restul rămâne, cu câmpurile necunoscute. */
export function migreazaV10V11O(v10: DocV10O): DocV11O {
  return { ...structuredClone(v10), schema: 11 } as unknown as DocV11O;
}

/** v9 → v10 → v11, …, v1 → … → v11, în lanț (felia 5.1↑: lanțurile spre ultima versiune primesc pasul v10 → v11). */
export function migreazaV9V11O(v9: DocV9O): DocV11O {
  return ridicaLaO<DocV11O>(v9, 11);
}
export function migreazaV8V11O(v8: DocV8O): DocV11O {
  return ridicaLaO<DocV11O>(v8, 11);
}
export function migreazaV7V11O(v7: DocV7O): DocV11O {
  return ridicaLaO<DocV11O>(v7, 11);
}
export function migreazaV6V11O(v6: DocV6O): DocV11O {
  return ridicaLaO<DocV11O>(v6, 11);
}
export function migreazaV5V11O(v5: DocV5O): DocV11O {
  return ridicaLaO<DocV11O>(v5, 11);
}
export function migreazaV4V11O(v4: DocV4O): DocV11O {
  return ridicaLaO<DocV11O>(v4, 11);
}
export function migreazaV1V11O(v1: DocV1O): DocV11O {
  return ridicaLaO<DocV11O>(v1, 11);
}

/** v10 → v11 → v12, …, v1 → … → v12, în lanț (felia 5.3↑: lanțurile spre ultima versiune primesc pasul v11 → v12). */
export function migreazaV10V12O(v10: DocV10O): DocV12O {
  return ridicaLaO<DocV12O>(v10, 12);
}
export function migreazaV9V12O(v9: DocV9O): DocV12O {
  return ridicaLaO<DocV12O>(v9, 12);
}
export function migreazaV8V12O(v8: DocV8O): DocV12O {
  return ridicaLaO<DocV12O>(v8, 12);
}
export function migreazaV7V12O(v7: DocV7O): DocV12O {
  return ridicaLaO<DocV12O>(v7, 12);
}
export function migreazaV6V12O(v6: DocV6O): DocV12O {
  return ridicaLaO<DocV12O>(v6, 12);
}
export function migreazaV5V12O(v5: DocV5O): DocV12O {
  return ridicaLaO<DocV12O>(v5, 12);
}
export function migreazaV4V12O(v4: DocV4O): DocV12O {
  return ridicaLaO<DocV12O>(v4, 12);
}
export function migreazaV1V12O(v1: DocV1O): DocV12O {
  return ridicaLaO<DocV12O>(v1, 12);
}

/** Orice versiune primită până la 11, adusă la v11 (o copie): `ridicaO` de dinainte de ADR 0076. */
export function ridicaV11O(
  doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O,
): DocV11O {
  return ridicaLaO<DocV11O>(doc, 11);
}

/** Documentul v12 pe care ADR 0076 §2 îl cere din v11: doar `schema: 12`; tot restul rămâne, cu câmpurile necunoscute. */
export function migreazaV11V12O(v11: DocV11O): DocV12O {
  return { ...structuredClone(v11), schema: 12 } as unknown as DocV12O;
}

/** Orice versiune primită, adusă la versiunea curentă, v12 (o copie; un v12 rămâne neschimbat). */
export function ridicaO(
  doc: DocV1O | DocV2O | DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O | DocV12O,
): DocV12O {
  return ridicaLaO<DocV12O>(doc, 12);
}

// ---------------------------------------------------------------------------------------------------------------
// Validitatea. Fiecare problemă începe cu categoria ei între paranteze drepte.

const ID_O = /^[A-Za-z0-9_-]+$/;
const LATURI_O: ReadonlySet<unknown> = new Set<unknown>(ORDINEA_LATURILOR_O);
const LATURI_V10_SET_O: ReadonlySet<unknown> = new Set<unknown>(LATURI_V10_O);
const SENSURI_SET_O: ReadonlySet<unknown> = new Set<unknown>(SENSURI_O);

const esteObiect = (v: unknown): v is Liber => typeof v === 'object' && v !== null && !Array.isArray(v);

type Semnaleaza = (categorie: CategorieO, mesaj: string) => void;

/** Verificările comune v1 / v2 / v3 (forma, matricea, id-ul, numele, mărimile), legate de lista de probleme. */
function unelte(semnaleaza: Semnaleaza, schema = 0) {
  /** Un număr finit, sau nimic (cu problema spusă). */
  const finit = (cale: string, v: unknown): number | undefined => {
    if (typeof v !== 'number') { semnaleaza('schema', `${cale} nu e număr`); return undefined; }
    if (!Number.isFinite(v)) { semnaleaza('finit', `${cale} = ${v}`); return undefined; }
    return v;
  };
  /** O mărime strict pozitivă și sub plafon; o întoarce doar dacă e bună. */
  const dimensiune = (cale: string, v: unknown, max: number): number | undefined => {
    const n = finit(cale, v);
    if (n === undefined) return undefined;
    if (!(n > 0)) { semnaleaza('pozitiv', `${cale} = ${n} nu e pozitivă`); return undefined; }
    if (n > max) { semnaleaza('plafon', `${cale} = ${n} > ${max}`); return undefined; }
    return n;
  };
  const id = (cale: string, v: unknown): string | undefined => {
    if (typeof v !== 'string') { semnaleaza('schema', `${cale} nu e text`); return undefined; }
    if (v.length < 1 || v.length > PLAFOANE_O.idLungime || !ID_O.test(v)) {
      semnaleaza('id', `${cale} = ${JSON.stringify(v)} nu e un id valid`);
    }
    return v;
  };
  const nume = (cale: string, o: Liber): void => {
    const n = o['nume'];
    if (n === undefined) return;
    if (typeof n !== 'string') semnaleaza('schema', `${cale}.nume nu e text`);
    else if (n.length > PLAFOANE_O.numeLungime) semnaleaza('plafon', `${cale}.nume are ${n.length} > ${PLAFOANE_O.numeLungime} caractere`);
  };
  /** Matricea locală, dacă e întreagă și finită. */
  const matrice = (cale: string, v: unknown): MatriceO | undefined => {
    if (!esteObiect(v)) { semnaleaza('schema', `${cale} lipsește sau nu e obiect`); return undefined; }
    const [a, b, c, d, e, f] = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => finit(`${cale}.${k}`, v[k]));
    if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) return undefined;
    return { a, b, c, d, e, f };
  };
  /**
   * Un punct al unei căi (ADR 0034 §2): x și y numere (`[schema]`), finite (`[finit]`), cu |x|, |y| ≤ 10⁷ (`[margini]`).
   * Întoarce punctul, sau nimic.
   */
  const punctCale = (cale: string, v: unknown): PunctO | undefined => {
    if (!esteObiect(v)) { semnaleaza('cale', `${cale} lipsește sau nu e obiect`); return undefined; }
    let bun = true;
    for (const k of ['x', 'y'] as const) {
      const n = finit(`${cale}.${k}`, v[k]);
      if (n === undefined) { bun = false; continue; }
      if (Math.abs(n) > PLAFOANE_O.translatie) { semnaleaza('margini', `${cale}.${k} = ${n} iese din ±${PLAFOANE_O.translatie}`); bun = false; }
    }
    return bun ? { x: v['x'] as number, y: v['y'] as number } : undefined;
  };
  /**
   * Forma `cale` (ADR 0034 §1–§2); întoarce câte vârfuri are (pentru plafoanele de ansamblu) și dacă are arce.
   */
  const formaCale = (cale: string, v: Liber): { varfuri: number; arce: boolean } => {
    // ADR 0037 §2: în v10, `inchis` e boolean; până la v9, doar `true`.
    if (schema >= 10) {
      if (typeof v['inchis'] !== 'boolean') semnaleaza('cale', `${cale}.inchis = ${JSON.stringify(v['inchis']) ?? String(v['inchis'])} nu e boolean`);
    } else if (v['inchis'] !== true) semnaleaza('cale', `${cale}.inchis = ${JSON.stringify(v['inchis']) ?? String(v['inchis'])} nu e true`);
    /** ADR 0037 §2: o cale deschisă are n − 1 segmente reale; segmentul ultimului vârf e doar un `L` obligatoriu. */
    const deschisa = schema >= 10 && v['inchis'] === false;
    const lista = v['varfuri'];
    if (!Array.isArray(lista)) { semnaleaza('cale', `${cale}.varfuri lipsește sau nu e listă`); return { varfuri: 0, arce: false }; }
    if (lista.length < PLAFOANE_O.varfuriCaleMin) semnaleaza('cale', `${cale}.varfuri are ${lista.length} < ${PLAFOANE_O.varfuriCaleMin} vârfuri`);
    if (lista.length > PLAFOANE_O.varfuriCale) {
      semnaleaza('plafon', `${cale}.varfuri are ${lista.length} > ${PLAFOANE_O.varfuriCale} vârfuri`);
      return { varfuri: lista.length, arce: false };
    }
    const puncte = lista.map((x: unknown, k) => (esteObiect(x) ? punctCale(`${cale}.varfuri[${k}].p`, x['p']) : undefined));
    let arce = false;
    lista.forEach((x: unknown, k) => {
      const cv = `${cale}.varfuri[${k}]`;
      if (!esteObiect(x)) { semnaleaza('cale', `${cv} nu e obiect`); return; }
      const sg = x['s'];
      if (!esteObiect(sg)) { semnaleaza('cale', `${cv}.s lipsește sau nu e obiect`); return; }
      if (deschisa && k === lista.length - 1) {
        // §2: un segment ignorat ar fi o dată ascunsă (o închidere l-ar face real fără ca cineva să-l vadă).
        if (sg['tip'] !== 'L') semnaleaza('cale', `${cv}.s.tip = ${JSON.stringify(sg['tip']) ?? String(sg['tip'])}: segmentul ultimului vârf al unei căi deschise trebuie să fie L`);
        return;
      }
      if (sg['tip'] === 'L') return;
      if (sg['tip'] === 'C') {
        punctCale(`${cv}.s.c1`, sg['c1']);
        punctCale(`${cv}.s.c2`, sg['c2']);
        return;
      }
      if (sg['tip'] === 'A') {
        arce = true;
        const b = finit(`${cv}.s.bulge`, sg['bulge']);
        if (b === 0) semnaleaza('cale', `${cv}.s.bulge = 0: arcul n-are cerc`);
        // ADR 0037 §2: pe o cale deschisă, vecinul e k + 1 (segmentele reale sunt doar primele n − 1).
        const a = puncte[k], c = puncte[deschisa ? k + 1 : (k + 1) % lista.length];
        if (b !== undefined && b !== 0 && a !== undefined && c !== undefined && a.x === c.x && a.y === c.y) {
          semnaleaza('cale', `${cv}: arcul are capetele în același punct (${a.x}, ${a.y}): n-are cerc`);
        } else if (b !== undefined && b !== 0 && a !== undefined && c !== undefined) {
          // ADR 0034 §2 (recenzia): raza (c / 4)·(b + 1/b), din coardă și bulge, cel mult `PLAFON.latura` (ca la cerc).
          const raza = (Math.hypot(c.x - a.x, c.y - a.y) / 4) * (Math.abs(b) + 1 / Math.abs(b));
          if (!(raza <= PLAFOANE_O.latura)) semnaleaza('plafon', `${cv}: arcul are raza ${raza} > ${PLAFOANE_O.latura} mm`);
        }
        return;
      }
      semnaleaza('cale', `${cv}.s.tip = ${JSON.stringify(sg['tip']) ?? String(sg['tip'])} nu e L, A sau C`);
    });
    return { varfuri: lista.length, arce };
  };
  /**
   * Forma; `compus` e matricea compusă a elementului față de rădăcina piesei (lipsește în v1, unde se judecă după
   * migrare, sau când o matrice de pe drum e stricată). Întoarce câte vârfuri de cale are (0 pentru celelalte forme).
   */
  const forma = (cale: string, v: unknown, compus?: MatriceO): number => {
    if (!esteObiect(v)) { semnaleaza('schema', `${cale} lipsește sau nu e obiect`); return 0; }
    let arce = false;
    let varfuri = 0;
    if (v['tip'] === 'dreptunghi') {
      const l = dimensiune(`${cale}.latime`, v['latime'], PLAFOANE_O.latura);
      const h = dimensiune(`${cale}.inaltime`, v['inaltime'], PLAFOANE_O.latura);
      const r = finit(`${cale}.razaColt`, v['razaColt']);
      if (r !== undefined && !(r >= 0)) semnaleaza('pozitiv', `${cale}.razaColt = ${r} e negativă`);
      else if (r !== undefined && r > PLAFOANE_O.latura) semnaleaza('plafon', `${cale}.razaColt = ${r} > ${PLAFOANE_O.latura}`);
      if (r !== undefined && r >= 0 && l !== undefined && h !== undefined && 2 * r > Math.min(l, h)) {
        semnaleaza('forma', `${cale}: 2 · razaColt = ${2 * r} > latura mică ${Math.min(l, h)}`);
      }
      arce = r !== undefined && r > 0;
    } else if (v['tip'] === 'cerc') {
      dimensiune(`${cale}.raza`, v['raza'], PLAFOANE_O.latura);
      arce = true;
    } else if (v['tip'] === 'cale' && schema >= 9) {
      const x = formaCale(cale, v);
      arce = x.arce;
      varfuri = x.varfuri;
    } else {
      semnaleaza('schema', `${cale}.tip = ${JSON.stringify(v['tip'])} nu e o formă cunoscută`);
    }
    if (arce && compus !== undefined && inMarginiO(compus) && !esteSimilitudineO(compus)) {
      semnaleaza('forma', `${cale}: o formă cu arce sub o matrice compusă care nu e similitudine: ${JSON.stringify(compus)}`);
    }
    return varfuri;
  };
  const rev = (v: unknown): void => {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) semnaleaza('schema', `rev = ${String(v)} nu e un întreg sigur ≥ 0`);
  };
  const stoc = (cale: string, v: unknown): void => {
    if (!esteObiect(v)) { semnaleaza('schema', `${cale} lipsește sau nu e obiect`); return; }
    dimensiune(`${cale}.latime`, v['latime'], PLAFOANE_O.latura);
    dimensiune(`${cale}.inaltime`, v['inaltime'], PLAFOANE_O.latura);
    dimensiune(`${cale}.grosime`, v['grosime'], PLAFOANE_O.grosime);
  };
  return { finit, id, nume, matrice, forma, rev, stoc };
}

/** O mărime a operației: un număr finit în (0, max]. */
const inInterval = (v: unknown, max: number): boolean => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max;

/**
 * ADR 0028 §1: de ce câmpul `urechi` al unei operații v5 nu e bun (lipsă, alt tip, o mărime în afara intervalului), ca
 * listă de motive; goală = `null` sau un obiect bun (câmpurile necunoscute din el se păstrează, ALEGERE din antet).
 */
export function problemeUrechiO(op: Liber): string[] {
  if (!Object.hasOwn(op, 'urechi')) return ['lipsește (v5 îl cere: null sau { numar, latime, grosime })'];
  const u = op['urechi'];
  if (u === null) return [];
  if (!esteObiect(u)) return [`= ${JSON.stringify(u) ?? String(u)} nu e null sau obiect`];
  const rez: string[] = [];
  const n = u['numar'];
  if (typeof n !== 'number' || !Number.isInteger(n) || n < PLAFOANE_O.urechiMin || n > PLAFOANE_O.urechi) {
    rez.push(`.numar = ${String(n)} nu e un întreg în ${PLAFOANE_O.urechiMin}–${PLAFOANE_O.urechi}`);
  }
  if (!inInterval(u['latime'], PLAFOANE_O.latura)) rez.push(`.latime = ${String(u['latime'])} nu e în (0, ${PLAFOANE_O.latura}]`);
  if (!inInterval(u['grosime'], PLAFOANE_O.grosime)) rez.push(`.grosime = ${String(u['grosime'])} nu e în (0, ${PLAFOANE_O.grosime}]`);
  return rez;
}

/**
 * ADR 0029 §1: de ce câmpul `rampa` al unei operații v6 nu e bun (lipsă, alt tip, lungimea în afara intervalului), ca
 * listă de motive; goală = `null` sau un obiect bun (câmpurile necunoscute din el se păstrează, ALEGERE din antet).
 */
export function problemeRampaO(op: Liber): string[] {
  if (!Object.hasOwn(op, 'rampa')) return ['lipsește (v6 o cere: null sau { lungime })'];
  const r = op['rampa'];
  if (r === null) return [];
  if (!esteObiect(r)) return [`= ${JSON.stringify(r) ?? String(r)} nu e null sau obiect`];
  return inInterval(r['lungime'], PLAFOANE_O.latura) ? [] : [`.lungime = ${String(r['lungime'])} nu e în (0, ${PLAFOANE_O.latura}]`];
}

/**
 * ADR 0030 §1: de ce câmpul `intrari` al unei operații v7 nu e bun (lipsă, alt tip, raza în afara intervalului), ca
 * listă de motive; goală = `null` sau un obiect bun (câmpurile necunoscute din el se păstrează, ALEGERE din antet).
 */
export function problemeIntrariO(op: Liber): string[] {
  if (!Object.hasOwn(op, 'intrari')) return ['lipsește (v7 îl cere: null sau { raza })'];
  const x = op['intrari'];
  if (x === null) return [];
  if (!esteObiect(x)) return [`= ${JSON.stringify(x) ?? String(x)} nu e null sau obiect`];
  return inInterval(x['raza'], PLAFOANE_O.latura) ? [] : [`.raza = ${String(x['raza'])} nu e în (0, ${PLAFOANE_O.latura}]`];
}

/** ADR 0032 §1: tipurile primite, ca mulțime (exact; fără majuscule, spații sau alte grafii). */
const TIPURI_COLTURI_SET_O: ReadonlySet<unknown> = new Set<unknown>(TIPURI_COLTURI_O);

/**
 * ADR 0032 §1: de ce câmpul `colturi` al unei operații v8 nu e bun (lipsă, alt tip, `tip` necunoscut), ca listă de
 * motive; goală = `null` sau un obiect bun (câmpurile necunoscute din el se păstrează).
 */
export function problemeColturiO(op: Liber): string[] {
  if (!Object.hasOwn(op, 'colturi')) return ['lipsește (v8 îl cere: null sau { tip })'];
  const c = op['colturi'];
  if (c === null) return [];
  if (!esteObiect(c)) return [`= ${JSON.stringify(c) ?? String(c)} nu e null sau obiect`];
  if (!Object.hasOwn(c, 'tip') || !TIPURI_COLTURI_SET_O.has(c['tip'])) {
    return [`.tip = ${Object.hasOwn(c, 'tip') ? JSON.stringify(c['tip']) ?? String(c['tip']) : '(lipsă)'} nu e ${TIPURI_COLTURI_O.join(' sau ')}`];
  }
  return [];
}

/**
 * Lista încălcărilor contractului v2 (`schema` 2), v3 (`schema` 3, cu operațiile), v4 (`schema` 4, cu sensul fiecărei
 * operații) sau v5 (`schema` 5, cu urechile); goală = document valid. Merge iterativ: un arbore adânc nu umple stiva.
 */
function verificaArboreO(doc: unknown, schema: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12): string[] {
  const probleme: string[] = [];
  const semnaleaza: Semnaleaza = (categorie, mesaj) => { probleme.push(`[${categorie}] ${mesaj}`); };
  const u = unelte(semnaleaza, schema);

  /** Arborele unei piese: preordine cu stivă explicită; nodurile de sub nivelul 32 nu se mai deschid. */
  const arbore = (cp: string, radacina: unknown) => {
    const idNoduri = new Set<string>();
    const idElemente = new Set<string>();
    const idGrupuri = new Set<string>();
    const stiva: Array<{ nod: unknown; nivel: number; deasupra: MatriceO | undefined; lant: readonly MatriceO[] }> = [
      { nod: radacina, nivel: 1, deasupra: IDENTITATE_O, lant: [] },
    ];
    /** ADR 0034 §2 (recenzia): elementele cu arce și matricele locale de la rădăcină la ele (în ordinea din `lume.ts`). */
    const cuArce: Array<{ readonly id: string; readonly lant: readonly MatriceO[] }> = [];
    let noduri = 0;
    let elemente = 0;
    let varfuri = 0;
    let preaAdanc = false;
    let pesteMargini = false;
    for (let pas = stiva.pop(); pas !== undefined; pas = stiva.pop()) {
      const { nod, nivel, deasupra, lant } = pas;
      if (nivel > PLAFOANE_O.adancime) {
        if (!preaAdanc) semnaleaza('adancime', `${cp}: un nod pe nivelul ${nivel} > ${PLAFOANE_O.adancime}`);
        preaAdanc = true;
        continue;
      }
      noduri++;
      const cale = `${cp}, nivelul ${nivel}`;
      if (!esteObiect(nod)) { semnaleaza('schema', `${cale}: nodul nu e obiect`); continue; }
      const idn = u.id(`${cale}.id`, nod['id']);
      if (idn !== undefined) {
        if (idNoduri.has(idn)) semnaleaza('unic-noduri', `${cp}: id-ul de nod ${idn} se repetă în aceeași piesă`);
        idNoduri.add(idn);
      }
      u.nume(cale, nod);
      // Matricea compusă față de rădăcina piesei: de sus în jos, de la identitate. O matrice locală stricată (deja
      // raportată) oprește verificarea marginilor pe ramura ei.
      const local = u.matrice(`${cale}.matrice`, nod['matrice']);
      const compus = deasupra !== undefined && local !== undefined ? compuneO(deasupra, local) : undefined;
      if (compus !== undefined && !inMarginiO(compus)) {
        if (!pesteMargini) semnaleaza('margini', `${cp}: matricea compusă a nodului ${idn ?? '?'} iese din margini: ${JSON.stringify(compus)}`);
        pesteMargini = true;
      }
      if (nod['tip'] === 'grup') {
        if (idn !== undefined) idGrupuri.add(idn);
        const copii = nod['copii'];
        if (!Array.isArray(copii)) semnaleaza('schema', `${cale}: grupul n-are lista copii`);
        else for (let k = copii.length - 1; k >= 0; k--) stiva.push({ nod: copii[k], nivel: nivel + 1, deasupra: compus, lant: local ? [...lant, local] : lant });
      } else if (nod['tip'] === 'element') {
        if (idn !== undefined) idElemente.add(idn);
        elemente++;
        varfuri += u.forma(`${cale}.forma`, nod['forma'], compus);
        // Lumea se judecă doar pe o matrice din piesă în margini (alta e deja `[margini]`, ca la similitudinea din piesă).
        if (local !== undefined && compus !== undefined && inMarginiO(compus) && idn !== undefined && areArceO(nod['forma'])) cuArce.push({ id: idn, lant: [...lant, local] });
      } else {
        semnaleaza('schema', `${cale}.tip = ${JSON.stringify(nod['tip'])} nu e grup sau element`);
      }
    }
    return { noduri, elemente, varfuri, idElemente, idGrupuri, cuArce };
  };

  /** Scula unei operații: totul e `[scula]`; câmpurile necunoscute se păstrează. */
  const scula = (cale: string, v: unknown): void => {
    if (!esteObiect(v)) { semnaleaza('scula', `${cale} lipsește sau nu e obiect`); return; }
    const numar = v['numar'];
    if (typeof numar !== 'number' || !Number.isInteger(numar) || numar < PLAFOANE_O.sculaNumarMin || numar > PLAFOANE_O.sculaNumarMax) {
      semnaleaza('scula', `${cale}.numar = ${String(numar)} nu e un întreg în ${PLAFOANE_O.sculaNumarMin}–${PLAFOANE_O.sculaNumarMax}`);
    }
    const nume = v['nume'];
    if (typeof nume !== 'string') semnaleaza('scula', `${cale}.nume nu e text`);
    else if (nume.length > PLAFOANE_O.sculaNume) semnaleaza('scula', `${cale}.nume are ${nume.length} > ${PLAFOANE_O.sculaNume} caractere`);
    if (!inInterval(v['diametru'], PLAFOANE_O.sculaDiametru)) {
      semnaleaza('scula', `${cale}.diametru = ${String(v['diametru'])} nu e în (0, ${PLAFOANE_O.sculaDiametru}]`);
    }
  };

  /** Operațiile unei piese v3. Întoarce câte sunt și câte referințe la noduri au (pentru plafoane). */
  const operatii = (cp: string, v: unknown, idElemente: ReadonlySet<string>, idGrupuri: ReadonlySet<string>) => {
    if (!Array.isArray(v)) { semnaleaza('operatie', `${cp}.operatii lipsește sau nu e listă`); return { numar: 0, referinte: 0 }; }
    const idOperatii = new Set<string>();
    let referinte = 0;
    v.forEach((op: unknown, k) => {
      const co = `${cp}.operatii[${k}]`;
      if (!esteObiect(op)) { semnaleaza('operatie', `${co} nu e obiect`); return; }
      const ido = u.id(`${co}.id`, op['id']);
      if (ido !== undefined) {
        if (idOperatii.has(ido)) semnaleaza('unic-operatii', `${cp}: id-ul de operație ${ido} se repetă în aceeași piesă`);
        idOperatii.add(ido);
      }
      // ADR 0069 §1: în v11, și `buzunar`, cu regulile lui (categoria `[buzunar]`).
      if (schema >= 11) {
        if (op['tip'] !== 'profil' && op['tip'] !== 'buzunar') semnaleaza('operatie', `${co}.tip = ${JSON.stringify(op['tip'])} nu e 'profil' sau 'buzunar'`);
        for (const m of problemeBuzunarO(op)) semnaleaza('buzunar', `${co} ${m}`);
      } else if (op['tip'] !== 'profil') semnaleaza('operatie', `${co}.tip = ${JSON.stringify(op['tip'])} nu e 'profil'`);
      // ADR 0076 §1: în v12, coborârea opțională (categoria `[coborare]`).
      if (schema >= 12) for (const m of problemeCoborareO(op)) semnaleaza('coborare', `${co} ${m}`);
      // ADR 0037 §2: în v10, și `stanga` / `dreapta`.
      const laturi: readonly string[] = schema >= 10 ? LATURI_V10_O : ORDINEA_LATURILOR_O;
      if (!(schema >= 10 ? LATURI_V10_SET_O : LATURI_O).has(op['latura'])) semnaleaza('operatie', `${co}.latura = ${JSON.stringify(op['latura'])} nu e una dintre ${laturi.join(', ')}`);
      // ADR 0037 §2: `despartire` e opțional (lipsă = false); ALEGERE (antetul): dacă există, e boolean.
      if (schema >= 10 && Object.hasOwn(op, 'despartire') && typeof op['despartire'] !== 'boolean') {
        semnaleaza('despartire', `${co}.despartire = ${JSON.stringify(op['despartire']) ?? String(op['despartire'])} nu e boolean`);
      }
      // ADR 0027 §5: obligatoriu în v4, pe orice operație (și `pe-linie`); exact una dintre cele două valori.
      if (schema >= 4 && !(Object.hasOwn(op, 'sens') && SENSURI_SET_O.has(op['sens']))) {
        semnaleaza('sens', `${co}.sens = ${Object.hasOwn(op, 'sens') ? JSON.stringify(op['sens']) ?? String(op['sens']) : '(lipsă)'} nu e una dintre ${SENSURI_O.join(', ')}`);
      }
      // ADR 0028 §1: obligatoriu în v5, pe orice operație (și `pe-linie`).
      if (schema >= 5) for (const m of problemeUrechiO(op)) semnaleaza('urechi', `${co}.urechi ${m}`);
      // ADR 0029 §1: obligatoriu în v6, pe orice operație (și `pe-linie`, ALEGERE din antet).
      if (schema >= 6) for (const m of problemeRampaO(op)) semnaleaza('rampa', `${co}.rampa ${m}`);
      // ADR 0030 §1: obligatoriu în v7, pe orice operație (și `pe-linie`, ALEGERE din antet: refuzul e al exportului).
      if (schema >= 7) for (const m of problemeIntrariO(op)) semnaleaza('intrari', `${co}.intrari ${m}`);
      // ADR 0032 §1: obligatoriu în v8, pe orice operație (și `pe-linie`, ALEGERE din antet: refuzul e al exportului).
      if (schema >= 8) for (const m of problemeColturiO(op)) semnaleaza('colturi', `${co}.colturi ${m}`);
      if (!inInterval(op['adancime'], PLAFOANE_O.adancimeOperatie)) semnaleaza('operatie', `${co}.adancime = ${String(op['adancime'])} nu e în (0, ${PLAFOANE_O.adancimeOperatie}]`);
      if (!inInterval(op['pas'], PLAFOANE_O.pasOperatie)) semnaleaza('operatie', `${co}.pas = ${String(op['pas'])} nu e în (0, ${PLAFOANE_O.pasOperatie}]`);
      scula(`${co}.scula`, op['scula']);
      const noduri = op['noduri'];
      if (!Array.isArray(noduri)) { semnaleaza('operatie', `${co}.noduri lipsește sau nu e listă`); return; }
      referinte += noduri.length;
      if (noduri.length === 0) semnaleaza('operatie', `${co}.noduri e goală`);
      if (noduri.length > PLAFOANE_O.noduriOperatie) semnaleaza('plafon', `${co}.noduri are ${noduri.length} > ${PLAFOANE_O.noduriOperatie}`);
      const vazute = new Set<string>();
      for (const n of noduri as unknown[]) {
        if (typeof n !== 'string') { semnaleaza('operatie', `${co}.noduri conține ${JSON.stringify(n)}, nu un id`); continue; }
        if (vazute.has(n)) semnaleaza('operatie', `${co}.noduri: ${n} se repetă`);
        vazute.add(n);
        if (idGrupuri.has(n)) semnaleaza('referinta-op', `${co}: ${n} e un grup, nu un element`);
        else if (!idElemente.has(n)) semnaleaza('referinta-op', `${co}: ${JSON.stringify(n)} nu e un element al piesei`);
      }
    });
    return { numar: v.length, referinte };
  };

  if (!esteObiect(doc)) { semnaleaza('schema', 'documentul nu e un obiect'); return probleme; }
  if (preaAdancJsonO(doc, PLAFOANE_O.adancimeJson)) semnaleaza('adancime', `JSON-ul are peste ${PLAFOANE_O.adancimeJson} de niveluri`);
  if (doc['schema'] !== schema) semnaleaza('schema', `schema = ${String(doc['schema'])}, nu ${schema}`);
  u.rev(doc['rev']);

  // Piesele întâi: instanțele trimit la ele.
  const idPiese = new Set<string>();
  const elementePiesa = new Map<string, number>();
  /** ADR 0034: vârfurile căilor fiecărei piese (pentru plafonul în lume) și suma pe toate piesele. */
  const varfuriPiesa = new Map<string, number>();
  let varfuriPiese = 0;
  /** ADR 0034 §2 (recenzia): elementele cu arce ale fiecărei piese, cu lanțul matricelor locale. */
  const arcePiesa = new Map<string, ReadonlyArray<{ readonly id: string; readonly lant: readonly MatriceO[] }>>();
  const referintePiesa = new Map<string, number>();
  let noduri = 0;
  let operatiiDocument = 0;
  const piese = doc['piese'];
  if (!Array.isArray(piese)) {
    semnaleaza('schema', 'piese lipsește sau nu e listă');
  } else {
    piese.forEach((p: unknown, i) => {
      const cale = `piese[${i}]`;
      if (!esteObiect(p)) { semnaleaza('schema', `${cale} nu e obiect`); return; }
      const idp = u.id(`${cale}.id`, p['id']);
      if (idp !== undefined) {
        if (idPiese.has(idp)) semnaleaza('unic-piese', `două piese au id-ul ${idp}`);
        idPiese.add(idp);
      }
      u.nume(cale, p);
      const numarate = arbore(`piesa ${idp ?? cale}`, p['radacina']);
      noduri += numarate.noduri;
      varfuriPiese += numarate.varfuri;
      if (idp !== undefined && !varfuriPiesa.has(idp)) varfuriPiesa.set(idp, numarate.varfuri);
      if (idp !== undefined && !arcePiesa.has(idp)) arcePiesa.set(idp, numarate.cuArce);
      if (idp !== undefined && !elementePiesa.has(idp)) elementePiesa.set(idp, numarate.elemente);
      if (schema >= 3) {
        const ops = operatii(`piesa ${idp ?? cale}`, p['operatii'], numarate.idElemente, numarate.idGrupuri);
        operatiiDocument += ops.numar;
        if (idp !== undefined && !referintePiesa.has(idp)) referintePiesa.set(idp, ops.referinte);
      }
    });
  }

  const idFoi = new Set<string>();
  const idInstante = new Set<string>();
  let instante = 0;
  let elementeLume = 0;
  let varfuriLume = 0;
  let taieturiLume = 0;
  const foi = doc['foi'];
  if (!Array.isArray(foi)) {
    semnaleaza('schema', 'foi lipsește sau nu e listă');
  } else {
    if (foi.length === 0) semnaleaza('foi', 'documentul n-are nicio foaie');
    if (foi.length > PLAFOANE_O.foi) semnaleaza('plafon', `${foi.length} foi > ${PLAFOANE_O.foi}`);
    foi.forEach((f: unknown, i) => {
      const cale = `foi[${i}]`;
      if (!esteObiect(f)) { semnaleaza('schema', `${cale} nu e obiect`); return; }
      const idf = u.id(`${cale}.id`, f['id']);
      if (idf !== undefined) {
        if (idFoi.has(idf)) semnaleaza('unic-foi', `două foi au id-ul ${idf}`);
        idFoi.add(idf);
      }
      u.nume(cale, f);
      u.stoc(`${cale}.stoc`, f['stoc']);
      const lista = f['instante'];
      if (!Array.isArray(lista)) { semnaleaza('schema', `${cale}.instante lipsește sau nu e listă`); return; }
      lista.forEach((inst: unknown, k) => {
        instante++;
        const ci = `${cale}.instante[${k}]`;
        if (!esteObiect(inst)) { semnaleaza('schema', `${ci} nu e obiect`); return; }
        const idi = u.id(`${ci}.id`, inst['id']);
        if (idi !== undefined) {
          if (idInstante.has(idi)) semnaleaza('unic-instante', `două instanțe au id-ul ${idi}`);
          idInstante.add(idi);
        }
        const piesa = inst['piesa'];
        if (typeof piesa !== 'string') semnaleaza('schema', `${ci}.piesa nu e text`);
        else if (!idPiese.has(piesa)) semnaleaza('referinta', `instanța ${idi ?? ci} trimite la piesa lipsă ${piesa}`);
        else {
          elementeLume += elementePiesa.get(piesa) ?? 0;
          varfuriLume += varfuriPiesa.get(piesa) ?? 0;
          taieturiLume += referintePiesa.get(piesa) ?? 0;
        }
        for (const axa of ['x', 'y'] as const) {
          const v = u.finit(`${ci}.${axa}`, inst[axa]);
          if (v !== undefined && !(Math.abs(v) <= PLAFOANE_O.pozitie)) semnaleaza('margini', `${ci}.${axa} = ${v} iese din ±${PLAFOANE_O.pozitie}`);
        }
        const rotire = inst['rotire'];
        if (typeof rotire !== 'number') semnaleaza('schema', `${ci}.rotire nu e număr`);
        else if (!(Number.isFinite(rotire) && rotire >= 0 && rotire < 360)) semnaleaza('rotire', `${ci}.rotire = ${rotire} nu e în [0, 360)`);
        else if (schema >= 9 && typeof piesa === 'string' && typeof inst['x'] === 'number' && typeof inst['y'] === 'number' && Number.isFinite(inst['x']) && Number.isFinite(inst['y'])) {
          // ADR 0034 §2 (recenzia): matricea în lume a fiecărui element cu arce, compusă ca în `lume.ts` (instanța cu
          // rotirea ei, apoi grupurile, apoi elementul), e o similitudine la `similitudineLume`.
          const start = compuneO(translatieO(inst['x'], inst['y']), rotatieO(rotire));
          for (const el of arcePiesa.get(piesa) ?? []) {
            const lume = el.lant.reduce((m, x) => compuneO(m, x), start);
            if (!esteSimilitudineO(lume, PLAFOANE_O.similitudineLume)) semnaleaza('forma', `instanța ${idi ?? ci}: ${el.id} are arce sub o matrice neuniformă în lume`);
          }
        }
        const campuri = inst['campuri'];
        if (campuri !== undefined) {
          if (!esteObiect(campuri)) {
            semnaleaza('schema', `${ci}.campuri nu e dicționar`);
          } else {
            const intrari = Object.entries(campuri);
            if (intrari.length > PLAFOANE_O.campuriChei) semnaleaza('plafon', `${ci}.campuri are ${intrari.length} > ${PLAFOANE_O.campuriChei} de chei`);
            for (const [cheie, v] of intrari) {
              if (cheie.length > PLAFOANE_O.campuriCheie) semnaleaza('plafon', `${ci}.campuri: o cheie de ${cheie.length} > ${PLAFOANE_O.campuriCheie} caractere`);
              if (typeof v !== 'string') semnaleaza('schema', `${ci}.campuri.${cheie} nu e text`);
              else if (v.length > PLAFOANE_O.campuriValoare) semnaleaza('plafon', `${ci}.campuri.${cheie} are ${v.length} > ${PLAFOANE_O.campuriValoare} caractere`);
            }
          }
        }
      });
    });
  }
  if (noduri > PLAFOANE_O.noduri) semnaleaza('plafon', `${noduri} noduri > ${PLAFOANE_O.noduri}`);
  if (instante > PLAFOANE_O.instante) semnaleaza('plafon', `${instante} instanțe > ${PLAFOANE_O.instante}`);
  if (elementeLume > PLAFOANE_O.elementeLume) semnaleaza('margini', `${elementeLume} elemente în lume > ${PLAFOANE_O.elementeLume}`);
  if (schema >= 9) {
    // ADR 0034 §2: plafoanele de ansamblu ale căilor.
    if (varfuriPiese > PLAFOANE_O.varfuri) semnaleaza('plafon', `${varfuriPiese} vârfuri de cale în piese > ${PLAFOANE_O.varfuri}`);
    if (varfuriLume > PLAFOANE_O.varfuriLume) semnaleaza('margini', `${varfuriLume} vârfuri de cale în lume > ${PLAFOANE_O.varfuriLume}`);
  }
  if (schema >= 3) {
    if (operatiiDocument > PLAFOANE_O.operatii) semnaleaza('plafon', `${operatiiDocument} operații > ${PLAFOANE_O.operatii}`);
    if (taieturiLume > PLAFOANE_O.taieturiLume) semnaleaza('plafon', `${taieturiLume} tăieturi în lume > ${PLAFOANE_O.taieturiLume}`);
  }
  return probleme;
}

/** O formă cu arce: cercul, dreptunghiul rotunjit, calea cu un segment `A` (ADR 0024 §5, ADR 0034 §2). */
function areArceO(f: unknown): boolean {
  if (!esteObiect(f)) return false;
  if (f['tip'] === 'cerc') return true;
  if (f['tip'] === 'dreptunghi') return typeof f['razaColt'] === 'number' && f['razaColt'] > 0;
  return f['tip'] === 'cale' && Array.isArray(f['varfuri']) && (f['varfuri'] as unknown[]).some((v) => esteObiect(v) && esteObiect(v['s']) && v['s']['tip'] === 'A');
}

/** Lista încălcărilor contractului v2 (ADR 0024); goală = document v2 valid (încă nemigrat). */
export function verificaV2(doc: unknown): string[] {
  return verificaArboreO(doc, 2);
}

/** Lista încălcărilor contractului v3 (ADR 0024 + ADR 0025); goală = document v3 valid. */
export function verificaV3(doc: unknown): string[] {
  return verificaArboreO(doc, 3);
}

/** Lista încălcărilor contractului v4 (ADR 0024 + ADR 0025 + ADR 0027); goală = document v4 valid. */
export function verificaV4(doc: unknown): string[] {
  return verificaArboreO(doc, 4);
}

/** Lista încălcărilor contractului v5 (ADR 0024 + 0025 + 0027 + 0028); goală = document v5 valid. */
export function verificaV5(doc: unknown): string[] {
  return verificaArboreO(doc, 5);
}

/** Lista încălcărilor contractului v6 (ADR 0024 + 0025 + 0027 + 0028 + 0029); goală = document v6 valid. */
export function verificaV6(doc: unknown): string[] {
  return verificaArboreO(doc, 6);
}

/** Lista încălcărilor contractului v7 (ADR 0024 + 0025 + 0027 + 0028 + 0029 + 0030); goală = document v7 valid. */
export function verificaV7(doc: unknown): string[] {
  return verificaArboreO(doc, 7);
}

/** Lista încălcărilor contractului v8 (ADR 0024 + 0025 + 0027 + 0028 + 0029 + 0030 + 0032); goală = document v8 valid. */
export function verificaV8(doc: unknown): string[] {
  return verificaArboreO(doc, 8);
}

/** Lista încălcărilor contractului v9 (… + ADR 0034: forma `cale` și plafoanele ei); goală = document v9 valid. */
export function verificaV9(doc: unknown): string[] {
  return verificaArboreO(doc, 9);
}

/**
 * Lista încălcărilor contractului v10 (… + ADR 0037 §2: căile deschise, laturile `stanga` / `dreapta`, `despartire`);
 * goală = document v10 valid. Migrarea și ușa întreagă sunt în `document.v10.ts`.
 */
export function verificaV10(doc: unknown): string[] {
  return verificaArboreO(doc, 10);
}

/** ADR 0069 §1: `pasLateral`, dacă există, e un număr finit în (0, 50]; potrivirea lui cu buzunarul e a CAM-ului. */
function problemeBuzunarO(op: Liber): string[] {
  if (!Object.hasOwn(op, 'pasLateral')) return [];
  const s = op['pasLateral'];
  return typeof s === 'number' && Number.isFinite(s) && s > 0 && s <= PLAFOANE_O.sculaDiametru / 2
    ? [] : [`.pasLateral = ${JSON.stringify(s) ?? String(s)} nu e în (0, ${PLAFOANE_O.sculaDiametru / 2}]`];
}

/** Lista încălcărilor contractului v11 (… + ADR 0069 §1: buzunarul); goală = document v11 valid. */
export function verificaV11(doc: unknown): string[] {
  return verificaArboreO(doc, 11);
}

/** ADR 0076 §1: `coborare`, dacă există, e un obiect cu felul și parametrii lui, în margini. */
function problemeCoborareO(op: Liber): string[] {
  if (!Object.hasOwn(op, 'coborare')) return [];
  const c = op['coborare'];
  if (!esteObiect(c)) return [`.coborare = ${JSON.stringify(c) ?? String(c)} nu e un obiect`];
  const fel = c['fel'];
  if (fel !== 'plonjare' && fel !== 'rampa' && fel !== 'zigzag' && fel !== 'elice') return [`.coborare.fel = ${JSON.stringify(fel) ?? String(fel)} nu e plonjare, rampa, zigzag sau elice`];
  const rez: string[] = [];
  const nr = (camp: string, max: number): void => {
    const x = c[camp];
    if (!(typeof x === 'number' && Number.isFinite(x) && x > 0 && x <= max)) rez.push(`.coborare.${camp} = ${JSON.stringify(x) ?? String(x)} nu e în (0, ${max}]`);
  };
  if (fel !== 'plonjare') nr('unghi', 45);
  if (fel === 'zigzag') nr('lungime', PLAFOANE_O.latura);
  if (fel === 'elice') nr('raza', PLAFOANE_O.sculaDiametru);
  return rez;
}

/** Lista încălcărilor contractului v12 (… + ADR 0076 §1: coborârea în buzunar); goală = document v12 valid. */
export function verificaV12(doc: unknown): string[] {
  return verificaArboreO(doc, 12);
}

/** ADR 0076 §2: un v11 (sau mai vechi) cu un câmp propriu `coborare` pe o operație: în v12 câmpul capătă sens. */
export function ciocniriCoborareO(doc: unknown): string[] {
  const rez: string[] = [];
  if (!esteObiect(doc) || !Array.isArray(doc['piese'])) return rez;
  doc['piese'].forEach((p: unknown, i) => {
    if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
    p['operatii'].forEach((op: unknown, k) => {
      if (esteObiect(op) && Object.hasOwn(op, 'coborare')) {
        rez.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „coborare” al operației v${String(doc['schema'])} s-ar pierde în migrare`);
      }
    });
  });
  return rez;
}

/** ADR 0069 §2: un v10 (sau mai vechi) cu un câmp propriu `pasLateral` pe o operație: în v11 câmpul capătă sens. */
export function ciocniriPasLateralO(doc: unknown): string[] {
  const rez: string[] = [];
  if (!esteObiect(doc) || !Array.isArray(doc['piese'])) return rez;
  doc['piese'].forEach((p: unknown, i) => {
    if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
    p['operatii'].forEach((op: unknown, k) => {
      if (esteObiect(op) && Object.hasOwn(op, 'pasLateral')) {
        rez.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „pasLateral” al operației v${String(doc['schema'])} s-ar pierde în migrare`);
      }
    });
  });
  return rez;
}

/** Ciocnirile pasului vk → vk+1 (k = 3 … 7): o operație care are deja câmpul nou al pasului, oricare i-ar fi valoarea. */
function ciocniriPas(doc: unknown, de: number): string[] {
  const camp = PASI_O.find((x) => x.de === de)?.camp ?? null;
  const rez: string[] = [];
  if (camp === null || !esteObiect(doc) || !Array.isArray(doc['piese'])) return rez;
  doc['piese'].forEach((p: unknown, i) => {
    if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
    p['operatii'].forEach((op: unknown, k) => {
      if (esteObiect(op) && Object.hasOwn(op, camp)) {
        rez.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „${camp}” al operației v${de} s-ar pierde în migrare`);
      }
    });
  });
  return rez;
}

/**
 * Lanțul ușii de la versiunea `de` (2 … 8) până la `pana` (de + 2 … 9), cu o singură copie (felia 2.7b, ca `ridicaLaO`).
 * Aceleași probleme, în aceeași ordine, ca pașii compuși pe care îi descriu comentariile lanțurilor de mai jos
 * (`verificaV2V3`, `verificaV3V4` … `verificaV8V9`, fiecare pe documentul migrat de pasul dinainte): la primul pas,
 * contractul versiunii și ciocnirile, împreună; la fiecare pas următor, întâi contractul documentului migrat (singur,
 * dacă are probleme: așa le întoarce coada pasului dinainte), apoi ciocnirile lui; la capăt, contractul lui `pana`.
 */
function verificaLantO(doc: unknown, de: number, pana: number): string[] {
  let cur: unknown = doc;
  let copiat = false;
  let k = de;
  if (de === 2) {
    const p = verificaV2V3(doc);
    if (p.length > 0) return p;
    cur = migreazaV2V3O(doc as DocV2O);
    copiat = true;
    k = 3;
  }
  for (; k < pana; k++) {
    const contract = verificaArboreO(cur, k as 3 | 4 | 5 | 6 | 7 | 8);
    if (k !== de && contract.length > 0) return contract;
    const probleme = [...contract, ...ciocniriPas(cur, k)];
    if (probleme.length > 0) return probleme;
    if (!copiat) {
      cur = structuredClone(cur);
      copiat = true;
    }
    urcaPeLoc(cur as Liber, k);
  }
  return verificaArboreO(cur, pana as 4 | 5 | 6 | 7 | 8 | 9);
}

/**
 * De ce ușa trebuie să refuze un document v8, până la v9: contractul v8 (o formă `cale` e necunoscută acolo), apoi
 * documentul MIGRAT (doar numărul) trebuie să respecte contractul v9 (fără căi, plafoanele lor nu pot fi atinse).
 */
export function verificaV8V9(doc: unknown): string[] {
  const probleme = verificaV8(doc);
  if (probleme.length > 0) return probleme;
  return verificaV9(migreazaV8V9O(doc as DocV8O));
}

/** v7 … v2 până la v9: lanțul până la v8, apoi v8-ul migrat prin `verificaV8V9` (`verificaLantO`). */
export function verificaV7V9(doc: unknown): string[] {
  return verificaLantO(doc, 7, 9);
}
export function verificaV6V9(doc: unknown): string[] {
  return verificaLantO(doc, 6, 9);
}
export function verificaV5V9(doc: unknown): string[] {
  return verificaLantO(doc, 5, 9);
}
export function verificaV4V9(doc: unknown): string[] {
  return verificaLantO(doc, 4, 9);
}
export function verificaV3V9(doc: unknown): string[] {
  return verificaLantO(doc, 3, 9);
}
export function verificaV2V9(doc: unknown): string[] {
  return verificaLantO(doc, 2, 9);
}

/**
 * De ce ușa trebuie să refuze un document v7, ca listă de probleme; goală = se migrează la v8. Contractul v7, apoi
 * ciocnirea de nume (o operație cu un câmp propriu `colturi`, oricare i-ar fi valoarea, și `null`), apoi documentul
 * MIGRAT trebuie să respecte contractul v8.
 */
export function verificaV7V8(doc: unknown): string[] {
  const probleme = verificaV7(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
      p['operatii'].forEach((op: unknown, k) => {
        if (esteObiect(op) && Object.hasOwn(op, 'colturi')) {
          probleme.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „colturi” al operației v7 s-ar pierde în migrare`);
        }
      });
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV8(migreazaV7V8O(doc as DocV7O));
}

/** v6 până la v8: `verificaV6V7`, apoi v7-ul migrat prin `verificaV7V8` (un câmp `colturi` pe o operație v6 se ciocnește). */
export function verificaV6V8(doc: unknown): string[] {
  return verificaLantO(doc, 6, 8);
}

/** v5 până la v8: `verificaV5V7`, apoi v7-ul migrat prin `verificaV7V8`. */
export function verificaV5V8(doc: unknown): string[] {
  return verificaLantO(doc, 5, 8);
}

/** v4 până la v8: `verificaV4V7`, apoi v7-ul migrat prin `verificaV7V8`. */
export function verificaV4V8(doc: unknown): string[] {
  return verificaLantO(doc, 4, 8);
}

/** v3 până la v8: `verificaV3V7`, apoi v7-ul migrat prin `verificaV7V8`. */
export function verificaV3V8(doc: unknown): string[] {
  return verificaLantO(doc, 3, 8);
}

/** v2 până la v8: `verificaV2V7`, apoi v7-ul migrat (operațiile create de migrare n-au `colturi`). */
export function verificaV2V8(doc: unknown): string[] {
  return verificaLantO(doc, 2, 8);
}

/**
 * De ce ușa trebuie să refuze un document v6, ca listă de probleme; goală = se migrează la v7. Contractul v6, apoi
 * ciocnirea de nume (o operație cu un câmp propriu `intrari`, oricare i-ar fi valoarea, și `null`), apoi documentul
 * MIGRAT trebuie să respecte contractul v7.
 */
export function verificaV6V7(doc: unknown): string[] {
  const probleme = verificaV6(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
      p['operatii'].forEach((op: unknown, k) => {
        if (esteObiect(op) && Object.hasOwn(op, 'intrari')) {
          probleme.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „intrari” al operației v6 s-ar pierde în migrare`);
        }
      });
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV7(migreazaV6V7O(doc as DocV6O));
}

/** v5 până la v7: `verificaV5V6`, apoi v6-ul migrat prin `verificaV6V7` (un câmp `intrari` pe o operație v5 se ciocnește). */
export function verificaV5V7(doc: unknown): string[] {
  return verificaLantO(doc, 5, 7);
}

/** v4 până la v7: `verificaV4V6`, apoi v6-ul migrat prin `verificaV6V7`. */
export function verificaV4V7(doc: unknown): string[] {
  return verificaLantO(doc, 4, 7);
}

/** v3 până la v7: `verificaV3V6`, apoi v6-ul migrat prin `verificaV6V7`. */
export function verificaV3V7(doc: unknown): string[] {
  return verificaLantO(doc, 3, 7);
}

/** v2 până la v7: `verificaV2V6`, apoi v6-ul migrat (operațiile create de migrare n-au `intrari`). */
export function verificaV2V7(doc: unknown): string[] {
  return verificaLantO(doc, 2, 7);
}

/**
 * De ce ușa trebuie să refuze un document v5, ca listă de probleme; goală = se migrează la v6. Contractul v5, apoi
 * ciocnirea de nume (o operație cu un câmp propriu `rampa`, oricare i-ar fi valoarea, și `null`), apoi documentul
 * MIGRAT trebuie să respecte contractul v6.
 */
export function verificaV5V6(doc: unknown): string[] {
  const probleme = verificaV5(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
      p['operatii'].forEach((op: unknown, k) => {
        if (esteObiect(op) && Object.hasOwn(op, 'rampa')) {
          probleme.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „rampa” al operației v5 s-ar pierde în migrare`);
        }
      });
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV6(migreazaV5V6O(doc as DocV5O));
}

/** v4 până la v6: `verificaV4V5`, apoi v5-ul migrat prin `verificaV5V6` (un câmp `rampa` pe o operație v4 se ciocnește). */
export function verificaV4V6(doc: unknown): string[] {
  return verificaLantO(doc, 4, 6);
}

/**
 * De ce ușa trebuie să refuze un document v4, ca listă de probleme; goală = se migrează la v5. Contractul v4, apoi
 * ciocnirea de nume (o operație cu un câmp propriu `urechi`, oricare i-ar fi valoarea, și `null`), apoi documentul
 * MIGRAT trebuie să respecte contractul v5.
 */
export function verificaV4V5(doc: unknown): string[] {
  const probleme = verificaV4(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
      p['operatii'].forEach((op: unknown, k) => {
        if (esteObiect(op) && Object.hasOwn(op, 'urechi')) {
          probleme.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „urechi” al operației v4 s-ar pierde în migrare`);
        }
      });
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV5(migreazaV4V5O(doc as DocV4O));
}

/**
 * De ce ușa trebuie să refuze un document v3, ca listă de probleme; goală = se migrează la v4. Contractul v3, apoi
 * ciocnirea de nume (o operație cu un câmp propriu `sens`, oricare i-ar fi valoarea), apoi documentul MIGRAT trebuie să
 * respecte contractul v4.
 */
export function verificaV3V4(doc: unknown): string[] {
  const probleme = verificaV3(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
      p['operatii'].forEach((op: unknown, k) => {
        if (esteObiect(op) && Object.hasOwn(op, 'sens')) {
          probleme.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „sens” al operației v3 s-ar pierde în migrare`);
        }
      });
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV4(migreazaV3V4O(doc as DocV3O));
}

/**
 * De ce ușa trebuie să refuze un document v2, ca listă de probleme; goală = se migrează la v3. Contractul v2, apoi
 * ciocnirea de nume (o piesă cu un câmp propriu `operatii`, oricare i-ar fi valoarea), apoi documentul MIGRAT trebuie
 * să respecte contractul v3.
 */
export function verificaV2V3(doc: unknown): string[] {
  const probleme = verificaV2(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (esteObiect(p) && Object.hasOwn(p, 'operatii')) {
        probleme.push(`[ciocnire] piese[${i}]: câmpul „operatii” al piesei v2 s-ar pierde în migrare`);
      }
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV3(migreazaV2V3O(doc as DocV2O));
}

/**
 * De ce ușa trebuie să refuze un document v2, până la v4: `verificaV2V3`, apoi v3-ul migrat trece mai departe prin
 * `verificaV3V4` (operațiile create de migrare n-au `sens`, deci nu se pot ciocni).
 */
export function verificaV2V4(doc: unknown): string[] {
  return verificaLantO(doc, 2, 4);
}

/** v3 până la v5: `verificaV3V4`, apoi v4-ul migrat prin `verificaV4V5` (un câmp `urechi` pe o operație v3 se ciocnește). */
export function verificaV3V5(doc: unknown): string[] {
  return verificaLantO(doc, 3, 5);
}

/** v3 până la v6: `verificaV3V5`, apoi v5-ul migrat prin `verificaV5V6`. */
export function verificaV3V6(doc: unknown): string[] {
  return verificaLantO(doc, 3, 6);
}

/** v2 până la v5: `verificaV2V4`, apoi v4-ul migrat (operațiile create de migrare n-au `urechi`). */
export function verificaV2V5(doc: unknown): string[] {
  return verificaLantO(doc, 2, 5);
}

/** v2 până la v6: `verificaV2V5`, apoi v5-ul migrat (operațiile create de migrare n-au `rampa`). */
export function verificaV2V6(doc: unknown): string[] {
  return verificaLantO(doc, 2, 6);
}

/**
 * De ce ușa trebuie să refuze un document v1, ca listă de probleme; goală = se migrează (v1 → v2 → v3 → v4 → v5). Schema 1
 * (după `src/model/document.ts` din etapa 1, citit doar pentru format și plafoane), adâncimea JSON și ciocnirile
 * (precizarea 7); dacă toate trec, documentul migrat trebuie să treacă mai departe (precizarea 5, ADR 0025, 0027, 0028).
 */
export function verificaV1(doc: unknown): string[] {
  const probleme: string[] = [];
  const semnaleaza: Semnaleaza = (categorie, mesaj) => { probleme.push(`[${categorie}] ${mesaj}`); };
  const u = unelte(semnaleaza);
  if (!esteObiect(doc)) { semnaleaza('schema', 'documentul nu e un obiect'); return probleme; }
  if (preaAdancJsonO(doc, PLAFOANE_O.adancimeJson)) {
    semnaleaza('adancime', `JSON-ul are peste ${PLAFOANE_O.adancimeJson} de niveluri`);
    return probleme;
  }
  if (doc['schema'] !== 1) semnaleaza('schema', `schema = ${String(doc['schema'])}, nu 1`);
  u.rev(doc['rev']);
  for (const cheie of ['piese', 'foi']) {
    if (Object.hasOwn(doc, cheie)) semnaleaza('ciocnire', `câmpul de sus „${cheie}” s-ar pierde în migrare`);
  }
  u.stoc('foaie', doc['foaie']);
  const elemente = doc['elemente'];
  if (!Array.isArray(elemente)) { semnaleaza('schema', 'elemente lipsește sau nu e listă'); return probleme; }
  if (elemente.length > PLAFOANE_O.elementeV1) semnaleaza('plafon', `${elemente.length} elemente > ${PLAFOANE_O.elementeV1}`);
  const ids = new Set<string>();
  elemente.forEach((e: unknown, i) => {
    const cale = `elemente[${i}]`;
    if (!esteObiect(e)) { semnaleaza('schema', `${cale} nu e obiect`); return; }
    const ide = u.id(`${cale}.id`, e['id']);
    if (ide !== undefined) {
      if (ids.has(ide)) semnaleaza('unic-elemente', `două elemente au id-ul ${ide}`);
      ids.add(ide);
    }
    u.nume(cale, e);
    u.forma(`${cale}.forma`, e['forma']);
    u.matrice(`${cale}.matrice`, e['matrice']);
    if (Object.hasOwn(e, 'tip')) semnaleaza('ciocnire', `${cale}: câmpul „tip” s-ar pierde în migrare`);
  });
  if (probleme.length > 0) return probleme;
  // Precizarea 5: „un document v1 cu valori peste aceste margini e refuzat la migrare”: se judecă documentul migrat,
  // apoi lanțul continuă la v3, la v4, la v5, la v6, la v7, la v8 și la v9.
  return verificaV2V9(migreazaV1O(doc as DocV1O));
}

/**
 * ADR 0037 §2 (ALEGERE, antetul lui `document.v10.ts`): ciocnirea pasului v9 → v10: o operație care are deja un câmp
 * propriu `despartire` (orice valoare). Câmpurile operațiilor trec neschimbate prin migrările v3 … v9, deci se judecă pe
 * documentul primit; un v1 n-are operații, iar unui v2 i le creează migrarea, fără `despartire`.
 */
export function ciocniriDespartireO(doc: unknown): string[] {
  const rez: string[] = [];
  if (!esteObiect(doc) || !Array.isArray(doc['piese'])) return rez;
  doc['piese'].forEach((p: unknown, i) => {
    if (!esteObiect(p) || !Array.isArray(p['operatii'])) return;
    p['operatii'].forEach((op: unknown, k) => {
      if (esteObiect(op) && Object.hasOwn(op, 'despartire')) {
        rez.push(`[ciocnire] piese[${i}].operatii[${k}]: câmpul „despartire” al operației v${String(doc['schema'])} și-ar schimba sensul în migrare (în v10 marchează despărțirea foii)`);
      }
    });
  });
  return rez;
}

/**
 * De ce ușa trebuie să refuze un document v9, până la v10: contractul v9 (care refuză deja `inchis: false` și laturile
 * noi), ciocnirea `despartire` pe o operație, apoi documentul MIGRAT (doar numărul) trebuie să respecte contractul v10.
 */
export function verificaV9V10(doc: unknown): string[] {
  const probleme = [...verificaV9(doc), ...ciocniriDespartireO(doc)];
  if (probleme.length > 0) return probleme;
  return verificaV10(migreazaV9V10O(doc as DocV9O));
}

/**
 * Ce spune ușa despre orice document (felia 2.3c-2: ușa curentă e v10): un v10 după contractul lui; un v1 … v9 după ușa
 * de până la v9 (`verificaPanaLaV9O`, cu migrările ei), apoi ciocnirea pasului v9 → v10. Documentul migrat nu se mai
 * judecă o dată: contractul v10 îl cuprinde pe cel v9 (`inchis: true` e boolean, laturile vechi sunt printre cele noi,
 * `despartire` e deja ciocnire), iar proba lui e în `document.v10.oracol.test.ts` (un v9 migrat e un v10 valid, pe tot
 * corpusul; `verificaV9V10` face și pasul întreg).
 */
export function verificaO(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 12) return verificaV12(doc);
  if (s === 11) {
    const p = verificaV11(doc);
    return p.length > 0 ? p : ciocniriCoborareO(doc);
  }
  if (s === 10) {
    const p = verificaV10(doc);
    if (p.length > 0) return p;
    const c = ciocniriPasLateralO(doc);
    return c.length > 0 ? c : ciocniriCoborareO(doc);
  }
  if (s === 1 || s === 2 || s === 3 || s === 4 || s === 5 || s === 6 || s === 7 || s === 8 || s === 9) {
    const p = verificaPanaLaV9O(doc);
    if (p.length > 0) return p;
    const c = [...ciocniriDespartireO(doc)];
    if (c.length > 0) return c;
    const q = ciocniriPasLateralO(doc);
    return q.length > 0 ? q : ciocniriCoborareO(doc);
  }
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 sau 12`];
}

/**
 * Ușa unei aplicații rămase pe schema 11 (înainte de felia 5.3↑), pentru lipire: schema 12 e refuzată („scris de o
 * versiune mai nouă”), iar coborârea nu e validă. Până la 5.3↑ era `verificaO`.
 */
export function verificaPanaLaV11O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 11) return verificaV11(doc);
  if (s === 10) {
    const p = verificaV10(doc);
    return p.length > 0 ? p : ciocniriPasLateralO(doc);
  }
  if (s === 1 || s === 2 || s === 3 || s === 4 || s === 5 || s === 6 || s === 7 || s === 8 || s === 9) {
    const p = verificaPanaLaV9O(doc);
    if (p.length > 0) return p;
    const c = ciocniriDespartireO(doc);
    return c.length > 0 ? c : ciocniriPasLateralO(doc);
  }
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 sau 11`];
}

/**
 * Ușa unei aplicații rămase pe schema 10 (înainte de felia 5.1↑), pentru lipire: schema 11 e refuzată („scris de o
 * versiune mai nouă”), iar buzunarul nu e valid. Până la 5.1↑ era `verificaO`.
 */
export function verificaPanaLaV10O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 10) return verificaV10(doc);
  if (s === 1 || s === 2 || s === 3 || s === 4 || s === 5 || s === 6 || s === 7 || s === 8 || s === 9) {
    const p = verificaPanaLaV9O(doc);
    return p.length > 0 ? p : ciocniriDespartireO(doc);
  }
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5, 6, 7, 8, 9 sau 10`];
}

/**
 * Ușa unei aplicații rămase pe schema 9 (înainte de felia 2.3c-2), pentru lipire: verificarea versiunii documentului și
 * a migrării până la 9; schema 10 e refuzată („scris de o versiune mai nouă”), iar `inchis: false` și laturile noi nu
 * sunt valide. Până la 2.3c-2 era `verificaO`.
 */
export function verificaPanaLaV9O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 1) return verificaV1(doc);
  if (s === 2) return verificaV2V9(doc);
  if (s === 3) return verificaV3V9(doc);
  if (s === 4) return verificaV4V9(doc);
  if (s === 5) return verificaV5V9(doc);
  if (s === 6) return verificaV6V9(doc);
  if (s === 7) return verificaV7V9(doc);
  if (s === 8) return verificaV8V9(doc);
  if (s === 9) return verificaV9(doc);
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5, 6, 7, 8 sau 9`];
}

/**
 * Ușa unei aplicații rămase pe schema 8 (înainte de felia 2.7b), pentru lipire: verificarea versiunii documentului și a
 * migrării până la 8; schema 9 e refuzată („scris de o versiune mai nouă”), iar o formă `cale` e necunoscută.
 */
export function verificaPanaLaV8O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 1) {
    const p = verificaV1(doc);
    return p.length > 0 ? p : verificaV8(migreazaV1V8O(doc as DocV1O));
  }
  if (s === 2) return verificaV2V8(doc);
  if (s === 3) return verificaV3V8(doc);
  if (s === 4) return verificaV4V8(doc);
  if (s === 5) return verificaV5V8(doc);
  if (s === 6) return verificaV6V8(doc);
  if (s === 7) return verificaV7V8(doc);
  if (s === 8) return verificaV8(doc);
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5, 6, 7 sau 8`];
}

/**
 * Ușa unei aplicații rămase pe schema 7 (înainte de felia 2.6), pentru lipire: verificarea versiunii documentului și a
 * migrării până la 7, cu `colturi` un câmp necunoscut oarecare; schema 8 e refuzată. Un v1 nu poate purta `colturi`
 * pe o operație (migrarea v2 → v3 creează operațiile), deci lanțul lui până la 7 ajunge.
 */
export function verificaPanaLaV7O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 1) {
    const p = verificaV1(doc);
    return p.length > 0 ? p : verificaV7(migreazaV1V7O(doc as DocV1O));
  }
  if (s === 2) return verificaV2V7(doc);
  if (s === 3) return verificaV3V7(doc);
  if (s === 4) return verificaV4V7(doc);
  if (s === 5) return verificaV5V7(doc);
  if (s === 6) return verificaV6V7(doc);
  if (s === 7) return verificaV7(doc);
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5, 6 sau 7`];
}

/**
 * Ușa unei aplicații rămase pe schema 6 (înainte de felia 2.5b), pentru lipire: verificarea versiunii documentului și a
 * migrării până la 6, cu `intrari` un câmp necunoscut oarecare; schema 7 e refuzată. Un v1 nu poate purta `intrari`
 * pe o operație (migrarea v2 → v3 creează operațiile), deci lanțul lui până la 6 ajunge.
 */
export function verificaPanaLaV6O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 1) {
    const p = verificaV1(doc);
    return p.length > 0 ? p : verificaV6(migreazaV1V6O(doc as DocV1O));
  }
  if (s === 2) return verificaV2V6(doc);
  if (s === 3) return verificaV3V6(doc);
  if (s === 4) return verificaV4V6(doc);
  if (s === 5) return verificaV5V6(doc);
  if (s === 6) return verificaV6(doc);
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4, 5 sau 6`];
}

/**
 * Ușa unei aplicații rămase pe schema 5 (înainte de felia 2.5a), pentru lipire: verificarea versiunii documentului și a
 * migrării până la 5, cu `rampa` un câmp necunoscut oarecare; schema 6 e refuzată. Un v1 nu poate purta `rampa` pe o
 * operație (migrarea v2 → v3 creează operațiile), deci lanțul lui până la 6 spune același lucru.
 */
export function verificaPanaLaV5O(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 1) return verificaV1(doc);
  if (s === 2) return verificaV2V5(doc);
  if (s === 3) return verificaV3V5(doc);
  if (s === 4) return verificaV4V5(doc);
  if (s === 5) return verificaV5(doc);
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2, 3, 4 sau 5`];
}

/** Categoriile distincte dintr-o listă de probleme, în ordinea apariției. */
export function categoriiO(probleme: readonly string[]): string[] {
  return [...new Set(probleme.map((p) => /^\[([a-z-]+)\]/.exec(p)?.[1] ?? '?'))];
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * Prima diferență dintre două valori JSON, ca text, sau `undefined` dacă sunt egale. Numerele se compară cu `===`
 * (deci −0 = 0, cum cere contractul), obiectele după mulțimea cheilor proprii, nu după ordinea lor.
 */
export function diferenta(a: unknown, b: unknown, cale = '$'): string | undefined {
  if (typeof a === 'number' && typeof b === 'number') return a === b ? undefined : `${cale}: ${a} ≠ ${b}`;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return Object.is(a, b) ? undefined : `${cale}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${cale}: o listă față de un obiect`;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return `${cale}: cheile [${ka.join(', ')}] ≠ [${kb.join(', ')}]`;
  for (const k of ka) {
    const d = diferenta((a as Liber)[k], (b as Liber)[k], `${cale}.${k}`);
    if (d !== undefined) return d;
  }
  return undefined;
}
