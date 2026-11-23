# Trenuleț ca extensie

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_Linia Trenuleț în cvs2 (sesiunea „plugin 2d- lego 3d”, worktree wip/trenulet): planificatorul ca extensie instalată, nu în aplicație; cadrul izolat, CSP aprobat, senderul prin HostApi; 3.S–3.Tf gata (3.Xc = ADR 0160 … 3.Tf = ADR 0167, numele Easy 3Draw; blocul liniei 0160–0169, următorul liber 0168); ÎNCHEIATĂ pe 05.11, de unit în main de sesiunea principală_

Linia Trenuleț din [sesiunea principală](principala.md): Planificatorul Trenuleț (circuite din lemn compatibile Brio, piese LEGO printate) intră
în cvs2 ca **extensie**. Din 05.11 (3.Tf, ADR 0167), numele afișat e **„Easy 3Draw”** (același în ro și en, netradus); id-ul,
dosarul, pachetul (`trenulet-<v>.zip`) și antetul G-code-ului (amprentele v18) rămân „trenulet”. Sesiunea dedicată lucrează în `C:\Users\besli\cncvs2-lucru\trenulet`, ramura `wip/trenulet`
(neîmpinsă; se unește în `main` doar la cuvântul owner-ului, prin sesiunea principală). ADR-urile liniei: 0126–0129, apoi
0160–0169. Owner-ul a redenumit sesiunea pe 03.11.2026: **„plugin 2d- lego 3d”** (înainte „Trenuleț ca extensie a lui
cvs2”, `local_2102ddb4-a2b7-44fd-88f5-d8b2e5dc1353`). S-a schimbat doar numele sesiunii: ramura, dosarul `extensii/trenulet/`
și id-ul extensiei au rămas `trenulet`. **Ramura stă doar pe discul ăsta, în afara Drive-ului:** pe 04.11, la curățenia
worktree-urilor, i-am făcut o copie privată, `Apps\cncvs2-arhiva\trenulet-2026-11-04.bundle` (`d9cba19`, după 3.Td); se
reface la cerere (`git bundle create … refs/heads/wip/trenulet`).

Deciziile owner-ului din 02.11.2026 (scrise și în `CLAUDE.md` de pe ramură, „Decizii luate”):
- „nu vreau sa fie prezent in softul vanilla, vreau sa fie instalat din link. sau dintr-un zip”: extensia nu intră în
  aplicație. Codul ei stă în repo (`extensii/<id>/`), construit separat ca `.zip`. Meniul Extensii e discret, lângă marcă.
- „eu vreau ca softul plug-inului sa poata folosi senderul din cvs2”, apoi „Da, ca recomandat”: **cadru izolat** (iframe cu
  sandbox, fără originea aplicației) și senderul doar prin `HostApi`. Pornirea și reluarea cer confirmarea omului într-o
  fereastră a lui cvs2; pauza și oprirea merg direct; jog, zero, palpare, deblocare și setări rămân în panou.
- **CSP aprobat:** `blob:` și amprenta încărcătorului în `script-src`, `https:` în `connect-src` (instalarea de la orice
  adresă HTTPS, „cum recomanzi tu”).
- Restul, pe recomandări: întâi primirea (protocolul „cvs2-lucrare” v1), ieșirea CNC prin planșe cvs2, contractele
  atelierelor din cvs2, Manifold (cere `'wasm-unsafe-eval'`, de întrebat la E6), pagina de pe claude.ai rămâne.
  **Repo-ul e public:** sursele planificatorului se reconfirmă înaintea primului push care le aduce (E2).

Feliile:
- **3.S** (primirea, ADR 0126) gata;
- **3.Xa** (gazda extensiilor, ADR 0127) gata;
- **3.Xb** (stocarea și catalogul permisiunilor, ADR 0128) gata pe 03.11;
- **3.Ta** (E2a, ADR 0129, ultimul număr din interval) pe 03.11: sursele v18 în `extensii/trenulet/sursa/` (de acum se
  schimbă în repo), `scripts/construieste-trenulet.ts` în locul lui `build.py` (pagina octet cu octet ca v18), adaptoarele
  din `extensii/trenulet/intrare.ts`, permisiunea `descarcari`. Pachetul se dă owner-ului ca fișier (nu pe canal: sursele);
