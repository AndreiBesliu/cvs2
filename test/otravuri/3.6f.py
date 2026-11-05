# Lista de otrăvuri a feliei 3.6f (conectarea prin WiFi, mai ușoară, ADR 0136), 05.11.2026, alese de autor: conexiunile
# ținute (alegerile din 3.6d aduse, drumul, rețeaua, ordinea, plafonul), comenzile podului (escape-urile, lungimile, ce
# scoate podul din parametri, NOPASSWORD), cititorii răspunsurilor (ghilimelele, numărul comenzii, liniile GRBL dintre
# bucățile lui [ESP800], verdictul, lista rețelelor), căutarea (ordinea pe gazdă, ultimul IP, rețelele, planificarea),
# probele (ce primește un controler, închiderea, oprirea la un pod nepotrivit, ultimul IP, refuzurile podului) și trei
# legături din interfață (drumul unei mașini găsite, drumul direct ținut la pasul 1, rețeaua aleasă implicit).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CX = 'src/machine/conexiuni.ts'
SD = 'src/machine/sonde.ts'
UI = 'src/app/ConectareWifi.tsx'

# Conexiunile ținute.
o('K01', CX, '    return { conexiuni: c ? [c] : [], formular: f };', '    return { conexiuni: [], formular: f };', 'pur',
  'alegerile din 3.6d nu devin o conexiune')
o('K02', CX, "    drum: veche && c.drum === 'adresa' ? veche.drum : c.drum,", '    drum: c.drum,', 'pur',
  'o adresă scrisă de mână schimbă drumul unei conexiuni știute')
o('K03', CX, '    retea: c.retea ?? veche?.retea ?? null,', '    retea: c.retea ?? null,', 'pur', 'rețeaua știută se pierde la o legare fără ea')
o('K04', CX, '    folosita: Math.max(acum, (s.conexiuni[0]?.folosita ?? 0) + 1),', '    folosita: acum,', 'pur',
  'la aceeași oră, conexiunea nouă nu urcă prima')
o('K05', CX, '.sort((a, b) => b.folosita - a.folosita).slice(0, MAX_CONEXIUNI);', '.sort((a, b) => b.folosita - a.folosita).slice(0, MAX_CONEXIUNI + 1);',
  'pur', 'plafonul lasă o conexiune în plus')
o('K06', CX, '  for (const c of [...lista].sort((a, b) => b.folosita - a.folosita)) if (!unice.has(c.id)) unice.set(c.id, c);',
  '  for (const c of [...lista].sort((a, b) => a.folosita - b.folosita)) if (!unice.has(c.id)) unice.set(c.id, c);', 'pur',
  'din două intrări cu același id rămâne cea mai veche')
# Comenzile podului.
o('E01', CX, '.replace(/[\\s\\\\]/g,', '.replace(/[ ]/g,', 'pur', '\\ nu se mai scrie cu \\ în față')
o('E02', CX, '`[ESP${nr}]${valoare} json\\n`', '`[ESP${nr}]${valoare} json`', 'pur', 'comanda fără capăt de linie')
o('E03', CX, "  if (ssid.length > 32) return 'lunga';", "  if (ssid.length > 33) return 'lunga';", 'pur', 'SSID-ul de 33 de caractere trece')
o('E04', CX, 'const TIPARIBIL = /^[\\x20-\\x7e]*$/;', 'const TIPARIBIL = /^[\\x09-\\x7e]*$/;', 'pur', 'tabul trece în nume și parole')
o('E05', CX, "const rezervata = (v: string): boolean => v === 'json' || v.startsWith('json=') || v.startsWith('pwd=');",
  "const rezervata = (v: string): boolean => v.startsWith('json=') || v.startsWith('pwd=');", 'pur',
  'valoarea „json” trece (podul ar citi-o ca etichetă: o citire în loc de scriere)')
o('E06', CX, "  return rezervata(parola) || parola === 'NOPASSWORD' ? 'rezervata' : null;", "  return rezervata(parola) ? 'rezervata' : null;", 'pur',
  'parola „NOPASSWORD” trece (podul ar pune rețeaua fără parolă)')
