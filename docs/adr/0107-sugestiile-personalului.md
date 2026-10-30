# ADR 0107: Sugestiile personalului în /admin: scrise de personal, decise de owner (felia 14.B↑)

**Starea:** acceptat pe 29.10.2026, la felia 14.B↑ (adusă din etapa 14, fără mașină). Cererea owner-ului, din 28.10: „Vreau sa
cream si sistemul de account pentru useri, inclusiv admini, scopul acum imediat este pentru admini, si, sa avem un sistem de
feedback unde ei pot nota sugestii, iar eu sa pot decide ce sa implementam”. Planul a fost dat în raportul feliei 6.R↑ (fila
Sugestii, tipul, stările, citirea asistentului), iar ordinea a venit din răspunsul „Întâi PDF-ul”. Conturile clienților vin cu
partea comercială (`CLAUDE.md`, „Decizii luate”, 28.10). **Continuă:** ADR 0049 (catalogul de permisiuni, auditul în
tranzacție), ADR 0040 (pagina `/admin`, App Check pe callable-uri), ADR 0071 (owner-ul fix). **Completat de:** ADR 0111 (pasul 2:
butonul „Sugestie” din editor, cu poza planșei).

**Problema.** Conturile personalului există (ADR 0049), dar owner-ul n-are unde să primească ideile lor și unde să decidă ce
intră în aplicație. Nici asistentul n-are o listă cu ce a acceptat owner-ul.

## Decizia

1. **Două permisiuni noi în catalog** (`shared/personal.ts`):
   - `sugestii.scrie` deschide fila Sugestii: omul scrie sugestii, le vede pe ale lui, cu decizia pe fiecare, și își editează
     sugestia cât n-are decizie;
   - `sugestii.citeste` arată sugestiile întregului personal, cu deciziile.

   Owner-ul le bifează pe fiecare rol. Planul din 6.R↑ spunea „toți văd lista”, iar brief-ul feliei „își vede sugestiile”; din
   bife se pot face amândouă. **Decizia e doar a owner-ului** și nu e în catalog, ca administrarea personalului („iar eu sa pot
   decide ce sa implementam”). Owner-ul are tot catalogul, deci poate scrie și el sugestii.
2. **Datele** le scrie doar serverul. Documentul `sugestii/{id}` (cu id automat) are:
   - `titlu`: 1–120 de caractere, cu spațiile adunate;
   - `descriere`: 0–4 000 de caractere, pe mai multe rânduri;
   - `tip`: `idee`, `problema` sau `imbunatatire`;
   - `zona`: `desen`, `cam`, `simulare`, `masina`, `fisiere`, `admin`, `altceva`, sau null (nespecificată);
   - `autor` (uid-ul) și `autorEmail`, din personal sau, pentru primul owner, pus din consolă fără e-mail, din token;
   - `creataLa` și `modificataLa`;
   - `stare`, `nota` (0–2 000 de caractere), `decisaDe` și `decisaLa`;
   - `versiune`: 1, apoi crește cu fiecare schimbare.

   Contorul zilnic al fiecărui om stă în `limiteSugestii/{uid}`, cu `zi` (UTC) și `numar`.
3. **Callable-ul `sugestii`** (App Check impus, `europe-central2`). Drepturile se citesc în tranzacție (ADR 0049 §3), iar
   auditul (`sugestii.scrie`, `sugestii.editeaza`, `sugestii.decide`, cu valorile de dinainte și de după) se scrie în aceeași
   tranzacție. Câmpurile se curăță cu aceleași funcții ca în pagină (`shared/sugestii.ts`).
   - `scrie`: cere `sugestii.scrie`; cel mult 20 de sugestii pe om, pe zi UTC (un cont de personal furat nu umple baza, iar
     cota stă pe cine poate scrie); sugestia nouă are starea `noua` și versiunea 1.
   - `editeaza`: doar autorul (nici owner-ul nu editează sugestia altcuiva), doar în starea `noua` și doar pe versiunea văzută;
     același conținut nu scrie nimic.
   - `decide`: doar owner-ul; starea (oricare, și înapoi la `noua`, când autorul o poate edita din nou) și nota, pe versiunea
     văzută; aceeași decizie nu scrie nimic.

   Refuzurile sunt `HttpsError`-uri cu motivul și nu scriu nimic, nici contorul.
4. **Stările:** `noua` (fără decizie), `acceptata` (de făcut), `amanata` (mai târziu), `respinsa`, `in-lucru` și `facuta`, ca
   în planul din 6.R↑; „de făcut / mai târziu / respinsă” din brief sunt aceleași. Owner-ul mută o sugestie din orice stare în
   oricare: nicio tranziție nu e impusă.
