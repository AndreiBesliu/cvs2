# Sonda s9-admin: adminul în v1

**Data:** 07.10.2026. **Faza 2, tranșa 1.** Cerința: `BRIEF.md` §16.1 (adminul intră în v1, „ca și acum”, iar
momentul îl alege asistentul).

**Ce am citit:** `BRIEF.md`, `LECTII.md` (§0, §2.3, §3, §4.11), `docs/faza0/10-cloud-comercial.md` și
`11-porti-teste-infra.md`. Din codul vechi, doar citire: `AdminView.tsx` (1 876 de linii), `AdminCamStats.tsx`,
`AdminCreditsPanel.tsx`, `adminStore.ts`, `adminCounts.ts`, `adminCsv.ts`, `errorReporting.ts`,
`functions/index.js` (callable-urile de admin, declanșatoarele, joburile), regulile pentru colecțiile de admin,
`docs/ADMIN_PLAN.md` și `CLAUDE.md`. Am mai citit tiparele din celelalte proiecte ale owner-ului (jurnalul de erori
din Presto, marcajele de joburi din DataRead și OurDays).

**Ce am rulat:** o sondă pe emulatoarele Firebase (Auth + Functions), pe un proiect `demo-*`, care nu atinge
cloud-ul. Codul ei e în `cod/`.

**Marcaje:** **[măsurat]** = am rulat eu; **[citit]** = din cod sau din documentație, cu sursa; **[dedus]** =
inferență, nerulată.

**Notă pentru repo-ul public:** raportul descrie funcții și lecții. Nu descrie slăbiciuni ale aplicației vechi
care rulează pe live.

---

## 1. Întrebarea

Sonda trebuia să decidă patru lucruri:
1. **Inventarul:** ce face fiecare filă a adminului vechi, din ce date, ce a mers, ce lipsea și ce intră în v1.
2. **Momentul:** în ce punct al drumului intră fiecare bucată, ca adminul să nu fie construit înaintea nevoii
   (`LECTII.md` §2.3, cauza 7), dar nici să lipsească observabilitatea din ziua 1 (`LECTII.md` §4.11).
3. **Testul:** cum devine adminul exersabil pe instanța de test din prima zi. În vechi, callable-urile de admin
   întorceau 401 pe test și local, deci adminul se putea exersa doar pe live.
4. **Ce e nou:** panoul de diagnoză, jurnalul de erori de server și panoul de publicare test → live (decis pe
   15.08 în ediția întâi, nefăcut).

Termeni folosiți:
- **callable** = o funcție de server pe care aplicația o cheamă direct, cu contul utilizatorului atașat;
- **App Check** = verificarea Firebase care confirmă că cererea vine din aplicația noastră, nu dintr-un script.
  Cu `enforceAppCheck: true`, o cerere fără dovadă e refuzată cu 401;
- **claim** = o etichetă pusă de server pe tokenul de login (de exemplu „e admin”).

## 2. Pe scurt

1. **Vechiul admin avea 12 file (nu 13) și 13 callable-uri de admin; funcțional era bun, dar se putea exersa doar
   pe live** [măsurat în cod].
2. **Cauza lui 401 e App Check, nu contul:** pe emulator, fără antetul App Check, cererile spre funcțiile protejate
   sunt refuzate în 14 din 14 cazuri, inclusiv pentru un owner real, iar cu antetul prezent decide doar rolul
   (63 din 63 de celule conforme cu oracolul, 315 apeluri, 0 rezultate instabile) [măsurat].
3. **Recomand același cod de producție peste tot (`enforceAppCheck: true`):** pe testul din cloud, o cheie reCAPTCHA
   pentru domeniul de test și un token de debug înregistrat doar pe test, pus în pagină la rulare; local, un
   furnizor App Check de probă ținut în carantină.
4. **Emulatorul verifică doar dacă tokenurile există, nu dacă sunt autentice:** răspunde altfel decât producția în
   30 din 63 de celule și acceptă un owner falsificat de mână, deci securitatea se probează doar pe testul din
   cloud [măsurat].
5. **Adminul intră în cinci tranșe legate de drum, în total 12–17 felii** [dedus]: P0 erorile și Diagnoza la
   primul deploy pe test, P1 publicarea cu aprobare în GitHub la prima publicare pe live, P2 utilizatorii, rolurile
   și auditul cu conturile (apoi tichetele, configurarea și panoul de publicare), P3 veniturile cu facturarea, P4
   analiza și CAM-ul înainte de lansare; fila AI vine cu AI-ul.
6. **Două reguli noi:** rolul de admin are o singură sursă, documentul `staff/{uid}`, citit la fiecare cerere, iar
   orice scriere de admin, inclusiv configurarea, trece printr-un callable care scrie auditul în aceeași
   tranzacție [dedus, sprijinit pe citit].

## 3. Candidații

Sunt două alegeri principale (cum devine adminul exersabil și de unde vine rolul) și una deja decisă de owner (cum
se publică).

