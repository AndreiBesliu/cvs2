# Lista de otrăvuri a feliei 10.4↑a-3 (fereastra Setări, secțiunea Cotele; ADR 0330 §6), 24.11.2026, alese de autor: scrierea
# cifrei (unitatea, pasul și zecimalele lui, separatorul, unitatea scrisă), desenul după setări (bara oblică, punctul, săgeata
# deschisă, extensiile ascunse, cifra în linie și mereu orizontală), setările (zecimalele automate, separatorul după limbă,
# întregul, culoarea, marginile, „Înapoi la implicit”) și fereastra pe pânză (prinsă de e2e: ⚙, Escape, F1, garda tastelor,
# marginile câmpului, pânza ascunsă, culoarea, pragul cifrelor, ținerea în browser, unitatea măsurii).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/model/desenCota.ts'
S = 'src/app/setariCote.ts'
U = 'src/app/Cote.tsx'
W = 'src/app/Setari.tsx'
E = 'src/app/Editare.tsx'

# Scrierea cifrei.
o('A01', D, 'const MM_PE_UNITATE = { mm: 1, cm: 10, inch: 25.4 } as const;', 'const MM_PE_UNITATE = { mm: 1, cm: 10, inch: 25 } as const;', 'desen',
  'inch-ul rotunjit la 25 mm')
o('A02', D, '    z = Math.max(z, zecimalePas(f.pas));\n', '', 'desen', 'pasul 0,25 cu 0 zecimale: „120”')
o('A03', D, '    v = Math.round(v / f.pas) * f.pas;', '    v = Math.floor(v / f.pas) * f.pas;', 'desen', 'pasul în jos, nu la cel mai apropiat')
o('A04', D, "  if (f.virgula) s = s.replace('.', ',');\n", '', 'desen', 'virgula aleasă nu se pune')
o('A05', D, '  return f.cuUnitate ? s + SUFIX[f.unitate] : s;', '  return s;', 'desen', 'unitatea scrisă lipsește')
# Desenul după setări.
o('A06', D, '    const r = { x: (w.x - w.y) / Math.SQRT2, y: (w.x + w.y) / Math.SQRT2 };',
  '    const r = { x: (w.x + w.y) / Math.SQRT2, y: (w.y - w.x) / Math.SQRT2 };', 'desen', 'bara oblică întoarsă („\\”)')
o('A07', D, "    capete = [fa, fb].map((f): CapatDesen => ({ fel: 'punct', centru: f, raza: s.capat / 4 }));",
  "    capete = [fa, fb].map((f): CapatDesen => ({ fel: 'punct', centru: f, raza: s.capat / 2 }));", 'desen', 'punctul de două ori mai mare')
o('A08', D, "    const plina = s.capete === 'plina';", '    const plina = true;', 'desen', 'săgeata deschisă iese plină')
o('A09', D, '  if (s.extensii) {', '  if (true) {', 'desen', 'extensiile ascunse se desenează')
o('A10', D, '    const jum = latimeText(text, h) / 2 + gol;', '    const jum = latimeText(text, h) / 2;', 'desen', 'linia întreruptă fără gol')
o('A11', D, '    pText = plus(m, sus, -h / 2);', '    pText = plus(m, sus, gol);', 'desen', 'cifra „în linie” stă deasupra')
o('A12', D, '    const nn = n.y > 1e-12 || (Math.abs(n.y) <= 1e-12 && n.x < 0) ? n : { x: -n.x, y: -n.y };', '    const nn = n;', 'desen',
  'cifra orizontală de partea normalei, oricare ar fi')
o('A13', D, '    unghi = 0;\n', '', 'desen', 'cifra „mereu orizontală” rotită pe o verticală')
o('A14', D, '    const ext = (Math.abs(nn.x) * latimeText(text, h)) / 2 + (Math.abs(nn.y) * h) / 2;', '    const ext = (Math.abs(nn.y) * h) / 2;', 'desen',
  'cifra orizontală peste linia verticală')
# Setările.
o('B01', S, "export const zecimaleCote = (s: SetariCote): number => s.cifre.zecimale ?? (s.cifre.unitate === 'inch' ? 3 : 2);",
  'export const zecimaleCote = (s: SetariCote): number => s.cifre.zecimale ?? 2;', 'setari', 'automat, în inch: 2')
o('B02', S, "  virgula: s.cifre.separator === 'limba' ? virgulaLimbii : s.cifre.separator === 'virgula',",
  "  virgula: s.cifre.separator === 'virgula',", 'setari', '„după limbă” ignoră limba')
