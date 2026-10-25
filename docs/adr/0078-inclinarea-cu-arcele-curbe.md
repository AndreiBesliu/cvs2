# ADR 0078: Înclinarea cu arcele făcute curbe

**Starea:** acceptat pe 25.10.2026. Felia 6.Q↑, adusă din etapa 6 în etapa 3, fără mașină, la cererea owner-ului (cu captura
panoului înclinării, care refuza un cerc: „ar trebui sa am optiunea de a transforma cerul in elipsa, sau colturile”; „Da,
pornește înclinarea cu arcele făcute curbe.”). **Schimbă:** ADR 0065 §2 (arcele se refuzau) și „Respinse” (arcele aproximate
cu cubice), pe calea scrisă acolo („Se redeschide dacă: se cere înclinarea formelor cu arce, cu conversia arcelor, spusă
omului”). **Continuă:** ADR 0068 (arcele devin cubice la cerere, sub 0,001 mm). **Documentul:** neschimbat (v12).

**Problema.** Sub o înclinare, un arc devine un arc de elipsă, pe care documentul nu-l are: cercul, colțurile rotunjite și căile
cu arce nu se puteau înclina deloc. Owner-ul vrea să le poată înclina, știind că cercul devine elipsă.

## Decizia

**1. Alegerea omului.** Panoul înclinării are bifa **Arcele devin curbe (cercul devine elipsă)**, arătată doar când selecția are
arce (`areArce`). Pornește scoasă la fiecare deschidere a panoului: cercul rămâne cerc dacă omul nu cere altfel (BRIEF §16),
iar fără bifă refuzul rămâne, cu un motiv care trimite la ea. În model, `arceInCurbe: true` pe transformarea `inclinare` (lipsă
sau false: refuzul de până acum); prin aceeași acțiune, `document.transforma`, un pas de anulare.

**2. Toleranța, după înclinare.** Fiecare arc devine cubice ale aceluiași cerc (`arcInCubice`, ADR 0068), apoi se transformă ca
orice cubică (punctele de control, exact). Abaterea unei cubice față de arcul ei, în coordonatele elementului, ajunge în lume
înmulțită cel mult cu scara matricei elementului în lume (W, o similitudine) și cu întinderea înclinării (|H|, cea mai mare
valoare singulară: 1 la unghi zero, ~15,8 la 75° și 75°). De aceea arcele se fac cubice la toleranța proiectului împărțită la
amândouă: după înclinare, curba stă la cel mult 0,001 mm de arcul de elipsă exact, în lume. Vârfurile cubicelor sunt pe cerc,
deci după înclinare sunt exact pe elipsă. Liniile rămân linii; arcul „ultimului vârf” al unei căi deschise (fără segment) nu
adaugă nimic.

**3. Rezultatul** e o cale (cercul, dreptunghiul cu colțuri rotunjite, ca la înclinarea fără arce); pe ea nu mai sunt arce, deci
bifa nu mai apare la o a doua înclinare.

## Probele

- pe hârtie: cercul R50, 30° pe orizontală: doar cubice, toate eșantioanele (40 pe cubică) la cel mult 0,001 mm de elipsa exactă
  (H aplicat cercului, eșantionat pe 20 000 de pași de unghi), vârfurile pe elipsă, aria πr²; fără bifă, refuzul;
- cazul cel mai întins, 75° și 75°, pe o instanță rotită cu 30°, în grupuri rotite și scalate de 2 (R20) și de 50 (R1): sub
  0,001 mm în lume;
- dreptunghiul 100 × 60 cu colțuri de 10, 45°: patru linii, colțurile din cubice, sub 0,001 mm; o cale deschisă cu un semicerc
  și un „arc” pe ultimul vârf: capetele rămân, semicercul din cubice, nimic adăugat;
- fără arce, bifa nu schimbă nimic; `areArce` pe cerc, colțuri, arc (da) și pe bulge 0, dreptunghi (nu);
- e2e (Edge): cercul R15, 15° pe orizontală, cu bifa: calea 31,06 × 30,00 (30 · √(1 + tan² 15°)); la redeschidere bifa e scoasă
  și, pe elipsă, nu mai apare; anularea readuce cercul; fără bifă, motivul și butonul oprit;
- mutațiile țintite (toleranța fără întinderea lui H sau fără scara lui W, întinderea ca cea mai mică valoare singulară, arcul
  ultimului vârf al unei căi deschise, arcele fără bifă, bifa ignorată, `areArce` pe bulge 0 sau mereu): 8 / 8 prinse.

## Limitele

- Elipsa rezultată e o cale de cubice: panoul formelor n-o recunoaște ca elipsă (axele ei nu mai sunt pe x și y).
- O a doua înclinare a aceleiași forme înclină cubicele, exact; abaterea față de arcul inițial rămâne cea de la prima.

## Respinse

- **Bifa ținută minte între deschideri**: ar face o alegere spusă o dată să schimbe tăcut cercurile de mai târziu.
- **O elipsă exactă în document** (un fel nou de formă sau de segment): schemă nouă și o ramură nouă în tot lanțul CAM (offset,
  biarce, post), pentru o abatere care, cu cubicele, e deja sub toleranța proiectului.
