# ADR 0223 — Opțiunile liniei mediane: capetele în vârf, părțile late ca contururi, semnalarea lor, buclele închise

**Starea:** acceptat pe 08.11.2026, cu toate recomandările („Da, 1a–3a”, la întrebările de la final), și implementat în aceeași
zi (secțiunea „Implementarea”); propus tot atunci, la
„Da, 25.3↑b” (owner-ul, după 25.3↑). Felia 25.3↑b, adusă din etapa 25, fără mașină, în linia trasării (worktree-ul
`trasare`, ramura `wip/25.1-trasare`, neunită în `main`; `origin/main` unit în ea întâi, `8dde2d2`: totalul 572,3 / 600 kB).
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

## Decizia (cu răspunsurile owner-ului: toate recomandările)

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

## Implementarea (08.11)

**Ce s-a schimbat față de propunere** (fiecare, găsit pe logoul tău sau de probe):

1. **Resturile părților late:** deschiderea cu discul rotunjește colțurile unui bloc și lasă, pe margini, o fâșie de sub un
   pixel; pe logo, ele dădeau zeci de linii scurte în jurul blocurilor frezei (67 de căi în loc de 51). O bucată rămasă din
   cerneală care **atinge** partea lată și stă toată la cel mult 2·R0 + 1 de miezul ei (la un colț de 60°, vârful e la 2·R0)
   ține de partea lată; o liniuță sau un punct de lângă ea, care nu o atinge, rămâne al lui. Contururile blocurilor au acum
   colțurile lor, nu rotunjite.
2. **Deschiderea, cu încă o jumătate de pixel:** miezul se măsoară pe centrele pixelilor, deci marginea deschiderii putea
   cădea până la ~0,7 px înăuntrul cernelii (golul unui inel gros ieșea la 0,77 px), iar conturul o urma pe ea.
3. **Capetele lipite stau pe contur, nu pe latura de hârtie:** lângă locul unde o trăsătură se lipește de o pată, cercurile
   înscrise sunt mai mari, deci deschiderea face o mică racordare în trăsătură (~1 px); linia se oprește pe contur, fără
   punte, la cel mult 1,5 px de latura pe care o atinge.
4. **Direcția vârfului:** la „Vârful trăsăturii”, linia merge din centrul capătului pe direcția porțiunii drepte de lângă el
   (abaterea cel mult 0,5 px), nu pe dreapta celor 1,5 grosimi: talpa scurtă a lui „t” din logo ieșea oblic, în colț (~4 px).
   Centrul capătului (implicitul) a rămas neatins.
5. **Etichetele mai scurte** în fereastră: „Centrul capătului” / „Vârful trăsăturii” (cele din schiță nu încăpeau în listă).
6. **`CaiTrasate.peLinie`** (lipsă: toate pe linie, ca în ADR 0222): 0 pe contururile părților late (latura din sensul lor)
   și pe buclele închise (latura din încuibare); ușa le pune pe operația contururilor, restul pe a căilor deschise.

**Măsurat** [08.11, Node 26 și Edge fără fereastră, pe codul `0430183` + 25.3↑b]:
- logoul tău, cu „Contururi”: 2 părți late (blocurile frezei, 15,3 % din cerneală), conturate cu colțurile lor; pe rest 51 de
  căi, fără cioturi; liniile cercului mare se opresc pe conturul blocului de sus; cu toate opțiunile: 45 de linii pe linie și
  6 contururi pe exterior (blocurile, cele două „o”, inelele urechilor), punctul lui „i” devine o linie de la o margine la
  alta; timpul, ~0,3 s (de la ~0,13 s fără opțiuni);
- probele, cu valori pe hârtie: dreptunghiul plin (aria 600 px² la cel mult 3 %, colțurile la 1 px, capătul lipit pe contur),
  vârfurile capetelor rotunde și drepte (0,3 px), două inele concentrice (exterior și interior), inelul gros cu gol (o parte,
  golul pe interior, la cel mult 0,75 px), pragul dat, semnalarea care nu schimbă liniile, o liniuță și un punct lângă o pată;
  ușa (pragul în mm, la 0,5 mm pe px; laturile; operațiile) și e2e (grupul, implicitele, semnalarea, contururile, vârful,
  pragul scris, Importă);
- otrăvurile (`test/otravuri/25.3b.py`): 36 / 36 la prima rulare (lista 25.3, rulată din nou pe nucleul schimbat: 77 / 77);
- mărimea: totalul 574,8 / 600 kB, pornirea 101,9 / 110.

**Limitele, scrise:** o trăsătură groasă lipită de o pată are o mică racordare (~1 px) în conturul petei, acolo unde se lipesc;
pragul automat se ia din grosimea obișnuită a întregului desen (pe un desen făcut aproape numai din pete, scrie pragul în mm).

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

**Răspunsurile (08.11):** „Da, 1a–3a”: toate recomandările.

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
