# ADR 0226 — Lumina pe culori: fiecare canal raportat la fundalul lui

**Starea:** propus pe 13.11.2026, la „Da, 25.4↑b” (owner-ul, după felia 25.5↑). Felia 25.4↑b, lăsată de ADR 0224 §3
(„lumina lor, fiecare canal raportat la fundal, e o felie a ei”), fără mașină, în linia trasării (worktree-ul `trasare`,
ramura `wip/25.1-trasare`, adusă la `origin/main`, `ab151b4`). Codul vine abia după răspunsurile la întrebările de la final.
**Completează:** ADR 0221 (trasarea pe culori), ADR 0224 (lumina, pe sursa luminozității).
**Schița:** <https://claude.ai/artifact/D39edbszdytPh1zohWXZpd> (pozele prototipului și culorile găsite, fără
corecție, cu „Neuniformă” și cu „Cu umbre”; macheta ferestrei; ce am măsurat; întrebările, cu formularul).

## Problema

La trasarea pe culori (ADR 0221), culorile se aleg din pixelii pozei așa cum sunt. Pe o poză de telefon luminată dintr-o
parte, hârtia are tonuri diferite de la un capăt la altul, iar numărul automat de culori o rupe în două (hârtia deschisă și
hârtia umbrită), ca și cum ar fi două culori de desen; la fel o culoare de cerneală din partea umbrită. Lumina (ADR 0224)
repară asta doar pe alb-negru: pe culori, lista ei nici nu apare.

## Ce am aflat (cercetarea din 13.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate): CorelDRAW
  PowerTRACE reduce culorile, scoate fundalul (singur sau după o culoare aleasă) și curăță artefactele JPEG, dar pentru lumina
  neuniformă trimite la PHOTO-PAINT; Inkscape („Trace Bitmap”, mai multe treceri pe culori) are „Remove background”, nu și
  lumina; Vectric reduce culorile la 16, cu un glisor, și unește culorile apropiate; Carveco (fostul ArtCAM) are „Reduce
  colours” și sfatul de a uni culorile cu umplerea. Niciunul nu corectează lumina înaintea culorilor.
- **Din lucrări publice:** corecția umbrelor pe documente pornește din fundalul hârtiei estimat local și raportat la un fundal
  de referință (harta umbrei; Bako și alții, „Removing Shadows from Images of Documents”, ACCV 2016); variantele învățate
  (rețele) nu sunt pentru noi.
