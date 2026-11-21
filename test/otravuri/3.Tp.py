# Lista de otrăvuri a feliei 3.Tp (piesele atelierului Easy 3Draw pe file, ADR 0281), 20.11.2026, alese de autor: tabela
# familiilor (fiecare tip al motorului o dată, „dinCvs2” pe fila lui, doar tipuri și forme gata, forma gata lângă tipul ei,
# id-ul familiei, ordinea galeriei), lista tipurilor din motor, marcajul (doar filele proprii), filele (fila tipului, ultima
# piesă ținută minte, clicul pe filă, filele în vederea modelului, numărul pieselor), galeria (familia ei, piesa apăsată,
# ascunsă în model și pe filele proprii, sub file, făcută din nou doar la altă familie, ca focusul să rămână pe butonul ales),
# placa cu găuri, „Înlocuiește în model” anulat la altă piesă, filele după
# încărcarea din baza artefactului, telefonul (filele și galeria pe mai multe rânduri) și traducerea.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.file.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


A = 'extensii/trenulet/sursa/planificator/atelier.ts'
B = 'extensii/trenulet/sursa/planificator/body.html'
H = 'extensii/trenulet/sursa/planificator/head.html'
E = 'extensii/trenulet/sursa/lego/lego.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'

# Tabela familiilor, motorul și marcajul (unitare).
o('U01', A, '["conicaDubla", "Conică dublă"], ["fulie", "Fulie"], ', '["conicaDubla", "Conică dublă"], ', 'familii',
  'fulia lipsește din tabelă: un tip al motorului fără familie, deci fără filă')
o('U02', A, '["legaturi", "Legături", [["stiftTechnic", "Știft"], ', '["legaturi", "Legături", [["grinda", "Grindă"], ["stiftTechnic", "Știft"], ',
  'familii', 'grinda în două familii')
# U03: de la 3.To, rândul Roți se termină cu șenila
o('U03', A, '["roata", "Roată cu anvelopă"], ["senila", "Șenilă"]]]', '["roata", "Roată cu anvelopă"], ["senila", "Șenilă"], ["dinCvs2", "Din cvs2"]]]',
  'familii', 'forma din cvs2 ca piesă a Roților (are fila ei)')
o('U04', A, '["bucsa", "Bucșă / conector"]', '["bucse", "Bucșă / conector"]', 'familii',
  'un tip scris greșit: bucșa lipsește, iar „bucse” nu e al motorului')
o('U05', A, '["caramidaTechnic", "Cărămidă Technic"], ["placaTechnic", "Placă cu găuri"]]],\n    ["legaturi", "Legături", [',
  '["caramidaTechnic", "Cărămidă Technic"]]],\n    ["legaturi", "Legături", [["placaTechnic", "Placă cu găuri"], ', 'familii',
  'placa cu găuri mutată la Legături: alegerea ei ar sări pe fila Cărămizi')
o('U06', A, '["roti", "Roți", [', '["roata", "Roți", [', 'familii', 'id-ul familiei Roți e chiar un tip (clicul pe filă ar fi ambiguu)')
o('U07', E, 'tipuri: Object.freeze(Object.keys(TIPURI)),', 'tipuri: Object.freeze(Object.keys(TIPURI).filter(t => t !== "coroana")),', 'familii',
  'motorul nu-și spune un tip (proba ar judeca tabela după altă listă decât a motorului)')
o('U08', B, '<span class="at-tipuri-sep" aria-hidden="true"></span>',
  '<button type="button" data-fila="legaturi" aria-pressed="false">Legături</button>\n        <span class="at-tipuri-sep" aria-hidden="true"></span>', 'familii',
  'fila veche „Legături” rămasă în marcaj, lângă cea făcută din tabelă')

# Filele și galeria (e2e).
o('E01', A, 'const filaPentru = (t: string): string => FAMILIA.get(t) ?? t;', 'const filaPentru = (t: string): string => t;', 'e2e',
  'fila unui tip e chiar tipul: nicio filă de familie apăsată, nicio galerie')
o('E02', A, 'if (fam) ultima.set(f, stare.tip);', 'if (false) ultima.set(f, stare.tip);', 'e2e', 'filele nu țin minte ultima piesă')
o('E03', A, 'alegeTip(ultima.get(b.dataset.fila!) ?? b.dataset.fila!);', 'alegeTip(b.dataset.fila!);', 'e2e',
  'clicul pe filă alege familia ca tip (editorul calibrării)')
