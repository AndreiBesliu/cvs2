# Lista de otrăvuri a feliei 3.Tu (piesele rotunde pe același ax în vederea „Modelul” a atelierului Easy 3Draw; ADR 0283),
# 25.11.2026, alese de autor: motorul (axul spus de piesă, care piese sunt rotunde, amprenta și pivotul, locul pivotului,
# locul de lângă o țintă, rotorul și carcasa lui) și atelierul (așezarea din scenă, rândul piesei, rotirea în jurul axului,
# „Pune în model” lângă piesa aleasă, „Înlocuiește în model”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: axul spus de piesă și piesele rotunde
AX = 'const ax: [number, number] | null = eRotunda(def) ? [-a[0], -a[1]] : null;'
o('M01', LG, AX, AX.replace('[-a[0], -a[1]]', '[b[0] / 2, b[1] / 2]'), 'model', 'axul spus e mijlocul cutiei, nu originea piesei')
o('M02', LG, AX, AX.replace('[-a[0], -a[1]]', '[-a[1], -a[0]]'), 'model', 'axul spus are x și y schimbate între ele')
o('M03', LG, AX, AX.replace('eRotunda(def) ?', 'false ?'), 'model', 'nicio piesă nu-și mai spune axul')
o('M04', LG, AX, AX.replace('[-a[0], -a[1]]', '[-a[0], -a[1] + 0.5]'), 'model', 'axul spus e cu 0,5 mm alături, pe y')
RO = 'new Set(["rotita", "cama", "melc", "roata", "fulie", "conica", "coroana", "conicaDubla", "elice", "eliceBarca", "ventilator", "roataPalete"]);'
for k, t in enumerate(['rotita', 'cama', 'melc', 'roata', 'fulie', 'conica', 'coroana', 'conicaDubla', 'elice', 'eliceBarca', 'ventilator', 'roataPalete']):
    scos = RO.replace('"%s", ' % t, '') if t != 'roataPalete' else RO.replace(', "roataPalete"', '')
    o('M%02d' % (5 + k), LG, RO, scos, 'model', 'tipul %s nu mai e rotund' % t)
o('M17', LG, RO, RO.replace('"rotita", ', '"rotita", "rotund", '), 'model', 'cărămida rotundă (cu știfturi) e socotită piesă cu ax')
o('M18', LG, RO, RO.replace('"rotita", ', '"rotita", "bucsa", '), 'model', 'bucșa e socotită piesă cu ax')
ER = 'return def.tip === "senila" ? def.piesa === "pinion" : ROTUNDE.has(def.tip);'
o('M19', LG, ER, ER.replace('def.piesa === "pinion"', 'true'), 'model', 'și zala șenilei e socotită rotundă')
o('M20', LG, ER, ER.replace('def.piesa === "pinion"', 'false'), 'model', 'pinionul șenilei nu mai e rotund')
o('M21', LG, ER, ER.replace('def.piesa === "pinion"', 'def.piesa !== "zala"'), 'model', 'șenila fără piesa scrisă (zala, implicit) e socotită rotundă')

