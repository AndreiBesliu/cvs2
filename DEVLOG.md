# DEVLOG — CNC Vector Studio, ediția a doua

Jurnal append-only. Regulile și faptele stabile stau în `CLAUDE.md`, nu aici.

## 2026-10-05 — Inițierea proiectului (Model: Claude Opus 5.5)

**Prompt:** `docs/PROMPT-START.md`, exact, cu motivul repornirii completat: progresul devenise prea greu, iar
procesul de dezvoltare părea haotic.

**Făcut:**
- Repo nou în `C:\dev\cncvs2` (în afara Google Drive), git local pe `main`, fără remote încă.
- `ACOPERIRE-ARTCAM-DESKPROTO.md` copiat din `PlanNou-CNC`. Am adăugat coloanele Stare și Commit pe toate
  cele 87 de rânduri de capabilitate (toate „de făcut”), adică exact cele 87 din `ref.capabilities` din JSON.
  Textul din afara tabelelor a rămas identic cu originalul, iar fișierul a trecut de la CRLF la LF.
- `CLAUDE.md` cu regulile de lucru din prompt și starea curentă.
- `docs/FAZA0-PLAN.md`: planul de lectură pentru LECTII.md, cu cifrele cartografierii, costul (~31 de agenți,
  ~8 M tokeni) și durata estimată (1,5–2 h).

**Nepornit:** Faza 0. Owner-ul a amânat-o pentru a doua zi; pornește cu acordul lui și cu cifrele din
panoul de utilizare.

## 2026-10-05 — Repo-ul mutat în `MyWork\Apps\cncvs2` (Model: Claude Opus 5.5)

**Prompt:** „totusi, o sa vreau sa lucram aici: C:\Users\besli\Desktop\MyWork\Apps”. Am întrebat ce înseamnă,
iar owner-ul a ales: proiectul se mută în `Apps\cncvs2`, deci în Google Drive.

**Făcut:** am mutat `C:\dev\cncvs2` cu tot cu `.git`, iar istoricul a rămas intact (`5933051`). Am șters
`C:\dev`, care rămăsese gol. În `CLAUDE.md`, regula „codul stă în afara Google Drive” a fost înlocuită de
decizia nouă și de plasa ei: git e sursa de adevăr, cu push pe GitHub după fiecare felie, de îndată ce
există remote.

## 2026-10-06 — Faza 0: LECTII.md (Model: Claude Opus 5.5)

**Prompt:** „neata! Go!”. Owner-ul a ales varianta completă (31 de agenți), rulată în două tranșe din cauza
utilizării (40–60 %), și a confirmat tranșa a doua după prima.

**Făcut:**
- `LECTII.md`, cu cele cinci părți cerute (inventar, defecte și cauze, ce merită păstrat, arhitectura altfel,
  planșele), plus §2.3 („de ce a devenit greu și haotic”), §6 (corecturile la JSON) și §7 (ce ajunge la
  interviu).
- Rapoartele cu surse sunt în `docs/faza0/`:
  - 00: metricile din git;
  - 01–13: modulele;
  - 14–15: planșele;
  - 21–28: cronologia completă a DEVLOG-ului;
  - 31–36: verificarea adversarială a `old.lessons`, `old.metrics` și `old.decisions`;
  - 40: toate corecturile la JSON;
  - 41–42: criticii ciornei.
- Metricile mele din git au fost corectate de cronologie: fișierul temporar din W24 și artefactul `git add -A`
  din W30.
- După fiecare tranșă am verificat proiectul vechi: neatins de fiecare dată (HEAD `d850c7b`, arbore curat).

**Măsurat** (pentru estimările viitoare):

| Tranșa | Agenți | Tokeni | Durată | Estimat |
|---|---:|---:|---:|---:|
| 1 (module + planșe) | 15 | 5,73 M | 27 min | 4,5 M |
| 2 (cronologie + verificare) | 14 | 3,96 M | 12 min | 5,2 M |
| critici | 2 | 0,61 M | 12 min | 0,6 M |
| **Total** | **31** | **10,3 M** | **~51 min de workflow** | **8 M inițial (7–10 M), 11,5 M revizuit după tranșa 1** |

Sinteza și corecturile le-am făcut în conversația principală, fără agenți.

**Următorul pas:** Faza 1, interviul. Pornește de la `LECTII.md` §7.

## 2026-10-06 — Faza 1: interviul (Model: Claude Opus 5.5)

**Prompt:** „acum”, după oferta de a porni interviul. Au fost șapte tranșe de întrebări, plus două formulare de
triaj; răspunsurile au venit pe rând.

**Făcut:**
- `BRIEF.md` completat cu toate deciziile:
  - produsul, felul de lucru, platforma, partea comercială;
  - infrastructura, mașinile, simularea, planșele;
  - triajul funcțiilor și ordinea pragului.
- `ACOPERIRE-ARTCAM-DESKPROTO.md`: etapele a 48 de rânduri schimbate prin decizia owner-ului, fiecare marcată
  „decis 06.10; era …”. v1 are acum 64 de rânduri, față de 22.
- `CLAUDE.md`: Faza 1 e încheiată și are un rezumat al deciziilor.
- Repo-ul public `AndreiBesliu/cvs2`: `docs/faza0` a fost scos din istorie înainte de primul push și e ignorat
  de git.
- Proiectul vechi: ramura goală `laterala` ștearsă, cu acordul owner-ului.

**Următorul pas:** Faza 2, arhitectura în plan mode, cu prototipul planșelor (A și D) înainte de aprobare.