o('B03', S, "  x === null || (typeof x === 'number' && Number.isInteger(x)) ? numarSauNul(x, margini, implicit) : implicit;",
  "  x === null || typeof x === 'number' ? numarSauNul(x, margini, implicit) : implicit;", 'setari', 'zecimale neîntregi')
o('B04', S, 'const CULOARE = /^#[0-9a-f]{6}$/;', 'const CULOARE = /^#[0-9a-fA-F]{6}$/;', 'setari', 'culoarea cu majuscule')
o('B05', S, '  pas: [0.001, 100],', '  pas: [0, 100],', 'setari', 'pasul sub 0,001')
o('B06', S, 'export const grupImplicit = (s: SetariCote, grup: GrupCote): SetariCote => ({ ...s, [grup]: SETARI_IMPLICITE[grup] });',
  'export const grupImplicit = (s: SetariCote, grup: GrupCote): SetariCote => ({ ...SETARI_IMPLICITE, [grup]: SETARI_IMPLICITE[grup] });', 'setari',
  '„Înapoi la implicit” pe toate grupurile')
o('B07', S, '  capat: s.linii.marime,', '  capat: 2.5,', 'setari', 'mărimea capetelor nu ajunge la desen')
o('B08', S, "      pePanza: bif(c['pePanza'], I.comportament.pePanza),", '      pePanza: I.comportament.pePanza,', 'setari', '„Cotele pe pânză” nu se citește')
o('B09', S, '  toleranta: [TOLERANTA_MINIMA, TOLERANTA_MAXIMA],', '  toleranta: [TOLERANTA_MINIMA, Infinity],', 'setari', 'toleranța fără margine sus')
# Fereastra și pânza (e2e).
o('E01', U, '  const vizibile = unealta || (setari.comportament.pePanza && !ascunse.has(idFoaie));', '  const vizibile = true;', 'e2e', 'cotele ascunse se văd')
o('E02', U, "      data-ascunse={vizibile ? undefined : ''} style={setari.comportament.culoare ? ({ '--cota': setari.comportament.culoare } as CSSProperties) : undefined}>",
  "      data-ascunse={vizibile ? undefined : ''}>", 'e2e', 'culoarea aleasă nu ajunge pe pânză')
o('E03', U, '      {h >= prag ? (', '      {h >= 6 ? (', 'e2e', 'pragul cifrelor nu se citește')
o('E04', U, '  if (c.fel === \'bara\') return <line className="cota-capat-bara"', '  if (c.fel === \'bara\') return <line className="cota-capat"', 'e2e',
  'bara oblică desenată ca o săgeată')
o('E05', U, '{ ...f, cuUnitate: true }', 'f', 'e2e', 'distanța măsurii fără unitate')
o('E06', U, '              onClick={onSetari}>', '              onClick={undefined}>', 'e2e', '⚙ nu deschide nimic')
o('E07', W, "    if (e.key !== 'Escape') return;", "    if (e.key !== 'Esc') return;", 'e2e', 'Escape nu închide fereastra')
o('E08', W, '    if (v === null || v < margini[0] || v > margini[1]) {', '    if (v === null) {', 'e2e', 'un număr în afara marginilor se ține')
o('E09', W, '          onClick={() => { schimbaSetariCote(grupImplicit(s, grup)); }}', '          onClick={() => undefined}', 'e2e', '„Înapoi la implicit” nu face nimic')
o('E10', E, "  if (document.querySelector('[aria-labelledby=\"setari-titlu\"]')) return 'vedere.setari';\n", '', 'e2e', 'F1 în fereastră: alt capitol')
o('E11', E, '      p.onSetari?.();\n    } else if (id === \'raporteaza\') {', "    } else if (id === 'raporteaza') {", 'e2e', 'rândul „Setări…” nu deschide nimic')
o('E12', 'src/app/App.tsx', '|| aspect || freze || setari || raport !== null;', '|| aspect || freze || raport !== null;', 'e2e',
  'tastele desenului lucrează sub fereastră')
o('E13', 'src/ui/scurtaturi.ts', "  ['Ctrl+,', 'vedere.setari'],\n", '', 'e2e', 'Ctrl+, nu deschide fereastra')
o('E14', S, '    localStorage.setItem(CHEIE_SETARI_COTE, textSetariCote(acum));\n', '', 'e2e', 'setările nu se țin după reîncărcare')

SETURI = {
    'desen': ['test/unit/cote.desen.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
}
E2E = ['test/e2e/setari.spec.ts', 'test/e2e/cote.spec.ts']
