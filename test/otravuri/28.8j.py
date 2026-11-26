# Lista de otrăvuri a feliei 28.8↑j (greșelile ferestrei exportului pe înțeles, ADR 0291 §2a, §4a; constatările 5, 6, 7 și 15
# ale auditului), 26.11.2026, alese de autor: numărul nou al lui „Dă-i T{n}” (freza identică, numărul ciocnit, cel mai mic liber),
# scrierea lui pe rând, butonul în grupul lui, roșul doar pe numărul ciocnit; greșeala pe câmp și „—” în listă; nota în locul
# avertismentului de viteză; refuzul calculului cu numele elementelor, cu virgula și cu „Du-mă la …”.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ER = 'src/ui/exportRand.ts'
DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'
MC = 'src/ui/motivCalcul.ts'
EC = 'src/app/ExportConectat.tsx'

# „Dă-i T{n}”: numărul nou.
o('J01', ER, ' && curat(a.numar));\n  if (identica) return identica.numar;\n', ' && curat(a.numar));\n', 'conflict', 'freza identică pe alt T nu mai e căutată: ia un număr nou')
o('J02', ER, ' && a.numar !== f.numar && curat(a.numar));', ' && a.numar !== f.numar);', 'conflict',
  'freza identică e luată și când numărul ei e ciocnit (alt conflict)')
o('J03', ER, "  if (unde === 'fund') return { numarSculaFund: s };", "  if (unde === 'fund') return { numarScula: s };", 'conflict',
  'numărul fundului plat se scrie pe freza operației')
# Butonul și roșul.
o('J04', DE, "      if (e(p.numarScula)) pune(m, 'freza', da('freza'));", "      if (e(p.numarScula)) pune(m, 'freza');", 'e2e',
  'fără „Dă-i T{n}” la freza operației')
o('J05', DE, "(u === 'scula' ? 'freza' :", "(u === 'scula' ? 'fund' :", 'e2e', 'freza operației pusă în grupul fundului plat: butonul nu mai apare')
o('J06', FO, 'aria-invalid={p.fundPlat && (!b.fund || ciocnit(p.numarSculaFund))} onChange={(ev) => { schimba(o.cheie, { numarSculaFund',
  'aria-invalid={p.fundPlat && (!b.fund || conflict !== undefined)} onChange={(ev) => { schimba(o.cheie, { numarSculaFund', 'e2e',
  'freza fundului plat roșie la orice conflict, ca înainte')
# Greșeala pe câmp și lista.
o('J07', ER, "  if (!inMargini(p.diametruScula, MARGINI_OPERATIE.diametru)) rez.push('diametru');\n", '', 'e2e',
  'diametrul greșit nu-și mai spune greșeala (nici roșul)')
o('J08', DE, "      case 'pas': return t('motiv.camp.pas',", "      case 'pas': return t('motiv.camp.adancime',", 'e2e',
  'pasul greșit spune greșeala adâncimii')
o('J09', DE, "const sau = (x: string): string => (citesteNumar(x) === null ? '—' : x);", 'const sau = (x: string): string => x;', 'e2e',
  'un număr gol al frezei, gol în listă')
o('J10', DE, "{citesteNumar(p.adancime) === null ? '—' : `${p.adancime} mm`}", '{`${p.adancime} mm`}', 'e2e',
  'adâncimea goală, „ mm” în listă, ca înainte')
o('J11', DE, "  const fmtMargine = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 3, useGrouping: false });",
  "  const fmtMargine = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 3 });", 'e2e',
  'marginile cu gruparea miilor („1.000 mm”)')
# Nota vitezei.
o('J12', DE, "      {r.liniiLimitate > 0 && (m.sursa === 'setari'", "      {r.liniiLimitate > 0 && (m.sursa !== 'setari'", 'e2e',
  'avertismentul cu setările din fabrică, nota cu $$-ul lipit')
# Refuzul calculului.
o('J13', MC, "  const cuVirgula = virgula ? motiv.replace(/(\\d)\\.(\\d)/g, '$1,$2') : motiv;", '  const cuVirgula = motiv;', 'motiv',
  'numerele lucrării rămân cu punct în română')
o('J14', MC, '    return nume;\n', '    return id;\n', 'motiv', 'id-urile din lume rămân în motiv')
o('J15', MC, '    cheie ??= operatii.get(id) ?? null;\n', '', 'motiv', 'fără cheia operației numite: fără „Du-mă la …”')
o('J16', EC, '`${i.id}/${n}`, `${i.piesa}/${o.id}`] as const))).reverse()),', '`${i.id}/${n}`, `${i.piesa}/${o.id}`] as const)).slice(0, 0)).reverse()),',
  'e2e', 'fereastra nu primește operațiile elementelor: refuzul fără „Du-mă la …”')

SETURI = {
    'conflict': ['test/unit/export.conflictT.test.ts'],
    'motiv': ['test/unit/export.motivCalcul.test.ts'],
}
E2E = ['test/e2e/export.greseli.spec.ts']
