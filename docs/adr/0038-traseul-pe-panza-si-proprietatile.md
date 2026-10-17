# ADR 0038: Traseul pe pânză (stratul WebGL2) și panoul de proprietăți editabil

**Starea:** acceptat pe 16.10.2026 („ok”: implicitul recomandat la toate cele trei alegeri marcate **(owner)**), pentru
felia 2.8. Precizat la acceptare: poziția din panou e colțul stânga-jos al cutiei selecției; rotirea ține pe loc centrul
cutiei piesei (§4).

**Intră în:** etapa 2 (felia 2.8, în sub-feliile 2.8c–2.8e din fișă). **Precizează:** ADR 0013 (T13, pânza): ordinea
straturilor până la simulare (etapa 4).

**Problema.** Azi traseul frezei se vede doar ca text G-code, după export: greșelile de parte, de sens sau de ordine se
descoperă în simulatorul altui program, sau pe mașină. Panoul de proprietăți arată selecția, dar nu se poate edita: o
poziție exactă cere tragere cu mausul.

## Decizia

**1. Ce se desenează.** Traseul **ultimului program calculat**, din IR (ADR 0008: în coordonatele documentului, deci cu
aceeași vedere ca vectorii):
- tăierile (G1) și arcele (G2 / G3) într-o culoare, rapidele (G0) în alta, mai stinsă; Z nu se vede (vederea e de sus;
  trecerile se suprapun);
- **LINE_STRIP** pe fiecare șir continuu de mișcări, cu linia de 1 pixel fizic (T13);
- arcele se aproximează la cel mult ½ pixel fizic la treapta de zoom curentă (trepte de ×2: la o schimbare de treaptă,
  aproximarea se reface); sub bugetul de segmente măsurat la pornire (T13); peste buget, aproximarea se rărește și un cip
  o spune;
- **precizia:** vârfurile urcă în GPU în float32 **relativ la originea bucății lor**, iar translația vederii se calculează
  în double, pe procesor. Altfel, la 1 000 px/mm, un vârf la 2 440 mm de origine ajunge în shader la ~2,4·10⁶ px, unde
  pasul lui float32 e 0,25 px, iar scăderea translației îl păstrează; pe o foaie la plafon (10 000 mm), pasul e 1 px.

**2. Când se calculează** **(owner)**:
- **implicit: la cerere, fără recalcul automat.** Programul se calculează la acțiunea „Arată traseul” (bara de sus și
  tasta T; Ctrl+T e al browserului), cu motivul refuzului dacă CAM-ul refuză, și se reîmprospătează după fiecare calcul de export. Când documentul
  se schimbă, traseul rămâne, **stins, cu cipul „traseul e vechi”**, până la calculul următor. CAM-ul rulează pe firul
  principal (secunde, pe un document mare); recalculul automat vine când calculul se mută în bazinul de workere (etapa 4,
  ADR 0015);
- respins pentru acum: recalculul automat, la fiecare schimbare, cu întârziere de 300 ms. Pe un document mare ar îngheța
  pânza la fiecare tragere.

**3. Straturile** **(owner)**:
- **implicit:** canvasul WebGL2 stă **deasupra** stratului de vectori, transparent, fără pointer-events: traseul se vede
  peste contururi, cu care coincide doar la tăieturile pe linie. Foaia rămâne în workerul vectorilor;
- **precizarea lui T13:** planul punea foaia pe WebGL2, sub vectori, pentru câmpul simulării. Asta se hotărăște în etapa 4,
  când câmpul există. Acum ar aduce codul WebGL2 în pachetul de pornire (96,6 / 100 kB), iar fără WebGL2 foaia ar dispărea;
- codul stratului se încarcă **la cerere**, la primul „Arată traseul”;
- **fără WebGL2** (blocat de browser sau de politica firmei), sau cu contextul pierdut și nerecuperat: pânza merge ca azi,
  iar cipul spune „traseul nu se poate afișa: WebGL2 indisponibil”. Fără desen software de rezervă. La
  `webglcontextrestored`, bufferele se refac din program.

**4. Panoul de proprietăți se editează** **(owner)**:
- **implicit, în 2.8:**
  - poziția X / Y: **colțul stânga-jos al cutiei selecției**, în coordonatele foii, la una sau la mai multe instanțe (aceeași
    deplasare pentru toate). Pentru om e locul formei, nu originea instanței, care la un cerc e centrul;
  - rotirea unei singure instanțe, în grade, normalizată în [0, 360), **în jurul centrului cutiei piesei** (centrul rămâne
    pe loc, ca în programele de desen; instanța își mută originea cât trebuie);
  - foaia, fără selecție: lățimea, înălțimea și grosimea, în plafoanele schemei (ADR 0024).
