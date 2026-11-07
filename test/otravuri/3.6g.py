# Lista de otrăvuri a feliei 3.6g (imprimanta 3D prin WiFi, ADR 0190), 07.11.2026, alese de autor: protocolul Creality (numerele
# ca text, firmware-ul, bătaia inimii, lucrarea fără fișier, eroarea, rezerva progresului, căile și numele, starea lucrării,
# comenzile), sesiunea (`ok`, citirile de la deschidere, comenzile doar legat, motivele, reîncercările și pauzele lor, închiderea
# de după pornire, un WebSocket vechi, jurnalul), imprimantele ținute și căutarea, plus cinci legături din fereastră (prin e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CR = 'src/machine/imprimanta/creality.ts'
SE = 'src/machine/imprimanta/sesiune.ts'
TI = 'src/machine/imprimanta/tinute.ts'
UI = 'src/app/PanouImprimanta.tsx'

# Protocolul (pur).
o('C01', CR, "/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?$/.test(v)", "/^-?\\d+(?:\\.\\d+)?$/.test(v)", 'creality', '„007” trece drept număr')
o('C02', CR, "=== 'printer sw ver'", "=== 'printer hw ver'", 'creality', 'firmware-ul e luat din versiunea plăcii')
o('C03', CR, "inima: r['ModeCode'] === 'heart_beat'", "inima: r['ModeCode'] === 'heartbeat'", 'creality', 'bătaia inimii nu se mai recunoaște')
o('C04', CR, "if (typeof v === 'string') stare[camp] = v.trim() === '' ? null : v;", "if (typeof v === 'string') stare[camp] = v;", 'creality',
  'un nume de fișier gol trece drept lucrare')
o('C05', CR, '    stare.eroare = cod === 0 ? null : cod;', '    stare.eroare = cod;', 'creality', 'codul 0 trece drept eroare')
o('C06', CR, '  if (stare.progres === undefined) {', '  if (false) {', 'creality', 'rezerva `dProgress` nu se mai citește')
o('C07', CR, '  if (!cale.startsWith(DIR_GCODE)) return null;\n', '', 'creality', 'o cale din afara directorului G-code se poate porni')
o('C08', CR, "if (rest.split('/').some((s) => s === '' || s === '.' || s === '..')) return null;", "if (rest.split('/').some((s) => s === '')) return null;",
  'creality', '`..` trece într-o cale')
o('C09', CR, "if (rest === '' || /[\\u0000-\\u001f\\u007f]/.test(rest)) return null;", "if (rest === '' || /[\\u0000-\\u0009]/.test(rest)) return null;",
  'creality', 'un capăt de linie trece într-o cale')
o('C10', CR, "/[/\\\\\\u0000-\\u001f\\u007f]/.test(nume)", "/[\\\\\\u0000-\\u001f\\u007f]/.test(nume)", 'creality', '`/` trece într-un nume')
o('C11', CR, '    const finalizare = (i.cod === 1 || i.cod === 5) && i.ramas !== null && i.ramas > 0;', '    const finalizare = false;', 'creality',
  '100 % cu timp rămas (K1C) trece drept gata')
o('C12', CR, '  if (i.autotest !== null && i.autotest >= 1 && i.autotest <= 99) return \'autotest\';', '  if (i.autotest !== null && i.autotest >= 1) return \'autotest\';',
  'creality', '`withSelfTest` 100 ține lucrarea în verificare')
o('C13', CR, "export const sePoatePorni = (s: StareLucrare): boolean => s === 'libera' || s === 'gata' || s === 'oprita';",
  "export const sePoatePorni = (s: StareLucrare): boolean => s !== 'imprima';", 'creality', 'pornirea e lăsată și în pauză sau la pregătire')
o('C14', CR, 'export const COMANDA_REIA = cerere(\'set\', { pause: 0 });', 'export const COMANDA_REIA = cerere(\'set\', { pause: 1 });', 'creality',
  'Reia trimite pauza')
o('C15', CR, "cerere('set', { opGcodeFile: `printprt:${c}` })", "cerere('set', { opGcodeFile: c })", 'creality', 'pornirea fără `printprt:`')
o('C16', CR, 'export const esteCreality = (c: Cadru): boolean => c.inima || Object.keys(c.stare).length > 0;',
  'export const esteCreality = (c: Cadru): boolean => c.inima;', 'creality', 'starea singură nu arată o imprimantă')

# Sesiunea.
o('S01', SE, '      if (c.inima) this.trimite(RASPUNS_INIMA);\n', '', 'sesiune', 'fără `ok` la bătaia inimii (imprimanta ar închide legătura)')
o('S02', SE, '      this.trimite(CERERE_STARE);\n      this.trimite(CERERE_FISIERE);\n', '      this.trimite(CERERE_STARE);\n', 'sesiune',
  'lista fișierelor nu se cere la deschidere')
o('S03', SE, "    return this.s.legatura === 'conectat' && this.trimite(t);", '    return this.trimite(t);', 'sesiune',
  'comenzile pleacă înainte ca imprimanta să fi răspuns')
o('S04', SE, "      this.ceasNou(() => { if (!raspunde) esec('tacut'); }, TIMP_PRIMUL_CADRU_MS);", "      this.ceasNou(() => { if (!raspunde) esec('retea-timp'); }, TIMP_PRIMUL_CADRU_MS);",
  'sesiune', 'ceva care tace e luat drept o adresă fără răspuns')
o('S05', SE, "      if (gata === null) { esec('retea-nedeschis'); return; }\n", '', 'sesiune',
  'o reîncercare judecă permisiunea (browserul aplicației o spune refuzată și spre loopback)')
