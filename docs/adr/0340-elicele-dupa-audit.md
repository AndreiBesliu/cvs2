# ADR 0340: Elicele după audit: tipărirea spusă cinstit, ventilatorul ca trusă, grosimea la elicele mari, duza Kort

**Starea:** acceptat pe 27.11.2026, cu recomandările auditului (1a, 2a, 3a, 4a), la cuvântul owner-ului transmis de
sesiunea principală („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca asteapta”). Feliile 3.Cm-1…3.Cm-7, în
ordinea din audit, ale liniei atelierului (ramura `wip/3.Xh-biblioteca-ui`). **3.Cm-1…3.Cm-7 implementate pe 27.11: toate feliile ADR-ului**
(mai jos).
**Continuă:** ADR 0282 (elicele, feliile 3.Tq–3.Tt). **Pleacă de la:** `docs/linii/audit-elice.md` (auditul din 25.11, pe
Easy 3Draw 18.30.0). Primul număr al intervalului 0340–0349 al liniei atelierului.

## Ce a hotărât owner-ul (întrebările auditului)

1. **Paletele care ies mult peste strat:** a, textul spune pe praguri cât de bine iese și când cere suport sau margine
   (brim); piesele nu se schimbă.
2. **Grosimea paletelor la elicele mari:** a, crește cu diametrul doar peste un prag (Ø80), deci piesele de azi de sub prag
   rămân aceleași, la octet.
3. **Ventilatorul ca trusă:** a, rândul grinzii în „Se prinde cu” al carcasei și, la bifă, „Fă ventilatorul” cu grinda,
   axul și o jumătate de bucșă.
4. **Ce funcție nouă întâi:** a, duza Kort (elicea de barcă într-un tub).

## Feliile

| Felia | Ce | Constatarea din audit |
|---|---|---|
| 3.Cm-1 | otrăvurile elicelor, aduse pe codul de azi și rulate din nou | 2 |
| 3.Cm-2 | tipărirea spusă cinstit: treapta dintre straturi pe praguri, marginea de aderență | 1 (și fraza bărcii, din 5) |
| 3.Cm-3 | ventilatorul ca trusă | 3 |
| 3.Cm-4 | claritatea editorului (sensul, avertismentele, „Repede” la elice) | 5 |
| 3.Cm-5 | grosimea paletelor după diametru, doar peste Ø80 | 6 |
| 3.Cm-6 | curățenia motorului (secțiunile, butucul, `nr`, `laturiFine`), singură, la octet | 7 |
| 3.Cm-7 | duza Kort | 8 |

Easy 3Draw continuă de la 18.45.0, câte o versiune pe felia care schimbă pachetul.

## Implementarea (3.Cm-1): otrăvurile elicelor pe codul de azi

Cele 22 de otrăvuri ale elicelor găsite VOID de audit (6 în `3.Tq.py`, 10 în `3.Tr.py`, 6 în `3.Ts.py`) fuseseră deja
aduse la zi pe 26.11, cu 3.Cf-2 („30 de ancore în opt liste”, rulate din nou: 30 / 30). De atunci au trecut opt felii ale
atelierului (3.Cg–3.Ck-2, 3.Cl-1–4), deci 3.Cm-1 le rulează pe toate din nou, pe codul de azi: `3.Tq.py`, `3.Tr.py`,
`3.Ts.py`, `3.Tt.py` și listele lor în engleză (472 de otrăvuri), fără să sară vreuna. Listele primesc `E2E_BUILD = False`
(spec-urile elicelor își fac pagina din surse: build-ul aplicației înaintea fiecărei otrăvi nu schimbă nimic din ce
otrăvesc), ca listele mai noi ale pluginului. **Rezultatul: toate prinse** (`3.Tq` 138 / 138, `3.Tr` 141 / 141, `3.Ts`
134 / 134, `3.Tt` 35 / 35, listele în engleză 24 / 24), în registrul `docs/otravuri.md`.

## Implementarea (3.Cm-2): tipărirea spusă cinstit

