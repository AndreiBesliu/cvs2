# Conectarea ca module

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_Direcția owner-ului (07.11.2026) pentru cvs2: după propunerile de acum, pregătirea extinsă a fișierelor pentru multe mașini (CNC, laser, imprimante 3D și altele) și conectarea ca module (pluginuri) activate sau descărcate după ce folosește fiecare client_

Owner, 07.11.2026 (în sesiunea liniei imprimantei): „cand vom termina o mare parte sau tot ce ne-am propus momentan, vom face
un sistem de slice extins care sa poata pregati fisierele de executat, pentru o multitudine de masini (cnc, laser, printere [3d
sau altele]). [...] multi useri nu vor folosi toate astea. asa ca ma gandesc ca sistemul de conectare al cvs2 sa fie si el un
plugin modular, care descarca sau activeaza sisteme de conectare pe care userii/clientii respectivi chiar le folosesc.”

**Why:** cvs2 crește (sender GRBL, WiFi, imprimanta 3D, felierea pieselor plate, laser...), iar plafonul de 550 kB (totul în
precache) se umple; un client doar cu imprimantă 3D n-are nevoie de sender, unul doar cu CNC n-are nevoie de imprimantă.

**How to apply:** e pentru **după** propunerile acceptate acum (nu de început înainte), ca o linie a ei, cu sesiunea
principală (atinge nucleul, extensiile din ADR 0127, bugetul și precache-ul). Până atunci, codul nou pentru mașini se scrie
**gata de mutat într-un modul**: în directorul lui (`src/machine/imprimanta/`, de exemplu), încărcat la cerere, fără importuri
din el în nucleu. Ține de [sesiunea principală](principala.md) și [Imprimanta 3D (K1C)](imprimanta.md).
