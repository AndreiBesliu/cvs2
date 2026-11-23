# Elicele (3.Tq–3.Ts)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

**De pus la zi cu felia:** starea de mai jos e cea de pe 23.11 dimineața. Pilotul din cloud a corectat apoi cotele „Ca
LEGO”, măsurate față de axa piesei (`6fe77d8e`: Ø27,4 / 43,1 / 73,9).

_CNCVS2, elicele din Easy 3Draw (ADR 0282, ACCEPTAT 22.11 cu 1a, 2a, 3a): 3.Tq (elicea) în lucru pe `wip/3.Tq-elice` (worktree `rotite`), WIP `7f439bbf` la pauza din 22.11 seara; 23.11: main adus (`886e0c62`), restul la pilotul în cloud; apoi 3.Tr (barca), 3.Ts (carcasa); cotele LEGO măsurate din LDraw_

Cererea owner-ului, 22.11.2026: „Vreau ca pluginul sa faca si elice, pentru imprimanta, si sa fie si configurabile elicele si
compatibile cu lego”. Schița, cu răspunsurile în pagină: <https://claude.ai/artifact/CNQtNLBfAXxrMqQ3L4RebT>. Răspunsul, în
chat: „1a, 2a, 3a” = fila nouă „Elice” (id-ul familiei `propulsie`, fiindcă id-ul unei familii nu poate fi un tip), elicea
întâi, cotele din LDraw (descărcarea aprobată).

**Cotele LEGO** (unelte noi: `unelte/ldraw/elice_masura.py`, cu unghiul pe direcția principală (PCA) a secțiunii cilindrice,
nu regresie; `elice_desfasurata.py`, banda cilindrică în ASCII):
- butucul LEGO e Ø8 × 8, cu gaura de ax sau de știft Ø4,8; 92842 are Ø7,2;
- paletele LEGO sunt PLATE, cu unghi constant (15790: 14°, 92842: ≈15°, 6041: 23°), nu cu pas constant;
- diametrul din nume e aproximativ: 15790 („9”) are 83,3; 6041 („3,5”) are 30,2; 92842 („5,5”) are 48,5;
- 41530 nu e o elice: are 8 pereți drepți, paraleli cu axa (roată cu palete), cu butucul Ø13. E reperul pentru 3.Ts.

**Motorul** (`elice` în `lego.ts`, `eliceCote` exportat): secțiunile trase de la r 3,6 (în butuc) la R, fiecare cu
punctul cel mai de jos pe masă. Paleta e „răsucită” (β = atan(P / 2πr)) sau „plată” (β de la 70 % din rază, ca la LEGO).
Profilul e placă curbată sau NACA 4412. Butucul are înălțimea max(8, înălțimea paletei la rădăcină). Coarda e limitată
pe secțiunea REALĂ, cu grosimea ei, la 85 % din pasul dintre palete. Proba a găsit că limita doar pe coardă lăsa paletele
să se atingă la 8 palete; reparat. „Ca LEGO” e în `atelier.ts` (`ELICE_LEGO`, pasul = π · 0,7 · tan β).

**Starea la pauză (22.11 seara):** comise `5fae24a7` (ADR acceptat), `894bb882` (motorul + 7 probe unitare), `7f439bbf`
(WIP: atelierul, 31 de texte EN, e2e 3 + filele + engleza). Verde: unitarele pluginului 125 / 125, e2e-ul pluginului 42 / 42.
**De făcut, în ordine:**
1. Adu `main` după ce intră galeria (3.Tp↑b, `PICTOGRAME`) și pune pictograma elicei (o probă unitară o cere).
2. Versiunea 18.19.0 (galeria ia 18.18.0) în 3 fișiere, apoi `biblioteca.ts --scrie` după ULTIMA schimbare.
3. Lista de otrăvuri `test/otravuri/3.Tq.py` (clona `otravuri-3Tj`).
4. Porțile, privirea pe piesa reală (`.tmp/senila/randare-ldraw.mts motor:{…}`, capturile atelierului), documentele, unirea.

**23.11, dimineața (sesiunea principală):** pasul 1 făcut. `main` adus în ramură (`886e0c62`, împinsă): ciocnirea doar în
indexul ADR (0281 din main, 0282 din ramură); pictograma elicei (trei pale curbate, privită la 18 px și 2x). Probat: tipurile,
unitarele 144 / 145 (cade doar versiunea), e2e-ul atelierului 26 / 26. Pașii 2–4 trec la PILOTUL în cloud (brief în
`Apps\cncvs2-pilot-elice-cloud.md`, pornit de owner); DEVLOG-ul feliei: Started 22.11, 21:54 (răspunsul „1a, 2a, 3a”).

Vezi [Roți, fulii, conice, șenila (3.Tj–3.To)](roti-senile.md), „Autoconsistența”.
