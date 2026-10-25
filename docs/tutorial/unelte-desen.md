# Testul uneltelor de desen

Fiecare pas spune ce faci și ce trebuie să vezi. Marchează **Bine**, **Nu** sau **Sărit**; când ceva nu e cum scrie, apasă
**Poză** (imaginea planșei rămâne în browser) și scrie pe scurt ce ai văzut. La final, **Descarcă raportul** și trimite-mi
fișierul: rezultatele, notele și pozele sunt în el.

## Pregătirea

### Fereastra și versiunea
%% pas: p-deschide
%% faci
Lucrează într-o fereastră lată (cel puțin ~1000 px). Dacă jos apare „Versiune nouă” cu butonul Reîncarcă, apasă-l: testul
se reia de unde ai rămas.
%% vezi
Bara de sus cu uneltele (săgeata, nodurile, penița, dreptunghiul, cercul…) și, sub ea, extensia: aliniere, oglindire,
copiere, offset, boolean, 3D, „?”.

### O foaie goală
%% pas: p-curata
%% faci
Cu Selecție (`V`), trage un cadru peste toată foaia, apoi apasă `Delete`.
%% vezi
Lista „Pe foaie” din stânga e goală.

## Desenul prin tragere

### Dreptunghiul
%% pas: d-dreptunghi
%% faci
Dreptunghi (`R`): trage pe foaie; apoi încă unul ținând `Shift`.
%% vezi
Un dreptunghi din colț în colț; cu Shift, un pătrat. Forma nouă e aleasă și apare în listă.

### Cercul
%% pas: d-cerc
%% faci
Cerc (`O`): un clic fără tragere; apoi o tragere din centru.
%% vezi
Clicul pune un cerc cu raza din câmpul de lângă unealtă; tragerea dă raza ei și o scrie în câmp.

### Elipsa, linia, poligonul
%% pas: d-elipsa
%% faci
Elipsă (`E`); Linie (`L`) trasă cu `Shift`; Poligon (`P`) cu 5 în câmpul de laturi.
%% vezi
Elipsa din colț în colț; linia în pași de 15° cu Shift; un pentagon regulat, din centru.

### Lipirea
%% pas: d-lipire
%% faci
Cu Lipire pornită (magnetul), trage o formă lângă colțul alteia; apoi trage din nou ținând `Alt`.
%% vezi
Forma se prinde exact de colț sau de latură, cu linii de aliniere; cu Alt nu se mai prinde.

### Ghidajele din riglă
%% pas: d-ghidaj
%% faci
Trage din rigla de sus în jos, pe foaie; mută o formă lângă ghidaj; apoi trage ghidajul înapoi pe riglă.
%% vezi
Un ghidaj cu poziția lui în mm; forma se lipește de el; lăsat pe riglă, ghidajul dispare.

## Selecția

### Cadrul spre dreapta și spre stânga
%% pas: s-cadru
%% faci
Cu Selecție, trage un cadru de la stânga la dreapta peste o formă întreagă și peste jumătatea alteia; apoi la fel, de la
dreapta la stânga.
%% vezi
Spre dreapta: e aleasă doar forma cuprinsă toată. Spre stânga: și cea atinsă.

### Shift + clic
%% pas: s-shift
%% faci
`Shift` + clic pe o formă nealeasă, apoi pe una aleasă.
%% vezi
Prima intră în selecție, a doua iese.

## Transformările

### Mânerele
%% pas: t-manere
%% faci
Transformare (`S`): trage un colț, o latură, apoi mânerul rotund de deasupra; repetă ținând `Shift`.
%% vezi
Colțul scalează proporțional (cu Shift, liber), latura pe o singură axă, mânerul rotește (cu Shift, în pași de 15°).

### Oglindirea
%% pas: t-oglinda
%% faci
Pe o formă nesimetrică (o linie oblică), apasă `Shift+H`, apoi `Shift+V`.
%% vezi
Forma se oglindește stânga ↔ dreapta, apoi sus ↔ jos, față de centrul ei.

### Înclinarea
%% pas: t-inclina
%% faci
Alege un dreptunghi; butonul Înclină (lângă oglindire), 30 pe orizontală, Înclină. Apoi încearcă pe un cerc.
%% vezi
Cutia înclinată, punctată, înainte; după, un paralelogram (o cale). Pe cerc, motivul „arcele ar deveni elipse” și butonul
oprit.

## Copierea

### Rânduri și coloane
%% pas: c-grila
%% faci
Alege o formă; Copiază în rețea (cele patru pătrate), Rânduri și coloane: 3 coloane, 2 rânduri, spațiul 10.
%% vezi
Copiile punctate pe pânză; după Copiază, 6 forme la pas egal, toate alese.

### Pe cerc
%% pas: c-cerc
%% faci
Același panou, Pe cerc: 6 forme, 360°, Rotește copiile bifat.
%% vezi
6 forme în jurul centrului foii (sau al centrului scris), rotite odată cu poziția.

### Pe curbă
%% pas: c-curba
%% faci
Desenează o linie (sau o cale cu Pen). Alege o formă mică, apoi linia cu `Shift` + clic. Același panou, Pe curbă:
5 copii.
%% vezi
5 copii la distanțe egale pe linie, de la un capăt la altul; linia rămâne, nu se copiază. Față de curbă: La stânga (tangente,
distanța 0), apoi La dreapta cu 5 mm, apoi Pe ea mutată cu 3 mm: copiile se mută de partea cerută.

## Offsetul

