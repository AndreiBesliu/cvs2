# ADR 0130: Gruparea vectorilor

**Starea:** acceptat pe 02.11.2026, la felia 6.T↑ (adusă din etapa 6), într-o sesiune paralelă (worktree-ul
`wip/6.T-grupare`). **Completează:** degruparea (ADR 0103), al cărei invers este; modelul D (ADR 0024: piese și instanțe,
arborele piesei); textul (ADR 0105 §4: blocul pe rădăcina piesei). **Schimbă:** jurnalul comenzilor (ADR 0016, ADR 0103 §5:
`regrupeaza` / `degrupeaza` primesc locurile părților), secțiunea Boolean și meniul de clic dreapta (ADR 0103 §6: un buton
și un rând nou).

**Problema.** Owner-ul, pe 02.11: „vreau sa deschidem un worktree care sa faca si functia de group care sa stea langa
ungroup”. Notița 3 din 28.10 (CLAUDE.md, „Decizii luate”): vectorii importați, degrupați, duplicați și aliniați se suprapun,
fiindcă alinierea mută fiecare formă; recomandarea de atunci a fost gruparea (Ctrl+G), cu care formele alese se mută și se
aliniază împreună. Degruparea există de pe 28.10, iar drumul înapoi era doar Ctrl+Z.

## Decizia

1. **Ce se grupează.** Cel puțin două instanțe alese ale foii de lucru devin una singură, cu o piesă nouă. Rădăcina piesei e
   un grup nou, fără transformare, cu câte un copil pe instanță aleasă, în ordinea foii. Copilul e rădăcina piesei ei: un
   grup rămâne grup, deci gruparea face un nivel nou, iar degruparea (un nivel, ADR 0103 §1) îl desface tocmai pe acela.
   După grupare, alesă e instanța grupului.
2. **Unde stă.** Instanța grupului ia locul primei instanțe alese, în ordinea foii, iar piesa grupului ia locul piesei
   acesteia; celelalte pleacă. Lumea rămâne aceeași, la bit:
   - dacă toate instanțele alese au același loc (x, y, rotirea), grupul îl primește, iar copiii sunt rădăcinile neschimbate.
     Așa sunt părțile unei degrupări: degrupare → grupare dă înapoi piesa de dinainte, cu alte id-uri;
   - altfel, grupul stă în originea foii, nerotit, iar locul fiecărei instanțe intră în rădăcina ei
     (`compune(instanța, rădăcina)`); o instanță din origine, nerotită, își lasă rădăcina neschimbată. Panoul arată atunci
     rotirea 0 (rotirea e a formelor, nu a grupului) și rotește grupul în jurul centrului lui (ADR 0038 §4).
3. **Id-urile.** Id-urile nodurilor și ale operațiilor sunt unice în piesă (schema documentului), dar piese diferite le pot
   avea la fel (`g`, `c1`, `exterior`, literele unui text). Ce s-ar repeta primește un id nou, `<id>_<n>` (primul `n` liber,
   de la 2), la partea care l-ar repeta; operațiile își urmează nodurile. Blocul unui text (ADR 0105 §4) cu amprenta validă
   primește amprenta contururilor redenumite: după degrupare, textul se editează din nou. Rădăcina grupului ia `g`, sau
   primul `g_<n>` liber.
4. **Ce se taie.** Operațiile grupului sunt ale primei părți, apoi ale celei de-a doua, în ordinea foii, fiecare cu id-ul,
   latura, adâncimea, freza și setările ei. Ordinea tăierii (ADR 0037 §8: în aceeași clasă, instanțele în ordinea foii,
   operațiile în ordinea piesei, nodurile în ordinea operației) rămâne, deci **G-code-ul, fără comentarii, e același** cât
   instanțele alese stau una după alta în ordinea foii: părțile unei degrupări, formele desenate sau importate una după alta.
   Cu alte instanțe între ele, tăieturile sunt aceleași, dar grupul se taie, în fiecare clasă, unde se tăia prima lui parte,
   iar celelalte după el. Regiunea păstrată (ADR 0026) și buzunarele (ADR 0073) se socotesc pe toată foaia, deci nu se
   schimbă. Comentariile programului poartă id-urile piesei și ale instanței, care se schimbă.
5. **Refuzurile, cu motiv:**
   - **mai puțin de două forme alese** pe foaia de lucru;
   - **V-carve-uri cu aceleași valori în părți diferite.** O piesă își sapă V-carve-urile cu aceleași valori (freza,
     adâncimea, pasul, sensul, fundul plat) ca o singură regiune, par-impar (ADR 0112, precizarea din 5.8↑b): grupate, două
     texte s-ar săpa împreună, alt traseu. Valorile sunt scrise o singură dată, în `valoriVcarve` (`src/model/lume.ts`),
     citite și de lucrare (`src/cam/job.ts`);
   - **piesa împărțită**: folosită și de o altă instanță, de pe orice foaie, sau aleasă de două ori. Gruparea ar lua piesa și
     celorlalte;
   - **plafoanele documentului** (nivelurile arborelui, nodurile), judecate de schema documentului pe documentul de după.