**Ce a găsit proba pe plasă.** Auditul judeca tipărirea după consola de la vârf, 0,2 / tan β(R): cât iese un strat de
0,2 mm peste cel de dedesubt pe coarda secțiunii de la vârf. Proba cerută de el („consola socotită pe plasă, egală cu cea
din text”) a arătat că numărul acesta e doar o medie, greșită în ambele sensuri:

- **pe paleta curbată (placa cu săgeata de 4 %, profilul de aripă), dedesubtul se culcă spre muchia de sus:** treapta
  crește de-a lungul secțiunii, de la ~0,5 mm lângă masă la 1,53 mm în ultimele straturi, pe jumătatea de afară a paletei
  elicei implicite (consola de la vârf: 0,90). La fel 92842 (1,30 față de 0,75), 15790 (1,37 față de 0,75), rotorul
  implicit (1,31 față de 0,75);
- **la un vârf jos, de un singur strat, nu iese nimic peste nimic**, oricât ar spune consola: elicea de barcă Ø20 cu pasul
  0,5 are consola 1,26, dar treapta cea mai mare, 0,67;
- la primele straturi de lângă masă, muchia rotunjită a secțiunii lasă și ea o treaptă (elicea de barcă implicită: 0,85,
  la al doilea strat).

**Ce s-a făcut.** Piesele nu se schimbă (1a); se schimbă ce spune editorul:

1. **Motorul** (`extensii/trenulet/sursa/lego/lego.ts`, lângă `paleteElice`): `treaptaPalete` (treapta cea mai mare dintre
   două straturi, pe secțiunile din afara butucului, cu straturile tăiate la mijloc, la 0,1 + 0,2k, ca un program de
   feliere, pe amândouă marginile secțiunii), `ariaFeliei` (aria plasei la planul z = h) și `tiparPalete` (verdictul).
   Elicea, elicea de barcă și rotorul îl dau în piesă (`tipar`, în `Rezultat`); carcasa și celelalte piese, nu.
2. **Verdictul, pe praguri** (`TIPAR`): treapta de cel mult 0,5 mm (cam o linie de duză de 0,42), **fără suport**; peste
   1 mm și treapta, și consola de la vârf, **cu suport sub vârfuri** (sau un pas mai mare); altfel, **fără suport, dar aspru
   pe alocuri** (ventilatorul de răcire, la maxim). Elicea de barcă înclinată spre pupa: **cu suport sub palete**, ca până
   acum.
3. **Marginea de aderență (brim):** când primul strat (felia plasei la 0,1 mm) acoperă sub 10 % din discul paletelor
   (elicea implicită: 1,3 %; 6041: 6,8 %; rotorul implicit: 6,7 %), editorul o cere. Elicele mici, care stau mai ales pe
   butuc (Ø20: 12–14 %), nu o primesc.
4. **Editorul** (`atelier.ts`): textul din parametri al celor trei piese nu mai spune nimic de tipărire; paragraful nou
   (`#at-tipar`), în panoul piesei, sub „Se prinde cu”, umplut după construire, spune verdictul, treapta cea mai mare (cu
   două zecimale) și, la nevoie, marginea. Întâi stătea în editor, sub text: pornea ascuns la fiecare redesenare și apărea
   după construire, deci muta butoanele de sub el, iar lotul e2e a prins, sub încărcare, un clic pierdut pe „Fă perechea”;
   în panoul piesei nu mai e refăcut de editor. Se ascunde în vederea „Modelul”, la forma din cvs2, la piesele din circuit
   și la o eroare. Descrierile nu mai promit „fără suport” oricum, iar a elicei de barcă nu se mai
   contrazice (fraza din constatarea 5 a auditului).

**De ce verdictul nu stă doar pe treaptă:** pe paleta curbată, treapta de peste 1 mm e o fâșie îngustă, în ultimele unul–trei
straturi ale fiecărei secțiuni, spre muchia de sus a jumătății de afară; o fâșie așa iese zdrențuită, nu cade. Cât timp
consola de la vârf (coarda, adică dedesubtul în ansamblu) rămâne sub 1 mm, textul spune „aspru pe alocuri” și treapta. Iar
consola singură nu poate cere suport: la vârful jos n-are peste ce ieși.

