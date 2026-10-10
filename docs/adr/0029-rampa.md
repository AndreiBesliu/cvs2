# ADR 0029 — Rampa (documentul v6)

**Starea:** acceptat pe 10.10.2026, în felia 2.5a, pe verdictul din `docs/PORTARE.md` §3.2: rampa trece ca politică și
devine modificator Z(s), ca urechile. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Azi fiecare trecere coboară pe verticală, în vârful 0 al buclei.
- Freza plonjează drept în material, iar toate urmele de intrare cad în același loc.
- În ediția întâi, rampa era pornită din fabrică (4 mm), cu intrarea rotită la fiecare trecere.
- Cu urechi, rampa ediției întâi pornea uneori pe un flanc: Z-ul de plecare (cel mai puțin adânc dintre rampă și profil)
  era sub cota la care rămăsese freza, deci intrarea începea cu o mică plonjare în material.

**Decizia.** Operația de profil poate avea o rampă: `Operatie.rampa = null | { lungime }`. Cu rampă, fiecare buclă se
taie continuu:
- coboară pe o rampă de-a lungul buclei;
- urmează o tură plină la adâncime, care trece din nou peste rampă;
- intrarea se rotește la fiecare trecere;
- nu se ridică între treceri.

Rampa se compune cu urechile prin Z-ul cel mai puțin adânc, iar intrările ies din zonele urechilor.

## Contractul

**1. Documentul v6** (`schema: 6`) = contractul v5 (ADR 0028), plus `Operatie.rampa`, obligatoriu: `null` (fără rampă)
sau `{ lungime }`, cu `lungime` pozitiv, cel mult `PLAFON.latura`. Lungimea e în mm, în plan, de-a lungul buclei, pe care
freza coboară o trecere.

**Migrarea v5 → v6** (pură, deterministă): fiecare operație primește `rampa: null`. O operație v5 care are deja un câmp
necunoscut `rampa` e refuzată cu motiv (ciocnire de nume). Lanțul v1 → … → v6 rămâne.
- O operație nouă (Adaugă) vine cu `rampa: null`. Programul unui document fără rampă e **același, octet cu octet**, ca în
  v5 (placa 1 își păstrează amprentele).
- Rampa se pornește din dialogul de export, pe rând, cu lungimea implicită **10 mm**.

**2. Bucla cu rampă.** Fiecare buclă a profilului se taie separat, cu toate trecerile ei, înaintea buclei următoare.
- P = lungimea exactă a buclei (ca în ADR 0028 §3); pozițiile s se numără de la vârful 0, în sensul de mers, desfășurat
  (s și s + P sunt același punct).
- **Lr = min(lungime; P / 2).** Pe o buclă mai scurtă decât 2 × lungimea, rampa se scurtează la P / 2: e mai abruptă,
  dar viteza pe verticală rămâne plafonată (punctul 3).
- **Rampa minimă: 1 mm** (precizarea din 10.10). Sub ea, rampa e o plonjare cu alt nume și iese din rezoluția postului.
  - dialogul cere lungimea de cel puțin 1 mm;
  - exportul refuză cu motiv o operație cu lungimea sub 1 mm (documentul o admite, cu `lungime` pozitiv);
  - exportul refuză și o buclă pe care Lr < 1 mm (P < 2 mm: „rampa nu încape pe buclă”); acolo rampa se scoate de pe
    operație.
- **Zonele urechilor:** dacă operația are urechi, zona urechii j e Z_j = [c_j − h − ℓ, c_j + h + ℓ] (ADR 0028 §3). În
  afara zonelor, profilul oricărei treceri e la adâncime plină. `scoate(s)` = capătul c_j + h + ℓ dacă s (modulo P) e
  strict în interiorul zonei j, altfel s. Fără urechi, `scoate(s) = s`.