# --- motorul: amprenta și pivotul
ST = 'const st = (v: number) => Math.max(1, Math.round((v + 0.2) / P.pas)),'
o('M22', LG, ST, ST.replace('Math.round(', 'Math.floor('), 'model', 'amprenta se taie, nu se rotunjește')
o('M23', LG, ST, ST.replace('Math.round(', 'Math.ceil('), 'model', 'amprenta se rotunjește în sus')
o('M24', LG, ST, ST.replace('Math.max(1,', 'Math.max(2,'), 'model', 'amprenta are cel puțin 2 știfturi')
o('M25', LG, ST, ST.replace('/ P.pas))', '/ 10))'), 'model', 'amprenta socotită cu pasul de 10 mm')
PL = 'const placa = ({ lateral: [d.lung, 1], suport: [d.lung, d.adanc], clema: [d.lung, 1], maner: [d.lung, 1], bila: [d.baza, d.baza], cupa: [1, 1] }'
o('M26', LG, PL, PL.replace('suport: [d.lung, d.adanc]', 'suport: [d.lung, 1]'), 'model', 'suportul are mereu placa de un știft adâncime')
o('M27', LG, PL, PL.replace('cupa: [1, 1]', 'cupa: [d.baza, d.baza]'), 'model', 'cupa pe 2 × 2 se așază după placa ei, nu după primul știft (altfel decât până acum)')
o('M28', LG, PL, PL.replace('lateral: [d.lung, 1], ', ''), 'model', 'știfturile pe lateral se așază după cutie, nu după placă')
o('M29', LG, PL, PL.replace('clema: [d.lung, 1], ', ''), 'model', 'clema se așază după cutie, nu după placă')
o('M30', LG, PL, PL.replace('maner: [d.lung, 1], ', ''), 'model', 'mânerul se așază după cutie, nu după placă')
o('M31', LG, PL, PL.replace('bila: [d.baza, d.baza]', 'bila: [1, 1]'), 'model', 'bila pe 2 × 2 se așază după primul știft')
PP = 'const [gw, gd] = placa.map(v => Math.max(1, Math.round(+(v as number) || 1))) as [number, number];'
o('M32', LG, PP, PP.replace('|| 1)', '|| 2)'), 'model', 'o placă fără lungime scrisă e socotită de 2 știfturi')
PV = 'return { gw, gd, pivot: [gw * P.pas / 2 - corp.baza[0]!, gd * P.pas / 2 - corp.baza[1]!], ax: false };'
o('M33', LG, PV, PV.replace('gd * P.pas / 2 - corp.baza[1]!', 'gd * P.pas / 2 + corp.baza[1]!'), 'model', 'pivotul plăcii, cu semnul bazei întors pe y')
o('M34', LG, PV, PV.replace('gw * P.pas / 2 - corp.baza[0]!', 'gw * P.pas / 2'), 'model', 'pivotul plăcii uită baza pe x')
o('M35', LG, PV, PV.replace('gd * P.pas / 2 - corp.baza[1]!', 'gw * P.pas / 2 - corp.baza[1]!'), 'model', 'pivotul plăcii socotit pe y cu lățimea')
IM = 'if (corp.ax) return { gw: gw + 1 - gw % 2, gd: gd + 1 - gd % 2, pivot: [corp.ax[0]!, corp.ax[1]!], ax: true };'
o('M36', LG, IM, IM.replace('gw: gw + 1 - gw % 2', 'gw'), 'model', 'amprenta rotundelor nu mai e făcută impară pe x')
o('M37', LG, IM, IM.replace('gd: gd + 1 - gd % 2', 'gd'), 'model', 'amprenta rotundelor nu mai e făcută impară pe y')
o('M38', LG, IM, IM.replace('gw: gw + 1 - gw % 2', 'gw: gw - 1 + gw % 2'), 'model', 'amprenta pară pierde un știft în loc să primească unul')
o('M39', LG, IM, IM.replace('gw: gw + 1 - gw % 2', 'gw: gw + 2'), 'model', 'amprenta rotundelor crește mereu cu 2 pe x')
o('M40', LG, IM, IM.replace('pivot: [corp.ax[0]!, corp.ax[1]!]', 'pivot: [corp.dim[0]! / 2, corp.dim[1]! / 2]'), 'model', 'pivotul rotundelor e mijlocul cutiei, nu axul')
o('M41', LG, IM, IM.replace('ax: true }', 'ax: false }'), 'model', 'așezarea unei piese rotunde nu spune că are ax')
o('M42', LG, IM, IM.replace('if (corp.ax)', 'if (false)'), 'model', 'piesele rotunde se așază ca celelalte')
DR = 'return { gw, gd, pivot: [corp.dim[0]! / 2, corp.dim[1]! / 2], ax: false };'
o('M43', LG, DR, DR.replace('[corp.dim[0]! / 2, corp.dim[1]! / 2]', '[corp.dim[1]! / 2, corp.dim[0]! / 2]'), 'model', 'pivotul unei piese obișnuite, cu x și y schimbate')
o('M44', LG, DR, DR.replace('ax: false }', 'ax: true }'), 'model', 'orice piesă e socotită cu ax')

