# Faza 0: planul de lectură pentru LECTII.md

Propus pe 05.10.2026 și **nepornit**: owner-ul a amânat pornirea pentru a doua zi. Înainte de pornire e nevoie
de două lucruri:

1. acordul owner-ului pe variantă (completă / medie / ușoară, vezi mai jos);
2. cifrele din panoul lui de utilizare: cât a rămas din fereastra curentă și când se resetează. Peste 60 %
   se rulează totul o dată; între 40 și 60 % se rulează în două tranșe; sub 40 % se așteaptă resetarea.

## Ce produce

`LECTII.md`, în rădăcina repo-ului, cu cele cinci părți din prompt:

1. inventarul de funcții pe module, cu cât de bine mergea fiecare;
2. defectele de la audituri și cauzele lor de fond, mai ales cele de arhitectură;
3. ce a mers bine: oracolele fizice, porțile test → live, instanța de test, plafoanele pe uși, registrul de
   restanțe;
4. ce aș face altfel în arhitectură și de ce;
5. separat, sistemul de planșe: cum funcționa, ce probleme a avut, variantele posibile.

Owner-ul a dat și motivul repornirii: progresul devenise prea greu, iar procesul părea haotic. De aceea
LECTII.md trebuie să răspundă explicit și la întrebarea **de ce s-a întâmplat asta**, nu doar ce defecte
au existat. Documentul trage concluzii, nu transcrie. Owner-ul primește apoi o prezentare scurtă.

## Ce am găsit la cartografiere (05.10.2026)

| | |
|---|---|
| Proiectul vechi | `CNCVectorStudio`, HEAD `d850c7b` pe `main` (03.10.2026), arbore curat |
| Istoric | 1 009 commit-uri, între 30.05 și 03.10.2026. Pe lună: 52 · 356 · 111 · 145 · 344 · 1 |
| Cod | 380 de fișiere în `src/`, 111 099 de linii TS. Cele mai mari zone: `components` (26,9k), `canvas` (14,9k), `cam` (12,1k), `store` (9,5k), `export` (7,8k), `i18n` (7,5k), `import` (6,7k), `services` (5,6k), `machine` (5,5k), `geometry` (5,3k) |
| Teste | 326 de suite `scripts/test-*` (431 de fișiere în `scripts/`) |
| DEVLOG.md | 39 083 de linii (3,4 MB). Regulile, roadmap-ul și backlog-ul ocupă liniile 1–1744; restul, până la 39 083, e jurnalul de sesiuni |
| Registrul (`npm run stare`) | 335 de intrări: 235 închise, 50 deschise, 50 care așteaptă owner-ul |
| OWNER_VERIFY.md | 1 808 linii |
| Alte documente | `CLAUDE.md` (282 de linii), `AUDIT-2026-06-09.md`, `LAUNCH_SECURITY.md`, 17 documente în `docs/` |
| Ramura `wip/inlay-traseu-decupare` | un singur commit, `f4732ff`: 26 de fișiere, +2 840 / −253 de linii, poarta nerulată. Instrucțiunile sunt în `docs/WIP-inlay-traseu-decupare.md` de pe ramură |
| Ramura `laterala` | locală, un commit în plus față de `main` (`ba0ebca`); trebuie lămurit ce conține |
| `CERCETARE-DETALIATA.json` | `old`: 20 de lecții, 28 de rânduri de inventar, 27 de decizii, `boards`, 15 metrici · `spec`: 7 grupe · `ref`: 87 de capabilități · `arch`: 13 module, modelul de date, 13 etape, 14 riscuri, întrebările de interviu, glosarul |
| Memoria asistentului despre proiectul vechi | 11 fișiere `project_cncvs_*` și altele (~170 KB) în `~/.claude/projects/.../memory/` |

## Varianta recomandată: completă

Cele două zone de lucru nu au nevoie să se aștepte una pe alta, deci rulează în `pipeline`. Fiecare rezultat
se scrie pe disc, în `docs/faza0/`, imediat ce e gata: o tranșă căzută trebuie să coste doar tranșa ei.

**Cititori pe module (13).** Fiecare cititor citește:

- codul modulului lui și testele care îl acoperă;
- DEVLOG-ul, prin `grep` pe tema lui;
- intrările din registru din zona lui;
- secțiunile relevante din OWNER_VERIFY.md;
- memoria asistentului despre modul.

Fiecare întoarce, cu surse `fișier:linie` sau `sha`:

- funcțiile modulului și cât de bine mergea fiecare;
- defectele și cauza lor de fond;
- ce merită păstrat ca idee;
- ce ar face altfel;
- verdictul pe rândurile de inventar din JSON care țin de modulul lui.

