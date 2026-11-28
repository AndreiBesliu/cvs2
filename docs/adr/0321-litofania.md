# ADR 0321: Litofania

**Starea:** acceptat pe 28.11.2026, la cuvântul owner-ului („Porneste sesiunile, pune-le sa continue cu ce aveau la rand”,
transmis liniei reliefului de sesiunea principală la 09:40, cu „la întrebările care sunt ale owner-ului, scrie-le grupat cu
recomandarea în față și mergi înainte cu recomandarea”). Felia **18.1↑f**, linia reliefului. Alegerile owner-ului (§6) au
recomandarea aplicată, cum sunt implementate.

**Continuă:** ADR 0310 §7 (alegerea „Litofanie” din capul ferestrei unei imagini), §8 (rândul 18.1↑f), §12 (litofania: lumina
liniară sau după material, din față sau din spate, rama), întrebarea 6 cu răspunsul 6a (o placă albă translucidă de 6 mm,
grosimea rămasă 0,8–3,0 mm, bila Ø1,5–Ø3); ADR 0311 (grila, golurile, netezirea); ADR 0312 (finisarea, cu planul zero).

**Nu redeschide:** dalele, cuantizarea, calculul în workere, câmpul conservativ (ADR 0310, 0311). Documentul nu se schimbă:
rămâne **v32** (o litofanie e un relief obișnuit, cu un strat).

## Contextul

O litofanie e o placă translucidă a cărei grosime urmează imaginea: unde imaginea e închisă, placa e groasă și lasă să treacă
puțină lumină; unde e deschisă, placa e subțire. Văzută cu lumina din spate, placa arată imaginea. Pe CNC, ea se taie ca un
relief: suprafața tăiată lasă sub ea grosimea dorită.

## Decizia

1. **Relieful e harta grosimilor:** înălțimea fiecărei celule e grosimea rămasă a plăcii acolo, t = t_max − L · (t_max − t_min)
   (lumina liniară), cu L griul pixelului (sursa și netezirea, ca la relief, ADR 0311 §2, §3). Albul dă t_min, negrul t_max.
   Funcțiile sunt pure, în `src/relief/litofanie.ts`, și se probează pe hârtie (pătratele de gri, cu grosimile lor).
2. **Se taie cu planul zero la grosimea plăcii** (finisarea și degroșarea, „Relieful pe Z: planul zero”, ADR 0312 §2):
   suprafața e atunci la −T + t, deci sub ea rămân exact t mm. Cu „Peretele rămâne”, placa din jurul reliefului rămâne
   netăiată, deci e rama naturală a litofaniei. Fereastra o spune, cu grosimea foii active.
3. **Pixelii transparenți** sunt la grosimea maximă (opaci, ca o ramă), nu goi: o litofanie fără găuri.
4. **Rama** (mm, implicit 0): o bandă în jurul imaginii, la grosimea maximă; relieful crește cu ea pe fiecare latură (celula
   rămâne a imaginii, deci rama se rotunjește la celule întregi).
5. **Din spate:** harta e oglindită pe X, ca imaginea să se citească drept dinspre fața netăiată. Implicit: din față.
6. **Previzualizarea cu lumina din spate:** fereastra arată cât de deschisă e fiecare celulă, (t_max − t) / (t_max − t_min),
   citit din dalele cuantizate (ce se vede e ce se taie), în locul reliefului umbrit.
7. **De unde pornește:** a treia alegere din capul ferestrei unei imagini, **Litofanie**, lângă Vectori și Relief; fereastra
   e cea a reliefului, cu câmpurile litofaniei (grosimile, rama, fața, sursa, netezirea, lățimea) în locul sensului, înălțimii
   și bazei. O litofanie e mereu o piesă nouă (nu un strat pe un relief ales).
8. **Lumina după material** (transmisia Beer–Lambert, t din −ln(T) / μ) vine într-o felie a ei (18.1↑f-2), cu coeficientul
   materialului măsurat pe o plăcuță de trepte tăiată de owner; până atunci, lumina e liniară.

## Mișcă mașina?

Indirect: ce se taie e relieful. CAM-ul, finisarea și planul zero nu se schimbă (judecate deja de oracolul 3D); probele noi
fixează harta grosimilor pe hârtie, oglindirea, rama și pragurile, iar o probă a programului cere ca, cu planul zero la
grosimea plăcii, adâncimea fiecărui pătrat de gri să fie T − t.

## Alegerile owner-ului (cu recomandarea aplicată)

1. **Lumina:** liniară acum, după material într-o felie a ei, cu coeficientul măsurat pe o plăcuță tăiată de owner
   (recomandat). Alternativa: după material acum, cu coeficienți din literatură (nesiguri pentru plăcile lui).
2. **Pixelii transparenți:** la grosimea maximă (recomandat). Alternative: găuri tăiate prin placă; la grosimea minimă.
3. **Rama:** adăugată în jurul imaginii, la grosimea maximă, implicit 0 mm, fiindcă placa netăiată din jur e deja rama
   (recomandat). Alternativa: implicit 5 mm.
4. **Planul zero:** spus în fereastră și în manual, pus de om în Tăierea (recomandat: fără câmp nou în document). Alternativa:
   relieful ține minte că e o litofanie, iar rolul „Relief 3D” pune singur planul zero (cere documentul v33).
5. **Fața:** tăiată din față, implicit; „din spate” oglindește harta (recomandat).
6. **Grosimile implicite:** 0,8 și 3,0 mm (din răspunsul 6a). Alternative: 0,6 și 2,0 (lemn subțire, răspunsul 6b).
