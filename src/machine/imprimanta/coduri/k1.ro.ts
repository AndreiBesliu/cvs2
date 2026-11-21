/** Textele codurilor K1 (în română), felia 3.6v: ce s-a întâmplat (titlul) și ce faci; cheile, ca în `k1.ts`. */
import type { TextCodImprimanta } from '../../../../shared/coduriImprimanta.ts';

export const textK1Ro: Readonly<Record<number, TextCodImprimanta>> = {
  1: {
    titlu: 'Problemă la driverul unui motor',
    faci: 'Oprește imprimanta, verifică dacă axele se mișcă liber și cablurile motoarelor sunt bine puse, apoi pornește-o din nou.',
  },
  2: {
    titlu: 'Eroare internă a imprimantei',
    faci: 'Repornește imprimanta. Dacă revine, notează codul și scrie la asistența Creality.',
  },
  3: {
    titlu: 'Comunicarea dintre plăcile imprimantei s-a întrerupt',
    faci: 'Oprește imprimanta, verifică mufele cablului capului de imprimare, apoi pornește-o din nou.',
  },
  4: {
    titlu: 'Încălzirea nu merge cum trebuie',
    faci: 'Uită-te în fereastră care temperatură nu urcă (duza sau patul) și verifică mufele și cablul ei, apoi repornește.',
  },
  6: {
    titlu: 'Problemă la extruder',
    faci: 'Verifică dacă filamentul intră liber și duza nu e înfundată, apoi încearcă din nou.',
  },
  7: {
    titlu: 'Coordonatele din fișier sunt greșite',
    faci: 'Refeliază fișierul pentru imprimanta ta (cu profilul ei) și trimite-l din nou.',
  },
  9: {
    titlu: 'Senzorul de vibrații al capului nu răspunde',
    faci: 'Repornește imprimanta. Dacă revine, verifică mufele cablului capului de imprimare.',
  },
  10: {
    titlu: 'Problemă la un ventilator',
    faci: 'Uită-te dacă ventilatoarele capului se învârt și nu le blochează fire sau resturi de filament; verifică mufele lor.',
  },
  100: {
    titlu: 'Fișierul de pe stick nu s-a putut copia în imprimantă',
    faci: 'Imprimarea n-a pornit. Încearcă alt stick sau trimite fișierul din cvs2.',
  },
  101: {
    titlu: 'Camera a văzut o problemă de calitate și a pus imprimarea pe pauză',
    faci: 'Uită-te la piesă. Dacă e bine, reia; altfel oprește imprimarea și curăță patul.',
  },
  102: {
    titlu: 'Numele fișierului e prea lung',
    faci: 'Dă fișierului un nume mai scurt și trimite-l din nou.',
  },
  103: {
    titlu: 'Primul strat nu arată bine: imprimarea e pe pauză',
    faci: 'Uită-te la primul strat. Dacă e bun, reia; altfel oprește, curăță patul și verifică nivelarea.',
  },
  104: {
    titlu: 'Un obiect străin pe pat: imprimarea e pe pauză',
    faci: 'Ia de pe pat ce nu trebuie să fie acolo, apoi reia.',
  },
  108: {
    titlu: 'Corectarea poziției LiDAR-ului n-a reușit',
    faci: 'Curăță fereastra LiDAR-ului și refă calibrarea din meniul imprimantei.',
  },
  109: {
    titlu: 'Ventilatorul radiatorului capului nu merge: imprimarea s-a oprit',
    faci: 'Verifică dacă ventilatorul se învârte liber și mufa lui e bine pusă; fără el, filamentul se poate înfunda.',
  },
  110: {
    titlu: 'Placa de bază nu răspunde',
    faci: 'Oprește imprimanta, verifică mufele cablurilor plăcii de bază, apoi pornește-o din nou.',
  },
  111: {
    titlu: 'Placa capului de imprimare nu răspunde',
    faci: 'Oprește imprimanta și verifică mufele cablului capului de imprimare, la ambele capete.',
  },
  112: {
    titlu: 'Placa patului nu răspunde',
    faci: 'Oprește imprimanta și verifică mufele cablului patului.',
  },
  115: {
    titlu: 'O imprimare a rămas neterminată (o pană de curent)',
    faci: 'Pe ecranul imprimantei alegi dacă o reia de unde s-a oprit sau renunți.',
  },
  116: {
    titlu: 'S-a terminat filamentul: imprimarea e pe pauză',
    faci: 'Pune filament nou, apoi reia.',
  },
  117: {
    titlu: 'Piesa se deformează și se ridică de pe pat: imprimarea e pe pauză',
    faci: 'Uită-te la colțurile piesei. Dacă e bine, reia; altfel oprește, curăță patul și încearcă un brim sau patul mai cald.',
  },
  201: {
    titlu: 'Temperatura din carcasă e neobișnuită',
    faci: 'Lasă imprimanta să se răcească, ridică capacul și verifică ventilatorul carcasei.',
  },
  204: {
    titlu: 'Problemă la un ventilator',
    faci: 'Verifică dacă ventilatoarele se învârt și nu le blochează nimic; verifică mufele lor.',
  },
  205: {
    titlu: 'Problemă de rețea',
    faci: 'Verifică WiFi-ul imprimantei (semnalul, parola) și routerul.',
  },
  206: {
    titlu: 'Camera a văzut o problemă de calitate',
    faci: 'Uită-te la piesă; dacă nu e bine, oprește imprimarea.',
  },
  207: {
    titlu: 'Senzorul de nivelare nu merge cum trebuie',
    faci: 'Curăță duza și patul, verifică să nu fie nimic sub duză sau sub pat, apoi refă nivelarea.',
  },
  208: {
    titlu: 'Fișierul are o problemă',
    faci: 'Refeliază fișierul pentru imprimanta ta (cu profilul ei) și trimite-l din nou.',
  },
  209: {
    titlu: 'Temperatura patului e neobișnuită',
    faci: 'Lasă patul să se răcească și verifică mufa și cablul lui.',
  },
  500: {
    titlu: 'Camera a văzut „spaghete” (doar un avertisment)',
    faci: 'Imprimarea merge mai departe. Uită-te la piesă; dacă nu e bine, oprește.',
  },
  501: {
    titlu: 'Ventilatorul radiatorului capului se învârte prea încet',
    faci: 'Scoate capacul capului și verifică ventilatorul (fire, praf, resturi de filament) și mufa lui.',
  },
  502: {
    titlu: 'Problemă la ventilatorul plăcii de bază',
    faci: 'Verifică dacă ventilatorul plăcii de bază se învârte și mufa lui e bine pusă.',
  },
  503: {
    titlu: 'Primul strat nu arată bine (doar un avertisment)',
    faci: 'Imprimarea merge mai departe. Uită-te la primul strat; dacă nu se lipește, oprește și curăță patul.',
  },
  504: {
    titlu: 'Fișierul nu permite verificarea debitului (doar un avertisment)',
    faci: 'Imprimarea merge fără verificare. Pentru ea, feliază fișierul în Creality Print.',
  },
  505: {
    titlu: 'LiDAR-ul nu e găsit',
    faci: 'Verifică cablul și mufele LiDAR-ului, apoi repornește imprimanta.',
  },
  506: {
    titlu: 'Calibrarea LiDAR-ului n-a reușit',
    faci: 'Curăță fereastra LiDAR-ului și patul, apoi refă calibrarea.',
  },
  507: {
    titlu: 'Alinierea LiDAR-ului n-a reușit',
    faci: 'Curăță fereastra LiDAR-ului și refă calibrarea din meniul imprimantei.',
  },
  508: {
    titlu: 'Memoria imprimantei e aproape plină',
    faci: 'Șterge de pe ecranul imprimantei fișiere vechi sau filme.',
  },
  509: {
    titlu: 'Carcasa e prea caldă: camera s-a oprit',
    faci: 'Camera pornește singură când temperatura scade. La PLA, ridică capacul.',
  },
  510: {
    titlu: 'Camera n-a pornit',
    faci: 'Repornește imprimanta. Dacă revine, verifică cablul camerei.',
  },
  523: {
    titlu: 'Piesa se deformează (doar un avertisment)',
    faci: 'Uită-te la colțurile piesei; dacă se ridică, oprește și încearcă un brim.',
  },
  800: {
    titlu: 'Eroare la mișcarea unei axe',
    faci: 'Verifică să nu fie nimic în calea capului sau a patului, apoi fă homing-ul.',
  },
  801: {
    titlu: 'Imprimanta se pregătește',
    faci: 'Așteaptă: se încălzește sau își face verificările înainte de imprimare.',
  },
  2000: {
    titlu: 'Eroare de sistem: o placă a imprimantei s-a oprit',
    faci: 'Repornește imprimanta. Dacă revine, verifică mufele cablurilor plăcilor.',
  },
  2001: {
    titlu: 'Driverul extruderului nu răspunde',
    faci: 'Oprește imprimanta și pune din nou cablul capului de imprimare, la ambele capete.',
  },
  2002: {
    titlu: 'Placa de bază nu se conectează',
    faci: 'Oprește imprimanta, verifică mufele cablurilor plăcii de bază și pornește-o din nou.',
  },
  2014: {
    titlu: 'Fișierul cere o mișcare mai lungă decât cursa imprimantei',
    faci: 'Refeliază fișierul pentru imprimanta ta (cu profilul ei) și trimite-l din nou.',
  },
  2016: {
    titlu: 'Reluare fără pauză',
    faci: 'Imprimarea nu era pe pauză: nu e nimic de reluat.',
  },
  2019: {
    titlu: 'Temperatura cerută e în afara intervalului imprimantei',
    faci: 'Verifică temperaturile cerute în fișier sau în fereastră: sunt peste cât permite imprimanta.',
  },
  2020: {
    titlu: 'Homing-ul n-a reușit',
    faci: 'Verifică să nu fie nimic în calea capului sau a patului, apoi fă din nou homing-ul.',
  },
  2021: {
    titlu: 'Homing-ul a durat prea mult',
    faci: 'Verifică dacă axele se mișcă liber și curelele sunt întinse, apoi fă din nou homing-ul.',
  },
  2056: {
    titlu: 'Accelerometrul nu măsoară',
    faci: 'Repornește imprimanta și refă calibrarea. Dacă revine, verifică mufele cablului capului de imprimare.',
  },
  2060: {
    titlu: 'Eroare de sistem la capul de imprimare',
    faci: 'Oprește imprimanta, pune din nou cablul capului de imprimare și pornește-o. Dacă revine, cablul poate trebui schimbat.',
  },
  2065: {
    titlu: 'Accelerometrul capului nu răspunde corect',
    faci: 'Verifică mufele cablului capului de imprimare. Dacă revine, placa capului poate trebui schimbată.',
  },
  2069: {
    titlu: 'Fișierul are o comandă de ventilator pe care imprimanta n-o cunoaște (M107 P3)',
    faci: 'Refeliază fișierul cu o versiune nouă a feliatorului.',
  },
  2090: {
    titlu: 'Placa de bază n-a ținut pasul',
    faci: 'Repornește imprimanta. Dacă revine des, încearcă un fișier cu mai puține detalii fine sau scrie la asistența Creality.',
  },
  2091: {
    titlu: 'Comunicarea dintre plăci s-a întrerupt o clipă',
    faci: 'Repornește imprimanta și verifică mufele cablurilor plăcilor.',
  },
  2093: {
    titlu: 'Eroare de sistem',
    faci: 'Repornește imprimanta. Dacă revine, notează codul și scrie la asistența Creality.',
  },
  2095: {
    titlu: 'Axele trebuie aduse întâi acasă (homing)',
    faci: 'Fă homing-ul din fereastra Imprimanta sau de pe ecran, apoi încearcă din nou.',
  },
  2111: {
    titlu: 'Duza e prea rece ca să extrudeze',
    faci: 'Încălzește duza la temperatura materialului și încearcă din nou. Dacă apare la pornirea unui fișier, refeliază-l.',
  },
  2112: {
    titlu: 'Fișierul cere mai mult filament decât poate extruda imprimanta',
    faci: 'Refeliază cu profilul imprimantei; verifică debitul, lățimea liniei și înălțimea stratului.',
  },
  2113: {
    titlu: 'Extruderul nu s-a putut configura',
    faci: 'Repornește imprimanta. Dacă revine, notează codul și scrie la asistența Creality.',
  },
  2114: {
    titlu: 'Comandă de extrudare fără extruder',
    faci: 'Repornește imprimanta. Dacă revine, refeliază fișierul cu profilul imprimantei.',
  },
  2115: {
    titlu: 'Eroare de configurare a firmware-ului',
    faci: 'Repornește imprimanta. Dacă revine, actualizează firmware-ul sau scrie la asistența Creality.',
  },
  2116: {
    titlu: 'Eroare internă a firmware-ului',
    faci: 'Repornește imprimanta. Dacă revine, notează codul și scrie la asistența Creality.',
  },
  2117: {
    titlu: 'Un mesaj stricat între plăcile imprimantei',
    faci: 'Repornește imprimanta și verifică mufele cablurilor plăcilor.',
  },
  2118: {
    titlu: 'Accelerometrul nu poate fi citit',
    faci: 'Repornește imprimanta și refă calibrarea. Dacă revine, verifică mufele cablului capului de imprimare.',
  },
  2119: {
    titlu: 'Accelerometrul nu e recunoscut',
    faci: 'Verifică mufele cablului capului de imprimare: de obicei e o mufă slăbită.',
  },
  2210: {
    titlu: 'Filamentul nu se poate încărca: duza e prea rece',
    faci: 'Încălzește întâi duza, apoi încarcă filamentul.',
  },
  2211: {
    titlu: 'Imprimarea e pe pauză',
    faci: 'Reia din fereastra Imprimanta sau de pe ecran, când ești gata.',
  },
  2242: {
    titlu: 'Axele trebuie aduse întâi acasă (homing)',
    faci: 'Fă homing-ul din fereastra Imprimanta sau de pe ecran, apoi încearcă din nou.',
  },
  2243: {
    titlu: 'O mișcare iese din cursa imprimantei',
    faci: 'Refeliază fișierul pentru imprimanta ta și verifică să încapă piesele pe pat.',
  },
  2252: {
    titlu: 'O valoare dintr-o comandă e prea mică',
    faci: 'Dacă vine dintr-un fișier, refeliază-l; altfel repornește imprimanta.',
  },
  2253: {
    titlu: 'O valoare dintr-o comandă e prea mare',
    faci: 'Dacă vine dintr-un fișier, refeliază-l; altfel repornește imprimanta.',
  },
  2283: {
    titlu: 'Imprimanta nu e gata',
    faci: 'Așteaptă să termine pornirea sau repornește-o: o eroare de dinainte o poate ține oprită.',
  },
  2294: {
    titlu: 'Imprimanta n-a răspuns la timp',
    faci: 'Repornește imprimanta. Dacă revine, exportă jurnalul ei și scrie la asistența Creality.',
  },
  2295: {
    titlu: 'O placă a imprimantei n-a repornit',
    faci: 'Oprește imprimanta de la buton, așteaptă câteva secunde și pornește-o din nou.',
  },
  2298: {
    titlu: 'O placă a imprimantei a rămas fără curent',
    faci: 'Oprește imprimanta, verifică mufele de alimentare ale plăcilor și pornește-o din nou.',
  },
  2299: {
    titlu: 'O placă a imprimantei nu s-a putut configura',
    faci: 'Repornește imprimanta. Dacă revine, actualizează firmware-ul sau scrie la asistența Creality.',
  },
  2300: {
    titlu: 'Eroare la configurarea unei plăci a imprimantei',
    faci: 'Repornește imprimanta. Dacă revine, actualizează firmware-ul sau scrie la asistența Creality.',
  },
  2308: {
    titlu: 'Accelerometrul nu dă date',
    faci: 'Repornește imprimanta și refă calibrarea. Dacă revine, verifică mufele cablului capului de imprimare.',
  },
  2313: {
    titlu: 'Eroare la citirea accelerometrului',
    faci: 'Refă calibrarea. Dacă revine, repornește imprimanta.',
  },
  2340: {
    titlu: 'Temperatura cerută unui încălzitor e în afara intervalului',
    faci: 'Verifică temperaturile cerute în fișier sau în fereastră: sunt peste cât permite imprimanta.',
  },
  2343: {
    titlu: 'Placa de bază nu mai răspunde',
    faci: 'Oprește imprimanta, verifică mufele cablurilor plăcii de bază, apoi pornește-o din nou.',
  },
  2344: {
    titlu: 'Placa capului de imprimare nu mai răspunde',
    faci: 'Oprește imprimanta și verifică mufele cablului capului de imprimare, la ambele capete.',
  },
  2345: {
    titlu: 'Placa patului nu mai răspunde',
    faci: 'Oprește imprimanta și verifică mufele cablului patului.',
  },
  2503: {
    titlu: 'Senzorul de nivelare nu poate fi citit',
    faci: 'Repornește imprimanta. Dacă revine, verifică cablurile senzorilor de sub pat.',
  },
  2504: {
    titlu: 'Homing-ul pe Z n-a reușit',
    faci: 'Curăță duza și patul, verifică să nu fie nimic sub duză sau sub pat, apoi refă nivelarea.',
  },
  2505: {
    titlu: 'Un driver de motor s-a protejat (supraîncălzire sau tensiune)',
    faci: 'Oprește imprimanta, las-o să se răcească și verifică ventilatorul plăcii de bază.',
  },
  2506: {
    titlu: 'Comunicarea cu capul de imprimare s-a întrerupt',
    faci: 'Oprește imprimanta și verifică mufele cablului capului de imprimare.',
  },
  2509: {
    titlu: 'Temperatura duzei nu se poate citi (termistorul pare deconectat)',
    faci: 'Oprește imprimanta și verifică mufa termistorului din capul de imprimare.',
  },
  2510: {
    titlu: 'Temperatura patului nu se poate citi (termistorul pare deconectat)',
    faci: 'Oprește imprimanta și verifică mufa termistorului patului.',
  },
  2511: {
    titlu: 'Senzorul de temperatură al carcasei pare deconectat',
    faci: 'Oprește imprimanta și verifică mufa senzorului de temperatură al carcasei.',
  },
  2512: {
    titlu: 'Placa de bază e prea caldă',
    faci: 'Oprește imprimanta, las-o să se răcească și verifică ventilatorul plăcii de bază.',
  },
  2513: {
    titlu: 'O comandă are formatul greșit',
    faci: 'Dacă vine dintr-un fișier, refeliază-l; altfel repornește imprimanta.',
  },
  2514: {
    titlu: 'Parametrul unei comenzi are formatul greșit',
    faci: 'Dacă vine dintr-un fișier, refeliază-l; altfel repornește imprimanta.',
  },
  2515: {
    titlu: 'Temperatura duzei e peste limită (termistorul poate fi în scurtcircuit)',
    faci: 'Oprește imprimanta și verifică termistorul duzei și cablul lui.',
  },
  2516: {
    titlu: 'Termistorul patului pare în scurtcircuit',
    faci: 'Oprește imprimanta și verifică termistorul patului și cablul lui.',
  },
  2517: {
    titlu: 'Senzorul de temperatură al carcasei pare în scurtcircuit',
    faci: 'Oprește imprimanta și verifică senzorul carcasei și cablul lui.',
  },
  2520: {
    titlu: 'Senzorul de nivelare răspunde prea încet',
    faci: 'Repornește imprimanta. Dacă revine des, scrie la asistența Creality.',
  },
  2521: {
    titlu: 'Senzorul de nivelare dă mereu aceeași valoare',
    faci: 'Repornește imprimanta. Dacă revine, verifică cablurile senzorilor de sub pat.',
  },
  2522: {
    titlu: 'Senzorul de nivelare nu simte atingerea duzei',
    faci: 'Curăță duza și patul, verifică să nu fie nimic sub duză sau sub pat, apoi refă nivelarea.',
  },
  2523: {
    titlu: 'Măsurarea pentru nivelare s-a întrerupt',
    faci: 'Verifică dacă axa Z se mișcă liber, apoi refă nivelarea.',
  },
  2524: {
    titlu: 'Senzorul de nivelare are prea mult zgomot',
    faci: 'Așază imprimanta pe o suprafață stabilă, fără vibrații, și refă nivelarea.',
  },
  2526: {
    titlu: 'Motorul Z a pierdut pași la nivelare',
    faci: 'Verifică dacă axa Z se mișcă liber și nimic nu apasă pe pat, apoi refă nivelarea.',
  },
  2527: {
    titlu: 'Măsurarea pentru nivelare a rămas neterminată',
    faci: 'Repornește imprimanta și refă nivelarea.',
  },
  2529: {
    titlu: 'Homing-ul pe Z n-a reușit după prea multe încercări',
    faci: 'Curăță duza de filamentul agățat și curăță patul, apoi fă din nou homing-ul.',
  },
  2532: {
    titlu: 'Legătura de sincronizare dintre plăci nu merge',
    faci: 'Oprește imprimanta și verifică mufele cablurilor dintre plăci. Dacă revine, scrie la asistența Creality.',
  },
  2533: {
    titlu: 'Nivelarea salvată nu se potrivește patului',
    faci: 'Refă nivelarea din meniul imprimantei înainte de imprimare.',
  },
  2560: {
    titlu: 'Comunicarea cu placa de bază s-a întrerupt',
    faci: 'Verifică mufele cablurilor și repornește imprimanta.',
  },
  2561: {
    titlu: 'Comunicarea cu placa capului de imprimare s-a întrerupt',
    faci: 'Verifică mufele cablului capului de imprimare și repornește imprimanta.',
  },
  2562: {
    titlu: 'Comunicarea cu placa patului s-a întrerupt',
    faci: 'Verifică mufele cablului patului și repornește imprimanta.',
  },
  2563: {
    titlu: 'Comunicarea dintre calculatorul imprimantei și plăci s-a întrerupt',
    faci: 'Verifică mufele cablurilor și repornește imprimanta.',
  },
  2564: {
    titlu: 'Duza nu se încălzește cum trebuie',
    faci: 'Oprește imprimanta și verifică blocul de încălzire al duzei și mufele lui.',
  },
  2565: {
    titlu: 'Patul nu se încălzește cum trebuie',
    faci: 'Oprește imprimanta și verifică mufa patului și cablul lui.',
  },
  2571: {
    titlu: 'Fișierul de imprimat e stricat',
    faci: 'Trimite fișierul din nou; dacă revine, refeliază-l.',
  },
  2573: {
    titlu: 'Homing-ul pe X n-a reușit',
    faci: 'Verifică să nu fie nimic în calea capului și dacă cureaua e întinsă, apoi fă din nou homing-ul.',
  },
  2577: {
    titlu: 'Homing-ul pe Y n-a reușit',
    faci: 'Verifică să nu fie nimic în calea capului și dacă cureaua e întinsă, apoi fă din nou homing-ul.',
  },
  2581: {
    titlu: 'Homing-ul pe Z n-a reușit',
    faci: 'Verifică să nu fie nimic sub pat sau sub duză, apoi fă din nou homing-ul.',
  },
  2585: {
    titlu: 'Coordonatele X ies din cursă',
    faci: 'Fișierul cere o mișcare pe X dincolo de pat. Refeliază-l pentru imprimanta ta sau mută piesele spre mijlocul patului.',
  },
  2586: {
    titlu: 'Coordonatele Y ies din cursă',
    faci: 'Fișierul cere o mișcare pe Y dincolo de pat. Refeliază-l pentru imprimanta ta sau mută piesele spre mijlocul patului.',
  },
  2587: {
    titlu: 'Coordonatele Z ies din cursă',
    faci: 'Fișierul cere o înălțime mai mare decât poate imprimanta. Refeliază-l pentru imprimanta ta sau micșorează piesa.',
  },
  2588: {
    titlu: 'Decalajul Z (Z offset) e prea mare',
    faci: 'Refă nivelarea și calibrarea decalajului Z din meniul imprimantei.',
  },
  3000: {
    titlu: 'Eroare de sistem',
    faci: 'Repornește imprimanta. Dacă revine, notează codul și scrie la asistența Creality.',
  },
  3001: {
    titlu: 'Eroare de sistem',
    faci: 'Repornește imprimanta. Dacă revine, notează codul și scrie la asistența Creality.',
  },
  3002: {
    titlu: 'Comunicarea cu capul de imprimare s-a întrerupt, în repaus',
    faci: 'Oprește imprimanta și verifică mufa cablului capului de imprimare de pe placa de bază.',
  },
  5000: {
    titlu: 'Coordonatele din fișier ies din cursă',
    faci: 'Fișierul cere mișcări în afara patului. Refeliază-l pentru imprimanta ta și verifică să încapă piesele pe pat.',
  },
};
