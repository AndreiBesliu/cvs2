# ADR 0142: Încadrarea textului în casetă (felia 7.8↑)

**Starea:** acceptat pe 03.11.2026, la felia 7.8↑ (adusă din etapa 7), în worktree-ul `wip/7.5-text`, la răspunsul
owner-ului „Da, caseta (7.8↑)”. Numărul e al liniei textului (owner-ul, „0140–0142”). **Completează:** ADR 0105 (textul),
ADR 0123 (aldinul: cutia figurii îngroșate), ADR 0141 (textul vertical). **Schimbă:** așezarea textului (cutia fiecărei
litere, înălțimea folosită, încadrarea), blocul textului (câmpul opțional `caseta`), panoul textului („Caseta”, cu lățimea și
înălțimea ei) și textul pe curbă (cutia literei mutate).

**Problema.** Definiția pragului (planul, rândul „Text, text pe cale, fonturi”) cere „încadrare în casetă (fără, «Limit by
Box», «Scale to Box», cu lățime și înălțime)”, ca în ArtCAM. O prezentare a lui ArtCAM Pro 7.0 descrie cele două moduri:
textul rămâne la mărimea cerută și se micșorează doar dacă nu încape în casetă; textul se face cât mai mare, ca să umple
caseta. Rămânea de hotărât ce se încadrează (literele sau avansurile lor), cum stau față de mărime spațierea și aldinul
(scrise în mm) și unde e caseta.

## Decizia

1. **Ce încape:** cutia literelor tăiate (reuniunea cutiilor exacte ale literelor, `cutieContur`; a unei litere aldine, a
   miezului cu 2d în plus în sus și la dreapta: figura exactă, nu biarcele ei), nu avansurile: placa se taie după litere.
   Caseta leagă pe amândouă laturile; literele își păstrează proporțiile.
2. **Modurile:** **Limitat de casetă**, înălțimea majusculei cerută, micșorată doar cât să încapă; **Scalat la casetă**, cea
   mai mare înălțime care încape (între 0,1 și 1000 mm). Spațierea și aldinul rămân în mm, cum sunt scrise. Cea mai mică
   înălțime e și de cinci ori aldinul (ADR 0123: aldinul e cel mult o cincime din înălțime). Dacă textul nu încape nici
   atunci (de pildă, cu o spațiere prea mare), rămâne la înălțimea cerută, iar panoul o spune și nu-l pune pe foaie.
3. **Calculul:** marginile cutiei fiecărei litere sunt afine în înălțime (contururile, avansurile, crenarea, rândurile și
   golurile verticale cresc cu ea; spațierea și aldinul rămân), deci două așezări de măsurare (la două înălțimi fixe, fără
   offsetul aldinului) le dau la orice înălțime. Înălțimea care încape se caută prin înjumătățire pe ele (o sută de pași,
   până la precizia numerelor), apoi textul se așază o dată, la ea: trei așezări în loc de una, fără eșantionare.
4. **Caseta nu mută textul:** e o margine a mărimii (lățimea și înălțimea textului tăiat), nu un loc. Textul pornește tot din
   ancoră, cu alinierea lui; panoul spune înălțimea care a încăput și mărimea textului. În mijlocul plăcii îl pune unealta de
   aliniere.
5. **Blocul:** `caseta: { fel: 'limita', latime, inaltime, ceruta } | { fel: 'scala', latime, inaltime }`. `inaltime` e mereu
   cea desenată (care a încăput); înălțimea cerută a modului limitat stă în `ceruta`. Un text în casetă nu stă pe o curbă:
   ușa blocului refuză amândouă, iar panoul lasă curba deoparte, cu motivul. Scalarea uniformă crește și caseta: textul,
   caseta, spațierea și aldinul înmulțite cu k dau înălțimea înmulțită cu k, deci blocul scalat rămâne al geometriei. O
   casetă scalată peste 10 000 mm nu mai e a unui bloc (piesa rămâne vectori).
6. **Panoul:** „Caseta” (Fără / Limitat de casetă / Scalat la casetă), „Lățimea casetei” și „Înălțimea casetei”; scalat la
   casetă, câmpul înălțimii se oprește și arată înălțimea care a încăput. O notă spune înălțimea și mărimea textului (sau că
   a fost micșorat). Merge și cu textul vertical (ADR 0141), cu aldinul, cursivul și fonturile cu o singură linie; textul ales
   își aduce caseta (limitat de ea, cu înălțimea cerută în câmp).
7. **Cutia literei:** fiecare literă așezată își are acum cutia exactă (`GlifaAsezata.cutie`), iar textul, înălțimea folosită
   (`TextAsezat.inaltime`); textul pe curbă își recalculează cutiile din contururile mutate.

## Cifrele (măsurate, gzip 9)

