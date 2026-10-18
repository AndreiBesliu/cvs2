# ADR 0044: Publicarea pe live (P1, partea 2): amprenta, scriptul unic, workflow-ul cu sha fixat

**Starea:** acceptat pe 18.10.2026 pentru partea fără conturi (felia 3.4b, pornită la „Continua”); partea cu conturile
owner-ului (WIF, mediile GitHub, PITR, contul backup-ului) se face după pașii de la final. Scrie contractul deciziilor
deja luate: amprenta `meta/deployment` (decizia owner-ului din 15.08), publicarea test → live din GitHub Actions cu WIF,
un sha fixat, mediul `live` cu aprobarea owner-ului (`docs/faza2/admin/RAPORT.md` §5.1, punctele 6 și 7; `PLAN.md` §8.2),
contul dedicat al backup-ului (ADR 0041 §1). **Intră în:** etapa 3, felia 3.4b. **Continuă:** ADR 0040 §7 (amprenta mutată
în 3.4), ADR 0041, ADR 0043 §7 (cheia App Check citită la publicare).

**Problema.** Până acum, testul se publica de pe mașina owner-ului, cu două scripturi (hosting, serverul), fără nicio urmă
în proiect a ce s-a publicat; live nu avea niciun drum. Comutarea pe live (3.9) cere un drum repetat întâi pe test, care
publică exact ce a trecut prin test și pe care owner-ul îl aprobă, fără chei descărcate.

## Decizia

**1. Amprenta `meta/deployment`, pe ținte** (`shared/publicare.ts`, sursa unică pentru script, workflow și Diagnoză): un
document pe instanță, `{ schema: 1, app: 'cncvs2', projectId, tinte }`, iar fiecare țintă (`hosting`, `functii`, `reguli`,
`indecsi`) are publicarea ei: `gitSha` (40), `gitRef`, `arboreCurat`, `deployedAt`, `deployedBy` (`github:<actor> #<rulare>`
sau `local`) și, la hosting, `builtAt`. Pe ținte, nu una pe document: o publicare doar a hosting-ului nu șterge ce se știe
despre server, iar Diagnoza poate spune „regulile sunt din commit-ul X” (RAPORT §5.1.6). Scrisă prin API-ul REST al
Firestore (`scripts/amprenta.ts`), cu masca câmpurilor publicate acum (`updateMask`), cu identitatea publicării (IAM): regulile
o refuză oricărui client (`match /meta/deployment`: citire pentru personal, nicio scriere; restul lui `meta` refuzat).
- **Abatere de la ADR 0040 §7** („local nu există credențiale Admin”): scriptul scrie amprenta și de pe mașina owner-ului,
  cu contul lui `firebase login` prin clientul firebase-tools (cum citește deja cheia App Check), nu cu Admin SDK. Fără
  abaterea asta, testul publicat de acasă n-ar avea amprentă până la WIF.

**2. Un singur script de publicare** (`scripts/publica.ts --instanta test|live [--doar hosting|server]`): serverul întâi
(funcțiile `cncvs2`, regulile, indecșii; funcțiile și indecșii aplicației vechi rămân neatinși), apoi hosting-ul (pagina nouă
așteaptă serverul nou), apoi amprenta, doar pe țintele publicate. `publica-test.ts` (hosting) și `publica-functii.ts`
(serverul) rămân scurtăturile instanței de test, peste el.
- **Hosting-ul pleacă doar dacă `dist/` e build-ul commit-ului curent**: una dintre bucăți poartă versiunea (primele 12
  caractere ale sha-ului, între ghilimele; minificatorul pune backtick-uri). Capcana din 17.10 (un `dist/` vechi trecea de
  e2e) nu mai poate ajunge pe o instanță.
- **Live doar din workflow** (`poatePublica`): `GITHUB_ACTIONS`, mediul GitHub `live` (`CNCVS2_MEDIU` = variabila `INSTANTA`
  a mediului, care există doar după aprobarea owner-ului), sha-ul cerut (`CNCVS2_SHA`), checkout-ul curat și exact pe el.
  În workflow, instanța cerută trebuie să fie a mediului. De pe mașina owner-ului, scriptul refuză live (și cârligul de
  publicare la fel).
- **Versiunea din build vine din checkout** (`git rev-parse HEAD`, `vite.config.ts`), nu din `GITHUB_SHA`: la un workflow
  pornit manual, `GITHUB_SHA` e capul lui `main`, nu commit-ul cerut.

**3. Workflow-ul `publica`** (`.github/workflows/publica.yml`, pornit manual, cu `instanta` și `sha`):
- **verifica** (în mediul `test`, fără aprobare): sha-ul are forma bună, e pe `main`, are nivelul rapid verde (pe el sau pe
  cel mai apropiat strămoș verde, dacă între ei s-au schimbat doar fișiere `.md`, ca la `paths-ignore`); pentru live, în
  plus, **testul are amprenta întreagă din același sha, din arborele curat** (`scripts/verifica-test.ts`, identitatea
  testului);
- **publica** (în mediul instanței; `live` cere aprobarea owner-ului): checkout-ul exact al sha-ului, `npm ci`,
  firebase-tools fixat (15.18.0, versiunea probată local), identitatea Google prin WIF (`google-github-actions/auth`, fixat
  pe commit), build-ul, `publica.ts`. Intrările ajung în comenzi doar prin `env:`. Fișierul de acreditări al acțiunii
  (`gha-creds-*.json`) e ignorat de git, ca să nu murdărească arborele (live ar refuza).
