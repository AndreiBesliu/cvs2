# Lista de otrăvuri a feliei 3.Cb (conectorul în unghi, axul cu opritor, știftul cu bucșă, în atelierul Easy 3Draw; ADR 0284),
# 24.11.2026, alese de autor: motorul (brațele și unghiurile lor, butucul, umărul, manșoanele, opritorul, bucșa) și atelierul
# (familia și desenul, formele gata, configuratorul cu marginile unghiurilor, numele pieselor, engleza).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: conectorul în unghi
o('U01', LG, 'for (const [u, fel] of cerute.length ? cerute : ([[0, "x"], [135, "x"]] as const)) {', 'for (const [u, fel] of cerute.length ? cerute : ([[0, "x"], [90, "x"]] as const)) {', 'unghi',
  'piesa implicită a motorului e cotul de 90°')
o('U02', LG, '% 360 - 180) < 90 - 1e-6)) { afara = true; continue; }', '% 360 - 180) < 60 - 1e-6)) { afara = true; continue; }', 'unghi',
  'două brațe se pot pune și la 60°')
o('U03', LG, '% 360 - 180) < 90 - 1e-6)) { afara = true; continue; }', '% 360 - 180) < 90 - 1e-6)) { afara = true; }', 'unghi',
  'brațul care nu încape rămâne totuși')
o('U04', LG, '% 360 - 180) < 90 - 1e-6)) { afara = true; continue; }', '% 360 - 180) < 90 + 1e-6)) { afara = true; continue; }', 'unghi',
  'exact 90° nu se mai poate')
o('U05', LG, 'lista.push([ung, fel === "r" ? "r" : "x"]);', 'lista.push([ung, fel === "x" ? "x" : "r"]);', 'unghi',
  'un fel necunoscut devine manșon de știft')
o('U06', LG, 'if (afara) avert.push(tr("Două brațe stau', 'if (afara && lista.length > 9) avert.push(tr("Două brațe stau', 'unghi',
  'brațul lăsat afară nu se mai spune')
o('U07', LG, 'if (butuc === "p") tri.push(...prisma(rotund, 0, g));', 'if (butuc === "q") tri.push(...prisma(rotund, 0, g));', 'unghi',
  'butucul plin primește gaură de știft')
o('U08', LG, 'else if (butuc === "x") tri.push(...inel(rotund, cruce(0, 0, e.axGauraD, e.axGauraLat), c0, 0, g));', 'else if (butuc === "q") tri.push(...inel(rotund, cruce(0, 0, e.axGauraD, e.axGauraLat), c0, 0, g));', 'unghi',
  'butucul de ax primește gaură de știft')
o('U09', LG, 'tri.push(...inel(rotund, cerc(0, 0, e.gauraD / 2), c0, h - 0.01, g - h + 0.01));', 'tri.push(...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, h - 0.01, g - h + 0.01));', 'unghi',
  'gaura butucului e cât lamajul, pe toată înălțimea')
o('U10', LG, 'tri.push(...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, 0, h), ...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, g - h, g));',
  'tri.push(...inel(rotund, cerc(0, 0, e.gauraD / 2), c0, 0, h), ...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, g - h, g));', 'unghi',
  'butucul n-are lamaj jos')
o('U11', LG, 'tri.push(...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, 0, h), ...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, g - h, g));',
  'tri.push(...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, 0, h), ...inel(rotund, cerc(0, 0, e.gauraD / 2), c0, g - h, g));', 'unghi',
  'butucul n-are lamaj sus')
o('U12', LG, 'const rotund = cerc(0, 0, m, 64), c0: P2 = [0, 0];', 'const rotund = cerc(0, 0, m - 0.4, 64), c0: P2 = [0, 0];', 'unghi',
  'butucul e mai subțire decât brațele')
o('U13', LG, 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'a0 = e.lamajD / 2 - 0.4, a1 = s / 2, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'unghi',
  'umărul brațului intră în lamajul butucului')