6. **Comanda: `regrupeaza`, cu locurile părților.** Gruparea e comanda `regrupeaza` a degrupării (ADR 0103 §5): grupul nou
   stă în locul „instanței vechi”, iar `locuri` ține indicii fiecărei părți în lista instanțelor foii și în lista pieselor,
   de dinainte. Inversa, `degrupeaza` cu `locuri`, pune fiecare parte exact unde era, într-o singură trecere prin liste.
   Anularea dă documentul de dinainte la bit și când între instanțele grupate stăteau altele (fără `locuri`, părțile ar veni
   una după alta, în locul grupului, ca la degrupare). Comanda se păzește ca celelalte: o parte care nu stă la locul scris,
   un loc în afara listei sau repetat, `locuri` doar la unele instanțe ale comenzii, toate aruncă.
7. **Ușile.**
   - Acțiunea `document.grupeaza`, în registru (deci și în paletă, Ctrl+K), cu tasta **Ctrl+G**. Tasta era liberă în
     aplicație; browserul o folosește („caută următorul”), dar aplicația o oprește, ca pe Ctrl+D.
   - Butonul **Grupează**, în secțiunea Boolean a extensiei barei, chiar înaintea lui Degrupează, activ cu cel puțin două
     forme alese. Motivul unui refuz stă lângă butoane, până la altă selecție.
   - **Meniul de clic dreapta**: Grupează, apoi Degrupează, apoi restul (ADR 0103 §6).
   - Calculul vine la cerere, cu modulul acțiunilor (ca la degrupare, ADR 0103 §7); până atunci, „Editarea se încarcă încă”.
8. **Alinierea.** Un grup e o singură instanță, deci alinierea, distribuirea și centrarea pe foaie (ADR 0050 §3, ADR 0110) îl
   mută ca un bloc: formele lui nu se mai suprapun (notița 3). Alinierea unei selecții de mai multe forme ca un bloc, fără
   grupare, și avertismentul la contururile care ajung să se atingă rămân pentru o felie următoare, la alegerea owner-ului.

## Probele

- **Unitar** (`grupare.test.ts`):
  - formele desenate, în locuri diferite (una rotită cu 30°): grupul în origine, rădăcinile cu locul compus, lumea la bit,
    G-code-ul fără comentarii același;
  - părțile unei degrupări: grupul le ia locul, cu locul lor, iar piesa e cea de dinainte (alte id-uri, aceeași geometrie și
    aceleași operații);
  - grupează → degrupează → grupează dă același document (puse deoparte doar id-urile piesei și ale instanței), cu același
    G-code;
  - id-urile repetate (două forme cu găuri, două texte): redenumite, operațiile pe nodurile lor, textele editabile din nou
    după degrupare;
  - anularea și refacerea la bit, și cu o instanță între cele grupate; salvarea și redeschiderea prin ușa documentului;
  - refuzurile: o formă, V-carve-urile, piesa împărțită, nivelurile;
  - comanda din jurnal: partea mutată, locul în afara listei, locul repetat, `locuri` doar la unele aruncă.
- **Unitar** (`actiuni.calcul.test.ts`): fără calcul, gruparea spune că editarea se încarcă; cu o formă, cere două.
- **E2e** (`import.spec.ts`): un DXF cu trei contururi, degrupat, apoi grupat din meniul de clic dreapta, din butonul de lângă
  boolean și cu Ctrl+G, cu Ctrl+Z între ele; după reîncărcarea paginii, grupul e tot acolo; cu o singură formă aleasă,
  Grupează e inactiv în meniu și în bară.
- **Manualul:** capitolul „Gruparea” (ro + en), rândul din meniul de clic dreapta, tasta în capitolul scurtăturilor; ușa nouă
  în poarta manualului (69).

## Ce am respins

- **Refuzul grupurilor în grupuri** (implicitul prudent, propus la pornirea feliei). Ar opri gruparea unui text sau a unui
  import cu orice altceva, iar modelul și degruparea au deja grupuri pe mai multe niveluri. Un nivel pe grupare, ca în
  programele de desen. Rămâne întrebare pentru owner.
- **Unirea operațiilor cu același id** (o operație împărțită de degrupare, adunată la loc). Ar schimba ordinea tăierii la
  piesele cu mai multe operații pe aceleași contururi (ADR 0103 §3), deci G-code-ul.
- **Grupul în locul primei părți, ceilalți copii cu inversa locului ei.** Inversa nu e exactă: lumea s-ar mișca cu câțiva ulp.
- **Câte o comandă `sterge` / `adauga` pe parte.** Pătratică (ADR 0103 §5).
- **Gruparea ghicită din suprapuneri** (notița 3). Doar ca propunere vizibilă, într-o felie a ei, dacă owner-ul o vrea.

## Limite și neprobat

- Doar foaia de lucru (foaia 0), ca toate acțiunile editării până la Multi-Plate (etapa 11).
- Într-un grup, un text e vectori (blocul stă pe rădăcina piesei), iar după degrupare se editează din nou. Un grup scalat sau
  înclinat îi schimbă contururile, deci textul rămâne vectori și după degrupare (ADR 0105 §4).
- După o grupare a unor forme cu locuri diferite, degruparea le dă rotirea 0 în panou: locul a intrat în rădăcina lor.
- Lista de vectori arată grupul ca un rând; o formă din grup nu se alege singură (programele de desen au „intră în grup”).
- Judecata e cu schema documentului întreagă, la fiecare clic pe buton sau în meniu (ca la degrupare).

## Se redeschide dacă

- owner-ul vrea grupurile în grupuri refuzate, sau o piesă cu mai multe instanțe grupată (azi refuzată);
- alinierea trebuie să mute o selecție de mai multe forme ca un bloc, fără grupare;
- formele dintr-un grup trebuie alese și editate fără degrupare.
