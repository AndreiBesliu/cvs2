# ADR 0273 — Fereastra trasării, refăcută

**Starea:** propus pe 23.11.2026, la „2” (owner-ul, în sesiunea liniei trasării, la „Ce aș face întâi”, punctul 2: „O felie
de interfață: punctele 1, 2, 4 și 5 de la interfață, plus virgula”), după întrebarea lui „cum se mai poate imbunatati
trasarea din imagine? si ca functionalitate si ca UI/UX”. Felia 25.9↑, fără mașină, în linia trasării (ramura
`wip/25.1-trasare`). Codul pornește după răspunsuri.
**Completează:** ADR 0220 (fereastra trasării), ADR 0221 (culorile și pastilele), ADR 0223 (opțiunile liniei mediane),
ADR 0224 (lumina și zona), ADR 0225 (foaia), ADR 0271 (îndreptarea scanărilor), ADR 0272 (bifele imaginii pe foaie).
**Schița:** <https://claude.ai/artifact/UA5gA9u1wh7cbG8RG5RYjp>. Pe ea sunt fereastra de azi, cu măsurătorile, macheta
(grupurile, mărimea desenului, piciorul fix, sugestia ca buton), ce intră în felie și întrebările, cu formularul, care scrie
răspunsurile în `raspunsuri/owner`, în baza paginii.

## Problema

Fereastra trasării a crescut cu fiecare felie (25.1↑ … 25.8↑a): fiecare a adăugat câmpurile ei în coloana din stânga, în
ordinea în care au venit. Măsurată pe 23.11, în aplicația de pe ramură, cu logoul owner-ului
(`test/fixtures/trasare/logo-cvs.png`), unde ajunge marginea de jos a butonului **Importă**, în pixeli de sus:

| Ecranul | Contururi | Culori | Linii mediane |
| --- | --- | --- | --- |
| 1920 × 1080 | 997, la vedere | 1 297 | 1 342 |
| 1400 × 900 | 956 | 1 297 | 1 342 |
| 1366 × 768 | 956 | 1 297 | 1 342 |
| 1280 × 720 | 956 | 1 297 | 1 342 |
| 1024 × 768 | 975 | 1 317 | 1 385 |

În engleză, aceleași cifre sau cu cel mult 37 px mai puțin. Deci:

- **Butoanele se văd fără derulare într-un singur caz din 15.** Se derulează toată fereastra (`.dialog-cutie`), cu
  previzualizarea cu tot: ca să apeși Importă, previzualizarea iese din ecran.
- **Previzualizarea are mereu 800 × 418** (640 × 418 la 1024): pe un ecran mare nu crește.
- **Setările sunt o singură listă:** 19 controale pe alb-negru, 27 pe culori (Sursa, Rezultatul, [opțiunile liniei
  mediane], Pragul, Inversează, [Lumina], Netezimea, petele, golurile, marginea, [Foaia], [Îndreptarea], Lățimea), cu
  titluri de mărimi diferite („Pragul”, „Numărul culorilor”, „Mai late de (mm)” mai mari decât restul).
- **Mărimea se scrie pe imagine, nu pe desen:** „Lățimea” e 340,8 mm (imaginea întreagă), iar desenul iese
  327,06 × 72,42 mm. Omul gândește „logoul să aibă 300 mm”.
- **„Desenul: 327.06 × 72.42 mm”** e scris cu punct (`toFixed(2)` în `src/ui/DialogImport.tsx`, din ușa importului),
  restul ferestrei cu virgulă.
- **Raportul e un șir de propoziții** sub previzualizare, iar sugestiile (Neuniformă, Îndreaptă foaia, Îndreaptă scanarea)
  sunt text: le citești, apoi cauți lista.
- La 1024 px, lista „Capetele” se taie („Centrul capătulu…”).

## Ce am aflat (cercetarea din 23.11)