- Operațiile rămân în dialogul exportului, iar panoul le arată, cu butonul „Editează în export”.
- Fiecare schimbare e o acțiune a registrului, cu capabilitatea `desen`: un singur pas de anulare, refuzată cu motiv în
  fila care doar citește. **Mutarea, rotirea și foaia nu schimbă operațiile;** exportul le judecă din nou.

**5. Câmpul numeric unic** (o singură componentă, folosită de panou, iar mai târziu de dialoguri):
- citește cifre, cu punct sau virgulă și semn opțional, unde mărimea îl permite; X / Y pot fi negative, dimensiunile nu;
- **Enter sau ieșirea din câmp aplică; Escape revine.** O valoare greșită rămâne în câmp, cu motivul, și nu se aplică;
- valoarea din document se arată cu `textNumar` (citită înapoi exact): o confirmare fără nicio schimbare nu e o comandă.

## Dovada și probele

- **Oracolul stratului** (sesiune independentă, fără importuri din `src/`): din textul G-code și din vedere, pixelii pe care
  trebuie să cadă traseul. Testul de legătură citește pixelii canvasului WebGL2 în e2e (Edge, WebGL2 software), pe hârtie:
  - dreptunghiul profilat pe exterior cu Ø6: o ramă la 3 mm de contur, ±1 px la 10 px/mm;
  - cercul Ø30: raza 15 + R, ±1 px la 1 000 px/mm, la marginea foii de 2 440 mm (precizia relativă);
  - linia tăiată pe linie: aceiași pixeli ca vectorul ei.
- **Panoul:** teste pe acțiuni (un pas de anulare, refuzurile, plafoanele, normalizarea rotirii) și e2e (Enter, Escape,
  virgula, valoarea greșită cu motiv, fila care doar citește).
- **Pornirea** rămâne sub 100 kB: stratul și câmpul se încarcă la cerere (poarta `determinism` o măsoară).

## Precizările din 2.8e (17.10.2026, după recenzia și oracolul independente)

- **Colțul din panou e o mărime derivată** (`x + t`, din geometrie): valoarea exactă scrisă de om adesea nu există ca
  rezultat al adunării (la o formă rotită, grila lui `x` e mai rară decât cea a colțului). Câmpul îl arată rotunjit la
  1e-9 mm (`valoareDerivata`), iar o deplasare sub 1e-9 mm nu e o comandă. Mărimile ținute în document (rotirea, foaia) se
  arată în continuare exact (§5).
- **Ieșirea din câmp printr-un clic oriunde aplică**, și când clicul schimbă selecția (câmpul se demontează): valoarea
  se aplică în faza de captură a apăsării, pe forma de atunci.
- **Un refuz al CAM-ului** se ascunde cu „Arată traseul” ca traseul, iar după o schimbare a documentului nu mai e motivul
  de acum: cipul spune că traseul e vechi.
- **Contextul pierdut:** cipul „revine singur” cât așteaptă refacerea, cel mult 5 s; apoi „WebGL2 indisponibil” (§3). T
  montează un strat nou, cu un canvas și un context noi, în loc să pretindă „ok” peste canvasul vechi.
- **Bugetul de segmente** se judecă pe vârfurile urcate în GPU (segmentele lungi se taie în pași de 32 mm), nu pe
  segmentele programului.
- **Oracolul stratului** (`test/oracles/strat-traseu.ts`) judecă ±1 px, fără goluri (1,5 px) și abaterea medie ≤ ½ px pe
  primitivă (fără ea, un traseu decalat cu 1 px trecea). Limita lui, spusă: precizia relativă la bucată nu se poate
  dovedi doar cu ±1 px (desenul „naiv” în float32 e prins în 3 din 20 de faze la 2 440 mm, 8 din 20 la 10 000 mm); ea
  rămâne probată numeric (≤ 0,006 px la 1 000 px/mm).

## Ce am respins

- **Traseul desenat în workerul vectorilor** (Path2D): un program de 1 M de segmente pe pânză software trece de secunde
  (s6-V). T13 l-a pus pe WebGL2 tocmai de aceea.
- **Liniile groase sau cu stil** (lățimea ≠ 1 în WebGL2 nu e portabilă): culoarea deosebește rapidele, nu grosimea.
- **Animația traseului** (ordinea în timp): vine cu simularea, în etapa 4.

## Se redeschide dacă

- traseul unui program real trece de bugetul de 60 Hz pe placa integrată;
- owner-ul vrea traseul viu, la fiecare schimbare, înainte de bazinul din etapa 4;
- simularea (etapa 4) cere câmpul sub vectori, deci și foaia pe WebGL2.
