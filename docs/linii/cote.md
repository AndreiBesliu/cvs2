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
- **Mărimea:** pornirea 114,7 / 120 kB (ADR 0145), totalul 806,1 / 900 kB. Unealta vine în bucata editării, la cerere;
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

- **24.11, ADR 0330 acceptat** (owner-ul, în schiță, 10:52, apoi „am raspuns”): 1a–6a, cu nota „vreau cat mai multe
  optiuni si setari pe care un user le poate selecta si configura pentru sistemul de cote. dar nu le vreau in zona de
  design/proiectare. vreau o zona de settings generale si acolo sa se poata seta toate astea”. De aici: o fereastră nouă,
  „Setări” (meniul contului, paleta, Ctrl+,), secțiunea Cotele, cu toate setările (ADR 0330 §6); bara uneltei doar cu
  felurile și ⚙; panoul doar cu ce e al cotei; setările ale aplicației (browser), nu ale cotei. 10.4↑a s-a împărțit în
  a-1 (modelul și proba G-code-ului), a-2 (unealta), a-3 (Setări, panoul, lista, manualul). Schița, la zi (versiunea 2).

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