- **Illustrator, Image Trace:** sus Preset și View (rezultatul, sursa, cu sau fără contururi), apoi Mode și Palette; Paths,
  Corners și Noise stau sub „Advanced”, strânse
  ([Adobe](https://helpx.adobe.com/lv/illustrator/using/tracing-artwork-live-trace-or.html),
  [presetările](https://helpx.adobe.com/illustrator/using/image-trace-presets.html)).
- **LightBurn, Trace Image:** pragul (Cutoff și Threshold), „Ignore less than”, Smoothness, Optimize; „Fade Image” și „Show
  Points” lucrează doar în previzualizare ([LightBurn](https://docs.lightburnsoftware.com/1.7/Reference/TraceImage/)).
- **Inkscape 1.2, Trace Bitmap:** felurile pe file (Single scan, Multicolor, Pixel art), „Live updates” sau „Update
  preview” jos ([notele 1.2](https://wiki.inkscape.org/wiki/Translations:Release_notes/1.2/396/en),
  [manualul](https://inkscape-manuals.readthedocs.io/en/latest/tracing-an-image.html)).
- **Vectric, Trace Bitmap:** Preview, apoi Apply; Corner Fit și Noise Filter; „Bitmap Fading” schimbă doar vederea
  ([Vectric](https://docs.vectric.com/docs/V12.5/VCarvePro/ENU/Help/form/Trace%20Bitmap/index.html)).
- **Comun:** în față, puține alegeri (presetarea sau felul, pragul sau culorile); reglajele fine, strânse; previzualizarea,
  cât mai mare; acțiunile, la vedere.
- **În cvs2:** „Din desen…” al imprimantei are Simplu / Avansat (ADR 0191); rolurile personalizate țin alegerile omului în
  browser (ADR 0114).

## Decizia propusă

1. **Așezarea:** fereastra are cel mult înălțimea ecranului și nu se mai derulează ea:
   - antetul (numele fișierului), sus;
   - corpul, pe două coloane: setările (care se derulează singure) și previzualizarea (care ia tot locul rămas și crește
     cu fereastra);
   - piciorul, fix: raportul scurt, „Păstrează imaginea pe foaie” și butoanele (Importă, Doar imaginea, Renunță).

   Sub 40 rem (telefonul, ADR 0250 §7): o coloană (setările, apoi previzualizarea), cu piciorul tot fix.
2. **Setările, în ordinea lucrului:** sus, mereu la vedere, **Sursa** și **Rezultatul**; apoi patru grupuri care se strâng,
   fiecare cu rezumatul valorilor pe titlu („Curățarea · echilibrat · pete și goluri sub 0,3 mm”):
   - **Imaginea:** Lumina, Îndreaptă foaia (formatul, colțurile), Îndreaptă scanarea (unghiul), Ignoră ce atinge marginea;
   - **Trasarea:** Pragul (cu histograma) și Inversează, sau Numărul culorilor și pastilele; opțiunile liniei mediane;
   - **Curățarea:** Netezimea, petele, golurile;
   - **Mărimea:** mărimea scrisă (punctul 4), pixelul în mm și DPI-ul.

   Zona rămâne în bara previzualizării. Un grup cu o sugestie a raportului primește un semn pe titlu; „Aplică” îl deschide.
   Fereastra ține minte, în browser, ce grupuri ai deschis.
3. **Simplu / Avansat:** după răspunsul la întrebarea 1.
4. **Mărimea desenului:** lățimea și înălțimea desenului (cutia vectorilor), legate, fiindcă desenul nu se întinde: scrii
   una, cealaltă urmează. Mărimea imaginii rămâne, la alegere în grupul Mărimea (întrebarea 2); ce rămâne fix după ce ai
   scris, la întrebarea 3. Chenarul desenului, punctat, cu mărimea lui, stă pe previzualizare.
5. **Raportul pe scurt:** în picior, câteva semne („48 de contururi · 327,06 × 72,42 mm · abaterea 0,15 mm”), iar restul
   sub „Detalii”. Sugestiile devin butoane („Aplică „Neuniformă””, „Îndreaptă foaia”, „Îndreaptă scanarea”, la liniile
   mediane „Treci pe Contururi”), cu textul de azi lângă ele.
6. **Virgula:** „Desenul: …” scris după limbă (`nr`, ca restul ferestrei), deci și la SVG, DXF, PDF, EPS și WMF; în
   engleză, punctul.
7. **Ce nu se schimbă:** nucleul trasării, workerul, cererea (`CerereTrasare`), alegerile (`AlegeriTrasare`) și ușa: aceleași
   câmpuri, aceiași octeți. Câmpurile își păstrează `data-camp`-urile; probele care le folosesc deschid întâi grupul lor.
8. **Probele:**
   - o probă e2e nouă: la 1024 × 768, 1280 × 720, 1366 × 768, 1400 × 900 și 1920 × 1080, în română și în engleză, cu
     fontul lat (Verdana; pe Linux, `system-ui`), pe Contururi, Culori și Linii mediane, butoanele și previzualizarea stau
     în ecran fără derularea ferestrei, iar fereastra nu se derulează pe orizontală;
   - mărimea desenului: desenul importat iese cât ai scris (la 0,01 mm), pe alb-negru, pe culori și pe liniile mediane;
   - grupurile: rezumatul urmează valorile, „Aplică” deschide grupul și schimbă alegerea;
   - virgula, în română și punctul în engleză.
9. **Mărimea:** fereastra stă în bucata importului, la cerere: estimat +2–4 kB în total, pornirea neschimbată.

## Ce las pe dinafară (în felia asta)

Restul listei din 23.11, fiecare o felie a ei, la cuvântul owner-ului:

- rețetele („Logo”, „Schiță cu linii”, „Scanare tehnică”, „Siluetă din poză”, „Scris de mână”) și „Setările mele”;
- efectul vizibil al reglajelor (petele scoase și golurile umplute, colorate), nodurile, lupa 1:1, înainte / după;
- clicul pe o pată în previzualizare, ca s-o scoți;
- freza pe contururi (trăsăturile și golurile mai înguste decât ea), „Drepte și arce”, silueta și șablonul (punțile),
  culorile în incrustații, treptele de gri, radiera;
- 25.8↑b: „Calibrează” și „Trasează…” din imaginea de pe foaie.

## Ce am respins

- **Filele pe felul trasării** (ca Inkscape: Alb-negru, Culori, Linii mediane): sursa și rezultatul se combină (culori pe
  linii mediane, ADR 0227), deci filele s-ar înmulți; două liste sus spun același lucru mai scurt.
- **Fereastra derulată, cu butoanele lipite jos** (`position: sticky` pe picior): previzualizarea tot ar ieși din ecran
  cât reglezi setările de jos ale coloanei.
- **Previzualizarea într-o fereastră separată:** două ferestre de mutat, iar pe ecranele mici nu încap amândouă.

## Ce impune

- **Fereastra:** `src/ui/FereastraTrasare.tsx` (grupurile, rezumatele, mărimea, raportul scurt), `src/ui/DialogImport.tsx`
  (corpul și piciorul, virgula) și `src/app/stil.css` (așezarea `.dialog-trasare`).
- **Ușa:** mărimea desenului se duce în scara de azi (mm pe pixel), deci cererea nu se schimbă.
- **Textele:** noi, în română și în engleză (`src/i18n/import.*.ts`), și manualul (capitolul trasării, în ambele limbi).
- **Probele:** cele de mai sus; e2e-urile trasării de azi, mutate pe grupuri.

## Întrebările (recomandarea întâi)

Ce poate sta împreună vine oricum (regula „toate opțiunile”); întrebările sunt doar despre ce se exclude sau ce vezi la prima
deschidere.

1. **Comutatorul Simplu / Avansat** (grupurile vin oricum):
   - **a)** fără comutator: doar grupurile, cu Imaginea și Curățarea strânse la deschidere;
   - b) cu comutator, Simplu la prima deschidere (Simplu ascunde de tot Imaginea și Curățarea, ca la „Din desen…”);
   - c) cu comutator, Avansat la prima deschidere.
2. **Ce mărime scrii, la prima deschidere** (amândouă rămân, cu alegerea în grupul Mărimea):
   - **a)** a desenului: lățimea și înălțimea vectorilor, legate;
   - b) a imaginii, ca azi.
3. **După ce ai scris mărimea desenului, ce rămâne fix când schimbi pragul sau curățarea:**
   - **a)** mărimea scrisă: desenul rămâne cât ai scris, iar scara se socotește din nou după fiecare trasare (cel mult o
     trasare în plus, fiindcă petele și golurile sunt în mm);
   - b) scara din clipa în care ai scris: desenul se poate schimba cu fracțiuni de mm, iar câmpul arată noua mărime.
