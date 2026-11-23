# Rotițele dințate (3.Th)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, felia 3.Th: rotițele dințate în atelierul Easy 3Draw (ADR 0169, acceptat 1a+2a, implementat, UNITĂ în main 18.11 `7d9f6888`); Easy 3Draw 18.9.1; otrăvuri 30/30; peretele găurii reparat după privirea pe roata reală_

Felia **3.Th** a pluginului Easy 3Draw (linia [Trenuleț ca extensie](trenulet.md)): roți dințate în atelierul 3D, la cererea
owner-ului din 18.11.2026 („vreau sa pot face si rotite zimtate, ori drepte ori oblice (la marginea zimtata)”). Propunerea
s-a făcut în sesiunea principală (owner-ul era pe Remote Control, deci fără sesiune nouă).

- **Ramura și worktree-ul:** `wip/3.Th-rotite` (împinsă, `259dc03e`), worktree-ul `C:\Users\besli\cncvs2-lucru\rotite`, cu
  joncțiunile `node_modules` (rădăcina și `functions`) spre checkout-ul principal.
- **ADR 0169, acceptat** („Da, cu recomandările”: 1a, 2a) **și implementat** (`64cd3042`, pachetul 18.9.0), ultimul număr al liniei 0160–0169; feliile următoare ale pluginului iau **0280–0289**.
- **Prototipul:** `C:\Users\besli\cncvs2-lucru\unelte\proto-rotite\proto-rotite.mts`: profilul evolventic generat de
  cremaliera de referință (subtăierea la 8 dinți iese singură), angrenarea a 13 perechi LEGO (modulul 1) fără pătrunderi,
  jocul normal 0,188 mm, plasa închisă la drepți, oblici și în V, gaura de ax dreaptă. Capcana găsită: pe cercul de picior,
  vârful cremalierei doar atinge cercul, deci razele pornesc puțin deasupra lui (altfel puncte dublate, plasa deschisă).
- **Schița:** <https://claude.ai/artifact/K7CMJUfim5wHZ4JTpK1qPX>, cu generatorul în pagină; răspunsurile în baza ei,
  `raspunsuri/owner` (goală la publicare). Întrebările: 1a roți de angrenaj / 1b și rotițe moletate (3.Ti); 2a roată de
  probă la calibrare / 2b câmp „Jocul” la fiecare roată. Recomandările: 1a, 2a.

**Why:** codul pornește doar după răspunsuri; restul variantelor (drepți, oblici, în V, cele trei găuri, modulul, perechea)
intră fără întrebare, după [„Toate opțiunile”](lectii.md#feedback-toate-optiunile).

**How to apply:** la răspuns, citește `raspunsuri/owner` din schiță (sau cuvântul owner-ului din conversație), trece ADR-ul
la „acceptat” și implementează în worktree-ul `rotite`, cu porțile, otrăvurile și canalul, ca orice felie; unirea în main,
prin sesiunea principală.

**Starea (18.11, 16:30):** codul în `02258a69` (motorul), `0047723e` (atelierul), `86137e10` (pachetul, e2e), `14f0c092`
(probe, otrăvuri), `64cd3042` (ADR acceptat). Unitare 8, e2e 3 (`trenulet.rotite.spec.ts`), otrăvuri **27 / 27** (clona
`otravuri-3Th`, în afara Drive-ului). Capcane prinse de probe: coarda capului scurta diametrul (mijlocul capului în contur);
la jocul 0,15 jocul minim al perechii e la picior (0,25 · m), nu pe flanc; obiectele din realm-ul `vm` cer o trecere prin
JSON înainte de `deepEqual`. Rămase: porțile pe ramură, `documente_3Th_gata.py` (fișa, coada owner-ului, DEVLOG),
traducerile, canalul `rotite`, push, unirea prin `unire`.

**Unită (18.11, 20:00):** după privirea pe roata reală (capturi 3D și perechi mărite: angrenarea 0,257–0,283 mm, fără pătrunderi), două defecte ale găurii, reparate în `78c299c2`: la roata de 8 cu gaură de ax, colțurile crucii cădeau sub goluri (0,036 mm de perete, avertismentul spunea 0,25 din raze); la modulul 0,5 cu 8 sau 12 dinți, gaura ieșea din roată (STL deschis). Acum `pereteGaura` (peretele pe contur), crucea rotită spre goluri sub 0,8 mm (0,23 mm la roata de 8), fără gaură sub 0,1 mm. Pachetul 18.9.1 (conținut nou cere versiune nouă: `biblioteca.ts --scrie` refuză altfel). Otrăvurile 30 / 30 pe codul final (U19–U21 noi, U12–U13 mutate). Unită în main în `7d9f6888`; canalul `rotite` servește `6e7dda2e`. Rămas la owner: printarea setului de calibrare cu cele cinci roți și o pereche pe o grindă LEGO. De propus după printare, dacă roata de 8 iese slabă (0,23 mm): profilul deplasat la roțile mici (felie nouă, ADR din 0280–0289).
