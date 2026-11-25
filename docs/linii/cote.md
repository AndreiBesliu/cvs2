# Cotele (10.4↑, ADR 0330–0339)

_cncvs2, cotele pe desen, felia 10.4↑ adusă din etapa 10 („Repararea, conversia, cotele, transformarea traseelor”):
ramura `wip/10.4-cote` (din `main`, 24.11), ADR-urile 0330–0339, canalul `cote`; PORNITĂ pe 24.11, la cuvântul
owner-ului; întâi ADR 0330 propus, cu schița și întrebările, apoi codul_

Pornită pe 24.11.2026, la „ce urmeaza in roadmap si nu a fost atins deloc si putem incepe” și „ok, scrie brief-ul pentru
relief si pentru cote” ale owner-ului (în sesiunea principală). E o linie mică, doar în editor și în exportul 2D, care
poate merge în paralel cu orice.

## Rândul din prag

`ACOPERIRE-ARTCAM-DESKPROTO.md`, secțiunea A: „Cote (nici ArtCAM nu le are: doar rigle și măsurare)”, peste prag, v1
(decis pe 06.10), „de făcut”. Etapa 10 o închide împreună cu verificarea vectorilor (făcută), tăierea și conversia (în
lucru) și transformarea traseelor (nepornită, altă felie). În glosarul planului (`PLAN.md` §2, termenul 3), **cota e
un element al documentului**, ca un contur sau un text; ADR 0330 propune altfel (cota stă pe foaie, nu în piesă).

## Ce există și se refolosește

- Riglele și linia de cotă a formelor care ies din foaie (`src/canvas/gradatii.ts`: `pozitiaRiglelor`, `cotePeste`; ADR
  0060), ghidajele și lipirea (`src/geom/lipire.ts`, ADR 0050, 0055), mânerele și ancora (ADR 0052, 0240).
- Textul (`src/text/`, cu Relief SingleLine inclus, ADR 0140) pentru cifrele cotei.
- Exportul 2D cu vectori reali (`src/io/dxfExport.ts`, `svgExport.ts`, `pdfExport.ts`, `epsExport.ts`; ADR 0088, 0089),
  cu oracolul lui independent în Python (`test/oracles-py/export2d.py`, ezdxf): o cotă exportată se probează acolo, cu
  valoarea pe hârtie.
- Raportul foilor și lista de tăiere (`src/model/raportFoi.ts`, ADR 0210 §6), unde stau deja mărimile pieselor.

## Prima livrare

**ADR 0330, propus**, cu schița (o pagină publicată, cu machetele) și întrebările pentru owner, cu recomandarea în
față. Fără cod de produs până la răspunsuri. De hotărât acolo, între altele:

- ce feluri de cote intră în v1 (liniară orizontală / verticală / aliniată, raza și diametrul, unghiul, lanțul);
- dacă o cotă rămâne legată de formă (se mută și își schimbă cifra cu ea) sau e doar un desen;
- ce e măsurarea rapidă (fără să lase nimic pe desen) față de cota păstrată;
- cum se vede (săgețile, cifrele, zecimalele, mm / inch), unde stă unealta și ce tastă are;
- ce face exportul: entitatea DIMENSION în DXF sau linii și text, stratul lor, SVG / PDF / EPS;
- dacă o cotă se poate și grava (implicit nu: cotele nu ajung niciodată în program);
- unde stă în document și dacă cere schemă nouă.

## De ținut minte

- **Schema documentului:** e v27. Dacă cota cere un câmp sau un fel nou de element, numărul îl dă sesiunea principală
  (rezervat: v28 pentru cote, v29 pentru relief; spune înainte să-l iei). Un câmp nou urmează drumul din `CLAUDE.md`
  (oracolul documentului, corpusul de aur, probele versiunii curente).
- **Cotele nu se taie:** CAM-ul, traseul, simularea și verificarea vectorilor nu le văd decât dacă ADR-ul hotărăște
  altfel; proba e pe G-code-ul exportat, octet cu octet, cu și fără cote.
- **Interfața:** un buton, o acțiune sau o etichetă nouă cere capitolul ei în manual, în ambele limbi; o tastă nouă,
  rândul ei în capitolul scurtăturilor; un control cu nume, `node scripts/catalog-controale.ts --scrie`; bara de sus se
  probează la 1280 px și cu fontul lat, în ambele limbi.
- **Mărimea:** din 25.11, plafoanele 125 kB (pornirea) și 1 000 kB (totalul), ADR 0146; cu c-1, pornirea 111,2 (cu ușa și
  cu Atelierul 116,5), totalul 884,2. Unealta vine în bucata editării, la cerere;
  în raportul fiecărei felii, cât adaugă în pornire și în total.
- **Liniile vecine:** exportul (`wip/28.8-export`) și frezele (`wip/16.A-freze`) lucrează în fereastra „Exportă G-code”;
  cotele n-ar trebui să o atingă. „Exportă vectori” e liber.

## Starea