o('E07', CX, "  if (parola.length < 8) return 'scurta';", "  if (parola.length < 7) return 'scurta';", 'pur', 'parola de 7 caractere trece')
o('E08', CX, "comandaEsp(101, c.parola === null ? 'NOPASSWORD' : cuEscape(c.parola))", "comandaEsp(101, cuEscape(c.parola ?? ''))", 'pur',
  'rețeaua liberă primește o parolă goală (citirea parolei, nu scrierea)')
# Răspunsurile podului.
o('R01', CX, "date.length >= 2 && date.startsWith('\"') && date.endsWith('\"') ? date.slice(1, -1) : date", 'date', 'pur',
  'datele răspunsului își păstrează ghilimelele')
o('R02', CX, '    if (!m || Number(m[1]) !== nr) continue;', '    if (!m || !(m[1] ?? \'\').startsWith(String(nr))) continue;', 'pur',
  'răspunsul unei comenzi cu alt număr (1050) e luat drept al lui 105')
o('R03', CX, '    if (intreMembri && !/[\\s",}]/.test(c)) {', '    if (!intreMembri && !/[\\s",}]/.test(c)) {', 'pur',
  'o linie GRBL dintre perechile lui [ESP800] nu se mai sare')
o('R04', CX, '      intreMembri = /^\\s*:/.test(text.slice(i, i + 8)) ? false : true;', '      intreMembri = true;', 'pur',
  'cheile se iau drept valori')
o('R05', CX, '    ip: ip !== null && esteIpv4(ip) ? ip : null,', '    ip,', 'pur', 'un IP nevalid al podului se ține')
o('R06', CX, '  if (!/^3\\.0(?:\\.|$)/.test(i.versiune)) return \'versiune\';', '  if (!/^3\\./.test(i.versiune)) return \'versiune\';', 'pur',
  'podul ESP3D 3.1 (alt socket de date) e primit')
o('R07', CX, "  return i.tinta === 'grbl' || i.tinta === 'grblhal' ? 'ok' : 'tinta';", "  return i.tinta !== 'marlin' ? 'ok' : 'tinta';", 'pur',
  'o țintă necunoscută (goală) e primită')
o('R08', CX, '    if (!veche || r.semnal > veche.semnal) dupaNume.set(r.ssid, r);', '    if (!veche) dupaNume.set(r.ssid, r);', 'pur',
  'o rețea văzută de două ori își ține primul semnal, nu pe cel mai bun')
o('R09', CX, '  const capat = linii.indexOf(\'End Scan\', start + 1);\n  if (capat < 0) return null;',
  '  const capat = linii.indexOf(\'End Scan\', start + 1);\n  if (capat < -1) return null;', 'pur', 'lista neîntreagă (fără End Scan) e luată')
o('R10', CX, "    if (!m || m[1] === '' || m[1] === undefined) continue;", '    if (!m || m[1] === undefined) continue;', 'pur',
  'o rețea ascunsă (fără nume) intră în listă')
# Căutarea.
o('S01', CX, ".sort((a, b) => Number(b.fel === 'esp3d') - Number(a.fel === 'esp3d'))", '.slice()', 'pur',
  'pe aceeași gazdă, controlerul de pe 81 poate veni înaintea podului')
o('S02', CX, '  for (const c of conexiuni) if (c.ultimIp) adauga(c.ultimIp, incercarePentru(c.profil, c.port));\n', '', 'pur',
  'ultimele IP-uri nu se mai caută')
o('S03', CX, '      if (ip === null || !esteIpv4(ip) || ip === IP_RETEA_PROPRIE) continue;', '      if (ip === null || !esteIpv4(ip)) continue;', 'pur',
  'rețeaua proprie a podului ține locul rețelelor obișnuite')
o('S04', CX, 'Array.from({ length: 254 },', 'Array.from({ length: 253 },', 'pur', 'ultima gazdă a rețelei (.254) nu se caută')
o('S05', CX, '    for (let k = 0; k < Math.max(1, opt.concurenta) && k < n; k++) porneste();',
  '    for (let k = 0; k <= Math.max(1, opt.concurenta) && k < n; k++) porneste();', 'pur', 'o încercare în plus deodată')
