# ADR 0074: Remedierile din testul uneltelor de desen

**Starea:** acceptat pe 25.10.2026, din raportul testului pas cu pas al owner-ului (ADR 0072; 29 de pași bine, 2 nemarcați,
notele lui), trimis cu „deocamdata uite raportul testului”. Felia 6.P↑, adusă din etapa 6 în etapa 3, fără mașină.
**Schimbă:** ADR 0059 §5 (alegerea cu clicul), ADR 0064 §1 și „Respinse” (colțurile offsetului), ADR 0066 (poziția față de
curbă), ADR 0063 (închiderea și anularea Pen-ului, mânerele). **Documentul:** neschimbat (v11).

**Problema.** Notele raportului, pe scurt: offsetul exterior rotunjea singur colțurile („nu vreau sa se pun automat colturile
rotunjite. vreau sa fie doar ca optiune”), iar după el nu se mai putea alege cu clicul ce era înăuntru; spre interior lipsea
rotunjirea; copierea pe curbă știa doar centrul pe curbă; Pen-ul termina deschis la dublu clic, iar Ctrl+Z anula pe planșă în
timpul desenului; mânerele despărțite cu Alt nu se mai puteau uni.

## Decizia

**1. Alegerea cu clicul** (`instantaLa`): întâi conturul cel mai apropiat dintre cele la cel mult toleranța clicului (la
egalitate, cel de deasupra); altfel, dintre formele închise care cuprind punctul (par-impar), cea mai mică. Înainte câștiga
forma de deasupra care cuprinde punctul, deci un contur nou, mai mare, desenat peste altul, prindea orice clic dinăuntru.

**2. Colțurile offsetului din desen** (`src/geom/colturi.ts`, peste ieșirea exactă a motorului, care rămâne a CAM-ului
neschimbată): **Ca originalul** (implicit) înlocuiește fiecare arc de colț (rază |d|, centrat într-un vârf ascuțit al
originalului) cu prelungirile vecinilor (dreaptă cu dreaptă, cu cerc sau cerc cu cerc) până se întâlnesc: colțul ascuțit rămâne
ascuțit, spre exterior și spre interior. Excepții, unde colțul rămâne arcul motorului: vârful ar ajunge mai departe de 10·|d| de
vârful originalului (colțuri mai ascuțite de ~11,5°, `LIMITA_PRELUNGIRE`), prelungirea ar veni mai aproape de |d| de original,
sau rezultatul s-ar atinge (întâi toate colțurile deodată, apoi colț cu colț). **Rotunjite** lasă arcele motorului și
racordează cu raza |d| orice colț rămas ascuțit (spre interior, colțurile drepte ale dreptunghiului; spre exterior, cele
intrânde), sau cu jumătate / un sfert dacă nu încape; un segment poate fi consumat întreg (capătul unui braț lat cât 2|d| devine
semicerc). Racordarea mută conturul doar mai departe de original. Alegerea stă în panou (Colțurile) și în formularul ținut în
browser. Garda: orice punct la cel puțin |d| de original, pe partea cerută, nimic atins.

**3. Copierea pe curbă, față de curbă:** **Pe ea** (centrul cutiei pe curbă, ca până acum; distanța îl mută pe normala din
stânga mersului, cu semn), **La stânga** / **La dreapta** (copia de acea parte, cu punctul ei cel mai apropiat de curbă la
distanța dată de tangenta locului; 0 = tangente). Punctul cel mai apropiat e exact pe contururi (linii, arce, cubice prin
rădăcinile lui ⟨B′(t), v⟩ = 0), cu rotirea copiei, nu cutia (un cerc nerotit pe o diagonală ar fi stat altfel la 5√2). Câmpuri
noi, opționale, în rețea (`pozitie`, `distanta`), judecate de `motivRetea` (|distanța| ≤ 10 000 mm).

**4. Pen-ul:** dublu clicul pune ultimul nod și **închide** calea pe primul (cu prea puține noduri, o termină deschisă); Enter
termină deschis. Tragerea din primul nod arată calea închisă cât tragi; cu Shift, se schimbă doar mânerul de închidere (primul
segment rămâne; înainte, Shift schimba tocmai primul segment). **Anularea în desen:** fiecare pas (un clic sau o tragere,
Backspace) ține nodurile de dinainte; cât calea are pași, Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z sunt ale ei, nu ale planșei.
**Redeschiderea** (propunerea owner-ului): Ctrl+Shift+Z imediat după un desen terminat redeschide calea cu pașii ei, prin
anularea pasului din proiect; „imediat” = proiectul e cel lăsat de desen și nu e nimic de refăcut (altfel Ctrl+Shift+Z reface,
ca peste tot). Lăsată cu Esc, calea redeschisă se întoarce cu Ctrl+Y (refacerea pasului anulat); terminată din nou, intră ca pas
nou.