| | Înainte (7.7↑) | După (7.8↑) |
|---|---|---|
| Pornirea (cu ușa) | 98,6 (102,2) / 110 kB | 98,6 (102,2) / 110 kB |
| Totalul JavaScript | 447,8 / 500 kB | 449,0 / 500 kB |
| Bucata textului (`calcul`) | 18,6 kB | 19,1 kB |
| Precache | 82 de fișiere, 629,4 kB | 82 de fișiere, 631,6 kB |

## Probele

- **Oracolul independent** (`fonturi_caseta` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/caseta.json`):
  înălțimea care încape, căutată altfel decât în aplicație (înjumătățire pe așezări întregi), cu cutiile din fontTools; nouă
  cazuri: Roboto („HHH” scalat, cu spațiere, limitat care încape și limitat micșorat, două rânduri, vertical), Droid Serif
  (centrat, cu cursiv și spațiere), Inter (CFF, la dreapta, cu spațiere negativă), Relief SingleLine (limitat); înălțimea sub
  1e-9 (relativ) și contururile sub 1e-9 mm. Aldinul în casetă e un caz al corpusului aldinului (`aldin-caseta`: cutia și
  50 715 de puncte).
- **Pe hârtie** (Roboto: H cu avansul 1460, picioarele de la 169 la 1288, majuscula 1456, rândul 2701): „HHH” are 4039 de
  unități în lățime, deci în 100 × 50 h = 100 · 1456 / 4039 = 36,0485; cu spațierea 2 (două goluri), 96 · 1456 / 4039 =
  34,6066; limitat cu 20 cerut, 20; cu 50 cerut, 36,0485; „H↵H”, înălțimea leagă: 50 · 1456 / 4157 = 17,5126; „HI” vertical
  în 30 × 100: 30 · 1456 / 1119 = 39,0349; cu aldinul 0,6: 1456 · 96,4 / 4039 + 1,2 = 35,9505; zece H cu 20 mm între ele nu
  încap în 100 mm la nicio înălțime.
- **Probele țintite** (`test/unit/text.caseta.test.ts`): cele două moduri; textul scalat umple latura care leagă și încape pe
  cealaltă (orizontal, vertical, cu aldin și cursiv, Relief, Inter); cutia literei e a contururilor (la aldin, sub 0,002 mm de
  figura desenată); caseta prea mică (și pentru aldin); omogenitatea (k = 0,5, 1,5, 3); ușa blocului, scalarea și plafonul
  casetei; cutiile pe curbă.
- **E2e** (`test/e2e/text.spec.ts`, Edge): „HHH” scalat la 100 × 50 (câmpul oprit cu 36.05, nota, blocul, lățimea literelor de
  100 mm); cu 100 mm între litere, refuzat cu motiv și Adaugă oprit; limitat cu 50 cerut, micșorat cu nota; după reîncărcare,
  textul ales vine limitat, cu 50 în câmp; pe un cerc, textul în casetă stă drept.
- **Mutațiile** (`test/otravuri/7.8.py`): 20; 16 prinse din prima, patru scăpate: C04 (scurtătura înălțimii cerute),
  echivalentă în practică (înjumătățirea ajunge chiar la ea), scoasă cu motivul; C09 (cutia literei verticale nemutată),
  fiindcă proba măsura textul tot cu cutiile literelor; P07 și P01, fiindcă probele e2e nu le atingeau (Adaugă era oprit și
  din lipsa ancorei; niciun text în casetă nu era pus de pe o curbă). Probele întărite le prind: pe codul final, 19 din 19.

## Ce am respins

- **Întinderea la casetă** (lățimea și înălțimea, separat): prezentarea ArtCAM vorbește de mărime; întinderea literelor e
  „scalarea în lățime și în înălțime (%)”, altă cerință a pragului, încă de făcut.
- **Spațierea și aldinul crescute cu textul** (o scalare a tot textului): câmpurile lor s-ar schimba singure la fiecare literă
  scrisă; scrise în mm, rămân.
- **Avansurile în loc de cerneală:** marginile laterale ale literelor și spațiile de la capete nu se taie.
- **Caseta ca loc pe foaie** (textul mutat și aliniat în ea, caseta desenată): o margine de mărime ajunge pentru o placă, iar
  locul îl dau ancora și alinierea; se redeschide dacă owner-ul o cere.
- **Căutarea pe așezări întregi în aplicație** (ca oracolul): zeci de așezări cu aldin la fiecare tastă.

## Limite și neprobat

- **Cu aldin**, figura tăiată e a biarcelor (la cel mult 0,001 mm de cea exactă), deci poate trece de casetă cu atât.
- **Caseta nu se desenează** pe foaie; panoul spune mărimea textului.
- **Textul pe curbă** n-are casetă (are „întins pe toată curba”, ADR 0108).
- **Pragul textului** mai cere, din definiția lui: mărimea în puncte sau inch, scalarea textului în lățime și în înălțime
  (%), spațierea manuală între literele alese (Ctrl + tragere).

## Se redeschide dacă

- owner-ul vrea caseta ca loc (textul pus în ea, aliniat sus / la mijloc / jos) sau desenată pe foaie;
- se cere întinderea textului la casetă.
