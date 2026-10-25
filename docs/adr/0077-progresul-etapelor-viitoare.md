# ADR 0077: Progresul etapelor viitoare, din prag

**Starea:** acceptat pe 25.10.2026. Felia 3.J, la cererea owner-ului („si tot nu vad in acest timeline ce progres avem deja
facut”, cu captura cronologiei din `/admin`: etapele 5, 6 și 14 gri, doar cu „↑2”, „↑16”). **Schimbă:** ADR 0048 (umplerea
barei unei etape fără fișă) și ADR 0074 §6 (cronologia arăta feliile aduse doar ca număr).

**Problema.** Bara unei etape fără fișă se umplea doar din punctele ei din `PLAN.md` §5.3, iar acolo sunt descrise în detaliu
doar primele etape (4 are puncte, 5 și 6 nu). Etapa 6 (editorul de vectori), cu 16 felii aduse și ambele rânduri de prag
făcute, rămânea o bară goală; în plus, umplerea unei etape viitoare n-avea culoare deloc.

## Decizia

**1. Măsura:** fără fișă și fără puncte în §5.3, bara se umple din **rândurile de prag pe care le închide etapa** (coloana
„Închide” din `PLAN.md` §5.4, punctele despărțite cu „;”), cu starea lor din `ACOPERIRE-ARTCAM-DESKPROTO.md`: făcut = 1, în
lucru = ½, de făcut = 0, împărțit la câte au rând. Ordinea rămâne: fișa (feliile ei), apoi punctele planului, apoi pragul.

**2. Legătura punct → rând** (`randulPragului`): rândul al cărui nume începe cu punctul („Găurire”, „Animația traseului”);
altfel singurul rând care conține toate cuvintele punctului („Buzunar cu mai multe freze”, „Ordinea + un fișier pe sculă”);
mai multe sau niciunul: punctul e **nemăsurat** și apare ca atare („un punct fără rând în prag”), nu e socotit nici făcut,
nici de făcut. Nemăsurate sunt, de obicei, fazele adminului (P0…P4), funcțiile din `BRIEF.md` §10 și listele.

**3. Poarta:** pragul se citește din toate tabelele cu antetul | Capabilitate | Sursă | Etapă | Stare | Commit |; o stare
care nu începe cu „făcut”, „în lucru” sau „de făcut” oprește build-ul, cu rândul și motivul (ca restul tabelelor, ADR 0048).

**4. Vederea:** umplerea unei etape viitoare e verdele lui „gata”, mai stins, cu mostra ei în legendă („făcut înainte”);
textul barei și al panoului spune „Rândurile de prag: 2 / 2 făcute, 0 în lucru”. Cifra „↑N” rămâne.

## Probele

- pe fixtură: pragul din două grupe (nu și „Scoase”), starea din primul cuvânt, poarta pe o stare necunoscută și pe lipsa
  tabelelor; „—” nu e un punct; un punct de admin, unul din §10 și unul ambiguu („Straturi”) sunt nemăsurate;
- pe arborele real: etapa 6 are 2 / 2 făcute, etapa 5 are buzunarul în lucru din 4 rânduri și un punct nemăsurat;
- pe emulatoare (pagina `/admin`): bara etapei 6 e plină și colorată, a etapei 5 la ⅛, etichetele lor spun asta.

## Limitele

- O etapă al cărei „Închide” e doar admin (14: „admin **P2**”) rămâne fără umplere, cu „↑N”: fazele adminului n-au rânduri
  de prag.
- Un rând „făcut” spune ce s-a făcut din prag, nu că etapa e gata: etapa se încheie tot cu fișa ei și cu placa.

## Se redeschide dacă

- owner-ul vrea și fazele adminului măsurate (atunci, o listă a fazelor, ca rândurile de prag).
