# ADR 0285: Decorațiunile de Crăciun din Easy 3Draw (felia 3.Cl)

**Starea:** acceptat pe 25.11.2026, cu toate recomandările (1a, 2a, 3a, 4a: „Mergem cu recomandarile”, în sesiunea
liniei). Propus în aceeași zi, la cererea owner-ului, scrisă în sesiunea principală („Vreau ca sesiunea care lucreaza la
plugin, sa faca si decoratiuni de craciun pentru imprimanta. Pune-i asra pe lista”).
**Continuă:** ADR 0284 (piesele și construcțiile atelierului), ADR 0281 (piesele pe file), ADR 0166 (formele din desenul
cvs2).

## Ce se cere

Decorațiuni de Crăciun făcute în atelierul Easy 3Draw și tipărite la imprimanta 3D: alese dintr-o galerie, potrivite din
câțiva parametri, cu STL-ul gata așezat pe pat, ca la celelalte piese. Crăciunul e peste o lună, deci prima felie trebuie
să dea ceva de tipărit repede.

## Ce se tipărește bine

- **Fără suport.** Decorațiunile sunt forme plate, ridicate dintr-un contur (2–4 mm), cu relief pe cel mult două
  înălțimi. Cele care stau în picioare se fac din două plăci plate, îmbinate în cruce prin fante.
- **Nervura cea mai subțire: 1,2 mm** (trei treceri ale duzei de 0,4). Editorul nu lasă o linie mai subțire și spune
  când un colț iese prea ascuțit ca să se tipărească.
- **Agățătoarea, gândită din prima:** o buclă în planul piesei (inelul, cu golul de 3 mm și peretele de 1,6 mm) sau o
  gaură de 2,5 mm, la alegere; se tipărește odată cu piesa, culcată.
- **Mărimea:** 30–150 mm, spusă în editor și verificată față de patul imprimantei alese.
- **Două culori fără schimbător de filament:** relieful începe la o înălțime spusă în editor („schimbă filamentul la
  stratul N”). Fereastra Imprimanta din cvs2 are deja pauza la un strat (felia 3.6p).
- **Jocul îmbinărilor** (fantele plăcilor în cruce) vine din calibrarea imprimantei, ca jocurile pieselor LEGO.

## Propunerea

### Piesele

1. **Fulgul de zăpadă.** Șase brațe, din parametri: diametrul, câte ramuri are un braț, unde stau, cât sunt de lungi și
   sub ce unghi, grosimea liniei, miezul (hexagon, stea sau gol). „Repede”: șase fulgi gata. „Alt fulg”: unul la
   întâmplare, mereu tipăribil.
2. **Steaua.** Cinci până la opt colțuri, mai ascuțită sau mai plină; plină, doar conturul sau în relief (cu muchii, ca
   steaua din vârful bradului).
3. **Brăduțul.** Plat, de agățat (silueta cu etaje), sau în picioare: două siluete cu fante, îmbinate în cruce, care
   stau pe masă.
4. **Globul.** Plat (discul cu căpăcel, cu un model decupat: dungi, stele, zigzag) sau din două ori trei discuri
   îmbinate în cruce.
5. **Ornamentul cu nume.** O formă (glob, stea, brad, inimă, etichetă) cu un nume în relief sau decupat.
6. **Brăduțul LEGO.** Etaje conice cu știfturi sus și locașuri dedesubt, cu steaua pe știftul din vârf; „Fă brăduțul”
   pune toate piesele în lista de printat (și în „Modelul”, alipite, după 3.Cf).

Alte piese, dacă le vrei: clopoțelul, omul de zăpadă, bastonul de zahăr, ghirlanda din zale.

### Unde stau

O filă nouă a atelierului, **„Crăciun”**, după „Elice”, cu pictograma ei și cu piesele ei în galerie, ca la celelalte
familii (ADR 0281). Căutarea le găsește după nume.

### Legătura cu piesele LEGO

Ornamentele sunt de sine stătătoare: se agață. Legătura cu restul atelierului e brăduțul LEGO, care se clădește din
piese cu știfturi și intră în „Modelul”.

### Numele de pe ornament

Pluginul n-are fonturi: rulează izolat de cvs2 și trebuie să meargă și pe pagina de sine stătătoare. Două căi:

- un **font propriu, dintr-o singură linie** (literele ca trăsături îngroșate, cu diacriticele românești), desenat de
  noi; merge oriunde, dar are un singur fel de literă;
- **formele trimise din desenul cvs2** (ADR 0166): scrii numele în cvs2 cu orice font, îl alegi și îl trimiți la Easy
  3Draw, care îl ridică pe ornament; merge doar în cvs2.

### Feliile

