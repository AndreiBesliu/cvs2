# ADR 0036 — Regula `nonzero` la ușă: aranjamentul exact, fără PathKit

**Starea:** acceptat pe 12.10.2026, în felia 2.7d. Schimbă **mecanismul** din ADR 0003 (rămâne regula: `evenodd` peste
tot, normalizarea o singură dată, la intrare). ADR 0004 (booleanul PathKit al editorului, etapa 6) nu se schimbă acum.
**Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Aplicația are o singură regulă de umplere, `evenodd` (ADR 0003). SVG-ul are implicit `nonzero`, iar
fonturile TrueType / CFF sunt mereu `nonzero`. Sub `nonzero`, subcăile suprapuse, o subcale în alta cu același sens,
buclele care se înfășoară de două ori și muchiile dublate înseamnă altă regiune. Măsurat: 20 de glife din Arial și 23 din
Segoe UI (U+0021–U+024F, între ele Ș ș Ț ț) au componente suprapuse. Până la 2.7d, ușa SVG le citea `evenodd` și le
număra (ADR 0035 §10, `nonzero`).

ADR 0003 spunea: reuniune PathKit + re-ancorarea R3 (ADR 0004). R3 fusese probat doar pe linii și arce; SVG-urile și
fonturile aduc cubice.

## Ce am măsurat (felia 2.7d, 12.10)

Trei prototipuri independente, judecate de o a patra sesiune cu propriul instrument (o înfășurare exactă cu semn, distanța
în ambele sensuri rafinată, acordul regiunii pe 16,4 milioane de puncte, 271 de rulări, între ele o „supă” de 542 de
contururi din fonturi reale, 10 212 vârfuri, la 0, la 2 440 și la 10⁶–9·10⁶ mm):
- **A — PathKit + R3 extins la cubice (ADR 0004):** exact pe cazurile curate (≤ 1,4e-12 mm), dar **18 rulări cu geometrie
  greșită, tăcut**: la scara foii, detalii de 0,5–3 µm dispăreau (un cerc de rază 0,003 mm pe muchia unei foi de
  2 400 × 1 200 ieșea „ok”, fără arc: eps-ul R3 e 2e-6 × mărimea, adică 5,4e-3 mm, peste toleranța proiectului); refuza
  textul real; 25 de refuzuri din 271;
- **B — aranjamentul exact, PathKit ca veto:** exact pe cazurile normale, dar PathKit contrazicea fals textul real
  (35 de contradicții pe „supă”), refuza inimi simple la 9·10⁶ mm, de 3–7 ori mai lent;
- **C — aranjamentul exact în double, fără PathKit:** 0 refuzuri false pe text, „supa” exactă (1,1e-13 mm la 0,
  2,3e-12 mm la 2 440) în ~1 s, 766 de linii, nicio dependență. Cu toleranța legată de poziție (1e-10 · |coordonata|),
  avea erori tăcute la 10⁶–9·10⁶ mm (până la 4,9e-5 mm); cu toleranța legată de întinderea desenului: **0 erori de regiune
  pe 16,4 M de puncte, abaterea ≤ 1e-9 mm**, 4 refuzuri, toate pe cazuri prost condiționate.

## Contractul

**1. Funcția:** `normalizeaza(cai, { regula })` din `src/geom/nonzero.ts`, pură, sincronă, fără dependențe; nu aruncă
(o excepție internă devine refuz). Primește subcăile închise ale unei forme (vârfurile ADR 0034, în mm, după matricea ADR
0035 §6) și întoarce contururi închise a căror regiune `evenodd` e regiunea intrării sub regula dată, sau un refuz cu
motiv și loc.

**2. Mecanismul:** aranjamentul exact al primitivelor-sursă: toate intersecțiile (linie, arc, cubică, în orice pereche,
și bucla unei cubice) rafinate în double, coincidențele (linii coliniare, același cerc, aceeași cubică) și atingerile
tratate explicit; fiecare primitivă tăiată în bucăți; înfășurarea de o parte și de alta a fiecărei bucăți din raze cu
semn în două direcții care trebuie să fie de acord, propagată pe contur și verificată la închidere și cu o rază de control;
se păstrează bucățile unde umplerea diferă de o parte și de alta; ele se înlănțuie în contururi.

**3. Grupurile:** subcăile ale căror cutii nu se ating (tranzitiv) nu interacționează sub `nonzero`; fiecare grup se
normalizează separat, cu toleranța lui, ca un desen mare să nu lărgească toleranța unuia mic. **Calea rapidă** (recenzia
2.7d: textul real trecea de la 185 ms la 7 s): înaintea aranjamentului, fiecare grup încearcă o probă **exactă, fără
toleranță**, că regiunea `nonzero` e deja cea `evenodd`: fiecare segment e simplu (hodograful unei cubice într-un
semiplan deschis), segmentele vecine se întâlnesc doar în vârful comun (conurile direcțiilor din el sunt disjuncte),
celelalte perechi au cutiile (lărgite cu τ/2) disjuncte, rafinate prin bisecție; imbricarea dintr-un baleiaj pe x cu raza
semi-deschisă exactă, sensul din aria cu semn, iar fiecare față are înfășurarea 0 sau impară. Orice îndoială trimite
grupul la aranjament; lucrul probei intră în buget.

