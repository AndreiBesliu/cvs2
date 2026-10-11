# ADR 0034 — Forma „cale”: un contur închis din linii, arce și cubice (documentul v9)

**Starea:** acceptat pe 11.10.2026, în felia 2.7b. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Importul SVG (2.7c), textul (etapa 7) și desenul (etapa 6) aduc contururi oarecare: linii, arce și cubice.
Documentul are doar două forme parametrice, dreptunghiul și cercul. Cubicele trebuie să stea exacte în document, pentru
pânză și pentru exportul vectorial (T1, ADR 0001). La mașină ajung doar prin biarce (ADR 0006, ADR 0033).

## Contractul

**1. Forma** (o variantă nouă a formei unui element, ADR 0024):

```
{ tip: 'cale', inchis: true, varfuri: [ { p: { x, y }, s }, … ] }
s = { tip: 'L' } | { tip: 'A', bulge } | { tip: 'C', c1: { x, y }, c2: { x, y } }
```

- Convenția e a conturului (ADR 0001). Fiecare vârf poartă segmentul care pleacă din el spre vârful următor, iar ultimul
  vârf se leagă de primul. Arcul are `bulge` = tan(baleiaj / 4), pozitiv în sens trigonometric. Cubica are punctele de
  control c1 și c2.
- Coordonatele sunt ale elementului. Matricea lui, a grupurilor de deasupra și a instanței o așază pe foaie (ADR 0024).
- `inchis` e mereu `true` în v9. Contururile deschise vin cu 2.3c, cu o schemă nouă, ca o versiune care nu le înțelege
  să le refuze la ușă, nu să le închidă.
- Câmpurile necunoscute se păstrează pe formă, pe vârf, pe segment și pe punct, ca peste tot în document.

**2. Ce refuză ușa** (schema documentului, cu motiv):
- mai puțin de 2 vârfuri, sau peste **`PLAFON.varfuriCale` = 50 000** pe o cale;
- un număr care nu e finit, sau o coordonată (p, c1, c2) cu |x| sau |y| peste `PLAFON.translatie` (10⁷ mm);
- un tip de segment necunoscut;
- un arc cu `bulge` 0 sau cu capetele în același punct: n-are cerc;
- `inchis` altfel decât `true`;
- o cale cu arce sub o matrice care nu e o similitudine (ca dreptunghiul rotunjit și cercul): arcul ar deveni elipsă.
  Liniile și cubicele trec exact prin orice matrice afină;
- plafoanele de ansamblu, numărate o dată pentru ușă și pentru acțiuni (ADR 0024):
  - vârfurile tuturor căilor pieselor: cel mult **`PLAFON.varfuri` = 200 000**;
  - vârfurile în lume (instanțele înmulțite cu vârfurile căilor piesei lor): cel mult **`PLAFON.varfuriLume` =
    1 000 000**. Pânza, CAM-ul și clicul sunt liniare în ele.

Ușa **nu** judecă geometria: autointersecțiile, segmentele nule, sensul de parcurgere sau aria nulă. Pânza desenează orice
cale, iar CAM-ul refuză, cu motiv, ce nu poate tăia (gărzile offsetului, ADR 0005: conturul care se autointersectează,
cel sub rezoluție, cel cu mai puțin de două vârfuri distincte; regiunea păstrată, ADR 0026).

**3. Migrarea v8 → v9** schimbă doar numărul schemei. Un document v8 e un document v9 valid, iar programul lui rămâne
același, octet cu octet. O versiune v8 refuză un document v9 la ușă („scris de o versiune mai nouă”), deci nu poate tăia o
cale fără s-o înțeleagă. Invers, un document **marcat v8 care conține o cale** e refuzat, cu motiv: v8 n-o cunoaște, deci
nu e un v8 valid, iar ușa nu ghicește cine l-a scris (precizarea din 11.10, la constatarea oracolului).

**4. Pânza** desenează calea exact: liniile, arcele cu centrul și raza lor, cubicele ca Bézier. Nicio aproximare pe ecran.

**5. Clicul** (ADR 0003: o singură funcție „punct în regiune”) măsoară cubicele direct, nu prin biarce:
- **includerea** (`evenodd`): cubica se taie la extremele lui y în bucăți monotone pe y. Raza orizontală traversează o
  bucată cel mult o dată, iar punctul traversării se găsește prin bisecție, la precizia aritmeticii;
- **distanța** la cubică: bucățile monotone pe x și pe y, eșantionate, apoi rafinate prin Newton. Măsura e pentru clic
  (toleranța lui e de câțiva pixeli), nu pentru mașină.