5. **Regulile.** O sugestie se citește cu `sugestii.citeste` (owner-ul o are), sau cu `sugestii.scrie` doar de autorul ei
   (`resource.data.autor == request.auth.uid`), deci lista autorului trebuie să filtreze ea pe `autor`. Nimeni nu scrie din
   client, iar `limiteSugestii` n-are regulă. **Interogările nu cer index compus:** cine vede tot citește cele mai noi 300 (cu
   `orderBy('creataLa')`, pe indexul simplu), iar autorul doar `where('autor', '==', uid)`, cel mult 300, ordonate în pagină.
   Un index compus lipsă ar fi aruncat abia pe test, fiindcă emulatorul nu cere indecși.
6. **Fila Sugestii** (`src/admin/sugestii/`) are:
   - formularul: titlul, descrierea, tipul (ales de om, fără implicit) și zona;
   - lista, cu filtrele pe stare (fiecare cu numărul ei) și „Doar ale mele” pentru cine vede tot; pe fiecare rând, starea,
     decizia și nota.

   „Editează” (autorul, cât n-are decizie) și „Decide” (owner-ul) deschid formularul pe versiunea de atunci. O sugestie
   reîncărcată cu altă versiune își închide formularul, iar o cerere pe varianta veche e refuzată de server, cu motivul lângă
   formular (decizia e legată de ce a văzut owner-ul). Lista se citește la cerere („Reîncarcă”), ca fila Erori. Fără App Check
   pe instanță, butoanele se opresc și spun de ce.
7. **Asistentul citește ce s-a acceptat:** `node scripts/sugestii.ts [--instanta test|live] [--toate]` listează sugestiile
   acceptate și pe cele în lucru, cu textul și nota owner-ului. Citește prin API-ul REST al Firestore, cu identitatea
   `firebase login` a mașinii (IAM, ca `verifica-test.ts`), iar rândurile sunt cele ale filei (`sugestieDin`). Pe mașina
   owner-ului, unde npm lipsește din instalarea Node, `firebase-tools` se ia din `%APPDATA%\npm\node_modules`. Pasul intră în
   începutul fiecărei sesiuni (`CLAUDE.md`).

## Ce am respins

- **Scrierea din client, păzită de reguli** (câmpurile și plafoanele în `firestore.rules`): auditul n-ar mai fi în aceeași
  tranzacție, App Check n-ar păzi scrierea, iar validarea ar exista de două ori. Toate scrierile aplicației noi trec prin server
  (ADR 0039 §7).
- **Decizia ca permisiune în catalog** (`sugestii.decide`): owner-ul a cerut decizia pentru el. O delegare se adaugă când o
  cere, cu probele ei, ca la personal (ADR 0049).
- **Un index compus** pentru lista autorului ordonată pe server (§5).
- **Discuțiile pe sugestie și notificările pe e-mail:** nu acum (aplicația nu trimite e-mailuri, ADR 0049). Nota owner-ului e
  singurul răspuns.
- **Ștergerea unei sugestii din pagină:** owner-ul o respinge, cu o notă; un duplicat se respinge la fel.

## Probele

- `functions/test/reguli.emulator.test.ts`: cine citește ce (toate, doar ale lui, nimic); lista nefiltrată refuzată autorului;
  permisiunea scoasă din rol; nimeni nu scrie din client, iar contoarele nu se citesc.
- `functions/test/sugestii.emulator.test.ts`: fiecare acțiune, cu drepturile, câmpurile, plafoanele exact la limită și peste,
  contorul pe zi UTC, versiunea văzută, cererea identică fără scriere și auditul; apoi callable-ul prin emulatorul de funcții
  (401 fără App Check, 403 fără drept, 200 cu drept).
- `test/unit/sugestii.test.ts`: validările, rândurile, ordinea și filtrele. `test/unit/sugestii.lista.test.ts`: paginile REST
  și textul asistentului.
- `test/e2e-emulator/sugestii.emulator.spec.ts`: rolul făcut din bife; omul scrie și își editează sugestia; owner-ul decide cu
  o notă; omul vede decizia; decizia pe o variantă veche, refuzată lângă formular; rolul care doar citește.

## Se redeschide dacă

- sugestiile trec de 300 (paginarea listei) sau de 6 000 (citirea asistentului);
- owner-ul vrea să delege decizia, discuții pe sugestie sau un buton „Sugestie” direct în editor (pasul 2 din planul 6.R↑, cu
  poza planșei);
- conturile clienților (etapa 14) vor să scrie și ele sugestii (atunci, alt drum decât personalul);
- vine trecerea pe live (3.9): sugestiile scrise pe test rămân acolo, iar owner-ul decide dacă le mută.
