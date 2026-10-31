# Lista de otrăvuri a feliei 9.5↑ (importul EPS și AI ≤ 8, ADR 0115), 31.10.2026: lexicul, antetul, interpretorul (procedurile,
# starea grafică, calea, imaginile sărite), operatorii AI și alegerea ușii după antet. Probele noi scrise înaintea rundei, din
# lista asta (o otravă fără probă ar fi scăpat): datele hex prea scurte, binarul după CR LF, ASCII85 cu „>”, calea schimbată
# între gsave și grestore, shfill, calea compusă nonzero cu golul în același sens, operatorul AI necunoscut chiar înaintea lui Lb.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LEX = 'src/io/psLexic.ts'
EPS = 'src/io/eps.ts'
FMT = 'src/io/formatImport.ts'
CAL = 'src/ui/actiuniImportCalcul.ts'
PIE = 'src/io/piesa.ts'

# ---- Lexicul ----
o('L01', LEX, 'if (this.laInceputDeRand(start) && (b[start + 1] === 0x25 ||', 'if (this.laInceputDeRand(start) && (b[start + 1] === 0x26 ||',
  'eps', 'comentariile %% nu mai ajung la interpretor (%%Trailer, %%EndProlog)')
o('L02', LEX, 'return p === 0 || this.b[p - 1] === 10 || this.b[p - 1] === 13;', 'return true;',
  'eps', 'un %% din mijlocul rândului trece drept comentariu de structură')
o('L03', LEX, 'const v = parseInt(r[2] as string, baza);', 'const v = parseInt(r[2] as string, 10);', 'eps', 'numerele cu bază citite în baza 10')
o('L04', LEX, 'v = v * 8 + ((b[this.pos++] as number) - 0x30);', 'v = v * 10 + ((b[this.pos++] as number) - 0x30);', 'eps', 'escape-ul octal citit zecimal')
o('L05', LEX, '      if (hexCifra(c) < 0) return false;\n      this.pos++;\n      ramase--;',
  '      if (hexCifra(c) < 0) { this.pos++; continue; }\n      this.pos++;\n      ramase--;',
  'eps', 'datele hex ale imaginii sar și peste ce nu e hex (mănâncă desenul de după)')
o('L06', LEX, 'if (c === 13 && this.b[this.pos + 1] === 10) this.pos += 2;', 'if (c === 13 && this.b[this.pos + 1] === 10) this.pos += 1;',
  'eps', 'CR LF de după operator contează ca două albe (datele binare decalate)')

# ---- Antetul ----
o('A01', EPS, 'if (poz < 30 || lung === 0 || poz + lung > b.length) return null;', 'if (lung === 0) return null;',
  'eps', 'EPS-ul DOS cu pozițiile în afara fișierului trece')
o('A02', EPS, 'while (ps[k] === 4) k++;', '', 'eps', '^D de la început nu se mai sare')
o('A03', EPS, 'versiune >= 9 && versiune < 80) aiNou = true;', 'versiune >= 10 && versiune < 80) aiNou = true;', 'eps', 'Illustrator 9 citit ca AI vechi')
o('A04', EPS, 'versiune >= 9 && versiune < 80) aiNou = true;', 'versiune >= 9 && versiune < 90) aiNou = true;', 'eps', 'Illustrator 88 refuzat ca nou')
o('A05', EPS, "if (/^%%?AI[3-8]_/.test(l)) formatAi = true;", "if (/^%%AI[3-8]_/.test(l)) formatAi = true;", 'eps', 'formatul AI fără Illustrator în %%Creator nu mai e recunoscut')
o('A06', EPS, 'ai: !aiNou && (illustrator || formatAi)', 'ai: !aiNou && formatAi', 'eps', 'un AI recunoscut doar după %%Creator e citit ca EPS')

# ---- Interpretorul ----
o('I01', EPS, "if (this.ai && this.lex.saltLa(['%%EndProlog']) === null) this.lex.pos = 0;",
  "if (this.ai && this.lex.saltLa(['%%NuExista']) === null) this.lex.pos = 0;", 'eps', 'prologul unui AI se execută (condițiile lui)')
o('I02', EPS, "const SFARSIT = ['%%PageTrailer', '%%Trailer', '%%EOF'];", "const SFARSIT = ['%%PageTrailer', '%%EOF'];",
  'eps', 'desenul nu se mai încheie la %%Trailer')