| # | Felia | Ce aduce |
|---|---|---|
| 3.Cl-1 | Fila „Crăciun”: fulgul, steaua, brăduțul | trei piese din parametri, cu agățătoarea și cu „Repede” |
| 3.Cl-2 | Globul; relieful pe două înălțimi | modelele decupate, discurile îmbinate, „schimbă filamentul la stratul N” |
| 3.Cl-3 | Ornamentul cu nume | fontul propriu sau formele din cvs2, după răspuns |
| 3.Cl-4 | Brăduțul LEGO | etajele, steaua pe știft, „Fă brăduțul” |

Fiecare felie: piesa în motor, cu probele pe plase (închisă, fără muchii fără pereche, cotele pe hârtie, nervura cea mai
subțire măsurată), mostra în tabelele atelierului, pictograma, engleza, rândul de „ce e nou”, otrăvurile.

## Marginile

- **Desene proprii, din parametri.** Nicio siluetă copiată (fără clipart).
- **Fără lumânări.** PLA-ul se înmoaie pe la 60 °C: nu facem suporturi de lumânare. Luminițele cu LED nu sunt o problemă.
- **Fără forme de tăiat fursecuri** în propunere: o piesă tipărită nu e făcută pentru alimente. Se pot adăuga la cerere,
  cu avertismentul lor.
- Doar pachetul extensiei se schimbă: nimic în aplicație, nimic pe server.

## Întrebările (recomandarea e „a”)

1. **Ce piese vin întâi?** (a) Fulgul, steaua și brăduțul, apoi globul, ornamentul cu nume și brăduțul LEGO, în ordinea
   feliilor de mai sus; (b) altă ordine sau alte piese (spune care).
2. **Unde stau în atelier?** (a) Într-o filă nouă, „Crăciun”; (b) într-o filă nouă, „Decorațiuni”, cu Crăciunul ca
   primul set; (c) în filele de azi.
3. **Se leagă de piesele LEGO?** (a) Ornamentele sunt de sine stătătoare, de agățat, iar brăduțul LEGO e o felie a lui;
   (b) fiecare ornament primește și opțiunea unui locaș LEGO dedesubt, ca să stea pe o placă; (c) doar de agățat, fără
   brăduțul LEGO.
4. **Numele de pe ornament:** (a) în felia a treia, cu un font propriu dintr-o singură linie (merge oriunde); (b) din
   formele trimise din desenul cvs2 (orice font, doar în cvs2); (c) fără nume.

## Răspunsurile owner-ului (25.11.2026)

„Mergem cu recomandarile”, deci:

1. **1a:** întâi fulgul, steaua și brăduțul (3.Cl-1), apoi globul (3.Cl-2), ornamentul cu nume (3.Cl-3) și brăduțul LEGO
   (3.Cl-4);
2. **2a:** o filă nouă a atelierului, „Crăciun”;
3. **3a:** ornamentele sunt de sine stătătoare, de agățat; brăduțul LEGO e o felie a lui;
4. **4a:** numele de pe ornament vine în felia a treia, cu un font propriu, dintr-o singură linie.

## Implementat (3.Cl-1, 25.11.2026): fulgul, steaua și brăduțul

Easy 3Draw 18.35.0. Fila „Crăciun”, după „Elice”, cu trei piese; fiecare e plată, cu pereții drepți, tipărită culcată,
fără suport, și nu are prinderi (se agață).

### Cum se face conturul

Conturul unei piese e unirea unor forme simple (poligoane, tije cu capăt rotund, discuri), făcută cu Cavalier
(`unesteForme`, în motor), cu golurile rămase între ele: piesa e un singur corp, iar greutatea scrisă e cea adevărată.
Formele se taie sau se cuprind, fără laturi suprapuse: de aceea brațele și ramurile pleacă drept, din interiorul formei
de care se leagă.

### Agățătoarea

- **Inelul:** golul de 3 mm, peretele de 1,6; centrul stă la 1,9 mm peste vârful piesei, deci vârful intră 0,4 mm în
  perete. La propunere era la mijlocul peretelui (2,3 mm), dar gâtul dintre inel și brațul fulgului ieșea mai subțire
  decât linia (1,16 mm la linia de 1,2); acum nu coboară sub linie (la liniile groase, sub 2,3 mm).
- Pe un vârf ascuțit (steaua, bradul), inelul stă pe o **tijă de 2,4 mm**, coborâtă până unde forma e mai lată decât ea.
- **Gaura:** 2,5 mm, pe axa vârfului, cât mai sus, cu cel puțin 1,6 mm de material în jur. Se caută doar aproape de vârf:
  în colțul de sus al stelei (nu mai jos de o treime din rază) și în ultimul etaj al bradului. Mai jos ar încăpea
  (deasupra trunchiului unui brad mic), dar piesa ar atârna strâmb sau cu vârful în jos. Dacă nu încape, piesa primește
  inelul, cu un mesaj.

