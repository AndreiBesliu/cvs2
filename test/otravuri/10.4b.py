# Lista de otrăvuri a feliei 10.4↑b (raza, diametrul, unghiul, cu setările lor; inch în fracții; ADR 0330 §4, §6),
# 24.11.2026, alese de autor: desenul pur (raza, diametrul, unghiul, extensiile, săgețile, cifra, alegerea pe arc, calea SVG),
# cifrele (fracțiile, unghiul zecimal și în grade-minute-secunde, prefixele), setările noi, apoi unealta, panoul și fereastra
# Setări (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/model/desenCota.ts'
S = 'src/app/setariCote.ts'
U = 'src/app/Cote.tsx'

# Desenul razei și al diametrului.
o('P01', D, "(afara ? 'afara' : 'centru') : s.raza;", "(afara ? 'centru' : 'afara') : s.raza;", 'cerc', 'după loc, invers')
o('P02', D, '    tm = r + Math.max(d, s.capat + gol + w / 2);', '    tm = r + Math.max(d, gol + w / 2);', 'cerc', 'din afară, cifra peste săgeată')
o('P03', D, '    cap = capete(capatIn(p, minus, s));', '    cap = capete(capatIn(p, u, s));', 'cerc', 'din centru, săgeata întoarsă')
o('P04', D, '    tm = afara ? r + Math.max(d, gol + w / 2) : intre(r + d, -lim, lim, 0);', '    tm = afara ? r + Math.max(d, gol + w / 2) : r + d;', 'cerc',
  'diametrul, cifra înăuntru neoprită')
o('P05', D, '  t1 = Math.max(r, tm + w / 2);', '  t1 = r;', 'cerc', 'linia nu trece pe sub cifra de afară')
o('P06', D, '  return ((cursor.x - c.x) * (p.x - c.x) + (cursor.y - c.y) * (p.y - c.y)) / r - r;',
  '  return ((cursor.x - c.x) * (p.x - c.x) + (cursor.y - c.y) * (p.y - c.y)) / r;', 'cerc', 'locul cifrei din centru, nu din cerc')
# Unghiul.
o('P07', D, '  const tt = ((x.x - a.x) * e2.y - (x.y - a.y) * e2.x) / cr;', '  const tt = 0;', 'cerc', 'vârful din două laturi, la primul punct')
o('P08', D, '  if (Math.abs(cr) <= 1e-12 * l1 * l2) return null;', '', 'cerc', 'laturile paralele, cu vârf')
o('P09', D, "  return { d, s1: alfa < 0 ? -1 : 1, s2: beta < 0 ? -1 : 1 };", "  return { d, s1: 1, s2: beta < 0 ? -1 : 1 };", 'cerc',
  'sectorul fără semnul primei laturi')
o('P10', D, '  const deLa = d1.x * d2.y - d1.y * d2.x >= 0 ? d1 : d2;', '  const deLa = d1;', 'cerc', 'arcul pornește mereu de la prima latură')
o('P11', D, '      if (R > tmax + s.gol) extensii.push([plus(v, di, Math.max(tmax, 0) + s.gol), plus(v, di, R + s.depasire)]);',
  '      if (R > tmax + s.gol) extensii.push([plus(v, di, tmax + s.gol), plus(v, di, R + s.depasire)]);', 'cerc', 'extensia din spatele vârfului')
o('P12', D, '      else if (R < tmin - s.gol) extensii.push(', '      else if (false) extensii.push(', 'cerc', 'fără extensia până la latura de dincolo de arc')
o('P13', D, '  const inauntru = R * unghi >= 2 * s.capat;', '  const inauntru = true;', 'cerc', 'săgețile înăuntru și pe arcul scurt')
o('P14', D, '    pText = plus(v, dm, R + gol + (scalar(sus, dm) >= 0 ? 0 : h));', '    pText = plus(v, dm, R + gol);', 'cerc', 'cifra peste arc când „sus” e spre vârf')
o('P15', D, '    const jum = (w / 2 + gol) / R;', '    const jum = w / 2 + gol;', 'cerc', 'golul arcului în mm, nu în radiani')
o('P16', D, '  if (rel <= a.baleiaj) return Math.abs(', '  if (rel >= 0) return Math.abs(', 'cerc', 'alegerea pe tot cercul, nu doar pe arc')
o('P17', D, '  return `M${sx(p0.x)} ${sy(p0.y)} A${r} ${r} 0 ${a.baleiaj > Math.PI ? 1 : 0} 0 ${sx(p1.x)} ${sy(p1.y)}`;',
  '  return `M${sx(p0.x)} ${sy(p0.y)} A${r} ${r} 0 ${a.baleiaj > Math.PI ? 1 : 0} 1 ${sx(p1.x)} ${sy(p1.y)}`;', 'cerc', 'arcul SVG oglindit')
