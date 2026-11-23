# Elicele (3.Tq–3.Ts)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, elicele din Easy 3Draw (ADR 0282, ACCEPTAT 22.11 cu 1a, 2a, 3a): 3.Tq (elicea) GATA pe `wip/3.Tq-elice`, în sesiunea cloud a liniei (pilotul), Easy 3Draw 18.19.0, de unit de sesiunea principală; apoi 3.Tr (barca), 3.Ts (carcasa), la cuvântul owner-ului; cotele LEGO măsurate din LDraw, față de axa piesei_

## 3.Tq, gata (23.11, în cloud)

- **Ce are:** fila „Elice” (familia `propulsie`), elicea din parametri, „Ca LEGO” 6041 / 92842 / 15790, „Fă perechea”;
  Easy 3Draw 18.19.0. Probele: unitare 13 (`trenulet.elice.test.ts`), e2e 6 (`trenulet.elice.spec.ts`), fila Elice în proba
  în engleză din cvs2. Otrăvurile: `3.Tq.py` 138 / 138, `3.Tq-en.py` 4 / 4. Documentele: ADR 0282 („Corectura din 23.11”,
  „Implementarea”), fișa etapei 3, `docs/otravuri.md`, DEVLOG.
- **Cotele LEGO, corectate** (cele de mai jos, din 22.11, erau măsurate față de centrul cutiei): 6041 Ø27,4 (23°, pe
  STÂNGA), 92842 Ø43,1 (15°), 15790 Ø73,9 (15°); numele pieselor (3½, 5½, 9 știfturi) sunt bune. „Ca LEGO” pune și sensul.
- **Rămase, la cuvântul owner-ului:** 3.Tr (elicea de barcă), 3.Ts (ventilatorul cu carcasă; reperul e 41530); proba pe
  imprimantă (coada din fișa etapei 3); numele piesei nu spune forma și profilul (două elice diferite pot avea același nume
  în listă); descrierea din bibliotecă n-are loc de „elice” (157 din 160 de caractere).

## Capcanele găsite la 3.Tq

- **Axa, nu centrul cutiei.** La o elice cu 3 palete, centrul cutiei cade la un sfert de rază de axă: razele măsurate de
  acolo ies cu ~13 % prea mari, iar o gaură rotundă pare cruce. `elice_masura.py` măsoară acum față de originea piesei și
  arată raza vârfului fiecărei palete (trebuie să fie aceeași). O unealtă de măsură se încearcă întâi pe o plasă a noastră,
  cu cotele știute: a dat înapoi Ø83,30 și 13,9° pentru 83,3 și 14,0° cerute.
- **Sensul e al piesei.** LDraw are un reper drept: semnul pantei paletei e sensul elicei (+1 = „dreapta” motorului). O
  randare cu doar y → −y oglindește piesa: `randare.mts` o rotește acum (y → −y, z → −z).
- **Redesenarea editorului cât omul scrie.** Partea 3D, când sosește three.js, alege din nou piesa și redesenează editorul;
  un câmp cu o valoare scrisă și neluată primea `change` în mijlocul redesenării: piesa lua valoarea, editorul rămânea cu
  cea veche. `editor()` ia întâi câmpul activ (`blur`). S-a văzut ca o cădere rară a probei (1 din 30), doar sub
  încărcare: nu s-a reprodus cu ascultători în pagină și nici cu urma Playwright, ci cu three.js ținut și lăsat la un
  moment ales. **Probele atelierului pe pagina de sine stătătoare trebuie să aștepte pornirea părții 3D** (`#at-vedere
  canvas`), cu three.js dat din `vendor/` (în container, `cdnjs.cloudflare.com` e oprit, iar cererea cade repede, exact
  cât proba scrie). Spec-urile celorlalte piese (rotițe, roți, șenilă …) încă nu așteaptă: aceeași cursă, mai rar.
- **O otravă „echivalentă” se rulează.** Trei socotite echivalente au fost rulate: una era prinsă deja, una nu era
  echivalentă (garda radicalului din forma rotunjită: fără ea, vârful paletei e NaN la 99 dintre diametrele din 0,1 în
  0,1 mm, fiindcă ultima stație cade cu o rotunjire peste 100 % din paletă).
- **Un text netradus fără diacritice** („Ca LEGO 6041”) nu e văzut de probele dicționarului și nici de `romanaRamasa`:
  se cere cu textul lui în engleză, în proba din cvs2, care trebuie să parcurgă și fila nouă.
- **`biblioteca.ts --scrie` după ultima schimbare a pluginului:** la o schimbare pe aceeași versiune nepublicată, pune
  temporar versiunea publicată (18.18.0) în `extensii/biblioteca.json` și rulează-l din nou.
- **În container:** `python3` fără `-B` lasă `__pycache__` în `test/otravuri/` și `scripts/ldraw/` (neignorate).

## Istoria (22.11 și 23.11 dimineața, local)

_Starea de mai jos e cea de dinaintea pilotului; cotele LEGO din ea sunt cele necorectate._

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
