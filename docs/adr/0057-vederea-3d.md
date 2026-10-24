# ADR 0057: Vederea 3D a simulării

**Starea:** acceptat pe 24.10.2026. Cererea owner-ului: „Vreau sa continui” (felia 2 a simulării), cu alegerile „Vedere 3D
separată (Recomandat)”, „La deschiderea 3D (Recomandat)” și „Automat la zoom (Recomandat)”. **Intră în:** etapa 4, punctul 3
din `PLAN.md` §5.3 („Afișarea simulării în WebGL2”, cu „0,1 mm pe o fereastră” din ADR 0010), adusă în etapa 3 (plăcile
netăiate: `PLAN.md` §4.6, punctul 7). **Continuă:** ADR 0047 (nucleul și bazinul), ADR 0010 (rezoluția), ADR 0038 (stratul
WebGL2).

**Problema.** Nucleul (ADR 0047) calculează câmpul de înălțimi al plăcii, dar omul vedea doar harta adâncimilor din dialogul
exportului (cel mult 480 de pixeli, după descărcare). Felia 2 trebuia să arate placa tăiată din celulele nucleului (ADR 0010:
afișarea citește celulele, nu recalculează) și să dea 0,1 mm pe o fereastră, fără să atingă pornirea (99,8 / 100 kB cu ușa).

## Decizia

**1. O vedere separată, la cerere.** Butonul „3D” din extensia barei (secțiunea Vedere, după Oglindire) pune în locul pânzei
2D placa tăiată; Esc, același buton sau o unealtă de desen întorc la 2D. La deschidere, programul documentului de acum se
calculează (același CAM ca traseul, fără supracursă, fără export) și se simulează pe toată placa, în bazinul de workere.
Bucata vederii (`Vedere3D-*.js`, 6,7 kB gzip, cu CSS-ul ei) vine abia la primul clic: pornirea și modulul editării rămân
neschimbate. Simularea trece tot prin bucata calculului exportului (`programSimulare`, `fereastraFoii`, `simuleazaRelief`),
deci plasa din ADR 0047 (nucleul doar acolo și în worker) rămâne cum era; o plasă nouă în build ține shaderele doar în bucata
vederii.

**2. Relieful, din benzi.** La cerere, fiecare bandă întoarce și un relief: cel mai jos Z pe bloc de `bloc` × `bloc` celule,
cu `bloc` ∈ {1, 2, 4, 8, 16}, cel mai mic cu care relieful încape sub 4 194 304 pixeli (16 MB) și sub latura de 4096 (textura
minimă a WebGL2). Cu blocul o putere a lui 2, cel mult o dală, fiecare rând de pixeli stă într-un singur rând de dale, deci
într-o singură bandă: banda trimite doar rândurile ei (memoria totală e un relief, nu N), iar unirea le copiază, fără să
compare. La blocul 1, pixelii sunt chiar celulele nucleului (placa implicită de 300 × 200: 1200 × 800). Foaia de 2440 × 1220 la
0,25 mm iese pe blocuri de 4 (1 mm), iar vederea o spune. Amprenta, volumul și previzualizarea exportului nu se schimbă.

**3. Desenul.** Relieful urcă într-o textură R32F, citită cu `texelFetch` (fără filtrare). Suprafața e o grilă cu vârfurile în
centrele pixelilor (cele de pe margine, trase până la marginea plăcii), generată din `gl_VertexID` și `gl_InstanceID` (un rând
de pixeli = o bandă de triunghiuri, fără buffere de vârfuri), plus cei patru pereți ai marginilor, de la fund până la celula de
pe margine. Normalele vin din derivatele poziției (fațete plane: celulele se văd ca trepte), cu o lumină direcțională.
Culorile sunt ale materialului, aceleași în ambele teme: fața, tăieturile (mai închise cu adâncimea), masa de sacrificiu unde
freza a trecut prin foaie (Z la fund) și pereții; fundalul e al pânzei. Se desenează doar la o schimbare (camera, mărimea,
tema), nu într-o buclă.

