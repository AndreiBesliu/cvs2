# Lista de otrăvuri a feliei 10.3↑d (conversia: Arce, În cerc, În dreptunghi; ADR 0180 §8, §10, §11), 07.11.2026, alese de
# autor: arcele din linii (colțul, șirul, cel mult 180°), cercul (prin noduri, abaterea radială doar pe o formă care ocolește
# centrul, piciorul perpendicularei), dreptunghiul (unghiul, raza colțului, cercul care nu e dreptunghi, abaterea în ambele
# sensuri, găurirea), mărimea dată (centrul cutiei), ce se sare (căile deschise, piesele puse de mai multe ori, elementele
# întinse neuniform), toleranța în lume (scara elementului), numerele, acțiunea (documentul vechi, lotul) și patru legături din
# panou (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/conversie.ts'
C = 'src/ui/actiuniDocumentCalcul.ts'
P = 'src/app/PanouConversie.tsx'

# Arcele din linii.
o('V01', T, 'const COLT = Math.PI / 6;', 'const COLT = Math.PI / 2;', 'conversie', 'colțul de 40° se rotunjește (pragul de 90°)')
o('V02', T, 'const SIR_MAXIM = 256;', 'const SIR_MAXIM = 2;', 'conversie', 'arcele din linii au cel mult două laturi')
o('V03', T, '  if (!(baleiaj <= Math.PI + 1e-9) || baleiaj < 1e-9) return null;', '  if (baleiaj < 1e-9) return null;', 'conversie',
  'arcele trec de 180°')
# Cercul.
o('V04', T, '  if (!curbe) return c.varfuri.map((v) => v.p);\n', '', 'conversie', 'cercul nu mai trece prin noduri (eșantioane)')
o('V05', T, '  if (monoton && Math.abs(Math.abs(tot) - 2 * Math.PI) < 1e-6) return dev;', '  return dev;', 'conversie',
  'abaterea radială și pe o formă care nu ocolește centrul')
o('V06', T, '      if (t > 0 && t < 1) vezi({ x: g.a.x + dx * t, y: g.a.y + dy * t });', '', 'conversie',
  'abaterea liniilor doar la capete (fără piciorul perpendicularei)')
# Dreptunghiul.
o('V07', T, '  while (u > Math.PI / 4 + 1e-12) { [u0, v0, w, hh] = [-v0 - hh, u0, hh, w]; u -= Math.PI / 2; }',
  '  while (u > Math.PI / 4 + 1e-12) { [u0, v0, w, hh] = [u0, v0, hh, w]; u -= Math.PI / 2; }', 'conversie',
  'sfertul de tură schimbă laturile, dar nu și colțul de pornire')
o('V08', T, '  const raza = Math.min(lipsa / (Math.SQRT2 - 1), Math.min(w, hh) / 2);', '  const raza = Math.min(lipsa, Math.min(w, hh) / 2);',
  'conversie', 'raza colțului = cât lipsește colțul (fără 1 / (√2 − 1))')
o('V09', T, '  if (fit.latime - 2 * fit.raza <= c.toleranta && fit.inaltime - 2 * fit.raza <= c.toleranta) return nepotrivit(st, Infinity);',
  '  if (fit.latime - 2 * fit.raza <= c.toleranta || fit.inaltime - 2 * fit.raza <= c.toleranta) return nepotrivit(st, Infinity);',
  'conversie', 'o fantă (laturi drepte pe o singură axă) e refuzată ca un cerc')
o('V10', T, '  return a > peste ? a : Math.max(a, dinspre(B, A, Math.max(24, Math.ceil((4 * numarSegmente(A)) / Math.max(1, numarSegmente(B))))));',
  '  return a;', 'conversie', 'abaterea doar dinspre forma veche (un singur sens)')
o('V11', T, "  if (p.operatii.some((o) => o.tip === 'gaurire' && o.noduri.includes(nod.id))) {",
  "  if (p.operatii.some((o) => o.tip === 'gaurire' && !o.noduri.includes(nod.id))) {", 'conversie', 'găurirea nu mai oprește dreptunghiul')
# Mărimea dată.
o('V12', T, '  const mijloc = { x: (k.minX + k.maxX) / 2, y: (k.minY + k.maxY) / 2 };', '  const mijloc = { x: (k.minX + k.maxX) / 2, y: (k.minY + k.maxX) / 2 };',
  'conversie', 'centrul cutiei, greșit pe y')
