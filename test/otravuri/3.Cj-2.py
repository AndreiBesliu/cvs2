# Lista de otrăvuri a feliei 3.Cj-2 (roata cu palete din atelierul Easy 3Draw; ADR 0284), 25.11.2026, alese de autor: motorul
# (marginile și implicitele, grosimea paletei, butucul care crește, câte palete încap, conturul paletei drepte și al celei
# curbate, discul, prinderile, cotele date atelierului) și atelierul (familia și desenul, numele, câmpurile și marginile
# lor, forma, discul și gaura alese, textul cu butucul și paletele).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: marginile și implicitele
DI = 'const D = camp(d.diam, 24, 160, 64, x => tr`Diametrul unei roți cu palete'
o('A01', LG, DI, DI.replace('24, 160, 64', '24, 160, 48'), 'palete', 'roata implicită are Ø48')
o('A02', LG, DI, DI.replace('24, 160, 64', '20, 160, 64'), 'palete', 'diametrul poate fi 20')
o('A03', LG, DI, DI.replace('24, 160, 64', '24, 200, 64'), 'palete', 'diametrul poate fi 200')
LA = 'const W = camp(d.lat, 4, 40, 15.8, x => tr`Lățimea unei roți cu palete'
o('A04', LG, LA, LA.replace('4, 40, 15.8', '4, 40, 7.8'), 'palete', 'roata implicită e lată cât o grindă')
o('A05', LG, LA, LA.replace('4, 40, 15.8', '4, 60, 15.8'), 'palete', 'lățimea poate fi 60')
o('A06', LG, LA, LA.replace('4, 40, 15.8', '2, 40, 15.8'), 'palete', 'lățimea poate fi 2')
GR = 'const t = Math.max(K.grosime, zecime(0.02 * D));'
o('A07', LG, GR, 'const t = K.grosime;', 'palete', 'paleta nu se îngroașă la roțile mari')
o('A08', LG, GR, 'const t = Math.max(K.grosime, zecime(0.03 * D));', 'palete', 'paleta are 3 % din diametru')
KP = 'const PALETE = { grosime: 1.6, disc: 1.2, intre: 0.8, sageata: 0.2 };'
o('A09', LG, KP, KP.replace('grosime: 1.6', 'grosime: 1.2'), 'palete', 'paleta are 1,2 mm')
o('A10', LG, KP, KP.replace('disc: 1.2', 'disc: 2'), 'palete', 'discul are 2 mm')
o('A11', LG, KP, KP.replace('intre: 0.8', 'intre: 0.2'), 'palete', 'între palete, lângă butuc, rămân doar 0,2 mm')
o('A12', LG, KP, KP.replace('sageata: 0.2', 'sageata: 0.3'), 'palete', 'săgeata paletei curbate e 30 % din lungime')
PZ = 'piezis = forma === "curbate" ? 1 / Math.sqrt(1 - (s / (0.25 + s * s)) ** 2) : 1,'
o('A13', LG, PZ, 'piezis = 1,', 'palete', 'paleta curbată e socotită, la butuc, ca una dreaptă (paletele se ating)')
o('A14', LG, 'const incap = Math.floor(Math.PI * R / pas);', 'const incap = Math.floor(2 * Math.PI * R / pas);', 'palete', 'butucul poate crește până la vârful paletelor')
NR = 'const cerute = numarCerut(d.palete), n0 = Math.round(Number.isFinite(cerute) ? cerute : 8), n = Math.min(24, incap, Math.max(4, n0));'
o('A15', LG, NR, NR.replace('cerute : 8)', 'cerute : 6)'), 'palete', 'roata implicită are 6 palete')
o('A16', LG, NR, NR.replace('Math.min(24, incap,', 'Math.min(30, incap,'), 'palete', 'pot fi 30 de palete')
o('A17', LG, NR, NR.replace('Math.max(4, n0)', 'Math.max(3, n0)'), 'palete', 'pot fi 3 palete')
o('A18', LG, NR, NR.replace('Math.min(24, incap, Math.max(4, n0))', 'Math.min(24, Math.max(4, n0))'), 'palete', 'paletele nu se mai țin în marginea diametrului')
o('A19', LG, NR, NR.replace('n0 = Math.round(', 'n0 = Math.floor('), 'palete', 'numărul paletelor se taie, nu se rotunjește')
AV = 'if (Number.isFinite(cerute) && n !== n0) avert.push(n0 > n && n < 24'
o('A20', LG, AV, 'if (Number.isFinite(cerute) && n !== n0) avert.push(n0 > n', 'palete', 'peste 24 cerute, mesajul dă vina pe diametru')
o('A21', LG, AV, 'if (Number.isFinite(cerute) && n !== n0) avert.push(n0 < n', 'palete', 'mesajul diametrului și al marginilor, pe dos')
o('A22', LG, AV, 'if (Number.isFinite(cerute) && n !== cerute) avert.push(n0 > n && n < 24', 'palete', 'un număr cu zecimale, rotunjit, e spus ca ieșit din margini')
o('A23', LG, AV, 'if (false) avert.push(n0 > n && n < 24', 'palete', 'paletele aduse înapoi nu mai sunt spuse')
RH = 'const rh = Math.ceil(Math.max(ROATA.butuc, razaGauraButuc(gaura) + ROATA.peretButuc, 2.5 * t, n * pas / (2 * Math.PI)) * 10 - 1e-9) / 10;'
o('A24', LG, RH, RH.replace(' 2.5 * t,', ' 0,'), 'palete', 'butucul nu mai ține de grosimea paletei')
o('A25', LG, RH, RH.replace('n * pas / (2 * Math.PI)', '0'), 'palete', 'butucul nu mai crește cu paletele')
o('A26', LG, RH, RH.replace('Math.ceil(', 'Math.round(').replace(' * 10 - 1e-9) / 10', ' * 10) / 10'), 'palete', 'butucul se rotunjește la cea mai apropiată zecime, nu în sus')
RT = 'return { D, R, n, W, forma, disc: d.disc === "fara" ? "fara" : "unul", gaura, rh, t, c: R - rh, sageata: forma === "curbate" ? s * (R - rh) : 0, incap: Math.min(24, incap), avert };'
o('A27', LG, RT, RT.replace('disc: d.disc === "fara" ? "fara" : "unul"', 'disc: "unul"'), 'palete', 'roata fără disc nu se poate cere')
o('A28', LG, RT, RT.replace('c: R - rh,', 'c: R,'), 'palete', 'lungimea paletei e raza toată')
o('A29', LG, RT, RT.replace('s * (R - rh) : 0', 's * R : 0'), 'palete', 'săgeata se ia din rază, nu din lungimea paletei')
o('A30', LG, RT, RT.replace('incap: Math.min(24, incap)', 'incap: 24'), 'palete', 'atelierului i se spune că încap mereu 24')
FG = 'const forma = d.forma === "curbate" ? "curbate" : "drepte", gaura = d.gaura === "r" ? "r" : "x", R = D / 2;'
o('A31', LG, FG, FG.replace('d.forma === "curbate" ? "curbate" : "drepte"', '"drepte"'), 'palete', 'paletele curbate nu se pot cere')
o('A32', LG, FG, FG.replace('d.gaura === "r" ? "r" : "x"', '"x"'), 'palete', 'gaura rotundă nu se poate cere')
o('A33', LG, FG, FG.replace('R = D / 2', 'R = D / 2 + 1'), 'palete', 'roata iese cu 2 mm mai mare decât diametrul cerut')
# --- motorul: conturul paletei
DR = 'if (!q.sageata) { const xv = Math.sqrt(R * R - h * h); return [[rh - 0.3, -h], [xv, -h], [R, 0], [xv, h], [rh - 0.3, h]]; }'
o('B01', LG, DR, DR.replace('[[rh - 0.3, -h]', '[[rh + 0.3, -h]').replace('[rh - 0.3, h]]', '[rh + 0.3, h]]'), 'palete', 'paleta dreaptă nu ajunge la butuc')
o('B02', LG, DR, DR.replace('[R, 0]', '[R + 1, 0]'), 'palete', 'vârful paletei drepte trece de diametru')
o('B03', LG, DR, DR.replace('[xv, h], [rh - 0.3, h]]', '[xv, 2 * h], [rh - 0.3, 2 * h]]'), 'palete', 'paleta dreaptă e mai groasă într-o parte')
o('B04', LG, 'const { R, rh, t } = q, h = t / 2;', 'const { R, rh, t } = q, h = t;', 'palete', 'paleta e de două ori mai groasă')
CC = 'const c = q.c, sg = q.sageata, rho = (c * c / 4 + sg * sg) / (2 * sg), cx = rh + c / 2, cy = sg - rho, dc = Math.hypot(cx, cy), uc = Math.atan2(cy, cx);'
o('B05', LG, CC, CC.replace('rho = (c * c / 4 + sg * sg) / (2 * sg)', 'rho = (c * c / 4 + sg * sg) / sg'), 'palete', 'arcul paletei are raza dublă (nu mai trece prin capete)')
o('B06', LG, CC, CC.replace('cx = rh + c / 2', 'cx = rh + c / 2 + 1'), 'palete', 'arcul paletei e mutat cu 1 mm spre vârf')
TA = 'const u1s = taie(rho + h, R, uB), u1j = taie(rho - h, R, uB), m = Math.max(8, Math.ceil(laturiFine(rho) * (uA - uB) / (2 * Math.PI)));'
o('B07', LG, TA, TA.replace('u1s = taie(rho + h, R, uB)', 'u1s = uB'), 'palete', 'marginea de sus a paletei curbate nu e tăiată la diametru')
o('B08', LG, TA, TA.replace('u1j = taie(rho - h, R, uB)', 'u1j = uB + 0.2'), 'palete', 'marginea de jos a paletei curbate se oprește înaintea vârfului')
o('B09', LG, TA, TA.replace('m = Math.max(8, Math.ceil(laturiFine(rho) * (uA - uB) / (2 * Math.PI)))', 'm = 2'), 'palete', 'arcul paletei are doar două laturi')
FI = 'return trig([...sus, [R, 0], ...jos.reverse(), [j0[0] * (rh - 0.3) / rj, j0[1] * (rh - 0.3) / rj]]);'
o('B10', LG, FI, FI.replace('[...sus, [R, 0], ...jos.reverse(),', '[...sus, ...jos.reverse(),'), 'palete', 'vârful paletei curbate e tăiat drept (nu ajunge la diametru)')
o('B11', LG, FI, FI.replace('(rh - 0.3) / rj, j0[1] * (rh - 0.3) / rj', '(rh + 0.3) / rj, j0[1] * (rh + 0.3) / rj'), 'palete', 'capătul paletei curbate nu coboară în butuc (rămâne o crăpătură)')
o('B12', LG, 'const th = Math.asin(c / 2 / rho), uA = Math.PI / 2 + th, uB = Math.PI / 2 - th;', 'const th = Math.asin(c / 2 / rho), uA = Math.PI / 2 + th / 2, uB = Math.PI / 2 - th;', 'palete',
  'paleta curbată pornește de la jumătatea arcului (nu ajunge la butuc)')