**4. Camera.** Orbitează în jurul unei ținte. Tragerea rotește (înclinarea între 10° și 89,5°); butonul drept sau Shift mută
(punctul apucat rămâne sub cursor); rotița apropie spre punctul de sub cursor (o omotetie în jurul lui, deci punctul nu se
mișcă pe ecran). Dublul clic și „Încadrează placa” reîncadrează; de la tastatură merg săgețile, + / − și 0. Încadrarea caută
distanța cea mai mică la care toate cele 8 colțuri ale plăcii cad în zona liberă dintre panouri, cu o margine (bisecție pe
colțurile proiectate: perspectiva mărește marginea apropiată, deci formula laturilor nu ajunge). Centrul imaginii se mută în
centrul zonei printr-o lentilă deplasată, fără nicio rotire.

**5. Fereastra de 0,1 mm, la apropiere.** Când ce se vede la țintă încape în 80 % din 204,8 mm (2048 de celule fine), după
250 ms de odihnă a camerei, zona din jurul țintei se simulează din nou la 0,1 mm: latura întreagă de 204,8 mm (mai puțin pe o
placă mai mică), pe grila dalelor celulei fine (pași de 1,6 mm), în placă. Relieful ei e la blocul 1, deci chiar celulele, și
se desenează peste placă (partea plăcii de sub ea se decupează); restul rămâne la celula plăcii. O fereastră nouă se cere doar
când ce se vede iese din cea veche, iar cea în curs se anulează. Rămâne desenată și când omul se depărtează. Celulele ei sunt
cele ale plăcii întregi la aceeași celulă (până la 10⁻⁶ mm: centrul unei celule se calculează din alt x0).

**6. Stările.** Fără WebGL2, vederea o spune și nu pornește simularea. Un context pierdut revine (în 5 s, altfel
„indisponibil”), cu texturile refăcute din relieful ținut. Refuzul CAM-ului se spune cu motivul lui; o eroare a bazinului
merge în jurnal (`reportError`). Un document schimbat după simulare se spune, cu „Simulează din nou” (camera rămâne unde a
lăsat-o omul). În 3D, tastele uneltelor și săgețile nu ating documentul, iar bara selecției (legată de cutia 2D) se ascunde.

## Ce nu face încă

- Nu urmărește documentul singură: simulează la deschidere și la cerere.
- Nu animă scula pe traseu (vine cu senderul).
- O singură fereastră fină; în afara ei, foaia mare rămâne pe blocuri.
- Pe o placă video slabă, foaia mare (2440 × 1220 de pixeli, ~6 milioane de vârfuri pe cadru) se rotește mai greu; un nivel
  de detaliu cât se trage, dacă se cere.

## Probele

- **Unitare:** relieful la blocul 1 e câmpul nucleului, celulă cu celulă (3 piese ale oracolului, pe 1 și 3 fire); la blocul 4
  e minimul pe bloc, același pe 1, 2 și 5 fire, cu amprenta, volumul și previzualizarea neschimbate; fereastra are celulele
  plăcii întregi; unirea refuză o bandă fără relief sau cu altă mărime. Camera: încadrarea minimă (colțurile în zonă, iar cu
  15 % mai aproape unul iese), raza de sub cursor (și cu lentila deplasată), apropierea și panoramarea care țin punctul,
  fereastra fină (pragul, grila de 1,6 mm, marginile, placa mică). Controale negative: relieful stricat cu o celulă, apropierea
  fără omotetie și fereastra în afara grilei cad.
- **E2e (Edge):** bucata vine la primul clic; placa de 300 × 200 la blocul 1; șanțul profilului e mai închis decât fața (pixelii
  citiți prin matricea cadrului, `data-pv`); fereastra fină la apropiere, pe grilă și în placă; rotirea, mutarea, încadrarea și
  tastele; documentul schimbat și „Simulează din nou”; Esc și unealta; refuzul fără operații; fără WebGL2, mesajul și niciun
  worker al simulării.
