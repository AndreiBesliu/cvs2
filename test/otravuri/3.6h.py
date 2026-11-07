# Lista de otrăvuri a feliei 3.6h (trimiterea unui .gcode la imprimantă, ADR 0190 §C.7, §D), 07.11.2026, alese de autor:
# verificarea fișierului (antetele, temperaturile, miniatura, întinderea cu G90 / G91 / G92 / G28 și arcele, bucățile),
# trimiterea (numele, cererea exactă, verificarea în listă, oprirea), CSP-ul, plus zece legături din fereastră (prin e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


GC = 'src/machine/imprimanta/gcode3d.ts'
UR = 'src/machine/imprimanta/urcare.ts'
CSP = 'shared/csp.ts'
UI = 'src/app/PanouImprimanta.tsx'

# Verificarea fișierului (pură).
o('G01', GC, '? [300, 300, 300] : [220, 220, 250]', '? [220, 220, 250] : [220, 220, 250]', 'gcode', 'K1 Max primește patul K1C')
o('G02', GC, r'if (/^\d+(?:\.\d+)?$/.test(v)) return Number(v);', '', 'gcode', 'timpul Cura (secunde goale) nu se citește')
o('G03', GC, '{ d: 86400, h: 3600, m: 60, s: 1 }', '{ d: 86400, h: 3600, m: 60, s: 0 }', 'gcode', 'secundele nu se adună')
o('G04', GC, '(v !== undefined && v > 0 ? v : null)', '(v !== undefined ? v : null)', 'gcode', 'M104 S0 trece drept temperatură')
o('G05', GC, 'v > (pat[i] ?? 0) + EPS', 'v > (pat[i] ?? 0) - EPS', 'gcode', 'marginea patului trece drept ieșire')
o('G06', GC, 'if (iesire === null && (v < -EPS', 'if ((v < -EPS', 'gcode', 'ieșirea arătată e ultima, nu prima')
o('G07', GC, 'p[i] = abs ? (oi === null ? null : v + oi) : pi === null ? null : pi + v;', 'p[i] = oi === null ? null : v + oi;', 'gcode',
  'G91 ignorat: mișcările relative citite ca absolute')
o('G08', GC, 'o[i] = pi === null ? null : pi - v;', 'o[i] = 0;', 'gcode', 'G92 nu mută originea')
o('G09', GC, 'if (toate || par[x] !== undefined) { p[i] = null; o[i] = 0; }', 'if (toate || par[x] !== undefined) { o[i] = 0; }', 'gcode',
  'după G28, poziția veche e luată drept știută')
o('G10', GC, 'if (!atins && g < 2) return;', 'if (false) return;', 'gcode', '`G1 E… F…` numărat drept mișcare')
o('G11', GC, 'if (!atins && g < 2) return;', 'if (!atins) return;', 'gcode', 'un arc fără capăt scris (cercul întreg) se sare')
o('G12', GC, 'if (g < 2 || x0 == null', 'if (true || x0 == null', 'gcode', 'arcele, doar după capăt (fără burta lor)')
o('G13', GC, 'let d = g === 3 ? Math.atan2', 'let d = g === 2 ? Math.atan2', 'gcode', 'G2 și G3 inversate')
o('G14', GC, 'while (d <= 1e-9) d += cerc;', 'while (d < 0) d += cerc;', 'gcode', 'cercul întreg (capătul = începutul) n-are întindere')
o('G15', GC, 'b.length > (a.miniatura?.length ?? 0)', '!a.miniatura', 'gcode', 'prima miniatură, nu cea mare')
o('G16', GC, "b.startsWith('iVBORw0KGgo') && ", '', 'gcode', 'o miniatură care nu e PNG ajunge în <img>')
o('G17', GC, "cheie === 'target_machine.name' || ", '', 'gcode', 'imprimanta din antetul Cura nu se citește')
o('G18', GC, "for (const bucata of c.split(';'))", 'for (const bucata of [c])', 'gcode', 'perechile multiple de pe o linie (OrcaSlicer) se pierd')
o('G19', GC, "cheie === 'time' || ", '', 'gcode', 'timpul Cura nu se citește')
o('G20', GC, r'a.tDuza ??= pozitiv(Number(/EXTRUDER_TEMP=(\d+(?:\.\d+)?)/.exec(cod)?.[1]));', '', 'gcode',
  'temperatura duzei din START_PRINT (K1) se pierde')
o('G21', GC, "if (nr === 104 || nr === 109) a.tDuza ??= pozitiv(par['S']);", "if (nr === 104 || nr === 109) a.tPat ??= pozitiv(par['S']);",
  'gcode', 'M104 / M109 dau temperatura patului')
o('G22', GC, r'/^(?:START_PRINT|PRINT_START)\b/', r'/^(?:PRINT_START)\b/', 'gcode', 'START_PRINT (K1) nu se recunoaște')
o('G23', GC, 'const cod = (k < 0 ? l : l.slice(0, k)).trim().toUpperCase();', 'const cod = (k < 0 ? l : l.slice(0, k)).trim();', 'gcode',
  'G-code-ul cu litere mici nu se citește')
o('G24', GC, "if (rest !== '') linie(rest);", '', 'gcode', 'ultima linie, fără capăt de linie, se pierde')
o('G25', GC, '{ stream: true }', '{ stream: false }', 'gcode', 'o literă tăiată între două bucăți se strică')
o('G26', GC, 'semnal?.throwIfAborted();', '', 'gcode', 'citirea fișierului nu se oprește la semnal')
o('G27', GC, '} else if (mini.push(c) > MAX_LINII_MINIATURA) mini = null;', '} else mini.push(c);', 'gcode',
  'o miniatură fără sfârșit înghite restul antetului')
