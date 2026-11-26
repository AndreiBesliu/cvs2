# Lista de otrăvuri a feliei 3.Th (rotițele dințate în atelierul Easy 3Draw, ADR 0169), 18.11.2026, alese de autor: motorul
# (jocul și variantele, cremaliera, cercurile, grosimea, mijlocul capului, pereții răsuciți, sensul, V-ul, răsucirea, găurile,
# avertismentul, marginile, setul de calibrare, distanța dintre axe) și atelierul (perechea și sensul ei, grila, numele,
# varianta trimisă motorului, câmpul din calibrare, unghiul doar la oblici); apoi, după privirea pe roata reală, peretele
# dintre gaură și dinți (rotirea crucii, avertismentul, gaura care nu încape).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.rotite.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

# Motorul (unitare).
o('U01', E, '    joc_dinti: 0.15,', '    joc_dinti: 0.1,', 'rotite', 'jocul implicit (varianta 3) de 0,10 în loc de 0,15')
o('U02', E, 'pas_cupa: 0.1, pas_dinti: 0.05,', 'pas_cupa: 0.1, pas_dinti: 0.1,', 'rotite', 'pasul variantelor roților dublat')
o('U03', E, 'const alfa = 20 * Math.PI / 180, r = m * z / 2', 'const alfa = 25 * Math.PI / 180, r = m * z / 2', 'rotite',
  'unghiul de presiune de 25° (roțile nu mai sunt LEGO)')
o('U04', E, 'ra = r + m, rf = r - 1.25 * m;', 'ra = r + 1.1 * m, rf = r - 1.25 * m;', 'rotite', 'capul dintelui prea înalt')
o('U05', E, 'ra = r + m, rf = r - 1.25 * m;', 'ra = r + m, rf = r - 1.2 * m;', 'rotite', 'piciorul prea puțin adânc')
o('U06', E, 'const sc = Math.PI * m / 2 + 2 * joc,', 'const sc = Math.PI * m / 2 + joc,', 'rotite', 'jocul pus pe un singur flanc')
o('U07', E, 'out.push(...jos, [R.ra * Math.cos(c), R.ra * Math.sin(c)], ...sus.reverse());', 'out.push(...jos, ...sus.reverse());',
  'rotite', 'capul fără mijloc: coarda scurtează diametrul')
o('U08', E, 'tri.push([p3(A[k]!, z0), p3(A[k1]!, z0), p3(B[k1]!, z1)], [p3(A[k]!, z0), p3(B[k1]!, z1), p3(B[k]!, z1)]);',
  'tri.push([p3(A[k]!, z0), p3(B[k1]!, z1), p3(A[k1]!, z0)], [p3(A[k]!, z0), p3(B[k1]!, z1), p3(B[k]!, z1)]);', 'rotite',
  'un triunghi al peretelui răsucit întors (corpul nu mai e închis)')
o('U09', E, 's = sens === "stanga" ? -1 : 1;', 's = 1;', 'rotite', 'sensul stânga răsucit tot spre dreapta')
o('U10', E, 'zh => (zh <= h / 2 ? zh : h - zh) * k', 'zh => zh * k', 'rotite', '„în V” făcut oblic')
o('U11', E, 'const k = Math.tan(beta) / R.r * s,', 'const k = Math.tan(beta) / R.ra * s,', 'rotite', 'răsucirea socotită pe cercul de cap')
o('U12', E, 'let g: Poli[] = gaura === "r" ? [cerc(0, 0, e.gauraD / 2)] : gaura === "nu" ? [] : [cruce(0, 0, e.axGauraD, e.axGauraLat)];',
  'let g: Poli[] = gaura === "r" ? [cruce(0, 0, e.axGauraD, e.axGauraLat)] : gaura === "nu" ? [] : [cerc(0, 0, e.gauraD / 2)];', 'rotite',
  'gaura rotundă și crucea schimbate între ele')
# U13, U20, U21: în funcția comună a găurii (`gauraRoata`, de la 3.Tn: conica dublă are aceeași gaură), ori, la U20, cu textul
# rotiței înainte, fiindcă formatul peretelui e și în avertismentul conicei duble
o('U13', E, 'slaba: !lipseste && g.length > 0 && perete < 0.8 }', 'slaba: !lipseste && g.length > 0 && perete < 0.2 }', 'rotite',
  'peretele de 0,23 mm al roții de 8 nu mai e spus')
o('U14', E, 'const z = Math.round(Math.min(80, Math.max(8, Number.isFinite(+dinti)', 'const z = Math.round(Math.min(80, Math.max(6, Number.isFinite(+dinti)', 'rotite', 'roți cu 6 dinți')
o('U15', E, 'P = { ...salvat, varianta_dinti: v };', 'P = { ...salvat, varianta_dinti: 3 };', 'rotite', 'toate roțile de probă cu același joc')
o('U16', E, 'tri.push(...semne(v, -3.4, 3.6, 3.79, 1.4));', 'tri.push(...semne(1, -3.4, 3.6, 3.79, 1.4));', 'rotite',
  'roțile de probă fără numărul lor pe față')
