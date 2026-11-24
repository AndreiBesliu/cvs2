# Elicele (3.Tq–3.Ts)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, elicele din Easy 3Draw (ADR 0282, ACCEPTAT 22.11 cu 1a, 2a, 3a): 3.Tq (elicea) unită în `main` pe 23.11 (`0ae9c6c1`, Easy 3Draw 18.19.0); reparația probelor atelierului (`baa00ad`) și 3.Tr (elicea de barcă, 18.20.0) unite în `main` pe 23.11 (`d262e57a`), din sesiunea cloud a liniei; 3.Ts (ventilatorul cu carcasă, 18.22.0) unită în `main` pe 24.11 (`3218781c` în `e14e553a`, lotul al paisprezecelea, de sesiunea principală); toate trei elicele ADR-ului sunt făcute, iar versiunea următoare a pachetului e 18.23.0; cotele LEGO măsurate din LDraw, față de axa piesei_

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
  cât proba scrie). Din 23.11, toate probele atelierului o fac, printr-un ajutor comun: mai jos.
- **O otravă „echivalentă” se rulează.** Trei socotite echivalente au fost rulate: una era prinsă deja, una nu era
  echivalentă (garda radicalului din forma rotunjită: fără ea, vârful paletei e NaN la 99 dintre diametrele din 0,1 în
  0,1 mm, fiindcă ultima stație cade cu o rotunjire peste 100 % din paletă).
- **Un text netradus fără diacritice** („Ca LEGO 6041”) nu e văzut de probele dicționarului și nici de `romanaRamasa`:
  se cere cu textul lui în engleză, în proba din cvs2, care trebuie să parcurgă și fila nouă.
- **`biblioteca.ts --scrie` după ultima schimbare a pluginului:** la o schimbare pe aceeași versiune nepublicată, pune
  temporar versiunea publicată (18.18.0) în `extensii/biblioteca.json` și rulează-l din nou.
- **În container:** `python3` fără `-B` lasă `__pycache__` în `test/otravuri/` și `scripts/ldraw/` (neignorate).

## 3.Tr, gata (23.11, în cloud): elicea de barcă

La „pornește 3.Tr” al owner-ului, pe ramura liniei, peste reparația probelor. Easy 3Draw 18.20.0.

- **Ce are:** a doua piesă a filei „Elice”, „Elice de barcă”: 3–5 palete late (conturul „ureche”), pasul constant,
  înclinate înapoi pe cerc, secțiunea ogivală, butucul cât paletele, capacul rotunjit, „Repede” pe grila de știfturi,
  „Fă perechea”. Probele: unitare 12 (`trenulet.barca.test.ts`), e2e 5 (`trenulet.barca.spec.ts`). Otrăvurile: `3.Tr.py`
  141 / 141, `3.Tr-en.py` 6 / 6. Documentele: ADR 0282 („Implementarea (3.Tr)”), fișa etapei 3, `docs/otravuri.md`, DEVLOG.
- **Hotărâte la implementare** (decizia spunea doar „3–5 palete late, înclinate înapoi”; motivele, în ADR):
  - înclinarea e pe cerc (skew), nu spre pupa (rake): cea spre pupa ridică muchia de jos de pe masă, deci cere suport;
  - reperul LEGO e elicea motorului de barcă (u9216: Ø21,6, trei palete ovale, pe un arbore de Ø2), doar pentru formă:
    fără „Ca LEGO”, cu diametrele pe grila de știfturi;
  - se tipărește cu partea dinspre barcă pe masă: axul intră de jos, capacul rămâne spre pupa, fața plată e sus;
  - butucul crește cu elicea (Ø8 sub Ø45, apoi 18 % din diametru) și e înalt cât paletele.
- **Rămase, la cuvântul owner-ului:** 3.Ts (ventilatorul cu carcasă; reperele sunt 41530 și 50899, „Propeller 3 Blade 5D
  with Outer Ring”); proba pe imprimantă și în apă (coada din fișa etapei 3); înclinarea spre pupa, dacă o vrea (cu suport).

## Capcanele găsite la 3.Tr

- **O secțiune cu o față plată are puncte coliniare:** tăierea urechilor (`triunghiuriPoligon`) le pierde, iar capătul
  paletei rămâne deschis (78 de muchii fără pereche). Capetele se închid ca o fâșie între fața de sus și cea de jos.
- **O refactorizare mută otrăvurile vechi.** Paletele scoase într-o funcție comună au lăsat 13 otrăvuri din `3.Tq.py` fără
  țintă (text mutat) sau cu două ținte (cod repetat la piesa nouă). `verifica` pe toate listele zonei, după fiecare
  mutare de cod; codul repetat (butucul) a trecut într-o funcție a lui, ca otrava să aibă un singur loc.
- **Elicea veche, la octet:** amprenta plaselor pe o grilă de parametri (3 456 de combinații), luată înainte și după.
- **O piesă nouă schimbă căutarea:** „bar” găsește acum și „Elice de barcă”. Proba pictogramelor lua a treia piesă a
  fiecărei familii (`piese[2]`): o familie cu două piese o strica.
- **Fereastra unei palete nu e centrată pe mijlocul corzii:** spatele bombat iese într-o parte, deci „nimic lângă
  bisectoare” era o probă greșită. Golul dintre palete se măsoară pe cerc: cel mai mare gol dintre două unghiuri vecine.
- **O otravă scăpată arată o probă cu un singur punct:** capacul era cerut doar la jumătatea înălțimii (un inel); numele,
  niciodată cu gaura și capacul împreună.

