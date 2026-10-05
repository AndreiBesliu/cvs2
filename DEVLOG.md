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
