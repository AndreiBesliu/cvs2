# ADR 0175 — Incrustația cu pereți drepți: gaura și treptele (documentul v25)

**Starea:** acceptat pe 16.11.2026, cu „Da, cu recomandările” al owner-ului (1a, 2a, 3a). Propus tot pe 16.11, în linia incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`). Felia
12.1↑f din ADR 0170 („gaura și treptele”), fără mașină. Cererea owner-ului, transmisă de sesiunea principală: „poti sa continui
si sa pornesti si worktrees care s-au oprit”; sesiunea principală: „pe linia ta: 12.1↑f (gaura și treptele), din ADR 0170. Dacă
cere decizii, propune-le cu recomandarea întâi”. **Documentul:** v25 (v24 e al punților dopului drept, ADR 0174).
**Rândul din prag:** „Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`). **Schița:** <https://claude.ai/artifact/L9buqcaGfDVW4oajmuCxZR> (patru planșe: fereastra
exportului și panoul pe hârtie, gaura în secțiune, treptele în secțiune, întrebările).

**Ce au schimbat răspunsurile:** nimic față de propunere; fixează doar alegerile care se excludeau.
- **1a:** gaura se alege („Locașul: gaură”), iar adâncimea ei e grosimea foii plus supracursa, ținută la zi cu foaia.
- **2a:** gaura se taie doar ca buzunar prin toată placa (nu și ca profil cu urechi).
- **3a:** gaura întâi (12.1↑f, cu documentul v25 pentru ambele câmpuri; treapta refuzată de lucrare până la felia ei), apoi
  treptele (12.1↑f-2).

## Problema

Incrustația cu pereți drepți (ADR 0171) are azi un singur fel de locaș: buzunarul, cu fund. ArtCAM 2018 (Inlay Wizard, din
`CERCETARE-DETALIATA.json`) mai are trei: **gaura** (locașul trece prin placă), **buzunarul în trepte** și **gaura în trepte**,
cu **dopul în trepte** pe măsura lor. Treapta e dată de „umăr”: adâncimea lui d, de la fața plăcii, și lățimea lui s. Documentația
nu spune încotro e umărul și nici cum se sprijină dopul; le hotărâm aici, pe hârtie.

Două lucruri se schimbă față de buzunar:

- **Gaura n-are fund.** Dopul nu se poate sprijini pe fund; se oprește pe fața plăcii (ridicat, cu fața coborâtă) sau e ținut
  la nivelul feței de jos (decupat, apăsat pe o suprafață plană la lipire).
- **Treapta e un al doilea contur.** Locașul are două niveluri, iar dopul, două: o „flanșă” cât desenul și o „tijă” cât
  deschiderea de sub umăr. Ambele perechi de contururi au colțurile potrivite (ADR 0171), cu același joc lateral c.

## Ce am aflat

- **ArtCAM** (documentația lui, 2018): gaura e „o deschidere prin bloc”; buzunarul și gaura în trepte au umărul cu adâncimea
  d, „măsurată de la adâncimea de start”, și lățimea s; dopul în trepte se potrivește pe amândouă. Jocul (≥ 0) mărește
  locașul sau micșorează dopul; colțurile se potrivesc după freză.
- **Azi, în cvs2,** un locaș drept tăiat cât grosimea foii e deja o gaură (adâncimea poate trece de grosime cu cel mult
  supracursa, `job.ts`), dar dopul nu știe: „pe fund” ar lăsa dopul în aer, iar dopul decupat ar fi gros cât adâncimea plus H,
  fără să știe că trebuie să fie la nivel cu fața de jos.