## 3.Ts, gata (24.11, în cloud): ventilatorul cu carcasă

_Unită în `main` pe 24.11 de sesiunea principală (`3218781c` în `e14e553a`, cu A.11b–A.11e și 16.A↑b-1). Vârful ramurii,
`5e05b325`, aducea doar `main` (`fafb95e7`), cu completul verde: unit 10 077 / 0, e2e 655 / 655, emulatoarele 122 / 122 și
51 / 51. O felie nouă a liniei (de exemplu înclinarea spre pupa, cu suport) pornește la cuvântul owner-ului._

La „continua” al owner-ului, pe ramura liniei, din `main` `883a8caa` (biblioteca refăcută luase 18.21.0, deci 3.Ts e
18.22.0).

- **Ce are:** a treia piesă a filei „Elice”, „Ventilator cu carcasă”, cu două piese: rotorul (3–12 palete răsucite, vârful
  drept, inelul la alegere) și carcasa (tubul cu peretele de 2, înalt cât paletele + 4, 2 sau 4 urechi cu găurile din
  calibrare pe grila axului); „Repede” Ø24 / 32 / 40 / 48, „Fă ventilatorul”. Probele: unitare 11
  (`trenulet.ventilator.test.ts`), e2e 6 (`trenulet.ventilator.spec.ts`). Otrăvurile: `3.Ts.py` 134 / 134 (125 din prima; nouă după probele lor țintite; E49, echivalentă, scoasă), `3.Ts-en.py` 9 / 9; 3 din `3.Tq.py` și 8 din `3.Tr.py`, mutate și prinse. Documentele: ADR 0282
  („Implementarea (3.Ts)”), fișa etapei 3, `docs/otravuri.md`, DEVLOG.
- **Hotărâte la implementare** (decizia spunea doar „inelul din jurul elicei, cu jocul din calibrare și cu găuri de știft
  pentru grinzi”; motivele, în ADR): „jocul din calibrare” citit în două (găurile, calibrate; jocul la vârf, parametru);
  găurile urechilor la k · 8 mm de ax (o grindă prinsă de ele are o gaură pe ax); inelul ca la 50899, fără „Ca LEGO”;
  carcasa din paletele fără inel (aceeași pentru ambele rotoare).
- **Rămase, la cuvântul owner-ului:** proba pe imprimantă (coada din fișa etapei 3).

## Capcanele găsite la 3.Ts

- **Privirea de sus pe randare** a găsit ce nicio probă nu cerea: lamajul urechii intră în peretele carcasei, iar peretele
  de deasupra urechii acoperea marginea găurii (un știft băgat de sus l-ar fi lovit). Proba cere acum canalul, iar
  canalul se taie doar unde lamajul ajunge la tub (la Ø41, gaura e la 32 mm).
- **`prismaGauri` mută vârfurile cu cel mult 0,0001 mm** (ca earcut să nu piardă vârfurile coliniare): o probă pe raza unui
  tub, a unui inel sau a unei găuri se face la 1e-3, nu la 1e-6.
- **Vârfurile plasei se iau o singură dată** (`polare` cu `Map`): o medie pe `tri.flat()` e trasă spre vârfurile care apar
  în mai multe triunghiuri.
- **Două căi spre aceeași piesă** („Fă ventilatorul” și editorul) dădeau aceleași chei în altă ordine, deci lista
  (care compară JSON-ul) le-ar fi pus pe două linii: o singură funcție le face pe amândouă (`defVentilator`).
- **O piesă nouă mută otrăvurile vecinilor:** liniile `TIPURI` și `FAMILII`, coarda strânsă la limită, `paleteElice`
  apelat la fel și capătul secțiunilor apar acum de două ori: 3 otrăvuri din `3.Tq.py` și 8 din `3.Tr.py`, aduse pe codul
  nou (`verifica` pe toate listele `3.T*.py`; cele VOID ale lui 3.Ta–3.Tg erau așa și pe `main`).

## Probele atelierului așteaptă pornirea părții 3D (23.11, după unirea lui 3.Tq)

La „ia reparația probelor atelierului” al owner-ului, pe ramura liniei, repornită din `main` (`8177ab8`). Doar probe:
pluginul rămâne 18.19.0, fără `biblioteca.ts --scrie`.

- **Ajutorul:** `test/e2e/ajutor-atelier.ts`. `threeDinPachet(page)` dă three.js din `vendor/` paginii de sine stătătoare
  (înaintea paginii); `intraIn3D(c)` apasă „3D” și așteaptă pânza previzualizării (`#at-vedere canvas`), pusă în același
  pas cu redesenarea editorului. `c` e pagina sau cadrul extensiei din cvs2.
- **Unde:** cele 11 spec-uri ale atelierului (rotițe, roată, fulie, conică, coroană, conică dublă, șenilă, căutare, file,
  pictograme, elice) și cele trei intrări în 3D din `trenulet.spec.ts` care nu așteptau. Șapte dintre ele cereau three.js
  de pe cdnjs: în CI, din rețea; în container, fără previzualizare.
- **Dovada:** secvența rotițelor (roata de 8, modulul 0,5), cu three.js sosit la 120–220 ms, din 1 în 1 ms: fără
  așteptare, 5 scrieri pierdute din 101 (sosirea în timpul lui `fill`); cu ea, 0 din 101.
- **O probă nouă a atelierului** intră în 3D cu `intraIn3D`, nu cu un clic pe `[data-mod="3d"]`; pe pagina de sine
  stătătoare, cu `threeDinPachet` înainte.

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