CAM-ul nu măsoară cubice: el lucrează pe conturul lui din biarce (§6). Distanța dintre două contururi (`apropiere`) și
offsetul refuză în continuare o cubică, ca gardă.

**6. CAM-ul** (ADR 0033 §7). Fiecare element tăiat intră în CAM ca un contur fără cubice, **o singură dată**, în lume:
- conturul elementului, după matrice, cu fiecare cubică înlocuită de biarcele ei la `TOLERANTA_PROIECT`. Arcele și
  liniile rămân. Biarcele se fac în coordonatele foii, ca toleranța și raza maximă (`RAZA_MAXIMA_ARC`) să fie măsurate
  unde taie freza;
- același contur servește regiunii păstrate (ADR 0026), profilului, degajărilor (ADR 0032) și avertismentelor. Nu există
  două aproximări ale aceleiași căi într-un program;
- un refuz al biarcelor (plafonul de bucăți, rezoluția numerică; ADR 0033 §5) e refuzul exportului: `<idLume>: <motiv>`;
- **abaterea traseului** față de calea desenată: biarcele (≤ 0,99 × 0,001 mm), plus ce adaugă oricum offsetul și
  rotunjirea postului pe linii și arce (ADR 0026 §6);
- **raza arcelor după offset:** biarcele au raza ≤ 9 900 mm. Offsetul spre exterior adaugă raza frezei, cel mult 50 mm
  (`PLAFON.diametruScula` = 100 mm), deci arcul rămâne sub garda postului GRBL (10 000 mm), care l-ar aproxima a doua
  oară. Testul de consecvență al bugetului (`geom.toleranta.test.ts`) leagă cifrele de plafonul sculei.

**7. Operația implicită** a unei căi noi e cea a dreptunghiului: profil pe exterior, 3 mm într-o trecere. Importul (2.7c)
își alege latura din imbricare.

**8. În lista de vectori**, calea apare ca „cale L × H, n segmente, la X x, Y y”: cutia ei exactă în lume (ADR 0033: cu
extremele cubicelor), cu colțul stânga-jos.

**9. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- documentul v9: forma, refuzurile de la §2, păstrarea câmpurilor necunoscute, migrarea v8 → v9, plafoanele noi,
  numărate și după acțiuni;
- clicul pe căi: includerea și distanța, față de o măsură proprie;
- CAM-ul pe căi cu cubice, de la cap la coadă: G-code-ul citit înapoi stă la raza frezei de calea exactă, cu abaterea în
  bugetul de la §6, pe un corpus (litere, inimi, curbe de 2 440 mm, cubice cu vârfuri, căi cu arce și linii amestecate);
- documentele fără căi dau aceleași programe, octet cu octet (corpusul și placa 1).

## Limitele

- **Timpul CAM-ului:** biarcele costă ~1–3 ms pe cubică (măsurat pe corpusul ADR 0033), pe firul principal. Un SVG cu
  10 000 de cubice ar ține exportul ~20 s. Se măsoară în 2.7c, pe fișiere reale; dacă trece de buget, CAM-ul se mută
  într-un worker (T3, ADR 0015).
- **Documentul la plafon** (200 000 de vârfuri pe piese, măsurat): 20,6 MB de JSON; ușa îl judecă în ~1,1 s, iar JSON-ul
  canonic al fiecărei salvări ia ~0,7 s. Un SVG obișnuit are de sute de ori mai puțin.
- Calea nu se editează încă (desenul vine în etapa 6), iar contururile deschise vin cu 2.3c.
- Arcele eliptice ale unui SVG vin ca cubice, de la import (ADR 0002).

## Ce am respins

- **Biarcele în document:** s-ar pierde cubica exactă, pentru pânză și pentru export, iar aproximarea ar depinde de
  scara la care o așază matricea. Ușa biarcelor rămâne una, la CAM (ADR 0006).
- **Polilinia** (calea eșantionată): pierde curbele și continuitatea tangentei.
- **Câte o formă pe fiecare element SVG** (`rect`, `ellipse`, `path`…): CAM-ul și pânza ar avea câte o ramură pe fiecare.
  Importul (2.7c) aduce totul la cale, cu excepțiile pe care le alege el.
- **Clicul prin biarce:** ar cere aceeași aproximare ca CAM-ul pe fiecare clic (~1–3 ms pe cubică), pentru o toleranță
  de câțiva pixeli.

**Se redeschide dacă:** importul (2.7c) are nevoie de altceva decât un contur închis pe element, sau timpul CAM-ului pe
fișiere reale trece de buget.