- **Geometria treptei, pe hârtie** (R raza frezei, c jocul lateral, desenul S):
  - **Spre interior** (desenul e conturul văzut): nivelul de sus e locașul obișnuit P (ADR 0171), până la d; deschiderea de
    sub umăr e Q, desenul micșorat cu s și potrivit la fel (deschiderea cu R a închiderii cu R − c), de la d până la D (sau
    prin placă, la gaura în trepte). Umărul e inelul P \ Q, lat de s pe laturile drepte.
  - **Spre exterior** (desenul e deschiderea, ca la fălțuirea unui geam): deschiderea e P, iar nivelul de sus e desenul
    mărit cu s, potrivit; umărul e inelul din jurul desenului.
  - **Dopul în trepte:** flanșa e conturul de sus micșorat cu c, tija e conturul de jos micșorat cu c; jocul e c pe ambele
    niveluri, și în colțuri. Flanșa are d (plus H peste placă, de rindeluit); tija are D − d − g (pe umăr, cu jocul g sub ea
    pentru clei) sau D − d (pe fund, cu g deasupra umărului), iar la gaura în trepte T − d (la nivel cu fața de jos).
  - **Dopul în trepte se taie mereu oglindit, cu tija în sus:** tăiat neoglindit, tija ar sta sub flanșă, unde freza nu ajunge
    de sus. Deci: ridicat pe semifabricatul lui (două niveluri: în jurul tijei până la flanșă, în jurul flanșei până la fața
    coborâtă) sau decupat (în jurul tijei până la flanșă, apoi flanșa decupată prin placă, cu punți), apoi întors în locaș.
- **Exemplul de lucru:** dreptunghiul 40 × 30, Ø6 (R = 3), c = 0,1, treapta spre interior cu d = 3 și s = 5, buzunarul adânc
  de D = 8, H = 2, g = 0,5, pe umăr.
  - Locașul: P = 40 × 30 cu vârfurile R3, până la 3 mm; Q = 30 × 20 cu vârfurile R3, de la 3 la 8 mm; umărul, lat de 5.
  - Dopul: flanșa 39,8 × 29,8 (vârfurile R2,9), groasă de 3 + 2 = 5; tija 29,8 × 19,8 (R2,9), înaltă de 8 − 3 − 0,5 = 4,5;
    dopul ridicat are 9,5 mm, semifabricatul cel puțin 10,5.
  - Gaura în aceeași placă de 18 mm: buzunarul prin placă (18 mm, plus supracursa); dopul decupat gros de 18 + 2 = 20, cu
    fața de jos la nivelul plăcii.

## Decizia (propusă; toate variantele care pot sta împreună, recomandarea fiind implicitul)

1. **Documentul v25:** pe incrustația cu pereți drepți, două câmpuri opționale.
   - `locas: 'gaura'` (lipsă = buzunar). La gaură, adâncimea locașului e grosimea foii plus supracursa (ținută la zi cu foaia,
     nu cea scrisă în operație), iar panoul o arată „prin foaie”.
   - `treapta: { adancime, latime, spre? }`: d în (0, D) (la gaură, în (0, T)), s pozitiv, `spre: 'interior' | 'exterior'`
     (lipsă = spre interior). Contractul ușii: un obiect deschis; refuzurile de geometrie sunt ale lucrării.
   - `sprijin` primește și `'umar'` (doar cu treaptă; implicit cu treaptă). La gaură, „pe fund” nu există.
   - Migrarea v24 → v25 schimbă doar numărul; un v24 cu `locas` sau `treapta` în `incrustatie` (câmpuri necunoscute atunci)
     e refuzat, ca ciocnire. Oracolul documentului, corpusul de aur și probele versiunii curente trec la v25.
2. **Gaura:** locașul e buzunarul conturului P prin toată placa (pereții curați, nicio bucată liberă), cu toate strategiile
   buzunarului. Dopul rămâne cel ales: decupat (prin placa lui, gros de T + H, neoglindit, cu punți; fața de jos la nivelul
   plăcii) sau ridicat, cu sprijinul pe față (h = T, fața coborâtă pe placă; spatele se taie).