o('P18', D, "  if (c.fel === 'unghi') return p.length === 3 || p.length === 4 ? desenUnghi(", "  if (c.fel === 'unghi') return p.length === 3 ? desenUnghi(", 'cerc',
  'unghiul din două laturi nedesenat')
# Cifrele.
o('P19', D, '    const g = cmmdc(rest, n);', '    const g = 1;', 'cerc', 'fracția nesimplificată')
o('P20', D, '  return inch < 0 && unitati !== 0 ? `-${s}` : s;', '  return inch < 0 ? `-${s}` : s;', 'cerc', '„-0” în fracții')
o('P21', D, "  if (f.unitate === 'fractii') return fractii(mm / 25.4, f.fractie) + (f.cuUnitate ? SUFIX.fractii : '');",
  "  if (f.unitate === 'fractii') return fractii(mm / 25.4, f.fractie);", 'cerc', 'fracțiile fără unitate')
o('P22', D, '  const g = Math.floor(n / (3600 * k)), m = Math.floor((n - g * 3600 * k) / (60 * k)),',
  '  const g = Math.floor(n / (3600 * k)), m = Math.round((n - g * 3600 * k) / (60 * k)),', 'cerc', 'minutele rotunjite: „60′”')
o('P23', D, "  if (f.unghi === 'zecimale') return `${cuZecimale(Math.round(Math.abs(grade) * k) / k, z, f.zerouri, f.virgula)}°`;",
  "  if (f.unghi === 'zecimale') return `${cuZecimale(Math.round(Math.abs(grade) * k) / k, z, f.zerouri, false)}°`;", 'cerc', 'unghiul fără virgulă')
o('P24', D, "  return fel === 'raza' ? f.prefixR + c : fel === 'diametru' ? f.prefixD + c : c;",
  "  return fel === 'raza' ? f.prefixD + c : fel === 'diametru' ? f.prefixR + c : c;", 'cerc', 'prefixele schimbate între ele')
# Setările.
o('S01', S, "const prefix = (x: unknown, implicit: string): string => (typeof x === 'string' && [...x].length <= PREFIX_MAXIM ? x : implicit);",
  "const prefix = (x: unknown, implicit: string): string => (typeof x === 'string' && x.length <= PREFIX_MAXIM ? x : implicit);", 'setari',
  'prefixul numărat în unități UTF-16')
o('S02', S, "      fractie: (FRACTII_COTE as readonly unknown[]).includes(ci['fractie']) ? (ci['fractie'] as number) : I.cifre.fractie,",
  "      fractie: typeof ci['fractie'] === 'number' ? ci['fractie'] : I.cifre.fractie,", 'setari', 'orice numitor')
o('S03', S, '  zecimaleUnghi: [0, 4],', '  zecimaleUnghi: [0, 5],', 'setari', 'cinci zecimale la unghi')
o('S04', S, '  prefixD: s.raza.prefixD,', '  prefixD: s.raza.prefixR,', 'setari', 'diametrul cu prefixul razei')
o('S05', S, '  raza: s.raza.linia,', "  raza: 'loc',", 'setari', 'linia razei aleasă nu ajunge în desen')
o('S06', S, "export const GRUPURI_COTE = ['cifre', 'linii', 'raza', 'comportament', 'lipire', 'masurare'] as const",
  "export const GRUPURI_COTE = ['cifre', 'linii', 'comportament', 'lipire', 'masurare'] as const", 'setari', 'grupul fără „Înapoi la implicit”')
o('S07', S, "      linia: unul(ra['linia'], LINII_RAZEI, I.raza.linia),", '      linia: I.raza.linia,', 'setari', 'linia razei nu se citește')
# Unealta, panoul, Setările (e2e).
o('E01', U, "          setPuse({ ...NIMIC, fix: sub.intreg ? 'diametru' : 'raza', cerc: sub.cerc });",
  "          setPuse({ ...NIMIC, fix: 'raza', cerc: sub.cerc });", 'e2e', 'Automată pe cerc dă raza')