- toate pe canalul `trenulet`: <https://cncvectorstudio-test--trenulet-yt9jx0eo.web.app>, până pe 03.12;
- **3.Xc** (fereastra extensiei și senderul în `HostApi`) gata pe 03.11, după „Main + 3.Xc (senderul)”: `main` cu 13.A↑
  adus în ramură (`7681cd8`), felia `2517e29` … `25d670e`, cu ADR 0160 (provizoriul 0199 înlocuit în `d9ff422`). Ramura
  conține și 5.9↑ pașii 1–3 din `main` local (`75e9b47`), încă nepublicați pe origin. Pe scurt:
  - fereastra extensiei: o filă după cele ale aranjamentului, pusă de gazdă (nu în `aranjament.ferestre`), cu ×;
  - permisiunea `masina`, oprită pe live; pornirea și reluarea cer confirmarea omului (`ConfirmareMasina`, butonul activ după
    o secundă); logica, fără React, în `src/app/masinaExtensii.ts` (`invelisMasina`);
  - „Trimite la cvs2” din planificator, printr-o fereastră imitată (`MessagePort`) în `intrare.ts`; pachetul 18.1.0;
- **3.Tb** (sursele adaptate pentru cvs2, ADR 0161) gata pe 03.11, „Da, pornește 3.Tb”: `window.cvs2` pus de intrare,
  aceleași surse pentru claude.ai / copia de pe PC / extensie; **sursele n-au atribute `style`** (o probă le oprește; culorile
  din date prin CSSOM, `data-fundal`); „Pe mașină, prin cvs2” în exportul CNC; `referinte.js --compara` în poarta unitară;
  pagina nu mai e v18 octet cu octet. Pachetul 18.2.0;
- **3.Tc** (sursele în TypeScript, ADR 0162) pe 04.11, „Sursele în TypeScript”: cele șase surse sunt `.ts`, **scripturi
  clasice, nu module**, cu proiectul lor de tipuri (`extensii/trenulet/sursa/tsconfig.json`, `exclude: []`, `types: []`;
  rădăcina are `exclude: ["extensii/trenulet/sursa"]`); construcția și `teste/incarca.js` șterg tipurile
  (`stripTypeScriptTypes`); exportul ca `var X = (function (glob: typeof globalThis) {…})(…)` (fără adnotarea lui `glob`,
  tipurile TrenCNC ↔ TrenGCode se închid în cerc: TS7022); `globale.d.ts` (Cavalier, earcut, three.js doar tipuri,
  `window.claude`, `window.cvs2`). Dovada: arborele acorn identic cu `.js`-ul de la `b2ad915`. Pachetul 18.2.1; `build.py`
  scos. Motoarele în `781803f`;
- **3.Td** (three.js în pachet, ADR 0163) pe 04.11, „Da, descarcă”: r128 de pe cdnjs în `vendor/three.min.js`, octet cu
  octet (SHA-512 = SRI-ul cdnjs, fixat în `trenulet.test.ts`; `eol=lf` îl ține stabil), cu `three.LICENSE`; în pachet
  `js/three.js` + `licente/three.txt`, nu în pagina de sine stătătoare; `window.cvs2.three()` îl aduce la prima intrare în 3D
  (script clasic din `blob:`, CSP neschimbat). Pachetul 18.3.0 (~370 kB). O versiune nouă de three.js = acord nou + amprentă;
- **3.Xd** (pluginul ca parte din cvs2, ADR 0164) pe 04.11, „Da, pornește A”: `JETOANE_TEMA` + `--font`, `--mono`,
  `color-scheme` (16); planificatorul pune `data-gazda="cvs2"` + `data-theme` și leagă de ele suprafețele, textul, marginile,
  roșul, inelul de focus, fonturile (masa, lemnul, cărămizile, verdele, butoanele principale rămân ale lui). Permisiunea
  `cont`: `host.cont` = conectat / nume / plan de la zi (`src/extensii/cont.ts`; fără adresă, uid; adresa neconfirmată =
  nume gol + plan null), în context, cu `aboneazaCont`. `host.nesalvat` + `host.laInchidere`: × (și altă extensie, o
  versiune nouă) cere salvările, ≤ 5 s, și întreabă („Rămân” / „Închide oricum”) doar ce rămâne; `beforeunload`. Planificatorul:
  salvările amânate prin `window.cvs2.amana` (o salvare amânată NOUĂ trebuie să treacă tot pe acolo). Capcană: focusul după
  un dialog modal se pune după ce aplicația nu mai e inertă: `onModal(false)` în ACELAȘI clic, apoi `setTimeout(focus)`
  (un efect care cheamă `onModal` vine prea târziu). Pachetul 18.4.0; commit-uri `66edbd2`…`9fee4dd`; otrăvuri 36/36, canal 20/20;