# Ce se sare.
o('V13', T, '  if (!w.inchis || w.varfuri.length < 2) {', '  if (w.varfuri.length < 2) {', 'conversie', 'căile deschise devin cercuri și dreptunghiuri')
o('V14', T, '    if ((folosiri.get(p.id) ?? 0) > 1) {', '    if ((folosiri.get(p.id) ?? 0) > 2) {', 'conversie', 'o piesă pusă de două ori se convertește')
o('V15', T, '    if (!esteSimilitudine(e.matrice)) {', '    if (false) {', 'conversie', 'elementele întinse neuniform primesc arce')
# Toleranța în lume.
o('V16', T, '    const varfuri = arceCale(nod.forma, c.toleranta / scara, c.linii, st, scara);',
  '    const varfuri = arceCale(nod.forma, c.toleranta, c.linii, st, scara);', 'conversie', 'toleranța arcelor, în unitățile elementului')
o('V17', T, '      loc.abatere = Math.max(loc.abatere, abatere(cub, ch) * scara);', '      loc.abatere = Math.max(loc.abatere, abatere(cub, ch));',
  'conversie', 'abaterea spusă, în unitățile elementului')
o('V18', T, "  if (!(c.toleranta >= TOLERANTA_MINIMA && c.toleranta <= TOLERANTA_MAXIMA)) return { ok: false, motiv: 'toleranta' };\n", '',
  'conversie', 'toleranța în afara 0,001 … 1 mm nu se refuză')
o('V19', T, '    st.convertite += noi.size;', '    st.convertite += noi.size > 0 ? 1 : 0;', 'conversie', 'formele convertite, numărate pe piese')
# Acțiunea.
o('V20', C, "  if (c.doc !== h.doc) return { ok: false, motiv: 'editare.conversie.motiv.veche' };\n", '', 'conversie',
  'o conversie pe un desen vechi se aplică')
o('V21', C, "    comenzi.push({ tip: 'inlocuieste-piesa', vechi: v, nou: p });\n  }\n  const comanda: Comanda = comenzi.length === 1 ? (comenzi[0] as Comanda) : { tip: 'lot', comenzi };",
  "    comenzi.push({ tip: 'inlocuieste-piesa', vechi: v, nou: p });\n  }\n  const comanda: Comanda = comenzi[0] as Comanda;", 'conversie',
  'doar prima piesă schimbată se aplică')
# Panoul (e2e).
o('U01', P, "    ? (tc === null ? null : { fel: 'cerc', alese, toleranta: tc, diametru: null })",
  "    ? (tc === null ? null : { fel: 'cerc', alese, toleranta: TOLERANTA_MAXIMA, diametru: null })", 'e2e',
  'toleranța rândului „În cerc” nu ajunge la calcul')
o('U02', P, "    if (r.abatereMinima !== null) parti.push(t('editare.conversie.abatere-minima', { a: numar(r.abatereMinima, virgula) }));\n", '', 'e2e',
  'refuzul nu mai spune abaterea')
o('U03', P, "  const cerereArce: CerereConversie | null = ta === null ? null : { fel: 'arce', alese, toleranta: ta, linii };",
  "  const cerereArce: CerereConversie | null = ta === null ? null : { fel: 'arce', alese, toleranta: ta, linii: false };", 'e2e',
  'bifa „și liniile scurte” nu ajunge la calcul')
o('U04', P, '        const v = onConverteste({ doc: laCerere, piese: r.piese });', '        const v: RezultatActiune = { ok: true };', 'e2e',
  'panoul spune conversia, dar n-o aplică')
o('U05', P, "  useEffect(() => { if (stare) randStare.current?.scrollIntoView({ block: 'nearest' }); }, [stare]);\n", '', 'e2e',
  'rezultatul conversiei rămâne sub marginea panoului (verificarea pe canal)')
o('U06', 'src/app/PanouTaiere.tsx', "  useEffect(() => { if (stare) randStare.current?.scrollIntoView({ block: 'nearest' }); }, [stare]);\n", '', 'e2e',
  'rezultatul tăierii rămâne sub marginea panoului (verificarea pe canal)')

SETURI = {
    'conversie': ['test/unit/conversie.test.ts', 'test/unit/conversie.oracol.test.ts'],
    'conversie2': ['test/unit/conversie.test.ts', 'test/unit/conversie.oracol.test.ts', 'test/unit/actiuni.calcul.test.ts',
                   'test/unit/actiuni.calcul.paritate.test.ts', 'test/unit/taiere.test.ts', 'test/unit/manual.test.ts'],
}
E2E = ['test/e2e/conversie.spec.ts', 'test/e2e/taiere.spec.ts']