o('G28', GC, 'const ok = g ? nr <= 3 || nr === 28 || nr === 92', 'const ok = g ? nr <= 1 || nr === 28 || nr === 92', 'gcode', 'arcele (G2, G3) se sar')
o('G29', GC, 'if (g && nr === 91) { abs = false; return; }', '', 'gcode', 'G91 nu schimbă modul')
o('G30', GC, 'if (/^(?:thumbnail(?:_png)?|png) begin/i.test(c)) { mini = []; return; }', '', 'gcode', 'miniaturile nu se citesc')

# Trimiterea.
o('U01', UR, r".replace(/\s+/g, '_')", '', 'urcare', 'numele pleacă cu spații (OrcaSlicer le face _)')
o('U02', UR, r'if (!/.\.gcode$/i.test(n) || numeSigur(n) === null) return null;', 'if (numeSigur(n) === null) return null;', 'urcare',
  'alt fișier decât .gcode e trimis')
o('U03', UR, 'for (let k = 2; existente.includes(x); k++) {', 'for (let k = 2; false; k++) {', 'urcare',
  'un fișier din imprimantă e înlocuit (poate fi cel care se imprimă)')
o('U04', UR, 'x = `${n.slice(0, -6)}-${k}${n.slice(-6)}`;', 'x = `${n}-${k}`;', 'urcare', 'sufixul ajunge după .gcode')
o('U05', UR, "...(esteLoopback(o.adresa.gazda) ? {} : { targetAddressSpace: 'local' }),", "targetAddressSpace: 'local',", 'urcare',
  'adnotarea rețelei locale și spre loopback (Chrome ar refuza-o)')
o('U06', UR, "mode: 'no-cors'", "mode: 'cors'", 'urcare', 'cererea cere CORS (imprimanta nu-l are, nemăsurat)')
o('U07', UR, 'encodeURIComponent(o.nume)', 'o.nume', 'urcare', 'numele nu e codat în cale')
o('U08', UR, "fd.append('file', o.date, o.nume);", "fd.append('fisier', o.date, o.nume);", 'urcare', 'câmpul multipart nu e `file`')
o('U09', UR, "return { ok: false, motiv: 'retea' };", "return { ok: false, motiv: 'lipsa' };", 'urcare', 'cererea căzută spusă drept fișier lipsă')
o('U10', UR, 'if (o.semnal?.aborted) throw e;', '', 'urcare', 'o trimitere oprită de om trece drept rețea căzută')
o('U11', UR, 'if (k % PRIVIRI === 0) o.lista.reimprospateaza();', 'if (k === 0) o.lista.reimprospateaza();', 'urcare',
  'lista nu se mai cere din nou')
o('U12', UR, 'o.semnal?.throwIfAborted();', '', 'urcare', 'verificarea nu se oprește la semnal')
o('U13', UR, r'/^127\.|^\[::1\]$|(?:^|\.)localhost$/i', r'/^127\./', 'urcare', 'localhost și [::1] luate drept rețea locală')
o('U14', UR, 'return numeSigur(x);', 'return x;', 'urcare', 'sufixul trece de 255 de caractere')
o('U15', UR, 'if (k > 999) return null;', '', 'urcare', 'sufixele fără plafon')
o('U16', CSP, "'ws:', 'http:', 'https:',", "'ws:', 'https:',", 'urcare', 'CSP-ul fără http: (trimiterea refuzată)')

# Fereastra (e2e).
o('W01', UI, 'if (a.imprimanta !== null && model !== null && !simplu(a.imprimanta).includes(simplu(model))) {', 'if (false) {', 'e2e',
  'un fișier feliat pentru alt model, fără avertisment')
o('W02', UI, 'if (e !== null) {\n      avert.push(t(e.valoare', 'if (false) {\n      avert.push(t(e.valoare', 'e2e',
  'o mișcare în afara patului, fără avertisment')
o('W03', UI, "{pas.fel === 'gata' && (avert.length === 0", "{pas.fel === 'gata' && (true", 'e2e', 'cu avertismente, tot „Trimite”, nu „Trimite oricum”')
o('W04', UI, 'numeDeTrimis(fisier.name, (st.fisiere ?? []).map((x) => x.nume))', 'numeDeTrimis(fisier.name, [])', 'e2e',
  'numele nu ține seama de lista imprimantei')
o('W05', UI, "onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); renunta(); } }}",
  "onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); } }}", 'e2e', 'Escape nu închide dialogul')
o('W06', UI, "porneste={(f) => { setAles(null); setConfirmare({ fel: 'pornire', fisier: f }); }}", 'porneste={() => { setAles(null); }}', 'e2e',
  '„Pornește imprimarea…” nu deschide confirmarea')
o('W07', UI, "setPas(r.ok ? { fel: 'ajuns', f: r.fisier } : { fel: 'esec', a, motiv: r.motiv })",
  "setPas(r.ok ? { fel: 'ajuns', f: r.fisier } : { fel: 'gata', a })", 'e2e', 'un eșec nu spune de ce')
o('W08', UI, '{a.iesire === null && a.miscari > 0 && <p', '{a.miscari > 0 && <p', 'e2e', '„încap în pat” și când o mișcare iese')
o('W09', UI, "{avert.length === 0 ? '✓ ' : ''}", "{'✓ '}", 'e2e', 'bifa și lângă avertismente')
o('W10', UI, "(nume === null || pas.fel === 'gata'", "(pas.fel === 'gata'", 'e2e', 'după un refuz, fără „Alt fișier…”')

SETURI = {
    'gcode': ['test/unit/imprimanta.gcode3d.test.ts'],
    'urcare': ['test/unit/imprimanta.urcare.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
