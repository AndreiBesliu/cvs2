# ADR 0128: Stocarea extensiilor și catalogul permisiunilor; senderul, după fereastra Mașina

**Starea:** acceptat pe 03.11.2026 pentru felia 3.Xb, a treia a liniei Trenuleț (worktree-ul `wip/trenulet`). Continuă
ADR 0127 (§E: „un serviciu nou intră ca metodă a lui `cere`, cu permisiunea lui în catalog”). Owner-ul:
- pe 02.11, „Da, ca recomandat”, la senderul extensiilor prin `HostApi`. Extensia citește starea, încarcă programe, pornește
  și reia doar după confirmarea omului într-o fereastră a lui cvs2, iar pauza și oprirea merg direct;
- pe 03.11, „Da, pornește 3.Xb”, apoi „Întâi 13.A în main”: ramura 13.A↑ (ADR 0132, fereastra Mașina pe tot ecranul și
  filele ferestrelor, cu extensia ca filă) intră întâi în `main`.

## Contextul

Senderul în `HostApi` atinge panoul mașinii (`PanouMasina.tsx`, unde stă sesiunea paginii) și carcasa (`App.tsx`), pe care
ADR 0132 le rescrie. ADR 0132 își așteaptă extensia ca fereastră: „o extensie (gazda din Trenuleț) își adaugă fereastra prin
aranjament”. Senderul vine deci după unirea lui 13.A↑, ca felia 3.Xc. Acum vine partea care nu atinge nimic din ce rescrie
13.A↑: catalogul permisiunilor, arătat la instalare, și primul serviciu, stocarea.

## Decizia

### A. Catalogul permisiunilor

`CATALOG_PERMISIUNI` (`src/extensii/pachet.ts`) are acum `stocare`. Senderul (`masina`) intră în 3.Xc. Un pachet care cere o
permisiune din afara catalogului se refuză, ca până acum. Fereastra instalării spune ce cere extensia, pe fiecare rând cu
sensul lui pentru om. Un serviciu cerut fără permisiune se refuză, cu codul `<serviciu>:permisiune`.

### B. Stocarea (`host.stocare`)

- **Ce:** `citeste(cheie)`, `scrie(cheie, valoare)`, `sterge(cheie)`, `chei()`, toate promisiuni. Sunt învelișuri peste
  `host.cere('stocare.<metoda>', …)`, puse de încărcător.
- **Unde:** IndexedDB `cncvs2-extensii`, versiunea 2, magazinul `date`, cu cheia `[id, cheie]`. Datele sunt ale extensiei
  (id-ul ei) și ale browserului, ca extensia însăși (ADR 0127 §B). Extensia nu le vede direct: le cere prin port, iar cvs2
  scrie.
- **Ce valori:** JSON: `null`, booleene, numere finite, șiruri, liste, obiecte simple, cel mult 64 de niveluri; sau octeți
  (`ArrayBuffer`, `Uint8Array`). Mărimea unei valori e numărul de octeți UTF-8 ai JSON-ului ei, sau `byteLength`.
- **Limitele:** cheia are 1–200 de caractere; o valoare are cel mult 4 MB; o extensie ține cel mult 16 MB și 1 000 de chei.
  Peste ele, `stocare:plin`; o cheie sau o valoare greșită: `stocare:cheie`, `stocare:valoare`; fără IndexedDB:
  `stocare:indisponibila`.
- **Instalarea din nou** (o versiune nouă, același id) păstrează datele. **Scoaterea** extensiei le șterge, în aceeași
  tranzacție. Gestionarea arată cât ocupă datele fiecărei extensii.

### C. Senderul (felia 3.Xc, după 13.A↑)

Rămâne cum a hotărât owner-ul pe 02.11 (în `CLAUDE.md`), legat de fereastra Mașina din ADR 0132:
- extensia devine o fereastră a aranjamentului, lângă Proiectare și Mașina;
- „Lucrarea primită” (ADR 0126) trece în fereastra Mașina;
- serviciul `masina` dă extensiei:
  - starea sesiunii (prin `src/machine/indicator.ts`);
  - încărcarea, cu verificările lui „Fișier…”;
  - pornirea și reluarea, după confirmarea omului într-o fereastră a lui cvs2;
  - pauza și oprirea, direct.

## Ce am respins

- **Senderul acum, pe ramura de dinaintea lui 13.A↑:** s-ar fi refăcut la unire, și senderul, și locul extensiei.
- **`localStorage` sau IndexedDB în cadru:** cadrul n-are origine (ADR 0127 §D), deci nicio stocare proprie. Prin `HostApi`,
  cvs2 ține plafonul și șterge datele odată cu extensia.
- **Orice valoare clonabilă (`Date`, `Map`, `Blob`):** mărimea nu se poate măsura sigur, iar JSON-ul și octeții ajung pentru
  ce ține Planificatorul (circuitele, profilurile, STL-urile).

## Limite

- Datele sunt ale browserului: altă mașină sau altă fereastră privată nu le vede.
- Plafonul se verifică la fiecare scriere, din ce stă deja în baza extensiei (o tranzacție). Două file care scriu în același
  timp pot trece împreună peste el cu cel mult o valoare.

## Probele

- `test/unit/extensii.stocare.test.ts`: valorile (JSON, octeții, ce se refuză), mărimea, cheile, plafoanele, serviciile cu și
  fără permisiune, pe un depozit în memorie.
- `test/e2e/extensii.spec.ts`:
  - fereastra instalării spune ce cere extensia;
  - extensia de probă își numără deschiderile peste închideri și reîncărcări;
  - fără permisiune, stocarea se refuză;
  - peste plafon, `stocare:plin`;
  - scoaterea șterge datele (instalată din nou, numără de la 1).
- Otrăvurile țintite (`test/otravuri/3.Xb.py`).
