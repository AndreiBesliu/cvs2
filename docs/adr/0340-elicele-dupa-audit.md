# ADR 0340: Elicele după audit: tipărirea spusă cinstit, ventilatorul ca trusă, grosimea la elicele mari, duza Kort

**Starea:** acceptat pe 27.11.2026, cu recomandările auditului (1a, 2a, 3a, 4a), la cuvântul owner-ului transmis de
sesiunea principală („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca asteapta”). Feliile 3.Cm-1…3.Cm-7, în
ordinea din audit, ale liniei atelierului (ramura `wip/3.Xh-biblioteca-ui`). **3.Cm-1…3.Cm-4 implementate pe 27.11**
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

**Rămâne la owner** (lista grupată, cu recomandarea întâi): verdictul după treapta cea mai mare, oricât de îngustă ar fi
fâșia? a (recomandat): ca acum (suport doar când și consola de la vârf trece de 1 mm; elicea implicită, 92842, 15790 și
rotorul implicit spun „aspru pe alocuri”, cu treapta lor); b: doar după treaptă (atunci acelea patru cer suport sub
vârfuri); c: pragul de sus, mutat după proba de tipărire (de exemplu la 1,6 mm). Proba de tipărire a elicei implicite, fără
suport, cu brim, e deja în coada owner-ului: ea spune care e drept.