o('E04', A, 'fam = FAMILII.find(([x]) => x === f), g = $("#at-galerie");', 'fam = FAMILII.find(([x]) => x === f) && FAMILII[0], g = $("#at-galerie");',
  'e2e', 'galeria arată mereu piesele Cărămizilor')
# 3.Tp↑a (căutarea): apăsarea din galerie cere și vederea piesei (peste model, rezultatele căutării nu apasă nimic): ținta mutată.
o('E05', A, 'b.setAttribute("aria-pressed", String(vedere === "piesa" && b.dataset.piesa === stare.tip))', 'b.setAttribute("aria-pressed", "false")',
  'e2e', 'nicio piesă apăsată în galerie')
o('E06', A, 'g.hidden = vedere !== "piesa" || !fam;', 'g.hidden = !fam;', 'e2e', 'galeria rămâne în vederea modelului')
o('E07', A, 'g.hidden = vedere !== "piesa" || !fam;', 'g.hidden = vedere !== "piesa";', 'e2e', 'galeria (veche) rămâne pe „Calibrare”')
o('E08', A, 'String(vedere === "piesa" && b.dataset.fila === f)', 'String(b.dataset.fila === f)', 'e2e', 'o filă rămâne apăsată în vederea modelului')
o('E09', A, '<span class="at-nr" aria-hidden="true">${piese.length}</span>', '<span class="at-nr" aria-hidden="true">${piese.length - 1}</span>', 'e2e',
  'numărul pieselor familiei, greșit pe file')
o('E10', A, 'c.cols = Math.max(c.cols, 8); c.rows = Math.max(c.rows, 4);\n      alegeTip("caramida");',
  'c.cols = Math.max(c.cols, 8); c.rows = Math.max(c.rows, 4);\n      alegeTip("placaTechnic");', 'e2e',
  'placa cu găuri aleasă ca tip, nu ca formă a cărămizii (alt editor)')
o('E11', A, 'if (d.exists) { incarca(d.data()); marcheazaFile(); culori();', 'if (d.exists) { incarca(d.data()); culori();', 'e2e',
  'după încărcarea din baza artefactului, filele și galeria rămân pe piesa de dinainte')
o('E12', A, 'if (!b) return; inlocuieste = null; alegePiesa(', 'if (!b) return; alegePiesa(', 'e2e',
  'altă piesă din galerie ar înlocui piesa din model („Înlocuiește în model” rămâne)')
# 3.Tp↑a (căutarea): clicul pe filă golește și căutarea, între cele două: ținta mutată.
o('E13', A, 'if (!b) return; inlocuieste = null; golesteCautarea(); alegeTip(ultima.get(', 'if (!b) return; golesteCautarea(); alegeTip(ultima.get(', 'e2e',
  'altă filă ar înlocui piesa din model („Înlocuiește în model” rămâne)')
o('E14', A, '["panta", "Pantă"], ["pantaInversa", "Pantă inversă"], ', '["pantaInversa", "Pantă inversă"], ["panta", "Pantă"], ', 'e2e',
  'ordinea galeriei Cărămizilor schimbată')
o('E15', H, '.at-tipuri { display: flex; gap: 6px; flex-wrap: wrap; }', '.at-tipuri { display: flex; gap: 6px; flex-wrap: nowrap; }', 'e2e',
  'filele pe un singur rând: pe telefon ies din ecran')
o('E16', H, '.mod-3d .at-galerie { display: flex; gap: 6px; flex-wrap: wrap; margin-top: -4px; }',
  '.mod-3d .at-galerie { display: flex; gap: 6px; flex-wrap: nowrap; margin-top: -4px; }', 'e2e', 'galeria pe un singur rând: pe telefon iese din ecran')
o('E17', H, '.mod-3d .at-galerie { display: flex;', '.mod-3d .at-galerie { order: 1; display: flex;', 'e2e',
  'galeria sub panouri (pe telefon, sub vederea 3D), nu sub file')
o('E18', A, 'if (g.dataset.familie !== f) {', 'if (true) {', 'e2e',
  'galeria făcută din nou la fiecare piesă: cu tastatura, focusul de pe butonul ales se pierde')
o('E19', A, 'if (g.dataset.familie !== f) {', 'if (!g.dataset.familie) {', 'e2e', 'galeria rămâne cu piesele primei familii arătate')

# Traducerea (unitare).
o('T01', T, '"Roți": "Wheels",', '"Roți": "",', 'engleza', 'fila Roți, netradusă')
o('T02', T, '"Cărămizi": "Bricks",', '"Cărămizi": "",', 'engleza', 'fila Cărămizi, netradusă')

SETURI = {
    'familii': ['test/unit/trenulet.familii.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.file.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
