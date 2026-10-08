# Deciziile de arhitectură (ADR)

Câte un ADR pe fiecare decizie T1–T23 din `PLAN.md` §3.5, scris din tabelul de acolo, la aprobarea planului (07.10.2026).
Tabelul din plan e rezumatul; ADR-ul e înregistrarea deciziei.

**Regulile:**
- Un ADR acceptat nu se mai editează, în afară de stare și de trimiteri.
- O decizie se schimbă doar printr-un ADR nou, care îl înlocuiește pe cel vechi:
  - cel vechi primește starea „înlocuit de NNNN”;
  - rândul din `PLAN.md` §3.5 trimite la cel nou.
- O sesiune care vrea să redeschidă o decizie citește întâi ADR-ul ei. Calea e condiția „Se redeschide dacă”. Fără ea,
  întrebarea merge la owner, în lista grupată.
- Numerotarea continuă de la 0024. O decizie nouă de arhitectură sau de mediu primește tot ADR (de exemplu joncțiunea
  din proba de mediu a etapei 1).

**Forma:** problema, decizia, dovada (cu sursa: [măsurat], [citit] sau [dedus]), ce am respins, ce impune, când se
redeschide. Cel mult o pagină.

| ADR | Rândul | Decizia | Intră în |
|---|---|---|---|
| [0001](0001-conturul-are-trei-primitive.md) | T1 | Conturul are trei primitive: linie, arc de cerc, cubică | etapa 1 (documentul și geometria v0) |
| [0002](0002-elipsa-cerc-sub-matrice.md) | T2 | Elipsa e un cerc sub o matrice neuniformă; aproximarea e declarată | etapa 2 (importul SVG), apoi etapele 6 și 9 |
| [0003](0003-regula-de-umplere-evenodd.md) | T3 | Regula de umplere: `evenodd` peste tot | etapa 1; normalizarea la ușă din etapa 2 |
| [0004](0004-booleanul-pathkit-r3.md) | T4 | Booleanul: PathKit 1.0, înghețat, cu re-ancorarea R3 după fiecare operație | etapa 2 (fațada minimă), etapa 6 (editorul) |
| [0005](0005-offsetul-cavalier.md) | T5 | Offsetul: cavalier_contours, cu gărzi, fără Rust | etapa 1 (geometria v0); gărzile în etapa 2; reparațiile în etapa 9 |
| [0006](0006-biarcele-singura-usa-de-aproximare.md) | T6 | Biarcele proprii sunt singura ușă de aproximare | etapa 2 (importul SVG) |
| [0007](0007-v-carve-axa-mediala.md) | T7 | V-carve: axa medială din Voronoi pe eșantioane, fără Clipper | etapa 8 |
| [0008](0008-un-singur-ir-coordonatele-documentului.md) | T8 | Un singur IR al traseului, în coordonatele documentului | etapa 1 |
| [0009](0009-un-singur-post-contracte.md) | T9 | Un singur post, condus de contracte de dialect ca date | etapa 1 (GRBL); contractele în etapele 3–4 |
| [0010](0010-simularea-pe-cpu.md) | T10 | Simularea: nucleu TypeScript pe CPU, același în Node și în browser | etapa 4 |
| [0011](0011-fara-calcul-pe-gpu.md) | T11 | Fără calcul pe GPU în v1 | etapa 4 |
| [0012](0012-cam-3d-camp-conservativ.md) | T12 | CAM 3D doar pe câmpul conservativ | etapa 18 (relieful), apoi etapa 20 (modelele 3D) |
| [0013](0013-panza.md) | T13 | Pânza: vectorii exacți în worker, traseele pe WebGL2 | etapa 1 (pânza v0); stratul WebGL2 în etapa 2 |
| [0014](0014-fara-izolare-cross-origin.md) | T14 | Fără izolare cross-origin | etapa 1 (primul worker) |
| [0015](0015-workere-fara-stare.md) | T15 | Workerele nu țin date între joburi | etapa 1 (workerul de randare); bazinul în etapa 4 |
| [0016](0016-datele-valibot-jurnal.md) | T16 | Datele: valibot, JSON canonic, migrări pure, undo ca jurnal | etapa 1 (documentul v0) |
| [0017](0017-pwa.md) | T17 | PWA: Vite + vite-plugin-pwa, CSP fără `unsafe-eval` | etapa 1 (scheletul) |
| [0018](0018-importul-si-exportul.md) | T18 | Importul și exportul: câte o ușă pe format, toate spre același model | etapa 2 (SVG); etapa 9 (DXF, PDF); etapele 25–26 |
| [0019](0019-textul.md) | T19 | Textul: înălțimea textului e înălțimea majusculei | etapa 7 |
| [0020](0020-senderul.md) | T20 | Senderul: sesiune Web Serial, flux pe octeți, proceduri ca mașini de stare | etapa 3; complet în etapa 13 |
| [0021](0021-stackul.md) | T21 | Stack-ul | etapa 1 (scheletul) |
| [0022](0022-n-axe-din-prima-zi.md) | T22 | N axe din prima zi | etapa 1 |
| [0023](0023-cam-lasa-material.md) | T23 | CAM-ul lasă material implicit și are ieșirea mărginită | etapa 1 |
| [0024](0024-planse-varianta-d.md) | — | Planșele: varianta D (piese cu arbore, instanțe pe foi), cu contractul documentului v2 | etapa 1 (felia 1.7) |
| [0025](0025-operatiile-piesei.md) | — | Operațiile piesei: profilul stă în piesă (documentul v3), nu în dialogul de export | etapa 2 (felia 2.2) |
