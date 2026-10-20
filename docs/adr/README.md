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
| [0026](0026-regiunea-pastrata.md) | — | Regiunea păstrată (inelele, rolurile, includerea) și invarianta 2 | etapa 2 (felia 2.3a) |
| [0027](0027-sensul-de-taiere.md) | — | Sensul de tăiere pe operație (documentul v4), implicit urcare; invarianta 9 | etapa 2 (felia 2.3b) |
| [0028](0028-urechile.md) | — | Urechile: profilul Z(s) pe IR, puntea de la fața de jos (documentul v5); invarianta 10 | etapa 2 (felia 2.4) |
| [0029](0029-rampa.md) | — | Rampa: bucla tăiată continuu, intrarea rotită și scoasă din zonele urechilor (documentul v6); invarianta 11 | etapa 2 (felia 2.5a) |
| [0030](0030-intrarile.md) | — | Intrările și ieșirile: sferturi de cerc pe partea deșeului, alese și verificate pe regiunea păstrată (documentul v7); invarianta 12 | etapa 2 (felia 2.5b) |
| [0031](0031-intrarile-cu-rampa.md) | — | Intrările cu rampă: rampa pe sfertul intrării, la fiecare trecere (documentul rămâne v7); invariantele 9, 11, 12 amendate | etapa 2 (felia 2.5c) |
| [0032](0032-degajarile.md) | — | Degajările colțurilor: dog-bone și T-bone, drumul minim din colțul traseului (documentul v8); invarianta 2 amendată, 13 nouă | etapa 2 (felia 2.6) |
| [0033](0033-biarcele.md) | T6 | Biarcele: cubica devine linii și arce sub 0,001 mm, abaterea în ambele sensuri, bugetul de toleranță într-un singur loc | etapa 2 (felia 2.7a) |
| [0034](0034-forma-cale.md) | T1 | Forma „cale”: un contur închis din linii, arce și cubice (documentul v9); pânza și clicul exacte, CAM-ul prin biarce, o dată pe element | etapa 2 (felia 2.7b) |
| [0035](0035-usa-svg.md) | T18 | Ușa SVG: din fișier la căi în mm, inertă; unitățile, pagina, transformările, cele șapte forme; arcele rămân arce, elipsele devin cubice sub 1e-6 mm; latura din imbricare; plafoanele de octeți, entități, vârfuri și includeri | etapa 2 (felia 2.7c) |
| [0036](0036-normalizarea-nonzero.md) | T3 | Regula `nonzero` la ușă: aranjamentul exact în double, fără PathKit (mecanismul lui ADR 0003 înlocuit), toleranța relativă la întindere, grupurile, refuzurile explicite | etapa 2 (felia 2.7d) |
| [0037](0037-contururile-deschise.md) | B1 | Contururile deschise: calea deschisă (documentul v10), pe linie și pe o parte (partea frezei), offsetul deschis verificat, despărțirea foii marcată de utilizator, ușa SVG închide formele umplute | etapa 2 (felia 2.3c) |
| [0038](0038-traseul-pe-panza-si-proprietatile.md) | T13 | Traseul pe pânză: ultimul program calculat, pe WebGL2 (LINE_STRIP, relativ la bucată), la cerere; panoul de proprietăți editabil (poziția, rotirea, foaia) cu câmpul numeric unic | etapa 2 (felia 2.8) |
| [0039](0039-jurnalul-de-erori-pe-server.md) | — | Jurnalul de erori pe server: funcțiile `cncvs2` (TypeScript, Node 24, codebase separat), `errorLogs` grupat pe amprentă, `logServerError` care nu aruncă, `logClientError` cu App Check și plafon de rată, regulile noi | etapa 3 (felia 3.1) |
| [0040](0040-personalul-si-fila-erori.md) | — | Personalul (`staff/{uid}`), pagina `/admin` la cerere cu login Google, fila Erori (cu „Rezolvat” prin callable și audit), Diagnoza minimă, retenția TTL de 90 de zile; primul owner din consolă, amprenta în 3.4 | etapa 3 (felia 3.3) |
| [0041](0041-backup-si-marcajele.md) | — | Backup-ul zilnic al Firestore (exportul la 03:00, verificarea la 05:00) și marcajele de rulare ale joburilor, judecate în Diagnoză; eșecul ajunge în fila Erori | etapa 3 (felia 3.4a) |
| [0042](0042-loc-in-pachetul-de-pornire.md) | — | Loc în pachetul de pornire: o singură bucată la pornire, ferestrele cu calculul lor (înregistrat la evaluare), schemele documentului separat, dicționarul limbii active la cerere, alegerea cu clicul la cerere, orientarea conturului separat; poarta numără dicționarul și plafonează ușa (8 kB; pornirea cu ușa ≤ 100) | etapa 3 (fără mașină) |
| [0043](0043-raportorul-de-erori-din-client.md) | — | Raportorul de erori din client: doar intrările sesiunii, partea din pornire mică (Firebase la cerere, conexiunea împărțită în bază + admin), plafoanele pe sesiune (20 / 3), stingerea la 401 / plafon / import eșuat, o reîncercare la rețea; cheia App Check citită la publicare; CSP-ul reCAPTCHA; plasele din poartă | etapa 3 (felia 3.2) |
| [0044](0044-publicarea-pe-live.md) | — | Publicarea pe live: amprenta meta/deployment pe ținte, un singur script de publicare (live doar din workflow, în mediul GitHub live), workflow-ul publica cu sha fixat (pe main, rapid verde, pe live același sha ca pe test), WIF fără chei, contul dedicat al backup-ului, Diagnoza citește amprenta | etapa 3 (felia 3.4b) |
| [0045](0045-pwa-offline.md) | T17 | PWA offline: workerul propriu la `/sw.js` (vite-plugin-pwa 2.0.0, `injectManifest`), precache-ul după `shared/precache.ts` (cu raportorul; fără `/admin`, `config.json`), navigările pe listă albă (doar `/` și `/index.html` din precache; `/admin`, `/__/*`, rutele necunoscute în rețea), `config.json` din rețea întâi cu ultima copie bună (prima, de la instalare), actualizarea oferită în bara de jos (fără reîncărcare singură; `actualizarePermisa()` pentru sender), preluarea aplicației vechi (`cncvs-`), înregistrarea la cerere; e2e-ul obișnuit cu workerul blocat | etapa 4, punctul 7 (adusă în etapa 3, fără mașină) |
| [0046](0046-estimarea-timpului.md) | — | Estimarea timpului jobului: planificatorul GRBL 1.1h (pașii, limitele pe axe, joncțiunile din $11, fereastra de 15 blocuri, arcele din `mc_arc` cu $12, pauza în pași de 50 ms, sincronizările) pe G-code-ul exportat, nu pe IR; profilul mașinii ca date în `ir` (implicitele 1.1h, peste ele `$$`); secțiunile postului (eticheta cu `operatie`); rezumatul în dialogul exportului (pe operație, pe sculă, câmpul `$$`), în bucata calculului exportului | etapa 4, punctul 5 (adusă în etapa 3, fără mașină) |
| [0047](0047-nucleul-de-simulare.md) | T10, T15 | Nucleul de simulare pe CPU: câmpul rar pe dale de 16 × 16 într-un atlas (dalele uniforme ca un număr, măsurat față de 32), calculul exact pe celulă portat din s4 (linia 3D cu freza plată, bila și V-ul; arcul la Z constant; elicea plată), trigonometria proprie doar cu + − × ÷ √, intrarea = programul IR (rapidele simulate; A, elicea cu bilă / V refuzate), rândurile de dale r mod N pe bazinul de workere fără stare (`src/jobs`), amprenta pe rânduri; poarta Node = Edge în e2e prin workerul construit; harta adâncimilor, volumul și adâncimea în dialogul exportului | etapa 4, punctul 2, felia 1 (adusă în etapa 3, fără mașină) |
| [0048](0048-documentatia-admin.md) | — | Documentația admin: roadmap-ul (etapele, feliile, plăcile, ce așteaptă de la owner, cu starea dedusă din fișe) și documentele (ADR-urile, fișele, planul, starea), generate la fiecare build din repo în `dist/documentatie/`, cerute la deschiderea filei (doar online, în afara precache-ului); poarta pică pe un tabel care nu se mai poate citi; cititorul de markdown comun (`src/docs/`, fără HTML brut), refolosit de documentația live | etapa 3 (fără mașină) |
| [0049](0049-personalul-roluri-invitatii.md) | — | Personalul: rolurile ca bife din catalogul de permisiuni din cod (`owner` fix, singurul care administrează, niciodată fără owner), citite de reguli la fiecare cerere din `staff/{uid}` și `roluri/{id}`; invitațiile pe e-mail (acceptate doar pe e-mail verificat), conturile create de owner cu link de setare a parolei; un singur cont pe e-mail, cu metodele legate din fila Cont; scrierile doar prin callable-uri, cu auditul | etapa 14 (fila Admini; adusă în etapa 3, fără mașină) |
| [0050](0050-rigle-ghidaje-lipire.md) | — | Riglele în mm pe marginile zonei libere; ghidajele pe foaie (`foaie.ghidaje`, fără schemă nouă: nu schimbă tăierea, iar o versiune veche le păstrează), trase din riglă, șterse pe riglă, cu comanda lor în jurnal; lipirea pe fiecare axă de ghidaje, foaie, cutiile celorlalte elemente, capetele căilor deschise și grilă (6 px); alinierea și distribuirea pe cutiile instanțelor; săgețile; totul încărcat la cerere după prima randare | etapa 6 (adusă în etapa 3, fără mașină) |
| [0051](0051-unelte-de-desen.md) | — | Uneltele de desen prin tragere (dreptunghi, cerc, elipsă, linie, poligon) în bara editării, cu tastele lor; capetele gestului lipite ca puncte, Shift pentru pătrat / cerc / 15°; geometria exactă (elipsa ca la importul SVG), operația implicită a formelor închise și a liniilor deschise; documentul de după trece de ușă | etapa 6 (adusă în etapa 3, fără mașină) |
| [0052](0052-transformari-bara-unelte.md) | — | Mânerele de scalare (colțuri proporțional, Shift liber; laturi pe o axă; ancora opusă) și de rotire (Shift 15°) pe cutia selecției, cu acțiunea `document.transforma`: rotirea schimbă instanța, scalarea geometria piesei, exact, refuzată cu motiv unde n-ar mai fi exactă; Alt inversează lipirea; uneltele, Lipire, Grilă și alinierea (sub-bară) în bara de sus, „Adaugă dreptunghi / cerc” doar în paletă; raza cercului pus cu un clic | etapa 6 (adusă în etapa 3, fără mașină) |
| [0053](0053-transformare-extensie-editare-forme.md) | — | Unealta Transformare (S): mânerele doar cu ea; extensia barei de sus (al doilea rând, mereu acolo, locul rezervat de la pornire) cu secțiunea Aliniere strânsă spre stânga la cerere; editarea după plasare în panou (dreptunghiul, cercul, poligonul regulat, elipsa) prin `document.forma`, recunoscute din geometrie, fără câmp nou în document; elipsa generatorului tăiată pe sferturi (cutia exactă) | etapa 6 (adusă în etapa 3, fără mașină) |
| [0054](0054-oglindirea.md) | — | Oglindirea selecției (orizontal / vertical, Shift+H / Shift+V) din extensia barei, față de centrul cutiei; exactă: reflexia în matricea rădăcinii piesei (arcele rămân arce), locul instanței în oglindă, rotirea neschimbată; ce se taie e oglinda (partea frezei pe căile deschise se inversează deja, sensul se păstrează); prin `document.transforma` | etapa 6 (adusă în etapa 3, fără mașină) |