- **24.11:** linia pornită; ramura făcută din `main` (`41233474`), cu `main` adus (`e3a9e512`, A.7).
- **24.11, ADR 0330 propus**, fără cod de produs: unealta Cote (D), cu felurile în bara ei și „Măsoară” (M); lipirea pe
  puncte; cota legată de formă, dezlegată cinstit; pe foaie, fără schemă nouă (deci v28 poate rămâne liber, dacă owner-ul
  ia 1a); cifrele din trăsăturile lui Relief; nu se taie niciodată; exportul pe stratul COTE (DXF ca DIMENSION sau ca
  linii și cifre); patru felii (10.4↑a–d). Schița, cu machetele și cele șase întrebări (răspunsurile se salvează în
  pagină, `raspunsuri/owner`, scrise doar de owner): <https://claude.ai/artifact/BvsaqPKoKWsypCi1tphDvu>. **Urmează:**
  răspunsurile owner-ului, apoi 10.4↑a, cu proba G-code-ului (cu și fără cote) scrisă prima.

- **24.11, ADR 0330 acceptat** (owner-ul, în schiță, 12:52, apoi „am raspuns”): 1a–6a, cu nota „vreau cat mai multe
  optiuni si setari pe care un user le poate selecta si configura pentru sistemul de cote. dar nu le vreau in zona de
  design/proiectare. vreau o zona de settings generale si acolo sa se poata seta toate astea”. De aici: o fereastră nouă,
  „Setări” (meniul contului, paleta, Ctrl+,), secțiunea Cotele, cu toate setările (ADR 0330 §6); bara uneltei doar cu
  felurile și ⚙; panoul doar cu ce e al cotei; setările ale aplicației (browser), nu ale cotei. 10.4↑a s-a împărțit în
  a-1 (modelul și proba G-code-ului), a-2 (unealta), a-3 (Setări, panoul, lista, manualul). Schița, la zi (versiunea 2).

- **24.11, 10.4↑a-1 gata pe ramură** (`472e6107`): proba G-code-ului scrisă prima, modelul (`src/model/cote.ts`), judecata
  ușii la cerere, comanda jurnalului, regula de import; otrăvuri 30 / 30. Fără interfață: owner-ul n-are încă ce încerca.
  **Urmează:** 10.4↑a-2, unealta Cote pe pânză (lipirea pe puncte, felurile liniare, Măsoară, legarea și dezlegarea în
  același pas, alegerea și mânerele).
- **24.11, 10.4↑a-1 unită de sesiunea principală** în lotul 17 (`f25249cf`, la `47be5f42`); `main` (`fdce5f1b`) adus și în
  ramură (`2fb75c06`).
- **24.11, 10.4↑a-2 gata pe ramură** (codul la `ca5ab922`): lipirea pe puncte, desenul cotei liniare, setările citite, dezlegarea în
  același pas, cotele foilor copiate legate de instanțele noi, unealta Cote (D, M) pe pânză; butonul ei în extensia barei.
  **Urmează:** 10.4↑a-3 (fereastra Setări, panoul cotei, lista, „Arată cotele”), la cuvântul owner-ului.
- **24.11, 10.4↑a-3 gata pe ramură** (la „continua”; codul la `bb8c0a8f`): fereastra Setări, cu secțiunea Cotele (cifrele,
  liniile și capetele, comportamentul cu pânza, lipirea, măsurarea; cota de probă; deschiderile din meniul contului, paletă,
  Ctrl+, și ⚙). Panoul cotei, lista, „Arată cotele” și cotele foilor vecine trec în a-4 (numite întâi a-3a și a-3b:
  id-urile fișelor au doar cifre după cratimă).
  **Urmează:** 10.4↑a-4, la cuvântul owner-ului.
- **24.11, 10.4↑a-4 gata pe ramură** (la „continuă cu 10.4↑a-4”; codul la `cc55148f`): panoul cotei, rândul „Cote (N)” din
  listă cu ochiul, „Arată cotele”, cotele foilor vecine (estompate sau ascunse). Felia a încheiat 10.4↑a.
  **Urmează:** 10.4↑b (raza, diametrul, unghiul, inch în fracții), la cuvântul owner-ului.
- **24.11, 10.4↑a-4 cu `main` (lotul 24) adus** (`91dd065c`): ciocnirile doar în DEVLOG și în catalogul controalelor (scris din
  nou). E commit-ul de unit pentru a-4.
- **24.11, 10.4↑b gata pe ramură** (la „10.4↑b”): raza, diametrul, unghiul (și în Automată: cerc, arc, două laturi), cu
  setările lor (prefixele, unghiurile, linia razei) și inch în fracții. Proba mijlocului căii SVG a prins arcul unghiului
  oglindit față de coardă (sweep-flag, reparat). **Urmează:** 10.4↑c (exportul), la cuvântul owner-ului.

- **24.11, 10.4↑a-4 și 10.4↑b unite** de sesiunea principală în lotul 26 (`1eea83dd`, la `98575aff`).
- **25.11, 10.4↑c-1 gata pe ramură** (la „Pornește 10.4↑c”, transmis de sesiunea principală; `main` adus, cu plafoanele
  1 000 / 125 kB): cotele în „Exportă vectori” (bifa „Cu cotele”, stratul din Setări › Exportul, cifrele ca trăsături),
  în DXF, SVG, PDF și EPS, cu oracolul Python nou (`export2d_cote.py`). Felia c s-a împărțit: c-2 aduce DIMENSION și
  cifrele ca text. **Urmează:** 10.4↑c-2, la cuvântul owner-ului.

