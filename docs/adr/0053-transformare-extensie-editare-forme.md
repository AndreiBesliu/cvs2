# ADR 0053: Unealta Transformare, extensia barei de sus, editarea formelor după plasare

**Starea:** acceptat pe 20.10.2026, odată cu felia 6.D↑. Cererile owner-ului: „cercul, ar trebui sa aiba raza, cum hexagonul
are numar de fete, si vreau sa poata fi editat si post placement” (felia 6.C↑) și „NODURILE de control trebuie sa apara doar
cand selectam unealta de transformare, cea care urmeaza sa fie dezvoltata. bara de aliniere ar trebui sa fie o extensie, nu
un popup, si vreau sa fie mereu vizibila, dar sa fie colapsabila spre stanga. ideea este ca vor mai fi acolo elemente. deci
colapsabil este meniul de aliniere, nu bara in sine. pune asta in felia 6.D”. **Intră în:** etapa 6 („Editorul de
vectori”), adusă în etapa 3, fără mașină (6.D↑). **Continuă:** ADR 0050, 0051, 0052.

**Problema.** Mânerele (ADR 0052) apăreau pe orice selecție, cu unealta Selecție: un clic pentru a alege sau a muta o formă
mică cădea ușor pe un mâner. Alinierea stătea într-un meniu care se deschidea peste pânză și se închidea la loc. O formă pusă
nu se mai putea schimba după plasare: raza cercului, laturile poligonului, razele elipsei, laturile dreptunghiului se dădeau
doar la desen.

## Decizia

**1. Unealta Transformare (S)**, a doua în bara uneltelor, cu pictograma unei cutii cu mânere: mânerele ADR 0052 apar doar cu
ea. Cu Selecția, pânza doar alege și mută. Transformarea nu desenează: clicul alege și tragerea mută, ca la Selecție, iar
mânerele scalează și rotesc. Escape (sau V) întoarce la Selecție. ADR 0052 §4 („cu unealta Selecție”) se citește de acum
„cu unealta Transformare”.

**2. Extensia barei de sus.** Carcasa are un loc nou, `#loc-extensie`: al doilea rând al grilei barei de sus, lipit sub bara
de acțiuni și aliniat la stânga ei, ca o tavă a ei. Extensia e mereu acolo; secțiunile ei se strâng, ea nu. Locul e rezervat
de la pornire (gol și ascuns cât modulul editării e pe drum), ca zona liberă și foaia potrivită în ea să nu sară la sosirea
modulului. Secțiunile vin din modulele la cerere; prima e **Alinierea** (cele 8 alinieri și distribuiri). Butonul ei o
strânge spre stânga (rămâne doar el, ▸) și o deschide la loc (◂); starea stă în browser. Meniul de sub butonul „Aliniere”
(ADR 0052 §1) dispare. Fără acest loc (un alt aranjament), secțiunea stă în bara uneltelor. Săgețile care mută selecția merg
și cu focusul în extensie.

**3. Editarea după plasare**, în panoul de proprietăți, pentru o singură instanță a cărei piesă are un singur element și nu
e folosită de alte instanțe (altfel, o notă, fără câmpuri):
- dreptunghiul: lățimea, înălțimea, raza colțurilor; colțul stânga-jos rămâne;
- cercul: raza; centrul rămâne;
- poligonul regulat: laturile (3–64) și raza; centrul, unghiul primului vârf și sensul rămân;
- elipsa: razele pe X și pe Y; centrul rămâne. Cu razele egale, o elipsă centrată în originea piesei devine un `cerc` exact.

Fiecare câmp aplică acțiunea `document.forma` (un pas de anulare): forma nouă a piesei, cu documentul de după judecat de
schema lui (o latură sau o rază zero ori peste plafon, raza colțurilor peste jumătatea laturii mai mici). Motivul refuzului
vine din dicționarul panoului, adus cu el.

**4. Fără câmp nou în document: geometria e adevărul.** `src/model/formeParametrice.ts` ține generatorii (comuni cu uneltele
de desen, ADR 0051) și recunoașterea pe forma salvată:
- poligonul regulat: o cale închisă din 3–64 de linii, cu vârfurile la aceeași distanță de centrul lor (media vârfurilor)
  și cu același pas de unghi, 2π / n, într-un singur sens (sub 1e-9); steaua cu aceleași vârfuri nu trece;
- elipsa: o cale din cubice pe care generatorul o reface (aceleași vârfuri și puncte de control, sub 1e-9 relativ), cu
  centrul = media vârfurilor, raza pe X din primul vârf, raza pe Y din vârful cel mai depărtat pe Y (vârfurile sunt pe elipsă).

Respins: un câmp cu parametrii pe cale. Ar cere o schemă nouă, iar o versiune veche, care păstrează câmpurile necunoscute dar
ar mișca vârfurile, l-ar lăsa mincinos. O cale care nu se recunoaște (un contur importat oarecare) rămâne de transformat cu
mânerele.

**5. Elipsa e tăiată pe sferturi.** Generatorul face patru arce de 90°, cu extremele ca vârfuri exacte, deci cutia formei e
exact centrul ± razele: înainte, cu o singură bucată de 2π, colțul cutiei ieșea 119,999999663 în loc de 120. Elipsele
desenate înainte de felie (o singură bucată) rămân recunoscute; editate, trec pe sferturi.

**6. Pornirea** primește doar intrarea acțiunii în registru (cu eticheta ei) și locul extensiei din carcasă. Unealta,
extensia, recunoașterea și câmpurile panoului vin la cerere.

## Probele

`test/unit/formeParametrice.test.ts` (pătratul înscris, poligonul descentrat și orar, refuzurile: vârful mutat, steaua, calea
deschisă, 65 de laturi; elipsa centrată și descentrată, extremele ei ca vârfuri, elipsa veche dintr-o bucată, inima și elipsa
strâmbată refuzate; formele desenate refăcute din parametri; laturile schimbate păstrează centrul, raza și primul vârf),
`test/unit/actiuni.editare.test.ts` (`document.forma`: un pas, aceeași formă fără comandă, refuzurile schemei, piesa
împărțită, două alese, niciuna, doar-citirea), `test/e2e/editare.spec.ts` (alinierea în extensie, strânsă și deschisă;
Transformarea din bară și cu S, mânerele doar cu ea; editarea după plasare a celor patru forme, cu refuzurile și anularea;
colțul exact al elipsei).
