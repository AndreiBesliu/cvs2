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
lucru) și transformarea traseelor (nepornită, altă felie). În vocabularul planului (`PLAN.md` §3), **cota e un element al
documentului**, ca un contur sau un text.

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

- **24.11:** linia pornită; ramura făcută din `main`; nicio felie începută.