3. **Treptele:** buzunarul în trepte și gaura în trepte, spre interior sau spre exterior; locașul din două buzunare (nivelul de
   sus până la d, deschiderea de la d la D sau prin placă), cu aceleași freze. Dopul în trepte, oglindit, ridicat sau decupat;
   sprijinul pe umăr (implicit) sau pe fund. La gaura în trepte, dopul stă pe umăr.
4. **Refuzurile, cu motivul,** înainte de export: „pe fund” la o gaură; d în afara intervalului; o deschidere de sub umăr care
   dispare (o parte mai îngustă decât freza, cu elementul ei); un umăr mai îngust decât jocul lateral; treapta spre exterior
   care iese din foaie (ca orice tăietură).
5. **Interfața:** în fereastra exportului, pe rândul cu pereți drepți, „Locașul: buzunar / gaură” și „Treapta: fără / spre
   interior / spre exterior”, cu adâncimea și lățimea umărului (ascunse fără treaptă; valorile rămân în rând); „Se sprijină”
   arată doar ce se poate (fără „pe fund” la gaură; „pe umăr” doar cu treaptă). Panoul, pe hârtie: „prin foaie (T mm)”, umărul
   (d, s), flanșa și tija dopului. Manualul (ro, en).
6. **Probele, scrise întâi:** oracolul pereților drepți (`test/oracles/incrustatieDreapta.ts`) primește gaura (dopul la nivel cu
   fața de jos, ± 0,05) și treptele (dopul pe umăr: oprirea la d ± 0,05, g sub tijă; jocul c ± 0,02 pe ambele niveluri, și în
   colțuri); cazurile pe hârtie (exemplul de mai sus, steaua din prag cu treaptă, o literă cu gol, un umăr prea lat care face
   deschiderea să dispară, refuzat); controlul negativ: un dop în trepte neoglindit trebuie să pice; otrăvurile
   (`test/otravuri/12.1f.py`, `12.1f-2.py`).
7. **Feliile:**
   - 12.1↑f: documentul v25 (ambele câmpuri; treapta refuzată de lucrare, cu motivul și felia care o aduce), gaura, dopul ei
     (decupat și ridicat pe față), oracolul, fereastra, panoul, manualul. Estimarea: ~3 h (12.1↑b-2, v24, a cerut 2 h 08 min).
   - 12.1↑f-2: treptele (spre interior și spre exterior), dopul în trepte (ridicat și decupat), sprijinul pe umăr. ~5 h.
   - Plafonul total e comun cu celelalte linii; ușa de la pornire crește doar cu schema celor două câmpuri (zeci de octeți).

## Precizarea din 17.11 (felia 12.1↑f-2, pe hârtie)

Fără decizii noi: ce trebuia hotărât ca treptele să se poată tăia și măsura, din răspunsurile de mai sus.

- **Dopul pe fund.** Pe fund, tija stă pe fundul locașului, iar deasupra umărului rămâne g. Deci tija are D − d + g și
  flanșa d − g + H; înălțimea dopului e D + H, ca la dopul fără treaptă pe fund. „D − d” din §„Ce am aflat” n-ar lăsa g
  deasupra umărului. Exemplul pe fund: tija 5,5, flanșa 4,5, dopul 10.
- **Jocul g.** Pe umăr, g e sub tijă; pe fund, g e deasupra umărului. În ambele cazuri trebuie să fie cel puțin 0,1 mm
  (`JOC_INCRUSTATIE_MINIM`), iar pe umăr sub D − d, pe fund sub d. La gaura în trepte, tija iese la nivel cu fața de jos,
  deci g nu se folosește.
- **Sprijinul.** Cu treaptă, „pe față” e refuzat: fața coborâtă a dopului în trepte rămâne la H peste placă, deci nu se
  poate sprijini pe ea. Fără treaptă, „pe umăr” e refuzat. Cu treaptă, sprijinul contează și la dopul decupat, care e și el
  întors.