# --- motorul: roata
BU = 'const tri = butucRoata(q.gaura, q.rh, q.W);\n    for (let k = 0; k < q.n; k++) { const u = 2 * Math.PI * k / q.n; tri.push(...prisma(paleta.map(p => rotP(p, u)), 0, q.W)); }'
o('C01', LG, BU, BU.replace('butucRoata(q.gaura, q.rh, q.W)', 'butucRoata(q.gaura, q.rh, K.disc)'), 'palete', 'butucul e înalt doar cât discul')
o('C02', LG, BU, BU.replace('k < q.n;', 'k < q.n - 1;'), 'palete', 'lipsește o paletă')
o('C03', LG, BU, BU.replace('2 * Math.PI * k / q.n;', '2 * Math.PI * k / (q.n + 1);'), 'palete', 'paletele nu sunt egal depărtate')
o('C04', LG, BU, BU.replace('rotP(p, u)), 0, q.W)', 'rotP(p, u)), 0, q.W / 2)'), 'palete', 'paletele au jumătate din lățime')
o('C05', LG, BU, BU.replace('butucRoata(q.gaura,', 'butucRoata("r",'), 'palete', 'gaura e mereu rotundă')
o('C06', LG, BU, BU.replace('rotP(p, u))', 'rotP(p, -u))').replace('const u = 2 * Math.PI * k / q.n;', 'const u = 2 * Math.PI * k / q.n + 0.1;'), 'palete', 'paletele sunt rotite toate cu 0,1 rad')
DS = 'if (q.disc === "unul") tri.push(...inel(cerc(0, 0, q.R, laturiFine(q.R)), cerc(0, 0, q.rh - 0.3), [0, 0], 0, K.disc));'
o('C07', LG, DS, DS.replace('q.disc === "unul"', 'q.disc === "fara"'), 'palete', 'discul e pus pe dos (la „fără”)')
o('C08', LG, DS, DS.replace('cerc(0, 0, q.R, laturiFine(q.R))', 'cerc(0, 0, q.R + 2, laturiFine(q.R))'), 'palete', 'discul trece de vârful paletelor')
o('C09', LG, DS, DS.replace('cerc(0, 0, q.rh - 0.3)', 'cerc(0, 0, q.rh + 0.3)'), 'palete', 'între disc și butuc rămâne un gol')
o('C10', LG, DS, DS.replace('0, K.disc));', '0, q.W));'), 'palete', 'discul e cât roata de înalt (un cilindru plin)')
o('C11', LG, DS, DS.replace('cerc(0, 0, q.R, laturiFine(q.R))', 'cerc(0, 0, q.R - 3, laturiFine(q.R))'), 'palete', 'discul nu ajunge la vârful paletelor')
o('C12', LG, 'return { tri, avert: q.avert, prinderi: prinderiButuc(q.gaura, q.W) };', 'return { tri, avert: q.avert, prinderi: prinderiButuc(q.gaura, PALETE.disc) };', 'palete', 'gaura e declarată adâncă doar cât discul')
o('C13', LG, 'return { tri, avert: q.avert, prinderi: prinderiButuc(q.gaura, q.W) };', 'return { tri, avert: q.avert, prinderi: prinderiButuc("x", q.W) };', 'palete', 'gaura rotundă e declarată gaură de ax')
o('C14', LG, 'return { tri, avert: q.avert, prinderi: prinderiButuc(q.gaura, q.W) };', 'return { tri, avert: [], prinderi: prinderiButuc(q.gaura, q.W) };', 'palete', 'piesa nu mai spune ce a adus în margini')
# --- motorul: cotele date atelierului
CT = 'roataPaleteCote: (d: PaleteDef) => { const q = roataPaleteCote(d); return { diam: q.D, palete: q.n, lat: q.W, forma: q.forma, disc: q.disc, gaura: q.gaura, butuc: q.rh, grosime: q.t, lungime: q.c, sageata: q.sageata, discGros: PALETE.disc, incap: q.incap }; },'
o('D01', LG, CT, CT.replace('butuc: q.rh,', 'butuc: q.R,'), 'palete', 'atelierului i se dă raza roții drept butuc')
o('D02', LG, CT, CT.replace('grosime: q.t,', 'grosime: PALETE.grosime,'), 'palete', 'atelierului i se dă mereu grosimea de 1,6')
o('D03', LG, CT, CT.replace('lungime: q.c,', 'lungime: q.R,'), 'palete', 'atelierului i se dă raza drept lungime a paletei')
o('D04', LG, CT, CT.replace('lat: q.W,', 'lat: q.D,'), 'palete', 'atelierului i se dă diametrul drept lățime')
o('D05', LG, CT, CT.replace('palete: q.n,', 'palete: q.incap,'), 'palete', 'atelierului i se dă câte încap drept numărul paletelor')
# --- atelierul: tabelele
o('T01', AT, ', ["roataPalete", "Roată cu palete"]]]', ']]', 'tabele', 'roata cu palete nu e în nicio familie')
o('T02', AT, '    roataPalete: `<circle cx="12" cy="12" r="2.4"/><path d="M14.4 12H22M13.7 13.7L19.1 19.1M12 14.4V22M10.3 13.7L4.9 19.1M9.6 12H2M10.3 10.3L4.9 4.9M12 9.6V2M13.7 10.3L19.1 4.9"/>`,\n', '', 'tabele',
  'roata cu palete n-are desen')
