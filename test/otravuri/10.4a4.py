# Lista de otrăvuri a feliei 10.4↑a-4 (panoul cotei, lista, ochiul, „Arată cotele”, cotele foilor vecine; ADR 0330 §5),
# 24.11.2026, alese de autor: funcțiile pure ale panoului (Dezleagă, textul, distanța, starea), foile ascunse, setarea foilor
# vecine și comutarea „Cotele pe pânză”, apoi legăturile din interfață (prinse de e2e: rândurile listei, ochiul, foile vecine,
# cererea listei, panoul, acțiunile lui, „Arată cotele”).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


C = 'src/model/cote.ts'
V = 'src/ui/coteVedere.ts'
S = 'src/app/setariCote.ts'
U = 'src/app/Cote.tsx'

# Partea pură.
o('P01', C, '      const { legatura: _, ...rest } = structuredClone(a);', '      const rest = structuredClone(a);', 'panou', '„Dezleagă” păstrează legătura')
o('P02', C, '      const p = puncte[k]?.p ?? { x: a.x, y: a.y };', '      const p = { x: a.x, y: a.y };', 'panou', 'dezlegată la punctul de la punere, nu la cel citit')
o('P03', C, "  return t === '' || t === '<>' ? fara : { ...fara, text };", "  return t === '' ? fara : { ...fara, text };", 'panou', 'textul „<>” se ține')
o('P04', C, '  const t = text.trim();', '  const t = text;', 'panou', 'un text doar din spații se ține')
o('P05', C, '  return { ...structuredClone(c), linie: { ...structuredClone(c.linie ?? { d: 0 }), d } };', '  return { ...structuredClone(c), linie: { d } };', 'panou',
  'distanța pierde restul liniei')
o('P06', C, "  if (d) return { stare: 'dezlegata', motiv: d.motiv ?? null };", "  if (d) return { stare: 'dezlegata', motiv: null };", 'panou', 'dezlegată fără motiv')
o('P07', C, "  return { stare: puncte.some((p) => p.stare === 'legata') ? 'legata' : 'libera', motiv: null };",
  "  return { stare: puncte.every((p) => p.stare === 'legata') ? 'legata' : 'libera', motiv: null };", 'panou', 'legată doar cu ambele capete legate')
o('P08', V, "    return new Set(Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);",
  "    return new Set(Array.isArray(x) ? (x as string[]) : []);", 'panou', 'foile ascunse primesc și numere')
o('P09', S, "      vecine: unul(c['vecine'], ['estompate', 'ascunse'], I.comportament.vecine),", '      vecine: I.comportament.vecine,', 'setari',
  '„Cotele foilor vecine” nu se citește')
o('P10', S, '  schimbaSetariCote({ ...s, comportament: { ...s.comportament, pePanza: !s.comportament.pePanza } });',
  '  schimbaSetariCote({ ...s, comportament: { ...s.comportament, pePanza: s.comportament.pePanza } });', 'setari', '„Arată cotele” nu comută')
# Interfața (e2e).
o('E01', U, '    publicaRanduri(idFoaie, toate.map((d) => ({ id: d.cota.id, fel: d.cota.fel, cifra: d.text, dezlegata: d.dezlegata })));',
  '    publicaRanduri(idFoaie, toate.map((d) => ({ id: d.cota.id, fel: d.cota.fel, cifra: d.cota.fel, dezlegata: d.dezlegata })));', 'e2e', 'lista fără cifră')
o('E02', U, '  const vizibile = unealta || (setari.comportament.pePanza && !ascunse.has(idFoaie));', '  const vizibile = unealta || setari.comportament.pePanza;', 'e2e',
  'ochiul nu ascunde')
o('E03', U, '      return [{ foaie: f.id, dx: (locuri[k] ?? 0) - x0, desene }];', '      return [{ foaie: f.id, dx: 0, desene }];', 'e2e',
  'cotele foii vecine peste foaia activă')
o('E04', U, "    if (!toateFoile || doc.foi.length < 2 || setari.comportament.vecine === 'ascunse' || !setari.comportament.pePanza) return [];",
  '    if (!toateFoile || doc.foi.length < 2 || !setari.comportament.pePanza) return [];', 'e2e', '„ascunse” nu ascunde foile vecine')
o('E05', 'src/app/Editare.tsx', ' || (p.toateFoile === true && doc.foi.some((f) => (f.cote?.length ?? 0) > 0))', '', 'e2e',
  'foaia activă fără cote nu arată cotele vecinelor')
o('E06', 'src/app/Editare.tsx', "  useEffect(() => laCerereaListei(() => { if (!p.doarCitire) pornesteCoteRef.current('d'); }), [p.doarCitire]);",
  '  useEffect(() => laCerereaListei(() => undefined), [p.doarCitire]);', 'e2e', 'lista nu trece la unealta Cote')
o('E07', 'src/app/PanouProprietati.tsx', '  if (cotaPanou && foaie && cotaPanou.foaie === foaie.id) {', '  if (cotaPanou && foaie && false) {', 'e2e', 'panoul nu arată cota')
o('E08', U, '        dezleaga: () => scrie((c) => cotaDezlegata(c, d.puncte)),', '        dezleaga: () => scrie((c) => c),', 'e2e', '„Dezleagă” nu face nimic')
o('E09', U, '        text: (t) => scrie((c) => cotaCuText(c, t)),', '        text: () => scrie((c) => c),', 'e2e', 'textul din panou nu se scrie')
o('E10', U, '        distanta: (x) => scrie((c) => cotaCuDistanta(c, x)),', '        distanta: (x) => scrie((c) => cotaCuDistanta(c, -x)),', 'e2e',
  'distanța cu semnul întors')
o('E11', 'src/ui/ListaCote.tsx', '                title={t(\'editare.cote.lista.alege\')} onClick={() => { cereCota(foaie, r.id); }}>',
  '                title={t(\'editare.cote.lista.alege\')} onClick={() => undefined}>', 'e2e', 'rândul listei nu alege cota')
o('E12', 'src/app/App.tsx', "    cote: () => { void import('./setariCote.ts').then((m) => { m.comutaPePanza(); }, () => undefined); },",
  '    cote: () => undefined,', 'e2e', '„Arată cotele” nu face nimic')
o('E13', 'src/ui/ListaVectori.tsx', '          {f.activa && (f.cote ?? 0) > 0 ? <Suspense', '          {false ? <Suspense', 'e2e', 'lista fără rândul cotelor')
o('E14', U, "        {vecine.map((v) => (\n          <g key={`v${v.foaie}`} className=\"cote-vecine\" data-foaie={v.foaie}>",
  "        {vecine.map((v) => (\n          <g key={`v${v.foaie}`} className=\"\" data-foaie={v.foaie}>", 'e2e', 'cotele vecine neestompate')
o('E15', 'src/app/PanouCota.tsx', '    const text = textNumar(cota.valoare, virgula);', "    const text = 'x';", 'e2e', 'Copiază pune altceva în clipboard')

SETURI = {
    'panou': ['test/unit/cote.panou.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
}
E2E = ['test/e2e/cote.panou.spec.ts']