**Probele:** `test/unit/trenulet.tipar.test.ts` (consola pe hârtie; treapta, măsurată pe plasă dintr-o reimplementare
separată, egală cu a motorului, pe paisprezece piese, și mai mare decât consola pe paleta curbată; regula pe o plajă de 72 de
piese și pe câte o piesă din fiecare fel; aria primului strat, tot pe plasă; carcasa fără verdict); e2e, în
`trenulet.elice.spec.ts`, `trenulet.barca.spec.ts`, `trenulet.ventilator.spec.ts`, `trenulet.pupa.spec.ts` și în proba
în engleză din cvs2. Plasele, neschimbate: amprenta a 742 de piese ale celor trei elice, aceeași înainte și după.
Otrăvurile: `3.Cm-2.py`, 42 / 42 (două întăriri de probă după prima rulare: elicea cu pasul 0,6 și 0,65 pentru pragul de
sus, proprietatea `hidden` a paragrafului la carcasă; două otrăvuri echivalente scoase cu motivul; A13, paragraful rămas la vedere în „Modelul”, adăugată odată cu mutarea lui); `3.Cm-2-en.py`, 6 / 6;
cele 12 ancore ale listelor `3.T*` mutate de felie, 12 / 12.

**Easy 3Draw 18.45.0.**

## Implementarea (3.Cm-3): ventilatorul ca trusă

Răspunsul 3a: rândul grinzii în „Se prinde cu” al carcasei și, la bifă, „Fă ventilatorul” cu grinda, axul și o jumătate
de bucșă.

- **Motorul** (`ventilatorTrusa`, lângă `ventilatorCote`): sub carcasă, o grindă groasă cu **2k + 1** găuri rotunde (k,
  câți pași sunt de la ax la găurile urechilor), prinsă cu știfturi de două urechi opuse: găurile de la capete cad pe
  urechi, cea din mijloc pe ax (Ø40: 7 găuri; Ø48: 9). Pe grindă, o **jumătate de bucșă** (3,8 mm), apoi rotorul: paletele
  stau toate în tub (carcasa e cât ele + 4 mm, cel puțin 8), iar rotorul nu se freacă de grindă. **Axul**, cel mai scurt
  care trece prin grindă, bucșă și butucul rotorului, în pași de 8 mm (Ø40: 7,8 + 3,8 + 8 = 19,6 mm, deci 3).
- **Atelierul:** la carcasă, „Se prinde cu” are rândul „Pe o grindă de N, prinsă cu știfturi de două urechi opuse, axul
  trece prin gaura din mijloc; pe grindă, o jumătate de bucșă, iar pe ea rotorul, în tub.” și „Pune grinda în listă”. Sub
  „Fă ventilatorul”, bifa „Și trusa: …” (a editorului, nu a piesei; oprită la început): cu ea, „Fă ventilatorul” pune și
  grinda, axul, bucșa și cele două știfturi Technic ale urechilor, câte o trusă pe ventilator.
- **Probele:** `test/unit/trenulet.trusa.test.ts` (3 teste, pe zece ventilatoare: găurile grinzii față de găurile urechilor
  carcasei, măsurate pe prinderile ei; paletele rotorului, măsurate pe plasă, în tub; axul cel mai scurt); e2e, un scenariu
  în `trenulet.ventilator.spec.ts` (rândul, butonul, „Fă ventilatorul” cu bifa, numele pieselor din listă, bifa după o
  redesenare) și eticheta în proba în engleză. Otrăvurile: `3.Cm-3.py`, 23 / 23, la prima rulare; `3.Cm-3-en.py`, 2 / 2.
- **Easy 3Draw 18.46.0.** Doar pachetul extensiei se schimbă.

## Implementarea (3.Cm-4): claritatea editorului

Constatarea 5 a auditului, fără desenul pasului (pe care auditul îl socotea separat, ~1 h):