**5. Mânerele:** Alt e o comutare: pe un nod neted desparte mânerele (ca până acum), pe unul despărțit le unește (celălalt
devine oglinda celui tras, aceeași dreaptă, aceeași lungime). **Curbă pe ambele părți** (C) pune mânerele pe aceeași dreaptă și
cu aceeași lungime: media celor două, lungimea celui care există, sau o treime din coardă fără niciunul (înainte, fiecare își
păstra lungimea).

**6. Cronologia din roadmap** (cererea „dupa test, sa actualizezi si zona asta din roadmap”): fiecare etapă fără fișă arată
câte felii aduse înainte sunt gata (↑N, cu legenda și în eticheta citită de cititorul de ecran), iar în panoul etapei, feliile
aduse stau în ordinea în care s-au început. Etapele 5, 6 și 14 n-au puncte în `PLAN.md` §5.3, deci bara lor rămânea goală.

## Probele

- pe hârtie: dreptunghiul 100 × 60 cu 5 mm: ca originalul 7700 / 4500 (colțurile chiar în (15, 15) … (125, 85)), rotunjite
  7700 − (4 − π)·25 și 4500 − (4 − π)·25; L-ul 60 × 60 cu brațele de 20: 3300 / 900 ca originalul, rotunjite 3300 − 4·s și
  900 − 4·s (s = 25 − 25π/4; colțul intrând adaugă, cele ieșite scad); „D”-ul (semicerc R20) spre exterior: colțurile în
  (±√600, −5), aria πR²/2 + 5√600 + 625·asin(0,2); triunghiul cu vârful de 3,4° rămâne rotunjit acolo;
- garda pe stea, pieptene, U cu fanta mai îngustă decât 2d, în ambele sensuri și feluri;
- clicul: forma mică dinăuntru, conturul mare deasupra; cel mai apropiat dintre două contururi în toleranță;
- curba: dreptunghiul 10 × 4 pe o linie (centrul ±0, mutat cu 3, la stânga tangent / la 2 mm, la dreapta), pe semicerc (centrul
  la R − 2), cercul R5 nerotit pe diagonală, tangent exact;
- mânerele: Alt unește în oglindă, C cu lungimea medie / a celui existent;
- e2e (Edge): colțurile din panou (4 / 8 segmente) și clicul dinăuntru; dublu clicul care închide, Ctrl+Z / Ctrl+Y în desen,
  Ctrl+Shift+Z care redeschide (și reface, când e ceva de refăcut), tragerea din primul nod cu calea închisă; copierea la stânga,
  la 2 mm.
- mutațiile țintite: 18 / 20 prinse. Cele două rămase sunt o gardă dublă a colțului prelungit (direcția intersecției și cea mai
  apropiată de vârf: pe un colț, a doua intersecție a vecinilor cade mereu înapoi, deci fiecare o acoperă pe cealaltă); scoase
  amândouă, sunt prinse (colțurile „D”-ului ies greșit). Distanța la original și atingerea au câte o probă care le ocolește pe
  celelalte (un original cu o muchie prin vârful prelungirii; un al doilea contur în calea ei).

## Respinse

- **Colțurile teșite** (o latură dreaptă între prelungiri): nimeni nu le-a cerut; se adaugă ca al treilea fel, cu proba lui.
- **Rotunjirea spre interior prin offsetul dus și întors** (2d înăuntru, d înapoi): ar fi scos și trăsăturile late între 2d și
  4d, deci altă formă, nu doar alte colțuri.
- **Ctrl+Shift+Z mereu ca redeschidere** după un Pen: ar fura refacerea; doar când nu e nimic de refăcut.
- **Tangenta după cutie** la copierea pe curbă: greșită pe orice formă rotunjită și pe orice copie nerotită pe o curbă înclinată.

## Se redeschide dacă

- se cer colțurile teșite sau o rază de rotunjire alta decât distanța;
- se cere tangența la curba întreagă (nu la tangenta locului) pe curbe strânse.
