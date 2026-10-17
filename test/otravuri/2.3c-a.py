# Lista de otrăvuri a feliei 2.3c, segmentul 2a (sesiune independentă, 15.10.2026): offsetul deschis, tăietura pe o
# parte și CAM-ul căilor deschise. 70 rulate: 50 prinse, 20 scăpate, toate închise (18 teste în
# `test/unit/otravuri.23c.test.ts`, 2 echivalente: O02, J05; DEVLOG). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md);
# codul s-a mișcat de atunci, deci unele pot ieși VOID la `verifica`.
# Otravurile 2.3c (offsetul deschis, tăietura pe o parte, CAM-ul căilor deschise). Fiecare: id, fișier, vechi, nou, set, ce strică.
# `vechi` trebuie să apară EXACT o dată în fișier (\n se potrivește și pe CRLF); altfel VOID.

OFF = 'src/geom/offset.ts'
PAR = 'src/model/parte.ts'
PRO = 'src/cam/profil.ts'
REG = 'src/cam/regiune.ts'
JOB = 'src/cam/job.ts'
DES = 'src/cam/deschise.ts'
LUM = 'src/model/lume.ts'
TRS = 'src/cam/traseu.ts'
CON = 'src/geom/contur.ts'

O = []
def o(id, fis, vechi, nou, set_, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set_, ce=ce))

# ── offset.ts ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('O01', OFF, ".parallelOffset(d);", ".parallelOffset(-d);", 'geom', 'semnul lui d inversat la cavalier (stanga <-> dreapta)')
o('O02', OFF, "(i === n - 1 || (v.s.tip === 'A' && Math.abs(v.s.bulge) < BULGE_MINIM) ? { p: v.p, s: LINIE } : v)",
  "((v.s.tip === 'A' && Math.abs(v.s.bulge) < BULGE_MINIM) ? { p: v.p, s: LINIE } : v)", 'geom', 'segmentul ultimului varf nu mai e fortat L')
o('O03', OFF, "EPS_POZITIE_CAVALIER, false), false);", "EPS_ATINGERE, false), false);", 'geom', 'unirea segmentelor scurte la 1e-6 in loc de toleranta lui cavalier (1e-5)')
o('O04', OFF, "} else if (!inchis && urm === v.length - 1) {", "} else if (false) {", 'geom', 'capatul de final se muta (segmentul scurt de la capat pierde capatul)')
o('O05', OFF, "EPS_POZITIE_CAVALIER, false), false);", "EPS_POZITIE_CAVALIER, false), true);", 'geom', 'varfurile pe latura scoase si din capete (ca la inchis)')
o('O07', OFF, "if (iesireDeschisa && x.kind === 'basic' && capatInStart(", "if (x.kind === 'basic' && capatInStart(", 'geom', 'capat-in-start iertat si la INTRARE (calea cu capetele in acelasi punct)')
o('O08', OFF, "Math.max(i, j) !== n - 2) return false;", "Math.max(i, j) !== n - 1) return false;", 'geom', 'bucla capat-in-start nu mai e iertata (camera cu gura sub D)')
o('O09', OFF, "if (x.kind === 'basic' && articulatii.some(", "if (false && articulatii.some(", 'geom', 'articulatia dus-intorsului nu mai e iertata')
o('O10', OFF, "&& iesire.laDistanta({ x: (x.point1.x + x.point2.x) / 2, y: (x.point1.y + x.point2.y) / 2 })) return true;",
  ") return true;", 'geom', 'dus-intorsul primit la orice latime (banda 2R +/- 1e-4 scoasa)')
o('O11', OFF, "const BANDA_DUS_INTORS = 5e-5;", "const BANDA_DUS_INTORS = 5e-4;", 'geom', 'banda dus-intorsului de 10 ori mai lata')
# SCOASA: o('O12', OFF, "(b2.p.y - b.p.y) < 0;", "(b2.p.y - b.p.y) > 0;", 'geom', 'suprapunerea iertata e cea in ACELASI sens, nu dus-intors')
o('O15', OFF, "if (Math.abs(distantaIndexata(p, cale, ad + TOLERANTA_DISTANTA) - ad) > TOLERANTA_DISTANTA) {",
  "if (Math.abs(distantaIndexata(p, cale, ad + 0.05) - ad) > 0.05) {", 'geom', 'distanta bucatilor la |d| +/- 0,05 in loc de 0,002')