# --- motorul: locul pivotului și locul de lângă o țintă
PM = 'const [w, d] = rot % 2 ? [a.gd, a.gw] : [a.gw, a.gd];\n    return [(x + w / 2) * P.pas, (y + d / 2) * P.pas];'
o('M45', LG, PM, PM.replace('rot % 2 ?', 'false ?'), 'model', 'locul pivotului nu ține seama de rotire')
o('M46', LG, PM, PM.replace('(x + w / 2) * P.pas', 'x * P.pas'), 'model', 'pivotul stă în colțul amprentei, pe x')
o('M47', LG, PM, PM.replace('(y + d / 2) * P.pas', '(y + w / 2) * P.pas'), 'model', 'pivotul socotit pe y cu lățimea')
o('M48', LG, PM, PM.replace('rot % 2 ?', 'rot % 4 ?'), 'model', 'amprenta se întoarce și la o jumătate de tură')
LP = 'const [w, d] = rot % 2 ? [a.gd, a.gw] : [a.gw, a.gd], aproape = (v: number) => Math.ceil(v - 0.5 - 1e-6) + 0;'
o('M49', LG, LP, LP.replace('rot % 2 ?', 'false ?'), 'model', 'locul de lângă țintă nu ține seama de rotire')
o('M50', LG, LP, LP.replace('Math.ceil(v - 0.5 - 1e-6)', 'Math.round(v)'), 'model', 'la egalitate, locul cu numărul mai mare')
o('M51', LG, LP, LP.replace('Math.ceil(v - 0.5 - 1e-6)', 'Math.floor(v)'), 'model', 'locul se taie în jos (zgomotul de virgulă îl mută cu un știft)')
o('M52', LG, LP, LP.replace(' - 1e-6)', ')'), 'model', 'la egalitate, zgomotul de virgulă mobilă alege locul')
o('M53', LG, LP, LP.replace(' + 0;', ';'), 'model', 'locul poate fi −0')
LR = 'return [aproape(tinta[0]! / P.pas - w / 2), aproape(tinta[1]! / P.pas - d / 2)];'
o('M54', LG, LR, LR.replace('tinta[1]! / P.pas - d / 2', 'tinta[1]! / P.pas - w / 2'), 'model', 'locul pe y socotit cu lățimea')
o('M55', LG, LR, LR.replace('tinta[0]! / P.pas - w / 2', 'tinta[0]! / P.pas'), 'model', 'colțul piesei noi e pus pe țintă, nu pivotul')
o('M56', LG, LR, LR.replace('aproape(tinta[1]!', 'aproape(tinta[0]!'), 'model', 'locul pe y socotit din x-ul țintei')

# --- motorul: rotorul și carcasa în care încape
V1 = 'if (a.tip !== "ventilator" || b.tip !== "ventilator") return false;'
o('M57', LG, V1, V1.replace('||', '&&'), 'model', 'o roată dințată și o carcasă sunt socotite pereche')
V2 = 'const [rotor, carcasa] = a.piesa === "carcasa" ? [b, a] : [a, b];'
o('M58', LG, V2, V2.replace('a.piesa === "carcasa" ? [b, a] : [a, b]', '[a, b]'), 'model', 'carcasa pusă cu rotorul ales nu mai e pereche (doar invers)')
V3 = 'if (rotor.piesa === "carcasa" || carcasa.piesa !== "carcasa") return false;'
o('M59', LG, V3, V3.replace('rotor.piesa === "carcasa" || ', ''), 'model', 'două carcase sunt socotite pereche')
o('M60', LG, V3, V3.replace(' || carcasa.piesa !== "carcasa"', ''), 'model', 'două rotoare sunt socotite pereche')
V4 = 'return ventilatorCote(rotor).Rt < ventilatorCote(carcasa).D / 2;'
o('M61', LG, V4, V4.replace('.D / 2', '.D'), 'model', 'rotorul e comparat cu diametrul carcasei, nu cu raza')
o('M62', LG, V4, V4.replace('.Rt <', '.Rt >'), 'model', 'doar rotorul care nu încape e socotit pereche')
o('M63', LG, V4, 'return true;', 'model', 'orice rotor e perechea oricărei carcase')
o('M64', LG, 'asezareModel, pivotModel, langaPivot, impreunaInModel,', 'asezareModel, pivotModel, langaPivot,', 'model', 'motorul nu mai dă atelierului perechea rotor-carcasă')