Zonele:

1. nucleul geometric;
2. editorul și canvas-ul;
3. CAM 2D / 2.5D;
4. relieful 2.5D, STL-ul 3D și frezele cu profil;
5. simularea și oracolele;
6. exportul: G-code, post-procesoare, estimarea timpului, dale, ofertă;
7. mașina: sender, palpare, reluare;
8. importul și trasarea din imagine;
9. modelul de date și persistența: schema, migrări, salvare locală și în cloud, offline;
10. cloud-ul și partea comercială: cont, Stripe, funcții, reguli, App Check, admin, AI, erori, cost;
11. porțile și infrastructura de test: CI, poarta locală, test → live, mutații, bancul vizual, boot-smoke. Cititorul ăsta trebuie să răspundă și ce a mințit, nu doar ce a mers;
12. interfața: componente, i18n, accesibilitate, setări, asistent;
13. ramura `wip/inlay-traseu-decupare` (plus `laterala`).

**Planșe (2).**

- Istoria: arheologie în git și DEVLOG. Acoperă PanelShape, modelul Placă → Panouri → Vectori, cadrele, cele trei rescrieri ale șabloanelor, dosarele, grupurile, `rama-ca-grup` și Multi-Plate.
- Starea de azi: cum funcționează codul, ce probleme are pentru utilizator, ce variante există (inclusiv cum rezolvă ArtCAM Sheets / Multi-Plate și alte programe, doar ca referință funcțională), cu argumentele pro și contra.
- Ambii verifică secțiunea `old.boards` din JSON.

**Cronologia DEVLOG-ului (8).** Liniile 1–39 083, împărțite în 8 bucăți de ~4 700 de linii, tăiate la titluri
`## `. Fiecare cititor parcurge integral bucata lui și răspunde la întrebarea owner-ului: **ce a făcut
progresul greu și procesul haotic?**

Caută refaceri, felii care au depășit estimarea, porți care mințeau, defecte găsite târziu, timp consumat pe
infrastructură în locul produsului, decizii întoarse și semnale de haos. Fiecare semnal are sursă `linie`.

**Verificatori (6).** Încearcă să infirme afirmațiile din `old.lessons` (în 4 loturi de câte 5), `old.metrics` și
`old.decisions`, întorcându-se la sursele citate. Verdictul are un câmp separat pentru motivul respingerii:
domeniul, mecanismul sau adevărul. Numai respingerea pe adevăr închide o afirmație.

**Sinteza o scriu eu**, din rezultatele structurate. Fac și metricile deterministe din git: commit-uri pe
săptămână, după tip (funcție, reparație, teste, documentație), câte linii de DEVLOG revin la o linie de cod,
cum a crescut numărul de suite.

**Criticul (2), după ciornă.** Unul caută ce lipsește și ce afirmație n-are sursă; celălalt verifică prin
sondaj 10 afirmații din ciornă.

**Cost și durată:**

| | |
|---|---|
| Agenți | ~31 |
| Tokeni | ~8 M (interval 7–10 M). Baza: cititorii de subsistem au costat 250–300k în recenziile măsurate |
| Durată | workflow 45–60 min + sinteză și critic ~45 min ≈ 1,5–2 h. Estimare brută: nu există durate măsurate de workflow |

**Variantele mai ieftine:**

| Variantă | Ce face | Cost și durată |
|---|---|---|
| Medie | DEVLOG-ul se citește doar pe teme, fără parcurgerea cronologică; 4 verificatori | ~19 agenți, ~5 M, ~1–1,5 h |
| Ușoară | module comasate; verificarea JSON-ului o fac cititorii | ~9 agenți, ~2,5 M, ~1 h. Riscă să rateze cauzele de proces |

## Reguli pentru rulare

- **Agenții lucrează strict în citire pe proiectul vechi.** Au voie doar la `git log`, `git show`,
  `git diff <sha>` și `git -C <repo> branch`. Nicio comandă care scrie indexul (nici `git status`), nicio
  editare.
- **După workflow:** `git -C CNCVectorStudio status --short`, plus verificarea că `HEAD` e tot `d850c7b`.
  Mandatul din prompt nu e o garanție.
- **Înainte de pornire:** se reverifică starea proiectului vechi (HEAD, ramuri, arbore curat). Între timp
  poate fi lucrat din altă sesiune.
- **Coada tăiată:** dacă vreo etapă plafonează ce se verifică, se scrie în `log()` ce s-a tăiat, iar coada
  se citește din jurnal înainte de a declara verificarea închisă.