- **Sensul:** sub butoanele „Dreapta / Stânga” ale celor trei piese, o frază care spune cum alegi după motor: pornești
  motorul și privești axul dinspre el (la elice), din spatele bărcii (la elicea de barcă) sau dinspre partea spre care vrei
  să sufle (la rotor); în sensul acelor de ceasornic, „Dreapta”. Și cu ce parte stă piesa pe ax: partea de pe masă spre motor,
  spre barcă, spre partea spre care suflă. Fraza stă pe geometrie: la elice și la elicea de barcă o probau deja testele lor
  (muchia de sus în sensul rotației); la rotor, proba e nouă (`trenulet.claritate.test.ts`: la „dreapta”, muchia de sus spre
  +θ, ca la elice).
- **Valorile din afara plajei:** motorul nu le mai strânge în tăcere: fiecare câmp numeric al celor trei elice (paletele,
  diametrul, pasul, lățimea, cele două înclinări ale elicei de barcă, jocul și urechile ventilatorului) trece prin același
  cititor (`campElice`, ca `camp` din `roataPaleteCote`): ce nu e număr ia implicitul, fără nimic de spus; în afara plajei,
  marginea, iar textul (cu valoarea făcută, cu zecimala limbii) intră în `avert`, în piesă și în `…Cote(d).avert`. Un câmp gol
  nu mai spune „am făcut-o cu 3” (la elice și la elicea de barcă, `+""` era 0). **Editorul** nu mai ignoră o valoare din afara
  plajei: pune marginea, câmpul o arată, iar sub câmpuri apare mesajul motorului pentru acel câmp (`#at-plaja`), până la
  următoarea schimbare a piesei (o alegere, un câmp în plajă) sau până la altă piesă; un câmp golit rămâne cu ce era, fără
  mesaj. Piesa făcută la margine e chiar piesa de la margine (aceeași plasă).
- **„Repede” la elice:** diametrele pe grila de știfturi, Ø40, Ø56, Ø72 și Ø96 (5, 7, 9 și 12 știfturi), ca la elicea de barcă
  și la ventilator; rândul pieselor LEGO se numește acum „Piese LEGO”.
- Fraza elicei de barcă care se contrazicea fusese deja îndreptată în 3.Cm-2.

**Probele:** `test/unit/trenulet.claritate.test.ts` (6 teste: fiecare câmp, de ambele părți ale plajei, la margine și fără număr,
în piesă și în cote, la toate trei; ordinea textelor; plasa de la margine; sensul rotorului) și proba înclinării spre pupa din
3.Tt (`trenulet.pupa.test.ts`), adusă la regula nouă (cerea strângerea fără avertisment); e2e, în `trenulet.elice.spec.ts`
(fraza, mesajul, câmpul golit, altă piesă, „Repede”), `trenulet.barca.spec.ts`, `trenulet.ventilator.spec.ts` (și carcasa),
`trenulet.pupa.spec.ts`, cu buclele marginilor aduse la regula nouă, și în proba în engleză din cvs2. Otrăvurile: `3.Cm-4.py`,
35 / 35 (C10, pe setul greșit la prima rulare); `3.Cm-4-en.py`, 5 / 5.

**Easy 3Draw 18.47.0.**

## Implementarea (3.Cm-5): grosimea paletelor la elicele mari

Răspunsul 2a: grosimea crește cu diametrul doar peste Ø80, deci piesele de până la Ø80 rămân aceleași, la octet.

- **Motorul** (`GROS_PRAG`, `grosK`, lângă `eliceCote`): peste Ø80, paleta elicei și a rotorului se îngroașă în aceeași formă,
  cu k = Ø / 80: de la 1,2 · k la rădăcină la 0,8 · k la vârf (elicea Ø200: 3 și 2 mm; Ø100: 1,5 și 1; rotorul Ø120: 1,8 și
  1,2); până la Ø80, k = 1. La ventilator, pragul e diametrul din carcasă (câmpul editorului). Cotele o spun (`tRad`, `tVarf`,
  și în API). Elicea de barcă nu se schimbă: își avea deja grosimea după diametru (4 %, între 1,6 și 3).
