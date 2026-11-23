# Testul owner-ului după desen

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2 — după ce terminăm uneltele de desen, owner-ul vrea un test de urmat pas cu pas (el raportează ce merge / ce nu)_

Pe 25.10.2026, owner-ul (Andrei) a cerut: „la un moment dat, o sa vreau sa imi faci un test pe care sa il urmez eu si sa iti spun ce a iesit bine si ce nu. Dar, asta dupa ce terminam cu uneltele de desen”.

**Why:** vrea să verifice el, cap-coadă, ce s-a construit în editor (feliile 6.A↑–6.J↑ și ce urmează), nu doar din rapoarte.

**How to apply:** când uneltele de desen sunt gata (etapa 6 adusă în etapa 3: desen, noduri, Pen, offset, transformări, copiere, aliniere, plus ce mai rămâne), propune-i testul: pași numerotați pe instanța de test (link), fiecare cu ce faci / ce trebuie să vezi, grupați pe unelte, cu loc de bifat „bine / nu”; în formatul listelor pentru owner („Liste pentru Andrei”: ce/cum/de ce, linkuri). Nu-l face înainte. Vezi [sesiunea principală](principala.md).

Decizia din 25.10 („Da”): ordinea e copierea de-a lungul unei curbe (gata, `dcfa572`) → booleanul (unire, scădere, intersecție) → testul.

**25.10, ~12:50: testul e PUBLICAT** — artifact privat <https://claude.ai/artifact/S4w78746bv7zLGAqzZixnw> (31 de pași, Bine / Nu / Sărit + notă; capabilitatea `db`, colecția `rezultate`, un document pe pas cu id-ul pasului: `{stare, nota, la}`). Citește-l cu `ArtifactData` `list` pe `rezultate`. Owner: „in timp ce eu voi face testul, vreau sa poti lucra la ce urmeaza” ⇒ cât testează, adresa principală de test NU se schimbă: feliile noi pe un CANAL de previzualizare (`node scripts/publica-canal.ts <canal>`), până spune că a terminat.
