# ADR 0272 — Imaginile pe foaie (straturile bitmap)

**Starea:** propus pe 21.11.2026, la „Da, propunerea” (owner-ul, în sesiunea liniei trasării, la întrebarea „Pregătesc
propunerea pentru straturile bitmap (ADR 0272, cu schiță)?”). Codul pornește după răspunsurile la întrebările de la capăt.
Feliile 25.8↑a și 25.8↑b, fără mașină, în linia trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`).
**Completează:** ADR 0220 (trasarea din imagine; întrebarea 1c, „imaginea pusă întâi pe foaie, ca strat … mai târziu”),
ADR 0210 §1 (foile), ADR 0050 (ghidajele). Rândul „Straturi bitmap ca suprafață de desen” din
`ACOPERIRE-ARTCAM-DESKPROTO.md` (v1, decis pe 06.10).
**Schița:** <https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>. Pe ea sunt macheta (foaia cu imaginea sub desen, rândul ei din panoul foii,
opacitatea, lacătul, calibrarea și trasarea), piciorul ferestrei trasării și întrebările. Formularul scrie răspunsurile
în `raspunsuri/owner`, în baza paginii.

## Problema

Azi o imagine trece doar prin fereastra trasării: după „Importă” rămân vectorii, iar imaginea dispare. Patru lucruri
obișnuite la o mașină CNC nu se pot face:

- **Desenat peste o poză sau o scanare,** cu uneltele de desen, acolo unde trasarea automată nu ajunge (o schiță cu mâna,
  o poză cu contrast slab, o piesă fotografiată pe care vrei doar conturul ei).
- **Verificat vectorii trasați** peste imaginea din care au ieșit, după import.
- **Trasat pe bucăți** o imagine mare (fiecare parte cu reglajele ei), fără s-o importi din nou de fiecare dată.
- **Adusă la mărimea adevărată** o poză fără DPI, după o lungime cunoscută din ea (o riglă, o cotă).

## Ce am aflat (cercetarea din 21.11)

- **Vectric** (VCarve, Aspire): imaginea importată stă pe un strat al desenului, cu un glisor de estompare. „Trace Bitmap”
  trasează din ea, și doar dintr-o parte aleasă. Ajutorul lui spune să desenezi vectorii pe alt strat, iar stratul imaginii
  se poate ascunde.
- **ArtCAM / Carveco:** fiecare model are straturi bitmap (unul gol, implicit, plus câte vrei, din imagini), fiecare cu
  paleta lui de culori. „Bitmap to Vector” lucrează din stratul ales.
- **Fusion 360:** pânza atașată („attached canvas”), cu opacitatea ei și cu „Calibrate”: alegi două puncte, scrii
  distanța, iar imaginea se scalează. Scalarea e doar uniformă.
- **LightBurn, Inkscape:** imaginea e un obiect pe pânză, iar „Trace Image” / „Trace Bitmap” lucrează din cea aleasă.

## Decizia propusă

1. **Imaginile foii:** fiecare foaie poate ține imagini de referință, așezate în mm-ii ei (locul, lățimea, rotirea), sub
   desen și sub trasee, estompate. Nu se taie și nu se exportă: sunt un ajutor de desen. Foaia le ține în câmpul nou
   `imagini` (`{ id, sursa, nume, x, y, latime, inaltime, rotire, opacitate, vizibila, fixata }`). Câmpul nu schimbă ce se
   taie, deci intră fără schemă nouă, ca ghidajele: o versiune care nu-l știe îl păstrează necunoscut.
2. **Octeții imaginii stau în afara documentului:** într-o bază IndexedDB a lor, după amprenta SHA-256. Documentul (scris
   întreg, ca JSON, la fiecare schimbare, cu ultimele 20 de versiuni) rămâne mic, iar versiunile împart aceeași imagine.
   Imaginea pe care n-o mai folosește nicio versiune păstrată se șterge.
   - **Ce se păstrează:** imaginea cum o arată fereastra trasării (cu foaia sau scanarea îndreptată, dacă le-ai bifat), cel
     mult 16 Mpx. O poză JPEG neprelucrată rămâne JPEG-ul ei; restul se păstrează ca PNG.
3. **De unde vine:** din „Importă…”, singurul loc al fișierelor (decizia din 28.10):
   - în fereastra trasării, lângă „Importă”, bifa **Păstrează imaginea pe foaie**: vectorii și imaginea vin împreună,
     una peste alta;
   - butonul **Doar imaginea**: imaginea, fără vectori (întrebarea 1).
4. **Pe foaie** (întrebarea 2), imaginea stă sub desen, cu opacitatea de 40 %:
   - **Fixată:** clicurile ajung la desen, iar uneltele desenează peste ea.
   - **Desfăcută:** se alege cu clicul și se mută, se scalează proporțional și se rotește cu mânerele formelor (ADR 0052,
     ADR 0240).
   - Mutarea, scalarea, calibrarea și ștergerea sunt pași de anulare, ca orice schimbare a documentului.
5. **Lista imaginilor** (întrebarea 3): în panoul foii, sub ghidaje. Fiecare imagine are un rând: miniatura, numele, ochiul
   (vizibilă), lacătul (fixată), opacitatea și meniul („Calibrează”, „Trasează…”, „Șterge”).
6. **Calibrează** (ca la Fusion 360): două clicuri pe imagine și distanța adevărată, în mm. Imaginea se scalează uniform, în
   jurul primului punct.
7. **Trasează…** din imagine: deschide fereastra trasării cu imaginea de pe foaie. Vectorii importați vin exact peste ea
   (locul, scara, rotirea ei). O zonă trasă pe foaie, peste imagine, trasează doar partea aceea.
8. **Pânza:** imaginile se desenează pe un strat al lor, sub vectori, redesenat doar la mutarea vederii, din trepte reduse
   ale imaginii (o imagine de 16 Mpx nu se scalează întreagă la fiecare cadru). Foile vecine nu-și arată imaginile.
9. **Telefonul** (ADR 0250 §7, „pe telefon nu mai lucrăm la desen”): imaginile se văd, dar nu se pun și nu se editează.
10. **Feliile:**
    - **25.8↑a:** punerea (bifa și butonul), baza imaginilor, stratul pânzei, lista din panoul foii (ochiul, lacătul,
      opacitatea, ștergerea), mutarea, scalarea și rotirea desfăcută, anularea, curățarea imaginilor nefolosite.
    - **25.8↑b:** „Calibrează”, „Trasează…” din imaginea de pe foaie (cu zona), numele imaginilor în raportul foii.

## Ce las pe dinafară

- **Formele ridicate din culori** (relieful din culorile unei imagini, ca „Shape Editor” din ArtCAM), din același rând al
  tabelului de acoperire: țin de reliefuri, o linie a lor, încă neîncepută.
- **Pictatul pe imagine** și paleta pe strat (ArtCAM): fereastra trasării are deja culorile, legăturile și pastilele.
- **Imaginile în exporturi** (SVG, PDF) și în G-code: imaginea e un ajutor de desen.
- **Un panou „Straturi”** cu imaginile și grupurile desenului împreună: întrebarea 3, b.

## Ce impune

- **Documentul:** `Foaie.imagini` (fără schemă nouă), plafoanele (imagini pe foaie, lungimea numelui), ușa care le judecă.
- **Baza:** `src/app/imaginiFoaie.ts` (IndexedDB după amprentă, curățarea).
- **Pânza:** stratul imaginilor, sub vectori.
- **Fereastra trasării:** bifa și butonul.
- **Panoul foii:** lista imaginilor.
- **Comenzile:** pune, mută, calibrează, șterge.
- **Restul:** textele (ro, en), manualul.
- **Mărimea, estimată:** ~+6–9 kB în total, încărcați doar pe o foaie cu imagini; pornirea, neschimbată.

## Întrebările (recomandarea întâi)

1. **„Păstrează imaginea pe foaie” la import:**
   - **a)** oprită implicit, ca azi; o bifezi când vrei, iar alegerea se ține minte cât lucrezi;
   - b) pornită implicit: fiecare trasare lasă și imaginea pe foaie.
2. **Imaginea pusă pe foaie:**
   - **a)** fixată: clicurile ajung la desen; o desfaci din lacătul ei ca s-o muți;
   - b) ca o formă: se alege cu clicul, se mută și se rotește direct.
3. **Lista imaginilor:**
   - **a)** în panoul foii, sub ghidaje: fiecare foaie, imaginile ei;
   - b) un panou nou, „Straturi”, cu imaginile și grupurile desenului.