## Deciziile owner-ului

- **24.11:** 1a (pe foaie, fără schemă nouă: v28 rămâne liber), 2a (legată implicit), 3a (doar cu unealta Cote), 4a
  (Măsoară în aceeași unealtă, M), 5a (DIMENSION implicit în DXF), 6a (nu se taie; „Fă desen din cotă”); setările,
  cât mai multe, într-o zonă de setări generale, nu în Proiectare.

## Capcane găsite

- **Glosarul planului e `PLAN.md` §2**, nu §3 (nota spunea §3; §3 e arhitectura).
- **Ezdxf calculează singur valoarea unei cote DXF** (`Dimension.get_measurement()`, din punctele de definiție), deci
  oracolul exportului compară valoarea pe hârtie fără să citească textul scris de noi. Sonda din 24.11: o orizontală,
  o aliniată, o rază, un diametru și un unghi din trei puncte, citite cu 0 erori și 0 reparații (`recover`).
- **Dezlegarea cere un singur loc:** punctul văzut al unei cote dezlegate de o comandă (ștergerea, nodurile schimbate)
  trebuie să intre în același pas de anulare; `executa` din `src/model/jurnal.ts` e locul comun (ca `inregistreazaFoile`).
  Altfel, cota dezlegată sare înapoi la punctul de la desenare.
- **Bara de sus:** un buton nou de unealtă se probează la 1280 px cu fontul lat, în ambele limbi (ADR 0181, 10.3↑j).
- **Rândul nou al meniului contului** se numără în `cont.spec.ts`, `tutorial.spec.ts` (vecinii lui) și în proba tichetelor de
  pe emulatoare; ușa lui intră în `RANDURI_MENIU_CONT` din `manual.test.ts`.
- **Setările pe hârtie:** pragul cifrelor se probează la înălțimea implicită (după 7 mm, cifra are 16 px pe ecran), iar cifra
  „mereu orizontală” cere și o aliniată trasă spre stânga sau în jos (la orizontală și verticală, normala e mereu aceeași).
- **Panoul și lista nu importă modelul cotelor:** unealta publică ce trebuie arătat în `src/ui/coteVedere.ts`; un câmp nou al
  panoului se publică acolo, iar o schimbare trece tot prin `foaie.cote` (un pas de anulare).
- **Lista felurilor ca valoare** (`FELURI_COTA`) stă în `cote.ts`, nu în `document.ts`: acela e în pornire, iar o valoare
  exportată de acolo ar intra în pachet.
- **„Duplică foaia”** (`comandaDuplicareLegata`, `src/model/pieseLegate.ts`) copiază tot ce are foaia, deci și cotele, cu
  legăturile spre instanțele foii vechi: pe foaia nouă ies dezlegate. De hotărât la a-2 (le leagă din nou de instanțele noi).
- **Orele** din DEVLOG și din fișe sunt ale României (UTC+2), nu UTC.
- **Bara de sus, cu încă o unealtă, ieșea din 1280 px** (Transformarea, fontul lat, română: 1 296 px). Butonul Cote stă în
  extensia barei (ADR 0330 §5); orice unealtă nouă are aceeași problemă.
- **Probele e2e pe pânză:** jos, la 1280 × 720, bara de jos acoperă marginea foii (un clic acolo nimerește un buton); o
  tastă a editorului cere focusul în bara uneltelor (`[data-unealta="selectie"]`), nu pe pânză (canvasul nu ia focus);
  bucata uneltei vine la cerere, deci primul clic așteaptă stratul ei.
- **`src/io` nu importă textul** (regula `io-doar-model-geom`): cifrele cotelor la export le așază apelantul (`cifreDinFont`, în
  `src/text/cifreCote.ts`, reexportat de modulul textului adus la cerere) și le dă entităților (`OptiuniCote.cifre`).
- **SVG-ul exportului e cât foaia** (ADR 0088): o cotă din afara foii iese din pagina lui; PDF-ul, EPS-ul și DXF-ul se lărgesc.
- **Culoarea DXF a stratului:** cea mai apropiată ACI în RGB dădea gri albastrului închis implicit; se alege după nuanță.
- **Probele e2e ale exportului cu cote** așteaptă stratul uneltei Cote înainte de clicuri (altfel două clicuri lasă o cotă
  începută, numărată, apoi pierdută la Selecție) și lista „Cote (1)” după punere.
- **Oracolul Python al cotelor** refolosește așezarea independentă a textului (`text_corpus.aseaza`, fontTools); el lasă
  `__pycache__` în `test/oracles-py/` (de șters, nu de comis); local, Ghostscript se pune cu `apt-get install ghostscript`.
- **Liniile de extensie pleacă de lângă vârfuri:** alese la clic, ar fura începutul unei cote noi; cota se alege doar de
  pe linie și de pe cifră, iar un punct numit al unei forme bate cota.