**4. Toleranța** (doar a grupurilor care trec prin aranjament; calea rapidă nu folosește toleranță) τ = 1e-10 × diagonala
cutiei grupului + 64 · ulp(cea mai mare |coordonată| a lui): ~2,4e-7 mm pe o
foaie întreagă, ~1e-8 mm pe un text de 100 mm, **aceeași la 0, la 2 440 și la 10⁶ mm**. Garanția regiunii: în orice punct
mai departe de τ de frontiera intrării, ieșirea `evenodd` = intrarea sub regulă. Mai subțiri decât τ (goluri, fante,
lentile, atingeri) se pot închide, deschide sau contopi; tot ce e mai gros se reproduce exact sau se refuză. τ ≤
`TOLERANTA_IMPORT` (1e-6 mm).

**5. Geometria ieșirii e a sursei:** liniile, bucăți de linii-sursă; arcele, pe cercul-sursă, cu `bulge` = tan(baleiaj/4)
din unghiurile sursei (un arc întreg întors: −bulge); cubicele, sub-curbe exacte (blossom / de Casteljau) ale cubicei-sursă
(una întreagă întoarsă: c1 și c2 schimbate); vârfurile, vârfuri-sursă (bit cu bit) sau intersecții rafinate. Niciun punct
din alt instrument (float32) nu intră în document.

**6. Neschimbat:** dacă regiunea `nonzero` e deja cea `evenodd` (calea rapidă de la §3, sau aranjamentul: fiecare muchie
e frontieră, nicio muchie coincidentă), se întoarce chiar intrarea (același obiect): documentul și G-code-ul rămân octet
cu octet ca în 2.7c. Când alt grup al aceleiași forme se schimbă, un grup probat simplu iese cu umplerea în stânga, din
vârfurile intrării. „Deja `evenodd`” se judecă la precizia τ, ca tot restul (§4): o formă simplă, dar mai subțire decât τ
(un triunghi cu înălțimea de 5·10⁻¹⁰ mm, oracolul 2.7d, K7) poate ieși schimbată, chiar goală. Ușa numără forma goală tot
`nonzero-normalizate`, ca pe cea cu regiunea vidă (o cale și inversa ei); dacă nu rămâne nimic, fișierul e refuzat `gol`.

**7. Topologia ieșirii:** umplerea în stânga (exterioarele trigonometric, găurile orar); fiecare contur are cel puțin 2
vârfuri; fără segmente nule, fără ace de arie nulă și fără dus-întors; o buclă dintr-o singură cubică se împarte la t = 1/2
(ADR 0035 §7); fără muchii coincidente rămase; contururile nu se taie, se pot atinge într-un vârf. Un ciclu se taie la
vârful repetat (recenzia 2.7d: o gaură care atingea exteriorul într-un vârf ieșea legată de el, iar offsetul refuza):
frontierele care se ating ies în contururi simple separate; la tangente egale, ieșirea se alege după curbura cu semn.

**8. Refuzurile** sunt explicite, cu motiv și loc, niciodată tăcute: intrarea invalidă; înfășurarea care nu se poate
decide (curbe aproape coincidente, dar nu identice; încrucișări aproape concurente); propagarea sau raza de control care
nu se potrivesc; verificarea pe sferturi; gradele dezechilibrate sau un contur care nu se închide; bugetul de subdiviziune
și de lucru. **Nicio gardă nu se oprește singură** (a prototipului se oprea peste 4 000 de muchii).
- **Coincidența:** două muchii cu aceleași capete sunt coincidente doar dacă abaterea lor maximă, măsurată în ambele
  sensuri (proiecție, 7 eșantioane rafinate cu secțiunea de aur), e ≤ τ (recenzia 2.7d: cu 16τ, o lentilă de 10,9τ
  dispărea, contra garanției de la §4). Între τ și câțiva τ, o lentilă se refuză (`nedecis`), nu dispare.
- **Încrucișările la unghi mic** (recenzia 2.7d, critică: o lentilă de înfășurare 2 ieșea gaură, tăcut): o pereche de
  bucăți aproape paralele se lasă doar când distanța reală coardă–coardă trece de săgețile lor + τ (0 când coardele se
  taie); a doua plasă: muchiile decise prin propagare, nu de o rază, se mai eșantionează o dată, la mijloc.