o('U14', LG, 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2 + 1, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'unghi',
  'manșonul e mai puțin adânc cu 1 mm')
o('U15', LG, 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2 - 1, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'unghi',
  'manșonul trece de fundul lui, spre gaura butucului')
o('U16', LG, 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];', 'a0 = e.lamajD / 2 + 0.2, a1 = s / 2, a2 = 1.5 * s, tri: Tri[] = [], avert: string[] = [];', 'unghi',
  'gura brațului nu mai e trasă cu 0,1')
o('U17', LG, 'const ub = 0.2, t1 = Math.acos(ub / a0)', 'const ub = 0, t1 = Math.acos(ub / a0)', 'unghi',
  'colțul umărului cade pe un vârf al butucului: două corpuri își împart o muchie')
o('U18', LG, 'umar: Poli = [[ub, -m], [a1 + 0.01, -m], [a1 + 0.01, m], [ub, m]];', 'umar: Poli = [[ub, -m], [a1 - 0.5, -m], [a1 - 0.5, m], [ub, m]];', 'unghi',
  'umărul nu ajunge la manșon: brațul e desprins')
o('U19', LG, 'umar: Poli = [[ub, -m], [a1 + 0.01, -m], [a1 + 0.01, m], [ub, m]];', 'umar: Poli = [[2.6, -m], [a1 + 0.01, -m], [a1 + 0.01, m], [2.6, m]];', 'unghi',
  'umărul pornește târziu: rămân crestături între butuc și braț')
o('U20', LG, 'const corp = fel === "x" ? inel(ext, cruce(0, m, e.axGauraD, e.axGauraLat), ct, a1, a2)', 'const corp = fel === "r" ? inel(ext, cruce(0, m, e.axGauraD, e.axGauraLat), ct, a1, a2)', 'unghi',
  'manșoanele de ax și de știft sunt încurcate')
o('U21', LG, 'const corp = fel === "x" ? inel(ext, cruce(0, m, e.axGauraD, e.axGauraLat), ct, a1, a2)', 'const corp = fel === "x" ? inel(ext, cruce(0, m + 0.5, e.axGauraD, e.axGauraLat), ct, a1, a2)', 'unghi',
  'crucea manșonului nu e la mijlocul grosimii')
o('U22', LG, ': [...inel(ext, cerc(0, m, e.gauraD / 2), ct, a1, a2 - h + 0.01), ...inel(ext, cerc(0, m, e.lamajD / 2), ct, a2 - h, a2)];',
  ': [...inel(ext, cerc(0, m, e.gauraD / 2), ct, a1, a2 - h + 0.01), ...inel(ext, cerc(0, m, e.gauraD / 2), ct, a2 - h, a2)];', 'unghi',
  'manșonul de știft n-are lamaj la gură')
o('U23', LG, ': [...inel(ext, cerc(0, m, e.gauraD / 2), ct, a1, a2 - h + 0.01), ...inel(ext, cerc(0, m, e.lamajD / 2), ct, a2 - h, a2)];',
  ': [...inel(ext, cerc(0, m, e.lamajD / 2), ct, a1, a2 - h + 0.01), ...inel(ext, cerc(0, m, e.lamajD / 2), ct, a2 - h, a2)];', 'unghi',
  'manșonul de știft e cât lamajul, pe toată adâncimea')
o('U24', LG, 'tri.push(...axe(corp, ([v, w, u]) => [u * co - v * si, u * si + v * co, w], false));', 'tri.push(...axe(corp, ([v, w, u]) => [u * co + v * si, u * si - v * co, w], false));', 'unghi',
  'manșonul e oglindit: plasa lui e pe dos')
o('U25', LG, 'const co = Math.cos(ung * Math.PI / 180), si = Math.sin(ung * Math.PI / 180);', 'const co = Math.cos(ung), si = Math.sin(ung);', 'unghi',
  'unghiul e luat în radiani')