- **3.Te** (planificatorul în engleză, ADR 0165) pe 04.11, „Engleza”: româna rămâne în cod; engleza din
  `planificator/texte.en.json` (~1 070 de texte; doar în pachet, adus doar în engleză, `window.TexteEN` înghețat).
  `planificator/limba.ts` (primul script): `tr` (șir; șablon cu cheia `{0}`, `{1}`…; context `tr("placă", "pat")` →
  „placă@pat” întâi) pentru textele cu valori și cele din afara paginii; textele fixe se traduc PE PAGINĂ (`Limba.urmareste`,
  MutationObserver), ca etichetele care sunt și chei în cod („dreapta”) să nu strice logica. `Limba.zecimal` / `Limba.locala`
  (un `.replace(".", ",")` nou trebuie să le folosească). La o limbă nouă: `lucru.goleste()`, apoi `host.reporneste()` (nou în
  HostApi v1; cvs2: cel mult o dată la 2 s, cererile dese ADUNATE, nu refuzate). **Un text nou pentru om:** fix pe pagină =
  nimic de făcut; cu valori sau în afara paginii = `tr`; apoi `node scripts/texte-trenulet.ts` și traducerea în
  `texte.en.json` (proba `trenulet.engleza` cade până atunci). G-code, nume de fișiere (în afară de README), antete STL și
  pagina de sine stătătoare rămân în română. TS 7 n-are API clasic: unealta citește cu `parseAst` din Vite. Pagina traduce
  doar noduri de text ÎNTREGI: un cuvânt lipit de o valoare trece prin `tr` (`compuseNetraduse` din unealtă îl găsește), iar
  etichetele de un cuvânt fără diacritice („Pod”, „Grila:”) le cere `CUVANT`. Pachetul 18.5.0; commit-uri `afd2be8`,
  `ce3a28b`, `30e1a5b`;
- **3.Xe** (formele între cvs2 și plugin, ADR 0166) pe 05.11, „B, schimbul de forme”, apoi „Da, fă-o” la schiță: permisiunea
  `forme`. Din desen: acțiunea `extensii.trimite-selectia` („Trimite la <extensie>”, bara selecției + paleta, doar cu o
  extensie care primește forme), contururile din `src/extensii/formeSelectie.ts` (mm ai foii, 0,02 mm, plafoane), la
  `host.forme.laPrimire`. Spre desen: `host.forme.propune(nume, date)` (SVG / DXF) → fereastra Importă pe Proiectare, „Propus
  de”; nimic fără „Importă”. Planificatorul: fila „Din cvs2” (`dinCvs2` în motorul LEGO, găurile după cuprindere) și „În
  desenul cvs2” la plăcile exportului. Pachetul 18.6.0; commit `6817b17`;
- **3.Tf** (numele, ADR 0167) pe 05.11, „o sa vreau ca plugin-ul sa se numeasca Easy 3Draw”: manifestul (18.7.0) și
  planificatorul (titlul, antetele README-urilor, sfatul filei „Din cvs2”, `de_la.aplicatie`); „Easy 3Draw” în `PASTRATE`;
  scutirea lui „Trenuleț” din verificarea românei rămase a ieșit. Proba actualizării pornește de la pachetul VECHI cu id-ul
  fixat (`trenulet`): derivat din cel nou, ar fi luat și id-ul nou și n-ar fi văzut schimbarea lui. Commit `c7251a3`;
- rămase: salvarea în cont (felii C/D, cu sesiunea principală); senderul K1C (E); știfturi LEGO pe o formă liberă; semnul
  Easy 3Draw din bară (cu schiță); cele 1 785 de `!` din surse pot deveni gărzi, cu probele lor; ADR-ul următor liber în
  bloc: 0168.