### Fulgul (`fulg`)

- Șase brațe (unul în sus, spre inel), un miez și perechi de ramuri. Câmpurile: `diam` (30–150 mm, de la vârf la vârf),
  `grosime` (1,2–6), `linie` (1,2 până la o șesime din rază, cel mult 5), `ramuri` (0–4 perechi pe braț), `unghi`
  (30°–75° față de braț), `inceput` (20–70 % din brațul liber: unde stă prima pereche), `lungime` (10–45 % din rază),
  `miez` (hexagon, stea, gol), `agatatoare` (inel, fără).
- Perechile stau de la `inceput` până la 86 % din brațul liber; spre vârf sunt tot mai scurte (ultima, 55 %). O ramură
  nu trece de cercul fulgului; una care ar ieși sub o linie și jumătate nu se mai face, iar editorul o spune.
- Ramurile brațelor vecine se pot încrucișa: golurile închise între ele rămân goluri.
- „Repede”: șase fulgi gata făcuți (Clasic, Steluță, Dantelă, Cetină, Săgeți, Simplu). „Alt fulg”: ramurile și miezul,
  la întâmplare, în margini; mărimea, grosimea, linia și agățătoarea rămân.

### Steaua (`stea`)

- 5–8 colțuri (`varfuri`: numele `colturi` era luat de cadru), `diam` (30–150), `interior` (30–75 % din rază: unde stau
  vârfurile dinăuntru), `grosime` (1,2–12), `fel` (plină, contur, relief), `linie` (conturul: 1,2–6), `agatatoare`
  (inel, gaură, fără).
- **Conturul:** golul e steaua retrasă cu linia; un gol sub 3 mm² nu se mai face, iar steaua rămâne plină, cu un mesaj.
- **În relief:** muchii de la mijloc (înălțimea `grosime`) la colțuri și văi la vârfurile dinăuntru; marginea are
  1,2 mm (cel mult jumătate din înălțime). Nicio față nu privește în jos. Inelul e o bucată plată de cel mult 2,4 mm,
  prinsă prin tijă; gaura nu se face în relief (nici pe contur).
- Colțurile sub 25° sunt spuse („foarte ascuțite”), cu unghiul.

### Brăduțul (`brad`)

- `inaltime` (30–150 mm), `etaje` (2–6), `latime` (40–90 % din înălțime), `grosime` (1,2–6), `fel` (de agățat, în
  picioare), `agatatoare` (inel, gaură, fără; doar la cel de agățat).
- **În picioare:** două plăci alăturate pe pat (la 3 mm), cu talpa lată (60 % din lățime). Prima are fanta de jos până
  la 0,2 mm peste mijloc; a doua, de sus până la 0,2 mm sub mijloc. Fanta e cât grosimea plus, de două ori, jocul
  locașelor din calibrare și încă 0,1 mm (3,4 mm la placa de 3, cu calibrarea implicită).
- A doua placă e tăiată drept sus, unde lângă fantă n-ar mai rămâne 1,2 mm: prima placă are vârful. Dacă tăietura cade
  sub ultimul etaj, sau dacă lângă fanta de jos rămâne prea puțin, editorul o spune.

### Ce a rămas din propunere

- „Schimbă filamentul la stratul N” (relieful pe două înălțimi) vine cu globul, în 3.Cl-2.
- Clopoțelul, omul de zăpadă, bastonul și ghirlanda: la cererea owner-ului.

### Probele

- `test/unit/trenulet.craciun.test.ts`: fiecare formă are modelul ei de pe hârtie, scris din regulile de mai sus, iar
  plasa e întrebată în mii de puncte (lemn sau gol, ca pe hârtie); 60 de fulgi la întâmplare; nervura, inelul, gaura,
  fantele și tăietura plăcii a doua, măsurate pe plasă; unirea formelor, pe cazuri cu ariile socotite de mână.
- `test/e2e/trenulet.craciun.spec.ts`: fila, cele trei editoare, „Repede”, „Alt fulg” (cu zarul ținut pe loc și cu cel
  adevărat), mesajele, STL-urile închise, lista.
- Otrăvurile: `test/otravuri/3.Cl-1.py`, `test/otravuri/3.Cl-1-en.py`.

## Se redeschide dacă

- o piesă tipărită iese prea fragilă la nervura de 1,2 mm (atunci pragul urcă);
- owner-ul vrea decorațiuni în volum (globul rotund, din două jumătăți), care cer altă cale de tipărire.