o('E02', U, '  return Math.abs(total - 2 * Math.PI) < 1e-6;', '  return false;', 'e2e', 'niciun contur nu e cerc')
o('E03', U, '    if (!cel || d < cel.d - 1e-12) cel = { q, d };', '    if (!cel) cel = { q, d };', 'e2e', 'primul punct de pe cerc, nu cel mai apropiat')
o('E04', U, "        else if (sub) setMotiv(t('editare.cote.motiv.arc'));", '        else if (sub) setMotiv(null);', 'e2e', 'raza pe o latură, fără motiv')
o('E05', U, '          if (sub?.fel === \'latura\' && a && b && (sub.id !== s.puse.latura.id || sub.k !== s.puse.latura.k)) {', '          if (false) {', 'e2e',
  'Automată nu face unghiul din a doua latură')
o('E06', U, "      if (Math.abs(e1.y) <= tol) return { capete: [a[0], b[0]], fix: 'verticala', latura: null, cerc: null };",
  "      if (Math.abs(e1.y) <= tol) return { capete: [a[0], b[0]], fix: 'aliniata', latura: null, cerc: null };", 'e2e',
  'laturile orizontale paralele, cu diagonala')
o('E07', U, '    return l ? { ...veche, ...l } : null;', '    return l ? { ...veche, d: l.d } : null;', 'e2e', 'sectorul ales nu se ține')
o('E08', U, "          setMotiv(t('editare.cote.motiv.paralele'));", '          setMotiv(null);', 'e2e', 'laturile paralele la Unghi, fără motiv')
o('E09', U, "  if (fel === 'raza' || fel === 'diametru') return 'editare.cote.sfat.cerc';", '', 'e2e', 'sfatul razei, al primului punct')
o('E10', U, '      {dc.arce.map((a, k) => <path key={`a${k}`} className="cota-linie cota-arc" d={caleArc(a, sx, sy, scara)} />)}', '', 'e2e',
  'arcul unghiului nedesenat')
o('E11', 'src/app/PanouCota.tsx', "  const eDistanta = t(cota.fel === 'unghi' ? 'prop.cota.distanta.unghi' : ",
  "  const eDistanta = t(cota.fel === 'nimic' ? 'prop.cota.distanta.unghi' : ", 'e2e', 'panoul spune „Distanța liniei” la unghi')
o('E12', U, '      } else dd = (dir[0] + dir[1]) * k;', '      } else dd = 0;', 'e2e', 'săgețile nu mută arcul')
o('E13', 'src/app/Setari.tsx', '        {fractii ? (\n          <Alegere id={`${id}-fractie`}', '        {false ? (\n          <Alegere id={`${id}-fractie`}', 'e2e',
  'fracția cea mai mică nu se poate alege')
o('E14', U, "  const text = valoare === null ? '' : textCota(c, cifraCota(c.fel, valoare, format));",
  "  const text = valoare === null ? '' : textCota(c, scrieCifra(valoare, format));", 'e2e', 'cifra pe pânză fără prefix și fără °')
o('E15', U, '        if (sub?.fel !== \'latura\' || !a || !b || (sub.id === s.puse.latura.id && sub.k === s.puse.latura.k)) return;',
  "        if (sub?.fel !== 'latura' || !a || !b) return;", 'e2e', 'aceeași latură, a doua oară: paralelă cu ea însăși')
o('E16', U, '        if (s.puse.capete.length > 0 || s.puse.cerc) { ia(); setPuse(NIMIC); setMotiv(null); return; }',
  '        if (s.puse.capete.length > 0) { ia(); setPuse(NIMIC); setMotiv(null); return; }', 'e2e', 'Esc nu renunță la cercul ales')
o('E17', 'src/app/Setari.tsx', '          valoare={s.raza.prefixR} maxim={PREFIX_MAXIM} la={(x) => { raza({ prefixR: x }); }} />',
  '          valoare={s.raza.prefixR} maxim={PREFIX_MAXIM} la={() => undefined} />', 'e2e', 'prefixul razei nu se scrie')
o('E18', 'src/app/Setari.tsx', "    cota: { id: 'u', fel: 'unghi', linie: { d: 40, s1: 1, s2: 1 } },",
  "    cota: { id: 'u', fel: 'unghi', linie: { d: 40, s1: -1, s2: 1 } },", 'e2e', 'cota de probă cu unghiul suplementar')

SETURI = {
    'cerc': ['test/unit/cote.cerc.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
}
E2E = ['test/e2e/cote.cerc.spec.ts']
