# ADR 0282: Elicele în atelierul Easy 3Draw: configurabile, tipărite fără suport, cu prinderea LEGO

**Starea:** propus pe 22.11.2026, la cererea owner-ului: „Vreau ca pluginul sa faca si elice, pentru imprimanta, si sa fie
si configurabile elicele si compatibile cu lego”. **Completează:** ADR 0280 (roțile, fulia, roțile la 90° și șenila),
ADR 0281 (piesele pe file), ADR 0169 (rotițele dințate, cu gaura pentru ax din calibrare), ADR 0129 (Planificatorul ca
extensie). Al treilea număr al intervalului 0280–0289 al pluginului. Schița, cu macheta de încercat și întrebările:
<https://claude.ai/artifact/CNQtNLBfAXxrMqQ3L4RebT>.

**Ce e azi.** Atelierul face cărămizi, legături și roți (fila Roți: roata dințată, conica, coroana, conica dublă, fulia,
roata cu anvelopă, șenila), toate cu prinderea LEGO din calibrare. Nicio piesă nu împinge aer sau apă.

**Elicele LEGO**, din numele pieselor în biblioteca LDraw („diametrul” e în știfturi, un știft = 8 mm): cu 3 palete, 6041
(Ø3½, gaură de ax), 65768 (Ø3½, gaură de știft), 2421 (Ø4, știft de roată), 4617b și 92842 (Ø5½, gaură de știft; 92842 cu
vârfurile drepte), 15790 (Ø9, gaură de știft); cu mai multe palete, 41530 (8, Ø5, gaură de ax), 87751 (7, Ø6, gaură de
știft) și 80273 (5, Ø9, gaură pătrată). Cotele exacte (butucul, gaura, unghiul paletelor), după întrebarea 3.

## Decizia (propusă)

1. **O piesă nouă, „Elice”**, din câțiva parametri:
   - **paletele:** de la 2 la 8;
   - **diametrul:** în știfturi, de la 3 la 25, din jumătate în jumătate (24–200 mm; masa imprimantei are 220);
   - **pasul**, cât ar înainta elicea într-o rotație, ca raport față de diametru (0,3–1,5; implicit 0,7); unghiul paletei la
     raza r vine din el: β(r) = atan(pas / 2πr);
   - **lățimea** (coarda cea mai mare, ca procent din rază) și **forma** paletei: rotunjită, îngustată spre vârf sau dreaptă;
     rădăcina e mai îngustă, iar paletele nu se ating la butuc;
   - **profilul:** placă curbată (implicit, se tipărește sigur) sau profil de aripă (mai eficient, cu muchia de fugă subțire);
   - **sensul:** dreapta sau stânga; „Fă perechea” pune în listă aceeași elice în ambele sensuri, pentru două motoare;
   - **prinderea**, ca la rotițe: gaura pentru ax (crucea din calibrare), rotundă pentru știft, pentru bară (Ø3,2, ca
     elicele mici LEGO pe o placă cu bară) sau fără; butucul de Ø10, înalt cât un știft (8 mm) sau cât cere paleta la
     rădăcină;
   - **conul din față**, la alegere.
2. **Tipărită fără suport:** butucul pe masă, iar fiecare secțiune a paletei își are muchia de jos tot pe masă. Paleta urcă
   deasupra ei înclinată cu β: abruptă lângă butuc, culcată spre vârf. La vârf, un strat de 0,2 mm iese cu 0,2 / tan β peste
   cel de dedesubt (la pasul 0,7, 0,9 mm): o consolă scurtă, fără suport; dedesubtul paletei iese ceva mai aspru decât fața
   de sus. Grosimea paletei scade de la 1,2 mm la butuc la 0,8 mm la vârf (două linii de duză). Toate paletele sunt la fel,
   deci elicea e echilibrată prin formă.
3. **Pe grila LEGO:** diametrul în știfturi și butucul cât un știft; „Ca LEGO …” pune parametrii elicelor de mai sus, iar
   elicea tipărită se montează pe același ax ca elicea LEGO pe care o înlocuiește.
4. **Toate tipurile intră, pe felii** (ordinea, după întrebarea 2): elicea (avion, aeroglisor, ventilator, rotor); elicea de
   barcă (3–5 palete late, înclinate înapoi, pentru bărcile cu motoare LEGO); ventilatorul cu carcasă (inelul din jurul
   elicei, cu jocul din calibrare și cu găuri de știft pentru grinzi).
5. **Ce nu face deocamdată:** nu estimează tracțiunea (poate veni ca felie, pe motoarele LEGO L, XL și Buggy); nu face elice
   mai mari decât masa imprimantei (un rotor din palete separate, prinse pe butuc, ar fi o felie a lui).

## Întrebările (recomandarea întâi)

1. **Unde stau elicele?**
   - **1a.** O filă nouă, „Elice”: elicea, elicea de barcă și ventilatorul cu carcasă (recomandat: familia crește, iar fila
     Roți are deja 7 piese).
   - **1b.** În fila Roți, după șenilă, fără filă nouă (fila ajunge la 10 piese).
2. **Ce vine întâi?**
   - **2a.** Elicea (avion, aeroglisor, ventilator, rotor), apoi barca, apoi carcasa (recomandat: e cea mai folosită cu
     motoarele LEGO).
   - **2b.** Elicea de barcă întâi.
   - **2c.** Ventilatorul cu carcasă întâi.
3. **De unde iau cotele LEGO?**
   - **3a.** Din LDraw, ca la roți: descarc fișierele celor 9 elice și pe cele comune pe care le folosesc (text, câțiva kB
     fiecare; licența CC BY 4.0) și măsor butucul, gaura, diametrul și unghiul paletelor (recomandat).
   - **3b.** Fără descărcare: doar diametrul și gaura, din numele pieselor; paletele, după modelul nostru.

## Feliile

- **3.Tq:** elicea (tot ce e la punctul 1), cu fila după răspunsul 1 și „Ca LEGO” după răspunsul 3.
- **3.Tr:** elicea de barcă.
- **3.Ts:** ventilatorul cu carcasă.

Ordinea, după întrebarea 2. Fiecare felie are motorul (`lego.ts`), editorul (`atelier.ts`), probele pe plase (corpul
închis, cotele, consola la vârf, paletele care nu se ating, pe toată plaja parametrilor) și otrăvurile, ca la roți; pachetul
urcă o versiune minoră la fiecare felie.