# --- atelierul: corpul din model și scena
CM = 'const a = Lego.asezareModel(def as DefMotor, { dim: p.dim, baza: p.baza || [0, 0, 0], ax: p.ax || null });'
o('A01', AT, CM, CM.replace('ax: p.ax || null', 'ax: null'), 'e2e', 'atelierul nu-i dă așezării axul piesei (rotundele stau după cutie)')
o('A02', AT, CM, CM.replace('baza: p.baza || [0, 0, 0]', 'baza: [0, 0, 0]'), 'e2e', 'atelierul nu-i dă așezării baza piesei (piesele cu placă stau strâmb)')
o('A03', AT, 'baza: r.baza, ax: r.ax, avert: r.avert,', 'baza: r.baza, avert: r.avert,', 'e2e', 'piesa gata nu mai poartă axul spus de motor')
CC = 'c = { tri: p.tri, dim: p.dim, gw: a.gw, gd: a.gd, pivot: a.pivot, ax: a.ax, prinderi: p.prinderi ?? [], geom: null };'
o('A04', AT, CC, CC.replace('ax: a.ax,', 'ax: false,'), 'e2e', 'corpul din model uită că piesa e rotundă (rândul, rotirea, înlocuirea)')
o('A05', AT, CC, CC.replace('gw: a.gw, gd: a.gd,', 'gw: a.gd, gd: a.gw,'), 'e2e', 'amprenta corpului, cu lățimea și adâncimea schimbate')
# (din 3.Cf-1, scena pune plasa cu transformarea dată de motor, `Lego.transfGrila`, chemată din `asezari`: otrăvurile
# A06–A13 s-au mutat pe apelul acela; rotirea și pivotul dinăuntrul transformării le judecă lista 3.Cf-1, pe motor)
TG = 'grila: Lego.transfGrila(c, m.x, m.y, m.z, m.rot),'
o('A06', AT, TG, TG.replace('transfGrila(c,', 'transfGrila({ ...c, pivot: [c.dim[0]! / 2, c.dim[1]! / 2] },'), 'e2e', 'plasa e pusă cu mijlocul cutiei în pivot (ca până acum), nu cu axul')
o('A07', AT, TG, TG.replace('transfGrila(c,', 'transfGrila({ ...c, pivot: [c.pivot[0], c.pivot[0]] },'), 'e2e', 'plasa e mutată pe y cu x-ul pivotului')
o('A08', AT, TG, TG.replace('transfGrila(c,', 'transfGrila({ ...c, pivot: [0, 0] },'), 'e2e', 'plasa nu e mutată în pivot')
o('A09', AT, TG, TG.replace('m.z, m.rot)', 'm.z, m.rot + 2)'), 'e2e', 'piesa stă în scenă întoarsă cu o jumătate de tură')
o('A10', AT, TG, TG.replace('m.z, m.rot)', 'm.z, 0)'), 'e2e', 'piesa rotită nu se rotește în scenă')
o('A11', AT, TG, TG.replace('m.x, m.y, m.z', 'm.y, m.x, m.z'), 'e2e', 'piesa e pusă în scenă cu x și y schimbate')
o('A12', AT, TG, TG.replace('m.x, m.y, m.z', 'm.x + 1, m.y, m.z'), 'e2e', 'piesele stau în scenă cu un știft mai la dreapta decât spune rândul lor')
o('A13', AT, TG, TG.replace('m.x, m.y, m.z', 'm.x, m.y, m.z * 2'), 'e2e', 'înălțimea din scenă e dublă')