o('O16', OFF, ".some((pc) => corectFataDe(p, pc, segmente, d));", ".every((pc) => corectFataDe(p, pc, segmente, d));", 'geom', 'picioarele la egalitate: toate trebuie corecte, nu unul')
o('O18', OFF, "return scalar(w, t0) >= -TOLERANTA_DISTANTA && semn * cruce(t0, w) >= -TOLERANTA_DISTANTA;",
  "return semn * cruce(t0, w) >= -TOLERANTA_DISTANTA;", 'geom', 'capacul startului nu mai e verificat (ocolirea capatului)')
o('O19', OFF, "return scalar(w, tn) <= TOLERANTA_DISTANTA && semn * cruce(tn, w) >= -TOLERANTA_DISTANTA;",
  "return semn * cruce(tn, w) >= -TOLERANTA_DISTANTA;", 'geom', 'capacul capatului final nu mai e verificat')
# SCOASA: o('O22', OFF, "const COTITURA_DREAPTA = 1e-6;", "const COTITURA_DREAPTA = 0;", 'geom', 'franturile de zgomot judecate ca evantai')
o('O25', OFF, "if (!lipsa && !acoperit(q)) lipsa = p;", "if (false) lipsa = p;", 'geom', 'acoperirea scoasa')
o('O26', OFF, "distantaIndexata(q, iesire, TOLERANTA_DISTANTA * 2) <= TOLERANTA_DISTANTA;", "distantaIndexata(q, iesire, 1) <= 0.5;", 'geom', 'acoperirea la 0,5 mm in loc de 0,002')
o('O27', OFF, ">= ad - MARJA_VALID;", ">= ad + MARJA_VALID;", 'geom', 'validitatea punctului ideal cu marja de semn opus')
o('O28', OFF, "const MARJA_VALID = 1e-5;", "const MARJA_VALID = 1e-3;", 'geom', 'marja de validitate 1e-3 in loc de 1e-5')
o('O29', OFF, "return { problema: ac.primulValid ? langa(ac.primulValid) : NU_INCAPE };", "return { problema: NU_INCAPE };", 'geom', 'iesirea goala crezuta mereu „nu incape”')
o('O30', OFF, "if (prima.ok || prima.motiv === NU_INCAPE) return prima;", "if (prima.ok) return prima;", 'geom', '„nu incape” reincercat (motivul se schimba)')
o('O31', OFF, "incearcaDeschis(intrare.contur, distanta + Math.sign(distanta) * PAS_REINCERCARE)",
  "incearcaDeschis(intrare.contur, distanta - Math.sign(distanta) * PAS_REINCERCARE)", 'geom', 'reincercarea la |d| - 1e-4 (in perete)')
o('O32', OFF, "incearcaDeschis(intrare.contur, distanta + Math.sign(distanta) * PAS_REINCERCARE)",
  "incearcaDeschis(intrare.contur, distanta)", 'geom', 'fara reincercare la |d| + 1e-4')
o('O33', OFF, ".sort((a, b) => a.s - b.s).map((x) => x.c);", ".sort((a, b) => b.s - a.s).map((x) => x.c);", 'geom', 'bucatile in ordinea inversa caii')
o('O34', OFF, "const PLAFON_ESANTIOANE = 4_000_000;", "const PLAFON_ESANTIOANE = 4_000_000_000;", 'geom', 'plafonul esantioanelor ridicat de 1000 de ori')
o('O35', OFF, "return Math.max(g.lungime, Math.abs(raza - d * Math.sign(baleiaj)) * Math.abs(baleiaj));", "return g.lungime;", 'geom', 'pasul acoperirii pe cale, nu pe ideal')
o('O36', OFF, "Math.abs(raza - d * Math.sign(baleiaj)) * Math.abs(baleiaj));", "Math.abs(raza + d * Math.sign(baleiaj)) * Math.abs(baleiaj));", 'geom', 'lungimea ideala cu semnul lui d inversat')
o('O37', OFF, "if (cotitura * d >= 0) continue;", "if (true) continue;", 'geom', 'evantaiele colturilor convexe scoase din acoperire')
o('O38', OFF, "if (!v && deschisa === null) deschisa = g.s0;",
  "if (!v) { if (deschisa !== null) neatins.push({ de: deschisa, pana: g.s0 }); deschisa = g.s0; }", 'geom', 'portiunile neatinse nu se mai unesc peste varf')