o('T03', EN, ' "Palete curbate": "Curved paddles",\n', '', 'tabele', 'un text al roții cu palete lipsește din dicționar')
# --- atelierul: editorul (probele din browser)
ST = 'roataPalete: { diam: 64, palete: 8, lat: 15.8, forma: "drepte", disc: "unul", gaura: "x" },'
o('E01', AT, ST, ST.replace('palete: 8', 'palete: 6'), 'e2e', 'roata se deschide cu 6 palete')
o('E02', AT, ST, ST.replace('disc: "unul"', 'disc: "fara"'), 'e2e', 'roata se deschide fără disc')
NU = 'return tr`Roată cu palete Ø${fmt(q.diam)}, ${q.palete} palete` + (q.forma === "curbate" ? tr(", curbate") : "") + (q.lat === 15.8 ? "" : tr`, lată ${fmt(q.lat)} mm`)'
o('E03', AT, NU, NU.replace(' + (q.forma === "curbate" ? tr(", curbate") : "")', ''), 'e2e', 'numele nu spune paletele curbate')
o('E04', AT, NU, NU.replace('q.lat === 15.8 ? ""', 'q.lat === 7.8 ? ""'), 'e2e', 'numele spune lățimea obișnuită și o tace pe cea de o grindă')
o('E05', AT, NU, NU.replace('${q.palete} palete`', '${q.incap} palete`'), 'e2e', 'numele scrie câte palete încap')
o('E06', AT, NU, NU.replace('Ø${fmt(q.diam)}', 'Ø${fmt(q.lat)}'), 'e2e', 'numele scrie lățimea în locul diametrului')
N2 = '+ (q.disc === "fara" ? tr(", fără disc") : "") + (q.gaura === "r" ? tr(", gaură rotundă") : "");\n    }\n    if (d.tip === "rotita") {'
o('E07', AT, N2, N2.replace('(q.disc === "fara" ? tr(", fără disc") : "") + ', ''), 'e2e', 'numele nu spune că roata n-are disc')
o('E08', AT, N2, N2.replace(' + (q.gaura === "r" ? tr(", gaură rotundă") : "")', ''), 'e2e', 'numele nu spune gaura rotundă')
o('E09', AT, 'camp("#at-rp-diam", 24, 160, v => { p.diam = v; });', 'camp("#at-rp-diam", 20, 160, v => { p.diam = v; });', 'e2e', 'câmpul primește diametrul 23')
o('E10', AT, 'camp("#at-rp-diam", 24, 160, v => { p.diam = v; });', 'camp("#at-rp-diam", 24, 170, v => { p.diam = v; });', 'e2e', 'câmpul primește diametrul 161')
o('E11', AT, 'camp("#at-rp-palete", 4, 24, v => { p.palete = v; });', 'camp("#at-rp-palete", 3, 24, v => { p.palete = v; });', 'e2e', 'câmpul primește 3 palete')
o('E12', AT, 'camp("#at-rp-palete", 4, 24, v => { p.palete = v; });', 'camp("#at-rp-palete", 4, 30, v => { p.palete = v; });', 'e2e', 'câmpul primește 25 de palete')
o('E13', AT, 'camp("#at-rp-lat", 4, 40, v => { p.lat = v; });', 'camp("#at-rp-lat", 3, 40, v => { p.lat = v; });', 'e2e', 'câmpul primește lățimea 3,9')
o('E14', AT, 'camp("#at-rp-lat", 4, 40, v => { p.lat = v; });', 'camp("#at-rp-lat", 4, 50, v => { p.lat = v; });', 'e2e', 'câmpul primește lățimea 41')
o('E15', AT, 'camp("#at-rp-lat", 4, 40, v => { p.lat = v; });', 'camp("#at-rp-lat", 4, 40, v => { p.diam = v; });', 'e2e', 'lățimea scrisă schimbă diametrul')
o('E16', AT, 'const tine = () => { p.palete = Lego.roataPaleteCote(p).palete; };', 'const tine = () => {};', 'e2e', 'paletele cerute peste cât încap se țin minte și se întorc la alt diametru sau altă formă')
o('E17', AT, 'alege("#at-rp-repede", v => { p.diam = +v; });', 'alege("#at-rp-repede", v => { p.diam = +v + 8; });', 'e2e', 'butonul „Repede” pune alt diametru')
o('E18', AT, 'alege("#at-rp-forma", v => { p.forma = v; });', 'alege("#at-rp-forma", () => { p.forma = "drepte"; });', 'e2e', 'paletele curbate nu se pot alege')
o('E19', AT, 'alege("#at-rp-disc", v => { p.disc = v; });', 'alege("#at-rp-disc", () => { p.disc = "unul"; });', 'e2e', 'roata fără disc nu se poate alege')
o('E20', AT, 'alege("#at-rp-gaura", v => { p.gaura = v; });', 'alege("#at-rp-gaura", () => { p.gaura = "x"; });', 'e2e', 'gaura rotundă nu se poate alege')
o('E21', AT, 'seg("at-rp-forma", [["drepte", "Palete drepte"], ["curbate", "Palete curbate"]], q.forma)', 'seg("at-rp-forma", [["drepte", "Palete drepte"], ["curbate", "Palete curbate"]], "drepte")', 'e2e',
  'forma aleasă nu se vede apăsată')
