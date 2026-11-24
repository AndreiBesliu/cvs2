# Lista de otrăvuri a feliei 3.Cd (arcul din atelierul Easy 3Draw; ADR 0284), 25.11.2026, alese de autor: motorul (marginile,
# înălțimea, regula bolții și raza ei, puntea și legătura ei cu picioarele, știfturile, avertismentele) și atelierul (familia
# și desenul, numele, cotele scrise, mărimile uzuale, marginile câmpurilor).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: marginile și cotele
MARG = 'const n = Math.round(Math.min(16, Math.max(3, Number.isFinite(lc) ? lc : 4))), c = Math.round(Math.min(4, Math.max(1, Number.isFinite(ic) ? ic : 1)));'
o('A01', LG, MARG, MARG.replace('Number.isFinite(lc) ? lc : 4', 'Number.isFinite(lc) ? lc : 5'), 'arc', 'arcul implicit are 5 știfturi')
o('A02', LG, MARG, MARG.replace('Math.min(16, Math.max(3,', 'Math.min(20, Math.max(3,'), 'arc', 'arcul poate avea 20 de știfturi')
o('A03', LG, MARG, MARG.replace('Math.min(16, Math.max(3,', 'Math.min(16, Math.max(2,'), 'arc', 'arcul poate avea 2 știfturi (fără deschidere)')
o('A04', LG, MARG, MARG.replace('Math.min(4, Math.max(1,', 'Math.min(6, Math.max(1,'), 'arc', 'arcul poate avea 6 cărămizi înălțime')
o('A05', LG, MARG, MARG.replace('Number.isFinite(ic) ? ic : 1', 'Number.isFinite(ic) ? ic : 2'), 'arc', 'arcul implicit e înalt de două cărămizi')
COTE = 'const joasa = d.bolta === "joasa", H = 3 * P.placa * c, xa = P.pas - 0.1, xb = P.pas * (n - 1) + 0.1, w = xb - xa;'
o('A06', LG, COTE, COTE.replace('d.bolta === "joasa"', 'd.bolta !== "inalta"'), 'arc', 'o boltă necunoscută e cea joasă')
o('A07', LG, COTE, COTE.replace('H = 3 * P.placa * c', 'H = P.placa * c'), 'arc', 'înălțimea e în plăci, nu în cărămizi')
o('A08', LG, COTE, COTE.replace('xa = P.pas - 0.1', 'xa = P.pas + 0.4'), 'arc', 'deschiderea e mai îngustă: puntea astupă marginea ei')
o('A09', LG, COTE, COTE.replace('xb = P.pas * (n - 1) + 0.1', 'xb = P.pas * (n - 1) - 0.4'), 'arc', 'deschiderea nu ajunge la piciorul din dreapta')
REG = 'const maxim = Math.min(w / 2, H - 1.6), s = joasa ? maxim / 2 : maxim;'
o('A10', LG, REG, REG.replace('H - 1.6', 'H - 3.2'), 'arc', 'deasupra bolții rămân 3,2 mm, nu 1,6')
o('A11', LG, REG, REG.replace('Math.min(w / 2, H - 1.6)', 'H - 1.6'), 'arc', 'bolta urcă mai mult decât jumătatea deschiderii')
o('A12', LG, REG, REG.replace('Math.min(w / 2, H - 1.6)', 'w / 2'), 'arc', 'bolta trece prin fața de sus la arcele late')
o('A13', LG, REG, REG.replace('joasa ? maxim / 2 : maxim', 'joasa ? maxim / 3 : maxim'), 'arc', 'bolta joasă urcă o treime')
o('A14', LG, 'R: (w * w / 4 + s * s) / (2 * s), lungRea:', 'R: (w * w / 4 + s * s) / s, lungRea:', 'arc', 'raza bolții e dublă')
o('A15', LG, 'lungRea: Number.isFinite(lc) && n !== Math.round(lc),', 'lungRea: Number.isFinite(lc) && n !== lc,', 'arc', 'o lungime cu zecimale, rotunjită, e spusă ca greșeală')
o('A16', LG, 'if (q.lungRea) avert.push(tr`Un arc are', 'if (q.lungRea && q.n > 99) avert.push(tr`Un arc are', 'arc', 'lungimea îndreptată nu se mai spune')
o('A17', LG, 'if (q.inaltRea) avert.push(', 'if (q.inaltRea && q.n > 99) avert.push(', 'arc', 'înălțimea îndreptată nu se mai spune')
# --- motorul: corpul
PIC = 'tri.push(...caramida({ celule: [[0, 0], [q.n - 1, 0]], placi: 3 * q.c }).tri);'
o('A18', LG, PIC, PIC.replace('[q.n - 1, 0]', '[q.n - 2, 0]'), 'arc', 'piciorul din dreapta e cu un știft mai la stânga')
o('A19', LG, PIC, PIC.replace('placi: 3 * q.c }', 'placi: 3 }'), 'arc', 'picioarele au mereu o cărămidă înălțime')
o('A20', LG, PIC, PIC.replace('placi: 3 * q.c }', 'placi: 3 * q.c, stifturi: false }'), 'arc', 'picioarele n-au știfturi')
o('A21', LG, PIC, PIC.replace('placi: 3 * q.c }', 'placi: 3 * q.c, fund: "plin" }'), 'arc', 'picioarele sunt pline dedesubt')
POD = 'zj = 0.01, pod: Poli = [[q.xa - 0.5, zj], [q.xa, zj]];'
o('A22', LG, POD, POD.replace('zj = 0.01', 'zj = 0'), 'arc', 'puntea își împarte o muchie cu peretele piciorului')
o('A23', LG, POD, POD.replace('zj = 0.01', 'zj = 0.6'), 'arc', 'puntea începe la 0,6 mm de masă: bolta e teșită la picioare')
o('A24', LG, 'for (let i = 1; i < 48; i++) { const a = -a0 + 2 * a0 * i / 48; pod.push([xm + q.R * Math.sin(a), zc + q.R * Math.cos(a)]); }',
  'for (let i = 1; i < 48; i++) { const a = -a0 + 2 * a0 * i / 48; pod.push([xm + q.R * Math.sin(a), zc + q.R]); }', 'arc', 'bolta e dreaptă (o grindă), nu un arc')