o('O39', OFF, "const INJUMATATIRI = 40;", "const INJUMATATIRI = 0;", 'geom', 'marginile lui neatins fara injumatatire (la mijlocul pasului)')
o('O41', OFF, "if (!picioare.some((pc) => scalar(tau, tangentaCaii(pc, segmente)) > 0)) {", "if (false) {", 'geom', 'verificarea sensului bucatilor scoasa')
# SCOASA: o('O42', OFF, "if (!picioare.some((pc) => scalar(tau, tangentaCaii(pc, segmente)) > 0)) {",
# SCOASA:   "if (!picioare.every((pc) => scalar(tau, tangentaCaii(pc, segmente)) > 0)) {", 'geom', 'sensul judecat fata de toate picioarele')
o('O43', OFF, "puncteTraseu.push(mijloc(g.a, g.b, g.s));", "void mijloc(g.a, g.b, g.s);", 'geom', 'mijloacele segmentelor nu se mai verifica (doar varfurile)')
o('O48', OFF, "if (seAtingeSingur(a, { laDistanta })) return 'offsetul a dat o bucată care se atinge singură';",
  "if (false) return 'offsetul a dat o bucată care se atinge singură';", 'geom', 'autoatingerea bucatii nu mai e verificata')

# ── parte.ts ─────────────────────────────────────────────────────────────────────────────────────────────────────────
o('P01', PAR, "return (latura === 'stanga') !== oglindit ? 'stanga' : 'dreapta';", "return latura === 'stanga' ? 'stanga' : 'dreapta';", 'cam', 'XOR-ul determinantului scos')
o('P02', PAR, "m.a * m.d - m.b * m.c < 0", "m.a * m.d + m.b * m.c < 0", 'cam', 'determinantul cu semn gresit (rotirea de 90 de grade luata drept oglindire)')

# ── profil.ts ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('F01', PRO, "offsetDeschis(contur, parte === 'stanga' ? raza : -raza)", "offsetDeschis(contur, parte === 'stanga' ? -raza : raza)", 'cam', 'semnul lui d in profil')
o('F02', PRO, "const inversate = (parte === 'stanga') !== (p.sens === 'urcare');", "const inversate = (parte === 'stanga') === (p.sens === 'urcare');", 'cam', 'tabelul sensului inversat')
o('F03', PRO, "contururi = inversate ? [...o.bucati].reverse().map(inverseaza) : o.bucati;", "contururi = inversate ? o.bucati.map(inverseaza) : o.bucati;", 'cam', 'ordinea bucatilor nu se inverseaza odata cu ele')
o('F04', PRO, "const parte = parteaLume(p.latura, p.oglindit === true);", "const parte = parteaLume(p.latura, false);", 'cam', 'oglindirea ignorata in profil')
o('F05', PRO, "const inversate = (parte === 'stanga') !== (p.sens === 'urcare');", "const inversate = (p.latura === 'stanga') !== (p.sens === 'urcare');", 'cam', 'sensul dupa latura, nu dupa partea in lume')
o('F06', PRO, "neatins = o.neatins;", "neatins = [];", 'cam', 'neatins pierdut in profil')

# ── regiune.ts ───────────────────────────────────────────────────────────────────────────────────────────────────────
o('R01', REG, "      if (p) return motivPerete(idLume, p, raza);\n    }\n    return null;\n  }\n  const c = r.inele.find",
  "      if (false) return motivPerete(idLume, p, raza);\n    }\n    return null;\n  }\n  const c = r.inele.find", 'cam', 'peretii nu se judeca pe stanga / dreapta')
o('R03', REG, "    if (p) return motivPerete(idLume, p, raza);\n  }\n  return null;\n}",
  "    if (false) return motivPerete(idLume, p, raza);\n  }\n  return null;\n}", 'cam', 'peretii nu se judeca pe exterior / interior')
o('R04', REG, "      if (inK(r, p0)) return", "      if (false) return", 'cam', 'p0 in K nu se mai verifica pe stanga / dreapta')
o('R05', REG, "      if (cea) return `${PREFIX_REGIUNE} tăietura lui ${idLume} intră în piesa", "      if (false) return `${PREFIX_REGIUNE} tăietura lui ${idLume} intră în piesa", 'cam', 'marginile lui K nu se judeca pe stanga / dreapta')
o('R06', REG, "const prag = Math.max(raza - EPS_REGIUNE, EPS_ATINGERE_INELE);\n  const cutie = largita(cutieContur(traseu), raza);\n  let cel",
  "const prag = Math.max(raza - 2 * EPS_REGIUNE, EPS_ATINGERE_INELE);\n  const cutie = largita(cutieContur(traseu), raza);\n  let cel", 'cam', 'pragul peretilor R - 2 eps in loc de R - eps')