- Ce îi lipsește, din motive spuse: panoul din admin (P2, peste același workflow), jurnalul `meta/publishLog` și
  configurarea test → live (după primul live).

**4. Identitatea: WIF, fără chei** (`scripts/wif/pregateste-proiect.sh`, rulat de owner în Cloud Shell): pool-ul `github`
și furnizorul `cvs2`, cu condiția `assertion.repository == 'AndreiBesliu/cvs2'`; contul `publicare-cncvs2` (hosting,
funcții cu Cloud Run pentru invocarea publică, reguli, indecși, joburile programate, amprenta, citirea configurației web și
a cheii App Check, `iam.serviceAccountUser` pentru conturile de rulare), folosibil **doar din mediul GitHub al instanței**
(`attribute.environment/<mediu>`). Prețul acceptat pe 15.08 (sha fixat, aprobare pe alt canal, intrări prin `env:`) e
respectat; contul de rulare al funcțiilor rămâne cel implicit, cu drepturile lui.

**5. Contul dedicat al backup-ului** (ADR 0041 §1): `SA_BACKUP` din `functions/.env.<proiect>` (`optiuniContBackup`, în
`shared/joburi.ts`), când există; altfel contul implicit al funcțiilor, ca acum. Un nume strâmb aruncă la publicare
(analiza funcțiilor), nu la 03:00. Contul îl creează scriptul de la punctul 4 (export, Firestore, bucket-ul).

**6. Diagnoza citește amprenta** (verificarea `amprenta`, după `build`): necitită = eșec cu motivul; lipsă = atenție cu
indiciul („publică prin script sau workflow”); altă formă = atenție; alt proiect = eșec (aliasul care minte); fără hosting =
atenție; build-ul paginii ≠ sha-ul hosting-ului = atenție (cache vechi sau publicare pe lângă script); modificări necomise =
informație pe test, **eșec pe live**; serverul din alt commit (sau nepublicat prin script, „—”) = informație; altfel bine,
cu commit-ul, ora și cine.

## Dovada și probele

- **Unitare:** `test/unit/publicare.test.ts` (forma amprentei și verificarea din Diagnoză, pe fiecare stare),
  `test/unit/publica.test.ts` (argumentele, cine are voie să publice, `dist/` al commit-ului, codarea REST, masca de scriere,
  citirea, condiția live = același sha pe test; clientul API fals), `test/unit/joburi.test.ts` (contul backup-ului),
  `test/unit/admin.test.ts` (Diagnoza întreagă, cu amprenta).
- **Pe emulator:** regulile lui `meta/deployment` (personalul citește; nimeni nu scrie; restul lui `meta` refuzat).
- **Pe test:** publicarea cu scriptul nou (serverul și hosting-ul) scrie amprenta (măsurat la felie, citită înapoi).
- **Neprobat aici:** workflow-ul însuși (cere WIF și mediile GitHub: pașii owner-ului); prima rulare pe test îl probează,
  iar prima rulare pe live e comutarea (3.9).

## Ce impune

- O instanță se publică doar cu `publica.ts` (sau scurtăturile lui): orice altă publicare lasă amprenta în urmă, iar
  Diagnoza o arată.
- Live se publică doar din workflow, cu un commit publicat întreg pe test; pe test, workflow-ul și mașina owner-ului.
- Un rol nou cerut de publicare intră în `scripts/wif/pregateste-proiect.sh` (și owner-ul îl rulează din nou).
- Un câmp nou în amprentă: `shared/publicare.ts` (forma și validarea), apoi scrierea și Diagnoza, cu schema crescută.

## Pașii owner-ului (o dată)

1. **Cloud Shell** (<https://shell.cloud.google.com/>), cu fișierul `scripts/wif/pregateste-proiect.sh` urcat sau lipit:
   `bash pregateste-proiect.sh cncvectorstudio-test test`, apoi, înaintea comutării, `bash pregateste-proiect.sh
   cncvectorstudio live --pitr`. Scriptul tipărește valorile de la pașii 2 și 3.
2. **GitHub → Settings → Environments** (<https://github.com/AndreiBesliu/cvs2/settings/environments>): mediul `test` cu
   variabilele `INSTANTA=test`, `WIF_PROVIDER=…`, `SA_PUBLICARE=…`; mediul `live` cu aceleași (ale proiectului live,
   `INSTANTA=live`), plus **Required reviewers: AndreiBesliu** și **Deployment branches: main**.
3. Linia `SA_BACKUP=…` o pune asistentul în `functions/.env.<proiect>` și republică funcțiile.
4. Prima rulare: **Actions → publica → Run workflow**, instanța `test`, sha-ul ultimului commit de pe `main`.

## Ce am respins

- **Chei de serviciu descărcate** în secretele GitHub: interzise de regula WIF.
- **Publicarea pe live de pe mașina owner-ului:** fără aprobare pe alt canal și fără sha fixat; scriptul o refuză.
- **O amprentă pe document, fără ținte:** o publicare parțială ar minți despre restul.
- **Declanșatorul din admin acum:** P2, peste același workflow.

## Se redeschide dacă

- prima rulare pe test arată un rol lipsă sau în plus (atunci scriptul de Cloud Shell se corectează);
- comutarea (3.9) cere altă ordine decât serverul înaintea hosting-ului.