o('E22', AT, 'seg("at-rp-disc", [["unul", "Cu disc"], ["fara", "Fără"]], q.disc)', 'seg("at-rp-disc", [["unul", "Cu disc"], ["fara", "Fără"]], "unul")', 'e2e', 'discul ales nu se vede apăsat')
o('E23', AT, 'seg("at-rp-gaura", [["x", "Pentru ax"], ["r", "Rotundă"]], q.gaura)', 'seg("at-rp-gaura", [["x", "Pentru ax"], ["r", "Rotundă"]], "x")', 'e2e', 'gaura aleasă nu se vede apăsată')
o('E24', AT, '[["32", "Ø32"], ["48", "Ø48"], ["64", "Ø64"], ["96", "Ø96"]], String(q.diam))', '[["32", "Ø32"], ["48", "Ø48"], ["64", "Ø64"], ["96", "Ø96"]], "64")', 'e2e', 'diametrul ales din „Repede” nu se vede apăsat')
IN = 'tr`Butucul are Ø${fmt(2 * q.butuc)} mm, iar paletele, ${fmt(q.lungime)} mm lungime și ${fmt(q.grosime)} mm grosime.`'
o('E25', AT, IN, IN.replace('Ø${fmt(2 * q.butuc)}', 'Ø${fmt(q.butuc)}'), 'e2e', 'textul scrie raza butucului drept diametru')
o('E26', AT, IN, IN.replace('${fmt(q.lungime)} mm lungime', '${fmt(q.grosime)} mm lungime'), 'e2e', 'textul scrie grosimea drept lungime')
o('E27', AT, IN, IN.replace('${fmt(q.grosime)} mm grosime', '${fmt(q.lungime)} mm grosime'), 'e2e', 'textul scrie lungimea drept grosime')
o('E28', AT, '${q.incap < 24 ? " " + tr`La diametrul ăsta încap cel mult ${q.incap} palete.` : ""}', '', 'e2e', 'textul nu spune câte palete încap')
o('E29', AT, '${q.incap < 24 ? " " + tr`La diametrul ăsta încap cel mult ${q.incap} palete.` : ""}', '${" " + tr`La diametrul ăsta încap cel mult ${q.incap} palete.`}', 'e2e', 'textul spune câte încap și când încap toate')
o('E30', AT, '${q.forma === "curbate" ? " " + tr("Curbate, prind apa ca niște cupe: împing mai bine într-un sens.") : ""}', '', 'e2e', 'textul nu spune nimic despre paletele curbate')
o('E31', AT, '<input id="at-rp-palete" type="number" min="4" max="${q.incap}" step="1" value="${q.palete}">', '<input id="at-rp-palete" type="number" min="4" max="24" step="1" value="${q.palete}">', 'e2e',
  'câmpul paletelor nu-și ține marginea de sus după diametru')
# (E32 de la prima rulare punea în câmpul paletelor numărul ținut, nu cel făcut: echivalentă prin editor, fiindcă `tine` le
# face egale după fiecare schimbare; diferă doar la o stare salvată din afara marginilor. Otrava e acum alta.)
o('E32', AT, 'if (v >= a && v <= b) { f(v); tine(); schimbat(); } editor(); }; };', 'if (v >= a && v <= b) { f(v); tine(); schimbat(); editor(); } }; };', 'e2e',
  'un număr refuzat rămâne scris în câmp')
o('E33', AT, '<input id="at-rp-diam" type="number" min="24" max="160" step="0.1" value="${q.diam}">', '<input id="at-rp-diam" type="number" min="24" max="160" step="0.1" value="${p.diam}">', 'e2e',
  'câmpul diametrului arată zecimalele scrise, nu rotunjirea')
o('E34', AT, '<input id="at-rp-lat" type="number" min="4" max="40" step="0.1" value="${q.lat}">', '<input id="at-rp-lat" type="number" min="4" max="40" step="0.1" value="${q.diam}">', 'e2e', 'câmpul lățimii arată diametrul')

SETURI = {
    'palete': ['test/unit/trenulet.palete.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.palete.spec.ts']
