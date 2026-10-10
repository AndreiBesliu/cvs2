# ADR 0030 — Intrările și ieșirile (documentul v7)

**Starea:** acceptat pe 10.10.2026, în felia 2.5b. Se sprijină pe verdictul din `docs/PORTARE.md` §3.2: ordinea
candidaților se adaptează din ediția întâi, iar verificarea se rescrie exact, pe regiunea păstrată. **Intră în:** etapa 2.
Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Azi fiecare trecere plonjează pe buclă, în vârful 0, și se ridică tot acolo. Plonjarea și ridicarea lasă o
urmă pe peretele piesei. Placa 2 cere „urma de intrare în piesă” cel mult 0,1 mm.

În ediția întâi:
- partea intrării se ghicea din centroidul vârfurilor buclei;
- intrarea mușca 2,8–4,2 mm din piesă: pe un U, un C, un L, un dreptunghi și un triunghi; pe literele cu ochi mușca chiar
  din literă;
- reparația din 24.09 verifica discul frezei din 0,2 în 0,2 mm, pe inele aplatizate.

**Decizia.** Operația de profil poate avea intrări: `Operatie.intrari = null | { raza }`.
- Pe fiecare buclă, freza intră pe un sfert de cerc și iese pe sfertul următor al aceluiași cerc.
- Cercul e tangent la buclă într-un punct p₀, pe partea deșeului.
- Punctul și raza se aleg după o ordine fixă de candidați, verificați exact față de regiunea păstrată.
- Dacă nu încape niciunul, bucla se taie fără intrări, iar exportul o spune.

## Contractul

**1. Documentul v7** (`schema: 7`) = contractul v6 (ADR 0029), plus `Operatie.intrari`, obligatoriu: `null` (fără
intrări) sau `{ raza }`. `raza` e pozitivă, cel mult `PLAFON.latura`, în mm: raza cercului intrării, pe traseul centrului
frezei.

**Migrarea v6 → v7** (pură, deterministă):
- fiecare operație primește `intrari: null`;
- o operație v6 care are deja un câmp necunoscut `intrari` e refuzată cu motiv (ciocnire de nume);
- lanțul v1 → … → v7 rămâne;
- o operație nouă (Adaugă) vine cu `intrari: null`;
- programul unui document fără intrări e **același, octet cu octet**, ca în v6.

În dialog, intrările se pornesc pe rând, cu raza implicită **3 mm**.

**2. Geometria**, într-un punct p₀ al buclei:
- t₀ e direcția de mers în p₀; pe un arc, e tangenta lui.
- **Partea deșeului** e opusă materialului păstrat (ADR 0027 §1): în stânga sensului de mers la urcare, în dreapta la
  opoziție. n e normala unitară spre deșeu.
- **Cercul intrării** are centrul C = p₀ + ρ·n și raza ρ.
  - **Intrarea** e sfertul acestui cerc care se termină în p₀, sosind pe direcția t₀.
  - **Ieșirea** e sfertul următor, care pleacă din p₀ pe direcția t₀.
  - Ambele sunt arce în IR. Sensul lor e trigonometric când deșeul e în stânga și orar când e în dreapta.
- **Semicercul intrării** e intrarea și ieșirea luate împreună: arcul de 180° din jurul lui C, cu p₀ la mijloc.

**3. Alegerea**, pe fiecare buclă (aceeași pentru toate trecerile ei):
- **Candidații pentru p₀**, în ordine:
  1. vârful 0;
  2. mijloacele celor mai lungi 12 segmente ale buclei, după lungime descrescătoare (la lungimi egale, indicele mai mic
     întâi; un mijloc identic cu un candidat de dinainte se sare).
- **Razele:** întâi ρ = `raza`, apoi `raza / 2`, dacă e cel puțin 0,5 mm.
- **Ordinea:** pentru fiecare rază, toți candidații, în ordine. Primul al cărui semicerc ține discul frezei în afara lui
  K ∪ S(C) cu R − ε (verificarea exactă a invariantei 2, ADR 0026 §6) e ales.
- **Niciunul:** bucla se taie fără intrări, ca azi (plonjare în vârful 0). Exportul întoarce un avertisment, „intrarea
  omisă pe <idLume> (bucla j)”, pe care dialogul îl arată. G-code-ul nu se schimbă.

**4. Pornirea buclei e p₀.**
- Pozițiile s de pe buclă se numără de la p₀. Urechile (ADR 0028 §3) se măsoară de acolo, deci p₀ e mereu la adâncime
  plină.
- Dacă p₀ e la mijlocul unui segment, segmentul se taie acolo: o linie în două linii, un arc în două arce pe același
  cerc.

**5. Programul**, pe fiecare trecere k a unei bucle cu intrări:
1. rapid deasupra lui A, începutul intrării (în deșeu);
2. plonjare verticală la −d_k (în deșeu; trecerea de dinainte a tăiat deja aceeași intrare, deci scoate cel mult
   d_k − d_{k−1});