# --- atelierul: știftul axului și rândul piesei
SA = 'if (!c || !c.ax) return null;\n    const [px, py] = Lego.pivotModel(c, m.x, m.y, m.rot);\n    return [Math.round(px / 8 - 0.5), Math.round(py / 8 - 0.5)];'
o('A14', AT, SA, SA.replace('Math.round(px / 8 - 0.5)', 'Math.round(px / 8)'), 'e2e', 'știftul axului, numărat cu unul mai mult pe x')
o('A15', AT, SA, SA.replace('Math.round(py / 8 - 0.5)', 'Math.round(px / 8 - 0.5)'), 'e2e', 'știftul axului pe y e cel de pe x')
o('A16', AT, SA, SA.replace('!c.ax', 'c.ax'), 'e2e', 'știftul axului e spus la piesele care nu sunt rotunde')
o('A17', AT, SA, SA.replace('Lego.pivotModel(c, m.x, m.y, m.rot)', 'Lego.pivotModel(c, m.x, m.y, 0)'), 'e2e', 'știftul axului nu ține seama de rotire')
o('A18', AT, SA, SA.replace('Math.round(py / 8 - 0.5)', 'Math.round(py / 8 + 0.5)'), 'e2e', 'știftul axului, numărat cu unul mai mult pe y')
LM = 'a ? tr`ax ${a[0]}, ${a[1]}, ${x.z}` : `${x.x}, ${x.y}, ${x.z}`; };'
o('A19', AT, LM, LM.replace('tr`ax ${a[0]}, ${a[1]}, ${x.z}`', 'tr`ax ${a[1]}, ${a[0]}, ${x.z}`'), 'e2e', 'rândul unei piese rotunde, cu x și y schimbate')
o('A20', AT, LM, LM.replace('tr`ax ${a[0]}, ${a[1]}, ${x.z}`', 'tr`ax ${a[0]}, ${a[1]}, ${x.y}`'), 'e2e', 'rândul unei piese rotunde scrie y în locul lui z')
o('A21', AT, LM, LM.replace('a ? tr`ax ${a[0]}, ${a[1]}, ${x.z}` : ', ''), 'e2e', 'rândul unei piese rotunde spune colțul amprentei, nu axul')
o('A22', AT, LM, LM.replace(': `${x.x}, ${x.y}, ${x.z}`', ': `${x.y}, ${x.x}, ${x.z}`'), 'e2e', 'rândul unei piese obișnuite, cu x și y schimbate')
o('A23', AT, 'axM = m && felM === "grila" ? stiftAx(m) : null;', 'axM = null;', 'e2e', 'rândul piesei alese spune colțul și la piesele rotunde')
AL = '${axM ? tr`axul pe știftul ${axM[0]}, ${axM[1]}` : `x ${m.x}, y ${m.y}`}, z ${m.z}'
o('A24', AT, AL, AL.replace('tr`axul pe știftul ${axM[0]}, ${axM[1]}`', 'tr`axul pe știftul ${m.x}, ${m.y}`'), 'e2e', 'rândul piesei alese scrie colțul amprentei drept știftul axului')
o('A25', AT, AL, AL.replace('tr`axul pe știftul ${axM[0]}, ${axM[1]}`', 'tr`axul pe știftul ${axM[1]}, ${axM[0]}`'), 'e2e', 'știftul axului piesei alese, cu x și y schimbate')
o('A26', AT, AL, AL.replace('`x ${m.x}, y ${m.y}`', '`x ${m.y}, y ${m.x}`'), 'e2e', 'colțul piesei alese, cu x și y schimbate')

# --- atelierul: rotirea în jurul axului
RT = 'const ax = c && c.ax ? Lego.pivotModel(c, m.x, m.y, m.rot) : null;\n      m.rot = (m.rot + 1) % 4;\n      if (c && ax) [m.x, m.y] = Lego.langaPivot(c, m.rot, ax);'
o('A27', AT, RT, RT.replace('if (c && ax) [m.x, m.y] = Lego.langaPivot(c, m.rot, ax);', ''), 'e2e', 'la rotire, axul unei piese rotunde nu mai rămâne pe loc')
o('A28', AT, RT, RT.replace('ax = c && c.ax ?', 'ax = c ?'), 'e2e', 'și o piesă obișnuită își mută colțul la rotire')
o('A29', AT, RT, RT.replace('m.rot = (m.rot + 1) % 4;', 'm.rot = (m.rot + 1) % 2;'), 'e2e', 'a doua rotire aduce piesa înapoi (fără jumătatea de tură)')
o('A30', AT, RT, RT.replace('Lego.langaPivot(c, m.rot, ax)', 'Lego.langaPivot(c, m.rot + 1, ax)'), 'e2e', 'colțul de după rotire, socotit pentru rotirea următoare')
o('A31', AT, RT, RT.replace('m.rot = (m.rot + 1) % 4;', 'm.rot = (m.rot + 3) % 4;'), 'e2e', 'piesa se rotește în sens invers')

