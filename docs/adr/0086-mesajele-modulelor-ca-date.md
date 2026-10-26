# ADR 0086: Mesajele modulelor la cerere, ca date

**Starea:** acceptat pe 26.10.2026. Felia 3.K, la cererea owner-ului („Fă loc în bugetul JavaScript: mută la cerere ce se
poate (de exemplu panoul mașinii sau textele lui), fără să ridici plafonul, și spune-mi cât s-a câștigat.”). **Continuă:**
ADR 0042 (loc în pachetul de pornire: mesajele unui modul la cerere intrau în dicționare cu `adaugaMesaje`), ADR 0075
(totalul de 330 kB, tot în precache), ADR 0085 (dicționarul codurilor, primul text mutat în date). **Schimbă:** ADR 0042,
pentru cele șapte module de mai jos: mesajele lor nu mai stau în bucata modulului.

**Problema.** După 3.6c, totalul JavaScript ajunsese la 328,2 / 330 kB. „La cerere” nu ajută totalul: poarta numără toate
bucățile, fiindcă toate stau în precache (aplicația merge întreagă offline); mutarea la cerere scade doar pornirea. Măsurat
pe hărțile de surse: din cei ~320 kB numărați, textele interfeței erau ~31,6 kB gzip, iar ale modulelor la cerere (editarea,
exportul, mașina, importul, carcasa, traseul, simularea) ~24 kB, fiecare cu **ambele** limbi în bucata lui.

## Decizia

**1. Textele celor șapte module sunt date**, nu JavaScript: `mesaje/<modul>.json`, câte un fișier pe modul, cu ambele limbi
(modulul le aduce oricum împreună; comprimate laolaltă, 25,8 kB în loc de 29,4 în 14 fișiere), scrise de build lângă manual
(`scripts/mesaje.ts`) și puse în precache. Sursa rămâne TypeScript (`src/i18n/<modul>.en.ts` și `.ro.ts`): româna are
exact cheile englezei (compilatorul), iar generatorul mai verifică forma fiecărui fișier.

**2. Modulul își cere mesajele când se evaluează** (`src/i18n/<modul>.ts` cheamă `cereMesaje`, `src/i18n/laCerere.ts`), iar
fiecare modul încărcat la cerere care le folosește exportă promisiunea lor (`export const mesaje = mesajeGata()`). Cine îl
încarcă o așteaptă înainte de randare: `import('./PanouMasina.tsx').then(cuMesaje)`. `cuMesaje` stă în `t.ts` (o linie în
pornire) și cere tipul `{ mesaje: Promise<void> }`: o încărcare care uită de mesaje nu trece de compilator. Aducerea lor
(`laCerere.ts`, cu verificarea formei) vine doar cu modulele, nu în pornire.

**3. O cerere căzută rămâne ținută minte ca eșec până o așteaptă cineva:** atunci se cere din nou, iar dacă iar cade,
așteptarea e respinsă, deci modulul arată ce arăta și când bucata lui nu venea (`DialogNeincarcat`, panoul gol). Proba a prins
varianta de dinainte: o cerere căzută era uitată imediat, iar dacă textele picau înaintea bucății de cod, așteptarea spunea
„gata” fără ele (un `t()` aruncat, adică ecranul de eroare).

**4. Poarta build-ului:** fiecare modul are fișierul lui, în precache, cu forma citită de aplicație, iar textele lui nu mai
apar în nicio bucată JavaScript (cel mai lung mesaj ASCII al modulului, căutat în fiecare bucată). Mărimea se spune la fiecare
build.

**5. Rămân în cod:** dicționarele de bază (`mesaje.ro.ts` / `.en.ts`, vin înaintea primei randări, cu poarta lor din ADR
0042 și 0043), `/admin` și testul pas cu pas (bucăți doar online, în afara totalului).

**6. Editarea își cere mesajele odată cu bucata**, nu după ea: se montează singură după prima randare, iar până atunci
gesturile ei (Shift + clic, mânerele) nu există. Proba booleanului (Shift + clic imediat după două forme adăugate) a prins
fereastra lungită de aducerea textelor; acum cele două cereri merg în paralel, iar proba așteaptă bara editării, ca omul.

## Ce s-a câștigat

| Ce | Înainte | După |
|---|---:|---:|
| Totalul JavaScript (plafon 330) | 328,2 kB | **304,3 kB** (−23,9) |
| Pornirea (plafon 100) | 95,9 kB | 96,0 kB |
| Pornirea cu ușa unui proiect salvat | 99,2 kB | 99,3 kB |
| Datele noi în precache | — | 25,6 kB (7 fișiere) |
| Precache-ul întreg (tot ce se descarcă pentru offline) | 380,1 kB | 381,5 kB (+1,4) |

Textele nu dispar: se mută din JavaScript în date. Totalul JavaScript scade cu 23,9 kB, precache-ul întreg crește cu 1,4 kB
(textele comprimate separat de cod). Pornirea crește cu 0,1 kB: încărcarea editării cere și mesajele ei, în paralel (§6).
JavaScript-ul de analizat și compilat la deschiderea unui modul scade.

## Probele

- generatorul: un fișier pe modul, ambele limbi, aceleași chei; forma refuză un dicționar gol, o valoare număr, un plural
  greșit, o limbă lipsă sau în plus, alte chei într-o limbă;
- aducerea: modulul își cere mesajele la evaluare, un singur fișier, o singură dată; `cuMesaje` dă modulul abia după ele; un
  404 respinge așteptarea, iar cererea următoare încearcă din nou; un fișier cu altă formă respinge;
- probele care foloseau textele importului și ale traseului le aduc pe drumul aplicației (un `fetch` care servește fișierele
  generate) sau le înregistrează direct;
- e2e: toată suita (dialogurile, panoul mașinii, editarea, manualul, vederea 3D, arborele), 237 / 237, cu o singură probă
  schimbată (booleanul așteaptă bara editării înaintea Shift + clicului, §6); emulatoarele;
- poarta build-ului (§4).

## Respinse

- **Ridicarea plafonului:** owner-ul a cerut loc fără ea.
- **Mutarea la cerere a panoului mașinii:** e deja la cerere; „la cerere” nu scade totalul (§ Problema).
- **Câte un fișier pe limbă:** 14 fișiere, 29,4 kB comprimate, două cereri pe modul, pentru limbi aduse oricum împreună.
- **Dicționarele de bază ca date:** vin înaintea primei randări, cu poarta și raportarea lor (ADR 0042, 0043); câștigul ar
  fi ~4 kB din total și ~2 kB din pornire, cu probele ecranului „fără texte” de rescris. De reluat dacă pornirea o cere.
