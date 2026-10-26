import type { TextCod } from '../../../shared/coduri.ts';
import type { CheieTextCod } from './texte.en.ts';

/** Textele dicționarului codurilor (ADR 0085), în română: exact cheile din engleză (`texte.en.ts`). */
export const textCoduriRo: Readonly<Record<CheieTextCod, TextCod>> = {
  e1: {
    titlu: 'Lipsește litera unui cuvânt G-code',
    ce: 'Linia are un număr fără litera din fața lui (un cuvânt G-code e o literă urmată de o valoare, de exemplu X10).',
    faci: 'Linia e greșită, nu mașina: vezi linia arătată. Un program exportat de aici n-ar trebui să facă asta; dacă linia e a lui, e un defect al nostru.',
  },
  e2: {
    titlu: 'Un număr e scris greșit',
    ce: 'O valoare lipsește sau nu e un număr valid (un X fără cifre, 1.2.3 sau o virgulă în loc de punctul zecimal).',
    faci: 'Corectează linia. La un fișier din alt program, verifică setarea zecimalelor din programul acela.',
  },
  e3: {
    titlu: 'Comandă $ necunoscută',
    ce: 'Controlerul nu cunoaște comanda „$…” primită, sau n-o are în versiunea lui.',
    faci: 'Verifică ce ai scris în câmpul Comanda: $$ (setările), $# (decalajele), $G (starea), $I (versiunea), $X (deblocarea), $H (homing).',
  },
  e4: {
    titlu: 'Valoare negativă',
    ce: 'O setare care trebuie să fie pozitivă a primit o valoare negativă.',
    faci: 'Scrie setarea din nou, fără minus.',
  },
  'homing-neconfigurat': {
    titlu: 'Homing-ul nu e configurat',
    ce: 'S-a cerut homing ($H), dar homing-ul nu e activat sau configurat pe controler.',
    faci: 'Dacă mașina n-are limitatoare, nu folosi $H: fă zero-ul de mână (jog, Zero XY, Palpează Z). Dacă le are, homing-ul se activează în setările controlerului (la GRBL, $22=1).',
  },
  e6: {
    titlu: 'Impulsul de pas e prea scurt',
    ce: 'Setarea duratei impulsului de pas ($0 la GRBL) e sub minimul controlerului.',
    faci: 'Scrie o valoare mai mare (de obicei 10 µs). Valoarea veche a rămas.',
  },
  e7: {
    titlu: 'Setările nu s-au putut citi',
    ce: 'Controlerul nu și-a putut citi setările din memorie și le-a pus pe cele din fabrică.',
    faci: 'Nu tăia încă: citește setările ($$), scrie la loc valorile mașinii tale (pașii pe mm, vitezele, cursele), apoi refă zero-ul.',
  },
  e8: {
    titlu: 'Comanda cere mașina oprită',
    ce: 'Comenzile $ (setări, decalaje, homing) merg doar cât mașina stă (Idle, sau Alarm), nu cât se mișcă sau e în pauză.',
    faci: 'Așteaptă sfârșitul mișcării sau al lucrării, apoi trimite comanda din nou.',
  },
  e9: {
    titlu: 'G-code blocat: alarmă sau jog',
    ce: 'Controlerul refuză G-code-ul cât e în alarmă sau cât ține un jog.',
    faci: 'Dacă mașina e în alarmă (Starea: Alarm), citește alarma de dinainte, apoi apasă Deblochează ($X) sau fă homing ($H). Dacă rula un jog, așteaptă să se termine.',
  },
  e10: {
    titlu: 'Limitele soft cer homing',
    ce: 'Limitele soft nu se pot porni fără homing: fără el, controlerul nu știe unde sunt capetele curselor.',
    faci: 'Activează întâi homing-ul (la GRBL, $22=1), apoi limitele soft ($20=1).',
  },
  e11: {
    titlu: 'Linia e prea lungă',
    ce: 'Linia are mai multe caractere decât ține controlerul, deci n-a fost executată.',
    faci: 'Scurtează linia (fără comentarii lungi). Programele exportate de aici au cel mult 70 de octeți pe linie.',
  },
  e12: {
    titlu: 'Viteza de pas trece de limită',
    ce: 'Setarea ar cere mai mulți pași pe secundă decât poate da controlerul.',
    faci: 'Micșorează viteza maximă a axei sau pașii pe mm. Setarea n-a fost scrisă.',
  },
  e13: {
    titlu: 'Ușa de siguranță e deschisă',
    ce: 'Intrarea ușii de siguranță e activă: controlerul a oprit mișcarea și axul.',
    faci: 'Închide ușa (sau verifică intrarea ei), apoi apasă Reia. Axul pornește din nou înaintea mișcării.',
  },
  e14: {
    titlu: 'Linia de pornire e prea lungă',
    ce: 'Linia de pornire ($N) sau informația de build ($I=) e mai lungă decât poate ține memoria, deci n-a fost salvată.',
    faci: 'Scrie o linie mai scurtă.',
  },
  e15: {
    titlu: 'Jog-ul ar ieși din cursă',
    ce: 'Ținta jog-ului e în afara curselor mașinii (limitele soft), deci jog-ul a fost ignorat.',
    faci: 'Alege un pas mai mic sau mișcă-te în sens opus.',
  },
  e16: {
    titlu: 'Comandă de jog greșită',
    ce: 'Linia $J= n-are „=” sau are un cod pe care jog-ul nu-l acceptă (sunt permise doar G20/G21, G90/G91, G53 și axele cu F).',
    faci: 'Folosește butoanele de jog. În câmpul Comanda, scrie de exemplu $J=G91 X10 F1000.',
  },
  e17: {
    titlu: 'Modul laser cere PWM',
    ce: 'Modul laser ($32=1) cere o ieșire PWM pentru ax, pe care controlerul n-o are.',
    faci: 'Pe o freză, lasă modul laser oprit ($32=0).',
  },
  e20: {
    titlu: 'Comandă G-code necunoscută',
    ce: 'Linia are o comandă pe care controlerul n-o cunoaște, sau n-o acceptă în versiunea lui.',
    faci: 'Exportă din nou cu postul mașinii tale (GRBL 1.1, grblHAL sau FluidNC). La un fișier din alt program, scoate comanda sau alege alt post acolo.',
  },
  e21: {
    titlu: 'Două comenzi din același grup',
    ce: 'Linia are două comenzi care se exclud (din același grup modal), de exemplu G0 și G1, sau G90 și G91.',
    faci: 'Desparte-le pe două linii, sau păstrează-o pe cea corectă.',
  },
  e22: {
    titlu: 'Avansul nu e dat',
    ce: 'O mișcare cu avans (G1, G2, G3) a pornit înainte ca programul să dea un avans F.',
    faci: 'Adaugă un F (avansul, în mm/min) pe prima linie cu G1, G2 sau G3.',
  },
  e23: {
    titlu: 'Valoarea trebuie să fie întreagă',
    ce: 'O comandă a primit o fracție acolo unde cere un număr întreg (P-ul lui G10, un număr de sculă).',
    faci: 'Scrie valoarea fără zecimale.',
  },
  e24: {
    titlu: 'Două comenzi care folosesc axele',
    ce: 'Linia are două comenzi care folosesc amândouă axele (de exemplu G1 și G28): controlerul nu știe ale cui sunt X, Y, Z.',
    faci: 'Desparte-le pe două linii.',
  },
  e25: {
    titlu: 'Cuvânt repetat',
    ce: 'Același cuvânt apare de două ori pe linie (două X, de exemplu).',
    faci: 'Păstrează unul singur.',
  },
  e26: {
    titlu: 'Lipsesc axele',
    ce: 'Comanda (sau modul de mișcare activ) cere cel puțin o axă (X, Y, Z), iar linia n-are niciuna.',
    faci: 'Adaugă ținta mișcării, sau scoate comanda.',
  },
  e27: {
    titlu: 'Număr de linie greșit',
    ce: 'Numărul de linie (N) e în afara plajei acceptate.',
    faci: 'Scoate numerele de linie N, sau folosește valori mai mici.',
  },
  e28: {
    titlu: 'Lipsește o valoare cerută',
    ce: 'Comanda cere o valoare pe care linia n-o are (de obicei P sau L la G10, ori P la G4).',
    faci: 'Adaugă valoarea lipsă.',
  },
  e29: {
    titlu: 'Sistem de coordonate nesuportat',
    ce: 'Controlerul acceptă doar G54–G59: G59.1, G59.2 și G59.3 nu există pe el.',
    faci: 'Folosește unul dintre G54–G59.',
  },
  e30: {
    titlu: 'G53 doar cu G0 sau G1',
    ce: 'G53 (mișcarea în coordonatele mașinii) merge doar cu G0 sau G1; era activ alt mod de mișcare.',
    faci: 'Pune G0 sau G1 pe aceeași linie cu G53.',
  },
  e31: {
    titlu: 'Axe pe care nimic nu le folosește',
    ce: 'Linia are axe (X, Y, Z), dar nicio comandă și niciun mod activ nu le folosește (de obicei după G80).',
    faci: 'Adaugă comanda mișcării (G0, G1), sau scoate axele.',
  },
  e32: {
    titlu: 'Arc fără nicio axă în plan',
    ce: 'Un arc G2 / G3 n-are nicio axă a planului de lucru, deci n-are ce urma.',
    faci: 'Verifică planul ales (G17 = XY) și capătul arcului.',
  },
  e33: {
    titlu: 'Ținta mișcării nu e validă',
    ce: 'Ținta nu se poate atinge cum e scrisă: un arc cu I/J/K al cărui capăt nu e la aceeași distanță de centru ca începutul, un arc cu R care se termină unde începe, sau o palpare spre punctul în care e deja freza.',
    faci: 'La arce, exportă din nou (la un fișier din alt program, de vină e toleranța arcelor de acolo). La palpare, ridică întâi freza.',
  },
  e34: {
    titlu: 'Raza arcului nu e validă',
    ce: 'Un arc dat cu R nu se poate construi: capetele lui sunt mai departe unul de altul decât diametrul.',
    faci: 'Exportă din nou. La un fișier din alt program, cere-i arce cu I/J în loc de R.',
  },
  e35: {
    titlu: 'Arc fără centru în plan',
    ce: 'Un arc G2 / G3 dat prin centru n-are niciun I / J / K al planului de lucru.',
    faci: 'Verifică planul (G17 = XY) și centrul arcului.',
  },
  e36: {
    titlu: 'Valori nefolosite',
    ce: 'Linia are valori pe care nicio comandă de pe ea nu le folosește (un P fără G4, de exemplu).',
    faci: 'Scoate valorile în plus.',
  },
  e37: {
    titlu: 'Corecția lungimii pe altă axă',
    ce: 'G43.1 (corecția dinamică a lungimii sculei) a fost dat pe altă axă decât cea configurată (Z).',
    faci: 'Dă corecția doar pe Z.',
  },
  e38: {
    titlu: 'Număr de sculă prea mare',
    ce: 'Numărul sculei (T) e peste cel acceptat de controler, sau scula nu e definită în tabelul lui.',
    faci: 'Folosește un număr de sculă mai mic. La exportul de aici, numărul se alege pe rândul operației (T, Ø).',
  },
  a1: {
    titlu: 'Limitator atins (limită hard)',
    ce: 'Un limitator s-a declanșat în mișcare: controlerul a oprit totul pe loc, deci poziția mașinii probabil nu mai e cea știută.',
    faci: 'Apasă Oprește (până atunci controlerul nu face nimic altceva), apoi fă homing ($H). Fără limitatoare de homing: Deblochează, scoate axa de pe limitator cu jog-ul și refă zero-ul X, Y și Z. Dacă nimic nu atingea limitatorul, verifică firele (zgomot electric).',
  },
  a2: {
    titlu: 'Ținta iese din cursă (limită soft)',
    ce: 'O mișcare ar fi ieșit din cursele mașinii: controlerul a oprit-o înainte să plece. Poziția s-a păstrat.',
    faci: 'Apasă Oprește, apoi Deblochează. Verifică originea programului și zero-ul: de acolo, programul nu încape în cursă.',
  },
  a3: {
    titlu: 'Repornit în timpul unei mișcări',
    ce: 'Controlerul a fost repornit (Oprește, Ctrl-X sau oprirea de urgență) cât mașina se mișca: poziția probabil nu mai e cea știută.',
    faci: 'Fă homing ($H), sau Deblochează și refă zero-ul X, Y și Z înainte de a tăia.',
  },
  a4: {
    titlu: 'Palparea: freza atingea deja placa',
    ce: 'La pornirea palpării, contactul era deja închis: freza stătea pe placă, sau clema atinge altceva.',
    faci: 'Deblochează, ridică freza cu jog-ul pe Z+, verifică clema și firul plăcii, apoi Palpează Z din nou. Dacă rămâne închis, verifică inversarea intrării sondei ($6 la GRBL).',
  },
  a5: {
    titlu: 'Palparea: nicio atingere',
    ce: 'Freza a coborât toată distanța de căutare fără să atingă placa.',
    faci: 'Deblochează, verifică placa sub freză și clema pe freză, apoi Palpează Z din nou, cu freza mai aproape sau cu o distanță de căutare mai mare.',
  },
  a6: {
    titlu: 'Homing întrerupt',
    ce: 'Ciclul de homing a fost oprit (o repornire) înainte să se termine.',
    faci: 'Asigură-te că nimic nu blochează axele, apoi fă homing din nou ($H).',
  },
  a7: {
    titlu: 'Homing: ușa s-a deschis',
    ce: 'Ușa de siguranță s-a deschis în timpul homing-ului.',
    faci: 'Închide ușa și fă homing din nou ($H).',
  },
  a8: {
    titlu: 'Homing: limitatorul nu se eliberează',
    ce: 'După atingere, axa s-a retras, dar limitatorul a rămas apăsat.',
    faci: 'Mărește distanța de retragere ($27 la GRBL) sau verifică limitatorul și firele lui, apoi fă homing din nou.',
  },
  a9: {
    titlu: 'Homing: limitatorul n-a fost găsit',
    ce: 'Axa a parcurs toată distanța de căutare fără să-și atingă limitatorul.',
    faci: 'Verifică limitatorul, firele lui și sensul homing-ului; mărește cursa maximă a axei sau micșorează retragerea, apoi fă homing din nou.',
  },
  a10: {
    titlu: 'Homing: al doilea limitator nu răspunde',
    ce: 'La o axă cu două motoare (un portal pătrat automat), al doilea limitator nu s-a declanșat la timp după primul. Există doar pe controlerele cu axa dublă configurată.',
    faci: 'Verifică al doilea limitator și firele lui, apoi fă homing din nou; mărește distanța admisă între ele dacă portalul nu e în echer.',
  },
  'hal.e18': {
    titlu: 'Comandă întreruptă de o repornire',
    ce: 'Comanda n-a mai fost executată: controlerul a fost repornit (Oprește sau oprirea de urgență) cât o aștepta.',
    faci: 'Nimic de reparat la linie: după repornire, trimite-o din nou dacă mai e nevoie.',
  },
  'hal.e19': {
    titlu: 'Valoarea trebuie să fie pozitivă',
    ce: 'O valoare care trebuie să fie mai mare decât zero a primit zero sau mai puțin.',
    faci: 'Scrie o valoare pozitivă.',
  },
  'hal.e39': {
    titlu: 'Valoare în afara plajei',
    ce: 'Un cuvânt al liniei are o valoare pe care controlerul n-o acceptă.',
    faci: 'Verifică valorile liniei (avansul, turația, numerele de sculă sau de parametru).',
  },
  'hal.e40': {
    titlu: 'Schimbarea sculei e în așteptare',
    ce: 'O schimbare de sculă (M6) nu s-a terminat, iar controlerul refuză comanda până atunci.',
    faci: 'Termină schimbarea cum o cere controlerul (de obicei, pornirea ciclului), apoi trimite din nou. La exportul de aici, alege schimbarea frezei „oprire în senderul aplicației”: atunci o conduce panoul.',
  },
  'hal.e41': {
    titlu: 'Axul nu se rotește',
    ce: 'O mișcare cerea axul pornit (viteză de tăiere constantă sau mișcare sincronizată cu axul), iar axul era oprit.',
    faci: 'Pornește axul (M3 cu S) înaintea mișcării.',
  },
  'hal.e42': {
    titlu: 'Plan greșit pentru un ciclu de strung',
    ce: 'Ciclurile de filetare și de strung cer planul ZX (G18).',
    faci: 'Pe o freză, programul n-ar trebui să aibă aceste cicluri: verifică postul.',
  },
  'hal.e43': {
    titlu: 'Avansul trece de maxim',
    ce: 'Avansul cerut e peste maximul controlerului.',
    faci: 'Micșorează avansul în program, sau verifică vitezele maxime din setări.',
  },
  'hal.e44': {
    titlu: 'Turația e în afara plajei',
    ce: 'Turația cerută (S) e în afara plajei axului din setări.',
    faci: 'Folosește o turație între minimul și maximul axului, sau corectează plaja în setări.',
  },
  'hal.e45': {
    titlu: 'Un limitator e apăsat',
    ce: 'Un limitator e apăsat: controlerul nu acceptă decât homing până se eliberează.',
    faci: 'Fă homing ($H), sau eliberează limitatorul (verifică și firele) și apasă Oprește pentru repornire.',
  },
  'hal.e46': {
    titlu: 'Homing cerut',
    ce: 'Controlerul cere homing înaintea oricărei mișcări.',
    faci: 'Fă homing ($H) din câmpul Comanda.',
  },
  'hal.e47': {
    titlu: 'Scula curentă nu e cunoscută',
    ce: 'Schimbătorul de scule nu știe ce sculă e în ax.',
    faci: 'Spune-i scula montată cu M61 Q<n> (de exemplu M61 Q1), apoi trimite din nou.',
  },
  'hal.e48': {
    titlu: 'Valori care se contrazic',
    ce: 'Linia are valori care se contrazic (două feluri de a da același lucru).',
    faci: 'Păstrează doar una dintre ele.',
  },
  autotest: {
    titlu: 'Autotestul de la pornire a eșuat',
    ce: 'Verificarea de la pornire a controlerului a eșuat.',
    faci: 'Oprește alimentarea controlerului și pornește-l din nou; dacă se repetă, verifică placa și setările ei.',
  },
  'hal.e50': {
    titlu: 'Oprirea de urgență e activă',
    ce: 'Butonul de oprire de urgență (sau intrarea lui) e activ.',
    faci: 'Eliberează oprirea de urgență, apoi apasă Oprește pentru repornire.',
  },
  'defect-motor': {
    titlu: 'Defect de motor',
    ce: 'Un driver de motor a semnalat un defect.',
    faci: 'Verifică driverul și motorul (alimentarea, firele, supraîncălzirea), apoi apasă Oprește pentru repornire.',
  },
  'setare-valoare': {
    titlu: 'Valoarea setării e respinsă',
    ce: 'Valoarea dată setării e în afara plajei ei sau nu e de tipul cerut.',
    faci: 'Verifică valoarea; setarea a rămas cum era.',
  },
  'hal.e53': {
    titlu: 'Setare indisponibilă',
    ce: 'Setarea nu există pe acest controler (driverul plăcii n-o suportă).',
    faci: 'Nimic de reparat: setarea nu se folosește pe placa ta.',
  },
  'hal.e54': {
    titlu: 'Retragerea e sub adâncimea găurii',
    ce: 'La un ciclu de găurire, planul de retragere (R) e sub adâncimea găurii.',
    faci: 'Pune R deasupra materialului.',
  },
  'hal.e55': {
    titlu: 'Homing pe două axe pătrate deodată',
    ce: 'S-a cerut homing pe două axe cu pătrare automată în același timp.',
    faci: 'Fă-le homing-ul pe rând (verifică ordinea ciclurilor de homing în setări).',
  },
  'hal.e56': {
    titlu: 'Sistemul de coordonate e blocat',
    ce: 'Sistemul de coordonate nu se poate schimba acum.',
    faci: 'Verifică setările controlerului care îl blochează.',
  },
  'hal.e57': {
    titlu: 'Marcaj de fișier neașteptat',
    ce: 'Controlerul a primit un marcaj de început sau de sfârșit de fișier (%) acolo unde nu-l aștepta.',
    faci: 'Scoate liniile cu % din program.',
  },
  'grup.port': {
    titlu: 'Port auxiliar indisponibil',
    ce: 'Comanda folosește un port auxiliar de intrare / ieșire pe care controlerul nu-l are sau nu-l poate folosi.',
    faci: 'Verifică numărul portului din comandă (M62–M67) și configurarea plăcii.',
  },
  'grup.fisiere': {
    titlu: 'Eroare în fișierele controlerului',
    ce: 'Ține de sistemul de fișiere al controlerului (cardul SD sau memoria lui): montarea, citirea, scrierea sau ștergerea unui fișier.',
    faci: 'Senderul aplicației trimite programul linie cu linie și nu folosește fișierele controlerului: eroarea vine de la o comandă trimisă de mână sau de la alt program conectat.',
  },
  'hal.e70': {
    titlu: 'Bluetooth-ul n-a pornit',
    ce: 'Modulul Bluetooth al controlerului nu s-a inițializat.',
    faci: 'Nu afectează legătura prin USB; verifică modulul dacă îl folosești.',
  },
  'grup.expresii': {
    titlu: 'Eroare în expresii sau macrouri',
    ce: 'Ține de expresiile, parametrii sau macrourile controlerului (calcule în G-code, variabile #, instrucțiuni de control).',
    faci: 'Programele exportate de aici nu folosesc expresii: verifică liniile trimise de mână sau macroul controlerului.',
  },
  'grup.acces': {
    titlu: 'Acces refuzat',
    ce: 'Controlerul cere autentificare pentru comandă, sau a refuzat-o.',
    faci: 'Autentifică-te pe controler (parola lui), apoi trimite din nou.',
  },
  'hal.e79': {
    titlu: 'Nepermis după o oprire critică',
    ce: 'Controlerul e într-o oprire critică (un limitator, oprirea de urgență) și refuză comanda.',
    faci: 'Apasă Oprește pentru repornire, apoi deblochează sau fă homing.',
  },
  'grup.scula-ax': {
    titlu: 'Scula din ax nu se potrivește',
    ce: 'Schimbătorul de scule a refuzat comanda: în ax e deja o sculă, sau nu e niciuna, iar comanda cere altceva.',
    faci: 'Verifică scula din ax și starea schimbătorului, apoi trimite din nou.',
  },
  'grup.compensare': {
    titlu: 'Compensarea razei sculei',
    ce: 'Ține de compensarea razei (G41 / G42): deja activă, nepermisă acum, sau imposibilă pe mișcarea asta.',
    faci: 'Programele exportate de aici nu folosesc G41 / G42 (traseul e deja calculat cu raza): verifică fișierul din celălalt program.',
  },
  'hal.e253': {
    titlu: 'Eroarea unei extensii',
    ce: 'O extensie (plugin) a controlerului a semnalat o eroare a ei.',
    faci: 'Citește mesajul de dinaintea erorii, în jurnal, și documentația extensiei.',
  },
  'hal.a10': {
    titlu: 'Oprire de urgență',
    ce: 'S-a declanșat oprirea de urgență: controlerul a oprit totul pe loc, deci poziția probabil nu mai e cea știută.',
    faci: 'Înlătură cauza, eliberează oprirea de urgență, apasă Oprește pentru repornire, apoi fă homing ($H), sau Deblochează și refă zero-ul.',
  },
  'homing-cerut': {
    titlu: 'Homing cerut',
    ce: 'Controlerul cere homing înaintea oricărei mișcări: poziția mașinii nu e stabilită.',
    faci: 'Fă homing ($H) din câmpul Comanda. Ca să lucrezi totuși fără, Deblochează și refă zero-ul X, Y și Z.',
  },
  'hal.a12': {
    titlu: 'Un limitator e apăsat',
    ce: 'Un limitator e apăsat (de obicei la pornire): controlerul nu acceptă mișcări.',
    faci: 'Fă homing ($H) dacă mașina are homing; altfel Deblochează și scoate axa de pe limitator cu jog-ul. Dacă nicio axă nu e pe un limitator, verifică firele.',
  },
  'hal.a13': {
    titlu: 'Protecția sondei',
    ce: 'Sonda (placa de contact) s-a închis în afara unei palpări: controlerul a oprit mișcarea.',
    faci: 'Scoate placa sau clema de pe freză, Deblochează, apoi refă zero-ul înainte de a tăia.',
  },
  'hal.a14': {
    titlu: 'Axul n-a ajuns la turație',
    ce: 'Axul n-a atins turația cerută în timpul așteptat.',
    faci: 'Verifică axul și variatorul (alimentarea, legătura, setarea turației), apoi Deblochează.',
  },
  'hal.a18': {
    titlu: 'Homing: configurare greșită',
    ce: 'Ciclul de homing nu poate porni cu setările de acum.',
    faci: 'Verifică setările homing-ului (axele fiecărui ciclu, sensurile, vitezele), apoi fă homing din nou.',
  },
  'hal.a19': {
    titlu: 'Eroare Modbus',
    ce: 'Un dispozitiv Modbus (de obicei variatorul axului) n-a răspuns la timp, sau a răspuns greșit.',
    faci: 'Verifică legătura RS-485 și setările variatorului, apoi Deblochează.',
  },
  'hal.a20': {
    titlu: 'Extensia de intrări / ieșiri nu răspunde',
    ce: 'Controlerul a pierdut legătura cu extensia lui de intrări / ieșiri.',
    faci: 'Verifică extensia și legătura ei, apoi apasă Oprește pentru repornire.',
  },
  'hal.a21': {
    titlu: 'Memoria setărilor a cedat',
    ce: 'Memoria în care controlerul își ține setările (EEPROM / flash) nu se poate citi sau scrie.',
    faci: 'Nu tăia: citește setările ($$) și verifică-le; dacă eroarea se repetă, placa controlerului are nevoie de service.',
  },
  'hal.a22': {
    titlu: 'Bufferul controlerului s-a umplut',
    ce: 'Controlerul a primit mai multe date decât încăpeau în bufferul lui.',
    faci: 'Senderul aplicației nu trimite niciodată peste buffer; dacă alarma vine cu el, e un defect al nostru. Altfel, vezi celălalt program conectat. Apoi Deblochează și refă zero-ul.',
  },
  'fnc.e19': {
    titlu: 'Homing-ul unei singure axe nu e permis',
    ce: 'Configurarea nu permite homing-ul unei singure axe ($H cu o axă).',
    faci: 'Fă homing-ul întreg ($H).',
  },
  'fnc.e38': {
    titlu: 'Valoare G-code peste maxim',
    ce: 'O valoare a liniei e peste maximul acceptat de controler (numărul sculei, de exemplu).',
    faci: 'Folosește o valoare mai mică.',
  },
  'fnc.e39': {
    titlu: 'Parametrul P e prea mare',
    ce: 'Numărul ieșirii (P) la M62–M67 e peste ieșirile configurate pe controler.',
    faci: 'Folosește o ieșire care există în configurare (config.yaml).',
  },
  'fnc.e40': {
    titlu: 'Intrări active la pornire',
    ce: 'O intrare de control sau un limitator era activ la pornire, iar controlerul refuză comanda până se rezolvă.',
    faci: 'Vezi în jurnal ce intrări sunt active (mesajul de la pornire), eliberează-le sau verifică firele, apoi apasă Oprește pentru repornire.',
  },
  'fnc.intern': {
    titlu: 'Stare internă a controlerului',
    ce: 'Un cod intern al controlerului (un mesaj netrimis, sfârșit de linie sau de fișier, o repornire, o comandă amânată).',
    faci: 'De obicei nu ține de program: dacă se repetă, notează ce făceai și verifică versiunea FluidNC.',
  },
  'fnc.nvs': {
    titlu: 'Setarea nu s-a putut salva',
    ce: 'Controlerul nu și-a putut scrie sau citi memoria setărilor.',
    faci: 'Încearcă din nou; dacă se repetă, verifică memoria controlerului.',
  },
  'fnc.e120': {
    titlu: 'Altă legătură e ocupată',
    ce: 'Altă legătură a controlerului (interfața web, de exemplu) rulează o lucrare.',
    faci: 'Așteaptă, sau oprește lucrarea pornită de acolo, apoi trimite din nou.',
  },
  'fnc.e130': {
    titlu: 'Jog anulat',
    ce: 'Jog-ul a fost oprit înainte de capăt (cu Oprește jog-ul, de exemplu).',
    faci: 'Nimic de reparat: mașina s-a oprit unde era.',
  },
  'fnc.config': {
    titlu: 'Configurarea controlerului e greșită',
    ce: 'Configurarea FluidNC (pinii sau o setare de rulare) nu e validă.',
    faci: 'Citește mesajele de la pornire (în jurnal) și corectează config.yaml.',
  },
  'fnc.e162': {
    titlu: 'Setare doar de citit',
    ce: 'Setarea se poate citi, dar nu se poate schimba.',
    faci: 'Nimic de reparat: valoarea rămâne a controlerului.',
  },
  'fnc.e181': {
    titlu: 'Valoare G-code nevalidă',
    ce: 'Un cuvânt al liniei are o valoare pe care comanda n-o acceptă.',
    faci: 'Corectează valoarea.',
  },
  'fnc.e182': {
    titlu: 'M72 fără stare salvată',
    ce: 'M72 (refacerea stării modale) a venit fără un M70 înainte.',
    faci: 'Pune M70 înaintea lui M72, sau scoate M72.',
  },
  'fnc.a10': {
    titlu: 'Axul nu răspunde',
    ce: 'Controlul axului (variatorul) a semnalat o eroare, sau n-a răspuns.',
    faci: 'Verifică axul, variatorul și legătura lor, apoi Deblochează.',
  },
  'fnc.a11': {
    titlu: 'O intrare activă la pornire',
    ce: 'Un limitator sau o intrare de control era activ la pornire.',
    faci: 'Vezi în jurnal care (mesajul de la pornire), eliberează-l sau verifică firele, apoi Deblochează.',
  },
  'fnc.a12': {
    titlu: 'Homing: limitator ambiguu',
    ce: 'La homing, s-a declanșat un limitator comun mai multor axe și nu se știe al cui e.',
    faci: 'Verifică ordinea ciclurilor de homing din config.yaml (axele cu limitator comun, în cicluri diferite), apoi fă homing din nou.',
  },
  'fnc.a13': {
    titlu: 'Oprire forțată',
    ce: 'Controlerul a oprit motoarele pe loc (un limitator atins sau o oprire forțată): poziția probabil nu mai e cea știută.',
    faci: 'Apasă Oprește pentru repornire, apoi fă homing ($H), sau Deblochează și refă zero-ul X, Y și Z.',
  },
  'fnc.a15': {
    titlu: 'Alarmă de pornire',
    ce: 'Controlerul e configurat să pornească în alarmă după alimentare sau după o repornire.',
    faci: 'Fă homing ($H), sau Deblochează și refă zero-ul.',
  },
  'fnc.a16': {
    titlu: 'Extensia s-a repornit',
    ce: 'Extensia de intrări / ieșiri a controlerului s-a repornit; controlerul cere și el o repornire.',
    faci: 'Oprește alimentarea controlerului și pornește-l din nou.',
  },
  'fnc.a17': {
    titlu: 'Eroare G-code în timpul lucrării',
    ce: 'O linie a lucrării a dat o eroare, iar controlerul a oprit lucrarea cu o alarmă.',
    faci: 'Citește eroarea de dinaintea alarmei (în jurnal și în lista Erori), corectează programul, apoi Deblochează.',
  },
  'fnc.a18': {
    titlu: 'Limitator atins la palpare',
    ce: 'Un limitator s-a declanșat în timpul palpării.',
    faci: 'Deblochează, ridică freza cu jog-ul pe Z+, verifică distanța de căutare, apoi refă zero-ul.',
  },
  blocare: {
    titlu: 'Mașina e blocată (Alarm)',
    ce: 'Controlerul a pornit blocat: are homing-ul activat, sau a fost repornit după o alarmă. Până la deblocare refuză orice mișcare.',
    faci: 'Fă homing ($H) dacă mașina are limitatoare: poziția devine sigură. Altfel Deblochează, apoi refă zero-ul X, Y și Z înainte de a tăia.',
  },
};
