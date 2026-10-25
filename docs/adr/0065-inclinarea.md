# ADR 0065: Înclinarea

**Starea:** acceptat pe 25.10.2026. Felia aleasă de asistent la „Continua […] dupa ce terminam cu uneltele de desen”: din rândul
„Transformare și copiere” al acoperirii rămăseseră înclinarea și copierea de-a lungul unei curbe. **Intră în:** etapa 6
(„Editorul de vectori”), adusă în etapa 3, fără mașină. **Continuă:** ADR 0052 (scalarea exactă a geometriei), ADR 0054
(oglindirea), ADR 0061 / 0064 (panourile din extensie).

**Problema.** O formă nu se putea înclina (oblic, ca un text italic sau o ramă în perspectivă): mutarea, scalarea, rotirea și
oglindirea erau gata, înclinarea nu.

## Decizia

**1. O înclinare, în model** (`fel: 'inclinare'` în `src/model/transformare.ts`, prin acțiunea existentă `document.transforma`).
Două unghiuri, în grade, față de centrul cutiei selecției: întâi orizontal (x crește cu tan(unghiX) · distanța pe y), apoi
vertical (y crește cu tan(unghiY) · distanța pe x). Matricea H = Hy · Hx are determinantul 1: aria se păstrează. Unghiurile, cel
mult 75° în valoare absolută (tan 75° ≈ 3,7: dincolo, forma devine o așchie).

**2. Exact, în geometrie.** H nu e o similitudine, deci nu poate sta în matrici (ușa le cere similitudini, arcele trec doar prin
ele). Fiecare element, cu matricea lui în lume W, primește în geometrie A = W⁻¹ · H · W: punctul p ajunge în W · A · p = H · W · p,
iar instanța și nodurile își păstrează matricele. Liniile rămân linii, cubicele rămân cubice (punctele de control se transformă,
deci exact); dreptunghiul devine conturul lui ca o cale (un paralelogram). **Arcele se refuză** (cercul, colțurile rotunjite, o
cale cu arce): sub o înclinare, arcul devine arc de elipsă; cercul rămâne cerc prin orice operație (BRIEF §16). Ca la scalare,
o piesă folosită de mai multe instanțe se refuză.

**3. Panoul** stă în secțiunea Oglindire a extensiei (butonul cu un pătrat și paralelogramul lui): Orizontal și Vertical, în
grade (gol = 0), motivul (nimic ales, unghiurile, verdictul modelului), Înclină și Închide; formularul se ține în browser; cât
panoul e deschis, cutia selecției înclinată se vede pe pânză, punctat; Esc îl închide. Panourile extensiei (rețeaua, offsetul,
înclinarea) sunt acum o singură stare: unul deschis odată.

**4. Pornirea** nu primește nimic: modelul stă în calculul la cerere, panoul în modulul editării. Inversa afină are acum un singur
loc (`geom/inversa.ts`, în afara pornirii), folosit de Noduri și de înclinare.

## Respinse

- **Înclinarea din mânere** (trasă de laturile cutiei, ca în unele programe de desen): mânerele laturilor scalează deja (ADR
  0052); un mod în plus al lor ar cere încă un gest de învățat. Panoul numeric e și precis.
- **Arcele aproximate cu cubice** ca să poată fi înclinate: aproximare, contra regulii cercului.
- **Înclinarea pusă în matricea rădăcinii** (cum face oglindirea): ar scoate matricele din similitudini, iar ușa le refuză.

## Se redeschide dacă

- se cere înclinarea din mânere;
- se cere înclinarea formelor cu arce (cu conversia arcelor, spusă omului).