o('U26', LG, 'tri.push(...axe(prisma(umar, 0, g), ([x, y, z]) => [x * co - y * si, x * si + y * co, z], false));', 'tri.push(...axe(prisma(umar, 0, g), ([x, y, z]) => [x, y, z], false));', 'unghi',
  'umerii stau toți pe primul braț')
o('U27', LG, 'const cerute = (Array.isArray(mansoane) ? mansoane : []).filter((b): b is readonly [number, string] => Array.isArray(b) && Number.isFinite(b[0]));',
  'const cerute = (Array.isArray(mansoane) ? mansoane : []).filter((b): b is readonly [number, string] => Array.isArray(b));', 'unghi',
  'un unghi care nu e număr nu mai e aruncat')

# --- motorul: axul cu opritor
o('P01', LG, 'if (!opritor) return { tri: axe(prisma(sec, 0, L), ([u, v, w]) => [w, u, v], false), avert: [], prinderi: [capat(0, L), capat(L, 0)] };',
  'if (opritor) return { tri: axe(prisma(sec, 0, L), ([u, v, w]) => [w, u, v], false), avert: [], prinderi: [capat(0, L), capat(L, 0)] };', 'opritor',
  'opritorul e pe dos: îl are axul simplu')
o('P02', LG, 'const rg = P.guler_d / 2, lo = 1, x0 = Math.sqrt(', 'const rg = P.guler_d / 2, lo = 2, x0 = Math.sqrt(', 'opritor',
  'opritorul e gros de 2 mm')
o('P03', LG, 'const rg = P.guler_d / 2, lo = 1, x0 = Math.sqrt(', 'const rg = P.guler_d / 2 + 0.5, lo = 1, x0 = Math.sqrt(', 'opritor',
  'opritorul e mai mare decât lamajul găurii')
o('P04', LG, '...axe(prisma(disc, L - lo, L), f, false)], avert: [], prinderi: [capat(L - lo, 0)] };', '...axe(prisma(disc, L, L + lo), f, false)], avert: [], prinderi: [capat(L - lo, 0)] };', 'opritor',
  'opritorul lungește axul')
o('P05', LG, 'if (w > 1e-9) disc.push([d / 2 + rg * Math.cos(t), w]); }', 'if (w > -9) disc.push([d / 2 + rg * Math.cos(t), w]); }', 'opritor',
  'discul nu mai e tăiat de masă')
o('P06', LG, 'for (let i = -15; i <= 47; i++) { const t = Math.PI * i / 32', 'for (let i = 0; i <= 32; i++) { const t = Math.PI * i / 32', 'opritor',
  'discul e teșit sub axă (lipsesc colțurile dintre masă și mijloc)')
o('P07', LG, 'return { tri: [...axe(prisma(sec, 0, L - lo + 0.01), f, false),', 'return { tri: [...axe(prisma(sec, 0, L - lo - 0.5), f, false),', 'opritor',
  'crucea axului nu ajunge la disc')
o('P08', LG, 'if (w > 1e-9) disc.push([d / 2 + rg * Math.cos(t), w]); }', 'if (w > 1e-9) disc.push([d / 2 + 1 + rg * Math.cos(t), w]); }', 'opritor',
  'discul nu e pe axa axului')

# --- motorul: știftul cu bucșă
o('B01', LG, 'cuAx = capat === "ax", cuBucsa = capat === "bucsa";', 'cuAx = capat === "ax", cuBucsa = capat === "bucșa";', 'opritor',
  'motorul nu știe capătul „bucsa”')
o('B02', LG, 'const rb = P.bucsa_d / 2;\n      tri.push(...axe(prisma(d(r, -rg, rg), lf ? lf - 0.01 : 0, xg + 0.01), f, false)', 'const rb = P.bucsa_d / 2 - 0.5;\n      tri.push(...axe(prisma(d(r, -rg, rg), lf ? lf - 0.01 : 0, xg + 0.01), f, false)', 'opritor',
  'bucșa e mai subțire')