- **Ce se mai schimbă cu ea, peste Ø80:** butucul, înalt cât cea mai înaltă secțiune (elicea Ø200 cu 2 palete, pasul 1,5 și
  lățimea 60: de la 36,0 la 36,2; rotorul Ø120 cu jocul 2: de la 12,4 la 12,7), carcasa, înaltă cât paletele + 4 (Ø120 cu pasul
  1,5: de la 31 la 32), coarda minimă de la vârf (2,5 · grosimea: Ø155,3, de la 2 la 3,88).
- **Editorul:** peste Ø80, textul elicei și al rotorului spune „Peste Ø80, paleta e mai groasă: … mm la rădăcină, … la vârf.”

**Probele:** `test/unit/trenulet.grosime.test.ts` (3 teste: amprenta a 48 de elice și 32 de ventilatoare de până la Ø80 și a 12
elice de barcă pe toată plaja, luată din motorul lui 18.47.0, înaintea feliei; cotele pe hârtie; grosimea măsurată pe
secțiunile plasei, la rădăcină și spre vârf, la Ø200, Ø120 și sub prag); cinci valori pe hârtie din probele elicei și ale
ventilatorului, pe piese de peste Ø80, refăcute cu grosimea nouă; e2e, câte un scenariu în `trenulet.elice.spec.ts` și
`trenulet.ventilator.spec.ts` și fraza în proba în engleză din cvs2. Otrăvurile: `3.Cm-5.py`, 13 / 13, și `3.Cm-5-en.py`, 2 / 2, din prima rulare.

**Easy 3Draw 18.48.0.**

## Implementarea (3.Cm-6): curățenia motorului, la octet

Constatarea 7, singură, fără altă felie a liniei deschisă:

- **Secțiunile:** cele trei generatoare (elicea, elicea de barcă, rotorul) folosesc acum o singură funcție, `sectiunePaleta`
  (profilul rotit cu β, coarda strânsă până încape în 85 % din pasul dintre palete), cu `latimePeCerc`. Ce era diferit fără
  explicație (strângerea se oprea după 8 pași la elice și după 40 la celelalte) a rămas un parametru: cu 40 la elice, unele
  piese s-ar schimba. **Măsurat** (pe 5 040 de elice, 270 de elice de barcă și 144 de rotoare, din clonă, cu motorul
  instrumentat): la elice, plafonul de 8 pași e atins cu secțiunea încă mai lată decât U în 604 stații, dar 580 sunt în butuc
  (acolo nu contează), iar celelalte 24 trec de U cu cel mult 0,16 % (paleta ocupă 85,1 % din pasul dintre palete, nu 85 %):
  paletele nu se ating. La rotor, cele 6 stații peste U sunt tot în butuc, chiar cu 40 de pași (coarda e deja la minim); la
  elicea de barcă, strângerea nu trece de 3 pași. Deci cei 8 pași nu ascund o greșeală.
- **Cercurile:** `laturiCerc` al ventilatorului era chiar `laturiFine` (săgeata 0,02 mm, multiplu de 8): a rămas unul.
- **`nr`**, cititorul cu implicit scris de trei ori în cotele elicelor, plecase deja în 3.Cm-4 (`campElice`).
- **Butucul nu s-a unit:** `butucRoata` (roțile, fulia, conicele, roata cu palete, cama) pune gaura fără verificarea peretelui,
  iar `butucElice` o rotește când peretele scade sub 0,8 mm și are și gaura de bară. La calibrările extreme ale găurii de ax
  (varianta 9 cu un butuc mic), o funcție comună ar schimba roțile, deci n-ar fi o curățenie la octet; rămân două, cu
  prinderile deja comune (`prinderiButuc`).

**Probele:** `test/unit/trenulet.curatenie.test.ts` (3 teste: amprenta a 360 de elice, 240 de elice de barcă și 240 de
ventilatoare, pe toată plaja, cu plasa, prinderile, tipărirea și cotele, luată din motorul lui 18.48.0, înaintea feliei: aceeași
după). Otrăvurile: `3.Cm-6.py`, 9 / 9 (S03 și S08, echivalente, scoase cu motivul; S06, prinsă, a dus la măsurătoarea de
mai sus).

**Easy 3Draw 18.49.0** (pachetul are alte surse, deci altă versiune; piesele, aceleași).

## Implementarea (3.Cm-7): duza Kort