o('I03', EPS, '        this.incluse++;\n        return false;', '        return false;', 'eps', 'sfârșitul unui document inclus încheie desenul')
o('I04', EPS, "if (s[0] === '%%BeginDocument') this.n['sarit-incluse']++;", '', 'eps', 'documentele plasate într-un AI nu se numără')
o('I05', EPS, '    if (this.inText) {', "    if (this.inText && v === 'niciodata') {", 'eps', 'obiectul text AI nu se mai sare (calea lui de încadrare)')
o('I06', EPS, '    if (this.ai) {\n      this.stiva.length = 0;\n      return;\n    }\n    throw new RefuzPs',
  '    if (this.ai) {\n      return;\n    }\n    throw new RefuzPs', 'eps', 'un operator AI necunoscut își lasă operanzii pe stivă')
o('I07', EPS, "      return;\n    }\n    throw new RefuzPs('operator', v);\n  }", "      return;\n    }\n    this.stiva.length = 0;\n  }",
  'eps', 'un operator PostScript necunoscut se sare în loc să fie refuzat')
o('I08', EPS, "if (CONTROL.includes(v)) throw new RefuzPs('control', v);", '', 'eps', 'buclele și condițiile refuzate ca „operator”, nu „control”')
o('I09', EPS, 'if (x instanceof Operator) p.corp[i] = x;', '', 'eps', 'bind nu mai leagă operatorii')
o('I10', EPS, 'else if (t instanceof NumeImediat) corp.push(this.valoare(t.v));', 'else if (t instanceof NumeImediat) corp.push(new Nume(t.v, false));',
  'eps', '//x legat la rulare, nu la citire')
o('I11', EPS, 'this.stivaGs.push({ ...this.gs, cale: this.copieCale(this.gs.cale) });', 'this.stivaGs.push({ ...this.gs });',
  'eps', 'gsave ține calea, nu o copie a ei')
o('I12', EPS, '    if (this.pictate.has(c.id)) return;', '', 'eps', 'o cale umplută și trasă devine două forme')
o('I13', EPS, 'if (this.pictate.has(c.id)) c.id = this.idUrmator++;', '', 'eps', 'calea schimbată după grestore nu se mai pictează')
o('I14', EPS, 'if (!c.decupaj && !this.pictate.has(c.id) &&', 'if (!c.decupaj &&', 'eps', 'newpath după gsave fill grestore numără o cale nepictată')
o('I15', EPS, 'if (!c.decupaj && !this.pictate.has(c.id) &&', 'if (!this.pictate.has(c.id) &&', 'eps', 'calea decupajului numărată și nepictată')
o('I16', EPS, '    const start = c.curenta.start;\n    c.curenta = { start, cur: start, varfuri: [], desenate: 0, autor: false };\n    c.subcai.push(c.curenta);',
  '    c.curenta = null;', 'eps', 'după closepath, lineto nu mai pornește o subcale din start')
o('I17', EPS, 'return { x: c.x + m.a * dx + m.c * dy, y: c.y + m.b * dx + m.d * dy };', 'return { x: c.x + dx, y: c.y + dy };',
  'eps', 'relativele fără matrice')
o('I18', EPS, '{ tip: \'C\', c1: p(x1, y1), c2: p(x2, y2) }, p(x3, y3), true);', '{ tip: \'C\', c1: p(x2, y2), c2: p(x1, y1) }, p(x3, y3), true);',
  'eps', 'curveto cu controalele inversate')
o('I19', EPS, '    c.necunoscut = false;\n', '', 'eps', 'moveto nu reface punctul curent după text')
o('I20', EPS, 'if (this.gs.cale.curenta) this.gs.cale.necunoscut = true;', '', 'eps', 'după text, punctul curent trece drept cunoscut')
o('I21', EPS, "case 'hex': return this.lex.sareHex(2 * octeti);", "case 'hex': return this.lex.sareHex(octeti);", 'eps', 'jumătate din datele hex ale imaginii')
o('I22', EPS, 'Math.ceil((latime * biti * pe) / 8)', 'Math.floor((latime * biti * pe) / 8)', 'eps', 'rândul imaginii nerotunjit la octet')
o('I23', EPS, 'const pe = surse.length > 1 ? 1 : componente;', 'const pe = componente;', 'eps', 'colorimage cu mai multe surse numără componentele de două ori')
o('I24', EPS, '        this.lex.sareAlbUnul();\n', '', 'eps', 'datele binare citite cu albul de după operator')
o('I25', EPS, "case 'ascii85': return this.lex.sareDupa('~>');", "case 'ascii85': return this.lex.sareDupa('>');", 'eps', 'ASCII85 până la primul „>”')
o('I26', EPS, "case 'asciihex': return this.lex.sareDupa('>');", "case 'asciihex': return this.lex.sareDupa('~>');", 'eps', 'ASCIIHex până la „~>”')
o('I27', EPS, '      if (v instanceof Fisier) return dinFisier(v);\n', '', 'eps', 'fișierul cu filtru pus deoparte cu def nu e recunoscut')
o('I28', EPS, "case 'shfill': this.scoate(v); if (!this.ascuns()) this.n['sarit-umbrire']++; return;", "case 'shfill': this.scoate(v); return;",
  'eps', 'umbririle nu se numără')