o('S06', SE, '      const dupaPornire = this.pornitLa !== null && this.ceas.acum() - this.pornitLa <= TIMP_INCHIDERE_DUPA_PORNIRE_MS;',
  '      const dupaPornire = false;', 'sesiune', 'închiderea de după pornire trece drept legătură pierdută')
o('S07', SE, '    const ms = pauze[Math.min(this.s.incercari, pauze.length - 1)] ?? 30000;', '    const ms = pauze[0] ?? 1000;', 'sesiune',
  'reîncercările nu se răresc')
o('S08', SE, "      if (!aMea() || typeof e.data !== 'string') return;", "      if (typeof e.data !== 'string') return;", 'sesiune',
  'un WebSocket vechi schimbă starea')
o('S09', SE, '    this.pune({ ...this.s, jurnal: jurnal.length > MAX_JURNAL ? jurnal.slice(jurnal.length - MAX_JURNAL) : jurnal });',
  '    this.pune({ ...this.s, jurnal });', 'sesiune', 'jurnalul crește fără margine')
o('S10', SE, 'incercari: this.s.incercari + 1 });', 'incercari: this.s.incercari });', 'sesiune', 'încercările nu se numără')
o('S11', SE, "    const t = text.length > MAX_LINIE_JURNAL ? `${text.slice(0, MAX_LINIE_JURNAL)}… (+${text.length - MAX_LINIE_JURNAL})` : text;",
  '    const t = text;', 'sesiune', 'un cadru lung intră întreg în jurnal')

# Imprimantele ținute și căutarea.
o('T01', TI, "  if (typeof o !== 'object' || o === null || (o as { v?: unknown }).v !== 1) return [];", "  if (typeof o !== 'object' || o === null) return [];",
  'tinute', 'o listă de altă versiune se citește')
o('T02', TI, '    if (!adresaRetea(adresa, port).ok) continue;\n', '', 'tinute', 'o adresă publică rămâne ținută')
o('T03', TI, '    if (out.some((y) => y.id === id)) continue;\n', '', 'tinute', 'aceeași imprimantă de două ori în listă')
o('T04', TI, '    id, adresa: c.adresa.trim(), port: c.port, model: c.model ?? veche?.model ?? null, nume: c.nume ?? veche?.nume ?? null,',
  '    id, adresa: c.adresa.trim(), port: c.port, model: c.model, nume: c.nume,', 'tinute', 'numele știut se pierde la o legare fără el')
o('T05', TI, '  return [noua, ...l.filter((x) => x.id !== id)].slice(0, MAX_IMPRIMANTE);', '  return [noua, ...l.filter((x) => x.id !== id)].slice(0, MAX_IMPRIMANTE + 1);',
  'tinute', 'plafonul lasă o imprimantă în plus')
o('T06', TI, '    folosita: Math.max(acum, ...l.map((x) => x.folosita + 1)),', '    folosita: acum,', 'tinute', 'la aceeași oră, cea nouă nu urcă prima')
o('T07', TI, '      if (c.inima) ws.send(RASPUNS_INIMA);\n', '', 'tinute', 'proba nu răspunde la bătaia inimii')
o('T08', TI, '      if (c.inima && model === null && nume === null) {', '      if (false) {', 'tinute', 'proba nu așteaptă starea după bătaia inimii')
o('T09', TI, "  if (p === 'prompt' && total > 0) {", '  if (false) {', 'tinute', 'cu permisiunea neîntrebată, toate gazdele pleacă deodată')
o('T10', TI, "  return retele.length > 0 ? retele : ['192.168.0', '192.168.1'];", '  return retele;', 'tinute', 'fără IP-uri știute, nicio rețea căutată')

# Fereastra (e2e).
o('U01', UI, 'data-imprimanta="pornire-confirma" disabled={!patGol}', 'data-imprimanta="pornire-confirma" disabled={false}', 'e2e',
  'pornirea fără bifa „Patul e gol”')
o('U02', UI, "            onClick={() => { setConfirmare({ fel: 'oprire' }); }}>{t('imprimanta.opreste')}</button>",
  "            onClick={() => { sesiune.opresteImprimarea(); }}>{t('imprimanta.opreste')}</button>", 'e2e', 'Oprește fără confirmare')
o('U03', UI, '    tine((l) => tineImprimanta(l, { adresa: adresa.gazda, port: adresa.port, model, nume }, Date.now()));\n', '', 'e2e',
  'imprimanta legată nu se ține')
o('U04', UI, "disabled={!legata || !sePoatePauza(stare)} onClick={() => { sesiune.pauza(); }}", "disabled={!legata || !sePoatePauza(stare)} onClick={() => { sesiune.reia(); }}",
  'e2e', 'Pauză trimite reluarea')
o('U05', UI, "    if (!a.ok) { setRefuz(t(`imprimanta.refuz.${a.motiv}`)); return; }", '    if (!a.ok) { return; }', 'e2e',
  'o adresă refuzată nu spune de ce')
o('U06', UI, '  useEffect(() => { if (confirmare !== null && !rost) setConfirmare(null); }, [confirmare, rost]);\n', '', 'e2e',
  'confirmarea opririi reapare singură după ce legătura revine')

SETURI = {
    'creality': ['test/unit/imprimanta.creality.test.ts'],
    'sesiune': ['test/unit/imprimanta.sesiune.test.ts'],
    'tinute': ['test/unit/imprimanta.tinute.test.ts'],
    '2': ['test/unit/imprimanta.creality.test.ts', 'test/unit/imprimanta.sesiune.test.ts', 'test/unit/imprimanta.tinute.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