3. intrarea, la −d_k, până în p₀;
4. bucla, de la p₀ înapoi la p₀, la Z-ul profilului trecerii (urechile, dacă le are);
5. ieșirea, la −d_k;
6. rapid la Z-ul de siguranță.

Ordinea buclelor și a trecerilor e cea de azi: toate buclele la o adâncime, apoi următoarea. Avansul e cel de tăiere pe
intrare și pe ieșire. Plonjarea are avansul de plonjare.

**6. Refuzuri, cu motiv:**
- intrări pe o operație `pe-linie`: nu există parte de deșeu;
- intrări și rampă pe aceeași operație: compunerea vine în felia 2.5c;
- `raza` sub 0,5 mm: sub ea, arcul iese din rezoluția postului.

Dialogul oprește bifa pe `pe-linie` și cere cel puțin 0,5 mm.

**7. Invariantele:**
- **2** judecă deja fiecare mișcare de sub etichetă, deci și intrările.
- **9, amendată.** La începutul și la sfârșitul unei treceri, o porțiune deschisă care e o intrare sau o ieșire nu e
  încălcare. Adică e un arc de cerc:
  - tangent la buclă în punctul în care trecerea intră pe ea;
  - de cel mult 90°;
  - cu raza `raza` sau `raza / 2` a operației;
  - pe partea deșeului.
- **10, amendată.** Pozițiile s se numără de la punctul în care trecerea intră pe buclă: capătul intrării, sau plonjarea
  când bucla n-are intrări.
- **11, amendată** (forma de la ADR 0029 §4, fără rampă). Cu intrări, plonjarea e în A, în afara buclei, urmată de
  intrare, bucla, ieșire și ridicare. Fiecare trecere a buclei plonjează în același A și intră pe buclă în același p₀.
- **12 (intrările), nouă.** Rulează în poartă cu documentul.
  - Pe o operație cu intrări, fiecare buclă:
    - fie are la fiecare trecere intrarea și ieșirea de la 2, cu o rază din {`raza`, `raza / 2`}, iar p₀ e un candidat
      de la 3;
    - fie n-are niciuna, și atunci niciun candidat nu încape (cu toleranța declarată de oracol).
  - Pe o operație fără intrări, nicio buclă n-are intrări.

**8. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- documentul v7;
- invariantele 9, 10 și 11 amendate și invarianta 12;
- un oracol pe hârtie pentru intrări. El citește G-code-ul și măsoară, pe fiecare buclă:
  - p₀, C și raza;
  - partea intrării;
  - distanța minimă a discului frezei, pe intrare și pe ieșire, până la marginea regiunii păstrate.

**Cazurile pe hârtie** (formele de azi sunt dreptunghiul și cercul; U, C, L și literele vin cu importul SVG, felia 2.7):
- un dreptunghi pe exterior, în urcare și în opoziție;
- o gaură dreptunghiulară (interior);
- o gaură circulară mică, unde raza se înjumătățește, și una și mai mică, unde intrarea se omite;
- două piese apropiate, unde intrarea din vârful 0 ar mușca din vecina și se mută pe mijlocul unei laturi;
- o piesă cu gaură (inelul);
- cu urechi, unde pozițiile urechilor se mută odată cu p₀.

**Martorii negativi**, care trebuie să înroșească oracolul:
- intrarea pe partea păstrată (latura ghicită, ca în ediția întâi);
- intrarea lăsată în vârful 0 când mușcă din vecina;
- intrarea omisă deși una încape;
- ieșirea pe cealaltă parte;
- plonjarea pe buclă în loc de A.

**9. Interfața:** în dialogul de export, fiecare rând are o coloană **Intrări**:
- bifa, iar pe rândul de detalii, raza în mm;
- bifa e oprită pe `pe-linie` și în fila care doar citește;
- valorile intră în document ca urechile și rampa.

Avertismentele exportului (intrarea omisă) se arată sub rezultat.

## Limitele

- **Intrările cu rampă** vin în felia 2.5c. Rampa taie bucla fără ridicare între treceri, deci intrarea și ieșirea se
  leagă altfel de ea.
- Intrarea e un arc tangent, de un sfert de cerc. Intrarea în linie, cea perpendiculară sau cea cu suprapunere pot veni
  dacă atelierele le cer.
- Candidații sunt puncte fixe (vârful 0 și mijloacele segmentelor). Alegerea de mână vine cu panoul de proprietăți.

## Ce am respins

- **Partea ghicită din geometrie (centroidul, ediția întâi):** pe găurile literelor și pe colțurile ascuțite mușca din
  piesă. Partea vine din regula sensului și se verifică pe regiune.
- **Verificarea pe eșantioane:** discul se judecă exact, ca la invarianta 2.
- **„Cealaltă parte” ca al doilea candidat (ediția întâi):** cealaltă parte e chiar piesa.
- **Comentariul „lead omis” în program:** poarta ar citi un comentariu necunoscut sub etichetă. Omisiunea se spune la
  export.

**Se redeschide dacă:** atelierele cer alte forme de intrare, sau placa 2 arată urma de intrare peste 0,1 mm.