- **Intrările:** e₁ = 0; e_{k+1} = scoate(e_k + Lr), luat desfășurat, deci e_{k+1} ≥ e_k + Lr.
- **Programul buclei:**
  1. rapid la Z-ul de siguranță, rapid deasupra lui e₁ (vârful 0);
  2. `G1` până la fața de sus (Z = 0), cu avansul de plonjare: prin aer;
  3. apoi, pentru fiecare trecere k, cu d₀ = 0:
     - **rampa**, pe [e_k; e_k + Lr]: Z(s) = max(zR_k(s), zP_k(s)), cu zR_k(s) = −(d_{k−1} + (d_k − d_{k−1})·(s − e_k)/Lr).
       zP_k e profilul trecerii k: urechile din ADR 0028 §3, sau −d_k fără urechi;
     - **tura**, pe [e_k + Lr; e_{k+1} + P], la Z = zP_k(s). Tura acoperă bucla întreagă, deci și rampa, și merge mai
       departe până la intrarea următoare. După ultima trecere, tura se oprește la e_k + Lr + P;
  4. rapid la Z-ul de siguranță.
- **Fără nicio coborâre verticală în material.** La e_k (k ≥ 2), freza e la zP_{k−1}(e_k) = −d_{k−1}, fiindcă intrarea
  e în afara zonelor. Rampa pornește exact de unde e freza. Singura mișcare verticală e cea de la pasul 2, prin aer.
- **Nicăieri sub profil:** pe rampă, Z(s) ≥ zP_k(s), deci urechile rămân întregi.

**3. Emitentul** (același modificator ca la ADR 0028 §4):
- segmentele se taie exact în capetele rampei, în rupturile urechilor și în punctele în care zR_k se întâlnește cu zP_k;
- Z e liniar pe fiecare bucată; arcele rămân arce (elice unde Z se schimbă);
- o bucată sub 1e-6 mm e o linie;
- Z se scrie doar unde se schimbă;
- o bucată care coboară are F = min(avans, avansPlonjare·L₃ / |ΔZ|).

**4. Fără rampă, nimic nu se schimbă:** trecerile în ordinea de azi (toate buclele la o adâncime, apoi următoarea),
plonjarea în vârful 0, ridicarea între treceri.

**5. Invariantele:**
- **1** rămâne valabilă: pe rampa trecerii k, freza merge între −d_{k−1} și −d_k, deci nimic nu scoate mai mult de
  d_k − d_{k−1}.
- **2:** traseul în plan e bucla, deci verificarea nu se schimbă.
- **9, amendată** (ADR 0027 §6, ADR 0028 §5). Un drum poate trece prin mai multe treceri (fără G0 între ele); buclele
  închise din el se judecă ca până acum. O porțiune deschisă care stă pe o buclă închisă a aceluiași drum, parcursă în
  același sens, nu e încălcare: e tura care continuă spre intrarea următoare. Orice altă porțiune deschisă rămâne
  încălcare (intrările și ieșirile vin cu ADR 0030).
- **10, amendată.** Cu rampă, profilul urechilor se judecă pe fundul tăieturii, nu pe o buclă anume. Pe fiecare buclă și
  la fiecare trecere k:
  - fiecare punct al buclei e atins la zP_k(s), pe tură;
  - nicio mișcare a trecerii k nu coboară sub zP_k(s).

  Fără rampă, invarianta 10 rămâne cum e.
- **11 (rampa), nouă.** Rulează în poartă cu documentul.
  - **Pe o operație cu rampă:**
    - nicio mișcare verticală (X și Y neschimbate) nu coboară în material. **Toleranța** (precizarea din 10.10): o mișcare
      scrisă cu X și Y neschimbate poate coborî cel mult (d_k − d_{k−1})·0,001 / Lr + 0,0005 mm. E cât coboară o bucată
      de rampă mai scurtă decât rezoluția postului: capătul rampei poate cădea la o fracțiune de micron după un vârf;
    - la fiecare trecere, coborârea de la −d_{k−1} la −d_k se face de-a lungul buclei, pe Lr în plan, cu intrările
      după regula de la 2;
    - pe porțiunile din afara zonelor urechilor, coborârea e liniară.
  - **Pe o operație fără rampă:** programul are forma de la 4.