- **Bugetul unui apel:** `PLAFON_LUCRU` = 12·10⁶ unități deterministe (perechile, subdiviziunea, comasarea nodurilor,
  razele); „supa” de fonturi costă 4,2·10⁶ (~1 s). Comasarea nodurilor rămâne exact tranzitivă (lanțuri sub τ), dar un
  ciorchine de k noduri costă k, nu k² (recenzia 2.7d: 100 de clepsidre, 6 s → 0,14 s). Bugetul fișierului: §10.

**9. La ușă** (ADR 0035): fiecare formă **umplută** (`fill` efectiv altul decât `none`) cu regula efectivă `nonzero`
(atributul, regulile simple din `<style>` sau `style`, ADR 0035 §4) trece, cu toate subcăile ei, prin normalizare (și o
singură subcale se poate tăia singură: pentagrama). O formă cu `fill: none` e desenul unui contur, nu o regiune: nu se
normalizează (recenzia 2.7d: o șaibă desenată doar din contur își pierdea gaura). La refuz, forma se importă ca în 2.7c
(`evenodd`), iar raportul o numără: `nonzero-refuzate`. Contorul `nonzero` din 2.7c se înlocuiește cu
`nonzero-normalizate` (formele schimbate de normalizare). Plafonul total de vârfuri (ADR 0035 §7) se judecă întâi pe
intrare, înaintea oricărei normalizări, apoi pe ieșire (ieșirea poate avea mai multe vârfuri decât intrarea); o ieșire cu
un contur peste plafonul căii (50 000, reuniunea a două subcăi) e refuzată: forma se citește ca în 2.7c, numărată. Textul
(etapa 7) folosește aceeași funcție, pe fiecare bloc.

**10. Timpul:** pe firul principal, cu ușa (821 de vârfuri: 41 ms; 10 212: ~1 s; 100 de rânduri de text Arial, nimic de
schimbat: 455 ms, față de 185 ms în 2.7c). Bugetul de la §8 e **al întregului
fișier** (`PLAFON_IMPORT.normalizare` = 24·10⁶ unități de lucru, cât două forme la plafonul lor, ~1 s fiecare), împărțit
între formele lui în ordinea documentului (recenzia 2.7d: cu un buget pe formă, 286 KiB de forme mici țineau firul
principal 94 s). Formele care nu mai încap se refuză, ca la §9.

## Ce verifică oracolul

O sesiune independentă, din acest ADR (fără importuri din `src/`): înfășurarea exactă cu semn pentru L / A / C, acordul
regiunii (intrarea sub regulă, ieșirea `evenodd`) pe puncte aleatoare la distanță relativă de frontieră, distanța ieșire →
sursă și adevăr → ieșire, rafinate; liniile pe linii-sursă, arcele pe cercuri-sursă, cubicele sub-curbe exacte, vârfurile pe
două primitive-sursă; calea neschimbată = același obiect; corpusul: forme suprapuse, imbricări, bucle, muchii comune,
atingeri, fonturi reale, la 0, la 2 440 și la 10⁶ mm; controale cu o eroare cunoscută de 1e-9 mm.

## Ce am respins

- **PathKit + R3 la ușă** (ADR 0003, ADR 0004): pierderile tăcute de la §„Ce am măsurat”, peste toleranța proiectului, și
  refuzul textului real. Clauza din ADR 0004 („se redeschide la un defect PathKit fără ocol”) e îndeplinită pentru ușă.
  CanvasKit (clauza lui de rezervă) are aceeași aritmetică float32.
- **PathKit ca veto:** refuzuri false pe text real.
- **Toleranța legată de poziție:** erori tăcute departe de origine.
- **Normalizarea doar pe formele în care euristica din 2.7c vedea perechi în același sens:** suprapunerile, dublurile și
  buclele care se înfășoară de două ori îi scăpau.

## Limitele

- Ce e mai subțire decât τ se poate pierde (§4); la o foaie întreagă, τ ≈ 2,4e-7 mm.
- Booleanul editorului (etapa 6) rămâne pe ADR 0004 până la reevaluare: același aranjament, cu alt predicat, dă reuniunea,
  diferența și intersecția exacte fără PathKit; decizia se ia atunci, cu măsurătorile ei.
- Regula `evenodd` cu contururi care se taie singure (o formă `evenodd` desenată ca pentagramă) nu se rescrie acum în
  contururi simple: sub `regula: 'evenodd'`, regiunea e deja `evenodd`, deci §6 o întoarce neschimbată (doar muchiile
  coincidente o schimbă). Rescrierea în contururi simple cere alt predicat al aceluiași aranjament și decizia ei (CAM-ul
  refuză azi conturul care se autointersectează, cu motiv).

**Se redeschide dacă:** fonturile din etapa 7 dau refuzuri pe glife reale, sau timpul pe text trece de buget.