o('A25', LG, 'for (let i = 1; i < 48; i++) { const a = -a0 + 2 * a0 * i / 48; pod.push([xm + q.R * Math.sin(a), zc + q.R * Math.cos(a)]); }',
  'for (let i = 1; i < 4; i++) { const a = -a0 + 2 * a0 * i / 4; pod.push([xm + q.R * Math.sin(a), zc + q.R * Math.cos(a)]); }', 'arc', 'bolta e din patru laturi drepte')
o('A26', LG, 'pod.push([q.xb, zj], [q.xb + 0.5, zj], [q.xb + 0.5, q.H], [q.xa - 0.5, q.H]);', 'pod.push([q.xb, zj], [q.xb + 0.5, zj], [q.xb + 0.5, q.H], [q.xa + 0.6, q.H]);', 'arc',
  'puntea nu se ține de piciorul din stânga, sus')
o('A27', LG, 'pod.push([q.xb, zj], [q.xb + 0.5, zj], [q.xb + 0.5, q.H], [q.xa - 0.5, q.H]);', 'pod.push([q.xb, zj], [q.xb + 0.5, zj], [q.xb + 0.5, q.H - 1], [q.xa - 0.5, q.H - 1]);', 'arc',
  'puntea e cu 1 mm sub fața de sus')