# ── job.ts ───────────────────────────────────────────────────────────────────────────────────────────────────────────
o('J01', JOB, "if ((u.latura === 'stanga' || u.latura === 'dreapta') && !pereti.some(", "if (false && !pereti.some(", 'cam', 'peretii nu se mai aduna')
# SCOASA: o('J03', JOB, "n.lungime > scula.diametru + NEATINS_PESTE_D", "n.lungime > 0", 'cam', 'avertismentul peretelui neatins si pe colturile concave')
o('J04', JOB, "n.lungime > scula.diametru + NEATINS_PESTE_D", "n.lungime > 2 * scula.diametru", 'cam', 'avertismentul peretelui neatins doar peste 2D')
o('J05', JOB, "latura, pr.treceri[0]?.contururi ?? [], scula.diametru / 2, pereti);", "latura, pr.treceri[0]?.contururi ?? [], scula.diametru / 2, pereti.filter((p) => p.idLume !== t.idLume));", 'cam', 'propriul perete exclus')
o('J06', JOB, "if (esteCaleDeschisa(t.forma)) {\n      const j = judecaDeschisa(", "if (false) {\n      const j = judecaDeschisa(", 'cam', 'judecata caii deschise (despartirea, marginea, avertismentele) sarita')
o('J07', JOB, "judecaDeschisa(t, conturDe(t), pr.treceri[0]?.contururi ?? [], regiune.regiune", "judecaDeschisa(t, conturDe(t), [conturDe(t)], regiune.regiune", 'cam', 'judecata deschisa pe cale, nu pe bucatile offsetului')

# ── deschise.ts ──────────────────────────────────────────────────────────────────────────────────────────────────────
o('D01', DES, "if (deschisa && (t.latura === 'exterior' || t.latura === 'interior')) {", "if (false) {", 'cam', 'exterior / interior pe o cale deschisa nerefuzat')
o('D03', DES, "if (!deschisa && t.despartire) return", "if (false) return", 'cam', 'despartirea pe o cale inchisa nerefuzata')
o('D05', DES, "if (t.rampa) return 'rampa pe o cale deschisă vine mai târziu';", "if (false) return 'rampa pe o cale deschisă vine mai târziu';", 'cam', 'rampa pe deschis nerefuzata')
o('D06', DES, "if (t.urechi) return 'urechile pe o cale deschisă vin mai târziu';", "if (false) return 'urechile pe o cale deschisă vin mai târziu';", 'cam', 'urechile pe deschis nerefuzate')
# SCOASA: o('D07', DES, "if (t.intrari) return 'intrările pe o cale deschisă vin mai târziu';", "if (false) return 'intrările pe o cale deschisă vin mai târziu';", 'cam', 'intrarile pe deschis nerefuzate')
o('D09', DES, "if (opDeschise.has(`${t.piesa}/${t.operatie}`)) {", "if (deschisa && opDeschise.has(`${t.piesa}/${t.operatie}`)) {", 'cam', 'nodurile inchise ale unei operatii cu noduri deschise scapa de refuzurile 9')
o('D10', DES, "if (lungime >= REZOLUTIE) return null;", "if (lungime >= REZOLUTIE / 10) return null;", 'cam', 'pragul caii degenerate 0,001 in loc de 0,01')
o('D12', DES, "const prinFoaie = t.adancime >= foaie.grosime - EPS_GROSIME;", "const prinFoaie = t.adancime > foaie.grosime;", 'cam', '„prin foaie” strict (adancimea egala cu grosimea nu mai e prin foaie)')
o('D14', DES, "if (k) return { ok: false, motiv: `${t.idLume}: despărțirea intră în piesa", "if (false) return { ok: false, motiv: `${t.idLume}: despărțirea intră în piesa", 'cam', 'despartirea prin piesa nerefuzata')
o('D15', DES, "laMargineaCutiei(cutieDrum, foaie.latime, foaie.inaltime) <= R + MARJA_MARGINE", "laMargineaCutiei(cutieDrum, foaie.latime, foaie.inaltime) < R + MARJA_MARGINE", 'cam', 'pragul marginii foii strict')
# SCOASA: o('D16', DES, "export const MARJA_MARGINE = 1;", "export const MARJA_MARGINE = 0.5;", 'cam', 'marja marginii foii 0,5 in loc de 1')
o('D17', DES, "const cutieDrum = trasee.reduce((x, d) => uneste(x, cutieContur(d)), CUTIE_GOALA);",
  "const cutieDrum = cutieContur({ inchis: false, varfuri: [{ p: p0, s: { tip: 'L' } }, { p: pn, s: { tip: 'L' } }] });", 'cam', 'marginea foii judecata doar pe capete')