o('I29', EPS, '    this.gs.cale = veche;\n', '', 'eps', 'rectfill golește calea curentă')
o('I30', EPS, "      this.n.decupaje++;\n      this.golesteCalea();\n      return;", "      this.n.decupaje++;\n      return;", 'eps', 'rectclip nu golește calea')
o('I31', EPS, '    c.decupaj = true;\n    this.n.decupaje++;', '    c.decupaj = true;', 'eps', 'decupajele nu se numără')

# ---- Operatorii AI ----
o('AI1', EPS, '      this.compus = { fel, impar: this.gs.impar };\n      return;\n    }', '      this.compus = { fel, impar: this.gs.impar };\n    }',
  'eps', 'subcăile căii compuse se pictează pe rând')
o('AI2', EPS, "case 'XR': this.gs.impar = nr(1) === 1; return;", "case 'XR': this.gs.impar = false; return;", 'eps', 'XR ignorat: par-impar citit nonzero')
o('AI3', EPS, 'vizibil: s[0] !== 0 && s[0] !== false', 'vizibil: true', 'eps', 'stratul ascuns se importă')
o('AI4', EPS, 'if (st && x instanceof Sir) st.nume = latin1(x.b);', '', 'eps', 'straturile fără nume')
o('AI5', EPS, "case 'f': case 'b': this.inchide(); this.picteazaAi('umple'); return;", "case 'f': case 'b': this.picteazaAi('umple'); return;",
  'eps', 'f și b nu închid calea (închisă de umplere)')
o('AI6', EPS, "case 's': this.inchide(); this.picteazaAi('trage'); return;", "case 's': this.picteazaAi('trage'); return;", 'eps', 's nu închide calea')
o('AI7', EPS, "{ tip: 'C', c1: c.cur, c2: pct(nr(4), nr(3)) }", "{ tip: 'C', c1: pct(nr(4), nr(3)), c2: pct(nr(4), nr(3)) }", 'eps', 'v fără primul control în punctul curent')
o('AI8', EPS, "{ tip: 'C', c1: pct(nr(4), nr(3)), c2: capat }", "{ tip: 'C', c1: pct(nr(4), nr(3)), c2: pct(nr(4), nr(3)) }", 'eps', 'y fără al doilea control în capăt')
o('AI9', EPS, "case 'XI': if (!this.ascuns()) this.n['sarit-imagine']++; return;", "case 'XI': return;", 'eps', 'rasterele AI nu se numără')
o('AI10', EPS, "      case 'To':\n        if (!this.ascuns()) this.n['sarit-text']++;", "      case 'To':\n        this.n['sarit-text']++;",
  'eps', 'textul unui strat ascuns se numără')

# ---- Ușa după antet și fluxul ----
o('F01', FMT, 'const n = Math.min(b.length, 1024);', 'const n = b.length;', 'eps', '%PDF- căutat în tot fișierul')
o('F02', FMT, "  if (b[0] === 0xc5 && b[1] === 0xd0 && b[2] === 0xd3 && b[3] === 0xc6) return 'eps';\n", '', 'eps', 'EPS-ul binar DOS nu e recunoscut după antet')
o('F03', CAL, "(formatDupaAntet(f.octeti) ?? format) === 'eps'", "format === 'eps'", 'eps', 'un .ai PostScript dat ușii PDF')
o('F04', CAL, "const format = formatImport(f.nume, '') ?? formatDupaAntet(f.octeti);", "const format = formatImport(f.nume, '');",
  'eps', 'fișierul fără extensie cunoscută, refuzat deși antetul e PostScript')
o('F05', FMT, r"if (/\.eps[fi]?$/i.test(nume)) return 'eps';", r"if (/\.eps$/i.test(nume)) return 'eps';", 'eps', '.epsf și .epsi nu mai sunt EPS')
o('F06', PIE, r"replace(/\.(svg|dxf|pdf|ai|eps[fi]?)$/i, '')", r"replace(/\.(svg|dxf|pdf|ai)$/i, '')", 'eps', 'numele piesei păstrează .eps')
o('F07', CAL, "  const c = comune(f, cai, null, 'fisier');\n  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'eps'",
  "  const c = comune(f, cai, null);\n  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'eps'", 'eps', 'piesa EPS pusă în origine, nu unde e în fișier')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    'eps': u('eps', 'eps.corpus', 'import.eps'),
    'eps2': u('eps', 'eps.corpus', 'import.eps', 'import.pdf', 'pdf.obiecte', 'pdf.corpus', 'manual'),
}
E2E = ['test/e2e/import.spec.ts']
