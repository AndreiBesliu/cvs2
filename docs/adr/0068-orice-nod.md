# ADR 0068: Orice nod își schimbă tipul

**Starea:** acceptat pe 25.10.2026. Cererea owner-ului, înaintea testului lui: „vreau ca orice nod creat de orice unealta sa poata
activa curbele sau schimba tipul de inflexiune”. **Schimbă:** ADR 0063, unde „conversia arcelor în cubice ca să poată primi
mânere” era respinsă (aproximare); acum se face la cererea explicită a omului, sub toleranța de tăiere. **Intră în:** etapa 6,
adusă în etapa 3, fără mașină. **Continuă:** ADR 0062 (editarea nodurilor), ADR 0063 (tipurile), ADR 0067 (booleanul, cu găuri).

**Problema.** Două feluri de noduri nu se puteau face curbe: cele de lângă un arc (cercul, colțurile rotunjite, rezultatele
offsetului și ale booleanului: refuz „arcul ar trebui aproximat”) și toate nodurile unei piese cu mai multe contururi (un import,
un boolean cu găuri: unealta Noduri le refuza cu totul).

## Decizia

**1. Nodurile de pe arce sunt curbe.** Un nod cu un arc pe o parte face curbă pe partea aceea (pe cerc: pe ambele părți);
mânerul arătat e tangenta arcului (`manereAfisate`), la lungimea pe care o va avea după conversie.

**2. Arcul devine curbe abia la cerere** (`arcInCubice`, `arceInCubice`, `src/model/noduri.ts`): când omul schimbă tipul nodului
sau îi trage un mâner de pe arc. Arcul se împarte în n cubice ale aceluiași cerc (punctele de control pe tangente, la
4/3 · tan(φ/4) · r), cu n cel mai mic (cel puțin o bucată la 90°) la care abaterea maximă de la cerc,
r · 2·sin⁶(φ/4) / (27·cos²(φ/4)), e sub toleranța proiectului (0,001 mm, aceeași cu a biarcelor tăierii): un semicerc de rază 15
devine 3 cubice, unul de rază 100, 4, unul de rază 500, 5 (măsurat). Tangentele de la capete rămân ale arcului, deci un nod neted rămâne neted și forma nu se
schimbă până n-o schimbă omul. Vârfurile noi intră între capetele arcului; nodul ales își ține locul (indexul lui se mută cât
intră vârfuri înaintea lui). Arcele care nu ating nodul rămân arce.

**3. Tipurile, fără refuzul arcelor.** `schimbaTipNod` convertește întâi arcele vecine, apoi pune tipul (colț: scoate mânerele,
deci curba de lângă nod se îndreaptă; ambele; o parte); singurul refuz rămas e capătul unei căi deschise (o singură parte). Întoarce
și noul index al nodului. Scoaterea unui nod de lângă curbe rămâne refuzată (ADR 0062).

**4. Piesele cu mai multe contururi.** Unealta Noduri arată nodurile fiecărui contur al piesei alese (`formaNoduri` dă toate
elementele, cu id-ul lor); nodul ales e (contur, nod). O schimbare înlocuiește doar forma acelui element: `document.forma`
primește `nodEditat` (id-ul elementului în piesă; fără el, doar o rădăcină-element). Restul piesei (celelalte contururi,
operațiile) rămâne.

**5. Pornirea** nu primește nimic: modelul și unealta stau în bucățile la cerere, acțiunea e cea existentă.

## Respinse

- **Arcul întreg într-o singură cubică**: un semicerc s-ar abate cu ~1,8 % din rază (0,27 mm la R15), vizibil și peste toleranță.
- **Conversia la alegerea nodului** (fără o schimbare): ar schimba documentul doar pentru că omul s-a uitat.
- **Bucăți fixe de 45°** (fără criteriu): prea multe noduri pe razele mici, prea puțină precizie pe cele mari.

## Se redeschide dacă

- se cere scoaterea nodurilor de lângă curbe (cu potrivirea unei cubice, în toleranță);
- conversia trebuie să păstreze arcele acolo unde omul revine la tangentele inițiale.