**6. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- documentul v6;
- invarianta 9 amendată, 10 amendată și 11 nouă;
- un oracol pe hârtie pentru rampă. El citește G-code-ul cu elicele și măsoară, pe fiecare trecere:
  - poziția intrării;
  - lungimea în plan a coborârii;
  - cotele de plecare și de sosire;
  - acoperirea buclei la adâncime.

**Cazurile pe hârtie:**
- dreptunghiul 300 × 200, cu 3 treceri și rampa de 10: intrările la 0, 10, 20;
- cercul R100, cu aceeași rampă;
- un cerc mic, unde Lr = P / 2;
- dreptunghiul cu urechi, pe două variante:
  - o intrare e_k + Lr care cade într-o zonă și se mută la capătul ei;
  - o rampă care trece peste un palier (Z-ul cel mai puțin adânc);
- placa 2 cu rampă și urechi;
- supracursa cu rampă.

**Martorii negativi**, care trebuie să înroșească oracolul:
- rampa care pleacă de la −d_k în loc de −d_{k−1} (plonjare);
- intrările nerotite;
- tura care nu re-acoperă rampa (rămâne o pană de material);
- rampa care ignoră urechile (doar zR_k, deci sapă în ureche);
- intrarea lăsată pe un flanc (coborârea verticală a ediției întâi).

**7. Interfața:** în dialogul de export, fiecare rând are o coloană **Rampă**:
- bifa, iar pe rândul de sub operație, lungimea în mm;
- coloana e oprită în fila care doar citește;
- valorile intră în document prin `document.aplica-operatii`, îmbinate ca urechile.

## Limitele

- Rampa e doar pe buclele închise. Contururile deschise (2.3c) vin cu importul SVG.
- Rampa se dă prin lungime, nu prin unghi: unghiul variază cu pasul trecerii. Unghiul poate veni dacă atelierele îl cer.
- Implicitul e „fără rampă”, ca placa 1 să rămână neschimbată. Pornirea ei din fabrică (ca în ediția întâi) se decide cu
  owner-ul.
- Intrările și ieșirile (felia 2.5b, ADR 0030) aduc freza la e_k din afara piesei. Rampa de aici rămâne pe buclă.

**Precizarea din 10.10.2026** (recenzia feliei 2.5a, înainte de orice publicare). Contractul nu dădea rampei o lungime
minimă.
- **Pana de material.** O rampă de cel mult 1e-6 mm se pierdea la emitere, iar coborârea se întindea pe tot primul
  segment. Pe o tăietură prin foaie, tura finală nu-l mai tăia la adâncime: rămânea o pană de până la 4 mm, fără motiv.
- **Plonjarea verticală.** Sub rezoluția postului, „rampa” ieșea în G-code ca plonjare verticală.

Acum rampa are minimum 1 mm, cu refuzuri. Invarianta 11 are o toleranță declarată pentru bucățile mai scurte decât
rezoluția postului.

Tot de la recenzie: un program fără rampă e același, octet cu octet, ca în v5, cu o excepție. Pe linie, cu urechi, dacă
bucla pornește cu un segment de lungime zero (un dreptunghi cu raza colțului cât jumătate din latură), emitentul vechi
scria o mișcare de lungime zero, iar parcurgerea nouă o sare.

## Ce am respins

- **Ridicarea și replonjarea între treceri:** timp în aer și câte o urmă de intrare pe fiecare trecere.
- **Rampa care pornește de oriunde, cu Z-ul cel mai puțin adânc (ediția întâi):** pe un flanc, pornea sub freză.
- **Rampa care se termină fără tura plină:** lasă o pană de material sub rampă.

**Se redeschide dacă:** atelierele cer rampa prin unghi, rampa în zig-zag pe loc, sau rampa pe contururi deschise.