o('S06', CX, '      oprire.abort();\n      rezolva(r);', '      rezolva(r);', 'pur', 'găsită o mașină, celelalte încercări nu se opresc')
o('S07', CX, '.then((r) => r, () => null).then((r) => {', '.then((r) => {', 'pur', 'o încercare care aruncă oprește șirul')
o('S08', CX, '        opt.laProgres?.(terminate);\n', '', 'pur', 'progresul nu se mai spune')
# Probele.
o('D01', SD, '      await l.cere(Uint8Array.of(0x3f),', "      await l.cere(new TextEncoder().encode('?\\n'),", 'sonde',
  'un controler primește „?” cu capăt de linie (o linie, nu timpul real)')
o('D02', SD, '  } finally {\n    await l.inchide();\n  }', '  } finally {\n    void 0;\n  }', 'sonde', 'proba nu-și închide WebSocket-ul')
o('D03', SD, "    if (r.ok || r.motiv === 'retea-permisiune' || r.motiv === 'versiune' || r.motiv === 'tinta' || r.motiv === 'oprit') return r;",
  "    if (r.ok || r.motiv === 'retea-permisiune' || r.motiv === 'tinta' || r.motiv === 'oprit') return r;", 'sonde',
  'după un pod cu altă versiune, se încearcă și portul 81')
o('D04', SD, "        if (r.motiv === 'retea-nedeschis' || r.motiv === 'retea-timp' || r.motiv === 'tacut') { ultim = r.motiv; continue; }",
  "        if (r.motiv === 'retea-nedeschis' || r.motiv === 'tacut') { ultim = r.motiv; continue; }", 'sonde',
  'un nume care nu răspunde la timp nu mai lasă loc ultimului IP')
o('D05', SD, '      return { ok: true, transport, adresa: a.adresa, pod, prinIp: k > 0 };', '      return { ok: true, transport, adresa: a.adresa, pod, prinIp: false };',
  'sonde', 'legătura prin ultimul IP nu se spune')
o('D06', SD, "      if (!r.ok || r.date !== 'ok') throw new RefuzPod(c.nr, r.date);", '      if (!r.ok) throw new RefuzPod(c.nr, r.date);', 'sonde',
  'o citire (valoarea în loc de „ok”) trece drept scriere')
o('D07', SD, "        if (e instanceof Error && e.message === 'tacut') return 'necunoscut';\n", '', 'sonde',
  'trecerea fără răspuns și fără căderea legăturii trece drept făcută')
o('D08', SD, '    this.text = \'\';\n    return new Promise<T>(', '    return new Promise<T>(', 'sonde',
  'textul comenzii dinainte rămâne: un „ok” vechi răspunde comenzii noi')
o('D09', SD, '  const v = verdictPod(info);\n  if (v !== \'ok\') {', '  const v = verdictPod(info);\n  if (v === \'x\' as string) {', 'sonde',
  'asistentul lucrează și cu un pod nepotrivit')
# Interfața (e2e).
o('U01', UI, "  (pod?.mod === 'AP' || (pod?.mod !== 'STA' && adresa === IP_RETEA_PROPRIE) ? 'proprie' : 'atelier');",
  "  (pod?.mod === 'STA' || (pod?.mod !== 'AP' && adresa === IP_RETEA_PROPRIE) ? 'proprie' : 'atelier');", 'e2e',
  'mașina găsită în rețeaua atelierului e ținută ca drum direct')
o('U02', UI, "    tine((s) => tineConexiune(s, { profil: 'esp3d', adresa: a.adresa.gazda, port: a.adresa.port, drum: 'proprie', retea: nume }, Date.now()));\n",
  '', 'e2e', 'drumul direct, prin rețeaua podului, nu se ține la pasul 1')
o('U03', UI, "      setAlegere((x) => x ?? (v[0] ? { fel: 'vazuta', r: v[0] } : null));", '      setAlegere((x) => x);', 'e2e',
  'nicio rețea aleasă implicit (cea mai puternică)')

SETURI = {
    'pur': ['test/unit/conexiuni.test.ts'],
    'pur2': ['test/unit/conexiuni.test.ts', 'test/unit/sonde.test.ts'],
    'sonde': ['test/unit/sonde.test.ts'],
    'sonde2': ['test/unit/sonde.test.ts', 'test/unit/conexiuni.test.ts', 'test/unit/websocket.test.ts'],
}
E2E = ['test/e2e/masina-wifi-pod.spec.ts', 'test/e2e/masina-wifi.spec.ts']