# --- atelierul: „Pune în model” lângă piesa aleasă și „Înlocuiește în model”
IN = 'if (fel === "grila" && a && b && a.ax && b.ax) [vechi.x, vechi.y] = Lego.langaPivot(b, vechi.rot, Lego.pivotModel(a, vechi.x, vechi.y, vechi.rot));'
o('A32', AT, IN, '', 'e2e', 'o roată înlocuită cu alta își ține colțul, nu axul')
o('A33', AT, IN, IN.replace('a && b && a.ax && b.ax', 'a && b'), 'e2e', 'și o cărămidă înlocuită își mută colțul după mijloc')
o('A34', AT, IN, IN.replace('Lego.langaPivot(b, vechi.rot,', 'Lego.langaPivot(a, vechi.rot,'), 'e2e', 'colțul de după înlocuire, socotit cu amprenta piesei vechi')
PU = '[m.x, m.y] = a && b ? Lego.langaPivot(b, m.rot, Lego.pivotModel(a, sel.x, sel.y, sel.rot)) : [sel.x, sel.y];'
o('A35', AT, PU, '[m.x, m.y] = [sel.x, sel.y];', 'e2e', 'piesa nouă intră din colțul celei alese (ca până acum)')
o('A36', AT, PU, PU.replace('Lego.langaPivot(b, m.rot,', 'Lego.langaPivot(a, m.rot,'), 'e2e', 'locul piesei noi, socotit cu amprenta celei alese')
o('A37', AT, PU, PU.replace('Lego.pivotModel(a, sel.x, sel.y, sel.rot)', 'Lego.pivotModel(b, sel.x, sel.y, sel.rot)'), 'e2e', 'ținta e pivotul piesei noi pus în colțul celei alese')
o('A38', AT, PU, PU.replace('Lego.pivotModel(a, sel.x, sel.y, sel.rot)', 'Lego.pivotModel(a, sel.x, sel.y, 0)'), 'e2e', 'ținta nu ține seama de rotirea piesei alese')
ZZ = 'm.z = Lego.impreunaInModel(sel.def as DefMotor, curent.def as DefMotor) ? sel.z : sel.z + inaltimeM(sel);'
o('A39', AT, ZZ, 'm.z = sel.z + inaltimeM(sel);', 'e2e', 'rotorul intră deasupra carcasei lui, ca orice piesă')
o('A40', AT, ZZ, 'm.z = sel.z;', 'e2e', 'orice piesă nouă intră la Z-ul celei alese, nu deasupra')
o('A41', AT, ZZ, ZZ.replace('? sel.z : sel.z + inaltimeM(sel)', '? sel.z + inaltimeM(sel) : sel.z'), 'e2e', 'doar rotorul intră deasupra; restul, la același Z')
o('A42', AT, 'm.rot = sel.rot;\n          [m.x, m.y] = a && b', 'm.rot = 0;\n          [m.x, m.y] = a && b', 'e2e', 'piesa nouă nu ia rotirea celei alese')
NW = 'm: InModel = { id: idNou(), def: curent.def, x: 0, y: 0, z: 0, rot: 0, culoare: setari.culoare };'
o('A43', AT, NW, NW.replace('x: 0, y: 0, z: 0,', 'x: 1, y: 0, z: 0,'), 'e2e', 'prima piesă a modelului intră la x 1')

# --- textele
TX = 'O piesă nouă intră deasupra celei alese, la mijlocul ei. Piesele rotunde (roțile, elicele) stau cu axul în mijlocul unui știft:'
o('T01', AT, TX, TX.replace('la mijlocul ei', 'la mijloc'), 'texte', 'textul vederii, schimbat fără traducerea lui')
o('T02', AT, 'a ? tr`ax ${a[0]}, ${a[1]}, ${x.z}`', 'a ? tr`axa ${a[0]}, ${a[1]}, ${x.z}`', 'texte', 'rândul piesei rotunde, cu alt text decât cel tradus')
o('T03', EN, ' "ax {0}, {1}, {2}": "axis {0}, {1}, {2}",', ' "ax {0}, {1}, {2}": "",', 'texte', 'rândul piesei rotunde, fără traducere')
o('T04', EN, ' "axul pe știftul {0}, {1}": "axis on stud {0}, {1}",', ' "axul pe știftul {0}, {1}": "axis on stud {0}",', 'texte', 'traducerea pierde o valoare')

SETURI = {
    'model': ['test/unit/trenulet.model.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.model.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