o('B03', LG, '...axe(prisma(d(rb, -rb, rb), xg, L), f, false));', '...axe(prisma(d(rb, -rb, rb), xg + 2, L), f, false));', 'opritor',
  'bucșa începe la 2 mm după locul ei')
o('B04', LG, '...axe(prisma(d(rb, -rb, rb), xg, L), f, false));', '...axe(prisma(d(rb, -rb, rb), xg - 2, L), f, false));', 'opritor',
  'bucșa intră peste partea de știft')
o('B05', LG, 'tri.push(...axe(prisma(d(r, -rg, rg), lf ? lf - 0.01 : 0, xg + 0.01), f, false)', 'tri.push(...axe(prisma(d(r, -rg, rg), lf - 0.01, xg + 0.01), f, false)', 'opritor',
  'știftul fără fantă iese mai lung cu 0,01')
o('B06', LG, 'tri.push(...axe(prisma(d(r, -rg, rg), lf ? lf - 0.01 : 0, xg + 0.01), f, false)', 'tri.push(...axe(prisma(d(rg, -rg, rg), lf ? lf - 0.01 : 0, xg + 0.01), f, false)', 'opritor',
  'partea de știft e groasă cât gulerul')
o('B07', LG, 'for (const [w0, w1] of (cuAx || cuBucsa ? [[0, lf]] : [[0, lf], [L - lf, L]]) as P2[]) if (lf)', 'for (const [w0, w1] of (cuAx || cuBucsa ? [[0, 2]] : [[0, lf], [L - lf, L]]) as P2[]) if (lf)', 'opritor',
  'capătul cu fantă e scurt: rămâne un gol între el și corp')

# --- tabelele atelierului (probele unitare ale familiilor, desenelor și englezei)
o('T01', AT, '["conector", "Conector perpendicular"], ["conectorUnghi", "Conector în unghi"], ["clema", "Clemă"]', '["conector", "Conector perpendicular"], ["clema", "Clemă"]', 'tabele',
  'piesa nu e în nicio familie')
o('T02', AT, '    conectorUnghi: `<circle cx="10" cy="15" r="2.8"/>', '    conectorUnghiVechi: `<circle cx="10" cy="15" r="2.8"/>', 'tabele',
  'piesa n-are desenul ei')
o('T03', EN, ' "Brațul {0}:": "Arm {0}:",\n', ' "Brațul {0}:": "",\n', 'tabele',
  'un text al configuratorului n-are traducere')

# --- atelierul: configuratorul conectorului în unghi
o('E01', AT, 'conectorUnghi: { mansoane: [[0, "x"], [135, "x"]] as [number, string][], butuc: "r" },', 'conectorUnghi: { mansoane: [[0, "x"], [90, "x"]] as [number, string][], butuc: "r" },', 'e2e',
  'piesa implicită din atelier e cotul de 90°')
o('E02', AT, '["3", "Nr. 3 (157,5°)", [0, 157.5]]', '["3", "Nr. 3 (157,5°)", [0, 150]]', 'e2e',
  'forma nr. 3 are alt unghi decât scrie pe ea')
o('E03', AT, '["y", "Y", [0, 120, 240]]', '["y", "Y", [0, 110, 240]]', 'e2e',
  'Y-ul nu e simetric')
o('E04', AT, '["t", "T", [0, 90, 180]], ["cruce", "Cruce", [0, 90, 180, 270]]', '["t", "T", [0, 90, 180]], ["cruce", "Cruce", [0, 90, 180]]', 'e2e',
  'crucea are doar trei brațe')
o('E05', AT, 'map(([u, f], k) => (k ? `${fel(f)} ${fmt(u)}°` : fel(f)));', 'map(([, f]) => fel(f));', 'e2e',
  'numele piesei nu-și spune unghiurile (două forme diferite, același nume și același fișier)')
o('E06', AT, 'const fel = (f: string) => (f === "r" ? tr("știft", "pin") : tr("ax"));\n      const brate = mansoaneUnghi(', 'const fel = (f: string) => (f === "x" ? tr("știft", "pin") : tr("ax"));\n      const brate = mansoaneUnghi(', 'e2e',
  'numele piesei încurcă știftul cu axul')