- **Prototipul** [13.11, Node 26, `.tmp/proto-254b.ts`]: o foaie albă (600 × 400) cu un disc roșu, un dreptunghi albastru, un
  triunghi verde, linii negre și un inel galben (cerneala deschisă, cazul greu), cu adevărul știut pe pixel; trasată cu
  nucleul real al culorilor, cu numărul automat. Măsura: câte culori ies (adevărul: 6, cu hârtia), ce clase adevărate se
  despart sau se unesc, partea pixelilor curați puși greșit.

  | Poza | Fără corecție | Luminozitatea singură | Fiecare canal, fundalul neted | Fiecare canal, fundalul local |
  |---|---|---|---|---|
  | lumina egală | 6, 0 % | 6, 0 % | 6, 0 % | 4–5: formele pline se unesc cu hârtia |
  | lumina dintr-o parte (100 → 50 %) | 7: hârtia ruptă în două, 37 % | 6, 0 % | 6, 0 % | 4–5: la fel |
  | plus o dominantă (cald → rece) | 7: hârtia ruptă, 36 % | 6, 0 % | 6, 0 % (paleta: culorile adevărate) | 4: la fel |
  | plus o umbră tare (o bandă la 60 %) | 8: hârtia și galbenul rupte, 11 % | 8, 10 % | 8: hârtia ruptă, 10 % | 4: la fel |
  | creta colorată pe tablă | 4: verdele, negrul și galbenul unite | 4, unite | 6, 0 % | 2 |
  | linii colorate (6 px), lumina dintr-o parte | 7: hârtia ruptă, 47 % | — | 6, 0 % | 6, 0 % |
  | linii colorate, cu umbra tare | 7: hârtia ruptă, 11 % | — | 7: hârtia ruptă, 10 % | **6, 0 %** |

  - **fiecare canal, fundalul neted:** polinomul hârtiei (ADR 0224) potrivit pe fiecare canal, fiecare cu pixelii lui de
    hârtie (un galben e hârtie pe roșu și verde, cerneală pe albastru: intră doar în potrivirile unde seamănă cu hârtia),
    apoi canalul împărțit la fundalul lui; repară lumina dintr-o parte, dominanta și tabla, dar nu o umbră tare (e netedă);
  - **fiecare canal, fundalul local** (închiderea, ca la „Cu umbre”): repară și umbra tare pe liniile colorate, dar golește o
    formă plină mai lată decât fereastra (1/12 din latura mică): culoarea ei devine „fundal” și se unește cu hârtia;
  - **luminozitatea singură** (toate canalele cu același factor): repară lumina dintr-o parte, nu și tabla;
  - **paleta:** cu albul hârtiei adus la 255 (balansul de alb), culorile ies cele adevărate (roșul #ce282e față de #c4262a
    tipărit, pe hârtia de 242), oricare ar fi dominanta pozei; cu fundalul adus la media lui (câmpul plat), ies cu tonul
    pozei (hârtia #acaaa6);
  - **timpul**, pe 12 Mpx, nescris pentru viteză: 1,0–1,1 s cu fundalul neted, 2,4–2,9 s cu cel local (trei închideri).
    Trasarea pe culori însăși ia câteva secunde.

## Decizia (propusă)

1. **Fereastra trasării:** lista **Lumina** apare și pe **Culorile** (pe imaginile opace), cu aceleași trei variante și
   același implicit ca la alb-negru („Uniformă”, ADR 0224, răspunsul 1a); sfatul ei spune pe ce merge fiecare: „Neuniformă”
   pentru lumina dintr-o parte, dominantă și forme pline; „Cu umbre” pentru liniile cu umbra telefonului (o formă plină mai
   lată se golește). Raportul sugerează „Neuniformă” când hârtia variază cu peste 25 %, ca la alb-negru.
2. **Calculul**, cod propriu în `src/trasare/lumina.ts` (regula `trasare-izolat`), primul pas din `traseazaCulori`:
   polaritatea din luminozitate (hârtia deschisă sau tabla, ADR 0224 §2), apoi fiecare canal raportat la fundalul lui (neted
   sau local); albul hârtiei adus la 255 pe hârtia deschisă (întrebarea 1), fundalul tablei adus la media lui. Zona,
   „Ignoră ce atinge marginea”, foaia îndreptată și restul culorilor lucrează pe imaginea corectată.
3. **Umbra tare pe formele pline** rămâne nerezolvată (nici fundalul neted, nici cel local nu o pot: măsurat); o felie a ei,
   dacă o vrei (întrebarea 2): fundalul pe blocuri (hârtia găsită în fiecare bloc, blocurile fără hârtie umplute din vecini).
4. **Mărimea pachetului:** ~+1–2 kB (totalul ramurii, după unirea cu `main`: 663,7 / 700 kB).
5. **Probele, scrise întâi:** pozele color sintetice ale prototipului (generatorul, în `test/unit/ajutor-poze.ts`), cu
   plafoanele măsurate (culorile automate, clasele despărțite și unite, greșelile); galbenul (cerneala deschisă) și tabla;
   lumina egală nu se strică; ușa (lumina trece pe culori; sugestia); e2e (lista pe Culorile, sfatul, sugestia, o poză
   colorată luminată dintr-o parte → numărul culorilor); fișierul real întâi (lecția D7), dacă îl trimiți; otrăvurile la
   capăt.

## Ce am respins

- **Luminozitatea singură** (un factor pentru toate canalele): nu repară tabla și nici dominanta unei lumini colorate.
- **Fundalul local ca implicit pe culori:** golește formele pline, cel mai des caz pe culori (logouri, desene colorate).
- **Corecția culorilor din imagine** (Retinex, rețele): alt scop (fotografia frumoasă), nu culori de trasat.

## Ce impune

- `traseazaCulori` primește lumina (`OptiuniCulori.lumina`), iar raportul ei, lumina folosită și variația hârtiei.
- Fereastra (`src/ui/FereastraTrasare.tsx`) arată Lumina și pe culori; textele, în `src/i18n/import.*.ts`; manualul, în
  ambele limbi.

**Se redeschide dacă:** pe o poză reală, culorile se rup sau se unesc după corecție; corecția trece de 2 s pe 12 Mpx cu
fundalul neted.

## Întrebările (recomandarea întâi)

Opțiunile de mai sus vin toate (regula „toate opțiunile”): „Neuniformă” și „Cu umbre” stau împreună, fiecare pe cazul ei;
întrebările sunt doar despre ce se exclude.

1. **Culorile după corecție, pe hârtia deschisă:**
   - **a)** cele adevărate: albul hârtiei adus la 255 (balansul de alb), deci paleta și numele pieselor arată culorile
     desenului, oricare ar fi dominanta pozei;
   - b) cu tonul pozei: fundalul adus la media lui (câmpul plat); paleta arată culorile cum ies în poză.
2. **Umbra tare pe formele pline:**
   - **a)** o felie a ei, după o poză reală care o cere (fundalul pe blocuri);
   - b) acum, în aceeași felie (~+1 kB, mai mult timp de lucru).