### Spre exterior
%% pas: o-exterior
%% faci
Alege un dreptunghi; Offset (pătratul în contur punctat), Spre exterior, 5, Colțurile: Ca originalul, Aplică. Apoi, pe
același dreptunghi, Colțurile: Rotunjite. Clic în dreptunghiul dinăuntru.
%% vezi
Conturul nou, punctat, înainte; după, o formă nouă cu colțurile ascuțite, ca originalul; cu Rotunjite, colțurile rotunjite.
Originalul rămâne, iar clicul dinăuntru îl alege pe el, nu conturul nou.

### Spre interior
%% pas: o-interior
%% faci
Pe același dreptunghi: Spre interior, 5 (Ca originalul, apoi Rotunjite); apoi 100.
%% vezi
Cu 5, un contur mai mic, cu colțuri drepte; cu Rotunjite, colțurile lui rotunjite. Cu 100, motivul „o formă e prea mică” și
Aplică oprit.

## Booleanul

### Scade
%% pas: b-scade
%% faci
Un dreptunghi și un cerc peste mijlocul lui. Alege dreptunghiul, apoi cercul cu `Shift` + clic; Scade (al doilea
buton din secțiunea Boolean).
%% vezi
O singură piesă cu o gaură (în listă, „(+1)”). `Ctrl+Z` le readuce pe amândouă.

### Unește și Intersectează
%% pas: b-uneste
%% faci
Pune cercul peste o margine a dreptunghiului; alege-le în ordine; Unește; `Ctrl+Z`; Intersectează.
%% vezi
Unirea: un singur contur. Intersecția: doar partea comună.

### Forme care nu se ating
%% pas: b-disjuncte
%% faci
Două forme departe una de alta, alese amândouă; Unește.
%% vezi
Motivul „Formele nu se ating”, lângă butoane; formele rămân.

## Unealta Pen

### Colț și curbă
%% pas: pen-desen
%% faci
Pen (`B`): un clic; o tragere; încă un clic; `Enter`.
%% vezi
O cale deschisă, cu o curbă la nodul tras; segmentul următor se vede punctat cât desenezi.

### Curba pe o parte și închiderea
%% pas: pen-parti
%% faci
`Shift` + tragere (curbă doar înainte); clic pe ultimul nod pus (curba rămâne doar înapoi); trage din primul nod.
%% vezi
Cât tragi din primul nod, calea se vede închisă, cu curba ei; la eliberare se închide; în Noduri, nodurile cu curbă sunt
rotunde, colțurile pătrate.

### Tastele
%% pas: pen-taste
%% faci
Pune câteva noduri: `Backspace`; `Ctrl+Z`, `Ctrl+Y`; apoi `Esc`; apoi pune iar câteva și termină cu dublu clic; imediat,
`Ctrl+Shift+Z`, apoi `Ctrl+Z`.
%% vezi
Backspace scoate ultimul nod; Ctrl+Z / Ctrl+Y anulează și refac pașii căii, nu planșa; Esc renunță la cale; dublu clic
închide calea pe primul nod; Ctrl+Shift+Z o redeschide, iar Ctrl+Z îi scoate ultimul nod.

## Nodurile

### Mutarea, adăugarea, scoaterea
%% pas: n-muta
%% faci
Noduri (`N`) pe un dreptunghi: trage un colț; dublu clic pe o latură; alege nodul nou și `Delete`.
%% vezi
Colțul se mută (dreptunghiul devine o cale); apare un nod nou; Delete scoate nodul, nu forma.

### Tipul nodului
%% pas: n-tipuri
%% faci
Pe un colț: Curbă pe ambele părți; trage un mâner (apoi cu `Alt`, apoi iar cu `Alt`); despărțite, Curbă pe ambele părți;
Curbă pe o parte, de două ori; Colț.
%% vezi
Mânerele pe aceeași dreaptă (celălalt se rotește cu cel tras); cu Alt se despart, iar cu Alt din nou se unesc (oglindă, aceeași
lungime); Curbă pe ambele părți le unește și ea; „pe o parte” trece dintr-o parte în alta; Colț le scoate.

### Nodurile de pe arce
%% pas: n-cerc
%% faci
Pe un cerc: alege un nod și trage un mâner. Apoi, pe alt nod, Colț.
%% vezi
Nodul are mânere (tangentele cercului); tras, cercul devine curbe, cu mai multe noduri, și se schimbă doar acolo; Colț merge
fără refuz.

### O piesă cu gaură
%% pas: n-gaura
%% faci
Pe piesa cu gaură de la Scade: Noduri, trage un nod al găurii.
%% vezi
Ambele contururi au noduri; gaura se schimbă, conturul de afară nu.

## Alinierea

### Aliniază și distribuie
%% pas: a-aliniaza
%% faci
Alege trei forme; Aliniază la stânga; apoi Distribuie pe orizontală.
%% vezi
Formele se aliniază pe marginea stângă; apoi au spații egale între ele.

## Anularea, manualul, exportul

### Anulează și reface
%% pas: x-anulare
%% faci
După câțiva pași: `Ctrl+Z` de câteva ori, apoi `Ctrl+Y`.
%% vezi
Fiecare schimbare se anulează pe rând, iar Ctrl+Y le reface.

### Manualul
%% pas: x-manual
%% faci
Apasă „?” (lângă butonul Test, în extensie); închide; apoi, cu Pen ales, `F1`.
%% vezi
Manualul cu capitolele; F1 îl deschide la capitolul „Unealta Pen”.

### Exportul unui desen cu de toate
%% pas: x-export
%% faci
Pe desenul de acum (curbe, o gaură, un offset), Exportă G-code, apoi descarcă.
%% vezi
Dialogul exportului, fișierul se descarcă fără mesaj de eroare; jos rămâne „0 erori în jurnalul local”.