**Unită în `main` pe 06.11** (sesiunea principală, „Yes, merge it”): unirea `f6150ff`, împinsă cu `d2fd3ab`; sursele
pluginului și three.js sunt publice; totalul trecea de 500 kB (503,1), deci plafonul e acum 550 kB (ADR 0137, „Yes, 550 kB”).
Curățenia worktree-ului (întâi joncțiunile) și ștergerea ramurii locale `wip/trenulet` așteaptă cuvântul owner-ului.

**Linia s-a încheiat pe 05.11** (owner, după 3.Tf): „Aici nu mai facem nimic, am terminat si vom face unirea cu main”. Unirea
o face sesiunea principală: ramura e în `Apps\cncvs2\.git` (vârful `6634ea6`, baza comună cu `main` `75e9b47`). Înainte de
push, owner-ul reconfirmă publicarea surselor pluginului și a lui three.js (repo public). După unire, curățenia worktree-ului:
întâi joncțiunile `node_modules` și `functions\node_modules`, apoi `git worktree remove --force`. Pașii, conflictele de
așteptat și verificările stau în nota comună `trenulet-worktree.md`, secțiunea „Gata de unire”. Ce a rămas de mai sus
devine felii noi, pornite din `main`.

**Direcția (04.11, owner):** pluginul nu mai e doar planificatorul 2D: devine un atelier de forme 3D custom pentru
imprimare (LEGO, continuat; un modul pentru huse de telefon; altele de felul ăsta). **Întâi „comunicarea perfectă” cvs2 ↔
plugin**, apoi modulele; userii vor salva modelele din plugin **în contul lor cvs2**. De știut: cvs2 n-are încă nimic în cont
(proiectele stau în IndexedDB, ADR 0016); „copiile proiectelor în cloud” sunt planificate în `PLAN.md` (decizia 11, etapa
14–15, `src/cloud/`), deci salvarea în cont trebuie construită o dată, pentru cvs2 și extensii, în acord cu sesiunea
principală (regulile și funcțiile de pe test sunt comune). `id`-ul extensiei (`trenulet`) ține cheile datelor: nu se schimbă.

**Why:** owner-ul vrea un singur sender și cod nedublat, dar și interfața de bază curată.

**How to apply:** o extensie nu vede nimic din cvs2 în afară de `HostApi`. Orice serviciu nou primește o permisiune în
`CATALOG_PERMISIUNI` (`src/extensii/pachet.ts`) și o cerere în `cadru.ts`. O schimbare a textului încărcătorului cere
amprenta nouă (proba `csp.extensii`). Stilurile în cadru vin ca foi construite: `<style>` și atributele `style` sunt
refuzate de CSP-ul moștenit.

**Worktree-ul scos (08.11)**, la „dupa ce verifici care worktree a terminat si a fost integrat in maine, vreau sa inchizi tu acel worktree si sa il arhivezi”: `cncvs2-lucru\trenulet` (joncțiunile întâi; `.git/worktrees/trenulet` a rămas ReadOnly și s-a curățat de mână), ramura locală `wip/trenulet` ștearsă (pe `origin` nu mai era; copia privată stă în `Apps\cncvs2-arhiva\`). Sesiunea „plugin 2d- lego 3d” era deja arhivată.

**18.8.0, felia 3.Tg (08.11, ADR 0168, în `main`, pe test cu `b56f0e1`):** înălțimile pieselor LEGO în profilul fiecărei imprimante, la zecimi: știftul `stift_h` 1,9 mm, locașul de sub piesele pline `locas_h` 2,1 mm (bifa „Urmează știftul (+ 0,2)”), alese de owner („Defaults 1.9 / 2.1”). **Regulile doar în `Lego.inaltimi(profil)`** (zecimile, marginile, legătura, profilul vechi); atelierul citește profilul prin ea. **`referinte.js` rulează cu `V18` = înălțimile lui v18 fixate** (622 / 0 diferite): o schimbare a implicitelor nu atinge referințele. Plăcile de calibrare noi: 1,7–2,1 mm. **Capcană:** un `texte.en.json` rescris din Python (`json.dumps`) e reformatat tot; după completare, rulează `node scripts/texte-trenulet.ts`, care îl scrie în formatul lui (diff-ul revine la rândurile noi).