o('U17', E, 'distantaRoti: (z1: number, z2: number, m = 1) => m * (z1 + z2) / 2,',
  'distantaRoti: (z1: number, z2: number, m = 1) => m * (z1 + z2) / 2 + 0.1,', 'rotite', 'distanța dintre axe cu 0,1 mm prea mare')
o('U18', E, 'jocDinti: Math.max(0, P.joc_dinti + (P.varianta_dinti - 3) * P.pas_dinti),',
  'jocDinti: Math.max(0, P.joc_dinti + (P.varianta_dinti - 3) * P.pas_dinti) / 2,', 'rotite', 'jocul efectiv înjumătățit')
# După privirea pe roata reală (18.11): peretele găurii, rotirea crucii, gaura care nu încape.
o('U19', E, 'if (gaura === "x" && perete < 0.8) {', 'if (gaura === "x" && perete < -1) {', 'rotite',
  'crucea roții de 8 lăsată dreaptă (colțurile sub goluri, 0,04 mm de perete)')
o('U20', E, 'piciorul dinților rămân doar ${String(Math.round(G.perete * 100) / 100).replace(".", Limba.zecimal)} mm: roata iese slabă.',
  'piciorul dinților rămân doar ${String(Math.round((R.rf - (gaura === "r" ? e.gauraD : e.axGauraD) / 2) * 100) / 100).replace(".", Limba.zecimal)} mm: roata iese slabă.',
  'rotite', 'avertismentul socotit din raze (piciorul minus raza găurii), nu din peretele adevărat')
o('U21', E, 'const lipseste = g.length > 0 && perete < 0.1;', 'const lipseste = g.length > 0 && perete < -2;', 'rotite',
  'gaura care nu încape păstrată (corpul nu mai e închis)')

# Atelierul (e2e).
o('E01', A, 'if (d.fel === "oblici" || d.fel === "inv") a.sens = d.sens === "stanga" ? "dreapta" : "stanga";',
  'if (d.fel === "oblici" || d.fel === "inv") a.sens = d.sens;', 'e2e', 'perechea oblică cu același sens (nu se prind)')
o('E02', A, 'a: Def = { ...d, dinti: z2 };', 'a: Def = { ...d };', 'e2e', 'perechea cu dinții primei roți, nu cu cei aleși')
o('E03', A, 'const grila = Math.abs(pasi - Math.round(pasi)) < 1e-9 ?', 'const grila = Math.abs(pasi - Math.round(pasi)) < -1 ?', 'e2e',
  'perechea de pe grilă spusă „la jumătate de pas”')
o('E04', A, 'const fel = d.fel === "oblici" ? tr`, dinți oblici ${fmt(d.unghi ?? 20, 0)}° ${sens}`',
  'const fel = d.fel === "oblici" ? tr`, dinți oblici ${fmt(d.unghi ?? 20, 0)}°`', 'e2e', 'numele roții oblice fără sens')
o('E05', A, 'varianta_cupa: setari.varianta_cupa, varianta_dinti: setari.varianta_dinti,', 'varianta_cupa: setari.varianta_cupa,', 'e2e',
  'varianta roților din calibrare nu ajunge la motor')
o('E06', A, '["varianta_cupa", "Varianta cupei"], ["varianta_dinti", "Varianta roților dințate"], ', '["varianta_cupa", "Varianta cupei"], ',
  'e2e', 'fila Calibrare fără câmpul roților (mutată pe lista cu janta, de la 3.Tj)')
# E07: cu plaja rotiței (8 … 80) înainte; conica dublă (3.Tn) are aceeași coadă, cu plaja 8 … 60
o('E07', A, 'if (v >= 8 && v <= 80) { p.pereche = v; editor(); randeazaPrinde(); } };', 'if (v >= 8 && v <= 80) { p.pereche = v + 2; editor(); randeazaPrinde(); } };', 'e2e', 'dinții perechii citiți greșit')
o('E08', A, '${oblic ? `<div class="at-campuri"><label for="at-r-unghi">', '${true ? `<div class="at-campuri"><label for="at-r-unghi">', 'e2e',
  'unghiul și la dinții drepți')
o('E09', A, 'a = Lego.distantaRoti(p.dinti, p.pereche, p.modul), grila = textGrila(a);', 'a = Lego.distantaRoti(p.dinti, p.dinti, p.modul), grila = textGrila(a);', 'e2e',
  'distanța socotită cu dinții primei roți de două ori')

SETURI = {
    'rotite': ['test/unit/trenulet.rotite.test.ts'],
}
E2E = ['test/e2e/trenulet.rotite.spec.ts']