BARA = 'tri.push(...axe(prismaGauri(pod, [], 0.1, s - 0.1), ([u, v, w]) => [u, w, v], true));\n    // știfturile de pe punte'
o('A28', LG, BARA, BARA.replace('[u, w, v], true)', '[u, w, v], false)'), 'arc', 'puntea are plasa pe dos')
o('A29', LG, BARA, BARA.replace('0.1, s - 0.1)', '0.1, s / 2)'), 'arc', 'puntea e lată doar cât jumătate de știft')
ST = 'tri.push(...stifturi(Array.from({ length: q.n - 2 }, (_, k): P2 => [s * (k + 1) + s / 2, s / 2]), q.H, e.stiftD));'
o('A30', LG, ST, ST.replace('length: q.n - 2', 'length: 0'), 'arc', 'puntea n-are știfturi')
o('A31', LG, ST, ST.replace('[s * (k + 1) + s / 2, s / 2]', '[s * (k + 1), s / 2]'), 'arc', 'știfturile punții stau între pași')
o('A32', LG, ST, ST.replace('q.H, e.stiftD)', 'q.H - 1, e.stiftD)'), 'arc', 'știfturile punții sunt cu 1 mm mai jos')
CT = 'deschidere: q.w, sageata: q.s, raza: q.R, deasupra: q.H - q.s, inaltime: q.H }; },'
o('A33', LG, CT, CT.replace('deasupra: q.H - q.s', 'deasupra: q.H'), 'arc', 'cotele spun altceva decât rămâne deasupra bolții')
o('A34', LG, CT, CT.replace('sageata: q.s', 'sageata: q.R'), 'arc', 'cotele dau raza drept săgeată')
o('A35', LG, 'bolta: q.joasa ? "joasa" : "inalta", deschidere:', 'bolta: q.joasa ? "inalta" : "joasa", deschidere:', 'arc', 'cotele spun bolta pe dos')

# --- tabelele atelierului
o('T01', AT, '["rotund", "Rotund / con"], ["arc", "Arc"],', '["rotund", "Rotund / con"],', 'tabele', 'piesa nu e în nicio familie')
o('T02', AT, '    arc: `<path d="M2.5 19v-11h19v11', '    arcVechi: `<path d="M2.5 19v-11h19v11', 'tabele', 'piesa n-are desenul ei')
o('T03', EN, ' "Bolta:": "Arch shape:",\n', ' "Bolta:": "",\n', 'tabele', 'un text al configuratorului n-are traducere')