| Varianta | Licența | Ce face | Ce am măsurat sau citit | Verdict |
|---|---|---|---|---|
| **A.** Pe test, reguli slăbite sau fără App Check | — | Agentul intră peste tot fiindcă testul nu mai apără nimic | Testul încetează să repete live-ul, iar regulile devin singurul cod neexersat înainte de producție (`LECTII.md` §3.1) [citit] | **respins** |
| **B.** `enforceAppCheck` comandat de un parametru per proiect | — | Pe test se stinge App Check dintr-o setare | Un parametru greșit pe live oprește protecția fără niciun semn [dedus] | **respins**; rezervă doar dacă C eșuează |
| **C.** Testul din cloud: cheie reCAPTCHA Enterprise pentru domeniul de test + token de debug App Check înregistrat doar pe test | Apache-2.0 (`@firebase/app-check` 0.13.1) | Omul pe test trece prin reCAPTCHA, ca pe live. Agentul și CI-ul pun tokenul de debug în pagină la rulare | SDK-ul, în modul debug, schimbă tokenul de debug în locul furnizorului (`dist/esm/index.esm.js:756-785`) [citit]. Documentația cere ca tokenul să rămână privat și să stea ca secret în CI ([debug provider](https://firebase.google.com/docs/app-check/web/debug-provider)) [citit]. Nerulat: cere acces la cloud | **recomandat** |
| **D.** Local: furnizor App Check de probă (`CustomProvider`) în carantina de dezvoltare | MIT (`firebase-tools` 15.32.1, doar unealtă de test) | Emulatorul primește un antet App Check și lasă logica de rol să decidă | Fără antet: 401 pentru toți (14/14). Cu orice antet: decide rolul (63/63 conform oracolului). Emulatorul nu verifică semnătura (30/63 diferit de producție) [măsurat] | **recomandat pentru local**, doar pentru logică |
| **E.** Rolul din claim-uri (ca în vechi) | — | Rolul stă pe tokenul de login | Tokenul trăiește o oră ([sesiuni](https://firebase.google.com/docs/auth/admin/manage-sessions)). Claim-urile noi ajung abia la reîmprospătare ([claims](https://firebase.google.com/docs/auth/admin/custom-claims)). Callable-ul verifică tokenul fără `checkRevoked` (`firebase-functions` `https.js:325`) [citit]. Deci o retrogradare poate întârzia până la o oră, iar rolul ar avea două surse | **respins pentru v2** |
| **F.** Rolul din documentul `staff/{uid}`, citit de reguli și de callable-uri la fiecare cerere | — | O singură sursă; revocarea are efect la cererea următoare | Nemăsurat. Costul e o citire în plus pe fiecare cerere de admin, iar traficul de admin e mic [dedus] | **recomandat**; se probează pe emulatorul Firestore în primele felii |
| **G.** Publicarea: declanșator direct (callable → `workflow_dispatch` în GitHub), decis de owner pe 15.08 | — | Butonul din admin pornește workflow-ul de deploy | GitHub permite medii cu aprobare obligatorie pe planul Free, la repo public, cu restricție pe ramuri ([environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)) [citit] | **păstrat**: mecanismul în P1, panoul în P2 |

**Licențele bibliotecilor folosite sau citite:**
- `firebase-tools` 15.32.1: MIT. E unealtă de test și nu se livrează.
- `firebase-functions` 7.4.0: MIT.
- `firebase-admin` 14.5.0: Apache-2.0.
- `firebase` 12.19.0 și `@firebase/app-check` 0.13.1: Apache-2.0.

Toate sunt acceptabile [citit: `npm view … license`].

## 4. Măsurători

### 4.1 Inventarul adminului vechi (citit în cod)

**Cifrele de ansamblu** [măsurat în cod]:
- **12 file**: `AdminView.tsx:232` (tipul filei) și `:793-813` (butoanele). Cifra 13 din `BRIEF.md` §16.1 și din
  `docs/faza0/10` e o numărătoare greșită: lista lor are tot 12 nume.
- **Un singur fișier** de 1 876 de linii, plus trei panouri și trei servicii mici.
- **13 callable-uri de admin:** `adminListUsers`, `adminUserCounts`, `adminSetPlan`, `adminSetTrial`,
  `adminGrantCredits`, `adminSetDisabled`, `adminRevenue`, `adminExportUser`, `adminDeleteUser`,
  `adminReplyTicket`, `adminSetRole`, `requestAdmin`, `adminClearTrialLedger`.
- **20 de căi din baza de date** citite sau scrise direct din client (numărate cu `grep`).
- **Patru declanșatoare legate de admin:** tichet nou, crash nou, livrarea e-mailului și cont nou.
- **Joburile programate:** 6, iar 5 dintre ele folosesc forma „every N hours”. Forma asta se reancorează la fiecare
  deploy (lecție măsurată în OurDays).

**Rolurile** [citit `functions/index.js:2213-2275`, `adminStore.ts`]:
- **support:** vede și răspunde la tichete, iar lista de utilizatori o vede fără e-mailuri;
- **admin:** în plus venituri, planuri și probe, dezactivare, GDPR, configurare, audit;
- **owner:** în plus gestionează adminii.

Un admin nu poate acționa pe un alt admin de rang egal sau mai mare. Fiecare acțiune prin callable lasă un rând în
`adminLog`.

Fiecare filă de mai jos are același format: ce face, datele, ce a mers, ce lipsea, ce intră în v1 și de ce depinde.

**Puls** (pagina de pornire)
- **Ce face:** 8 plăci, fiecare duce la fila ei:
  - conturi, plus cele noi în 7 zile;
  - probe active, plus plătitori;
  - MRR (venitul lunar recurent);
  - activi azi;
  - exporturi;
  - apeluri AI pe lună;
  - tichete noi (roșu peste 0);
  - crash-uri (roșu peste 0).

  Dedesubt sunt cozile de eșecuri (ștergeri Stripe abandonate, credite plătite neacordate, e-mailuri eșuate) și
  vârsta cifrei de e-mail, cu verdict față de cadența obișnuită.
- **Date:** `adminUserCounts` (toată populația: Auth plus numărători în Firestore), `adminRevenue`, `events`,
  `statsGlobal`, `aiUsage`, `supportTickets`, `errorReports`, `mailHealth` și cele două cozi.
- **A mers:**
  - cifrele de populație nu mai veneau din pagina de 50 de rânduri;
  - o măsurătoare care lipsește apare „necunoscut, cu motivul”, niciodată 0 (tipul `Measured`,
    `AdminView.tsx:97-127`). Tiparul merită păstrat.
- **Lipsea:** „activi azi” și crash-urile depindeau de consimțământul pentru cookie-uri.
- **În v1:** da. Plăcile apar odată cu sursele lor (P0 erori, P2 conturi, P3 MRR, P4 activi).
- **Depinde de:** fila fiecărei plăci.

**Utilizatori**
- **Ce face:**
  - un tabel paginat (50 pe pagină), cu căutare;
  - eticheta planului: dezactivat, plan dat gratuit de admin, plătit, probă cu zilele rămase, expirat sau gratuit;
  - data creării, ultima logare, apelurile AI și insigna de admin;
  - „Gestionează” are: rolul (doar owner), un plan gratuit sau revenirea la planul real, zilele de probă (14 / 30 /
    0), dezactivarea (închide și sesiunile), exportul GDPR în JSON, ștergerea GDPR (confirmată prin cuvântul
    „delete”) și ștergerea adresei din registrul probei;
  - dosarul are AI-ul, tichetele, statisticile CAM și ultimele 30 de evenimente;
  - CSV-ul își scrie în primul rând cât din populație conține.
- **Date:** `adminListUsers` (Auth + `users/{uid}` + `aiUsage`), `adminUserCounts`, callable-urile de acțiune,
  `events`, `users/{uid}/stats`.
- **A mers:**
  - acțiunile treceau prin callable, cu nivelul verificat pe server;
  - suportul vedea lista fără date de contact (`index.js:2063-2065`);
  - ștergerea GDPR are ordinea corectă: registrul probei, Stripe, Firestore, apoi contul (`index.js:2713-2742`).
- **Lipsea:**
  - căutarea filtra doar paginile deja încărcate, deci un e-mail de pe pagina a șaptea nu se găsea
    (`AdminView.tsx:689-692`);
  - exportul GDPR era o listă de colecții scrisă de mână, separată de ștergere, care parcurge arborele singură.
    Codul însuși notează că o colecție nouă e uitată până o adaugă cineva (`index.js:2661-2669`).
- **În v1:** da:
  - căutare pe server după e-mail;
  - dosarul;
  - acțiunile;
  - un export GDPR derivat din aceeași listă de colecții per utilizator ca ștergerea, cu un test care compară lista
    cu ce se scrie.
- **Depinde de:** contul (Auth), modelul `users/{uid}`, dreptul de acces calculat pe server (capabilitățile),
  registrul probei (portat), audit.

**Venituri** (admin+)
- **Ce face:**
  - MRR și ARPU (venitul mediu pe abonat);
  - abonamente active, în probă sau cu plata eșuată, pe niveluri;
  - lista celor care au anulat;
  - lista plăților eșuate (dunning, adică recuperarea plăților eșuate);
  - ultimele 20 de plăți și vânzările de credite;
  - link-uri spre panoul Stripe.
- **Date:** `adminRevenue`, peste colecțiile oglindite de extensia Stripe.
- **A mers:**
  - un singur calcul pe server;
  - rambursările și disputele rămân în Stripe, nu se reconstruiesc.
- **Lipsea:**
  - MRR-ul folosea încă o copie a prețurilor, scrisă în funcții (`index.js:2559-2568`);
  - ecranul nu spunea dacă cifrele vin din modul de test sau din live.
- **În v1:** da, în P3:
  - MRR din catalogul unic;
  - eticheta „MOD DE TEST” cât timp cheia e de test, adică până la CAEN, inclusiv pe live.
- **Depinde de:** catalogul unic, lista albă de prețuri pe server, webhook, dreptul de acces pe server.

**Analiză**
- **Ce face:**
  - activi pe zi, ca bare sau pe axa timpului;
  - pâlnia din înregistrări reale (vizitatori, conturi, probe, plătitori);
  - pâlnia din evenimente;
  - adopția funcțiilor;
  - top evenimente;
  - CSV.
- **Date:** ultimele 1 000 de documente din `events` (fluxul propriu, cu consimțământ) și `adminUserCounts`.
- **A mers:** pâlnia din înregistrări nu depinde de consimțământ. Un procent calculat pe o cifră care e doar
  minimă se marchează „~” (`adminCounts.ts`).
- **Lipsea:** fereastra era „ultimele 1 000 de evenimente”, nu o perioadă aleasă.
- **În v1:** da, în P4. Fără utilizatori externi, cifrele ar arăta doar folosirea owner-ului. Evenimentul de
  adopție se derivă din registrul de acțiuni (`LECTII.md` §4.7): id-ul acțiunii e numele evenimentului, deci lista
  nu se mai întreține de mână.
- **Depinde de:** consimțământ, registrul de acțiuni, conturi.

**CAM**
- **Ce face:** statisticile de export per utilizator și ale comunității (freze, materiale, avansuri, adâncimi,
  posturi), comparate câte două. Arăta și ce vede AI-ul.
- **Date:** `users/{uid}/stats/exports`, scris de client la fiecare export, și un agregat zilnic.
- **A mers:** adminul vedea exact contextul pe care îl primea modelul.
- **Lipsea:** era o a doua telemetrie de export, separată de `events`, deci două surse pentru același fapt.
- **În v1:** simplificat, în P4, din același flux de evenimente. Partea „ce vede AI-ul” vine cu AI-ul.
- **Depinde de:** fluxul de evenimente și datele de export din IR-ul traseului.

**Tichete**
- **Ce face:**
  - inbox cu stări: nou, deschis, rezolvat;
  - vârsta tichetului, cu roșu după 48 h fără răspuns;
  - datele aplicației: plan, platformă, versiune, limbă;
  - atașamente: poze, captura plăcii și fișierul de design descărcabil;
  - răspuns pe e-mail, cu 4 șabloane.
- **Date:** `supportTickets` (create din aplicație), `adminReplyTicket` → extensia Trigger Email, iar
  declanșatorul `onSupportTicket` anunță owner-ul.
- **A mers:**
  - adresa de răspuns se ia din contul din Auth, nu din textul tichetului (`index.js:2813-2823`);
  - atașamentele se afișează doar ca imagini raster incluse în document.
- **Lipsea:**
  - atașamentele stăteau în documentul tichetului, sub limita de 1 MiB;
  - anunțul pe e-mail depindea de un declanșator care a tăcut 2 zile fără ca cineva să afle (`docs/faza0/10`,
    defectul 4).
- **În v1:** da, imediat după conturi (P2):
  - atașamentele în Storage;
  - declanșatorul cu marcaj de rulare.

  **Propunere:** owner-ul îl folosește primul, pe instanța de test, pentru raportările lui. Butonul „Raportează”
  atașează documentul, captura și build-ul, în loc de liste ținute în chat.
- **Depinde de:** cont, Storage, e-mail (Trigger Email și DNS-ul domeniului, pas deja la owner în `BRIEF.md`
  §7), marcaje.

**Crash-uri**
- **Ce face:**
  - erorile din client, grupate pe o semnătură normalizată (fără URL-uri, id-uri sau numere);
  - pentru fiecare grup: numărul, build-urile, prima și ultima apariție;
  - butonul „rezolvat”, cu redeschidere automată dacă eroarea reapare;
  - alertă pe e-mail, opțională.
- **Date:** `errorReports` (scris de client) și `crashGroups` (starea).
- **A mers:** gruparea și redeschiderea automată (`AdminView.tsx:49-61`, `:1609-1663`).
- **Lipsea:**
  - raportul pleca doar cu consimțământul pentru cookie-uri (`errorReporting.ts:4-11`);
  - raportul nu purta contul, deci „câți oameni a lovit” rămânea gol;
  - erorile de server stăteau doar în Cloud Logging.
- **În v1:** da, din P0, ca filă „Erori”:
  - client, server, declanșatoare și joburi, într-un singur jurnal scris doar de server;
  - fără poarta de consimțământ, de confirmat juridic (§5.4);
  - cu uid-ul pseudonim, build-ul și instanța.
- **Depinde de:** nimic. E prima bucată din admin.

**Config** (admin+)
- **Ce face:**
  - un anunț în aplicație;
  - oprirea site-ului, cu confirmare în doi pași și repornire într-un pas;
  - modul de mentenanță, cu mesaj;
  - AI-ul pornit sau oprit, plafonul zilnic AI cu consumul de azi și efortul AI pe nivel;
  - un gest din editor;
  - alertele pe e-mail (adresa și tipurile);
  - ștergerea unei adrese din registrul probei (dreptul de opoziție GDPR);
  - prețurile creditelor și coada creditelor neacordate.
- **Date:** `config/app`, `config/alerts`, `config/credits`, `announcements`, `aiBudget`, `creditGrantFailures`.
- **A mers:**
  - oprirea site-ului e impusă și în reguli, nu doar în interfață;
  - forma documentelor e păzită pe chei.
- **Lipsea:** configurarea se scria direct din client (`AdminView.tsx:576-579`). De aceea nu intra în audit și
  nu se putea restaura.
- **În v1:**
  - oprirea, mentenanța și anunțul în P2, prin callable cu audit;
  - alertele odată cu e-mailul;
  - partea de AI cu AI-ul;
  - creditele doar dacă rămân în catalog (întrebarea 1 din §5.4).
- **Depinde de:** auditul atomic, e-mail, catalog.

**AI**
- **Ce face:**
  - costul pe lună în $, cu apeluri, tokeni și defalcarea pe funcție;
  - apelurile fără preț, marcate ca gol în total, nu ca $0;
  - ultimele 10 rânduri de cost;
  - contorul pe cont.
- **Date:** `aiCostRollup`, `aiCostLedger`, `aiUsage`.
- **A mers:** un rând de cost pe fiecare apel, cu prețul calculat la scriere.
- **Lipsea:**
  - detalierea per utilizator și tabelul complet pe apeluri (regula owner-ului);
  - plafonul era în număr de apeluri, nu în $.
- **În v1:** nu. Vine cu AI-ul („mai târziu”). Regula registrului de cost pe apel se aplică totuși oricărei
  acțiuni care costă, din ziua în care apare.

**Audit** (admin+)
- **Ce face:** ultimele 100 de acțiuni: când, ce, asupra cui, cine și detaliile.
- **Date:** `adminLog`, scris doar de callable-uri.
- **A mers:** jurnalul nu se poate modifica din client.
- **Lipsea:**
  - rândul se scria după acțiune, separat;
  - configurarea nu trecea pe aici;
  - nu păstra valoarea dinainte, deci nimic nu se putea restaura.
- **În v1:** da, în P2, odată cu primele acțiuni:
  - rândul de audit intră în aceeași tranzacție cu schimbarea;
  - păstrează valoarea dinainte (pre-imaginea);
  - configurarea se poate restaura (modelul `restoreFromAudit` din Presto).
- **Depinde de:** callable-urile de acțiune.

**Admini** (doar owner)
- **Ce face:**
  - cererile de acces: oricine e logat poate cere, iar owner-ul aprobă pe un rol sau respinge;
  - lista adminilor, cu schimbarea rolului și revocarea.
- **Date:** `adminRequests`, `requestAdmin`, `adminSetRole`.
- **A mers** (`index.js:2841-2889`):
  - nu se poate rămâne fără owner: după scriere se renumără owner-ii, ca două retrogradări simultane să nu treacă
    amândouă;
  - nimeni nu-și poate schimba propriul rol;
  - există un script local de urgență pentru primul owner.
- **Lipsea:** lista adminilor se făcea din paginile de utilizatori deja încărcate (`AdminView.tsx:1793`), deci un
  admin de pe altă pagină nu apărea.
- **În v1:** da, în P2. Rolul și lista vin din colecția `staff`.
- **Depinde de:** cont, audit, logare recentă pentru schimbarea rolului.

**Operare**
- **Ce face:** patru ghiduri, afișate în aplicație:
  - ce face owner-ul pentru lansare;
  - pașii în console;
  - deploy-ul din CI și rotirea cheilor;
  - refacerea cheilor.
- **Date:** fișierele Markdown de operare din repo.
- **A mers:** o singură sursă pentru ghiduri.
- **Lipsea:**
  - ghidurile erau doar în română;
  - documentele de configurare rămâneau în urma codului (`docs/faza0/10` §5.4).
- **În v1:**
  - fila găzduiește panoul de publicare test → live;
  - ghidurile rămân în repo, cu link din admin (regula din §5.1, punctul 8).
- **Depinde de:** pipeline-ul de deploy și amprentă.

**Nouă: Diagnoză**
- **Ce face:** o tablă de verificări active, fiecare cu starea ok / atenție / eșec / info și cu indiciul de
  reparare:
  - ce instanță e (test sau live, `projectId`, sha-ul build-ului);
  - Stripe: modul test sau live și webhook-ul;
  - App Check: cheia pentru gazda curentă;
  - vârsta ultimului backup;
  - e-mailul: coada, cadența și DNS-ul;
  - fiecare job și declanșator: ultima rulare, eșecurile la rând și pornirile fără final;
  - erorile nerezolvate;
  - dacă regulile publicate sunt cele din commit-ul publicat;
  - retenția pe colecțiile care cresc;
  - identitatea juridică completată.
- **Modelul:** `runDiagnostics` din Presto, plus marcajele de rulare din DataRead și OurDays [citit în memoria
  proiectelor].
- **În v1:** din P0, cu 4–5 verificări. Crește cu fiecare subsistem.

**Nouă: Publicare test → live**
- **Ce face:**
  - arată ce commit e pe test, ce e pe live și commit-urile dintre ele;
  - arată amprenta fiecărei ținte (hosting, funcții, reguli, indecși, Storage);
  - are butonul „Publică pe live” (doar owner, cu logare recentă), care pornește workflow-ul cu sha-ul de pe test.
    GitHub cere aprobarea owner-ului, iar rezultatul intră în `meta/publishLog`.
- **Deciziile owner-ului din 15.08 se păstrează:** amprenta `meta/deployment`, declanșatorul direct, jurnalul
  [citit în `CLAUDE.md` din ediția întâi].
- **În v1:**
  - mecanismul din P1;
  - panoul din P2;
  - promovarea configurării (plan → aplică, lista albă pe live, pre-imagine) abia când există configurare care
    merită promovată.

### 4.2 Sonda: de unde vine 401 și ce poate dovedi emulatorul

**Metoda** [măsurat]:
- **Mediul:** emulatoarele Auth și Functions din `firebase-tools` 15.32.1, pe proiectul `demo-cncvs2-s9`.
  Proiectele `demo-*` nu ating cloud-ul și nu cer login.
- **Funcțiile** (cod de sondă, `cod/functions/index.js`):
  - `openPing` e martorul, fără App Check impus;
  - `supportPing` cere App Check și cel puțin rolul support;
  - `ownerPing` cere App Check și rolul owner.
- **Cele 7 identități:**
  - fără cont;
  - un token gunoi;
  - un utilizator;
  - support, admin și owner: conturi reale emise de emulator, cu rolul pus prin Admin SDK, ca într-un seed;
  - un owner falsificat: un token nesemnat, scris de mână, pentru un uid inexistent.
- **Cele 3 variante de App Check:** lipsă, un token nesemnat și un șir care nu e token.
- **Volumul:** 63 de celule × 5 repetări = 315 apeluri.

**Oracolul:**
- **Oracolul inițial** a fost scris înainte de rulare, din semantica documentată. Prima rulare a dat 17 din 63 de
  celule diferite, toate stabile (`cod/rezultate-oracol-initial.json`). Oracolul greșea: presupunea că un token
  stricat e respins și în emulator.
- **Cauza, citită în sursă:**
  - emulatorul pornește funcțiile cu `skipTokenVerification: true`
    (`firebase-tools/lib/emulator/functionsEmulator.js:1005-1008`);
  - decodorul de rezervă întoarce `{}` pe un șir care nu e JWT, fără să arunce
    (`firebase-functions/lib/common/providers/https.js:234-249`);
  - prin urmare, orice antet prezent devine „valid” (`checkAuthToken` de la `:310` pentru cont,
    `checkAppCheckToken` de la `:339` pentru App Check);
  - refuzul vine doar din lipsa antetului sau dintr-un token invalid (`:479-491`);
  - și emulatorul de Auth emite tokenuri nesemnate (`algorithm: "none"`,
    `firebase-tools/lib/emulator/auth/operations.js:1772`). Deci tot ce rulează pe emulatoare lucrează cu tokenuri
    neverificate.
- **Oracolul folosit acum** e derivat din aceste linii, nu din rezultate. A doua rulare: **63/63 conforme, 0
  instabile**.
- **Al doilea oracol, al producției,** vine din aceeași sursă, pe ramura cu `verifyIdToken` / `verifyToken`. E
  calculat, nu măsurat, fiindcă nu am acces la cloud. Arată unde ar minți emulatorul.

**Cifrele** [măsurat, `cod/rezultate.json`]:

| Ce | Valoare |
|---|---|
| Funcțiile cu App Check impus, **fără antet App Check**: răspunsuri 401, pentru toate identitățile, inclusiv owner-ul real | **14 din 14** (aceasta e cauza din vechi) |
| Cu **orice** antet App Check: `supportPing` | support, admin, owner → 200; utilizator → 403; fără cont → 401 |
| Cu **orice** antet App Check: `ownerPing` | doar owner → 200; support, admin, utilizator → 403 |
| Funcția vede `appId` din tokenul App Check de probă (`req.app`) | da |
| Owner-ul falsificat de mână, pe `ownerPing` | **200** (emulatorul nu verifică semnătura) |
| Tokenul de cont gunoi | tratat ca un cont fără roluri: 403, nu 401 |
| Celule în care emulatorul răspunde altfel decât producția | **30 din 63** |
| Nepotriviri față de oracol / rezultate instabile între repetări | 0 / 0 |
| Durata comenzii `masoara` (pornire, 315 apeluri, oprire) | 37,5 s; mediana unui apel: 2 ms |

**Zgomotul:** 9 agenți rulau în paralel. Rezultatul sondei sunt coduri HTTP, nu timpi, deci încărcarea nu le
schimbă: cele 5 repetări au fost identice. O a treia rulare, după ce am corectat doar comentariile, a dat aceleași
cifre în 37,9 s. Timpii sunt doar orientativi.

**Ce înseamnă:**
1. Local, adminul devine exersabil cu un singur lucru în client: un furnizor App Check de probă care trimite
   antetul. Furnizorul stă în carantina de dezvoltare, cu cele trei condiții din ediția întâi: poarta la rulare
   (`demo-*` și gazdă locală), eliminarea la build și un test pe `dist/`.
2. Pe emulator se probează logica: rolurile, auditul, GDPR, tabelele de permis / refuzat din reguli. Nu se probează
   că tokenurile sunt autentice. Perechile permis / refuzat pentru callable-uri rulează pe testul din cloud, cu
   verificare reală.

## 5. Ce schimbă în arhitectură

### 5.1 Decizii pentru plan

1. **Adminul e un modul, nu un fișier.**
   - Fiecare filă stă în dosarul ei, cu vederea, datele și testele ei.
   - Pe server: `functions/src/admin/<domeniu>.ts`, cu un nucleu pur testat.
   - Un singur tabel spune ce rol cere fiecare filă și fiecare acțiune. Interfața îl citește ca să ascundă
     butoane, iar serverul îl impune.
   - Textele trec prin `t()`, în en și ro.
2. **Rolul are o singură sursă: `staff/{uid}`.**
   - Documentul îl scrie doar un callable al owner-ului, plus scriptul de urgență.
   - Regulile îl citesc printr-o singură funcție, `staffLevel()`, iar callable-urile îl citesc la fiecare cerere.
   - Rolurile de admin nu mai stau în claim-uri.
   - Se păstrează regulile bune din vechi: niciodată fără owner, cu renumărare după scriere; nimeni nu-și schimbă
     propriul rol; nimeni nu acționează pe un rang egal sau mai mare; cererile de acces.
   - Un rol necunoscut nu dă niciun drept.
   - Acțiunile distructive cer o logare recentă: ștergerea unui utilizator, schimbarea rolului, publicarea pe live,
     oprirea site-ului.
3. **Citirile prin reguli, scrierile numai prin callable.**
   - Listele de admin se citesc direct, cu `staffLevel()` în reguli.
   - Orice scriere, inclusiv configurarea, trece printr-un callable. Callable-ul scrie auditul **în aceeași
     tranzacție**, cu pre-imaginea.
   - Pașii care nu încap într-o tranzacție (Auth, Stripe) se scriu ca „intenție → execuție → rezultat”.
4. **Jurnalul de erori din ziua 1** (`LECTII.md` §4.11, regula owner-ului pentru toate aplicațiile):
   - **Scrierea:** colecția unică `errorLogs`, scrisă doar de server:
     - `logClientError`, un callable cu plafon de rată, pentru erorile din client;
     - `logServerError`, care nu aruncă niciodată, pentru server.
   - **Sursele:** handler-ele globale din client, `ErrorBoundary`, callable-urile, declanșatoarele și joburile.
   - **Ce poartă fiecare rând:** sursa, build-ul, instanța și uid-ul.
   - **Gruparea:** pe o amprentă normalizată, care ignoră și hash-ul de build; un grup rezolvat se redeschide
     singur dacă eroarea reapare.
   - **Ce nu e eroare:** condițiile de operare (de exemplu 429, cota unui furnizor) merg în alt registru, nu aici.
5. **Diagnoza din ziua 1:**
   - verificări active, cu indiciu de reparare;
   - un marcaj de rulare pentru fiecare job și declanșator: ultima rulare, eșecuri la rând, porniri fără final;
   - joburile se programează cu cron, nu cu „every N”.
6. **Amprenta de deploy (`meta/deployment`, decizia 1 din 15.08).**
   - O scrie pipeline-ul pe fiecare instanță. Se extinde cu hash-ul fiecărei ținte, ca Diagnoza să poată spune
     „regulile de pe live sunt cele din commit-ul X”.
   - Cheia App Check a fiecărei instanțe se citește de la gazdă, ca restul configului. Așa același artefact
     servește și testul, și live-ul.
7. **Publicarea test → live:**
   - **Mecanismul (P1):** workflow-ul GitHub Actions, legat de Firebase prin WIF (identitate federată, fără chei
     descărcate). Workflow-ul:
     - publică exact un sha deja trecut prin test, cu arborele curat;
     - rulează în mediul `live`, cu aprobarea obligatorie a owner-ului.
   - **Panoul din admin (P2):** e doar o față peste mecanism: diferența test / live, butonul și jurnalul
     `meta/publishLog`.
   - **Prețul declanșatorului direct, acceptat de owner pe 15.08:** sha fixat, cont de serviciu dedicat pentru
     funcții, token GitHub minim, aprobare pe alt canal.
8. **Tot ce e în bundle e public.** Adminul primește datele numai de la server. Codul lui poate fi public, fiindcă
   apărarea stă în reguli și în callable-uri.
9. **O cifră care lipsește nu se afișează niciodată ca 0.** Se păstrează tipul `Measured` din vechi: o valoare
   măsurată sau „necunoscut, cu motivul”.
10. **Testele adminului verifică rezultatul, nu prezența** (lecția bancului verde pe sabotaje). Exemple:
    - după revocare, cererea următoare dă 403;
    - după ștergerea GDPR, nicio colecție per utilizator nu mai are documente;
    - exportul GDPR conține fiecare colecție semănată;
    - rândul de audit are pre-imaginea.

    Fiecare test e sabotat o dată, ca să se vadă că pică.

### 5.2 Etapizarea pe drum

Momentele sunt legate de evenimente din plan, nu de date calendaristice. Feliile sunt estimate [dedus] și se
reestimează din durate măsurate.

| Tranșa | Momentul pe drum | Ce intră din admin | Depinde de | Felii |
|---|---|---|---|---|
| **P0** | primul deploy pe test (etapa 0–1) | Jurnalul de erori (client, server, joburi); fila Erori; Diagnoza minimă (instanța, sha-ul, erorile nerezolvate, marcajele); amprenta; scheletul adminului; owner-ul creat prin script; accesul pe test și local (§5.3) | Auth doar pentru personal, pipeline-ul de deploy pe test | 3 |
| **P1** | prima publicare pe live (sfârșitul primei etape publicate) | Workflow-ul de publicare cu sha fixat și aprobare în GitHub; backup cu alarmă; în Diagnoză: amprenta test / live și vârsta backup-ului | WIF pe ambele proiecte, mediul `live` în GitHub | 1–2 |
| **P2** | conturile și dreptul de acces pe server (înainte de cloud și biblioteci) | Utilizatori (căutare pe server, dosar, plan, probă, dezactivare, GDPR); Audit atomic; Admini (`staff`); plăcile de conturi și probe din Puls | conturi, capabilități, registrul probei | 3–4 |
| **P2+** | imediat după P2 | Tichete (Storage, e-mail, alerte); Config (oprire, mentenanță, anunț); panoul de publicare | e-mail (DNS, pas owner), audit | 2–3 |
| **P3** | facturarea (Stripe, mod test) | Venituri (MRR din catalogul unic, eticheta TEST); cozile de eșecuri; verificările Stripe; placa MRR din Puls | catalogul unic, lista albă de prețuri, webhook | 1–2 |
| **P4** | ultimele 1–2 etape înainte de lansare | Analiză (pâlnie, adopție din registrul de acțiuni); CAM simplificat; rezumatul zilnic; trecerea fiecărei file pe test (criteriul din `BRIEF.md` §8) | consimțământ, fluxul de evenimente | 2–3 |
| mai târziu | odată cu AI-ul | Fila AI: registru pe fiecare apel, per utilizator, plafon lunar în $, oprire impusă pe server | AI | — |

**Total pentru v1: 12–17 felii** [dedus]. Ca reper, adminul vechi avea ~3 500 de linii: interfața ~2 500 (numărate
cu `wc -l`) și partea de admin din funcții ~1 000 (estimată pe intervalele de linii). Interfața lui a fost atinsă de 36 de
commit-uri [citit în `docs/faza0/10`].

**Adminul „complet pentru v1”** (definiția propusă pentru `BRIEF.md` §8) are 12 file:
1. Puls;
2. Utilizatori;
3. Venituri;
4. Analiză;
5. CAM;
6. Tichete;
7. Erori;
8. Diagnoză;
9. Config;
10. Audit;
11. Admini;
12. Operare, cu publicarea.

Fiecare are un scenariu rulat pe instanța de test. Fila AI rămâne pentru „mai târziu”.

### 5.3 Cum devine adminul exersabil pe test din ziua 1

1. **Același artefact, aceleași reguli, `enforceAppCheck: true` peste tot.** Nicio ramură „dacă e test”.
2. **Oamenii pe test:** o cheie reCAPTCHA Enterprise pentru domeniul de test, creată în proiectul de test (pas
   pentru owner). Cheia se citește de la gazdă.
3. **Agentul și CI-ul pe test:**
   - un token de debug App Check, înregistrat **doar** pe proiectul de test;
   - ținut în afara repo-urilor (regula „două instanțe”) și ca secret de test în CI;
   - pus în pagină la rulare (Playwright `addInitScript`), niciodată în bundle;
   - pe live nu se înregistrează niciun token de debug.
4. **Identități reale pe test:**
   - un script de seed creează owner, admin și support (documente `staff`), plus clienți în fiecare stare:
     gratuit, în probă, expirat, plătitor pe Stripe test, plan dat de admin, dezactivat;
   - creează și tichete cu atașamente, erori rezolvate și redeschise, marcaje de joburi;
   - datele sunt relative la momentul seed-ului, ca să nu expire (lecția fixturilor cu ceas).
5. **Local:** emulatoarele, plus furnizorul App Check de probă în carantină (§4.2). Aici rulează logica și testele
   e2e în CI, fără secrete.
6. **Stripe:** pe test mereu cheia de test. Pe live, tot cheia de test până la CAEN. Diagnoza și fila Venituri
   spun asta pe ecran.
7. **Proba de acceptare a fiecărei tranșe:**
   - agentul rulează scenariul filei pe testul din cloud, cu perechi permis / refuzat cu tokenuri reale;
   - owner-ul vede aceeași filă în browserul lui, pe test.

### 5.4 Întrebări pentru owner (recomandarea e prima)

1. **Creditele de export (plata la bucată) din ediția întâi intră în v1?**
   - **Recomand nu.** `BRIEF.md` §4 vorbește doar de abonamente.
   - Atunci panoul de credite și coada lor dispar din admin.
2. **Jurnalul de erori fără consimțământ, cu uid-ul pseudonim și o retenție de 90 de zile, e în regulă?**
   - **Recomand da**, cu o frază în politica de confidențialitate (de verificat juridic).
   - Altfel se repetă „crash-urile văzute doar de la cei care au consimțit”.
3. **Pentru primele publicări pe live, aprobarea se dă în GitHub, iar panoul din admin vine în P2. E în regulă?**
   - **Recomand da.** Siguranța (sha fixat, aprobarea owner-ului, jurnalul) există de la prima publicare.
4. **Tichetele să fie folosite întâi de owner, pentru raportările de pe test?**
   - **Recomand da.** Raportul vine cu documentul atașat, iar lista din chat se scurtează.

## 6. Riscuri și ce a rămas neprobat

- **App Check pe testul din cloud nu l-am rulat.** Regulile sondei nu permit cloud-ul. Calea cu reCAPTCHA și cu
  tokenul de debug e doar [citit].
  - **Prima felie din P0 trebuie s-o măsoare:** pe test, un callable întoarce 200 cu tokenul de debug și 401 fără
    el.
- **Emulatorul nu e banc de securitate:** răspunde altfel decât producția în 30 din 63 de celule. Un test verde
  local nu dovedește verificarea tokenurilor.
  - Regulile Firestore se evaluează pe emulator, dar tot cu tokenuri neverificate: emulatorul de Auth le emite
    nesemnate (§4.2). Securitatea căii de token se probează doar pe test.
- **Rolul citit din `staff/{uid}` în reguli** costă o citire la fiecare evaluare și intră în plafonul de apeluri
  `get()` al regulilor. Nu l-am măsurat. Pentru traficul de admin, costul e neglijabil [dedus]. Se probează pe
  emulatorul Firestore (cere Java 21, care există pe mașină în JBR-ul din Android Studio).
- **Declanșatorul direct de publicare** dă unui buton din browser puterea de a porni un deploy de cod. Owner-ul
  l-a ales pe 15.08, cu riscul pe masă. Plasa e obligatorie: sha fixat, cont de serviciu dedicat, token minim,
  aprobare pe alt canal.
  - Dacă owner-ul e singurul care aprobă, opțiunea GitHub „prevent self-review” nu se activează pentru rulările
    pornite de el.
- **Regiunile mixte** (baza în `nam5`, declanșatoarele în `us-central1`, funcțiile în `europe-central2`) au făcut
  în vechi un declanșator să tacă. În v2 fiecare declanșator are marcaj de rulare. Nu e probat aici.
- **Juridic:** jurnalul de erori fără consimțământ (întrebarea 2).
- **Estimarea de 12–17 felii** e [dedus], nu măsurată.
- **N-am deschis adminul vechi de pe live.** Inventarul e din cod, citit la HEAD-ul local.

## 7. Cum se reproduce

Comanda `masoara`, sub un minut, fără cloud, fără login și fără Java:

```
cwd: C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s9-admin
o singură dată: npm install && npm install --prefix functions
comanda:        node run.mjs
```

- **Ce afișează:** tabelul celor 63 de celule și rândul
  `{"cells":63,"reps":5,"calls":315,"mismatches":0,"unstable":0,"gapEmulatorVsProductie":30,...}`.
- **Codul de ieșire:** 0.
- **Porturile:** 19399–19402, toate închise la final.

Din copia din repo: se copiază `docs/faza2/admin/cod/` într-un dosar din afara Drive-ului, apoi aceiași doi pași.
`package-lock.json`-ul din rădăcină nu e copiat, fiindcă are 307 KB, peste limita de 300 KB. `firebase-tools` e
fixat exact în `package.json` (15.32.1).

**Fișierele:**
- `cod/package.json`, `cod/firebase.json`, `cod/run.mjs`, `cod/probe.mjs`;
- `cod/functions/{package.json, package-lock.json, index.js}`;
- `cod/rezultate.json` (a doua rulare) și `cod/rezultate-oracol-initial.json` (prima rulare, cu oracolul greșit).
