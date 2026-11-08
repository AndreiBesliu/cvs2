# ADR 0223 — Opțiunile liniei mediane: capetele în vârf, părțile late ca contururi, semnalarea lor, buclele închise

**Starea:** propus pe 08.11.2026, la „Da, 25.3↑b” (owner-ul, după 25.3↑); felia 25.3↑b, adusă din etapa 25, fără mașină,
în linia trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`, neunită în `main`). Codul pornește după răspunsurile
de la final.
**Completează:** ADR 0222 (întrebările 3–5: variantele care pot sta lângă recomandări vin ca opțiuni, după regula „toate
opțiunile” din 07.11), ADR 0220 (contururile și curbele lor), ADR 0037 §11 (căile deschise, tăiate pe linie).
**Schița:** <https://claude.ai/artifact/DzjN21HCFDDnZTZY8q38Pr> (logoul tău cu toate combinațiile opțiunilor, calculate de
prototip pe nucleul corectat; ce am măsurat; cele trei întrebări, cu formularul).

## Problema

ADR 0222 a ales implicitele: linia se oprește în centrul capătului rotund, totul devine linii mediane, buclele se taie pe
linie. Fiecare are un caz în care nu ajunge:
- o freză în V care trebuie să ajungă până în vârful trăsăturii (o semnătură gravată cu vârfurile ascuțite);
- un desen cu linii și părți pline: la logoul tău, blocurile frezei din mijloc sunt pline, iar linia lor mediană e o linie
  în mijlocul unui bloc, nu blocul;
- buclele de buzunărit (un O umplut, un inel de decupat), care cer o latură, nu tăierea pe linie.

## Ce am aflat (cercetarea din 08.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate):
  - **Illustrator** (Image Trace, modul „Strokes”): lățimea maximă a trăsăturii; ce e mai gros devine contur plin. Exact
    varianta mixtă de aici. Are și o lungime minimă (implicit 20 px): ce e mai scurt iese (la noi, petele și punctele);
  - **ArtCAM 2018 / Carveco:** la „Create centreline”, alegerea între „Disconnected open vectors” și „Closed vector loops”;
  - **CorelDRAW** (Centerline Trace): curbe deschise și închise, fără amestec cu contururi;
  - unde se termină o linie: documentațiile găsite nu spun.
- **Prototipul** [08.11, Node, `.tmp/proto-253b.ts`, pe nucleul corectat, `0430183`]:
  - **părțile late** = deschiderea morfologică a cernelii cu un disc de rază R0 (jumătate din pragul de lățime): o
    transformare a distanței dă miezul (pixelii cu cercul înscris de cel puțin R0), a doua, distanța până la miez; ce e la
    cel mult R0 de miez e parte lată. Aceeași transformare (Felzenszwalb și Huttenlocher) ca în trasare;
  - **pe logoul tău** (1288 × 325, grosimea obișnuită 13 px, pragul automat 26 px): 2 părți late (blocurile frezei, 14,4 %
    din cerneală); conturul lor, cu curbele buclelor de la contururi; liniile mediane pe restul (câmpul tăiat la marginea
    părților late): 59 (din 51), din care 18 capete lipite de conturul unei părți late, prelungite până în el;
  - **timpul pe logo:** linia mediană 80–91 ms; în plus, cele două transformări 41–44 + 17–20 ms, conturul 24–28 ms, a doua
    linie mediană ~106 ms (de la ~0,08 s la ~0,27 s); pe o imagine de 12 Mpx, cele două transformări sunt liniare în
    pixeli: ~0,5 s în plus, estimat;
  - **capetele în vârf:** după retragere, capătul liber merge înainte pe direcția lui până la marginea trăsăturii (aceeași
    trecere a pragului ca la retragere); în schiță, aproximat cu o jumătate de grosime;
  - **buclele:** 4 pe logo; latura din încuibare se ia ca la contururi.

## Decizia (propusă)

1. **Fereastra trasării**, sub „Rezultatul”, vizibil doar la „Linii mediane” (întrebarea 1), un grup de patru, cu
   recomandările din ADR 0222 ca implicite:
   - **Capetele:** „În centrul capătului rotund” (implicit) | „În vârful trăsăturii”;
   - **Părțile late:** „Linii mediane” (implicit) | „Contururi”, cu „Mai late de: Automat / mm” (întrebarea 2);
   - **„Arată părțile late”** (bifa, implicit pornită, întrebarea 3): previzualizarea le colorează și raportul le numără
     (câte, ce parte din cerneală), oricare ar fi alegerea de deasupra;
   - **Buclele:** „Pe linie” (implicit) | „Vectori închiși”, cu latura din încuibare, ca la contururi (bucla din afară pe
     exterior, cea dinăuntru pe interior).
2. **Calculul**, în workerul trasării, cod propriu în `src/trasare/` (regula `trasare-izolat`):
   - capetele în vârf, după retragere, până la trecerea pragului pe direcția capătului;
   - părțile late: deschiderea morfologică (două transformări ale distanței), conturul lor (`contururi` și curbele buclelor),
     liniile mediane pe restul, capetele lipite de o parte lată prelungite până la conturul ei;
   - buclele închise: aceleași căi, cu latura din încuibare.
3. **Ieșirea:** `CaiTrasate` primește latura fiecărei căi (pe linie, exterior, interior), nu doar `deschisa`; ușa pune
   căile pe linie în operația căilor deschise, iar contururile și buclele închise în cea a contururilor, cu latura lor.
4. **Pragul automat:** de două ori grosimea obișnuită (întrebarea 2); scris în mm, pe mărimea piesei, ca restul ferestrei.
5. **Mărimea:** ~+2–3 kB (totalul ~566 / 600).
6. **Probele, scrise întâi:** corpusul Python (un desen cu linii și o pată plină, cu părțile late știute pe hârtie; capetele
   în vârf la vârful hârtiei; buclele cu laturile lor), logoul (2 părți late, nicio linie mediană în ele), e2e (opțiunile în
   fereastră, piesa cu contururi și linii), otrăvurile.

## Ce am respins

- **Pragul doar în pixeli:** ar depinde de rezoluția imaginii; în mm, pe mărimea piesei, ca restul ferestrei.
- **Alegerea pe fiecare parte lată** (un clic pe ea): mai mult cod pentru un caz rar; se poate cere după.
- **Contururile părților late, fără liniile lipite de ele:** capetele liniilor s-ar opri la o jumătate de grosime de contur,
  iar freza ar lăsa o punte între linie și buzunar.

## Ce impune

- Nucleul stă în `src/trasare/`; fereastra, în `src/ui/FereastraTrasare.tsx`; textele, în `src/i18n/import.*.ts`; manualul
  primește opțiunile în capitolul importului, în ambele limbi.
- `piesaDinImport` primește latura pe cale de la trasare (nu doar „deschis / închis”).

**Se redeschide dacă:** pe un desen trimis de tine, părțile late ies unde nu sunt (o trăsătură groasă obișnuită, o îmbinare),
sau o linie lipită de o parte lată lasă o punte.

## Întrebările (recomandarea întâi)

Opțiunile de mai sus vin toate (regula „toate opțiunile”); întrebările sunt doar despre ce se exclude.

1. **Unde stau opțiunile în fereastră:**
   - **a)** sub „Rezultatul”, vizibile doar când e ales „Linii mediane” (un grup de patru, ca în schiță);
   - b) într-un „Mai multe” închis implicit, sub „Rezultatul”.
2. **Pragul automat al părților late:**
   - **a)** de două ori grosimea obișnuită a trăsăturilor (măsurată pe imagine);
   - b) diametrul frezei foii, când foaia are una (altfel, de două ori grosimea).
3. **Semnalarea părților late („Arată părțile late”):**
   - **a)** pornită implicit: le vezi chiar dacă lași totul linii mediane;
   - b) oprită implicit.