o('E07', AT, '(d.butuc === "x" ? tr(", butuc de ax") : d.butuc === "p" ? tr(", butuc plin") : "");', '(d.butuc === "x" ? tr(", butuc plin") : d.butuc === "p" ? tr(", butuc de ax") : "");', 'e2e',
  'numele piesei încurcă butucii')
o('E08', AT, '[m[k - 1]![0] + 90, n === 2 ? 180 : 360 - 90 * (n - k)];', '[m[k - 1]![0] + 90, n === 2 ? 270 : 360 - 90 * (n - k)];', 'e2e',
  'cu două brațe, unghiul trece de 180°')
o('E09', AT, '[m[k - 1]![0] + 90, n === 2 ? 180 : 360 - 90 * (n - k)];', '[m[k - 1]![0] + 45, n === 2 ? 180 : 360 - 90 * (n - k)];', 'e2e',
  'marginea de jos a unghiului e la 45° de vecin')
o('E10', AT, 'if (!(v >= a && v <= b)) { editor(); return; }', 'if (!(v <= b)) { editor(); return; }', 'e2e',
  'un unghi sub marginea de jos e primit (și câmpul golit, care e 0)')
o('E11', AT, 'if (!(v >= a && v <= b)) { editor(); return; }', 'if (!(v >= a)) { editor(); return; }', 'e2e',
  'un unghi peste marginea de sus e primit')
o('E12', AT, 'for (let i = k + 1; i < n; i++) nou[i]![0] = Math.max(nou[i]![0], nou[i - 1]![0] + 90);', 'for (let i = k + 1; i < 0; i++) nou[i]![0] = Math.max(nou[i]![0], nou[i - 1]![0] + 90);', 'e2e',
  'un braț mutat nu-i mai împinge pe următorii (cel de după dispare)')
o('E13', AT, '[0, m[1]![0], m[1]![0] + 90]', '[0, m[1]![0], m[1]![0] + 100]', 'e2e',
  'al treilea braț vine la 100° după al doilea')
o('E14', AT, 'n >= 2 && m[1]![0] <= 180 ? m[1]![0] : 135]', 'n >= 2 && m[1]![0] <= 180 ? m[1]![0] : 90]', 'e2e',
  'de la un braț la două, al doilea vine la 90°')
o('E15', AT, 'if (f) pune(f[2].map((u, k): [number, string] => [u, m[k] ? m[k]![1] : "x"])); };', 'if (f) pune(f[2].map((u): [number, string] => [u, "x"])); };', 'e2e',
  'o formă gata șterge manșoanele alese')
o('E16', AT, 'if (b) pune(cuBrate(+b.dataset.v!).map((u, k): [number, string] => [u, m[k] ? m[k]![1] : "x"])); };', 'if (b) pune(cuBrate(+b.dataset.v!).map((u): [number, string] => [u, "x"])); };', 'e2e',
  'alt număr de brațe șterge manșoanele alese')
o('E17', AT, 'pune(m.map(([u, f], i): [number, string] => [u, i === +g[1]! ? b.dataset.v! : f]));', 'pune(m.map(([u]): [number, string] => [u, b.dataset.v!]));', 'e2e',
  'manșonul ales la un braț se pune la toate')
o('E18', AT, '$("#at-cu-butuc").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.butuc = b.dataset.v!; editor(); schimbat(); };',
  '$("#at-cu-butuc").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.butuc = "x"; editor(); schimbat(); };', 'e2e',
  'butucul rămâne de ax, orice s-ar alege')
o('E19', AT, 'gata = CONECTORI_UNGHI.find(([, , u]) => u.join() === m.map(b => b[0]).join());', 'gata = CONECTORI_UNGHI.find(([, , u]) => u.length === m.length);', 'e2e',
  '„Repede” arată apăsată o formă gata și la un unghi scris de mână')
