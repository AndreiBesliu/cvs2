# ADR 0340: Elicele după audit: tipărirea spusă cinstit, ventilatorul ca trusă, grosimea la elicele mari, duza Kort

**Starea:** acceptat pe 27.11.2026, cu recomandările auditului (1a, 2a, 3a, 4a), la cuvântul owner-ului transmis de
sesiunea principală („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca asteapta”). Feliile 3.Cm-1…3.Cm-7, în
ordinea din audit, ale liniei atelierului (ramura `wip/3.Xh-biblioteca-ui`). **3.Cm-1 și 3.Cm-2 implementate pe 27.11**
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
4. **Editorul** (`atelier.ts`): textul din parametri al celor trei piese nu mai spune nimic de tipărire; paragraful nou de
   sub el (`#at-tipar`), umplut după construire (ca unghiul pantei), spune verdictul, treapta cea mai mare (cu două
   zecimale) și, la nevoie, marginea. Descrierile nu mai promit „fără suport” oricum, iar a elicei de barcă nu se mai
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
Otrăvurile: `3.Cm-2.py`, 41 / 41 (două întăriri de probă după prima rulare: elicea cu pasul 0,6 și 0,65 pentru pragul de
sus, proprietatea `hidden` a paragrafului la carcasă; două otrăvuri echivalente scoase cu motivul); `3.Cm-2-en.py`, 6 / 6;
cele 12 ancore ale listelor `3.T*` mutate de felie, 12 / 12.

**Easy 3Draw 18.45.0.**

**Rămâne la owner** (lista grupată, cu recomandarea întâi): verdictul după treapta cea mai mare, oricât de îngustă ar fi
fâșia? a (recomandat): ca acum (suport doar când și consola de la vârf trece de 1 mm; elicea implicită, 92842, 15790 și
rotorul implicit spun „aspru pe alocuri”, cu treapta lor); b: doar după treaptă (atunci acelea patru cer suport sub
vârfuri); c: pragul de sus, mutat după proba de tipărire (de exemplu la 1,6 mm). Proba de tipărire a elicei implicite, fără
suport, cu brim, e deja în coada owner-ului: ea spune care e drept.
