# Adminul reproiectat (ADR 0260)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, ADR 0260: pagina /admin reproiectată; A.1–A.3 unite în main (A.3: 528ee187); A.4 (Sugestii ca tablă) ÎN PAUZĂ din 22.11, WIP împins pe wip/A.1-admin (4a64e984)_

Linia adminului din [sesiunea principală](principala.md): ADR 0260 (intervalul 0260–0269), acceptat pe 13.11.2026 cu ideile 51–62 de pe
tabla „Harta schițelor”. Owner-ul a cerut „vreau sa faci design si pentru admin”, iar la idei a răspuns „Da la toate”
(`5abe4da`). Pornită pe 17.11 („ok, ia-le la rand”, „Yes, start it then”, prin sesiunea principală).

- **Schițele:** rândul G al canvas-ului aranjamentelor (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>, fișierele
  `project/Admin-*.dc.html`: Azi, Intrarea, Erori, Tichete…), în paleta Insulelor.
- **Locul:** worktree-ul `C:\Users\besli\cncvs2-lucru\admin` (ramura `wip/A.1-admin`; linia continuă pe ea), e2e pe 4191
  cu `CNCVS2_E2E_RETEA=127.0.44`; clona de otrăvuri `C:\Users\besli\cncvs2-lucru\otravuri-admin`. Proba de pe emulatoare
  rulează doar cu 4173 și porturile emulatoarelor libere (comune cu porțile sesiunii principale), cu UN lucrător
  (fiecare probă golește baza comună). Canalul <https://cncvectorstudio-test--admin-pz7pkdut.web.app> până pe 18.12.
- **A.1 UNITĂ în main** (`5147f448`; `3.Aa`), **A.2 UNITĂ în main** (`ce5bd472`; `3.Ab`).
- **A.3 UNITĂ în main pe 22.11** (`528ee187`, din `3ab5b1b3`; `3.Ac`; predarea în notele
  comune, `admin-A3.md`): Tichete ca o conversație (lista + detaliul, „Răspunde și rezolvă”, ciornele pe pagină, erorile din sesiune
  spre Erori, grupul vechi adus) și **răspunsurile rapide, ADR 0261** (acceptat 21.11, „Da, toate recomandările”, 1a–5a):
  `shared/raspunsuriRapide.ts`, acțiunea `raspunsuriRapide` a callable-ului `tichete` (owner, versiunea văzută, audit),
  regula `setari/raspunsuriRapide` (cu `tichete.raspunde`), secțiunea din Setări, pastilele din Tichete (la unire s-au
  publicat și regulile Firestore, și funcția `tichete`). `/admin` 113,7 → 121,2 (linia +14,7 din +25). Otrăvurile 59 / 59.
- **A.4 (Sugestii ca tablă) ÎN PAUZĂ din 22.11 seara** („cand termina background tasks, vreau sa facem pauza”): comise
  `4181e6d1` + `4a64e984` pe `wip/A.1-admin` (din `main` `88be9d6c`), împinse ca WIP la pauză (canalul tot pe A.3); fără reguli/date/funcții (la unire doar
  Hosting). Gata: tabla, unitarele întregi, e2e-ul feliei 14 / 14, bancul, otrăvurile unitare 14 / 14, pe emulatoare 25 / 28
  (E19 nevalidă: parantezele din titlu în `--grep`; E12, E27 scăpate: de întărit proba sau de scos regula). Rămân: acelea,
  porțile lente, mărimea, documentele (ciornele în `.tmp/a4-ciorne/`), push, canal, raport. Starea întreagă: `admin-A4.md`
  în notele comune.
- **Întrebarea la owner cu schiță** (ca linia planșelor): o pagină privată cu schițele de încercat și formularul, răspunsurile
  în baza ei (`raspunsuri`, scrise doar de owner); pentru 0261: <https://claude.ai/artifact/DhLTbJiBTWGdgjobiDcJb2>.
- **Feliile rămase:** A.4 (în pauză, mai sus); A.5 Utilizatori și Personal; A.6 Roadmap, Documentație, Setări (istoricul din
  audit, și al răspunsurilor rapide); A.7 telefonul. Fiecare la cuvântul sesiunii principale / al owner-ului.

**Why:** adminul e pagina personalului, nu ține de aranjamente (ADR 0250); de aceea are linia lui, nu feliile 28.x.

**How to apply:**
- rămân neschimbate (în afara unui ADR al liniei, ca 0261): permisiunile (`fileVizibile` nu știe de Azi), regulile, Firestore
  Lite (fără ascultători), fără indexuri compuse noi;
- pagina se deschide pe Azi: o probă nouă de pe emulatoare intră în filă din bară (`[data-fila=…]`, `aria-current`);
- **Firestore Lite citește un document prin `documents:batchGet` (POST, calea în CORP)**: o probă „nicio citire” caută în
  adresă și în `postData()`; rutele pe `:runQuery` au `?key=…` (funcție pe cale, nu glob, și probă că cererea e ținută);
- detaliul lipit sus (Erori, Tichete) ține cât spațiul de sub el (`useCatSpatiulDeJos` în `carcasa/stari.tsx`) cu
  `box-sizing: border-box` (fără ea, umplutura și bordura trec de plafon); flex-ul din Tichete cere selector dublu (grila din
  `admin.css` câștiga după ordinea foilor în bundle);
- un formular citit din Firestore pornește din nou la citirea SOSITĂ (`key={citiri}`), nu la cerere (`key={rev}`: se remonta
  din valorile vechi și le ținea);
- sub încărcare, sonda rece a funcțiilor (Diagnoza) și primul callable trec de 30 s: 60 s în probe;
- două sesiuni pornesc emulatoarele în aceeași clipă după liniște: scripturile din `.tmp` reîncearcă la „port taken”;
- e2e-ul întreg cu 16 lucrători pe mașina încărcată dă depășiri de timp în fișierele editorului: căderile se reiau cu 4;
- dicționarele adminului (ro și en) intră amândouă în bucata lui: fiecare text nou contează de două ori la mărime;
- o probă cu un text ales „la întâmplare” se ancorează pe hârtie (U04: tăietura cădea chiar la un spațiu);
- `.tmp/liniste.sh` numără doar procesele node; build-ul porților se face cu documentele traduse (fișa intră în
  `dist/documentatie/`);
- tabla (A.4): un mesaj pus deasupra ei la o mutare o împinge sub cursorul care trage, deci decizia se anunță doar pentru
  cititorul de ecran; un text lung `nowrap` dintr-un card lățește grila (și pagina): `minmax(0, 1fr)` + `min-width: 0`;
  `dragTo` din Playwright merge cu tragerea HTML5 în Edge; starea „în drum” se probează ținând callable-ul (portul 5005,
  calea `/sugestii`); sugestiile din `beforeEach`-ul bancului vizual au id-uri de 21 de caractere, refuzate de server.