o('E20', AT, '${margini(k)[0] === margini(k)[1] ? " disabled" : ""}', '${""}', 'e2e',
  'la cruce, unghiurile par că se pot schimba')
o('E21', AT, 'for (const b of rotite) if (out.every(([v]) => Math.abs(((b[0] - v) % 360 + 540) % 360 - 180) >= 90 - 1e-6)) out.push(b);', 'for (const b of rotite) out.push(b);', 'e2e',
  'atelierul ține un braț pe care motorul îl lasă afară')
o('E22', AT, 'const rotite = cerute.map(([u, f]): [number, string] => [Math.round((((u - u0) % 360) + 360) % 360 * 10) / 10 % 360, f === "r" ? "r" : "x"])',
  'const rotite = cerute.map(([u, f]): [number, string] => [Math.round((((u - 0) % 360) + 360) % 360 * 10) / 10 % 360, f === "r" ? "r" : "x"])', 'e2e',
  'primul braț al unei piese din stocare nu e adus la 0°')
o('E23', AT, 'const rotite = cerute.map(([u, f]): [number, string] => [Math.round((((u - u0) % 360) + 360) % 360 * 10) / 10 % 360, f === "r" ? "r" : "x"])',
  'const rotite = cerute.map(([u, f]): [number, string] => [Math.round((((u - u0) % 360) + 360) % 360 * 10) / 10 % 360, f])', 'e2e',
  'un fel necunoscut din stocare rămâne în configurator (niciun manșon ales)')
o('E24', AT, 'seg("at-cu-butuc", [["r", "Știft"], ["x", "Ax"], ["p", "Plin"]], p.butuc === "x" || p.butuc === "p" ? p.butuc : "r")',
  'seg("at-cu-butuc", [["r", "Știft"], ["x", "Ax"], ["p", "Plin"]], p.butuc)', 'e2e',
  'un butuc necunoscut din stocare rămâne în configurator (niciun butuc ales)')

# --- atelierul: axul cu opritor și știftul cu bucșă
o('E30', AT, '(d.opritor ? tr(" cu opritor") : "");', '(d.opritor ? "" : "");', 'e2e',
  'numele axului nu-și spune opritorul (același nume și același fișier ca axul simplu)')
o('E31', AT, 'if (t === "ax" && !p.opritor) delete p.opritor;', 'if (t === "ax" && p.opritor === 7) delete p.opritor;', 'e2e',
  'axul debifat nu mai e același cu axul din listă')
o('E32', AT, '$("#at-a-opritor").onchange = ev => { p.opritor = (ev.target as HTMLInputElement).checked; schimbat(); };', '$("#at-a-opritor").onchange = () => { p.opritor = true; schimbat(); };', 'e2e',
  'opritorul nu se mai poate scoate')
o('E33', AT, 'id="at-a-opritor" ${p.opritor ? "checked" : ""}>', 'id="at-a-opritor" checked>', 'e2e',
  'bifa opritorului apare pusă pe axul simplu')
o('E34', AT, 'if (p.capat !== "ax" && p.capat !== "bucsa") delete p.capat; }', 'if (p.capat !== "ax") delete p.capat; }', 'e2e',
  'capătul „Bucșă” se pierde: iese știftul obișnuit')
o('E35', AT, 'd.capat === "bucsa" ? tr("Știft cu bucșă") : tr("Știft Technic")', 'd.capat === "bucșa" ? tr("Știft cu bucșă") : tr("Știft Technic")', 'e2e',
  'numele știftului cu bucșă e al știftului obișnuit')
o('E36', AT, '[["stift", "Știft"], ["ax", "Ax"], ["bucsa", "Bucșă"]]', '[["stift", "Știft"], ["ax", "Ax"]]', 'e2e',
  'capătul „Bucșă” nu se poate alege')

SETURI = {
    'unghi': ['test/unit/trenulet.unghi.test.ts'],
    'opritor': ['test/unit/trenulet.opritor.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.unghi.spec.ts']