o('D18', DES, "const cutieDrum = trasee.reduce((x, d) => uneste(x, cutieContur(d)), CUTIE_GOALA);", "const cutieDrum = cutieContur(cale);", 'cam', 'marginea foii judecata pe cale, nu pe drumul centrului')
o('D19', DES, "const cum = capete < D + MARJA_BUCATA ?", "const cum = capete < MARJA_BUCATA ?", 'cam', 'bucata libera: capetele sub 1 mm in loc de D + 1')
o('D21', DES, "if (s0 >= D) min = Math.min(", "if (false) min = Math.min(", 'cam', 'lasoul: capatul de start nu mai e judecat')
o('D22', DES, "if (s0 + l <= total - D) min = Math.min(", "if (false) min = Math.min(", 'cam', 'lasoul: capatul final nu mai e judecat')

# ── lume.ts ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('L01', LUM, "stanga: 1, dreapta: 1, exterior: 2", "stanga: 2, dreapta: 2, exterior: 2", 'cam', 'stanga / dreapta in clasa exterioarelor')
o('L02', LUM, "(t.despartire && t.forma.tip === 'cale' && !t.forma.inchis ? CLASA_DESPARTIRE", "(t.despartire ? CLASA_DESPARTIRE", 'cam', 'si nodurile inchise marcate in clasa despartirilor')
o('L03', LUM, "const CLASA_DESPARTIRE = 3;", "const CLASA_DESPARTIRE = 1.5;", 'cam', 'despartirile inaintea exterioarelor')

# ── traseu.ts ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('T01', TRS, "if (Math.abs(s.bulge) < BULGE_MINIM || !(raza * Math.abs(baleiaj) >= EPS_ATINGERE)) {", "if (!(raza * Math.abs(baleiaj) >= EPS_ATINGERE)) {", 'traseu', 'arcul plat (bulge < 1e-6) scris arc')
o('T02', TRS, "if (Math.abs(s.bulge) < BULGE_MINIM || !(raza * Math.abs(baleiaj) >= EPS_ATINGERE)) {", "if (Math.abs(s.bulge) < BULGE_MINIM) {", 'traseu', 'arcul scurt (sub 1e-6 mm pe curba) scris arc')

# ── contur.ts ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('C01', 'src/geom/conturBaza.ts', "const finit = Number.isFinite(bulge * bulge);", "const finit = true;", 'geom', 'cerculArcului fara ramura de depasire (bulge urias)')


# ---- Seturile (din harnașul segmentului 2a) ----
import glob  # noqa: E402


def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


GEOM = u('geom.offset.deschis', 'geom.offset.garzi', 'geom.offset', 'geom.contur', 'offset.deschis.oracol', 'offset.oracol',
         'parte.oracol', 'parte.aplicatie.oracol', 'cam.parte', 'cam.deschise', 'deschise.oracol', 'deschise.aplicatie.oracol',
         'cam.sens.fizic', 'cale.cam.oracol', 'cale.cam2.oracol', 'cam.cale', 'poarta-cale.oracol', 'job', 'cam.profil',
         'regiune.oracol', 'cam.regiune', 'cam.pe-linie', 'pe-linie.oracol', 'otravuri.23c')
CAM = sorted(set(glob.glob('test/unit/cam.*.test.ts') + glob.glob('test/unit/deschise*.test.ts') + glob.glob('test/unit/parte*.test.ts')
                 + glob.glob('test/unit/regiune*.test.ts') + glob.glob('test/unit/poarta*.test.ts')
                 + u('job', 'sens.oracol', 'export.calcul', 'actiuni.export', 'cale.cam.oracol', 'cale.cam2.oracol', 'desen',
                     'document.v10', 'offset.deschis.oracol', 'geom.offset.deschis', 'otravuri.23c')))
TRASEU = sorted(set(CAM + glob.glob('test/unit/pe-linie*.test.ts') + u('placa01', 'placa02', 'post.grbl')))
LARG = sorted(set(GEOM + CAM + TRASEU))
SETURI = {'geom': GEOM, 'cam': CAM, 'traseu': TRASEU, 'geom2': LARG, 'cam2': LARG, 'traseu2': LARG}