# --- atelierul: configuratorul
o('E01', AT, 'arc: { lung: 4, inalt: 1, bolta: "inalta" },', 'arc: { lung: 6, inalt: 1, bolta: "inalta" },', 'e2e', 'piesa implicită din atelier e arcul 1 × 6')
o('E02', AT, '[[3, 1], [4, 1], [6, 1], [6, 2], [8, 2], [12, 3]];', '[[3, 1], [4, 1], [6, 1], [6, 3], [8, 2], [12, 3]];', 'e2e', 'mărimea uzuală 1 × 6 × 2 e de trei cărămizi')
NUME = 'return tr`Arc 1×${q.lung}` + (q.inalt > 1 ? `×${q.inalt}` : "") + (q.bolta === "joasa" ? tr(", boltă joasă") : "");'
o('E03', AT, NUME, NUME.replace('q.inalt > 1', 'q.inalt > 2'), 'e2e', 'numele nu-și spune înălțimea de două cărămizi (același nume și fișier ca arcul de una)')
o('E04', AT, NUME, NUME.replace('(q.bolta === "joasa" ? tr(", boltă joasă") : "")', '""'), 'e2e', 'numele nu-și spune bolta joasă (două piese diferite, același nume)')
o('E05', AT, NUME, NUME.replace('tr`Arc 1×${q.lung}`', 'tr`Arc 1×${q.inalt}`'), 'e2e', 'numele dă înălțimea drept lungime')
TXT = '${tr`Deschiderea: ${fmt(q.deschidere)} mm (${gol} ${gol === 1 ? tr("știft") : tr("știfturi")}). Bolta urcă ${fmt(q.sageata)} mm; deasupra ei rămân ${fmt(q.deasupra)} mm.`}'
o('E06', AT, TXT, TXT.replace('gol === 1 ?', 'gol === 2 ?'), 'e2e', 'cotele spun „1 știfturi” și „2 știft”')
o('E07', AT, TXT, TXT.replace('Bolta urcă ${fmt(q.sageata)} mm', 'Bolta urcă ${fmt(q.raza)} mm'), 'e2e', 'cotele dau raza drept cât urcă bolta')
o('E08', AT, TXT, TXT.replace('rămân ${fmt(q.deasupra)} mm', 'rămân ${fmt(q.sageata)} mm'), 'e2e', 'cotele dau săgeata drept ce rămâne deasupra')
o('E09', AT, TXT, TXT.replace('Deschiderea: ${fmt(q.deschidere)} mm', 'Deschiderea: ${fmt(q.inaltime)} mm'), 'e2e', 'cotele dau înălțimea drept deschidere')
o('E10', AT, 'q = Lego.arcCote(p), gol = q.lung - 2;', 'q = Lego.arcCote(p), gol = q.lung;', 'e2e', 'deschiderea e numărată cu tot cu picioare')
o('E11', AT, 'camp("#at-arc-lung", 3, 16, v => { p.lung = v; });', 'camp("#at-arc-lung", 3, 20, v => { p.lung = v; });', 'e2e', 'lungimea 17 e primită (și tăiată de motor, cu avertisment)')
o('E12', AT, 'camp("#at-arc-lung", 3, 16, v => { p.lung = v; });', 'camp("#at-arc-lung", 0, 16, v => { p.lung = v; });', 'e2e', 'lungimea 2 și câmpul golit sunt primite')
o('E13', AT, 'camp("#at-arc-inalt", 1, 4, v => { p.inalt = v; });', 'camp("#at-arc-inalt", 1, 6, v => { p.inalt = v; });', 'e2e', 'înălțimea 5 e primită')
o('E14', AT, 'camp("#at-arc-inalt", 1, 4, v => { p.inalt = v; });', 'camp("#at-arc-inalt", 0, 4, v => { p.inalt = v; });', 'e2e', 'înălțimea 0 e primită (și ridicată de motor la 1)')
o('E15', AT, 'camp("#at-arc-inalt", 1, 4, v => { p.inalt = v; });', 'camp("#at-arc-inalt", 1, 4, v => { p.lung = v; });', 'e2e', 'înălțimea scrisă schimbă lungimea')
o('E16', AT, 'if (f) { p.lung = f[0]; p.inalt = f[1]; editor(); schimbat(); } };', 'if (f) { p.lung = f[0]; editor(); schimbat(); } };', 'e2e', 'o mărime uzuală nu-și pune înălțimea')
o('E17', AT, 'gata = ARCE.find(([n, c]) => n === q.lung && c === q.inalt);', 'gata = ARCE.find(([n]) => n === q.lung);', 'e2e', '„Repede” arată apăsată altă mărime cu aceeași lungime')
o('E18', AT, '$("#at-arc-bolta").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.bolta = b.dataset.v!; editor(); schimbat(); };',
  '$("#at-arc-bolta").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.bolta = "joasa"; editor(); schimbat(); };', 'e2e', 'bolta rămâne joasă, orice s-ar alege')
o('E19', AT, 'if (q.bolta === "joasa") p.bolta = "joasa"; else delete p.bolta; }', 'p.bolta = "joasa"; }', 'e2e', 'piesa făcută are mereu bolta joasă')
o('E20', AT, 'const eticheta = ([n, c]: readonly [number, number]) => `1×${n}${c > 1 ? "×" + c : ""}`,', 'const eticheta = ([n, c]: readonly [number, number]) => `1×${n}${c > 2 ? "×" + c : ""}`,', 'e2e', 'două mărimi uzuale au aceeași etichetă')

SETURI = {
    'arc': ['test/unit/trenulet.arc.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.arc.spec.ts']
