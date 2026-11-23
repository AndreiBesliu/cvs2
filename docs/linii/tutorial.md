# Tutorial + snapshot + taste + roadmap

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2 — 25.10: testul owner-ului ca TUTORIAL în aplicație + buton snapshot al planșei (local, atașat la raport, NU pe server); tasta fiecărei unelte în colțul dreapta-jos al butonului_

Pe 25.10.2026, în timp ce lucram la buzunar (felia 5.1↑), owner-ul (Andrei) a cerut:
„vreau ca testarea asta sa fie ca un tutorial direct in app. vreau si un buton cu care sa pot face snapshot la plansa. aceasta imagine se ataseaza automat la raportul pe care ti-l voi da la final. deci nu ar trebui sa fie incarcata in server. dar, termina ce task ai inceput acum. si, noteaza ca vreau ca fiecare unealta sa aiba tasta de shortcut in coltul dreapta jos al butonului, langa iconita ei, fara sa o deranjeze cumva”

**Why:** testul pas cu pas din artifact ([Testul owner-ului după desen](test-owner-dupa-desen.md)) îl scoate din aplicație; vrea pașii acolo unde lucrează, cu dovezi vizuale (poze ale planșei) puse automat în raportul final, fără nimic urcat pe server.

**How to apply:**
1. DUPĂ ce buzunarul e gata (commit, CI, canal): felia „tutorialul de test în aplicație” — pașii (cei 31 din artifact), Bine / Nu / Sărit + notă, butonul **Snapshot** al planșei (imaginea pânzei, ținută LOCAL, în IndexedDB), raportul final (rezultatele + notele + pozele) generat local, dat de owner mie (descărcat ca fișier); nimic pe server. Întreabă înainte doar ce e vizual / unde stă (buton, panou), cu implicitul recomandat în față („Liste pentru Andrei”).
2. **Notat, de făcut** (fără termen spus): fiecare unealtă are tasta ei de scurtătură în colțul dreapta-jos al butonului, lângă iconiță, fără s-o încurce (badge mic). Atenție la pornire (bugetul 100 kB: după ADR 0070 sunt ~1,4 kB liberi).
Vezi [sesiunea principală](principala.md).

**25.10, ~14:55, încă o cerere:** „dupa test, sa actualizezi si zona asta din roadmap” (captura: /admin → Roadmap → „Timeline, by week”, etapele 1–30). De făcut DUPĂ testul owner-ului: cronologia nu arată feliile aduse înainte (4.2↑, 4.3↑, 4.5↑, 4.7↑ din etapa 4; 5.1↑ buzunarul din etapa 5; 6.A↑–6.N↑ editorul din etapa 6; 14.A↑ personalul), fiindcă stau doar în jurnalul fișei etapei 3; etapele 4, 5, 6, 14 trebuie să-și arate partea făcută (generatorul: `scripts/documentatie.ts`, starea dedusă din fișe, ADR 0048).

**25.10, ~16:40: punctul 1 (tutorialul + snapshot) GATA** — ADR 0072, `c0d2806`, pe canalul buzunar. Rămân: cronologia roadmap-ului (după test) și tastele în colțul butoanelor.

**25.10, ~16:40, decizia owner-ului:** „Ma gandesc sa folosim acest test/tutorial si pe viitor, in aplicatia live, exact ca un turorial. Ceva care sa ajute userii sa lucreze cu aplicatia. Asa ca, nu trebuie sa pierdem codul asta. Va fi repurposed”. **How to apply:** NU șterge codul ADR 0072 (TestPasCuPas, pozaPlansei, raportTest, stocareTest, scripts/tutorial.ts, docs/tutorial/) la nicio curățenie; tutorialul pe live = felie separată (pași în engleză, buton și pe live, precache + buget decise atunci). Testul se face pe adresa PRINCIPALĂ de test (publicată 25.10 seara).

**09.11, lecție (linia ancorelor, 6.V↑d):** un pas nou inserat în testul din aplicație mută numerele tuturor pașilor de după el; coada owner-ului din fișa etapei 3 trimitea încă la „pașii 10, 11, 12” (corectați de sesiunea principală la 11, 12, 13). **How to apply:** în fișă și în rapoarte, pașii se numesc după titlu („Mânerele”, „Ancora”), cu numărul doar alături, și la orice pas nou se caută în fișă și în coada owner-ului numerele de după el.