- **Semifabricatul dopului în trepte.** E cutia nivelului de sus cu marginea pe fiecare parte. Spre interior, cutia
  nivelului de sus e chiar a desenului. Spre exterior, e cutia desenului lărgită cu s, fiindcă flanșa trece de desen. Dopul
  e mereu oglindit pe X.
- **Tăierea dopului în trepte.**
  - Ridicat, două buzunare. Primul ocolește flanșa până la h, pe tot semifabricatul. Al doilea ocolește tija până la
    flanșă, pe flanșa lărgită cu diametrul primei freze plus 0,5 mm. Așa freza ajunge peste tot pe fața flanșei, și în
    colțurile ei, iar între tijă și marginea buzunarului are loc chiar și la un umăr îngust. Cu raza în loc de diametru,
    canalul ar fi fost, la Ø3 și s = 1, exact cât freza.
  - Decupat, același buzunar în jurul tijei. Apoi flanșa e decupată prin placă, cu cea mai mică freză și cu punți, ca dopul
    decupat fără treaptă; golurile ei se taie ca interioare. Marginea trebuie să fie cel puțin diametrul primei freze plus
    0,5 mm, ca buzunarul din jurul tijei să rămână în placă, iar flanșa trebuie să fie mai groasă decât punțile.
- **Deschiderea care dispare.** Deschiderea e refuzată când o parte a desenului micșorat cu s e mai îngustă decât freza
  locașului. Tot așa când o parte a desenului rămâne fără deschidere sub umăr.
- **Avertismentele colțurilor** (vârful retras, părțile unite) sunt ale nivelului care urmează desenul: nivelul de sus spre
  interior, deschiderea spre exterior.
- **Treapta spre exterior lângă marginea foii** se judecă ca orice tăietură, fără refuz nou: dacă freza iese din foaie,
  exportul cere confirmarea.
- **Locașul se taie în ordine:** întâi nivelul de sus, până la d, apoi deschiderea, de la d la D (trecerile ei pornesc de
  sub umăr).

## Ce am respins

- **Dopul în trepte neoglindit:** tija ar sta sub flanșă, unde freza nu ajunge de sus; ar cere tăierea pe a doua față.
- **„Pe fund” la gaură:** gaura n-are fund; dopul ar rămâne în aer.
- **Un tip nou de operație:** gaura și treptele sunt tot buzunarul cu `incrustatie` (strategiile, frezele de rest, coborârea).

## Ce impune

- O gaură ia adâncimea din foaie: schimbi grosimea foii, se schimbă gaura și dopul ei.
- Probele care țin versiunea curentă trec pe v25 (cea mai nouă devine 26); în e2e, și forma `.schema).toBe(24)`.
- Fiecare buton nou are capitolul lui în manual, în ambele limbi.

**Se redeschide dacă:** placa 12 arată alt joc decât simularea, sau o altă linie urcă schema înaintea unirii (atunci una devine
v26).

## Întrebările (recomandarea întâi)

1. **Cum știe aplicația că e gaură?**
   - **a)** o alegi în fereastra exportului („Locașul: gaură”), iar adâncimea e grosimea foii plus supracursa, ținută la zi cu
     foaia;
   - b) din adâncime: un locaș drept cât grosimea foii e gaură, fără câmp nou (schimbi foaia, trebuie schimbată și adâncimea).
2. **Cum se taie gaura?**
   - **a)** doar ca buzunar prin toată placa: pereții curați, nicio bucată liberă;
   - b) și ca profil interior cu urechi, ales la export: mai repede pe găurile mari, dar urechile rămân pe peretele locașului,
     chiar pe linia de lipire a incrustației, și se curăță la nivelul lui.
3. **Ordinea feliilor:**
   - **a)** gaura întâi (12.1↑f, cu v25 pentru ambele câmpuri), apoi treptele (12.1↑f-2);
   - b) treptele întâi;
   - c) amândouă într-o singură felie.