Răspunsul 4a: elicea de barcă într-un tub, ca la remorchere. Auditul o vedea „mai mult o potrivire a lor decât o piesă nouă”;
așa s-a făcut:

- **Piesa:** a doua piesă a elicei de barcă (`piesa: "duza"`), ca rotorul și carcasa ventilatorului: în editor, „Piesa: Elicea /
  Duza Kort”. Câmpurile elicei (diametrul, paletele, pasul, lățimea, înclinările) dau elicea din duză; ale duzei sunt jocul la
  vârf (0,3–2 mm, implicit 0,8), lungimea (0,3–0,8 × Ø, implicit 0,5, ca la duza Kort 19A) și urechile (2 sau 4). Definiția
  elicei își păstrează exact cheile de dinainte (o listă salvată o adună pe linia ei).
- **Profilul, tipăribil fără suport** (`duzaCote`, `duzaKort`): interiorul, Ri = R + jocul, drept pe toată elicea; gura dinspre
  barcă, jos, pe masă, rotunjită pe 0,3 · L (raza crește spre masă cu f = 0,4 · 0,3 · L, cel mult 0,8 mm pe mm de înălțime);
  peretele, jos cât o grindă de înalt (gulerul, gros de 0,08 · Ø, între 1,6 și 4), apoi subțiat până la 1,2 sus. Lungimea
  crește singură cât să cuprindă elicea (bucșa + butucul + 1 mm), iar textul o spune.
- **Montajul, ca la ventilator** (3.Cm-3): urechile pe grila axului (k · 8 mm, cu lamajul în afara gulerului), cu găuri de știft;
  pe o grindă de 2k + 1 prinsă de ele, axul trece prin gaura din mijloc; pe grindă, o jumătate de bucșă, iar pe ea elicea, în
  duză. „Fă elicea cu duza” le pune pe amândouă în listă.

**Probele:** `test/unit/trenulet.duza.test.ts` (7 teste: cotele pe hârtie; corpul închis, cu volumul pozitiv, pe plajă; interiorul,
gura și gulerul măsurate pe plasă; elicea cuprinsă; tipărirea fără suport, din pantele plasei; urechile pe grilă, prin toată
grosimea; marginile) și amprenta elicei de barcă fără `piesa` (`trenulet.curatenie.test.ts`, neschimbată); e2e,
`trenulet.duza.spec.ts` (editorul, câmpurile, marginile, „Fă elicea cu duza”, STL-ul închis) și duza în proba în engleză.
Otrăvurile: `3.Cm-7.py`, 29 / 29 (22 / 29 la prima rulare: șapte goluri ale probelor, închise: urechile pe toată plaja
și la distanțe egale, urechile 2 și 4 fără mesaj, gura și peretele pe hârtie, cheile vechi ale elicei, duza fără capac);
`3.Cm-7-en.py`, 3 / 3.

**Easy 3Draw 18.50.0.**

**Alese de linie, cu recomandarea (la owner, dacă le vrea altfel):** (1) duza ca a doua piesă a elicei de barcă, nu ca piesă
separată în galerie; (2) profilul simplificat, tipăribil fără suport (interiorul drept, gura rotunjită spre barcă, gulerul și
peretele subțiat), nu profilul de aripă al duzei 19A, care cere suport; (3) montajul pe grindă, ca ventilatorul, nu un braț
spre corpul bărcii; (4) lungimea implicită 0,5 × Ø, crescută singură cât să cuprindă elicea.

**Rămâne la owner** (lista grupată, cu recomandarea întâi): verdictul după treapta cea mai mare, oricât de îngustă ar fi
fâșia? a (recomandat): ca acum (suport doar când și consola de la vârf trece de 1 mm; elicea implicită, 92842, 15790 și
rotorul implicit spun „aspru pe alocuri”, cu treapta lor); b: doar după treaptă (atunci acelea patru cer suport sub
vârfuri); c: pragul de sus, mutat după proba de tipărire (de exemplu la 1,6 mm). Proba de tipărire a elicei implicite, fără
suport, cu brim, e deja în coada owner-ului: ea spune care e drept.
